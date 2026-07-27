import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { claimDraftSchema } from "../lib/claim-drafts";
import { evidenceChecklist, packageReadiness, packageStatuses, validatePackageClaim, validatePackageEnvironment } from "../lib/claim-package-workflow";
import { buddyStatementGaps, createBuddyStatement, deriveBuddyStatementProvenance } from "../lib/buddy-statement";
import { deriveStatementProvenance, statementProvenanceSummary } from "../lib/statement-provenance";
import { guidedDraft } from "../lib/personal-statement-template";
import { createClaimPackagePdf } from "../lib/claim-package-pdf";
import { claimScenarios } from "../evals/claim-scenarios";
import { compareStatementVersions } from "../lib/statement-version-comparison";
import { POST as createClaimPackageResponse } from "../app/api/claim-package/route";
import { recordCitationGaps, statementFactSourceKind } from "../lib/statement-source-labels";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");

function completeDraft(){
  return {
    answers:{condition:"Migraines",otherCondition:"",claimType:"Original or new claim",intentToFileStatus:"submitted" as const,intentToFileDate:"2026-07-01",diagnosis:"Evaluated by a clinician",symptoms:"Head pain and light sensitivity",onset:"2020",branch:"Army",role:"Fictional role",serviceEvent:"Symptoms started during a fictional training period in 2020",exposures:"",treatment:"Medication",providers:"Fictional clinic",evidence:["Service treatment records"],statementName:"Fictional Veteran",continuity:"Ongoing",specificExamples:"I stopped a household task and rested in a dark room.",additionalContext:"",previousDecision:"",previousEvaluation:"",worsening:"",worseningDate:"",primaryCondition:"",secondaryRelationship:"",clinicianDiscussion:"",symptomFrequency:"Twice per month",symptomDuration:"Four hours",flareUps:"",workImpact:"Interrupted tasks",dailyImpact:"Required rest",conditionDetail1:"Two attacks per month",conditionDetail2:"Light sensitivity",conditionDetail3:"Interrupted tasks",conditionDetail4:"Headache log"},
    step:10,furthestStep:10,statement:"Personal statement heading\n\nI experienced fictional migraine symptoms beginning in 2020.",statementMode:"edited" as const,
    timeline:[{id:"timeline-1",date:"2020",title:"Symptoms began",details:"Fictional symptoms began",source:"Personal recollection",approximate:true}],
    evidenceMap:{current:{status:"personal_recollection" as const,source:"Personal statement"},onset:{status:"personal_recollection" as const,source:"Personal statement"},service:{status:"personal_recollection" as const,source:"Personal statement"},function:{status:"personal_recollection" as const,source:"Personal statement"},treatment:{status:"record_available" as const,source:"VA treatment records"}},
    confirmations:{"0":true,"1":true},documentLinks:{treatment:["fictional-document-1"]},documentCitations:{treatment:{"fictional-document-1":"p. 4, assessment"}},statementVersions:[{id:"version-1",content:"Earlier fictional version",mode:"edited" as const,createdAt:"2026-07-20T10:00:00.000Z"}],packageStatus:"reviewed" as const,packageStatusUpdatedAt:"2026-07-20T10:00:00.000Z"
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

test("record-supported statement facts require a location for every linked upload",()=>{
  const draft=completeDraft();
  const statement=guidedDraft({...draft.answers,timeline:draft.timeline});
  const provenance=deriveStatementProvenance(statement,draft.answers,draft.timeline);
  assert.deepEqual(recordCitationGaps(provenance,draft.evidenceMap,draft.documentLinks,{}),[{factId:"treatment",documentId:"fictional-document-1"}]);
  assert.deepEqual(recordCitationGaps(provenance,draft.evidenceMap,draft.documentLinks,draft.documentCitations),[]);
  const missing={...draft,statement,statementProvenance:provenance,documentCitations:{}};
  assert.ok(validatePackageClaim(missing,"Migraines").some(item=>item.id==="record-citations"&&item.level==="blocker"));
});

test("statement facts retain distinct veteran, witness, and record labels",()=>{
  const answerOrigin={kind:"answer" as const,label:"Answer",excerpt:"Example",factId:"function"};
  assert.equal(statementFactSourceKind(answerOrigin,{function:{status:"personal_recollection",source:""}}),"user");
  assert.equal(statementFactSourceKind(answerOrigin,{function:{status:"witness_statement",source:"Buddy statement"}}),"witness");
  assert.equal(statementFactSourceKind(answerOrigin,{function:{status:"record_available",source:"Treatment record"}}),"record");
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
  const input={...incomplete,knownSince:"Since 2018",specificExample:"During a fictional event, I saw the veteran stop activity and rest."};
  const provenance=deriveBuddyStatementProvenance("Migraines",input,statement);
  assert.equal(provenance.paragraphs.some(paragraph=>paragraph.status==="unmapped"),false);
  assert.ok(provenance.paragraphs.some(paragraph=>paragraph.fields.includes("observations")));
  assert.ok(provenance.paragraphs.some(paragraph=>paragraph.status==="template"));
  const edited=deriveBuddyStatementProvenance("Migraines",input,`${statement}\n\nThis unrelated sentence was manually added.`);
  assert.equal(edited.paragraphs.at(-1)?.status,"unmapped");
});

test("package workspace exposes sources, lifecycle tracking, official submission links, and caveats",async()=>{
  const [page,questionnaire,pdf,actions,buddyPage,buddyRoute]=await Promise.all([read("app/claim-package/page.tsx"),read("components/claim-questionnaire.tsx"),read("lib/claim-package-pdf.ts"),read("app/api/claims/[id]/actions/route.ts"),read("components/buddy-statement-builder.tsx"),read("app/api/claims/[id]/buddy-statements/route.ts")]);
  assert.match(page,/Evidence checklist and sources/);
  assert.match(page,/Debrief does not collect VA credentials, submit a claim, or verify receipt/);
  assert.match(page,/https:\/\/www\.va\.gov\/disability\/how-to-file-claim\//);
  assert.match(page,/Marked submitted/);
  assert.match(questionnaire,/Uploaded files that support this fact/);
  assert.match(questionnaire,/Revision history/);
  assert.match(questionnaire,/Saved version and current draft/);
  assert.match(questionnaire,/Hide comparison/);
  assert.match(pdf,/Uploaded document links/);
  assert.match(buddyPage,/The witness—not the veteran—must confirm/);
  assert.match(buddyRoute,/buddyStatementGaps/);
  assert.match(buddyRoute,/deriveBuddyStatementProvenance/);
  assert.match(await read("components/buddy-statement-builder.tsx"),/Where this witness draft came from/);
  for(const action of ["archive","restore","duplicate","package_status"])assert.match(actions,new RegExp(`"${action}"`));
});

test("statement revision comparison reports meaningful saved-to-current changes",()=>{
  const changed=compareStatementVersions("I rest in a dark room.","I usually rest in a dark and quiet room.");
  assert.deepEqual(changed,{identical:false,savedWords:6,currentWords:9,addedWords:3,removedWords:0,savedParagraphs:1,currentParagraphs:1});
  const identical=compareStatementVersions("First section.\n\nSecond section.","First section.\n\nSecond section.");
  assert.equal(identical.identical,true);
  assert.equal(identical.savedParagraphs,2);
  assert.equal(identical.addedWords,0);
  assert.equal(identical.removedWords,0);
});

test("guided statements retain sentence-level answer and timeline provenance",()=>{
  const draft=completeDraft();
  const answers=draft.answers;
  const statement=guidedDraft({...answers,timeline:draft.timeline});
  const first=deriveStatementProvenance(statement,answers,draft.timeline);
  const second=deriveStatementProvenance(statement,answers,draft.timeline);
  assert.deepEqual(first,second,"the same saved facts must produce the same source trace");
  assert.deepEqual(statementProvenanceSummary(first),{total:first.sentences.length,mapped:first.sentences.length,unmapped:0});
  assert.ok(first.sentences.some(sentence=>sentence.origins.some(origin=>origin.field==="symptoms"&&origin.factId==="function")));
  assert.ok(first.sentences.some(sentence=>sentence.origins.some(origin=>origin.field==="serviceEvent"&&origin.factId==="service")));
});

test("all draft-ready fictional claim baselines have a complete guided source trace",()=>{
  const ready=claimScenarios.filter(scenario=>scenario.expected.gaps.length===0);
  const failures=ready.flatMap(scenario=>{
    const statement=guidedDraft({...scenario.answers,timeline:scenario.timeline});
    const summary=statementProvenanceSummary(deriveStatementProvenance(statement,scenario.answers,scenario.timeline));
    return summary.unmapped?[`${scenario.id}: ${summary.unmapped} unmapped`]:[];
  });
  assert.equal(ready.length,33);
  assert.deepEqual(failures,[]);
});

test("new unsupported wording is marked for review and preserved with revisions",()=>{
  const draft=completeDraft();
  const answers=draft.answers;
  const statement=`${guidedDraft({...answers,timeline:draft.timeline})}\n\nThis sentence was added without a supporting answer.`;
  const provenance=deriveStatementProvenance(statement,answers,draft.timeline);
  assert.equal(provenance.sentences.at(-1)?.status,"unmapped");
  assert.deepEqual(provenance.sentences.at(-1)?.origins,[]);
  const stored={...draft,statement,statementMode:"ai" as const,statementProvenance:provenance,statementVersions:[{id:"version-source-1",content:statement,mode:"ai" as const,createdAt:"2026-07-21T12:00:00.000Z",provenance}]};
  assert.equal(claimDraftSchema.safeParse(stored).success,true);
  assert.ok(validatePackageClaim(stored,"Migraines").some(item=>item.id==="statement-sources-unmapped"&&item.level==="blocker"));
});

test("condition review PDF carries the statement source trace and related file names",()=>{
  const draft=completeDraft();
  const answers=draft.answers;
  const statement=guidedDraft({...answers,timeline:draft.timeline});
  const statementProvenance=deriveStatementProvenance(statement,answers,draft.timeline);
  const pdf=createClaimPackagePdf({condition:answers.condition,claimType:answers.claimType,intentToFileStatus:answers.intentToFileStatus,intentToFileDate:answers.intentToFileDate,name:answers.statementName,statement,statementMode:"template",statementProvenance,timeline:draft.timeline,evidenceMap:draft.evidenceMap,selectedEvidence:answers.evidence,linkedDocuments:[{factId:"treatment",documentId:"fictional-document-1",documentName:"fictional-treatment-record.pdf",pageReference:"p. 4, assessment"}],qualityFindings:[]}).toString("ascii");
  assert.match(pdf,/STATEMENT SOURCES/);
  assert.match(pdf,/Health history - current symptoms/);
  assert.match(pdf,/fictional-treatment-record\.pdf/);
  assert.match(pdf,/Guided-template wording/);
  assert.match(pdf,/Record-derived fact/);
  assert.match(pdf,/Record citation: fictional-treatment-record\.pdf - p\. 4, assessment/);
  assert.match(pdf,/A citation helps locate a/);
});

test("claim-package endpoint fails closed when the anonymous rate-limit service is unavailable",async()=>{
  const draft=completeDraft();
  const statement=guidedDraft({...draft.answers,timeline:draft.timeline});
  const body=JSON.stringify({
    condition:draft.answers.condition,
    claimType:draft.answers.claimType,
    intentToFileStatus:draft.answers.intentToFileStatus,
    intentToFileDate:draft.answers.intentToFileDate,
    name:draft.answers.statementName,
    statement,
    statementMode:"template",
    statementProvenance:deriveStatementProvenance(statement,draft.answers,draft.timeline),
    timeline:draft.timeline,
    evidenceMap:draft.evidenceMap,
    selectedEvidence:draft.answers.evidence,
    linkedDocuments:[{factId:"treatment",documentId:"fictional-document-1",documentName:"fictional-treatment-record.pdf",pageReference:"p. 4, assessment"}],
    qualityFindings:[]
  });
  const response=await createClaimPackageResponse(new Request("https://debrief.test/api/claim-package",{
    method:"POST",
    headers:{"content-type":"application/json","content-length":String(Buffer.byteLength(body)),"origin":"https://debrief.test"},
    body
  }));
  assert.equal(response.status,503);
  assert.match((await response.json() as {error:string}).error,/safely processed/i);
});

test("claim-package endpoint rejects a relied-on uploaded record without a precise citation",async()=>{
  const draft=completeDraft();
  const statement=guidedDraft({...draft.answers,timeline:draft.timeline});
  const body=JSON.stringify({
    condition:draft.answers.condition,claimType:draft.answers.claimType,intentToFileStatus:draft.answers.intentToFileStatus,intentToFileDate:draft.answers.intentToFileDate,name:draft.answers.statementName,statement,statementMode:"template",
    statementProvenance:deriveStatementProvenance(statement,draft.answers,draft.timeline),timeline:draft.timeline,evidenceMap:draft.evidenceMap,selectedEvidence:draft.answers.evidence,
    linkedDocuments:[{factId:"treatment",documentId:"fictional-document-1",documentName:"fictional-treatment-record.pdf",pageReference:""}],qualityFindings:[]
  });
  const response=await createClaimPackageResponse(new Request("https://debrief.test/api/claim-package",{method:"POST",headers:{"content-type":"application/json","content-length":String(Buffer.byteLength(body)),"origin":"https://debrief.test"},body}));
  assert.equal(response.status,400);
  assert.match((await response.json() as {error:string}).error,/page or section reference/i);
});

test("browser download and step-change accessibility contracts remain observable",async()=>{
  const [questionnaire,css]=await Promise.all([read("components/claim-questionnaire.tsx"),read("app/claim-builder/claim-builder.css")]);
  assert.match(questionnaire,/document\.body\.appendChild\(link\)/);
  assert.match(questionnaire,/window\.setTimeout\(\(\)=>URL\.revokeObjectURL\(url\),1_000\)/);
  assert.match(questionnaire,/Condition review PDF downloaded/);
  for(const label of ["Veteran-provided fact","Witness observation","Record-derived fact","AI-drafted wording"])assert.match(questionnaire,new RegExp(label));
  assert.match(questionnaire,/Page or section reference/);
  assert.match(questionnaire,/role="status" aria-live="polite"/);
  assert.match(questionnaire,/questionCardRef\.current\?\.focus\(\)/);
  assert.match(questionnaire,/tabIndex=\{-1\}/);
  assert.match(questionnaire,/aria-label=\{`Step \$\{step\+1\} of \$\{steps\.length\}: \$\{steps\[step\]\}`\}/);
  assert.match(css,/\.question-card:focus\{outline:3px solid var\(--gold\)/);
});
