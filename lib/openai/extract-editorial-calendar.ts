import { getOpenAI, getAIModel } from "./client";
import { editorialCalendarSchema } from "./calendar-schema";

export async function extractEditorialCalendarFromPdf(file:File) {
  const openai = getOpenAI();
  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:application/pdf;base64,${bytes.toString("base64")}`;

  const response = await openai.responses.create({
    model: getAIModel(),
    input: [{
      role: "user",
      content: [
        {
          type: "input_file",
          filename: file.name,
          file_data: dataUrl,
          detail: "high"
        },
        {
          type: "input_text",
          text: [
            "Você está interpretando um calendário editorial de uma agência de marketing.",
            "Extraia apenas informações presentes ou fortemente inferíveis no documento.",
            "Não invente datas, formatos, CTA ou dependências.",
            "Quando algo não estiver claro, use null e reduza confidence.",
            "Dependências podem incluir: paciente, cliente, produto, equipe, local, evento, documento, autorização, luz natural.",
            "estimated_minutes só deve ser preenchido quando houver indicação plausível no arquivo; caso contrário null.",
            "O resultado será revisado por uma pessoa antes de ser importado."
          ].join("\n")
        }
      ]
    }],
    text: {
      format: {
        type: "json_schema",
        name: "editorial_calendar",
        strict: true,
        schema: editorialCalendarSchema
      }
    }
  });

  if (!response.output_text) throw new Error("A IA não retornou conteúdo estruturado.");
  return JSON.parse(response.output_text);
}
