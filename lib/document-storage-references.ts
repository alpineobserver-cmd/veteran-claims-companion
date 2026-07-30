import type { DocumentStorageZone } from "@/lib/malware-scanning";

export type DocumentStorageKeys={storageKey:string;provider?:string|null;quarantineKey?:string|null;cleanStorageKey?:string|null};
export type DocumentStorageReference={storageKey:string;storageProvider?:string|null;storageZone:DocumentStorageZone};

export function documentStorageZone(value:string|null|undefined):DocumentStorageZone{
  return value==="quarantine"||value==="clean"||value==="rejected"?value:"primary";
}

export function documentStorageReferences(document:DocumentStorageKeys):DocumentStorageReference[]{
  const references:DocumentStorageReference[]=[];
  if(document.quarantineKey)references.push({storageKey:document.quarantineKey,storageProvider:document.provider,storageZone:"quarantine"});
  else if(document.storageKey)references.push({storageKey:document.storageKey,storageProvider:document.provider,storageZone:"primary"});
  if(document.cleanStorageKey)references.push({storageKey:document.cleanStorageKey,storageProvider:document.provider,storageZone:"clean"});
  return [...new Map(references.map(item=>[`${item.storageProvider||"configured"}\0${item.storageZone}\0${item.storageKey}`,item])).values()];
}
