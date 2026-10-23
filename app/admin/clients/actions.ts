'use server';

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function appUrl(){
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if(explicit) return explicit.replace(/\/$/,"");
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if(production) return `https://${production}`;
  const vercel = process.env.VERCEL_URL;
  if(vercel) return `https://${vercel}`;
  return "https://una-planner-preview.vercel.app";
}

async function requireAdmin(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) throw new Error("Supabase não configurado.");
  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");
  const {data:profile} = await supabase.from("profiles").select("role").eq("id",authData.user.id).maybeSingle();
  if(profile?.role!=="admin") redirect("/app");
  return supabase;
}

export async function createClientInvite(formData:FormData){
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  if(!admin) redirect("/admin/clients/new?error=config");

  const displayName = String(formData.get("displayName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const brand = String(formData.get("brand") || "").trim();
  const segment = String(formData.get("segment") || "").trim();

  if(!displayName || !email) redirect("/admin/clients/new?error=missing");

  const {data:invite,error:inviteError} = await admin.auth.admin.inviteUserByEmail(email,{
    redirectTo:`${appUrl()}/set-password`,
    data:{name:displayName,brand:brand || null}
  });

  if(inviteError || !invite.user){
    const message = encodeURIComponent(inviteError?.message || "Não foi possível enviar o convite.");
    redirect(`/admin/clients/new?error=invite&message=${message}`);
  }

  const userId = invite.user.id;

  const {error:profileError} = await admin.from("profiles").upsert({
    id:userId,
    name:displayName,
    role:"client"
  },{onConflict:"id"});
  if(profileError) redirect(`/admin/clients/new?error=profile&message=${encodeURIComponent(profileError.message)}`);

  const {data:existingClient} = await admin.from("clients").select("id").eq("user_id",userId).maybeSingle();
  let clientId = existingClient?.id;

  if(clientId){
    const {error} = await admin.from("clients").update({
      display_name:displayName,
      brand:brand || null,
      segment:segment || null,
      onboarding_completed:false
    }).eq("id",clientId);
    if(error) redirect(`/admin/clients/new?error=client&message=${encodeURIComponent(error.message)}`);
  }else{
    const {data:newClient,error} = await admin.from("clients").insert({
      user_id:userId,
      display_name:displayName,
      brand:brand || null,
      segment:segment || null,
      onboarding_completed:false
    }).select("id").single();
    if(error || !newClient) redirect(`/admin/clients/new?error=client&message=${encodeURIComponent(error?.message || "Erro ao criar cliente")}`);
    clientId = newClient.id;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${clientId}?invite=sent`);
}

export async function sendPasswordReset(clientId:string){
  await requireAdmin();
  const admin = createAdminSupabaseClient();
  if(!admin) redirect(`/admin/clients/${clientId}?access=error`);

  const {data:client} = await admin.from("clients").select("user_id").eq("id",clientId).maybeSingle();
  if(!client?.user_id) redirect(`/admin/clients/${clientId}?access=error`);

  const {data:userData,error:userError} = await admin.auth.admin.getUserById(client.user_id);
  const email = userData.user?.email;
  if(userError || !email) redirect(`/admin/clients/${clientId}?access=error`);

  const {error} = await admin.auth.resetPasswordForEmail(email,{redirectTo:`${appUrl()}/set-password?mode=recovery`});
  if(error) redirect(`/admin/clients/${clientId}?access=error&message=${encodeURIComponent(error.message)}`);

  redirect(`/admin/clients/${clientId}?access=reset-sent`);
}
