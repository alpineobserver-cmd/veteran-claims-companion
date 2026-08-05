import type { StatementField } from "@/lib/claim-builder-intelligence";

export type StatementSafetyIssue={
  id:"unsupported-medical-conclusion";
  field:StatementField;
  title:string;
  detail:string;
  question:string;
};

// This is deliberately a narrow, defense-in-depth check. It does not determine
// whether a medical conclusion is true; it prevents Debrief from presenting an
// un-attributed conclusion as the veteran's established fact.
export const unsupportedMedicalConclusion=/\b(?:caused by|definitely due to|proves? that|result(?:ed|ing)? from|secondary to)\b/i;
const attributedMedicalConclusion=/\b(?:doctor|clinician|provider|physician|specialist|neurologist|pulmonologist|therapist|examiner|medical (?:record|opinion))\b.{0,160}\b(?:said|says|stated|states|documented|documents|wrote|concluded|concludes|opined|opines|found|finds|explained|explains)\b/i;

export function hasUnsupportedMedicalConclusion(value:string){
  return unsupportedMedicalConclusion.test(value)&&!attributedMedicalConclusion.test(value);
}

export function statementSafetyIssues(statement:string):StatementSafetyIssue[]{
  if(!hasUnsupportedMedicalConclusion(statement))return [];
  return [{
    id:"unsupported-medical-conclusion",
    field:"secondaryRelationship",
    title:"Review an unsupported medical conclusion",
    detail:"The draft states a medical cause or relationship as fact without identifying a clinician or medical record that reached that conclusion.",
    question:"What did you personally observe about the timing or relationship between the conditions, or what clinician or record documented a medical opinion?",
  }];
}
