import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root=process.cwd();const read=relative=>readFile(path.join(root,relative),"utf8");

test("tester lifecycle covers minimum access, consent, revocation, and deletion",async()=>{
  const lifecycle=await read("docs/alpha-tester-lifecycle.md");
  for(const phrase of ["neutral tester code","Alpha Terms version","Google Auth Platform","remove","sessions revoked","Permanently delete my account","Provider backup/log expiry"])assert.match(lifecycle,new RegExp(phrase,"i"),phrase);
  assert.match(lifecycle,/Do not place the restricted record in GitHub/);
});

test("secret inventory covers every application secret and separates environments",async()=>{
  const [inventory,example]=await Promise.all([read("docs/secret-inventory-and-rotation.md"),read(".env.example")]);
  const keys=[...example.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map(match=>match[1]);
  for(const key of ["DATABASE_URL","AUTH_SECRET","AUTH_GOOGLE_ID","AUTH_GOOGLE_SECRET","BLOB_READ_WRITE_TOKEN","OPENAI_API_KEY"])assert.match(inventory,new RegExp(`\\b${key}\\b`),key);
  for(const key of keys)assert.ok(inventory.includes(key)||["RELEASE_ID","OPENAI_MODEL","DEBRIEF_AI_DAILY_USER_LIMIT","DEBRIEF_AI_DAILY_GLOBAL_LIMIT"].includes(key),`Inventory must classify ${key} or explicitly exempt it in this test.`);
  assert.match(inventory,/Never use one `AUTH_SECRET`.*across Staging and Production/);
});

test("rotation and emergency procedures require redeploy, verification, and provider revocation",async()=>{
  const inventory=await read("docs/secret-inventory-and-rotation.md");
  assert.match(inventory,/Redeploy/);assert.match(inventory,/revoke the old provider credential/i);assert.match(inventory,/npm run test:release/);
  assert.match(inventory,/pending `StorageReconciliationTask`/);assert.match(inventory,/invalidate sessions/);assert.match(inventory,/incident-response and notification obligations/);
  assert.doesNotMatch(inventory,/postgres(?:ql)?:\/\/[^\s`]+:[^\s`]+@/i);
  assert.doesNotMatch(inventory,/sk-[A-Za-z0-9_-]{16,}/);
});

test("service objectives define measurable reliability and privacy boundaries",async()=>{
  const objectives=await read("docs/service-level-objectives.md");
  for(const phrase of ["Availability","99.5%","Sign-in success","98.0%","Save success","99.0%","Export success","Critical incident acknowledgement","within 1 hour","error budget","rolling 30-day"]){
    assert.match(objectives,new RegExp(phrase,"i"),phrase);
  }
  assert.match(objectives,/Do not record names, email addresses/);
  assert.match(objectives,/OPS-007 foundation now supplies/);
});

test("disaster recovery separates database, object, configuration, and approval evidence",async()=>{
  const runbook=await read("docs/backup-restore-and-disaster-recovery.md");
  for(const phrase of ["Prisma migrations","Supabase PostgreSQL","Vercel Blob","environment variables","new isolated project","invalidate them before allowing sign-in","Recovery acceptance record"]){
    assert.match(runbook,new RegExp(phrase,"i"),phrase);
  }
  assert.match(runbook,/does not restore Blob bytes/i);
  assert.match(runbook,/Do not record credentials, object keys, filenames, emails, claim facts, or document contents/i);
});
