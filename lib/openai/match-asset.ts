import { getOpenAI, getAIModel } from "./client";
import { assetMatchSchema } from "./asset-match-schema";

export async function matchAssetToContent(input:{
  assetContext:string|null;
  assetTags:string[];
  contentTitle:string;
  contentMetadata:any;
}) {
  const openai = getOpenAI();

  const response = await openai.responses.create({
    model:getAIModel(),
    input:[{
      role:"user",
      content:[{
        type:"input_text",
        text:[
          "Avalie se um material já gravado pode ser útil para um conteúdo editorial futuro.",
          `Material - contexto: ${input.assetContext || "não informado"}`,
          `Material - tags: ${input.assetTags.join(", ") || "nenhuma"}`,
          `Conteúdo: ${input.contentTitle}`,
          `Metadados: ${JSON.stringify(input.contentMetadata || {})}`,
          "",
          "Considere contexto, tema, tipo de imagem, possível b-roll e aderência natural.",
          "Não force associação só porque há palavras parecidas.",
          "Score alto apenas quando o reaproveitamento fizer sentido de verdade."
        ].join("\n")
      }]
    }],
    text:{
      format:{
        type:"json_schema",
        name:"asset_match",
        strict:true,
        schema:assetMatchSchema
      }
    }
  });

  if(!response.output_text) return null;
  return JSON.parse(response.output_text);
}
