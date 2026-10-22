import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { generateMicrocaptures, updateMicrocaptureStatus } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value:string | null | undefined){
  if(!value) return "";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR",{
    day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",
    timeZone:"America/Sao_Paulo"
  }).format(date);
}

export default async function MicrocapturesPage({searchParams}:{searchParams?:Promise<{gen?:string;count?:string}>}) {
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client} = await supabase
    .from("clients")
    .select("id")
    .eq("user_id",authData.user.id)
    .single();

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
    <div className="eyebrow">Rotina inteligente</div>
    <h1>Microcaptações.</h1>
    <p className="sub">Pequenas cenas que cabem na sua rotina e podem virar material de apoio para conteúdos futuros.</p>

    {params?.gen === "ok" && <div className="card" style={{marginTop:18,padding:16}}><strong>{count} nova(s) microcaptação(ões) sugerida(s).</strong></div>}
    {params?.gen === "none" && <div className="card" style={{marginTop:18,padding:16}}><strong>Nenhuma nova oportunidade encontrada agora.</strong><div className="meta" style={{marginTop:6}}>O UNA ignorou eventos de dia inteiro, aniversários, gravações já planejadas e contextos sensíveis.</div></div>}
    {params?.gen === "error" && <div className="card" style={{marginTop:18,padding:16}}><strong>Não foi possível gerar sugestões agora.</strong></div>}

    <form action={generateMicrocaptures} style={{marginTop:18}}>
      <button className="btn btn-primary">Gerar sugestões</button>
    </form>

    <div className="card" style={{marginTop:22}}>
      {(suggestions||[]).length===0 && <p className="meta">Nenhuma microcaptação pendente. Clique em “Gerar sugestões”.</p>}
      {(suggestions||[]).map((s:any)=>{
        const event = Array.isArray(s.calendar_events) ? s.calendar_events[0] : s.calendar_events;
        return <div className="item" key={s.id}>
          <div className="row" style={{alignItems:"flex-start",gap:14}}>
            <div style={{minWidth:0}}>
              <strong>{event?.title || "Momento da rotina"}</strong>
              {event?.start_datetime && <div className="meta" style={{marginTop:3}}>{formatDate(event.start_datetime)}</div>}
              <div className="meta" style={{marginTop:6}}>{s.suggestion_text}</div>
              <div className="meta" style={{marginTop:4}}>≈ {s.estimated_seconds}s{s.tags_json?.length ? ` · ${s.tags_json.join(" · ")}` : ""}</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <form action={updateMicrocaptureStatus.bind(null,s.id,"completed")}>
                <button className="btn btn-primary">Feita</button>
              </form>
              <form action={updateMicrocaptureStatus.bind(null,s.id,"dismissed")}>
                <button className="btn btn-soft">Dispensar</button>
              </form>
            </div>
          </div>
        </div>;
      })}
    </div>
  </AppShell>;
}
