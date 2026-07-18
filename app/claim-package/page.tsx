import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { claimDraftSchema } from "@/lib/claim-drafts";
import { factRows, hasAvailableRecord, initialAnswers, normalizeEvidenceMap, type Answers } from "@/lib/claim-builder-intelligence";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Check, ClipboardCheck, FilePlus2, Files, FolderOpen, Info, Plus, ShieldCheck } from "lucide-react";
import "./claim-package.css";

type PackageClaim={
  id:string;
  title:string;
  progress:number;
  updatedAt:Date;
  draftData:unknown;
  _count:{documents:number};
};

type PackageItem={
  id:string;
  condition:string;
  claimType:string;
  progress:number;
  updatedAt:Date;
  statement:string;
  statementSections:number;
  confirmedSections:number;
  evidenceFacts:number;
  availableRecords:number;
  pendingRecords:number;
  documents:number;
};

function packageItem(claim:PackageClaim):PackageItem{
  const parsed=claimDraftSchema.safeParse(claim.draftData);
  const draft=parsed.success?parsed.data:null;
  const answers={...initialAnswers,...(draft?.answers||{})} as Answers;
  const condition=(answers.condition==="Other / condition not listed"?answers.otherCondition:answers.condition)||claim.title;
  const evidenceMap=normalizeEvidenceMap(draft?.evidenceMap);
  const facts=factRows(answers,condition);
  const statement=draft?.statement?.trim()||"";
  const sections=statement.split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
  const confirmations=draft?.confirmations||{};
  return {
    id:claim.id,condition,claimType:answers.claimType,progress:claim.progress,updatedAt:claim.updatedAt,statement,
    statementSections:sections.length,
    confirmedSections:sections.filter((_,index)=>confirmations[String(index)]).length,
    evidenceFacts:facts.length,
    availableRecords:facts.filter(row=>hasAvailableRecord(evidenceMap[row.id])).length,
    pendingRecords:facts.filter(row=>evidenceMap[row.id]?.status==="record_not_obtained").length,
    documents:claim._count.documents
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
  const claims=await prisma.claim.findMany({where:{userId:user.id,status:{not:"ARCHIVED"}},orderBy:{updatedAt:"desc"},select:{id:true,title:true,progress:true,updatedAt:true,draftData:true,_count:{select:{documents:true}}}});
  const items=claims.map(packageItem);
  const drafted=items.filter(item=>item.statement).length;
  const verified=items.filter(item=>item.statementSections>0&&item.confirmedSections===item.statementSections).length;
  const pending=items.reduce((sum,item)=>sum+item.pendingRecords,0);
  const documents=items.reduce((sum,item)=>sum+item.documents,0);
  const shellUser={id:user.id,name:user.name,email:user.email,image:user.image};

  return <AppShell current="package" user={shellUser}><div className="package-wrap">
    <header className="package-hero"><div><span className="kicker">Claim assembly</span><h1>Your claim package</h1><p>Keep one personal statement per condition, see what still needs attention, and choose the next useful action.</p></div><a className="button primary" href="/claim-builder?new=1"><Plus size={16}/>Add a condition</a></header>

    <ol className="package-flow" aria-label="Claim preparation workflow"><li className="done"><span><Check size={13}/></span><div><strong>Documents</strong><small>Organize records</small></div></li><li className="current"><span>2</span><div><strong>Build conditions</strong><small>Statements and evidence</small></div></li><li><span>3</span><div><strong>Review package</strong><small>Resolve missing items</small></div></li><li><span>4</span><div><strong>Submit through VA</strong><small>Follow official instructions</small></div></li></ol>

    <section className="package-summary" aria-label="Package summary"><Summary icon={Files} label="Conditions" value={items.length}/><Summary icon={ClipboardCheck} label="Statements drafted" value={drafted}/><Summary icon={ShieldCheck} label="Statements verified" value={verified}/><Summary icon={FolderOpen} label="Documents uploaded" value={documents}/><Summary icon={Info} label="Records pending" value={pending}/></section>

    <div className="package-layout"><section className="package-conditions"><div className="package-section-head"><div><span className="kicker">One statement per condition</span><h2>Conditions in this package</h2></div></div>{items.length?items.map(item=><ConditionCard key={item.id} item={item}/>):<div className="package-empty"><ClipboardCheck size={28}/><h2>No conditions have been added yet</h2><p>Start a guided questionnaire. Your first saved condition will appear here automatically.</p><a className="button primary" href="/claim-builder?new=1">Start first condition <ArrowRight size={15}/></a></div>}</section>

      <aside className="package-next"><span className="kicker">Next actions</span><h2>Keep moving</h2><Action icon={Plus} title="Work another condition" text="Start a fresh questionnaire without changing existing work." href="/claim-builder?new=1"/><Action icon={FolderOpen} title="Add or review documents" text="Return to the document workspace for any condition." href="/intake"/><Action icon={Files} title="Review common VA forms" text="Use the forms library to confirm current official instructions." href="/forms"/>
        <div className="form-resources"><strong>Common official resources</strong><p>These links are reference points, not a determination of which form you must file.</p><a href="/forms/21-526ez">VA Form 21-526EZ <ArrowRight size={13}/></a><a href="/forms/21-4138">VA Form 21-4138 <ArrowRight size={13}/></a></div>
      </aside>
    </div>

    <div className="package-submit-note"><Info size={18}/><div><strong>Debrief prepares; it does not submit.</strong><p>When your package is ready, verify the current filing route and required forms on VA.gov. Keep confirmation of anything you submit.</p></div><a href="https://www.va.gov/disability/how-to-file-claim/" target="_blank" rel="noreferrer">Open VA filing guidance <ArrowRight size={14}/></a></div>
    <footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer>
  </div></AppShell>;
}

function Summary({icon:Icon,label,value}:{icon:typeof Files;label:string;value:number}){return <div><Icon size={17}/><span>{label}</span><strong>{value}</strong></div>}

function ConditionCard({item}:{item:PackageItem}){
  const state=itemState(item);
  return <article className="package-condition"><div className="package-condition-main"><div className="package-condition-title"><span className={`package-state ${state.tone}`}>{state.label}</span><h3>{item.condition}</h3><p>{item.claimType||"Claim path not selected"} · Updated {new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(item.updatedAt)}</p></div><div className="package-progress"><span><i style={{width:`${item.progress}%`}}/></span><strong>{item.progress}% prepared</strong></div><div className="package-metrics"><span><strong>{item.statement?"Drafted":"Not drafted"}</strong>Statement</span><span><strong>{item.confirmedSections} of {item.statementSections}</strong>Sections verified</span><span><strong>{item.availableRecords} of {item.evidenceFacts}</strong>Available records</span><span><strong>{item.documents}</strong>Uploaded files</span></div>{item.pendingRecords>0&&<p className="package-pending"><Info size={13}/>{item.pendingRecords} {item.pendingRecords===1?"record is":"records are"} marked identified but not yet obtained.</p>}{item.statement&&<blockquote>{item.statement.slice(0,220)}{item.statement.length>220?"…":""}</blockquote>}</div><a className="button secondary" href={`/claim-builder?claim=${item.id}`}>{state.action}<ArrowRight size={14}/></a></article>;
}

function Action({icon:Icon,title,text,href}:{icon:typeof Plus;title:string;text:string;href:string}){return <a className="package-action" href={href}><Icon size={18}/><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={15}/></a>}
