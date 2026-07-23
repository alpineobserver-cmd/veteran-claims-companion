import { auth } from "@/auth";
import { inspectDocument, syntheticStorageKey } from "@/lib/document-security";
import { prisma } from "@/lib/prisma";
import { uploadsEnabled } from "@/lib/operational-controls";
import { documentStorage, StorageConfigurationError } from "@/lib/storage";
import { NextResponse } from "next/server";
import { hasAcceptableContentLength, MAX_DOCUMENT_REQUEST_BYTES, MAX_DOCUMENTS_PER_USER, MAX_DOCUMENTS_PER_WORKSPACE, rejectCrossOriginMutation } from "@/lib/request-security";
import { enforceAccountRateLimit, rateLimitPolicies } from "@/lib/rate-limit";
import { deleteObjectAndVerify, recordStorageReconciliation, retryUploadRollbackTasks } from "@/lib/storage-reconciliation";
import { emitSecurityEvent, securityEventErrorCode } from "@/lib/security-events";

export const runtime="nodejs";

const documentSelect={id:true,claimId:true,originalName:true,mimeType:true,size:true,status:true,provider:true,createdAt:true} as const;

export async function GET(request:Request){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to view documents."},{status:401});
  const claimId=new URL(request.url).searchParams.get("claimId");
  const documents=await prisma.document.findMany({where:{userId:session.user.id,...(claimId?{claimId}:{})},orderBy:{createdAt:"desc"},select:documentSelect});
  return NextResponse.json({documents});
}

export async function POST(request:Request){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_DOCUMENT_REQUEST_BYTES))return NextResponse.json({error:"The upload request is larger than the 4 MB alpha limit."},{status:413});
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to upload a test document."},{status:401});
  if(!uploadsEnabled())return NextResponse.json({error:"Document uploads are temporarily paused by the Alpha administrator. Existing files remain available."},{status:503,headers:{"Cache-Control":"private, no-store"}});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.documentUploadHour,rateLimitPolicies.documentUploadDay],"Too many upload attempts. Please wait before trying again.");if(limited)return limited;
  const form=await request.formData().catch(()=>null);if(!form)return NextResponse.json({error:"The upload could not be read."},{status:400});
  const file=form.get("file");const claimId=form.get("claimId");const syntheticConfirmed=form.get("syntheticConfirmed");
  if(!(file instanceof File)||typeof claimId!=="string")return NextResponse.json({error:"Choose a workspace and file."},{status:400});
  if(file.size>MAX_DOCUMENT_REQUEST_BYTES)return NextResponse.json({error:"Test files must be 4 MB or smaller."},{status:413});
  if(syntheticConfirmed!=="true")return NextResponse.json({error:"Confirm that this is an entirely fictional test document."},{status:400});
  const workspace=await prisma.claim.findFirst({where:{id:claimId,userId:session.user.id},select:{id:true}});if(!workspace)return NextResponse.json({error:"Workspace not found."},{status:404});
  const [workspaceDocuments,userDocuments]=await Promise.all([prisma.document.count({where:{claimId,userId:session.user.id}}),prisma.document.count({where:{userId:session.user.id}})]);
  if(workspaceDocuments>=MAX_DOCUMENTS_PER_WORKSPACE)return NextResponse.json({error:`Alpha workspaces are limited to ${MAX_DOCUMENTS_PER_WORKSPACE} test documents.`},{status:409});
  if(userDocuments>=MAX_DOCUMENTS_PER_USER)return NextResponse.json({error:`Alpha accounts are limited to ${MAX_DOCUMENTS_PER_USER} test documents.`},{status:409});

  let inspected:ReturnType<typeof inspectDocument>;let buffer:Buffer;
  try{buffer=Buffer.from(await file.arrayBuffer());inspected=inspectDocument(buffer,{fileName:file.name,declaredMimeType:file.type})}catch(reason){return NextResponse.json({error:reason instanceof Error?reason.message:"The file is not accepted."},{status:400})}
  const storageKey=syntheticStorageKey(session.user.id,claimId,inspected.extension);let storage;
  try{storage=documentStorage()}catch(reason){return NextResponse.json({error:reason instanceof StorageConfigurationError?reason.message:"Private storage is unavailable."},{status:503})}
  await retryUploadRollbackTasks(session.user.id,storage).catch(()=>{});
  let storedKey="";
  try{
    storedKey=(await storage.put(buffer,storageKey,inspected.mimeType)).key;
    const document=await prisma.$transaction(async transaction=>{
      const created=await transaction.document.create({data:{userId:session.user.id,claimId,originalName:inspected.displayName,storageKey:storedKey,mimeType:inspected.mimeType,size:buffer.length,sha256:inspected.sha256,provider:storage.name,status:"TEST_ONLY",syntheticConfirmed:true},select:documentSelect});
      await transaction.auditEvent.create({data:{actorUserId:session.user.id,claimId,documentId:created.id,action:"DOCUMENT_UPLOADED",metadata:{mimeType:created.mimeType,size:created.size,provider:created.provider,testOnly:true}}});
      return created;
    });
    return NextResponse.json({document},{status:201});
  }catch(reason){
    if(storedKey)try{await deleteObjectAndVerify(storage,storedKey)}catch(cleanupReason){await recordStorageReconciliation({userId:session.user.id,operation:"DELETE_OBJECT",scope:"upload-rollback",entityId:claimId,storageKey:storedKey,storageProvider:storage.name,reason:cleanupReason})}
    emitSecurityEvent("document_upload_failed",{operation:"PUT_OBJECT",scope:"document-upload",code:securityEventErrorCode(reason)},"error");return NextResponse.json({error:"The test document could not be stored."},{status:500})
  }
}
