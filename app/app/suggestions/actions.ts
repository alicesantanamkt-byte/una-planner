'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getClientGoogleCalendar } from "@/lib/google/client-connection";

async function getOwnedSuggestion(id:string){
  const supabase = await createServerSupabaseClient();
  if(!supabase) throw new Error("Supabase não configurado.");

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:suggestion} = await supabase
    .from("suggested_slots")
    .select("id,client_id,status,start_datetime,end_datetime,content_item_id,content_items(title),clients!inner(user_id)")
    .eq("id",id)
    .eq("clients.user_id",authData.user.id)
    .maybeSingle();

  if(!suggestion) throw new Error("Sugestão não encontrada.");
  return {supabase,suggestion};
}

export async function acceptSuggestion(id:string){
  const {supabase,suggestion} = await getOwnedSuggestion(id);
  if(suggestion.status !== "suggested") return;

  const calendar = await getClientGoogleCalendar(suggestion.client_id);
  let googleEventId:string|null = null;

  if(calendar){
    const inserted = await calendar.events.insert({
      calendarId:"primary",
      requestBody:{
        summary:`Gravação UNA · ${(suggestion as any).content_items?.title || "Conteúdo"}`,
        description:"Evento criado automaticamente pelo UNA Planner.",
        start:{dateTime:suggestion.start_datetime,timeZone:"America/Sao_Paulo"},
        end:{dateTime:suggestion.end_datetime,timeZone:"America/Sao_Paulo"}
      }
    });
    googleEventId = inserted.data.id || null;

    if(googleEventId){
      await supabase.from("calendar_events").upsert({
        client_id:suggestion.client_id,
        source:"google",
        external_id:googleEventId,
        title:`Gravação UNA · ${(suggestion as any).content_items?.title || "Conteúdo"}`,
        start_datetime:suggestion.start_datetime,
        end_datetime:suggestion.end_datetime,
        location:null,
        protected:true,
        capture_allowed:false,
        metadata_json:{created_by_una:true,suggestion_id:suggestion.id}
      }, {onConflict:"client_id,source,external_id"});
    }
  }

  await supabase
    .from("suggested_slots")
    .update({
      status:"accepted",
      google_event_id:googleEventId
    })
    .eq("id",suggestion.id);

  revalidatePath("/app");
  revalidatePath("/app/suggestions");
  revalidatePath("/app/calendar");
}

export async function rejectSuggestion(id:string, reason?:string){
  const {supabase,suggestion} = await getOwnedSuggestion(id);

  const {data:existing} = await supabase
    .from("suggested_slots")
    .select("reason_json")
    .eq("id",suggestion.id)
    .single();

  await supabase
    .from("suggested_slots")
    .update({
      status:"rejected",
      reason_json:{
        ...(existing?.reason_json || {}),
        rejection_reason:reason || "cliente não conseguiu neste horário"
      }
    })
    .eq("id",suggestion.id);

  revalidatePath("/app");
  revalidatePath("/app/suggestions");
}

export async function requestRecalculation(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) throw new Error("Supabase não configurado.");

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client} = await supabase
    .from("clients")
    .select("id")
    .eq("user_id",authData.user.id)
    .single();

  if(!client) throw new Error("Cliente não encontrado.");

  await supabase.from("alerts").insert({
    client_id:client.id,
    severity:"attention",
    type:"recalculation_requested",
    message:"Cliente solicitou novo cálculo de horários."
  });

  revalidatePath("/app/suggestions");
}
