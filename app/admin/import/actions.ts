'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/importers";

function normalizeText(value:string|null|undefined){
  return String(value || "").trim().toLowerCase().replace(/\s+/g," ");
}

function dateKey(value:string|null|undefined){
  if(!value) return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"
  }).format(date);
}

function contentKey(item:{title?:string|null;format?:string|null;publish_at?:string|null;publishAt?:string|null}){
  return [normalizeText(item.title),normalizeText(item.format),dateKey(item.publish_at || item.publishAt || null)].join("|");
}

export async function importSpreadsheet(formData:FormData){
  const supabase = await createServerSupabaseClient();
  if(!supabase) redirect("/admin/import?error=supabase");

  const clientId = String(formData.get("clientId") || "");
  const file = formData.get("file");
  if(!clientId || !(file instanceof File)) redirect("/admin/import?error=missing");

  const buffer = await file.arrayBuffer();
  const items = parseSpreadsheet(buffer);
  if(!items.length) redirect("/admin/import?error=no_rows");

  const {data:existing,error:existingError} = await supabase
    .from("content_items")
    .select("title,format,publish_at")
    .eq("client_id",clientId);

  if(existingError){
    console.error("Could not load existing contents before import",existingError);
    redirect(`/admin/import?error=db&message=${encodeURIComponent(existingError.message)}`);
  }

  const seen = new Set((existing || []).map((item:any)=>contentKey(item)));
  const rows:any[]=[];
  let skipped=0;

  for(const item of items){
    const row={
      client_id:clientId,
      title:item.title,
      format:item.format || null,
      publish_at:item.publishAt || null,
      estimated_minutes:item.estimatedMinutes || 15,
      preferred_location:item.preferredLocation || null,
      status:"pending"
    };
    const key=contentKey(row);
    if(seen.has(key)){
      skipped++;
      continue;
    }
    seen.add(key);
    rows.push(row);
  }

  if(rows.length){
    const {error} = await supabase.from("content_items").insert(rows);
    if(error) {
      console.error("Spreadsheet import failed",error);
      redirect(`/admin/import?error=db&message=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/admin/import");
  revalidatePath("/admin");
  revalidatePath("/app/month");
  revalidatePath("/app/tasks");
  redirect(`/admin/import?imported=${rows.length}&skipped=${skipped}`);
}
