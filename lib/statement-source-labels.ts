import type { EvidenceMap } from "./claim-builder-intelligence";
import type { StatementProvenance, StatementSourceOrigin } from "./statement-provenance";

export type DocumentCitations=Record<string,Record<string,string>>;
export type StatementFactSourceKind="record"|"user"|"witness";
export type LinkedRecordCitation={factId:string;documentId:string;documentName:string;pageReference:string};

const citationLimit=120;

export function normalizeDocumentCitations(value:unknown):DocumentCitations{
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  const result:DocumentCitations={};
  for(const [factId,citations] of Object.entries(value)){
    if(!citations||typeof citations!=="object"||Array.isArray(citations))continue;
    const normalized=Object.fromEntries(Object.entries(citations).flatMap(([documentId,pageReference])=>
      typeof pageReference==="string"&&pageReference.trim()
        ?[[documentId,pageReference.trim().slice(0,citationLimit)]]
        :[]
    ));
    if(Object.keys(normalized).length)result[factId]=normalized;
  }
  return result;
}

export function statementFactSourceKind(origin:StatementSourceOrigin,evidenceMap:EvidenceMap):StatementFactSourceKind{
  const evidence=origin.factId?evidenceMap[origin.factId]:undefined;
  if(evidence?.status==="record_available")return"record";
  if(evidence?.status==="witness_statement")return"witness";
  return"user";
}

export const statementFactSourceLabel:Record<StatementFactSourceKind,string>={
  record:"Record-derived fact",
  user:"Veteran-provided fact",
  witness:"Witness observation"
};

export function recordCitationGaps(
  provenance:StatementProvenance|undefined,
  evidenceMap:EvidenceMap,
  documentLinks:Record<string,string[]>,
  documentCitations:DocumentCitations
){
  const reliedOnRecordFacts=new Set(
    (provenance?.sentences||[]).flatMap(sentence=>sentence.origins)
      .flatMap(origin=>origin.factId&&evidenceMap[origin.factId]?.status==="record_available"?[origin.factId]:[])
  );
  return [...reliedOnRecordFacts].flatMap(factId=>
    (documentLinks[factId]||[]).flatMap(documentId=>
      documentCitations[factId]?.[documentId]?.trim()?[]:[{factId,documentId}]
    )
  );
}

export function linkedRecordCitations(
  documentLinks:Record<string,string[]>,
  documentCitations:DocumentCitations,
  documentNames:Record<string,string>
):LinkedRecordCitation[]{
  return Object.entries(documentLinks).flatMap(([factId,documentIds])=>documentIds.map(documentId=>({
    factId,
    documentId,
    documentName:documentNames[documentId]||"Uploaded document",
    pageReference:documentCitations[factId]?.[documentId]?.trim()||""
  })));
}
