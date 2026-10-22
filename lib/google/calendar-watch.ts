import 'server-only';
import { randomUUID, randomBytes } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getClientGoogleCalendar } from "./client-connection";

export async function ensureGoogleCalendarWatch(clientId:string){
  const admin=createAdminSupabaseClient();
  if(!admin) throw new Error("Supabase não configurado.");

  const {data:connection,error}=await admin
    .from("calendar_connections")
    .select("id,watch_channel_id,watch_resource_id,watch_expiration,auto_sync_enabled")
    .eq("client_id",clientId)
    .eq("provider","google")
    .single();
  if(error || !connection) throw error || new Error("Conexão não encontrada.");
  if(connection.auto_sync_enabled===false) return {enabled:false};

  const expiration = connection.watch_expiration ? new Date(connection.watch_expiration).getTime() : 0;
  if(connection.watch_channel_id && expiration > Date.now()+24*60*60*1000){
    return {enabled:true,expiration:connection.watch_expiration};
  }

  const calendar=await getClientGoogleCalendar(clientId);
  if(!calendar) throw new Error("Google Agenda não conectado.");

  if(connection.watch_channel_id && connection.watch_resource_id){
    try{
      await calendar.channels.stop({requestBody:{id:connection.watch_channel_id,resourceId:connection.watch_resource_id}});
    }catch{}
  }

  const channelId=randomUUID();
  const token=randomBytes(24).toString("hex");
  const appUrl=process.env.APP_URL;
  if(!appUrl) throw new Error("APP_URL não configurada.");

  const result=await calendar.events.watch({
    calendarId:"primary",
    requestBody:{
      id:channelId,
      type:"web_hook",
      address:`${appUrl.replace(/\/$/,"")}/api/google/calendar/webhook`,
      token
    }
  });

  const resourceId=result.data.resourceId || null;
  const expirationMs=result.data.expiration ? Number(result.data.expiration) : null;
  const expirationIso=expirationMs ? new Date(expirationMs).toISOString() : null;

  const {error:updateError}=await admin.from("calendar_connections").update({
    watch_channel_id:channelId,
    watch_resource_id:resourceId,
    watch_token:token,
    watch_expiration:expirationIso
  }).eq("id",connection.id);
  if(updateError) throw updateError;

  return {enabled:true,expiration:expirationIso};
}
