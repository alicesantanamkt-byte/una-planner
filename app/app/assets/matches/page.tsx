import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MatchesPage(){
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

  const {data:matches} = await supabase
    .from("content_asset_matches")
    .select("id,score,reason,suggested_usage,content_assets(context,tags_json,client_id),content_items(title)")
    .eq("content_assets.client_id",client.id)
    .order("score",{ascending:false});

  return <AppShell>
    <div className="eyebrow">Reaproveitamento</div>
    <h1>Onde seu banco pode ser usado.</h1>
    <div className="card" style={{marginTop:22}}>
      {(matches||[]).length===0 && <p className="meta">Ainda não há associações.</p>}
      {(matches||[]).map((m:any)=><div className="item" key={m.id}>
        <strong>{m.content_items?.title || "Conteúdo"}</strong>
        <div className="meta">Material: {m.content_assets?.context || "sem contexto"} · score {m.score}/100</div>
        <div className="meta">{m.reason}</div>
        {m.suggested_usage && <div className="meta">Sugestão: {m.suggested_usage}</div>}
      </div>)}
    </div>
  </AppShell>;
}
