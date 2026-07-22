import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowLeft, Info } from "lucide-react";
import { PublicStatusChecks } from "@/components/public-status-checks";
import "../legal.css";
import "./status.css";

export const metadata:Metadata={
  title:"Service status | Debrief",
  description:"Privacy-safe current checks and operating information for the Debrief Alpha."
};

export default function StatusPage(){return <main className="legal-page status-page">
  <Link className="legal-back" href="/"><ArrowLeft size={14}/>Debrief home</Link>
  <header><Activity size={25}/><span className="kicker">Closed Alpha operations</span><h1>Service status</h1><p>This page checks only public Debrief services. It does not read an account, claim, statement, or uploaded document.</p></header>

  <PublicStatusChecks/>

  <section><h2>What this check covers</h2><p>The snapshot verifies that the public website, Google sign-in configuration, and anonymous session service respond. A passing snapshot does not prove that every signed-in save, export, provider, or browser path is working.</p></section>
  <section><h2>Incidents and maintenance</h2><p>No active public incident is recorded in this release. Historical uptime and an automated incident feed are not yet available. During Alpha, confirmed incidents and maintenance will be communicated directly to affected testers.</p></section>
  <div className="legal-alert status-note"><Info size={17}/><p>If a check fails, wait a few minutes and try again. If it continues, use <Link href="/support">Support</Link> and report only the page, approximate time, and safe reference code. Never send passwords, authentication codes, claim details, or private screenshots.</p></div>

  <footer><span><Link href="/support">Support</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span><span>Debrief is independent and is not affiliated with VA.</span></footer>
</main>}
