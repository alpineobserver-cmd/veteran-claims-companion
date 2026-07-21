import { auth } from "@/auth";
import { ArrowRight, Fingerprint, Info } from "lucide-react";
import "./landing.css";
import Link from "next/link";

export default async function LandingPage() {
  const session=await auth();
  const signedIn=Boolean(session?.user);

  return <main className="landing">
    <header className="landing-nav">
      <Link className="landing-brand" href="/" aria-label="Debrief home">
        <span className="landing-brandmark"><Fingerprint size={21}/></span>
        <span><strong>Debrief</strong><small>Veteran claim preparation</small></span>
      </Link>
      {signedIn
        ? <Link className="landing-login" href="/dashboard">Open dashboard <ArrowRight size={15}/></Link>
        : <Link className="landing-login" href="/login?redirectTo=/dashboard">Log in <ArrowRight size={15}/></Link>}
    </header>

    <section className="landing-hero">
      <div className="landing-copy">
        <p className="landing-kicker">Veteran claim preparation</p>
        <h1>Prepare your claim, one condition at a time.</h1>
        <p className="landing-lede">Answer guided questions, organize supporting information, and prepare a personal statement for your review.</p>
        <div className="landing-actions">
          <Link className="landing-primary" href={signedIn?"/dashboard":"/login?redirectTo=/dashboard"}>{signedIn?"Open dashboard":"Log in to begin"} <ArrowRight size={17}/></Link>
          {!signedIn&&<Link className="landing-secondary" href="/dashboard">Continue without an account</Link>}
        </div>
      </div>

      <div className="landing-alpha"><Info size={16}/><p><strong>Alpha review:</strong> Use fictional information only. Do not enter medical records, an SSN, or a VA file number.</p></div>
    </section>

    <footer className="landing-footer">
      <span>Debrief is independent educational software, not VA or a VA-accredited representative. It does not submit claims or provide legal or medical advice.</span>
      <span className="landing-legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></span>
    </footer>
  </main>;
}
