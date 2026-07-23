import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { AI_GENERATION_POLICY_CURRENT, AI_GENERATION_POLICY_ROLLBACK, aiGenerationPolicies, selectedAiGenerationPolicy } from "../lib/ai-generation-policy";
import { initialAnswers, statementGaps } from "../lib/claim-builder-intelligence";
import { evaluateAiDraft } from "../evals/ai-evaluator";
import { claimScenarios } from "../evals/claim-scenarios";

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
  assert.match(questionnaire,/disabled=\{!allConfirmed\|\|downloading\}/);
});
