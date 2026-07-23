"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, ExternalLink,
  FileSearch, Info, MapPin, Radio, ShieldAlert
} from "lucide-react";
import {
  dutyLocations, exposureConcerns, findExposureMatches, serviceEras,
  type ExposureKey, type LocationKey, type ServiceEra
} from "@/lib/exposure-record-check";

type Stage="service"|"exposures"|"review";
const stages:{key:Stage;label:string}[]=[
  {key:"service",label:"Service history"},
  {key:"exposures",label:"Exposure details"},
  {key:"review",label:"Possible matches"}
];

function toggleValue<T extends string>(values:T[],value:T){
  return values.includes(value)?values.filter(item=>item!==value):[...values,value];
}

export function ExposureRecordCheck(){
  const [stage,setStage]=useState<Stage>("service");
  const [era,setEra]=useState<ServiceEra|null>(null);
  const [selectedLocations,setSelectedLocations]=useState<LocationKey[]>([]);
  const [selectedExposures,setSelectedExposures]=useState<ExposureKey[]>([]);
  const [details,setDetails]=useState("");
  const [showValidation,setShowValidation]=useState(false);
  const stageHeadingRef=useRef<HTMLHeadingElement>(null);
  const firstRender=useRef(true);

  const currentIndex=stages.findIndex(item=>item.key===stage);
  const serviceComplete=Boolean(era&&selectedLocations.length);
  const matches=useMemo(()=>era?findExposureMatches(era,selectedLocations,selectedExposures):[],[era,selectedLocations,selectedExposures]);

  useEffect(()=>{
    if(firstRender.current){firstRender.current=false;return}
    stageHeadingRef.current?.focus();
  },[stage]);

  function continueFromService(){
    setShowValidation(true);
    if(!serviceComplete)return;
    setShowValidation(false);
    setStage("exposures");
  }

  function reset(){
    setEra(null);
    setSelectedLocations([]);
    setSelectedExposures([]);
    setDetails("");
    setShowValidation(false);
    setStage("service");
  }

  return <div className="erc-content">
    <header className="erc-heading">
      <div><span className="erc-kicker">Military exposure tools</span><h1>Exposure Record Check</h1><p>See which official registries, exposure programs, and records may be worth checking.</p></div>
      <div className="erc-security-note"><ShieldAlert size={19} aria-hidden="true"/><span><strong>Fictional Alpha</strong>Use fictional details only. Answers stay on this page and are not saved or sent.</span></div>
    </header>

    <div className="erc-layout">
      <aside className="erc-rail" aria-label="Check progress">
        <ol>{stages.map((item,index)=>{
          const complete=currentIndex>index;
          const active=item.key===stage;
          return <li key={item.key} className={active?"active":complete?"complete":""} aria-current={active?"step":undefined}>
            <span aria-hidden="true">{complete?<Check size={14}/>:index+1}</span>
            <div><strong>{item.label}</strong><small>{active?"Current":complete?"Complete":"Not started"}</small></div>
          </li>;
        })}</ol>
        <div className="erc-rail-note"><Info size={16} aria-hidden="true"/><p>This does not search VA or military systems. It compares fictional answers with public program information.</p></div>
      </aside>

      <section className="erc-workspace">
        {stage==="service"&&<>
          <div className="erc-section-heading"><span className="erc-section-icon"><MapPin size={20} aria-hidden="true"/></span><div><h2 ref={stageHeadingRef} tabIndex={-1}>Start with your service history</h2><p>Choose the closest period and every relevant duty location. Official programs use more exact dates and places.</p></div></div>
          <fieldset className="erc-fieldset">
            <legend>When did you serve?</legend>
            <div className="erc-era-grid">{serviceEras.map(item=><label className={era===item.key?"erc-choice selected":"erc-choice"} key={item.key}>
              <input type="radio" name="era" value={item.key} checked={era===item.key} onChange={()=>setEra(item.key)}/>
              <span className="erc-control" aria-hidden="true">{era===item.key&&<Check size={13}/>}</span>
              <span><strong>{item.label}</strong><small>{item.detail}</small></span>
            </label>)}</div>
            {showValidation&&!era&&<p className="erc-error" role="alert">Select a service period to continue.</p>}
          </fieldset>
          <fieldset className="erc-fieldset">
            <legend>Where did you serve?</legend>
            <p className="erc-helper">Select all that apply. Review exact locations and dates on the official program page.</p>
            <div className="erc-location-grid">{dutyLocations.map(item=>{
              const selected=selectedLocations.includes(item.key);
              return <label className={selected?"erc-check selected":"erc-check"} key={item.key}>
                <input type="checkbox" checked={selected} onChange={()=>setSelectedLocations(toggleValue(selectedLocations,item.key))}/>
                <span className="erc-control" aria-hidden="true">{selected&&<Check size={13}/>}</span><strong>{item.label}</strong>
              </label>;
            })}</div>
            {showValidation&&!selectedLocations.length&&<p className="erc-error" role="alert">Select at least one duty location to continue.</p>}
          </fieldset>
          <div className="erc-actions"><span/><button className="erc-button primary" type="button" onClick={continueFromService}>Continue <ArrowRight size={16} aria-hidden="true"/></button></div>
        </>}

        {stage==="exposures"&&<>
          <div className="erc-section-heading"><span className="erc-section-icon"><Radio size={20} aria-hidden="true"/></span><div><h2 ref={stageHeadingRef} tabIndex={-1}>Add known or suspected exposures</h2><p>You do not need proof or a diagnosis to include a fictional concern in this educational check.</p></div></div>
          <fieldset className="erc-fieldset">
            <legend>What should be checked?</legend>
            <div className="erc-exposure-list">{exposureConcerns.map(item=>{
              const selected=selectedExposures.includes(item.key);
              return <label className={selected?"erc-exposure selected":"erc-exposure"} key={item.key}>
                <input type="checkbox" checked={selected} onChange={()=>setSelectedExposures(toggleValue(selectedExposures,item.key))}/>
                <span className="erc-control" aria-hidden="true">{selected&&<Check size={13}/>}</span>
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </label>;
            })}</div>
          </fieldset>
          <label className="erc-textarea-label" htmlFor="exposure-notes"><strong>Anything else to remember?</strong><span id="exposure-notes-help">Optional. Add fictional notes about duties, units, incidents, or approximate dates. Notes are not used to determine matches.</span></label>
          <textarea id="exposure-notes" aria-describedby="exposure-notes-help exposure-notes-count" value={details} onChange={event=>setDetails(event.target.value)} maxLength={500} placeholder="Example: Worked near a fictional vehicle burn area during a 2008 deployment."/>
          <div className="erc-count" id="exposure-notes-count">{details.length}/500</div>
          <div className="erc-actions">
            <button className="erc-button secondary" type="button" onClick={()=>setStage("service")}><ArrowLeft size={16} aria-hidden="true"/> Back</button>
            <button className="erc-button primary" type="button" onClick={()=>setStage("review")}>See possible matches <ArrowRight size={16} aria-hidden="true"/></button>
          </div>
        </>}

        {stage==="review"&&<>
          <div className="erc-result-header"><span className="erc-result-icon"><ClipboardCheck size={23} aria-hidden="true"/></span><div><h2 ref={stageHeadingRef} tabIndex={-1}>Your possible matches</h2><p>Based on this fictional check, {matches.length} programs or records may be worth reviewing.</p></div></div>
          <div className="erc-result-caution"><Info size={17} aria-hidden="true"/><p><strong>A possible match is not confirmation.</strong> Only the responsible VA or military program can confirm participation, recorded information, services, or benefit eligibility. Registry evaluations are separate from disability compensation exams and claims.</p></div>
          <div className="erc-results">{matches.map((match,index)=><article className="erc-result" key={match.name}>
            <div className="erc-result-number">{String(index+1).padStart(2,"0")}</div>
            <div className="erc-result-copy"><span className="erc-kind">{match.kind}</span><h3>{match.name}</h3><p>{match.reason}</p><a href={match.href} target="_blank" rel="noreferrer">{match.action} <ExternalLink size={14} aria-hidden="true"/></a></div>
            <CheckCircle2 className="erc-match-icon" size={21} aria-label="Possible match"/>
          </article>)}</div>
          <div className="erc-summary"><FileSearch size={20} aria-hidden="true"/><div><strong>Keep one exposure story</strong><p>Record locations, dates, duties, incidents, symptoms, and missing records in the relevant claim workspace.</p></div><a href="/claim-builder?new=1">Start a new claim <ArrowRight size={15} aria-hidden="true"/></a></div>
          <div className="erc-actions">
            <button className="erc-button secondary" type="button" onClick={()=>setStage("exposures")}><ArrowLeft size={16} aria-hidden="true"/> Back</button>
            <button className="erc-button secondary" type="button" onClick={reset}>Start over</button>
          </div>
        </>}
      </section>
    </div>
  </div>;
}
