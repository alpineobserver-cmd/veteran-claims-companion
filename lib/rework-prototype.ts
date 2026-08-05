export type PrototypeScreen="intent"|"intake"|"documents"|"leads"|"dashboard"|"workspace"|"package";
export type Confidence="high"|"medium"|"low";
export type VerificationState="unreviewed"|"confirmed"|"corrected";
export type ClaimPath="original"|"increase"|"supplemental"|"contested"|"unsure";
export type BuddyDecision="undecided"|"add"|"not-available"|"not-needed";

export type SourceReference={
  id:string;
  kind:"intake"|"document"|"witness"|"user";
  label:string;
  excerpt:string;
  documentId?:string;
  location?:string;
  confidence:Confidence;
  verification:VerificationState;
};

export type ServicePeriod={
  id:string;
  service:string;
  kind:"Duty station"|"Deployment"|"TDY";
  location:string;
  role:string;
  start:string;
  end:string;
  approximate:boolean;
  exposures:string;
};

export type HealthEvent={
  id:string;
  type:"Injury"|"Illness"|"Surgery"|"Treatment";
  title:string;
  date:string;
  approximate:boolean;
  details:string;
  care:string;
  impact:string;
};

export type DocumentInsight={
  id:string;
  topic:string;
  excerpt:string;
  page:number;
  confidence:Confidence;
  verification:VerificationState;
};

export type DocumentRecord={
  id:string;
  name:string;
  type:string;
  dateRange:string;
  status:"ready"|"processing"|"failed";
  caseIds:string[];
  claimIds:string[];
  insights:DocumentInsight[];
};

export type ClaimLead={
  id:string;
  title:string;
  summary:string;
  confidence:Confidence;
  sourceIds:string[];
  missing:string[];
  status:"open"|"accepted"|"dismissed"|"merged";
};

export type ClaimWorkspace={
  id:string;
  title:string;
  path:ClaimPath;
  progress:number;
  sourceIds:string[];
  documentIds:string[];
  updated:string;
  milestone:"Needs foundation"|"Needs your review"|"Foundation captured"|"Statement reviewed";
  draft:WorkspaceDraft;
};

export type WorkspaceDraft={
  serviceEvent:string;
  currentSymptoms:string;
  diagnosis:string;
  relationship:string;
  dailyImpact:string;
  treatmentHistory:string;
  verifiedSourceIds:string[];
  statementReviewed:boolean;
};

export type PackageReadinessItem={
  id:string;
  claimId?:string;
  title:string;
  detail:string;
  required:boolean;
  resolved:boolean;
};

export type Case={
  id:string;
  title:string;
  kind:"original"|"supplemental"|"increase"|"contest";
  status:"intake"|"building"|"review"|"downloaded";
  parentCaseId?:string;
  servicePeriods:ServicePeriod[];
  healthEvents:HealthEvent[];
  documentIds:string[];
  claimIds:string[];
};

export type PackageNextAction={
  code:"foundation"|"document-review"|"claim-review"|"lead-review"|"add-claim"|"package-review";
  title:string;
  copy:string;
  label:string;
  screen:PrototypeScreen;
  claimId?:string;
};

export type PackageReadiness={
  foundationReady:boolean;
  packagePathReady:boolean;
  documentsReady:boolean;
  claimsReady:boolean;
  buddyDecisionReady:boolean;
  linkedDocuments:DocumentRecord[];
  blockedDocuments:DocumentRecord[];
  claimIssueCount:number;
  unresolved:number;
  allReady:boolean;
};

export function claimReviewIssueCount(claim:ClaimWorkspace,sources:SourceReference[]){
  const sourceIssues=claim.sourceIds.filter(id=>{
    const source=sources.find(item=>item.id===id);
    return !source||(source.verification!=="confirmed"&&!claim.draft.verifiedSourceIds.includes(id));
  }).length;
  return (claim.path==="unsure"?1:0)+(claim.draft.statementReviewed?0:1)+sourceIssues;
}

export function getPackageReadiness({services,events,documents=[],claims,sources,packageKind="original",buddyDecision="not-needed"}:{services:ServicePeriod[];events:HealthEvent[];documents?:DocumentRecord[];claims:ClaimWorkspace[];sources:SourceReference[];packageKind?:ClaimPath;buddyDecision?:BuddyDecision}):PackageReadiness{
  const linkedDocuments=documents.filter(document=>document.caseIds.includes("case-1"));
  const blockedDocuments=linkedDocuments.filter(document=>document.status!=="ready");
  const claimIssueCount=claims.reduce((total,claim)=>total+claimReviewIssueCount(claim,sources),0);
  const foundationReady=services.length>0&&events.length>0;
  const packagePathReady=packageKind!=="unsure";
  const documentsReady=blockedDocuments.length===0;
  const claimsReady=claims.length>0&&claimIssueCount===0;
  const buddyDecisionReady=buddyDecision!=="undecided";
  const unresolved=(foundationReady?0:1)+(packagePathReady?0:1)+(documentsReady?0:blockedDocuments.length)+(claimsReady?0:Math.max(1,claimIssueCount))+(buddyDecisionReady?0:1);
  return {foundationReady,packagePathReady,documentsReady,claimsReady,buddyDecisionReady,linkedDocuments,blockedDocuments,claimIssueCount,unresolved,allReady:unresolved===0};
}

export function getPackageNextAction({services,events,documents=[],leads,claims,sources}:{services:ServicePeriod[];events:HealthEvent[];documents?:DocumentRecord[];leads:ClaimLead[];claims:ClaimWorkspace[];sources:SourceReference[]}):PackageNextAction{
  if(!services.length||!events.length)return {code:"foundation",title:"Complete your service and health foundation",copy:"Add at least one service period and one health event. Debrief will reuse these details across your claims.",label:"Complete Service & Health",screen:"intake"};
  const blockedDocument=documents.find(document=>document.caseIds.includes("case-1")&&document.status!=="ready");
  if(blockedDocument)return {code:"document-review",title:blockedDocument.status==="failed"?"Resolve a document analysis problem":"Review a document still being analyzed",copy:blockedDocument.status==="failed"?"Retry the analysis, unlink the record, or continue without it before final package approval.":"Wait for analysis to finish or unlink the record if you want to continue without it.",label:"Review My Documents",screen:"documents"};
  const claim=claims.find(item=>claimReviewIssueCount(item,sources)>0);
  if(claim)return {code:"claim-review",title:`Resolve review items for ${claim.title}`,copy:"This claim still has a statement, claim path, or linked source that needs your review.",label:"Resolve Claim Review",screen:"workspace",claimId:claim.id};
  if(leads.some(item=>item.status==="open"))return {code:"lead-review",title:"Review an evidence-linked claim lead",copy:"Inspect why the topic appeared, then add, dismiss, or merge it.",label:"Review Claim Lead",screen:"leads"};
  if(!claims.length)return {code:"add-claim",title:"Add the first claim to your package",copy:"Choose a claim lead or add a condition or symptom yourself.",label:"Add Your First Claim",screen:"leads"};
  return {code:"package-review",title:"Review package readiness",copy:"Your claim-level reviews are complete. Check the package before final approval.",label:"Review Package Readiness",screen:"package"};
}

export const prototypeSources:SourceReference[]=[
  {id:"src-knee-intake",kind:"intake",label:"Health timeline",excerpt:"A knee-related event was added during intake. Open your health timeline to review the original wording.",confidence:"medium",verification:"unreviewed"}
];

export const prototypeLeads:ClaimLead[]=[
  {id:"lead-knee",title:"Right knee symptoms",summary:"A knee-related event appears in the health information you added.",confidence:"medium",sourceIds:["src-knee-intake"],missing:["Current symptoms","Supporting records"],status:"open"}
];
