import { createHash } from "node:crypto";
import { conditions, getCondition } from "./conditions";
import { CATALOG_VERIFIED_THROUGH, codesForCondition } from "./diagnostic-codes";
import { schemesForCondition } from "./rating-schemes";
import { getVAForm, getVAFormDownload, vaForms, VA_FORM_DOWNLOADS_VERIFIED } from "./va-forms";

export type ContentProvenanceRecord={id:string;kind:"condition-guide"|"va-form-guide";title:string;contentVersion:string;lastVerified:string;authorityLabel:string;authorityUrl:string;localRecordSha256:string;hashScope:string};

function stable(value:unknown):string{
  if(Array.isArray(value))return`[${value.map(stable).join(",")}]`;
  if(value&&typeof value==="object")return`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function contentSha256(value:unknown){return createHash("sha256").update(stable(value)).digest("hex");}

export function conditionProvenance(slug:string):ContentProvenanceRecord|undefined{
  const condition=getCondition(slug);if(!condition)return;
  return{id:`condition:${slug}`,kind:"condition-guide",title:condition.name,contentVersion:"condition-library-2026.07.09",lastVerified:CATALOG_VERIFIED_THROUGH,authorityLabel:condition.sourceLabel,authorityUrl:condition.sourceUrl,localRecordSha256:contentSha256({condition,codes:codesForCondition(slug),ratingSchemes:schemesForCondition(slug)}),hashScope:"Plain-language guide, diagnostic-code map, rating schemes, and authority metadata in this release"};
}

export function formProvenance(slug:string):ContentProvenanceRecord|undefined{
  const form=getVAForm(slug);if(!form)return;const download=getVAFormDownload(slug);
  return{id:`form:${slug}`,kind:"va-form-guide",title:`VA Form ${form.number}`,contentVersion:"va-forms-library-2026.07.18",lastVerified:download?.verified||VA_FORM_DOWNLOADS_VERIFIED,authorityLabel:"Official VA form information",authorityUrl:form.officialUrl,localRecordSha256:contentSha256({form,download}),hashScope:"Debrief form summary, revision/status label, official information URL, and download destination in this release"};
}

export const contentProvenanceRecords:ContentProvenanceRecord[]=[...conditions.map(condition=>conditionProvenance(condition.slug)!),...vaForms.map(form=>formProvenance(form.slug)!)];
