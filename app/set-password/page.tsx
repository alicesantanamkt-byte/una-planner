import { Suspense } from "react";
import { SetPasswordForm } from "./SetPasswordForm";

export default function SetPasswordPage(){
  return <main className="auth-shell">
    <div className="auth-brand">
      <img src="/una-logo-white.svg" alt="UNA Studio Criativo"/>
      <div>
        <span>UNA Planner</span>
        <small>conteúdo encaixado na sua rotina</small>
      </div>
    </div>
    <section className="auth-panel">
      <div className="eyebrow">Primeiro acesso</div>
      <h1>Crie sua senha</h1>
      <p className="sub">Seu acesso já foi criado pela UNA. Agora escolha uma senha para entrar no Planner.</p>
      <Suspense fallback={<div className="card password-card"><div className="empty-state">Carregando…</div></div>}>
        <SetPasswordForm/>
      </Suspense>
    </section>
  </main>;
}
