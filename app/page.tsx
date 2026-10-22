import Link from "next/link";

export default function Landing(){
  return <main style={{maxWidth:900,margin:"0 auto",padding:"80px 24px"}}>
    <div className="eyebrow">UNA Studio Criativo</div>
    <h1>Conteúdo encaixado na sua rotina.</h1>
    <p className="sub">Organize gravações, aproveite oportunidades do dia a dia e transforme sua agenda em uma rotina de produção possível.</p>
    <div style={{marginTop:24,display:"flex",gap:10}}>
      <Link className="btn btn-primary" href="/login">Entrar</Link>
      <Link className="btn btn-soft" href="/onboarding">Testar onboarding</Link>
    </div>
  </main>
}
