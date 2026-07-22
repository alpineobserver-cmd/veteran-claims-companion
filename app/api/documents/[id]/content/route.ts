import { auth } from "@/auth";
import { verifyDocumentDownloadTicket } from "@/lib/document-download-ticket";
import { prisma } from "@/lib/prisma";
import { documentStorage } from "@/lib/storage";
import { enforceAccountRateLimit, rateLimitPolicies } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { emitSecurityEvent, securityEventErrorCode } from "@/lib/security-events";

export const runtime="nodejs";
type Context={params:Promise<{id:string}>};

export async function GET(request:Request,context:Context){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to download this document."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.documentAccess],"Too many document requests. Please wait before trying again.");if(limited)return limited;
  const {id}=await context.params;const token=new URL(request.url).searchParams.get("token")||"";
  if(!verifyDocumentDownloadTicket(token,id,session.user.id))return NextResponse.json({error:"This secure download link is invalid or has expired. Request a new link."},{status:403,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
  const document=await prisma.document.findFirst({where:{id,userId:session.user.id},select:{id:true,claimId:true,originalName:true,storageKey:true,mimeType:true,provider:true}});
  if(!document)return NextResponse.json({error:"Document not found."},{status:404});
  let stored;try{stored=await documentStorage(document.provider).get(document.storageKey)}catch(reason){emitSecurityEvent("document_download_failed",{operation:"GET_OBJECT",scope:"document-download",code:securityEventErrorCode(reason)},"error");return NextResponse.json({error:"Private storage is unavailable."},{status:503})}
  if(!stored)return NextResponse.json({error:"Stored document not found."},{status:404});
  await prisma.auditEvent.create({data:{actorUserId:session.user.id,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_DOWNLOADED"}});
  return new NextResponse(new Uint8Array(stored.data),{headers:{"Content-Type":document.mimeType,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(document.originalName)}`,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});
}
