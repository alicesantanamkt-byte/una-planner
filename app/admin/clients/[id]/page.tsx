import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function ClientDetail({params}:{params:Promise<{id:string}>}){
  const {id} = await params;
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:client} = await supabase
    .from("clients")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(!client) notFound();

  const [
    {count:events},
    {count:contents},
    {count:suggestions},
    {count:assets},
    {data:alerts}
  ] = await Promise.all([
    supabase.from("calendar_events").select("*",{count:"exact",head:true}).eq("client_id",id),
    supabase.from("content_items").select("*",{count:"exact",head:true}).eq("client_id",id),
    supabase.from("suggested_slots").select("*",{count:"exact",head:true}).eq("client_id",id),
    supabase.from("content_assets").select("*",{count:"exact",head:true}).eq("client_id",id),
    supabase.from("alerts").select("*").eq("client_id",id).eq("resolved",false).order("created_at",{ascending:false})
  ]);

  return <>
    <div className="eyebrow">Cliente</div>
    <h1>{client.brand || "Cliente"}</h1>
    <p className="sub">{client.segment || "Segmento não informado"}</p>

    <div className="grid">
      <div className="card third"><div className="meta">Eventos</div><h2>{events ?? 0}</h2></div>
      <div className="card third"><div className="meta">Conteúdos</div><h2>{contents ?? 0}</h2></div>
      <div className="card third"><div className="meta">Sugestões</div><h2>{suggestions ?? 0}</h2></div>
      <div className="card half"><div className="meta">Assets</div><h2>{assets ?? 0}</h2></div>
      <div className="card half"><div className="meta">Alertas abertos</div><h2>{alerts?.length ?? 0}</h2></div>
    </div>

    <div className="card" style={{marginTop:18}}>
      <h3>Alertas abertos</h3>
      {(alerts||[]).length===0 && <p className="meta">Nenhum alerta.</p>}
      {(alerts||[]).map((a:any)=><div className="item" key={a.id}>
        <strong>{a.type || "alerta"}</strong>
        <div className="meta">{a.message}</div>
      </div>)}
    </div>
  </>;
}
