import type { StatementField } from "@/lib/claim-builder-intelligence";

export type StatementSafetyIssue={
  id:"unsupported-medical-conclusion"|"unsupported-source-wording";
  field:StatementField;
  title:string;
  detail:string;
  question:string;
};

// This is deliberately a narrow, defense-in-depth check. It does not determine
// whether a medical conclusion is true; it prevents Debrief from presenting an
// un-attributed conclusion as the veteran's established fact.
export const unsupportedMedicalConclusion=/\b(?:caused by|definitely due to|proves? that|result(?:ed|ing)? from|secondary to|associated with|medically related to)\b/i;
const attributedMedicalConclusion=/\b(?:doctor|clinician|provider|physician|specialist|neurologist|pulmonologist|therapist|examiner|medical (?:record|opinion))\b.{0,160}\b(?:said|says|stated|states|documented|documents|wrote|concluded|concludes|opined|opines|found|finds|explained|explains)\b/i;

export function hasUnsupportedMedicalConclusion(value:string){
  return unsupportedMedicalConclusion.test(value)&&!attributedMedicalConclusion.test(value);
}

const sourceSensitivePhrases=["significantly","much more","entire","suddenly","always","never","whenever","near fall","despite treatment","service-connected","formally"] as const;

function sourceText(source:unknown){
  if(!source)return"";
  if(typeof source==="string")return source.toLowerCase();
  try{return JSON.stringify(source).toLowerCase()}catch{return""}
}

export function unsupportedSourcePhrases(statement:string,source?:unknown){
  const normalizedStatement=statement.toLowerCase();
  const normalizedSource=sourceText(source);
  if(!normalizedSource)return[];
  return sourceSensitivePhrases.filter(phrase=>normalizedStatement.includes(phrase)&&!normalizedSource.includes(phrase));
}

export function statementSafetyIssues(statement:string,source?:unknown):StatementSafetyIssue[]{
  const issues:StatementSafetyIssue[]=[];
  if(hasUnsupportedMedicalConclusion(statement))issues.push({
      id:"unsupported-medical-conclusion",
      field:"secondaryRelationship",
      title:"Review an unsupported medical conclusion",
      detail:"The draft states a medical cause or relationship as fact without identifying a clinician or medical record that reached that conclusion.",
      question:"What did you personally observe about the timing or relationship between the conditions, or what clinician or record documented a medical opinion?",
    });
  const phrases=unsupportedSourcePhrases(statement,source);
  if(phrases.length)issues.push({
    id:"unsupported-source-wording",
    field:"additionalContext",
    title:"Review wording that is stronger than the source",
    detail:`The draft introduced wording that was not present in the supplied facts: ${phrases.join(", ")}.`,
    question:"Which wording accurately reflects what you experienced, without increasing the severity, frequency, certainty, or outcome?",
  });
  return issues;
}
