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
