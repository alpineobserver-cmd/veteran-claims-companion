import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RatingSchemeExplorer } from "@/components/rating-scheme-explorer";
import { conditions, getCondition } from "@/lib/conditions";
import { schemesForCondition } from "@/lib/rating-schemes";
import { CATALOG_VERIFIED_THROUGH, codesForCondition } from "@/lib/diagnostic-codes";
import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { conditionProvenance } from "@/lib/content-provenance";
import "../conditions.css";
import "../catalog.css";
import "./ratings.css";

export function generateStaticParams(){return conditions.map(c=>({slug:c.slug}))}
export default async function ConditionPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params; const c=getCondition(slug); if(!c)notFound(); const codes=codesForCondition(slug); const schemes=schemesForCondition(slug); const provenance=conditionProvenance(slug)!;
  return <AppShell current="conditions"><div className="condition-detail">
    <Link href="/conditions" className="back-link"><ArrowLeft size={15}/>All conditions</Link>
    <header className="detail-hero"><span className="condition-category">{c.category}</span><h1>{c.name}</h1><p>{c.short}</p><div className="verified"><CalendarDays size={14}/>Regulatory summaries checked against eCFR current through {CATALOG_VERIFIED_THROUGH} · {provenance.contentVersion} · <Link href="/sources">record {provenance.localRecordSha256.slice(0,12)}</Link></div></header>
    <RatingSchemeExplorer conditionName={c.name} schemes={schemes}/>
    <div className="detail-layout"><main>
      <DetailSection title="Overview"><p>{c.overview}</p></DetailSection>
      <DetailSection title="What VA measures"><p>{c.schedule}</p><div className="factor-list">{c.ratingFactors.map(x=><div key={x}><span/> {x}</div>)}</div></DetailSection>
      <DetailSection title="Evidence that may be useful"><BulletList items={c.evidence}/></DetailSection>
      <DetailSection title="Helpful documentation habits"><BulletList items={c.documentation}/></DetailSection>
      <DetailSection title="Common preparation gaps"><BulletList items={c.mistakes}/></DetailSection>
      <DetailSection title="Diagnostic-code map"><p>A diagnosis or body part can involve more than one code. The applicable code depends on the medical findings and manifestations in the record.</p><div className="profile-code-grid">{codes.map(code=><article key={code.code}><div><span>DC {code.code}</span><small>{code.section}</small></div><strong>{code.name}</strong><p>{code.summary}</p><a href={code.sourceUrl} target="_blank" rel="noreferrer">Official criteria <ExternalLink size={12}/></a></article>)}</div></DetailSection>
    </main><aside><div className="detail-aside"><span className="kicker">Related topics</span>{c.related.map(x=><div key={x}>{x}</div>)}</div><div className="detail-aside action-aside"><span className="kicker">Ready to organize?</span><h2>Start a preparation draft</h2><p>Answer guided questions and build an evidence checklist.</p><Link className="button primary" href="/claim-builder?new=1">Build a new claim <ArrowRight size={15}/></Link></div><div className="detail-warning"><Info size={16}/><p>This guide does not diagnose a condition, establish service connection, or calculate a rating.</p></div></aside></div>
    <footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer>
  </div></AppShell>
}
function DetailSection({title,children}:{title:string;children:React.ReactNode}){return <section className="detail-section"><h2>{title}</h2>{children}</section>}
function BulletList({items}:{items:string[]}){return <ul className="detail-list">{items.map(x=><li key={x}>{x}</li>)}</ul>}
