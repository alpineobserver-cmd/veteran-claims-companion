import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import {enforceAccountRateLimit,rateLimitPolicies} from "@/lib/rate-limit";
import {hasAcceptableContentLength,MAX_JSON_REQUEST_BYTES,rejectCrossOriginMutation} from "@/lib/request-security";
import {reworkStateRequestSchema,reworkStateWithinLimit} from "@/lib/rework-state";
import {Prisma} from "@prisma/client";
import {NextResponse} from "next/server";

export const runtime="nodejs";
const privateHeaders={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};

export async function GET(){
  const session=await auth();
  if(!session?.user?.id)return NextResponse.json({error:"Sign in to open your Debrief workspace."},{status:401,headers:privateHeaders});
  const [profile,snapshots]=await Promise.all([
    prisma.reworkProfile.findUnique({where:{userId:session.user.id},select:{state:true,version:true,updatedAt:true}}),
    prisma.reworkPackageSnapshot.findMany({where:{userId:session.user.id},select:{packageId:true,approvedAt:true,checksum:true},orderBy:{approvedAt:"desc"}})
  ]);
  return NextResponse.json({state:profile?.state??null,version:profile?.version??0,updatedAt:profile?.updatedAt??null,approvedPackages:snapshots},{headers:privateHeaders});
}

export async function PUT(request:Request){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_JSON_REQUEST_BYTES))return NextResponse.json({error:"This workspace is too large to save."},{status:413,headers:privateHeaders});
  const session=await auth();
  if(!session?.user?.id)return NextResponse.json({error:"Sign in to save your Debrief workspace."},{status:401,headers:privateHeaders});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.reworkMutation]);if(limited)return limited;
  const parsed=reworkStateRequestSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"The workspace data is not valid."},{status:400,headers:privateHeaders});
  if(!reworkStateWithinLimit(parsed.data.state))return NextResponse.json({error:"This workspace is too large to save."},{status:413,headers:privateHeaders});
  const state=parsed.data.state as Prisma.InputJsonValue;
  if(parsed.data.version===0){
    try{
      const profile=await prisma.reworkProfile.create({data:{userId:session.user.id,state},select:{version:true,updatedAt:true}});
      return NextResponse.json(profile,{headers:privateHeaders});
    }catch(reason){if(!(reason instanceof Prisma.PrismaClientKnownRequestError&&reason.code==="P2002"))throw reason}
  }else{
    const updated=await prisma.reworkProfile.updateMany({where:{userId:session.user.id,version:parsed.data.version},data:{state,version:{increment:1}}});
    if(updated.count){const profile=await prisma.reworkProfile.findUniqueOrThrow({where:{userId:session.user.id},select:{version:true,updatedAt:true}});return NextResponse.json(profile,{headers:privateHeaders})}
  }
  const current=await prisma.reworkProfile.findUnique({where:{userId:session.user.id},select:{version:true,updatedAt:true}});
  return NextResponse.json({error:"This workspace was updated elsewhere. Reload before making more changes.",conflict:current},{status:409,headers:privateHeaders});
}

export async function DELETE(request:Request){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  const session=await auth();
  if(!session?.user?.id)return NextResponse.json({error:"Sign in to clear your Debrief workspace."},{status:401,headers:privateHeaders});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.reworkMutation]);if(limited)return limited;
  const approved=await prisma.reworkPackageSnapshot.count({where:{userId:session.user.id}});
  if(approved)return NextResponse.json({error:"Approved package history cannot be cleared here. Start a new package or delete the full account."},{status:409,headers:privateHeaders});
  await prisma.reworkProfile.deleteMany({where:{userId:session.user.id}});
  return new NextResponse(null,{status:204,headers:privateHeaders});
}
