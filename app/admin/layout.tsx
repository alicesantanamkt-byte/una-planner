import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({children}:{children:React.ReactNode}){
  const supabase = await createServerSupabaseClient();
  if(!supabase) return <>{children}</>;

  const {data:authData} = await supabase.auth.getUser();
  if(!authData.user) redirect("/login");

  const {data:profile} = await supabase
    .from("profiles")
    .select("role")
    .eq("id",authData.user.id)
    .maybeSingle();

  if(profile?.role!=="admin") redirect("/app");

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand">UNA</div>
      <div className="brand-sub">operação</div>
      <nav className="nav">
        <Link href="/admin">Visão geral</Link>
        <Link href="/admin/clients">Clientes</Link>
        <Link href="/admin/import">Importar calendário</Link>
        <Link href="/admin/suggestions">Sugestões</Link>
        <Link href="/admin/alerts">Alertas</Link>
      </nav>
    </aside>
    <main className="main">{children}</main>
  </div>;
}
