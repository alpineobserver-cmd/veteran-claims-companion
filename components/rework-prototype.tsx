"use client";

import {useCallback,useEffect,useRef,useState,type ReactNode} from "react";
import {createPortal} from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,ArrowLeft,ArrowRight,BookOpenCheck,Check,CheckCircle2,ChevronDown,
  CircleHelp,ClipboardCheck,Clock3,Download,ExternalLink,Eye,FileCheck2,FileText,Files,FolderSearch,
  History,Info,LifeBuoy,Link2,ListChecks,LockKeyhole,Menu,MessageSquareText,Plus,Radar,
  RefreshCw,RotateCcw,Search,ShieldCheck,Sparkles,Trash2,UploadCloud,UserRound,X
} from "lucide-react";
import {
  buildPrototypeClaimLeads,claimReviewIssueCount,createHealthEventSource,getPackageNextAction,getPackageReadiness,isMeaningfulHealthEvent,isMeaningfulServicePeriod,linkedDocumentsForPackage,prototypeSources,
  type BuddyDecision,type ClaimLead,type ClaimPath,type ClaimWorkspace,type DocumentRecord,type HealthEvent,
  type PrototypeScreen,type ServicePeriod,type SourceReference,type WorkspaceDraft
} from "@/lib/rework-prototype";
import {conditionGroups} from "@/lib/claim-options";
import {packageRecordsFromState,type ApprovalSection,type PackageRecord,type SavedState} from "@/lib/rework-state";

const buildScreens:Array<{id:PrototypeScreen;label:string;icon:typeof History}>=[
  {id:"intent",label:"Package Type",icon:ClipboardCheck},
  {id:"intake",label:"Service & Health",icon:History},
  {id:"documents",label:"My Documents",icon:Files},
  {id:"leads",label:"Claim Leads",icon:FolderSearch}
];
const storageKey="debrief.rework-preview.v3";

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

function reconcileIntakeSources(events:HealthEvent[],sources:SourceReference[]){
  const existing=new Map(sources.filter(source=>source.kind==="intake").map(source=>[source.id,source]));
  const intake=events.filter(isMeaningfulHealthEvent).map(event=>{
    const next=createHealthEventSource(event);
    const prior=existing.get(next.id);
    return prior&&prior.excerpt===next.excerpt&&prior.location===next.location?{...next,verification:prior.verification}:next;
  });
  return [...sources.filter(source=>source.kind!=="intake"),...intake];
}

function upsertPackage(records:PackageRecord[],record:PackageRecord){return [...records.filter(item=>item.id!==record.id),record]}

export function ReworkPrototype({user,initialState=null,initialVersion=0,approvedPackageIds=[]}:{user:{name:string|null;localTestProfile:boolean};initialState?:SavedState|null;initialVersion?:number;approvedPackageIds?:string[]}){
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
  const [approvalSections,setApprovalSections]=useState<ApprovalSection[]>([]);
  const [approvalChanges,setApprovalChanges]=useState<string[]>([]);
  const [activePackageId,setActivePackageId]=useState("package-1");
  const [packageRecords,setPackageRecords]=useState<PackageRecord[]>([]);
  const [inspectedSource,setInspectedSource]=useState<SourceReference|null>(null);
  const [followUpOpen,setFollowUpOpen]=useState(false);
  const [onboardingComplete,setOnboardingComplete]=useState(false);
  const [selectedClaimId,setSelectedClaimId]=useState<string|null>(null);
  const [resetOpen,setResetOpen]=useState(false);
  const [saveStatus,setSaveStatus]=useState<"loading"|"saving"|"saved"|"error"|"conflict">("loading");
  const [approvalPending,setApprovalPending]=useState(false);
  const versionRef=useRef(initialVersion);
  const saveInFlight=useRef(false);
  const pendingSave=useRef<SavedState|null>(null);
  const activeClaimId=claims.some(claim=>claim.id===selectedClaimId)?selectedClaimId:claims[0]?.id||null;
  const packageReadiness=getPackageReadiness({services,events,documents,claims,sources,packageKind,buddyDecision,packageId:activePackageId});
  const reviewRequiredCount=packageReadiness.unresolved;
  const currentPackage:PackageRecord={id:activePackageId,kind:packageKind,claims,leads,approved,buddyDecision,approvalSections,approvalChanges,selectedClaimId:activeClaimId,updated:"Just now"};
  const allPackages=upsertPackage(packageRecords,currentPackage);

  useEffect(()=>{
    try{
      const saved=user.localTestProfile?JSON.parse(localStorage.getItem(storageKey)||"null") as SavedState|null:initialState;
      if(saved){
        const completed=Boolean(saved.onboardingComplete);
        const savedActivePackageId=saved.activePackageId||"package-1";
        const storedPackages=saved.packages||[];
        const storedActive=storedPackages.find(item=>item.id===savedActivePackageId);
        const savedPackageKind=storedActive?.kind||(saved.packageKind&&claimPaths.includes(saved.packageKind)?saved.packageKind:"unsure");
        const savedEvents=(saved.events||[]).map(item=>({...item,care:item.care||"",impact:item.impact||""}));
        const savedClaims=(storedActive?.claims||saved.claims||[]).map(claim=>{
          const legacyDraft=claim.draft||saved.workspaceDraft||createDraft();
          return {...claim,path:savedPackageKind,milestone:claim.milestone||"Foundation captured",draft:{...createDraft(),...legacyDraft,verifiedSourceIds:legacyDraft.verifiedSourceIds||[]}};
        });
        setScreen(completed?"dashboard":saved.screen||"intent");
        setServices((saved.services||[]).map(item=>({...item,service:item.service||"Service branch not entered"})));
        setEvents(savedEvents);
        setDocuments(saved.documents||[]);
        setSources(reconcileIntakeSources(savedEvents,saved.sources||prototypeSources));
        setLeads(storedActive?.leads||saved.leads||[]);
        setClaims(savedClaims);
        setPackageKind(savedPackageKind);
        setApproved(approvedPackageIds.includes(savedActivePackageId)||(storedActive?.approved??saved.approved));
        setBriefingSeen(Boolean(saved.briefingSeen));
        setBriefingOpen(!saved.briefingSeen);
        setBuddyDecision(storedActive?.buddyDecision||saved.buddyDecision||"undecided");
        setApprovalSections(storedActive?.approvalSections||saved.approvalSections||[]);
        setApprovalChanges(storedActive?.approvalChanges||saved.approvalChanges||[]);
        setActivePackageId(savedActivePackageId);
        setPackageRecords(storedPackages.filter(item=>item.id!==savedActivePackageId));
        setOnboardingComplete(completed);
        setSelectedClaimId(storedActive?.selectedClaimId||saved.selectedClaimId||savedClaims[0]?.id||null);
      }
      else setBriefingOpen(true);
    }catch{}
    setSaveStatus("saved");setLoaded(true);
  },[approvedPackageIds,initialState,user.localTestProfile]);

  const drainServerSaves=useCallback(async function drainServerSaves(){
    if(saveInFlight.current||user.localTestProfile)return;
    saveInFlight.current=true;
    while(pendingSave.current){
      const state=pendingSave.current;pendingSave.current=null;setSaveStatus("saving");
      try{
        const response=await fetch("/api/rework-state",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:versionRef.current,state})});
        const result=await response.json().catch(()=>({}));
        if(response.status===409){pendingSave.current=null;setSaveStatus("conflict");setNotice(result.error||"This workspace changed elsewhere. Reload before continuing.");break}
        if(!response.ok){setSaveStatus("error");setNotice(result.error||"Your latest changes could not be saved.");break}
        versionRef.current=result.version;setSaveStatus("saved");
      }catch{setSaveStatus("error");setNotice("Your latest changes could not be saved. Check your connection and try again.");break}
    }
    saveInFlight.current=false;
    if(pendingSave.current)void drainServerSaves();
  },[user.localTestProfile]);

  useEffect(()=>{
    if(!loaded)return;
    const activeRecord:PackageRecord={id:activePackageId,kind:packageKind,claims,leads,approved,buddyDecision,approvalSections,approvalChanges,selectedClaimId:activeClaimId,updated:"Just now"};
    const state:SavedState={screen,services,events,documents,sources,leads,claims,packageKind,approved,briefingSeen,buddyDecision,approvalSections,approvalChanges,packages:upsertPackage(packageRecords,activeRecord),activePackageId,onboardingComplete,selectedClaimId};
    if(user.localTestProfile){localStorage.setItem(storageKey,JSON.stringify(state));setSaveStatus("saved");return}
    setSaveStatus("saving");
    const timer=window.setTimeout(()=>{pendingSave.current=state;void drainServerSaves()},500);
    return()=>window.clearTimeout(timer);
  },[screen,services,events,documents,sources,leads,claims,packageKind,approved,briefingSeen,buddyDecision,approvalSections,approvalChanges,packageRecords,activePackageId,onboardingComplete,selectedClaimId,activeClaimId,loaded,user.localTestProfile,drainServerSaves]);

  function navigate(next:PrototypeScreen){setScreen(next);setMenuOpen(false);setNotice("");window.scrollTo({top:0,behavior:"smooth"})}
  function openClaim(claimId:string){setSelectedClaimId(claimId);navigate("workspace")}
  function updateEvents(next:HealthEvent[]){
    setEvents(next);
    setSources(current=>reconcileIntakeSources(next,current));
    setClaims(current=>current.map(claim=>({...claim,draft:{...claim.draft,verifiedSourceIds:claim.draft.verifiedSourceIds.filter(id=>!id.startsWith("src-health-")),statementReviewed:false}})));
  }
  function updatePackageKind(next:ClaimPath){
    if(next===packageKind)return;
    setPackageKind(next);
    setNotice("Package type selected. Every claim added to this package will use this filing path.");
  }
  async function reset(){
    if(user.localTestProfile)localStorage.removeItem(storageKey);
    else{
      const response=await fetch("/api/rework-state",{method:"DELETE"});
      if(!response.ok){const result=await response.json().catch(()=>({}));setResetOpen(false);setNotice(result.error||"The workspace could not be cleared.");return}
      versionRef.current=0;pendingSave.current=null;
    }
    setScreen("intent");setServices([]);setEvents([]);
    setDocuments([]);setSources(prototypeSources);setLeads([]);setClaims([]);setPackageKind("unsure");setApproved(false);setBriefingSeen(false);setBriefingOpen(true);setBuddyDecision("undecided");setApprovalSections([]);setApprovalChanges([]);setActivePackageId("package-1");setPackageRecords([]);setInspectedSource(null);setFollowUpOpen(false);setOnboardingComplete(false);setSelectedClaimId(null);setNotice("Preview data cleared. Your test profile is empty again.");
    setResetOpen(false);
  }

  function savedState():SavedState{return {screen,services,events,documents,sources,leads,claims,packageKind,approved,briefingSeen,buddyDecision,approvalSections,approvalChanges,packages:packageRecordsFromState({screen,services,events,documents,sources,leads,claims,packageKind,approved,briefingSeen,buddyDecision,approvalSections,approvalChanges,packages:packageRecords,activePackageId,onboardingComplete,selectedClaimId}),activePackageId,onboardingComplete,selectedClaimId}}

  async function approvePackage(){
    if(user.localTestProfile){setApproved(true);setApprovalChanges([]);return}
    setApprovalPending(true);
    try{
      const response=await fetch(`/api/rework-packages/${encodeURIComponent(activePackageId)}/approve`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:versionRef.current,state:savedState(),packageId:activePackageId})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){setNotice(result.error||"This package could not be approved.");setSaveStatus(response.status===409?"conflict":"error");return}
      versionRef.current=result.version;setApproved(true);setApprovalChanges([]);setSaveStatus("saved");setNotice("Package approved. Its download is now preserved as an immutable snapshot.");
    }catch{setNotice("This package could not be approved. Check your connection and try again.");setSaveStatus("error")}
    finally{setApprovalPending(false)}
  }
  function closeBriefing(doNotShowAgain:boolean,start:boolean){
    setBriefingSeen(doNotShowAgain);
    setBriefingOpen(false);
    if(start)navigate("intent");
  }
  function finishOnboarding(){
    const currentSources=reconcileIntakeSources(events,sources);
    setSources(currentSources);
    const foundationReady=services.some(isMeaningfulServicePeriod)&&events.some(isMeaningfulHealthEvent);
    setLeads(buildPrototypeClaimLeads(events,documents,currentSources,packageKind));setOnboardingComplete(true);navigate("dashboard");setNotice(foundationReady?"Your foundation is saved. Your package is ready for you to add and build claims.":"Your package has started, but your foundation still needs meaningful service and health details.");
  }
  function invalidateApproval(message:string){if(approved){setNotice("Final approval was cleared because package information changed.");setApprovalChanges(current=>Array.from(new Set([message,...current])).slice(0,6))}else setNotice(message);setApproved(false);setApprovalSections([])}
  function startNewPackage(kind:Exclude<ClaimPath,"unsure">){
    const newPackageId=`package-${Date.now()}`;
    setPackageRecords(current=>upsertPackage(current,{...currentPackage,selectedClaimId:activeClaimId}));
    setActivePackageId(newPackageId);setPackageKind(kind);setClaims([]);setLeads(buildPrototypeClaimLeads(events,documents,sources,kind));setApproved(false);setApprovalSections([]);setApprovalChanges([]);setBuddyDecision("undecided");setSelectedClaimId(null);setFollowUpOpen(false);setScreen("dashboard");setNotice(`New ${packageLabels[kind].toLowerCase()} started. Your service history, health timeline, and document library remain available.`);
  }
  function switchPackage(packageId:string){
    const target=allPackages.find(item=>item.id===packageId);
    if(!target||target.id===activePackageId)return;
    setPackageRecords(current=>upsertPackage(current,{...currentPackage,selectedClaimId:activeClaimId}));
    setActivePackageId(target.id);setPackageKind(target.kind);setClaims(target.claims);setLeads(target.leads);setApproved(target.approved);setBuddyDecision(target.buddyDecision);setApprovalSections(target.approvalSections);setApprovalChanges(target.approvalChanges);setSelectedClaimId(target.selectedClaimId);setScreen("dashboard");setMenuOpen(false);setNotice(`${packageLabels[target.kind]} opened. Account information and documents remain shared.`);window.scrollTo({top:0,behavior:"smooth"});
  }
  function deleteClaim(claimId:string){
    const claim=claims.find(item=>item.id===claimId);
    if(!claim)return;
    setClaims(current=>current.filter(item=>item.id!==claimId));
    setLeads(current=>current.map(lead=>claim.leadId===lead.id&&lead.status==="accepted"?{...lead,status:"open"}:lead));
    setSelectedClaimId(current=>current===claimId?null:current);
    setNotice(`Claim “${claim.title}” was removed from this package. Your account documents and service history were kept.${approved?" Final approval was cleared.":""}`);
    setApproved(false);
  }
  function inspectSource(sourceId:string){const source=sources.find(item=>item.id===sourceId);if(source)setInspectedSource(source)}
  function confirmSource(sourceId:string){
    setSources(current=>current.map(source=>source.id===sourceId?{...source,verification:"confirmed"}:source));
    if(activeClaimId)setClaims(current=>current.map(claim=>claim.id===activeClaimId?{...claim,draft:{...claim.draft,verifiedSourceIds:claim.draft.verifiedSourceIds.includes(sourceId)?claim.draft.verifiedSourceIds:[...claim.draft.verifiedSourceIds,sourceId]}}:claim));
    invalidateApproval("Source confirmed and connected to the claim.");setInspectedSource(null);
  }

  return <div className="rw-shell">
    <a className="rw-skip" href="#rework-main">Skip to main content</a>
    <aside className={menuOpen?"open":""} aria-label="Claim package navigation">
      <div className="rw-brand"><Link href="/" aria-label="Debrief home"><span><ShieldCheck size={21}/></span><div><strong>Debrief</strong><small>Guided claim package</small></div></Link><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Close navigation"><X size={18}/></button></div>
      <nav className="rw-primary-nav">
        {onboardingComplete&&<button type="button" className={`rw-nav-home ${screen==="dashboard"?"active":""}`} aria-current={screen==="dashboard"?"page":undefined} onClick={()=>navigate("dashboard")}><span><ClipboardCheck size={17}/></span><div><strong>Package Overview</strong></div></button>}
        <div className="rw-nav-group"><span>{onboardingComplete?"Package and Foundation":"Start Your Package"}</span>{buildScreens.filter(item=>onboardingComplete||item.id!=="leads").map(item=><button type="button" className={screen===item.id?"active":""} aria-current={screen===item.id?"page":undefined} onClick={()=>navigate(item.id)} key={item.id}><span><item.icon size={16}/></span><div><strong>{item.label}</strong></div></button>)}</div>
        {onboardingComplete&&<div className="rw-nav-group"><span>Claims in This Package</span>{claims.map(claim=><button type="button" className={screen==="workspace"&&activeClaimId===claim.id?"active":""} aria-current={screen==="workspace"&&activeClaimId===claim.id?"page":undefined} onClick={()=>openClaim(claim.id)} key={claim.id}><span><FileText size={16}/></span><div><strong>{claim.title}</strong></div></button>)}{!approved&&<button type="button" className="rw-nav-add" onClick={()=>navigate("leads")}><span><Plus size={16}/></span><div><strong>Add a Claim</strong></div></button>}</div>}
        {onboardingComplete&&<div className="rw-nav-group rw-nav-finalize"><span>Finalize</span><button type="button" className={screen==="package"?"active":""} aria-current={screen==="package"?"page":undefined} onClick={()=>navigate("package")}><span><ClipboardCheck size={16}/></span><div><strong>Package Review</strong>{reviewRequiredCount>0&&<small className="rw-nav-attention">{reviewRequiredCount} review {reviewRequiredCount===1?"item":"items"}</small>}</div></button></div>}
      </nav>
      <div className="rw-utility-nav">
        <span>Reference &amp; Support</span>
        <Link href="/exposure-record-check" target="_blank"><Radar size={16}/><strong>Exposure Checker</strong><span className="sr-only">, opens in a new tab</span></Link>
        <Link href="/conditions" target="_blank"><BookOpenCheck size={16}/><strong>Conditions Library</strong><span className="sr-only">, opens in a new tab</span></Link>
        <Link href="/forms" target="_blank"><Files size={16}/><strong>Forms Guide</strong><span className="sr-only">, opens in a new tab</span></Link>
        <Link href="/support" target="_blank"><LifeBuoy size={16}/><strong>Help &amp; Guide</strong><span className="sr-only">, opens in a new tab</span></Link>
        <Link href="/support#content-correction" target="_blank"><MessageSquareText size={16}/><strong>Send Feedback</strong><span className="sr-only">, opens in a new tab</span></Link>
      </div>
      <div className="rw-boundary"><ShieldCheck size={16}/><p><strong>Fictional preview only</strong>Do not upload or enter real personal, medical, or military information.</p></div>
      <button className="rw-reset" type="button" onClick={()=>setResetOpen(true)}><RotateCcw size={14}/> {user.localTestProfile?"Clear preview data":"Clear draft workspace"}</button>
    </aside>
    {menuOpen&&<button className="rw-scrim" type="button" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
    <div className="rw-stage">
      <header className="rw-topbar">
        <button type="button" className="rw-menu" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={19}/></button>
        <div><span>{onboardingComplete?"Active package":"New package setup"}</span><strong>{packageLabels[packageKind]}</strong></div>
        <div className="rw-top-actions"><span className="rw-save" role="status">{saveStatus==="saving"?<RefreshCw size={13}/>:saveStatus==="error"||saveStatus==="conflict"?<AlertTriangle size={13}/>:<Check size={13}/>} {user.localTestProfile?"Saved in this browser":saveStatus==="saving"?"Saving to your account":saveStatus==="conflict"?"Reload required":saveStatus==="error"?"Save needs attention":"Saved to your account"}</span><button className="rw-guide" type="button" aria-label={saveStatus==="error"?"Retry account save":"How saving works"} onClick={()=>{if(!user.localTestProfile&&saveStatus==="error"){pendingSave.current=savedState();void drainServerSaves()}else setNotice(user.localTestProfile?"This fictional test profile saves only in this browser.":saveStatus==="conflict"?"Reload this page before continuing so another saved version is not overwritten.":"Your package work is encrypted in transit and saved to your signed-in Debrief account. Approved packages are preserved separately.")}}><Info size={17}/> <span>{saveStatus==="error"?"Retry save":"Save details"}</span></button><button className="rw-guide" type="button" aria-label="How Debrief works" onClick={()=>setBriefingOpen(true)}><CircleHelp size={17}/> <span>How Debrief works</span></button><Link className="rw-sign-in" href="/account" aria-label={user.name?`Open ${user.name} account`:"Open profile"}><UserRound size={15}/> {user.name||"Profile"}</Link></div>
      </header>
      <main id="rework-main" tabIndex={-1}>
        {notice&&<div className="rw-notice" role="status"><Info size={16}/><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={()=>setNotice("")}>×</button></div>}
        {screen==="intent"&&<PackageIntent packageKind={packageKind} setPackageKind={updatePackageKind} onboardingComplete={onboardingComplete} claimCount={claims.length} onStartNew={()=>setFollowUpOpen(true)} onContinue={()=>navigate(onboardingComplete?"dashboard":"intake")}/>}
        {screen==="intake"&&<Intake services={services} setServices={setServices} events={events} setEvents={updateEvents} readOnly={approved} onboardingComplete={onboardingComplete} onContinue={()=>navigate(onboardingComplete?"dashboard":"documents")} setNotice={setNotice} invalidateApproval={invalidateApproval}/>}
        {screen==="documents"&&<Documents documents={documents} setDocuments={setDocuments} sources={sources} setSources={setSources} activePackageId={activePackageId} packageLocked={approved} onboardingComplete={onboardingComplete} onContinue={()=>onboardingComplete?navigate("dashboard"):finishOnboarding()} setNotice={setNotice} onInspectSource={inspectSource} invalidateApproval={invalidateApproval}/>}
        {screen==="leads"&&<Leads leads={leads} setLeads={setLeads} documents={documents} sources={sources} packageKind={packageKind} activePackageId={activePackageId} readOnly={approved} claims={claims} setClaims={setClaims} onContinue={()=>navigate("dashboard")} onOpenClaim={openClaim} setNotice={setNotice} onInspectSource={inspectSource} invalidateApproval={invalidateApproval}/>}
        {screen==="dashboard"&&<Dashboard services={services} events={events} documents={documents} sources={sources} leads={leads} claims={claims} packageKind={packageKind} activePackageId={activePackageId} packages={allPackages} readOnly={approved} onSwitchPackage={switchPackage} onNavigate={navigate} onOpenClaim={openClaim} onDeleteClaim={deleteClaim}/>}
        {screen==="workspace"&&<ClaimWorkspaceView claims={claims} selectedClaimId={activeClaimId} setClaims={setClaims} documents={documents} sources={sources} readOnly={approved} onNavigate={navigate} onInspectSource={inspectSource} invalidateApproval={invalidateApproval} setNotice={setNotice}/>}
        {screen==="package"&&<PackageReview services={services} events={events} documents={documents} activePackageId={activePackageId} packageKind={packageKind} claims={claims} sources={sources} approved={approved} approvalSections={approvalSections} setApprovalSections={setApprovalSections} approvalChanges={approvalChanges} invalidateApproval={invalidateApproval} setDownloadOpen={setDownloadOpen} onApprove={approvePackage} approvalPending={approvalPending} saveReady={user.localTestProfile||saveStatus==="saved"} localTestProfile={user.localTestProfile} onNavigate={navigate} onOpenClaim={openClaim} onInspectSource={inspectSource} buddyDecision={buddyDecision} setBuddyDecision={setBuddyDecision}/>}
      </main>
    </div>
    {briefingOpen&&<MissionBriefing onClose={closeBriefing} firstRun={!onboardingComplete}/>}
    {inspectedSource&&(
      <SourceInspector
        source={inspectedSource}
        verified={inspectedSource.verification==="confirmed"||Boolean(claims.find(claim=>claim.id===activeClaimId)?.draft.verifiedSourceIds.includes(inspectedSource.id))}
        readOnly={approved}
        onConfirm={()=>confirmSource(inspectedSource.id)}
        onCorrection={()=>{
          setSources(current=>current.map(source=>source.id===inspectedSource.id?{...source,verification:"corrected"}:source));
          setClaims(current=>current.map(claim=>({...claim,draft:{...claim.draft,verifiedSourceIds:claim.draft.verifiedSourceIds.filter(id=>id!==inspectedSource.id)}})));
          invalidateApproval("Correction noted. The extracted wording will stay out of claims until it is replaced.");
          setInspectedSource(null);
        }}
        onClose={()=>setInspectedSource(null)}
      />
    )}
    {downloadOpen&&<DownloadPreview onClose={()=>setDownloadOpen(false)} claims={claims} packageId={activePackageId} localTestProfile={user.localTestProfile} onFollowUp={()=>{setDownloadOpen(false);setFollowUpOpen(true)}}/>}
    {followUpOpen&&<FollowUpPreview onClose={()=>setFollowUpOpen(false)} onStart={startNewPackage}/>}
    {resetOpen&&<ResetWorkspaceDialog localTestProfile={user.localTestProfile} onClose={()=>setResetOpen(false)} onConfirm={()=>void reset()}/>}
  </div>;
}

function PackageIntent({packageKind,setPackageKind,onboardingComplete,claimCount,onStartNew,onContinue}:{packageKind:ClaimPath;setPackageKind:(value:ClaimPath)=>void;onboardingComplete:boolean;claimCount:number;onStartNew:()=>void;onContinue:()=>void}){
  const options:Array<{id:ClaimPath;title:string;copy:string}>=[
    {id:"original",title:"New disability claim",copy:"Organize a condition, an in-service event, and information that may connect them."},
    {id:"increase",title:"Increased rating",copy:"Show what has worsened since the current VA rating or decision."},
    {id:"supplemental",title:"Supplemental claim",copy:"Connect a prior decision with new and relevant evidence."},
    {id:"contested",title:"Review a decision",copy:"Organize the decision, disputed issues, dates, and review options."},
    {id:"unsure",title:"I am not sure yet",copy:"Review the filing paths before creating a package. Your account information can still be gathered once a path is selected."}
  ];
  if(onboardingComplete)return <div className="rw-page rw-intent-page">
    <PageHead kicker="Package filing path" title="This package keeps one filing path." copy="Claims in this package stay together under the filing path selected when the package began."/>
    <section className="rw-locked-package" aria-labelledby="locked-package-title"><span><LockKeyhole size={22}/></span><div><small>Current package</small><h2 id="locked-package-title">{packageLabels[packageKind]}</h2><p>{claimCount} {claimCount===1?"claim":"claims"} in this package. Its filing path cannot be converted after work begins.</p></div></section>
    <section className="rw-shared-account"><History size={20}/><div><h2>Your account information carries forward</h2><p>A new package can reuse your service history, duty stations, deployments, TDYs, health timeline, and document library. You choose which records to link to the new package.</p></div><button className="rw-primary" type="button" onClick={onStartNew}>Start a New Package <ArrowRight size={15}/></button></section>
    <FooterActions next={onContinue} nextLabel="Return to Package Overview"/>
  </div>;
  return <div className="rw-page rw-intent-page">
    <PageHead kicker="Package type" title="What are you preparing for?" copy="Your answer sets the questions and readiness checks for this package. A different filing path will use a separate package."/>
    <fieldset className="rw-intent-options"><legend className="sr-only">Choose a package type</legend>{options.map(option=><label className={packageKind===option.id?"selected":""} key={option.id}><input type="radio" name="package-kind" checked={packageKind===option.id} onChange={()=>setPackageKind(option.id)}/><span><strong>{option.title}</strong><small>{option.copy}</small></span><CheckCircle2 size={18}/></label>)}</fieldset>
    <div className="rw-intent-note"><Info size={18}/><p><strong>This choice does not determine eligibility.</strong> It helps Debrief ask the right questions and organize one filing path. Each claim you add will use this package type.</p></div>
    <FooterActions next={onContinue} nextLabel="Continue to Service & Health" disabled={packageKind==="unsure"} note={packageKind==="unsure"?"Choose one filing path to begin a package.":undefined}/>
  </div>;
}

let openDialogCount=0;
function AccessibleDialog({titleId,descriptionId,className="",onClose,children}:{titleId:string;descriptionId?:string;className?:string;onClose:()=>void;children:ReactNode}){
  const dialogRef=useRef<HTMLElement>(null);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  useEffect(()=>{
    const previouslyFocused=document.activeElement as HTMLElement|null;
    const background=Array.from(document.querySelectorAll<HTMLElement>(".rw-shell > aside, .rw-shell > .rw-stage"));
    openDialogCount+=1;
    background.forEach(element=>{element.inert=true});
    window.requestAnimationFrame(()=>dialogRef.current?.focus());
    function onKeyDown(event:KeyboardEvent){
      if(event.key==="Escape"){event.preventDefault();closeRef.current();return}
      if(event.key!=="Tab"||!dialogRef.current)return;
      const controls=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(element=>!element.hasAttribute("hidden"));
      if(!controls.length){event.preventDefault();dialogRef.current.focus();return}
      const first=controls[0];const last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialogRef.current)){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    window.addEventListener("keydown",onKeyDown);
    return ()=>{
      window.removeEventListener("keydown",onKeyDown);openDialogCount=Math.max(0,openDialogCount-1);
      if(openDialogCount===0)background.forEach(element=>{element.inert=false});
      previouslyFocused?.focus();
    };
  },[]);
  return createPortal(<div className="rw-modal-wrap" role="presentation"><section ref={dialogRef} tabIndex={-1} className={`rw-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>{children}</section></div>,document.body);
}

function MissionBriefing({onClose,firstRun}:{onClose:(doNotShowAgain:boolean,start:boolean)=>void;firstRun:boolean}){
  const connections=[
    ["What is happening now","A current condition, symptoms, treatment, or effects on daily life."],
    ["What happened in service","An injury, illness, exposure, or event during service."],
    ["How they may be related","Medical or lay evidence that helps explain the relationship."]
  ];
  return <AccessibleDialog titleId="mission-briefing-title" descriptionId="mission-briefing-intro" className="rw-briefing" onClose={()=>onClose(true,false)}>
      <header><div><span className="rw-kicker">Mission briefing</span><h2 id="mission-briefing-title">A well-supported claim starts with the right mission details.</h2></div><button type="button" aria-label="Close mission briefing" onClick={()=>onClose(true,false)}><X size={19}/></button></header>
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
  </AccessibleDialog>;
}

function friendlyDate(value:string){const match=value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);if(!match)return value;const month=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(match[2])-1];return match[3]?`${month} ${Number(match[3])}, ${match[1]}`:`${month} ${match[1]}`}
function formatRange(start:string,end:string){return `${friendlyDate(start)} to ${friendlyDate(end)}`}

const serviceBranchOptions=["Air Force","Army","Coast Guard","Marine Corps","Navy","Space Force","National Guard or Reserve","Other or not sure"];

function Intake({services,setServices,events,setEvents,readOnly,onboardingComplete,onContinue,setNotice,invalidateApproval}:{services:ServicePeriod[];setServices:(value:ServicePeriod[])=>void;events:HealthEvent[];setEvents:(value:HealthEvent[])=>void;readOnly:boolean;onboardingComplete:boolean;onContinue:()=>void;setNotice:(value:string)=>void;invalidateApproval:(message:string)=>void}){
  const [serviceEditor,setServiceEditor]=useState<"new"|string|null>(null);
  const [eventEditor,setEventEditor]=useState<"new"|string|null>(null);
  const serviceBeingEdited=services.find(item=>item.id===serviceEditor);
  const eventBeingEdited=events.find(item=>item.id===eventEditor);
  return <div className="rw-page">
    <PageHead kicker="Service and health intake" title="Start with what only you know." copy="Capture the mission context, key events, and changes you remember. Approximate dates are welcome."/>
    {readOnly&&<div className="rw-advisory"><LockKeyhole size={17}/><p><strong>This approved package is read only.</strong> Open a draft package before changing shared account information.</p></div>}
    <div className="rw-intake-grid">
      <section className="rw-panel"><PanelHead icon={History} title="Service history" count={`${services.length} ${services.length===1?"period":"periods"}`} action="Add service period" readOnly={readOnly} onAction={()=>setServiceEditor("new")}/>{services.length?services.map(item=><TimelineRow key={item.id} title={item.location} meta={`${item.service}, ${item.kind}, ${formatRange(item.start,item.end)}`} copy={`${item.role}. ${item.exposures}`} approximate={item.approximate} readOnly={readOnly} onEdit={()=>setServiceEditor(item.id)}/>):<IntakeEmpty icon={History} title="No service history yet" copy="Add a duty station, deployment, or TDY. Start with whichever period is easiest to remember." action="Add service period" onAction={()=>setServiceEditor("new")}/>}</section>
      <section className="rw-panel"><PanelHead icon={BookOpenCheck} title="Health timeline" count={`${events.length} ${events.length===1?"event":"events"}`} action="Add health event" readOnly={readOnly} onAction={()=>setEventEditor("new")}/>{events.length?events.map(item=><TimelineRow key={item.id} title={item.title} meta={`${item.type}, ${friendlyDate(item.date)}`} copy={[item.details,item.care,item.impact].filter(Boolean).join(" ")} approximate={item.approximate} readOnly={readOnly} onEdit={()=>setEventEditor(item.id)}/>):<IntakeEmpty icon={BookOpenCheck} title="No health events yet" copy="Add an injury, illness, surgery, treatment, or change in symptoms. Approximate dates are acceptable." action="Add health event" onAction={()=>setEventEditor("new")}/>}</section>
    </div>
    {services.length>0&&events.length>0&&<section className="rw-connection"><span><Link2 size={18}/></span><div><strong>Details ready to connect later</strong><p>Debrief can compare your service periods with health events after you add documents. You will verify every relationship before it is used.</p></div><button type="button" onClick={()=>setNotice("Possible relationships remain unverified until you review the original details and sources.")}>How this is used</button></section>}
    <div className="rw-unsure"><CircleHelp size={19}/><div><strong>Not sure about a date?</strong><p>Use a year, season, deployment, or other approximate period. Debrief will preserve that uncertainty.</p></div></div>
    <FooterActions next={onContinue} nextLabel={onboardingComplete?"Return to Package Overview":"Continue to documents"}/>
    {serviceEditor&&<QuickAdd title={serviceBeingEdited?"Edit service period":"Add a service period"} fields={[{label:"Branch and service component",type:"select",options:serviceBranchOptions},{label:"Period type",type:"select",options:["Duty station","Deployment","TDY"]},"Location or unit","Role, MOS, rate, or duty","Duties, conditions, or exposures to remember",{label:"Start date",type:"date"},{label:"End date",type:"date"}]} initialValues={serviceBeingEdited?[serviceBeingEdited.service,serviceBeingEdited.kind,serviceBeingEdited.location,serviceBeingEdited.role,serviceBeingEdited.exposures,serviceBeingEdited.start,serviceBeingEdited.end]:undefined} showApproximate initialApproximate={serviceBeingEdited?.approximate??false} validate={values=>values[0]&&values[1]&&values.slice(2,5).some(Boolean)?undefined:"Add a branch, period type, and at least one location, role, duty, or exposure detail."} onClose={()=>setServiceEditor(null)} onSave={(values,approximate)=>{
      const enteredKind=values[1].toLowerCase();const kind:ServicePeriod["kind"]=enteredKind.includes("deploy")?"Deployment":enteredKind.includes("duty")?"Duty station":"TDY";
      if(serviceBeingEdited)setServices(services.map(item=>item.id===serviceBeingEdited.id?{...item,service:values[0]||item.service,kind,location:values[2]||item.location,role:values[3]||item.role,exposures:values[4]||item.exposures,start:values[5]||item.start,end:values[6]||item.end,approximate}:item));
      else setServices([...services,{id:`service-${Date.now()}`,service:values[0]||"Service branch not entered",kind,location:values[2]||"Additional duty location",role:values[3]||"Role not entered",start:values[5]||"Date unknown",end:values[6]||"Date unknown",approximate,exposures:values[4]||"No duties or exposures entered yet."}]);
      setServiceEditor(null);invalidateApproval("Service history changed.");setNotice(serviceBeingEdited?"Service period updated.":approximate?"Service period added with approximate dates.":"Service period added.");
    }}/>}
    {eventEditor&&<QuickAdd title={eventBeingEdited?"Edit health event":"Add a health event"} fields={[{label:"Event type",type:"select",options:["Injury","Illness","Surgery","Treatment","Symptom change"]},"Condition, symptom, or event","What happened","Treatment, facility, or provider","Current effects or daily impact","Date"]} initialValues={eventBeingEdited?[eventBeingEdited.type,eventBeingEdited.title,eventBeingEdited.details,eventBeingEdited.care,eventBeingEdited.impact,eventBeingEdited.date]:undefined} showApproximate initialApproximate={eventBeingEdited?.approximate} validate={values=>values[0]&&values[1]&&values.slice(2,5).some(Boolean)?undefined:"Choose an event type, add the condition, symptom, or event, and include at least one supporting detail."} onClose={()=>setEventEditor(null)} onSave={(values,approximate)=>{
      const enteredType=values[0].toLowerCase();const type:HealthEvent["type"]=enteredType.includes("injur")?"Injury":enteredType.includes("ill")?"Illness":enteredType.includes("surg")?"Surgery":enteredType.includes("symptom")?"Symptom change":"Treatment";
      if(eventBeingEdited)setEvents(events.map(item=>item.id===eventBeingEdited.id?{...item,type,title:values[1]||item.title,details:values[2]||item.details,care:values[3],impact:values[4],date:values[5]||item.date,approximate}:item));
      else setEvents([...events,{id:`event-${Date.now()}`,type,title:values[1]||"Additional health event",details:values[2]||"Details not entered yet.",care:values[3],impact:values[4],date:values[5]||"Date unknown",approximate}]);
      setEventEditor(null);invalidateApproval("Health timeline changed.");setNotice(eventBeingEdited?"Health event updated.":approximate?"Health event added with an approximate date.":"Health event added.");
    }}/>}
  </div>;
}

function Documents({documents,setDocuments,sources,setSources,activePackageId,packageLocked,onboardingComplete,onContinue,setNotice,onInspectSource,invalidateApproval}:{documents:DocumentRecord[];setDocuments:(value:DocumentRecord[]|((current:DocumentRecord[])=>DocumentRecord[]))=>void;sources:SourceReference[];setSources:(value:SourceReference[]|((current:SourceReference[])=>SourceReference[]))=>void;activePackageId:string;packageLocked:boolean;onboardingComplete:boolean;onContinue:()=>void;setNotice:(value:string)=>void;onInspectSource:(sourceId:string)=>void;invalidateApproval:(message:string)=>void}){
  const [filter,setFilter]=useState("");
  const visible=documents.filter(item=>`${item.name} ${item.type}`.toLowerCase().includes(filter.toLowerCase()));
  function simulateUpload(){
    const id=`doc-${Date.now()}`;
    setDocuments([...documents,{id,name:"Fictional orthopedic visit.pdf",type:"Civilian medical record",dateRange:"2025",status:"processing",caseIds:packageLocked?[]:[activePackageId],claimIds:[],insights:[]}]);
    invalidateApproval("A document was added to the package.");
    setNotice("Fictional document added. Analysis is being simulated.");
    window.setTimeout(()=>{setDocuments(current=>current.map(item=>item.id===id?{...item,status:"ready",insights:[{id:`ins-${id}`,topic:"Right knee",excerpt:"Reports recurring knee discomfort when using stairs.",page:3,confidence:"medium",verification:"unreviewed"}]}:item));setSources(current=>current.some(source=>source.documentId===id)?current:[...current,{id:`src-${id}`,kind:"document",label:"Fictional orthopedic visit.pdf",documentId:id,location:"Page 3",excerpt:"Reports recurring knee discomfort when using stairs.",confidence:"medium",verification:"unreviewed"}])},900);
  }
  function simulateFailure(){
    const id=`doc-failed-${Date.now()}`;
    setDocuments(current=>[...current,{id,name:"Fictional unreadable record.pdf",type:"Medical record",dateRange:"Date range unknown",status:"failed",caseIds:packageLocked?[]:[activePackageId],claimIds:[],insights:[]}]);
    invalidateApproval("A document analysis issue was added for testing.");
    setNotice("Fictional analysis issue added. Test retrying the analysis or unlinking the record.");
  }
  function retry(id:string){const label=documents.find(item=>item.id===id)?.name||"Fictional record";setDocuments(current=>current.map(item=>item.id===id?{...item,status:"processing"}:item));invalidateApproval("Document analysis was retried.");setNotice("Analysis retry started.");window.setTimeout(()=>{setDocuments(current=>current.map(item=>item.id===id?{...item,status:"ready",insights:[{id:`ins-${id}`,topic:"Lower back",excerpt:"Reports occasional lower-back stiffness.",page:2,confidence:"low",verification:"unreviewed"}]}:item));setSources(current=>[...current.filter(source=>source.documentId!==id),{id:`src-${id}`,kind:"document",label,documentId:id,location:"Page 2",excerpt:"Reports occasional lower-back stiffness.",confidence:"low",verification:"unreviewed"}])},900)}
  function toggleCaseLink(id:string){if(packageLocked){setNotice("Approved packages are read only. Start or open a draft package to change document links.");return}setDocuments(documents.map(item=>item.id===id?{...item,caseIds:item.caseIds.includes(activePackageId)?item.caseIds.filter(caseId=>caseId!==activePackageId):[...item.caseIds,activePackageId]}:item));invalidateApproval("A document package link changed.");setNotice("Document package link updated.")}
  function inspectInsight(documentId:string,page:number){const source=sources.find(item=>item.documentId===documentId&&item.location===`Page ${page}`);if(source)onInspectSource(source.id);else setNotice("The source preview is still processing. Try again after analysis finishes.")}
  const failedCount=documents.filter(item=>item.status==="failed").length;
  return <div className="rw-page">
    <PageHead kicker="My Documents" title="Turn records into findable facts." copy="Upload once. Debrief keeps the useful page, date, and topic connected to its source."/>
    <div className="rw-doc-toolbar"><label><Search size={16}/><input aria-label="Search documents" placeholder="Search documents" value={filter} onChange={event=>setFilter(event.target.value)}/></label><div className="rw-doc-test-actions"><button className="rw-secondary" type="button" onClick={simulateFailure}><AlertTriangle size={16}/> Simulate analysis issue</button><button className="rw-primary" type="button" onClick={simulateUpload}><UploadCloud size={16}/> Simulate upload</button></div></div>
    <div className="rw-doc-layout">
      <section className="rw-panel rw-doc-list"><div className="rw-section-title"><div><span className="rw-kicker">Your library</span><h2>{documents.length?`${documents.length} fictional document${documents.length===1?"":"s"}`:"No documents added"}</h2></div><span>Upload once, link where needed</span></div>{visible.length?visible.map(item=><article key={item.id}><span className="rw-file-icon"><Files size={18}/></span><div><strong>{item.name}</strong><small>{item.type}, {item.dateRange}</small><div>{item.insights.slice(0,2).map(insight=><button type="button" className="rw-topic" key={insight.id} onClick={()=>inspectInsight(item.id,insight.page)}>{insight.topic} <Eye size={12}/></button>)}</div>{item.status==="failed"&&<p className="rw-doc-error">Analysis stopped before text could be extracted. Retry the fictional analysis or unlink this document from the package.</p>}</div><div className="rw-doc-controls"><DocStatus item={item} retry={()=>retry(item.id)}/><button type="button" className="rw-link-control" disabled={packageLocked} onClick={()=>toggleCaseLink(item.id)}>{item.caseIds.includes(activePackageId)?<><Link2 size={13}/> Linked to this package</>:<><Plus size={13}/> Link to this package</>}</button></div></article>):documents.length?<div className="rw-empty compact"><Search size={24}/><h2>No matching documents</h2><p>Try a file name or document type.</p></div>:<div className="rw-empty rw-doc-empty"><UploadCloud size={25}/><h2>Your document library is empty.</h2><p>Add a fictional military or medical record when you are ready. You can also go to Package Overview and return later.</p><button className="rw-secondary" type="button" onClick={simulateUpload}>Simulate first upload</button></div>}</section>
      <aside className="rw-analysis"><span className="rw-kicker">Analysis status</span><h2>{documents.filter(item=>item.status==="ready").length} ready{failedCount?`, ${failedCount} needs attention`:""}</h2><p>Debrief found {documents.reduce((sum,item)=>sum+item.insights.length,0)} topics for your review. A topic is not a diagnosis or a recommendation to file.</p><div><strong><Sparkles size={15}/> Open the source</strong><p>Select a topic to inspect the page reference, extracted wording, and review status before using it.</p></div><div><strong><ShieldCheck size={15}/> Your records stay under your control</strong><p>A production version would explain consent, storage, retention, deletion, and provider access before any upload.</p></div></aside>
    </div>
    <FooterActions next={onContinue} nextLabel="Go to Package Overview" note={onboardingComplete?"Prototype document changes are saved in this browser.":"Documents are optional during setup. You can add them later."}/>
  </div>;
}

function Leads({leads,setLeads,documents,sources,packageKind,activePackageId,readOnly,claims,setClaims,onContinue,onOpenClaim,setNotice,onInspectSource,invalidateApproval}:{leads:ClaimLead[];setLeads:(value:ClaimLead[])=>void;documents:DocumentRecord[];sources:SourceReference[];packageKind:ClaimPath;activePackageId:string;readOnly:boolean;claims:ClaimWorkspace[];setClaims:(value:ClaimWorkspace[])=>void;onContinue:()=>void;onOpenClaim:(claimId:string)=>void;setNotice:(value:string)=>void;onInspectSource:(sourceId:string)=>void;invalidateApproval:(message:string)=>void}){
  const [filter,setFilter]=useState<"open"|"accepted"|"dismissed">("open");
  const [customOpen,setCustomOpen]=useState(false);
  const visible=leads.filter(item=>item.status===filter);
  function accept(lead:ClaimLead){
    if(readOnly)return;
    setLeads(leads.map(item=>item.id===lead.id?{...item,status:"accepted"}:item));
    if(!claims.some(item=>item.leadId===lead.id))setClaims([...claims,{id:`${activePackageId}-claim-${lead.id}`,leadId:lead.id,title:lead.title,path:packageKind,progress:0,milestone:"Foundation captured",sourceIds:lead.sourceIds,documentIds:documents.filter(doc=>lead.sourceIds.some(id=>sources.find(source=>source.id===id)?.documentId===doc.id)).map(doc=>doc.id),updated:"Just now",draft:createDraft()}]);
    invalidateApproval("A claim was added to the package.");
    setNotice(`${lead.title} added to Your Claims.`);
  }
  function dismiss(id:string){setLeads(leads.map(item=>item.id===id?{...item,status:"dismissed"}:item));setNotice("Lead dismissed. You can restore it at any time.")}
  function restore(id:string){setLeads(leads.map(item=>item.id===id?{...item,status:"open"}:item));setNotice("Lead restored.")}
  function merge(id:string){setLeads(leads.map(item=>item.id===id?{...item,status:"merged"}:item));setNotice("Lead merged into the right knee claim. Its sources remain linked.")}
  return <div className="rw-page">
    <PageHead kicker="Claim Leads" title="Connect patterns without losing the source." copy="Review why each topic appeared, verify the supporting information, and decide what belongs in Your Claims."/>
    <div className="rw-advisory"><Info size={17}/><p><strong>A lead is a topic to review.</strong> It is not a recommendation to file and does not predict eligibility, rating, or outcome.</p></div>
    {readOnly&&<div className="rw-advisory"><LockKeyhole size={17}/><p><strong>This approved package is read only.</strong> Open a draft package to change lead decisions or add claims.</p></div>}
    <div className="rw-lead-actions"><div role="tablist" aria-label="Claim lead status"><button type="button" role="tab" aria-selected={filter==="open"} className={filter==="open"?"active":""} onClick={()=>setFilter("open")}>Active ({leads.filter(item=>item.status==="open").length})</button><button type="button" role="tab" aria-selected={filter==="accepted"} className={filter==="accepted"?"active":""} onClick={()=>setFilter("accepted")}>Accepted ({leads.filter(item=>item.status==="accepted").length})</button><button type="button" role="tab" aria-selected={filter==="dismissed"} className={filter==="dismissed"?"active":""} onClick={()=>setFilter("dismissed")}>Dismissed ({leads.filter(item=>item.status==="dismissed").length})</button></div>{!readOnly&&<button type="button" onClick={()=>setCustomOpen(true)}><Plus size={14}/> Add a claim not shown</button>}</div>
    <section className="rw-leads">{visible.length?visible.map(item=><LeadCard key={item.id} lead={item} sources={sources} canMerge={!readOnly&&claims.some(claim=>claim.title.includes("knee"))} readOnly={readOnly} onAccept={()=>accept(item)} onDismiss={()=>dismiss(item.id)} onRestore={()=>restore(item.id)} onMerge={()=>merge(item.id)} onOpenClaim={()=>{const claim=claims.find(claim=>claim.leadId===item.id);if(claim)onOpenClaim(claim.id)}} onInspectSource={onInspectSource} onMissing={missing=>setNotice(`Add this information inside the claim: ${missing}.`)}/>):<div className="rw-empty"><FolderSearch size={28}/><h2>{filter==="accepted"?"No accepted leads":filter==="dismissed"?"No dismissed leads":"No active claim leads"}</h2><p>{filter==="accepted"?"Leads you add to Your Claims will appear here.":filter==="dismissed"?"When you dismiss a lead, it will remain available here.":"Debrief will place evidence-linked topics here after you add relevant intake details or documents. You can still add your own claim topic."}</p>{filter==="open"&&!readOnly&&<button className="rw-secondary" type="button" onClick={()=>setCustomOpen(true)}>Add your own claim topic</button>}</div>}</section>
    <FooterActions next={onContinue} nextLabel="Open Package Overview"/>
    {customOpen&&!readOnly&&<AddClaimDialog claims={claims} onClose={()=>setCustomOpen(false)} onAdd={title=>{const id=`${activePackageId}-claim-custom-${Date.now()}`;setClaims([...claims,{id,title,path:packageKind,progress:0,milestone:"Needs your review",sourceIds:[],documentIds:[],updated:"Just now",draft:createDraft()}]);invalidateApproval("A claim was added to the package.");setCustomOpen(false);setNotice(`${title} added to Your Claims. Review the claim path and details next.`)}}/>}
  </div>;
}

function Dashboard({services,events,documents,sources,leads,claims,packageKind,activePackageId,packages,readOnly,onSwitchPackage,onNavigate,onOpenClaim,onDeleteClaim}:{services:ServicePeriod[];events:HealthEvent[];documents:DocumentRecord[];sources:SourceReference[];leads:ClaimLead[];claims:ClaimWorkspace[];packageKind:ClaimPath;activePackageId:string;packages:PackageRecord[];readOnly:boolean;onSwitchPackage:(packageId:string)=>void;onNavigate:(screen:PrototypeScreen)=>void;onOpenClaim:(claimId:string)=>void;onDeleteClaim:(claimId:string)=>void}){
  const [claimToDelete,setClaimToDelete]=useState<ClaimWorkspace|null>(null);
  const accepted=leads.filter(item=>item.status==="accepted").length;
  const meaningfulServices=services.filter(isMeaningfulServicePeriod).length;
  const meaningfulEvents=events.filter(isMeaningfulHealthEvent).length;
  const foundationReady=meaningfulServices>0&&meaningfulEvents>0;
  const linkedDocuments=linkedDocumentsForPackage(documents,activePackageId);
  const otherPackages=packages.filter(item=>item.id!==activePackageId);
  const next=getPackageNextAction({services,events,documents,leads,claims,sources,packageKind,packageId:activePackageId});
  return <div className="rw-page">
    <PageHead kicker={packageLabels[packageKind]} title="Your claim package, organized into action." copy="Manage each claim separately while reusing the service history and records saved to your account."/>
    {readOnly&&<div className="rw-advisory"><LockKeyhole size={17}/><p><strong>Approved package, read only.</strong> Review its claims and sources here, or open a draft package to make changes.</p></div>}
    {!readOnly&&<section className="rw-next" aria-labelledby="rw-next-title"><span><ListChecks size={21}/></span><div><small>ACTION REQUIRED</small><h2 id="rw-next-title">{next.title}</h2><p>{next.copy}</p></div><button className="rw-primary" type="button" onClick={()=>next.screen==="workspace"&&next.claimId?onOpenClaim(next.claimId):onNavigate(next.screen)}>{next.label} <ArrowRight size={15}/></button></section>}
    <div className="rw-metrics"><div><span>Account foundation</span><strong>{foundationReady?"Ready to begin claims":meaningfulServices||meaningfulEvents?"Started":"Not started"}</strong><small>{meaningfulServices} service {meaningfulServices===1?"period":"periods"}, {meaningfulEvents} health {meaningfulEvents===1?"event":"events"} with details</small></div><div><span>This package&apos;s documents</span><strong>{linkedDocuments.filter(item=>item.status==="ready").length} of {linkedDocuments.length} ready</strong><small>{linkedDocuments.some(item=>item.status==="failed")?"One needs attention":linkedDocuments.some(item=>item.status==="processing")?"Analysis in progress":linkedDocuments.length?"Processing complete":`${documents.length} in your account library`}</small></div><div><span>Claim leads</span><strong>{accepted} accepted</strong><small>{leads.filter(item=>item.status==="open").length} still to review</small></div><div><span>Package status</span><strong>{readOnly?"Approved":claims.length?claims.every(claim=>claim.draft.statementReviewed)?"Claims reviewed":"Needs review":"No claims added"}</strong><small>{claims.length?`${claims.filter(claim=>claim.draft.statementReviewed).length} of ${claims.length} statements reviewed`:"Add a claim when you are ready"}</small></div></div>
    <div className="rw-dashboard-grid">
      <section className="rw-panel"><div className="rw-section-title"><div><span className="rw-kicker">Your Claims</span><h2>{claims.length?`${claims.length} active claim${claims.length===1?"":"s"}`:"No claims yet"}</h2></div>{!readOnly&&<button type="button" onClick={()=>onNavigate("leads")}><Plus size={14}/> Add a Claim</button>}</div>{claims.length?claims.map(item=>{const issues=claimReviewIssueCount(item,sources,packageKind);return <article className={issues?"rw-claim needs-review":"rw-claim"} key={item.id}><div><strong>{item.title}</strong><small>{packageLabels[item.path]}. Updated {item.updated}</small><em>{issues?<><AlertTriangle size={13}/> {issues} review {issues===1?"item":"items"} required</>:<><CheckCircle2 size={13}/> Claim review complete</>}</em></div><div className="rw-claim-actions"><button type="button" aria-label={`Open ${item.title}`} onClick={()=>onOpenClaim(item.id)}>{readOnly?"View Claim":issues?"Resolve Review":"Review Claim"} <ArrowRight size={14}/></button>{!readOnly&&<button className="rw-claim-delete" type="button" aria-label={`Delete ${item.title}`} onClick={()=>setClaimToDelete(item)}><Trash2 size={14}/> Delete</button>}</div></article>}):<div className="rw-empty compact"><ClipboardCheck size={24}/><p>Accept a claim lead or add a condition yourself.</p></div>}</section>
      <aside className="rw-panel"><span className="rw-kicker">{readOnly?"Package record":"Open questions"}</span><h2>{readOnly?"Approved information":"What still needs your input"}</h2>{!readOnly&&linkedDocuments.some(item=>item.status==="failed")&&<button type="button" onClick={()=>onNavigate("documents")}><AlertTriangle size={16}/><span><strong>A linked document needs attention</strong><small>Retry analysis or continue without it.</small></span><ArrowRight size={14}/></button>}{!readOnly&&linkedDocuments.length===0&&<button type="button" onClick={()=>onNavigate("documents")}><Files size={16}/><span><strong>No records linked yet</strong><small>Your account has {documents.length} {documents.length===1?"record":"records"}. Link only what this package needs.</small></span><ArrowRight size={14}/></button>}{readOnly?<div className="rw-empty compact"><LockKeyhole size={22}/><p>Claims, document links, and approvals are preserved in this package.</p></div>:leads.some(item=>item.status==="open")?<button type="button" onClick={()=>onNavigate("leads")}><CircleHelp size={16}/><span><strong>Review an evidence-linked topic</strong><small>Inspect the source before adding a claim.</small></span><ArrowRight size={14}/></button>:<button type="button" onClick={()=>onNavigate("leads")}><Plus size={16}/><span><strong>Add a condition or symptom</strong><small>You do not need a Debrief-generated lead.</small></span><ArrowRight size={14}/></button>}</aside>
    </div>
    {otherPackages.length>0&&<section className="rw-package-history" aria-labelledby="package-history-title"><div><span className="rw-kicker">Your other packages</span><h2 id="package-history-title">Linked packages remain separate</h2><p>Switch packages without losing claims or changing document links in either package.</p></div>{otherPackages.map(item=><article key={item.id}><LockKeyhole size={17}/><span><strong>{packageLabels[item.kind]}</strong><small>{item.claims.length} {item.claims.length===1?"claim":"claims"}. {item.approved?"Approved and read only":"Saved draft"}</small></span><em>{item.approved?"Approved":"Draft"}</em><button type="button" onClick={()=>onSwitchPackage(item.id)}>Open package <ArrowRight size={13}/></button></article>)}</section>}
    <section className="rw-tools"><div><span className="rw-kicker">Connected tools</span><h2>Your account details travel with you</h2><p>Reference tools open in a new tab, so this package and your current place remain open.</p></div><nav aria-label="Debrief guides"><Link href="/exposure-record-check" target="_blank"><Radar size={18}/><span><strong>Exposure Checker</strong><small>Starts with {services.length} saved service {services.length===1?"period":"periods"}.</small></span><ExternalLink size={14}/><span className="sr-only">Opens in a new tab</span></Link><Link href="/conditions" target="_blank"><BookOpenCheck size={18}/><span><strong>Conditions library</strong><small>Explore conditions without adding them to your package.</small></span><ExternalLink size={14}/><span className="sr-only">Opens in a new tab</span></Link><Link href="/forms" target="_blank"><Files size={18}/><span><strong>Forms guide</strong><small>Shows forms relevant to this package type.</small></span><ExternalLink size={14}/><span className="sr-only">Opens in a new tab</span></Link></nav></section>
    {claimToDelete&&<DeleteClaimDialog claim={claimToDelete} onClose={()=>setClaimToDelete(null)} onDelete={()=>{onDeleteClaim(claimToDelete.id);setClaimToDelete(null)}}/>}
  </div>;
}

function ClaimWorkspaceView({claims,selectedClaimId,setClaims,documents,sources,readOnly,onNavigate,onInspectSource,invalidateApproval,setNotice}:{claims:ClaimWorkspace[];selectedClaimId:string|null;setClaims:(value:ClaimWorkspace[])=>void;documents:DocumentRecord[];sources:SourceReference[];readOnly:boolean;onNavigate:(screen:PrototypeScreen)=>void;onInspectSource:(sourceId:string)=>void;invalidateApproval:(message:string)=>void;setNotice:(value:string)=>void}){
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
    if(!claim||readOnly)return;
    setClaims(claims.map(item=>item.id===claim.id?change(item):item));
    invalidateApproval(message);
  }
  function update<K extends keyof WorkspaceDraft>(field:K,value:WorkspaceDraft[K]){
    reviseClaim(item=>({...item,draft:{...item.draft,[field]:value,statementReviewed:false},milestone:"Foundation captured",updated:"Just now"}),"Claim information updated. Review this statement again before approval.");
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
        <div className="rw-claim-path rw-claim-path-locked"><span>Package filing path</span><strong>{packageLabels[claim.path]}</strong><small>Every claim in this package uses the same filing path.</small><button type="button" onClick={()=>onNavigate("intent")}>View Package Type</button></div>
        {readOnly&&<div className="rw-workspace-status"><span><LockKeyhole size={17}/></span><div><strong>Approved claim, read only</strong><p>Open a draft package to edit statements or document links.</p></div></div>}
        <WorkspaceField number="1" title={prompt.event} source="Entered or confirmed by you" value={draft.serviceEvent} placeholder={prompt.eventPlaceholder} disabled={readOnly} onChange={value=>update("serviceEvent",value)}/>
        <WorkspaceField number="2" title={prompt.symptoms} source="Entered by you" value={draft.currentSymptoms} placeholder="Describe the issue as it is now." disabled={readOnly} onChange={value=>update("currentSymptoms",value)}/>
        <WorkspaceField number="3" title="Current diagnosis or evaluation" source="Entered by you" value={draft.diagnosis} placeholder="Add a diagnosis or evaluation if you have one. Leave blank if you do not." disabled={readOnly} onChange={value=>update("diagnosis",value)}/>
        <WorkspaceField number="4" title={prompt.relationship} source="Your account, supported by reviewed sources" value={draft.relationship} placeholder={prompt.relationshipPlaceholder} disabled={readOnly} onChange={value=>update("relationship",value)}/>
        <WorkspaceField number="5" title="Treatment history" source="Entered by you; optional" value={draft.treatmentHistory} placeholder="Add treatment dates, facilities, or providers you want to remember." disabled={readOnly} onChange={value=>update("treatmentHistory",value)}/>
        <WorkspaceField number="6" title="Daily impact" source="Entered by you" value={draft.dailyImpact} placeholder="Describe effects on work, movement, sleep, or daily activities." disabled={readOnly} onChange={value=>update("dailyImpact",value)}/>
        <div className="rw-statement-review"><div><strong>{draft.statementReviewed?"Statement reviewed":statementHasFoundation?"Review the complete statement":"Complete the statement foundation"}</strong><p>{draft.statementReviewed?"This version can move to package readiness. Editing any section will clear the review.":statementHasFoundation?"Confirm the wording is accurate and reflects your own account before it enters the package.":"Service event, current symptoms, relationship, and daily impact are required before review."}</p></div><button className={draft.statementReviewed?"rw-secondary":"rw-primary"} disabled={readOnly||!statementHasFoundation} type="button" onClick={markReviewed}>{draft.statementReviewed?<><CheckCircle2 size={15}/> Reviewed</>:<>Mark statement reviewed <Check size={15}/></>}</button></div>
      </section>
      <aside className="rw-source-tray"><span className="rw-kicker">Linked sources</span><h2>Verify before using</h2><p>Open the original location and confirm the extracted wording.</p>{linkedSources.length?linkedSources.map(source=><button type="button" key={source.id} onClick={()=>onInspectSource(source.id)}><span>{source.kind==="document"?<FileCheck2 size={17}/>:<History size={17}/>}</span><div><strong>{source.label}</strong><small>{source.location||"Intake answer"}</small></div><em className={source.verification==="confirmed"||draft.verifiedSourceIds.includes(source.id)?"verified":"review"}>{source.verification==="confirmed"||draft.verifiedSourceIds.includes(source.id)?"Verified":"Review"}</em></button>):<div className="rw-empty compact"><Files size={21}/><p>No sources are linked to this claim.</p></div>}<div className="rw-record-linker"><strong>Records for this claim</strong><small>Link a record once and reuse it without copying the file.</small>{documents.map(document=><div key={document.id}><span><FileText size={15}/>{document.name}</span><button type="button" disabled={readOnly} onClick={()=>toggleDocument(document.id)} aria-label={`${claim.documentIds.includes(document.id)?"Unlink":"Link"} ${document.name} ${claim.documentIds.includes(document.id)?"from":"to"} ${claim.title}`}>{claim.documentIds.includes(document.id)?"Unlink":"Link record"}</button></div>)}{!documents.length&&<p>No documents have been added to your account.</p>}</div><div className="rw-source-boundary"><Info size={15}/><p>Source wording is supporting information. Debrief does not decide whether it proves service connection.</p></div></aside>
    </div>
    <div className="rw-workspace-actions"><button className="rw-secondary" type="button" onClick={()=>onNavigate("dashboard")}><ArrowLeft size={15}/> Return to Package Overview</button><button className="rw-primary" type="button" onClick={()=>onNavigate("package")}>Check Package Readiness <ArrowRight size={15}/></button></div>
  </div>;
}

function WorkspaceField({number,title,source,value,placeholder,disabled,onChange}:{number:string;title:string;source:string;value:string;placeholder:string;disabled:boolean;onChange:(value:string)=>void}){
  return <label className="rw-workspace-field"><span className="rw-field-number">{number}</span><span className="rw-field-copy"><strong>{title}</strong><small>{source}</small><textarea value={value} placeholder={placeholder} disabled={disabled} onChange={event=>onChange(event.target.value)} rows={title.includes("diagnosis")?2:3}/></span></label>;
}

function PackageReview({services,events,documents,activePackageId,packageKind,claims,sources,approved,approvalSections,setApprovalSections,approvalChanges,invalidateApproval,setDownloadOpen,onApprove,approvalPending,saveReady,localTestProfile,onNavigate,onOpenClaim,onInspectSource,buddyDecision,setBuddyDecision}:{services:ServicePeriod[];events:HealthEvent[];documents:DocumentRecord[];activePackageId:string;packageKind:ClaimPath;claims:ClaimWorkspace[];sources:SourceReference[];approved:boolean;approvalSections:ApprovalSection[];setApprovalSections:(value:ApprovalSection[])=>void;approvalChanges:string[];invalidateApproval:(message:string)=>void;setDownloadOpen:(value:boolean)=>void;onApprove:()=>void;approvalPending:boolean;saveReady:boolean;localTestProfile:boolean;onNavigate:(screen:PrototypeScreen)=>void;onOpenClaim:(claimId:string)=>void;onInspectSource:(sourceId:string)=>void;buddyDecision:BuddyDecision;setBuddyDecision:(value:BuddyDecision)=>void}){
  const [tab,setTab]=useState<"readiness"|"approval">("readiness");
  const readiness=claims.map(claim=>{
    const linkedSources=sources.filter(source=>claim.sourceIds.includes(source.id));
    const unverified=linkedSources.filter(source=>source.verification!=="confirmed"&&!claim.draft.verifiedSourceIds.includes(source.id));
    const pathReady=claim.path!=="unsure"&&claim.path===packageKind;const statementReady=claim.draft.statementReviewed;const sourcesReady=unverified.length===0;
    return {claim,pathReady,statementReady,sourcesReady,unverified,issueCount:(pathReady?0:1)+(statementReady?0:1)+unverified.length};
  });
  const packageReadiness=getPackageReadiness({services,events,documents,claims,sources,packageKind,buddyDecision,packageId:activePackageId});
  const unresolved=packageReadiness.unresolved;
  const allReady=packageReadiness.allReady;
  const approvalOptions:Array<{id:ApprovalSection;title:string;copy:string}>=[
    {id:"foundation",title:"Account foundation",copy:"Service and health information is accurate for this package."},
    {id:"claims",title:"Claim statements",copy:"Each statement reflects your account and selected claim path."},
    {id:"records",title:"Records and source references",copy:"Linked records and extracted wording have been reviewed."},
    {id:"package",title:"Package index and submission boundary",copy:"You understand what is included and that Debrief does not submit it."}
  ];
  function toggleApprovalSection(section:ApprovalSection){setApprovalSections(approvalSections.includes(section)?approvalSections.filter(item=>item!==section):[...approvalSections,section])}
  const sectionsApproved=approvalOptions.every(option=>approvalSections.includes(option.id));
  return <div className="rw-page">
    <PageHead kicker="Package and final review" title="Turn verified information into a reviewable package." copy="Resolve missing details first. Then approve exactly what will be included in the download."/>
    <div className="rw-review-tabs" role="tablist" aria-label="Package review stages"><button role="tab" aria-selected={tab==="readiness"} className={tab==="readiness"?"active":""} onClick={()=>setTab("readiness")}><span>1</span> Package readiness{unresolved?` (${unresolved})`:""}</button><button role="tab" aria-selected={tab==="approval"} className={tab==="approval"?"active":""} onClick={()=>setTab("approval")}><span>2</span> Final approval</button></div>
    {tab==="readiness"?<div className="rw-review-grid">
      <section className="rw-panel"><div className="rw-readiness-head"><div><span className="rw-kicker">Package readiness</span><h2>{unresolved?`${unresolved} remaining`:"Required reviews complete"}</h2></div><span className={unresolved?"attention":"ready"}>{unresolved?"Action required":"Ready for approval"}</span></div>
        <div className="rw-package-checks" aria-label="Package-level readiness">
          <ReadinessAction ready={packageReadiness.foundationReady} label="Service and health foundation complete" action="Review foundation" onAction={()=>onNavigate("intake")}/>
          <ReadinessAction ready={packageReadiness.packagePathReady} label="Package type selected" action="Choose package type" onAction={()=>onNavigate("intent")}/>
          <ReadinessAction ready={packageReadiness.documentsReady} label={packageReadiness.blockedDocuments.length?`${packageReadiness.blockedDocuments.length} linked document ${packageReadiness.blockedDocuments.length===1?"needs":"need"} a decision`:"Linked documents ready"} action="Review documents" onAction={()=>onNavigate("documents")}/>
        </div>
        <div className="rw-claim-readiness">{readiness.length?readiness.map(item=><article className={item.issueCount?"needs-review":""} key={item.claim.id}><header><div><strong>{item.claim.title}</strong><small>{item.issueCount?`${item.issueCount} review ${item.issueCount===1?"item":"items"} required`:"Claim review complete"}</small></div><button type="button" onClick={()=>onOpenClaim(item.claim.id)}>{item.issueCount?"Resolve items":"Review claim"} <ArrowRight size={14}/></button></header><ReadinessLine ready={item.pathReady} label="Claim uses the package filing path"/><ReadinessLine ready={item.statementReady} label="Statement reviewed"/><ReadinessLine ready={item.sourcesReady} label={item.unverified.length?`${item.unverified.length} linked source ${item.unverified.length===1?"needs":"need"} review`:"Linked sources reviewed"}/>{item.unverified[0]&&<button className="rw-review-source" type="button" onClick={()=>onInspectSource(item.unverified[0].id)}>Review {item.unverified[0].label} <ArrowRight size={13}/></button>}</article>):<article className="needs-review"><header><div><strong>No claim has been added</strong><small>Add at least one claim before final approval.</small></div><button type="button" onClick={()=>onNavigate("leads")}>Add a claim <ArrowRight size={14}/></button></header></article>}</div>
        <fieldset className="rw-buddy-choice" disabled={approved}><legend>Buddy statement decision <span>Evidence is optional. A decision is required.</span></legend><p>Record whether you plan to add one, cannot obtain one, or do not need one for this package.</p>{[["add","I plan to add one"],["not-available","Not available"],["not-needed","Not for this package"]].map(([value,label])=><label key={value}><input type="radio" name="buddy-decision" value={value} checked={buddyDecision===value} onChange={()=>{setBuddyDecision(value as BuddyDecision);invalidateApproval("Buddy statement decision updated.")}}/><span>{label}</span></label>)}</fieldset>
      </section>
      <aside className="rw-panel rw-package-files"><span className="rw-kicker">Package contents</span><h2>Files assembled for review</h2><FileRow name="Package index.pdf" meta="Package overview and file checklist" ready={allReady}/>{readiness.map(item=><FileRow key={item.claim.id} name={`${item.claim.title} review.pdf`} meta={`${packageLabels[item.claim.path]}, statement, source trace, and open questions`} ready={item.pathReady&&item.statementReady&&item.sourcesReady}/>)}<FileRow name="Supporting records/" meta="Linked documents, without duplicate copies" ready={packageReadiness.documentsReady&&readiness.every(item=>item.sourcesReady)}/><p><Info size={14}/> A linked record must finish analysis or be unlinked before approval.</p></aside>
    </div>:<section className="rw-approval">
      <div className="rw-approval-status">{approved?<CheckCircle2 size={29}/>:<ClipboardCheck size={29}/>}<div><span className="rw-kicker">Final approval</span><h2>{approved?"Package approved":"Your approval is still required"}</h2><p>{approved?(localTestProfile?"Every required section was approved in this fictional preview. Any later package change will clear this approval.":"The approved version is preserved for download. Start a new linked package for later changes."):"Review the package index, each condition statement, and every linked document before approving."}</p></div></div>
      {approvalChanges.length>0&&<div className="rw-approval-changes" role="status"><History size={18}/><div><strong>Changes since the last approval</strong><ul>{approvalChanges.map(change=><li key={change}>{change}</li>)}</ul></div></div>}
      {unresolved>0&&<div className="rw-warning"><AlertTriangle size={18}/><div><strong>Approval is blocked.</strong><p>Resolve {unresolved} required readiness {unresolved===1?"item":"items"} before approving the package.</p></div></div>}
      {!approved&&<fieldset className="rw-section-approvals" disabled={!allReady}><legend>Approve each package section</legend>{approvalOptions.map(option=><label key={option.id}><input type="checkbox" checked={approvalSections.includes(option.id)} onChange={()=>toggleApprovalSection(option.id)}/><span><strong>{option.title}</strong><small>{option.copy}</small></span></label>)}</fieldset>}
      <div className="rw-approval-actions"><button type="button" className="rw-secondary" onClick={()=>setTab("readiness")}><ArrowLeft size={15}/> Return to readiness</button>{!approved?<button className="rw-primary" disabled={!allReady||!sectionsApproved||!saveReady||approvalPending} type="button" onClick={onApprove}>{approvalPending?<RefreshCw size={15}/>:<Check size={15}/>} {approvalPending?"Preserving approval…":!saveReady?"Wait for account save":"Approve entire package"}</button>:<button className="rw-primary" type="button" onClick={()=>setDownloadOpen(true)}><Download size={15}/> {localTestProfile?"Preview download package":"Download approved package"}</button>}</div>
    </section>}
    {approved?<section className="rw-submit"><div><span className="rw-kicker">Submission bridge</span><h2>Download here. Submit through an official VA channel.</h2><p>Debrief does not collect VA credentials, submit a claim, or confirm receipt. Check current VA instructions before filing.</p></div><a href="https://www.va.gov/disability/how-to-file-claim/" target="_blank" rel="noreferrer">Open official filing guidance <ArrowRight size={14}/></a></section>:<p className="rw-submit-locked"><LockKeyhole size={15}/> Download and filing guidance appear after final approval.</p>}
  </div>;
}

function ReadinessLine({ready,label}:{ready:boolean;label:string}){return <div className={ready?"rw-readiness-line ready":"rw-readiness-line open"}><span>{ready?<Check size={13}/>:<AlertTriangle size={13}/>}</span><small>{ready?label:`Action required: ${label}`}</small></div>}
function ReadinessAction({ready,label,action,onAction}:{ready:boolean;label:string;action:string;onAction:()=>void}){return <div className={ready?"rw-readiness-action ready":"rw-readiness-action open"}><span>{ready?<Check size={14}/>:<AlertTriangle size={14}/>}</span><strong>{ready?label:`Action required: ${label}`}</strong>{!ready&&<button type="button" onClick={onAction}>{action} <ArrowRight size={13}/></button>}</div>}

function PageHead({kicker,title,copy}:{kicker:string;title:string;copy:string}){return <header className="rw-page-head"><span className="rw-kicker">{kicker}</span><h1>{title}</h1><p>{copy}</p></header>}
function PanelHead({icon:Icon,title,count,action,readOnly=false,onAction}:{icon:typeof History;title:string;count:string;action:string;readOnly?:boolean;onAction:()=>void}){return <div className="rw-panel-head"><span><Icon size={18}/></span><div><h2>{title}</h2><small>{count}</small></div>{!readOnly&&<button type="button" onClick={onAction}><Plus size={14}/> {action}</button>}</div>}
function TimelineRow({title,meta,copy,approximate,readOnly=false,onEdit}:{title:string;meta:string;copy:string;approximate:boolean;readOnly?:boolean;onEdit:()=>void}){return <article className="rw-timeline-row"><i/><div><small>{meta}{approximate?", approximate":""}</small><strong>{title}</strong><p>{copy}</p></div>{!readOnly&&<button type="button" aria-label={`Edit ${title}`} onClick={onEdit}>Edit</button>}</article>}
function IntakeEmpty({icon:Icon,title,copy,action,onAction}:{icon:typeof History;title:string;copy:string;action:string;onAction:()=>void}){return <div className="rw-intake-empty"><Icon size={23}/><strong>{title}</strong><p>{copy}</p><button className="rw-secondary" type="button" onClick={onAction}>{action}</button></div>}
function FooterActions({next,nextLabel,note="Changes are saved automatically.",disabled=false}:{next:()=>void;nextLabel:string;note?:string;disabled?:boolean}){return <div className="rw-footer-actions"><span className="rw-autosave-note">{disabled?<Info size={14}/>:<Check size={14}/>} {note}</span><button className="rw-primary" type="button" disabled={disabled} onClick={next}>{nextLabel} <ArrowRight size={15}/></button></div>}
function DocStatus({item,retry}:{item:DocumentRecord;retry:()=>void}){if(item.status==="ready")return <span className="rw-doc-status ready"><CheckCircle2 size={14}/> Ready</span>;if(item.status==="processing")return <span className="rw-doc-status processing"><Clock3 size={14}/> Processing</span>;return <button type="button" className="rw-doc-status failed" onClick={retry}><RefreshCw size={14}/> Retry analysis</button>}
function LeadCard({lead,sources,canMerge,readOnly,onAccept,onDismiss,onRestore,onMerge,onOpenClaim,onInspectSource,onMissing}:{lead:ClaimLead;sources:SourceReference[];canMerge:boolean;readOnly:boolean;onAccept:()=>void;onDismiss:()=>void;onRestore:()=>void;onMerge:()=>void;onOpenClaim:()=>void;onInspectSource:(sourceId:string)=>void;onMissing:(missing:string)=>void}){
  const leadSources=sources.filter(source=>lead.sourceIds.includes(source.id));
  const [open,setOpen]=useState(lead.confidence==="high");
  const strength=lead.confidence==="high"?"Strong record pattern":lead.confidence==="medium"?"Some supporting information":"Limited information";
  return <article className={`rw-lead ${lead.confidence}`}><header><span className={`rw-confidence ${lead.confidence}`}>{strength}</span><div><h2>{lead.title}</h2><p>{lead.summary}</p></div>{lead.status==="accepted"&&<span className="rw-added"><Check size={13}/> In Your Claims</span>}</header><button className="rw-source-toggle" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}><Link2 size={15}/> Why this appeared: {leadSources.length} source{leadSources.length===1?"":"s"} <ChevronDown size={15}/></button>{open&&<div className="rw-sources">{leadSources.map(source=><button type="button" key={source.id} onClick={()=>onInspectSource(source.id)}><span>{source.kind==="document"?<FileCheck2 size={15}/>:<History size={15}/>}</span><div><strong>{source.label}{source.location?`, ${source.location}`:""}</strong><p>“{source.excerpt}”</p><small>{source.kind==="document"?"Open the page reference and verify the wording.":"Review the original intake detail."}</small></div><Eye size={15}/></button>)}</div>}<div className="rw-missing"><strong>Still needed</strong>{lead.missing.map(item=><button type="button" key={item} onClick={()=>onMissing(item)}>{item} <Plus size={12}/></button>)}</div><footer>{lead.status==="accepted"?<button className="rw-primary" type="button" onClick={onOpenClaim}>Open Claim <ArrowRight size={14}/></button>:readOnly?<span className="rw-read-only-label"><LockKeyhole size={13}/> Lead decision preserved</span>:lead.status==="dismissed"?<button className="rw-secondary" type="button" onClick={onRestore}><RotateCcw size={14}/> Restore lead</button>:<><button className="rw-secondary" type="button" onClick={onDismiss}>Dismiss</button>{lead.title.includes("Lower")&&canMerge&&<button className="rw-secondary" type="button" onClick={onMerge}>Merge with knee claim</button>}<button className="rw-primary" type="button" onClick={onAccept}>Add to Your Claims <ArrowRight size={14}/></button></>}</footer></article>
}
function FileRow({name,meta,ready=true}:{name:string;meta:string;ready?:boolean}){return <div className="rw-file-row"><FileCheck2 size={17}/><span><strong>{name}</strong><small>{meta}</small></span>{ready?<Check size={14}/>:<Clock3 size={14}/>}</div>}
function DeleteClaimDialog({claim,onClose,onDelete}:{claim:ClaimWorkspace;onClose:()=>void;onDelete:()=>void}){
  return <AccessibleDialog titleId="delete-claim-title" descriptionId="delete-claim-copy" className="rw-delete-claim" onClose={onClose}><header><div><span className="rw-kicker">Remove from this package</span><h2 id="delete-claim-title">Delete {claim.title}?</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></header><div className="rw-delete-claim-copy"><span><Trash2 size={18}/></span><p id="delete-claim-copy">This removes the claim draft, statement, and record links from this package. Documents and service history saved to your account will remain available.</p></div><footer><button className="rw-secondary" type="button" onClick={onClose}>Keep claim</button><button className="rw-danger" type="button" onClick={onDelete}>Delete claim</button></footer></AccessibleDialog>;
}
const otherClaimTopic="Other / condition not listed";
const ignoredClaimWords=new Set(["claim","condition","symptom","symptoms","other","fictional","related"]);
function claimTopicWords(value:string){return new Set(value.toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(word=>word.length>=4&&!ignoredClaimWords.has(word)))}
function possibleDuplicateClaim(title:string,claims:ClaimWorkspace[]){
  const words=claimTopicWords(title);
  return claims.find(claim=>{const existing=claimTopicWords(claim.title);return [...words].some(word=>existing.has(word))});
}
function AddClaimDialog({claims,onClose,onAdd}:{claims:ClaimWorkspace[];onClose:()=>void;onAdd:(title:string)=>void}){
  const [selection,setSelection]=useState("");
  const [customTitle,setCustomTitle]=useState("");
  const title=(selection===otherClaimTopic?customTitle:selection).trim();
  const duplicate=title?possibleDuplicateClaim(title,claims):undefined;
  const canAdd=Boolean(title&&!duplicate);
  return <AccessibleDialog titleId="add-claim-title" className="rw-add-claim" onClose={onClose}><header><div><span className="rw-kicker">Add without a claim lead</span><h2 id="add-claim-title">Add a claim to your package</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></header><p className="rw-add-claim-intro">Choose the closest condition or symptom. If it is not listed, enter your own wording.</p><label><span>Condition or symptom</span><select required value={selection} onChange={event=>{setSelection(event.target.value);setCustomTitle("")}}><option value="">Select an option</option>{conditionGroups.map(group=><optgroup label={group.label} key={group.label}>{group.options.map(option=><option value={option} key={option}>{option===otherClaimTopic?"Other or not listed":option}</option>)}</optgroup>)}</select></label>{selection===otherClaimTopic&&<label><span>Condition or symptom name</span><input required autoComplete="off" value={customTitle} onChange={event=>setCustomTitle(event.target.value)} placeholder="Enter a short name"/></label>}{duplicate&&<div className="rw-claim-duplicate" role="alert"><AlertTriangle size={17}/><div><strong>Possible duplicate claim</strong><p>This may already be in Your Claims as “{duplicate.title}.” Review that claim or choose a different topic.</p></div></div>}<div className="rw-claim-boundary"><Info size={15}/><p>Adding a topic organizes your package. It does not determine eligibility, service connection, rating, or outcome.</p></div><footer><button className="rw-secondary" type="button" onClick={onClose}>Cancel</button><button className="rw-primary" type="button" disabled={!canAdd} onClick={()=>canAdd&&onAdd(title)}>Add Claim</button></footer></AccessibleDialog>
}
type QuickAddField=string|{label:string;type:"text"|"date"|"select";options?:string[]};
function QuickAdd({title,fields,initialValues,showApproximate=false,initialApproximate=false,validate,onClose,onSave}:{title:string;fields:QuickAddField[];initialValues?:string[];showApproximate?:boolean;initialApproximate?:boolean;validate?:(values:string[])=>string|undefined;onClose:()=>void;onSave:(values:string[],approximate:boolean)=>void}){
  const normalized=fields.map(field=>typeof field==="string"?{label:field,type:"text" as const}:field);
  const [values,setValues]=useState(normalized.map((field,index)=>field.type==="date"&&!/^\d{4}-\d{2}-\d{2}$/.test(initialValues?.[index]||"")?"":initialValues?.[index]||""));
  const [approximate,setApproximate]=useState(initialApproximate);
  const [error,setError]=useState("");
  const fieldsRef=useRef<HTMLDivElement>(null);
  function setValue(index:number,value:string){setValues(current=>current.map((item,i)=>i===index?value:item));setError("")}
  function save(){
    const current=normalized.map((_,index)=>(fieldsRef.current?.querySelector<HTMLInputElement>(`[data-quick-index="${index}"]`)?.value??values[index]).trim());
    const message=validate?.(current);
    if(message){setError(message);return}
    onSave(current,approximate);
  }
  return <AccessibleDialog titleId="quick-add-title" onClose={onClose}><header><h2 id="quick-add-title">{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></header><div className="rw-quick-fields" ref={fieldsRef}>{normalized.map((field,index)=><label key={field.label}><span>{field.label}</span>{field.type==="select"?<select data-quick-index={index} value={values[index]} onChange={event=>setValue(index,event.target.value)}><option value="">Select an option</option>{field.options?.map(option=><option value={option} key={option}>{option}</option>)}</select>:<input data-quick-index={index} type={field.type} value={values[index]} onChange={event=>setValue(index,event.target.value)}/>}</label>)}</div>{showApproximate&&<label className="rw-approximate"><input type="checkbox" checked={approximate} onChange={event=>setApproximate(event.target.checked)}/><span>I do not know the exact dates</span></label>}{error?<p className="rw-form-error" role="alert"><AlertTriangle size={14}/>{error}</p>:<p><CircleHelp size={14}/> Add what you know. Optional fields can stay blank and be completed later.</p>}<footer><button className="rw-secondary" type="button" onClick={onClose}>Cancel</button><button className="rw-primary" type="button" onClick={save}>Save item</button></footer></AccessibleDialog>
}
function SourceInspector({source,verified,readOnly,onConfirm,onCorrection,onClose}:{source:SourceReference;verified:boolean;readOnly:boolean;onConfirm:()=>void;onCorrection:()=>void;onClose:()=>void}){return <AccessibleDialog titleId="source-inspector-title" className="rw-source-inspector" onClose={onClose}><header><div><span className="rw-kicker">Source inspection</span><h2 id="source-inspector-title">{source.label}</h2></div><button type="button" aria-label="Close source inspection" onClick={onClose}><X size={18}/></button></header><div className="rw-source-location"><FileCheck2 size={18}/><div><strong>{source.location||"Intake answer"}</strong><small>{source.kind==="document"?"Fictional document preview":"Information you entered during intake"}</small></div></div><blockquote>“{source.excerpt}”</blockquote><div className="rw-source-meta"><span>{source.kind==="document"?`Extraction match: ${source.confidence}`:"Source: your intake answer"}</span><span>{verified?"Verified by you":"Needs your review"}</span></div><p><Info size={14}/> {readOnly?"This source is preserved in an approved package.":"Confirm only that the wording and location are accurate. This does not determine whether the information proves a claim."}</p><footer>{readOnly?<button className="rw-primary" type="button" onClick={onClose}>Close</button>:<><button className="rw-secondary" type="button" onClick={onCorrection}>Correction needed</button><button className="rw-primary" type="button" onClick={onConfirm}>{verified?<><Check size={14}/> Already verified</>:<>Confirm source <Check size={14}/></>}</button></>}</footer></AccessibleDialog>}

function DownloadPreview({onClose,claims,packageId,localTestProfile,onFollowUp}:{onClose:()=>void;claims:ClaimWorkspace[];packageId:string;localTestProfile:boolean;onFollowUp:()=>void}){
  return <AccessibleDialog titleId="download-title" className="rw-download" onClose={onClose}><header><div><span className="rw-kicker">Approved package</span><h2 id="download-title">Your package is ready to download</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></header><div className="rw-download-mark"><Download size={26}/><span><strong>debrief-{packageId}.pdf</strong><small>{claims.length} {claims.length===1?"claim":"claims"}, package index, source trace, and filing reminder</small></span></div><FileRow name="Package index" meta="Approval date, filing path, and snapshot checksum"/>{claims.map((item,index)=><FileRow key={item.id} name={`${index+1}. ${item.title}`} meta="Statement and source trace"/>)}<FileRow name="Submission boundary" meta="Official link and reminders"/><p>{localTestProfile?"Fictional test profiles preview the contents but do not create a server file.":"This PDF is generated from the immutable version you approved. Downloading it does not submit anything to VA."}</p><div className="rw-follow-up-callout"><LockKeyhole size={18}/><div><strong>Keep this package unchanged</strong><p>If a later decision requires more work, start a linked follow-up package instead of editing this history.</p></div><button type="button" onClick={onFollowUp}>Start linked follow-up</button></div><footer>{!localTestProfile&&<a className="rw-primary" href={`/api/rework-packages/${encodeURIComponent(packageId)}/download`} download><Download size={15}/> Download approved PDF</a>}<button className={localTestProfile?"rw-primary":"rw-secondary"} type="button" onClick={onClose}>Done</button></footer></AccessibleDialog>
}

function ResetWorkspaceDialog({localTestProfile,onClose,onConfirm}:{localTestProfile:boolean;onClose:()=>void;onConfirm:()=>void}){
  return <AccessibleDialog titleId="reset-workspace-title" descriptionId="reset-workspace-copy" className="rw-delete-claim" onClose={onClose}><header><div><span className="rw-kicker">Destructive action</span><h2 id="reset-workspace-title">Clear this {localTestProfile?"preview":"draft workspace"}?</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={18}/></button></header><div className="rw-delete-claim-copy"><span><RotateCcw size={18}/></span><p id="reset-workspace-copy">This removes unfinished service, health, document, lead, and claim information. Approved package history cannot be cleared here.</p></div><footer><button className="rw-secondary" type="button" onClick={onClose}>Keep my work</button><button className="rw-danger" type="button" onClick={onConfirm}>Clear draft workspace</button></footer></AccessibleDialog>;
}

function FollowUpPreview({onClose,onStart}:{onClose:()=>void;onStart:(kind:Exclude<ClaimPath,"unsure">)=>void}){const options:Array<[Exclude<ClaimPath,"unsure">,string,string]>=[["original","Original disability claim","Organize one or more new disability claims"],["increase","Increased-rating claim","Document that a service-connected condition has worsened"],["supplemental","Supplemental claim","Add new and relevant evidence"],["contested","Decision review","Organize the decision and review options"]];return <AccessibleDialog titleId="follow-up-title" className="rw-follow-up" onClose={onClose}><header><div><span className="rw-kicker">New linked package</span><h2 id="follow-up-title">Start a new package without changing this package.</h2></div><button type="button" aria-label="Close new package preview" onClick={onClose}><X size={18}/></button></header><p>Your account service history, health timeline, and document library remain available. Claims, readiness, and approval stay separate for each filing path.</p><div className="rw-follow-up-options">{options.map(([kind,title,copy])=><button type="button" key={kind} onClick={()=>onStart(kind)}><strong>{title}</strong><small>{copy}</small><ArrowRight size={15}/></button>)}</div><footer><button className="rw-secondary" type="button" onClick={onClose}>Return to package</button></footer></AccessibleDialog>}
