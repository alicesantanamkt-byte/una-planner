'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {label:"Visão geral",href:"/admin",icon:"⌂"},
  {label:"Clientes",href:"/admin/clients",icon:"◎"},
  {label:"Calendários",href:"/admin/import",icon:"▣"},
  {label:"Motor",href:"/admin/suggestions",icon:"◇"},
  {label:"Alertas",href:"/admin/alerts",icon:"!"},
];

export function AdminSidebar(){
  const pathname = usePathname();
  const active = (href:string)=> href==="/admin" ? pathname==="/admin" : pathname.startsWith(href);

  return <aside className="admin-sidebar">
    <div className="admin-brand">
      <img src="/una-logo-white.svg" alt="UNA Studio Criativo"/>
      <span>operação</span>
    </div>
    <nav className="admin-nav" aria-label="Administração UNA">
      {items.map(item=><Link key={item.href} href={item.href} className={active(item.href)?"active":""}>
        <span className="admin-nav-icon">{item.icon}</span>
        <span>{item.label}</span>
      </Link>)}
    </nav>
    <div className="admin-sidebar-foot">
      <div className="admin-badge">UNA</div>
      <div><strong>Área administrativa</strong><span>operação interna</span></div>
    </div>
  </aside>;
}
