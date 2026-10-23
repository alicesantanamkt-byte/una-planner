import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAlert } from "./actions";

function formatDate(value:string){
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(value));
}

export default async function AdminAlerts(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:alerts} = await supabase
    .from("alerts")
    .select("id,severity,type,message,created_at,clients(display_name,brand)")
    .eq("resolved",false)
    .order("created_at",{ascending:false});

  const all=alerts||[];
  const high=all.filter((a:any)=>String(a.severity||"").toLowerCase()==="high").length;
  const medium=all.filter((a:any)=>String(a.severity||"").toLowerCase()==="medium").length;

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Exceções</div><h1>Alertas</h1><p className="sub">Só situações que realmente exigem intervenção da UNA.</p></div>
      <span className={`pill ${all.length?"pill-warn":"pill-ok"}`}>{all.length} aberto(s)</span>
    </div>

    <div className="admin-status-grid" style={{gridTemplateColumns:"repeat(3,minmax(0,1fr))"}}>
      <div className="admin-status-mini"><strong>{all.length}</strong><span>alertas abertos</span></div>
      <div className="admin-status-mini"><strong>{high}</strong><span>alta prioridade</span></div>
      <div className="admin-status-mini"><strong>{medium}</strong><span>média prioridade</span></div>
    </div>

    <div className="card" style={{marginTop:18}}>
      {all.length===0 && <div className="empty-state">Nenhum alerta aberto. A operação está saudável.</div>}
      <div className="admin-list">
        {all.map((a:any)=><div className="admin-row" key={a.id}>
          <div>
            <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}><strong>{a.clients?.display_name || a.clients?.brand || "Cliente"}</strong><span className={`pill ${a.severity==="high"?"pill-warn":a.severity==="medium"?"pill-violet":""}`}>{a.severity || "atenção"}</span></div>
            <div className="meta" style={{marginTop:6}}>{a.type || "alerta"} · {formatDate(a.created_at)}</div>
            <div style={{fontSize:12,marginTop:6,lineHeight:1.45}}>{a.message}</div>
          </div>
          <form action={resolveAlert.bind(null,a.id)}><button className="btn btn-primary">Marcar como resolvido</button></form>
        </div>)}
      </div>
    </div>
  </>;
}
