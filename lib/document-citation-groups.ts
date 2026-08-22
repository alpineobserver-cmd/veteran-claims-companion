export type LinkedDocumentCitation={
  factId:string;
  documentId:string;
  pageReference:string;
};

export type DocumentCitationGroups={
  documentLinks:Record<string,string[]>;
  documentCitations:Record<string,Record<string,string>>;
};

// Package requests may link up to 100 records. Group them in one pass rather
// than repeatedly rescanning attacker-controlled input for every fact.
export function groupDocumentCitations(items:readonly LinkedDocumentCitation[]):DocumentCitationGroups{
  const documentLinks:Record<string,string[]>={};
  const documentCitations:Record<string,Record<string,string>>={};
  for(const item of items){
    (documentLinks[item.factId]??=[]).push(item.documentId);
    (documentCitations[item.factId]??={})[item.documentId]=item.pageReference;
  }
  return{documentLinks,documentCitations};
}
