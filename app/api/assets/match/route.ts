import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { matchAssetToContent } from "@/lib/openai/match-asset";

export async function POST(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return NextResponse.json({error:"Supabase não configurado."},{status:500});

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) return NextResponse.json({error:"Não autenticado."},{status:401});

  const {data:client} = await supabase
    .from("clients")
    .select("id")
    .eq("user_id",authData.user.id)
    .single();

  const {data:assets} = await supabase
    .from("content_assets")
    .select("id,context,tags_json")
    .eq("client_id",client.id)
    .limit(30);

  const {data:contents} = await supabase
    .from("content_items")
    .select("id,title,metadata_json,status")
    .eq("client_id",client.id)
    .eq("status","pending")
    .limit(30);

  const created:any[]=[];

  for(const asset of assets || []){
    for(const content of contents || []){
      const result = await matchAssetToContent({
        assetContext:asset.context,
        assetTags:asset.tags_json || [],
        contentTitle:content.title,
        contentMetadata:content.metadata_json
      });

      if(!result || !result.should_use || result.score<70) continue;

      const {data:match} = await supabase
        .from("content_asset_matches")
        .upsert({
          asset_id:asset.id,
          content_item_id:content.id,
          score:result.score,
          reason:result.reason,
          suggested_usage:result.suggested_usage
        },{onConflict:"asset_id,content_item_id"})
        .select("*")
        .single();

      created.push(match);
    }
  }

  return NextResponse.json({ok:true,matches:created.length});
}
