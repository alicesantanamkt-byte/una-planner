'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {label:"Hoje", href:"/app", icon:"⌂"},
  {label:"Planejamento", href:"/app/month", icon:"▣"},
  {label:"Produção", href:"/app/suggestions", icon:"◫"},
  {label:"Acervo", href:"/app/assets", icon:"▤"},
  {label:"Configurações", href:"/app/settings", icon:"⚙"}
];

export function Sidebar(){
  const pathname = usePathname();

  function isActive(href:string){
    if(href==="/app") return pathname==="/app";
    if(href==="/app/month") return pathname.startsWith("/app/month") || pathname.startsWith("/app/calendar");
    if(href==="/app/suggestions") return pathname.startsWith("/app/suggestions") || pathname.startsWith("/app/tasks") || pathname.startsWith("/app/microcaptures");
    if(href==="/app/assets") return pathname.startsWith("/app/assets");
    if(href==="/app/settings") return pathname.startsWith("/app/settings");
    return pathname.startsWith(href);
  }

  return <aside className="sidebar">
    <div className="sidebar-brand-wrap">
      <img className="sidebar-logo" src="/una-logo-white.svg" alt="UNA Studio Criativo"/>
    </div>

    <nav className="nav" aria-label="Navegação principal">
      {items.map(item=><Link key={item.href} href={item.href} className={isActive(item.href)?"active":""}>
        <span className="nav-icon" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </Link>)}
    </nav>

    <div className="sidebar-footer">
      <div className="avatar-dot">U</div>
      <div>
        <strong>UNA Planner</strong>
        <span>área do cliente</span>
      </div>
    </div>
  </aside>
}
