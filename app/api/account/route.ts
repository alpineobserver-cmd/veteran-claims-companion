import { auth } from "@/auth";
import { randomUUID } from "node:crypto";
import { ActiveStorageDeletionError, deleteStoredObjectReferencesAndVerify } from "@/lib/account-deletion";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginMutation } from "@/lib/request-security";
import { documentStorage } from "@/lib/storage";
import { NextResponse } from "next/server";
import { enforceAccountRateLimit, rateLimitPolicies, rateLimitPrincipalHash } from "@/lib/rate-limit";
import { recordStorageReconciliation } from "@/lib/storage-reconciliation";
import { emitSecurityEvent, securityEventErrorCode } from "@/lib/security-events";

export async function DELETE(request:Request){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to delete this account."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.accountDelete]);if(limited)return limited;
  const principalHash=rateLimitPrincipalHash(`user:${session.user.id}`);
  const [documents,legacyUploads,orphanedUploads]=await Promise.all([prisma.document.findMany({where:{userId:session.user.id},select:{storageKey:true,provider:true}}),prisma.upload.findMany({where:{userId:session.user.id},select:{storageKey:true,provider:true}}),prisma.storageReconciliationTask.findMany({where:{principalHash,operation:"DELETE_OBJECT",status:"PENDING",storageKey:{not:null}},select:{storageKey:true,storageProvider:true}})]);
  const storageObjects=[
    ...documents.map(item=>({storageKey:item.storageKey,storageProvider:item.provider})),
    ...legacyUploads.map(item=>({storageKey:item.storageKey,storageProvider:item.provider})),
    ...orphanedUploads.map(item=>({storageKey:item.storageKey,storageProvider:item.storageProvider})),
  ].filter((item):item is {storageKey:string;storageProvider:string|null}=>Boolean(item.storageKey));
  let deletedObjects=0;
  if(storageObjects.length){
    try{deletedObjects=await deleteStoredObjectReferencesAndVerify(provider=>documentStorage(provider),storageObjects)}
    catch(reason){
      const failures=reason instanceof ActiveStorageDeletionError?reason.failedObjects:storageObjects;
      await Promise.all(failures.map(failure=>recordStorageReconciliation({userId:session.user.id,operation:"DELETE_OBJECT",scope:"account-delete",entityId:"account",storageKey:failure.storageKey,storageProvider:failure.storageProvider||undefined,reason})));
      await recordStorageReconciliation({userId:session.user.id,operation:"DELETE_DATABASE_RECORD",scope:"account-delete",entityId:"account",reason:new Error("ObjectDeletionPending")});
      emitSecurityEvent("account_object_deletion_failed",{operation:"DELETE_OBJECT",scope:"account-delete",code:securityEventErrorCode(reason)},"error");return NextResponse.json({error:"Stored files could not be deleted, so the account was kept. Try again or contact the alpha administrator."},{status:503})
    }
  }
  try{
    const deleted=await prisma.$transaction(async transaction=>{
      await transaction.rateLimitBucket.deleteMany({where:{principalHash}});
      await transaction.storageReconciliationTask.deleteMany({where:{principalHash}});
      return transaction.user.deleteMany({where:{id:session.user.id}});
    });if(deleted.count!==1)throw new Error("AccountDeleteCountMismatch");
    const remaining=await prisma.user.findUnique({where:{id:session.user.id},select:{id:true}});if(remaining)throw new Error("AccountDeletionNotVerified");
  }catch(reason){await recordStorageReconciliation({userId:session.user.id,operation:"DELETE_DATABASE_RECORD",scope:"account-delete",entityId:"account",reason});emitSecurityEvent("account_database_deletion_failed",{operation:"DELETE_DATABASE_RECORD",scope:"account-delete",code:securityEventErrorCode(reason)},"error");return NextResponse.json({error:"The account could not be deleted after its stored files were removed. Contact the alpha administrator."},{status:500})}
  return NextResponse.json({status:"deleted",receipt:{receiptId:randomUUID(),deletedAt:new Date().toISOString(),activeDatabaseDeletion:"verified",activeObjectDeletion:"verified",deletedObjects,backupNotice:"Provider backups and security logs may remain until their configured retention periods expire."}},{headers:{"Cache-Control":"private, no-store","Clear-Site-Data":"\"cache\", \"cookies\", \"storage\"","X-Content-Type-Options":"nosniff"}});
}
