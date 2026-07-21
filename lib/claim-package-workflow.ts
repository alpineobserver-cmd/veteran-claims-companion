import { claimDraftSchema } from "./claim-drafts";
import { factRows, hasSupportingInformation, initialAnswers, normalizeEvidenceMap, qualityFindings, type Answers } from "./claim-builder-intelligence";

export const packageStatuses=["planned","requested","obtained","reviewed","exported","submitted"] as const;
export type PackageStatus=(typeof packageStatuses)[number];
export type PackageValidation={id:string;level:"blocker"|"attention"|"check";title:string;detail:string};

export const packageStatusLabels:Record<PackageStatus,string>={
  planned:"Planned",
  requested:"Evidence requested",
  obtained:"Evidence obtained",
  reviewed:"Reviewed",
  exported:"Exported",
  submitted:"Marked submitted"
};

export function parsedClaimDraft(value:unknown){
  const parsed=claimDraftSchema.safeParse(value);
  return parsed.success?parsed.data:null;
}

export function packageStatus(value:unknown):PackageStatus{
  return packageStatuses.includes(value as PackageStatus)?value as PackageStatus:"planned";
}

export function validatePackageClaim(value:unknown,title:string):PackageValidation[]{
  const draft=parsedClaimDraft(value);
  if(!draft)return[{id:"draft",level:"blocker",title:"Questionnaire data needs review",detail:"Open this condition and save it again before preparing the package."}];
  const answers={...initialAnswers,...draft.answers} as Answers;
  const condition=(answers.condition==="Other / condition not listed"?answers.otherCondition:answers.condition)||title;
  const statement=draft.statement?.trim()||"";
  const sections=statement.split(/\n\s*\n/).map(section=>section.trim()).filter(Boolean);
  const confirmations=draft.confirmations||{};
  const evidenceMap=normalizeEvidenceMap(draft.evidenceMap);
  const facts=factRows(answers,condition);
  const findings=qualityFindings(answers,condition,(draft.timeline||[]) as never[],evidenceMap);
  const validations:PackageValidation[]=[];
  const add=(id:PackageValidation["id"],level:PackageValidation["level"],heading:string,detail:string)=>validations.push({id,level,title:heading,detail});
  if(!statement)add("statement","blocker","Personal statement is missing","Complete the guided draft or write a statement for this condition.");
  else if(draft.statementMode==="stale")add("statement-stale","blocker","Statement no longer matches the answers","Regenerate or revise the statement after the latest questionnaire changes.");
  if(statement&&(!sections.length||sections.some((_,index)=>!confirmations[String(index)])))add("verification","blocker","Statement verification is incomplete","Confirm every statement section before treating this condition as reviewed.");
  if(facts.some(fact=>!hasSupportingInformation(evidenceMap[fact.id])))add("evidence","attention","Some facts have no identified support","Classify each key fact as a record, personal recollection, witness statement, pending record, or not identified.");
  if(facts.some(fact=>evidenceMap[fact.id]?.status==="record_not_obtained"))add("pending-records","attention","An identified record is still pending","The package can continue, but the record is not counted as available evidence.");
  if(answers.claimType==="Secondary claim"&&!answers.clinicianDiscussion.trim())add("secondary-source","check","Medical relationship source is not identified","A personal statement may describe observations, but a medical relationship should be attributed to a qualified source or record.");
  if(!answers.intentToFileStatus||answers.intentToFileStatus==="not_sure")add("intent","check","Intent-to-file status needs confirmation","Confirm the current status and any VA confirmation outside Debrief. VA determines effective dates.");
  if(findings.some(finding=>finding.level==="check"&&finding.id==="contradiction"))add("contradiction","blocker","Questionnaire answers may conflict","Review timing or frequency answers before exporting the package.");
  return validations;
}

export function packageReadiness(validations:PackageValidation[]){
  if(validations.some(item=>item.level==="blocker"))return"needs_work" as const;
  if(validations.some(item=>item.level==="attention"))return"review" as const;
  return"ready" as const;
}

export function evidenceChecklist(value:unknown,title:string){
  const draft=parsedClaimDraft(value);if(!draft)return[];
  const answers={...initialAnswers,...draft.answers} as Answers;
  const condition=(answers.condition==="Other / condition not listed"?answers.otherCondition:answers.condition)||title;
  const map=normalizeEvidenceMap(draft.evidenceMap);
  return factRows(answers,condition).map(fact=>({id:fact.id,fact:fact.fact,suggested:fact.suggested,status:map[fact.id]?.status||"none_identified",source:map[fact.id]?.source||"",documentIds:draft.documentLinks?.[fact.id]||[]}));
}

export function validatePackageEnvironment(documents:Array<{sha256:string;originalName:string}>,formsVerified:string,now=new Date()):PackageValidation[]{
  const checks:PackageValidation[]=[];
  const byHash=new Map<string,string[]>();
  for(const document of documents)byHash.set(document.sha256,[...(byHash.get(document.sha256)||[]),document.originalName]);
  const duplicates=[...byHash.values()].filter(names=>names.length>1);
  if(duplicates.length)checks.push({id:"duplicate-files",level:"attention",title:"Possible duplicate uploads",detail:`${duplicates.length} duplicate file ${duplicates.length===1?"group was":"groups were"} detected by file fingerprint. Review before exporting so the same record is not included unintentionally.`});
  const verifiedDate=new Date(formsVerified);const age=now.getTime()-verifiedDate.getTime();
  if(!Number.isFinite(verifiedDate.getTime())||age>90*24*60*60*1000)checks.push({id:"stale-forms",level:"blocker",title:"VA form links need reverification",detail:"The form-library verification date is more than 90 days old. Download fresh forms from VA.gov before filing."});
  return checks;
}
