import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root=process.cwd();
const read=relative=>readFile(path.join(root,relative),"utf8");

test("public entry and sign-in disclose the product's independent educational boundary",async()=>{
  const [landing,login]=await Promise.all([read("app/page.tsx"),read("app/login/page.tsx")]);
  for(const source of [landing,login]){
    assert.match(source,/independent educational software/i);
    assert.match(source,/not VA or a VA-accredited representative/i);
    assert.match(source,/legal or medical advice/i);
  }
  assert.match(landing,/does not submit claims/i);
});

test("authenticated workspace navigation keeps the boundary and accredited-help route visible",async()=>{
  const shell=await read("components/app-shell.tsx");
  assert.match(shell,/Independent educational software/);
  assert.match(shell,/No legal or medical advice/);
  assert.match(shell,/https:\/\/www\.va\.gov\/get-help-from-accredited-representative\//);
});

test("terms explicitly reject affiliation, advice, representation, and submission",async()=>{
  const terms=await read("app/terms/page.tsx");
  for(const phrase of ["Self-directed educational software","No government affiliation or endorsement","No accredited representation","provide legal advice","submit a claim"]){
    assert.match(terms,new RegExp(phrase,"i"),phrase);
  }
});

test("public support separates request types without collecting sensitive details",async()=>{
  const support=await read("app/support/page.tsx");
  for(const phrase of ["Account, privacy, or deletion","Security concern","Accessibility barrier","Outdated, broken, or incorrect content","General product feedback"]){
    assert.match(support,new RegExp(phrase,"i"),phrase);
  }
  assert.match(support,/PRIVACY_CONTACT_EMAIL/);
  assert.match(support,/Never send passwords/);
  assert.match(support,/medical records/);
  assert.doesNotMatch(support,/<form\b/i);
});

test("accessibility review process defines the WCAG 2.2 AA manual and release gate",async()=>{
  const process=await read("docs/accessibility-review-process.md");
  for(const phrase of ["WCAG 2.2 Level AA","Keyboard only","VoiceOver","200%","320 CSS pixels","Blocker and Critical findings stop promotion","fictional scenarios"]){
    assert.match(process,new RegExp(phrase,"i"),phrase);
  }
});

test("support operations minimize intake data and cover all request classes",async()=>{
  const process=await read("docs/support-and-correction-operations.md");
  for(const phrase of ["privacy, deletion, security, accessibility, content-correction","neutral request ID","Never ask for a password","Account and data","Critical until triage","retest before closure"]){
    assert.match(process,new RegExp(phrase,"i"),phrase);
  }
  assert.match(process,/Do not ask how the content applies to the reporter/);
});
