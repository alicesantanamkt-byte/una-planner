export const microCaptureSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    classification: {
      type: "string",
      enum: ["professional","meeting","appointment","health","personal","travel","protected","other"]
    },
    should_suggest: { type: "boolean" },
    suggestion: { type: ["string","null"] },
    estimated_seconds: { type: ["integer","null"] },
    tags: {
      type: "array",
      items: { type: "string" }
    },
    safety_reason: { type: ["string","null"] }
  },
  required: ["classification","should_suggest","suggestion","estimated_seconds","tags","safety_reason"]
} as const;
