import { auth } from "@/auth";
import { inspectDocument, safeDisplayName, syntheticStorageKey } from "@/lib/document-security";
import { prisma } from "@/lib/prisma";
import { documentStorage, StorageConfigurationError } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime="nodejs";

const documentSelect={id:true,claimId:true,originalName:true,mimeType:true,size:true,status:true,provider:true,createdAt:true} as const;

export async function GET(request:Request){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to view documents."},{status:401});
  const claimId=new URL(request.url).searchParams.get("claimId");
  const documents=await prisma.document.findMany({where:{userId:session.user.id,...(claimId?{claimId}:{})},orderBy:{createdAt:"desc"},select:documentSelect});
  return NextResponse.json({documents});
}

export async function POST(request:Request){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to upload a test document."},{status:401});
  const form=await request.formData().catch(()=>null);if(!form)return NextResponse.json({error:"The upload could not be read."},{status:400});
  const file=form.get("file");const claimId=form.get("claimId");const syntheticConfirmed=form.get("syntheticConfirmed");
  if(!(file instanceof File)||typeof claimId!=="string")return NextResponse.json({error:"Choose a workspace and file."},{status:400});
  if(syntheticConfirmed!=="true")return NextResponse.json({error:"Confirm that this is a fictional or synthetic test document."},{status:400});
  const workspace=await prisma.claim.findFirst({where:{id:claimId,userId:session.user.id},select:{id:true}});if(!workspace)return NextResponse.json({error:"Workspace not found."},{status:404});

  let inspected:ReturnType<typeof inspectDocument>;let buffer:Buffer;
  try{buffer=Buffer.from(await file.arrayBuffer());inspected=inspectDocument(buffer)}catch(reason){return NextResponse.json({error:reason instanceof Error?reason.message:"The file is not accepted."},{status:400})}
  const storageKey=syntheticStorageKey(session.user.id,claimId,inspected.extension);let storage;
  try{storage=documentStorage()}catch(reason){return NextResponse.json({error:reason instanceof StorageConfigurationError?reason.message:"Private storage is unavailable."},{status:503})}
  let storedKey="";
  try{
    storedKey=(await storage.put(buffer,storageKey,inspected.mimeType)).key;
    const document=await prisma.$transaction(async transaction=>{
      const created=await transaction.document.create({data:{userId:session.user.id,claimId,originalName:safeDisplayName(file.name),storageKey:storedKey,mimeType:inspected.mimeType,size:buffer.length,sha256:inspected.sha256,provider:storage.name,status:"TEST_ONLY",syntheticConfirmed:true},select:documentSelect});
      await transaction.auditEvent.create({data:{actorUserId:session.user.id,claimId,documentId:created.id,action:"DOCUMENT_UPLOADED",metadata:{mimeType:created.mimeType,size:created.size,provider:created.provider,testOnly:true}}});
      return created;
    });
    return NextResponse.json({document},{status:201});
  }catch(reason){if(storedKey)await storage.delete(storedKey).catch(()=>{});console.error("Synthetic document upload failed",reason instanceof Error?reason.name:"UnknownError");return NextResponse.json({error:"The test document could not be stored."},{status:500})}
}
