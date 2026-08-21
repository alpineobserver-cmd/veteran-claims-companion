import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {createReworkPackagePdf} from "../lib/rework-package-pdf";
import {createApprovedPackageSnapshot,reworkStateSchema,reworkStateWithinLimit,type SavedState} from "../lib/rework-state";

const read=(relative:string)=>readFile(path.join(process.cwd(),relative),"utf8");
const state:SavedState={
  screen:"package",services:[{id:"service-1",service:"Air Force",kind:"Duty station",location:"Fictional base",role:"Maintainer",start:"2011-01-01",end:"2015-01-01",approximate:false,exposures:"Fictional noise"}],
  events:[{id:"health-1",type:"Injury",title:"Right knee injury",date:"2013",approximate:true,details:"Fictional training event.",care:"Clinic visit.",impact:"Pain on stairs."}],
  documents:[],sources:[],leads:[],claims:[{id:"claim-1",title:"Right knee symptoms",path:"original",progress:100,sourceIds:[],documentIds:[],updated:"Now",milestone:"Statement reviewed",draft:{serviceEvent:"Training event",currentSymptoms:"Pain",diagnosis:"",relationship:"Began after event",dailyImpact:"Stairs",treatmentHistory:"Clinic",verifiedSourceIds:[],statementReviewed:true}}],
  approved:false,briefingSeen:true,packageKind:"original",buddyDecision:"not-needed",approvalSections:["foundation","claims","records","package"],approvalChanges:[],packages:[],activePackageId:"package-1",onboardingComplete:true,selectedClaimId:"claim-1"
};

test("rework state accepts a bounded complete package and rejects unbounded content",()=>{
  assert.equal(reworkStateSchema.safeParse(state).success,true);
  assert.equal(reworkStateWithinLimit(state),true);
  assert.equal(reworkStateWithinLimit({...state,events:[{...state.events[0],details:"x".repeat(600_000)}]}),false);
});

test("approved package extraction preserves the reviewed package and shared foundation",()=>{
  const snapshot=createApprovedPackageSnapshot(state,"package-1","2026-08-19T12:00:00.000Z");
  assert.ok(snapshot);assert.equal(snapshot.packageKind,"original");assert.equal(snapshot.claims.length,1);assert.equal(snapshot.services.length,1);assert.deepEqual(snapshot.approvalSections,["foundation","claims","records","package"]);
  const pdf=createReworkPackagePdf(snapshot,"a".repeat(64));
  assert.equal(pdf.subarray(0,8).toString("ascii"),"%PDF-1.4");
  assert.match(pdf.toString("ascii"),/APPROVED CLAIM PACKAGE/);
  assert.match(pdf.toString("ascii"),/aaaaaaaaaaaaaaaa/);
});

test("rework persistence routes are private, owner-scoped, bounded, and conflict-aware",async()=>{
  const [stateRoute,approvalRoute,downloadRoute,migration]=await Promise.all([
    read("app/api/rework-state/route.ts"),read("app/api/rework-packages/[packageId]/approve/route.ts"),read("app/api/rework-packages/[packageId]/download/route.ts"),read("prisma/migrations/20260819120000_rework_account_persistence/migration.sql")
  ]);
  for(const route of [stateRoute,approvalRoute,downloadRoute]){assert.match(route,/await auth\(\)/);assert.match(route,/session\.user\.id/);assert.match(route,/private, no-store/)}
  for(const route of [stateRoute,approvalRoute]){assert.match(route,/rejectCrossOriginMutation\(request\)/);assert.match(route,/hasAcceptableContentLength/);assert.match(route,/enforceAccountRateLimit/)}
  assert.match(stateRoute,/updateMany\(\{where:\{userId:session\.user\.id,version:/);
  assert.match(approvalRoute,/reworkPackageSnapshot\.create/);assert.match(approvalRoute,/P2002/);
  assert.match(downloadRoute,/userId_packageId:\{userId:session\.user\.id,packageId\}/);assert.match(downloadRoute,/Content-Disposition/);assert.match(downloadRoute,/X-Debrief-Snapshot-Checksum/);
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/g);assert.doesNotMatch(migration,/FORCE ROW LEVEL SECURITY/);
  for(const role of ["anon","authenticated","service_role"])assert.match(migration,new RegExp(`'${role}'`));
});
