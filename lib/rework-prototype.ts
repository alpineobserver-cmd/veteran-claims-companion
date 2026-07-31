export type PrototypeScreen="intake"|"documents"|"leads"|"dashboard"|"workspace"|"package";
export type Confidence="high"|"medium"|"low";
export type VerificationState="unreviewed"|"confirmed"|"corrected";

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
  path:string;
  progress:number;
  sourceIds:string[];
  documentIds:string[];
  updated:string;
  milestone:"Needs foundation"|"Foundation captured"|"Statement reviewed";
};

export type WorkspaceDraft={
  serviceEvent:string;
  currentSymptoms:string;
  diagnosis:string;
  relationship:string;
  dailyImpact:string;
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

export const prototypeSources:SourceReference[]=[
  {id:"src-knee-intake",kind:"intake",label:"Health timeline",excerpt:"A knee-related event was added during intake. Open your health timeline to review the original wording.",confidence:"medium",verification:"unreviewed"}
];

export const prototypeLeads:ClaimLead[]=[
  {id:"lead-knee",title:"Right knee symptoms",summary:"A knee-related event appears in the health information you added.",confidence:"medium",sourceIds:["src-knee-intake"],missing:["Current symptoms","Supporting records"],status:"open"}
];
