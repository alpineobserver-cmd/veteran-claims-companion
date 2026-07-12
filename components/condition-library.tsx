"use client";
import { useMemo, useState } from "react";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { categories, conditions } from "@/lib/conditions";

export function ConditionLibrary(){
  const [query,setQuery]=useState(""); const [category,setCategory]=useState("All");
  const shown=useMemo(()=>conditions.filter(c=>(category==="All"||c.category===category)&&(`${c.name} ${c.short} ${c.related.join(" ")}`.toLowerCase().includes(query.toLowerCase()))),[query,category]);
  return <>
    <div className="library-tools"><label className="library-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search conditions and related terms…" aria-label="Search conditions"/></label><div className="library-filter"><SlidersHorizontal size={16}/><select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filter by body system">{categories.map(x=><option key={x}>{x}</option>)}</select></div></div>
    <div className="library-count"><strong>{shown.length}</strong> {shown.length===1?"condition":"conditions"}<span>Educational summaries verified July 2026</span></div>
    {shown.length?<div className="condition-grid">{shown.map(c=><a className="condition-card" href={`/conditions/${c.slug}`} key={c.slug}><span className="condition-category">{c.category}</span><h2>{c.name}</h2><p>{c.short}</p><span className="condition-link">Open guide <ArrowRight size={15}/></span></a>)}</div>:<div className="library-empty"><h2>No matching condition</h2><p>Try a broader term or choose “All” body systems. A condition not appearing here can still be entered as “Other” in the claim builder.</p></div>}
  </>;
}
