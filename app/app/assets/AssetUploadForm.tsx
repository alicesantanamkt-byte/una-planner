'use client';

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 150 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg","image/png","image/webp",
  "video/mp4","video/quicktime","video/webm"
]);

export function AssetUploadForm({clientId,userId}:{clientId:string;userId:string}){
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState<{type:"ok"|"error";text:string}|null>(null);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    setMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const context = String(data.get("context") || "").trim().slice(0,500);
    const tags = String(data.get("tags") || "")
      .split(",")
      .map(v=>v.trim().slice(0,50))
      .filter(Boolean)
      .slice(0,20);

    if(!(file instanceof File) || !file.size){
      setMessage({type:"error",text:"Escolha uma foto ou vídeo."});
      return;
    }
    if(!ALLOWED_TYPES.has(file.type)){
      setMessage({type:"error",text:"Esse tipo de arquivo não é aceito."});
      return;
    }
    if(file.size > MAX_FILE_SIZE){
      setMessage({type:"error",text:"O arquivo excede o limite de 150 MB."});
      return;
    }

    const supabase = createClient();
    if(!supabase){
      setMessage({type:"error",text:"Não foi possível conectar ao armazenamento."});
      return;
    }

    setSaving(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120) || "arquivo";
    const path = `${clientId}/${crypto.randomUUID()}-${safeName}`;

    try{
      const {error:uploadError} = await supabase.storage
        .from("client-assets")
        .upload(path,file,{upsert:false,contentType:file.type});
      if(uploadError) throw uploadError;

      const {error:insertError} = await supabase.from("content_assets").insert({
        client_id:clientId,
        uploaded_by:userId,
        file_url:null,
        storage_path:path,
        asset_type:file.type.startsWith("video/") ? "video" : "image",
        captured_at:new Date().toISOString(),
        context:context || null,
        tags_json:tags,
        consent_status:"self_owned"
      });

      if(insertError){
        await supabase.storage.from("client-assets").remove([path]);
        throw insertError;
      }

      formRef.current?.reset();
      setMessage({type:"ok",text:"Material salvo no Banco de conteúdo."});
      router.refresh();
    }catch(error:any){
      console.error("Asset upload failed",error);
      setMessage({type:"error",text:error?.message || "Não foi possível salvar o material. Tente novamente."});
    }finally{
      setSaving(false);
    }
  }

  return <form ref={formRef} onSubmit={submit} className="card">
    <h3>Adicionar material</h3>
    <label>Foto ou vídeo
      <input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" required disabled={saving}/>
    </label>
    <label style={{marginTop:12}}>Contexto
      <input name="context" maxLength={500} placeholder="Ex.: trabalhando no notebook, bastidor de reunião..." disabled={saving}/>
    </label>
    <label style={{marginTop:12}}>Tags
      <input name="tags" placeholder="bastidor, rotina, autoridade" disabled={saving}/>
    </label>
    <button className="btn btn-primary" style={{marginTop:16}} disabled={saving}>
      {saving ? "Salvando..." : "Salvar no banco"}
    </button>
    {message && <p className="meta" style={{marginTop:12}}>{message.text}</p>}
  </form>;
}
