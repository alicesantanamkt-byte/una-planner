'use server';

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractEditorialCalendarFromPdf } from "@/lib/openai/extract-editorial-calendar";

export async function analyzePdf(formData:FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado.");

  const clientId = String(formData.get("clientId") || "");
  const file = formData.get("file");
  if (!clientId || !(file instanceof File)) return;
  if (file.type !== "application/pdf") throw new Error("Envie um arquivo PDF.");
  if (file.size > 50 * 1024 * 1024) throw new Error("O PDF excede o limite de 50 MB da API.");

  const result = await extractEditorialCalendarFromPdf(file);

  const {data:review,error} = await supabase
    .from("ai_import_reviews")
    .insert({
      client_id: clientId,
      source_filename: file.name,
      source_type: "pdf",
      ai_payload: result,
      confidence: result.confidence,
      status: "pending_review"
    })
    .select("id")
    .single();

  if (error) throw error;
  redirect(`/admin/import/pdf/${review.id}`);
}

export async function confirmPdfImport(reviewId:string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado.");

  const {data:review} = await supabase
    .from("ai_import_reviews")
    .select("*")
    .eq("id",reviewId)
    .single();

  if (!review || review.status!=="pending_review") return;

  const contents = Array.isArray(review.ai_payload?.contents)
    ? review.ai_payload.contents
    : [];

  if (contents.length) {
    await supabase.from("content_items").insert(
      contents.map((item:any)=>({
        client_id: review.client_id,
        title: item.title,
        format: item.format || null,
        publish_at: item.publish_date
          ? `${item.publish_date}T12:00:00-03:00`
          : null,
        estimated_minutes: item.estimated_minutes || 15,
        preferred_location: item.preferred_location || null,
        status: "pending",
        metadata_json: {
          objective: item.objective,
          cta: item.cta,
          notes: item.notes,
          dependency_types: item.dependency_types,
          ai_confidence: item.confidence,
          source: "ai_pdf_import"
        }
      }))
    );
  }

  await supabase
    .from("ai_import_reviews")
    .update({
      status:"confirmed",
      reviewed_at:new Date().toISOString()
    })
    .eq("id",reviewId);

  redirect("/admin/import");
}
