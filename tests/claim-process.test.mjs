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
