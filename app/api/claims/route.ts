import { auth } from "@/auth";
import { createClaimSchema, draftIsWithinLimit } from "@/lib/claim-drafts";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to save this claim." }, { status: 401 });

  const parsed = createClaimSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The claim draft is not valid." }, { status: 400 });
  if (!draftIsWithinLimit(parsed.data.draft)) return NextResponse.json({ error: "This draft is too large to save." }, { status: 413 });

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
