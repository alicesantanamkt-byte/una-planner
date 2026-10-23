import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminHome(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const [
    {count:clients},
    {count:contents},
    {count:openSuggestions},
    {count:alerts},
    {count:onboardingPending},
    {count:rejectedSuggestions},
    {data:recentClients},
    {data:recentAlerts}
  ] = await Promise.all([
    supabase.from("clients").select("*",{count:"exact",head:true}),
    supabase.from("content_items").select("*",{count:"exact",head:true}),
    supabase.from("suggested_slots").select("*",{count:"exact",head:true}).eq("status","suggested"),
    supabase.from("alerts").select("*",{count:"exact",head:true}).eq("resolved",false),
    supabase.from("clients").select("*",{count:"exact",head:true}).eq("onboarding_completed",false),
    supabase.from("suggested_slots").select("*",{count:"exact",head:true}).eq("status","rejected"),
    supabase.from("clients").select("id,display_name,brand,segment,onboarding_completed,created_at").order("created_at",{ascending:false}).limit(5),
    supabase.from("alerts").select("id,severity,type,message,created_at,clients(display_name,brand)").eq("resolved",false).order("created_at",{ascending:false}).limit(5)
  ]);

  const attentionCount = (alerts || 0) + (onboardingPending || 0) + (rejectedSuggestions || 0);

  return <>
    <div className="admin-hero">
      <div>
        <div className="eyebrow">Operação UNA</div>
        <h1>Painel de operação</h1>
        <p className="sub">Acompanhe a operação por exceção: o que está saudável fica resumido; o que exige ação aparece primeiro.</p>
      </div>
      <div className="admin-hero-note">menos acompanhamento manual.<br/>mais clareza sobre o que precisa de decisão.</div>
    </div>

    <div className="admin-stats">
      <Link href="/admin/clients" className="card admin-stat">
        <span>Clientes ativas</span><strong>{clients ?? 0}</strong><span>ver base de clientes →</span>
      </Link>
      <Link href="/admin/import" className="card admin-stat">
        <span>Conteúdos cadastrados</span><strong>{contents ?? 0}</strong><span>gerenciar calendários →</span>
      </Link>
      <Link href="/admin/suggestions" className="card admin-stat">
        <span>Horários para decidir</span><strong>{openSuggestions ?? 0}</strong><span>abrir motor →</span>
      </Link>
      <Link href="/admin/alerts" className={`card admin-stat ${attentionCount>0?"alert":""}`}>
        <span>Pontos de atenção</span><strong>{attentionCount}</strong><span>{alerts || 0} alerta(s) aberto(s)</span>
      </Link>
    </div>

    <div className="admin-grid">
      <section className="card">
        <div className="section-head">
          <div><h2 className="admin-section-title">O que precisa de atenção</h2><div className="admin-section-copy">Exceções operacionais que merecem revisão.</div></div>
          <Link href="/admin/alerts" className="section-link">Ver alertas →</Link>
        </div>
        {attentionCount===0 && <div className="empty-state">Nenhuma pendência crítica agora. A operação está saudável.</div>}
        {onboardingPending ? <div className="admin-row"><div><strong>{onboardingPending} onboarding(s) pendente(s)</strong><div className="meta">Cliente ainda não concluiu as configurações iniciais.</div></div><Link href="/admin/clients" className="btn btn-soft">Ver clientes</Link></div> : null}
        {rejectedSuggestions ? <div className="admin-row"><div><strong>{rejectedSuggestions} sugestão(ões) rejeitada(s)</strong><div className="meta">Útil para revisar padrões de horário e rotina.</div></div><Link href="/admin/suggestions" className="btn btn-soft">Abrir motor</Link></div> : null}
        {(recentAlerts||[]).map((a:any)=><div className="admin-row" key={a.id}><div><strong>{a.clients?.display_name || a.clients?.brand || "Cliente"} · {a.type || "alerta"}</strong><div className="meta">{a.message}</div></div><span className={`pill ${a.severity==="high"?"pill-warn":""}`}>{a.severity || "atenção"}</span></div>)}
      </section>

      <aside className="card">
        <h2 className="admin-section-title">Atalhos da operação</h2>
        <div className="admin-section-copy">Ações que você mais usa no dia a dia.</div>
        <div className="admin-action-grid">
          <Link href="/admin/import" className="admin-action"><strong>Importar calendário</strong><span>Adicionar ou atualizar o planejamento editorial de uma cliente.</span></Link>
          <Link href="/admin/clients" className="admin-action"><strong>Abrir clientes</strong><span>Ver onboarding, rotina e situação operacional de cada conta.</span></Link>
          <Link href="/admin/suggestions" className="admin-action"><strong>Revisar motor</strong><span>Conferir encaixes, rejeições e recalcular horários.</span></Link>
          <Link href="/admin/alerts" className="admin-action"><strong>Resolver alertas</strong><span>Tratar apenas exceções que exigem intervenção da UNA.</span></Link>
        </div>
        <div style={{marginTop:18}}>
          <div className="section-head"><h3>Clientes recentes</h3><Link href="/admin/clients" className="section-link">Ver todas →</Link></div>
          {(recentClients||[]).map((c:any)=><div className="admin-row" key={c.id}><div><strong>{c.display_name || c.brand || "Cliente"}</strong><div className="meta">{c.segment || "segmento não informado"}</div></div><span className={`pill ${c.onboarding_completed?"pill-ok":""}`}>{c.onboarding_completed?"ativa":"onboarding"}</span></div>)}
        </div>
      </aside>
    </div>
  </>;
}
