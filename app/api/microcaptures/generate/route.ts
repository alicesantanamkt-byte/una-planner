import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateMicroCapture } from "@/lib/openai/generate-microcapture";

export async function POST(request:NextRequest) {
  const supabase = await createServerSupabaseClient();
  if(!supabase) return NextResponse.json({error:"Supabase não configurado."},{status:500});

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) return NextResponse.json({error:"Não autenticado."},{status:401});

  const body = await request.json();
  const eventId = String(body.eventId || "");

  const {data:client} = await supabase
    .from("clients")
    .select("id,restrictions,micro_capture_enabled")
    .eq("user_id",authData.user.id)
    .single();

  if(!client) return NextResponse.json({error:"Cliente não encontrado."},{status:404});

  const {data:event} = await supabase
    .from("calendar_events")
    .select("id,title,location,capture_allowed,protected")
    .eq("id",eventId)
    .eq("client_id",client.id)
    .single();

  if(!event) return NextResponse.json({error:"Evento não encontrado."},{status:404});

  if(event.protected || !event.capture_allowed) {
    return NextResponse.json({ok:true,skipped:true,reason:"evento protegido"});
  }

  const result = await generateMicroCapture({
    eventTitle:event.title,
    eventLocation:event.location,
    restrictions:client.restrictions,
    microCaptureEnabled:client.micro_capture_enabled
  });

  if(!result?.should_suggest) {
    return NextResponse.json({ok:true,skipped:true,result});
  }

  const {data:suggestion} = await supabase
    .from("micro_capture_suggestions")
    .insert({
      client_id:client.id,
      calendar_event_id:event.id,
      suggestion_text:result.suggestion,
      estimated_seconds:result.estimated_seconds || 30,
      tags_json:result.tags || [],
      status:"suggested",
      ai_payload:result
    })
    .select("*")
    .single();

  return NextResponse.json({ok:true,suggestion});
}
