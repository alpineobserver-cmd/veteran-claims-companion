import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { aiDailySpendPolicy, aiGlobalDailyPolicy, aiGlobalDailyTokenPolicy, aiMaxOutputTokens, aiMaxRequestCostCents, aiUserDailyPolicy, aiUserDailyTokenPolicy, rateLimitPolicies, rateLimitPrincipalHash, rateLimitWindow } from "../lib/rate-limit";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");
const secret="fictional-permanent-test-secret-that-is-long-enough";

test("fixed windows align consistently and expose a positive retry interval",()=>{
  const policy={scope:"test",limit:2,windowMs:60_000};
  const result=rateLimitWindow(policy,125_500);
  assert.equal(result.windowStart.toISOString(),"1970-01-01T00:02:00.000Z");
  assert.equal(result.windowEndsAt.toISOString(),"1970-01-01T00:03:00.000Z");
  assert.equal(result.retryAfterSeconds,55);
});

test("principal keys are deterministic HMACs and do not retain account identifiers",()=>{
  const first=rateLimitPrincipalHash("user:fictional-account-a",secret);
  assert.equal(first,rateLimitPrincipalHash("user:fictional-account-a",secret));
  assert.notEqual(first,rateLimitPrincipalHash("user:fictional-account-b",secret));
  assert.match(first,/^[a-f0-9]{64}$/);
  assert.doesNotMatch(first,/fictional-account/);
});

test("AI cost ceilings use safe defaults and bounded explicit overrides",()=>{
  const keys=["DEBRIEF_AI_DAILY_USER_LIMIT","DEBRIEF_AI_DAILY_GLOBAL_LIMIT","DEBRIEF_AI_DAILY_USER_TOKEN_LIMIT","DEBRIEF_AI_DAILY_GLOBAL_TOKEN_LIMIT","DEBRIEF_AI_DAILY_SPEND_CAP_CENTS","DEBRIEF_AI_MAX_REQUEST_COST_CENTS","DEBRIEF_AI_MAX_OUTPUT_TOKENS"] as const;
  const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try{
    for(const key of keys)delete process.env[key];
    assert.equal(aiUserDailyPolicy().limit,30);assert.equal(aiGlobalDailyPolicy().limit,200);
    assert.equal(aiUserDailyTokenPolicy().limit,300_000);assert.equal(aiGlobalDailyTokenPolicy().limit,2_000_000);
    assert.equal(aiDailySpendPolicy().limit,500);assert.equal(aiMaxRequestCostCents(),5);assert.equal(aiMaxOutputTokens(),2_000);
    process.env.DEBRIEF_AI_DAILY_USER_LIMIT="12";process.env.DEBRIEF_AI_DAILY_GLOBAL_LIMIT="90";process.env.DEBRIEF_AI_DAILY_USER_TOKEN_LIMIT="120000";process.env.DEBRIEF_AI_DAILY_GLOBAL_TOKEN_LIMIT="900000";process.env.DEBRIEF_AI_DAILY_SPEND_CAP_CENTS="250";process.env.DEBRIEF_AI_MAX_REQUEST_COST_CENTS="3";process.env.DEBRIEF_AI_MAX_OUTPUT_TOKENS="1500";
    assert.equal(aiUserDailyPolicy().limit,12);assert.equal(aiGlobalDailyPolicy().limit,90);
    assert.equal(aiUserDailyTokenPolicy().limit,120_000);assert.equal(aiGlobalDailyTokenPolicy().limit,900_000);
    assert.equal(aiDailySpendPolicy().limit,250);assert.equal(aiMaxRequestCostCents(),3);assert.equal(aiMaxOutputTokens(),1_500);
    process.env.DEBRIEF_AI_DAILY_USER_LIMIT="0";process.env.DEBRIEF_AI_DAILY_GLOBAL_LIMIT="9000";
    assert.equal(aiUserDailyPolicy().limit,30);assert.equal(aiGlobalDailyPolicy().limit,200);
  }finally{
    for(const key of keys){const value=original[key];if(value===undefined)delete process.env[key];else process.env[key]=value}
  }
});

test("durable buckets are migration-backed, atomic, expiring, and privacy minimized",async()=>{
  const [schema,migration,implementation]=await Promise.all([read("prisma/schema.prisma"),read("prisma/migrations/20260721190000_durable_rate_limits/migration.sql"),read("lib/rate-limit.ts")]);
  assert.match(schema,/model RateLimitBucket/);
  assert.match(schema,/@@unique\(\[scope, principalHash, windowStart\]\)/);
  assert.match(migration,/CREATE UNIQUE INDEX "RateLimitBucket_scope_principalHash_windowStart_key"/);
  assert.match(implementation,/rateLimitBucket\.upsert/);
  assert.match(implementation,/count:\{increment:units\}/);
  assert.match(implementation,/Number\.isSafeInteger\(units\)/);
  assert.match(implementation,/rateLimitBucket\.deleteMany/);
  assert.match(implementation,/emitSecurityEvent\("rate_limit_exceeded"/);
  assert.doesNotMatch(implementation,/email|documentName|conditionName/);
});

test("high-risk authenticated routes enforce limits and paid AI has user and global ceilings",async()=>{
  const routes=await Promise.all([
    "app/api/claims/route.ts","app/api/claims/[id]/route.ts","app/api/claims/[id]/actions/route.ts",
    "app/api/claims/[id]/buddy-statements/route.ts","app/api/workspaces/route.ts","app/api/documents/route.ts",
    "app/api/documents/[id]/route.ts","app/api/documents/[id]/download-link/route.ts","app/api/documents/[id]/content/route.ts",
    "app/api/account/export/route.ts","app/api/account/route.ts"
  ].map(read));
  for(const source of routes)assert.match(source,/enforceAccountRateLimit/);
  const ai=await read("app/api/ai/personal-statement/route.ts");
  assert.match(ai,/rateLimitPolicies\.aiBurst/);
  assert.match(ai,/aiUserDailyPolicy\(\)/);
  assert.match(ai,/aiGlobalDailyPolicy\(\)/);
  assert.match(ai,/aiUserDailyTokenPolicy\(\)/);
  assert.match(ai,/aiGlobalDailyTokenPolicy\(\)/);
  assert.match(ai,/aiDailySpendPolicy\(\)/);
  assert.match(ai,/Buffer\.byteLength/);
  assert.match(ai,/max_output_tokens:maxOutputTokens/);
  assert.doesNotMatch(ai,/new Map/);
  assert.equal(rateLimitPolicies.documentUploadHour.limit,10);
  assert.equal(rateLimitPolicies.documentUploadDay.limit,25);
});

test("blocked requests are explicit, non-cacheable, and tell clients when to retry",async()=>{
  const source=await read("lib/rate-limit.ts");
  assert.match(source,/status:429/);
  assert.match(source,/"Retry-After"/);
  assert.match(source,/"X-RateLimit-Remaining":"0"/);
  assert.match(source,/"Cache-Control":"private, no-store"/);
  assert.match(source,/status:503/);
});
