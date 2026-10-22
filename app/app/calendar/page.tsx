import { AppShell } from "@/components/AppShell";
import { createManualEvent } from "./actions";
import { DeleteEventButton } from "./DeleteEventButton";
import { CalendarAutoRefresh } from "./CalendarAutoRefresh";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatSync(value:string|null|undefined){
  if(!value) return "ainda não sincronizada";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "horário indisponível";
  return new Intl.DateTimeFormat("pt-BR",{
    day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",
    timeZone:"America/Sao_Paulo"
  }).format(date);
}

export default async function ManualCalendar(){
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return <AppShell><h1>Supabase ainda não configurado.</h1></AppShell>;
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!client) redirect("/onboarding");

  const now = new Date().toISOString();

  const [{ data: events }, { data: connection }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id,title,start_datetime,end_datetime,location,source")
      .eq("client_id", client.id)
      .gte("end_datetime", now)
      .order("start_datetime", { ascending: true }),
    supabase
      .from("calendar_connections")
      .select("last_synced_at,auto_sync_enabled")
      .eq("client_id",client.id)
      .eq("provider","google")
      .maybeSingle()
  ]);

  return <AppShell>
    <CalendarAutoRefresh/>
    <div className="eyebrow">Agenda</div>
    <h1>Minha agenda.</h1>
    <p className="sub">Compromissos atuais e futuros usados pelo UNA para encontrar janelas de produção.</p>

    {connection && <div className="card" style={{marginTop:18,padding:16}}>
      <div className="row" style={{alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <strong>Google Agenda</strong>
        <span className={connection.auto_sync_enabled ? "pill pill-ok" : "pill"}>
          {connection.auto_sync_enabled ? "sincronização automática ativa" : "sincronização manual"}
        </span>
      </div>
      <div className="meta" style={{marginTop:6}}>Última sincronização: {formatSync(connection.last_synced_at)}</div>
    </div>}

    <div className="grid">
      <form className="card half" action={createManualEvent}>
        <h3>Novo compromisso manual</h3>
        <div className="form-grid">
          <label>Data<input name="date" type="date" required/></label>
          <label>Título<input name="title" required/></label>
          <label>Início<input name="start" type="time" required/></label>
          <label>Fim<input name="end" type="time" required/></label>
          <label>Local<input name="location"/></label>
        </div>
        <button className="btn btn-primary" style={{marginTop:14}}>Adicionar compromisso</button>
      </form>

      <div className="card half">
        <h3>Próximos compromissos</h3>
        {(events||[]).length===0 && <p className="meta">Nenhum compromisso futuro cadastrado.</p>}
        {(events||[]).map((e:any)=>{
          const start = new Date(e.start_datetime);
          const end = new Date(e.end_datetime);
          return <div className="item" key={e.id}>
            <div className="row" style={{alignItems:"flex-start"}}>
              <div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <strong>{e.title}</strong>
                  <span className="pill">{e.source==="google" ? "Google" : "Manual"}</span>
                </div>
                <div className="meta">
                  {start.toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"})} · {start.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"})}–{end.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"})}
                  {e.location ? ` · ${e.location}` : ""}
                </div>
              </div>
              {e.source==="manual" && <DeleteEventButton id={e.id}/>}
            </div>
          </div>
        })}
      </div>
    </div>
  </AppShell>
}
