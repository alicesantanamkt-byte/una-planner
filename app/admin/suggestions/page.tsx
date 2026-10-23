import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recalculateSuggestions } from "./actions";

function formatDateTime(value:string){
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(value));
}

export default async function SuggestionsPage(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const [{data:clients},{data:suggestions}] = await Promise.all([
    supabase.from("clients").select("id,display_name,brand,user_id").order("display_name",{ascending:true,nullsFirst:false}),
    supabase.from("suggested_slots").select("id,start_datetime,end_datetime,score,status,reason_json,content_items(title),clients(display_name,brand)").order("start_datetime",{ascending:true})
  ]);

  const all=suggestions||[];
  const counts={
    suggested:all.filter((s:any)=>s.status==="suggested").length,
    accepted:all.filter((s:any)=>s.status==="accepted").length,
    rejected:all.filter((s:any)=>s.status==="rejected").length,
  };

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Motor</div><h1>Sugestões de gravação</h1><p className="sub">Visão interna dos encaixes calculados, decisões das clientes e padrões de rejeição.</p></div>
      <form action={recalculateSuggestions} style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
        <label style={{minWidth:220}}>Cliente
          <select name="clientId" required><option value="">Selecione</option>{(clients||[]).map((c:any)=><option key={c.id} value={c.id}>{c.display_name || c.brand || c.user_id}</option>)}</select>
        </label>
        <button className="btn btn-primary">Recalcular encaixes</button>
      </form>
    </div>

    <div className="admin-status-grid">
      <div className="admin-status-mini"><strong>{counts.suggested}</strong><span>aguardando decisão</span></div>
      <div className="admin-status-mini"><strong>{counts.accepted}</strong><span>aceitas</span></div>
      <div className="admin-status-mini"><strong>{counts.rejected}</strong><span>rejeitadas</span></div>
      <div className="admin-status-mini"><strong>{all.length}</strong><span>total calculado</span></div>
      <div className="admin-status-mini"><strong>{new Set(all.map((s:any)=>s.clients?.display_name || s.clients?.brand).filter(Boolean)).size}</strong><span>clientes com histórico</span></div>
    </div>

    <div className="card" style={{marginTop:18}}>
      <div className="section-head"><div><h2 className="admin-section-title">Histórico do motor</h2><div className="admin-section-copy">O score continua visível aqui porque é uma ferramenta interna da UNA.</div></div></div>
      {all.length===0 && <div className="empty-state">Nenhuma sugestão calculada ainda.</div>}
      <div className="admin-list">
        {all.map((s:any)=><div className="admin-row" key={s.id}>
          <div>
            <strong>{s.clients?.display_name || s.clients?.brand || "Cliente"} · {s.content_items?.title || "Conteúdo"}</strong>
            <div className="meta">{formatDateTime(s.start_datetime)}{(s.reason_json?.reasons||[]).length ? ` · ${(s.reason_json.reasons||[]).join(" · ")}` : ""}{s.reason_json?.rejection_reason ? ` · rejeição: ${s.reason_json.rejection_reason}` : ""}</div>
          </div>
          <div className="admin-row-actions">
            <span className={`pill ${s.status==="accepted"?"pill-ok":s.status==="rejected"?"pill-warn":""}`}>{s.status==="suggested"?"aguardando":s.status==="accepted"?"aceita":"rejeitada"}</span>
            <span className="pill">{s.score}/100</span>
          </div>
        </div>)}
      </div>
    </div>
  </>;
}
