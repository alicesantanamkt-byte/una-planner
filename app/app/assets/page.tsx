import { AppShell } from "@/components/AppShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { deleteAsset } from "./actions";
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

  return <AppShell>
    <div className="eyebrow">Acervo</div>
    <h1>Banco de conteúdo.</h1>
    <p className="sub">Fotos e vídeos que podem ser reaproveitados nos próximos conteúdos.</p>

    <div className="grid">
      <div className="half">
        <AssetUploadForm clientId={client.id} userId={authData.user.id}/>
        <AssetMatchButton />
      </div>

      <div className="card half">
        <h3>Acervo salvo</h3>
        {withUrls.length===0 && <p className="meta">Seu banco ainda está vazio. Adicione uma foto ou vídeo ao lado para começar.</p>}
        {withUrls.map((a:any)=><div className="item" key={a.id}>
          <div className="row" style={{alignItems:"flex-start"}}>
            <div>
              <strong>{a.context || (a.asset_type==="video" ? "Vídeo" : "Imagem")}</strong>
              <div className="meta">{(Array.isArray(a.tags_json) ? a.tags_json : []).join(" · ")} · usado {a.used_count || 0}x</div>
              {a.signedUrl && <a href={a.signedUrl} target="_blank" rel="noreferrer" className="meta">Abrir arquivo</a>}
            </div>
            <form action={deleteAsset.bind(null,a.id)}>
              <button className="btn btn-soft">Excluir</button>
            </form>
          </div>
        </div>)}
      </div>
    </div>
  </AppShell>;
}
