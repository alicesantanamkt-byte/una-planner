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
    .select("id,start_datetime,end_datetime,score,status,reason_json,content_items(title,format)")
    .eq("client_id",client.id)
    .in("status",["suggested","accepted","rejected"])
    .order("start_datetime",{ascending:true});

  const params = searchParams ? await searchParams : undefined;
  const calc = params?.calc;
  const count = Number(params?.count || 0);

  return <AppShell>
    <div className="eyebrow">Sugestões</div>
    <h1>Melhores horários para gravar.</h1>
    <p className="sub">A UNA cruza seu calendário editorial, sua rotina e os compromissos da agenda para encontrar janelas possíveis de gravação.</p>

    {calc === "ok" && <div className="card" style={{marginTop:18,padding:16}}><strong>{count} sugestão(ões) calculada(s).</strong></div>}
    {calc === "none" && <div className="card" style={{marginTop:18,padding:16}}><strong>Não encontrei uma janela compatível antes das datas de publicação.</strong><div className="meta" style={{marginTop:6}}>Revise seus horários de trabalho, tempo mínimo ou compromissos da agenda.</div></div>}
    {calc === "empty" && <div className="card" style={{marginTop:18,padding:16}}><strong>Não há conteúdos pendentes com data para calcular.</strong></div>}
    {calc === "error" && <div className="card" style={{marginTop:18,padding:16}}><strong>Não foi possível calcular agora.</strong><div className="meta" style={{marginTop:6}}>Tente novamente. Seus conteúdos e sua agenda continuam salvos.</div></div>}

    <form action={requestRecalculation} style={{marginTop:18}}>
      <button className="btn btn-primary">{(suggestions||[]).length ? "Recalcular horários" : "Calcular meus horários"}</button>
    </form>

    <div className="card" style={{marginTop:18}}>
      {(suggestions||[]).length===0 && <p className="meta">Nenhuma sugestão calculada ainda. Clique em “Calcular meus horários”.</p>}
      {(suggestions||[]).map((s:any)=>{
        const reasons = Array.isArray(s.reason_json?.reasons) ? s.reason_json.reasons : [];
        const title = Array.isArray(s.content_items) ? s.content_items[0]?.title : s.content_items?.title;
        return <div className="item" key={s.id}>
          <div className="row" style={{alignItems:"flex-start"}}>
            <div>
              <strong>{title || "Conteúdo"}</strong>
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
  </AppShell>;
}
