import Link from "next/link";

export default function NotFound(){
  return <main style={{maxWidth:720,margin:"60px auto",padding:"24px"}}>
    <div className="eyebrow">UNA Planner</div>
    <h1>Essa página não existe.</h1>
    <p className="sub">O endereço pode ter mudado ou você não tem acesso a esse conteúdo.</p>
    <Link className="btn btn-primary" href="/">Voltar ao início</Link>
  </main>;
}
