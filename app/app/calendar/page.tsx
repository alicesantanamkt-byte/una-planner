import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createManualEvent } from "./actions";
import { CalendarAutoRefresh } from "./CalendarAutoRefresh";
import { CalendarMonthView } from "./CalendarMonthView";
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

function parseMonth(value?:string){
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if(!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if(month < 1 || month > 12) return null;
  return {year,month};
}

function monthKey(year:number,month:number){
  return `${year}-${String(month).padStart(2,"0")}`;
}

function shiftMonth(year:number,month:number,offset:number){
  const d = new Date(Date.UTC(year,month-1+offset,1,12));
  return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1};
}

function dayKey(value:string){
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"
  }).format(new Date(value));
}

export default async function ManualCalendar({searchParams}:{searchParams?:Promise<{month?:string}>}){
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <AppShell><h1>Supabase ainda não configurado.</h1></AppShell>;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!client) redirect("/onboarding");

  const params = searchParams ? await searchParams : undefined;
  const requested = parseMonth(params?.month);
  const now = new Date();
  const currentParts = new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit"
  }).formatToParts(now);
  const currentYear = Number(currentParts.find(p=>p.type==="year")?.value || now.getUTCFullYear());
  const currentMonth = Number(currentParts.find(p=>p.type==="month")?.value || now.getUTCMonth()+1);
  const selected = requested || {year:currentYear,month:currentMonth};

  const monthStart = `${monthKey(selected.year,selected.month)}-01T00:00:00-03:00`;
  const nextMonth = shiftMonth(selected.year,selected.month,1);
  const monthEnd = `${monthKey(nextMonth.year,nextMonth.month)}-01T00:00:00-03:00`;

  const [{ data: events }, { data: connection }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id,title,start_datetime,end_datetime,location,source")
      .eq("client_id", client.id)
      .lt("start_datetime",monthEnd)
      .gt("end_datetime",monthStart)
      .order("start_datetime", { ascending: true }),
    supabase
      .from("calendar_connections")
      .select("last_synced_at,auto_sync_enabled")
      .eq("client_id",client.id)
      .eq("provider","google")
      .maybeSingle()
  ]);

  const prev = shiftMonth(selected.year,selected.month,-1);
  const next = shiftMonth(selected.year,selected.month,1);
  const monthLabel = new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"})
    .format(new Date(Date.UTC(selected.year,selected.month-1,1,12)));
  const todayKey = dayKey(now.toISOString());

  return <AppShell>
    <CalendarAutoRefresh/>

    <div className="hero-row">
      <div>
        <div className="eyebrow">Planejamento</div>
        <h1>Minha agenda</h1>
        <p className="sub">Seus compromissos, gravações e microcaptações em um só lugar.</p>
      </div>
      <details>
        <summary className="btn btn-primary" style={{listStyle:"none",cursor:"pointer"}}>+ Novo compromisso</summary>
        <div className="card" style={{position:"absolute",right:30,marginTop:8,zIndex:20,width:360,maxWidth:"calc(100vw - 40px)"}}>
          <form action={createManualEvent}>
            <div className="form-grid">
              <label>Data<input name="date" type="date" required/></label>
              <label>Título<input name="title" required/></label>
              <label>Início<input name="start" type="time" required/></label>
              <label>Fim<input name="end" type="time" required/></label>
              <label>Local<input name="location"/></label>
            </div>
            <button className="btn btn-primary" style={{marginTop:12}}>Adicionar compromisso</button>
          </form>
        </div>
      </details>
    </div>

    <div className="calendar-toolbar card" style={{marginTop:18}}>
      <Link className="btn btn-soft" href={`/app/calendar?month=${monthKey(prev.year,prev.month)}`}>←</Link>
      <div className="calendar-month-label">{monthLabel}</div>
      <Link className="btn btn-soft" href={`/app/calendar?month=${monthKey(currentYear,currentMonth)}`}>Hoje</Link>
      <Link className="btn btn-soft" href={`/app/calendar?month=${monthKey(next.year,next.month)}`}>→</Link>
      {connection && <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <span className={connection.auto_sync_enabled?"pill pill-ok":"pill"}>{connection.auto_sync_enabled?"Google sincronizado":"sincronização manual"}</span>
        <span className="meta">Última: {formatSync(connection.last_synced_at)}</span>
      </div>}
    </div>

    <CalendarMonthView
      year={selected.year}
      month={selected.month}
      todayKey={todayKey}
      events={(events || []).map((event:any)=>({
        id:event.id,
        title:event.title,
        start_datetime:event.start_datetime,
        end_datetime:event.end_datetime,
        location:event.location,
        source:event.source
      }))}
    />
  </AppShell>;
}
