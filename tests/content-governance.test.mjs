import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root=process.cwd();
function run(files,approved="false",required="true"){
  return spawnSync(process.execPath,["scripts/check-content-governance.mjs"],{cwd:root,encoding:"utf8",env:{...process.env,CONTENT_CHANGED_FILES:files,CONTENT_REVIEW_REQUIRED:required,CONTENT_REVIEW_APPROVED:approved}});
}

test("ordinary code changes do not require a content approval",()=>{
  assert.equal(run("app/status/page.tsx").status,0);
});

test("protected content requires both a changelog and human review label",()=>{
  const missingBoth=run("lib/conditions.ts");assert.notEqual(missingBoth.status,0);assert.match(missingBoth.stderr,/public changelog/);assert.match(missingBoth.stderr,/content-reviewed/);
  const missingReview=run("lib/conditions.ts,lib/changelog.ts");assert.notEqual(missingReview.status,0);assert.match(missingReview.stderr,/content-reviewed/);
  assert.equal(run("lib/conditions.ts,lib/changelog.ts","true").status,0);
});

test("authority monitor is read-only and governance is documented",async()=>{
  const [script,record,workflow,runbook]=await Promise.all([
    readFile(path.join(root,"scripts/check-authority-updates.mjs"),"utf8"),
    readFile(path.join(root,"docs/content-change-governance.md"),"utf8"),
    readFile(path.join(root,".github/workflows/content-authority-monitor.yml"),"utf8"),
    readFile(path.join(root,"docs/backup-restore-and-disaster-recovery.md"),"utf8")
  ]);
  assert.doesNotMatch(script,/writeFile|appendFile|unlink|rmSync|fetch\([^)]*method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
  for(const phrase of ["review trigger","never as an automated publishing system","content-reviewed","public changelog"])assert.match(record,new RegExp(phrase,"i"));
  assert.match(workflow,/schedule:/);assert.match(workflow,/Automated publication is prohibited/);
  for(const phrase of ["fictional Alpha data only","restoration to a new isolated project","Vercel Blob","SHA-256","completed, dated isolated restore drill"])assert.match(runbook,new RegExp(phrase,"i"));
  assert.equal((await stat(path.join(root,"config/content-authorities.json"))).isFile(),true);
});
