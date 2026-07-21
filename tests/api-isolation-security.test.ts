import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { rejectCrossOriginMutation } from "../lib/request-security";
import { rateLimitPrincipalHash } from "../lib/rate-limit";

const root=process.cwd();const read=(relative:string)=>readFile(path.join(root,relative),"utf8");

test("cross-origin mutation protection accepts same-origin and rejects a foreign origin",()=>{
  assert.equal(rejectCrossOriginMutation(new Request("https://debrief.test/api/claims",{method:"POST",headers:{origin:"https://debrief.test"}})),null);
  const rejected=rejectCrossOriginMutation(new Request("https://debrief.test/api/claims",{method:"POST",headers:{origin:"https://attacker.test"}}));
  assert.equal(rejected?.status,403);
});

test("two fictional users produce isolated security principals",()=>{
  const secret="fictional-two-user-security-secret-that-is-long-enough";
  const userA=rateLimitPrincipalHash("user:fictional-a",secret);const userB=rateLimitPrincipalHash("user:fictional-b",secret);
  assert.notEqual(userA,userB);assert.equal(userA.length,64);assert.equal(userB.length,64);
});

test("every private resource route authenticates and applies the session user to data access",async()=>{
  const privateRoutes=[
    "app/api/claims/route.ts","app/api/claims/[id]/route.ts","app/api/claims/[id]/actions/route.ts","app/api/claims/[id]/buddy-statements/route.ts",
    "app/api/workspaces/route.ts","app/api/documents/route.ts","app/api/documents/[id]/route.ts","app/api/documents/[id]/download-link/route.ts","app/api/documents/[id]/content/route.ts",
    "app/api/account/route.ts","app/api/account/export/route.ts"
  ];
  for(const route of privateRoutes){const source=await read(route);assert.match(source,/await auth\(\)/,route);assert.match(source,/session\.user\.id/,route)}
  for(const route of privateRoutes.filter(route=>!route.includes("account"))){const source=await read(route);assert.match(source,/userId:\s*session\.user\.id/,route)}
});

test("all authenticated mutation routes enforce same-origin checks and durable abuse controls",async()=>{
  const mutationRoutes=[
    "app/api/claims/route.ts","app/api/claims/[id]/route.ts","app/api/claims/[id]/actions/route.ts","app/api/claims/[id]/buddy-statements/route.ts",
    "app/api/workspaces/route.ts","app/api/documents/route.ts","app/api/documents/[id]/route.ts","app/api/documents/[id]/download-link/route.ts","app/api/account/route.ts"
  ];
  for(const route of mutationRoutes){const source=await read(route);assert.match(source,/rejectCrossOriginMutation\(request\)/,route);assert.match(source,/enforceAccountRateLimit/,route)}
});

test("upload/parser, cross-user download, deletion, and abuse suites remain in the release gate",async()=>{
  const packageJson=JSON.parse(await read("package.json"));
  assert.match(packageJson.scripts["test:storage"],/document-upload-security/);
  assert.match(packageJson.scripts["test:storage"],/document-storage-security/);
  assert.match(packageJson.scripts["test:data-controls"],/account-data-controls/);
  assert.match(packageJson.scripts["test:rate-limit"],/durable-rate-limit/);
  assert.match(packageJson.scripts["test:release"],/test:api-security/);
});
