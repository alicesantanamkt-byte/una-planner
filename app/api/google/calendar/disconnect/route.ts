import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  await supabase
    .from("calendar_connections")
    .delete()
    .eq("client_id",client.id)
    .eq("provider","google");

  return NextResponse.json({ok:true});
}
