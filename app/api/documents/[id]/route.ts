import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { documentStorage } from "@/lib/storage";
import { NextResponse } from "next/server";

type Context={params:Promise<{id:string}>};

export async function DELETE(_:Request,context:Context){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to delete this document."},{status:401});
  const {id}=await context.params;const document=await prisma.document.findFirst({where:{id,userId:session.user.id},select:{id:true,claimId:true,storageKey:true,mimeType:true,size:true,provider:true}});
  if(!document)return NextResponse.json({error:"Document not found."},{status:404});
  try{await documentStorage().delete(document.storageKey)}catch(reason){console.error("Synthetic document object deletion failed",reason instanceof Error?reason.name:"UnknownError");return NextResponse.json({error:"The stored file could not be deleted."},{status:503})}
  await prisma.$transaction(async transaction=>{
    await transaction.auditEvent.create({data:{actorUserId:session.user.id,claimId:document.claimId,documentId:document.id,action:"DOCUMENT_DELETED",metadata:{mimeType:document.mimeType,size:document.size,provider:document.provider,testOnly:true}}});
    await transaction.document.delete({where:{id:document.id}});
  });
  return new NextResponse(null,{status:204});
}
