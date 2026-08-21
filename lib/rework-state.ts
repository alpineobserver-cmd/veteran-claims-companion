import {z} from "zod";
import type {
  BuddyDecision,ClaimLead,ClaimPath,ClaimWorkspace,DocumentRecord,HealthEvent,
  PrototypeScreen,ServicePeriod,SourceReference
} from "@/lib/rework-prototype";

export type ApprovalSection="foundation"|"claims"|"records"|"package";
export type PackageRecord={
  id:string;kind:ClaimPath;claims:ClaimWorkspace[];leads:ClaimLead[];approved:boolean;
  buddyDecision:BuddyDecision;approvalSections:ApprovalSection[];approvalChanges:string[];
  selectedClaimId:string|null;updated:string;
};
export type SavedState={
  screen:PrototypeScreen;services:ServicePeriod[];events:HealthEvent[];documents:DocumentRecord[];
  sources?:SourceReference[];leads:ClaimLead[];claims:ClaimWorkspace[];approved:boolean;
  briefingSeen?:boolean;workspaceDraft?:ClaimWorkspace["draft"];packageKind?:ClaimPath;buddyDecision?:BuddyDecision;
  approvalSections?:ApprovalSection[];approvalChanges?:string[];packages?:PackageRecord[];
  activePackageId?:string;onboardingComplete?:boolean;selectedClaimId?:string|null;
};

const short=z.string().max(300);
const text=z.string().max(12_000);
const id=z.string().min(1).max(160);
const confidence=z.enum(["high","medium","low"]);
const verification=z.enum(["unreviewed","confirmed","corrected"]);
export const claimPathSchema=z.enum(["original","increase","supplemental","contested","unsure"]);
const buddyDecisionSchema=z.enum(["undecided","add","not-available","not-needed"]);
const approvalSectionSchema=z.enum(["foundation","claims","records","package"]);

const sourceSchema=z.object({id,kind:z.enum(["intake","document","witness","user"]),label:short,excerpt:text,documentId:id.optional(),location:short.optional(),confidence,verification});
const serviceSchema=z.object({id,service:short,kind:z.enum(["Duty station","Deployment","TDY"]),location:short,role:short,start:short,end:short,approximate:z.boolean(),exposures:text});
const healthSchema=z.object({id,type:z.enum(["Injury","Illness","Surgery","Treatment","Symptom change"]),title:short,date:short,approximate:z.boolean(),details:text,care:text,impact:text});
const insightSchema=z.object({id,topic:short,excerpt:text,page:z.number().int().min(1).max(100_000),confidence,verification});
const documentSchema=z.object({id,name:short,type:short,dateRange:short,status:z.enum(["ready","processing","failed"]),caseIds:z.array(id).max(50),claimIds:z.array(id).max(100),insights:z.array(insightSchema).max(500)});
const leadSchema=z.object({id,title:short,summary:text,confidence,sourceIds:z.array(id).max(500),missing:z.array(short).max(100),status:z.enum(["open","accepted","dismissed","merged"])});
const draftSchema=z.object({serviceEvent:text,currentSymptoms:text,diagnosis:text,relationship:text,dailyImpact:text,treatmentHistory:text,verifiedSourceIds:z.array(id).max(500),statementReviewed:z.boolean()});
const claimSchema=z.object({id,leadId:id.optional(),title:short,path:claimPathSchema,progress:z.number().int().min(0).max(100),sourceIds:z.array(id).max(500),documentIds:z.array(id).max(100),updated:short,milestone:z.enum(["Needs foundation","Needs your review","Foundation captured","Statement reviewed"]),draft:draftSchema});
const packageSchema=z.object({id,kind:claimPathSchema,claims:z.array(claimSchema).max(100),leads:z.array(leadSchema).max(250),approved:z.boolean(),buddyDecision:buddyDecisionSchema,approvalSections:z.array(approvalSectionSchema).max(4),approvalChanges:z.array(short).max(20),selectedClaimId:id.nullable(),updated:short});

export const reworkStateSchema=z.object({
  screen:z.enum(["intent","intake","documents","leads","dashboard","workspace","package"]),
  services:z.array(serviceSchema).max(100),events:z.array(healthSchema).max(500),documents:z.array(documentSchema).max(250),
  sources:z.array(sourceSchema).max(2_000).optional(),leads:z.array(leadSchema).max(250),claims:z.array(claimSchema).max(100),approved:z.boolean(),
  briefingSeen:z.boolean().optional(),workspaceDraft:draftSchema.optional(),packageKind:claimPathSchema.optional(),buddyDecision:buddyDecisionSchema.optional(),
  approvalSections:z.array(approvalSectionSchema).max(4).optional(),approvalChanges:z.array(short).max(20).optional(),packages:z.array(packageSchema).max(50).optional(),
  activePackageId:id.optional(),onboardingComplete:z.boolean().optional(),selectedClaimId:id.nullable().optional()
}).strict();

export const reworkStateRequestSchema=z.object({version:z.number().int().min(0),state:reworkStateSchema}).strict();
export const reworkApprovalRequestSchema=z.object({version:z.number().int().min(0),state:reworkStateSchema,packageId:id}).strict();

export function reworkStateWithinLimit(state:SavedState,maxBytes=500_000){return new TextEncoder().encode(JSON.stringify(state)).byteLength<=maxBytes}

export function packageRecordsFromState(state:SavedState){
  const current:PackageRecord={
    id:state.activePackageId||"package-1",kind:state.packageKind||"unsure",claims:state.claims,leads:state.leads,
    approved:state.approved,buddyDecision:state.buddyDecision||"undecided",approvalSections:state.approvalSections||[],
    approvalChanges:state.approvalChanges||[],selectedClaimId:state.selectedClaimId||null,updated:"Saved"
  };
  return [...(state.packages||[]).filter(item=>item.id!==current.id),current];
}

export type ApprovedPackageSnapshot={
  schemaVersion:1;packageId:string;packageKind:ClaimPath;approvedAt:string;
  services:ServicePeriod[];events:HealthEvent[];documents:DocumentRecord[];sources:SourceReference[];
  claims:ClaimWorkspace[];leads:ClaimLead[];buddyDecision:BuddyDecision;approvalSections:ApprovalSection[];
};

export function createApprovedPackageSnapshot(state:SavedState,packageId:string,approvedAt=new Date().toISOString()):ApprovedPackageSnapshot|null{
  const record=packageRecordsFromState(state).find(item=>item.id===packageId);
  if(!record)return null;
  const claimIds=new Set(record.claims.map(claim=>claim.id));
  return {
    schemaVersion:1,packageId,packageKind:record.kind,approvedAt,
    services:state.services,events:state.events,
    documents:state.documents.filter(document=>document.caseIds.includes(packageId)||document.claimIds.some(claimId=>claimIds.has(claimId))),
    sources:(state.sources||[]).filter(source=>record.claims.some(claim=>claim.sourceIds.includes(source.id))),
    claims:record.claims,leads:record.leads,buddyDecision:record.buddyDecision,approvalSections:record.approvalSections
  };
}
