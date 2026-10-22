import Link from "next/link";

export function Sidebar(){
  return <aside className="sidebar">
    <div className="brand">UNA</div>
    <div className="brand-sub">planner</div>
    <nav className="nav">
      <Link href="/app">Hoje</Link>
      <Link href="/app/suggestions">Sugestões</Link>
      <Link href="/app/microcaptures">Microcaptações</Link>
      <Link href="/app/assets">Banco de conteúdo</Link>
      <Link href="/app/assets/matches">Sugestões de uso</Link>
      <Link href="/app/month">Meu mês</Link>
      <Link href="/app/tasks">O que gravar</Link>
      <Link href="/app/calendar">Minha agenda</Link>
      <Link href="/app/settings">Minha rotina</Link>
    </nav>
  </aside>
}
