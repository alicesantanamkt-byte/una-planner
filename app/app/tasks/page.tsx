import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatDate(value:string | null){
  if(!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date(value));
}

function formatTone(format:string|null){
  const value=String(format||"").toLowerCase();
  if(value.includes("reel")) return "pill pill-warm";
  if(value.includes("b-roll")||value.includes("broll")) return "pill pill-olive";
  return "pill";
}

export default async function Tasks(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;
  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");
  const {data:client} = await supabase.from("clients").select("id").eq("user_id",authData.user.id).single();
  if(!client) redirect("/onboarding");

  const {data:items} = await supabase
    .from("content_items")
    .select("id,title,format,publish_at,estimated_minutes,preferred_location,status")
    .eq("client_id",client.id)
    .in("status",["pending","planned"])
    .order("publish_at",{ascending:true,nullsFirst:false})
    .limit(60);

  return <AppShell>
    <div className="page-head">
      <div>
        <div className="eyebrow">Produção</div>
        <h1>O que gravar</h1>
        <p className="sub">Sua fila de produção, organizada pela data de publicação.</p>
      </div>
    </div>

    <div className="card production-card" style={{marginTop:22}}>
      <div className="section-head"><h3>Próximos conteúdos</h3><span className="pill">{(items||[]).length} pendente(s)</span></div>
      {(items||[]).length===0 && <div className="empty-state">Nenhum conteúdo pendente para gravação.</div>}
      <div className="production-list">
        {(items||[]).map((item:any)=><div className="production-row" key={item.id}>
          <div className="production-index">{String((items||[]).indexOf(item)+1).padStart(2,"0")}</div>
          <div className="production-main">
            <div className="production-tags"><span className={formatTone(item.format)}>{item.format || "Conteúdo"}</span></div>
            <strong>{item.title}</strong>
            <div className="meta">{item.estimated_minutes || 15} min{item.preferred_location ? ` · ${item.preferred_location}` : ""}</div>
          </div>
          <div className="production-date"><span>publica</span><strong>{formatDate(item.publish_at)}</strong></div>
        </div>)}
      </div>
    </div>
  </AppShell>;
}
