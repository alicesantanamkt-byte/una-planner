import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getClientGoogleCalendar } from "@/lib/google/client-connection";

export async function POST(){
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

  const admin=createAdminSupabaseClient();
  const {data:connection}=admin ? await admin
    .from("calendar_connections")
    .select("watch_channel_id,watch_resource_id")
    .eq("client_id",client.id)
    .eq("provider","google")
    .maybeSingle() : {data:null};

  if(connection?.watch_channel_id && connection?.watch_resource_id){
    try{
      const calendar=await getClientGoogleCalendar(client.id);
      if(calendar){
        await calendar.channels.stop({requestBody:{id:connection.watch_channel_id,resourceId:connection.watch_resource_id}});
      }
    }catch{}
  }

  const {error}=await supabase
    .from("calendar_connections")
    .delete()
    .eq("client_id",client.id)
    .eq("provider","google");

  if(error) return NextResponse.json({error:"Não foi possível desconectar."},{status:500});
  return NextResponse.json({ok:true});
}
