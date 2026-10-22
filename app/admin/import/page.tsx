import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { importSpreadsheet } from "./actions";

type SearchParams = Promise<{imported?:string; error?:string; message?:string}>;

export default async function ImportPage({searchParams}:{searchParams:SearchParams}){
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:clients} = await supabase
    .from("clients")
    .select("id,display_name,brand,user_id")
    .order("created_at",{ascending:false});

  const userIds = (clients || []).map((c:any)=>c.user_id).filter(Boolean);
  const {data:profiles} = userIds.length
    ? await supabase.from("profiles").select("id,name").in("id",userIds)
    : {data:[] as any[]};

  const profileNames = new Map((profiles || []).map((p:any)=>[p.id,p.name]));

  const errorMessage = params.error === "no_rows"
    ? "Não encontrei linhas de conteúdo. Confira se a planilha tem colunas como Título/Tema, Data e Formato."
    : params.error === "db"
      ? `O banco recusou a importação${params.message ? `: ${params.message}` : "."}`
      : params.error
        ? "Não foi possível importar a planilha. Confira o arquivo e tente novamente."
        : "";

  return <>
    <div className="eyebrow">Importação</div>
    <h1>Importar calendário editorial.</h1>
    <p className="sub">Arquivos estruturados entram pelo parser. PDFs passam por IA e revisão humana.</p>

    {params.imported && <div className="card" style={{marginTop:18,borderColor:"#b7c5a4"}}>
      <strong>{params.imported} conteúdo(s) importado(s) com sucesso.</strong>
      <div className="meta">Eles já devem aparecer em Meu mês e O que gravar.</div>
    </div>}

    {errorMessage && <div className="card" style={{marginTop:18,borderColor:"#d9a5a5"}}>
      <strong>Importação não concluída.</strong>
      <div className="meta">{errorMessage}</div>
    </div>}

    <div className="grid" style={{marginTop:18}}>
      <form action={importSpreadsheet} className="card half">
        <h3>CSV / XLSX</h3>
        <label>Cliente
          <select name="clientId" required>
            <option value="">Selecione</option>
            {(clients||[]).map((c:any)=>{
              const displayName = c.display_name || c.brand || profileNames.get(c.user_id) || "Cliente";
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
