import { getOpenAI, getAIModel } from "./client";
import { assetMatchSchema } from "./asset-match-schema";

export async function matchAssetToContents(input:{
  assetContext:string|null;
  assetTags:string[];
  contents:Array<{id:string;title:string;metadata_json:any}>;
}) {
  const openai = getOpenAI();

  const response = await openai.responses.create({
    model:getAIModel(),
    input:[{
      role:"user",
      content:[{
        type:"input_text",
        text:[
          "Avalie em lote onde um material já gravado pode ser útil entre os conteúdos editoriais abaixo.",
          `Material - contexto: ${input.assetContext || "não informado"}`,
          `Material - tags: ${input.assetTags.join(", ") || "nenhuma"}`,
          "",
          "Conteúdos candidatos:",
          JSON.stringify(input.contents.map(c=>({id:c.id,title:c.title,metadata:c.metadata_json || {}}))),
          "",
          "Retorne um item para cada conteúdo candidato, preservando exatamente o content_id recebido.",
          "Considere contexto, tema, tipo de imagem, possível b-roll e aderência natural.",
          "Não force associação apenas por palavras parecidas.",
          "Use should_use=true apenas quando houver reaproveitamento realmente útil.",
          "Score alto apenas quando a associação fizer sentido de verdade."
        ].join("\n")
      }]
    }],
    text:{
      format:{
        type:"json_schema",
        name:"asset_match_batch",
        strict:true,
        schema:assetMatchSchema
      }
    }
  });

  if(!response.output_text) return [];
  const parsed = JSON.parse(response.output_text);
  return Array.isArray(parsed?.matches) ? parsed.matches : [];
}
