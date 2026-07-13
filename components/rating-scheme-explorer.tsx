"use client";

import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ExternalLink, Info } from "lucide-react";
import { formatRatings, type RatingScheme } from "@/lib/rating-schemes";

export function RatingSchemeExplorer({conditionName,schemes}:{conditionName:string;schemes:RatingScheme[]}){
  const [selectedId,setSelectedId]=useState(schemes[0]?.id||"");
  const selected=schemes.find(scheme=>scheme.id===selectedId)||schemes[0];
  const ratings=useMemo(()=>Array.from(new Set(schemes.flatMap(scheme=>scheme.levels.map(level=>level.rating)))).sort((a,b)=>parseInt(a)-parseInt(b)),[schemes]);
  const codes=Array.from(new Set(schemes.flatMap(scheme=>scheme.diagnosticCodes)));
  if(!selected)return null;

  return <section className="rating-explorer" aria-labelledby="rating-explorer-heading">
    <div className="rating-explorer-intro"><div><span className="kicker">Quick rating reference</span><h2 id="rating-explorer-heading">How VA may evaluate {conditionName}</h2><p>Select a diagnostic code or shared formula to see the criteria that apply to that manifestation.</p></div><div className="verification-badge"><CheckCircle2 size={15}/>Verified summaries are labeled</div></div>

    <div className="rating-facts">
      <div><span>Potential codes</span><strong>{codes.map(value=>`DC ${value}`).join(" · ")}</strong></div>
      <div><span>Verified evaluation levels</span><strong>{formatRatings(ratings)}</strong></div>
      <div><span>Rating paths shown</span><strong>{schemes.length}</strong></div>
    </div>

    {schemes.length>1&&<div className="scheme-picker" role="tablist" aria-label="Rating scheme"><span>Choose a rating path</span><div>{schemes.map(scheme=><button key={scheme.id} type="button" role="tab" aria-selected={scheme.id===selected.id} className={scheme.id===selected.id?"selected":""} onClick={()=>setSelectedId(scheme.id)}><small>{scheme.diagnosticCodes.map(value=>`DC ${value}`).join("–")}</small>{scheme.name}{scheme.complete?<i>Summary verified</i>:<i>Official source only</i>}</button>)}</div></div>}

    <div className="scheme-panel" role="tabpanel">
      <header><div><span>{selected.kind==="shared-formula"?"Shared rating formula":selected.kind==="mechanical"?"Mechanical rating method":selected.complete?"Diagnostic-code criteria":"Indexed diagnostic code"}</span><h3>{selected.name}</h3><p>{selected.summary}</p></div><div className={selected.complete?"scheme-status complete":"scheme-status"}>{selected.complete?<><CheckCircle2 size={14}/>Plain-language summary verified</>:<>Official criteria only</>}</div></header>

      {selected.complete?<div className="rating-levels"><div className="rating-label-row"><span>Evaluation</span><span>Plain-language criteria summary</span></div>{selected.levels.map(level=><div className="rating-level" key={`${selected.id}-${level.rating}`}><span>{level.rating}</span><div><strong>{level.title}</strong><p>{level.description}</p></div></div>)}</div>:<div className="source-only-panel"><BookOpen size={22}/><div><strong>Use the official schedule for the percentage tiers</strong><p>This code is in the library’s search index, but its full criteria have not yet been converted and checked for this quick-reference format.</p></div></div>}

      {selected.note&&<p className="rating-note"><Info size={14}/>{selected.note}</p>}
      <footer><div><strong>{selected.diagnosticCodes.map(value=>`Diagnostic Code ${value}`).join(" · ")}</strong><span>{selected.section}</span></div><a href={selected.sourceUrl} target="_blank" rel="noreferrer">Read the controlling criteria <ExternalLink size={13}/></a></footer>
    </div>
    <p className="rating-caution"><Info size={13}/>This reference explains the schedule; it does not predict an individual rating. VA determines the applicable code and evaluation from the complete record.</p>
  </section>
}
