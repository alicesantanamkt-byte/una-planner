'use client';

import { useState } from "react";

export function GoogleCalendarCard({connected}:{connected:boolean}) {
  const [syncing,setSyncing] = useState(false);
  const [message,setMessage] = useState("");

  async function sync(){
    setSyncing(true);
    setMessage("");
    const result = await fetch("/api/google/calendar/sync",{method:"POST"});
    const data = await result.json();
    if(result.ok) setMessage(`${data.imported ?? 0} evento(s) sincronizado(s).`);
    else if(data.resetRequired) setMessage("A sincronização precisa ser reiniciada. Tente novamente.");
    else setMessage(data.error || "Não foi possível sincronizar.");
    setSyncing(false);
  }

  async function disconnect(){
    if(!confirm("Desconectar o Google Agenda do UNA Planner?")) return;
    const result = await fetch("/api/google/calendar/disconnect",{method:"POST"});
    if(result.ok) window.location.reload();
  }

  return <div className="card" style={{marginTop:18}}>
    <h3>Google Agenda</h3>
    <p className="meta">
      {connected
        ? "Sua agenda está conectada ao UNA Planner."
        : "Conecte sua agenda para o sistema encontrar janelas livres e criar gravações aceitas."}
    </p>
    {!connected ? (
      <a className="btn btn-primary" href="/api/google/calendar/connect">Conectar Google Agenda</a>
    ) : (
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button className="btn btn-primary" disabled={syncing} onClick={sync}>
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
        <button className="btn btn-soft" onClick={disconnect}>Desconectar</button>
        <span className="pill pill-ok">conectado</span>
      </div>
    )}
    {message && <p className="meta">{message}</p>}
  </div>;
}
