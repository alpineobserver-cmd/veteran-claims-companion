import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { configuredQuarantineBucket, parseScanCallback, scanErrorCode, verifyScanCallback } from "@/lib/malware-scanning";
import { documentStorage } from "@/lib/storage";
import { emitSecurityEvent, securityEventErrorCode } from "@/lib/security-events";
import { recordStorageReconciliation } from "@/lib/storage-reconciliation";

export const runtime="nodejs";

function denied(){return NextResponse.json({error:"Unauthorized scanner callback."},{status:401,headers:{"Cache-Control":"no-store"}})}

export async function POST(request:Request){
  const timestamp=request.headers.get("x-debrief-scan-timestamp")||"";
  const signature=request.headers.get("x-debrief-scan-signature")||"";
  const body=await request.text();
  try{if(!verifyScanCallback(timestamp,body,signature))return denied()}catch{return denied()}
  let callback;try{callback=parseScanCallback(JSON.parse(body))}catch{return NextResponse.json({error:"Invalid scanner callback."},{status:400,headers:{"Cache-Control":"no-store"}})}
  if(callback.sourceBucket!==configuredQuarantineBucket())return new NextResponse(null,{status:204});
  const document=await prisma.document.findFirst({where:{storageKey:callback.sourceKey,objectGeneration:callback.sourceGeneration},select:{id:true,userId:true,claimId:true,storageKey:true,sha256:true,size:true,provider:true,status:true}});
  if(!document)return new NextResponse(null,{status:204});
  if(!["PENDING_SCAN","SCANNING"].includes(document.status))return new NextResponse(null,{status:204});
  const completedAt=new Date();
  const incrementAttempt=document.status==="PENDING_SCAN"?{increment:1}:undefined;
  const metadata={engine:callback.engine,engineVersion:callback.engineVersion||undefined,definitionVersion:callback.definitionVersion||undefined,policy:"gcs-clamav-quarantine-v1"};
  try{
    if(callback.outcome==="STARTED"){
      const updated=await prisma.document.updateMany({where:{id:document.id,status:"PENDING_SCAN"},data:{status:"SCANNING",scanEngine:callback.engine,scanEngineVersion:callback.engineVersion||null,definitionVersion:callback.definitionVersion||null,scanStartedAt:completedAt,scanAttemptCount:{increment:1},scanErrorCode:null}});
      if(updated.count)await prisma.auditEvent.create({data:{actorUserId:document.userId,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_SCAN_STARTED",metadata}});
      return new NextResponse(null,{status:204});
    }
    if(callback.outcome==="CLEAN"){
      if(!callback.cleanKey)throw new Error("CLEAN_OBJECT_MISSING");
      const clean=await documentStorage(document.provider,"clean").get(callback.cleanKey);
      if(!clean)throw new Error("CLEAN_OBJECT_MISSING");
      if(clean.data.length!==document.size||createHash("sha256").update(clean.data).digest("hex")!==document.sha256)throw new Error("CLEAN_OBJECT_CHECKSUM_MISMATCH");
      await prisma.$transaction(async transaction=>{
        const updated=await transaction.document.updateMany({where:{id:document.id,status:{in:["PENDING_SCAN","SCANNING"]}},data:{status:"CLEAN",cleanStorageKey:callback.cleanKey,scanEngine:callback.engine,scanEngineVersion:callback.engineVersion||null,definitionVersion:callback.definitionVersion||null,scanAttemptCount:incrementAttempt,scanCompletedAt:completedAt,scanErrorCode:null}});
        if(!updated.count)return;
        await transaction.documentScan.upsert({where:{documentId_sourceGeneration:{documentId:document.id,sourceGeneration:callback.sourceGeneration}},create:{documentId:document.id,sourceGeneration:callback.sourceGeneration,outcome:"CLEAN",engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,completedAt},update:{outcome:"CLEAN",engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,errorCode:null,completedAt}});
        await transaction.auditEvent.create({data:{actorUserId:document.userId,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_SCAN_CLEAN",metadata}});
      });
      return new NextResponse(null,{status:204});
    }
    const outcome=callback.outcome==="REJECTED_MALWARE"?"REJECTED_MALWARE":"FAILED";
    const status=outcome==="REJECTED_MALWARE"?"REJECTED_MALWARE":"SCAN_FAILED";
    const action=outcome==="REJECTED_MALWARE"?"DOCUMENT_SCAN_REJECTED":"DOCUMENT_SCAN_FAILED";
    const errorCode=scanErrorCode(callback.errorCode||(outcome==="REJECTED_MALWARE"?"MALWARE_DETECTED":"UNKNOWN_SCANNER_RESPONSE"));
    await prisma.$transaction(async transaction=>{
      const updated=await transaction.document.updateMany({where:{id:document.id,status:{in:["PENDING_SCAN","SCANNING"]}},data:{status,scanEngine:callback.engine,scanEngineVersion:callback.engineVersion||null,definitionVersion:callback.definitionVersion||null,scanAttemptCount:incrementAttempt,scanCompletedAt:completedAt,scanErrorCode:errorCode}});
      if(!updated.count)return;
      await transaction.documentScan.upsert({where:{documentId_sourceGeneration:{documentId:document.id,sourceGeneration:callback.sourceGeneration}},create:{documentId:document.id,sourceGeneration:callback.sourceGeneration,outcome,engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,errorCode,completedAt},update:{outcome,engine:callback.engine,engineVersion:callback.engineVersion,definitionVersion:callback.definitionVersion,errorCode,completedAt}});
      await transaction.auditEvent.create({data:{actorUserId:document.userId,claimId:document.claimId,documentId:document.id,action,metadata:{...metadata,errorCode}}});
    });
    return new NextResponse(null,{status:204});
  }catch(reason){
    if(callback.outcome==="CLEAN"&&callback.cleanKey)await recordStorageReconciliation({userId:document.userId,operation:"DELETE_OBJECT",scope:"scan-promotion",entityId:document.id,storageKey:callback.cleanKey,storageProvider:document.provider,storageZone:"clean",reason});
    emitSecurityEvent("document_scan_promotion_failed",{operation:"DOCUMENT_SCAN",scope:"scanner-callback",code:scanErrorCode(reason instanceof Error?reason.message:securityEventErrorCode(reason))},"error");
    return new NextResponse(null,{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
