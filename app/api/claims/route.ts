import { auth } from "@/auth";
import { createClaimSchema, draftIsWithinLimit } from "@/lib/claim-drafts";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hasAcceptableContentLength, MAX_ACTIVE_CLAIMS_PER_USER, MAX_JSON_REQUEST_BYTES, rejectCrossOriginMutation } from "@/lib/request-security";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to view saved claims." }, { status: 401 });

  const claims = await prisma.claim.findMany({
    where: { userId: session.user.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, progress: true, draftVersion: true, createdAt: true, updatedAt: true }
  });
  return NextResponse.json({ claims });
}

export async function POST(request: Request) {
  const rejected=rejectCrossOriginMutation(request);if(rejected)return rejected;
  if(!hasAcceptableContentLength(request,MAX_JSON_REQUEST_BYTES))return NextResponse.json({error:"This claim draft is too large to process."},{status:413});
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to save this claim." }, { status: 401 });

  const parsed = createClaimSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The claim draft is not valid." }, { status: 400 });
  if (!draftIsWithinLimit(parsed.data.draft)) return NextResponse.json({ error: "This draft is too large to save." }, { status: 413 });
  const activeCount=await prisma.claim.count({where:{userId:session.user.id,status:{not:"ARCHIVED"}}});
  if(activeCount>=MAX_ACTIVE_CLAIMS_PER_USER)return NextResponse.json({error:`Alpha accounts are limited to ${MAX_ACTIVE_CLAIMS_PER_USER} active workspaces.`},{status:409});

  const claim = await prisma.claim.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      progress: parsed.data.progress,
      status: parsed.data.progress > 9 ? "IN_PROGRESS" : "DRAFT",
      draftData: parsed.data.draft as Prisma.InputJsonValue
    },
    select: { id: true, title: true, progress: true, draftVersion: true, createdAt: true, updatedAt: true }
  });
  return NextResponse.json({ claim }, { status: 201 });
}
