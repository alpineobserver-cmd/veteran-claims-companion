import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type RateLimitPolicy={scope:string;limit:number;windowMs:number};
export type RateLimitResult={allowed:boolean;limit:number;remaining:number;retryAfterSeconds:number;scope:string};

const MINUTE=60_000;const HOUR=60*MINUTE;const DAY=24*HOUR;const RETENTION_MS=7*DAY;
let lastCleanupAt=0;

export const rateLimitPolicies={
  claimMutation:{scope:"claim-mutation-10m",limit:180,windowMs:10*MINUTE},
  workspaceCreate:{scope:"workspace-create-day",limit:30,windowMs:DAY},
  documentUploadHour:{scope:"document-upload-hour",limit:10,windowMs:HOUR},
  documentUploadDay:{scope:"document-upload-day",limit:25,windowMs:DAY},
  documentAccess:{scope:"document-access-10m",limit:60,windowMs:10*MINUTE},
  accountExport:{scope:"account-export-hour",limit:5,windowMs:HOUR},
  accountDelete:{scope:"account-delete-hour",limit:3,windowMs:HOUR},
  aiBurst:{scope:"ai-generation-10m",limit:8,windowMs:10*MINUTE}
} as const satisfies Record<string,RateLimitPolicy>;

export class RateLimitConfigurationError extends Error {}

function signingSecret(explicit?:string){
  const secret=explicit??process.env.AUTH_SECRET??process.env.NEXTAUTH_SECRET;
  if(!secret||secret.length<32)throw new RateLimitConfigurationError("A permanent authentication secret is required for privacy-safe rate limiting.");
  return secret;
}

export function rateLimitPrincipalHash(principal:string,secret?:string){return createHmac("sha256",signingSecret(secret)).update(`debrief-rate-limit-v1:${principal}`).digest("hex")}
export function rateLimitWindow(policy:RateLimitPolicy,now=Date.now()){
  const start=Math.floor(now/policy.windowMs)*policy.windowMs;
  return{windowStart:new Date(start),windowEndsAt:new Date(start+policy.windowMs),retryAfterSeconds:Math.max(1,Math.ceil((start+policy.windowMs-now)/1_000))};
}

function boundedLimit(name:string,fallback:number,max:number){
  const value=Number(process.env[name]);return Number.isSafeInteger(value)&&value>0&&value<=max?value:fallback;
}

export function aiUserDailyPolicy():RateLimitPolicy{return{scope:"ai-generation-user-day",limit:boundedLimit("DEBRIEF_AI_DAILY_USER_LIMIT",30,500),windowMs:DAY}}
export function aiGlobalDailyPolicy():RateLimitPolicy{return{scope:"ai-generation-global-day",limit:boundedLimit("DEBRIEF_AI_DAILY_GLOBAL_LIMIT",200,5_000),windowMs:DAY}}

export async function consumeRateLimits(principal:string,policies:readonly RateLimitPolicy[],now=Date.now()):Promise<RateLimitResult>{
  const principalHash=rateLimitPrincipalHash(principal);
  const results=await Promise.all(policies.map(async policy=>{
    const window=rateLimitWindow(policy,now);
    const bucket=await prisma.rateLimitBucket.upsert({where:{scope_principalHash_windowStart:{scope:policy.scope,principalHash,windowStart:window.windowStart}},create:{scope:policy.scope,principalHash,windowStart:window.windowStart,windowEndsAt:window.windowEndsAt,count:1},update:{count:{increment:1},windowEndsAt:window.windowEndsAt},select:{count:true}});
    return{allowed:bucket.count<=policy.limit,limit:policy.limit,remaining:Math.max(0,policy.limit-bucket.count),retryAfterSeconds:window.retryAfterSeconds,scope:policy.scope};
  }));
  if(now-lastCleanupAt>HOUR){lastCleanupAt=now;await prisma.rateLimitBucket.deleteMany({where:{windowEndsAt:{lt:new Date(now-RETENTION_MS)}}}).catch(reason=>console.error("Rate-limit cleanup failed",reason instanceof Error?reason.name:"UnknownError"))}
  const blocked=results.filter(result=>!result.allowed).sort((a,b)=>b.retryAfterSeconds-a.retryAfterSeconds)[0];
  if(blocked){console.warn(`[security-event] ${JSON.stringify({timestamp:new Date(now).toISOString(),event:"rate_limit_exceeded",scope:blocked.scope,retryAfterSeconds:blocked.retryAfterSeconds})}`);return blocked}
  return results.sort((a,b)=>a.remaining-b.remaining)[0]??{allowed:true,limit:0,remaining:0,retryAfterSeconds:0,scope:"none"};
}

export async function enforceAccountRateLimit(userId:string,policies:readonly RateLimitPolicy[],message="Too many requests. Please wait and try again."){
  try{
    const result=await consumeRateLimits(`user:${userId}`,policies);if(result.allowed)return null;
    return NextResponse.json({error:message},{status:429,headers:{"Cache-Control":"private, no-store","Retry-After":String(result.retryAfterSeconds),"X-RateLimit-Limit":String(result.limit),"X-RateLimit-Remaining":"0"}});
  }catch(reason){
    console.error("Durable rate limit failed",reason instanceof Error?reason.name:"UnknownError");
    return NextResponse.json({error:"The request could not be safely processed right now."},{status:503,headers:{"Cache-Control":"private, no-store"}});
  }
}
