'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/importers";

export async function importSpreadsheet(formData:FormData){
  const supabase = await createServerSupabaseClient();
  if(!supabase) redirect("/admin/import?error=supabase");

  const clientId = String(formData.get("clientId") || "");
  const file = formData.get("file");
  if(!clientId || !(file instanceof File)) redirect("/admin/import?error=missing");

  const buffer = await file.arrayBuffer();
  const items = parseSpreadsheet(buffer);

  if(!items.length) redirect("/admin/import?error=no_rows");

  const rows = items.map(item=>({
    client_id:clientId,
    title:item.title,
    format:item.format || null,
    publish_at:item.publishAt || null,
    estimated_minutes:item.estimatedMinutes || 15,
    preferred_location:item.preferredLocation || null,
    status:"pending"
  }));

  const {error} = await supabase.from("content_items").insert(rows);
  if(error) {
    console.error("Spreadsheet import failed",error);
    redirect(`/admin/import?error=db&message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/import");
  revalidatePath("/admin");
  revalidatePath("/app/month");
  revalidatePath("/app/tasks");
  redirect(`/admin/import?imported=${rows.length}`);
}
