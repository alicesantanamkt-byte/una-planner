import "./admin.css";
import { AdminSidebar } from "@/components/AdminSidebar";
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

  return <div className="admin-shell">
    <AdminSidebar/>
    <main className="admin-main">{children}</main>
  </div>;
}
