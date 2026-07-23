import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { buddyStatementGaps, buddyStatementInputSchema, createBuddyStatement } from "@/lib/buddy-statement";
import { claimDraftSchema } from "@/lib/claim-drafts";
import { prisma } from "@/lib/prisma";
import { hasAcceptableContentLength, MAX_JSON_REQUEST_BYTES, rejectCrossOriginMutation } from "@/lib/request-security";
import { enforceAccountRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

type Context={params:Promise<{id:string}>};
const saveSchema=buddyStatementInputSchema.extend({id:z.string().max(100).optional(),statement:z.string().max(50_000).optional(),version:z.number().int().positive()}).strict();
const deleteSchema=z.object({id:z.string().max(100),version:z.number().int().positive()}).strict();

async function ownedClaim(id:string,userId:string){return prisma.claim.findFirst({where:{id,userId},select:{id:true,title:true,draftData:true,draftVersion:true}})}

export async function POST(request:Request,context:Context){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_JSON_REQUEST_BYTES))return NextResponse.json({error:"The buddy statement is too large to save."},{status:413});
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to save a buddy statement."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.claimMutation]);if(limited)return limited;
  const parsed=saveSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Review the buddy statement answers and try again."},{status:400});
  const {id}=await context.params;const claim=await ownedClaim(id,session.user.id);if(!claim)return NextResponse.json({error:"Claim not found."},{status:404});
  const draft=claimDraftSchema.safeParse(claim.draftData);if(!draft.success)return NextResponse.json({error:"Open and save this claim before adding a buddy statement."},{status:409});
  const {version,statement:editedStatement,id:statementId,...input}=parsed.data;const gaps=buddyStatementGaps(input);
  if(gaps.length)return NextResponse.json({error:"More firsthand information is needed before drafting.",gaps},{status:400});
  const now=new Date().toISOString();const existing=(draft.data.buddyStatements||[]).find(item=>item.id===statementId);
  const buddy={id:existing?.id||crypto.randomUUID(),...input,statement:editedStatement?.trim()||createBuddyStatement(claim.title,input),createdAt:existing?.createdAt||now,updatedAt:now};
  const buddies=[...(draft.data.buddyStatements||[]).filter(item=>item.id!==buddy.id),buddy].slice(-10);
  const updated=await prisma.claim.updateMany({where:{id:claim.id,userId:session.user.id,draftVersion:version},data:{draftData:{...draft.data,buddyStatements:buddies} as Prisma.InputJsonValue,draftVersion:{increment:1}}});
  if(!updated.count)return NextResponse.json({error:"This claim changed in another window. Refresh before saving the buddy statement.",conflict:true},{status:409});
  return NextResponse.json({buddy,draftVersion:version+1},{status:existing?200:201});
}

export async function DELETE(request:Request,context:Context){
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_JSON_REQUEST_BYTES))return NextResponse.json({error:"The buddy statement request is too large."},{status:413});
  const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Sign in to delete a buddy statement."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.claimMutation]);if(limited)return limited;
  const parsed=deleteSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"The buddy statement request is not valid."},{status:400});
  const {id}=await context.params;const claim=await ownedClaim(id,session.user.id);if(!claim)return NextResponse.json({error:"Claim not found."},{status:404});
  const draft=claimDraftSchema.safeParse(claim.draftData);if(!draft.success)return NextResponse.json({error:"This claim needs to be opened and saved again."},{status:409});
  const buddies=(draft.data.buddyStatements||[]).filter(item=>item.id!==parsed.data.id);if(buddies.length===(draft.data.buddyStatements||[]).length)return NextResponse.json({error:"Buddy statement not found."},{status:404});
  const updated=await prisma.claim.updateMany({where:{id:claim.id,userId:session.user.id,draftVersion:parsed.data.version},data:{draftData:{...draft.data,buddyStatements:buddies} as Prisma.InputJsonValue,draftVersion:{increment:1}}});
  if(!updated.count)return NextResponse.json({error:"This claim changed in another window. Refresh before deleting the buddy statement.",conflict:true},{status:409});
  return new NextResponse(null,{status:204});
}
