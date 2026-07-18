import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginMutation } from "@/lib/request-security";
import { documentStorage } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function DELETE(request:Request){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to delete this account."},{status:401});
  const documents=await prisma.document.findMany({where:{userId:session.user.id},select:{storageKey:true}});
  if(documents.length){
    try{const storage=documentStorage();await Promise.all(documents.map(document=>storage.delete(document.storageKey)))}
    catch(reason){console.error("Account object cleanup failed",reason instanceof Error?reason.name:"UnknownError");return NextResponse.json({error:"Stored files could not be deleted, so the account was kept. Try again or contact the alpha administrator."},{status:503})}
  }
  try{await prisma.user.delete({where:{id:session.user.id}})}catch(reason){console.error("Account deletion failed",reason instanceof Error?reason.name:"UnknownError");return NextResponse.json({error:"The account could not be deleted after its stored files were removed. Contact the alpha administrator."},{status:500})}
  return new NextResponse(null,{status:204,headers:{"Clear-Site-Data":"\"cache\", \"cookies\", \"storage\""}});
}
