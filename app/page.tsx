import { AppShell } from "@/components/app-shell";
import { CurrentDate } from "@/components/current-date";
import { ArrowRight, BookOpen, Check, FileText, Files, Info, Plus, Upload } from "lucide-react";

export default function Dashboard() {
  return <AppShell><div className="content">
    <section className="welcome">
      <div><div className="eyebrow"><CurrentDate/></div><h1>Welcome to your companion.</h1><p>Explore the guided MVP using the sample workspace below.</p></div>
      <a className="button primary" href="/claim-builder"><Plus size={17}/><span>Open claim builder</span></a>
    </section>
    <p className="demo-note"><span>Demo workspace</span>The names, claims, and progress shown on this dashboard are sample information.</p>

    <section className="next-step" aria-labelledby="next-heading">
      <div className="next-icon"><Check size={22}/></div>
      <div className="next-copy"><span className="kicker">Your next best step</span><h2 id="next-heading">Add treatment details to your migraine claim</h2><p>This helps build a clearer picture of your current care and supporting records.</p></div>
      <a className="button warm" href="/claim-builder">Continue <ArrowRight size={17}/></a>
    </section>

    <div className="dashboard-grid">
      <section className="panel claims-panel">
        <div className="section-title"><div><span className="kicker">Your preparation</span><h2>Claims in progress</h2></div><a className="link" href="/claim-builder">Open builder</a></div>
        <Claim title="Migraines" updated="Last worked on 2 days ago" progress={72} tasks="3 steps left" tone="olive"/>
        <Claim title="Tinnitus" updated="Last worked on June 28" progress={45} tasks="6 steps left" tone="clay"/>
      </section>

      <aside className="panel overview-panel">
        <div className="section-title"><div><span className="kicker">At a glance</span><h2>Your records</h2></div></div>
        <div className="record-row"><span>Evidence saved</span><strong>14 items</strong></div>
        <div className="record-row"><span>Items to find</span><strong>5 items</strong></div>
        <div className="record-row"><span>Profile details</span><strong>80%</strong></div>
        <a className="text-action" href="/claim-builder">Review the sample checklist <ArrowRight size={15}/></a>
      </aside>
    </div>

    <section className="resources" aria-labelledby="resources-heading">
      <div className="section-title"><div><span className="kicker">Helpful tools</span><h2 id="resources-heading">What would you like to do?</h2></div></div>
      <div className="resource-grid">
        <Resource icon={Upload} title="Identify evidence" text="Use the claim builder to organize what you have." href="/claim-builder"/>
        <Resource icon={FileText} title="Write a statement" text="Guided statement templates are planned next." comingSoon/>
        <Resource icon={BookOpen} title="Understand a condition" text="Learn what documentation may help." href="/conditions"/>
        <Resource icon={Files} title="Find a VA form" text="See when and how forms are used." href="/forms"/>
      </div>
    </section>

    <div className="notice"><Info size={19}/><div><strong>A quick reminder</strong><p>This companion helps you organize and understand information. It does not submit claims, determine eligibility, or replace an accredited representative.</p></div></div>
    <footer className="disclaimer">Veteran Claims Companion is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer>
  </div></AppShell>;
}

function Claim({ title, updated, progress, tasks, tone }: { title: string; updated: string; progress: number; tasks: string; tone: string }) {
  return <article className="claim">
    <div className={`claim-monogram ${tone}`}>{title.charAt(0)}</div>
    <div className="claim-body"><div className="claimtop"><div><h3>{title}</h3><p>{updated}</p></div><span className="badge">In progress</span></div>
      <div className="progress" aria-label={`${progress}% complete`}><span style={{ width: `${progress}%` }}/></div>
      <div className="progressmeta"><span>{tasks}</span><strong>{progress}% prepared</strong></div>
    </div><a href="/claim-builder" className="claim-arrow" aria-label={`Continue ${title} sample claim`}><ArrowRight size={19}/></a>
  </article>;
}

function Resource({ icon: Icon, title, text, href, comingSoon=false }: { icon: typeof Upload; title: string; text: string; href?: string; comingSoon?: boolean }) {
  const content = <><span className="resource-icon"><Icon size={20}/></span><span><strong>{title}</strong><small>{text}</small></span>{comingSoon?<span className="coming-label">Coming soon</span>:<ArrowRight className="resource-arrow" size={17}/>}</>;
  return href ? <a className="resource" href={href}>{content}</a> : <div className="resource coming-soon" aria-disabled="true">{content}</div>;
}
