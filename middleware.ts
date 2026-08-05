import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CANONICAL_ALPHA_HOST, getCanonicalRedirect } from "@/lib/canonical-host";
import { contentSecurityPolicy } from "@/lib/content-security-policy";

export const CANONICAL_ALPHA_HOST=process.env.AUTH_CANONICAL_HOST||DEFAULT_CANONICAL_ALPHA_HOST;

export function middleware(request:NextRequest){
  const nonce=crypto.randomUUID().replaceAll("-","");
  const csp=contentSecurityPolicy(process.env.NODE_ENV!=="production",nonce);
  const forwardedHost=request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const canonical=getCanonicalRedirect({requestUrl:request.nextUrl,requestHost:forwardedHost||request.headers.get("host"),vercelEnvironment:process.env.VERCEL_ENV,canonicalHost:CANONICAL_ALPHA_HOST});
  if(!canonical){
    const headers=new Headers(request.headers);
    headers.set("Content-Security-Policy",csp);
    headers.set("x-nonce",nonce);
    const response=NextResponse.next({request:{headers}});
    response.headers.set("Content-Security-Policy",csp);
    return response;
  }
  return NextResponse.redirect(canonical,308);
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
