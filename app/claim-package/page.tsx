import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { claimDraftSchema } from "@/lib/claim-drafts";
import { factRows, hasAvailableRecord, initialAnswers, normalizeEvidenceMap, type Answers, type EvidenceMap } from "@/lib/claim-builder-intelligence";
import { evidenceChecklist, packageReadiness, packageStatus, validatePackageClaim, validatePackageEnvironment, type PackageStatus, type PackageValidation } from "@/lib/claim-package-workflow";
import { prisma } from "@/lib/prisma";
import { VA_FORM_DOWNLOADS_VERIFIED } from "@/lib/va-forms";
import { PackageStatusControl } from "@/components/package-status-control";
import { statementProvenanceSummary, type StatementProvenance } from "@/lib/statement-provenance";
import { normalizeDocumentCitations, statementFactSourceKind, statementFactSourceLabel, type DocumentCitations } from "@/lib/statement-source-labels";
import { AlertTriangle, ArrowRight, Check, ClipboardCheck, FileText, Files, FolderOpen, Link2, Plus, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import "./claim-package.css";
import "./statement-provenance.css";
import "./source-citations.css";

export const metadata:Metadata={title:"Claim package",description:"Review fictional condition statements, supporting items, and preparation next steps together."};

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
  statementMode:""|"ai"|"template"|"edited"|"stale";
  statementProvenance:StatementProvenance;
  documentCitations:DocumentCitations;
  evidenceMap:EvidenceMap;
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
  const statementMode=draft?.statementMode||"";
  const sections=statement.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
  const confirmations=draft?.confirmations||{};
  const validations=validatePackageClaim(claim.draftData,claim.title);
  const statementProvenance=(draft?.statementProvenance||{version:1,sentences:[]}) as StatementProvenance;
  const documentCitations=normalizeDocumentCitations(draft?.documentCitations);
  const sourceSummary=statementProvenanceSummary(statementProvenance);
  return {
    id:claim.id,condition,claimType:answers.claimType,progress:claim.progress,updatedAt:claim.updatedAt,statement,statementMode,
    statementProvenance,documentCitations,evidenceMap,sourcedStatements:sourceSummary.mapped,unsourcedStatements:sourceSummary.unmapped,
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

function conditionHref(item:PackageItem){
  if(!item.statement&&item.progress>=82)return `/claim-builder?claim=${item.id}&section=statement`;
  if(item.statement&&item.confirmedSections<item.statementSections)return `/claim-builder?claim=${item.id}&section=package`;
  return `/claim-builder?claim=${item.id}`;
}

export default async function ClaimPackagePage(){
  const session=await auth();
  if(!session?.user?.id)redirect("/login?redirectTo=/claim-package");
  const user=session.user;
  const claims=await prisma.claim.findMany({where:{userId:user.id,status:{not:"ARCHIVED"}},orderBy:{updatedAt:"desc"},select:{id:true,title:true,progress:true,draftVersion:true,updatedAt:true,draftData:true,documents:{select:{id:true,originalName:true,sha256:true}}}});
  const documentNames=Object.fromEntries(claims.flatMap(claim=>claim.documents.map(document=>[document.id,document.originalName])));
  const items=claims.map(claim=>packageItem(claim,documentNames));
  const documents=items.reduce((sum,item)=>sum+item.documents,0);
  const packageChecks=validatePackageEnvironment(claims.flatMap(claim=>claim.documents),VA_FORM_DOWNLOADS_VERIFIED);
  const nextItem=items.find(item=>!item.statement)||items.find(item=>item.statementSections>item.confirmedSections)||items.find(item=>item.readiness!=="ready");
  const priorityAction=!items.length
    ?{title:"Start your first condition",text:"Begin the guided questions. You can save and return at any time.",href:"/claim-builder?new=1",label:"Start condition"}
    :nextItem
      ?{title:`Continue ${nextItem.condition}`,text:itemState(nextItem).label==="Verify statement"?"Review and confirm each statement section before moving on.":nextItem.readiness==="needs_work"?"Resolve the required items shown for this condition.":"Finish the next incomplete part of this condition.",href:conditionHref(nextItem),label:itemState(nextItem).action}
      :{title:"Review the filing steps",text:"Your condition workspaces are prepared. Review the official filing guidance and submit outside Debrief when you choose.",href:"#submission-heading",label:"See filing steps"};
  const shellUser={id:user.id,name:user.name,email:user.email,image:user.image};

  return <AppShell current="package" user={shellUser}><div className="package-wrap">
    <header className="package-hero"><div><span className="kicker">Claim assembly</span><h1>Your claim package</h1><p>Move each condition through its personal statement, optional buddy statements, and final review. Your saved work stays attached to that condition.</p></div><div className="package-hero-actions"><a className="button secondary" href="/claim-builder">Return to Claim Builder</a><a className="button primary" href="/claim-builder?new=1"><Plus size={16}/>Add a condition</a></div></header>

    <ol className="package-flow" aria-label="Claim preparation workflow"><li className={documents?"done":"optional"}><span>{documents?<Check size={13}/>:"1"}</span><div><strong>Documents</strong><small>{documents?"Records organized":"Optional · none uploaded"}</small></div></li><li className="current"><span>2</span><div><strong>Build conditions</strong><small>Statements and evidence</small></div></li><li><span>3</span><div><strong>Review package</strong><small>Resolve missing items</small></div></li><li><span>4</span><div><strong>Submit through VA</strong><small>Follow official instructions</small></div></li></ol>

    <section className="package-priority" aria-labelledby="package-priority-heading"><div><span className="kicker">One clear next step</span><h2 id="package-priority-heading">{priorityAction.title}</h2><p>{priorityAction.text}</p></div><a className="button primary" href={priorityAction.href}>{priorityAction.label}<ArrowRight size={15}/></a></section>
    {packageChecks.length>0&&<section className="package-global-checks" aria-label="Package-wide checks"><AlertTriangle size={17}/><div><strong>Package-wide review</strong>{packageChecks.map(check=><p key={check.id}><b>{check.title}:</b> {check.detail}</p>)}</div></section>}

    <div className="package-layout"><section className="package-conditions"><div className="package-section-head"><div><span className="kicker">One statement per condition</span><h2>Conditions in this package</h2><p>Open the exact step you need below. Changes and statement drafts save back to this package.</p></div></div>{items.length?items.map(item=><ConditionCard key={item.id} item={item}/>):<div className="package-empty"><ClipboardCheck size={28}/><h2>No conditions have been added yet</h2><p>Start a guided questionnaire. Your first saved condition will appear here automatically.</p><a className="button primary" href="/claim-builder?new=1">Start first condition <ArrowRight size={15}/></a></div>}</section>

      <aside className="package-next"><span className="kicker">Package-wide actions</span><h2>Documents and forms</h2><Action icon={Plus} title="Work another condition" text="Start a fresh questionnaire without changing existing work." href="/claim-builder?new=1"/><Action icon={FolderOpen} title="Add or review documents" text="Return to the document workspace for any condition." href="/intake"/><Action icon={Files} title="Review common VA forms" text="Use the forms library to confirm current official instructions." href="/forms"/>
        <div className="form-resources"><strong>Common official resources</strong><p>These links are reference points, not a determination of which form you must file.</p><Link href="/forms/21-526ez">VA Form 21-526EZ <ArrowRight size={13}/></Link><Link href="/forms/21-4138">VA Form 21-4138 <ArrowRight size={13}/></Link></div>
      </aside>
    </div>

    <section className="submission-bridge" aria-labelledby="submission-heading"><div className="submission-head"><div><span className="kicker">Submission bridge</span><h2 id="submission-heading">What to do after preparation</h2><p>Debrief does not collect VA credentials, submit a claim, or verify receipt. Use the official VA route and retain your own confirmation.</p></div></div><ol><li><span>1</span><div><strong>Prepare and review</strong><p>Resolve blocking checks, verify each condition statement, and download the items you plan to use.</p></div></li><li><span>2</span><div><strong>File outside Debrief</strong><p>Open VA.gov, confirm the current form and filing path, and submit directly through an official channel.</p><a href="https://www.va.gov/disability/how-to-file-claim/" target="_blank" rel="noreferrer">Official filing guidance <ArrowRight size={13}/></a><a href="https://www.va.gov/disability/file-disability-claim-form-21-526ez/" target="_blank" rel="noreferrer">Start an online disability claim <ArrowRight size={13}/></a></div></li><li><span>3</span><div><strong>Record your own status</strong><p>After filing, change each condition to “Marked submitted.” This is a personal tracking note—not confirmation that VA received it.</p></div></li></ol></section>
    <footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer>
  </div></AppShell>;
}

function ConditionCard({item}:{item:PackageItem}){
  const state=itemState(item);
  const blockers=item.validations.filter(validation=>validation.level==="blocker");
  const notices=item.validations.filter(validation=>validation.level!=="blocker");
  const draftingLabel=item.statementMode==="ai"?"AI-drafted wording":item.statementMode==="template"?"Guided-template wording":item.statementMode==="edited"?"Edited or drafting language":"Drafting language";
  return <article className={`package-condition readiness-${item.readiness}`}><div className="package-condition-main"><div className="package-condition-title"><span className={`package-state ${state.tone}`}>{state.label}</span><span className={`readiness-pill ${item.readiness}`}>{item.readiness==="ready"?"Ready for export":item.readiness==="review"?"Review suggested":"Needs attention"}</span><h3>{item.condition}</h3><p>{item.claimType||"Claim path not selected"} · Updated {new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(item.updatedAt)}</p></div><div className="package-progress"><span><i style={{width:`${item.progress}%`}}/></span><strong>{item.progress}% prepared</strong></div><nav className="condition-workflow" aria-label={`${item.condition} statement workflow`}><a href={`/claim-builder?claim=${item.id}&section=statement`}><FileText size={15}/><span><strong>Personal statement</strong><small>{item.statement?"Draft saved":"Draft needed"}</small></span><ArrowRight size={13}/></a><a href={`/buddy-statement?claim=${item.id}`}><Users size={15}/><span><strong>Buddy statements</strong><small>{item.buddyStatements?`${item.buddyStatements} saved`:"Optional"}</small></span><ArrowRight size={13}/></a><a href={`/claim-builder?claim=${item.id}&section=package`}><ClipboardCheck size={15}/><span><strong>Review and download</strong><small>{item.statementSections&&item.confirmedSections===item.statementSections?"Verified":"Review needed"}</small></span><ArrowRight size={13}/></a></nav>
    {(blockers.length>0||notices.length>0)&&<details className="package-validation" open={blockers.length>0}><summary><AlertTriangle size={14}/>{blockers.length?`${blockers.length} blocking ${blockers.length===1?"item":"items"}`:`${notices.length} review ${notices.length===1?"item":"items"}`}</summary><ul>{item.validations.map(validation=><li className={validation.level} key={validation.id}><strong>{validation.title}</strong><span>{validation.detail}</span></li>)}</ul></details>}
    <details className="package-evidence"><summary><Link2 size={14}/>Evidence checklist and sources</summary><div>{item.checklist.map(row=><section key={row.id}><strong>{row.fact}</strong><span>{row.source||row.suggested}</span><small>{row.status.replaceAll("_"," ")}{row.documentIds.length?` · ${row.documentIds.map(id=>item.documentNames[id]).filter(Boolean).join(", ")}`:" · no uploaded file linked"}</small></section>)}</div><p>This checklist organizes identified support; it does not predict whether evidence is sufficient or guarantee a claim result.</p></details>
    {item.statementProvenance.sentences.length>0&&<details className={`package-sources ${item.unsourcedStatements?"has-warning":""}`}><summary><Link2 size={14}/>Personal statement source trace · {item.sourcedStatements} of {item.statementProvenance.sentences.length} linked</summary><div className="source-label-legend" aria-label="Statement source labels"><span className="source-kind user">Veteran-provided fact</span><span className="source-kind witness">Witness observation</span><span className="source-kind record">Record-derived fact</span><span className="source-kind drafting">{draftingLabel}</span></div><div>{item.statementProvenance.sentences.map(sentence=><section className={sentence.status} key={sentence.id}><div className="sentence-source-heading"><p>“{sentence.text}”</p>{item.statementMode&&<span className="source-kind drafting">{draftingLabel}</span>}</div>{sentence.origins.length?sentence.origins.map((origin,index)=>{const fact=item.checklist.find(row=>row.id===origin.factId);const kind=statementFactSourceKind(origin,item.evidenceMap);return <span className={`source-origin ${kind}`} key={`${origin.field||origin.timelineEventId}-${index}`}><span className={`source-kind ${kind}`}>{statementFactSourceLabel[kind]}</span><strong>{origin.label}</strong><small>{origin.excerpt}</small>{fact&&<em>Source classification: {fact.status.replaceAll("_"," ")}{fact.source?` · ${fact.source}`:""}</em>}{kind==="record"&&fact?.documentIds.map(id=><em className={`record-citation ${fact.documentCitations[id]?"":"missing"}`} key={id}>{item.documentNames[id]||"Uploaded document"} · {fact.documentCitations[id]?`Citation: ${fact.documentCitations[id]}`:"Page or section reference required"}</em>)}</span>}):<span className="source-needed"><span className="source-kind drafting">{draftingLabel}</span><strong>Source review needed</strong><small>Revise this wording or add the supporting answer before export.</small></span>}</section>)}</div><p>Fact labels identify the saved source classification. Drafting labels identify who or what organized the wording. A citation helps locate a record; it does not prove the fact or guarantee the file supports every word.</p></details>}
    {item.statement&&<blockquote>{item.statement.slice(0,220)}{item.statement.length>220?"…":""}</blockquote>}</div><div className="package-condition-actions"><PackageStatusControl claimId={item.id} status={item.status} version={item.draftVersion}/><a className="button secondary" href={conditionHref(item)}>{state.action}<ArrowRight size={14}/></a></div></article>;
}

function Action({icon:Icon,title,text,href}:{icon:typeof Plus;title:string;text:string;href:string}){return <a className="package-action" href={href}><Icon size={18}/><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={15}/></a>}
