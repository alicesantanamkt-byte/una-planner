import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SuggestionActions } from "./SuggestionActions";
import { requestRecalculation } from "./actions";

export const dynamic = "force-dynamic";

function formatDateTime(value:string){
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "Horário indisponível";
  return new Intl.DateTimeFormat("pt-BR",{
    day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",
    timeZone:"America/Sao_Paulo"
  }).format(date);
}

function contentTitle(value:any){
  return Array.isArray(value) ? value[0]?.title : value?.title;
}

function compatibility(score:number|null|undefined){
  const value = Number(score || 0);
  if(value >= 85) return {label:"Ótimo encaixe",className:"pill pill-ok"};
  if(value >= 70) return {label:"Boa compatibilidade",className:"pill pill-ok"};
  return {label:"Possível encaixe",className:"pill pill-warn"};
}

export default async function ClientSuggestions({searchParams}:{searchParams?:Promise<{calc?:string;count?:string}>}){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client} = await supabase
    .from("clients")
    .select("id")
    .eq("user_id",authData.user.id)
    .maybeSingle();

  if(!client) redirect("/onboarding");

  const {data:suggestions} = await supabase
    .from("suggested_slots")
    .select("id,content_item_id,start_datetime,end_datetime,score,status,reason_json,content_items(title,format)")
    .eq("client_id",client.id)
    .in("status",["suggested","accepted","rejected"])
    .order("start_datetime",{ascending:true});

  const all = suggestions || [];
  const rejected = all.filter((s:any)=>s.status==="rejected");
  const accepted = all.filter((s:any)=>s.status==="accepted");
  const acceptedContentIds = new Set(accepted.map((s:any)=>s.content_item_id));
  const rejectedExact = new Set(rejected.map((s:any)=>`${s.content_item_id}|${new Date(s.start_datetime).toISOString()}`));
  const active = all.filter((s:any)=>
    s.status==="suggested" &&
    !acceptedContentIds.has(s.content_item_id) &&
    !rejectedExact.has(`${s.content_item_id}|${new Date(s.start_datetime).toISOString()}`)
  );

  const params = searchParams ? await searchParams : undefined;
  const calc = params?.calc;
  const count = Number(params?.count || 0);

  return <AppShell>
    <div className="hero-row">
      <div>
        <div className="eyebrow">Produção</div>
        <h1>Sugestões de gravação</h1>
        <p className="sub">Horários ideais baseados na sua agenda, rotina e decisões anteriores.</p>
      </div>
      <form action={requestRecalculation}>
        <button className="btn btn-primary">{active.length || accepted.length ? "Recalcular horários" : "Calcular meus horários"}</button>
      </form>
    </div>

    {calc === "ok" && <div className="card" style={{marginTop:16,padding:14}}><strong>{count} nova(s) sugestão(ões) calculada(s).</strong></div>}
    {calc === "none" && <div className="card" style={{marginTop:16,padding:14}}><strong>Não encontrei outra janela compatível antes das datas de publicação.</strong><div className="meta">Os horários rejeitados e conteúdos já confirmados foram respeitados.</div></div>}
    {calc === "empty" && <div className="card" style={{marginTop:16,padding:14}}><strong>Não há conteúdos pendentes com data para calcular.</strong></div>}
    {calc === "error" && <div className="card" style={{marginTop:16,padding:14}}><strong>Não foi possível calcular agora.</strong><div className="meta">Tente novamente. Seus conteúdos e sua agenda continuam salvos.</div></div>}

    <div className="suggestion-tabs">
      <span className="suggestion-tab active">Para decidir ({active.length})</span>
      <span className="suggestion-tab">Confirmados ({accepted.length})</span>
      <span className="suggestion-tab">Histórico ({rejected.length})</span>
    </div>

    <section className="card" style={{marginTop:12}}>
      <div className="section-head">
        <h3>Para decidir</h3>
        {rejected.length>0 && <span className="meta">{rejected.length} rejeição(ões) já estão sendo consideradas pelo motor</span>}
      </div>

      {active.length===0 && <p className="meta">Nenhuma sugestão aguardando decisão.</p>}
      <div className="suggestion-list">
        {active.map((s:any)=>{
          const reasons = Array.isArray(s.reason_json?.reasons) ? s.reason_json.reasons : [];
          const fit = compatibility(s.score);
          const rationale = reasons.length ? reasons.join(" · ") : "Janela livre compatível com sua rotina e com o prazo deste conteúdo.";
          return <article className="suggestion-card" key={s.id}>
            <div>
              <strong>{contentTitle(s.content_items) || "Conteúdo"}</strong>
              <div className="meta">{formatDateTime(s.start_datetime)}</div>
              <div className="compat"><span className={fit.className}>{fit.label}</span></div>
              <div className="meta" style={{marginTop:7}}>{rationale}</div>
            </div>
            <div className="suggestion-actions">
              <SuggestionActions id={s.id} status={s.status}/>
            </div>
          </article>;
        })}
      </div>
    </section>

    {accepted.length>0 && <section className="card" style={{marginTop:14}}>
      <div className="section-head"><h3>Confirmados</h3><span className="meta">Já adicionados à sua agenda</span></div>
      <div className="suggestion-list">
        {accepted.map((s:any)=><article className="suggestion-card" key={s.id}>
          <div>
            <strong>{contentTitle(s.content_items) || "Conteúdo"}</strong>
            <div className="meta">{formatDateTime(s.start_datetime)}</div>
          </div>
          <span className="pill pill-ok">Confirmado</span>
        </article>)}
      </div>
    </section>}
  </AppShell>;
}
