import { auth } from "@/auth";
import { randomUUID } from "node:crypto";
import { deleteStoredObjectsAndVerify } from "@/lib/account-deletion";
import { prisma } from "@/lib/prisma";
import { rejectCrossOriginMutation } from "@/lib/request-security";
import { documentStorage } from "@/lib/storage";
import { NextResponse } from "next/server";
import { enforceAccountRateLimit, rateLimitPolicies, rateLimitPrincipalHash } from "@/lib/rate-limit";

export async function DELETE(request:Request){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to delete this account."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.accountDelete]);if(limited)return limited;
  const [documents,legacyUploads]=await Promise.all([prisma.document.findMany({where:{userId:session.user.id},select:{storageKey:true}}),prisma.upload.findMany({where:{userId:session.user.id},select:{storageKey:true}})]);
  const objectKeys=[...documents,...legacyUploads].map(item=>item.storageKey);
  let deletedObjects=0;
  if(objectKeys.length){
    try{deletedObjects=await deleteStoredObjectsAndVerify(documentStorage(),objectKeys)}
    catch(reason){console.error("Account object cleanup failed",reason instanceof Error?reason.name:"UnknownError");return NextResponse.json({error:"Stored files could not be deleted, so the account was kept. Try again or contact the alpha administrator."},{status:503})}
  }
  try{
    const principalHash=rateLimitPrincipalHash(`user:${session.user.id}`);
    const deleted=await prisma.$transaction(async transaction=>{
      await transaction.rateLimitBucket.deleteMany({where:{principalHash}});
      return transaction.user.deleteMany({where:{id:session.user.id}});
    });if(deleted.count!==1)throw new Error("AccountDeleteCountMismatch");
    const remaining=await prisma.user.findUnique({where:{id:session.user.id},select:{id:true}});if(remaining)throw new Error("AccountDeletionNotVerified");
  }catch(reason){console.error("Account deletion failed",reason instanceof Error?reason.name:"UnknownError");return NextResponse.json({error:"The account could not be deleted after its stored files were removed. Contact the alpha administrator."},{status:500})}
  return NextResponse.json({status:"deleted",receipt:{receiptId:randomUUID(),deletedAt:new Date().toISOString(),activeDatabaseDeletion:"verified",activeObjectDeletion:"verified",deletedObjects,backupNotice:"Provider backups and security logs may remain until their configured retention periods expire."}},{headers:{"Cache-Control":"private, no-store","Clear-Site-Data":"\"cache\", \"cookies\", \"storage\"","X-Content-Type-Options":"nosniff"}});
}
