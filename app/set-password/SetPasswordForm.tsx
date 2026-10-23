'use client';

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm(){
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode") || "invite";
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [status,setStatus] = useState<"checking"|"ready"|"saving"|"error">("checking");
  const [message,setMessage] = useState("");

  useEffect(()=>{
    const supabase = createClient();
    if(!supabase){ setStatus("error"); setMessage("Configuração de acesso indisponível."); return; }

    let mounted = true;
    const check = async()=>{
      await new Promise(resolve=>setTimeout(resolve,250));
      const {data,error} = await supabase.auth.getSession();
      if(!mounted) return;
      if(error || !data.session){
        setStatus("error");
        setMessage("Este link de acesso não é mais válido. Solicite um novo acesso à UNA.");
        return;
      }
      setStatus("ready");
    };
    check();
    return ()=>{mounted=false};
  },[]);

  async function submit(event:FormEvent){
    event.preventDefault();
    if(password.length < 8){ setMessage("A senha precisa ter pelo menos 8 caracteres."); return; }
    if(password !== confirm){ setMessage("As senhas não coincidem."); return; }

    const supabase = createClient();
    if(!supabase) return;
    setStatus("saving");
    setMessage("");
    const {error} = await supabase.auth.updateUser({password});
    if(error){
      setStatus("ready");
      setMessage("Não foi possível salvar a senha. Tente novamente.");
      return;
    }

    router.replace(mode === "recovery" ? "/app" : "/onboarding");
    router.refresh();
  }

  return <form onSubmit={submit} className="card password-card">
    {status==="checking" && <div className="empty-state">Validando seu acesso…</div>}
    {status==="error" && <div className="notice-soft"><strong>Link inválido ou expirado</strong><span>{message}</span></div>}
    {(status==="ready" || status==="saving") && <>
      <label>Nova senha
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="Mínimo de 8 caracteres"/>
      </label>
      <label style={{marginTop:12}}>Confirmar senha
        <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" placeholder="Digite novamente"/>
      </label>
      {message && <div className="meta" style={{marginTop:10,color:"#9b4e48"}}>{message}</div>}
      <button className="btn btn-primary" style={{marginTop:16,width:"100%"}} disabled={status==="saving"}>
        {status==="saving" ? "Salvando…" : "Criar minha senha"}
      </button>
    </>}
  </form>;
}
