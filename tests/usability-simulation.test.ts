import assert from "node:assert/strict";
import test from "node:test";
import { baselineFeatures, buildPersonas, runSimulation, sourceFeatures, summarize } from "../evals/run-usability-evals";

test("90 personas are balanced across the three requested cohorts and devices",()=>{
  const personas=buildPersonas();
  assert.equal(personas.length,90);
  for(const fluency of ["high","moderate","low"] as const){
    const cohort=personas.filter(persona=>persona.fluency===fluency);
    assert.equal(cohort.length,30);
    for(const device of ["mobile","tablet","desktop"] as const)assert.equal(cohort.filter(persona=>persona.device===device).length,10);
    assert.ok(new Set(cohort.map(persona=>persona.claimPath)).size===4);
    assert.ok(new Set(cohort.map(persona=>persona.evidence)).size===3);
    assert.ok(new Set(cohort.map(persona=>persona.information)).size===3);
  }
});

test("the simulation is deterministic and preserves one result per persona",()=>{
  const first=runSimulation(baselineFeatures);
  const second=runSimulation(baselineFeatures);
  assert.deepEqual(first,second);
  assert.equal(new Set(first.map(result=>result.persona.id)).size,90);
});

test("current accessibility affordances reduce low-fluency modeled friction",()=>{
  assert.ok(Object.values(sourceFeatures()).every(Boolean),"Every usability affordance represented by the current evaluation profile must remain present.");
  const baseline=summarize(runSimulation(baselineFeatures));
  const current=summarize(runSimulation(sourceFeatures()));
  const baselineLow=baseline.find(row=>row.cohort.includes("low"));
  const currentLow=current.find(row=>row.cohort.includes("low"));
  assert.ok(baselineLow&&currentLow);
  assert.ok(currentLow.helpRequests<=baselineLow.helpRequests);
  assert.ok(currentLow.backtracks<=baselineLow.backtracks);
  assert.ok(currentLow.incorrectSelections<=baselineLow.incorrectSelections);
});
