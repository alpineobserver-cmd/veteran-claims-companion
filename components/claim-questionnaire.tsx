"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Info, Save } from "lucide-react";
import { conditionGroups, evidenceOptions } from "@/lib/claim-options";

type Answers = {
  condition: string; otherCondition: string; claimType: string; diagnosis: string;
  symptoms: string; onset: string; branch: string; role: string; serviceEvent: string;
  exposures: string; treatment: string; providers: string; evidence: string[];
};

type StoredDraft = { answers: Answers; step: number };

const initial: Answers = { condition:"", otherCondition:"", claimType:"", diagnosis:"", symptoms:"", onset:"", branch:"", role:"", serviceEvent:"", exposures:"", treatment:"", providers:"", evidence:[] };
const steps = ["Condition", "Claim path", "Health history", "Service history", "Treatment", "Evidence", "Review"];

export function ClaimQuestionnaire() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [saved, setSaved] = useState(false);
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    const stored=localStorage.getItem("vcc-claim-draft");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as StoredDraft | Partial<Answers>;
      if ("answers" in parsed) {
        setAnswers({...initial,...parsed.answers});
        setStep(Math.min(Math.max(parsed.step || 0, 0), steps.length - 1));
      } else setAnswers({...initial,...parsed});
      setSaved(true);
    } catch { localStorage.removeItem("vcc-claim-draft"); }
  }, []);
  const condition = answers.condition === "Other / condition not listed" ? answers.otherCondition : answers.condition;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const missing = useMemo(() => [
    !answers.diagnosis && "Current diagnosis or medical evaluation",
    !answers.treatment && "Current treatment details",
    !answers.evidence.includes("Service treatment records") && "Relevant service records",
    !answers.evidence.some(e => e.includes("medical records") || e.includes("treatment records")) && "Relevant medical records"
  ].filter(Boolean) as string[], [answers]);

  function update<K extends keyof Answers>(key: K, value: Answers[K]) { setAnswers(a => ({...a,[key]:value})); setSaved(false); setCompleted(false); }
  function persist(draftStep=step) { localStorage.setItem("vcc-claim-draft", JSON.stringify({answers,step:draftStep} satisfies StoredDraft)); setSaved(true); }
  function saveDraft() { persist(); }
  function next() { const nextStep=Math.min(steps.length - 1, step + 1); persist(nextStep); setStep(nextStep); window.scrollTo({top:0,behavior:"smooth"}); }
  function back() { const previous=Math.max(0, step - 1); persist(previous); setStep(previous); setCompleted(false); window.scrollTo({top:0,behavior:"smooth"}); }
  function finish() { persist(steps.length - 1); setCompleted(true); }
  function startNew() { localStorage.removeItem("vcc-claim-draft"); setAnswers(initial); setStep(0); setSaved(false); setCompleted(false); window.scrollTo({top:0,behavior:"smooth"}); }
  const canContinue = step === 0 ? Boolean(condition.trim()) : step === 1 ? Boolean(answers.claimType) : true;

  return <div className="builder-wrap">
    <header className="builder-header"><div><span className="kicker">Claim preparation</span><h1>{condition || "Tell us what you’re preparing for"}</h1><p>Your answers create an organizing checklist. They do not determine whether a condition is service connected.</p></div><button className="save-button" onClick={saveDraft}><Save size={16}/>{saved ? "Saved on this device" : "Save for later"}</button></header>
    <div className="builder-progress"><div><span>Step {step + 1} of {steps.length}</span><strong>{steps[step]}</strong></div><span>{progress}%</span><div className="builder-progress-track"><span style={{width:`${progress}%`}}/></div></div>
    <div className="builder-layout">
      <aside className="step-list" aria-label="Questionnaire progress">{steps.map((label,i)=><div className={`${i===step?"current":""} ${i<step?"done":""}`} key={label}><span>{i<step?<Check size={13}/>:i+1}</span><small>{label}</small></div>)}</aside>
      <section className="question-card">
        {step===0 && <ConditionStep answers={answers} update={update}/>} 
        {step===1 && <ChoiceStep title="What kind of claim are you preparing?" help="Choose the path that best describes this condition. You can revise it later." value={answers.claimType} onChange={v=>update("claimType",v)} options={[["Original or new claim","This is a condition you have not previously claimed."],["Increased-rating claim","A service-connected condition has worsened."],["Secondary claim","A new condition may be linked to an existing service-connected condition."],["Not sure yet","Continue gathering information before choosing a path."]]}/>} 
        {step===2 && <HealthStep answers={answers} update={update}/>} 
        {step===3 && <ServiceStep answers={answers} update={update}/>} 
        {step===4 && <TreatmentStep answers={answers} update={update}/>} 
        {step===5 && <EvidenceStep answers={answers} update={update}/>} 
        {step===6 && <Review answers={answers} condition={condition} missing={missing}/>} 
        {completed && <div className="save-confirmation" role="status" aria-live="polite"><Check size={18}/><div><strong>Summary saved on this device</strong><p>You can return later to review or update these answers.</p></div></div>}
        <div className="builder-actions">{step>0?<button className="button secondary" onClick={back}><ArrowLeft size={16}/>Back</button>:<a className="button secondary" href="/">Cancel</a>}<button className="button primary" disabled={!canContinue} onClick={step===steps.length-1?finish:next}>{step===steps.length-1?(completed?"Saved":"Save summary"):"Continue"}{step<steps.length-1&&<ArrowRight size={16}/>}</button></div>
        {completed && <div className="summary-next-actions"><a className="text-action" href="/">Return to dashboard <ArrowRight size={14}/></a><button type="button" onClick={startNew}>Start a new summary</button></div>}
      </section>
    </div>
    <div className="builder-note"><Info size={17}/><p><strong>Use your own words.</strong> It’s okay if you don’t know every answer. This tool is for organizing information and does not submit anything to VA.</p></div>
  </div>;
}

type Update = <K extends keyof Answers>(key:K,value:Answers[K])=>void;
function ConditionStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">First, choose a condition</span><h2>What condition or health issue are you preparing for?</h2><p className="question-help">The list is a starting point, not an official or complete list of claimable conditions.</p><label className="field"><span>Condition</span><select value={answers.condition} onChange={e=>update("condition",e.target.value)}><option value="">Select a condition…</option>{conditionGroups.map(g=><optgroup label={g.label} key={g.label}>{g.options.map(o=><option key={o}>{o}</option>)}</optgroup>)}</select></label>{answers.condition==="Other / condition not listed"&&<label className="field"><span>Condition or health issue</span><input autoFocus value={answers.otherCondition} onChange={e=>update("otherCondition",e.target.value)} placeholder="Enter the condition in your own words"/></label>}</> }
function ChoiceStep({title,help,value,onChange,options}:{title:string;help:string;value:string;onChange:(v:string)=>void;options:string[][]}) { return <><span className="question-number">Choose one</span><h2>{title}</h2><p className="question-help">{help}</p><div className="choice-list">{options.map(([name,desc])=><label className={value===name?"selected":""} key={name}><input type="radio" name="choice" checked={value===name} onChange={()=>onChange(name)}/><span><strong>{name}</strong><small>{desc}</small></span></label>)}</div></> }
function HealthStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">Health history</span><h2>Tell us about the condition today</h2><p className="question-help">Focus on what you experience, when it began, and how it affects day-to-day life.</p><label className="field"><span>Current diagnosis, if you have one</span><input value={answers.diagnosis} onChange={e=>update("diagnosis",e.target.value)} placeholder="Diagnosis and approximate date"/></label><label className="field"><span>Symptoms and functional impact</span><textarea value={answers.symptoms} onChange={e=>update("symptoms",e.target.value)} placeholder="Describe frequency, severity, flare-ups, and effects on work or daily activities"/></label><label className="field"><span>When did symptoms begin?</span><input value={answers.onset} onChange={e=>update("onset",e.target.value)} placeholder="Approximate month/year or period of service"/></label></> }
function ServiceStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">Service history</span><h2>What happened during service?</h2><p className="question-help">Record events, injuries, illnesses, duties, or exposures that you believe may be relevant.</p><div className="field-row"><label className="field"><span>Branch</span><select value={answers.branch} onChange={e=>update("branch",e.target.value)}><option value="">Select…</option>{["Army","Marine Corps","Navy","Air Force","Space Force","Coast Guard","National Guard","Reserves","Other uniformed service"].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>MOS, rate, AFSC, or role</span><input value={answers.role} onChange={e=>update("role",e.target.value)} placeholder="Your primary duties"/></label></div><label className="field"><span>Relevant event, injury, illness, or circumstances</span><textarea value={answers.serviceEvent} onChange={e=>update("serviceEvent",e.target.value)} placeholder="Include approximate dates, locations, units, and what occurred"/></label><label className="field"><span>Possible toxic or environmental exposures</span><textarea value={answers.exposures} onChange={e=>update("exposures",e.target.value)} placeholder="Burn pits, airborne hazards, chemicals, contaminated water, noise, or other exposures"/></label></> }
function TreatmentStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">Treatment</span><h2>What care have you received?</h2><p className="question-help">Include VA, military, and private care. Approximate information is fine for this draft.</p><label className="field"><span>Current and past treatment</span><textarea value={answers.treatment} onChange={e=>update("treatment",e.target.value)} placeholder="Medications, therapy, procedures, devices, tests, or other care"/></label><label className="field"><span>Providers and facilities</span><textarea value={answers.providers} onChange={e=>update("providers",e.target.value)} placeholder="Facility or clinician names and approximate dates"/></label></> }
function EvidenceStep({answers,update}:{answers:Answers;update:Update}) { const toggle=(v:string)=>update("evidence",answers.evidence.includes(v)?answers.evidence.filter(x=>x!==v):[...answers.evidence,v]); return <><span className="question-number">Evidence</span><h2>What supporting information do you already have?</h2><p className="question-help">Select anything you have or know how to locate. You do not need every item.</p><div className="check-grid">{evidenceOptions.map(o=><label className={answers.evidence.includes(o)?"checked":""} key={o}><input type="checkbox" checked={answers.evidence.includes(o)} onChange={()=>toggle(o)}/><span>{o}</span></label>)}</div></> }
function Review({answers,condition,missing}:{answers:Answers;condition:string;missing:string[]}) { return <><span className="question-number">Preparation summary</span><h2>Here’s what you’ve organized so far</h2><p className="question-help">Review this draft and go back to add or correct anything.</p><div className="review-grid"><Summary label="Condition" value={condition}/><Summary label="Claim path" value={answers.claimType}/><Summary label="Symptoms began" value={answers.onset}/><Summary label="Branch and role" value={[answers.branch,answers.role].filter(Boolean).join(" — ")}/></div><div className="review-section"><h3>Evidence identified</h3>{answers.evidence.length?<ul>{answers.evidence.map(x=><li key={x}><Check size={14}/>{x}</li>)}</ul>:<p>No evidence selected yet.</p>}</div><div className="review-section missing"><h3>Items you may want to locate</h3>{missing.length?<ul>{missing.map(x=><li key={x}>{x}</li>)}</ul>:<p>Your core preparation checklist is complete.</p>}</div></> }
function Summary({label,value}:{label:string;value:string}) { return <div><span>{label}</span><strong>{value||"Not answered yet"}</strong></div> }
