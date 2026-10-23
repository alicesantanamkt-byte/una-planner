import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { importOwnCalendar } from "./actions";

type SearchParams = Promise<{imported?:string; skipped?:string; error?:string}>;

export default async function ClientImportPage({searchParams}:{searchParams:SearchParams}){
  const params = await searchParams;
  const errorMessage = params.error === "no_rows"
    ? "Não encontrei conteúdos válidos na planilha. Confira se existem colunas como Título/Tema, Data e Formato."
    : params.error === "db"
      ? "Não foi possível salvar os conteúdos agora. Tente novamente."
      : params.error
        ? "Não foi possível importar esse arquivo. Confira o formato e tente novamente."
        : "";

  return <AppShell>
    <div className="page-head">
      <div>
        <div className="eyebrow">Planejamento</div>
        <h1>Importar calendário</h1>
        <p className="sub">Adicione seu calendário editorial e deixe o UNA Planner transformar as pautas em uma rotina de produção.</p>
      </div>
      <Link href="/app/month" className="btn btn-soft">Ver meu mês</Link>
    </div>

    {params.imported!==undefined && <div className="notice-success">
      <strong>{params.imported} conteúdo(s) adicionados ao seu calendário.</strong>
      {Number(params.skipped||0)>0 && <span>{params.skipped} item(ns) já existiam e foram ignorados para evitar duplicação.</span>}
    </div>}

    {errorMessage && <div className="notice-soft"><strong>Importação não concluída.</strong><span>{errorMessage}</span></div>}

    <div className="settings-layout" style={{marginTop:20}}>
      <section className="card">
        <div className="settings-card-head">
          <h2 className="settings-section-title">Envie sua planilha</h2>
          <p className="meta">Aceitamos arquivos CSV, XLSX e XLS. O sistema identifica título, data, formato, duração e local quando essas informações estiverem disponíveis.</p>
        </div>
        <form action={importOwnCalendar}>
          <label>Arquivo do calendário
            <input name="file" type="file" accept=".csv,.xlsx,.xls" required/>
          </label>
          <button className="btn btn-primary" style={{marginTop:16}}>Importar calendário</button>
        </form>
      </section>

      <aside className="card">
        <div className="settings-card-head">
          <h2 className="settings-section-title">O que acontece depois?</h2>
        </div>
        <div className="summary-list">
          <div><span>1</span><strong>Os conteúdos aparecem em Meu mês.</strong></div>
          <div><span>2</span><strong>Vídeos entram na fila de O que gravar.</strong></div>
          <div><span>3</span><strong>O motor cruza pautas com sua agenda e rotina.</strong></div>
          <div><span>4</span><strong>Itens repetidos são ignorados automaticamente.</strong></div>
        </div>
        <div className="notice-soft" style={{marginTop:16}}><strong>PDF com IA</strong><span>Essa opção será liberada aqui em uma próxima etapa. Por enquanto, PDFs continuam disponíveis na operação assistida pela UNA.</span></div>
      </aside>
    </div>
  </AppShell>;
}
