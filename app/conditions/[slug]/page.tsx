import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { conditions, getCondition } from "@/lib/conditions";
import { ratingCriteria } from "@/lib/rating-criteria";
import { CATALOG_VERIFIED_THROUGH, codesForCondition } from "@/lib/diagnostic-codes";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ExternalLink, Info } from "lucide-react";
import "../conditions.css";
import "../catalog.css";
import "./ratings.css";

export function generateStaticParams(){return conditions.map(c=>({slug:c.slug}))}
export default async function ConditionPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params; const c=getCondition(slug); if(!c)notFound(); const criteria=ratingCriteria[slug]; const codes=codesForCondition(slug);
  return <AppShell current="conditions"><div className="condition-detail">
    <a href="/conditions" className="back-link"><ArrowLeft size={15}/>All conditions</a>
    <header className="detail-hero"><span className="condition-category">{c.category}</span><h1>{c.name}</h1><p>{c.short}</p><div className="verified"><CalendarDays size={14}/>Regulatory summaries checked against eCFR current through {CATALOG_VERIFIED_THROUGH}</div></header>
    <div className="detail-layout"><main>
      <DetailSection title="Overview"><p>{c.overview}</p></DetailSection>
      <DetailSection title="Potentially relevant diagnostic codes"><p>A diagnosis or body part can involve more than one code. The applicable code depends on the medical findings and manifestations in the record.</p><div className="profile-code-grid">{codes.map(code=><article key={code.code}><div><span>DC {code.code}</span><small>{code.section}</small></div><strong>{code.name}</strong><p>{code.summary}</p><a href={code.sourceUrl} target="_blank" rel="noreferrer">Official criteria <ExternalLink size={12}/></a></article>)}</div></DetailSection>
      <DetailSection title="Featured percentage criteria"><p>{c.schedule}</p>{criteria&&<RatingTable criteria={criteria}/>}<div className="factor-list">{c.ratingFactors.map(x=><div key={x}><span/> {x}</div>)}</div><div className="source-note"><BookOpen size={17}/><div><strong>Read the controlling source</strong><p>The table above highlights the principal or representative formula for this guide. Other listed codes may use different criteria, and plain-language summaries can omit details.</p><a href={c.sourceUrl} target="_blank" rel="noreferrer">{c.sourceLabel}<ExternalLink size={13}/></a></div></div></DetailSection>
      <DetailSection title="Evidence that may be useful"><BulletList items={c.evidence}/></DetailSection>
      <DetailSection title="Helpful documentation habits"><BulletList items={c.documentation}/></DetailSection>
      <DetailSection title="Common preparation gaps"><BulletList items={c.mistakes}/></DetailSection>
    </main><aside><div className="detail-aside"><span className="kicker">Related topics</span>{c.related.map(x=><div key={x}>{x}</div>)}</div><div className="detail-aside action-aside"><span className="kicker">Ready to organize?</span><h2>Start a preparation draft</h2><p>Answer guided questions and build an evidence checklist.</p><a className="button primary" href="/claim-builder">Build a claim <ArrowRight size={15}/></a></div><div className="detail-warning"><Info size={16}/><p>This guide does not diagnose a condition, establish service connection, or calculate a rating.</p></div></aside></div>
    <footer className="disclaimer">Veteran Claims Companion is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer>
  </div></AppShell>
}
function RatingTable({criteria}:{criteria:(typeof ratingCriteria)[string]}){return <div className="rating-block"><div className="rating-block-head"><span>Plain-language schedule summary</span><strong>{criteria.code}</strong></div>{criteria.levels.map(level=><div className="rating-level" key={`${level.rating}-${level.title}`}><span>{level.rating}</span><div><strong>{level.title}</strong><p>{level.description}</p></div></div>)}{criteria.note&&<p className="rating-note"><Info size={14}/>{criteria.note}</p>}</div>}
function DetailSection({title,children}:{title:string;children:React.ReactNode}){return <section className="detail-section"><h2>{title}</h2>{children}</section>}
function BulletList({items}:{items:string[]}){return <ul className="detail-list">{items.map(x=><li key={x}>{x}</li>)}</ul>}
