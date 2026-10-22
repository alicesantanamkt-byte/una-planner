'use server';

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveClientSettings(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado.");

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) throw new Error("Não autenticado.");

  const displayName = String(formData.get("displayName") || "").trim();
  const brand = String(formData.get("brand") || "").trim();
  const segment = String(formData.get("segment") || "").trim();
  const recordingMode = String(formData.get("recordingMode") || "hybrid");
  const minFree = Number(formData.get("minFree") || 15);

  if (!displayName) throw new Error("Informe o nome da cliente.");

  const { error } = await supabase
    .from("clients")
    .update({
      display_name: displayName,
      brand: brand || null,
      segment: segment || null,
      recording_mode: recordingMode,
      min_free_minutes: minFree,
    })
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/app/settings");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/import");
}
