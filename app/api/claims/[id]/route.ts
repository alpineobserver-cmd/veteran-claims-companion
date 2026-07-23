import { auth } from "@/auth";
import { draftIsWithinLimit, updateClaimSchema } from "@/lib/claim-drafts";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { documentStorage } from "@/lib/storage";
import { hasAcceptableContentLength, MAX_JSON_REQUEST_BYTES, rejectCrossOriginMutation } from "@/lib/request-security";
import { enforceAccountRateLimit, rateLimitPolicies, rateLimitPrincipalHash } from "@/lib/rate-limit";
import { deleteObjectAndVerify, recordStorageReconciliation, resolveStorageReconciliation } from "@/lib/storage-reconciliation";
import { emitSecurityEvent, securityEventErrorCode } from "@/lib/security-events";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to open this claim." }, { status: 401 });
  const { id } = await context.params;
  const claim = await prisma.claim.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, title: true, status: true, progress: true, draftData: true, draftVersion: true, createdAt: true, updatedAt: true }
  });
  if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  return NextResponse.json({ claim });
}

export async function PATCH(request: Request, context: Context) {
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_JSON_REQUEST_BYTES))return NextResponse.json({error:"This claim draft is too large to process."},{status:413});
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to save this claim." }, { status: 401 });
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.claimMutation]);if(limited)return limited;
  const { id } = await context.params;
  const parsed = updateClaimSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The claim draft is not valid." }, { status: 400 });
  if (!draftIsWithinLimit(parsed.data.draft)) return NextResponse.json({ error: "This draft is too large to save." }, { status: 413 });

  const result = await prisma.claim.updateMany({
    where: { id, userId: session.user.id, draftVersion: parsed.data.version },
    data: {
      title: parsed.data.title,
      progress: parsed.data.progress,
      status: parsed.data.progress > 9 ? "IN_PROGRESS" : "DRAFT",
      draftData: parsed.data.draft as Prisma.InputJsonValue,
      draftVersion: { increment: 1 }
    }
  });
  if (!result.count) {
    const exists = await prisma.claim.findFirst({ where: { id, userId: session.user.id }, select: { draftVersion: true, updatedAt: true } });
    if (!exists) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    return NextResponse.json({ error: "This claim was updated elsewhere. Reload it before saving again.", conflict: exists }, { status: 409 });
  }
  const claim = await prisma.claim.findUnique({
    where: { id },
    select: { id: true, title: true, progress: true, draftVersion: true, updatedAt: true }
  });
  return NextResponse.json({ claim });
}

export async function DELETE(request: Request, context: Context) {
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to delete this claim." }, { status: 401 });
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.claimMutation]);if(limited)return limited;
  const { id } = await context.params;
  const principalHash=rateLimitPrincipalHash(`user:${session.user.id}`);
  const [documents,orphanedUploads]=await Promise.all([
    prisma.document.findMany({ where: { claimId: id, userId: session.user.id }, select: { storageKey: true, provider: true } }),
    prisma.storageReconciliationTask.findMany({where:{principalHash,operation:"DELETE_OBJECT",entityId:id,status:"PENDING",storageKey:{not:null}},select:{storageKey:true,storageProvider:true}})
  ]);
  const storageObjects=[
    ...documents.map(item=>({storageKey:item.storageKey,storageProvider:item.provider})),
    ...orphanedUploads.map(item=>({storageKey:item.storageKey,storageProvider:item.storageProvider})),
  ].filter((item):item is {storageKey:string;storageProvider:string|null}=>Boolean(item.storageKey));
  if (storageObjects.length) {
    const outcomes=await Promise.allSettled(storageObjects.map(document=>deleteObjectAndVerify(documentStorage(document.storageProvider),document.storageKey)));
    const failures=outcomes.flatMap((outcome,index)=>outcome.status==="rejected"?[{reason:outcome.reason,...storageObjects[index]}]:[]);
    if(failures.length){
      await Promise.all(failures.map(failure=>recordStorageReconciliation({userId:session.user.id,operation:"DELETE_OBJECT",scope:"claim-delete",entityId:id,storageKey:failure.storageKey,storageProvider:failure.storageProvider||undefined,reason:failure.reason})));
      await recordStorageReconciliation({userId:session.user.id,operation:"DELETE_DATABASE_RECORD",scope:"claim-delete",entityId:id,reason:new Error("ObjectDeletionPending")});
      emitSecurityEvent("claim_object_cleanup_failed",{operation:"DELETE_OBJECT",scope:"claim-delete",code:"ObjectDeletionPending"},"error");
      return NextResponse.json({ error: "Stored documents could not be deleted. The workspace was kept so you can try again." }, { status: 503 });
    }
  }
  let result;
  try{result=await prisma.claim.deleteMany({ where: { id, userId: session.user.id } })}catch(reason){await recordStorageReconciliation({userId:session.user.id,operation:"DELETE_DATABASE_RECORD",scope:"claim-delete",entityId:id,reason});emitSecurityEvent("claim_database_cleanup_failed",{operation:"DELETE_DATABASE_RECORD",scope:"claim-delete",code:securityEventErrorCode(reason)},"error");return NextResponse.json({error:"Stored files were removed, but the workspace record still needs cleanup. Try deleting it again."},{status:503})}
  if (!result.count) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  await resolveStorageReconciliation(session.user.id,"claim-delete",id);
  return new NextResponse(null, { status: 204 });
}
