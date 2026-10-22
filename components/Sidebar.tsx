'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {label:"Hoje", href:"/app", icon:"⌂", children:[]},
  {
    label:"Planejamento", href:"/app/month", icon:"▣",
    children:[
      {label:"Meu mês",href:"/app/month"},
      {label:"Minha agenda",href:"/app/calendar"}
    ]
  },
  {
    label:"Produção", href:"/app/suggestions", icon:"◫",
    children:[
      {label:"O que gravar",href:"/app/tasks"},
      {label:"Sugestões",href:"/app/suggestions"},
      {label:"Microcaptações",href:"/app/microcaptures"}
    ]
  },
  {
    label:"Acervo", href:"/app/assets", icon:"▤",
    children:[
      {label:"Banco de conteúdo",href:"/app/assets"},
      {label:"Sugestões de uso",href:"/app/assets/matches"}
    ]
  },
  {label:"Configurações", href:"/app/settings", icon:"⚙", children:[]}
];

export function Sidebar(){
  const pathname = usePathname();

  function exactActive(href:string){
    return href==="/app" ? pathname==="/app" : pathname===href;
  }

  function groupActive(group:any){
    if(group.href==="/app") return pathname==="/app";
    return pathname===group.href || group.children.some((child:any)=>pathname.startsWith(child.href));
  }

  return <aside className="sidebar">
    <div className="sidebar-brand-wrap">
      <img className="sidebar-logo" src="/una-logo-white.svg" alt="UNA Studio Criativo"/>
    </div>

    <nav className="nav" aria-label="Navegação principal">
      {groups.map(group=><div className="nav-group" key={group.label}>
        <Link href={group.href} className={`nav-parent ${groupActive(group)?"active":""}`}>
          <span className="nav-icon" aria-hidden="true">{group.icon}</span>
          <span>{group.label}</span>
        </Link>
        {group.children.length>0 && <div className="nav-children">
          {group.children.map(child=><Link
            key={child.href}
            href={child.href}
            className={exactActive(child.href)?"nav-child active-child":"nav-child"}
          >{child.label}</Link>)}
        </div>}
      </div>)}
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
