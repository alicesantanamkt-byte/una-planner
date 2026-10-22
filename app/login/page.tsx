import { login } from "./actions";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
  const params = await searchParams;
  return <main style={{maxWidth:460,margin:"60px auto",padding:"24px"}}>
    <div className="eyebrow">UNA Planner</div>
    <h1>Bem-vinda.</h1>
    <p className="sub">Entre para acessar sua rotina de conteúdo.</p>

    <form className="card" style={{marginTop:22}} action={login}>
      <label>E-mail<input name="email" type="email" required placeholder="voce@exemplo.com"/></label>
      <label style={{marginTop:12}}>Senha<input name="password" type="password" required placeholder="••••••••"/></label>
      {params.error && <p className="meta" style={{color:"#815851"}}>Não foi possível entrar. Confira e-mail e senha.</p>}
      <button className="btn btn-primary" style={{marginTop:16,width:"100%"}}>Entrar</button>
    </form>
  </main>
}
