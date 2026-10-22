'use server';

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/importers";

export async function importSpreadsheet(formData:FormData){
  const supabase = await createServerSupabaseClient();
  if(!supabase) throw new Error("Supabase não configurado.");

  const clientId = String(formData.get("clientId") || "");
  const file = formData.get("file");
  if(!clientId || !(file instanceof File)) return;

  const buffer = await file.arrayBuffer();
  const items = parseSpreadsheet(buffer);

  if(!items.length) return;

  const rows = items.map(item=>({
    client_id:clientId,
    title:item.title,
    format:item.format || null,
    publish_at:item.publishAt || null,
    estimated_minutes:item.estimatedMinutes || 15,
    preferred_location:item.preferredLocation || null,
    status:"pending"
  }));

  await supabase.from("content_items").insert(rows);
  revalidatePath("/admin/import");
  revalidatePath("/admin");
}
