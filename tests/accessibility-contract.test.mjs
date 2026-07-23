import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root=process.cwd();
const read=relative=>readFile(path.join(root,relative),"utf8");

test("the document declares its language",async()=>{
  assert.match(await read("app/layout.tsx"),/<html lang="en">/);
});

test("mobile navigation traps background interaction and restores focus",async()=>{
  const shell=await read("components/app-shell.tsx");
  assert.match(shell,/aria-controls="app-sidebar"/);
  assert.match(shell,/aria-hidden=\{mobileLayout&&!menuOpen\?true:undefined\}/);
  assert.match(shell,/inert=\{mobileLayout&&!menuOpen\?true:undefined\}/);
  assert.match(shell,/inert=\{menuOpen\?true:undefined\}/);
  assert.match(shell,/openMenuRef\.current\?\.focus\(\)/);
  assert.match(shell,/closeMenuRef\.current\?\.focus\(\)/);
  assert.match(shell,/removeEventListener\("change",update\)/);
});

test("questionnaire exposes progress and descriptive step names",async()=>{
  const [questionnaire,css]=await Promise.all([read("components/claim-questionnaire.tsx"),read("app/claim-builder/claim-builder.css")]);
  assert.match(questionnaire,/role="progressbar"/);
  assert.match(questionnaire,/aria-valuenow=\{progress\}/);
  assert.match(questionnaire,/aria-current=\{i===step\?"step":undefined\}/);
  assert.match(questionnaire,/aria-label=\{`Step \$\{i\+1\} of \$\{steps\.length\}: \$\{label\}/);
  assert.match(questionnaire,/Scroll sideways to see every step/);
  assert.match(css,/@media\(max-width:900px\).*\.step-list-hint\{display:flex/s);
  assert.match(questionnaire,/prefers-reduced-motion: reduce/);
});

test("global accessibility styles preserve focus, contrast, touch targets, and reduced motion",async()=>{
  const css=await read("app/accessibility.css");
  assert.match(css,/:focus-visible/);
  assert.match(css,/outline:3px solid/);
  assert.match(css,/min-height:24px/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test("mobile application chrome does not force horizontal overflow",async()=>{
  const [shell,banner]=await Promise.all([read("app/shell.css"),read("app/deployment-banner.css")]);
  assert.match(shell,/\.search-wrap\{min-width:0\}/);
  assert.match(shell,/\.sidebar-legal\{[^}]*flex-wrap:wrap[^}]*max-width:100%/);
  assert.match(shell,/@media\(max-width:620px\).*\.notifications-wrap\{display:none\}/s);
  assert.match(banner,/@media\(max-width:620px\).*font-size:10px/s);
});

test("primary routes provide distinct titles without duplicating the Debrief suffix",async()=>{
  const routes=["dashboard","intake","claim-builder","claim-package","conditions","forms","changelog","buddy-statement","account","login","support","status"];
  for(const route of routes){
    const source=await read(`app/${route}/page.tsx`);
    assert.match(source,/export const metadata:Metadata=\{[\s\S]*?title:"[^"]+"/,route);
    assert.doesNotMatch(source,/title:"[^"]+\| Debrief"/,route);
  }
});
