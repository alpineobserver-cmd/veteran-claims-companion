"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clipboard, Cloud, CloudOff, Download, FileDown, Info, Link2, LoaderCircle, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { conditionGroups, evidenceOptions } from "@/lib/claim-options";
import { conditionPrompts, emptyEvidenceLink, evidenceStatuses, factRows, hasAvailableRecord, hasSupportingInformation, initialAnswers as initial, normalizeEvidenceMap, qualityFindings, statementGaps, suggestedTimeline, type Answers, type EvidenceMap, type EvidenceStatus, type StatementField, type TimelineEvent } from "@/lib/claim-builder-intelligence";

type StatementMode = ""|"ai"|"template"|"edited"|"stale";
type StoredDraft = { answers: Answers; step: number; statement?:string; statementMode?:StatementMode; timeline?:TimelineEvent[]; evidenceMap?:EvidenceMap; confirmations?:Record<string,boolean> };
type CloudState = "idle"|"loading"|"saving"|"saved"|"error";
type CloudClaim = { id:string; title:string; progress:number; draftVersion:number; draftData:StoredDraft|null; updatedAt:string };
const steps = ["Condition","Claim path","Claim details","Health history","Service history","Timeline","Treatment","Evidence","Review","Personal statement","Verify & export"];

function claimTitle(draft:StoredDraft){
  const selected=draft.answers.condition==="Other / condition not listed"?draft.answers.otherCondition:draft.answers.condition;
  return selected?.trim()||"Untitled claim";
}

export function ClaimQuestionnaire({user,initialClaimId,fresh=false}:{user?:{id:string;name?:string|null};initialClaimId?:string;fresh?:boolean}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [saved, setSaved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [statement,setStatement]=useState("");
  const [statementMode,setStatementMode]=useState<StatementMode>("");
  const [timeline,setTimeline]=useState<TimelineEvent[]>([]);
  const [evidenceMap,setEvidenceMap]=useState<EvidenceMap>({});
  const [confirmations,setConfirmations]=useState<Record<string,boolean>>({});
  const [archives,setArchives]=useState<StoredDraft[]>([]);
  const [currentClaimId,setCurrentClaimId]=useState(initialClaimId||"");
  const [cloudState,setCloudState]=useState<CloudState>(initialClaimId?"loading":"idle");
  const [cloudError,setCloudError]=useState("");
  const [hydrated,setHydrated]=useState(false);
  const cloudVersion=useRef(1);
  const lastCloudSnapshot=useRef("");
  const currentSnapshot=useRef("");
  const saveChain=useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled=false;
    function applyDraft(draft:StoredDraft){
      setAnswers({...initial,...draft.answers});
      setStep(Math.min(Math.max(draft.step||0,0),steps.length-1));
      setStatement(draft.statement||"");setStatementMode(draft.statementMode||"");
      setTimeline(draft.timeline||[]);setEvidenceMap(normalizeEvidenceMap(draft.evidenceMap));setConfirmations(draft.confirmations||{});
      setSaved(true);
    }
    async function load(){
      let storedArchives:StoredDraft[]=[];
      try{storedArchives=JSON.parse(localStorage.getItem("vcc-claim-workspaces")||"[]") as StoredDraft[]}catch{localStorage.removeItem("vcc-claim-workspaces")}
      if(fresh){
        const active=localStorage.getItem("vcc-claim-draft");
        if(active){
          try{
            const parsed=JSON.parse(active) as StoredDraft|Partial<Answers>;
            if("answers" in parsed){
              const recoverable=parsed as StoredDraft;
              if(claimTitle(recoverable)==="Untitled claim")throw new Error("Empty draft");
              const snapshot=JSON.stringify(recoverable);
              storedArchives=[...storedArchives.filter(item=>JSON.stringify(item)!==snapshot),recoverable].slice(-10);
              localStorage.setItem("vcc-claim-workspaces",JSON.stringify(storedArchives));
            }
          }catch{/* A malformed active draft is safe to discard on an explicit fresh start. */}
        }
        localStorage.removeItem("vcc-claim-draft");
      }
      setArchives(storedArchives);
      if(user&&initialClaimId){
        setCloudState("loading");
        try{
          const response=await fetch(`/api/claims/${encodeURIComponent(initialClaimId)}`,{cache:"no-store"});
          const data=await response.json() as {claim?:CloudClaim;error?:string};
          if(!response.ok||!data.claim)throw new Error(data.error||"The saved claim could not be opened.");
          if(cancelled)return;
          const loadedDraft=data.claim.draftData||{answers:initial,step:0};
          applyDraft(loadedDraft);
          cloudVersion.current=data.claim.draftVersion;
          const serialized=JSON.stringify(loadedDraft);
          lastCloudSnapshot.current=serialized;currentSnapshot.current=serialized;
          setCloudState("saved");
        }catch(reason){if(!cancelled){setCloudState("error");setCloudError(reason instanceof Error?reason.message:"The saved claim could not be opened.")}}
      }else if(!fresh){
        const stored=localStorage.getItem("vcc-claim-draft");
        if(stored){try{const parsed=JSON.parse(stored) as StoredDraft|Partial<Answers>;if("answers" in parsed)applyDraft(parsed);else setAnswers({...initial,...parsed})}catch{localStorage.removeItem("vcc-claim-draft")}}
      }
      if(!cancelled)setHydrated(true);
    }
    void load();return()=>{cancelled=true};
  }, [fresh,initialClaimId,user]);
  const condition = answers.condition === "Other / condition not listed" ? answers.otherCondition : answers.condition;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const missing = useMemo(() => [
    !answers.diagnosis && "Current diagnosis or medical evaluation",
    !answers.treatment && "Current treatment details",
    !answers.evidence.includes("Service treatment records") && "Relevant service records",
    !answers.evidence.some(e => e.includes("medical records") || e.includes("treatment records")) && "Relevant medical records"
  ].filter(Boolean) as string[], [answers]);

  const findings=useMemo(()=>qualityFindings(answers,condition,timeline,evidenceMap),[answers,condition,timeline,evidenceMap]);
  const draft=useMemo<StoredDraft>(()=>({answers,step,statement,statementMode,timeline,evidenceMap,confirmations}),[answers,step,statement,statementMode,timeline,evidenceMap,confirmations]);
  const serializedDraft=useMemo(()=>JSON.stringify(draft),[draft]);
  currentSnapshot.current=serializedDraft;

  function queueCloudSave(claimId:string,payload:StoredDraft,draftProgress:number){
    const serialized=JSON.stringify(payload);
    setCloudState("saving");setCloudError("");
    saveChain.current=saveChain.current.then(async()=>{
      const response=await fetch(`/api/claims/${encodeURIComponent(claimId)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:claimTitle(payload),progress:draftProgress,draft:payload,version:cloudVersion.current})});
      const data=await response.json() as {claim?:{draftVersion:number};error?:string};
      if(!response.ok||!data.claim)throw new Error(data.error||"Your changes could not be saved.");
      cloudVersion.current=data.claim.draftVersion;lastCloudSnapshot.current=serialized;
      setCloudState(currentSnapshot.current===serialized?"saved":"saving");setSaved(true);
    }).catch(reason=>{setCloudState("error");setCloudError(reason instanceof Error?reason.message:"Your changes could not be saved.")});
    return saveChain.current;
  }

  useEffect(()=>{
    if(!hydrated||!user||!currentClaimId||serializedDraft===lastCloudSnapshot.current)return;
    const timer=window.setTimeout(()=>{void queueCloudSave(currentClaimId,draft,progress)},1500);
    return()=>window.clearTimeout(timer);
    // The complete draft snapshot intentionally controls autosave scheduling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[serializedDraft,hydrated,user,currentClaimId]);

  function update<K extends keyof Answers>(key: K, value: Answers[K]) { setAnswers(a => ({...a,[key]:value})); setSaved(false); setCompleted(false); setConfirmations({}); setStatementMode(mode=>statement&&mode?"stale":mode); }
  function persist(draftStep=step) { const value={answers,step:draftStep,statement,statementMode,timeline,evidenceMap,confirmations} satisfies StoredDraft;if(!user||!currentClaimId)localStorage.setItem("vcc-claim-draft",JSON.stringify(value));setSaved(true);return value; }
  async function saveDraft(draftStep=step) {
    const value=persist(draftStep);
    if(!user)return;
    if(currentClaimId){await queueCloudSave(currentClaimId,value,Math.round(((draftStep+1)/steps.length)*100));return}
    setCloudState("saving");setCloudError("");
    try{
      const response=await fetch("/api/claims",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:claimTitle(value),progress:Math.round(((draftStep+1)/steps.length)*100),draft:value})});
      const data=await response.json() as {claim?:{id:string;draftVersion:number};error?:string};
      if(!response.ok||!data.claim)throw new Error(data.error||"This claim could not be saved.");
      setCurrentClaimId(data.claim.id);cloudVersion.current=data.claim.draftVersion;lastCloudSnapshot.current=JSON.stringify(value);setCloudState("saved");
      window.history.replaceState(null,"",`/claim-builder?claim=${encodeURIComponent(data.claim.id)}`);
      localStorage.removeItem("vcc-claim-draft");
    }catch(reason){setCloudState("error");setCloudError(reason instanceof Error?reason.message:"This claim could not be saved.")}
  }
  function next() { const nextStep=Math.min(steps.length - 1, step + 1); persist(nextStep); setStep(nextStep); window.scrollTo({top:0,behavior:"smooth"}); }
  function back() { const previous=Math.max(0, step - 1); persist(previous); setStep(previous); setCompleted(false); window.scrollTo({top:0,behavior:"smooth"}); }
  async function finish() { await saveDraft(steps.length-1);setCompleted(true); }
  function startNew() { if(user){window.location.href="/claim-builder?new=1";return}const saved=[...archives];if(condition)saved.push({answers,step,statement,statementMode,timeline,evidenceMap,confirmations});const next=saved.slice(-10);localStorage.setItem("vcc-claim-workspaces",JSON.stringify(next));setArchives(next);localStorage.removeItem("vcc-claim-draft");setAnswers(initial);setStatement("");setStatementMode("");setTimeline([]);setEvidenceMap({});setConfirmations({});setStep(0);setSaved(false);setCompleted(false);window.history.replaceState(null,"","/claim-builder?new=1");window.scrollTo({top:0,behavior:"smooth"}); }
  function openArchive(index:number){const selected=archives[index];if(!selected)return;const remaining=archives.filter((_,item)=>item!==index);if(condition)remaining.push({answers,step,statement,statementMode,timeline,evidenceMap,confirmations});localStorage.setItem("vcc-claim-workspaces",JSON.stringify(remaining.slice(-10)));setArchives(remaining.slice(-10));setAnswers({...initial,...selected.answers});setStep(Math.min(selected.step,steps.length-1));setStatement(selected.statement||"");setStatementMode(selected.statementMode||"");setTimeline(selected.timeline||[]);setEvidenceMap(normalizeEvidenceMap(selected.evidenceMap));setConfirmations(selected.confirmations||{});setCompleted(false);setSaved(true);window.scrollTo({top:0,behavior:"smooth"})}
  const canContinue = step === 0 ? Boolean(condition.trim()) : step === 1 ? Boolean(answers.claimType) : true;

  if(cloudState==="loading")return <div className="builder-wrap"><div className="cloud-loading"><LoaderCircle className="spin" size={22}/><strong>Opening your saved claim…</strong></div></div>;
  const saveLabel=user?(cloudState==="saving"?"Saving…":cloudState==="saved"?"Saved to account":cloudState==="error"?"Try saving again":currentClaimId?"Save changes":"Save to account"):(saved?"Saved on this device":"Save for later");
  return <div className="builder-wrap">
    <header className="builder-header"><div><span className="kicker">Claim preparation</span><h1>{condition || "Tell us what you’re preparing for"}</h1><p>Your answers create an organizing checklist. They do not determine whether a condition is service connected.</p>{!user&&archives.length>0&&<label className="workspace-switcher"><span>Other condition workspaces</span><select defaultValue="" onChange={event=>{if(event.target.value)openArchive(Number(event.target.value))}}><option value="">Open a saved condition…</option>{archives.map((draft,index)=><option value={index} key={`${draft.answers.condition}-${index}`}>{draft.answers.condition==="Other / condition not listed"?draft.answers.otherCondition:draft.answers.condition||`Draft ${index+1}`}</option>)}</select></label>}</div><button className="save-button" onClick={()=>void saveDraft()} disabled={cloudState==="saving"}>{user?<Cloud size={16}/>:<Save size={16}/>} {saveLabel}</button></header>
    {!user&&<div className="cloud-save-prompt"><CloudOff size={18}/><div><strong>This draft is only on this device</strong><p>Sign in to save it securely to your account and continue on another device.</p></div><a className="button secondary" href="/login?redirectTo=/claim-builder">Sign in to save</a></div>}
    {cloudError&&<div className="cloud-save-error" role="alert"><AlertTriangle size={16}/><span>{cloudError}</span></div>}
    <div className="builder-progress"><div><span>Step {step + 1} of {steps.length}</span><strong>{steps[step]}</strong></div><span>{progress}%</span><div className="builder-progress-track"><span style={{width:`${progress}%`}}/></div></div>
    <div className="builder-layout">
      <aside className="step-list" aria-label="Questionnaire progress">{steps.map((label,i)=><div className={`${i===step?"current":""} ${i<step?"done":""}`} key={label}><span>{i<step?<Check size={13}/>:i+1}</span><small>{label}</small></div>)}</aside>
      <section className="question-card">
        {step===0 && <ConditionStep answers={answers} update={update}/>}
        {step===1 && <ChoiceStep title="What kind of claim are you preparing?" help="Choose the path that best describes this condition. You can revise it later." value={answers.claimType} onChange={v=>update("claimType",v)} options={[["Original or new claim","This is a condition you have not previously claimed."],["Increased-rating claim","A service-connected condition has worsened."],["Secondary claim","A new condition may be linked to an existing service-connected condition."],["Not sure yet","Continue gathering information before choosing a path."]]}/>}
        {step===2 && <ClaimPathStep answers={answers} update={update}/>}
        {step===3 && <HealthStep answers={answers} condition={condition} update={update}/>}
        {step===4 && <ServiceStep answers={answers} update={update}/>}
        {step===5 && <TimelineStep timeline={timeline} setTimeline={value=>{setTimeline(value);setSaved(false);setConfirmations({})}} answers={answers}/>}
        {step===6 && <TreatmentStep answers={answers} update={update}/>}
        {step===7 && <EvidenceStep answers={answers} condition={condition} update={update} evidenceMap={evidenceMap} setEvidenceMap={value=>{setEvidenceMap(value);setSaved(false)}}/>}
        {step===8 && <Review answers={answers} condition={condition} missing={missing} timeline={timeline} evidenceMap={evidenceMap} findings={findings}/>}
        {step===9 && <StatementStep answers={answers} condition={condition} timeline={timeline} update={update} statement={statement} setStatement={value=>{setStatement(value);setConfirmations({});setSaved(false);setCompleted(false)}} mode={statementMode} setMode={setStatementMode}/>}
        {step===10 && <VerifyExport statement={statement} condition={condition} answers={answers} timeline={timeline} evidenceMap={evidenceMap} findings={findings} confirmations={confirmations} setConfirmations={setConfirmations}/>}
        {completed && <div className="save-confirmation" role="status" aria-live="polite"><Check size={18}/><div><strong>{user?"Claim saved to your account":"Summary saved on this device"}</strong><p>You can return later to review or update these answers.</p></div></div>}
        <div className="builder-actions">{step>0?<button className="button secondary" onClick={back}><ArrowLeft size={16}/>Back</button>:<a className="button secondary" href="/dashboard">Cancel</a>}<button className="button primary" disabled={!canContinue} onClick={step===steps.length-1?finish:next}>{step===steps.length-1?(completed?"Saved on this device":statement?"Save statement":"Save draft"):"Continue"}{step<steps.length-1&&<ArrowRight size={16}/>}</button></div>
        {completed && <div className="summary-next-actions"><a className="text-action" href="/dashboard">Return to dashboard <ArrowRight size={14}/></a><button type="button" onClick={startNew}>Add another condition</button></div>}
      </section>
    </div>
    <div className="builder-note"><Info size={17}/><p><strong>Use your own words.</strong> It’s okay if you don’t know every answer. This tool is for organizing information and does not submit anything to VA.</p></div>
  </div>;
}

type Update = <K extends keyof Answers>(key:K,value:Answers[K])=>void;
function OptionalLayer({title,summary,children}:{title:string;summary:string;children:React.ReactNode}){return <details className="optional-layer"><summary><span><strong>{title}</strong><small>{summary}</small></span><Plus size={16}/></summary><div className="optional-layer-body">{children}</div></details>}
function ConditionStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">First, choose a condition</span><h2>What condition or health issue are you preparing for?</h2><p className="question-help">The list is a starting point, not an official or complete list of claimable conditions.</p><label className="field"><span>Condition</span><select value={answers.condition} onChange={e=>update("condition",e.target.value)}><option value="">Select a condition…</option>{conditionGroups.map(g=><optgroup label={g.label} key={g.label}>{g.options.map(o=><option key={o}>{o}</option>)}</optgroup>)}</select></label>{answers.condition==="Other / condition not listed"&&<label className="field"><span>Condition or health issue</span><input autoFocus value={answers.otherCondition} onChange={e=>update("otherCondition",e.target.value)} placeholder="Enter the condition in your own words"/></label>}</> }
function ChoiceStep({title,help,value,onChange,options}:{title:string;help:string;value:string;onChange:(v:string)=>void;options:string[][]}) { return <><span className="question-number">Choose one</span><h2>{title}</h2><p className="question-help">{help}</p><div className="choice-list">{options.map(([name,desc])=><label className={value===name?"selected":""} key={name}><input type="radio" name="choice" checked={value===name} onChange={()=>onChange(name)}/><span><strong>{name}</strong><small>{desc}</small></span></label>)}</div></> }
function ClaimPathStep({answers,update}:{answers:Answers;update:Update}){return <><span className="question-number">{answers.claimType}</span><h2>Tell us what this claim path needs to explain</h2><p className="question-help">Start with the essential facts. Open the supporting-detail layer only when it is useful.</p>{answers.claimType==="Increased-rating claim"?<><label className="field"><span>What has worsened since the prior decision?</span><textarea value={answers.worsening} onChange={e=>update("worsening",e.target.value)} placeholder="Compare symptoms, function, treatment, devices, or work effects"/></label><label className="field"><span>When did you notice the worsening?</span><input value={answers.worseningDate} onChange={e=>update("worseningDate",e.target.value)} placeholder="Approximate month/year"/></label><OptionalLayer title="Add prior-decision details" summary="Decision date and previous evaluation"><div className="field-row"><label className="field"><span>Prior decision date</span><input value={answers.previousDecision} onChange={e=>update("previousDecision",e.target.value)} placeholder="Approximate date"/></label><label className="field"><span>Previous evaluation, if known</span><input value={answers.previousEvaluation} onChange={e=>update("previousEvaluation",e.target.value)} placeholder="For example, 10%"/></label></div></OptionalLayer></>:answers.claimType==="Secondary claim"?<><label className="field"><span>Existing service-connected condition</span><input value={answers.primaryCondition} onChange={e=>update("primaryCondition",e.target.value)} placeholder="Condition you believe is related"/></label><label className="field"><span>What have you observed about the relationship?</span><textarea value={answers.secondaryRelationship} onChange={e=>update("secondaryRelationship",e.target.value)} placeholder="Describe sequence, symptoms, treatment, or aggravation without making a medical conclusion"/></label><OptionalLayer title="Add clinician context" summary="Optional discussion or documentation"><label className="field"><span>Has a clinician discussed this relationship?</span><textarea value={answers.clinicianDiscussion} onChange={e=>update("clinicianDiscussion",e.target.value)} placeholder="Who, when, and what was documented or discussed"/></label></OptionalLayer></>:<><label className="field"><span>What event, injury, illness, duty, or exposure do you believe is relevant?</span><textarea value={answers.serviceEvent} onChange={e=>update("serviceEvent",e.target.value)} placeholder="Include approximate date, location, unit, and what happened"/></label><OptionalLayer title="Add continuity details" summary="Optional history between onset and today"><label className="field"><span>How did symptoms continue after that point?</span><textarea value={answers.continuity} onChange={e=>update("continuity",e.target.value)} placeholder="Treatment, recurring symptoms, gaps in care, and important changes"/></label></OptionalLayer></>}</>}
function HealthStep({answers,condition,update}:{answers:Answers;condition:string;update:Update}) { const prompts=conditionPrompts(condition);return <><span className="question-number">Current impact</span><h2>Describe what the condition is like now</h2><p className="question-help">Three useful answers are enough to continue. More detailed layers are available below.</p><label className="field"><span>Main symptoms or limitations</span><textarea value={answers.symptoms} onChange={e=>update("symptoms",e.target.value)} placeholder="What you experience and what becomes difficult"/></label><label className="field"><span>When did symptoms begin?</span><input value={answers.onset} onChange={e=>update("onset",e.target.value)} placeholder="Approximate month/year or period of service"/></label><label className="field"><span>One concrete example</span><textarea value={answers.specificExamples} onChange={e=>update("specificExamples",e.target.value)} placeholder="A workday, household task, activity, safety issue, or observation"/></label><OptionalLayer title="Add symptom pattern" summary="Frequency, duration, flare-ups, work and daily impact"><div className="field-row"><label className="field"><span>How often?</span><input value={answers.symptomFrequency} onChange={e=>update("symptomFrequency",e.target.value)} placeholder="Per day, week, or month"/></label><label className="field"><span>How long?</span><input value={answers.symptomDuration} onChange={e=>update("symptomDuration",e.target.value)} placeholder="Minutes, hours, days, or continuous"/></label></div><label className="field"><span>Flare-ups or repeated-use effects</span><textarea value={answers.flareUps} onChange={e=>update("flareUps",e.target.value)} placeholder="Triggers, frequency, duration, recovery, and added limitations"/></label><div className="field-row"><label className="field"><span>Effects on work or school</span><textarea value={answers.workImpact} onChange={e=>update("workImpact",e.target.value)} placeholder="Interrupted tasks, absences, accommodations, or reliability"/></label><label className="field"><span>Effects on daily activity</span><textarea value={answers.dailyImpact} onChange={e=>update("dailyImpact",e.target.value)} placeholder="Mobility, sleep, relationships, self-care, driving, or chores"/></label></div></OptionalLayer><OptionalLayer title={`Add ${condition} details`} summary="Condition-specific questions"><div className="adaptive-questions">{prompts.map(prompt=><label className="field" key={prompt.key}><span>{prompt.label}</span><textarea value={answers[prompt.key]} onChange={e=>update(prompt.key,e.target.value)} placeholder={prompt.placeholder}/></label>)}</div></OptionalLayer><OptionalLayer title="Add medical evaluation" summary="Optional diagnosis and clinician context"><label className="field"><span>Current diagnosis or evaluation, if any</span><input value={answers.diagnosis} onChange={e=>update("diagnosis",e.target.value)} placeholder="Diagnosis, clinician, and approximate date"/></label></OptionalLayer></> }
function ServiceStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">Service context</span><h2>Add only the service details that matter here</h2><p className="question-help">The relevant event is already captured in the claim-path step. These details provide context and can be skipped if they do not apply.</p><OptionalLayer title="Add service profile" summary="Branch and military role"><div className="field-row"><label className="field"><span>Branch</span><select value={answers.branch} onChange={e=>update("branch",e.target.value)}><option value="">Select…</option>{["Army","Marine Corps","Navy","Air Force","Space Force","Coast Guard","National Guard","Reserves","Other uniformed service"].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>MOS, rate, AFSC, or role</span><input value={answers.role} onChange={e=>update("role",e.target.value)} placeholder="Your primary duties"/></label></div></OptionalLayer><OptionalLayer title="Add exposure history" summary="Only if relevant to this condition"><label className="field"><span>Possible toxic or environmental exposures</span><textarea value={answers.exposures} onChange={e=>update("exposures",e.target.value)} placeholder="Burn pits, airborne hazards, chemicals, contaminated water, noise, or other exposures"/></label></OptionalLayer><p className="layer-skip-note"><Check size={14}/>You can continue without opening either section.</p></> }
function TreatmentStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">Treatment</span><h2>What care have you received?</h2><p className="question-help">A brief summary is enough. Add provider details only when they help you review the draft.</p><label className="field"><span>Current and past treatment</span><textarea value={answers.treatment} onChange={e=>update("treatment",e.target.value)} placeholder="Medications, therapy, procedures, devices, tests, or other care"/></label><OptionalLayer title="Add providers and facilities" summary="Optional names and approximate dates"><label className="field"><span>Providers and facilities</span><textarea value={answers.providers} onChange={e=>update("providers",e.target.value)} placeholder="Facility or clinician names and approximate dates"/></label></OptionalLayer></> }
function TimelineStep({timeline,setTimeline,answers}:{timeline:TimelineEvent[];setTimeline:(events:TimelineEvent[])=>void;answers:Answers}){const add=()=>setTimeline([...timeline,{id:crypto.randomUUID(),date:"",title:"",details:"",source:"",approximate:true}]);const update=(id:string,key:keyof TimelineEvent,value:string|boolean)=>setTimeline(timeline.map(event=>event.id===id?{...event,[key]:value}:event));return <><span className="question-number">Chronology</span><h2>Build a short condition timeline</h2><p className="question-help">Use exact dates when known and mark estimates as approximate. Keep each event focused on one point.</p><div className="timeline-actions"><button type="button" onClick={()=>setTimeline(suggestedTimeline(answers))}>Build suggestions from my answers</button><button type="button" onClick={add}><Plus size={14}/>Add event</button></div><div className="timeline-editor">{timeline.map((event,index)=><article key={event.id}><header><strong>Event {index+1}</strong><button type="button" aria-label="Remove event" onClick={()=>setTimeline(timeline.filter(item=>item.id!==event.id))}><Trash2 size={14}/></button></header><div className="field-row"><label className="field"><span>Date or period</span><input value={event.date} onChange={e=>update(event.id,"date",e.target.value)} placeholder="Month/year or service period"/></label><label className="field"><span>Event title</span><input value={event.title} onChange={e=>update(event.id,"title",e.target.value)} placeholder="Symptoms began, treatment, worsening…"/></label></div><label className="field"><span>What happened?</span><textarea value={event.details} onChange={e=>update(event.id,"details",e.target.value)} placeholder="Brief factual description"/></label><div className="field-row"><label className="field"><span>Supporting source</span><input value={event.source} onChange={e=>update(event.id,"source",e.target.value)} placeholder="Record, log, witness, or recollection"/></label><label className="approx-check"><input type="checkbox" checked={event.approximate} onChange={e=>update(event.id,"approximate",e.target.checked)}/>Date is approximate</label></div></article>)}{!timeline.length&&<div className="empty-workspace">No timeline events yet.</div>}</div></>}
function EvidenceStep({answers,condition,update,evidenceMap,setEvidenceMap}:{answers:Answers;condition:string;update:Update;evidenceMap:EvidenceMap;setEvidenceMap:(map:EvidenceMap)=>void}) { const toggle=(v:string)=>update("evidence",answers.evidence.includes(v)?answers.evidence.filter(x=>x!==v):[...answers.evidence,v]);const recordOptions=evidenceOptions.filter(option=>option!=="Personal statement"&&option!=="Buddy or witness statement");const updateLink=(id:string,status:EvidenceStatus,source="")=>setEvidenceMap({...evidenceMap,[id]:{status,source}});const updateSource=(id:string,status:EvidenceStatus,source:string)=>{if(status==="record_available"&&source&&!answers.evidence.includes(source))update("evidence",[...answers.evidence,source]);updateLink(id,status,source)};return <><span className="question-number">Evidence</span><h2>What supporting information do you have?</h2><p className="question-help">Select the evidence types available now. In the detailed map, distinguish available records from recollections, witness evidence, and records you still need to obtain.</p><div className="check-grid">{evidenceOptions.map(o=><label className={answers.evidence.includes(o)?"checked":""} key={o}><input type="checkbox" checked={answers.evidence.includes(o)} onChange={()=>toggle(o)}/><span>{o}</span></label>)}</div><OptionalLayer title="Classify support for each fact" summary="Available record, recollection, witness, pending record, or none"><div className="evidence-map"><h3><Link2 size={16}/>Fact-to-evidence status</h3>{factRows(answers,condition).map(row=>{const link=evidenceMap[row.id]||emptyEvidenceLink;const status=evidenceStatuses.find(item=>item.value===link.status);return <label key={row.id}><span><strong>{row.fact}</strong><small>Suggested: {row.suggested}</small></span><div className="evidence-link-controls"><select aria-label={`Support status for ${row.fact}`} value={link.status} onChange={event=>updateLink(row.id,event.target.value as EvidenceStatus)}>{evidenceStatuses.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</select>{(link.status==="record_available"||link.status==="record_not_obtained")&&<select aria-label={`Record type for ${row.fact}`} value={link.source} onChange={event=>updateSource(row.id,link.status,event.target.value)}><option value="">Select record type…</option>{recordOptions.map(option=><option key={option}>{option}</option>)}</select>}<small>{status?.description}</small></div></label>})}</div></OptionalLayer></> }
function Review({answers,condition,missing,timeline,evidenceMap,findings}:{answers:Answers;condition:string;missing:string[];timeline:TimelineEvent[];evidenceMap:EvidenceMap;findings:ReturnType<typeof qualityFindings>}) { const facts=factRows(answers,condition);const supported=facts.filter(row=>hasSupportingInformation(evidenceMap[row.id])).length;const available=facts.filter(row=>hasAvailableRecord(evidenceMap[row.id])).length;const pending=facts.filter(row=>evidenceMap[row.id]?.status==="record_not_obtained").length;return <><span className="question-number">Readiness review</span><h2>Check the facts before drafting</h2><p className="question-help">These checks do not predict a claim result. They identify missing, vague, or potentially unsupported wording.</p><div className="review-grid"><Summary label="Condition" value={condition}/><Summary label="Claim path" value={answers.claimType}/><Summary label="Support identified" value={`${supported} of ${facts.length}`}/><Summary label="Available records" value={String(available)}/><Summary label="Records pending" value={String(pending)}/><Summary label="Timeline events" value={String(timeline.length)}/></div><div className="quality-list">{findings.length?findings.map(item=><article className={item.level} key={item.id}><AlertTriangle size={15}/><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>):<article className="ready"><Check size={15}/><div><strong>No automated issues found</strong><p>Continue reviewing all facts in your own words.</p></div></article>}</div><div className="review-section missing"><h3>Records you may still want to locate</h3>{missing.length?<ul>{missing.map(x=><li key={x}>{x}</li>)}</ul>:<p>Your core preparation checklist is complete.</p>}</div></> }
function Summary({label,value}:{label:string;value:string}) { return <div><span>{label}</span><strong>{value||"Not answered yet"}</strong></div> }

function StatementStep({answers,condition,timeline,update,statement,setStatement,mode,setMode}:{answers:Answers;condition:string;timeline:TimelineEvent[];update:Update;statement:string;setStatement:(value:string)=>void;mode:StatementMode;setMode:(mode:StatementMode)=>void}){
  const [generating,setGenerating]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [copied,setCopied]=useState(false);
  const [consent,setConsent]=useState(false);
  const [aiConfigured,setAiConfigured]=useState<boolean|null>(null);
  const [modelQuestions,setModelQuestions]=useState<Array<{field:StatementField;question:string;reason:string;originalValue:string}>>([]);
  const gaps=statementGaps(answers);
  const modelQuestionsAnswered=modelQuestions.every(item=>Boolean(answers[item.field].trim())&&answers[item.field]!==item.originalValue);
  const canGenerate=Boolean(condition&&!gaps.length&&modelQuestionsAnswered);
  useEffect(()=>{let cancelled=false;fetch("/api/ai/personal-statement",{cache:"no-store"}).then(response=>response.json()).then((data:{configured?:boolean})=>{if(!cancelled)setAiConfigured(Boolean(data.configured))}).catch(()=>{if(!cancelled)setAiConfigured(false)});return()=>{cancelled=true}},[]);
  async function generate(){
    setGenerating(true);setError("");setNotice("");setCopied(false);setModelQuestions([]);
    try{
      const response=await fetch("/api/ai/personal-statement",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...answers,condition,timeline})});
      const data=await response.json() as {status?:"ready"|"needs_information";statement?:string;mode?:"ai"|"template";notice?:string;questions?:Array<{field:StatementField;question:string;reason:string}>;error?:string};
      if(!response.ok)throw new Error(data.error||"The statement could not be generated.");
      if(data.status==="needs_information"){setModelQuestions((data.questions||[]).map(item=>({...item,originalValue:answers[item.field]})));setNotice(data.notice||"A few details are needed before a reliable statement can be drafted.");return}
      if(!data.statement)throw new Error(data.error||"The statement could not be generated.");
      setStatement(data.statement);setMode(data.mode||"ai");setNotice(data.notice||"");
    }catch(reason){setError(reason instanceof Error?reason.message:"The statement could not be generated.")}
    finally{setGenerating(false)}
  }
  async function copy(){await navigator.clipboard.writeText(statement);setCopied(true);setTimeout(()=>setCopied(false),1800)}
  function download(){const blob=new Blob([statement],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`${condition.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"claim"}-personal-statement.txt`;link.click();URL.revokeObjectURL(url)}
  const modeLabel=mode==="ai"?"AI-assisted draft":mode==="template"?"Guided narrative draft":mode==="stale"?"Answers changed — regenerate or review carefully":mode==="edited"?"Edited draft":"Draft";
  const followUps:Array<{field:StatementField;question:string;reason:string;placeholder?:string;multiline?:boolean;originalValue?:string}>=modelQuestions.length?modelQuestions:gaps;
  return <><span className="question-number">Personal statement</span><h2>Turn your answers into a cohesive first-person draft</h2><p className="question-help">Debrief checks for the smallest missing facts first. It will not fill gaps or invent details.</p>
    <div className={`ai-disclosure ${aiConfigured===false?"template-mode":""}`}><Sparkles size={18}/><div><strong>{aiConfigured===false?"Guided narrative mode — OpenAI is not connected":"AI drafting assistance"}</strong><p>{aiConfigured===false?"This mode uses fixed rules to organize your answers into a chronological draft. It does not interpret records, verify facts, or add information. Connect an API key later for AI-assisted rewriting.":"When connected, AI may organize and rephrase your facts, but it cannot verify events, diagnose a condition, determine service connection, or predict a rating."}</p></div></div>
    <label className="field"><span>Name to display on the draft <small>Optional — do not enter an SSN or VA file number</small></span><input value={answers.statementName} onChange={event=>update("statementName",event.target.value)} placeholder="Your full name" maxLength={120}/></label>
    {followUps.length>0&&<div className="draft-followups"><div className="draft-followups-head"><Info size={16}/><div><strong>{modelQuestions.length?"The drafting assistant needs clarification":"Answer these before drafting"}</strong><p>Only questions needed for a grounded, useful statement are shown.</p></div></div>{followUps.map(item=><label className="field" key={item.field}><span>{item.question}<small>{item.reason}</small></span>{item.multiline===false?<input value={answers[item.field]} onChange={event=>update(item.field,event.target.value)} placeholder={item.placeholder||"Answer in your own words"}/>:<textarea value={answers[item.field]} onChange={event=>update(item.field,event.target.value)} placeholder={item.placeholder||"Answer in your own words"}/>}</label>)}</div>}
    <OptionalLayer title="Add optional context" summary="Continuity or clarification that has not been captured"><label className="field"><span>How has the condition changed or continued over time?</span><textarea value={answers.continuity} onChange={event=>update("continuity",event.target.value)} placeholder="Periods of improvement or worsening, ongoing symptoms, and important changes" maxLength={4000}/></label><label className="field"><span>Anything else the draft should include?</span><textarea value={answers.additionalContext} onChange={event=>update("additionalContext",event.target.value)} placeholder="Optional context or clarification, in your own words" maxLength={4000}/></label></OptionalLayer>
    {aiConfigured&&<label className="ai-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>I understand that generating an AI-assisted draft may send my questionnaire answers to OpenAI. My optional display name is excluded.</span></label>}
    <button type="button" className="generate-statement" onClick={generate} disabled={!canGenerate||(aiConfigured===true&&!consent)||generating||aiConfigured===null}>{generating?<><RefreshCw size={16} className="spin"/>Drafting…</>:<><Sparkles size={16}/>{aiConfigured===false?(statement?"Rebuild guided narrative":"Build guided narrative"):(statement?"Regenerate cohesive draft":"Generate cohesive statement")}</>}</button>
    {error&&<p className="statement-message error" role="alert">{error}</p>}{notice&&<p className="statement-message">{notice}</p>}
    {statement&&<div className="statement-editor"><div className="statement-editor-head"><div><span>{modeLabel}</span><small>Review and edit before downloading</small></div><div><button type="button" onClick={copy}><Clipboard size={14}/>{copied?"Copied":"Copy"}</button><button type="button" onClick={download}><Download size={14}/>Download .txt</button></div></div><textarea aria-label="Editable personal statement" value={statement} onChange={event=>{setStatement(event.target.value);setMode("edited")}}/><p><Info size={13}/>Using this draft means you have reviewed it and determined that it accurately reflects your own knowledge and experience.</p></div>}
  </>;
}

function VerifyExport({statement,condition,answers,timeline,evidenceMap,findings,confirmations,setConfirmations}:{statement:string;condition:string;answers:Answers;timeline:TimelineEvent[];evidenceMap:EvidenceMap;findings:ReturnType<typeof qualityFindings>;confirmations:Record<string,boolean>;setConfirmations:(value:Record<string,boolean>)=>void}){
  const [downloading,setDownloading]=useState(false);const [error,setError]=useState("");
  const sections=statement.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
  const allConfirmed=sections.length>0&&sections.every((_,index)=>confirmations[String(index)]);
  async function downloadPackage(){setDownloading(true);setError("");try{const response=await fetch("/api/claim-package",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({condition,claimType:answers.claimType,name:answers.statementName,statement,timeline,evidenceMap,selectedEvidence:answers.evidence,qualityFindings:findings})});if(!response.ok){const data=await response.json() as {error?:string};throw new Error(data.error||"The PDF could not be created.")}const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`${condition.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"claim"}-review-package.pdf`;link.click();URL.revokeObjectURL(url)}catch(reason){setError(reason instanceof Error?reason.message:"The PDF could not be created.")}finally{setDownloading(false)}}
  return <><span className="question-number">Final verification</span><h2>Confirm the statement section by section</h2><p className="question-help">Confirmation means only that the text accurately reflects your own knowledge and experience. It does not certify eligibility or submit anything to VA.</p>{!statement?<div className="empty-workspace"><strong>No statement draft yet</strong><p>Go back to generate or write a statement before exporting.</p></div>:<><div className="confirmation-list">{sections.map((section,index)=><label className={confirmations[String(index)]?"confirmed":""} key={`${index}-${section.slice(0,20)}`}><input type="checkbox" checked={Boolean(confirmations[String(index)])} onChange={event=>setConfirmations({...confirmations,[String(index)]:event.target.checked})}/><span><small>{index===0?"Heading":`Section ${index}`}</small><p>{section}</p><strong>{confirmations[String(index)]?<><Check size={13}/>Confirmed accurate</>:"Review and confirm"}</strong></span></label>)}</div><div className="export-readiness"><div><strong>{sections.filter((_,index)=>confirmations[String(index)]).length} of {sections.length} sections confirmed</strong><span>{findings.filter(item=>item.level==="required").length} required-information checks remain</span></div><button type="button" className="button primary" disabled={!allConfirmed||downloading} onClick={downloadPackage}><FileDown size={16}/>{downloading?"Creating PDF…":"Download review package"}</button></div>{error&&<p className="statement-message error">{error}</p>}<p className="export-note"><Info size={14}/>The PDF is a preparation attachment, not a completed VA form and not proof of submission. Review current VA instructions before filing.</p></>}</>;
}
