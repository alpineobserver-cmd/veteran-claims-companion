import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CANONICAL_ALPHA_HOST, getCanonicalRedirect } from "@/lib/canonical-host";

export const CANONICAL_ALPHA_HOST=process.env.AUTH_CANONICAL_HOST||DEFAULT_CANONICAL_ALPHA_HOST;

export function middleware(request:NextRequest){
  const forwardedHost=request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const canonical=getCanonicalRedirect({requestUrl:request.nextUrl,requestHost:forwardedHost||request.headers.get("host"),vercelEnvironment:process.env.VERCEL_ENV,canonicalHost:CANONICAL_ALPHA_HOST});
  if(!canonical)return NextResponse.next();
  return NextResponse.redirect(canonical,308);
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
