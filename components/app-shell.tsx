"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  Bell, BookOpen, ClipboardList, Files, FolderOpen, PackageCheck,
  History, LayoutDashboard, LifeBuoy, LogOut, Menu, PanelLeftClose, PanelLeftOpen,
  Radar, Search, ShieldCheck, User, X
} from "lucide-react";
import { conditions } from "@/lib/conditions";
import { getFormLabel, vaForms } from "@/lib/va-forms";
import { diagnosticCodes } from "@/lib/diagnostic-codes";

const links = [
  ["home", "Dashboard", "/dashboard", LayoutDashboard, true],
  ["intake", "Document intake", "/intake", FolderOpen, true],
  ["builder", "Build a claim", "/claim-builder", ClipboardList, true],
  ["exposures", "Exposure record", "/exposure-record-check", Radar, true],
  ["package", "Claim package", "/claim-package", PackageCheck, true],
  ["conditions", "Conditions", "/conditions", BookOpen, true],
  ["forms", "Forms", "/forms", Files, true],
  ["changelog", "Change log", "/changelog", History, true]
] as const;

const searchItems = [
  ...conditions.map(item => ({ label:item.name, detail:item.category, href:`/conditions/${item.slug}`, type:"Condition" })),
  ...diagnosticCodes.map(item => ({ label:`DC ${item.code} — ${item.name}`, detail:item.section, href:item.conditionSlugs[0]?`/conditions/${item.conditionSlugs[0]}`:"/conditions", type:"Diagnostic code" })),
  ...vaForms.map(item => ({ label:getFormLabel(item), detail:item.name, href:`/forms/${item.slug}`, type:"Form" }))
];

type ShellUser={id:string;name?:string|null;email?:string|null;image?:string|null};
const sidebarPreferenceKey="debrief.workspaceSidebarCollapsed";

export function AppShell({ children, current = "home", user }: { children: React.ReactNode; current?: string; user?:ShellUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fetchedAccount,setFetchedAccount]=useState<ShellUser|undefined>();
  const [mobileLayout,setMobileLayout]=useState(false);
  const [signingOut,setSigningOut]=useState(false);
  const [signOutError,setSignOutError]=useState("");
  const openMenuRef=useRef<HTMLButtonElement>(null);
  const closeMenuRef=useRef<HTMLButtonElement>(null);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return searchItems.filter(item => `${item.label} ${item.detail} ${item.type}`.toLowerCase().includes(normalized)).slice(0, 7);
  }, [query]);

  useEffect(()=>{
    const media=window.matchMedia("(max-width: 620px)");
    const update=()=>{setMobileLayout(media.matches);if(!media.matches)setMenuOpen(false)};
    update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);
  },[]);

  useEffect(()=>{
    try{setSidebarCollapsed(window.localStorage.getItem(sidebarPreferenceKey)==="true")}catch{}
  },[]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if(menuOpen){setMenuOpen(false);window.requestAnimationFrame(()=>openMenuRef.current?.focus())}
        setNotificationsOpen(false);setQuery("");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(()=>{if(menuOpen)closeMenuRef.current?.focus()},[menuOpen]);

  useEffect(()=>{
    if(user)return;
    let cancelled=false;
    fetch("/api/auth/session").then(response=>response.json()).then((session:{user?:ShellUser})=>{if(!cancelled&&session.user)setFetchedAccount(session.user)}).catch(()=>{});
    return()=>{cancelled=true};
  },[user]);

  const account=user??fetchedAccount;
  const initials=account?.name?.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase()||account?.email?.slice(0,2).toUpperCase()||"SIGN IN";
  async function endSession(){
    if(signingOut)return;
    setSigningOut(true);
    setSignOutError("");
    try{
      await signOut({redirectTo:"/"});
    }catch{
      setSigningOut(false);
      setSignOutError("Sign out did not complete. Open Account & data and try again.");
    }
  }

  function toggleSidebar(){
    setSidebarCollapsed(collapsed=>{
      const next=!collapsed;
      try{window.localStorage.setItem(sidebarPreferenceKey,String(next))}catch{}
      return next;
    });
  }

  return <div className={`shell ${menuOpen ? "menu-open" : ""} ${sidebarCollapsed?"sidebar-collapsed":""}`}>
    {menuOpen && <button className="sidebar-scrim" aria-label="Close menu" onClick={()=>{setMenuOpen(false);window.requestAnimationFrame(()=>openMenuRef.current?.focus())}}/>}
    <aside id="app-sidebar" className="sidebar" aria-label="Companion navigation" aria-hidden={mobileLayout&&!menuOpen?true:undefined} inert={mobileLayout&&!menuOpen?true:undefined}>
      <div className="mobile-sidebar-head"><span>Menu</span><button ref={closeMenuRef} className="iconbtn" aria-label="Close menu" onClick={()=>{setMenuOpen(false);window.requestAnimationFrame(()=>openMenuRef.current?.focus())}}><X size={18}/></button></div>
      <a className="brand" href="/dashboard" aria-label="Debrief dashboard" onClick={()=>setMenuOpen(false)}>
        <span className="brandmark"><ShieldCheck size={22}/></span>
        <span className="brandcopy"><strong>Debrief</strong><small>Claim preparation</small></span>
      </a>
      <div className="nav-label-row">
        <p className="nav-label">Your workspace</p>
        <button
          type="button"
          className="sidebar-collapse-button"
          aria-label={sidebarCollapsed?"Expand workspace column":"Collapse workspace column"}
          aria-controls="app-sidebar"
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed?"Expand workspace column":"Collapse workspace column"}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed?<PanelLeftOpen size={16}/>:<PanelLeftClose size={16}/>}
        </button>
      </div>
      <nav className="nav" aria-label="Primary navigation">
        {links.map(([key, label, href, Icon, ready]) => ready
          ? <a className={current === key ? "active" : ""} href={href} key={key} title={label} onClick={()=>setMenuOpen(false)}><Icon size={18}/><span>{label}</span></a>
          : <span className="nav-disabled" aria-disabled="true" key={key}><Icon size={18}/><span>{label}</span><small>Soon</small></span>)}
      </nav>
      <div className="sidebar-rule"/>
      <nav className="nav utility-nav" aria-label="Account navigation">
        {account?<><a className={current==="account"?"active":""} href="/account" aria-label="Account and data" title="Account and data"><User size={18}/><span>Account &amp; data</span></a><button type="button" className="nav-signout" aria-label={signingOut?"Signing out":"Sign out"} title={signingOut?"Signing out":"Sign out"} onClick={endSession} disabled={signingOut}><LogOut size={18}/><span>{signingOut?"Signing out…":"Sign out"}</span></button>{signOutError&&<p className="nav-signout-error" role="alert">{signOutError} <a href="/account#sign-out">Open Account &amp; data</a></p>}</>:<a href="/login?redirectTo=/dashboard" aria-label="Sign in" title="Sign in"><User size={18}/><span>Sign in</span></a>}
      </nav>
      <div className="sidebar-legal"><a href="/status">Status</a><a href="/support">Support</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/sources">Sources</a><a href="/licenses">Licenses</a></div>
      <p className="sidebar-disclosure">Independent educational software—not VA or a VA-accredited representative. No legal or medical advice.</p>
      <a className="side-help" href="https://www.va.gov/get-help-from-accredited-representative/" target="_blank" rel="noreferrer" aria-label="Find a VA-accredited representative" title="Find a VA-accredited representative" onClick={()=>setMenuOpen(false)}><LifeBuoy size={19}/><span><strong>Need claim help?</strong><small>Find a VA-accredited representative</small></span></a>
    </aside>
    <main className="main" aria-hidden={menuOpen?true:undefined} inert={menuOpen?true:undefined}>
      <header className="topbar">
        <button ref={openMenuRef} className="iconbtn mobile-menu" aria-label="Open menu" aria-controls="app-sidebar" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><Menu size={19}/></button>
        <div className="search-wrap">
          <label className="search"><Search size={18}/><input aria-label="Search conditions and forms" placeholder="Search conditions and forms…" value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off"/></label>
          {query && <div className="search-results" role="listbox" aria-label="Search results">
            {results.length ? results.map(item => <a href={item.href} key={item.href} role="option" aria-selected="false"><span><strong>{item.label}</strong><small>{item.detail}</small></span><em>{item.type}</em></a>) : <p>No matching conditions or forms found.</p>}
          </div>}
        </div>
        <div className="top-actions">
          <div className="notifications-wrap"><button className="iconbtn" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={()=>setNotificationsOpen(open=>!open)}><Bell size={18}/></button>
            {notificationsOpen && <div className="notifications-panel" role="status"><strong>You’re all caught up</strong><p>Future claim-package reminders will appear here. Notifications are not enabled in this alpha.</p></div>}
          </div>
          <a className={`avatar ${account?"":"signed-out"}`} href={account?"/account":"/login?redirectTo=/dashboard"} aria-label={account?`Open account for ${account.name||account.email||"signed-in user"}`:"Sign in"}>{initials}</a>
        </div>
      </header>
      {children}
    </main>
  </div>;
}
