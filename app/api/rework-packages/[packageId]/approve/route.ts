import {auth} from "@/auth";
import {getPackageReadiness} from "@/lib/rework-prototype";
import {reworkSnapshotChecksum} from "@/lib/rework-package-snapshot";
import {prisma} from "@/lib/prisma";
import {enforceAccountRateLimit,rateLimitPolicies} from "@/lib/rate-limit";
import {hasAcceptableContentLength,MAX_JSON_REQUEST_BYTES,rejectCrossOriginMutation} from "@/lib/request-security";
import {createApprovedPackageSnapshot,packageRecordsFromState,reworkApprovalRequestSchema,reworkStateWithinLimit,type SavedState} from "@/lib/rework-state";
import {Prisma} from "@prisma/client";
import {NextResponse} from "next/server";

export const runtime="nodejs";
type Context={params:Promise<{packageId:string}>};
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};

function approveState(state:SavedState,packageId:string){
  const packages=packageRecordsFromState(state).map(item=>item.id===packageId?{...item,approved:true,approvalChanges:[]}:item);
  const active=state.activePackageId===packageId;
  return {...state,approved:active?true:state.approved,approvalChanges:active?[]:state.approvalChanges,packages};
}

export async function POST(request:Request,context:Context){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_JSON_REQUEST_BYTES))return NextResponse.json({error:"This package is too large to approve."},{status:413,headers});
  const session=await auth();
  if(!session?.user?.id)return NextResponse.json({error:"Sign in to approve this package."},{status:401,headers});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.reworkApproval]);if(limited)return limited;
  const {packageId}=await context.params;
  const parsed=reworkApprovalRequestSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||parsed.data.packageId!==packageId)return NextResponse.json({error:"The package approval request is not valid."},{status:400,headers});
  const state=approveState(parsed.data.state,packageId);
  if(!reworkStateWithinLimit(state))return NextResponse.json({error:"This package is too large to approve."},{status:413,headers});
  const record=packageRecordsFromState(state).find(item=>item.id===packageId);
  if(!record)return NextResponse.json({error:"Package not found."},{status:404,headers});
  const readiness=getPackageReadiness({services:state.services,events:state.events,documents:state.documents,claims:record.claims,sources:state.sources||[],packageKind:record.kind,buddyDecision:record.buddyDecision,packageId});
  const requiredSections=["foundation","claims","records","package"];
  if(!readiness.allReady||!requiredSections.every(section=>record.approvalSections.includes(section as never)))return NextResponse.json({error:"Resolve every required review and approve each section before final approval."},{status:409,headers});
  const snapshot=createApprovedPackageSnapshot(state,packageId);
  if(!snapshot)return NextResponse.json({error:"Package not found."},{status:404,headers});
  const checksum=reworkSnapshotChecksum(snapshot);
  try{
    const result=await prisma.$transaction(async transaction=>{
      const updated=await transaction.reworkProfile.updateMany({where:{userId:session.user.id,version:parsed.data.version},data:{state:state as Prisma.InputJsonValue,version:{increment:1}}});
      if(!updated.count)throw new Error("REWORK_VERSION_CONFLICT");
      const approved=await transaction.reworkPackageSnapshot.create({data:{userId:session.user.id,packageId,state:snapshot as unknown as Prisma.InputJsonValue,checksum,approvedAt:new Date(snapshot.approvedAt)},select:{approvedAt:true,checksum:true}});
      const profile=await transaction.reworkProfile.findUniqueOrThrow({where:{userId:session.user.id},select:{version:true}});
      return {...approved,version:profile.version};
    });
    return NextResponse.json(result,{headers});
  }catch(reason){
    if(reason instanceof Error&&reason.message==="REWORK_VERSION_CONFLICT")return NextResponse.json({error:"This workspace changed before approval. Reload and review it again."},{status:409,headers});
    if(reason instanceof Prisma.PrismaClientKnownRequestError&&reason.code==="P2002")return NextResponse.json({error:"This package is already approved and cannot be replaced."},{status:409,headers});
    throw reason;
  }
}
