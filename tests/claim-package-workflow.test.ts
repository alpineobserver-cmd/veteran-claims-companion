import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { claimDraftSchema } from "../lib/claim-drafts";
import { evidenceChecklist, packageReadiness, packageStatuses, validatePackageClaim, validatePackageEnvironment } from "../lib/claim-package-workflow";
import { buddyStatementGaps, createBuddyStatement } from "../lib/buddy-statement";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");

function completeDraft(){
  return {
    answers:{condition:"Migraines",otherCondition:"",claimType:"Original or new claim",intentToFileStatus:"submitted",intentToFileDate:"2026-07-01",diagnosis:"Evaluated by a clinician",symptoms:"Head pain and light sensitivity",onset:"2020",branch:"Army",role:"Fictional role",serviceEvent:"Symptoms started during a fictional training period in 2020",exposures:"",treatment:"Medication",providers:"Fictional clinic",evidence:["Service treatment records"],statementName:"Fictional Veteran",continuity:"Ongoing",specificExamples:"I stopped a household task and rested in a dark room.",additionalContext:"",previousDecision:"",previousEvaluation:"",worsening:"",worseningDate:"",primaryCondition:"",secondaryRelationship:"",clinicianDiscussion:"",symptomFrequency:"Twice per month",symptomDuration:"Four hours",flareUps:"",workImpact:"Interrupted tasks",dailyImpact:"Required rest",conditionDetail1:"Two attacks per month",conditionDetail2:"Light sensitivity",conditionDetail3:"Interrupted tasks",conditionDetail4:"Headache log"},
    step:10,furthestStep:10,statement:"Personal statement heading\n\nI experienced fictional migraine symptoms beginning in 2020.",statementMode:"edited" as const,
    timeline:[{id:"timeline-1",date:"2020",title:"Symptoms began",details:"Fictional symptoms began",source:"Personal recollection",approximate:true}],
    evidenceMap:{current:{status:"personal_recollection" as const,source:"Personal statement"},onset:{status:"personal_recollection" as const,source:"Personal statement"},service:{status:"personal_recollection" as const,source:"Personal statement"},function:{status:"personal_recollection" as const,source:"Personal statement"},treatment:{status:"record_available" as const,source:"VA treatment records"}},
    confirmations:{"0":true,"1":true},documentLinks:{treatment:["fictional-document-1"]},statementVersions:[{id:"version-1",content:"Earlier fictional version",mode:"edited" as const,createdAt:"2026-07-20T10:00:00.000Z"}],packageStatus:"reviewed" as const,packageStatusUpdatedAt:"2026-07-20T10:00:00.000Z"
  };
}

test("package workflow accepts document links, revision history, and lifecycle status",()=>{
  const draft=completeDraft();
  assert.equal(claimDraftSchema.safeParse(draft).success,true);
  assert.deepEqual(packageStatuses,["planned","requested","obtained","reviewed","exported","submitted"]);
  const checklist=evidenceChecklist(draft,"Migraines");
  assert.deepEqual(checklist.find(item=>item.id==="treatment")?.documentIds,["fictional-document-1"]);
});

test("package validation blocks stale or unverified statements without predicting an outcome",()=>{
  const stale={...completeDraft(),statementMode:"stale" as const,confirmations:{"0":true}};
  const findings=validatePackageClaim(stale,"Migraines");
  assert.equal(packageReadiness(findings),"needs_work");
  assert.ok(findings.some(item=>item.id==="statement-stale"&&item.level==="blocker"));
  assert.ok(findings.some(item=>item.id==="verification"&&item.level==="blocker"));
  assert.equal(findings.some(item=>/eligible|rating percentage|approval/i.test(item.detail)),false);
});

test("package-wide validation catches duplicate uploads and stale form verification",()=>{
  const checks=validatePackageEnvironment([{sha256:"same",originalName:"record-a.pdf"},{sha256:"same",originalName:"record-copy.pdf"}],"January 1, 2026",new Date("2026-07-20T00:00:00.000Z"));
  assert.ok(checks.some(item=>item.id==="duplicate-files"));
  assert.ok(checks.some(item=>item.id==="stale-forms"&&item.level==="blocker"));
});

test("buddy drafting requires firsthand context and does not invent missing facts",()=>{
  const incomplete={witnessName:"",relationship:"Former unit member",knownSince:"",observations:"Observed fictional headaches",specificExample:"",changes:""};
  assert.deepEqual(buddyStatementGaps(incomplete),["How long the witness has known the veteran","One specific firsthand example"]);
  const statement=createBuddyStatement("Migraines",{...incomplete,knownSince:"Since 2018",specificExample:"During a fictional event, I saw the veteran stop activity and rest."});
  assert.match(statement,/personally observed/i);
  assert.match(statement,/true and correct to the best of my knowledge/i);
  assert.doesNotMatch(statement,/diagnos|service connect|rating|eligible/i);
});

test("package workspace exposes sources, lifecycle tracking, official submission links, and caveats",async()=>{
  const [page,questionnaire,pdf,actions,buddyPage,buddyRoute]=await Promise.all([read("app/claim-package/page.tsx"),read("components/claim-questionnaire.tsx"),read("lib/claim-package-pdf.ts"),read("app/api/claims/[id]/actions/route.ts"),read("components/buddy-statement-builder.tsx"),read("app/api/claims/[id]/buddy-statements/route.ts")]);
  assert.match(page,/Evidence checklist and sources/);
  assert.match(page,/Debrief does not collect VA credentials, submit a claim, or verify receipt/);
  assert.match(page,/https:\/\/www\.va\.gov\/disability\/how-to-file-claim\//);
  assert.match(page,/Marked submitted/);
  assert.match(questionnaire,/Uploaded files linked to this fact/);
  assert.match(questionnaire,/Revision history/);
  assert.match(pdf,/Uploaded document links/);
  assert.match(buddyPage,/The witness—not the veteran—must confirm/);
  assert.match(buddyRoute,/buddyStatementGaps/);
  for(const action of ["archive","restore","duplicate","package_status"])assert.match(actions,new RegExp(`"${action}"`));
});
