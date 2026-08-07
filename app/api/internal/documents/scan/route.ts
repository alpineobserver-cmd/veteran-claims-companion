import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { configuredQuarantineBucket, parseScanCallback, scanErrorCode, verifyScanCallback } from "@/lib/malware-scanning";
import { documentStorage } from "@/lib/storage";
import { emitSecurityEvent, securityEventErrorCode } from "@/lib/security-events";
import { recordStorageReconciliation } from "@/lib/storage-reconciliation";

export const runtime="nodejs";
type Disposition="accepted"|"already_committed"|"discard";
const result=(disposition:Disposition)=>NextResponse.json({disposition},{status:200,headers:{"Cache-Control":"no-store"}});
function denied(){return NextResponse.json({error:"Unauthorized scanner callback."},{status:401,headers:{"Cache-Control":"no-store"}})}

export async function POST(request:Request){
  const timestamp=request.headers.get("x-debrief-scan-timestamp")||"";const signature=request.headers.get("x-debrief-scan-signature")||"";const body=await request.text();
  try{if(!verifyScanCallback(timestamp,body,signature))return denied()}catch{return denied()}
  let callback;try{callback=parseScanCallback(JSON.parse(body))}catch{return NextResponse.json({error:"Invalid scanner callback."},{status:400,headers:{"Cache-Control":"no-store"}})}
  if(callback.sourceBucket!==configuredQuarantineBucket())return result("discard");
  const document=await prisma.document.findFirst({where:{storageKey:callback.sourceKey,objectGeneration:callback.sourceGeneration},select:{id:true,userId:true,claimId:true,storageKey:true,sha256:true,size:true,provider:true,status:true,cleanStorageKey:true,rejectedStorageKey:true}});
  if(!document)return result("discard");
  const metadata={engine:callback.engine,engineVersion:callback.engineVersion||undefined,definitionVersion:callback.definitionVersion||undefined,policy:"gcs-clamav-quarantine-v1"};const completedAt=new Date();
  try{
    if(callback.outcome==="STARTED"){
      if(document.status==="SCANNING")return result("already_committed");
      const updated=await prisma.document.updateMany({where:{id:document.id,status:{in:["PENDING_SCAN","SCAN_RETRY_PENDING"]}},data:{status:"SCANNING",scanEngine:callback.engine,scanEngineVersion:callback.engineVersion||null,definitionVersion:callback.definitionVersion||null,scanStartedAt:completedAt,scanAttemptCount:{increment:1},scanErrorCode:null}});
      if(!updated.count)return result("discard");
      await prisma.auditEvent.create({data:{actorUserId:document.userId,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_SCAN_STARTED",metadata}});return result("accepted");
    }
    if(callback.outcome==="CLEAN"){
      if(document.status==="CLEAN"&&document.cleanStorageKey===callback.cleanKey)return result("already_committed");
      if(!callback.cleanKey)throw new Error("CLEAN_OBJECT_MISSING");
      const clean=await documentStorage(document.provider,"clean").get(callback.cleanKey);if(!clean)throw new Error("CLEAN_OBJECT_MISSING");
      if(clean.data.length!==document.size||createHash("sha256").update(clean.data).digest("hex")!==document.sha256)throw new Error("CLEAN_OBJECT_CHECKSUM_MISMATCH");
      const committed=await prisma.$transaction(async transaction=>{
        const updated=await transaction.document.updateMany({where:{id:document.id,status:{in:["PENDING_SCAN","SCANNING","SCAN_RETRY_PENDING"]}},data:{status:"CLEAN",cleanStorageKey:callback.cleanKey,scanEngine:callback.engine,scanEngineVersion:callback.engineVersion||null,definitionVersion:callback.definitionVersion||null,scanCompletedAt:completedAt,scanErrorCode:null}});if(!updated.count)return false;
        await transaction.documentScan.upsert({where:{documentId_sourceGeneration:{documentId:document.id,sourceGeneration:callback.sourceGeneration}},create:{documentId:document.id,sourceGeneration:callback.sourceGeneration,outcome:"CLEAN",engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,completedAt},update:{outcome:"CLEAN",engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,errorCode:null,completedAt}});
        await transaction.auditEvent.create({data:{actorUserId:document.userId,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_SCAN_CLEAN",metadata}});return true;
      });return result(committed?"accepted":"discard");
    }
    if(callback.outcome==="REJECTED_MALWARE"){
      if(document.status==="REJECTED_MALWARE"&&document.rejectedStorageKey===(callback.rejectedKey||null))return result("already_committed");
      const errorCode="MALWARE_DETECTED";const committed=await prisma.$transaction(async transaction=>{
        const updated=await transaction.document.updateMany({where:{id:document.id,status:{in:["PENDING_SCAN","SCANNING","SCAN_RETRY_PENDING"]}},data:{status:"REJECTED_MALWARE",rejectedStorageKey:callback.rejectedKey||null,scanEngine:callback.engine,scanEngineVersion:callback.engineVersion||null,definitionVersion:callback.definitionVersion||null,scanCompletedAt:completedAt,scanErrorCode:errorCode}});if(!updated.count)return false;
        await transaction.documentScan.upsert({where:{documentId_sourceGeneration:{documentId:document.id,sourceGeneration:callback.sourceGeneration}},create:{documentId:document.id,sourceGeneration:callback.sourceGeneration,outcome:"REJECTED_MALWARE",engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,errorCode,completedAt},update:{outcome:"REJECTED_MALWARE",engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,errorCode,completedAt}});
        await transaction.auditEvent.create({data:{actorUserId:document.userId,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_SCAN_REJECTED",metadata:{...metadata,errorCode}}});return true;
      });return result(committed?"accepted":"discard");
    }
    const errorCode=scanErrorCode(callback.errorCode||"UNKNOWN_SCANNER_RESPONSE");
    const updated=await prisma.document.updateMany({where:{id:document.id,status:{in:["PENDING_SCAN","SCANNING","SCAN_RETRY_PENDING"]}},data:{status:"SCAN_RETRY_PENDING",scanEngine:callback.engine,scanEngineVersion:callback.engineVersion||null,definitionVersion:callback.definitionVersion||null,scanCompletedAt:completedAt,scanErrorCode:errorCode}});
    if(!updated.count)return result("discard");await prisma.documentScan.upsert({where:{documentId_sourceGeneration:{documentId:document.id,sourceGeneration:callback.sourceGeneration}},create:{documentId:document.id,sourceGeneration:callback.sourceGeneration,outcome:"FAILED",engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,errorCode,completedAt},update:{outcome:"FAILED",engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,errorCode,completedAt}});await prisma.auditEvent.create({data:{actorUserId:document.userId,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_SCAN_FAILED",metadata:{...metadata,errorCode}}});return result("accepted");
  }catch(reason){if(callback.outcome==="CLEAN"&&callback.cleanKey)await recordStorageReconciliation({userId:document.userId,operation:"DELETE_OBJECT",scope:"scan-promotion",entityId:document.id,storageKey:callback.cleanKey,storageProvider:document.provider,storageZone:"clean",reason});emitSecurityEvent("document_scan_promotion_failed",{operation:"DOCUMENT_SCAN",scope:"scanner-callback",code:scanErrorCode(reason instanceof Error?reason.message:securityEventErrorCode(reason))},"error");return new NextResponse(null,{status:503,headers:{"Cache-Control":"no-store"}})}
}
