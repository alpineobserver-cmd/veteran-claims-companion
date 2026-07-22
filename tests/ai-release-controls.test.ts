import assert from "node:assert/strict";
import test from "node:test";
import { AI_GENERATION_POLICY_CURRENT, AI_GENERATION_POLICY_ROLLBACK, aiGenerationPolicies, selectedAiGenerationPolicy } from "../lib/ai-generation-policy";
import { evaluateAiDraft } from "../evals/ai-evaluator";
import { claimScenarios } from "../evals/claim-scenarios";

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
