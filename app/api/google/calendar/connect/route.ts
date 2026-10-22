import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthorizationUrl } from "@/lib/google/calendar";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({error:"Supabase não configurado."},{status:500});

  const {data:authData} = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.redirect(new URL("/login", process.env.APP_URL));

  const state = crypto.randomBytes(24).toString("hex");

  await supabase.from("oauth_states").insert({
    user_id: authData.user.id,
    provider: "google_calendar",
    state
  });

  return NextResponse.redirect(getAuthorizationUrl(state));
}
