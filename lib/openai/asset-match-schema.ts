export const assetMatchSchema = {
  type:"object",
  additionalProperties:false,
  properties:{
    matches:{
      type:"array",
      items:{
        type:"object",
        additionalProperties:false,
        properties:{
          content_id:{type:"string"},
          score:{type:"integer",minimum:0,maximum:100},
          should_use:{type:"boolean"},
          reason:{type:"string"},
          suggested_usage:{type:["string","null"]}
        },
        required:["content_id","score","should_use","reason","suggested_usage"]
      }
    }
  },
  required:["matches"]
} as const;
