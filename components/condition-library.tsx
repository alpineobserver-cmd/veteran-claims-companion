"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, ExternalLink, Search, SlidersHorizontal } from "lucide-react";
import { conditions } from "@/lib/conditions";
import { bodySystems, CATALOG_VERIFIED_THROUGH, conditionAliases, diagnosticCodes } from "@/lib/diagnostic-codes";

export function ConditionLibrary(){
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("All");
  const normalized=query.trim().toLowerCase();
  const guides=useMemo(()=>conditions.filter(condition=>{
    const systemMatch=category==="All"||condition.category===category;
    const searchText=`${condition.name} ${condition.short} ${condition.related.join(" ")} ${(conditionAliases[condition.slug]||[]).join(" ")}`.toLowerCase();
    return systemMatch&&(!normalized||searchText.includes(normalized));
  }),[normalized,category]);
  const codes=useMemo(()=>diagnosticCodes.filter(code=>{
    const systemMatch=category==="All"||code.bodySystem===category;
    const searchText=`${code.code} ${code.name} ${code.summary} ${code.keywords.join(" ")}`.toLowerCase();
    return systemMatch&&(!normalized||searchText.includes(normalized));
  }),[normalized,category]);
  const activeSystem=bodySystems.find(system=>system.shortName===category);
  const categories=["All",...bodySystems.map(system=>system.shortName)];

  function chooseSystem(system:string){setCategory(system);document.getElementById("catalog-results")?.scrollIntoView({behavior:"smooth",block:"start"})}

  return <>
    <section className="catalog-summary" aria-label="Current library coverage">
      <div><strong>{bodySystems.length}</strong><span>CFR body systems</span></div>
      <div><strong>{conditions.length}</strong><span>Plain-language guides</span></div>
      <div><strong>{diagnosticCodes.length}</strong><span>Indexed diagnostic codes</span></div>
      <p>Structured for future eCFR synchronization. Catalog coverage is expanding and is not yet the complete Part 4 index.</p>
    </section>

    <section className="system-browser" aria-labelledby="systems-heading">
      <div className="catalog-heading"><div><span className="kicker">Browse the schedule</span><h2 id="systems-heading">Choose a body system</h2></div><span>38 CFR Part 4, Subpart B</span></div>
      <div className="system-grid">{bodySystems.map(system=>{
        const guideCount=conditions.filter(condition=>condition.category===system.shortName).length;
        const codeCount=diagnosticCodes.filter(code=>code.bodySystem===system.shortName).length;
        return <button className={category===system.shortName?"selected":""} onClick={()=>chooseSystem(system.shortName)} key={system.shortName}>
          <span>{system.section}</span><strong>{system.name}</strong><small>{guideCount} {guideCount===1?"guide":"guides"} · {codeCount} indexed {codeCount===1?"code":"codes"}</small>
        </button>})}</div>
    </section>

    <div className="library-tools" id="catalog-results"><label className="library-search"><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search a condition, symptom, or diagnostic code…" aria-label="Search condition guides and diagnostic codes"/></label><div className="library-filter"><SlidersHorizontal size={16}/><select value={category} onChange={event=>setCategory(event.target.value)} aria-label="Filter by body system">{categories.map(item=><option key={item}>{item}</option>)}</select></div></div>
    <div className="library-count"><strong>{guides.length+codes.length}</strong> matching resources<span>Regulatory summaries verified {CATALOG_VERIFIED_THROUGH}</span></div>

    {activeSystem&&<div className="system-context"><BookOpen size={17}/><div><strong>{activeSystem.name}</strong><p>{activeSystem.description}</p><a href={activeSystem.sourceUrl} target="_blank" rel="noreferrer">Open the official schedule <ExternalLink size={12}/></a></div></div>}

    {guides.length>0&&<section className="catalog-section" aria-labelledby="guides-heading"><div className="catalog-heading"><div><span className="kicker">Plain-language profiles</span><h2 id="guides-heading">Condition guides</h2></div><span>{guides.length} shown</span></div><div className="condition-grid">{guides.map(condition=><a className="condition-card" href={`/conditions/${condition.slug}`} key={condition.slug}><span className="condition-category">{condition.category}</span><h2>{condition.name}</h2><p>{condition.short}</p><span className="condition-link">Open guide <ArrowRight size={15}/></span></a>)}</div></section>}

    {codes.length>0&&<section className="catalog-section" aria-labelledby="codes-heading"><div className="catalog-heading"><div><span className="kicker">Regulatory index</span><h2 id="codes-heading">Potentially relevant diagnostic codes</h2></div><span>{codes.length} shown</span></div><p className="catalog-explainer">Codes organize the rating schedule; they do not establish a diagnosis, service connection, or a likely percentage. One condition may involve more than one code.</p><div className="code-grid">{codes.map(code=><article className="code-card" key={code.code}><div className="code-card-top"><span>DC {code.code}</span><small>{code.section}</small></div><h3>{code.name}</h3><p>{code.summary}</p><div className="code-card-actions">{code.conditionSlugs[0]&&<a href={`/conditions/${code.conditionSlugs[0]}`}>Related guide <ArrowRight size={12}/></a>}<a href={code.sourceUrl} target="_blank" rel="noreferrer">Official criteria <ExternalLink size={12}/></a></div></article>)}</div></section>}

    {!guides.length&&!codes.length&&<div className="library-empty"><h2>No matching resource yet</h2><p>Try a broader term or another body system. An unlisted condition can still be entered as “Other” in the claim builder and may be evaluated under an analogous diagnostic code.</p><button onClick={()=>{setQuery("");setCategory("All")}}>Clear search and filters</button></div>}
  </>;
}
