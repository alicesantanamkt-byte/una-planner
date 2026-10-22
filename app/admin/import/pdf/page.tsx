import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyzePdf } from "./actions";

export default async function PdfImportPage() {
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <h1>Configure o Supabase.</h1>;

  const {data:clients} = await supabase
    .from("clients")
    .select("id,brand,user_id")
    .order("created_at",{ascending:false});

  return <>
    <div className="eyebrow">IA · PDF</div>
    <h1>Analisar calendário em PDF.</h1>
    <p className="sub">A IA interpreta o arquivo, mas nada entra no calendário editorial sem revisão da UNA.</p>

    <form action={analyzePdf} className="card" style={{marginTop:22,maxWidth:720}}>
      <label>Cliente
        <select name="clientId" required>
          <option value="">Selecione</option>
          {(clients||[]).map((c:any)=><option key={c.id} value={c.id}>{c.brand || c.user_id}</option>)}
        </select>
      </label>
      <label style={{marginTop:12}}>PDF
        <input name="file" type="file" accept=".pdf,application/pdf" required/>
      </label>
      <button className="btn btn-primary" style={{marginTop:16}}>Analisar com IA</button>
    </form>
  </>;
}
