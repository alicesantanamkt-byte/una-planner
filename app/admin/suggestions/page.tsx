import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recalculateSuggestions } from "./actions";

export default async function SuggestionsPage(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:clients} = await supabase.from("clients").select("id,brand,user_id");
  const {data:suggestions} = await supabase
    .from("suggested_slots")
    .select("id,start_datetime,end_datetime,score,status,reason_json,content_items(title),clients(brand)")
    .order("start_datetime",{ascending:true});

  return <>
    <div className="eyebrow">Motor</div>
    <h1>Sugestões calculadas.</h1>
    <p className="sub">Agora a UNA também vê quais sugestões foram aceitas ou rejeitadas pelas clientes.</p>

    <form action={recalculateSuggestions} className="card" style={{marginTop:22}}>
      <label>Cliente
        <select name="clientId" required>
          <option value="">Selecione</option>
          {(clients||[]).map((c:any)=><option key={c.id} value={c.id}>{c.brand || c.user_id}</option>)}
        </select>
      </label>
      <button className="btn btn-primary" style={{marginTop:12}}>Recalcular encaixes</button>
    </form>

    <div className="card" style={{marginTop:18}}>
      {(suggestions||[]).length===0 && <p className="meta">Nenhuma sugestão calculada ainda.</p>}
      {(suggestions||[]).map((s:any)=><div className="item" key={s.id}>
        <div className="row">
          <div>
            <strong>{s.content_items?.title || "Conteúdo"}</strong>
            <div className="meta">
              {new Date(s.start_datetime).toLocaleString("pt-BR")}
              {" · "}
              {(s.reason_json?.reasons || []).join(" · ")}
              {s.reason_json?.rejection_reason ? ` · rejeição: ${s.reason_json.rejection_reason}` : ""}
            </div>
          </div>
          <span className={`pill ${s.status==="accepted"?"pill-ok":""}`}>{s.status} · {s.score}/100</span>
        </div>
      </div>)}
    </div>
  </>;
}
