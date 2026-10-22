import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { generateMicrocaptures, updateMicrocaptureStatus } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value:string | null | undefined){
  if(!value) return "";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(date);
}

export default async function MicrocapturesPage({searchParams}:{searchParams?:Promise<{gen?:string;count?:string}>}) {
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;
  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");
  const {data:client} = await supabase.from("clients").select("id").eq("user_id",authData.user.id).single();
  if(!client) redirect("/onboarding");

  const {data:suggestions} = await supabase
    .from("micro_capture_suggestions")
    .select("id,suggestion_text,estimated_seconds,tags_json,status,calendar_events(title,start_datetime)")
    .eq("client_id",client.id)
    .eq("status","suggested")
    .order("created_at",{ascending:false});

  const params = searchParams ? await searchParams : undefined;
  const count = Number(params?.count || 0);

  return <AppShell>
    <div className="page-head">
      <div>
        <div className="eyebrow">Produção</div>
        <h1>Microcaptações</h1>
        <p className="sub">Pequenas oportunidades de registro que cabem naturalmente no seu dia.</p>
      </div>
      <form action={generateMicrocaptures}><button className="btn btn-primary">Gerar sugestões</button></form>
    </div>

    {params?.gen === "ok" && <div className="notice-success"><strong>{count} nova(s) sugestão(ões) criada(s).</strong></div>}
    {params?.gen === "none" && <div className="notice-soft"><strong>Nenhuma nova oportunidade agora.</strong><span>O UNA ignorou eventos inadequados ou sensíveis.</span></div>}
    {params?.gen === "error" && <div className="notice-soft"><strong>Não foi possível gerar sugestões agora.</strong></div>}

    <div className="card" style={{marginTop:22}}>
      <div className="section-head"><h3>Para fazer</h3><span className="pill">{(suggestions||[]).length}</span></div>
      {(suggestions||[]).length===0 && <div className="empty-state">Nenhuma microcaptação pendente.</div>}
      <div className="micro-list">
        {(suggestions||[]).map((s:any)=>{
          const event = Array.isArray(s.calendar_events) ? s.calendar_events[0] : s.calendar_events;
          return <div className="micro-card" key={s.id}>
            <div className="micro-icon">◎</div>
            <div className="micro-copy">
              <div className="meta">{event?.start_datetime ? formatDate(event.start_datetime) : "Momento da rotina"}</div>
              <strong>{event?.title || "Momento da rotina"}</strong>
              <p>{s.suggestion_text}</p>
              <div className="meta">≈ {s.estimated_seconds}s{s.tags_json?.length ? ` · ${s.tags_json.join(" · ")}` : ""}</div>
            </div>
            <div className="micro-actions">
              <form action={updateMicrocaptureStatus.bind(null,s.id,"completed")}><button className="btn btn-primary">Marcar como feita</button></form>
              <form action={updateMicrocaptureStatus.bind(null,s.id,"dismissed")}><button className="btn btn-ghost">Dispensar</button></form>
            </div>
          </div>;
        })}
      </div>
    </div>
  </AppShell>;
}
