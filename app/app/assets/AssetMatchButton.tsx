'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AssetMatchButton(){
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const router=useRouter();

  async function run(){
    setLoading(true);
    setMessage("");

    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),55000);

    try{
      const res = await fetch("/api/assets/match",{method:"POST",signal:controller.signal});
      const contentType=res.headers.get("content-type") || "";
      const data=contentType.includes("application/json") ? await res.json() : {};

      if(res.ok){
        const count=Number(data.matches || 0);
        setMessage(count
          ? `${count} sugestão(ões) de uso encontrada(s).`
          : "Analisei seu banco, mas não encontrei uma associação forte o suficiente com os conteúdos atuais.");
        router.refresh();
      }else{
        setMessage(data.error || "Não foi possível analisar seu banco agora.");
      }
    }catch(error:any){
      if(error?.name==="AbortError"){
        setMessage("A análise demorou mais do que o esperado. Tente novamente.");
      }else{
        setMessage("Não foi possível concluir a análise. Tente novamente.");
      }
    }finally{
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return <div style={{marginTop:12}}>
    <button className="btn btn-primary" disabled={loading} onClick={run}>
      {loading ? "Analisando..." : "Encontrar usos para meu banco"}
    </button>
    {message && <p className="meta" style={{marginTop:8}}>{message}</p>}
  </div>;
}
