import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enforceAccountRateLimit, rateLimitPolicies, rateLimitPrincipalHash } from "@/lib/rate-limit";

export const runtime="nodejs";

export async function GET(){
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to export your account data."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.accountExport],"Too many account exports. Please wait before downloading another copy.");if(limited)return limited;
  const account=await prisma.user.findUnique({where:{id:session.user.id},select:{
    id:true,name:true,email:true,emailVerified:true,image:true,createdAt:true,updatedAt:true,
    accounts:{select:{type:true,provider:true,providerAccountId:true,token_type:true,scope:true,expires_at:true}},
    sessions:{select:{expires:true}},
    claims:{orderBy:{createdAt:"asc"},select:{
      id:true,title:true,status:true,branch:true,mosRate:true,symptomStart:true,deploymentHistory:true,exposures:true,treatment:true,progress:true,draftData:true,draftVersion:true,createdAt:true,updatedAt:true,
      conditions:{select:{condition:{select:{id:true,slug:true,name:true}}}},
      evidence:{orderBy:{createdAt:"asc"},select:{id:true,evidenceTypeId:true,title:true,notes:true,status:true,createdAt:true,updatedAt:true,type:{select:{slug:true,name:true,category:true,description:true}}}},
      answers:{orderBy:{createdAt:"asc"},select:{id:true,value:true,createdAt:true,updatedAt:true,question:{select:{key:true,prompt:true,helpText:true,kind:true,order:true}}}},
      progressItems:{orderBy:{key:"asc"},select:{key:true,label:true,complete:true,updatedAt:true}}
    }},
    statements:{orderBy:{createdAt:"asc"},select:{id:true,claimId:true,templateId:true,title:true,content:true,createdAt:true,updatedAt:true}},
    documents:{orderBy:{createdAt:"asc"},select:{id:true,claimId:true,originalName:true,mimeType:true,size:true,sha256:true,provider:true,status:true,syntheticConfirmed:true,createdAt:true,updatedAt:true,pages:{orderBy:{pageNumber:"asc"},select:{pageNumber:true,ocrText:true,createdAt:true,updatedAt:true}}}},
    uploads:{orderBy:{createdAt:"asc"},select:{id:true,evidenceId:true,filename:true,mimeType:true,size:true,provider:true,createdAt:true}},
    auditEvents:{orderBy:{createdAt:"asc"},select:{id:true,claimId:true,documentId:true,action:true,metadata:true,createdAt:true}}
  }});
  if(!account)return NextResponse.json({error:"Account not found."},{status:404});
  const securityCounters=await prisma.rateLimitBucket.findMany({where:{principalHash:rateLimitPrincipalHash(`user:${session.user.id}`)},orderBy:{windowStart:"asc"},select:{scope:true,windowStart:true,windowEndsAt:true,count:true}});
  const exportedAt=new Date();
  const payload={
    export:{schemaVersion:1,generatedAt:exportedAt.toISOString(),product:"Debrief",dataBoundary:"Closed Alpha — fictional information only"},
    account,
    securityCounters,
    fileNotice:{binaryFilesIncluded:false,documentCount:account.documents.length,legacyUploadCount:account.uploads.length,instructions:"Download each fictional binary file separately from Document Upload. This JSON includes its metadata and SHA-256 fingerprint but never includes private storage keys."},
    exclusions:["OAuth access, refresh, and identity tokens","Database session tokens","Password hashes","Private object-storage keys","Provider backups and infrastructure logs"]
  };
  const body=JSON.stringify(payload,null,2);const date=exportedAt.toISOString().slice(0,10);
  return new NextResponse(body,{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="debrief-account-export-${date}.json"`,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});
}
