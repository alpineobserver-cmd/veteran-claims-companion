export type PrototypeScreen="orientation"|"intake"|"documents"|"leads"|"dashboard"|"workspace"|"package";
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
  {id:"src-knee-intake",kind:"intake",label:"Health timeline",excerpt:"Right knee injury during unit training; pain returned during loaded marches.",confidence:"high",verification:"confirmed"},
  {id:"src-knee-record",kind:"document",label:"Service treatment record",excerpt:"Follow-up for right knee pain after field exercise.",documentId:"doc-str",location:"Page 18",confidence:"high",verification:"unreviewed"},
  {id:"src-knee-exam",kind:"document",label:"Separation health assessment",excerpt:"Reports intermittent knee pain with running and stairs.",documentId:"doc-separation",location:"Page 6",confidence:"medium",verification:"unreviewed"},
  {id:"src-tinnitus",kind:"intake",label:"Service history",excerpt:"Aircraft maintenance role with recurring flight-line noise.",confidence:"medium",verification:"confirmed"},
  {id:"src-back",kind:"document",label:"Civilian treatment summary",excerpt:"Single reference to lower-back stiffness; service timing is unclear.",documentId:"doc-civilian",location:"Page 2",confidence:"low",verification:"unreviewed"}
];

export const prototypeDocuments:DocumentRecord[]=[
  {id:"doc-str",name:"Service treatment records.pdf",type:"Military medical record",dateRange:"2011-2018",status:"ready",caseIds:["case-1"],claimIds:[],insights:[{id:"ins-knee",topic:"Right knee",excerpt:"Follow-up for right knee pain after field exercise.",page:18,confidence:"high",verification:"unreviewed"},{id:"ins-hearing",topic:"Hearing conservation",excerpt:"Annual hearing conservation exam.",page:31,confidence:"medium",verification:"unreviewed"}]},
  {id:"doc-separation",name:"Separation health assessment.pdf",type:"Military medical record",dateRange:"2018",status:"ready",caseIds:["case-1"],claimIds:[],insights:[{id:"ins-knee-2",topic:"Knee pain",excerpt:"Intermittent knee pain with running and stairs.",page:6,confidence:"medium",verification:"unreviewed"}]},
  {id:"doc-civilian",name:"Community clinic summary.pdf",type:"Civilian medical record",dateRange:"2023-2025",status:"failed",caseIds:["case-1"],claimIds:[],insights:[]}
];

export const prototypeLeads:ClaimLead[]=[
  {id:"lead-knee",title:"Right knee symptoms",summary:"Repeated knee references appear in your timeline and two records.",confidence:"high",sourceIds:["src-knee-intake","src-knee-record","src-knee-exam"],missing:["Current diagnosis or evaluation","Recent treatment information"],status:"open"},
  {id:"lead-tinnitus",title:"Tinnitus or hearing symptoms",summary:"Your aircraft-maintenance history indicates recurring noise exposure, but no symptom details were found.",confidence:"medium",sourceIds:["src-tinnitus"],missing:["Current symptoms","When symptoms began"],status:"open"},
  {id:"lead-back",title:"Lower-back symptoms",summary:"One record mentions stiffness, but the timing and connection to service are unclear.",confidence:"low",sourceIds:["src-back"],missing:["Service event or onset","Current symptoms","Supporting history"],status:"open"}
];

export const prototypeCase:Case={
  id:"case-1",title:"Initial disability claim",kind:"original",status:"building",
  servicePeriods:[{id:"service-1",kind:"Duty station",location:"Naval Air Station Lemoore, California",role:"Aircraft maintenance",start:"2011",end:"2015",approximate:false,exposures:"Recurring flight-line noise and lifting equipment."},{id:"service-2",kind:"Deployment",location:"Western Pacific deployment",role:"Squadron maintenance",start:"2014-03",end:"2014-10",approximate:true,exposures:"Long shifts, aircraft noise, and repetitive lifting."}],
  healthEvents:[{id:"event-1",type:"Injury",title:"Right knee injury during unit training",date:"2013",approximate:true,details:"Pain after a field exercise; evaluated at the base clinic."}],
  documentIds:prototypeDocuments.map(item=>item.id),claimIds:[]
};
