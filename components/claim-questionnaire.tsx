"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clipboard, Cloud, CloudOff, Columns2, Download, FileDown, History, Info, Link2, LoaderCircle, Plus, RefreshCw, RotateCcw, Save, Sparkles, Trash2, X } from "lucide-react";
import { conditionGroups, evidenceOptions } from "@/lib/claim-options";
import { conditionPrompts, emptyEvidenceLink, evidenceStatuses, factRows, hasAvailableRecord, hasSupportingInformation, initialAnswers as initial, intentToFileLabel, normalizeEvidenceMap, qualityFindings, statementGaps, suggestedTimeline, type Answers, type EvidenceMap, type EvidenceStatus, type IntentToFileStatus, type StatementField, type TimelineEvent } from "@/lib/claim-builder-intelligence";
import { deriveStatementProvenance, statementProvenanceSummary, type StatementProvenance } from "@/lib/statement-provenance";
import { compareStatementVersions } from "@/lib/statement-version-comparison";

type StatementMode = ""|"ai"|"template"|"edited"|"stale";
type StatementVersion={id:string;content:string;mode:"ai"|"template"|"edited";createdAt:string;provenance?:StatementProvenance};
type DocumentRecord={id:string;claimId:string;originalName:string;mimeType:string;size:number;createdAt:string};
type BuddyStatement={id:string;witnessName:string;relationship:string;knownSince:string;observations:string;specificExample:string;changes:string;statement:string;createdAt:string;updatedAt:string};
type StoredDraft = { answers: Answers; step: number; furthestStep?:number; statement?:string; statementMode?:StatementMode; statementProvenance?:StatementProvenance; timeline?:TimelineEvent[]; evidenceMap?:EvidenceMap; confirmations?:Record<string,boolean>;documentLinks?:Record<string,string[]>;statementVersions?:StatementVersion[];packageStatus?:"planned"|"requested"|"obtained"|"reviewed"|"exported"|"submitted";packageStatusUpdatedAt?:string;packageExportedAt?:string;packageSubmittedAt?:string;buddyStatements?:BuddyStatement[] };
type CloudState = "idle"|"loading"|"saving"|"saved"|"error";
type CloudClaim = { id:string; title:string; progress:number; draftVersion:number; draftData:StoredDraft|null; updatedAt:string };
const steps = ["Condition","Claim path","Claim details","Health history","Service history","Timeline","Treatment","Evidence","Review","Personal statement","Claim package"];
const stepGuidance = [
  "Choose one condition or health issue for this workspace.",
  "Select the claim path that best matches this condition.",
  "Record the intent-to-file checkpoint and the core service connection facts.",
  "Describe current symptoms, onset, and one concrete example.",
  "Add only the service details that help explain this condition.",
  "Organize key events in date order, or skip this optional section.",
  "Summarize treatment and add provider details only when useful.",
  "Identify what supports each important fact. Uploads are not required to continue.",
  "Resolve essential gaps and review optional evidence suggestions separately.",
  "Create and verify a first-person draft using only the facts you supplied.",
  "Confirm each section, download an optional review PDF, and add the condition to your package."
] as const;

function claimTitle(draft:StoredDraft){
  const selected=draft.answers.condition==="Other / condition not listed"?draft.answers.otherCondition:draft.answers.condition;
  return selected?.trim()||"Untitled claim";
}

function scrollToTop(){window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})}

export function ClaimQuestionnaire({user,initialClaimId,fresh=false}:{user?:{id:string;name?:string|null};initialClaimId?:string;fresh?:boolean}) {
  const [step, setStep] = useState(0);
  const [furthestStep,setFurthestStep]=useState(0);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [saved, setSaved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [statement,setStatement]=useState("");
  const [statementMode,setStatementMode]=useState<StatementMode>("");
  const [timeline,setTimeline]=useState<TimelineEvent[]>([]);
  const [evidenceMap,setEvidenceMap]=useState<EvidenceMap>({});
  const [confirmations,setConfirmations]=useState<Record<string,boolean>>({});
  const [documentLinks,setDocumentLinks]=useState<Record<string,string[]>>({});
  const [loadedDocuments,setLoadedDocuments]=useState<DocumentRecord[]>([]);
  const [statementVersions,setStatementVersions]=useState<StatementVersion[]>([]);
  const [packageStatus,setPackageStatus]=useState<StoredDraft["packageStatus"]>("planned");
  const [packageStatusUpdatedAt,setPackageStatusUpdatedAt]=useState("");
  const [packageExportedAt,setPackageExportedAt]=useState("");
  const [packageSubmittedAt,setPackageSubmittedAt]=useState("");
  const [buddyStatements,setBuddyStatements]=useState<BuddyStatement[]>([]);
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
      setFurthestStep(Math.min(Math.max(draft.furthestStep??draft.step??0,0),steps.length-1));
      setStatement(draft.statement||"");setStatementMode(draft.statementMode||"");
      setTimeline(draft.timeline||[]);setEvidenceMap(normalizeEvidenceMap(draft.evidenceMap));setConfirmations(draft.confirmations||{});setDocumentLinks(draft.documentLinks||{});setStatementVersions(draft.statementVersions||[]);setPackageStatus(draft.packageStatus||"planned");setPackageStatusUpdatedAt(draft.packageStatusUpdatedAt||"");setPackageExportedAt(draft.packageExportedAt||"");setPackageSubmittedAt(draft.packageSubmittedAt||"");setBuddyStatements(draft.buddyStatements||[]);
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
  useEffect(()=>{if(!user||!currentClaimId)return;let cancelled=false;fetch("/api/documents",{cache:"no-store"}).then(response=>response.json()).then((data:{documents?:DocumentRecord[]})=>{if(!cancelled)setLoadedDocuments(data.documents||[])}).catch(()=>{if(!cancelled)setLoadedDocuments([])});return()=>{cancelled=true}},[currentClaimId,user]);
  const condition = answers.condition === "Other / condition not listed" ? answers.otherCondition : answers.condition;
  const progress = Math.round(((furthestStep + 1) / steps.length) * 100);
  const documents=user&&currentClaimId?loadedDocuments:[];

  const findings=useMemo(()=>qualityFindings(answers,condition,timeline,evidenceMap),[answers,condition,timeline,evidenceMap]);
  const statementProvenance=useMemo(()=>deriveStatementProvenance(statement,answers,timeline),[statement,answers,timeline]);
  const draft=useMemo<StoredDraft>(()=>({answers,step,furthestStep,statement,statementMode,statementProvenance,timeline,evidenceMap,confirmations,documentLinks,statementVersions,packageStatus,packageStatusUpdatedAt:packageStatusUpdatedAt||undefined,packageExportedAt:packageExportedAt||undefined,packageSubmittedAt:packageSubmittedAt||undefined,buddyStatements}),[answers,step,furthestStep,statement,statementMode,statementProvenance,timeline,evidenceMap,confirmations,documentLinks,statementVersions,packageStatus,packageStatusUpdatedAt,packageExportedAt,packageSubmittedAt,buddyStatements]);
  const serializedDraft=useMemo(()=>JSON.stringify(draft),[draft]);
  useEffect(()=>{currentSnapshot.current=serializedDraft},[serializedDraft]);

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
  function persist(draftStep=step) { const value={answers,step:draftStep,furthestStep:Math.max(furthestStep,draftStep),statement,statementMode,statementProvenance,timeline,evidenceMap,confirmations,documentLinks,statementVersions,packageStatus,packageStatusUpdatedAt:packageStatusUpdatedAt||undefined,packageExportedAt:packageExportedAt||undefined,packageSubmittedAt:packageSubmittedAt||undefined,buddyStatements} satisfies StoredDraft;if(!user||!currentClaimId)localStorage.setItem("vcc-claim-draft",JSON.stringify(value));setSaved(true);return value; }
  async function saveDraft(draftStep=step) {
    const value=persist(draftStep);
    if(!user)return;
    const savedProgress=Math.round((((value.furthestStep??draftStep)+1)/steps.length)*100);
    if(currentClaimId){await queueCloudSave(currentClaimId,value,savedProgress);return}
    setCloudState("saving");setCloudError("");
    try{
      const response=await fetch("/api/claims",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:claimTitle(value),progress:savedProgress,draft:value})});
      const data=await response.json() as {claim?:{id:string;draftVersion:number};error?:string};
      if(!response.ok||!data.claim)throw new Error(data.error||"This claim could not be saved.");
      setCurrentClaimId(data.claim.id);cloudVersion.current=data.claim.draftVersion;lastCloudSnapshot.current=JSON.stringify(value);setCloudState("saved");
      window.history.replaceState(null,"",`/claim-builder?claim=${encodeURIComponent(data.claim.id)}`);
      localStorage.removeItem("vcc-claim-draft");
    }catch(reason){setCloudState("error");setCloudError(reason instanceof Error?reason.message:"This claim could not be saved.")}
  }
  function next() { const nextStep=Math.min(steps.length - 1, step + 1); persist(nextStep);setFurthestStep(value=>Math.max(value,nextStep));setStep(nextStep);scrollToTop(); }
  function back() { const previous=Math.max(0, step - 1); persist(previous); setStep(previous); setCompleted(false); scrollToTop(); }
  function goToStep(target:number){if(target>furthestStep)return;persist(target);setStep(target);setCompleted(false);scrollToTop()}
  async function finish() { await saveDraft(steps.length-1);setCompleted(true);if(user)window.location.href="/claim-package"; }
  function startNew() { if(user){window.location.href="/claim-builder?new=1";return}const saved=[...archives];if(condition)saved.push(draft);const next=saved.slice(-10);localStorage.setItem("vcc-claim-workspaces",JSON.stringify(next));setArchives(next);localStorage.removeItem("vcc-claim-draft");setAnswers(initial);setStatement("");setStatementMode("");setTimeline([]);setEvidenceMap({});setConfirmations({});setDocumentLinks({});setStatementVersions([]);setPackageStatus("planned");setPackageStatusUpdatedAt("");setPackageExportedAt("");setPackageSubmittedAt("");setBuddyStatements([]);setStep(0);setFurthestStep(0);setSaved(false);setCompleted(false);window.history.replaceState(null,"","/claim-builder?new=1");scrollToTop(); }
  function openArchive(index:number){const selected=archives[index];if(!selected)return;const remaining=archives.filter((_,item)=>item!==index);if(condition)remaining.push(draft);localStorage.setItem("vcc-claim-workspaces",JSON.stringify(remaining.slice(-10)));setArchives(remaining.slice(-10));setAnswers({...initial,...selected.answers});setStep(Math.min(selected.step,steps.length-1));setFurthestStep(Math.min(selected.furthestStep??selected.step,steps.length-1));setStatement(selected.statement||"");setStatementMode(selected.statementMode||"");setTimeline(selected.timeline||[]);setEvidenceMap(normalizeEvidenceMap(selected.evidenceMap));setConfirmations(selected.confirmations||{});setDocumentLinks(selected.documentLinks||{});setStatementVersions(selected.statementVersions||[]);setPackageStatus(selected.packageStatus||"planned");setPackageStatusUpdatedAt(selected.packageStatusUpdatedAt||"");setPackageExportedAt(selected.packageExportedAt||"");setPackageSubmittedAt(selected.packageSubmittedAt||"");setBuddyStatements(selected.buddyStatements||[]);setCompleted(false);setSaved(true);scrollToTop()}
  const statementSections=statement.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
  const statementVerified=statementSections.length>0&&statementSections.every((_,index)=>confirmations[String(index)]);
  const canContinue = step === 0 ? Boolean(condition.trim()) : step === 1 ? Boolean(answers.claimType) : step === 2 ? Boolean(answers.intentToFileStatus) : step === steps.length-1 ? statementVerified : true;
  const optionalStepEmpty=(step===4&&!answers.branch&&!answers.role&&!answers.exposures)||(step===5&&!timeline.length)||(step===6&&!answers.treatment&&!answers.providers)||(step===7&&!answers.evidence.length&&!Object.keys(evidenceMap).length);
  const continueLabel=step===8?"Continue to statement":step===9?"Continue to verification":optionalStepEmpty?"Skip for now":"Continue";

  if(cloudState==="loading")return <div className="builder-wrap"><div className="cloud-loading"><LoaderCircle className="spin" size={22}/><strong>Opening your saved claim…</strong></div></div>;
  const saveLabel=user?(cloudState==="saving"?"Saving…":cloudState==="saved"?"Saved to account":cloudState==="error"?"Try saving again":currentClaimId?"Save changes":"Save to account"):(saved?"Saved on this device":"Save for later");
  return <div className="builder-wrap">
    <header className="builder-header"><div><span className="kicker">Claim preparation</span><h1>{condition || "Tell us what you’re preparing for"}</h1><p>Your answers create an organizing checklist. They do not determine whether a condition is service connected.</p>{!user&&archives.length>0&&<label className="workspace-switcher"><span>Other condition workspaces</span><select defaultValue="" onChange={event=>{if(event.target.value)openArchive(Number(event.target.value))}}><option value="">Open a saved condition…</option>{archives.map((draft,index)=><option value={index} key={`${draft.answers.condition}-${index}`}>{draft.answers.condition==="Other / condition not listed"?draft.answers.otherCondition:draft.answers.condition||`Draft ${index+1}`}</option>)}</select></label>}</div><button className="save-button" onClick={()=>void saveDraft()} disabled={cloudState==="saving"}>{user?<Cloud size={16}/>:<Save size={16}/>} {saveLabel}</button></header>
    {!user&&<div className="cloud-save-prompt"><CloudOff size={18}/><div><strong>This draft is only on this device</strong><p>Sign in to save it securely to your account and continue on another device.</p></div><a className="button secondary" href="/login?redirectTo=/claim-builder">Sign in to save</a></div>}
    {cloudError&&<div className="cloud-save-error" role="alert"><AlertTriangle size={16}/><span>{cloudError}</span></div>}
    <div className="builder-progress"><div><span>Step {step + 1} of {steps.length}</span><strong>{steps[step]}</strong></div><span>{progress}%</span><div className="builder-progress-track" role="progressbar" aria-label="Questionnaire completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:`${progress}%`}}/></div></div>
    <div className="builder-layout">
      <aside className="step-list" aria-label="Questionnaire progress">{steps.map((label,i)=><button type="button" disabled={i>furthestStep} aria-current={i===step?"step":undefined} aria-label={`Step ${i+1} of ${steps.length}: ${label}${i>furthestStep?" (not yet available)":i<furthestStep?" (completed)":""}`} onClick={()=>goToStep(i)} className={`${i===step?"current":""} ${i<furthestStep?"done":""}`} key={label}><span aria-hidden="true">{i<furthestStep?<Check size={13}/>:i+1}</span><small>{label}</small></button>)}</aside>
      <section className="question-card">
        {step===0&&<div className="builder-orientation"><Info size={17}/><div><strong>Before you begin</strong><p>Work on one condition at a time. You can save and return later, leave optional sections blank, and add documents at any point.</p><ul><li>Questions appear in short sections.</li><li>Approximate dates are okay when clearly identified.</li><li>Debrief will ask for any essential missing facts before drafting.</li></ul></div></div>}
        {step===0 && <ConditionStep answers={answers} update={update}/>}
        {step===1 && <ChoiceStep title="What kind of claim are you preparing?" help="Choose the path that best describes this condition. You can revise it later." value={answers.claimType} onChange={v=>update("claimType",v)} options={[["Original or new claim","This is a condition you have not previously claimed."],["Increased-rating claim","A service-connected condition has worsened."],["Secondary claim","A new condition may be linked to an existing service-connected condition."],["Not sure yet","Continue gathering information before choosing a path."]]}/>}
        {step===2 && <><IntentToFileQuestion answers={answers} update={update}/><ClaimPathStep answers={answers} update={update}/></>}
        {step===3 && <HealthStep answers={answers} condition={condition} update={update}/>}
        {step===4 && <ServiceStep answers={answers} update={update}/>}
        {step===5 && <TimelineStep timeline={timeline} setTimeline={value=>{setTimeline(value);setSaved(false);setConfirmations({})}} answers={answers}/>}
        {step===6 && <TreatmentStep answers={answers} update={update}/>}
        {step===7 && <EvidenceStep answers={answers} condition={condition} update={update} evidenceMap={evidenceMap} setEvidenceMap={value=>{setEvidenceMap(value);setSaved(false)}} documents={documents} currentClaimId={currentClaimId} documentLinks={documentLinks} setDocumentLinks={value=>{setDocumentLinks(value);setSaved(false)}}/>}
        {step===8 && <Review answers={answers} condition={condition} timeline={timeline} evidenceMap={evidenceMap} findings={findings} onGoToStep={goToStep}/>}
        {step===9 && <StatementStep answers={answers} condition={condition} timeline={timeline} update={update} statement={statement} setStatement={value=>{setStatement(value);setConfirmations({});setSaved(false);setCompleted(false)}} mode={statementMode} setMode={setStatementMode} versions={statementVersions} setVersions={setStatementVersions} provenance={statementProvenance} evidenceMap={evidenceMap} documents={documents} documentLinks={documentLinks}/>}
        {step===10 && <VerifyExport statement={statement} condition={condition} answers={answers} timeline={timeline} evidenceMap={evidenceMap} findings={findings} confirmations={confirmations} setConfirmations={setConfirmations} documents={documents} documentLinks={documentLinks} provenance={statementProvenance} onExport={()=>{const now=new Date().toISOString();setPackageStatus("exported");setPackageStatusUpdatedAt(now);setPackageExportedAt(now)}}/>}
        {completed && <div className="save-confirmation" role="status" aria-live="polite"><Check size={18}/><div><strong>{user?"Claim saved to your account":"Summary saved on this device"}</strong><p>You can return later to review or update these answers.</p></div></div>}
        <div className="builder-actions">{step>0?<button className="button secondary" onClick={back}><ArrowLeft size={16}/>Back</button>:<a className="button secondary" href="/dashboard">Cancel</a>}<button className="button primary" disabled={!canContinue} onClick={step===steps.length-1?finish:next}>{step===steps.length-1?(user?"Add to claim package":completed?"Saved on this device":statement?"Save statement":"Save draft"):continueLabel}{step<steps.length-1&&<ArrowRight size={16}/>}</button></div>
        {completed && <div className="summary-next-actions"><a className="text-action" href="/dashboard">Return to dashboard <ArrowRight size={14}/></a><button type="button" onClick={startNew}>Add another condition</button></div>}
      </section>
      <aside className="builder-context" aria-label="Current claim preparation status">
        <header><span>Preparation picture</span><strong>{progress}% organized</strong></header>
        <dl>
          <div><dt>Current section</dt><dd>{steps[step]}</dd></div>
          <div><dt>Condition</dt><dd>{condition || "Not selected yet"}</dd></div>
          <div><dt>Save status</dt><dd>{saveLabel}</dd></div>
        </dl>
        <section><h2>What happens here</h2><p>{stepGuidance[step]}</p></section>
        <section className="builder-context-caution"><h2>You stay in control</h2><p>Nothing is submitted to VA from this page. Review every statement and decide what to keep.</p></section>
      </aside>
    </div>
    <div className="builder-note"><Info size={17}/><p><strong>Fictional alpha scenarios only.</strong> Do not enter real health or identifying information. This self-directed tool organizes what you provide; it does not represent you, determine eligibility, or submit anything to VA.</p></div>
  </div>;
}

type Update = <K extends keyof Answers>(key:K,value:Answers[K])=>void;
function OptionalLayer({title,summary,children}:{title:string;summary:string;children:React.ReactNode}){return <details className="optional-layer"><summary><span><strong>{title}</strong><small>{summary}</small></span><Plus size={16}/></summary><div className="optional-layer-body">{children}</div></details>}
function ConditionStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">First, choose a condition</span><h2>What condition or health issue are you preparing for?</h2><p className="question-help">The list is a starting point, not an official or complete list of claimable conditions.</p><label className="field"><span>Condition</span><select value={answers.condition} onChange={e=>update("condition",e.target.value)}><option value="">Select a condition…</option>{conditionGroups.map(g=><optgroup label={g.label} key={g.label}>{g.options.map(o=><option key={o}>{o}</option>)}</optgroup>)}</select></label>{answers.condition==="Other / condition not listed"&&<label className="field"><span>Condition or health issue</span><input autoFocus value={answers.otherCondition} onChange={e=>update("otherCondition",e.target.value)} placeholder="Enter the condition in your own words"/></label>}</> }
function ChoiceStep({title,help,value,onChange,options}:{title:string;help:string;value:string;onChange:(v:string)=>void;options:string[][]}) { return <><span className="question-number">Choose one</span><h2>{title}</h2><p className="question-help">{help}</p><div className="choice-list">{options.map(([name,desc])=><label className={value===name?"selected":""} key={name}><input type="radio" name="choice" checked={value===name} onChange={()=>onChange(name)}/><span><strong>{name}</strong><small>{desc}</small></span></label>)}</div></> }
function IntentToFileQuestion({answers,update}:{answers:Answers;update:Update}){
  const options:Array<[IntentToFileStatus,string,string]>=[
    ["submitted","Yes - I submitted one","Record the date VA received or confirmed it, if known."],
    ["online_started","I started an eligible disability claim online","VA says starting certain forms online can automatically notify VA of an intent to file."],
    ["not_submitted","No","Review the official options before delaying a claim."],
    ["not_sure","I’m not sure","Check your VA confirmation or saved online application."],
  ];
  const showDate=answers.intentToFileStatus==="submitted"||answers.intentToFileStatus==="online_started";
  return <section className="intent-to-file">
    <span className="question-number">Filing timeline</span>
    <h2>Have you submitted an intent to file for disability compensation?</h2>
    <p>This can preserve a potential effective date if VA receives the completed claim within one year. VA, not Debrief, determines the effective date and whether retroactive payments apply.</p>
    <div className="choice-list compact">{options.map(([value,label,description])=><label className={answers.intentToFileStatus===value?"selected":""} key={value}><input type="radio" name="intent-to-file" checked={answers.intentToFileStatus===value} onChange={()=>{update("intentToFileStatus",value);if(value!=="submitted"&&value!=="online_started")update("intentToFileDate","")}}/><span><strong>{label}</strong><small>{description}</small></span></label>)}</div>
    {showDate&&<label className="field intent-date"><span>{answers.intentToFileStatus==="online_started"?"Date you started the online claim":"Date VA received or confirmed the intent"} <small>Optional if unknown</small></span><input type="date" value={answers.intentToFileDate} onChange={event=>update("intentToFileDate",event.target.value)}/></label>}
    <div className="intent-guidance"><Info size={16}/><p>One active intent generally applies to the benefit type, not separately to each condition. <a href="https://www.va.gov/resources/your-intent-to-file-a-va-claim/" target="_blank" rel="noreferrer">Review VA’s intent-to-file guidance</a> or <a href="https://www.va.gov/forms/21-0966/" target="_blank" rel="noreferrer">VA Form 21-0966</a>. Debrief does not submit an intent or claim.</p></div>
  </section>;
}
function ClaimPathStep({answers,update}:{answers:Answers;update:Update}){return <><span className="question-number">{answers.claimType}</span><h2>Tell us what this claim path needs to explain</h2><p className="question-help">Start with the essential facts. Open the supporting-detail layer only when it is useful.</p>{answers.claimType==="Increased-rating claim"?<><label className="field"><span>What has worsened since the prior decision?</span><textarea value={answers.worsening} onChange={e=>update("worsening",e.target.value)} placeholder="Compare symptoms, function, treatment, devices, or work effects"/></label><label className="field"><span>When did you notice the worsening?</span><input value={answers.worseningDate} onChange={e=>update("worseningDate",e.target.value)} placeholder="Approximate month/year"/></label><OptionalLayer title="Add prior-decision details" summary="Decision date and previous evaluation"><div className="field-row"><label className="field"><span>Prior decision date</span><input value={answers.previousDecision} onChange={e=>update("previousDecision",e.target.value)} placeholder="Approximate date"/></label><label className="field"><span>Previous evaluation, if known</span><input value={answers.previousEvaluation} onChange={e=>update("previousEvaluation",e.target.value)} placeholder="For example, 10%"/></label></div></OptionalLayer></>:answers.claimType==="Secondary claim"?<><label className="field"><span>Existing service-connected condition</span><input value={answers.primaryCondition} onChange={e=>update("primaryCondition",e.target.value)} placeholder="Condition you believe is related"/></label><label className="field"><span>What have you observed about the relationship?</span><textarea value={answers.secondaryRelationship} onChange={e=>update("secondaryRelationship",e.target.value)} placeholder="Describe sequence, symptoms, treatment, or aggravation without making a medical conclusion"/></label><OptionalLayer title="Add clinician context" summary="Optional discussion or documentation"><label className="field"><span>Has a clinician discussed this relationship?</span><textarea value={answers.clinicianDiscussion} onChange={e=>update("clinicianDiscussion",e.target.value)} placeholder="Who, when, and what was documented or discussed"/></label></OptionalLayer></>:<><label className="field"><span>What event, injury, illness, duty, or exposure do you believe is relevant?</span><textarea value={answers.serviceEvent} onChange={e=>update("serviceEvent",e.target.value)} placeholder="Include approximate date, location, unit, and what happened"/></label><OptionalLayer title="Add continuity details" summary="Optional history between onset and today"><label className="field"><span>How did symptoms continue after that point?</span><textarea value={answers.continuity} onChange={e=>update("continuity",e.target.value)} placeholder="Treatment, recurring symptoms, gaps in care, and important changes"/></label></OptionalLayer></>}</>}
function HealthStep({answers,condition,update}:{answers:Answers;condition:string;update:Update}) { const prompts=conditionPrompts(condition);return <><span className="question-number">Current impact</span><h2>Describe what the condition is like now</h2><p className="question-help">Three useful answers are enough to continue. More detailed layers are available below.</p><label className="field"><span>Main symptoms or limitations</span><textarea value={answers.symptoms} onChange={e=>update("symptoms",e.target.value)} placeholder="What you experience and what becomes difficult"/></label><label className="field"><span>When did symptoms begin?</span><input value={answers.onset} onChange={e=>update("onset",e.target.value)} placeholder="Approximate month/year or period of service"/></label><label className="field"><span>One concrete example</span><textarea value={answers.specificExamples} onChange={e=>update("specificExamples",e.target.value)} placeholder="A workday, household task, activity, safety issue, or observation"/></label><OptionalLayer title="Add symptom pattern" summary="Frequency, duration, flare-ups, work and daily impact"><div className="field-row"><label className="field"><span>How often?</span><input value={answers.symptomFrequency} onChange={e=>update("symptomFrequency",e.target.value)} placeholder="Per day, week, or month"/></label><label className="field"><span>How long?</span><input value={answers.symptomDuration} onChange={e=>update("symptomDuration",e.target.value)} placeholder="Minutes, hours, days, or continuous"/></label></div><label className="field"><span>Flare-ups or repeated-use effects</span><textarea value={answers.flareUps} onChange={e=>update("flareUps",e.target.value)} placeholder="Triggers, frequency, duration, recovery, and added limitations"/></label><div className="field-row"><label className="field"><span>Effects on work or school</span><textarea value={answers.workImpact} onChange={e=>update("workImpact",e.target.value)} placeholder="Interrupted tasks, absences, accommodations, or reliability"/></label><label className="field"><span>Effects on daily activity</span><textarea value={answers.dailyImpact} onChange={e=>update("dailyImpact",e.target.value)} placeholder="Mobility, sleep, relationships, self-care, driving, or chores"/></label></div></OptionalLayer><OptionalLayer title={`Add ${condition} details`} summary="Condition-specific questions"><div className="adaptive-questions">{prompts.map(prompt=><label className="field" key={prompt.key}><span>{prompt.label}</span><textarea value={answers[prompt.key]} onChange={e=>update(prompt.key,e.target.value)} placeholder={prompt.placeholder}/></label>)}</div></OptionalLayer><OptionalLayer title="Add medical evaluation" summary="Optional diagnosis and clinician context"><label className="field"><span>Current diagnosis or evaluation, if any</span><input value={answers.diagnosis} onChange={e=>update("diagnosis",e.target.value)} placeholder="Diagnosis, clinician, and approximate date"/></label></OptionalLayer></> }
function ServiceStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">Service context</span><h2>Add only the service details that matter here</h2><p className="question-help">The relevant event is already captured in the claim-path step. These details provide context and can be skipped if they do not apply.</p><OptionalLayer title="Add service profile" summary="Branch and military role"><div className="field-row"><label className="field"><span>Branch</span><select value={answers.branch} onChange={e=>update("branch",e.target.value)}><option value="">Select…</option>{["Army","Marine Corps","Navy","Air Force","Space Force","Coast Guard","National Guard","Reserves","Other uniformed service"].map(x=><option key={x}>{x}</option>)}</select></label><label className="field"><span>MOS, rate, AFSC, or role</span><input value={answers.role} onChange={e=>update("role",e.target.value)} placeholder="Your primary duties"/></label></div></OptionalLayer><OptionalLayer title="Add exposure history" summary="Only if relevant to this condition"><label className="field"><span>Possible toxic or environmental exposures</span><textarea value={answers.exposures} onChange={e=>update("exposures",e.target.value)} placeholder="Burn pits, airborne hazards, chemicals, contaminated water, noise, or other exposures"/></label></OptionalLayer><p className="layer-skip-note"><Check size={14}/>You can continue without opening either section.</p></> }
function TreatmentStep({answers,update}:{answers:Answers;update:Update}) { return <><span className="question-number">Treatment</span><h2>What care have you received?</h2><p className="question-help">A brief summary is enough. Add provider details only when they help you review the draft.</p><label className="field"><span>Current and past treatment</span><textarea value={answers.treatment} onChange={e=>update("treatment",e.target.value)} placeholder="Medications, therapy, procedures, devices, tests, or other care"/></label><OptionalLayer title="Add providers and facilities" summary="Optional names and approximate dates"><label className="field"><span>Providers and facilities</span><textarea value={answers.providers} onChange={e=>update("providers",e.target.value)} placeholder="Facility or clinician names and approximate dates"/></label></OptionalLayer></> }
function TimelineStep({timeline,setTimeline,answers}:{timeline:TimelineEvent[];setTimeline:(events:TimelineEvent[])=>void;answers:Answers}){const add=()=>setTimeline([...timeline,{id:crypto.randomUUID(),date:"",title:"",details:"",source:"",approximate:true}]);const update=(id:string,key:keyof TimelineEvent,value:string|boolean)=>setTimeline(timeline.map(event=>event.id===id?{...event,[key]:value}:event));return <><span className="question-number">Optional chronology</span><h2>Build a short condition timeline</h2><p className="question-help">This step is optional. Let Debrief suggest events from your answers, add your own, or use “Skip for now.” Exact dates are not required. Mark estimates as approximate.</p><div className="timeline-actions"><button type="button" onClick={()=>setTimeline(suggestedTimeline(answers))}>Build suggestions from my answers</button><button type="button" onClick={add}><Plus size={14}/>Add event</button></div><div className="timeline-editor">{timeline.map((event,index)=><article key={event.id}><header><strong>Event {index+1}</strong><button type="button" aria-label="Remove event" onClick={()=>setTimeline(timeline.filter(item=>item.id!==event.id))}><Trash2 size={14}/></button></header><div className="field-row"><label className="field"><span>Date or period</span><input value={event.date} onChange={e=>update(event.id,"date",e.target.value)} placeholder="Month/year or service period"/></label><label className="field"><span>Event title</span><input value={event.title} onChange={e=>update(event.id,"title",e.target.value)} placeholder="Symptoms began, treatment, worsening…"/></label></div><label className="field"><span>What happened?</span><textarea value={event.details} onChange={e=>update(event.id,"details",e.target.value)} placeholder="Brief factual description"/></label><div className="field-row"><label className="field"><span>What supports this event? <small>Optional</small></span><input value={event.source} onChange={e=>update(event.id,"source",e.target.value)} placeholder="For example: my recollection, a record, a log, or a witness"/></label><label className="approx-check"><input type="checkbox" checked={event.approximate} onChange={e=>update(event.id,"approximate",e.target.checked)}/>Date is approximate</label></div></article>)}{!timeline.length&&<div className="empty-workspace">No timeline events added. You may skip this step and return later.</div>}</div></>}
function EvidenceStep({answers,condition,update,evidenceMap,setEvidenceMap,documents,currentClaimId,documentLinks,setDocumentLinks}:{answers:Answers;condition:string;update:Update;evidenceMap:EvidenceMap;setEvidenceMap:(map:EvidenceMap)=>void;documents:DocumentRecord[];currentClaimId:string;documentLinks:Record<string,string[]>;setDocumentLinks:(value:Record<string,string[]>)=>void}) {
  const toggle=(value:string)=>update("evidence",answers.evidence.includes(value)?answers.evidence.filter(item=>item!==value):[...answers.evidence,value]);
  const recordOptions=evidenceOptions.filter(option=>option!=="Personal statement"&&option!=="Buddy or witness statement");
  const updateLink=(id:string,status:EvidenceStatus,source="")=>setEvidenceMap({...evidenceMap,[id]:{status,source}});
  const updateSource=(id:string,status:EvidenceStatus,source:string)=>{if(status==="record_available"&&source&&!answers.evidence.includes(source))update("evidence",[...answers.evidence,source]);updateLink(id,status,source)};
  const toggleDocument=(factId:string,documentId:string)=>{const current=documentLinks[factId]||[];const next=current.includes(documentId)?current.filter(id=>id!==documentId):[...current,documentId];setDocumentLinks({...documentLinks,[factId]:next})};
  return <><span className="question-number">Evidence</span><h2>What supporting information do you have?</h2><p className="question-help">Select any types you already have. This step can be updated later, and you do not need an uploaded document to continue.</p><div className="check-grid">{evidenceOptions.map(option=><label className={answers.evidence.includes(option)?"checked":""} key={option}><input type="checkbox" checked={answers.evidence.includes(option)} onChange={()=>toggle(option)}/><span>{option}</span></label>)}</div><OptionalLayer title="Show what supports each important fact" summary="Optional: choose a record, your recollection, a witness, a record you still need, or none"><div className="evidence-map"><h3><Link2 size={16}/>Support for each important fact</h3><p className="evidence-map-help">For each fact, choose where the information came from. One file may support more than one fact or condition.</p>{factRows(answers,condition).map(row=>{const link=evidenceMap[row.id]||emptyEvidenceLink;const status=evidenceStatuses.find(item=>item.value===link.status);const linked=documentLinks[row.id]||[];return <div className="evidence-fact" key={row.id}><div className="evidence-fact-heading"><span><strong>{row.fact}</strong><small>Suggested: {row.suggested}</small></span><div className="evidence-link-controls"><select aria-label={`What supports ${row.fact}`} value={link.status} onChange={event=>updateLink(row.id,event.target.value as EvidenceStatus)}>{evidenceStatuses.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</select>{(link.status==="record_available"||link.status==="record_not_obtained")&&<select aria-label={`Record type for ${row.fact}`} value={link.source} onChange={event=>updateSource(row.id,link.status,event.target.value)}><option value="">Select record type…</option>{recordOptions.map(option=><option key={option}>{option}</option>)}</select>}<small>{status?.description}</small></div></div>{documents.length?<div className="document-link-list"><strong>Uploaded files that support this fact</strong>{documents.map(document=><label className={linked.includes(document.id)?"linked":""} key={document.id}><input type="checkbox" checked={linked.includes(document.id)} onChange={()=>toggleDocument(row.id,document.id)}/><span>{document.originalName}{document.claimId!==currentClaimId?" · another condition workspace":""}</span></label>)}</div>:<p className="no-linked-documents">No files are uploaded. You may choose your recollection or a witness, skip this detail, or add fictional test files later in Document Upload.</p>}</div>})}</div></OptionalLayer></>;
}
function Review({answers,condition,timeline,evidenceMap,findings,onGoToStep}:{answers:Answers;condition:string;timeline:TimelineEvent[];evidenceMap:EvidenceMap;findings:ReturnType<typeof qualityFindings>;onGoToStep:(step:number)=>void}) {
  const facts=factRows(answers,condition);
  const gaps=statementGaps(answers);
  const supported=facts.filter(row=>hasSupportingInformation(evidenceMap[row.id])).length;
  const available=facts.filter(row=>hasAvailableRecord(evidenceMap[row.id])).length;
  const pendingFacts=facts.filter(row=>evidenceMap[row.id]?.status==="record_not_obtained");
  const required=findings.filter(item=>item.level==="required");
  const resolvedFindingIds=new Set(gaps.flatMap(gap=>gap.field==="specificExamples"?["example"]:gap.field==="serviceEvent"?["service"]:gap.field==="primaryCondition"||gap.field==="secondaryRelationship"?["secondary"]:[gap.field]));
  const checks=findings.filter(item=>item.level==="check");
  const improvements=findings.filter(item=>item.level==="improve"&&!item.id.startsWith("evidence"));
  return <><span className="question-number">Readiness review</span><h2>See what is ready and what still needs attention</h2><p className="question-help">This review separates missing statement facts from optional improvements and records you are still organizing. It does not predict a claim result.</p>
    <div className="review-grid"><Summary label="Condition" value={condition}/><Summary label="Claim path" value={answers.claimType}/><Summary label="Intent to file" value={intentToFileLabel(answers.intentToFileStatus)}/><Summary label="Potential date recorded" value={answers.intentToFileDate}/><Summary label="Support identified" value={`${supported} of ${facts.length}`}/><Summary label="Available records" value={String(available)}/><Summary label="Records pending" value={String(pendingFacts.length)}/><Summary label="Timeline events" value={String(timeline.length)}/></div>
    <div className="review-section intent-review"><h3>Intent-to-file checkpoint</h3><p>{answers.intentToFileStatus==="submitted"?`You recorded that an intent was submitted${answers.intentToFileDate?` with a date of ${answers.intentToFileDate}`:" without a confirmed date"}. Verify the VA confirmation and the one-year claim deadline.`:answers.intentToFileStatus==="online_started"?`You recorded that an eligible online disability claim was started${answers.intentToFileDate?` on ${answers.intentToFileDate}`:" without a start date"}. Verify the potential effective date shown by VA.`:answers.intentToFileStatus==="not_submitted"?"You recorded that an intent has not been submitted. Review the official VA guidance before delaying the claim.":"You were not sure whether VA has an active intent. Check VA.gov or your confirmation before relying on a potential date."} This checkpoint does not establish entitlement or guarantee retroactive payment.</p><a href="https://www.va.gov/resources/your-intent-to-file-a-va-claim/" target="_blank" rel="noreferrer">Open official VA guidance</a></div>
    <div className={`readiness-banner ${gaps.length?"needs-work":"ready"}`}>{gaps.length?<AlertTriangle size={18}/>:<Check size={18}/>}<div><strong>{gaps.length?"More information is needed before drafting":"Ready to draft your personal statement"}</strong><p>{gaps.length?`${gaps.length} focused ${gaps.length===1?"answer is":"answers are"} still needed. You can use the section list to return to earlier questions.`:"The essential statement facts are present. Review the checks below, then continue when the wording is accurate."}</p></div></div>
    <div className="review-section must-resolve"><h3>Must resolve before drafting</h3>{gaps.length?<ul>{gaps.map(item=><li key={item.field}><div><strong>{item.question}</strong><small>{item.reason}</small></div><button type="button" onClick={()=>onGoToStep(reviewStepForField(item.field))}>Answer now</button></li>)}</ul>:<p>Nothing is currently blocking the guided statement draft.</p>}{required.filter(item=>!resolvedFindingIds.has(item.id)).map(item=><article key={item.id}><AlertTriangle size={14}/><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}</div>
    <div className="review-section"><h3>Review carefully</h3>{checks.length?<div className="quality-list compact">{checks.map(item=><article className={item.level} key={item.id}><AlertTriangle size={15}/><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}</div>:<p>No wording conflicts or caution flags were detected. You should still verify every fact yourself.</p>}</div>
    <details className="review-more"><summary><span><strong>Optional improvements and evidence details</strong><small>{improvements.length} suggested {improvements.length===1?"improvement":"improvements"} · {pendingFacts.length} pending {pendingFacts.length===1?"record":"records"}</small></span><Plus size={16}/></summary><div className="review-more-body">
      {improvements.length>0&&<div className="review-section"><h3>Could make the statement stronger</h3><div className="quality-list compact">{improvements.map(item=><article className={item.level} key={item.id}><Info size={15}/><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}</div></div>}
      <div className="review-section evidence-organizing"><h3>Evidence being organized</h3><p>{supported} of {facts.length} major facts have supporting information identified. {available} {available===1?"record is":"records are"} marked available now.</p>{pendingFacts.length?<><strong>{pendingFacts.length} {pendingFacts.length===1?"record is":"records are"} still pending:</strong><ul>{pendingFacts.map(row=><li key={row.id}>{row.fact}</li>)}</ul></>:<p>No records are currently marked as pending. This does not mean every useful record has been located.</p>}</div>
    </div></details>
  </>;
}
function Summary({label,value}:{label:string;value:string}) { return <div><span>{label}</span><strong>{value||"Not answered yet"}</strong></div> }

function reviewStepForField(field:StatementField){
  return (["serviceEvent","primaryCondition","secondaryRelationship","worsening","worseningDate"] as StatementField[]).includes(field)?2:3;
}

function StatementStep({answers,condition,timeline,update,statement,setStatement,mode,setMode,versions,setVersions,provenance,evidenceMap,documents,documentLinks}:{answers:Answers;condition:string;timeline:TimelineEvent[];update:Update;statement:string;setStatement:(value:string)=>void;mode:StatementMode;setMode:(mode:StatementMode)=>void;versions:StatementVersion[];setVersions:React.Dispatch<React.SetStateAction<StatementVersion[]>>;provenance:StatementProvenance;evidenceMap:EvidenceMap;documents:DocumentRecord[];documentLinks:Record<string,string[]>}){
  const [generating,setGenerating]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [copied,setCopied]=useState(false);
  const [consent,setConsent]=useState(false);
  const [compareVersionId,setCompareVersionId]=useState("");
  const [aiConfigured,setAiConfigured]=useState<boolean|null>(null);
  const [modelQuestions,setModelQuestions]=useState<Array<{field:StatementField;question:string;reason:string;originalValue:string}>>([]);
  const gaps=statementGaps(answers);
  const modelQuestionsAnswered=modelQuestions.every(item=>Boolean(answers[item.field].trim())&&answers[item.field]!==item.originalValue);
  const canGenerate=Boolean(condition&&!gaps.length&&modelQuestionsAnswered);
  const comparisonVersion=versions.find(version=>version.id===compareVersionId);
  const addVersion=(content:string,versionMode:"ai"|"template"|"edited")=>{if(!content.trim())return;setVersions(current=>{const existing=current[current.length-1];if(existing?.content===content)return current;return[...current,{id:crypto.randomUUID(),content,mode:versionMode,createdAt:new Date().toISOString(),provenance:deriveStatementProvenance(content,answers,timeline)}].slice(-20)})};
  useEffect(()=>{let cancelled=false;fetch("/api/ai/personal-statement",{cache:"no-store"}).then(response=>response.json()).then((data:{configured?:boolean})=>{if(!cancelled)setAiConfigured(Boolean(data.configured))}).catch(()=>{if(!cancelled)setAiConfigured(false)});return()=>{cancelled=true}},[]);
  async function generate(){
    setGenerating(true);setError("");setNotice("");setCopied(false);setModelQuestions([]);
    try{
      const response=await fetch("/api/ai/personal-statement",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...answers,condition,timeline})});
      const data=await response.json() as {status?:"ready"|"needs_information";statement?:string;mode?:"ai"|"template";notice?:string;questions?:Array<{field:StatementField;question:string;reason:string}>;error?:string};
      if(!response.ok)throw new Error(data.error||"The statement could not be generated.");
      if(data.status==="needs_information"){setModelQuestions((data.questions||[]).map(item=>({...item,originalValue:answers[item.field]})));setNotice(data.notice||"A few details are needed before a reliable statement can be drafted.");return}
      if(!data.statement)throw new Error(data.error||"The statement could not be generated.");
      setStatement(data.statement);setMode(data.mode||"ai");addVersion(data.statement,data.mode||"ai");setNotice(data.notice||"");
    }catch(reason){setError(reason instanceof Error?reason.message:"The statement could not be generated.")}
    finally{setGenerating(false)}
  }
  async function copy(){await navigator.clipboard.writeText(statement);setCopied(true);setTimeout(()=>setCopied(false),1800)}
  function download(){const blob=new Blob([statement],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`${condition.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"claim"}-personal-statement.txt`;link.click();URL.revokeObjectURL(url)}
  function restore(version:StatementVersion){if(statement!==version.content&&!window.confirm("Replace the current editor text with this saved version?"))return;setStatement(version.content);setMode("edited")}
  const modeLabel=mode==="ai"?"AI-assisted draft":mode==="template"?"Guided narrative draft":mode==="stale"?"Answers changed. Regenerate or review carefully":mode==="edited"?"Edited draft":"Draft";
  const followUps:Array<{field:StatementField;question:string;reason:string;placeholder?:string;multiline?:boolean;originalValue?:string}>=modelQuestions.length?modelQuestions:gaps;
  return <><span className="question-number">Personal statement</span><h2>Turn your answers into a cohesive first-person draft</h2><p className="question-help">Debrief checks for the smallest missing facts first. It will not fill gaps or invent details.</p>
    <div className={`ai-disclosure ${aiConfigured===false?"template-mode":""}`}><Sparkles size={18}/><div><strong>{aiConfigured===false?"Guided narrative mode. OpenAI is not connected":"AI drafting assistance"}</strong><p>{aiConfigured===false?"This mode uses fixed rules to organize your answers into a chronological draft. It does not interpret records, verify facts, or add information. Connect an API key later for AI-assisted rewriting.":"When connected, AI may organize and rephrase your facts, but it cannot verify events, diagnose a condition, determine service connection, or predict a rating."}</p></div></div>
    <label className="field"><span>Name to display on the draft <small>Optional. Do not enter an SSN or VA file number</small></span><input value={answers.statementName} onChange={event=>update("statementName",event.target.value)} placeholder="Your full name" maxLength={120}/></label>
    {followUps.length>0&&<div className="draft-followups"><div className="draft-followups-head"><Info size={16}/><div><strong>{modelQuestions.length?"The drafting assistant needs clarification":"Answer these before drafting"}</strong><p>Only questions needed for a grounded, useful statement are shown.</p></div></div>{followUps.map(item=><label className="field" key={item.field}><span>{item.question}<small>{item.reason}</small></span>{item.multiline===false?<input value={answers[item.field]} onChange={event=>update(item.field,event.target.value)} placeholder={item.placeholder||"Answer in your own words"}/>:<textarea value={answers[item.field]} onChange={event=>update(item.field,event.target.value)} placeholder={item.placeholder||"Answer in your own words"}/>}</label>)}</div>}
    <OptionalLayer title="Add optional context" summary="Continuity or clarification that has not been captured"><label className="field"><span>How has the condition changed or continued over time?</span><textarea value={answers.continuity} onChange={event=>update("continuity",event.target.value)} placeholder="Periods of improvement or worsening, ongoing symptoms, and important changes" maxLength={4000}/></label><label className="field"><span>Anything else the draft should include?</span><textarea value={answers.additionalContext} onChange={event=>update("additionalContext",event.target.value)} placeholder="Optional context or clarification, in your own words" maxLength={4000}/></label></OptionalLayer>
    {aiConfigured&&<label className="ai-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>I understand that generating an AI-assisted draft may send my questionnaire answers to OpenAI. My optional display name is excluded.</span></label>}
    <button type="button" className="generate-statement" onClick={generate} disabled={!canGenerate||(aiConfigured===true&&!consent)||generating||aiConfigured===null}>{generating?<><RefreshCw size={16} className="spin"/>Drafting…</>:<><Sparkles size={16}/>{aiConfigured===false?(statement?"Rebuild guided narrative":"Build guided narrative"):(statement?"Regenerate cohesive draft":"Generate cohesive statement")}</>}</button>
    {error&&<p className="statement-message error" role="alert">{error}</p>}{notice&&<p className="statement-message">{notice}</p>}
    {statement&&<><div className="statement-editor"><div className="statement-editor-head"><div><span>{modeLabel}</span><small>Review and edit before downloading</small></div><div><button type="button" onClick={()=>addVersion(statement,"edited")}><History size={14}/>Save version</button><button type="button" onClick={copy}><Clipboard size={14}/>{copied?"Copied":"Copy"}</button><button type="button" onClick={download}><Download size={14}/>Download .txt</button></div></div><textarea aria-label="Editable personal statement" value={statement} onChange={event=>{setStatement(event.target.value);setMode("edited")}}/><p><Info size={13}/>Using this draft means you have reviewed it and determined that it accurately reflects your own knowledge and experience.</p></div><StatementSourcePanel provenance={provenance} evidenceMap={evidenceMap} documents={documents} documentLinks={documentLinks}/>{versions.length>0&&<details className="statement-history"><summary><History size={14}/>Revision history · {versions.length} saved {versions.length===1?"version":"versions"}</summary><div>{[...versions].reverse().map((version,index)=><article className={compareVersionId===version.id?"comparing":""} key={version.id}><div><strong>{index===0?"Most recent saved version":new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(version.createdAt))}</strong><small>{version.mode==="ai"?"AI-assisted":version.mode==="template"?"Guided narrative":"Manual revision"} · {version.content.length.toLocaleString()} characters · {statementProvenanceSummary(version.provenance).mapped} sourced statements</small></div><div className="version-actions"><button type="button" aria-pressed={compareVersionId===version.id} onClick={()=>setCompareVersionId(current=>current===version.id?"":version.id)}><Columns2 size={13}/>{compareVersionId===version.id?"Hide comparison":"Compare"}</button><button type="button" onClick={()=>restore(version)}><RotateCcw size={13}/>Restore</button></div><p>{version.content.slice(0,240)}{version.content.length>240?"…":""}</p></article>)}</div></details>}{comparisonVersion&&<RevisionComparison version={comparisonVersion} current={statement} onClose={()=>setCompareVersionId("")} onRestore={()=>restore(comparisonVersion)}/>}</>}
  </>;
}

function RevisionComparison({version,current,onClose,onRestore}:{version:StatementVersion;current:string;onClose:()=>void;onRestore:()=>void}){
  const comparison=compareStatementVersions(version.content,current);
  const savedAt=new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(version.createdAt));
  return <section className="revision-comparison" aria-labelledby="revision-comparison-heading"><header><div><span>Version comparison</span><h3 id="revision-comparison-heading">Saved version and current draft</h3><p>{comparison.identical?"These versions currently match.":`${comparison.addedWords} added and ${comparison.removedWords} removed words in the current draft.`}</p></div><button type="button" onClick={onClose} aria-label="Close version comparison"><X size={15}/>Close</button></header><div className="comparison-metrics" aria-live="polite"><span><strong>{comparison.savedWords}</strong>saved words</span><span><strong>{comparison.currentWords}</strong>current words</span><span><strong>{comparison.savedParagraphs}</strong>saved sections</span><span><strong>{comparison.currentParagraphs}</strong>current sections</span></div><div className="comparison-columns"><article><div><strong>Saved version</strong><small>{savedAt}</small></div><p>{version.content}</p></article><article className="current"><div><strong>Current draft</strong><small>Editable above</small></div><p>{current}</p></article></div><footer><p>Comparison is for review only. Restoring replaces the current editor text after confirmation.</p><button type="button" onClick={onRestore} disabled={comparison.identical}><RotateCcw size={14}/>{comparison.identical?"Already current":"Restore saved version"}</button></footer></section>;
}

function StatementSourcePanel({provenance,evidenceMap,documents,documentLinks}:{provenance:StatementProvenance;evidenceMap:EvidenceMap;documents:DocumentRecord[];documentLinks:Record<string,string[]>}){
  const summary=statementProvenanceSummary(provenance);
  return <details className={`statement-sources ${summary.unmapped?"has-warning":""}`} open={summary.unmapped>0}><summary><Link2 size={14}/><span><strong>Where each statement came from</strong><small>{summary.mapped} of {summary.total} factual statements linked to your answers or timeline</small></span></summary><div className="statement-source-list">{provenance.sentences.map(sentence=><article className={sentence.status} key={sentence.id}><p>“{sentence.text}”</p>{sentence.origins.length?<ul>{sentence.origins.map((origin,index)=>{const linkedNames=origin.factId?(documentLinks[origin.factId]||[]).map(id=>documents.find(document=>document.id===id)?.originalName).filter(Boolean):[];const evidence=origin.factId?evidenceMap[origin.factId]:undefined;return <li key={`${origin.kind}-${origin.field||origin.timelineEventId}-${index}`}><strong>{origin.label}</strong><span>{origin.excerpt}</span>{evidence&&<small>Related support: {evidence.status.replaceAll("_"," ")}{evidence.source?` - ${evidence.source}`:""}{linkedNames.length?` · Uploaded file linked to this fact: ${linkedNames.join(", ")}`:""}</small>}</li>})}</ul>:<div className="source-warning"><AlertTriangle size={14}/><span><strong>Source review needed</strong><small>This wording is not clearly traceable to a saved answer or timeline event. Revise it or add the supporting fact before export.</small></span></div>}</article>)}</div><p className="statement-source-note">A link shows where wording originated. It does not prove the fact or mean an uploaded record supports every word.</p></details>;
}

function VerifyExport({statement,condition,answers,timeline,evidenceMap,findings,confirmations,setConfirmations,documents,documentLinks,provenance,onExport}:{statement:string;condition:string;answers:Answers;timeline:TimelineEvent[];evidenceMap:EvidenceMap;findings:ReturnType<typeof qualityFindings>;confirmations:Record<string,boolean>;setConfirmations:(value:Record<string,boolean>)=>void;documents:DocumentRecord[];documentLinks:Record<string,string[]>;provenance:StatementProvenance;onExport:()=>void}){
  const [downloading,setDownloading]=useState(false);const [error,setError]=useState("");
  const sections=statement.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
  const allConfirmed=sections.length>0&&sections.every((_,index)=>confirmations[String(index)]);
  async function downloadPackage(){setDownloading(true);setError("");try{const linkedDocuments=Object.entries(documentLinks).flatMap(([factId,ids])=>ids.map(id=>({factId,documentName:documents.find(document=>document.id===id)?.originalName||"Uploaded document"})));const response=await fetch("/api/claim-package",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({condition,claimType:answers.claimType,intentToFileStatus:answers.intentToFileStatus,intentToFileDate:answers.intentToFileDate,name:answers.statementName,statement,statementProvenance:provenance,timeline,evidenceMap,selectedEvidence:answers.evidence,linkedDocuments,qualityFindings:findings})});if(!response.ok){const data=await response.json() as {error?:string};throw new Error(data.error||"The PDF could not be created.")}const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`${condition.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"claim"}-review-package.pdf`;link.click();URL.revokeObjectURL(url);onExport()}catch(reason){setError(reason instanceof Error?reason.message:"The PDF could not be created.")}finally{setDownloading(false)}}
  return <><span className="question-number">Claim package</span><h2>Verify this condition statement</h2><p className="question-help">Confirm that each section accurately reflects your own knowledge and experience. Then add this condition to your claim package, where you can work another condition, organize documents, or review common VA forms.</p>{!statement?<div className="empty-workspace"><strong>No statement draft yet</strong><p>Return to Personal statement to generate or write a draft before adding this condition to the package.</p></div>:<><StatementSourcePanel provenance={provenance} evidenceMap={evidenceMap} documents={documents} documentLinks={documentLinks}/><div className="confirmation-list">{sections.map((section,index)=><label className={confirmations[String(index)]?"confirmed":""} key={`${index}-${section.slice(0,20)}`}><input type="checkbox" checked={Boolean(confirmations[String(index)])} onChange={event=>setConfirmations({...confirmations,[String(index)]:event.target.checked})}/><span><small>{index===0?"Heading":`Section ${index}`}</small><p>{section}</p><strong>{confirmations[String(index)]?<><Check size={13}/>Confirmed accurate</>:"Review and confirm"}</strong></span></label>)}</div><div className="export-readiness"><div><strong>{sections.filter((_,index)=>confirmations[String(index)]).length} of {sections.length} sections confirmed</strong><span>{allConfirmed?"Ready to add to the claim package":"Confirm each section before downloading"}</span></div><button type="button" className="button secondary" disabled={!allConfirmed||downloading} onClick={downloadPackage}><FileDown size={16}/>{downloading?"Creating PDF…":"Download condition review PDF"}</button></div>{error&&<p className="statement-message error">{error}</p>}<div className="package-next-preview"><Clipboard size={17}/><div><strong>What happens next</strong><p>Use “Add to claim package” below. Debrief will keep this statement with its condition and show your remaining documents, statements, and next actions in one place.</p></div></div><p className="export-note"><Info size={14}/>The optional PDF is a preparation attachment, not a completed VA form and not proof of submission. Review current VA instructions before filing.</p></>}</>;
}
