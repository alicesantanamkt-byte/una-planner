'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 150 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg","image/png","image/webp",
  "video/mp4","video/quicktime","video/webm"
]);

export async function uploadAsset(formData:FormData){
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

  const file = formData.get("file");
  const context = String(formData.get("context") || "").slice(0,500);
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map(v=>v.trim().slice(0,50))
    .filter(Boolean)
    .slice(0,20);

  if(!(file instanceof File)) return;
  if(!ALLOWED_TYPES.has(file.type)) throw new Error("Tipo de arquivo não permitido.");
  if(file.size > MAX_FILE_SIZE) throw new Error("Arquivo excede o limite de 150 MB.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120);
  const path = `${client.id}/${crypto.randomUUID()}-${safeName}`;

  const {error:uploadError} = await supabase.storage
    .from("client-assets")
    .upload(path,file,{upsert:false,contentType:file.type});

  if(uploadError) throw uploadError;

  await supabase.from("content_assets").insert({
    client_id:client.id,
    uploaded_by:authData.user.id,
    file_url:null,
    storage_path:path,
    asset_type:file.type.startsWith("video/") ? "video" : "image",
    captured_at:new Date().toISOString(),
    context:context || null,
    tags_json:tags,
    consent_status:"self_owned"
  });

  revalidatePath("/app/assets");
}

export async function deleteAsset(id:string){
  const supabase = await createServerSupabaseClient();
  if(!supabase) throw new Error("Supabase não configurado.");

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:asset} = await supabase
    .from("content_assets")
    .select("id,storage_path,client_id,clients!inner(user_id)")
    .eq("id",id)
    .eq("clients.user_id",authData.user.id)
    .single();

  if(!asset) throw new Error("Arquivo não encontrado.");

  if(asset.storage_path){
    await supabase.storage.from("client-assets").remove([asset.storage_path]);
  }

  await supabase.from("content_assets").delete().eq("id",id);
  revalidatePath("/app/assets");
}
