import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { ActiveStorageDeletionError, deleteStoredObjectReferencesAndVerify, deleteStoredObjectsAndVerify } from "../lib/account-deletion";
import { deleteObjectAndVerify, reconciliationErrorCode, reconciliationFingerprint } from "../lib/storage-reconciliation";
import type { StorageProvider, StoredFile } from "../lib/storage";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");
const secret="fictional-reconciliation-secret-longer-than-thirty-two";

function storage(initial:string[],stubborn=""):StorageProvider&{objects:Set<string>}{
  const objects=new Set(initial);
  return{name:"test-private",objects,async put(_file:Buffer,key:string){objects.add(key);return{key}},async get(key:string):Promise<StoredFile|null>{return objects.has(key)?{data:Buffer.from("fictional")}:null},async delete(key:string){if(key!==stubborn)objects.delete(key)}};
}

test("object deletion is verified rather than trusting the provider response",async()=>{
  const removable=storage(["remove-me"]);await deleteObjectAndVerify(removable,"remove-me");assert.equal(removable.objects.has("remove-me"),false);
  const stubborn=storage(["remains"],"remains");await assert.rejects(()=>deleteObjectAndVerify(stubborn,"remains"),/ObjectDeletionNotVerified/);
});

test("multi-object deletion attempts every key and reports only unresolved objects",async()=>{
  const provider=storage(["one","two","three"],"two");
  await assert.rejects(async()=>{
    try{await deleteStoredObjectsAndVerify(provider,["one","two","three"])}catch(reason){assert.ok(reason instanceof ActiveStorageDeletionError);assert.deepEqual(reason.failedKeys,["two"]);throw reason}
  },ActiveStorageDeletionError);
  assert.equal(provider.objects.has("one"),false);assert.equal(provider.objects.has("three"),false);
});

test("multi-provider deletion routes each object through its recorded provider",async()=>{
  const vercel=storage(["legacy"]);const google=storage(["new"]);
  const count=await deleteStoredObjectReferencesAndVerify(provider=>provider==="google-cloud-storage"?google:vercel,[{storageKey:"legacy",storageProvider:"vercel-private-blob"},{storageKey:"new",storageProvider:"google-cloud-storage"}]);
  assert.equal(count,2);assert.equal(vercel.objects.size,0);assert.equal(google.objects.size,0);
});

test("task fingerprints are deterministic, scoped, and reveal no storage identifiers",()=>{
  const input={userId:"fictional-user-a",operation:"DELETE_OBJECT" as const,scope:"upload-rollback",entityId:"claim-a",storageKey:"private/user-a/file.pdf",storageProvider:"google-cloud-storage"};
  const fingerprint=reconciliationFingerprint(input,secret);
  assert.equal(fingerprint,reconciliationFingerprint(input,secret));
  assert.notEqual(fingerprint,reconciliationFingerprint({...input,storageKey:"private/user-a/other.pdf"},secret));
  assert.notEqual(fingerprint,reconciliationFingerprint({...input,storageProvider:"vercel-private-blob"},secret));
  assert.match(fingerprint,/^[a-f0-9]{64}$/);assert.doesNotMatch(fingerprint,/user-a|file\.pdf/);
  assert.equal(reconciliationErrorCode(Object.assign(new Error("private detail"),{name:"BlobDeleteError"})),"BlobDeleteError");
});

test("durable reconciliation records are indexed, provider-routed, retryable, and privacy-safe in logs",async()=>{
  const [schema,migration,providerMigration,implementation,eventContract]=await Promise.all([read("prisma/schema.prisma"),read("prisma/migrations/20260721203000_storage_reconciliation/migration.sql"),read("prisma/migrations/20260722190000_storage_provider_routing/migration.sql"),read("lib/storage-reconciliation.ts"),read("lib/security-events.ts")]);
  assert.match(schema,/model StorageReconciliationTask/);assert.match(schema,/fingerprint String @unique/);assert.match(schema,/@@index\(\[principalHash, status\]\)/);
  assert.match(migration,/CREATE TABLE "StorageReconciliationTask"/);
  assert.match(providerMigration,/ADD COLUMN "storageProvider" TEXT/);
  assert.match(providerMigration,/SET "storageProvider" = 'vercel-private-blob'/);
  assert.match(implementation,/storageProvider:input\.storageProvider/);
  assert.match(implementation,/storageReconciliationTask\.upsert/);assert.match(implementation,/retryUploadRollbackTasks/);assert.match(implementation,/emitSecurityEvent\("storage_reconciliation_pending"/);
  assert.match(implementation,/from "@\/lib\/security-events"/);
  assert.doesNotMatch(eventContract,/type SecurityEventDetails=\{[\s\S]*?(?:storageKey|entityId|userId|principalHash)[\s\S]*?\};/);
});

test("upload, document, workspace, and account deletion paths record and resolve partial failures",async()=>{
  const sources=await Promise.all(["app/api/documents/route.ts","app/api/documents/[id]/route.ts","app/api/claims/[id]/route.ts","app/api/account/route.ts"].map(read));
  for(const source of sources)assert.match(source,/recordStorageReconciliation/);
  assert.match(sources[0],/retryUploadRollbackTasks/);assert.match(sources[0],/scope:"upload-rollback"/);
  assert.match(sources[1],/resolveStorageReconciliation/);assert.match(sources[1],/DELETE_DATABASE_RECORD/);
  assert.match(sources[2],/Promise\.allSettled/);assert.match(sources[2],/orphanedUploads/);
  assert.match(sources[3],/storageReconciliationTask\.deleteMany/);assert.match(sources[3],/orphanedUploads/);
});

test("account export includes safe task metadata without private object keys",async()=>{
  const route=await read("app/api/account/export/route.ts");
  assert.match(route,/storageReconciliationTask\.findMany/);assert.match(route,/storageReconciliation/);
  assert.doesNotMatch(route,/storageReconciliationTask\.findMany\([^;]+storageKey:true/);
});
