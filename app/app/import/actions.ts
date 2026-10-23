'use server';

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/importers";

function fingerprint(title:string, format:string|null, publishAt:string|null){
  return [title.trim().toLowerCase(), String(format||"").trim().toLowerCase(), publishAt ? new Date(publishAt).toISOString().slice(0,10) : ""].join("|");
}

export async function importOwnCalendar(formData:FormData){
  const supabase = await createServerSupabaseClient();
  if(!supabase) redirect("/app/import?error=supabase");

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client} = await supabase
    .from("clients")
    .select("id")
    .eq("user_id",authData.user.id)
    .maybeSingle();
  if(!client) redirect("/onboarding");

  const file = formData.get("file");
  if(!(file instanceof File)) redirect("/app/import?error=missing");

  const buffer = await file.arrayBuffer();
  const items = parseSpreadsheet(buffer);
  if(!items.length) redirect("/app/import?error=no_rows");

  const {data:existing,error:existingError} = await supabase
    .from("content_items")
    .select("title,format,publish_at")
    .eq("client_id",client.id);
  if(existingError) redirect("/app/import?error=db");

  const existingSet = new Set((existing || []).map((item:any)=>fingerprint(item.title,item.format,item.publish_at)));
  const seen = new Set<string>();
  const rows = items
    .filter(item=>{
      const key=fingerprint(item.title,item.format || null,item.publishAt || null);
      if(existingSet.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(item=>({
      client_id:client.id,
      title:item.title,
      format:item.format || null,
      publish_at:item.publishAt || null,
      estimated_minutes:item.estimatedMinutes || 15,
      preferred_location:item.preferredLocation || null,
      status:"pending"
    }));

  if(rows.length){
    const {error} = await supabase.from("content_items").insert(rows);
    if(error) redirect("/app/import?error=db");
  }

  const skipped = items.length - rows.length;
  revalidatePath("/app");
  revalidatePath("/app/month");
  revalidatePath("/app/tasks");
  revalidatePath("/app/suggestions");
  redirect(`/app/import?imported=${rows.length}&skipped=${skipped}`);
}
