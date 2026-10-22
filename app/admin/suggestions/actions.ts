'use server';

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSuggestions } from "@/lib/suggestion-engine";

export async function recalculateSuggestions(formData:FormData){
  const supabase = await createServerSupabaseClient();
  if(!supabase) throw new Error("Supabase não configurado.");

  const clientId = String(formData.get("clientId") || "");
  if(!clientId) return;

  const {data:routine} = await supabase
    .from("clients")
    .select("work_start_time,work_end_time,active_weekdays")
    .eq("id",clientId)
    .single();

  const {data:contents} = await supabase
    .from("content_items")
    .select("id,title,publish_at,estimated_minutes,preferred_location")
    .eq("client_id",clientId)
    .eq("status","pending");

  const {data:events} = await supabase
    .from("calendar_events")
    .select("start_datetime,end_datetime,location,protected")
    .eq("client_id",clientId);

  const suggestions = generateSuggestions(contents || [], events || [], routine || {});

  await supabase.from("suggested_slots").delete().eq("client_id",clientId).eq("status","suggested");

  if(suggestions.length){
    await supabase.from("suggested_slots").insert(
      suggestions.map(s=>({
        client_id:clientId,
        content_item_id:s.content.id,
        start_datetime:s.slot.start.toISOString(),
        end_datetime:new Date(+s.slot.start + s.content.estimated_minutes*60000).toISOString(),
        score:s.score,
        status:"suggested",
        reason_json:{reasons:s.reasons}
      }))
    );
  }

  revalidatePath("/admin/suggestions");
}
