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
    <div className="eyebrow">Sugestões</div>
    <h1>Melhores horários para gravar.</h1>
    <p className="sub">A UNA cruza seu calendário editorial, sua rotina, seus compromissos e suas decisões anteriores para encontrar novas janelas possíveis.</p>

    {calc === "ok" && <div className="card" style={{marginTop:18,padding:16}}><strong>{count} nova(s) sugestão(ões) calculada(s).</strong></div>}
    {calc === "none" && <div className="card" style={{marginTop:18,padding:16}}><strong>Não encontrei outra janela compatível antes das datas de publicação.</strong><div className="meta" style={{marginTop:6}}>Os horários rejeitados e conteúdos já confirmados foram respeitados.</div></div>}
    {calc === "empty" && <div className="card" style={{marginTop:18,padding:16}}><strong>Não há conteúdos pendentes com data para calcular.</strong></div>}
    {calc === "error" && <div className="card" style={{marginTop:18,padding:16}}><strong>Não foi possível calcular agora.</strong><div className="meta" style={{marginTop:6}}>Tente novamente. Seus conteúdos e sua agenda continuam salvos.</div></div>}

    <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:18}}>
      <form action={requestRecalculation}>
        <button className="btn btn-primary">{active.length || accepted.length ? "Recalcular horários" : "Calcular meus horários"}</button>
      </form>
      {rejected.length>0 && <span className="meta">{rejected.length} rejeição(ões) serão consideradas no próximo cálculo.</span>}
    </div>

    <div className="card" style={{marginTop:18}}>
      <h3>Para decidir</h3>
      {active.length===0 && <p className="meta">Nenhuma sugestão aguardando decisão.</p>}
      {active.map((s:any)=>{
        const reasons = Array.isArray(s.reason_json?.reasons) ? s.reason_json.reasons : [];
        return <div className="item" key={s.id}>
          <div className="row" style={{alignItems:"flex-start"}}>
            <div>
              <strong>{contentTitle(s.content_items) || "Conteúdo"}</strong>
              <div className="meta">
                {formatDateTime(s.start_datetime)}
                {" · "}
                score {s.score ?? 0}/100
                {reasons.length ? ` · ${reasons.join(" · ")}` : ""}
              </div>
            </div>
            <SuggestionActions id={s.id} status={s.status}/>
          </div>
        </div>;
      })}
    </div>

    {accepted.length>0 && <div className="card" style={{marginTop:18}}>
      <h3>Confirmados</h3>
      {accepted.map((s:any)=><div className="item" key={s.id}>
        <div className="row" style={{alignItems:"flex-start"}}>
          <div>
            <strong>{contentTitle(s.content_items) || "Conteúdo"}</strong>
            <div className="meta">{formatDateTime(s.start_datetime)} · adicionado à agenda</div>
          </div>
          <span className="pill pill-ok">aceito</span>
        </div>
      </div>)}
    </div>}
  </AppShell>;
}
