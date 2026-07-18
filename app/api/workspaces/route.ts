import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAcceptableContentLength, MAX_ACTIVE_CLAIMS_PER_USER, MAX_JSON_REQUEST_BYTES, rejectCrossOriginMutation } from "@/lib/request-security";

const workspaceSchema=z.object({title:z.string().trim().min(1).max(160)}).strict();

export async function GET(){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to view workspaces."},{status:401});
  const workspaces=await prisma.claim.findMany({where:{userId:session.user.id,status:{not:"ARCHIVED"}},orderBy:{updatedAt:"desc"},select:{id:true,title:true,updatedAt:true,_count:{select:{documents:true}}}});
  return NextResponse.json({workspaces});
}

export async function POST(request:Request){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_JSON_REQUEST_BYTES))return NextResponse.json({error:"The workspace request is too large."},{status:413});
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to create a workspace."},{status:401});
  const parsed=workspaceSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Enter a workspace name."},{status:400});
  const activeCount=await prisma.claim.count({where:{userId:session.user.id,status:{not:"ARCHIVED"}}});if(activeCount>=MAX_ACTIVE_CLAIMS_PER_USER)return NextResponse.json({error:`Alpha accounts are limited to ${MAX_ACTIVE_CLAIMS_PER_USER} active workspaces.`},{status:409});
  const workspace=await prisma.$transaction(async transaction=>{
    const claim=await transaction.claim.create({data:{userId:session.user.id,title:parsed.data.title,status:"DRAFT"},select:{id:true,title:true,updatedAt:true}});
    await transaction.auditEvent.create({data:{actorUserId:session.user.id,claimId:claim.id,action:"WORKSPACE_CREATED"}});
    return claim;
  });
  return NextResponse.json({workspace:{...workspace,_count:{documents:0}}},{status:201});
}
