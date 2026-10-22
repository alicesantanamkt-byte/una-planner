import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { importSpreadsheet } from "./actions";

export default async function ImportPage(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:clients} = await supabase
    .from("clients")
    .select("id,brand,user_id")
    .order("created_at",{ascending:false});

  const userIds = (clients || []).map((c:any)=>c.user_id).filter(Boolean);
  const {data:profiles} = userIds.length
    ? await supabase.from("profiles").select("id,name").in("id",userIds)
    : {data:[] as any[]};

  const profileNames = new Map((profiles || []).map((p:any)=>[p.id,p.name]));

  return <>
    <div className="eyebrow">Importação</div>
    <h1>Importar calendário editorial.</h1>
    <p className="sub">Arquivos estruturados entram pelo parser. PDFs passam por IA e revisão humana.</p>

    <div className="grid">
      <form action={importSpreadsheet} className="card half">
        <h3>CSV / XLSX</h3>
        <label>Cliente
          <select name="clientId" required>
            <option value="">Selecione</option>
            {(clients||[]).map((c:any)=>{
              const displayName = c.brand || profileNames.get(c.user_id) || "Cliente";
              return <option key={c.id} value={c.id}>{displayName}</option>;
            })}
          </select>
        </label>
        <label style={{marginTop:12}}>Arquivo
          <input name="file" type="file" accept=".csv,.xlsx,.xls" required/>
        </label>
        <button className="btn btn-primary" style={{marginTop:16}}>Importar planilha</button>
      </form>

      <div className="card half">
        <h3>PDF com IA</h3>
        <p className="meta">Ideal para calendários diagramados ou arquivos cujo layout varia de cliente para cliente.</p>
        <Link href="/admin/import/pdf" className="btn btn-primary">Analisar PDF</Link>
      </div>
    </div>
  </>;
}
