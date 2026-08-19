import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return new NextResponse(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  // This is a Staging-only keepalive. It deliberately reads no application
  // tables and returns no database information.
  if (process.env.APP_ENV !== "staging") {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", service: "debrief-staging-database-liveness" }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return NextResponse.json({ status: "unavailable", service: "debrief-staging-database-liveness" }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}
