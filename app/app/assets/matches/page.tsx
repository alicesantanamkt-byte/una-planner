import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function fitLabel(score:number|null){
  const value=Number(score||0);
  if(value>=90) return {label:"Ótimo encaixe",cls:"pill pill-ok"};
  if(value>=80) return {label:"Boa combinação",cls:"pill pill-olive"};
  return {label:"Pode funcionar",cls:"pill"};
}

export default async function MatchesPage(){
  const supabase=await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;
  const {data:authData}=await supabase.auth.getUser();
  if(!authData.user) redirect("/login");
  const {data:client}=await supabase.from("clients").select("id").eq("user_id",authData.user.id).single();
  if(!client) redirect("/onboarding");

  const {data:matches}=await supabase
    .from("content_asset_matches")
    .select("id,score,reason,suggested_usage,content_assets(context,tags_json,client_id),content_items(title)")
    .eq("content_assets.client_id",client.id)
    .order("score",{ascending:false});

  return <AppShell>
    <div className="page-head">
      <div><div className="eyebrow">Acervo</div><h1>Sugestões de uso</h1><p className="sub">Onde seus materiais já gravados podem entrar naturalmente nos próximos conteúdos.</p></div>
      <Link href="/app/assets" className="btn btn-soft">Ver banco de conteúdo</Link>
    </div>

    <div className="card" style={{marginTop:22}}>
      <div className="section-head"><h3>Combinações encontradas</h3><span className="pill">{(matches||[]).length}</span></div>
      {(matches||[]).length===0&&<div className="empty-state">Ainda não há sugestões de uso. Volte ao Banco de conteúdo e clique em “Encontrar usos”.</div>}
      <div className="usage-list">
        {(matches||[]).map((m:any)=>{
          const fit=fitLabel(m.score);
          return <div className="usage-card" key={m.id}>
            <div className="usage-material"><div className="eyebrow">Material</div><strong>{m.content_assets?.context||"Material do acervo"}</strong><div className="meta">{Array.isArray(m.content_assets?.tags_json)?m.content_assets.tags_json.join(" · "):""}</div></div>
            <div className="usage-arrow">→</div>
            <div className="usage-content"><div className="row" style={{alignItems:"center",gap:8,flexWrap:"wrap"}}><strong>{m.content_items?.title||"Conteúdo"}</strong><span className={fit.cls}>{fit.label}</span></div>{m.suggested_usage&&<p>{m.suggested_usage}</p>}<div className="meta">{m.reason}</div></div>
          </div>;
        })}
      </div>
    </div>
  </AppShell>;
}
