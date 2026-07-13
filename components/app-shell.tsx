"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell, BookOpen, ClipboardList, FileText, Files, FolderOpen,
  LayoutDashboard, LifeBuoy, Menu, Search, Settings, ShieldCheck, User, X
} from "lucide-react";
import { conditions } from "@/lib/conditions";
import { vaForms } from "@/lib/va-forms";

const links = [
  ["home", "Home", "/", LayoutDashboard, true],
  ["builder", "Build a claim", "/claim-builder", ClipboardList, true],
  ["conditions", "Conditions", "/conditions", BookOpen, true],
  ["evidence", "Evidence guide", "", FolderOpen, false],
  ["templates", "Statement templates", "", FileText, false],
  ["forms", "VA forms", "/forms", Files, true]
] as const;

const searchItems = [
  ...conditions.map(item => ({ label:item.name, detail:item.category, href:`/conditions/${item.slug}`, type:"Condition" })),
  ...vaForms.map(item => ({ label:`VA Form ${item.number}`, detail:item.name, href:`/forms/${item.slug}`, type:"Form" }))
];

export function AppShell({ children, current = "home" }: { children: React.ReactNode; current?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return searchItems.filter(item => `${item.label} ${item.detail} ${item.type}`.toLowerCase().includes(normalized)).slice(0, 7);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setMenuOpen(false); setNotificationsOpen(false); setQuery(""); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return <div className={`shell ${menuOpen ? "menu-open" : ""}`}>
    {menuOpen && <button className="sidebar-scrim" aria-label="Close menu" onClick={()=>setMenuOpen(false)}/>}
    <aside className="sidebar" aria-label="Companion navigation">
      <div className="mobile-sidebar-head"><span>Menu</span><button className="iconbtn" aria-label="Close menu" onClick={()=>setMenuOpen(false)}><X size={18}/></button></div>
      <a className="brand" href="/" aria-label="Veteran Claims Companion home" onClick={()=>setMenuOpen(false)}>
        <span className="brandmark"><ShieldCheck size={22}/></span>
        <span className="brandcopy"><strong>Veteran Claims</strong><small>Companion</small></span>
      </a>
      <p className="nav-label">Your workspace</p>
      <nav className="nav" aria-label="Primary navigation">
        {links.map(([key, label, href, Icon, ready]) => ready
          ? <a className={current === key ? "active" : ""} href={href} key={key} onClick={()=>setMenuOpen(false)}><Icon size={18}/><span>{label}</span></a>
          : <span className="nav-disabled" aria-disabled="true" key={key}><Icon size={18}/><span>{label}</span><small>Soon</small></span>)}
      </nav>
      <div className="sidebar-rule"/>
      <nav className="nav utility-nav" aria-label="Account navigation">
        <span className="nav-disabled" aria-disabled="true"><User size={18}/><span>Profile</span><small>After sign-in</small></span>
        <span className="nav-disabled" aria-disabled="true"><Settings size={18}/><span>Settings</span><small>After sign-in</small></span>
      </nav>
      <a className="side-help" href="/conditions" onClick={()=>setMenuOpen(false)}><LifeBuoy size={19}/><span><strong>Need a hand?</strong><small>Browse the condition guide</small></span></a>
    </aside>
    <main className="main">
      <header className="topbar">
        <button className="iconbtn mobile-menu" aria-label="Open menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><Menu size={19}/></button>
        <div className="search-wrap">
          <label className="search"><Search size={18}/><input aria-label="Search conditions and VA forms" placeholder="Search conditions and VA forms…" value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off"/></label>
          {query && <div className="search-results" role="listbox" aria-label="Search results">
            {results.length ? results.map(item => <a href={item.href} key={item.href} role="option"><span><strong>{item.label}</strong><small>{item.detail}</small></span><em>{item.type}</em></a>) : <p>No matching conditions or forms found.</p>}
          </div>}
        </div>
        <div className="top-actions">
          <div className="notifications-wrap"><button className="iconbtn" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={()=>setNotificationsOpen(open=>!open)}><Bell size={18}/></button>
            {notificationsOpen && <div className="notifications-panel" role="status"><strong>You’re all caught up</strong><p>Claim reminders will appear here after accounts and hosted storage are connected.</p></div>}
          </div>
          <div className="avatar" aria-label="Demo profile">DEMO</div>
        </div>
      </header>
      {children}
    </main>
  </div>;
}
