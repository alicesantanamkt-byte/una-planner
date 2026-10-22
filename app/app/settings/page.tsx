import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoogleCalendarCard } from "./GoogleCalendarCard";

export const dynamic = "force-dynamic";

export default async function Settings(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client} = await supabase
    .from("clients")
    .select("id,recording_mode,min_free_minutes")
    .eq("user_id",authData.user.id)
    .single();

  if(!client) redirect("/onboarding");

  const {data:connection} = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("client_id",client.id)
    .eq("provider","google")
    .maybeSingle();

  return <AppShell>
    <div className="eyebrow">Preferências</div>
    <h1>Minha rotina.</h1>

    <GoogleCalendarCard connected={!!connection}/>

    <div className="card" style={{marginTop:18}}>
      <div className="form-grid">
        <label>Forma de gravação
          <select defaultValue={client.recording_mode || "hybrid"}>
            <option value="hybrid">Híbrida</option>
            <option value="block">Em bloco</option>
            <option value="distributed">Um pouco por dia</option>
          </select>
        </label>
        <label>Tempo mínimo
          <select defaultValue={String(client.min_free_minutes || 15)}>
            <option value="15">15 min</option>
            <option value="10">10 min</option>
            <option value="20">20 min</option>
          </select>
        </label>
      </div>
    </div>
  </AppShell>;
}
