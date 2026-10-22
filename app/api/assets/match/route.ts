import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { matchAssetToContents } from "@/lib/openai/match-asset";

export const maxDuration = 60;

const STOP_WORDS = new Set([
  "a","o","as","os","de","da","do","das","dos","e","em","no","na","nos","nas","um","uma","para","por","com","que","se","eu","meu","minha","seu","sua","como","mais","antes","depois","isso","essa","esse","ao","aos"
]);

function normalize(value:string){
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function words(value:string){
  return normalize(value)
    .split(" ")
    .filter(word=>word.length>=3 && !STOP_WORDS.has(word));
}

function buildAssetTerms(context:string|null,tags:string[]){
  const terms = new Set([...words(context || ""), ...tags.flatMap(tag=>words(tag))]);
  const joined = normalize(`${context || ""} ${tags.join(" ")}`);

  const add = (...values:string[])=>values.forEach(value=>terms.add(value));

  if(/notebook|computador|trabalho|trabalhando/.test(joined)){
    add("trabalho","rotina","conteudo","produzir","producao","criacao","instagram","negocio","empreendedora","bastidor","planejar");
  }
  if(/cafe|cafeteria/.test(joined)){
    add("rotina","cotidiano","trabalho","bastidor","empreendedora");
  }
  if(/bastidor|rotina/.test(joined)){
    add("rotina","trabalho","processo","conteudo","gravacao","produzir","criacao");
  }
  if(/cliente|atendimento|reuniao/.test(joined)){
    add("cliente","atendimento","reuniao","trabalho","processo","negocio","autoridade");
  }
  if(/casa|filho|mae|familia/.test(joined)){
    add("rotina","mae","familia","vida","trabalho","empreendedora","bastidor");
  }

  return terms;
}

function rankCandidates(asset:{context:string|null;tags_json:any}, contents:any[]){
  const tags = Array.isArray(asset.tags_json) ? asset.tags_json.map(String) : [];
  const terms = buildAssetTerms(asset.context,tags);

  const ranked = contents.map(content=>{
    const titleWords = words(content.title || "");
    let localScore = 0;
    for(const word of titleWords){
      if(terms.has(word)) localScore += 2;
      else {
        for(const term of terms){
          if(term.length>=5 && word.length>=5 && (term.includes(word) || word.includes(term))){
            localScore += 1;
            break;
          }
        }
      }
    }

    return {content,localScore};
  }).sort((a,b)=>b.localScore-a.localScore);

  const withSignal = ranked.filter(item=>item.localScore>0);
  return (withSignal.length ? withSignal : ranked).slice(0,12);
}

function fallbackRows(asset:any, ranked:Array<{content:any;localScore:number}>){
  return ranked
    .filter(item=>item.localScore>=2)
    .slice(0,4)
    .map(item=>({
      asset_id:asset.id,
      content_item_id:item.content.id,
      score:Math.min(82,70 + item.localScore*2),
      reason:`O contexto “${String(asset.context || "material salvo").slice(0,120)}” tem aderência com o tema deste conteúdo.`,
      suggested_usage:"Use este material como B-roll ou apoio visual em um trecho que fale de rotina, trabalho, processo ou bastidores, se combinar com a copy final."
    }));
}

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
      .select("id,title,metadata_json,status,publish_at")
      .eq("client_id",client.id)
      .in("status",["pending","planned"])
      .order("publish_at",{ascending:true,nullsFirst:false})
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

  const admin = createAdminSupabaseClient();
  if(!admin) return NextResponse.json({error:"Configuração interna indisponível."},{status:500});

  let createdCount = 0;
  let usedFallback = false;

  try{
    for(const asset of assets || []){
      const ranked = rankCandidates(asset,contents || []);
      const candidates = ranked.map(item=>item.content);
      let rows:any[] = [];

      try{
        const results = await matchAssetToContents({
          assetContext:asset.context,
          assetTags:Array.isArray(asset.tags_json) ? asset.tags_json : [],
          contents:candidates.map(c=>({id:c.id,title:c.title,metadata_json:c.metadata_json}))
        });

        const validIds = new Set(candidates.map(c=>c.id));
        rows = results
          .filter((result:any)=>
            result &&
            validIds.has(result.content_id) &&
            result.should_use === true &&
            Number(result.score) >= 70
          )
          .sort((a:any,b:any)=>Number(b.score)-Number(a.score))
          .slice(0,6)
          .map((result:any)=>({
            asset_id:asset.id,
            content_item_id:result.content_id,
            score:Number(result.score),
            reason:String(result.reason || ""),
            suggested_usage:result.suggested_usage ? String(result.suggested_usage) : null
          }));
      }catch(error){
        console.error("AI asset matching failed; using local fallback",error);
        usedFallback = true;
      }

      if(!rows.length){
        const fallback = fallbackRows(asset,ranked);
        if(fallback.length){
          rows = fallback;
          usedFallback = true;
        }
      }

      if(rows.length){
        const {error:upsertError} = await admin
          .from("content_asset_matches")
          .upsert(rows,{onConflict:"asset_id,content_item_id"});
        if(upsertError) throw upsertError;
        createdCount += rows.length;
      }
    }

    return NextResponse.json({ok:true,matches:createdCount,usedFallback});
  }catch(error){
    console.error("Asset matching failed",error);
    return NextResponse.json({error:"Não foi possível concluir a análise deste banco agora."},{status:500});
  }
}
