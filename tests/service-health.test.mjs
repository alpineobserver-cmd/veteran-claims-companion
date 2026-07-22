import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("health endpoint and synthetic monitor preserve the privacy boundary",async()=>{
  const [route,script,record,statusPage,statusChecks,workflow]=await Promise.all([
    readFile(path.join(process.cwd(),"app/api/health/route.ts"),"utf8"),
    readFile(path.join(process.cwd(),"scripts/check-service-health.mjs"),"utf8"),
    readFile(path.join(process.cwd(),"docs/privacy-safe-monitoring.md"),"utf8"),
    readFile(path.join(process.cwd(),"app/status/page.tsx"),"utf8"),
    readFile(path.join(process.cwd(),"components/public-status-checks.tsx"),"utf8"),
    readFile(path.join(process.cwd(),".github/workflows/service-health-monitor.yml"),"utf8")
  ]);
  assert.match(route,/status:"ok",service:"debrief"/);assert.match(route,/Cache-Control":"no-store/);assert.doesNotMatch(route,/prisma|DATABASE_URL|BLOB_READ_WRITE_TOKEN|email|userId/);
  for(const endpoint of ["/api/health","/api/auth/providers","/api/auth/session"])assert.match(script,new RegExp(endpoint.replaceAll("/","\\/")));
  assert.doesNotMatch(script,/response\.text|authorization|cookie|requestId|userId|email/i);assert.match(record,/OPS-007 remains partially complete/);assert.equal((await stat(path.join(process.cwd(),".github/workflows/service-health-monitor.yml"))).isFile(),true);
  assert.match(statusPage,/does not read an account, claim, statement, or uploaded document/i);
  for(const endpoint of ["/api/health","/api/auth/providers","/api/auth/session"])assert.match(statusChecks,new RegExp(endpoint.replaceAll("/","\\/")));
  assert.doesNotMatch(statusChecks,/response\.text|authorization|cookie|userId|email/i);
  assert.match(workflow,/issues: write/);assert.match(workflow,/publish-health-alert/);assert.match(workflow,/Do not copy credentials, cookies, claim content/);
});
