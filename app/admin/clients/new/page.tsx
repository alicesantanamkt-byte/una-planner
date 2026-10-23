import Link from "next/link";
import { createClientInvite } from "../actions";

type SearchParams = Promise<{error?:string;message?:string}>;

export default async function NewClientPage({searchParams}:{searchParams:SearchParams}){
  const params = await searchParams;
  const error = params.error ? (params.message ? decodeURIComponent(params.message) : "Não foi possível cadastrar a cliente.") : "";

  return <>
    <div className="page-head">
      <div>
        <div className="eyebrow">Acesso</div>
        <h1>Novo cliente</h1>
        <p className="sub">Cadastre a cliente e envie o acesso. Ela mesma criará a senha no primeiro acesso.</p>
      </div>
      <Link className="btn btn-soft" href="/admin/clients">← Voltar</Link>
    </div>

    {error && <div className="notice-soft" style={{marginTop:18}}><strong>Cadastro não concluído.</strong><span>{error}</span></div>}

    <div className="admin-form-wrap">
      <form action={createClientInvite} className="card admin-form-card">
        <div className="settings-card-head">
          <div className="eyebrow">Identificação</div>
          <h2 className="settings-section-title">Dados de acesso</h2>
          <p className="sub">O e-mail será usado como login e receberá o convite para criação da senha.</p>
        </div>

        <div className="form-grid">
          <label>Nome da cliente
            <input name="displayName" required placeholder="Ex.: Beatriz Andreto" autoComplete="off"/>
          </label>
          <label>E-mail de acesso
            <input name="email" type="email" required placeholder="cliente@exemplo.com" autoComplete="off"/>
          </label>
          <label>Marca ou negócio
            <input name="brand" placeholder="Ex.: Dra. Beatriz Andreto" autoComplete="off"/>
          </label>
          <label>Segmento
            <input name="segment" placeholder="Ex.: Harmonização facial" autoComplete="off"/>
          </label>
        </div>

        <div className="notice-soft">
          <strong>Como funciona</strong>
          <span>Ao cadastrar, o UNA envia um convite por e-mail. A cliente abre o link, cria a própria senha e segue para o onboarding da rotina.</span>
        </div>

        <button className="btn btn-primary" style={{marginTop:16}}>Cadastrar e enviar convite</button>
      </form>
    </div>
  </>;
}
