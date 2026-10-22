import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminHome(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const [{count:clients},{count:contents},{count:suggestions},{count:alerts}] = await Promise.all([
    supabase.from("clients").select("*",{count:"exact",head:true}),
    supabase.from("content_items").select("*",{count:"exact",head:true}),
    supabase.from("suggested_slots").select("*",{count:"exact",head:true}),
    supabase.from("alerts").select("*",{count:"exact",head:true}).eq("resolved",false)
  ]);

  return <>
    <div className="eyebrow">Operação UNA</div>
    <h1>O que precisa da sua atenção.</h1>
    <p className="sub">A operação deve funcionar por exceção, não por acompanhamento manual constante.</p>

    <div className="grid">
      <div className="card third"><div className="meta">Clientes</div><h2>{clients ?? 0}</h2><Link className="meta" href="/admin/clients">Ver clientes</Link></div>
      <div className="card third"><div className="meta">Conteúdos</div><h2>{contents ?? 0}</h2><Link className="meta" href="/admin/import">Importar calendário</Link></div>
      <div className="card third"><div className="meta">Sugestões</div><h2>{suggestions ?? 0}</h2><Link className="meta" href="/admin/suggestions">Revisar encaixes</Link></div>
      <div className="card full"><div className="meta">Alertas abertos</div><h2>{alerts ?? 0}</h2><Link className="btn btn-soft" href="/admin/alerts">Abrir alertas</Link></div>
    </div>
  </>;
}
