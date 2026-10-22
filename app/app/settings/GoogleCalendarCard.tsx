'use client';

import { useEffect, useMemo, useState } from "react";

type Props = {
  connected:boolean;
  lastSyncedAt?:string|null;
  autoSyncEnabled?:boolean;
  watchExpiration?:string|null;
};

function formatDateTime(value?:string|null){
  if(!value) return "ainda não sincronizada";
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return "horário indisponível";
  return new Intl.DateTimeFormat("pt-BR",{
    day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",
    timeZone:"America/Sao_Paulo"
  }).format(date);
}

export function GoogleCalendarCard({connected,lastSyncedAt,autoSyncEnabled=true,watchExpiration}:Props) {
  const [syncing,setSyncing] = useState(false);
  const [message,setMessage] = useState("");
  const [lastSync,setLastSync] = useState(lastSyncedAt || null);
  const [autoActive,setAutoActive] = useState(Boolean(connected && autoSyncEnabled && watchExpiration && new Date(watchExpiration).getTime()>Date.now()));

  const lastSyncLabel=useMemo(()=>formatDateTime(lastSync),[lastSync]);

  async function sync(silent=false){
    if(syncing) return;
    setSyncing(true);
    if(!silent) setMessage("");

    const controller = new AbortController();
    const timeout = window.setTimeout(()=>controller.abort(),45000);

    try {
      const result = await fetch("/api/google/calendar/sync",{
        method:"POST",
        signal:controller.signal
      });

      const contentType = result.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await result.json()
        : {error:"A sincronização retornou uma resposta inesperada."};

      if(result.ok){
        setLastSync(new Date().toISOString());
        setAutoActive(data.autoSync===true);
        if(!silent) setMessage(`${data.imported ?? 0} alteração(ões) sincronizada(s).`);
      } else {
        if(!silent) setMessage(data.error || "Não foi possível sincronizar.");
      }
    } catch(error:any) {
      if(!silent){
        if(error?.name==="AbortError") setMessage("A sincronização demorou mais do que o esperado. Tente novamente.");
        else setMessage("Não foi possível concluir a sincronização. Tente novamente.");
      }
    } finally {
      window.clearTimeout(timeout);
      setSyncing(false);
    }
  }

  useEffect(()=>{
    if(!connected) return;
    const expired=!watchExpiration || new Date(watchExpiration).getTime()<=Date.now()+24*60*60*1000;
    if(expired || !autoActive) void sync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[connected]);

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

    {connected && <div style={{display:"grid",gap:6,marginBottom:14}}>
      <div className="meta"><strong>Última sincronização:</strong> {lastSyncLabel}</div>
      <div className="meta"><strong>Sincronização automática:</strong> {autoActive ? "ativa" : "ativando…"}</div>
    </div>}

    {!connected ? (
      <a className="btn btn-primary" href="/api/google/calendar/connect">Conectar Google Agenda</a>
    ) : (
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button className="btn btn-primary" disabled={syncing} onClick={()=>sync(false)}>
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
        <button className="btn btn-soft" onClick={disconnect}>Desconectar</button>
        <span className="pill pill-ok">conectado</span>
      </div>
    )}
    {message && <p className="meta">{message}</p>}
  </div>;
}
