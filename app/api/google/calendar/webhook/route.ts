import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncClientGoogleCalendar } from "@/lib/google/sync-client-calendar";
import { ensureGoogleCalendarWatch } from "@/lib/google/calendar-watch";

export async function POST(request:NextRequest){
  const channelId=request.headers.get("x-goog-channel-id");
  const resourceId=request.headers.get("x-goog-resource-id");
  const token=request.headers.get("x-goog-channel-token");
  const resourceState=request.headers.get("x-goog-resource-state");

  if(!channelId || !resourceId || !token) return new NextResponse(null,{status:400});

  const admin=createAdminSupabaseClient();
  if(!admin) return new NextResponse(null,{status:500});

  const {data:connection}=await admin
    .from("calendar_connections")
    .select("client_id,watch_resource_id,watch_token,auto_sync_enabled")
    .eq("watch_channel_id",channelId)
    .eq("provider","google")
    .maybeSingle();

  if(!connection || connection.watch_resource_id!==resourceId || connection.watch_token!==token){
    return new NextResponse(null,{status:403});
  }

  if(connection.auto_sync_enabled===false) return new NextResponse(null,{status:204});

  try{
    if(resourceState!=="sync") await syncClientGoogleCalendar(connection.client_id);
    await ensureGoogleCalendarWatch(connection.client_id);
    return new NextResponse(null,{status:204});
  }catch(error){
    console.error("Google Calendar webhook sync failed",error);
    return new NextResponse(null,{status:500});
  }
}
