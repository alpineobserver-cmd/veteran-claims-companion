import { auth } from "@/auth";
import { DocumentDownloadConfigurationError, issueDocumentDownloadTicket } from "@/lib/document-download-ticket";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginMutation } from "@/lib/request-security";
import { enforceAccountRateLimit, rateLimitPolicies } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const runtime="nodejs";
type Context={params:Promise<{id:string}>};

export async function POST(request:Request,context:Context){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to download this document."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.documentAccess],"Too many document requests. Please wait before trying again.");if(limited)return limited;
  const {id}=await context.params;
  const document=await prisma.document.findFirst({where:{id,userId:session.user.id},select:{id:true}});
  if(!document)return NextResponse.json({error:"Document not found."},{status:404});
  try{
    const ticket=issueDocumentDownloadTicket(document.id,session.user.id);
    const url=`/api/documents/${encodeURIComponent(document.id)}/content?token=${encodeURIComponent(ticket.token)}`;
    return NextResponse.json({url,expiresAt:new Date(ticket.expiresAt).toISOString()},{headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
  }catch(reason){
    console.error("Document download ticket creation failed",reason instanceof DocumentDownloadConfigurationError?reason.name:"UnknownError");
    return NextResponse.json({error:"Secure document download is unavailable."},{status:503});
  }
}
