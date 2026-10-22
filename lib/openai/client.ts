import OpenAI from "openai";

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.");
  return new OpenAI({ apiKey });
}

export function getAIModel() {
  return process.env.OPENAI_MODEL || "gpt-6-luna";
}
