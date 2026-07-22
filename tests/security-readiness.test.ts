import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { contentSecurityPolicy } from "../lib/content-security-policy";
import { securityEventRecord } from "../lib/security-events";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");

function prismaFields(schema:string){
  const result:string[]=[];
  const modelPattern=/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  for(const model of schema.matchAll(modelPattern)){
    const modelName=model[1];
    for(const rawLine of model[2].split("\n")){
      const line=rawLine.trim();
      if(!line||line.startsWith("@@")||line.startsWith("//"))continue;
      const field=line.match(/^(\w+)\s+/)?.[1];
      if(field)result.push(`${modelName}.${field}`);
    }
  }
  return result;
}

test("the data inventory covers every current Prisma field and required system boundary",async()=>{
  const [schema,inventory]=await Promise.all([read("prisma/schema.prisma"),read("docs/data-inventory-and-flow.md")]);
  const missing=prismaFields(schema).filter((field)=>!inventory.includes(`\`${field}\``));
  assert.deepEqual(missing,[],`Document these Prisma fields: ${missing.join(", ")}`);
  for(const required of[
    "vcc-claim-draft","vcc-claim-workspaces","Supabase PostgreSQL","Vercel private Blob",
    "Google OAuth","Vercel application runtime","Support email provider","OpenAI Responses API",
    "Provider-controlled backup"
  ])assert.match(inventory,new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  assert.match(inventory,/not approval to process real medical or claimant information/i);
});

test("the internal threat model records trust boundaries, abuse cases, and unresolved review gates",async()=>{
  const model=await read("docs/threat-model.md");
  for(const required of["Trust boundaries","TM-01","TM-17","localStorage","OAuth provider tokens","malware","backup","independent penetration"])
    assert.match(model,new RegExp(required,"i"));
  assert.match(model,/real-data authorization/i);
});

test("the incident package contains response ownership, targets, playbooks, and fictional tabletop exercises",async()=>{
  const plan=await read("docs/incident-response-and-tabletop.md");
  for(const required of["Incident commander","Privacy/legal lead","Critical","one hour","notification","credential","cross-account","malware","AI","Exercise A","Exercise B","Exercise C","Exercise D","entirely fictional"])
    assert.match(plan,new RegExp(required,"i"));
  assert.match(plan,/qualified legal/i);
});

test("security events are fixed-schema, redacted, and contain no caller-supplied identifiers",()=>{
  const originalEnvironment=process.env.DATA_ENVIRONMENT;
  const originalRelease=process.env.RELEASE_ID;
  try{
    process.env.DATA_ENVIRONMENT="staging";
    process.env.RELEASE_ID="fictional-release";
    const record=securityEventRecord("auth_error",{
      code:"person@example.com",
      provider:"google",
      operation:"AUTH_CALLBACK",
      scope:"sign-in",
      retryAfterSeconds:60,
      isNewUser:false,
      userId:"fictional-user",
      storageKey:"private/file.pdf",
      token:"secret-value"
    } as never,new Date("2026-07-22T00:00:00.000Z"));
    assert.deepEqual(Object.keys(record).sort(),[
      "code","environment","event","isNewUser","operation","provider","release","retryAfterSeconds","scope","source","timestamp"
    ]);
    assert.equal(record.code,"redacted");
    assert.equal(record.environment,"staging");
    assert.equal(record.release,"fictional-release");
    assert.equal(record.source,"debrief-security");
    assert.doesNotMatch(JSON.stringify(record),/fictional-user|file\.pdf|secret-value|example\.com/);
  }finally{
    if(originalEnvironment===undefined)delete process.env.DATA_ENVIRONMENT;else process.env.DATA_ENVIRONMENT=originalEnvironment;
    if(originalRelease===undefined)delete process.env.RELEASE_ID;else process.env.RELEASE_ID=originalRelease;
  }
});

test("security-relevant runtime output is routed through the single event formatter",async()=>{
  const files=[
    "auth.ts","lib/auth-audit.ts","lib/rate-limit.ts","lib/storage-reconciliation.ts",
    "app/api/account/route.ts","app/api/ai/personal-statement/route.ts","app/api/claims/[id]/route.ts",
    "app/api/documents/route.ts","app/api/documents/[id]/route.ts","app/api/documents/[id]/content/route.ts",
    "app/api/documents/[id]/download-link/route.ts"
  ];
  for(const file of files){
    const source=await read(file);
    assert.doesNotMatch(source,/console\.(?:log|info|warn|error)\(/,`${file} bypasses the security event formatter`);
  }
  const contract=await read("lib/security-events.ts");
  assert.match(contract,/JSON\.stringify\(securityEventRecord/);
  assert.match(contract,/console\.(?:info|warn|error)\(/);
  assert.doesNotMatch(contract,/userId\??:|accountId\??:|documentId\??:|claimId\??:|storageKey\??:|email\??:|token\??:/);
});

test("the CSP narrows production behavior while recording the framework compatibility residual",async()=>{
  const production=contentSecurityPolicy(false);
  const development=contentSecurityPolicy(true);
  for(const directive of["script-src-attr 'none'","media-src 'none'","manifest-src 'self'","frame-src 'none'","upgrade-insecure-requests"])
    assert.match(production,new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  assert.doesNotMatch(production,/unsafe-eval/);
  assert.match(development,/unsafe-eval/);
  assert.doesNotMatch(development,/upgrade-insecure-requests/);
  assert.match(production,/script-src[^;]*unsafe-inline/);
  const record=await read("docs/content-security-policy.md");
  assert.match(record,/explicit residual risk/i);
  assert.match(record,/nonces require[\s\S]*dynamic rendering/i);
});
