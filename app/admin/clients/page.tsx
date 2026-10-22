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
  const {data:profiles} = userIds.length
    ? await supabase.from("profiles").select("id,name").in("id",userIds)
    : {data:[] as any[]};

  const profileNames = new Map((profiles || []).map((p:any)=>[p.id,p.name]));

  return <>
    <div className="eyebrow">Base de clientes</div>
    <h1>Clientes.</h1>
    <p className="sub">Visão operacional de onboarding, agenda e produção.</p>

    <div className="card" style={{marginTop:22}}>
      {(clients||[]).length===0 && <p className="meta">Nenhuma cliente cadastrada.</p>}
      {(clients||[]).map((c:any)=>{
        const displayName = c.display_name || c.brand || profileNames.get(c.user_id) || "Cliente";
        return <div className="item" key={c.id}>
          <div className="row">
            <div>
              <strong>{displayName}</strong>
              <div className="meta">
                {c.brand && c.brand !== displayName ? `${c.brand} · ` : ""}{c.segment || "segmento não informado"} · {c.calendar_mode || "agenda não definida"} · {c.recording_mode || "gravação não definida"}
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span className={`pill ${c.onboarding_completed?"pill-ok":""}`}>
                {c.onboarding_completed?"onboarding concluído":"onboarding pendente"}
              </span>
              <Link className="btn btn-soft" href={`/admin/clients/${c.id}`}>Abrir</Link>
            </div>
          </div>
        </div>;
      })}
    </div>
  </>;
}
