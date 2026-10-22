import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getClientGoogleCalendar } from "@/lib/google/client-connection";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  if(!supabase) return NextResponse.json({error:"Supabase não configurado."},{status:500});

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) return NextResponse.json({error:"Não autenticado."},{status:401});

  const {data:client} = await supabase
    .from("clients")
    .select("id")
    .eq("user_id",authData.user.id)
    .single();

  const calendar = await getClientGoogleCalendar(client.id);
  if(!calendar) return NextResponse.json({error:"Google Agenda não conectado."},{status:400});

  const {data:connection} = await supabase
    .from("calendar_connections")
    .select("id,sync_token")
    .eq("client_id",client.id)
    .eq("provider","google")
    .single();

  let pageToken:string|undefined;
  let nextSyncToken:string|undefined;
  let imported = 0;

  try {
    do {
      const result = await calendar.events.list({
        calendarId:"primary",
        singleEvents:true,
        showDeleted:true,
        maxResults:250,
        pageToken,
        syncToken: connection.sync_token || undefined,
        timeMin: connection.sync_token ? undefined : new Date(Date.now()-30*86400000).toISOString()
      });

      for(const event of result.data.items || []){
        if(!event.id) continue;

        if(event.status==="cancelled"){
          await supabase
            .from("calendar_events")
            .delete()
            .eq("client_id",client.id)
            .eq("external_id",event.id)
            .eq("source","google");
          continue;
        }

        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        if(!start || !end) continue;

        await supabase.from("calendar_events").upsert({
          client_id:client.id,
          source:"google",
          external_id:event.id,
          title:event.summary || "Compromisso",
          start_datetime:new Date(start).toISOString(),
          end_datetime:new Date(end).toISOString(),
          location:event.location || null,
          protected:false,
          capture_allowed:true,
          metadata_json:{
            htmlLink:event.htmlLink,
            status:event.status,
            attendees:event.attendees?.length || 0
          }
        }, {onConflict:"client_id,source,external_id"});

        imported++;
      }

      pageToken = result.data.nextPageToken || undefined;
      nextSyncToken = result.data.nextSyncToken || nextSyncToken;
    } while(pageToken);

    if(nextSyncToken){
      await supabase
        .from("calendar_connections")
        .update({sync_token:nextSyncToken,last_synced_at:new Date().toISOString()})
        .eq("id",connection.id);
    }

    return NextResponse.json({ok:true,imported});
  } catch(error:any) {
    if(error?.code===410 || error?.response?.status===410){
      await supabase
        .from("calendar_connections")
        .update({sync_token:null})
        .eq("id",connection.id);
      return NextResponse.json({ok:false,resetRequired:true},{status:409});
    }
    throw error;
  }
}
