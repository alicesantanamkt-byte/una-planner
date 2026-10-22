'use client';

import { useState, useTransition } from "react";
import { acceptSuggestion, rejectSuggestion } from "./actions";

export function SuggestionActions({id,status}:{id:string;status:string}){
  const [pending,startTransition]=useTransition();
  const [reason,setReason]=useState("");

  if(status==="accepted"){
    return <span className="pill pill-ok">aceito</span>;
  }
  if(status==="rejected"){
    return <span className="pill">rejeitado</span>;
  }

  return <div style={{display:"grid",gap:8,minWidth:180}}>
    <div style={{display:"flex",gap:8}}>
      <button
        className="btn btn-primary"
        disabled={pending}
        onClick={()=>startTransition(()=>acceptSuggestion(id))}
      >
        {pending?"Salvando...":"Aceitar"}
      </button>
      <button
        className="btn btn-soft"
        disabled={pending}
        onClick={()=>startTransition(()=>rejectSuggestion(id,reason))}
      >
        Não consigo
      </button>
    </div>
    <input
      value={reason}
      onChange={e=>setReason(e.target.value)}
      placeholder="Motivo opcional"
    />
  </div>;
}
