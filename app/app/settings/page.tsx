import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoogleCalendarCard } from "./GoogleCalendarCard";
import { saveClientSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function Settings(){
  const supabase=await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;
  const {data:authData}=await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client}=await supabase.from("clients")
    .select("id,display_name,brand,segment,recording_mode,min_free_minutes")
    .eq("user_id",authData.user.id).single();
  if(!client) redirect("/onboarding");

  const [{data:profile},{data:connection}]=await Promise.all([
    supabase.from("profiles").select("name").eq("id",authData.user.id).maybeSingle(),
    supabase.from("calendar_connections").select("id,last_synced_at,watch_expiration,auto_sync_enabled").eq("client_id",client.id).eq("provider","google").maybeSingle()
  ]);

  return <AppShell>
    <div className="page-head">
      <div><div className="eyebrow">Configurações</div><h1>Minha rotina</h1><p className="sub">Ajuste como o UNA entende seu negócio, sua rotina e sua disponibilidade.</p></div>
    </div>

    <div className="settings-layout">
      <form action={saveClientSettings} className="card">
        <div className="settings-card-head"><h2 className="settings-section-title">Perfil e produção</h2><div className="meta">Essas informações ajudam o UNA a sugerir horários mais realistas.</div></div>
        <div className="form-grid">
          <label>Nome<input name="displayName" defaultValue={client.display_name||profile?.name||""} placeholder="Ex.: Alice Santana" required/></label>
          <label>Marca ou negócio<input name="brand" defaultValue={client.brand||""} placeholder="Ex.: UNA Studio Criativo"/></label>
          <label style={{gridColumn:"1 / -1"}}>Segmento<input name="segment" defaultValue={client.segment||""} placeholder="Ex.: Marketing digital, advocacia, estética..."/></label>
          <label>Forma de gravação<select name="recordingMode" defaultValue={client.recording_mode||"hybrid"}><option value="hybrid">Híbrida</option><option value="block">Em bloco</option><option value="distributed">Um pouco por dia</option></select></label>
          <label>Tempo mínimo disponível<select name="minFree" defaultValue={String(client.min_free_minutes||15)}><option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option></select></label>
        </div>
        <button className="btn btn-primary" style={{marginTop:16}}>Salvar alterações</button>
      </form>

      <div className="card">
        <div className="settings-card-head"><h2 className="settings-section-title">Integrações</h2><div className="meta">Mantenha sua agenda conectada para o UNA respeitar seus compromissos reais.</div></div>
        <GoogleCalendarCard connected={!!connection} lastSyncedAt={connection?.last_synced_at||null} autoSyncEnabled={connection?.auto_sync_enabled!==false} watchExpiration={connection?.watch_expiration||null}/>
      </div>
    </div>
  </AppShell>;
}
