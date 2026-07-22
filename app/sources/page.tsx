import { ArrowLeft, ExternalLink, Fingerprint } from "lucide-react";
import Link from "next/link";
import { contentProvenanceRecords, type ContentProvenanceRecord } from "@/lib/content-provenance";
import "../legal.css";

export default function SourcesPage(){return <main className="legal-page"><Link className="legal-back" href="/"><ArrowLeft size={14}/>Debrief home</Link><header><Fingerprint size={25}/><span className="kicker">Content provenance</span><h1>Source and version register</h1><p>Each fingerprint identifies the exact Debrief summary, rating map, source metadata, and link set shipped in this release. It is not a hash of the live government webpage and does not certify that a rule or form remains unchanged after the stated verification date.</p></header>
  <div className="legal-alert"><p><strong>Always open the official source.</strong> Regulations and forms can change. The fingerprint helps reviewers detect changes to Debrief’s local record; the authority link remains controlling.</p></div>
  <section><h2>Condition guides</h2><SourceTable records={contentProvenanceRecords.filter(record=>record.kind==="condition-guide")}/></section>
  <section><h2>VA form guides</h2><SourceTable records={contentProvenanceRecords.filter(record=>record.kind==="va-form-guide")}/></section>
  <section><h2>How to reproduce a record</h2><p>Check out the release commit, load the corresponding condition or form object together with its mapped rating/code or download data, serialize object keys in alphabetical order, and calculate SHA-256 over the UTF-8 result. The implementation is in <code>lib/content-provenance.ts</code>. A changed fingerprint requires source review and a change-log entry before publication.</p></section>
  <footer><span><Link href="/support#content-correction">Report a content problem</Link> · <Link href="/licenses">Licenses</Link></span><span>Last-verified dates describe Debrief’s review—not continuous monitoring.</span></footer>
</main>}

function SourceTable({records}:{records:ContentProvenanceRecord[]}){return <div className="source-register">{records.map(record=><article key={record.id}><div><strong>{record.title}</strong><span>{record.contentVersion} · verified {record.lastVerified}</span></div><code title={record.localRecordSha256}>{record.localRecordSha256}</code><a href={record.authorityUrl} target="_blank" rel="noreferrer">{record.authorityLabel} <ExternalLink size={11}/></a><small>{record.hashScope}</small></article>)}</div>}
