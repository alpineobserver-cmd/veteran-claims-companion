import { auth } from "@/auth";
import { draftIsWithinLimit, updateClaimSchema } from "@/lib/claim-drafts";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to save this claim." }, { status: 401 });
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

export async function DELETE(_: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to delete this claim." }, { status: 401 });
  const { id } = await context.params;
  const result = await prisma.claim.deleteMany({ where: { id, userId: session.user.id } });
  if (!result.count) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
