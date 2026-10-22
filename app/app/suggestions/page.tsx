import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SuggestionActions } from "./SuggestionActions";
import { requestRecalculation } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClientSuggestions(){
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

  return <AppShell>
    <div className="eyebrow">Sugestões</div>
    <h1>Melhores horários para gravar.</h1>
    <p className="sub">Aceite o horário que funciona ou rejeite para que a UNA possa recalcular.</p>

    <form action={requestRecalculation} style={{marginTop:18}}>
      <button className="btn btn-soft">Pedir novo cálculo</button>
    </form>

    <div className="card" style={{marginTop:18}}>
      {(suggestions||[]).length===0 && <p className="meta">Nenhuma sugestão disponível no momento.</p>}
      {(suggestions||[]).map((s:any)=><div className="item" key={s.id}>
        <div className="row" style={{alignItems:"flex-start"}}>
          <div>
            <strong>{s.content_items?.title || "Conteúdo"}</strong>
            <div className="meta">
              {new Date(s.start_datetime).toLocaleString("pt-BR")}
              {" · "}
              score {s.score}/100
              {s.reason_json?.reasons?.length ? ` · ${s.reason_json.reasons.join(" · ")}` : ""}
            </div>
          </div>
          <SuggestionActions id={s.id} status={s.status}/>
        </div>
      </div>)}
    </div>
  </AppShell>;
}
