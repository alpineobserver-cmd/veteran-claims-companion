import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { claimDraftSchema } from "@/lib/claim-drafts";
import { packageStatuses } from "@/lib/claim-package-workflow";
import { prisma } from "@/lib/prisma";
import { hasAcceptableContentLength, MAX_ACTIVE_CLAIMS_PER_USER, MAX_JSON_REQUEST_BYTES, rejectCrossOriginMutation } from "@/lib/request-security";
import { enforceAccountRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

type Context={params:Promise<{id:string}>};
const actionSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("package_status"),status:z.enum(packageStatuses),version:z.number().int().positive(),confirmSubmitted:z.boolean().optional()}).strict(),
  z.object({action:z.literal("archive")}).strict(),
  z.object({action:z.literal("restore")}).strict(),
  z.object({action:z.literal("duplicate")}).strict()
]);

export async function POST(request:Request,context:Context){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_JSON_REQUEST_BYTES))return NextResponse.json({error:"The claim action request is too large."},{status:413});
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to update this claim."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.claimMutation]);if(limited)return limited;
  const parsed=actionSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"The requested claim action is not valid."},{status:400});
  const {id}=await context.params;
  const claim=await prisma.claim.findFirst({where:{id,userId:session.user.id},select:{id:true,title:true,status:true,progress:true,draftData:true,draftVersion:true}});
  if(!claim)return NextResponse.json({error:"Claim not found."},{status:404});

  if(parsed.data.action==="archive"){
    if(claim.status==="ARCHIVED")return NextResponse.json({claim:{id:claim.id,status:claim.status}});
    const archived=await prisma.claim.update({where:{id:claim.id},data:{status:"ARCHIVED"},select:{id:true,status:true,updatedAt:true}});
    return NextResponse.json({claim:archived});
  }

  if(parsed.data.action==="restore"){
    const activeCount=await prisma.claim.count({where:{userId:session.user.id,status:{not:"ARCHIVED"}}});
    if(activeCount>=MAX_ACTIVE_CLAIMS_PER_USER)return NextResponse.json({error:`Alpha accounts are limited to ${MAX_ACTIVE_CLAIMS_PER_USER} active workspaces.`},{status:409});
    const restored=await prisma.claim.update({where:{id:claim.id},data:{status:claim.progress>9?"IN_PROGRESS":"DRAFT"},select:{id:true,status:true,updatedAt:true}});
    return NextResponse.json({claim:restored});
  }

  if(parsed.data.action==="duplicate"){
    const activeCount=await prisma.claim.count({where:{userId:session.user.id,status:{not:"ARCHIVED"}}});
    if(activeCount>=MAX_ACTIVE_CLAIMS_PER_USER)return NextResponse.json({error:`Alpha accounts are limited to ${MAX_ACTIVE_CLAIMS_PER_USER} active workspaces.`},{status:409});
    const draft=claimDraftSchema.safeParse(claim.draftData);
    if(!draft.success)return NextResponse.json({error:"This claim cannot be duplicated until it is opened and saved again."},{status:409});
    const now=new Date().toISOString();
    const {packageExportedAt:unusedExportedAt,packageSubmittedAt:unusedSubmittedAt,...baseDraft}=draft.data;
    void unusedExportedAt;void unusedSubmittedAt;
    const duplicateDraft={...baseDraft,packageStatus:"planned" as const,packageStatusUpdatedAt:now};
    const duplicate=await prisma.claim.create({data:{userId:session.user.id,title:`${claim.title} copy`.slice(0,160),status:claim.progress>9?"IN_PROGRESS":"DRAFT",progress:claim.progress,draftData:duplicateDraft as Prisma.InputJsonValue},select:{id:true,title:true,status:true,progress:true,updatedAt:true}});
    return NextResponse.json({claim:duplicate},{status:201});
  }

  if(parsed.data.status==="submitted"&&!parsed.data.confirmSubmitted)return NextResponse.json({error:"Confirm that you are only recording your own submission status. Debrief cannot verify VA receipt."},{status:400});
  const draft=claimDraftSchema.safeParse(claim.draftData);if(!draft.success)return NextResponse.json({error:"Open and save this claim before changing its package status."},{status:409});
  const now=new Date().toISOString();
  const nextDraft={...draft.data,packageStatus:parsed.data.status,packageStatusUpdatedAt:now,...(parsed.data.status==="exported"?{packageExportedAt:now}:{}),...(parsed.data.status==="submitted"?{packageSubmittedAt:now}:{})};
  const updated=await prisma.claim.updateMany({where:{id:claim.id,userId:session.user.id,draftVersion:parsed.data.version},data:{draftData:nextDraft as Prisma.InputJsonValue,draftVersion:{increment:1}}});
  if(!updated.count)return NextResponse.json({error:"This claim changed in another window. Refresh before changing its package status.",conflict:true},{status:409});
  const saved=await prisma.claim.findUnique({where:{id:claim.id},select:{id:true,draftVersion:true,updatedAt:true}});
  return NextResponse.json({claim:saved,status:parsed.data.status});
}
