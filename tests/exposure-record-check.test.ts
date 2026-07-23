import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  dutyLocations, exposureConcerns, findExposureMatches, serviceEras,
  type ExposureKey, type LocationKey
} from "../lib/exposure-record-check";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");

test("matching stays cautious and covers the relevant official resources",()=>{
  const locations=dutyLocations.map(item=>item.key) as LocationKey[];
  const exposures=exposureConcerns.map(item=>item.key) as ExposureKey[];
  const matches=findExposureMatches("post911",locations,exposures);
  const names=matches.map(match=>match.name);
  for(const expected of [
    "Airborne Hazards and Open Burn Pit Registry",
    "Gulf War Registry",
    "Agent Orange Registry",
    "Ionizing Radiation Registry",
    "Depleted Uranium Follow-Up Program",
    "Toxic Embedded Fragment Surveillance Center",
    "Military Environmental Exposure Assessment",
    "Individual Longitudinal Exposure Record"
  ])assert.ok(names.includes(expected),expected);
  assert.equal(new Set(names).size,names.length);
});

test("recent Southwest Asia service preserves the current Gulf and burn-pit registry path",()=>{
  const matches=findExposureMatches("recent",["southwest-asia"],["burn-pits"]);
  assert.ok(matches.some(match=>match.name==="Gulf War Registry"));
  assert.ok(matches.some(match=>match.name==="Airborne Hazards and Open Burn Pit Registry"));
  assert.ok(matches.some(match=>match.name==="Individual Longitudinal Exposure Record"));
});

test("the ILER information route is included without promising direct access",()=>{
  for(const era of serviceEras){
    const record=findExposureMatches(era.key,["other"],[]).find(match=>match.kind==="Record");
    assert.ok(record);
    assert.match(record.reason,/Access depends on current service or Veteran access rules/);
    assert.equal(new URL(record.href).hostname,"www.health.mil");
  }
});

test("every generated destination is an official VA or military-health HTTPS host",()=>{
  const matches=findExposureMatches("post911",dutyLocations.map(item=>item.key),exposureConcerns.map(item=>item.key));
  for(const match of matches){
    const url=new URL(match.href);
    assert.equal(url.protocol,"https:");
    assert.ok(url.hostname==="www.health.mil"||url.hostname==="health.mil"||url.hostname==="va.gov"||url.hostname.endsWith(".va.gov"),`${match.name}: ${url.hostname}`);
  }
});

test("the interface preserves the fictional-data and no-confirmation boundaries",async()=>{
  const [component,page,shell,css]=await Promise.all([
    read("components/exposure-record-check.tsx"),
    read("app/exposure-record-check/page.tsx"),
    read("components/app-shell.tsx"),
    read("app/exposure-record-check/exposure-record-check.css")
  ]);
  assert.match(component,/Use fictional details only/);
  assert.match(component,/Answers stay on this page and are not saved or sent/);
  assert.match(component,/A possible match is not confirmation/);
  assert.match(component,/Registry evaluations are separate from disability compensation exams and claims/);
  assert.doesNotMatch(component,/\bfetch\(|localStorage|sessionStorage/);
  assert.match(component,/target="_blank" rel="noreferrer"/);
  assert.match(component,/stageHeadingRef\.current\?\.focus\(\)/);
  assert.match(page,/does not verify an exposure, registry enrollment, health condition, or eligibility/i);
  assert.match(shell,/\["exposures", "Exposure record", "\/exposure-record-check", Radar, true\]/);
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/min-width:0/);
  assert.match(css,/@media\(prefers-reduced-motion:no-preference\)/);
});
