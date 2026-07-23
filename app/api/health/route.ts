import { NextResponse } from "next/server";
import { securityEventToken } from "@/lib/security-events";

export const dynamic="force-dynamic";

export function GET(){return NextResponse.json({status:"ok",service:"debrief",environment:securityEventToken(process.env.APP_ENV||"unknown","unknown"),release:securityEventToken(process.env.RELEASE_ID||process.env.VERCEL_GIT_COMMIT_SHA||"unknown","unknown")},{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
