import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MicrocapturesPage() {
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

  const {data:suggestions} = await supabase
    .from("micro_capture_suggestions")
    .select("id,suggestion_text,estimated_seconds,tags_json,status,calendar_events(title,start_datetime)")
    .eq("client_id",client.id)
    .order("created_at",{ascending:false});

  return <AppShell>
    <div className="eyebrow">Rotina inteligente</div>
    <h1>Pequenas captações que cabem no dia.</h1>
    <p className="sub">Nem todo compromisso vira conteúdo. Aqui aparecem apenas sugestões que passaram pelas regras de contexto e segurança.</p>

    <div className="card" style={{marginTop:22}}>
      {(suggestions||[]).length===0 && <p className="meta">Nenhuma microcaptação sugerida ainda.</p>}
      {(suggestions||[]).map((s:any)=><div className="item" key={s.id}>
        <strong>{s.calendar_events?.title || "Momento da rotina"}</strong>
        <div className="meta">{s.suggestion_text}</div>
        <div className="meta">≈ {s.estimated_seconds}s · {(s.tags_json || []).join(" · ")}</div>
      </div>)}
    </div>
  </AppShell>;
}
