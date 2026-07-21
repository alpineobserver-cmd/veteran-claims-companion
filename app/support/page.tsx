import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CircleHelp, Info, Mail, ShieldAlert } from "lucide-react";
import "../legal.css";
import "./support.css";

export const metadata:Metadata={
  title:"Support and corrections | Debrief",
  description:"Privacy-safe ways to request help or report a security, accessibility, privacy, or content issue in the Debrief Alpha."
};

const contact=process.env.PRIVACY_CONTACT_EMAIL?.trim();
const emailHref=(subject:string)=>contact?`mailto:${contact}?subject=${encodeURIComponent(subject)}`:undefined;

function ContactAction({subject,label}:{subject:string;label:string}){
  const href=emailHref(subject);
  return href
    ? <a className="support-action" href={href}><Mail size={15}/>{label}</a>
    : <p className="support-fallback"><strong>Contact the Alpha administrator who invited you.</strong> A public support address has not been configured for this environment.</p>;
}

export default function SupportPage(){return <main className="legal-page support-page">
  <Link className="legal-back" href="/"><ArrowLeft size={14}/>Debrief home</Link>
  <header><CircleHelp size={25}/><span className="kicker">Closed Alpha support</span><h1>Support and corrections</h1><p>Choose the request that best fits the problem. Debrief uses one monitored contact during Alpha and keeps reports separate from claim preparation.</p></header>

  <div className="legal-alert"><Info size={17}/><p><strong>Use fictional information only.</strong> Never send passwords, authentication codes, Social Security numbers, VA file numbers, medical records, claim facts, or screenshots containing private account information.</p></div>

  <section className="support-section"><h2>Account, privacy, or deletion</h2><p>Signed-in testers can download their application data or permanently delete their account through <Link href="/account">Account and data</Link>. If that page is unavailable or a request does not complete, report only the affected feature, approximate time, and any Debrief reference code.</p><ContactAction subject="Debrief Alpha — privacy or deletion request" label="Request privacy or deletion help"/></section>

  <section className="support-section"><h2>Security concern</h2><p>Report a suspected security problem privately. Include the page or feature, approximate time, what you observed, and a safe way to reproduce it with fictional information. Do not open a public issue or send credentials, tokens, private files, or private screenshots.</p><ContactAction subject="Debrief Alpha — security concern" label="Report a security concern"/></section>

  <section className="support-section"><h2>Accessibility barrier</h2><p>Include the page or feature, device and browser, assistive technology if relevant, what you expected, and what prevented completion. A fictional scenario is enough; health or claim details are not needed.</p><ContactAction subject="Debrief Alpha — accessibility barrier" label="Report an accessibility barrier"/></section>

  <section className="support-section" id="content-correction"><h2>Outdated, broken, or incorrect content</h2><p>Identify the condition, diagnostic code, form, or page URL; explain the suspected problem; and include an official source link if you know one. Do not explain how the issue applies to you or include any health or claim details.</p><ContactAction subject="Debrief Alpha — content correction" label="Report a content correction"/></section>

  <section className="support-section"><h2>General product feedback</h2><p>Describe the screen, task, or wording that was confusing and what you expected to happen. Use a fictional scenario and omit personal or claimant information.</p><ContactAction subject="Debrief Alpha — product feedback" label="Send product feedback"/></section>

  <div className="support-process"><ShieldAlert size={18}/><div><strong>What happens after a report</strong><p>The Alpha administrator records a privacy-minimized request, assigns its severity, investigates, and confirms closure or a next step. Critical security or privacy reports are escalated immediately. Accessibility and content corrections are retested before closure.</p></div></div>

  <footer><span><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span><span>Debrief is independent and is not affiliated with VA.</span></footer>
</main>}
