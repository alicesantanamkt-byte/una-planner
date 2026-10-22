import Link from "next/link";
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

function timeLabel(value:string){
  return new Intl.DateTimeFormat("pt-BR",{
    hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"
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

  const firstDay = new Date(`${monthKey(selected.year,selected.month)}-01T12:00:00-03:00`);
  const firstWeekday = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(selected.year,selected.month,0,12)).getUTCDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth)/7)*7;
  const cells = Array.from({length:totalCells},(_,index)=>{
    const day = index-firstWeekday+1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const grouped = new Map<string,any[]>();
  for(const event of events || []){
    const key = dayKey(event.start_datetime);
    if(!grouped.has(key)) grouped.set(key,[]);
    grouped.get(key)!.push(event);
  }

  const prev = shiftMonth(selected.year,selected.month,-1);
  const next = shiftMonth(selected.year,selected.month,1);
  const monthLabel = new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"})
    .format(new Date(Date.UTC(selected.year,selected.month-1,1,12)));
  const todayKey = dayKey(now.toISOString());
  const weekdays = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  return <AppShell>
    <CalendarAutoRefresh/>
    <div className="eyebrow">Agenda</div>
    <div className="row" style={{alignItems:"flex-end",gap:16,flexWrap:"wrap"}}>
      <div>
        <h1>Minha agenda.</h1>
        <p className="sub">Compromissos usados pelo UNA para encontrar janelas de produção.</p>
      </div>
      <div style={{display:"flex",gap:8,marginLeft:"auto",alignItems:"center"}}>
        <Link className="btn btn-soft" href={`/app/calendar?month=${monthKey(prev.year,prev.month)}`}>←</Link>
        <span className="btn btn-soft" style={{pointerEvents:"none",textTransform:"capitalize"}}>{monthLabel}</span>
        <Link className="btn btn-soft" href={`/app/calendar?month=${monthKey(next.year,next.month)}`}>→</Link>
      </div>
    </div>

    {connection && <div className="card" style={{marginTop:18,padding:16}}>
      <div className="row" style={{alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <strong>Google Agenda</strong>
        <span className={connection.auto_sync_enabled ? "pill pill-ok" : "pill"}>
          {connection.auto_sync_enabled ? "sincronização automática ativa" : "sincronização manual"}
        </span>
      </div>
      <div className="meta" style={{marginTop:6}}>Última sincronização: {formatSync(connection.last_synced_at)}</div>
    </div>}

    <div className="card" style={{marginTop:18,padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <div style={{minWidth:840}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7, minmax(0,1fr))",borderBottom:"1px solid var(--line, #e9dfd4)"}}>
            {weekdays.map(day=><div key={day} className="meta" style={{padding:"12px 10px",textAlign:"center",fontWeight:700}}>{day}</div>)}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(7, minmax(0,1fr))"}}>
            {cells.map((day,index)=>{
              if(!day) return <div key={`empty-${index}`} style={{minHeight:128,borderRight:"1px solid var(--line, #e9dfd4)",borderBottom:"1px solid var(--line, #e9dfd4)",background:"rgba(233,223,212,.18)"}}/>;

              const key = `${monthKey(selected.year,selected.month)}-${String(day).padStart(2,"0")}`;
              const dayEvents = grouped.get(key) || [];
              const isToday = key === todayKey;

              return <div key={key} style={{minHeight:128,padding:8,borderRight:"1px solid var(--line, #e9dfd4)",borderBottom:"1px solid var(--line, #e9dfd4)",verticalAlign:"top"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontWeight:700,width:28,height:28,borderRadius:999,display:"inline-flex",alignItems:"center",justifyContent:"center",background:isToday?"#26211d":"transparent",color:isToday?"#fff":"inherit"}}>{day}</span>
                  {dayEvents.length>0 && <span className="meta">{dayEvents.length}</span>}
                </div>

                <div style={{display:"grid",gap:5}}>
                  {dayEvents.slice(0,4).map((e:any)=><div key={e.id} style={{border:"1px solid var(--line, #e9dfd4)",borderRadius:8,padding:"6px 7px",background:e.source==="google"?"#fbf8f3":"#fffdf9"}} title={`${e.title}${e.location ? ` · ${e.location}` : ""}`}>
                    <div style={{fontSize:11,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{timeLabel(e.start_datetime)} · {e.title}</div>
                    <div className="meta" style={{fontSize:10,marginTop:2}}>{e.source==="google" ? "Google" : "Manual"}</div>
                    {e.source==="manual" && <div style={{marginTop:4}}><DeleteEventButton id={e.id}/></div>}
                  </div>)}
                  {dayEvents.length>4 && <div className="meta" style={{fontSize:11}}>+ {dayEvents.length-4} compromisso(s)</div>}
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>

    <details className="card" style={{marginTop:18}}>
      <summary style={{cursor:"pointer",fontWeight:700}}>Adicionar compromisso manual</summary>
      <form action={createManualEvent} style={{marginTop:16}}>
        <div className="form-grid">
          <label>Data<input name="date" type="date" required/></label>
          <label>Título<input name="title" required/></label>
          <label>Início<input name="start" type="time" required/></label>
          <label>Fim<input name="end" type="time" required/></label>
          <label>Local<input name="location"/></label>
        </div>
        <button className="btn btn-primary" style={{marginTop:14}}>Adicionar compromisso</button>
      </form>
    </details>
  </AppShell>;
}
