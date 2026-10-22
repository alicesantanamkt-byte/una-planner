'use server';

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getClientId() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", authData.user.id)
    .single();

  if (!client) redirect("/onboarding");
  return { supabase, clientId: client.id };
}

export async function createManualEvent(formData: FormData) {
  const { supabase, clientId } = await getClientId();

  const date = String(formData.get("date") || "");
  const start = String(formData.get("start") || "");
  const end = String(formData.get("end") || "");
  const title = String(formData.get("title") || "");
  const location = String(formData.get("location") || "");

  if (!date || !start || !end || !title) return;

  await supabase.from("calendar_events").insert({
    client_id: clientId,
    source: "manual",
    title,
    location,
    start_datetime: `${date}T${start}:00-03:00`,
    end_datetime: `${date}T${end}:00-03:00`,
  });

  revalidatePath("/app/calendar");
}

export async function deleteManualEvent(id:string) {
  const { supabase } = await getClientId();
  await supabase.from("calendar_events").delete().eq("id", id).eq("source","manual");
  revalidatePath("/app/calendar");
}
