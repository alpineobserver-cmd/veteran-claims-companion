import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { documentStorage } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime="nodejs";
type Context={params:Promise<{id:string}>};

export async function GET(_:Request,context:Context){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to download this document."},{status:401});
  const {id}=await context.params;const document=await prisma.document.findFirst({where:{id,userId:session.user.id},select:{id:true,claimId:true,originalName:true,storageKey:true,mimeType:true}});
  if(!document)return NextResponse.json({error:"Document not found."},{status:404});
  let stored;try{stored=await documentStorage().get(document.storageKey)}catch(reason){console.error("Synthetic document download failed",reason instanceof Error?reason.name:"UnknownError");return NextResponse.json({error:"Private storage is unavailable."},{status:503})}
  if(!stored)return NextResponse.json({error:"Stored document not found."},{status:404});
  await prisma.auditEvent.create({data:{actorUserId:session.user.id,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_DOWNLOADED"}});
  return new NextResponse(new Uint8Array(stored.data),{headers:{"Content-Type":document.mimeType,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(document.originalName)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
