import { createServerSupabaseClient } from "@/lib/supabase/server";
import { confirmPdfImport } from "../actions";
import { notFound } from "next/navigation";

export default async function ReviewPage({params}:{params:Promise<{id:string}>}) {
  const {id} = await params;
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:review} = await supabase
    .from("ai_import_reviews")
    .select("*")
    .eq("id",id)
    .maybeSingle();

  if(!review) notFound();

  const payload:any = review.ai_payload || {};
  const contents = Array.isArray(payload.contents) ? payload.contents : [];

  return <>
    <div className="eyebrow">Revisão humana</div>
    <h1>Conferir importação.</h1>
    <p className="sub">
      Confiança geral: {Math.round((review.confidence || 0)*100)}%.
      Verifique principalmente itens com confiança baixa ou campos vazios.
    </p>

    <div className="card" style={{marginTop:22}}>
      {contents.map((item:any,index:number)=><div className="item" key={index}>
        <div className="row" style={{alignItems:"flex-start"}}>
          <div>
            <strong>{item.title}</strong>
            <div className="meta">
              {item.publish_date || "data não identificada"} · {item.format || "formato não identificado"}
              {" · "}confiança {Math.round((item.confidence || 0)*100)}%
            </div>
            <div className="meta">
              {item.objective ? `Objetivo: ${item.objective}` : ""}
              {item.dependency_types?.length ? ` · Dependências: ${item.dependency_types.join(", ")}` : ""}
            </div>
          </div>
          <span className={`pill ${item.confidence>=.85?"pill-ok":""}`}>
            {item.confidence>=.85?"alta":"revisar"}
          </span>
        </div>
      </div>)}
    </div>

    {review.status==="pending_review" && (
      <form action={confirmPdfImport.bind(null,id)} style={{marginTop:16}}>
        <button className="btn btn-primary">Confirmar e importar</button>
      </form>
    )}
  </>;
}
