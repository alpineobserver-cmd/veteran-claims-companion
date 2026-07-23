"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, ExternalLink, Search, SlidersHorizontal } from "lucide-react";
import { conditions } from "@/lib/conditions";
import { bodySystems, CATALOG_VERIFIED_THROUGH, conditionAliases, diagnosticCodes } from "@/lib/diagnostic-codes";
import { formatRatings, ratingRangeForCode, ratingRangeForCondition } from "@/lib/rating-schemes";

const populatedSystems=bodySystems.filter(system=>
  conditions.some(condition=>condition.category===system.shortName)||
  diagnosticCodes.some(code=>code.bodySystem===system.shortName)
);

export function ConditionLibrary(){
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("All");
  const normalized=query.trim().toLowerCase();

  const resources=useMemo(()=>conditions.map(condition=>{
    const codes=diagnosticCodes.filter(code=>code.conditionSlugs.includes(condition.slug));
    const searchText=[condition.name,condition.short,condition.category,...condition.related,...(conditionAliases[condition.slug]||[]),...codes.flatMap(code=>[code.code,code.name,...code.keywords])].join(" ").toLowerCase();
    return {condition,codes,searchText};
  }).filter(resource=>{
    const systemMatch=category==="All"||resource.condition.category===category;
    return systemMatch&&(!normalized||resource.searchText.includes(normalized));
  }).sort((a,b)=>a.condition.name.localeCompare(b.condition.name)),[category,normalized]);

  const linkedCodes=new Set(resources.flatMap(resource=>resource.codes.map(code=>code.code)));
  const additionalCodes=diagnosticCodes.filter(code=>{
    const systemMatch=category==="All"||code.bodySystem===category;
    const searchText=[code.code,code.name,code.summary,...code.keywords].join(" ").toLowerCase();
    return systemMatch&&!linkedCodes.has(code.code)&&(!normalized||searchText.includes(normalized));
  });
  const activeSystem=populatedSystems.find(system=>system.shortName===category);

  function chooseSystem(system:string){
    setCategory(system);
    document.getElementById("condition-directory")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  return <>
    <section className="system-browser" aria-labelledby="systems-heading">
      <div className="catalog-heading"><div><span className="kicker">Browse by body system</span><h2 id="systems-heading">Choose where the condition is primarily evaluated</h2></div></div>
      <p className="catalog-explainer">Only body systems with a condition guide or indexed diagnostic code are shown. More systems will appear as verified content is added.</p>
      <div className="system-grid">
        <button className={category==="All"?"selected":""} onClick={()=>chooseSystem("All")}><span>Current library</span><strong>All populated systems</strong><small>{conditions.length} condition guides · {diagnosticCodes.length} diagnostic-code links</small></button>
        {populatedSystems.map(system=>{
          const guideCount=conditions.filter(condition=>condition.category===system.shortName).length;
          const codeCount=diagnosticCodes.filter(code=>code.bodySystem===system.shortName).length;
          return <button className={category===system.shortName?"selected":""} onClick={()=>chooseSystem(system.shortName)} key={system.shortName}><span>{system.section}</span><strong>{system.name}</strong><small>{guideCount} {guideCount===1?"condition guide":"condition guides"} · {codeCount} {codeCount===1?"code link":"code links"}</small></button>;
        })}
      </div>
    </section>

    <div className="library-tools" id="condition-directory">
      <label className="library-search"><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search a condition, body part, symptom, or code" aria-label="Search conditions and diagnostic codes"/></label>
      <div className="library-filter"><SlidersHorizontal size={16}/><select value={category} onChange={event=>setCategory(event.target.value)} aria-label="Filter by body system"><option value="All">All populated systems</option>{populatedSystems.map(system=><option value={system.shortName} key={system.shortName}>{system.name}</option>)}</select></div>
    </div>
    <div className="library-count"><strong>{resources.length}</strong> matching {resources.length===1?"condition":"conditions"}<span>Regulatory summaries verified {CATALOG_VERIFIED_THROUGH}</span></div>

    {activeSystem&&<div className="system-context"><BookOpen size={17}/><div><strong>{activeSystem.name}</strong><p>{activeSystem.description}</p><a href={activeSystem.sourceUrl} target="_blank" rel="noreferrer">Open the official rating schedule <ExternalLink size={12}/></a></div></div>}

    {resources.length>0&&<section className="catalog-section" aria-labelledby="directory-heading">
      <div className="catalog-heading"><div><span className="kicker">Condition and code directory</span><h2 id="directory-heading">Open a condition, then choose the relevant rating path</h2></div></div>
      <div className="condition-directory">{resources.map(({condition,codes})=>{
        const ratings=ratingRangeForCondition(condition.slug);
        return <article className="condition-resource" key={condition.slug}>
          <div className="condition-resource-main"><span className="condition-category">{condition.category}</span><h3><a href={`/conditions/${condition.slug}`}>{condition.name}</a></h3><p>{condition.short}</p><a className="condition-guide-link" href={`/conditions/${condition.slug}`}>Open rating guide · {formatRatings(ratings)} <ArrowRight size={14}/></a></div>
          <div className="condition-code-links"><strong>Diagnostic-code paths</strong>{codes.length?codes.map(code=><a href={code.sourceUrl} target="_blank" rel="noreferrer" key={code.code}><span>DC {code.code}</span><small>{code.name}</small><em>{formatRatings(ratingRangeForCode(code.code))}</em><ExternalLink size={12}/></a>):<p>No diagnostic code has been indexed for this guide yet. Use the official schedule link and do not assume a code.</p>}</div>
        </article>;
      })}</div>
    </section>}

    {additionalCodes.length>0&&<section className="catalog-section additional-codes" aria-labelledby="additional-codes-heading"><div className="catalog-heading"><div><span className="kicker">Additional indexed paths</span><h2 id="additional-codes-heading">Codes without a full Debrief guide</h2></div></div><p className="catalog-explainer">These links open the official criteria. Debrief has not yet written a full plain-language guide for them.</p><div>{additionalCodes.map(code=><a href={code.sourceUrl} target="_blank" rel="noreferrer" key={code.code}><strong>DC {code.code}</strong><span>{code.name}</span><ExternalLink size={13}/></a>)}</div></section>}

    {!resources.length&&!additionalCodes.length&&<div className="library-empty"><h2>No matching condition or code</h2><p>Try a broader term or another populated body system. An unlisted condition can still be entered as Other in the Claim Builder.</p><button onClick={()=>{setQuery("");setCategory("All")}}>Clear search and filter</button></div>}
  </>;
}
