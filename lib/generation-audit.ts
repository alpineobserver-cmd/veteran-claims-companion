import { z } from "zod";

export const generationResultStatuses=["ready","needs_information","failed"] as const;
export const generationDispositions=["pending_review","accepted","rejected","regenerated","edited","saved","downloaded","exported","needs_information","failed"] as const;

export const generationAuditEntrySchema=z.object({
  id:z.string().max(100),
  feature:z.literal("personal_statement"),
  mode:z.enum(["ai","template","preflight"]),
  model:z.string().max(120),
  policyVersion:z.string().max(120),
  sourceReferences:z.array(z.string().max(120)).max(100),
  createdAt:z.string().datetime(),
  completedAt:z.string().datetime(),
  resultStatus:z.enum(generationResultStatuses),
  userDisposition:z.enum(generationDispositions),
  dispositionUpdatedAt:z.string().datetime()
}).strict();

export type GenerationAuditEntry=z.infer<typeof generationAuditEntrySchema>;
export type GenerationAuditMetadata=Omit<GenerationAuditEntry,"userDisposition"|"dispositionUpdatedAt">;
export type GenerationDisposition=GenerationAuditEntry["userDisposition"];

const excludedSourceKeys=new Set(["statementName"]);

export function generationSourceReferences(input:Record<string,unknown>){
  const references=Object.entries(input).flatMap(([key,value])=>{
    if(excludedSourceKeys.has(key)||value===undefined||value===null||value==="")return[];
    if(key==="timeline"&&Array.isArray(value))return value.flatMap((event,index)=>{
      if(!event||typeof event!=="object")return[];
      const hasSource=Object.entries(event).some(([field,entry])=>field!=="id"&&field!=="approximate"&&typeof entry==="string"&&entry.trim());
      return hasSource?[`timeline:${index+1}`]:[];
    });
    if(Array.isArray(value))return value.length?[`answer:${key}`]:[];
    if(typeof value==="string")return value.trim()?[`answer:${key}`]:[];
    return[];
  });
  return [...new Set(references)].sort().slice(0,100);
}

export function generationAuditEntry(metadata:GenerationAuditMetadata):GenerationAuditEntry{
  const disposition=metadata.resultStatus==="ready"?"pending_review":metadata.resultStatus;
  return {...metadata,userDisposition:disposition,dispositionUpdatedAt:metadata.completedAt};
}

export function updateLatestGenerationDisposition(entries:GenerationAuditEntry[],disposition:GenerationDisposition,at=new Date().toISOString()){
  const index=[...entries].map((entry,item)=>({entry,item})).reverse().find(({entry})=>entry.resultStatus==="ready"&&entry.userDisposition!=="rejected"&&entry.userDisposition!=="regenerated")?.item;
  if(index===undefined)return entries;
  return entries.map((entry,item)=>item===index?{...entry,userDisposition:disposition,dispositionUpdatedAt:at}:entry);
}

export function clientGenerationFailure(input:Record<string,unknown>,at=new Date().toISOString()):GenerationAuditEntry{
  return generationAuditEntry({
    id:crypto.randomUUID(),
    feature:"personal_statement",
    mode:"preflight",
    model:"request-not-completed",
    policyVersion:"unknown",
    sourceReferences:generationSourceReferences(input),
    createdAt:at,
    completedAt:at,
    resultStatus:"failed"
  });
}
