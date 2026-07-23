import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root=process.cwd();
const read=relative=>readFile(path.join(root,relative),"utf8");

test("claim details require an intent-to-file checkpoint",async()=>{
  const [questionnaire,intelligence]=await Promise.all([
    read("components/claim-questionnaire.tsx"),
    read("lib/claim-builder-intelligence.ts"),
  ]);
  assert.match(questionnaire,/Have you submitted an intent to file for disability compensation\?/);
  assert.match(questionnaire,/step === 2 \? Boolean\(answers\.intentToFileStatus\)/);
  for(const status of ["submitted","online_started","not_submitted","not_sure"])assert.match(intelligence,new RegExp(`\\b${status}\\b`));
  assert.match(questionnaire,/type="date" value=\{answers\.intentToFileDate\}/);
});

test("intent-to-file guidance is cautious and links to VA",async()=>{
  const [questionnaire,changelog]=await Promise.all([
    read("components/claim-questionnaire.tsx"),
    read("lib/changelog.ts"),
  ]);
  assert.match(questionnaire,/potential effective date/i);
  assert.match(questionnaire,/within one year/i);
  assert.match(questionnaire,/does not establish entitlement or guarantee retroactive payment/i);
  assert.match(questionnaire,/https:\/\/www\.va\.gov\/resources\/your-intent-to-file-a-va-claim\//);
  assert.match(questionnaire,/https:\/\/www\.va\.gov\/forms\/21-0966\//);
  assert.match(changelog,/Added an intent-to-file checkpoint/);
});

test("condition review exports retain the intent-to-file checkpoint",async()=>{
  const [questionnaire,route,pdf]=await Promise.all([
    read("components/claim-questionnaire.tsx"),
    read("app/api/claim-package/route.ts"),
    read("lib/claim-package-pdf.ts"),
  ]);
  for(const source of [questionnaire,route,pdf]){
    assert.match(source,/intentToFileStatus/);
    assert.match(source,/intentToFileDate/);
  }
  assert.match(pdf,/VA determines the effective date/);
});

test("claim package exposes a complete statement workflow without the redundant metric strip",async()=>{
  const [page,questionnaire,buddy,intake]=await Promise.all([
    read("app/claim-package/page.tsx"),
    read("components/claim-questionnaire.tsx"),
    read("app/buddy-statement/page.tsx"),
    read("components/document-intake.tsx"),
  ]);
  assert.doesNotMatch(page,/className="package-summary"/);
  assert.match(page,/Personal statement/);
  assert.match(page,/Buddy statements/);
  assert.match(page,/Review and download/);
  assert.match(page,/section=statement/);
  assert.match(page,/section=package/);
  assert.match(questionnaire,/initialSection/);
  for(const source of [page,buddy,intake])assert.match(source,/Return to Claim Builder/);
});

test("claim verification gives signed-in and device-only users the correct next action",async()=>{
  const questionnaire=await read("components/claim-questionnaire.tsx");
  assert.match(questionnaire,/signedIn=\{Boolean\(user\)\}/);
  assert.match(questionnaire,/Use “Add to claim package” below/);
  assert.match(questionnaire,/Use “Save statement” below to keep this fictional draft on this device/);
  assert.match(questionnaire,/Ready to save on this device/);
});

test("condition discovery hides empty systems and connects guides to code paths",async()=>{
  const [library,page]=await Promise.all([
    read("components/condition-library.tsx"),
    read("app/conditions/page.tsx"),
  ]);
  assert.match(library,/const populatedSystems=bodySystems\.filter/);
  assert.match(library,/Diagnostic-code paths/);
  assert.match(library,/conditionSlugs\.includes\(condition\.slug\)/);
  assert.match(library,/href=\{code\.sourceUrl\}/);
  assert.match(page,/Start with the body system/);
});

test("public entry and dashboard use one restrained visual surface",async()=>{
  const [landing,landingCss,theme]=await Promise.all([
    read("app/page.tsx"),
    read("app/landing.css"),
    read("app/theme.css"),
  ]);
  assert.doesNotMatch(landing,/landing-steps/);
  assert.match(landingCss,/background:#e8ebe6/);
  assert.doesNotMatch(theme,/Dashboard command center/);
  assert.doesNotMatch(theme,/\.main:has\(>\.dashboard-content\)/);
});
