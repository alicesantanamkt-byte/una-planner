import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { importSpreadsheet } from "./actions";

type SearchParams = Promise<{imported?:string; skipped?:string; error?:string; message?:string}>;

export default async function ImportPage({searchParams}:{searchParams:SearchParams}){
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:clients} = await supabase.from("clients").select("id,display_name,brand,user_id").order("created_at",{ascending:false});
  const userIds = (clients || []).map((c:any)=>c.user_id).filter(Boolean);
  const {data:profiles} = userIds.length ? await supabase.from("profiles").select("id,name").in("id",userIds) : {data:[] as any[]};
  const profileNames = new Map((profiles || []).map((p:any)=>[p.id,p.name]));

  const errorMessage = params.error === "no_rows"
    ? "Não encontrei linhas de conteúdo. Confira se a planilha tem colunas como Título/Tema, Data e Formato."
    : params.error === "db"
      ? `O banco recusou a importação${params.message ? `: ${params.message}` : "."}`
      : params.error
        ? "Não foi possível importar a planilha. Confira o arquivo e tente novamente."
        : "";

  return <>
    <div className="page-head">
      <div><div className="eyebrow">Calendários</div><h1>Importar calendário editorial</h1><p className="sub">Adicione o planejamento da cliente sem duplicar conteúdos já existentes.</p></div>
      <span className="pill">{(clients||[]).length} cliente(s) disponíveis</span>
    </div>

    {params.imported && <div className="notice-success"><strong>{params.imported} conteúdo(s) importado(s).</strong>{params.skipped && Number(params.skipped)>0 ? <span>{params.skipped} linha(s) já existiam e foram ignoradas.</span> : null}</div>}
    {errorMessage && <div className="notice-soft"><strong>Importação não concluída.</strong><span>{errorMessage}</span></div>}

    <div className="admin-grid">
      <form action={importSpreadsheet} className="card">
        <div className="settings-card-head"><h2 className="admin-section-title">Planilha estruturada</h2><div className="admin-section-copy">Use CSV, XLSX ou XLS. O sistema compara título, formato e data antes de inserir.</div></div>
        <label>Cliente
          <select name="clientId" required><option value="">Selecione a cliente</option>{(clients||[]).map((c:any)=>{const displayName=c.display_name||c.brand||profileNames.get(c.user_id)||"Cliente";return <option key={c.id} value={c.id}>{displayName}</option>;})}</select>
        </label>
        <label style={{marginTop:12}}>Arquivo
          <input name="file" type="file" accept=".csv,.xlsx,.xls" required/>
        </label>
        <button className="btn btn-primary" style={{marginTop:16}}>Importar planilha</button>
      </form>

      <div className="card">
        <div className="settings-card-head"><h2 className="admin-section-title">PDF com IA</h2><div className="admin-section-copy">Para calendários diagramados ou arquivos com estrutura variável.</div></div>
        <p className="meta" style={{fontSize:12}}>O PDF é analisado e passa por revisão antes de entrar no calendário editorial da cliente.</p>
        <Link href="/admin/import/pdf" className="btn btn-soft" style={{display:"inline-flex",marginTop:16}}>Analisar PDF</Link>
      </div>
    </div>

    <div className="card" style={{marginTop:14}}>
      <h2 className="admin-section-title">Como a importação funciona</h2>
      <div className="admin-action-grid">
        <div className="admin-action"><strong>1. Leia o arquivo</strong><span>Título, formato, data, duração e local preferido são identificados.</span></div>
        <div className="admin-action"><strong>2. Evite duplicatas</strong><span>Linhas já existentes para a mesma cliente são ignoradas automaticamente.</span></div>
        <div className="admin-action"><strong>3. Atualize o app</strong><span>Os novos conteúdos aparecem em Meu mês e entram no fluxo de produção.</span></div>
        <div className="admin-action"><strong>4. Rode o motor</strong><span>Depois da importação, horários de gravação podem ser recalculados.</span></div>
      </div>
    </div>
  </>;
}
