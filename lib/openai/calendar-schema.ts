export const editorialCalendarSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reference_month: {
      type: ["string","null"],
      description: "Mês de referência em YYYY-MM quando identificável."
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    contents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          format: { type: ["string","null"] },
          publish_date: { type: ["string","null"], description: "YYYY-MM-DD quando identificável." },
          objective: { type: ["string","null"] },
          cta: { type: ["string","null"] },
          notes: { type: ["string","null"] },
          estimated_minutes: { type: ["integer","null"] },
          preferred_location: { type: ["string","null"] },
          dependency_types: {
            type: "array",
            items: { type: "string" }
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
          }
        },
        required: [
          "title","format","publish_date","objective","cta","notes",
          "estimated_minutes","preferred_location","dependency_types","confidence"
        ]
      }
    }
  },
  required: ["reference_month","confidence","contents"]
} as const;
