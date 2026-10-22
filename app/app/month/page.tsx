import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function monthKey(date:Date){
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}`;
}

function parseMonth(value?:string){
  if(!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year,month] = value.split("-").map(Number);
  if(month < 1 || month > 12) return null;
  return new Date(Date.UTC(year,month-1,1,12));
}

function shiftMonth(date:Date,offset:number){
  return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+offset,1,12));
}

export default async function Month({searchParams}:{searchParams?:Promise<{month?:string}>}){
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

  const {data:items} = await supabase
    .from("content_items")
    .select("id,title,format,publish_at,status,estimated_minutes")
    .eq("client_id",client.id)
    .order("publish_at",{ascending:true});

  const params = searchParams ? await searchParams : undefined;
  const requestedMonth = parseMonth(params?.month);
  const now = new Date();
  const currentMonth = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1,12));

  let selectedMonth = requestedMonth || currentMonth;
  if(!requestedMonth){
    const currentKey = monthKey(currentMonth);
    const hasCurrent = (items || []).some((item:any)=>item.publish_at && monthKey(new Date(item.publish_at))===currentKey);
    if(!hasCurrent){
      const future = (items || []).find((item:any)=>item.publish_at && new Date(item.publish_at) >= currentMonth);
      if(future?.publish_at) selectedMonth = new Date(Date.UTC(new Date(future.publish_at).getUTCFullYear(),new Date(future.publish_at).getUTCMonth(),1,12));
      else {
        const firstDated = (items || []).find((item:any)=>item.publish_at);
        if(firstDated?.publish_at) selectedMonth = new Date(Date.UTC(new Date(firstDated.publish_at).getUTCFullYear(),new Date(firstDated.publish_at).getUTCMonth(),1,12));
      }
    }
  }

  const selectedKey = monthKey(selectedMonth);
  const monthItems = (items || []).filter((item:any)=>item.publish_at && monthKey(new Date(item.publish_at))===selectedKey);

  const grouped = new Map<number,any[]>();
  for(const item of monthItems){
    const day = new Date(item.publish_at).getUTCDate();
    if(!grouped.has(day)) grouped.set(day,[]);
    grouped.get(day)!.push(item);
  }

  const label = selectedMonth.toLocaleDateString("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"});
  const prev = monthKey(shiftMonth(selectedMonth,-1));
  const next = monthKey(shiftMonth(selectedMonth,1));

  return <AppShell>
    <div className="eyebrow">Visão mensal</div>
    <div className="row" style={{alignItems:"flex-end",gap:16,flexWrap:"wrap"}}>
      <div>
        <h1>Meu mês.</h1>
        <p className="sub">Seu calendário editorial, conectado à produção.</p>
      </div>
      <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
        <Link className="btn btn-soft" href={`/app/month?month=${prev}`}>←</Link>
        <span className="btn btn-soft" style={{pointerEvents:"none",textTransform:"capitalize"}}>{label}</span>
        <Link className="btn btn-soft" href={`/app/month?month=${next}`}>→</Link>
      </div>
    </div>

    <div className="card" style={{marginTop:22}}>
      <div className="row" style={{marginBottom:16}}>
        <strong>{monthItems.length} conteúdo(s) neste mês</strong>
        <span className="pill">{selectedKey}</span>
      </div>

      {monthItems.length===0 && <p className="meta">Nenhum conteúdo programado para este mês.</p>}

      {[...grouped.entries()].sort((a,b)=>a[0]-b[0]).map(([day,dayItems])=><div className="item" key={day}>
        <div style={{display:"grid",gridTemplateColumns:"72px 1fr",gap:18,alignItems:"start"}}>
          <div>
            <div className="eyebrow">Dia</div>
            <div style={{fontSize:30,fontFamily:"Georgia, serif",lineHeight:1}}>{String(day).padStart(2,"0")}</div>
          </div>
          <div>
            {dayItems.map((item:any)=><div key={item.id} style={{padding:"4px 0 12px"}}>
              <strong>{item.title}</strong>
              <div className="meta" style={{marginTop:4}}>
                {item.format || "Formato não informado"} · {item.estimated_minutes || 15} min · {item.status || "pending"}
              </div>
            </div>)}
          </div>
        </div>
      </div>)}
    </div>
  </AppShell>;
}
