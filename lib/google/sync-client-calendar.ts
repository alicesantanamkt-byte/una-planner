import 'server-only';
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getClientGoogleCalendar } from "./client-connection";

export async function syncClientGoogleCalendar(clientId:string){
  const admin = createAdminSupabaseClient();
  if(!admin) throw new Error("Supabase não configurado.");

  const calendar = await getClientGoogleCalendar(clientId);
  if(!calendar) throw new Error("Google Agenda não conectado.");

  const {data:connection,error:connectionError} = await admin
    .from("calendar_connections")
    .select("id,sync_token")
    .eq("client_id",clientId)
    .eq("provider","google")
    .single();
  if(connectionError || !connection) throw connectionError || new Error("Conexão não encontrada.");

  let pageToken:string|undefined;
  let nextSyncToken:string|undefined;
  let imported = 0;

  try{
    do{
      const initialSync = !connection.sync_token;
      const now = Date.now();
      const result = await calendar.events.list({
        calendarId:"primary",
        singleEvents:true,
        showDeleted:true,
        maxResults:250,
        pageToken,
        syncToken:connection.sync_token || undefined,
        timeMin:initialSync ? new Date(now-30*86400000).toISOString() : undefined,
        timeMax:initialSync ? new Date(now+365*86400000).toISOString() : undefined
      });

      const rows:any[]=[];
      const cancelledIds:string[]=[];
      for(const event of result.data.items || []){
        if(!event.id) continue;
        if(event.status==="cancelled"){
          cancelledIds.push(event.id);
          continue;
        }
        const start=event.start?.dateTime || event.start?.date;
        const end=event.end?.dateTime || event.end?.date;
        if(!start || !end) continue;
        rows.push({
          client_id:clientId,
          source:"google",
          external_id:event.id,
          title:event.summary || "Compromisso",
          start_datetime:new Date(start).toISOString(),
          end_datetime:new Date(end).toISOString(),
          location:event.location || null,
          protected:false,
          capture_allowed:true,
          metadata_json:{htmlLink:event.htmlLink,status:event.status,attendees:event.attendees?.length || 0}
        });
      }

      if(rows.length){
        const {error}=await admin.from("calendar_events").upsert(rows,{onConflict:"client_id,source,external_id"});
        if(error) throw error;
        imported += rows.length;
      }
      if(cancelledIds.length){
        const {error}=await admin.from("calendar_events").delete().eq("client_id",clientId).eq("source","google").in("external_id",cancelledIds);
        if(error) throw error;
      }
      pageToken=result.data.nextPageToken || undefined;
      nextSyncToken=result.data.nextSyncToken || nextSyncToken;
    }while(pageToken);

    const patch:any={last_synced_at:new Date().toISOString()};
    if(nextSyncToken) patch.sync_token=nextSyncToken;
    const {error:updateError}=await admin.from("calendar_connections").update(patch).eq("id",connection.id);
    if(updateError) throw updateError;
    return {imported};
  }catch(error:any){
    if(error?.code===410 || error?.response?.status===410){
      await admin.from("calendar_connections").update({sync_token:null}).eq("id",connection.id);
      return syncClientGoogleCalendar(clientId);
    }
    throw error;
  }
}
