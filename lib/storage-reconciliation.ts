import { prisma } from "@/lib/prisma";
import { rateLimitPrincipalHash } from "@/lib/rate-limit";
import type { StorageProvider } from "@/lib/storage";

export type ReconciliationOperation="DELETE_OBJECT"|"DELETE_DATABASE_RECORD";
export type ReconciliationInput={userId:string;operation:ReconciliationOperation;scope:string;entityId?:string;storageKey?:string;reason:unknown};

function principalHash(userId:string){return rateLimitPrincipalHash(`user:${userId}`)}
export function reconciliationErrorCode(reason:unknown){
  const raw=reason instanceof Error?reason.name:"UnknownError";
  return /^[A-Za-z0-9_.-]{1,80}$/.test(raw)?raw:"UnknownError";
}
export function reconciliationFingerprint(input:Omit<ReconciliationInput,"reason">,secret?:string){
  return rateLimitPrincipalHash(`storage-reconciliation:${input.operation}:${input.scope}:${input.entityId||"none"}:${input.storageKey||"none"}`,secret);
}
function securityEvent(event:string,details:Record<string,string>){console.error(`[security-event] ${JSON.stringify({timestamp:new Date().toISOString(),event,...details})}`)}

export async function recordStorageReconciliation(input:ReconciliationInput){
  const lastErrorCode=reconciliationErrorCode(input.reason);const fingerprint=reconciliationFingerprint(input);
  try{
    await prisma.storageReconciliationTask.upsert({
      where:{fingerprint},
      create:{fingerprint,principalHash:principalHash(input.userId),operation:input.operation,scope:input.scope,entityId:input.entityId,storageKey:input.storageKey,lastErrorCode},
      update:{status:"PENDING",attempts:{increment:1},lastErrorCode,lastAttemptAt:new Date(),resolvedAt:null}
    });
    securityEvent("storage_reconciliation_pending",{operation:input.operation,scope:input.scope,reasonCode:lastErrorCode});
    return true;
  }catch(reason){
    securityEvent("storage_reconciliation_record_failed",{operation:input.operation,scope:input.scope,reasonCode:reconciliationErrorCode(reason)});
    return false;
  }
}

export async function resolveStorageReconciliation(userId:string,scope:string,entityId:string){
  try{
    await prisma.storageReconciliationTask.updateMany({where:{principalHash:principalHash(userId),scope,entityId,status:"PENDING"},data:{status:"RESOLVED",resolvedAt:new Date(),lastAttemptAt:new Date()}});
  }catch(reason){securityEvent("storage_reconciliation_resolution_failed",{operation:"RESOLVE",scope,reasonCode:reconciliationErrorCode(reason)})}
}

export async function deleteObjectAndVerify(storage:StorageProvider,storageKey:string){
  await storage.delete(storageKey);
  if(await storage.get(storageKey))throw new Error("ObjectDeletionNotVerified");
}

export async function retryUploadRollbackTasks(userId:string,storage:StorageProvider){
  let tasks;
  try{
    tasks=await prisma.storageReconciliationTask.findMany({where:{principalHash:principalHash(userId),operation:"DELETE_OBJECT",scope:"upload-rollback",status:"PENDING",storageKey:{not:null}},orderBy:{createdAt:"asc"},take:10,select:{id:true,storageKey:true}});
  }catch(reason){
    securityEvent("storage_reconciliation_retry_query_failed",{operation:"DELETE_OBJECT",scope:"upload-rollback",reasonCode:reconciliationErrorCode(reason)});
    return 0;
  }
  for(const task of tasks){
    try{
      await deleteObjectAndVerify(storage,task.storageKey!);
      await prisma.storageReconciliationTask.update({where:{id:task.id},data:{status:"RESOLVED",resolvedAt:new Date(),lastAttemptAt:new Date()}});
    }catch(reason){
      const lastErrorCode=reconciliationErrorCode(reason);
      await prisma.storageReconciliationTask.update({where:{id:task.id},data:{attempts:{increment:1},lastErrorCode,lastAttemptAt:new Date()}}).catch(()=>{});
      securityEvent("storage_reconciliation_retry_failed",{operation:"DELETE_OBJECT",scope:"upload-rollback",reasonCode:lastErrorCode});
    }
  }
  return tasks.length;
}
