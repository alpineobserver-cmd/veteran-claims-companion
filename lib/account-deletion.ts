import type { StorageProvider } from "@/lib/storage";

export class ActiveStorageDeletionError extends Error {}

export async function deleteStoredObjectsAndVerify(storage:StorageProvider,keys:readonly string[]){
  const unique=[...new Set(keys.filter(Boolean))];
  for(const key of unique)await storage.delete(key);
  for(const key of unique){
    const remaining=await storage.get(key);
    if(remaining)throw new ActiveStorageDeletionError("A stored object remained after deletion.");
  }
  return unique.length;
}
