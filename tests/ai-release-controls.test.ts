import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { AI_GENERATION_POLICY_CURRENT, AI_GENERATION_POLICY_ROLLBACK, aiGenerationPolicies, selectedAiGenerationPolicy } from "../lib/ai-generation-policy";
import { initialAnswers, statementGaps } from "../lib/claim-builder-intelligence";
import { evaluateAiDraft } from "../evals/ai-evaluator";
import { claimScenarios } from "../evals/claim-scenarios";
import { generationAuditEntry, generationSourceReferences, updateLatestGenerationDisposition } from "../lib/generation-audit";

const root=process.cwd();const read=(relative:string)=>readFile(path.join(root,relative),"utf8");

test("current and rollback prompt policies are explicit and selectable",()=>{
  assert.equal(selectedAiGenerationPolicy()?.version,AI_GENERATION_POLICY_CURRENT);
  assert.equal(selectedAiGenerationPolicy(AI_GENERATION_POLICY_ROLLBACK)?.status,"rollback");
  assert.equal(selectedAiGenerationPolicy("unknown"),null);
  for(const policy of Object.values(aiGenerationPolicies))assert.match(policy.instructions,/Never invent, infer, embellish, or fill gaps/);
});

test("the evaluator rejects invented conclusions and cross-claim leakage",()=>{
  const scenario=claimScenarios.find(item=>item.id==="original-migraines")!;
  const unsafe=`${scenario.expected.draftIncludes.join(". ")}. Service caused this condition and I should receive 50%. Field exercises.`;
  const result=evaluateAiDraft(scenario,unsafe,["field exercises"]);
  assert.equal(result.scores.unsupportedClaims,0);
  assert.equal(result.scores.tone,0);
  assert.equal(result.scores.crossConditionIsolation,0);
});

test("missing essential facts produce focused questions before any drafting path",async()=>{
  const gaps=statementGaps({...initialAnswers,claimType:"Original or new claim"});
  assert.ok(gaps.length>0);
  assert.ok(gaps.length<=4);
  assert.ok(gaps.every(item=>item.field&&item.question&&item.reason));
  const route=await read("app/api/ai/personal-statement/route.ts");
  const gapCheck=route.indexOf("if(gaps.length)return");
  assert.ok(gapCheck>0);
  assert.ok(gapCheck<route.indexOf("const policy=selectedAiGenerationPolicy()",gapCheck));
  assert.match(route,/status:"needs_information"/);
  assert.match(route,/Debrief will not invent the missing facts/);
});

test("drafting UI supports regenerate, edit, version, restore, and section verification",async()=>{
  const questionnaire=await read("components/claim-questionnaire.tsx");
  for(const control of ["Rebuild guided narrative","Regenerate cohesive draft","Editable personal statement","Reject draft","Save version","Restore saved version","Review and confirm"])assert.match(questionnaire,new RegExp(control));
  assert.match(questionnaire,/setStatement\(event\.target\.value\);setMode\("edited"\)/);
  assert.match(questionnaire,/setStatement\(""\);setMode\(""\)/);
  assert.match(questionnaire,/disabled=\{!allConfirmed\|\|citationGaps\.length>0\|\|downloading\}/);
});

test("generation history records operational references without copying source text",()=>{
  const input={condition:"Fictional migraines",symptoms:"Fictional light sensitivity",statementName:"Fictional Veteran",empty:"",timeline:[{id:"private-id",date:"2020",title:"Symptoms began",details:"Fictional detail",source:"recollection",approximate:true}]};
  const references=generationSourceReferences(input);
  assert.deepEqual(references,["answer:condition","answer:symptoms","timeline:1"]);
  assert.doesNotMatch(JSON.stringify(references),/Fictional|private-id|Veteran|2020/);
  const ready=generationAuditEntry({id:"generation-1",feature:"personal_statement",mode:"template",model:"guided-template",policyVersion:"personal-statement-v1",sourceReferences:references,createdAt:"2026-07-24T10:00:00.000Z",completedAt:"2026-07-24T10:00:01.000Z",resultStatus:"ready"});
  assert.equal(ready.userDisposition,"pending_review");
  assert.equal(updateLatestGenerationDisposition([ready],"accepted","2026-07-24T10:05:00.000Z")[0].userDisposition,"accepted");
});

test("generation audit UI and privacy contract remain observable",async()=>{
  const [route,questionnaire,guide]=await Promise.all([read("app/api/ai/personal-statement/route.ts"),read("components/claim-questionnaire.tsx"),read("docs/generation-audit-trail.md")]);
  for(const field of ["mode","model","policyVersion","sourceReferences","createdAt","completedAt","resultStatus"])assert.match(route,new RegExp(field));
  for(const disposition of ["accepted","rejected","regenerated","edited","saved","downloaded","exported"])assert.match(questionnaire,new RegExp(`\"${disposition}\"`));
  assert.match(questionnaire,/For privacy, this history records field names and timeline positions/);
  for(const excluded of ["Questionnaire answer text","Generated or edited statement text","Document names, contents","Provider request or response bodies"])assert.match(guide,new RegExp(excluded));
});
