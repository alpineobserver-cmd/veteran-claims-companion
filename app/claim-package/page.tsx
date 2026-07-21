import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { claimDraftSchema } from "@/lib/claim-drafts";
import { factRows, hasAvailableRecord, initialAnswers, normalizeEvidenceMap, type Answers } from "@/lib/claim-builder-intelligence";
import { evidenceChecklist, packageReadiness, packageStatus, validatePackageClaim, validatePackageEnvironment, type PackageStatus, type PackageValidation } from "@/lib/claim-package-workflow";
import { prisma } from "@/lib/prisma";
import { VA_FORM_DOWNLOADS_VERIFIED } from "@/lib/va-forms";
import { PackageStatusControl } from "@/components/package-status-control";
import { statementProvenanceSummary, type StatementProvenance } from "@/lib/statement-provenance";
import { AlertTriangle, ArrowRight, Check, ClipboardCheck, Files, FolderOpen, Info, Link2, Plus, ShieldCheck, Users } from "lucide-react";
import "./claim-package.css";
import "./statement-provenance.css";

type PackageClaim={
  id:string;
  title:string;
  progress:number;
  draftVersion:number;
  updatedAt:Date;
  draftData:unknown;
  documents:Array<{id:string;originalName:string;sha256:string}>;
};

type PackageItem={
  id:string;
  condition:string;
  claimType:string;
  progress:number;
  updatedAt:Date;
  statement:string;
  statementProvenance:StatementProvenance;
  sourcedStatements:number;
  unsourcedStatements:number;
  statementSections:number;
  confirmedSections:number;
  evidenceFacts:number;
  availableRecords:number;
  pendingRecords:number;
  documents:number;
  linkedDocuments:number;
  status:PackageStatus;
  draftVersion:number;
  validations:PackageValidation[];
  readiness:"needs_work"|"review"|"ready";
  checklist:ReturnType<typeof evidenceChecklist>;
  documentNames:Record<string,string>;
  buddyStatements:number;
};

function packageItem(claim:PackageClaim,documentNames:Record<string,string>):PackageItem{
  const parsed=claimDraftSchema.safeParse(claim.draftData);
  const draft=parsed.success?parsed.data:null;
  const answers={...initialAnswers,...(draft?.answers||{})} as Answers;
  const condition=(answers.condition==="Other / condition not listed"?answers.otherCondition:answers.condition)||claim.title;
  const evidenceMap=normalizeEvidenceMap(draft?.evidenceMap);
  const facts=factRows(answers,condition);
  const statement=draft?.statement?.trim()||"";
  const sections=statement.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
  const confirmations=draft?.confirmations||{};
  const validations=validatePackageClaim(claim.draftData,claim.title);
  const statementProvenance=(draft?.statementProvenance||{version:1,sentences:[]}) as StatementProvenance;
  const sourceSummary=statementProvenanceSummary(statementProvenance);
  return {
    id:claim.id,condition,claimType:answers.claimType,progress:claim.progress,updatedAt:claim.updatedAt,statement,
    statementProvenance,sourcedStatements:sourceSummary.mapped,unsourcedStatements:sourceSummary.unmapped,
    statementSections:sections.length,
    confirmedSections:sections.filter((_,index)=>confirmations[String(index)]).length,
    evidenceFacts:facts.length,
    availableRecords:facts.filter(row=>hasAvailableRecord(evidenceMap[row.id])).length,
    pendingRecords:facts.filter(row=>evidenceMap[row.id]?.status==="record_not_obtained").length,
    documents:claim.documents.length,
    linkedDocuments:new Set(Object.values(draft?.documentLinks||{}).flat()).size,
    status:packageStatus(draft?.packageStatus),draftVersion:claim.draftVersion,
    validations,
    readiness:packageReadiness(validations),
    checklist:evidenceChecklist(claim.draftData,claim.title),
    documentNames,buddyStatements:draft?.buddyStatements?.length||0
  };
}

function itemState(item:PackageItem){
  if(!item.statement)return {label:item.progress>=82?"Draft statement":"Finish questionnaire",tone:"working",action:item.progress>=82?"Draft statement":"Continue questions"};
  if(!item.statementSections||item.confirmedSections<item.statementSections)return {label:"Verify statement",tone:"attention",action:"Verify statement"};
  return {label:"In package",tone:"ready",action:"Review condition"};
}

export default async function ClaimPackagePage(){
  const session=await auth();
  if(!session?.user?.id)redirect("/login?redirectTo=/claim-package");
  const user=session.user;
  const claims=await prisma.claim.findMany({where:{userId:user.id,status:{not:"ARCHIVED"}},orderBy:{updatedAt:"desc"},select:{id:true,title:true,progress:true,draftVersion:true,updatedAt:true,draftData:true,documents:{select:{id:true,originalName:true,sha256:true}}}});
  const documentNames=Object.fromEntries(claims.flatMap(claim=>claim.documents.map(document=>[document.id,document.originalName])));
  const items=claims.map(claim=>packageItem(claim,documentNames));
  const drafted=items.filter(item=>item.statement).length;
  const verified=items.filter(item=>item.statementSections>0&&item.confirmedSections===item.statementSections).length;
  const pending=items.reduce((sum,item)=>sum+item.pendingRecords,0);
  const documents=items.reduce((sum,item)=>sum+item.documents,0);
  const ready=items.filter(item=>item.readiness==="ready").length;
  const packageChecks=validatePackageEnvironment(claims.flatMap(claim=>claim.documents),VA_FORM_DOWNLOADS_VERIFIED);
  const blockers=items.reduce((sum,item)=>sum+item.validations.filter(validation=>validation.level==="blocker").length,0)+packageChecks.filter(check=>check.level==="blocker").length;
  const nextItem=items.find(item=>!item.statement)||items.find(item=>item.statementSections>item.confirmedSections)||items.find(item=>item.readiness!=="ready");
  const priorityAction=!items.length
    ?{title:"Start your first condition",text:"Begin the guided questions. You can save and return at any time.",href:"/claim-builder?new=1",label:"Start condition"}
    :nextItem
      ?{title:`Continue ${nextItem.condition}`,text:itemState(nextItem).label==="Verify statement"?"Review and confirm each statement section before moving on.":nextItem.readiness==="needs_work"?"Resolve the required items shown for this condition.":"Finish the next incomplete part of this condition.",href:`/claim-builder?claim=${nextItem.id}`,label:itemState(nextItem).action}
      :{title:"Review the filing steps",text:"Your condition workspaces are prepared. Review the official filing guidance and submit outside Debrief when you choose.",href:"#submission-heading",label:"See filing steps"};
  const shellUser={id:user.id,name:user.name,email:user.email,image:user.image};

  return <AppShell current="package" user={shellUser}><div className="package-wrap">
    <header className="package-hero"><div><span className="kicker">Claim assembly</span><h1>Your claim package</h1><p>Keep one personal statement per condition, see what still needs attention, and choose the next useful action.</p></div><a className="button primary" href="/claim-builder?new=1"><Plus size={16}/>Add a condition</a></header>

    <ol className="package-flow" aria-label="Claim preparation workflow"><li className={documents?"done":"optional"}><span>{documents?<Check size={13}/>:"1"}</span><div><strong>Documents</strong><small>{documents?"Records organized":"Optional · none uploaded"}</small></div></li><li className="current"><span>2</span><div><strong>Build conditions</strong><small>Statements and evidence</small></div></li><li><span>3</span><div><strong>Review package</strong><small>Resolve missing items</small></div></li><li><span>4</span><div><strong>Submit through VA</strong><small>Follow official instructions</small></div></li></ol>

    <section className="package-summary" aria-label="Package summary"><Summary icon={Files} label="Conditions" value={items.length}/><Summary icon={ShieldCheck} label="Ready for export" value={ready}/><Summary icon={ClipboardCheck} label="Statements verified" value={verified}/><Summary icon={FolderOpen} label="Documents uploaded" value={documents}/><Summary icon={blockers?AlertTriangle:Check} label="Blocking checks" value={blockers}/></section>
    <section className="package-priority" aria-labelledby="package-priority-heading"><div><span className="kicker">One clear next step</span><h2 id="package-priority-heading">{priorityAction.title}</h2><p>{priorityAction.text}</p></div><a className="button primary" href={priorityAction.href}>{priorityAction.label}<ArrowRight size={15}/></a></section>
    {packageChecks.length>0&&<section className="package-global-checks" aria-label="Package-wide checks"><AlertTriangle size={17}/><div><strong>Package-wide review</strong>{packageChecks.map(check=><p key={check.id}><b>{check.title}:</b> {check.detail}</p>)}</div></section>}

    <div className="package-layout"><section className="package-conditions"><div className="package-section-head"><div><span className="kicker">One statement per condition</span><h2>Conditions in this package</h2></div></div>{items.length?items.map(item=><ConditionCard key={item.id} item={item}/>):<div className="package-empty"><ClipboardCheck size={28}/><h2>No conditions have been added yet</h2><p>Start a guided questionnaire. Your first saved condition will appear here automatically.</p><a className="button primary" href="/claim-builder?new=1">Start first condition <ArrowRight size={15}/></a></div>}</section>

      <aside className="package-next"><span className="kicker">Next actions</span><h2>Keep moving</h2><Action icon={Plus} title="Work another condition" text="Start a fresh questionnaire without changing existing work." href="/claim-builder?new=1"/><Action icon={FolderOpen} title="Add or review documents" text="Return to the document workspace for any condition." href="/intake"/><Action icon={Users} title="Prepare a buddy statement" text="Guide a witness through a firsthand supporting statement." href={items[0]?`/buddy-statement?claim=${items[0].id}`:"/claim-builder?new=1"}/><Action icon={Files} title="Review common VA forms" text="Use the forms library to confirm current official instructions." href="/forms"/>
        <div className="form-resources"><strong>Common official resources</strong><p>These links are reference points, not a determination of which form you must file.</p><a href="/forms/21-526ez">VA Form 21-526EZ <ArrowRight size={13}/></a><a href="/forms/21-4138">VA Form 21-4138 <ArrowRight size={13}/></a></div>
      </aside>
    </div>

    <section className="submission-bridge" aria-labelledby="submission-heading"><div className="submission-head"><div><span className="kicker">Submission bridge</span><h2 id="submission-heading">What to do after preparation</h2><p>Debrief does not collect VA credentials, submit a claim, or verify receipt. Use the official VA route and retain your own confirmation.</p></div></div><ol><li><span>1</span><div><strong>Prepare and review</strong><p>Resolve blocking checks, verify each condition statement, and download the items you plan to use.</p></div></li><li><span>2</span><div><strong>File outside Debrief</strong><p>Open VA.gov, confirm the current form and filing path, and submit directly through an official channel.</p><a href="https://www.va.gov/disability/how-to-file-claim/" target="_blank" rel="noreferrer">Official filing guidance <ArrowRight size={13}/></a><a href="https://www.va.gov/disability/file-disability-claim-form-21-526ez/" target="_blank" rel="noreferrer">Start an online disability claim <ArrowRight size={13}/></a></div></li><li><span>3</span><div><strong>Record your own status</strong><p>After filing, change each condition to “Marked submitted.” This is a personal tracking note—not confirmation that VA received it.</p></div></li></ol></section>
    <footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer>
  </div></AppShell>;
}

function Summary({icon:Icon,label,value}:{icon:typeof Files;label:string;value:number}){return <div><Icon size={17}/><span>{label}</span><strong>{value}</strong></div>}

function ConditionCard({item}:{item:PackageItem}){
  const state=itemState(item);
  const blockers=item.validations.filter(validation=>validation.level==="blocker");
  const notices=item.validations.filter(validation=>validation.level!=="blocker");
  return <article className={`package-condition readiness-${item.readiness}`}><div className="package-condition-main"><div className="package-condition-title"><span className={`package-state ${state.tone}`}>{state.label}</span><span className={`readiness-pill ${item.readiness}`}>{item.readiness==="ready"?"Ready for export":item.readiness==="review"?"Review suggested":"Needs attention"}</span><h3>{item.condition}</h3><p>{item.claimType||"Claim path not selected"} · Updated {new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(item.updatedAt)}</p></div><div className="package-progress"><span><i style={{width:`${item.progress}%`}}/></span><strong>{item.progress}% prepared</strong></div><div className="package-metrics"><span><strong>{item.statement?"Drafted":"Not drafted"}</strong>Statement</span><span><strong>{item.confirmedSections} of {item.statementSections}</strong>Sections verified</span><span><strong>{item.sourcedStatements} sourced</strong>{item.unsourcedStatements?`${item.unsourcedStatements} need review`:"Statement trace"}</span><span><strong>{item.linkedDocuments} of {item.documents}</strong>Files linked</span><span><strong>{item.validations.length}</strong>Readiness checks</span></div>
    {(blockers.length>0||notices.length>0)&&<details className="package-validation" open={blockers.length>0}><summary><AlertTriangle size={14}/>{blockers.length?`${blockers.length} blocking ${blockers.length===1?"item":"items"}`:`${notices.length} review ${notices.length===1?"item":"items"}`}</summary><ul>{item.validations.map(validation=><li className={validation.level} key={validation.id}><strong>{validation.title}</strong><span>{validation.detail}</span></li>)}</ul></details>}
    <details className="package-evidence"><summary><Link2 size={14}/>Evidence checklist and sources</summary><div>{item.checklist.map(row=><section key={row.id}><strong>{row.fact}</strong><span>{row.source||row.suggested}</span><small>{row.status.replaceAll("_"," ")}{row.documentIds.length?` · ${row.documentIds.map(id=>item.documentNames[id]).filter(Boolean).join(", ")}`:" · no uploaded file linked"}</small></section>)}</div><p>This checklist organizes identified support; it does not predict whether evidence is sufficient or guarantee a claim result.</p></details>
    {item.statementProvenance.sentences.length>0&&<details className={`package-sources ${item.unsourcedStatements?"has-warning":""}`}><summary><Link2 size={14}/>Personal statement source trace · {item.sourcedStatements} of {item.statementProvenance.sentences.length} linked</summary><div>{item.statementProvenance.sentences.map(sentence=><section className={sentence.status} key={sentence.id}><p>“{sentence.text}”</p>{sentence.origins.length?sentence.origins.map((origin,index)=>{const fact=item.checklist.find(row=>row.id===origin.factId);return <span key={`${origin.field||origin.timelineEventId}-${index}`}><strong>{origin.label}</strong><small>{origin.excerpt}</small>{fact&&<em>Related support: {fact.status.replaceAll("_"," ")}{fact.documentIds.length?` · ${fact.documentIds.map(id=>item.documentNames[id]).filter(Boolean).join(", ")}`:""}</em>}</span>}):<span className="source-needed"><strong>Source review needed</strong><small>Revise this wording or add the supporting answer before export.</small></span>}</section>)}</div><p>These links identify where wording originated; they do not prove a fact or guarantee that a related document supports every word.</p></details>}
    {item.statement&&<blockquote>{item.statement.slice(0,220)}{item.statement.length>220?"…":""}</blockquote>}{item.buddyStatements>0&&<p className="package-buddy"><Users size={13}/>{item.buddyStatements} buddy statement {item.buddyStatements===1?"draft":"drafts"} saved</p>}</div><div className="package-condition-actions"><PackageStatusControl claimId={item.id} status={item.status} version={item.draftVersion}/><a className="button secondary" href={`/buddy-statement?claim=${item.id}`}>Buddy statements<ArrowRight size={14}/></a><a className="button secondary" href={`/claim-builder?claim=${item.id}`}>{state.action}<ArrowRight size={14}/></a></div></article>;
}

function Action({icon:Icon,title,text,href}:{icon:typeof Plus;title:string;text:string;href:string}){return <a className="package-action" href={href}><Icon size={18}/><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={15}/></a>}
