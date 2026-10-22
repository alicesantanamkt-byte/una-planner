import { getOpenAI, getAIModel } from "./client";
import { microCaptureSchema } from "./microcapture-schema";

export async function generateMicroCapture(input:{
  eventTitle:string;
  eventLocation?:string|null;
  restrictions?:string|null;
  microCaptureEnabled:boolean;
}) {
  if (!input.microCaptureEnabled) return null;

  const openai = getOpenAI();
  const response = await openai.responses.create({
    model: getAIModel(),
    input: [{
      role: "user",
      content: [{
        type: "input_text",
        text: [
          "Você cria microcaptações opcionais para banco de conteúdo de uma profissional.",
          `Evento: ${input.eventTitle}`,
          `Local: ${input.eventLocation || "não informado"}`,
          `Restrições da cliente: ${input.restrictions || "nenhuma informada"}`,
          "",
          "Regras:",
          "- A sugestão deve exigir no máximo 60 segundos.",
          "- Não transforme toda atividade em conteúdo.",
          "- Não sugira filmagem enquanto a pessoa estiver dirigindo.",
          "- Não sugira exposição de paciente, cliente, criança ou terceiro sem autorização.",
          "- Não sugira captação se o contexto for claramente privado, protegido ou inadequado.",
          "- Prefira b-roll simples e natural.",
          "- Se não fizer sentido, should_suggest=false."
        ].join("\n")
      }]
    }],
    text: {
      format: {
        type: "json_schema",
        name: "micro_capture",
        strict: true,
        schema: microCaptureSchema
      }
    }
  });

  if (!response.output_text) return null;
  return JSON.parse(response.output_text);
}
