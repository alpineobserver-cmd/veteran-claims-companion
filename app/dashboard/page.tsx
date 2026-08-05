import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { CurrentDate } from "@/components/current-date";
import { DeleteClaimButton } from "@/components/delete-claim-button";
import { prisma } from "@/lib/prisma";
import { ArrowRight, BookOpen, Check, Cloud, FileText, Files, Info, PackageCheck, Plus, Upload } from "lucide-react";
import type { Metadata } from "next";
import {redirect} from "next/navigation";

export const metadata:Metadata={title:"Dashboard",description:"Open, continue, and organize fictional Debrief claim workspaces."};

export default async function Dashboard() {
  const session=await auth();
  const user=session?.user;
  if(!user?.id)redirect("/login?redirectTo=/dashboard");
  const browserTest=user.id==="fictional-browser-tester";
  const persistentUser=user&&!browserTest;
  const [claims,archivedClaims]=browserTest?[[{id:"fictional-active-claim",title:"Fictional active workspace",status:"DRAFT" as const,progress:25,updatedAt:new Date("2026-08-05T12:00:00.000Z")}],[{id:"fictional-archived-claim",title:"Fictional archived workspace",updatedAt:new Date("2026-08-05T11:00:00.000Z")}]]:persistentUser?await Promise.all([prisma.claim.findMany({where:{userId:user.id,status:{not:"ARCHIVED"}},orderBy:{updatedAt:"desc"},select:{id:true,title:true,status:true,progress:true,updatedAt:true}}),prisma.claim.findMany({where:{userId:user.id,status:"ARCHIVED"},orderBy:{updatedAt:"desc"},select:{id:true,title:true,updatedAt:true}})]):[[],[]];
  const first=claims[0];
  const average=claims.length?Math.round(claims.reduce((sum,claim)=>sum+claim.progress,0)/claims.length):0;
  const shellUser={id:user.id,name:user.name,email:user.email,image:user.image};

  return <AppShell user={shellUser}><div className="content dashboard-content">
    <section className="welcome">
      <div><div className="eyebrow"><CurrentDate/></div><h1>{user.name?`Welcome back, ${user.name.split(" ")[0]}.`:"Your claim package."}</h1><p>Continue your saved package or begin another claim.</p></div>
      <a className="button primary" href="/intake"><Plus size={17}/><span>Start a claim</span></a>
    </section>

    <section className="next-step" aria-labelledby="next-heading">
      <div className="next-icon"><Check size={22}/></div>
      <div className="next-copy"><span className="kicker">Priority action</span><h2 id="next-heading">{first?`Continue your ${first.title} claim`:"Build your service and health foundation"}</h2><p>{first?`Your answers are ${first.progress}% prepared and were last saved ${formatUpdated(first.updatedAt)}.`:"Begin with service history and fictional document intake. Real medical records are prohibited in this alpha."}</p></div>
      <a className="button warm" href={first?`/claim-builder?claim=${first.id}`:"/intake"}>{first?"Resolve next claim step":"Open Service & Health"} <ArrowRight size={17}/></a>
    </section>

    <div className="dashboard-grid">
      <section className="panel claims-panel">
        <div className="section-title"><div><span className="kicker">Active casework</span><h2>Claims in progress</h2></div><a className="link" href="/claim-builder?new=1">New claim</a></div>
        {claims.length?claims.map((claim,index)=><Claim key={claim.id} {...claim} tone={index%2?"clay":"olive"}/>):<div className="empty-claims"><Cloud size={23}/><strong>No saved claims yet</strong><p>Start with Service &amp; Health and your first saved claim will appear here.</p><a href="/intake">Open Service &amp; Health <ArrowRight size={14}/></a></div>}
        {archivedClaims.length>0&&<details className="archived-claims"><summary>{archivedClaims.length} archived {archivedClaims.length===1?"workspace":"workspaces"}</summary>{archivedClaims.map(claim=><article key={claim.id}><div><strong>{claim.title}</strong><small>Archived {formatUpdated(claim.updatedAt)}</small></div><div className="claim-controls"><DeleteClaimButton id={claim.id} title={claim.title} archived/></div></article>)}</details>}
      </section>

      <aside className="panel overview-panel">
        <div className="section-title"><div><span className="kicker">Case status</span><h2>Your workspace</h2></div></div>
        <div className="record-row"><span>Saved claims</span><strong>{claims.length}</strong></div>
        <div className="record-row"><span>Average preparation</span><strong>{`${average}%`}</strong></div>
        <div className="record-row"><span>Storage</span><strong>Debrief account</strong></div>
        <a className="text-action" href="/claim-package">Review claim package <ArrowRight size={15}/></a>
      </aside>
    </div>

    <section className="resources" aria-labelledby="resources-heading">
      <div className="section-title"><div><span className="kicker">Reference desk</span><h2 id="resources-heading">What would you like to do?</h2></div></div>
      <div className="resource-grid">
        <Resource icon={Upload} title="Test document intake" text="Upload fictional records to the private intake prototype." href="/intake"/>
        <Resource icon={FileText} title="Start a new statement" text="Open a fresh claim questionnaire and prepare a draft." href="/claim-builder?new=1"/>
        <Resource icon={PackageCheck} title="Review claim package" text="See statements, documents, pending records, and next actions together." href="/claim-package"/>
        <Resource icon={BookOpen} title="Understand a condition" text="Learn what documentation may help." href="/conditions"/>
        <Resource icon={Files} title="Find a VA form" text="See when and how forms are used." href="/forms"/>
      </div>
    </section>

    <div className="notice"><Info size={19}/><div><strong>A quick reminder</strong><p>Debrief helps you organize and understand information. It does not submit claims, determine eligibility, or replace an accredited representative.</p></div></div>
    <footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer>
  </div></AppShell>;
}

function formatUpdated(date:Date){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(date)}

function Claim({id,title,updatedAt,progress,status,tone}:{id:string;title:string;updatedAt:Date;progress:number;status:string;tone:string}) {
  const stepsLeft=Math.max(0,11-Math.ceil(progress/100*11));
  return <article className="claim">
    <div className={`claim-monogram ${tone}`}>{title.charAt(0).toUpperCase()}</div>
    <div className="claim-body"><div className="claimtop"><div><h3>{title}</h3><p>Saved {formatUpdated(updatedAt)}</p></div><span className="badge">{status==="READY"?"Ready to review":"In progress"}</span></div>
      <div className="progress" aria-label={`${progress}% complete`}><span style={{width:`${progress}%`}}/></div>
      <div className="progressmeta"><span>{stepsLeft?`${stepsLeft} ${stepsLeft===1?"step":"steps"} left`:"Questionnaire complete"}</span><strong>{progress}% prepared</strong></div>
    </div><div className="claim-controls"><DeleteClaimButton id={id} title={title}/><a href={`/claim-builder?claim=${id}`} className="claim-arrow" aria-label={`Continue ${title} claim`}><ArrowRight size={19}/></a></div>
  </article>;
}

function Resource({icon:Icon,title,text,href}:{icon:typeof Upload;title:string;text:string;href:string}){return <a className="resource" href={href}><span className="resource-icon"><Icon size={20}/></span><span><strong>{title}</strong><small>{text}</small></span><ArrowRight className="resource-arrow" size={17}/></a>}
