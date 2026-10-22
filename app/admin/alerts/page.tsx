import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAlert } from "./actions";

export default async function AdminAlerts(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:alerts} = await supabase
    .from("alerts")
    .select("id,severity,type,message,created_at,clients(brand)")
    .eq("resolved",false)
    .order("created_at",{ascending:false});

  return <>
    <div className="eyebrow">Exceções</div>
    <h1>Alertas.</h1>
    <p className="sub">Só situações que exigem ação da UNA.</p>

    <div className="card" style={{marginTop:22}}>
      {(alerts||[]).length===0 && <p className="meta">Nenhum alerta aberto.</p>}
      {(alerts||[]).map((a:any)=><div className="item" key={a.id}>
        <div className="row">
          <div>
            <strong>{a.clients?.brand || "Cliente"} · {a.type || "alerta"}</strong>
            <div className="meta">{a.message}</div>
          </div>
          <form action={resolveAlert.bind(null,a.id)}>
            <button className="btn btn-soft">Resolver</button>
          </form>
        </div>
      </div>)}
    </div>
  </>;
}
