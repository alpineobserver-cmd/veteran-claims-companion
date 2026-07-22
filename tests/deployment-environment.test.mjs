import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root=process.cwd();

function validate(overrides){
  return spawnSync(process.execPath,["scripts/validate-deployment-env.mjs"],{
    cwd:root,
    encoding:"utf8",
    env:{PATH:process.env.PATH,HOME:process.env.HOME,...overrides},
  });
}

test("staging cannot deploy without an explicit staging data boundary",()=>{
  const result=validate({APP_ENV:"staging",AUTH_URL:"https://staging.example.test",AUTH_CANONICAL_HOST:"staging.example.test"});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/DATA_ENVIRONMENT=staging/);
});

test("staging accepts its own data and authentication boundary",()=>{
  const result=validate({APP_ENV:"staging",DATA_ENVIRONMENT:"staging",AUTH_URL:"https://staging.example.test",AUTH_CANONICAL_HOST:"staging.example.test"});
  assert.equal(result.status,0,result.stderr);
});

test("production rejects a staging data label",()=>{
  const result=validate({APP_ENV:"production",DATA_ENVIRONMENT:"staging"});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Production must use DATA_ENVIRONMENT=production/);
});

test("deployment rejects unsafe AI cost ceilings",()=>{
  for(const overrides of [
    {DEBRIEF_AI_DAILY_USER_LIMIT:"0"},
    {DEBRIEF_AI_DAILY_USER_LIMIT:"1.5"},
    {DEBRIEF_AI_DAILY_GLOBAL_LIMIT:"5001"},
  ]){
    const result=validate(overrides);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/DEBRIEF_AI_DAILY_(USER|GLOBAL)_LIMIT/);
  }
  const safe=validate({DEBRIEF_AI_DAILY_USER_LIMIT:"30",DEBRIEF_AI_DAILY_GLOBAL_LIMIT:"200"});
  assert.equal(safe.status,0,safe.stderr);
});

test("hosted Google Cloud Storage requires keyless workload identity configuration",()=>{
  const incomplete=validate({APP_ENV:"staging",DATA_ENVIRONMENT:"staging",AUTH_URL:"https://staging.example.test",AUTH_CANONICAL_HOST:"staging.example.test",DOCUMENT_STORAGE_PROVIDER:"gcs"});
  assert.notEqual(incomplete.status,0);
  assert.match(incomplete.stderr,/GCS_BUCKET/);
  assert.match(incomplete.stderr,/GCS_AUTH_MODE=vercel-oidc/);
  const complete=validate({APP_ENV:"staging",DATA_ENVIRONMENT:"staging",AUTH_URL:"https://staging.example.test",AUTH_CANONICAL_HOST:"staging.example.test",DOCUMENT_STORAGE_PROVIDER:"gcs",GCS_AUTH_MODE:"vercel-oidc",GCS_BUCKET:"fictional-staging",GCP_PROJECT_ID:"fictional-project",GCP_PROJECT_NUMBER:"123456789",GCP_SERVICE_ACCOUNT_EMAIL:"debrief-staging@fictional-project.iam.gserviceaccount.com",GCP_WORKLOAD_IDENTITY_POOL_ID:"vercel-staging",GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID:"vercel"});
  assert.equal(complete.status,0,complete.stderr);
});

test("hosted environments prohibit ephemeral local document storage",()=>{
  const result=validate({APP_ENV:"production",DATA_ENVIRONMENT:"production",DOCUMENT_STORAGE_PROVIDER:"local"});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/cannot use local document storage/);
});

test("the root layout includes a server-rendered non-production banner",async()=>{
  const [layout,banner]=await Promise.all([
    readFile(path.join(root,"app/layout.tsx"),"utf8"),
    readFile(path.join(root,"components/deployment-banner.tsx"),"utf8"),
  ]);
  assert.match(layout,/<DeploymentBanner\/>/);
  assert.match(banner,/environment==="production"/);
  assert.match(banner,/Development build — fictional data only/);
  assert.match(banner,/Release \{deployment\.release\}/);
});
