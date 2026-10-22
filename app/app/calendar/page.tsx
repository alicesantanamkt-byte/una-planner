import { AppShell } from "@/components/AppShell";
import { createManualEvent } from "./actions";
import { DeleteEventButton } from "./DeleteEventButton";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManualCalendar(){
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return <AppShell><h1>Supabase ainda não configurado.</h1></AppShell>;
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!client) redirect("/onboarding");

  const { data: events } = await supabase
    .from("calendar_events")
    .select("id,title,start_datetime,end_datetime,location,source")
    .eq("client_id", client.id)
    .order("start_datetime", { ascending: true });

  return <AppShell>
    <div className="eyebrow">Agenda manual</div>
    <h1>Minha agenda.</h1>
    <p className="sub">Cadastre compromissos mesmo sem usar Google Agenda.</p>

    <div className="grid">
      <form className="card half" action={createManualEvent}>
        <h3>Novo compromisso</h3>
        <div className="form-grid">
          <label>Data<input name="date" type="date" required/></label>
          <label>Título<input name="title" required/></label>
          <label>Início<input name="start" type="time" required/></label>
          <label>Fim<input name="end" type="time" required/></label>
          <label>Local<input name="location"/></label>
        </div>
        <button className="btn btn-primary" style={{marginTop:14}}>Adicionar compromisso</button>
      </form>

      <div className="card half">
        <h3>Compromissos</h3>
        {(events||[]).length===0 && <p className="meta">Nenhum compromisso cadastrado.</p>}
        {(events||[]).map((e:any)=>{
          const start = new Date(e.start_datetime);
          const end = new Date(e.end_datetime);
          return <div className="item" key={e.id}>
            <div className="row">
              <div>
                <strong>{e.title}</strong>
                <div className="meta">
                  {start.toLocaleDateString("pt-BR")} · {start.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}–{end.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
                  {e.location ? ` · ${e.location}` : ""}
                </div>
              </div>
              {e.source==="manual" && <DeleteEventButton id={e.id}/>}
            </div>
          </div>
        })}
      </div>
    </div>
  </AppShell>
}
