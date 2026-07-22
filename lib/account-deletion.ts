import type { StorageProvider } from "@/lib/storage";

export type StoredObjectReference={storageKey:string;storageProvider?:string|null};

export class ActiveStorageDeletionError extends Error {
  readonly failedObjects:StoredObjectReference[];
  constructor(readonly failedKeys:string[],failedObjects?:StoredObjectReference[]){
    super("One or more stored objects remained after deletion.");
    this.name="ActiveStorageDeletionError";
    this.failedObjects=failedObjects||failedKeys.map(storageKey=>({storageKey}));
  }
}

export async function deleteStoredObjectsAndVerify(storage:StorageProvider,keys:readonly string[]){
  const unique=[...new Set(keys.filter(Boolean))];
  const failed=new Set<string>();
  for(const key of unique)try{await storage.delete(key)}catch{failed.add(key)}
  for(const key of unique){
    try{if(await storage.get(key))failed.add(key)}catch{failed.add(key)}
  }
  if(failed.size)throw new ActiveStorageDeletionError([...failed]);
  return unique.length;
}

export async function deleteStoredObjectReferencesAndVerify(resolve:(provider?:string|null)=>StorageProvider,references:readonly StoredObjectReference[]){
  const unique=[...new Map(references.filter(item=>item.storageKey).map(item=>[`${item.storageProvider||"configured"}\0${item.storageKey}`,item])).values()];
  const failed:StoredObjectReference[]=[];
  for(const item of unique){
    try{
      const storage=resolve(item.storageProvider);
      await storage.delete(item.storageKey);
      if(await storage.get(item.storageKey))failed.push(item);
    }catch{failed.push(item)}
  }
  if(failed.length)throw new ActiveStorageDeletionError(failed.map(item=>item.storageKey),failed);
  return unique.length;
}
