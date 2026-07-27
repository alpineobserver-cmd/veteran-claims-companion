import { createHmac } from "node:crypto";
import { securitySubkey } from "@/lib/key-derivation";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { emitSecurityEvent, securityEventErrorCode } from "@/lib/security-events";

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
  aiBurst:{scope:"ai-generation-10m",limit:8,windowMs:10*MINUTE},
  anonymousTemplateDraft:{scope:"anonymous-template-draft-10m",limit:12,windowMs:10*MINUTE},
  anonymousPackagePdf:{scope:"anonymous-package-pdf-10m",limit:8,windowMs:10*MINUTE}
} as const satisfies Record<string,RateLimitPolicy>;

export class RateLimitConfigurationError extends Error {}

export function rateLimitPrincipalHash(principal:string,secret?:string){return createHmac("sha256",securitySubkey("rate-limit-principal",secret)).update(`debrief-rate-limit-v1:${principal}`).digest("hex")}
export function rateLimitWindow(policy:RateLimitPolicy,now=Date.now()){
  const start=Math.floor(now/policy.windowMs)*policy.windowMs;
  return{windowStart:new Date(start),windowEndsAt:new Date(start+policy.windowMs),retryAfterSeconds:Math.max(1,Math.ceil((start+policy.windowMs-now)/1_000))};
}

function boundedLimit(name:string,fallback:number,max:number){
  const value=Number(process.env[name]);return Number.isSafeInteger(value)&&value>0&&value<=max?value:fallback;
}

export function aiUserDailyPolicy():RateLimitPolicy{return{scope:"ai-generation-user-day",limit:boundedLimit("DEBRIEF_AI_DAILY_USER_LIMIT",30,500),windowMs:DAY}}
export function aiGlobalDailyPolicy():RateLimitPolicy{return{scope:"ai-generation-global-day",limit:boundedLimit("DEBRIEF_AI_DAILY_GLOBAL_LIMIT",200,5_000),windowMs:DAY}}
export function aiUserDailyTokenPolicy():RateLimitPolicy{return{scope:"ai-token-user-day",limit:boundedLimit("DEBRIEF_AI_DAILY_USER_TOKEN_LIMIT",300_000,10_000_000),windowMs:DAY}}
export function aiGlobalDailyTokenPolicy():RateLimitPolicy{return{scope:"ai-token-global-day",limit:boundedLimit("DEBRIEF_AI_DAILY_GLOBAL_TOKEN_LIMIT",2_000_000,100_000_000),windowMs:DAY}}
export function aiDailySpendPolicy():RateLimitPolicy{return{scope:"ai-spend-reservation-global-day-cents",limit:boundedLimit("DEBRIEF_AI_DAILY_SPEND_CAP_CENTS",500,100_000),windowMs:DAY}}
export function aiMaxRequestCostCents(){return boundedLimit("DEBRIEF_AI_MAX_REQUEST_COST_CENTS",5,10_000)}
export function aiMaxOutputTokens(){return boundedLimit("DEBRIEF_AI_MAX_OUTPUT_TOKENS",2_000,8_000)}

function emitBudgetThreshold(policy:RateLimitPolicy,remaining:number,units:number){
  const used=policy.limit-remaining;
  for(const thresholdPercent of [80,95]){
    const threshold=Math.ceil(policy.limit*thresholdPercent/100);
    if(used>=threshold&&used-units<threshold)emitSecurityEvent("ai_budget_threshold_reached",{scope:policy.scope,thresholdPercent},"warn");
  }
}

export async function consumeUsageLimits(principal:string,policies:readonly RateLimitPolicy[],units=1,now=Date.now()):Promise<RateLimitResult>{
  if(!Number.isSafeInteger(units)||units<1)throw new RateLimitConfigurationError("Usage-limit units must be a positive whole number.");
  const principalHash=rateLimitPrincipalHash(principal);
  const results=await Promise.all(policies.map(async policy=>{
    const window=rateLimitWindow(policy,now);
    const bucket=await prisma.rateLimitBucket.upsert({where:{scope_principalHash_windowStart:{scope:policy.scope,principalHash,windowStart:window.windowStart}},create:{scope:policy.scope,principalHash,windowStart:window.windowStart,windowEndsAt:window.windowEndsAt,count:units},update:{count:{increment:units},windowEndsAt:window.windowEndsAt},select:{count:true}});
    const result={allowed:bucket.count<=policy.limit,limit:policy.limit,remaining:Math.max(0,policy.limit-bucket.count),retryAfterSeconds:window.retryAfterSeconds,scope:policy.scope};
    if(result.allowed&&(policy.scope.startsWith("ai-token-")||policy.scope.startsWith("ai-spend-")))emitBudgetThreshold(policy,result.remaining,units);
    return result;
  }));
  if(now-lastCleanupAt>HOUR){lastCleanupAt=now;await prisma.rateLimitBucket.deleteMany({where:{windowEndsAt:{lt:new Date(now-RETENTION_MS)}}}).catch(reason=>emitSecurityEvent("rate_limit_cleanup_failed",{code:securityEventErrorCode(reason)},"error"))}
  const blocked=results.filter(result=>!result.allowed).sort((a,b)=>b.retryAfterSeconds-a.retryAfterSeconds)[0];
  if(blocked){emitSecurityEvent("rate_limit_exceeded",{scope:blocked.scope,retryAfterSeconds:blocked.retryAfterSeconds},"warn");return blocked}
  return results.sort((a,b)=>a.remaining-b.remaining)[0]??{allowed:true,limit:0,remaining:0,retryAfterSeconds:0,scope:"none"};
}

export async function consumeRateLimits(principal:string,policies:readonly RateLimitPolicy[],now=Date.now()):Promise<RateLimitResult>{return consumeUsageLimits(principal,policies,1,now)}

export async function enforceAccountRateLimit(userId:string,policies:readonly RateLimitPolicy[],message="Too many requests. Please wait and try again."){
  return enforceAccountUsageLimit(userId,policies,1,message);
}

export async function enforceAccountUsageLimit(userId:string,policies:readonly RateLimitPolicy[],units:number,message="The configured usage limit has been reached. Please try again after the limit resets."){
  try{
    const result=await consumeUsageLimits(`user:${userId}`,policies,units);if(result.allowed)return null;
    return NextResponse.json({error:message},{status:429,headers:{"Cache-Control":"private, no-store","Retry-After":String(result.retryAfterSeconds),"X-RateLimit-Limit":String(result.limit),"X-RateLimit-Remaining":"0"}});
  }catch(reason){
    emitSecurityEvent("rate_limit_backend_failed",{code:securityEventErrorCode(reason)},"error");
    return NextResponse.json({error:"The request could not be safely processed right now."},{status:503,headers:{"Cache-Control":"private, no-store"}});
  }
}

function anonymousPrincipal(request:Request){
  const forwarded=request.headers.get("x-vercel-forwarded-for")||request.headers.get("x-forwarded-for")||"";
  const address=forwarded.split(",")[0]?.trim();
  return `ip:${address&&address.length<=128?address:"unknown"}`;
}

export async function enforceAnonymousRateLimit(request:Request,policies:readonly RateLimitPolicy[],message="Too many requests. Please wait before trying again."){
  // Local development has no durable service boundary and must not impersonate
  // a hosted rate-limit backend. Staging and Production always use the durable path.
  if(process.env.APP_ENV==="development")return null;
  try{
    const result=await consumeRateLimits(anonymousPrincipal(request),policies);if(result.allowed)return null;
    return NextResponse.json({error:message},{status:429,headers:{"Cache-Control":"private, no-store","Retry-After":String(result.retryAfterSeconds),"X-RateLimit-Limit":String(result.limit),"X-RateLimit-Remaining":"0"}});
  }catch(reason){
    emitSecurityEvent("rate_limit_backend_failed",{code:securityEventErrorCode(reason)},"error");
    return NextResponse.json({error:"The request could not be safely processed right now."},{status:503,headers:{"Cache-Control":"private, no-store"}});
  }
}
