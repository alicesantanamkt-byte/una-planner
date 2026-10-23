import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function ClientDetail({params}:{params:Promise<{id:string}>}){
  const {id} = await params;
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:client} = await supabase.from("clients").select("*").eq("id",id).maybeSingle();
  if(!client) notFound();

  const [
    {count:events},{count:contents},{count:suggestions},{count:assets},{data:alerts},{data:connection},{count:accepted},{count:rejected}
  ] = await Promise.all([
    supabase.from("calendar_events").select("*",{count:"exact",head:true}).eq("client_id",id),
    supabase.from("content_items").select("*",{count:"exact",head:true}).eq("client_id",id),
    supabase.from("suggested_slots").select("*",{count:"exact",head:true}).eq("client_id",id),
    supabase.from("content_assets").select("*",{count:"exact",head:true}).eq("client_id",id),
    supabase.from("alerts").select("*").eq("client_id",id).eq("resolved",false).order("created_at",{ascending:false}),
    supabase.from("calendar_connections").select("provider,last_synced_at,auto_sync_enabled").eq("client_id",id).eq("provider","google").maybeSingle(),
    supabase.from("suggested_slots").select("*",{count:"exact",head:true}).eq("client_id",id).eq("status","accepted"),
    supabase.from("suggested_slots").select("*",{count:"exact",head:true}).eq("client_id",id).eq("status","rejected")
  ]);

  const name=client.display_name || client.brand || "Cliente";

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Cliente</div><h1>{name}</h1><p className="sub">{client.brand && client.brand!==name ? `${client.brand} · ` : ""}{client.segment || "Segmento não informado"}</p></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link className="btn btn-soft" href="/admin/clients">← Clientes</Link><Link className="btn btn-primary" href="/admin/import">Importar calendário</Link></div>
    </div>

    <div className="admin-status-grid">
      <div className="admin-status-mini"><strong>{contents ?? 0}</strong><span>conteúdos</span></div>
      <div className="admin-status-mini"><strong>{events ?? 0}</strong><span>eventos na agenda</span></div>
      <div className="admin-status-mini"><strong>{suggestions ?? 0}</strong><span>sugestões calculadas</span></div>
      <div className="admin-status-mini"><strong>{assets ?? 0}</strong><span>materiais no acervo</span></div>
      <div className="admin-status-mini"><strong>{alerts?.length ?? 0}</strong><span>alertas abertos</span></div>
    </div>

    <div className="admin-grid">
      <section className="card">
        <div className="section-head"><div><h2 className="admin-section-title">Situação operacional</h2><div className="admin-section-copy">Configurações e sinais que ajudam a entender a conta sem entrar no app da cliente.</div></div></div>
        <div className="admin-client-meta">
          <div><span>Onboarding</span><strong>{client.onboarding_completed?"Concluído":"Pendente"}</strong></div>
          <div><span>Google Agenda</span><strong>{connection?"Conectado":"Não conectado"}</strong></div>
          <div><span>Última sincronização</span><strong>{connection?.last_synced_at ? new Date(connection.last_synced_at).toLocaleString("pt-BR") : "Sem registro"}</strong></div>
          <div><span>Sincronização automática</span><strong>{connection?.auto_sync_enabled ? "Ativa" : "Inativa"}</strong></div>
          <div><span>Modo de gravação</span><strong>{client.recording_mode || "Não definido"}</strong></div>
          <div><span>Janela de trabalho</span><strong>{client.work_start_time || "—"} às {client.work_end_time || "—"}</strong></div>
          <div><span>Tempo mínimo livre</span><strong>{client.min_free_minutes || 15} min</strong></div>
        </div>
      </section>

      <aside className="card">
        <h2 className="admin-section-title">Decisões do motor</h2><div className="admin-section-copy">Comportamento recente das sugestões.</div>
        <div className="summary-list" style={{marginTop:16}}><div><span>Aceitas</span><strong>{accepted ?? 0}</strong></div><div><span>Rejeitadas</span><strong>{rejected ?? 0}</strong></div><div><span>Total calculado</span><strong>{suggestions ?? 0}</strong></div></div>
        <Link href="/admin/suggestions" className="btn btn-soft" style={{display:"inline-flex",marginTop:16}}>Abrir motor</Link>
      </aside>
    </div>

    <div className="card" style={{marginTop:14}}>
      <div className="section-head"><div><h2 className="admin-section-title">Alertas abertos</h2><div className="admin-section-copy">Pendências específicas desta cliente.</div></div><Link href="/admin/alerts" className="section-link">Ver todos →</Link></div>
      {(alerts||[]).length===0 && <div className="empty-state">Nenhum alerta para esta cliente.</div>}
      {(alerts||[]).map((a:any)=><div className="admin-row" key={a.id}><div><strong>{a.type || "alerta"}</strong><div className="meta">{a.message}</div></div><span className={`pill ${a.severity==="high"?"pill-warn":""}`}>{a.severity || "atenção"}</span></div>)}
    </div>
  </>;
}
