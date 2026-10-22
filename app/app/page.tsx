import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function saoPauloDayRange(){
  const now = new Date();
  const key = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
  return {start:`${key}T00:00:00-03:00`,end:`${key}T23:59:59-03:00`,key};
}

function timeLabel(value:string){
  return new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(value));
}

function dateLabel(){
  return new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date());
}

function greetingLabel(){
  const parts = new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",hourCycle:"h23",timeZone:"America/Sao_Paulo"}).formatToParts(new Date());
  const hour = Number(parts.find(part=>part.type==="hour")?.value || 0);
  if(hour < 12) return "Bom dia";
  if(hour < 18) return "Boa tarde";
  return "Boa noite";
}

function firstName(value:string|null|undefined){
  return String(value || "").trim().split(/\s+/)[0] || "você";
}

export default async function ClientHome(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Conecte o Supabase para ativar dados reais.</h1></AppShell>;

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client} = await supabase
    .from("clients")
    .select("id,onboarding_completed,display_name")
    .eq("user_id",authData.user.id)
    .maybeSingle();

  if(!client?.onboarding_completed) redirect("/onboarding");

  const day = saoPauloDayRange();

  const [
    {data:todayEvents},
    {count:suggestionCount},
    {count:microCount},
    {count:assetCount},
    {data:nextContents},
    {data:acceptedToday}
  ] = await Promise.all([
    supabase.from("calendar_events").select("id,title,start_datetime,end_datetime,source,metadata_json").eq("client_id",client.id).gte("start_datetime",day.start).lte("start_datetime",day.end).order("start_datetime",{ascending:true}),
    supabase.from("suggested_slots").select("*",{count:"exact",head:true}).eq("client_id",client.id).eq("status","suggested"),
    supabase.from("micro_capture_suggestions").select("*",{count:"exact",head:true}).eq("client_id",client.id).eq("status","suggested"),
    supabase.from("content_assets").select("*",{count:"exact",head:true}).eq("client_id",client.id),
    supabase.from("content_items").select("id,title,format,publish_at,status").eq("client_id",client.id).in("status",["pending","planned"]).not("publish_at","is",null).order("publish_at",{ascending:true}).limit(3),
    supabase.from("suggested_slots").select("id,start_datetime,end_datetime,content_items(title)").eq("client_id",client.id).eq("status","accepted").gte("start_datetime",day.start).lte("start_datetime",day.end).order("start_datetime",{ascending:true})
  ]);

  const recordingToday = (acceptedToday || []).length;
  const name = firstName(client.display_name || authData.user.user_metadata?.name);
  const greeting = greetingLabel();

  return <AppShell>
    <div className="hero-row home-hero">
      <div>
        <div className="kicker-date">{dateLabel()}</div>
        <h1>{greeting}, {name}!</h1>
        <p className="sub">Aqui está o seu dia e os próximos passos da sua produção.</p>
      </div>
      <div className="home-manifesto">conteúdo com propósito<br/>cria conexões que ficam.</div>
    </div>

    <div className="home-stats">
      <Link href="/app/tasks" className="card stat-card stat-link">
        <div className="stat-number">{recordingToday}</div>
        <div className="stat-label">conteúdo(s) para gravar hoje</div>
      </Link>
      <Link href="/app/microcaptures" className="card stat-card stat-link">
        <div className="stat-number">{microCount ?? 0}</div>
        <div className="stat-label">microcaptação(ões) pendente(s)</div>
      </Link>
      <Link href="/app/suggestions" className="card stat-card stat-link">
        <div className="stat-number">{suggestionCount ?? 0}</div>
        <div className="stat-label">horário(s) aguardando decisão</div>
      </Link>
      <Link href="/app/assets" className="card stat-card stat-link">
        <div className="stat-number">{assetCount ?? 0}</div>
        <div className="stat-label">material(is) no banco de conteúdo</div>
      </Link>
    </div>

    <div className="today-layout">
      <section className="card">
        <div className="section-head">
          <h3>Seu dia hoje</h3>
          <Link href="/app/calendar" className="section-link">Ver agenda completa →</Link>
        </div>
        <div className="timeline">
          {(todayEvents || []).length===0 && <p className="meta">Nenhum compromisso sincronizado para hoje.</p>}
          {(todayEvents || []).slice(0,9).map((event:any)=>{
            const createdByUna = Boolean(event.metadata_json?.created_by_una) || String(event.title || "").startsWith("Gravação UNA");
            return <div className="timeline-row" key={event.id}>
              <div className="timeline-time">{timeLabel(event.start_datetime)}</div>
              <span className={`timeline-dot ${createdByUna?"una":""}`}/>
              <div className={`timeline-content ${createdByUna?"highlight":""}`}>{event.title}</div>
            </div>;
          })}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h3>Próximos conteúdos</h3>
          <Link href="/app/month" className="section-link">Ver todos →</Link>
        </div>
        <div className="content-preview-grid">
          {(nextContents || []).length===0 && <p className="meta">Nenhum conteúdo futuro cadastrado.</p>}
          {(nextContents || []).map((content:any)=><div className="content-preview" key={content.id}>
            <span className="pill">{content.format || "conteúdo"}</span>
            <strong style={{marginTop:8}}>{content.title}</strong>
            <div className="meta">{content.publish_at ? new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",timeZone:"America/Sao_Paulo"}).format(new Date(content.publish_at)) : "sem data"}</div>
          </div>)}
        </div>
      </section>
    </div>
  </AppShell>
}
