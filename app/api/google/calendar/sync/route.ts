import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncClientGoogleCalendar } from "@/lib/google/sync-client-calendar";
import { ensureGoogleCalendarWatch } from "@/lib/google/calendar-watch";

export const maxDuration = 60;

export async function POST(){
  const supabase=await createServerSupabaseClient();
  if(!supabase) return NextResponse.json({error:"Supabase não configurado."},{status:500});

  const {data:authData}=await supabase.auth.getUser();
  if(!authData.user) return NextResponse.json({error:"Não autenticado."},{status:401});

  const {data:client}=await supabase
    .from("clients")
    .select("id")
    .eq("user_id",authData.user.id)
    .single();
  if(!client) return NextResponse.json({error:"Cliente não encontrado."},{status:404});

  try{
    const result=await syncClientGoogleCalendar(client.id);
    let watch:any=null;
    try{ watch=await ensureGoogleCalendarWatch(client.id); }catch(error){ console.error("Google Calendar watch setup failed",error); }
    return NextResponse.json({ok:true,imported:result.imported,autoSync:watch?.enabled===true,watchExpiration:watch?.expiration || null});
  }catch(error:any){
    const status=Number(error?.response?.status || error?.code || 500);
    if(status===401) return NextResponse.json({error:"A autorização do Google expirou. Desconecte e conecte a agenda novamente."},{status:401});
    if(status===403) return NextResponse.json({error:"O Google recusou o acesso à agenda. Confirme a conexão e tente novamente."},{status:403});
    console.error("Google Calendar sync failed",error);
    return NextResponse.json({error:"Não foi possível sincronizar o Google Agenda agora. Tente novamente."},{status:500});
  }
}
