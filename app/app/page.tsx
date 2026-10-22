import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientHome(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Conecte o Supabase para ativar dados reais.</h1></AppShell>;

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client} = await supabase
    .from("clients")
    .select("id,onboarding_completed")
    .eq("user_id",authData.user.id)
    .maybeSingle();

  if(!client?.onboarding_completed) redirect("/onboarding");

  const [{count:eventCount},{count:contentCount},{count:suggestionCount}] = await Promise.all([
    supabase.from("calendar_events").select("*",{count:"exact",head:true}).eq("client_id",client.id),
    supabase.from("content_items").select("*",{count:"exact",head:true}).eq("client_id",client.id).eq("status","pending"),
    supabase.from("suggested_slots").select("*",{count:"exact",head:true}).eq("client_id",client.id).eq("status","suggested")
  ]);

  const {data:nextSuggestions} = await supabase
    .from("suggested_slots")
    .select("id,start_datetime,score,content_items(title)")
    .eq("client_id",client.id)
    .eq("status","suggested")
    .order("start_datetime",{ascending:true})
    .limit(3);

  return <AppShell>
    <div className="eyebrow">Hoje</div>
    <h1>Hoje cabe conteúdo aqui.</h1>
    <p className="sub">Agora a home mostra sugestões reais do motor.</p>

    <div className="grid">
      <div className="card third"><div className="meta">Compromissos</div><h2>{eventCount ?? 0}</h2><span className="pill pill-ok">persistido</span></div>
      <div className="card third"><div className="meta">Conteúdos pendentes</div><h2>{contentCount ?? 0}</h2><span className="pill">conteúdo</span></div>
      <div className="card third"><div className="meta">Sugestões novas</div><h2>{suggestionCount ?? 0}</h2><span className="pill pill-ok">motor</span></div>

      <div className="card full">
        <h3>Próximos encaixes</h3>
        {(nextSuggestions||[]).length===0 && <p className="meta">Nenhum encaixe sugerido ainda.</p>}
        {(nextSuggestions||[]).map((s:any)=><div className="item" key={s.id}>
          <strong>{s.content_items?.title || "Conteúdo"}</strong>
          <div className="meta">{new Date(s.start_datetime).toLocaleString("pt-BR")} · score {s.score}/100</div>
        </div>)}
      </div>
    </div>
  </AppShell>
}
