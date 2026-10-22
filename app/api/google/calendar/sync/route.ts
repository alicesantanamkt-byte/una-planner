import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getClientGoogleCalendar } from "@/lib/google/client-connection";

export const maxDuration = 60;

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

  if(!client) return NextResponse.json({error:"Cliente não encontrado."},{status:404});

  const calendar = await getClientGoogleCalendar(client.id);
  if(!calendar) return NextResponse.json({error:"Google Agenda não conectado."},{status:400});

  const {data:connection} = await supabase
    .from("calendar_connections")
    .select("id,sync_token")
    .eq("client_id",client.id)
    .eq("provider","google")
    .single();

  if(!connection) return NextResponse.json({error:"Conexão do Google Agenda não encontrada."},{status:404});

  let pageToken:string|undefined;
  let nextSyncToken:string|undefined;
  let imported = 0;
  let pages = 0;

  try {
    do {
      const initialSync = !connection.sync_token;
      const now = Date.now();
      const result = await calendar.events.list({
        calendarId:"primary",
        singleEvents:true,
        showDeleted:true,
        maxResults:250,
        pageToken,
        syncToken: connection.sync_token || undefined,
        timeMin: initialSync ? new Date(now-30*86400000).toISOString() : undefined,
        timeMax: initialSync ? new Date(now+365*86400000).toISOString() : undefined
      });

      const rows:any[] = [];
      const cancelledIds:string[] = [];

      for(const event of result.data.items || []){
        if(!event.id) continue;

        if(event.status==="cancelled"){
          cancelledIds.push(event.id);
          continue;
        }

        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        if(!start || !end) continue;

        rows.push({
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
        });
      }

      if(rows.length){
        const {error:upsertError} = await supabase
          .from("calendar_events")
          .upsert(rows,{onConflict:"client_id,source,external_id"});
        if(upsertError) throw upsertError;
        imported += rows.length;
      }

      if(cancelledIds.length){
        const {error:deleteError} = await supabase
          .from("calendar_events")
          .delete()
          .eq("client_id",client.id)
          .eq("source","google")
          .in("external_id",cancelledIds);
        if(deleteError) throw deleteError;
      }

      pageToken = result.data.nextPageToken || undefined;
      nextSyncToken = result.data.nextSyncToken || nextSyncToken;
      pages++;

      if(pages >= 20 && pageToken){
        return NextResponse.json({
          error:"Sua agenda tem muitos eventos para a primeira sincronização. Tente novamente para continuar."
        },{status:413});
      }
    } while(pageToken);

    const patch:any = {last_synced_at:new Date().toISOString()};
    if(nextSyncToken) patch.sync_token = nextSyncToken;

    const {error:updateError} = await supabase
      .from("calendar_connections")
      .update(patch)
      .eq("id",connection.id);
    if(updateError) throw updateError;

    return NextResponse.json({ok:true,imported,pages});
  } catch(error:any) {
    if(error?.code===410 || error?.response?.status===410){
      await supabase
        .from("calendar_connections")
        .update({sync_token:null})
        .eq("id",connection.id);
      return NextResponse.json({ok:false,resetRequired:true},{status:409});
    }

    const status = Number(error?.response?.status || error?.code || 500);
    if(status===401){
      return NextResponse.json({error:"A autorização do Google expirou. Desconecte e conecte a agenda novamente."},{status:401});
    }
    if(status===403){
      return NextResponse.json({error:"O Google recusou o acesso à agenda. Confirme se a Google Calendar API está ativada e tente novamente."},{status:403});
    }

    console.error("Google Calendar sync failed", error);
    return NextResponse.json({error:"Não foi possível sincronizar o Google Agenda agora. Tente novamente."},{status:500});
  }
}
