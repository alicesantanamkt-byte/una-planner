import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { matchAssetToContents } from "@/lib/openai/match-asset";

export const maxDuration = 60;

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

  if(!client) return NextResponse.json({error:"Cliente não encontrado."},{status:404});

  const [{data:assets,error:assetsError},{data:contents,error:contentsError}] = await Promise.all([
    supabase
      .from("content_assets")
      .select("id,context,tags_json")
      .eq("client_id",client.id)
      .limit(30),
    supabase
      .from("content_items")
      .select("id,title,metadata_json,status")
      .eq("client_id",client.id)
      .in("status",["pending","planned"])
      .limit(40)
  ]);

  if(assetsError || contentsError){
    return NextResponse.json({error:"Não foi possível carregar seu banco e seus conteúdos."},{status:500});
  }
  if(!(assets||[]).length){
    return NextResponse.json({error:"Seu banco de conteúdo ainda está vazio."},{status:400});
  }
  if(!(contents||[]).length){
    return NextResponse.json({error:"Não há conteúdos pendentes para comparar."},{status:400});
  }

  const undescribed = (assets || []).filter(asset=>{
    const tags = Array.isArray(asset.tags_json) ? asset.tags_json : [];
    return !String(asset.context || "").trim() && !tags.length;
  });
  if(undescribed.length){
    return NextResponse.json({
      error:"Antes de analisar, descreva o que aparece nos materiais sem contexto e salve a descrição."
    },{status:400});
  }

  let createdCount = 0;

  try{
    for(const asset of assets || []){
      const results = await matchAssetToContents({
        assetContext:asset.context,
        assetTags:Array.isArray(asset.tags_json) ? asset.tags_json : [],
        contents:(contents || []).map(c=>({id:c.id,title:c.title,metadata_json:c.metadata_json}))
      });

      const validIds = new Set((contents || []).map(c=>c.id));
      const rows = results
        .filter((result:any)=>
          result &&
          validIds.has(result.content_id) &&
          result.should_use === true &&
          Number(result.score) >= 70
        )
        .map((result:any)=>({
          asset_id:asset.id,
          content_item_id:result.content_id,
          score:Number(result.score),
          reason:String(result.reason || ""),
          suggested_usage:result.suggested_usage ? String(result.suggested_usage) : null
        }));

      if(rows.length){
        const {error:upsertError} = await supabase
          .from("content_asset_matches")
          .upsert(rows,{onConflict:"asset_id,content_item_id"});
        if(upsertError) throw upsertError;
        createdCount += rows.length;
      }
    }

    return NextResponse.json({ok:true,matches:createdCount});
  }catch(error){
    console.error("Asset matching failed",error);
    return NextResponse.json({error:"Não foi possível concluir a análise deste banco agora."},{status:500});
  }
}
