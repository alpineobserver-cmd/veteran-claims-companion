import assert from "node:assert/strict";
import test from "node:test";
import { hasUnsupportedMedicalConclusion, statementSafetyIssues } from "../lib/ai-statement-safety";

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

test("the AI route applies output safety before it returns a ready statement",async()=>{
  const route=await import("node:fs/promises").then(({readFile})=>readFile(new URL("../app/api/ai/personal-statement/route.ts",import.meta.url),"utf8"));
  assert.match(route,/statementSafetyIssues\(statement\)/);
  assert.match(route,/status:"needs_information"/);
  assert.match(route,/will not return that wording as a ready-to-use statement/);
});
