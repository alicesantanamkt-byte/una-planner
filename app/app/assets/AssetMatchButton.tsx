'use client';

import { useState } from "react";

export function AssetMatchButton(){
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");

  async function run(){
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/assets/match",{method:"POST"});
    const data = await res.json();
    setMessage(res.ok ? `${data.matches} associação(ões) encontrada(s).` : (data.error || "Erro ao analisar."));
    setLoading(false);
  }

  return <div style={{marginTop:12}}>
    <button className="btn btn-primary" disabled={loading} onClick={run}>
      {loading ? "Analisando..." : "Encontrar usos para meu banco"}
    </button>
    {message && <p className="meta">{message}</p>}
  </div>;
}
