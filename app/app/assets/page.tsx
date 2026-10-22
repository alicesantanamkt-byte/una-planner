import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { deleteAsset, updateAssetMetadata } from "./actions";
import { AssetMatchButton } from "./AssetMatchButton";
import { AssetUploadForm } from "./AssetUploadForm";

export const dynamic = "force-dynamic";

export default async function AssetsPage(){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <AppShell><h1>Configure o Supabase.</h1></AppShell>;

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:client} = await supabase
    .from("clients")
    .select("id")
    .eq("user_id",authData.user.id)
    .single();

  if(!client) redirect("/onboarding");

  const {data:assets} = await supabase
    .from("content_assets")
    .select("id,storage_path,asset_type,context,tags_json,captured_at,used_count")
    .eq("client_id",client.id)
    .order("captured_at",{ascending:false});

  const withUrls = await Promise.all((assets||[]).map(async (a:any)=>{
    const {data} = await supabase.storage
      .from("client-assets")
      .createSignedUrl(a.storage_path,60*15);
    return {...a,signedUrl:data?.signedUrl || null};
  }));

  const needsDescription = withUrls.some((a:any)=>!a.context && !(Array.isArray(a.tags_json)&&a.tags_json.length));

  return <AppShell>
    <div className="eyebrow">Acervo</div>
    <h1>Banco de conteúdo.</h1>
    <p className="sub">Fotos e vídeos que podem ser reaproveitados nos próximos conteúdos.</p>

    <div className="grid">
      <div className="half">
        <AssetUploadForm clientId={client.id} userId={authData.user.id}/>
        <AssetMatchButton hasUndescribedAssets={needsDescription}/>
      </div>

      <div className="card half">
        <h3>Acervo salvo</h3>
        {withUrls.length===0 && <p className="meta">Seu banco ainda está vazio. Adicione uma foto ou vídeo ao lado para começar.</p>}
        {withUrls.map((a:any)=>{
          const tags = Array.isArray(a.tags_json) ? a.tags_json : [];
          const missing = !a.context && !tags.length;
          const editor = <form action={updateAssetMetadata.bind(null,a.id)} style={{marginTop:10}}>
            <label>O que aparece neste material?
              <input name="context" maxLength={500} defaultValue={a.context || ""} placeholder="Ex.: trabalhando no notebook, bastidor em casa, café na mesa..."/>
            </label>
            <label style={{marginTop:8}}>Tags
              <input name="tags" defaultValue={tags.join(", ")} placeholder="bastidor, rotina, trabalho"/>
            </label>
            <button className="btn btn-soft" style={{marginTop:10}}>Salvar descrição</button>
          </form>;

          return <div className="item" key={a.id}>
            <div className="row" style={{alignItems:"flex-start",gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <strong>{a.context || (a.asset_type==="video" ? "Vídeo sem descrição" : "Imagem sem descrição")}</strong>
                <div className="meta">{tags.length ? tags.join(" · ") : "sem tags"} · usado {a.used_count || 0}x</div>
                {a.signedUrl && <a href={a.signedUrl} target="_blank" rel="noreferrer" className="meta">Abrir arquivo</a>}
                {missing ? <>
                  <div className="meta" style={{marginTop:8}}>Para encontrar usos, descreva rapidamente o que aparece neste material.</div>
                  {editor}
                </> : <details style={{marginTop:10}}>
                  <summary className="meta" style={{cursor:"pointer",fontWeight:700}}>Editar descrição</summary>
                  {editor}
                </details>}
              </div>
              <form action={deleteAsset.bind(null,a.id)}>
                <button className="btn btn-soft">Excluir</button>
              </form>
            </div>
          </div>;
        })}
      </div>
    </div>
  </AppShell>;
}
