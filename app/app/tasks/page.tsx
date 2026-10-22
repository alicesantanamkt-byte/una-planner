import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatDate(value:string | null){
  if(!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date(value));
}

export default async function Tasks(){
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
    .select("id,title,format,publish_at,estimated_minutes,preferred_location,status")
    .eq("client_id",client.id)
    .in("status",["pending","planned"])
    .order("publish_at",{ascending:true,nullsFirst:false})
    .limit(60);

  return <AppShell>
    <div className="eyebrow">Execução</div>
    <h1>O que gravar.</h1>
    <p className="sub">Próximos conteúdos que ainda precisam ser produzidos, em ordem de publicação.</p>

    <div className="card" style={{marginTop:22}}>
      {(items||[]).length===0 && <p className="meta">Nenhum conteúdo pendente para gravação.</p>}
      {(items||[]).map((item:any)=><div className="item" key={item.id}>
        <div className="row" style={{alignItems:"flex-start"}}>
          <div>
            <strong>{item.title}</strong>
            <div className="meta" style={{marginTop:4}}>
              {item.format || "Formato não informado"} · {item.estimated_minutes || 15} min
              {item.preferred_location ? ` · ${item.preferred_location}` : ""}
            </div>
          </div>
          <div className="pill">publica {formatDate(item.publish_at)}</div>
        </div>
      </div>)}
    </div>
  </AppShell>;
}
