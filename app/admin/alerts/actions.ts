'use server';

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function resolveAlert(id:string){
  const supabase = await createServerSupabaseClient();
  if(!supabase) throw new Error("Supabase não configurado.");

  await supabase.from("alerts").update({resolved:true}).eq("id",id);
  revalidatePath("/admin/alerts");
  revalidatePath("/admin");
}
