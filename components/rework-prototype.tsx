"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {
  AlertTriangle,ArrowLeft,ArrowRight,BookOpenCheck,Check,CheckCircle2,ChevronDown,
  CircleHelp,ClipboardCheck,Clock3,Download,ExternalLink,Eye,FileCheck2,FileText,Files,FolderSearch,
  History,Info,LifeBuoy,Link2,ListChecks,LockKeyhole,Menu,MessageSquareText,Plus,Radar,
  RefreshCw,RotateCcw,Search,ShieldCheck,Sparkles,UploadCloud,UserRound,X
} from "lucide-react";
import {
  claimReviewIssueCount,getPackageNextAction,prototypeLeads,prototypeSources,
  type ClaimLead,type ClaimPath,type ClaimWorkspace,type DocumentRecord,type HealthEvent,
  type PrototypeScreen,type ServicePeriod,type SourceReference,type WorkspaceDraft
} from "@/lib/rework-prototype";

const buildScreens:Array<{id:PrototypeScreen;label:string;icon:typeof History}>=[
  {id:"intent",label:"Package Type",icon:ClipboardCheck},
  {id:"intake",label:"Service & Health",icon:History},
  {id:"documents",label:"My Documents",icon:Files},
  {id:"leads",label:"Claim Leads",icon:FolderSearch}
];
const storageKey="debrief.rework-preview.v2";

type SavedState={
  screen:PrototypeScreen;
  services:ServicePeriod[];
  events:HealthEvent[];
  documents:DocumentRecord[];
  sources?:SourceReference[];
  leads:ClaimLead[];
  claims:ClaimWorkspace[];
  approved:boolean;
  briefingSeen?:boolean;
  workspaceDraft?:WorkspaceDraft;
  packageKind?:ClaimPath;
  buddyDecision?:BuddyDecision;
  onboardingComplete?:boolean;
  selectedClaimId?:string|null;
};

type BuddyDecision="undecided"|"add"|"not-available"|"not-needed";

const initialWorkspaceDraft:WorkspaceDraft={
  serviceEvent:"",
  currentSymptoms:"",
  diagnosis:"",
  relationship:"",
  dailyImpact:"",
  treatmentHistory:"",
  verifiedSourceIds:[],
  statementReviewed:false
};

const packageLabels:Record<ClaimPath,string>={original:"Original disability claim",increase:"Increased-rating claim",supplemental:"Supplemental claim",contested:"Decision review",unsure:"Path not selected"};
const createDraft=():WorkspaceDraft=>({...initialWorkspaceDraft,verifiedSourceIds:[]});
const claimPaths:ClaimPath[]=["original","increase","supplemental","contested","unsure"];

export function ReworkPrototype({user}:{user:{name:string|null;localTestProfile:boolean}}){
  const [screen,setScreen]=useState<PrototypeScreen>("intent");
  const [services,setServices]=useState<ServicePeriod[]>([]);
  const [events,setEvents]=useState<HealthEvent[]>([]);
  const [documents,setDocuments]=useState<DocumentRecord[]>([]);
  const [sources,setSources]=useState<SourceReference[]>(prototypeSources);
  const [leads,setLeads]=useState<ClaimLead[]>([]);
  const [claims,setClaims]=useState<ClaimWorkspace[]>([]);
  const [packageKind,setPackageKind]=useState<ClaimPath>("unsure");
  const [approved,setApproved]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [notice,setNotice]=useState("");
  const [downloadOpen,setDownloadOpen]=useState(false);
  const [briefingOpen,setBriefingOpen]=useState(false);
  const [briefingSeen,setBriefingSeen]=useState(false);
  const [buddyDecision,setBuddyDecision]=useState<BuddyDecision>("undecided");
  const [inspectedSource,setInspectedSource]=useState<SourceReference|null>(null);
  const [followUpOpen,setFollowUpOpen]=useState(false);
  const [onboardingComplete,setOnboardingComplete]=useState(false);
  const [selectedClaimId,setSelectedClaimId]=useState<string|null>(null);
  const activeClaimId=claims.some(claim=>claim.id===selectedClaimId)?selectedClaimId:claims[0]?.id||null;
  const reviewRequiredCount=claims.reduce((total,claim)=>total+claimReviewIssueCount(claim,sources),0);

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(storageKey)||"null") as SavedState|null;
      if(saved){const completed=Boolean(saved.onboardingComplete);const savedClaims=(saved.claims||[]).map(claim=>{const legacyDraft=claim.draft||saved.workspaceDraft||createDraft();return {...claim,path:claimPaths.includes(claim.path)?claim.path:"original" as ClaimPath,milestone:claim.milestone||"Foundation captured",draft:{...createDraft(),...legacyDraft,verifiedSourceIds:legacyDraft.verifiedSourceIds||[]}}});setScreen(completed?"dashboard":saved.screen||"intent");setServices((saved.services||[]).map(item=>({...item,service:item.service||"Service branch not entered"})));setEvents((saved.events||[]).map(item=>({...item,care:item.care||"",impact:item.impact||""})));setDocuments(saved.documents||[]);setSources(saved.sources||prototypeSources);setLeads(saved.leads||[]);setClaims(savedClaims);setPackageKind(saved.packageKind&&claimPaths.includes(saved.packageKind)?saved.packageKind:"unsure");setApproved(saved.approved);setBriefingSeen(Boolean(saved.briefingSeen));setBriefingOpen(!saved.briefingSeen);setBuddyDecision(saved.buddyDecision||"undecided");setOnboardingComplete(completed);setSelectedClaimId(saved.selectedClaimId||savedClaims[0]?.id||null)}
      else setBriefingOpen(true);
    }catch{}
    setLoaded(true);
  },[]);
  useEffect(()=>{
    if(!loaded)return;
    localStorage.setItem(storageKey,JSON.stringify({screen,services,events,documents,sources,leads,claims,packageKind,approved,briefingSeen,buddyDecision,onboardingComplete,selectedClaimId}));
  },[screen,services,events,documents,sources,leads,claims,packageKind,approved,briefingSeen,buddyDecision,onboardingComplete,selectedClaimId,loaded]);

  function navigate(next:PrototypeScreen){setScreen(next);setMenuOpen(false);setNotice("");window.scrollTo({top:0,behavior:"smooth"})}
  function openClaim(claimId:string){setSelectedClaimId(claimId);navigate("workspace")}
  function reset(){
    localStorage.removeItem(storageKey);setScreen("intent");setServices([]);setEvents([]);
    setDocuments([]);setSources(prototypeSources);setLeads([]);setClaims([]);setPackageKind("unsure");setApproved(false);setBriefingSeen(false);setBriefingOpen(true);setBuddyDecision("undecided");setInspectedSource(null);setFollowUpOpen(false);setOnboardingComplete(false);setSelectedClaimId(null);setNotice("Preview data cleared. Your test profile is empty again.");
  }
  function closeBriefing(doNotShowAgain:boolean,start:boolean){
    setBriefingSeen(doNotShowAgain);
    setBriefingOpen(false);
    if(start)navigate("intent");
  }
  function finishOnboarding(){
    const hasKneeInformation=events.some(item=>item.title.toLowerCase().includes("knee"))||documents.some(item=>item.insights.some(insight=>insight.topic.toLowerCase().includes("knee")));
    const kneeSources=sources.filter(source=>source.excerpt.toLowerCase().includes("knee")||source.label.toLowerCase().includes("knee")).map(source=>source.id);
    setLeads(hasKneeInformation?[{...prototypeLeads[0],summary:"Knee-related information appears in the details or documents you added.",sourceIds:kneeSources.length?kneeSources:["src-knee-intake"],missing:["Current symptoms","Supporting records"],status:"open"}]:[]);setOnboardingComplete(true);navigate("dashboard");setNotice(services.length||events.length?"Your foundation is saved. Your package is ready for you to add and build claims.":"Your package has started, but your foundation is still empty. Add service or health details when you are ready.");
  }
  function invalidateApproval(message:string){if(approved)setNotice("Final approval was cleared because package information changed.");else setNotice(message);setApproved(false)}
  function inspectSource(sourceId:string){const source=sources.find(item=>item.id===sourceId);if(source)setInspectedSource(source)}
  function confirmSource(sourceId:string){
    setSources(current=>current.map(source=>source.id===sourceId?{...source,verification:"confirmed"}:source));
    if(activeClaimId)setClaims(current=>current.map(claim=>claim.id===activeClaimId?{...claim,draft:{...claim.draft,verifiedSourceIds:claim.draft.verifiedSourceIds.includes(sourceId)?claim.draft.verifiedSourceIds:[...claim.draft.verifiedSourceIds,sourceId]}}:claim));
    invalidateApproval("Source confirmed and connected to the claim.");setInspectedSource(null);
  }

  return <div className="rw-shell">
    <a className="rw-skip" href="#rework-main">Skip to main content</a>
    <aside className={menuOpen?"open":""} aria-label="Claim package navigation" inert={briefingOpen?true:undefined}>
      <div className="rw-brand"><Link href="/" aria-label="Debrief home"><span><ShieldCheck size={21}/></span><div><strong>Debrief</strong><small>Guided claim package</small></div></Link><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <nav className="rw-primary-nav">
        {onboardingComplete&&<button type="button" className={`rw-nav-home ${screen==="dashboard"?"active":""}`} aria-current={screen==="dashboard"?"page":undefined} onClick={()=>navigate("dashboard")}><span><ClipboardCheck size={17}/></span><div><strong>Package Overview</strong></div></button>}
        <div className="rw-nav-group"><span>{onboardingComplete?"Package and Foundation":"Start Your Package"}</span>{buildScreens.filter(item=>onboardingComplete||item.id!=="leads").map(item=><button type="button" className={screen===item.id?"active":""} aria-current={screen===item.id?"page":undefined} onClick={()=>navigate(item.id)} key={item.id}><span><item.icon size={16}/></span><div><strong>{item.label}</strong></div></button>)}</div>
        {onboardingComplete&&<div className="rw-nav-group"><span>Claims in This Package</span>{claims.map(claim=><button type="button" className={screen==="workspace"&&activeClaimId===claim.id?"active":""} aria-current={screen==="workspace"&&activeClaimId===claim.id?"page":undefined} onClick={()=>openClaim(claim.id)} key={claim.id}><span><FileText size={16}/></span><div><strong>{claim.title}</strong></div></button>)}<button type="button" className="rw-nav-add" onClick={()=>navigate("leads")}><span><Plus size={16}/></span><div><strong>Add a Claim</strong></div></button></div>}
        {onboardingComplete&&<div className="rw-nav-group rw-nav-finalize"><span>Finalize</span><button type="button" className={screen==="package"?"active":""} aria-current={screen==="package"?"page":undefined} onClick={()=>navigate("package")}><span><ClipboardCheck size={16}/></span><div><strong>Package Review</strong>{reviewRequiredCount>0&&<small className="rw-nav-attention">{reviewRequiredCount} review {reviewRequiredCount===1?"item":"items"}</small>}</div></button></div>}
      </nav>
      <div className="rw-utility-nav">
        <span>Reference &amp; Support</span>
        <Link href="/exposure-record-check"><Radar size={16}/><strong>Exposure Checker</strong></Link>
        <Link href="/conditions"><BookOpenCheck size={16}/><strong>Conditions Library</strong></Link>
        <Link href="/forms"><Files size={16}/><strong>Forms Guide</strong></Link>
        <Link href="/support"><LifeBuoy size={16}/><strong>Help &amp; Guide</strong></Link>
        <Link href="/support#content-correction"><MessageSquareText size={16}/><strong>Send Feedback</strong></Link>
      </div>
      <div className="rw-boundary"><ShieldCheck size={16}/><p><strong>Fictional preview only</strong>Do not upload or enter real personal, medical, or military information.</p></div>
      <button className="rw-reset" type="button" onClick={reset}><RotateCcw size={14}/> Clear preview data</button>
    </aside>
    {menuOpen&&<button className="rw-scrim" type="button" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
    <div className="rw-stage" inert={briefingOpen?true:undefined}>
      <header className="rw-topbar">
        <button type="button" className="rw-menu" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={19}/></button>
        <div><span>{onboardingComplete?"Active package":"New package setup"}</span><strong>{packageLabels[packageKind]}</strong></div>
        <div className="rw-top-actions"><span className="rw-save"><Check size={13}/> Changes saved</span><button className="rw-guide" type="button" onClick={()=>setNotice(user.localTestProfile?"This local test profile saves only in this browser.":"This mock-up represents account-backed saving. Production integration will store package changes under your signed-in account.")}><Info size={17}/> <span>Save details</span></button><button className="rw-guide" type="button" onClick={()=>setBriefingOpen(true)}><CircleHelp size={17}/> <span>How Debrief works</span></button><Link className="rw-sign-in" href="/account"><UserRound size={15}/> {user.name||"Profile"}</Link></div>
      </header>
      <main id="rework-main" tabIndex={-1}>
        {notice&&<div className="rw-notice" role="status"><Info size={16}/><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={()=>setNotice("")}>×</button></div>}
        {screen==="intent"&&<PackageIntent packageKind={packageKind} setPackageKind={value=>{setPackageKind(value);invalidateApproval("Package type updated.")}} onboardingComplete={onboardingComplete} onContinue={()=>navigate(onboardingComplete?"dashboard":"intake")}/>}
        {screen==="intake"&&<Intake services={services} setServices={setServices} events={events} setEvents={setEvents} onboardingComplete={onboardingComplete} onContinue={()=>navigate(onboardingComplete?"dashboard":"documents")} setNotice={setNotice}/>}
        {screen==="documents"&&<Documents documents={documents} setDocuments={setDocuments} sources={sources} setSources={setSources} onboardingComplete={onboardingComplete} onContinue={()=>onboardingComplete?navigate("dashboard"):finishOnboarding()} setNotice={setNotice} onInspectSource={inspectSource}/>}
        {screen==="leads"&&<Leads leads={leads} setLeads={setLeads} documents={documents} sources={sources} packageKind={packageKind} claims={claims} setClaims={setClaims} onContinue={()=>navigate("dashboard")} setNotice={setNotice} onInspectSource={inspectSource}/>}
        {screen==="dashboard"&&<Dashboard services={services} events={events} documents={documents} sources={sources} leads={leads} claims={claims} packageKind={packageKind} onNavigate={navigate} onOpenClaim={openClaim}/>}
        {screen==="workspace"&&<ClaimWorkspaceView claims={claims} selectedClaimId={activeClaimId} setClaims={setClaims} documents={documents} sources={sources} onNavigate={navigate} onInspectSource={inspectSource} invalidateApproval={invalidateApproval} setNotice={setNotice}/>}
        {screen==="package"&&<PackageReview claims={claims} sources={sources} approved={approved} setApproved={setApproved} invalidateApproval={invalidateApproval} setDownloadOpen={setDownloadOpen} onNavigate={navigate} onOpenClaim={openClaim} onInspectSource={inspectSource} buddyDecision={buddyDecision} setBuddyDecision={setBuddyDecision}/>}
      </main>
    </div>
    {briefingOpen&&<MissionBriefing onClose={closeBriefing} firstRun={!onboardingComplete}/>}
    {inspectedSource&&<SourceInspector source={inspectedSource} verified={inspectedSource.verification==="confirmed"||Boolean(claims.find(claim=>claim.id===activeClaimId)?.draft.verifiedSourceIds.includes(inspectedSource.id))} onConfirm={()=>confirmSource(inspectedSource.id)} onCorrection={()=>{setSources(current=>current.map(source=>source.id===inspectedSource.id?{...source,verification:"corrected"}:source));setClaims(current=>current.map(claim=>({...claim,draft:{...claim.draft,verifiedSourceIds:claim.draft.verifiedSourceIds.filter(id=>id!==inspectedSource.id)}})));invalidateApproval("Correction noted. The extracted wording will stay out of claims until it is replaced.");setInspectedSource(null)}} onClose={()=>setInspectedSource(null)}/>}
    {downloadOpen&&<DownloadPreview onClose={()=>setDownloadOpen(false)} claims={claims} onFollowUp={()=>{setDownloadOpen(false);setFollowUpOpen(true)}}/>}
    {followUpOpen&&<FollowUpPreview onClose={()=>setFollowUpOpen(false)}/>}
  </div>;
}

function PackageIntent({packageKind,setPackageKind,onboardingComplete,onContinue}:{packageKind:ClaimPath;setPackageKind:(value:ClaimPath)=>void;onboardingComplete:boolean;onContinue:()=>void}){
  const options:Array<{id:ClaimPath;title:string;copy:string}>=[
    {id:"original",title:"New disability claim",copy:"Organize a condition, an in-service event, and information that may connect them."},
    {id:"increase",title:"Increased rating",copy:"Show what has worsened since the current VA rating or decision."},
    {id:"supplemental",title:"Supplemental claim",copy:"Connect a prior decision with new and relevant evidence."},
    {id:"contested",title:"Review a decision",copy:"Organize the decision, disputed issues, dates, and review options."},
    {id:"unsure",title:"I am not sure yet",copy:"Start with your information. Debrief will preserve the open path question."}
  ];
  return <div className="rw-page rw-intent-page">
    <PageHead kicker="Package type" title="What are you preparing for?" copy="Your answer changes the questions and readiness checks. You can update it later without losing your information."/>
    <fieldset className="rw-intent-options"><legend className="sr-only">Choose a package type</legend>{options.map(option=><label className={packageKind===option.id?"selected":""} key={option.id}><input type="radio" name="package-kind" checked={packageKind===option.id} onChange={()=>setPackageKind(option.id)}/><span><strong>{option.title}</strong><small>{option.copy}</small></span><CheckCircle2 size={18}/></label>)}</fieldset>
    <div className="rw-intent-note"><Info size={18}/><p><strong>This choice does not determine eligibility.</strong> It only helps Debrief ask the right questions and organize the package.</p></div>
    <FooterActions next={onContinue} nextLabel={onboardingComplete?"Return to Package Overview":"Continue to Service & Health"}/>
  </div>;
}

function MissionBriefing({onClose,firstRun}:{onClose:(doNotShowAgain:boolean,start:boolean)=>void;firstRun:boolean}){
  const titleRef=useRef<HTMLHeadingElement>(null);
  const dialogRef=useRef<HTMLElement>(null);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  useEffect(()=>{
    const previouslyFocused=document.activeElement as HTMLElement|null;
    titleRef.current?.focus();
    function onKeyDown(event:KeyboardEvent){
      if(event.key==="Escape"){closeRef.current(true,false);return}
      if(event.key!=="Tab"||!dialogRef.current)return;
      const controls=Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button"));
      const first=controls[0];
      const last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===titleRef.current)){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
    }
    window.addEventListener("keydown",onKeyDown);
    return ()=>{window.removeEventListener("keydown",onKeyDown);previouslyFocused?.focus()};
  },[]);
  const connections=[
    ["What is happening now","A current condition, symptoms, treatment, or effects on daily life."],
    ["What happened in service","An injury, illness, exposure, or event during service."],
    ["How they may be related","Medical or lay evidence that helps explain the relationship."]
  ];
  return <div className="rw-modal-wrap rw-briefing-wrap" role="presentation">
    <section ref={dialogRef} className="rw-modal rw-briefing" role="dialog" aria-modal="true" aria-labelledby="mission-briefing-title" aria-describedby="mission-briefing-intro">
      <header><div><span className="rw-kicker">Mission briefing</span><h2 id="mission-briefing-title" ref={titleRef} tabIndex={-1}>A well-supported claim starts with the right mission details.</h2></div><button type="button" aria-label="Close mission briefing" onClick={()=>onClose(true,false)}><X size={19}/></button></header>
      <p id="mission-briefing-intro" className="rw-briefing-intro">The information needed depends on what you are preparing. These are common building blocks, not a guarantee of eligibility or outcome.</p>
      <div className="rw-briefing-body">
        <div className="rw-briefing-connections">{connections.map(([title,copy],index)=><article key={title}><span aria-hidden="true">{index+1}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
        <aside className="rw-briefing-side">
          <div className="rw-briefing-role"><Sparkles size={20}/><div><h3>Debrief organizes the evidence</h3><p>Service and medical records, personal accounts, and witness statements can each preserve useful facts.</p></div></div>
          <div className="rw-briefing-control"><ShieldCheck size={19}/><div><h3>You remain in control</h3><p>Debrief does not decide eligibility or submit your claim. You verify each source and approve what is included.</p><a href="https://www.va.gov/disability/how-to-file-claim/evidence-needed/" target="_blank" rel="noreferrer">Read official VA evidence guidance <ExternalLink size={13}/></a></div></div>
        </aside>
      </div>
      <div className="rw-briefing-end">
        <p>{firstRun?"Next, tell Debrief what you are preparing. You can return to this explanation from Help at any time.":"This explanation remains available here without occupying a permanent navigation item."}</p>
        <footer><button className="rw-primary" type="button" onClick={()=>onClose(true,firstRun)}>{firstRun?"Choose package type":"Return to package"} <ArrowRight size={15}/></button></footer>
      </div>
    </section>
  </div>;
}

function friendlyDate(value:string){const match=value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);if(!match)return value;const month=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(match[2])-1];return match[3]?`${month} ${Number(match[3])}, ${match[1]}`:`${month} ${match[1]}`}
function formatRange(start:string,end:string){return `${friendlyDate(start)} to ${friendlyDate(end)}`}

const serviceBranchOptions=["Air Force","Army","Coast Guard","Marine Corps","Navy","Space Force","National Guard or Reserve","Other or not sure"];

function Intake({services,setServices,events,setEvents,onboardingComplete,onContinue,setNotice}:{services:ServicePeriod[];setServices:(value:ServicePeriod[])=>void;events:HealthEvent[];setEvents:(value:HealthEvent[])=>void;onboardingComplete:boolean;onContinue:()=>void;setNotice:(value:string)=>void}){
  const [serviceEditor,setServiceEditor]=useState<"new"|string|null>(null);
  const [eventEditor,setEventEditor]=useState<"new"|string|null>(null);
  const serviceBeingEdited=services.find(item=>item.id===serviceEditor);
  const eventBeingEdited=events.find(item=>item.id===eventEditor);
  return <div className="rw-page">
    <PageHead kicker="Service and health intake" title="Start with what only you know." copy="Capture the mission context, key events, and changes you remember. Approximate dates are welcome."/>
    <div className="rw-intake-grid">
      <section className="rw-panel"><PanelHead icon={History} title="Service history" count={`${services.length} ${services.length===1?"period":"periods"}`} action="Add service period" onAction={()=>setServiceEditor("new")}/>{services.length?services.map(item=><TimelineRow key={item.id} title={item.location} meta={`${item.service}, ${item.kind}, ${formatRange(item.start,item.end)}`} copy={`${item.role}. ${item.exposures}`} approximate={item.approximate} onEdit={()=>setServiceEditor(item.id)}/>):<IntakeEmpty icon={History} title="No service history yet" copy="Add a duty station, deployment, or TDY. Start with whichever period is easiest to remember." action="Add service period" onAction={()=>setServiceEditor("new")}/>}</section>
      <section className="rw-panel"><PanelHead icon={BookOpenCheck} title="Health timeline" count={`${events.length} ${events.length===1?"event":"events"}`} action="Add health event" onAction={()=>setEventEditor("new")}/>{events.length?events.map(item=><TimelineRow key={item.id} title={item.title} meta={`${item.type}, ${friendlyDate(item.date)}`} copy={[item.details,item.care,item.impact].filter(Boolean).join(" ")} approximate={item.approximate} onEdit={()=>setEventEditor(item.id)}/>):<IntakeEmpty icon={BookOpenCheck} title="No health events yet" copy="Add an injury, illness, surgery, treatment, or change in symptoms. Approximate dates are acceptable." action="Add health event" onAction={()=>setEventEditor("new")}/>}</section>
    </div>
    {services.length>0&&events.length>0&&<section className="rw-connection"><span><Link2 size={18}/></span><div><strong>Details ready to connect later</strong><p>Debrief can compare your service periods with health events after you add documents. You will verify every relationship before it is used.</p></div><button type="button" onClick={()=>setNotice("Possible relationships remain unverified until you review the original details and sources.")}>How this is used</button></section>}
    <div className="rw-unsure"><CircleHelp size={19}/><div><strong>Not sure about a date?</strong><p>Use a year, season, deployment, or other approximate period. Debrief will preserve that uncertainty.</p></div></div>
    <FooterActions next={onContinue} nextLabel={onboardingComplete?"Return to Package Overview":"Continue to documents"}/>
    {serviceEditor&&<QuickAdd title={serviceBeingEdited?"Edit service period":"Add a service period"} fields={[{label:"Branch and service component",type:"select",options:serviceBranchOptions},{label:"Period type",type:"select",options:["Duty station","Deployment","TDY"]},"Location or unit","Role, MOS, rate, or duty","Duties, conditions, or exposures to remember",{label:"Start date",type:"date"},{label:"End date",type:"date"}]} initialValues={serviceBeingEdited?[serviceBeingEdited.service,serviceBeingEdited.kind,serviceBeingEdited.location,serviceBeingEdited.role,serviceBeingEdited.exposures,serviceBeingEdited.start,serviceBeingEdited.end]:undefined} showApproximate initialApproximate={serviceBeingEdited?.approximate??false} onClose={()=>setServiceEditor(null)} onSave={(values,approximate)=>{
      const enteredKind=values[1].toLowerCase();const kind:ServicePeriod["kind"]=enteredKind.includes("deploy")?"Deployment":enteredKind.includes("duty")?"Duty station":"TDY";
      if(serviceBeingEdited)setServices(services.map(item=>item.id===serviceBeingEdited.id?{...item,service:values[0]||item.service,kind,location:values[2]||item.location,role:values[3]||item.role,exposures:values[4]||item.exposures,start:values[5]||item.start,end:values[6]||item.end,approximate}:item));
      else setServices([...services,{id:`service-${Date.now()}`,service:values[0]||"Service branch not entered",kind,location:values[2]||"Additional duty location",role:values[3]||"Role not entered",start:values[5]||"Date unknown",end:values[6]||"Date unknown",approximate,exposures:values[4]||"No duties or exposures entered yet."}]);
      setServiceEditor(null);setNotice(serviceBeingEdited?"Service period updated.":approximate?"Service period added with approximate dates.":"Service period added.");
    }}/>}
    {eventEditor&&<QuickAdd title={eventBeingEdited?"Edit health event":"Add a health event"} fields={["Event type: injury, illness, surgery, treatment, or symptom change","Condition, symptom, or event","What happened","Treatment, facility, or provider","Current effects or daily impact","Date"]} initialValues={eventBeingEdited?[eventBeingEdited.type,eventBeingEdited.title,eventBeingEdited.details,eventBeingEdited.care,eventBeingEdited.impact,eventBeingEdited.date]:undefined} showApproximate initialApproximate={eventBeingEdited?.approximate} onClose={()=>setEventEditor(null)} onSave={(values,approximate)=>{
      const enteredType=values[0].toLowerCase();const type:HealthEvent["type"]=enteredType.includes("injur")?"Injury":enteredType.includes("ill")?"Illness":enteredType.includes("surg")?"Surgery":"Treatment";
      if(eventBeingEdited)setEvents(events.map(item=>item.id===eventBeingEdited.id?{...item,type,title:values[1]||item.title,details:values[2]||item.details,care:values[3],impact:values[4],date:values[5]||item.date,approximate}:item));
      else setEvents([...events,{id:`event-${Date.now()}`,type,title:values[1]||"Additional health event",details:values[2]||"Details not entered yet.",care:values[3],impact:values[4],date:values[5]||"Date unknown",approximate}]);
      setEventEditor(null);setNotice(eventBeingEdited?"Health event updated.":approximate?"Health event added with an approximate date.":"Health event added.");
    }}/>}
  </div>;
}

function Documents({documents,setDocuments,sources,setSources,onboardingComplete,onContinue,setNotice,onInspectSource}:{documents:DocumentRecord[];setDocuments:(value:DocumentRecord[]|((current:DocumentRecord[])=>DocumentRecord[]))=>void;sources:SourceReference[];setSources:(value:SourceReference[]|((current:SourceReference[])=>SourceReference[]))=>void;onboardingComplete:boolean;onContinue:()=>void;setNotice:(value:string)=>void;onInspectSource:(sourceId:string)=>void}){
  const [filter,setFilter]=useState("");
  const visible=documents.filter(item=>`${item.name} ${item.type}`.toLowerCase().includes(filter.toLowerCase()));
  function simulateUpload(){
    const id=`doc-${Date.now()}`;
    setDocuments([...documents,{id,name:"Fictional orthopedic visit.pdf",type:"Civilian medical record",dateRange:"2025",status:"processing",caseIds:["case-1"],claimIds:[],insights:[]}]);
    setNotice("Fictional document added. Analysis is being simulated.");
    window.setTimeout(()=>{setDocuments(current=>current.map(item=>item.id===id?{...item,status:"ready",insights:[{id:`ins-${id}`,topic:"Right knee",excerpt:"Reports recurring knee discomfort when using stairs.",page:3,confidence:"medium",verification:"unreviewed"}]}:item));setSources(current=>current.some(source=>source.documentId===id)?current:[...current,{id:`src-${id}`,kind:"document",label:"Fictional orthopedic visit.pdf",documentId:id,location:"Page 3",excerpt:"Reports recurring knee discomfort when using stairs.",confidence:"medium",verification:"unreviewed"}])},900);
  }
  function retry(id:string){setDocuments(documents.map(item=>item.id===id?{...item,status:"processing"}:item));setNotice("Analysis retry started.");window.setTimeout(()=>{setDocuments(current=>current.map(item=>item.id===id?{...item,status:"ready",insights:[{id:`ins-${id}`,topic:"Lower back",excerpt:"Reports occasional lower-back stiffness.",page:2,confidence:"low",verification:"unreviewed"}]}:item));setSources(current=>[...current.filter(source=>source.documentId!==id),{id:`src-${id}`,kind:"document",label:documents.find(item=>item.id===id)?.name||"Fictional record",documentId:id,location:"Page 2",excerpt:"Reports occasional lower-back stiffness.",confidence:"low",verification:"unreviewed"}])},900)}
  function toggleCaseLink(id:string){setDocuments(documents.map(item=>item.id===id?{...item,caseIds:item.caseIds.includes("case-1")?item.caseIds.filter(caseId=>caseId!=="case-1"):[...item.caseIds,"case-1"]}:item));setNotice("Document package link updated.")}
  function inspectInsight(documentId:string,page:number){const source=sources.find(item=>item.documentId===documentId&&item.location===`Page ${page}`);if(source)onInspectSource(source.id);else setNotice("The source preview is still processing. Try again after analysis finishes.")}
  const failedCount=documents.filter(item=>item.status==="failed").length;
  return <div className="rw-page">
    <PageHead kicker="My Documents" title="Turn records into findable facts." copy="Upload once. Debrief keeps the useful page, date, and topic connected to its source."/>
    <div className="rw-doc-toolbar"><label><Search size={16}/><input aria-label="Search documents" placeholder="Search documents" value={filter} onChange={event=>setFilter(event.target.value)}/></label><button className="rw-primary" type="button" onClick={simulateUpload}><UploadCloud size={16}/> Simulate upload</button></div>
    <div className="rw-doc-layout">
      <section className="rw-panel rw-doc-list"><div className="rw-section-title"><div><span className="rw-kicker">Your library</span><h2>{documents.length?`${documents.length} fictional document${documents.length===1?"":"s"}`:"No documents added"}</h2></div><span>Upload once, link where needed</span></div>{visible.length?visible.map(item=><article key={item.id}><span className="rw-file-icon"><Files size={18}/></span><div><strong>{item.name}</strong><small>{item.type}, {item.dateRange}</small><div>{item.insights.slice(0,2).map(insight=><button type="button" className="rw-topic" key={insight.id} onClick={()=>inspectInsight(item.id,insight.page)}>{insight.topic} <Eye size={12}/></button>)}</div>{item.status==="failed"&&<p className="rw-doc-error">Analysis stopped before text could be extracted. Retry the fictional analysis or continue without this document.</p>}</div><div className="rw-doc-controls"><DocStatus item={item} retry={()=>retry(item.id)}/><button type="button" className="rw-link-control" onClick={()=>toggleCaseLink(item.id)}>{item.caseIds.includes("case-1")?<><Link2 size={13}/> Linked to package</>:<><Plus size={13}/> Link to package</>}</button></div></article>):documents.length?<div className="rw-empty compact"><Search size={24}/><h2>No matching documents</h2><p>Try a file name or document type.</p></div>:<div className="rw-empty rw-doc-empty"><UploadCloud size={25}/><h2>Your document library is empty.</h2><p>Add a fictional military or medical record when you are ready. You can also finish setup and return later.</p><button className="rw-secondary" type="button" onClick={simulateUpload}>Simulate first upload</button></div>}</section>
      <aside className="rw-analysis"><span className="rw-kicker">Analysis status</span><h2>{documents.filter(item=>item.status==="ready").length} ready{failedCount?`, ${failedCount} needs attention`:""}</h2><p>Debrief found {documents.reduce((sum,item)=>sum+item.insights.length,0)} topics for your review. A topic is not a diagnosis or a recommendation to file.</p><div><strong><Sparkles size={15}/> Open the source</strong><p>Select a topic to inspect the page reference, extracted wording, and review status before using it.</p></div><div><strong><ShieldCheck size={15}/> Your records stay under your control</strong><p>A production version would explain consent, storage, retention, deletion, and provider access before any upload.</p></div></aside>
    </div>
    <FooterActions next={onContinue} nextLabel={onboardingComplete?"Return to Package Overview":"Finish setup"} note={onboardingComplete?"Document changes are saved to your account library.":"Documents are optional during setup. You can add them later."}/>
  </div>;
}

function Leads({leads,setLeads,documents,sources,packageKind,claims,setClaims,onContinue,setNotice,onInspectSource}:{leads:ClaimLead[];setLeads:(value:ClaimLead[])=>void;documents:DocumentRecord[];sources:SourceReference[];packageKind:ClaimPath;claims:ClaimWorkspace[];setClaims:(value:ClaimWorkspace[])=>void;onContinue:()=>void;setNotice:(value:string)=>void;onInspectSource:(sourceId:string)=>void}){
  const [showDismissed,setShowDismissed]=useState(false);
  const [customOpen,setCustomOpen]=useState(false);
  const visible=leads.filter(item=>showDismissed?item.status==="dismissed":item.status!=="dismissed");
  function accept(lead:ClaimLead){
    setLeads(leads.map(item=>item.id===lead.id?{...item,status:"accepted"}:item));
    if(!claims.some(item=>item.id===`claim-${lead.id}`))setClaims([...claims,{id:`claim-${lead.id}`,title:lead.title,path:packageKind,progress:0,milestone:"Foundation captured",sourceIds:lead.sourceIds,documentIds:documents.filter(doc=>lead.sourceIds.some(id=>sources.find(source=>source.id===id)?.documentId===doc.id)).map(doc=>doc.id),updated:"Just now",draft:createDraft()}]);
    setNotice(`${lead.title} added to Your Claims.`);
  }
  function dismiss(id:string){setLeads(leads.map(item=>item.id===id?{...item,status:"dismissed"}:item));setNotice("Lead dismissed. You can restore it at any time.")}
  function restore(id:string){setLeads(leads.map(item=>item.id===id?{...item,status:"open"}:item));setNotice("Lead restored.")}
  function merge(id:string){setLeads(leads.map(item=>item.id===id?{...item,status:"merged"}:item));setNotice("Lead merged into the right knee claim. Its sources remain linked.")}
  return <div className="rw-page">
    <PageHead kicker="Claim Leads" title="Connect patterns without losing the source." copy="Review why each topic appeared, verify the supporting information, and decide what belongs in Your Claims."/>
    <div className="rw-advisory"><Info size={17}/><p><strong>A lead is a topic to review.</strong> It is not a recommendation to file and does not predict eligibility, rating, or outcome.</p></div>
    <div className="rw-lead-actions"><div><button type="button" className={!showDismissed?"active":""} onClick={()=>setShowDismissed(false)}>Active leads</button><button type="button" className={showDismissed?"active":""} onClick={()=>setShowDismissed(true)}>Dismissed ({leads.filter(item=>item.status==="dismissed").length})</button></div><button type="button" onClick={()=>setCustomOpen(true)}><Plus size={14}/> Add a claim not shown</button></div>
    <section className="rw-leads">{visible.length?visible.map(item=><LeadCard key={item.id} lead={item} sources={sources} canMerge={claims.some(claim=>claim.title.includes("knee"))} onAccept={()=>accept(item)} onDismiss={()=>dismiss(item.id)} onRestore={()=>restore(item.id)} onMerge={()=>merge(item.id)} onInspectSource={onInspectSource} onMissing={missing=>setNotice(`Add this information inside the claim: ${missing}.`)}/>):<div className="rw-empty"><FolderSearch size={28}/><h2>{showDismissed?"No dismissed leads":"No claim leads yet"}</h2><p>{showDismissed?"When you dismiss a lead, it will remain available here.":"Debrief will place evidence-linked topics here after you add relevant intake details or documents. You can still add your own claim topic."}</p>{!showDismissed&&<button className="rw-secondary" type="button" onClick={()=>setCustomOpen(true)}>Add your own claim topic</button>}</div>}</section>
    <FooterActions next={onContinue} nextLabel="Open Package Overview"/>
    {customOpen&&<QuickAdd title="Add your own claim topic" fields={["Condition or symptom","Why you want to review it"]} onClose={()=>setCustomOpen(false)} onSave={(values)=>{const title=values[0]||"User-added claim";const id=`claim-custom-${Date.now()}`;setClaims([...claims,{id,title,path:packageKind,progress:0,milestone:"Needs foundation",sourceIds:[],documentIds:[],updated:"Just now",draft:createDraft()}]);setCustomOpen(false);setNotice(`${title} added without a system lead.`)}}/>}
  </div>;
}

function Dashboard({services,events,documents,sources,leads,claims,packageKind,onNavigate,onOpenClaim}:{services:ServicePeriod[];events:HealthEvent[];documents:DocumentRecord[];sources:SourceReference[];leads:ClaimLead[];claims:ClaimWorkspace[];packageKind:ClaimPath;onNavigate:(screen:PrototypeScreen)=>void;onOpenClaim:(claimId:string)=>void}){
  const accepted=leads.filter(item=>item.status==="accepted").length;
  const foundationReady=services.length>0&&events.length>0;
  const next=getPackageNextAction({services,events,leads,claims,sources});
  return <div className="rw-page">
    <PageHead kicker={packageLabels[packageKind]} title="Your claim package, organized into action." copy="Manage each claim separately while reusing the service history and records saved to your account."/>
    <section className="rw-next" aria-labelledby="rw-next-title"><span><ListChecks size={21}/></span><div><small>ACTION REQUIRED</small><h2 id="rw-next-title">{next.title}</h2><p>{next.copy}</p></div><button className="rw-primary" type="button" onClick={()=>next.screen==="workspace"&&next.claimId?onOpenClaim(next.claimId):onNavigate(next.screen)}>{next.label} <ArrowRight size={15}/></button></section>
    <div className="rw-metrics"><div><span>Account foundation</span><strong>{foundationReady?"Ready to begin claims":services.length||events.length?"Started":"Not started"}</strong><small>{services.length} service periods, {events.length} health events</small></div><div><span>Document analysis</span><strong>{documents.filter(item=>item.status==="ready").length} of {documents.length} ready</strong><small>{documents.some(item=>item.status==="failed")?"One needs attention":documents.length?"Processing complete":"No records added"}</small></div><div><span>Claim leads</span><strong>{accepted} accepted</strong><small>{leads.filter(item=>item.status==="open").length} still to review</small></div><div><span>Package status</span><strong>{claims.length?claims.every(claim=>claim.draft.statementReviewed)?"Claims reviewed":"Needs review":"No claims added"}</strong><small>{claims.length?`${claims.filter(claim=>claim.draft.statementReviewed).length} of ${claims.length} statements reviewed`:"Add a claim when you are ready"}</small></div></div>
    <div className="rw-dashboard-grid">
      <section className="rw-panel"><div className="rw-section-title"><div><span className="rw-kicker">Your Claims</span><h2>{claims.length?`${claims.length} active claim${claims.length===1?"":"s"}`:"No claims yet"}</h2></div><button type="button" onClick={()=>onNavigate("leads")}><Plus size={14}/> Add a Claim</button></div>{claims.length?claims.map(item=>{const issues=claimReviewIssueCount(item,sources);return <article className={issues?"rw-claim needs-review":"rw-claim"} key={item.id}><div><strong>{item.title}</strong><small>{packageLabels[item.path]}. Updated {item.updated}</small><em>{issues?<><AlertTriangle size={13}/> {issues} review {issues===1?"item":"items"} required</>:<><CheckCircle2 size={13}/> Claim review complete</>}</em></div><button type="button" aria-label={`Open ${item.title}`} onClick={()=>onOpenClaim(item.id)}>{issues?"Resolve Review":"Review Claim"} <ArrowRight size={14}/></button></article>}):<div className="rw-empty compact"><ClipboardCheck size={24}/><p>Accept a claim lead or add a condition yourself.</p></div>}</section>
      <aside className="rw-panel"><span className="rw-kicker">Open questions</span><h2>What still needs your input</h2>{documents.some(item=>item.status==="failed")&&<button type="button" onClick={()=>onNavigate("documents")}><AlertTriangle size={16}/><span><strong>A document needs attention</strong><small>Retry analysis or continue without it.</small></span><ArrowRight size={14}/></button>}{documents.length===0&&<button type="button" onClick={()=>onNavigate("documents")}><Files size={16}/><span><strong>No records added yet</strong><small>Add documents now or return when they are available.</small></span><ArrowRight size={14}/></button>}{leads.some(item=>item.status==="open")?<button type="button" onClick={()=>onNavigate("leads")}><CircleHelp size={16}/><span><strong>Review an evidence-linked topic</strong><small>Inspect the source before adding a claim.</small></span><ArrowRight size={14}/></button>:<button type="button" onClick={()=>onNavigate("leads")}><Plus size={16}/><span><strong>Add a condition or symptom</strong><small>You do not need a Debrief-generated lead.</small></span><ArrowRight size={14}/></button>}</aside>
    </div>
    <section className="rw-tools"><div><span className="rw-kicker">Connected tools</span><h2>Your account details travel with you</h2><p>These guides can use the service periods and claim topics you entered. Nothing is added to the package without your review.</p></div><nav aria-label="Debrief guides"><Link href="/exposure-record-check"><Radar size={18}/><span><strong>Exposure Checker</strong><small>Starts with {services.length} saved service {services.length===1?"period":"periods"}.</small></span><ArrowRight size={14}/></Link><Link href="/conditions"><BookOpenCheck size={18}/><span><strong>Conditions library</strong><small>Explore conditions without adding them to your package.</small></span><ArrowRight size={14}/></Link><Link href="/forms"><Files size={18}/><span><strong>Forms guide</strong><small>Shows forms relevant to an original claim.</small></span><ArrowRight size={14}/></Link></nav></section>
  </div>;
}

function ClaimWorkspaceView({claims,selectedClaimId,setClaims,documents,sources,onNavigate,onInspectSource,invalidateApproval,setNotice}:{claims:ClaimWorkspace[];selectedClaimId:string|null;setClaims:(value:ClaimWorkspace[])=>void;documents:DocumentRecord[];sources:SourceReference[];onNavigate:(screen:PrototypeScreen)=>void;onInspectSource:(sourceId:string)=>void;invalidateApproval:(message:string)=>void;setNotice:(value:string)=>void}){
  const claim=claims.find(item=>item.id===selectedClaimId)||claims[0];
  const draft=claim?.draft||createDraft();
  const linkedSources=claim?sources.filter(source=>claim.sourceIds.includes(source.id)):[];
  const prompts:Record<ClaimPath,{event:string;eventPlaceholder:string;symptoms:string;relationship:string;relationshipPlaceholder:string}>={
    original:{event:"In-service event",eventPlaceholder:"Describe what happened during service and when.",symptoms:"Current symptoms",relationship:"Possible relationship to service",relationshipPlaceholder:"Explain when symptoms began or why you believe the details may be related."},
    increase:{event:"Current VA-rated condition or prior decision",eventPlaceholder:"Identify the current rated condition and decision, if available.",symptoms:"What has worsened",relationship:"When and how it changed",relationshipPlaceholder:"Describe when the condition changed and what is different now."},
    supplemental:{event:"Prior decision",eventPlaceholder:"Identify the prior decision, issue, and date, if available.",symptoms:"Issue being reconsidered",relationship:"New and relevant evidence",relationshipPlaceholder:"Describe what evidence is new and why it matters to the issue."},
    contested:{event:"Decision being reviewed",eventPlaceholder:"Identify the decision, issue, and notification date.",symptoms:"Issue you disagree with",relationship:"Reason it needs review",relationshipPlaceholder:"Describe the factual or procedural issue you want reviewed."},
    unsure:{event:"Relevant event or decision",eventPlaceholder:"Describe the service event, rated condition, or decision involved.",symptoms:"Current issue",relationship:"How the details may connect",relationshipPlaceholder:"Describe the connection in your own words. You can choose a package type later."}
  };
  const prompt=claim?prompts[claim.path]:prompts.unsure;
  const statementHasFoundation=Boolean(draft.serviceEvent.trim()&&draft.currentSymptoms.trim()&&draft.relationship.trim()&&draft.dailyImpact.trim());
  function reviseClaim(change:(item:ClaimWorkspace)=>ClaimWorkspace,message:string){
    if(!claim)return;
    setClaims(claims.map(item=>item.id===claim.id?change(item):item));
    invalidateApproval(message);
  }
  function update<K extends keyof WorkspaceDraft>(field:K,value:WorkspaceDraft[K]){
    reviseClaim(item=>({...item,draft:{...item.draft,[field]:value,statementReviewed:false},milestone:"Foundation captured",updated:"Just now"}),"Claim information updated. Review this statement again before approval.");
  }
  function updatePath(path:ClaimPath){
    reviseClaim(item=>({...item,path,draft:{...item.draft,statementReviewed:false},milestone:"Foundation captured",updated:"Just now"}),"Claim path updated. Review this statement again before approval.");
  }
  function toggleDocument(documentId:string){
    if(!claim)return;
    const linked=claim.documentIds.includes(documentId);
    const documentSourceIds=sources.filter(source=>source.documentId===documentId).map(source=>source.id);
    reviseClaim(item=>({...item,documentIds:linked?item.documentIds.filter(id=>id!==documentId):[...item.documentIds,documentId],sourceIds:linked?item.sourceIds.filter(id=>!documentSourceIds.includes(id)):Array.from(new Set([...item.sourceIds,...documentSourceIds])),draft:{...item.draft,verifiedSourceIds:linked?item.draft.verifiedSourceIds.filter(id=>!documentSourceIds.includes(id)):item.draft.verifiedSourceIds,statementReviewed:false},milestone:"Foundation captured",updated:"Just now"}),linked?"Record unlinked from this claim.":"Record linked to this claim. Review its extracted sources before approval.");
  }
  function markReviewed(){
    if(!statementHasFoundation){setNotice(`Add ${prompt.event.toLowerCase()}, ${prompt.symptoms.toLowerCase()}, ${prompt.relationship.toLowerCase()}, and daily impact before reviewing the statement.`);return}
    reviseClaim(item=>({...item,draft:{...item.draft,statementReviewed:true},milestone:"Statement reviewed",updated:"Just now"}),"Statement review recorded.");setNotice("Statement reviewed. Later edits will clear this review.");
  }
  if(!claim)return <div className="rw-page"><PageHead kicker="Your Claims" title="Select or add a claim first." copy="Return to Claim Leads and choose a topic, or add one yourself."/><section className="rw-package-empty"><span><FileText size={25}/></span><h2>No claim is open yet.</h2><p>Each claim keeps its statement, verified facts, and linked sources together.</p><button className="rw-primary" type="button" onClick={()=>onNavigate("leads")}>Review Claim Leads <ArrowRight size={15}/></button></section></div>;
  return <div className="rw-page">
    <button className="rw-breadcrumb" type="button" onClick={()=>onNavigate("dashboard")}><ArrowLeft size={14}/> Package Overview <span>/</span> {claim.title}</button>
    <PageHead kicker={packageLabels[claim.path]} title={`${claim.title} Claim`} copy="Build this claim from facts you can trace, then verify every source before it enters the package."/>
    <div className="rw-workspace-layout">
      <section className="rw-workspace-form">
        <div className="rw-workspace-status"><span><LockKeyhole size={17}/></span><div><strong>Nothing is silently inferred</strong><p>Intake, record, and user-entered information stay labeled throughout the statement.</p></div></div>
        <label className="rw-claim-path"><span>Claim path</span><select aria-label="Claim path" value={claim.path} onChange={event=>updatePath(event.target.value as ClaimPath)}>{Object.entries(packageLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><small>The path changes the questions and readiness checks for this claim only.</small></label>
        <WorkspaceField number="1" title={prompt.event} source="Entered or confirmed by you" value={draft.serviceEvent} placeholder={prompt.eventPlaceholder} onChange={value=>update("serviceEvent",value)}/>
        <WorkspaceField number="2" title={prompt.symptoms} source="Entered by you" value={draft.currentSymptoms} placeholder="Describe the issue as it is now." onChange={value=>update("currentSymptoms",value)}/>
        <WorkspaceField number="3" title="Current diagnosis or evaluation" source="Entered by you" value={draft.diagnosis} placeholder="Add a diagnosis or evaluation if you have one. Leave blank if you do not." onChange={value=>update("diagnosis",value)}/>
        <WorkspaceField number="4" title={prompt.relationship} source="Your account, supported by reviewed sources" value={draft.relationship} placeholder={prompt.relationshipPlaceholder} onChange={value=>update("relationship",value)}/>
        <WorkspaceField number="5" title="Treatment history" source="Entered by you; optional" value={draft.treatmentHistory} placeholder="Add treatment dates, facilities, or providers you want to remember." onChange={value=>update("treatmentHistory",value)}/>
        <WorkspaceField number="6" title="Daily impact" source="Entered by you" value={draft.dailyImpact} placeholder="Describe effects on work, movement, sleep, or daily activities." onChange={value=>update("dailyImpact",value)}/>
        <div className="rw-statement-review"><div><strong>{draft.statementReviewed?"Statement reviewed":statementHasFoundation?"Review the complete statement":"Complete the statement foundation"}</strong><p>{draft.statementReviewed?"This version can move to package readiness. Editing any section will clear the review.":statementHasFoundation?"Confirm the wording is accurate and reflects your own account before it enters the package.":"Service event, current symptoms, relationship, and daily impact are required before review."}</p></div><button className={draft.statementReviewed?"rw-secondary":"rw-primary"} disabled={!statementHasFoundation} type="button" onClick={markReviewed}>{draft.statementReviewed?<><CheckCircle2 size={15}/> Reviewed</>:<>Mark statement reviewed <Check size={15}/></>}</button></div>
      </section>
      <aside className="rw-source-tray"><span className="rw-kicker">Linked sources</span><h2>Verify before using</h2><p>Open the original location and confirm the extracted wording.</p>{linkedSources.length?linkedSources.map(source=><button type="button" key={source.id} onClick={()=>onInspectSource(source.id)}><span>{source.kind==="document"?<FileCheck2 size={17}/>:<History size={17}/>}</span><div><strong>{source.label}</strong><small>{source.location||"Intake answer"}</small></div><em className={source.verification==="confirmed"||draft.verifiedSourceIds.includes(source.id)?"verified":"review"}>{source.verification==="confirmed"||draft.verifiedSourceIds.includes(source.id)?"Verified":"Review"}</em></button>):<div className="rw-empty compact"><Files size={21}/><p>No sources are linked to this claim.</p></div>}<div className="rw-record-linker"><strong>Records for this claim</strong><small>Link a record once and reuse it without copying the file.</small>{documents.map(document=><div key={document.id}><span><FileText size={15}/>{document.name}</span><button type="button" onClick={()=>toggleDocument(document.id)} aria-label={`${claim.documentIds.includes(document.id)?"Unlink":"Link"} ${document.name} ${claim.documentIds.includes(document.id)?"from":"to"} ${claim.title}`}>{claim.documentIds.includes(document.id)?"Unlink":"Link record"}</button></div>)}{!documents.length&&<p>No documents have been added to your account.</p>}</div><div className="rw-source-boundary"><Info size={15}/><p>Source wording is supporting information. Debrief does not decide whether it proves service connection.</p></div></aside>
    </div>
    <div className="rw-workspace-actions"><button className="rw-secondary" type="button" onClick={()=>onNavigate("dashboard")}><ArrowLeft size={15}/> Return to Package Overview</button><button className="rw-primary" type="button" onClick={()=>onNavigate("package")}>Check Package Readiness <ArrowRight size={15}/></button></div>
  </div>;
}

function WorkspaceField({number,title,source,value,placeholder,onChange}:{number:string;title:string;source:string;value:string;placeholder:string;onChange:(value:string)=>void}){
  return <label className="rw-workspace-field"><span className="rw-field-number">{number}</span><span className="rw-field-copy"><strong>{title}</strong><small>{source}</small><textarea value={value} placeholder={placeholder} onChange={event=>onChange(event.target.value)} rows={title.includes("diagnosis")?2:3}/></span></label>;
}

function PackageReview({claims,sources,approved,setApproved,invalidateApproval,setDownloadOpen,onNavigate,onOpenClaim,onInspectSource,buddyDecision,setBuddyDecision}:{claims:ClaimWorkspace[];sources:SourceReference[];approved:boolean;setApproved:(value:boolean)=>void;invalidateApproval:(message:string)=>void;setDownloadOpen:(value:boolean)=>void;onNavigate:(screen:PrototypeScreen)=>void;onOpenClaim:(claimId:string)=>void;onInspectSource:(sourceId:string)=>void;buddyDecision:BuddyDecision;setBuddyDecision:(value:BuddyDecision)=>void}){
  const [tab,setTab]=useState<"readiness"|"approval">("readiness");
  const readiness=claims.map(claim=>{
    const linkedSources=sources.filter(source=>claim.sourceIds.includes(source.id));
    const unverified=linkedSources.filter(source=>source.verification!=="confirmed"&&!claim.draft.verifiedSourceIds.includes(source.id));
    const pathReady=claim.path!=="unsure";const statementReady=claim.draft.statementReviewed;const sourcesReady=unverified.length===0;
    return {claim,pathReady,statementReady,sourcesReady,unverified,issueCount:(pathReady?0:1)+(statementReady?0:1)+unverified.length};
  });
  const unresolved=readiness.reduce((total,item)=>total+(item.pathReady?0:1)+(item.statementReady?0:1)+item.unverified.length,0);
  const allReady=claims.length>0&&unresolved===0;
  if(!claims.length)return <div className="rw-page">
    <PageHead kicker="Package and final review" title="Turn verified information into a reviewable package." copy="Resolve missing details first. Then approve exactly what will be included in the download."/>
    <section className="rw-package-empty"><span><ClipboardCheck size={25}/></span><h2>Add a claim before package review.</h2><p>Accept a claim lead or add a condition yourself. Readiness checks and package files will appear after a claim exists.</p><button className="rw-primary" type="button" onClick={()=>onNavigate("leads")}>Review Claim Leads <ArrowRight size={15}/></button></section>
  </div>;
  return <div className="rw-page">
    <PageHead kicker="Package and final review" title="Turn verified information into a reviewable package." copy="Resolve missing details first. Then approve exactly what will be included in the download."/>
    <div className="rw-review-tabs" role="tablist" aria-label="Package review stages"><button role="tab" aria-selected={tab==="readiness"} className={tab==="readiness"?"active":""} onClick={()=>setTab("readiness")}><span>1</span> Package readiness{unresolved?` (${unresolved})`:""}</button><button role="tab" aria-selected={tab==="approval"} className={tab==="approval"?"active":""} onClick={()=>setTab("approval")}><span>2</span> Final approval</button></div>
    {tab==="readiness"?<div className="rw-review-grid">
      <section className="rw-panel"><div className="rw-readiness-head"><div><span className="rw-kicker">Required reviews by claim</span><h2>{unresolved?`${unresolved} remaining`:"Required reviews complete"}</h2></div><span className={unresolved?"attention":"ready"}>{unresolved?"Action required":"Ready for approval"}</span></div><div className="rw-claim-readiness">{readiness.map(item=><article className={item.issueCount?"needs-review":""} key={item.claim.id}><header><div><strong>{item.claim.title}</strong><small>{item.issueCount?`${item.issueCount} review ${item.issueCount===1?"item":"items"} required`:"Claim review complete"}</small></div><button type="button" onClick={()=>onOpenClaim(item.claim.id)}>{item.issueCount?"Resolve items":"Review claim"} <ArrowRight size={14}/></button></header><ReadinessLine ready={item.pathReady} label="Claim path selected"/><ReadinessLine ready={item.statementReady} label="Statement reviewed"/><ReadinessLine ready={item.sourcesReady} label={item.unverified.length?`${item.unverified.length} linked source ${item.unverified.length===1?"needs":"need"} review`:"Linked sources reviewed"}/>{item.unverified[0]&&<button className="rw-review-source" type="button" onClick={()=>onInspectSource(item.unverified[0].id)}>Review {item.unverified[0].label} <ArrowRight size={13}/></button>}</article>)}</div><fieldset className="rw-buddy-choice"><legend>Buddy statement decision <span>Optional evidence</span></legend><p>Record what you want to do so this question does not disappear from the package.</p>{[["add","I plan to add one"],["not-available","Not available"],["not-needed","Not for this package"]].map(([value,label])=><label key={value}><input type="radio" name="buddy-decision" value={value} checked={buddyDecision===value} onChange={()=>{setBuddyDecision(value as BuddyDecision);invalidateApproval("Buddy statement decision updated.")}}/><span>{label}</span></label>)}</fieldset></section>
      <aside className="rw-panel rw-package-files"><span className="rw-kicker">Package contents</span><h2>Files assembled for review</h2><FileRow name="Package index.pdf" meta="Package overview and file checklist" ready={allReady}/>{readiness.map(item=><FileRow key={item.claim.id} name={`${item.claim.title} review.pdf`} meta={`${packageLabels[item.claim.path]}, statement, source trace, and open questions`} ready={item.pathReady&&item.statementReady&&item.sourcesReady}/>)}<FileRow name="Supporting records/" meta="Linked documents, without duplicate copies" ready={readiness.every(item=>item.sourcesReady)}/><p><Info size={14}/> Each claim becomes ready independently after its own reviews are complete.</p></aside>
    </div>:<section className="rw-approval">
      <div className="rw-approval-status">{approved?<CheckCircle2 size={29}/>:<ClipboardCheck size={29}/>}<div><span className="rw-kicker">Final approval</span><h2>{approved?"Package approved":"Your approval is still required"}</h2><p>{approved?"Every required section was approved in this fictional preview. Any later package change will clear this approval.":"Review the package index, each condition statement, and every linked document before approving."}</p></div></div>
      {unresolved>0&&<div className="rw-warning"><AlertTriangle size={18}/><div><strong>Approval is blocked.</strong><p>Resolve {unresolved} required readiness {unresolved===1?"item":"items"} before approving the package.</p></div></div>}
      <div className="rw-approval-actions"><button type="button" className="rw-secondary" onClick={()=>setTab("readiness")}><ArrowLeft size={15}/> Return to readiness</button>{!approved?<button className="rw-primary" disabled={!allReady} type="button" onClick={()=>setApproved(true)}><Check size={15}/> Approve entire package</button>:<button className="rw-primary" type="button" onClick={()=>setDownloadOpen(true)}><Download size={15}/> Preview download package</button>}</div>
    </section>}
    {approved?<section className="rw-submit"><div><span className="rw-kicker">Submission bridge</span><h2>Download here. Submit through an official VA channel.</h2><p>Debrief does not collect VA credentials, submit a claim, or confirm receipt. Check current VA instructions before filing.</p></div><a href="https://www.va.gov/disability/how-to-file-claim/" target="_blank" rel="noreferrer">Open official filing guidance <ArrowRight size={14}/></a></section>:<p className="rw-submit-locked"><LockKeyhole size={15}/> Download and filing guidance appear after final approval.</p>}
  </div>;
}

function ReadinessLine({ready,label}:{ready:boolean;label:string}){return <div className={ready?"rw-readiness-line ready":"rw-readiness-line open"}><span>{ready?<Check size={13}/>:<AlertTriangle size={13}/>}</span><small>{ready?label:`Action required: ${label}`}</small></div>}

function PageHead({kicker,title,copy}:{kicker:string;title:string;copy:string}){return <header className="rw-page-head"><span className="rw-kicker">{kicker}</span><h1>{title}</h1><p>{copy}</p></header>}
function PanelHead({icon:Icon,title,count,action,onAction}:{icon:typeof History;title:string;count:string;action:string;onAction:()=>void}){return <div className="rw-panel-head"><span><Icon size={18}/></span><div><h2>{title}</h2><small>{count}</small></div><button type="button" onClick={onAction}><Plus size={14}/> {action}</button></div>}
function TimelineRow({title,meta,copy,approximate,onEdit}:{title:string;meta:string;copy:string;approximate:boolean;onEdit:()=>void}){return <article className="rw-timeline-row"><i/><div><small>{meta}{approximate?", approximate":""}</small><strong>{title}</strong><p>{copy}</p></div><button type="button" aria-label={`Edit ${title}`} onClick={onEdit}>Edit</button></article>}
function IntakeEmpty({icon:Icon,title,copy,action,onAction}:{icon:typeof History;title:string;copy:string;action:string;onAction:()=>void}){return <div className="rw-intake-empty"><Icon size={23}/><strong>{title}</strong><p>{copy}</p><button className="rw-secondary" type="button" onClick={onAction}>{action}</button></div>}
function FooterActions({next,nextLabel,note="Changes are saved as you work."}:{next:()=>void;nextLabel:string;note?:string}){return <div className="rw-footer-actions"><span className="rw-autosave-note"><Check size={14}/> {note}</span><button className="rw-primary" type="button" onClick={next}>{nextLabel} <ArrowRight size={15}/></button></div>}
function DocStatus({item,retry}:{item:DocumentRecord;retry:()=>void}){if(item.status==="ready")return <span className="rw-doc-status ready"><CheckCircle2 size={14}/> Ready</span>;if(item.status==="processing")return <span className="rw-doc-status processing"><Clock3 size={14}/> Processing</span>;return <button type="button" className="rw-doc-status failed" onClick={retry}><RefreshCw size={14}/> Retry analysis</button>}
function LeadCard({lead,sources,canMerge,onAccept,onDismiss,onRestore,onMerge,onInspectSource,onMissing}:{lead:ClaimLead;sources:SourceReference[];canMerge:boolean;onAccept:()=>void;onDismiss:()=>void;onRestore:()=>void;onMerge:()=>void;onInspectSource:(sourceId:string)=>void;onMissing:(missing:string)=>void}){
  const leadSources=sources.filter(source=>lead.sourceIds.includes(source.id));
  const [open,setOpen]=useState(lead.confidence==="high");
  const strength=lead.confidence==="high"?"Strong record pattern":lead.confidence==="medium"?"Some supporting information":"Limited information";
  return <article className={`rw-lead ${lead.confidence}`}><header><span className={`rw-confidence ${lead.confidence}`}>{strength}</span><div><h2>{lead.title}</h2><p>{lead.summary}</p></div>{lead.status==="accepted"&&<span className="rw-added"><Check size={13}/> Claim added</span>}</header><button className="rw-source-toggle" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}><Link2 size={15}/> Why this appeared: {leadSources.length} source{leadSources.length===1?"":"s"} <ChevronDown size={15}/></button>{open&&<div className="rw-sources">{leadSources.map(source=><button type="button" key={source.id} onClick={()=>onInspectSource(source.id)}><span>{source.kind==="document"?<FileCheck2 size={15}/>:<History size={15}/>}</span><div><strong>{source.label}{source.location?`, ${source.location}`:""}</strong><p>“{source.excerpt}”</p><small>{source.kind==="document"?"Open the page reference and verify the wording.":"Review the intake detail."}</small></div><Eye size={15}/></button>)}</div>}<div className="rw-missing"><strong>Still needed</strong>{lead.missing.map(item=><button type="button" key={item} onClick={()=>onMissing(item)}>{item} <Plus size={12}/></button>)}</div><footer>{lead.status==="dismissed"?<button className="rw-secondary" type="button" onClick={onRestore}><RotateCcw size={14}/> Restore lead</button>:<><button className="rw-secondary" type="button" onClick={onDismiss}>Dismiss</button>{lead.title.includes("Lower")&&canMerge&&<button className="rw-secondary" type="button" onClick={onMerge}>Merge with knee claim</button>}<button className="rw-primary" type="button" disabled={lead.status==="accepted"} onClick={onAccept}>{lead.status==="accepted"?"Claim added":"Add to Your Claims"} <ArrowRight size={14}/></button></>}</footer></article>
}
function FileRow({name,meta,ready=true}:{name:string;meta:string;ready?:boolean}){return <div className="rw-file-row"><FileCheck2 size={17}/><span><strong>{name}</strong><small>{meta}</small></span>{ready?<Check size={14}/>:<Clock3 size={14}/>}</div>}
type QuickAddField=string|{label:string;type:"text"|"date"|"select";options?:string[]};
function QuickAdd({title,fields,initialValues,showApproximate=false,initialApproximate=false,onClose,onSave}:{title:string;fields:QuickAddField[];initialValues?:string[];showApproximate?:boolean;initialApproximate?:boolean;onClose:()=>void;onSave:(values:string[],approximate:boolean)=>void}){
  const normalized=fields.map(field=>typeof field==="string"?{label:field,type:"text" as const}:field);
  const [values,setValues]=useState(normalized.map((field,index)=>field.type==="date"&&!/^\d{4}-\d{2}-\d{2}$/.test(initialValues?.[index]||"")?"":initialValues?.[index]||""));
  const [approximate,setApproximate]=useState(initialApproximate);
  function setValue(index:number,value:string){setValues(current=>current.map((item,i)=>i===index?value:item))}
  return <div className="rw-modal-wrap" role="presentation"><section className="rw-modal" role="dialog" aria-modal="true" aria-labelledby="quick-add-title"><header><h2 id="quick-add-title">{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></header>{normalized.map((field,index)=><label key={field.label}><span>{field.label}</span>{field.type==="select"?<select value={values[index]} onChange={event=>setValue(index,event.target.value)}><option value="">Select an option</option>{field.options?.map(option=><option value={option} key={option}>{option}</option>)}</select>:<input type={field.type} value={values[index]} onChange={event=>setValue(index,event.target.value)}/>}</label>)}{showApproximate&&<label className="rw-approximate"><input type="checkbox" checked={approximate} onChange={event=>setApproximate(event.target.checked)}/><span>I do not know the exact dates</span></label>}<p><CircleHelp size={14}/> Leave anything blank if you are not sure. You can return later.</p><footer><button className="rw-secondary" type="button" onClick={onClose}>Cancel</button><button className="rw-primary" type="button" onClick={()=>onSave(values,approximate)}>Save item</button></footer></section></div>
}
function SourceInspector({source,verified,onConfirm,onCorrection,onClose}:{source:SourceReference;verified:boolean;onConfirm:()=>void;onCorrection:()=>void;onClose:()=>void}){return <div className="rw-modal-wrap"><section className="rw-modal rw-source-inspector" role="dialog" aria-modal="true" aria-labelledby="source-inspector-title"><header><div><span className="rw-kicker">Source inspection</span><h2 id="source-inspector-title">{source.label}</h2></div><button type="button" aria-label="Close source inspection" onClick={onClose}><X size={18}/></button></header><div className="rw-source-location"><FileCheck2 size={18}/><div><strong>{source.location||"Intake answer"}</strong><small>{source.kind==="document"?"Fictional document preview":"Information you entered during intake"}</small></div></div><blockquote>“{source.excerpt}”</blockquote><div className="rw-source-meta"><span>Extraction match: {source.confidence}</span><span>{verified?"Verified by you":"Needs your review"}</span></div><p><Info size={14}/> Confirm only that the wording and location are accurate. This does not determine whether the information proves a claim.</p><footer><button className="rw-secondary" type="button" onClick={onCorrection}>Correction needed</button><button className="rw-primary" type="button" onClick={onConfirm}>{verified?<><Check size={14}/> Already verified</>:<>Confirm source <Check size={14}/></>}</button></footer></section></div>}

function DownloadPreview({onClose,claims,onFollowUp}:{onClose:()=>void;claims:ClaimWorkspace[];onFollowUp:()=>void}){
  return <div className="rw-modal-wrap"><section className="rw-modal rw-download" role="dialog" aria-modal="true" aria-labelledby="download-title"><header><div><span className="rw-kicker">Download preview</span><h2 id="download-title">Your package is ready to download</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></header><div className="rw-download-mark"><Download size={26}/><span><strong>debrief-claim-package.zip</strong><small>{claims.length+2} folders and files, fictional preview</small></span></div><FileRow name="00 Package index.pdf" meta="Review checklist and file map"/>{claims.map((item,index)=><FileRow key={item.id} name={`0${index+1} ${item.title}/`} meta="Statement, source trace, and linked documents"/>)}<FileRow name="Submission instructions.pdf" meta="Official links and reminders"/><p>This prototype does not create a file. A production download would preserve the approved version and record when it was generated.</p><div className="rw-follow-up-callout"><LockKeyhole size={18}/><div><strong>Keep this package unchanged</strong><p>If a later decision requires more work, start a linked follow-up package instead of editing this history.</p></div><button type="button" onClick={onFollowUp}>Preview follow-up</button></div><footer><button className="rw-primary" type="button" onClick={onClose}>Done</button></footer></section></div>
}

function FollowUpPreview({onClose}:{onClose:()=>void}){return <div className="rw-modal-wrap"><section className="rw-modal rw-follow-up" role="dialog" aria-modal="true" aria-labelledby="follow-up-title"><header><div><span className="rw-kicker">Linked follow-up package</span><h2 id="follow-up-title">Start a new package without changing the prior package.</h2></div><button type="button" aria-label="Close follow-up preview" onClick={onClose}><X size={18}/></button></header><p>The approved package and future VA decision remain preserved as immutable history.</p><div className="rw-follow-up-options">{[["Supplemental claim","Add new and relevant evidence"],["Increased-rating claim","Document that a service-connected condition has worsened"],["Contested decision","Organize the decision and review options"]].map(([title,copy])=><button type="button" key={title}><strong>{title}</strong><small>{copy}</small><ArrowRight size={15}/></button>)}</div><footer><button className="rw-primary" type="button" onClick={onClose}>Return to package</button></footer></section></div>}
