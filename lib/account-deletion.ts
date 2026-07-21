import type { StorageProvider } from "@/lib/storage";

export class ActiveStorageDeletionError extends Error {constructor(readonly failedKeys:string[]){super("One or more stored objects remained after deletion.");this.name="ActiveStorageDeletionError"}}

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
