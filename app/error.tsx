'use client';

export default function GlobalError({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
  return <main style={{maxWidth:720,margin:"60px auto",padding:"24px"}}>
    <div className="eyebrow">UNA Planner</div>
    <h1>Algo não saiu como esperado.</h1>
    <p className="sub">Se o problema persistir, a UNA pode revisar o que aconteceu.</p>
    <div className="card" style={{marginTop:20}}>
      <p className="meta">{error.message || "Erro inesperado."}</p>
      <button className="btn btn-primary" onClick={reset}>Tentar novamente</button>
    </div>
  </main>;
}
