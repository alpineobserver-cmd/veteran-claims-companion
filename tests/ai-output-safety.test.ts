import assert from "node:assert/strict";
import test from "node:test";
import { hasUnsupportedMedicalConclusion, statementSafetyIssues, unsupportedSourcePhrases } from "../lib/ai-statement-safety";

test("AI output safety blocks an un-attributed medical causation claim",()=>{
  const statement="My sleep apnea was caused by my PTSD symptoms during service.";
  assert.equal(hasUnsupportedMedicalConclusion(statement),true);
  const issues=statementSafetyIssues(statement);
  assert.equal(issues.length,1);
  assert.equal(issues[0]?.field,"secondaryRelationship");
});

test("AI output safety permits a clearly attributed medical opinion",()=>{
  const statement="My pulmonologist documented that my sleep apnea was caused by the PTSD-related sleep disruption.";
  assert.equal(hasUnsupportedMedicalConclusion(statement),false);
  assert.deepEqual(statementSafetyIssues(statement),[]);
});

test("AI output safety blocks stronger wording that is absent from the source",()=>{
  const statement="My symptoms worsened significantly and continued despite treatment.";
  const source={worsening:"My symptoms became more frequent.",treatment:"I use prescribed medication."};
  assert.deepEqual(unsupportedSourcePhrases(statement,source),["significantly","despite treatment"]);
  const issues=statementSafetyIssues(statement,source);
  assert.equal(issues.length,1);
  assert.equal(issues[0]?.id,"unsupported-source-wording");
  assert.equal(issues[0]?.field,"additionalContext");
});

test("AI output safety allows source-sensitive wording when the user supplied it",()=>{
  const statement="My symptoms worsened significantly despite treatment.";
  const source={additionalContext:"My symptoms worsened significantly despite treatment."};
  assert.deepEqual(statementSafetyIssues(statement,source),[]);
});

test("the AI route applies output safety before it returns a ready statement",async()=>{
  const route=await import("node:fs/promises").then(({readFile})=>readFile(new URL("../app/api/ai/personal-statement/route.ts",import.meta.url),"utf8"));
  assert.match(route,/statementSafetyIssues\(statement,modelInput\)/);
  assert.match(route,/status:"needs_information"/);
  assert.match(route,/will not return it as a ready-to-use statement/);
});
