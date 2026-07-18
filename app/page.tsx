import { auth } from "@/auth";
import { ArrowRight, BookOpen, CheckCircle2, FileSearch, Fingerprint, FolderLock, ShieldCheck } from "lucide-react";
import "./landing.css";

export default async function LandingPage() {
  const session=await auth();
  const signedIn=Boolean(session?.user);

  return <main className="landing">
    <div className="landing-grid" aria-hidden="true"/>
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="Debrief home">
        <span className="landing-brandmark"><Fingerprint size={21}/></span>
        <span><strong>DEBRIEF</strong><small>Veteran claim preparation</small></span>
      </a>
      <div className="landing-nav-actions">
        <span className="system-status"><i/> MVP SYSTEM ONLINE</span>
        {signedIn
          ? <a className="landing-login" href="/dashboard">Open dashboard <ArrowRight size={15}/></a>
          : <a className="landing-login" href="/login?redirectTo=/dashboard">Log in <ArrowRight size={15}/></a>}
      </div>
    </header>

    <section className="landing-hero">
      <div className="landing-copy">
        <div className="classification">UNCLASSIFIED // FOR PERSONAL USE</div>
        <p className="landing-kicker">Your service record. Your next mission.</p>
        <h1>Turn a military career into a clear VA claim plan.</h1>
        <p className="landing-lede">Debrief helps veterans organize evidence, understand possible conditions, and prepare stronger personal statements—one claim at a time.</p>
        <div className="landing-actions">
          <a className="landing-primary" href={signedIn?"/dashboard":"/login?redirectTo=/dashboard"}>{signedIn?"Enter your workspace":"Begin your debrief"} <ArrowRight size={17}/></a>
          <a className="landing-secondary" href="/dashboard">Explore the dashboard</a>
        </div>
        <p className="landing-trust"><FolderLock size={15}/> Your saved workspaces require sign-in. Never enter an SSN or VA file number in this MVP.</p>
      </div>

      <aside className="briefing-card" aria-label="Debrief process overview">
        <div className="briefing-head"><span>MISSION BRIEF</span><span>DB-001</span></div>
        <div className="briefing-body">
          <span className="briefing-label">Objective</span>
          <h2>Build a complete, reviewable claim package.</h2>
          <ol>
            <li><span>01</span><div><strong>Secure the record</strong><small>Organize supporting documents in one workspace.</small></div><FileSearch size={18}/></li>
            <li><span>02</span><div><strong>Identify the claim</strong><small>Research conditions and rating criteria in plain language.</small></div><BookOpen size={18}/></li>
            <li><span>03</span><div><strong>Prepare the case</strong><small>Draft statements and track what is still missing.</small></div><CheckCircle2 size={18}/></li>
          </ol>
          <div className="briefing-foot"><ShieldCheck size={16}/><span>Independent educational tool<br/><small>Not affiliated with the Department of Veterans Affairs</small></span></div>
        </div>
      </aside>
    </section>

    <footer className="landing-footer">
      <span>DEBRIEF // MVP REVIEW BUILD</span>
      <span>Organize · Understand · Prepare</span>
    </footer>
  </main>;
}
