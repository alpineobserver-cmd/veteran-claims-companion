import {
  Bell, BookOpen, ClipboardList, FileText, Files, FolderOpen,
  LayoutDashboard, LifeBuoy, Menu, Search, Settings, ShieldCheck, User
} from "lucide-react";

const links = [
  ["home", "Home", "/", LayoutDashboard], ["builder", "Build a claim", "/claim-builder", ClipboardList],
  ["conditions", "Conditions", "#", BookOpen], ["evidence", "Evidence guide", "#", FolderOpen],
  ["templates", "Statement templates", "#", FileText], ["forms", "VA forms", "#", Files]
] as const;

export function AppShell({ children, current = "home" }: { children: React.ReactNode; current?: string }) {
  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="Veteran Claims Companion home">
        <span className="brandmark"><ShieldCheck size={22}/></span>
        <span className="brandcopy"><strong>Veteran Claims</strong><small>Companion</small></span>
      </a>
      <p className="nav-label">Your workspace</p>
      <nav className="nav" aria-label="Primary navigation">
        {links.map(([key, label, href, Icon]) => <a className={current === key ? "active" : ""} href={href} key={key}>
          <Icon size={18}/><span>{label}</span>
        </a>)}
      </nav>
      <div className="sidebar-rule"/>
      <nav className="nav utility-nav" aria-label="Account navigation">
        <a href="#"><User size={18}/><span>Profile</span></a>
        <a href="#"><Settings size={18}/><span>Settings</span></a>
      </nav>
      <a className="side-help" href="#"><LifeBuoy size={19}/><span><strong>Need a hand?</strong><small>Start with the claims guide</small></span></a>
    </aside>
    <main className="main">
      <header className="topbar">
        <button className="iconbtn mobile-menu" aria-label="Open menu"><Menu size={19}/></button>
        <label className="search"><Search size={18}/><input aria-label="Search resources" placeholder="Search the companion…"/></label>
        <div className="top-actions"><button className="iconbtn" aria-label="Notifications"><Bell size={18}/></button><div className="avatar" aria-label="Demo user">JD</div></div>
      </header>
      {children}
    </main>
  </div>;
}
