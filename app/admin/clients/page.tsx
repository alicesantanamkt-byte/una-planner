import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminClients(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:clients} = await supabase
    .from("clients")
    .select("id,display_name,brand,segment,calendar_mode,recording_mode,onboarding_completed,user_id,created_at")
    .order("created_at",{ascending:false});

  const userIds = (clients || []).map((c:any)=>c.user_id).filter(Boolean);
  const [{data:profiles},{data:connections},{data:alerts}] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id,name").in("id",userIds) : Promise.resolve({data:[] as any[]}),
    supabase.from("calendar_connections").select("client_id,provider,last_synced_at,auto_sync_enabled"),
    supabase.from("alerts").select("client_id,id").eq("resolved",false)
  ]);

  const profileNames = new Map((profiles || []).map((p:any)=>[p.id,p.name]));
  const connectionMap = new Map((connections || []).map((c:any)=>[c.client_id,c]));
  const alertCounts = new Map<string,number>();
  for(const alert of alerts || []) alertCounts.set(alert.client_id,(alertCounts.get(alert.client_id)||0)+1);

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">Base de clientes</div>
        <h1>Clientes</h1>
        <p className="sub">Visão operacional de onboarding, agenda, rotina e alertas.</p>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <span className="pill">{(clients||[]).length} cliente(s)</span>
        <Link className="btn btn-primary" href="/admin/clients/new">+ Novo cliente</Link>
      </div>
    </div>

    {(clients||[]).length===0 && <div className="card empty-state" style={{marginTop:20}}>Nenhuma cliente cadastrada.</div>}
    <div className="admin-client-grid">
      {(clients||[]).map((c:any)=>{
        const displayName = c.display_name || c.brand || profileNames.get(c.user_id) || "Cliente";
        const connection = connectionMap.get(c.id);
        const openAlerts = alertCounts.get(c.id) || 0;
        return <div className="card admin-client-card" key={c.id}>
          <div className="admin-client-top">
            <div><h3>{displayName}</h3><div className="meta">{c.brand && c.brand!==displayName ? c.brand : c.segment || "segmento não informado"}</div></div>
            <span className={`pill ${c.onboarding_completed?"pill-ok":"pill-warn"}`}>{c.onboarding_completed?"ativa":"onboarding"}</span>
          </div>
          <div className="admin-client-meta">
            <div><span>Segmento</span><strong>{c.segment || "não informado"}</strong></div>
            <div><span>Agenda</span><strong>{connection ? "Google conectado" : (c.calendar_mode || "não definida")}</strong></div>
            <div><span>Gravação</span><strong>{c.recording_mode || "não definida"}</strong></div>
            <div><span>Alertas</span><strong>{openAlerts}</strong></div>
          </div>
          <div className="row">
            <div className="meta">{connection?.last_synced_at ? `Agenda sincronizada em ${new Date(connection.last_synced_at).toLocaleDateString("pt-BR")}` : "Sem sincronização recente"}</div>
            <Link className="btn btn-primary" href={`/admin/clients/${c.id}`}>Abrir cliente</Link>
          </div>
        </div>;
      })}
    </div>
  </>;
}
