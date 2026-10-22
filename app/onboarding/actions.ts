'use server';

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveOnboarding(payload: {
  calendarMode: string;
  start: string;
  end: string;
  recordingMode: string;
  minFree: string;
  microCapture: boolean;
  restrictions: string;
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const values = {
    user_id: user.id,
    calendar_mode: payload.calendarMode,
    recording_mode: payload.recordingMode,
    min_free_minutes: Number(payload.minFree),
    micro_capture_enabled: payload.microCapture,
    work_start_time: payload.start,
    work_end_time: payload.end,
    active_weekdays: [1,2,3,4,5],
    restrictions: payload.restrictions,
    onboarding_completed: true,
  };

  if (existing?.id) {
    await supabase.from("clients").update(values).eq("id", existing.id);
  } else {
    await supabase.from("clients").insert(values);
  }

  redirect("/app");
}
