'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getClientGoogleCalendar } from "@/lib/google/client-connection";
import { generateSuggestions } from "@/lib/suggestion-engine";

async function getOwnedSuggestion(id:string){
  const supabase = await createServerSupabaseClient();
  if(!supabase) throw new Error("Supabase não configurado.");

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:suggestion,error} = await supabase
    .from("suggested_slots")
    .select("id,client_id,status,start_datetime,end_datetime,content_item_id,content_items(title),clients!inner(user_id)")
    .eq("id",id)
    .eq("clients.user_id",authData.user.id)
    .maybeSingle();

  if(error || !suggestion) throw new Error("Sugestão não encontrada.");
  return suggestion;
}

export async function acceptSuggestion(id:string){
  const suggestion = await getOwnedSuggestion(id);
  if(suggestion.status !== "suggested") return;

  const admin = createAdminSupabaseClient();
  if(!admin) throw new Error("Configuração interna indisponível.");

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
      const {error:eventError} = await admin.from("calendar_events").upsert({
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
      if(eventError) throw eventError;
    }
  }

  const {error:updateError} = await admin
    .from("suggested_slots")
    .update({status:"accepted",google_event_id:googleEventId})
    .eq("id",suggestion.id);
  if(updateError) throw updateError;

  revalidatePath("/app");
  revalidatePath("/app/suggestions");
  revalidatePath("/app/calendar");
}

export async function rejectSuggestion(id:string, reason?:string){
  const suggestion = await getOwnedSuggestion(id);
  const admin = createAdminSupabaseClient();
  if(!admin) throw new Error("Configuração interna indisponível.");

  const {data:existing} = await admin
    .from("suggested_slots")
    .select("reason_json")
    .eq("id",suggestion.id)
    .single();

  const {error:updateError} = await admin
    .from("suggested_slots")
    .update({
      status:"rejected",
      reason_json:{
        ...((existing?.reason_json && typeof existing.reason_json === "object") ? existing.reason_json : {}),
        rejection_reason:reason || "cliente não conseguiu neste horário"
      }
    })
    .eq("id",suggestion.id);
  if(updateError) throw updateError;

  revalidatePath("/app");
  revalidatePath("/app/suggestions");
}

export async function requestRecalculation(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) redirect("/app/suggestions?calc=error");

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client,error:clientError} = await supabase
    .from("clients")
    .select("id,work_start_time,work_end_time,active_weekdays")
    .eq("user_id",authData.user.id)
    .maybeSingle();

  if(clientError || !client) redirect("/app/suggestions?calc=error");

  const [{data:contents,error:contentsError},{data:events,error:eventsError},{data:decisions,error:decisionsError}] = await Promise.all([
    supabase
      .from("content_items")
      .select("id,title,publish_at,estimated_minutes,preferred_location,status")
      .eq("client_id",client.id)
      .in("status",["pending","planned"])
      .not("publish_at","is",null)
      .order("publish_at",{ascending:true}),
    supabase
      .from("calendar_events")
      .select("start_datetime,end_datetime,location,protected")
      .eq("client_id",client.id)
      .order("start_datetime",{ascending:true}),
    supabase
      .from("suggested_slots")
      .select("content_item_id,start_datetime,status")
      .eq("client_id",client.id)
      .in("status",["accepted","rejected"])
  ]);

  if(contentsError || eventsError || decisionsError) redirect("/app/suggestions?calc=error");
  if(!(contents || []).length) redirect("/app/suggestions?calc=empty");

  try{
    const acceptedContentIds = new Set(
      (decisions || []).filter((d:any)=>d.status==="accepted").map((d:any)=>d.content_item_id)
    );
    const rejectedPairs = new Set(
      (decisions || [])
        .filter((d:any)=>d.status==="rejected" && d.content_item_id && d.start_datetime)
        .map((d:any)=>`${d.content_item_id}|${new Date(d.start_datetime).toISOString()}`)
    );
    const pendingContents = (contents || []).filter((c:any)=>!acceptedContentIds.has(c.id));

    const generated = generateSuggestions(
      pendingContents,
      events || [],
      client,
      {rejectedPairs}
    );

    const admin = createAdminSupabaseClient();
    if(!admin) redirect("/app/suggestions?calc=error");

    const {error:deleteError} = await admin
      .from("suggested_slots")
      .delete()
      .eq("client_id",client.id)
      .eq("status","suggested");
    if(deleteError) throw deleteError;

    const rows = generated.map((item:any)=>({
      content_item_id:item.content.id,
      client_id:client.id,
      start_datetime:item.slot.start.toISOString(),
      end_datetime:new Date(item.slot.start.getTime() + (item.content.estimated_minutes || 15)*60000).toISOString(),
      score:item.score,
      status:"suggested",
      reason_json:{reasons:Array.isArray(item.reasons)?item.reasons:[]}
    }));

    if(rows.length){
      const {error:insertError} = await admin.from("suggested_slots").insert(rows);
      if(insertError) throw insertError;
    }

    revalidatePath("/app");
    revalidatePath("/app/suggestions");
    redirect(`/app/suggestions?calc=${rows.length ? "ok" : "none"}&count=${rows.length}`);
  }catch(error:any){
    if(error?.digest?.startsWith?.("NEXT_REDIRECT")) throw error;
    console.error("Suggestion recalculation failed",error);
    redirect("/app/suggestions?calc=error");
  }
}
