import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google/calendar";
import { encryptSecret } from "@/lib/crypto";

export async function GET(request:NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({error:"Supabase não configurado."},{status:500});

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/app/settings?google=denied", process.env.APP_URL));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/app/settings?google=invalid", process.env.APP_URL));
  }

  const {data:authData} = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.redirect(new URL("/login", process.env.APP_URL));

  const {data:stateRow} = await supabase
    .from("oauth_states")
    .select("id,user_id")
    .eq("provider","google_calendar")
    .eq("state",state)
    .eq("user_id",authData.user.id)
    .maybeSingle();

  if (!stateRow) {
    return NextResponse.redirect(new URL("/app/settings?google=state_error", process.env.APP_URL));
  }

  await supabase.from("oauth_states").delete().eq("id",stateRow.id);

  const tokens = await exchangeCodeForTokens(code);

  const encryptedAccess = tokens.access_token ? encryptSecret(tokens.access_token) : null;
  const encryptedRefresh = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null;

  const {data:client} = await supabase
    .from("clients")
    .select("id")
    .eq("user_id",authData.user.id)
    .single();

  if(!client) {
    return NextResponse.redirect(new URL("/app/settings?google=client_error", process.env.APP_URL));
  }

  await supabase.from("calendar_connections").upsert({
    client_id: client.id,
    provider: "google",
    access_token_encrypted: encryptedAccess,
    refresh_token_encrypted: encryptedRefresh,
    expiry_date: tokens.expiry_date || null,
    scope: tokens.scope || null,
    connected_at: new Date().toISOString()
  }, { onConflict: "client_id,provider" });

  return NextResponse.redirect(new URL("/app/settings?google=connected", process.env.APP_URL));
}
