import { auth } from "@/auth";
import { ArrowRight, ClipboardPenLine, Fingerprint, FolderOpen, Info, PackageCheck } from "lucide-react";
import "./landing.css";

export default async function LandingPage() {
  const session=await auth();
  const signedIn=Boolean(session?.user);

  return <main className="landing">
    <header className="landing-nav">
      <a className="landing-brand" href="/" aria-label="Debrief home">
        <span className="landing-brandmark"><Fingerprint size={21}/></span>
        <span><strong>Debrief</strong><small>Veteran claim preparation</small></span>
      </a>
      {signedIn
        ? <a className="landing-login" href="/dashboard">Open dashboard <ArrowRight size={15}/></a>
        : <a className="landing-login" href="/login?redirectTo=/dashboard">Log in <ArrowRight size={15}/></a>}
    </header>

    <section className="landing-hero">
      <div className="landing-copy">
        <p className="landing-kicker">A clearer way to prepare</p>
        <h1>Build your VA claim one condition at a time.</h1>
        <p className="landing-lede">Organize documents, work through guided questions, and turn your own facts into a reviewable personal statement and claim package.</p>
        <div className="landing-actions">
          <a className="landing-primary" href={signedIn?"/dashboard":"/login?redirectTo=/dashboard"}>{signedIn?"Continue to your workspace":"Start your workspace"} <ArrowRight size={17}/></a>
          {!signedIn&&<a className="landing-secondary" href="/dashboard">Explore without signing in</a>}
        </div>
      </div>

      <div className="landing-steps" aria-label="How Debrief works">
        <article><FolderOpen size={19}/><span>1</span><div><strong>Organize</strong><p>Create a workspace and gather the documents you may need.</p></div></article>
        <article><ClipboardPenLine size={19}/><span>2</span><div><strong>Prepare</strong><p>Answer focused questions and draft one statement per condition.</p></div></article>
        <article><PackageCheck size={19}/><span>3</span><div><strong>Review</strong><p>Bring statements, evidence reminders, and next actions together.</p></div></article>
      </div>

      <div className="landing-alpha"><Info size={16}/><p><strong>Alpha review:</strong> Use fictional information only. Do not enter medical records, an SSN, or a VA file number.</p></div>
    </section>

    <footer className="landing-footer">
      <span>Debrief is an independent educational tool. It does not submit claims and is not affiliated with VA.</span>
      <span className="landing-legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></span>
    </footer>
  </main>;
}
