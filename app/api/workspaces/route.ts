import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const workspaceSchema=z.object({title:z.string().trim().min(1).max(160)}).strict();

export async function GET(){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to view workspaces."},{status:401});
  const workspaces=await prisma.claim.findMany({where:{userId:session.user.id,status:{not:"ARCHIVED"}},orderBy:{updatedAt:"desc"},select:{id:true,title:true,updatedAt:true,_count:{select:{documents:true}}}});
  return NextResponse.json({workspaces});
}

export async function POST(request:Request){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to create a workspace."},{status:401});
  const parsed=workspaceSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Enter a workspace name."},{status:400});
  const workspace=await prisma.$transaction(async transaction=>{
    const claim=await transaction.claim.create({data:{userId:session.user.id,title:parsed.data.title,status:"DRAFT"},select:{id:true,title:true,updatedAt:true}});
    await transaction.auditEvent.create({data:{actorUserId:session.user.id,claimId:claim.id,action:"WORKSPACE_CREATED"}});
    return claim;
  });
  return NextResponse.json({workspace:{...workspace,_count:{documents:0}}},{status:201});
}
