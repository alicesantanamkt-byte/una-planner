import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function monthKey(date:Date){ return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`; }
function parseMonth(value?:string){
  if(!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year,month]=value.split("-").map(Number);
  if(month<1||month>12) return null;
  return new Date(Date.UTC(year,month-1,1,12));
}
function shiftMonth(date:Date,offset:number){ return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+offset,1,12)); }
function tone(format:string|null){
  const v=String(format||"").toLowerCase();
  if(v.includes("reel")) return "month-chip reel";
  if(v.includes("carross")) return "month-chip carousel";
  if(v.includes("story")) return "month-chip story";
  if(v.includes("b-roll")||v.includes("broll")) return "month-chip broll";
  return "month-chip";
}

export default async function Month({searchParams}:{searchParams?:Promise<{month?:string}>}){
  const supabase=await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;
  const {data:authData}=await supabase.auth.getUser();
  if(!authData.user) redirect("/login");
  const {data:client}=await supabase.from("clients").select("id").eq("user_id",authData.user.id).single();
  if(!client) redirect("/onboarding");

  const {data:items}=await supabase.from("content_items")
    .select("id,title,format,publish_at,status,estimated_minutes")
    .eq("client_id",client.id).order("publish_at",{ascending:true});

  const params=searchParams?await searchParams:undefined;
  const requestedMonth=parseMonth(params?.month);
  const now=new Date();
  const currentMonth=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1,12));
  let selectedMonth=requestedMonth||currentMonth;
  if(!requestedMonth){
    const currentKey=monthKey(currentMonth);
    const hasCurrent=(items||[]).some((item:any)=>item.publish_at&&monthKey(new Date(item.publish_at))===currentKey);
    if(!hasCurrent){
      const future=(items||[]).find((item:any)=>item.publish_at&&new Date(item.publish_at)>=currentMonth);
      if(future?.publish_at){ const d=new Date(future.publish_at); selectedMonth=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1,12)); }
    }
  }

  const selectedKey=monthKey(selectedMonth);
  const monthItems=(items||[]).filter((item:any)=>item.publish_at&&monthKey(new Date(item.publish_at))===selectedKey);
  const grouped=new Map<number,any[]>();
  for(const item of monthItems){
    const day=new Date(item.publish_at).getUTCDate();
    if(!grouped.has(day)) grouped.set(day,[]);
    grouped.get(day)!.push(item);
  }

  const firstDay=new Date(Date.UTC(selectedMonth.getUTCFullYear(),selectedMonth.getUTCMonth(),1,12));
  const firstWeekday=firstDay.getUTCDay();
  const daysInMonth=new Date(Date.UTC(selectedMonth.getUTCFullYear(),selectedMonth.getUTCMonth()+1,0,12)).getUTCDate();
  const totalCells=Math.ceil((firstWeekday+daysInMonth)/7)*7;
  const cells=Array.from({length:totalCells},(_,i)=>{ const day=i-firstWeekday+1; return day>=1&&day<=daysInMonth?day:null; });
  const label=selectedMonth.toLocaleDateString("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"});
  const prev=monthKey(shiftMonth(selectedMonth,-1));
  const next=monthKey(shiftMonth(selectedMonth,1));
  const weekdays=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  const counts=(monthItems||[]).reduce((acc:any,item:any)=>{ const k=String(item.format||"Outros"); acc[k]=(acc[k]||0)+1; return acc; },{});

  return <AppShell>
    <div className="page-head">
      <div><div className="eyebrow">Planejamento</div><h1>Planejamento do mês</h1><p className="sub">Visão geral dos seus conteúdos e objetivos.</p></div>
      <div className="month-nav"><Link className="btn btn-ghost" href={`/app/month?month=${prev}`}>←</Link><strong>{label}</strong><Link className="btn btn-ghost" href={`/app/month?month=${next}`}>→</Link></div>
    </div>

    <div className="month-layout">
      <div className="card calendar-card">
        <div className="calendar-weekdays">{weekdays.map(d=><div key={d}>{d}</div>)}</div>
        <div className="calendar-grid">
          {cells.map((day,index)=>{
            if(!day) return <div className="calendar-cell muted" key={`empty-${index}`}/>;
            const dayItems=grouped.get(day)||[];
            return <div className="calendar-cell" key={day}>
              <div className="calendar-day">{day}</div>
              <div className="calendar-content-list">
                {dayItems.slice(0,3).map((item:any)=><div className={tone(item.format)} key={item.id} title={item.title}><span>{item.format||"Conteúdo"}</span><strong>{item.title}</strong></div>)}
                {dayItems.length>3&&<div className="meta">+{dayItems.length-3} conteúdo(s)</div>}
              </div>
            </div>;
          })}
        </div>
      </div>

      <aside className="card month-summary">
        <h3>Resumo do mês</h3>
        <div className="summary-total"><strong>{monthItems.length}</strong><span>conteúdos planejados</span></div>
        <div className="summary-list">
          {Object.entries(counts).map(([format,count]:any)=><div key={format}><span>{format}</span><strong>{count}</strong></div>)}
        </div>
        {monthItems.length===0&&<div className="empty-state">Nenhum conteúdo programado para este mês.</div>}
      </aside>
    </div>
  </AppShell>;
}
