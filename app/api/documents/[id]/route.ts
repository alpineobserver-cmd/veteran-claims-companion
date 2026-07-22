import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { documentStorage } from "@/lib/storage";
import { NextResponse } from "next/server";
import { rejectCrossOriginMutation } from "@/lib/request-security";
import { enforceAccountRateLimit, rateLimitPolicies } from "@/lib/rate-limit";
import { deleteObjectAndVerify, recordStorageReconciliation, resolveStorageReconciliation } from "@/lib/storage-reconciliation";
import { emitSecurityEvent, securityEventErrorCode } from "@/lib/security-events";

type Context={params:Promise<{id:string}>};

export async function DELETE(request:Request,context:Context){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to delete this document."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.documentAccess]);if(limited)return limited;
  const {id}=await context.params;const document=await prisma.document.findFirst({where:{id,userId:session.user.id},select:{id:true,claimId:true,storageKey:true,mimeType:true,size:true,provider:true}});
  if(!document)return NextResponse.json({error:"Document not found."},{status:404});
  try{await deleteObjectAndVerify(documentStorage(document.provider),document.storageKey)}catch(reason){await recordStorageReconciliation({userId:session.user.id,operation:"DELETE_OBJECT",scope:"document-delete",entityId:document.id,storageKey:document.storageKey,storageProvider:document.provider,reason});emitSecurityEvent("document_object_deletion_failed",{operation:"DELETE_OBJECT",scope:"document-delete",code:securityEventErrorCode(reason)},"error");return NextResponse.json({error:"The stored file could not be deleted."},{status:503})}
  try{await prisma.$transaction(async transaction=>{
    await transaction.auditEvent.create({data:{actorUserId:session.user.id,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_DELETED",metadata:{mimeType:document.mimeType,size:document.size,provider:document.provider,testOnly:true}}});
    await transaction.document.delete({where:{id:document.id}});
  })}catch(reason){await recordStorageReconciliation({userId:session.user.id,operation:"DELETE_DATABASE_RECORD",scope:"document-delete",entityId:document.id,reason});emitSecurityEvent("document_database_deletion_failed",{operation:"DELETE_DATABASE_RECORD",scope:"document-delete",code:securityEventErrorCode(reason)},"error");return NextResponse.json({error:"The file was removed, but its workspace record still needs cleanup. Try deleting it again."},{status:503})}
  await resolveStorageReconciliation(session.user.id,"document-delete",document.id);
  return new NextResponse(null,{status:204});
}
