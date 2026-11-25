"use client";

import {useMemo,useState} from "react";
import {Search} from "lucide-react";
import {conditions} from "@/lib/conditions";
import {diagnosticCodes} from "@/lib/diagnostic-codes";
import {getFormLabel,vaForms} from "@/lib/va-forms";

const resources=[
 ...conditions.map(item=>({label:item.name,detail:item.category,href:`/conditions/${item.slug}`,type:"Condition"})),
 ...diagnosticCodes.map(item=>({label:`DC ${item.code} — ${item.name}`,detail:item.section,href:item.conditionSlugs[0]?`/conditions/${item.conditionSlugs[0]}`:"/conditions",type:"Rating code"})),
 ...vaForms.map(item=>({label:getFormLabel(item),detail:item.name,href:`/forms/${item.slug}`,type:"Form"}))
];

export function ResourceSearch(){
 const [query,setQuery]=useState("");
 const results=useMemo(()=>{const value=query.trim().toLocaleLowerCase();return value?resources.filter(item=>`${item.label} ${item.detail} ${item.type}`.toLocaleLowerCase().includes(value)).slice(0,8):[]},[query]);
 return <div className="public-search"><label htmlFor="resource-search"><Search size={19} aria-hidden="true"/><span className="sr-only">Search conditions, rating codes, and forms</span><input id="resource-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search conditions, rating codes, or forms" autoComplete="off" aria-controls="resource-search-results"/></label>
  <div id="resource-search-results" className="public-search-results" role="region" aria-label="Resource search results" aria-live="polite" hidden={!query.trim()}>{results.length?results.map(item=><a href={item.href} key={`${item.type}-${item.label}-${item.href}`}><span><strong>{item.label}</strong><small>{item.detail}</small></span><em>{item.type}</em></a>):query.trim()?<p>No matching resources found. Try a condition, code, or form number.</p>:null}</div>
 </div>
}
