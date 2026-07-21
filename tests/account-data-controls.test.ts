import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { ActiveStorageDeletionError, deleteStoredObjectsAndVerify } from "../lib/account-deletion";
import type { StorageProvider, StoredFile } from "../lib/storage";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");

function fakeStorage(initial:string[],stubborn=""):StorageProvider&{deleted:string[]}{
  const objects=new Set(initial);const deleted:string[]=[];
  return {name:"test-private-storage",deleted,async put(_file:Buffer,key:string){objects.add(key);return{key}},async get(key:string):Promise<StoredFile|null>{return objects.has(key)?{data:Buffer.from("fictional")}:null},async delete(key:string){deleted.push(key);if(key!==stubborn)objects.delete(key)}};
}

test("active object deletion deduplicates keys and verifies every removal",async()=>{
  const storage=fakeStorage(["one","two"]);
  assert.equal(await deleteStoredObjectsAndVerify(storage,["one","two","one"]),2);
  assert.deepEqual(storage.deleted,["one","two"]);
  const stubborn=fakeStorage(["remains"],"remains");
  await assert.rejects(()=>deleteStoredObjectsAndVerify(stubborn,["remains"]),ActiveStorageDeletionError);
});

test("account export is authenticated, owner-scoped, comprehensive, and excludes credentials",async()=>{
  const route=await read("app/api/account/export/route.ts");
  assert.match(route,/await auth\(\)/);
  assert.match(route,/where:\{id:session\.user\.id\}/);
  for(const relation of ["accounts","sessions","claims","conditions","evidence","answers","progressItems","statements","documents","pages","uploads","auditEvents"])assert.match(route,new RegExp(`${relation}:`),relation);
  for(const secret of ["access_token:true","refresh_token:true","id_token:true","sessionToken:true","passwordHash:true","storageKey:true"])assert.doesNotMatch(route,new RegExp(secret),secret);
  assert.match(route,/binaryFilesIncluded:false/);
  assert.match(route,/securityCounters/);
  assert.match(route,/rateLimitPrincipalHash/);
  assert.doesNotMatch(route,/securityCounters[^;]+principalHash:true/);
  assert.match(route,/Content-Disposition/);
  assert.match(route,/"Cache-Control":"private, no-store"/);
  assert.match(route,/"X-Content-Type-Options":"nosniff"/);
});

test("account deletion covers current and legacy objects and verifies database removal",async()=>{
  const route=await read("app/api/account/route.ts");
  assert.match(route,/rejectCrossOriginMutation\(request\)/);
  assert.match(route,/prisma\.document\.findMany\(\{where:\{userId:session\.user\.id\}/);
  assert.match(route,/prisma\.upload\.findMany\(\{where:\{userId:session\.user\.id\}/);
  assert.match(route,/deleteStoredObjectsAndVerify/);
  assert.match(route,/transaction\.rateLimitBucket\.deleteMany/);
  assert.match(route,/transaction\.user\.deleteMany/);
  assert.match(route,/prisma\.user\.findUnique/);
  assert.match(route,/activeDatabaseDeletion:"verified"/);
  assert.match(route,/activeObjectDeletion:"verified"/);
  assert.match(route,/Clear-Site-Data/);
  assert.match(route,/Provider backups and security logs may remain/);
});

test("account UI explains export exclusions and backup limits",async()=>{
  const [page,controls]=await Promise.all([read("app/account/page.tsx"),read("components/account-controls.tsx")]);
  assert.match(page,/href="\/api\/account\/export"/);
  assert.match(page,/Authentication tokens, session tokens, private storage keys/);
  assert.match(page,/Provider backups and security logs may remain/);
  assert.match(controls,/debrief-deletion-receipt/);
});
