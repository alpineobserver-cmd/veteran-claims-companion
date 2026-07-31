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
  prototypeCase,prototypeDocuments,prototypeLeads,prototypeSources,
  type ClaimLead,type ClaimWorkspace,type DocumentRecord,type HealthEvent,
  type PackageReadinessItem,type PrototypeScreen,type ServicePeriod,type SourceReference,type WorkspaceDraft
} from "@/lib/rework-prototype";

const screens:Array<{id:PrototypeScreen;label:string;short:string}>=[
  {id:"orientation",label:"Orientation",short:"Start"},
  {id:"intake",label:"Service & health",short:"Intake"},
  {id:"documents",label:"My Documents",short:"Documents"},
  {id:"leads",label:"Claim leads",short:"Leads"},
  {id:"dashboard",label:"Case dashboard",short:"Dashboard"},
  {id:"workspace",label:"Claim workspace",short:"Workspace"},
  {id:"package",label:"Package review",short:"Review"}
];
const storageKey="debrief.rework-preview.v1";

type SavedState={
  screen:PrototypeScreen;
  services:ServicePeriod[];
  events:HealthEvent[];
  documents:DocumentRecord[];
  leads:ClaimLead[];
  claims:ClaimWorkspace[];
  checks:PackageReadinessItem[];
  approved:boolean;
  briefingSeen?:boolean;
  visitedScreens?:PrototypeScreen[];
  workspaceDraft?:WorkspaceDraft;
  buddyDecision?:BuddyDecision;
};

type BuddyDecision="undecided"|"add"|"not-available"|"not-needed";

const initialWorkspaceDraft:WorkspaceDraft={
  serviceEvent:"Right knee injury during unit training in 2013. Pain followed a field exercise and was evaluated at the base clinic.",
  currentSymptoms:"Intermittent right knee pain with running, stairs, and prolonged standing.",
  diagnosis:"No current diagnosis or evaluation entered.",
  relationship:"Symptoms began after the training injury and returned during loaded marches.",
  dailyImpact:"Knee pain limits stairs, running, kneeling, and prolonged standing.",
  verifiedSourceIds:["src-knee-intake"],
  statementReviewed:false
};

const initialChecks:PackageReadinessItem[]=[
  {id:"check-statement",claimId:"claim-knee",title:"Approve the right knee personal statement",detail:"Review every section before including it in the package.",required:true,resolved:false},
  {id:"check-citation",claimId:"claim-knee",title:"Confirm the page 18 record reference",detail:"Verify that the cited page supports the statement wording.",required:true,resolved:false},
  {id:"check-buddy",claimId:"claim-knee",title:"Decide whether to include a buddy statement",detail:"Record your choice so the package does not leave this question unresolved.",required:false,resolved:false}
];

export function ReworkPrototype(){
  const [screen,setScreen]=useState<PrototypeScreen>("orientation");
  const [services,setServices]=useState(prototypeCase.servicePeriods);
  const [events,setEvents]=useState(prototypeCase.healthEvents);
  const [documents,setDocuments]=useState(prototypeDocuments);
  const [leads,setLeads]=useState(prototypeLeads);
  const [claims,setClaims]=useState<ClaimWorkspace[]>([]);
  const [checks,setChecks]=useState(initialChecks);
  const [approved,setApproved]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [notice,setNotice]=useState("");
  const [downloadOpen,setDownloadOpen]=useState(false);
  const [briefingOpen,setBriefingOpen]=useState(false);
  const [briefingSeen,setBriefingSeen]=useState(false);
  const [visitedScreens,setVisitedScreens]=useState<PrototypeScreen[]>(["orientation"]);
  const [workspaceDraft,setWorkspaceDraft]=useState<WorkspaceDraft>(initialWorkspaceDraft);
  const [buddyDecision,setBuddyDecision]=useState<BuddyDecision>("undecided");
  const [inspectedSource,setInspectedSource]=useState<SourceReference|null>(null);
  const [followUpOpen,setFollowUpOpen]=useState(false);

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(storageKey)||"null") as SavedState|null;
      if(saved){setScreen(saved.screen);setServices(saved.services);setEvents(saved.events);setDocuments(saved.documents);setLeads(saved.leads);setClaims((saved.claims||[]).map(claim=>({...claim,milestone:claim.milestone||"Foundation captured"})));setChecks(saved.checks||initialChecks);setApproved(saved.approved);setBriefingSeen(Boolean(saved.briefingSeen));setBriefingOpen(!saved.briefingSeen);setVisitedScreens(saved.visitedScreens?.length?saved.visitedScreens:[saved.screen]);setWorkspaceDraft(saved.workspaceDraft||initialWorkspaceDraft);setBuddyDecision(saved.buddyDecision||"undecided")}
      else setBriefingOpen(true);
    }catch{}
    setLoaded(true);
  },[]);
  useEffect(()=>{
    if(!loaded)return;
    localStorage.setItem(storageKey,JSON.stringify({screen,services,events,documents,leads,claims,checks,approved,briefingSeen,visitedScreens,workspaceDraft,buddyDecision}));
  },[screen,services,events,documents,leads,claims,checks,approved,briefingSeen,visitedScreens,workspaceDraft,buddyDecision,loaded]);

  const unresolved=checks.filter(item=>item.required&&!item.resolved);
  function navigate(next:PrototypeScreen){setScreen(next);setVisitedScreens(current=>current.includes(next)?current:[...current,next]);setMenuOpen(false);setNotice("");window.scrollTo({top:0,behavior:"smooth"})}
  function reset(){
    localStorage.removeItem(storageKey);setScreen("orientation");setServices(prototypeCase.servicePeriods);setEvents(prototypeCase.healthEvents);
    setDocuments(prototypeDocuments);setLeads(prototypeLeads);setClaims([]);setChecks(initialChecks);setApproved(false);setBriefingSeen(false);setBriefingOpen(true);setVisitedScreens(["orientation"]);setWorkspaceDraft(initialWorkspaceDraft);setBuddyDecision("undecided");setInspectedSource(null);setFollowUpOpen(false);setNotice("Preview reset to its fictional starting state.");
  }
  function closeBriefing(doNotShowAgain:boolean,start:boolean){
    setBriefingSeen(doNotShowAgain);
    setBriefingOpen(false);
    if(start)navigate("intake");
  }
  function invalidateApproval(message:string){if(approved)setNotice("Final approval was cleared because package information changed.");else setNotice(message);setApproved(false)}
  function inspectSource(sourceId:string){const source=prototypeSources.find(item=>item.id===sourceId);if(source)setInspectedSource(source)}
  function confirmSource(sourceId:string){
    setWorkspaceDraft(current=>({...current,verifiedSourceIds:current.verifiedSourceIds.includes(sourceId)?current.verifiedSourceIds:[...current.verifiedSourceIds,sourceId]}));
    if(sourceId==="src-knee-record")setChecks(current=>current.map(item=>item.id==="check-citation"?{...item,resolved:true}:item));
    invalidateApproval("Source confirmed and connected to the workspace.");setInspectedSource(null);
  }

  return <div className="rw-shell">
    <a className="rw-skip" href="#rework-main">Skip to main content</a>
    <aside className={menuOpen?"open":""} aria-label="Case journey navigation" inert={briefingOpen?true:undefined}>
      <div className="rw-brand"><span><ShieldCheck size={21}/></span><div><strong>Debrief</strong><small>Guided case preview</small></div><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <nav>{screens.map((item,index)=><button type="button" className={screen===item.id?"active":""} aria-current={screen===item.id?"page":undefined} onClick={()=>navigate(item.id)} key={item.id}><span>{index+1}</span><div><strong>{item.label}</strong><small>{screen===item.id?"Current step":visitedScreens.includes(item.id)?"Visited":"Available anytime"}</small></div></button>)}</nav>
      <div className="rw-utility-nav">
        <span>Reference &amp; support</span>
        <Link href="/exposure-record-check"><Radar size={16}/><strong>Exposure Checker</strong></Link>
        <Link href="/conditions"><BookOpenCheck size={16}/><strong>Conditions library</strong></Link>
        <Link href="/forms"><Files size={16}/><strong>Forms guide</strong></Link>
        <Link href="/support"><LifeBuoy size={16}/><strong>Help &amp; guide</strong></Link>
        <Link href="/support#content-correction"><MessageSquareText size={16}/><strong>Send feedback</strong></Link>
      </div>
      <div className="rw-boundary"><ShieldCheck size={16}/><p><strong>Fictional preview only</strong>Do not upload or enter real personal, medical, or military information.</p></div>
      <button className="rw-reset" type="button" onClick={reset}><RotateCcw size={14}/> Reset preview</button>
    </aside>
    {menuOpen&&<button className="rw-scrim" type="button" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
    <div className="rw-stage" inert={briefingOpen?true:undefined}>
      <header className="rw-topbar">
        <button type="button" className="rw-menu" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={19}/></button>
        <div><span>Fictional case</span><strong>Initial disability claim</strong></div>
        <div className="rw-top-actions"><span className="rw-save"><Check size={13}/> Saved on this device</span><button className="rw-guide" type="button" onClick={()=>setNotice("This fictional preview saves only on this device. Sign in represents future cross-device access.")}><Info size={17}/> <span>Save details</span></button><button className="rw-guide" type="button" onClick={()=>setBriefingOpen(true)}><CircleHelp size={17}/> <span>How Debrief works</span></button><Link className="rw-sign-in" href="/login?redirectTo=/rework-preview"><UserRound size={15}/> Sign in</Link></div>
      </header>
      <main id="rework-main" tabIndex={-1}>
        {notice&&<div className="rw-notice" role="status"><Info size={16}/><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={()=>setNotice("")}>×</button></div>}
        {screen==="orientation"&&<Orientation onStart={()=>navigate("intake")}/>}
        {screen==="intake"&&<Intake services={services} setServices={setServices} events={events} setEvents={setEvents} onContinue={()=>navigate("documents")} setNotice={setNotice}/>}
        {screen==="documents"&&<Documents documents={documents} setDocuments={setDocuments} onContinue={()=>navigate("leads")} setNotice={setNotice} onInspectSource={inspectSource}/>}
        {screen==="leads"&&<Leads leads={leads} setLeads={setLeads} documents={documents} claims={claims} setClaims={setClaims} onContinue={()=>navigate("dashboard")} setNotice={setNotice} onInspectSource={inspectSource}/>}
        {screen==="dashboard"&&<Dashboard services={services} documents={documents} leads={leads} claims={claims} onNavigate={navigate}/>}
        {screen==="workspace"&&<ClaimWorkspaceView claims={claims} setClaims={setClaims} draft={workspaceDraft} setDraft={setWorkspaceDraft} checks={checks} setChecks={setChecks} onNavigate={navigate} onInspectSource={inspectSource} invalidateApproval={invalidateApproval} setNotice={setNotice}/>}
        {screen==="package"&&<PackageReview claims={claims} checks={checks} approved={approved} setApproved={setApproved} unresolved={unresolved} invalidateApproval={invalidateApproval} setDownloadOpen={setDownloadOpen} onNavigate={navigate} onInspectSource={inspectSource} buddyDecision={buddyDecision} setBuddyDecision={setBuddyDecision}/>}
      </main>
    </div>
    {briefingOpen&&<MissionBriefing onClose={closeBriefing} canStart={screen==="orientation"}/>}
    {inspectedSource&&<SourceInspector source={inspectedSource} verified={workspaceDraft.verifiedSourceIds.includes(inspectedSource.id)} onConfirm={()=>confirmSource(inspectedSource.id)} onCorrection={()=>{setNotice("Correction noted. The extracted wording would be excluded until you replace it.");setInspectedSource(null)}} onClose={()=>setInspectedSource(null)}/>}
    {downloadOpen&&<DownloadPreview onClose={()=>setDownloadOpen(false)} claims={claims} onFollowUp={()=>{setDownloadOpen(false);setFollowUpOpen(true)}}/>}
    {followUpOpen&&<FollowUpPreview onClose={()=>setFollowUpOpen(false)}/>}
  </div>;
}

function MissionBriefing({onClose,canStart}:{onClose:(doNotShowAgain:boolean,start:boolean)=>void;canStart:boolean}){
  const [doNotShowAgain,setDoNotShowAgain]=useState(false);
  const titleRef=useRef<HTMLHeadingElement>(null);
  const dialogRef=useRef<HTMLElement>(null);
  const preferenceRef=useRef(false);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  useEffect(()=>{
    const previouslyFocused=document.activeElement as HTMLElement|null;
    titleRef.current?.focus();
    function onKeyDown(event:KeyboardEvent){
      if(event.key==="Escape"){closeRef.current(preferenceRef.current,false);return}
      if(event.key!=="Tab"||!dialogRef.current)return;
      const controls=Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button,input"));
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
      <header><div><span className="rw-kicker">Mission briefing</span><h2 id="mission-briefing-title" ref={titleRef} tabIndex={-1}>A well-supported original claim connects three things.</h2></div><button type="button" aria-label="Close mission briefing" onClick={()=>onClose(doNotShowAgain,false)}><X size={19}/></button></header>
      <p id="mission-briefing-intro" className="rw-briefing-intro">Evidence needs depend on the type of claim. These are common building blocks, not a guarantee of eligibility or outcome.</p>
      <div className="rw-briefing-body">
        <div className="rw-briefing-connections">{connections.map(([title,copy],index)=><article key={title}><span aria-hidden="true">{index+1}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
        <aside className="rw-briefing-side">
          <div className="rw-briefing-role"><Sparkles size={20}/><div><h3>Debrief organizes the evidence</h3><p>Service and medical records, personal accounts, and witness statements can each preserve useful facts.</p></div></div>
          <div className="rw-briefing-control"><ShieldCheck size={19}/><div><h3>You remain in control</h3><p>Debrief does not decide eligibility or submit your claim. You verify each source and approve what is included.</p><a href="https://www.va.gov/disability/how-to-file-claim/evidence-needed/" target="_blank" rel="noreferrer">Read official VA evidence guidance <ExternalLink size={13}/></a></div></div>
        </aside>
      </div>
      <div className="rw-briefing-end">
        <label className="rw-briefing-choice"><input type="checkbox" checked={doNotShowAgain} onChange={event=>{preferenceRef.current=event.target.checked;setDoNotShowAgain(event.target.checked)}}/><span>Do not show this briefing again</span></label>
        <footer>{canStart&&<button className="rw-secondary" type="button" onClick={()=>onClose(doNotShowAgain,false)}>View orientation</button>}<button className="rw-primary" type="button" onClick={()=>onClose(doNotShowAgain,canStart)}>{canStart?"Begin your debrief":"Return to case"} <ArrowRight size={15}/></button></footer>
      </div>
    </section>
  </div>;
}

function Orientation({onStart}:{onStart:()=>void}){
  return <div className="rw-page rw-orientation">
    <section className="rw-hero">
      <div><span className="rw-kicker">Your experience is the starting information</span><h1>Bring the mission details together. Build from what you know.</h1><p>Your service history, symptoms, records, and firsthand account hold valuable facts. Debrief helps you recover, organize, and verify them.</p><button className="rw-primary" type="button" onClick={onStart}>Begin your debrief <ArrowRight size={16}/></button><small>This preview saves on this device. Sign in represents future cross-device access.</small></div>
      <aside aria-label="What to have ready"><span>WHAT TO HAVE READY</span>{["Service dates and locations","Injuries, symptoms, and treatment","Records you already have","People who observed a change"].map((label,index)=><div key={label}><i>{index+1}</i><strong>{label}</strong>{index===0&&<em>Start here</em>}</div>)}</aside>
    </section>
    <section className="rw-purpose"><div><span className="rw-kicker">The information you already carry</span><h2>Your debrief turns scattered details into a usable record.</h2><p className="rw-purpose-copy">Dates, locations, duties, symptoms, treatment, and firsthand observations can be difficult to recall all at once. Debrief gives each detail a place and keeps its source visible.</p></div><div className="rw-support-list">{[
      ["Your firsthand account","Only you can describe what happened, when you noticed a change, and how it affects your life."],
      ["Your service history","Locations, duties, deployments, and exposures provide the context records may not explain on their own."],
      ["Your records","Military and medical documents can confirm dates, treatment, recurring symptoms, or events."],
      ["People who observed the change","Buddy statements can preserve useful firsthand observations from others."]
    ].map(([title,copy],index)=><article key={title}><span>0{index+1}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
    <section className="rw-does"><div><CheckCircle2 size={21}/><h3>Debrief preserves the useful details</h3><p>Connect facts to their source, identify what is missing, and carry verified information into each claim workspace.</p></div><div><CircleHelp size={21}/><h3>You decide what belongs in the package</h3><p>Debrief does not decide eligibility, predict an outcome, submit to VA, or replace accredited or medical help.</p></div></section>
  </div>;
}

function friendlyDate(value:string){const match=value.match(/^(\d{4})-(\d{2})$/);if(!match)return value;const month=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(match[2])-1];return `${month} ${match[1]}`}
function formatRange(start:string,end:string){return `${friendlyDate(start)} to ${friendlyDate(end)}`}

function Intake({services,setServices,events,setEvents,onContinue,setNotice}:{services:ServicePeriod[];setServices:(value:ServicePeriod[])=>void;events:HealthEvent[];setEvents:(value:HealthEvent[])=>void;onContinue:()=>void;setNotice:(value:string)=>void}){
  const [serviceEditor,setServiceEditor]=useState<"new"|string|null>(null);
  const [eventEditor,setEventEditor]=useState<"new"|string|null>(null);
  const serviceBeingEdited=services.find(item=>item.id===serviceEditor);
  const eventBeingEdited=events.find(item=>item.id===eventEditor);
  return <div className="rw-page">
    <PageHead kicker="Service and health intake" title="Start with what only you know." copy="Capture the mission context, key events, and changes you remember. Approximate dates are welcome."/>
    <div className="rw-intake-grid">
      <section className="rw-panel"><PanelHead icon={History} title="Service history" count={`${services.length} ${services.length===1?"period":"periods"}`} action="Add service period" onAction={()=>setServiceEditor("new")}/>{services.map(item=><TimelineRow key={item.id} title={item.location} meta={`${item.kind}, ${formatRange(item.start,item.end)}`} copy={`${item.role}. ${item.exposures}`} approximate={item.approximate} onEdit={()=>setServiceEditor(item.id)}/>)}</section>
      <section className="rw-panel"><PanelHead icon={BookOpenCheck} title="Health timeline" count={`${events.length} ${events.length===1?"event":"events"}`} action="Add health event" onAction={()=>setEventEditor("new")}/>{events.map(item=><TimelineRow key={item.id} title={item.title} meta={`${item.type}, ${friendlyDate(item.date)}`} copy={item.details} approximate={item.approximate} onEdit={()=>setEventEditor(item.id)}/>)}</section>
    </div>
    <section className="rw-connection"><span><Link2 size={18}/></span><div><strong>Debrief connection found</strong><p>The 2013 knee event occurred during the Lemoore duty period. You will verify this relationship inside the claim workspace.</p></div><button type="button" onClick={()=>setNotice("This connection will remain labeled as user-confirmed, not system-inferred.")}>How this is used</button></section>
    <div className="rw-unsure"><CircleHelp size={19}/><div><strong>Not sure about a date?</strong><p>Use a year, season, deployment, or other approximate period. Debrief will preserve that uncertainty.</p></div></div>
    <FooterActions next={onContinue} nextLabel="Continue to documents"/>
    {serviceEditor&&<QuickAdd title={serviceBeingEdited?"Edit service period":"Add a service period"} fields={["Period type: duty station, deployment, or TDY","Location or unit","Role or duty","Duties, conditions, or exposures to remember","Start date","End date"]} initialValues={serviceBeingEdited?[serviceBeingEdited.kind,serviceBeingEdited.location,serviceBeingEdited.role,serviceBeingEdited.exposures,serviceBeingEdited.start,serviceBeingEdited.end]:undefined} showApproximate initialApproximate={serviceBeingEdited?.approximate} onClose={()=>setServiceEditor(null)} onSave={(values,approximate)=>{
      const enteredKind=values[0].toLowerCase();const kind:ServicePeriod["kind"]=enteredKind.includes("deploy")?"Deployment":enteredKind.includes("duty")?"Duty station":"TDY";
      if(serviceBeingEdited)setServices(services.map(item=>item.id===serviceBeingEdited.id?{...item,kind,location:values[1]||item.location,role:values[2]||item.role,exposures:values[3]||item.exposures,start:values[4]||item.start,end:values[5]||item.end,approximate}:item));
      else setServices([...services,{id:`service-${Date.now()}`,kind,location:values[1]||"Additional duty location",role:values[2]||"Role not entered",start:values[4]||"Date unknown",end:values[5]||"Date unknown",approximate,exposures:values[3]||"No duties or exposures entered yet."}]);
      setServiceEditor(null);setNotice(serviceBeingEdited?"Service period updated.":"Service period added with approximate dates.");
    }}/>} 
    {eventEditor&&<QuickAdd title={eventBeingEdited?"Edit health event":"Add a health event"} fields={["Injury, illness, surgery, or treatment","What happened","Date"]} initialValues={eventBeingEdited?[eventBeingEdited.title,eventBeingEdited.details,eventBeingEdited.date]:undefined} showApproximate initialApproximate={eventBeingEdited?.approximate} onClose={()=>setEventEditor(null)} onSave={(values,approximate)=>{
      if(eventBeingEdited)setEvents(events.map(item=>item.id===eventBeingEdited.id?{...item,title:values[0]||item.title,details:values[1]||item.details,date:values[2]||item.date,approximate}:item));
      else setEvents([...events,{id:`event-${Date.now()}`,type:"Treatment",title:values[0]||"Additional health event",details:values[1]||"Details not entered yet.",date:values[2]||"Date unknown",approximate}]);
      setEventEditor(null);setNotice(eventBeingEdited?"Health event updated.":"Health event added with an approximate date.");
    }}/>}
  </div>;
}

function Documents({documents,setDocuments,onContinue,setNotice,onInspectSource}:{documents:DocumentRecord[];setDocuments:(value:DocumentRecord[])=>void;onContinue:()=>void;setNotice:(value:string)=>void;onInspectSource:(sourceId:string)=>void}){
  const [filter,setFilter]=useState("");
  const visible=documents.filter(item=>`${item.name} ${item.type}`.toLowerCase().includes(filter.toLowerCase()));
  function simulateUpload(){
    const id=`doc-${Date.now()}`;
    setDocuments([...documents,{id,name:"Fictional orthopedic visit.pdf",type:"Civilian medical record",dateRange:"2025",status:"processing",caseIds:["case-1"],claimIds:[],insights:[]}]);
    setNotice("Fictional document added. Analysis is being simulated.");
    window.setTimeout(()=>setDocuments([...documents,{id,name:"Fictional orthopedic visit.pdf",type:"Civilian medical record",dateRange:"2025",status:"ready",caseIds:["case-1"],claimIds:[],insights:[{id:`ins-${id}`,topic:"Right knee",excerpt:"Reports recurring knee discomfort when using stairs.",page:3,confidence:"medium",verification:"unreviewed"}]}]),900);
  }
  function retry(id:string){setDocuments(documents.map(item=>item.id===id?{...item,status:"processing"}:item));setNotice("Analysis retry started.");window.setTimeout(()=>setDocuments(documents.map(item=>item.id===id?{...item,status:"ready",insights:[{id:`ins-${id}`,topic:"Lower back",excerpt:"Reports occasional lower-back stiffness.",page:2,confidence:"low",verification:"unreviewed"}]}:item)),900)}
  function toggleCaseLink(id:string){setDocuments(documents.map(item=>item.id===id?{...item,caseIds:item.caseIds.includes("case-1")?item.caseIds.filter(caseId=>caseId!=="case-1"):[...item.caseIds,"case-1"]}:item));setNotice("Document case link updated.")}
  function inspectInsight(documentId:string,page:number){const source=prototypeSources.find(item=>item.documentId===documentId&&item.location===`Page ${page}`);if(source)onInspectSource(source.id);else setNotice("This fictional topic does not yet have a page preview.")}
  const failedCount=documents.filter(item=>item.status==="failed").length;
  return <div className="rw-page">
    <PageHead kicker="My Documents" title="Turn records into findable facts." copy="Upload once. Debrief keeps the useful page, date, and topic connected to its source."/>
    <div className="rw-doc-toolbar"><label><Search size={16}/><input aria-label="Search documents" placeholder="Search documents" value={filter} onChange={event=>setFilter(event.target.value)}/></label><button className="rw-primary" type="button" onClick={simulateUpload}><UploadCloud size={16}/> Simulate upload</button></div>
    <div className="rw-doc-layout">
      <section className="rw-panel rw-doc-list"><div className="rw-section-title"><div><span className="rw-kicker">Your library</span><h2>{documents.length} fictional documents</h2></div><span>Upload once, link where needed</span></div>{visible.length?visible.map(item=><article key={item.id}><span className="rw-file-icon"><Files size={18}/></span><div><strong>{item.name}</strong><small>{item.type}, {item.dateRange}</small><div>{item.insights.slice(0,2).map(insight=><button type="button" className="rw-topic" key={insight.id} onClick={()=>inspectInsight(item.id,insight.page)}>{insight.topic} <Eye size={12}/></button>)}</div>{item.status==="failed"&&<p className="rw-doc-error">Analysis stopped before text could be extracted. Retry the fictional analysis or continue without this document.</p>}</div><div className="rw-doc-controls"><DocStatus item={item} retry={()=>retry(item.id)}/><button type="button" className="rw-link-control" onClick={()=>toggleCaseLink(item.id)}>{item.caseIds.includes("case-1")?<><Link2 size={13}/> Linked to case</>:<><Plus size={13}/> Link to case</>}</button></div></article>):<div className="rw-empty compact"><Search size={24}/><h2>No matching documents</h2><p>Try a file name or document type.</p></div>}</section>
      <aside className="rw-analysis"><span className="rw-kicker">Analysis status</span><h2>{documents.filter(item=>item.status==="ready").length} ready{failedCount?`, ${failedCount} needs attention`:""}</h2><p>Debrief found {documents.reduce((sum,item)=>sum+item.insights.length,0)} topics for your review. A topic is not a diagnosis or a recommendation to file.</p><div><strong><Sparkles size={15}/> Open the source</strong><p>Select a topic to inspect the page reference, extracted wording, and review status before using it.</p></div><div><strong><ShieldCheck size={15}/> Your records stay under your control</strong><p>A production version would explain consent, storage, retention, deletion, and provider access before any upload.</p></div></aside>
    </div>
    <FooterActions next={onContinue} nextLabel="Review claim leads"/>
  </div>;
}

function Leads({leads,setLeads,documents,claims,setClaims,onContinue,setNotice,onInspectSource}:{leads:ClaimLead[];setLeads:(value:ClaimLead[])=>void;documents:DocumentRecord[];claims:ClaimWorkspace[];setClaims:(value:ClaimWorkspace[])=>void;onContinue:()=>void;setNotice:(value:string)=>void;onInspectSource:(sourceId:string)=>void}){
  const [showDismissed,setShowDismissed]=useState(false);
  const [customOpen,setCustomOpen]=useState(false);
  const visible=leads.filter(item=>showDismissed?item.status==="dismissed":item.status!=="dismissed");
  function accept(lead:ClaimLead){
    setLeads(leads.map(item=>item.id===lead.id?{...item,status:"accepted"}:item));
    if(!claims.some(item=>item.id===`claim-${lead.id}`))setClaims([...claims,{id:`claim-${lead.id}`,title:lead.title,path:"Original claim",progress:0,milestone:"Foundation captured",sourceIds:lead.sourceIds,documentIds:documents.filter(doc=>lead.sourceIds.some(id=>prototypeSources.find(source=>source.id===id)?.documentId===doc.id)).map(doc=>doc.id),updated:"Just now"}]);
    setNotice(`${lead.title} added as a claim workspace.`);
  }
  function dismiss(id:string){setLeads(leads.map(item=>item.id===id?{...item,status:"dismissed"}:item));setNotice("Lead dismissed. You can restore it at any time.")}
  function restore(id:string){setLeads(leads.map(item=>item.id===id?{...item,status:"open"}:item));setNotice("Lead restored.")}
  function merge(id:string){setLeads(leads.map(item=>item.id===id?{...item,status:"merged"}:item));setNotice("Lead merged into the right knee workspace. Its sources remain linked.")}
  return <div className="rw-page">
    <PageHead kicker="Claim leads" title="Connect patterns without losing the source." copy="Review why each topic appeared, verify the supporting information, and decide what deserves a workspace."/>
    <div className="rw-advisory"><Info size={17}/><p><strong>A lead is a topic to review.</strong> It is not a recommendation to file and does not predict eligibility, rating, or outcome.</p></div>
    <div className="rw-lead-actions"><div><button type="button" className={!showDismissed?"active":""} onClick={()=>setShowDismissed(false)}>Active leads</button><button type="button" className={showDismissed?"active":""} onClick={()=>setShowDismissed(true)}>Dismissed ({leads.filter(item=>item.status==="dismissed").length})</button></div><button type="button" onClick={()=>setCustomOpen(true)}><Plus size={14}/> Add a claim not shown</button></div>
    <section className="rw-leads">{visible.length?visible.map(item=><LeadCard key={item.id} lead={item} canMerge={claims.some(claim=>claim.title.includes("knee"))} onAccept={()=>accept(item)} onDismiss={()=>dismiss(item.id)} onRestore={()=>restore(item.id)} onMerge={()=>merge(item.id)} onInspectSource={onInspectSource} onMissing={missing=>setNotice(`Create a workspace to add: ${missing}.`)}/>):<div className="rw-empty"><FolderSearch size={28}/><h2>No dismissed leads</h2><p>When you dismiss a lead, it will remain available here.</p></div>}</section>
    <FooterActions next={onContinue} nextLabel="Open case dashboard"/>
    {customOpen&&<QuickAdd title="Add your own claim topic" fields={["Condition or symptom","Why you want to review it"]} onClose={()=>setCustomOpen(false)} onSave={(values)=>{const title=values[0]||"User-added claim";setClaims([...claims,{id:`claim-custom-${Date.now()}`,title,path:"Path not selected",progress:0,milestone:"Needs foundation",sourceIds:[],documentIds:[],updated:"Just now"}]);setCustomOpen(false);setNotice(`${title} added without a system lead.`)}}/>}
  </div>;
}

function Dashboard({services,documents,leads,claims,onNavigate}:{services:ServicePeriod[];documents:DocumentRecord[];leads:ClaimLead[];claims:ClaimWorkspace[];onNavigate:(screen:PrototypeScreen)=>void}){
  const accepted=leads.filter(item=>item.status==="accepted").length;
  return <div className="rw-page">
    <PageHead kicker="Initial disability claim" title="Your debrief, organized into action." copy="See what you have established, what still needs your input, and where each fact will be used."/>
    <section className="rw-next"><span><ListChecks size={21}/></span><div><small>YOUR NEXT ACTION</small><h2>{claims.length?"Complete the right knee statement":"Choose a claim lead to build"}</h2><p>{claims.length?"Confirm the service event, current symptoms, and page references already linked to this workspace.":"Review the possible topics found in your intake and fictional documents."}</p></div><button className="rw-primary" type="button" onClick={()=>onNavigate(claims.length?"workspace":"leads")}>{claims.length?"Open workspace":"Review leads"} <ArrowRight size={15}/></button></section>
    <div className="rw-metrics"><div><span>Case foundation</span><strong>{services.length} service periods</strong><small>Reusable across this case</small></div><div><span>Document analysis</span><strong>{documents.filter(item=>item.status==="ready").length} of {documents.length} ready</strong><small>{documents.some(item=>item.status==="failed")?"One needs attention":"All processing complete"}</small></div><div><span>Claim leads</span><strong>{accepted} accepted</strong><small>{leads.filter(item=>item.status==="open").length} still to review</small></div><div><span>Package status</span><strong>{claims.length?"Needs review":"Not started"}</strong><small>Approval comes after readiness</small></div></div>
    <div className="rw-dashboard-grid">
      <section className="rw-panel"><div className="rw-section-title"><div><span className="rw-kicker">Claim workspaces</span><h2>{claims.length?`${claims.length} condition workspace${claims.length===1?"":"s"}`:"No workspaces yet"}</h2></div><button type="button" onClick={()=>onNavigate("leads")}><Plus size={14}/> Add condition</button></div>{claims.length?claims.map(item=><article className="rw-claim" key={item.id}><div><strong>{item.title}</strong><small>{item.path}. Updated {item.updated}</small><em><CheckCircle2 size={13}/> {item.milestone}</em></div><button type="button" onClick={()=>onNavigate("workspace")}>Continue <ArrowRight size={14}/></button></article>):<div className="rw-empty compact"><ClipboardCheck size={24}/><p>Accept a claim lead or add a condition yourself.</p></div>}</section>
      <aside className="rw-panel"><span className="rw-kicker">Open questions</span><h2>What still needs your input</h2><button type="button" onClick={()=>onNavigate("documents")}><AlertTriangle size={16}/><span><strong>One document needs analysis</strong><small>Retry the community clinic summary.</small></span><ArrowRight size={14}/></button><button type="button" onClick={()=>onNavigate("leads")}><CircleHelp size={16}/><span><strong>Review tinnitus symptoms</strong><small>No current symptom details were found.</small></span><ArrowRight size={14}/></button></aside>
    </div>
    <section className="rw-tools"><div><span className="rw-kicker">Connected case tools</span><h2>Your details travel with you</h2><p>These guides can use the service periods and claim topics you already entered. Nothing is added to the case without your review.</p></div><nav aria-label="Debrief guides"><Link href="/exposure-record-check"><Radar size={18}/><span><strong>Exposure Checker</strong><small>Starts with {services.length} saved service periods.</small></span><ArrowRight size={14}/></Link><Link href="/conditions"><BookOpenCheck size={18}/><span><strong>Conditions library</strong><small>Opens with the right knee topic in context.</small></span><ArrowRight size={14}/></Link><Link href="/forms"><Files size={18}/><span><strong>Forms guide</strong><small>Shows forms relevant to an original claim.</small></span><ArrowRight size={14}/></Link></nav></section>
  </div>;
}

function ClaimWorkspaceView({claims,setClaims,draft,setDraft,checks,setChecks,onNavigate,onInspectSource,invalidateApproval,setNotice}:{claims:ClaimWorkspace[];setClaims:(value:ClaimWorkspace[])=>void;draft:WorkspaceDraft;setDraft:(value:WorkspaceDraft)=>void;checks:PackageReadinessItem[];setChecks:(value:PackageReadinessItem[])=>void;onNavigate:(screen:PrototypeScreen)=>void;onInspectSource:(sourceId:string)=>void;invalidateApproval:(message:string)=>void;setNotice:(value:string)=>void}){
  const claim=claims[0];
  const sources=claim?prototypeSources.filter(source=>claim.sourceIds.includes(source.id)):[];
  function update<K extends keyof WorkspaceDraft>(field:K,value:WorkspaceDraft[K]){
    const next={...draft,[field]:value,statementReviewed:false};setDraft(next);
    setChecks(checks.map(item=>item.id==="check-statement"?{...item,resolved:false}:item));
    setClaims(claims.map(item=>({...item,milestone:"Foundation captured",updated:"Just now"})));
    invalidateApproval("Workspace content updated. Review the statement again before approval.");
  }
  function markReviewed(){
    setDraft({...draft,statementReviewed:true});setChecks(checks.map(item=>item.id==="check-statement"?{...item,resolved:true}:item));
    setClaims(claims.map(item=>({...item,milestone:"Statement reviewed",updated:"Just now"})));invalidateApproval("Statement review recorded.");setNotice("Statement reviewed. Later edits will clear this review.");
  }
  if(!claim)return <div className="rw-page"><PageHead kicker="Claim workspace" title="Create a claim workspace first." copy="Return to Claim leads and choose a topic, or add one yourself."/><section className="rw-package-empty"><span><FileText size={25}/></span><h2>No condition is open yet.</h2><p>A claim workspace gives your verified facts, statement, and sources one place to work together.</p><button className="rw-primary" type="button" onClick={()=>onNavigate("leads")}>Review claim leads <ArrowRight size={15}/></button></section></div>;
  return <div className="rw-page">
    <PageHead kicker="Right knee claim workspace" title="Build the statement from facts you can trace." copy="Review every prefilled detail, add what only you know, and verify the source before using it."/>
    <div className="rw-workspace-layout">
      <section className="rw-workspace-form">
        <div className="rw-workspace-status"><span><LockKeyhole size={17}/></span><div><strong>Nothing is silently inferred</strong><p>Intake, record, and user-entered information stay labeled throughout the statement.</p></div></div>
        <WorkspaceField number="1" title="Service event" source="From your health timeline" value={draft.serviceEvent} onChange={value=>update("serviceEvent",value)}/>
        <WorkspaceField number="2" title="Current symptoms" source="Entered by you" value={draft.currentSymptoms} onChange={value=>update("currentSymptoms",value)}/>
        <WorkspaceField number="3" title="Current diagnosis or evaluation" source="Entered by you" value={draft.diagnosis} onChange={value=>update("diagnosis",value)}/>
        <WorkspaceField number="4" title="Relationship to service" source="Your account, supported by reviewed sources" value={draft.relationship} onChange={value=>update("relationship",value)}/>
        <WorkspaceField number="5" title="Daily impact" source="Entered by you" value={draft.dailyImpact} onChange={value=>update("dailyImpact",value)}/>
        <div className="rw-statement-review"><div><strong>{draft.statementReviewed?"Statement reviewed":"Review the complete statement"}</strong><p>{draft.statementReviewed?"This version can move to package readiness. Editing any section will clear the review.":"Confirm the wording is accurate and reflects your own account before it enters the package."}</p></div><button className={draft.statementReviewed?"rw-secondary":"rw-primary"} type="button" onClick={markReviewed}>{draft.statementReviewed?<><CheckCircle2 size={15}/> Reviewed</>:<>Mark statement reviewed <Check size={15}/></>}</button></div>
      </section>
      <aside className="rw-source-tray"><span className="rw-kicker">Linked sources</span><h2>Verify before using</h2><p>Open the original location and confirm the extracted wording.</p>{sources.map(source=><button type="button" key={source.id} onClick={()=>onInspectSource(source.id)}><span>{source.kind==="document"?<FileCheck2 size={17}/>:<History size={17}/>}</span><div><strong>{source.label}</strong><small>{source.location||"Intake answer"}</small></div><em className={draft.verifiedSourceIds.includes(source.id)?"verified":"review"}>{draft.verifiedSourceIds.includes(source.id)?"Verified":"Review"}</em></button>)}<div className="rw-source-boundary"><Info size={15}/><p>Source wording is supporting information. Debrief does not decide whether it proves service connection.</p></div></aside>
    </div>
    <div className="rw-workspace-actions"><button className="rw-secondary" type="button" onClick={()=>onNavigate("dashboard")}><ArrowLeft size={15}/> Return to dashboard</button><button className="rw-primary" type="button" onClick={()=>onNavigate("package")}>Check package readiness <ArrowRight size={15}/></button></div>
  </div>;
}

function WorkspaceField({number,title,source,value,onChange}:{number:string;title:string;source:string;value:string;onChange:(value:string)=>void}){
  return <label className="rw-workspace-field"><span className="rw-field-number">{number}</span><span className="rw-field-copy"><strong>{title}</strong><small>{source}</small><textarea value={value} onChange={event=>onChange(event.target.value)} rows={title.includes("diagnosis")?2:3}/></span></label>;
}

function PackageReview({claims,checks,approved,setApproved,unresolved,invalidateApproval,setDownloadOpen,onNavigate,onInspectSource,buddyDecision,setBuddyDecision}:{claims:ClaimWorkspace[];checks:PackageReadinessItem[];approved:boolean;setApproved:(value:boolean)=>void;unresolved:PackageReadinessItem[];invalidateApproval:(message:string)=>void;setDownloadOpen:(value:boolean)=>void;onNavigate:(screen:PrototypeScreen)=>void;onInspectSource:(sourceId:string)=>void;buddyDecision:BuddyDecision;setBuddyDecision:(value:BuddyDecision)=>void}){
  const [tab,setTab]=useState<"readiness"|"approval">("readiness");
  const statementReady=Boolean(checks.find(item=>item.id==="check-statement")?.resolved);
  const citationReady=Boolean(checks.find(item=>item.id==="check-citation")?.resolved);
  if(!claims.length)return <div className="rw-page">
    <PageHead kicker="Package and final review" title="Turn verified information into a reviewable package." copy="Resolve missing details first. Then approve exactly what will be included in the download."/>
    <section className="rw-package-empty"><span><ClipboardCheck size={25}/></span><h2>Build a claim workspace before package review.</h2><p>Accept a claim lead or add a condition yourself. Readiness checks and package files will appear after a workspace exists.</p><button className="rw-primary" type="button" onClick={()=>onNavigate("leads")}>Review claim leads <ArrowRight size={15}/></button></section>
  </div>;
  return <div className="rw-page">
    <PageHead kicker="Package and final review" title="Turn verified information into a reviewable package." copy="Resolve missing details first. Then approve exactly what will be included in the download."/>
    <div className="rw-review-tabs" role="tablist" aria-label="Package review stages"><button role="tab" aria-selected={tab==="readiness"} className={tab==="readiness"?"active":""} onClick={()=>setTab("readiness")}><span>1</span> Package readiness</button><button role="tab" aria-selected={tab==="approval"} className={tab==="approval"?"active":""} onClick={()=>setTab("approval")}><span>2</span> Final approval</button></div>
    {tab==="readiness"?<div className="rw-review-grid">
      <section className="rw-panel"><div className="rw-readiness-head"><div><span className="rw-kicker">Required reviews</span><h2>{unresolved.length?`${unresolved.length} remaining`:"Required reviews complete"}</h2></div><span className={unresolved.length?"attention":"ready"}>{unresolved.length?"Needs attention":"Ready for approval"}</span></div><div className="rw-readiness-list"><ReadinessAction ready={statementReady} title="Right knee personal statement" detail="Open the workspace and review the complete statement wording." action="Review statement" onAction={()=>onNavigate("workspace")}/><ReadinessAction ready={citationReady} title="Page 18 record reference" detail="Open the source location and confirm the extracted wording." action="View page 18" onAction={()=>onInspectSource("src-knee-record")}/><fieldset className="rw-buddy-choice"><legend>Buddy statement decision <span>Optional evidence</span></legend><p>Record what you want to do so this question does not disappear from the package.</p>{[["add","I plan to add one"],["not-available","Not available"],["not-needed","Not for this package"]].map(([value,label])=><label key={value}><input type="radio" name="buddy-decision" value={value} checked={buddyDecision===value} onChange={()=>{setBuddyDecision(value as BuddyDecision);invalidateApproval("Buddy statement decision updated.")}}/><span>{label}</span></label>)}</fieldset></div></section>
      <aside className="rw-panel rw-package-files"><span className="rw-kicker">Package contents</span><h2>Files assembled for review</h2><FileRow name="Package index.pdf" meta="Case overview and file checklist" ready={statementReady&&citationReady}/>{claims.map(item=><FileRow key={item.id} name={`${item.title} review.pdf`} meta="Statement, source trace, and open questions" ready={statementReady&&citationReady}/>)}<FileRow name="Supporting records/" meta="Linked documents, without duplicate copies" ready={citationReady}/><p><Info size={14}/> Neutral file status becomes ready only after the related review is complete.</p></aside>
    </div>:<section className="rw-approval">
      <div className="rw-approval-status">{approved?<CheckCircle2 size={29}/>:<ClipboardCheck size={29}/>}<div><span className="rw-kicker">Final approval</span><h2>{approved?"Package approved":"Your approval is still required"}</h2><p>{approved?"Every required section was approved in this fictional preview. Any later package change will clear this approval.":"Review the package index, each condition statement, and every linked document before approving."}</p></div></div>
      {unresolved.length>0&&<div className="rw-warning"><AlertTriangle size={18}/><div><strong>Approval is blocked.</strong><p>Resolve {unresolved.length} required readiness {unresolved.length===1?"item":"items"} before approving the package.</p></div></div>}
      <div className="rw-approval-actions"><button type="button" className="rw-secondary" onClick={()=>setTab("readiness")}><ArrowLeft size={15}/> Return to readiness</button>{!approved?<button className="rw-primary" disabled={unresolved.length>0||!claims.length} type="button" onClick={()=>setApproved(true)}><Check size={15}/> Approve entire package</button>:<button className="rw-primary" type="button" onClick={()=>setDownloadOpen(true)}><Download size={15}/> Preview download package</button>}</div>
    </section>}
    {approved?<section className="rw-submit"><div><span className="rw-kicker">Submission bridge</span><h2>Download here. Submit through an official VA channel.</h2><p>Debrief does not collect VA credentials, submit a claim, or confirm receipt. Check current VA instructions before filing.</p></div><a href="https://www.va.gov/disability/how-to-file-claim/" target="_blank" rel="noreferrer">Open official filing guidance <ArrowRight size={14}/></a></section>:<p className="rw-submit-locked"><LockKeyhole size={15}/> Download and filing guidance appear after final approval.</p>}
  </div>;
}

function ReadinessAction({ready,title,detail,action,onAction}:{ready:boolean;title:string;detail:string;action:string;onAction:()=>void}){return <article className="rw-readiness-action"><span className={ready?"ready":"open"}>{ready?<Check size={15}/>:<Clock3 size={15}/>}</span><div><strong>{title}</strong><small>{detail}</small></div><button type="button" onClick={onAction}>{ready?"Review again":action} <ArrowRight size={14}/></button></article>}

function PageHead({kicker,title,copy}:{kicker:string;title:string;copy:string}){return <header className="rw-page-head"><span className="rw-kicker">{kicker}</span><h1>{title}</h1><p>{copy}</p></header>}
function PanelHead({icon:Icon,title,count,action,onAction}:{icon:typeof History;title:string;count:string;action:string;onAction:()=>void}){return <div className="rw-panel-head"><span><Icon size={18}/></span><div><h2>{title}</h2><small>{count}</small></div><button type="button" onClick={onAction}><Plus size={14}/> {action}</button></div>}
function TimelineRow({title,meta,copy,approximate,onEdit}:{title:string;meta:string;copy:string;approximate:boolean;onEdit:()=>void}){return <article className="rw-timeline-row"><i/><div><small>{meta}{approximate?", approximate":""}</small><strong>{title}</strong><p>{copy}</p></div><button type="button" aria-label={`Edit ${title}`} onClick={onEdit}>Edit</button></article>}
function FooterActions({next,nextLabel}:{next:()=>void;nextLabel:string}){return <div className="rw-footer-actions"><span className="rw-autosave-note"><Check size={14}/> Saved on this device. Sign in represents future syncing.</span><button className="rw-primary" type="button" onClick={next}>{nextLabel} <ArrowRight size={15}/></button></div>}
function DocStatus({item,retry}:{item:DocumentRecord;retry:()=>void}){if(item.status==="ready")return <span className="rw-doc-status ready"><CheckCircle2 size={14}/> Ready</span>;if(item.status==="processing")return <span className="rw-doc-status processing"><Clock3 size={14}/> Processing</span>;return <button type="button" className="rw-doc-status failed" onClick={retry}><RefreshCw size={14}/> Retry analysis</button>}
function LeadCard({lead,canMerge,onAccept,onDismiss,onRestore,onMerge,onInspectSource,onMissing}:{lead:ClaimLead;canMerge:boolean;onAccept:()=>void;onDismiss:()=>void;onRestore:()=>void;onMerge:()=>void;onInspectSource:(sourceId:string)=>void;onMissing:(missing:string)=>void}){
  const sources=prototypeSources.filter(source=>lead.sourceIds.includes(source.id));
  const [open,setOpen]=useState(lead.confidence==="high");
  const strength=lead.confidence==="high"?"Strong record pattern":lead.confidence==="medium"?"Some supporting information":"Limited information";
  return <article className={`rw-lead ${lead.confidence}`}><header><span className={`rw-confidence ${lead.confidence}`}>{strength}</span><div><h2>{lead.title}</h2><p>{lead.summary}</p></div>{lead.status==="accepted"&&<span className="rw-added"><Check size={13}/> Workspace added</span>}</header><button className="rw-source-toggle" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}><Link2 size={15}/> Why this appeared: {sources.length} source{sources.length===1?"":"s"} <ChevronDown size={15}/></button>{open&&<div className="rw-sources">{sources.map(source=><button type="button" key={source.id} onClick={()=>onInspectSource(source.id)}><span>{source.kind==="document"?<FileCheck2 size={15}/>:<History size={15}/>}</span><div><strong>{source.label}{source.location?`, ${source.location}`:""}</strong><p>“{source.excerpt}”</p><small>{source.kind==="document"?"Open the page reference and verify the wording.":"Confirmed intake answer."}</small></div><Eye size={15}/></button>)}</div>}<div className="rw-missing"><strong>Still needed</strong>{lead.missing.map(item=><button type="button" key={item} onClick={()=>onMissing(item)}>{item} <Plus size={12}/></button>)}</div><footer>{lead.status==="dismissed"?<button className="rw-secondary" type="button" onClick={onRestore}><RotateCcw size={14}/> Restore lead</button>:<><button className="rw-secondary" type="button" onClick={onDismiss}>Dismiss</button>{lead.title.includes("Lower")&&canMerge&&<button className="rw-secondary" type="button" onClick={onMerge}>Merge with knee workspace</button>}<button className="rw-primary" type="button" disabled={lead.status==="accepted"} onClick={onAccept}>{lead.status==="accepted"?"Workspace added":"Create claim workspace"} <ArrowRight size={14}/></button></>}</footer></article>
}
function FileRow({name,meta,ready=true}:{name:string;meta:string;ready?:boolean}){return <div className="rw-file-row"><FileCheck2 size={17}/><span><strong>{name}</strong><small>{meta}</small></span>{ready?<Check size={14}/>:<Clock3 size={14}/>}</div>}
function QuickAdd({title,fields,initialValues,showApproximate=false,initialApproximate=true,onClose,onSave}:{title:string;fields:string[];initialValues?:string[];showApproximate?:boolean;initialApproximate?:boolean;onClose:()=>void;onSave:(values:string[],approximate:boolean)=>void}){
  const [values,setValues]=useState(fields.map((_,index)=>initialValues?.[index]||""));
  const [approximate,setApproximate]=useState(initialApproximate);
  return <div className="rw-modal-wrap" role="presentation"><section className="rw-modal" role="dialog" aria-modal="true" aria-labelledby="quick-add-title"><header><h2 id="quick-add-title">{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></header>{fields.map((field,index)=><label key={field}><span>{field}</span><input value={values[index]} onChange={event=>setValues(values.map((value,i)=>i===index?event.target.value:value))}/></label>)}{showApproximate&&<label className="rw-approximate"><input type="checkbox" checked={approximate} onChange={event=>setApproximate(event.target.checked)}/><span>These dates are approximate</span></label>}<p><CircleHelp size={14}/> Leave anything blank if you are not sure. You can return later.</p><footer><button className="rw-secondary" type="button" onClick={onClose}>Cancel</button><button className="rw-primary" type="button" onClick={()=>onSave(values,approximate)}>Save item</button></footer></section></div>
}
function SourceInspector({source,verified,onConfirm,onCorrection,onClose}:{source:SourceReference;verified:boolean;onConfirm:()=>void;onCorrection:()=>void;onClose:()=>void}){return <div className="rw-modal-wrap"><section className="rw-modal rw-source-inspector" role="dialog" aria-modal="true" aria-labelledby="source-inspector-title"><header><div><span className="rw-kicker">Source inspection</span><h2 id="source-inspector-title">{source.label}</h2></div><button type="button" aria-label="Close source inspection" onClick={onClose}><X size={18}/></button></header><div className="rw-source-location"><FileCheck2 size={18}/><div><strong>{source.location||"Intake answer"}</strong><small>{source.kind==="document"?"Fictional document preview":"Information you entered during intake"}</small></div></div><blockquote>“{source.excerpt}”</blockquote><div className="rw-source-meta"><span>Extraction match: {source.confidence}</span><span>{verified?"Verified by you":"Needs your review"}</span></div><p><Info size={14}/> Confirm only that the wording and location are accurate. This does not determine whether the information proves a claim.</p><footer><button className="rw-secondary" type="button" onClick={onCorrection}>Correction needed</button><button className="rw-primary" type="button" onClick={onConfirm}>{verified?<><Check size={14}/> Already verified</>:<>Confirm source <Check size={14}/></>}</button></footer></section></div>}

function DownloadPreview({onClose,claims,onFollowUp}:{onClose:()=>void;claims:ClaimWorkspace[];onFollowUp:()=>void}){
  return <div className="rw-modal-wrap"><section className="rw-modal rw-download" role="dialog" aria-modal="true" aria-labelledby="download-title"><header><div><span className="rw-kicker">Download preview</span><h2 id="download-title">Your package is ready to download</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></header><div className="rw-download-mark"><Download size={26}/><span><strong>debrief-case-package.zip</strong><small>{claims.length+2} folders and files, fictional preview</small></span></div><FileRow name="00 Package index.pdf" meta="Review checklist and file map"/>{claims.map((item,index)=><FileRow key={item.id} name={`0${index+1} ${item.title}/`} meta="Statement, source trace, and linked documents"/>)}<FileRow name="Submission instructions.pdf" meta="Official links and reminders"/><p>This prototype does not create a file. A production download would preserve the approved version and record when it was generated.</p><div className="rw-follow-up-callout"><LockKeyhole size={18}/><div><strong>Keep this package unchanged</strong><p>If a later decision requires more work, start a linked follow-up case instead of editing this history.</p></div><button type="button" onClick={onFollowUp}>Preview follow-up</button></div><footer><button className="rw-primary" type="button" onClick={onClose}>Done</button></footer></section></div>
}

function FollowUpPreview({onClose}:{onClose:()=>void}){return <div className="rw-modal-wrap"><section className="rw-modal rw-follow-up" role="dialog" aria-modal="true" aria-labelledby="follow-up-title"><header><div><span className="rw-kicker">Linked follow-up case</span><h2 id="follow-up-title">Start new work without changing the prior package.</h2></div><button type="button" aria-label="Close follow-up preview" onClick={onClose}><X size={18}/></button></header><p>The approved package and future VA decision remain preserved as immutable history.</p><div className="rw-follow-up-options">{[["Supplemental claim","Add new and relevant evidence"],["Increased-rating claim","Document that a service-connected condition has worsened"],["Contested decision","Organize the decision and review options"]].map(([title,copy])=><button type="button" key={title}><strong>{title}</strong><small>{copy}</small><ArrowRight size={15}/></button>)}</div><footer><button className="rw-primary" type="button" onClick={onClose}>Return to package</button></footer></section></div>}
