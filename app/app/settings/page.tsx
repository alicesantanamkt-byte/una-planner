import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoogleCalendarCard } from "./GoogleCalendarCard";
import { saveClientSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function Settings(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client} = await supabase
    .from("clients")
    .select("id,display_name,brand,segment,recording_mode,min_free_minutes")
    .eq("user_id",authData.user.id)
    .single();

  if(!client) redirect("/onboarding");

  const {data:profile} = await supabase
    .from("profiles")
    .select("name")
    .eq("id",authData.user.id)
    .maybeSingle();

  const {data:connection} = await supabase
    .from("calendar_connections")
    .select("id,last_synced_at,watch_expiration,auto_sync_enabled")
    .eq("client_id",client.id)
    .eq("provider","google")
    .maybeSingle();

  return <AppShell>
    <div className="eyebrow">Preferências</div>
    <h1>Minha rotina.</h1>

    <GoogleCalendarCard
      connected={!!connection}
      lastSyncedAt={connection?.last_synced_at || null}
      autoSyncEnabled={connection?.auto_sync_enabled !== false}
      watchExpiration={connection?.watch_expiration || null}
    />

    <form action={saveClientSettings} className="card" style={{marginTop:18}}>
      <h3>Perfil da cliente</h3>
      <div className="form-grid">
        <label>Nome
          <input name="displayName" defaultValue={client.display_name || profile?.name || ""} placeholder="Ex.: Alice Santana" required/>
        </label>
        <label>Marca ou negócio
          <input name="brand" defaultValue={client.brand || ""} placeholder="Ex.: UNA Studio Criativo"/>
        </label>
        <label style={{gridColumn:"1 / -1"}}>Segmento
          <input name="segment" defaultValue={client.segment || ""} placeholder="Ex.: Marketing digital, advocacia, estética..."/>
        </label>
        <label>Forma de gravação
          <select name="recordingMode" defaultValue={client.recording_mode || "hybrid"}>
            <option value="hybrid">Híbrida</option>
            <option value="block">Em bloco</option>
            <option value="distributed">Um pouco por dia</option>
          </select>
        </label>
        <label>Tempo mínimo
          <select name="minFree" defaultValue={String(client.min_free_minutes || 15)}>
            <option value="10">10 min</option>
            <option value="15">15 min</option>
            <option value="20">20 min</option>
          </select>
        </label>
      </div>
      <button className="btn btn-primary" style={{marginTop:16}}>Salvar alterações</button>
    </form>
  </AppShell>;
}
