export const assetMatchSchema = {
  type:"object",
  additionalProperties:false,
  properties:{
    score:{type:"integer",minimum:0,maximum:100},
    should_use:{type:"boolean"},
    reason:{type:"string"},
    suggested_usage:{type:["string","null"]}
  },
  required:["score","should_use","reason","suggested_usage"]
} as const;
