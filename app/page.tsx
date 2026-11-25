import { auth } from "@/auth";
import { ArrowRight, BookOpen, Check, Clock3, Files, Fingerprint, Info, Radar } from "lucide-react";
import { ResourceSearch } from "@/components/resource-search";
import "./landing.css";
import Link from "next/link";
import type {Metadata} from "next";

export const metadata:Metadata={title:"VA claim resources",description:"Browse independent VA disability rating guides, official forms, and exposure-record resources without creating an account.",alternates:{canonical:"/"}};

export default async function LandingPage() {
  const session=await auth();
  const signedIn=Boolean(session?.user);

  return <main className="landing resource-landing">
    <a className="landing-skip" href="#resources">Skip to resources</a>
    <header className="landing-nav">
      <Link className="landing-brand" href="/" aria-label="Debrief home">
        <span className="landing-brandmark"><Fingerprint size={21}/></span>
        <span><strong>Debrief</strong><small>VA claim resources</small></span>
      </Link>
      <nav className="landing-links" aria-label="Resource navigation">
        <Link href="/conditions">Conditions &amp; ratings</Link>
        <Link href="/forms">VA forms</Link>
        <Link href="/exposure-record-check">Exposure records</Link>
        <Link className="landing-login" href={signedIn?"/dashboard":"/login?redirectTo=/dashboard"}>{signedIn?"Open workspace":"Sign in"} <ArrowRight size={15}/></Link>
      </nav>
    </header>

    <section className="landing-hero resource-hero" aria-labelledby="landing-title">
      <div className="landing-copy">
        <p className="landing-kicker">Independent VA claim resources</p>
        <h1 id="landing-title">Find clear information. Start wherever you are.</h1>
        <p className="landing-lede">Browse disability rating references, find official forms, and check exposure-record resources. These guides are available without an account.</p>
      </div>
    </section>

    <section className="resource-section" id="resources" aria-labelledby="resources-title">
      <div className="resource-section-heading"><div><p className="landing-kicker">Browse resources</p><h2 id="resources-title">Start with what you need</h2></div><span>Open access · No account needed</span></div>
      <ResourceSearch />
      <div className="resource-grid">
        <Link href="/conditions" className="resource-card"><BookOpen/><span className="resource-card-kicker">Conditions &amp; ratings</span><strong>Explore conditions</strong><p>Browse plain-language guides, rating schedules, and diagnostic-code sources.</p><span className="resource-card-action">Browse conditions <ArrowRight size={15}/></span></Link>
        <Link href="/forms" className="resource-card"><Files/><span className="resource-card-kicker">Official forms</span><strong>Find a VA form</strong><p>Understand common forms and open a current copy from its official source.</p><span className="resource-card-action">Browse forms <ArrowRight size={15}/></span></Link>
        <Link href="/exposure-record-check" className="resource-card"><Radar/><span className="resource-card-kicker">Exposure records</span><strong>Check available records</strong><p>Review official registries and exposure-program resources.</p><span className="resource-card-action">Open exposure resources <ArrowRight size={15}/></span></Link>
      </div>
    </section>

    <section className="builder-note" aria-labelledby="builder-title"><div className="builder-note-icon"><Clock3/></div><div><p className="landing-kicker">Coming in the future</p><h2 id="builder-title">Claim Builder is in development</h2><p>We’re working on guided tools to help organize claim information. For now, the resource library is ready to explore.</p></div><span className="builder-status"><span/>In development</span></section>

    <div className="landing-alpha"><Info size={17}/><p><strong>Fictional-data Alpha:</strong> The workspace is still in a closed Alpha. If you sign in, use fictional information only. Do not enter medical records, an SSN, or a VA file number.</p><span className="resource-alpha-check"><Check size={14}/>Resources are open</span></div>

    <footer className="landing-footer">
      <span>Debrief is independent educational software, not VA or a VA-accredited representative. It does not submit claims or provide legal or medical advice.</span>
      <span className="landing-legal"><Link href="/status">Status</Link><Link href="/support">Support</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/sources">Sources</Link><Link href="/licenses">Licenses</Link></span>
    </footer>
  </main>;
}
