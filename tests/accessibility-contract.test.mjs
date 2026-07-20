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
  const questionnaire=await read("components/claim-questionnaire.tsx");
  assert.match(questionnaire,/role="progressbar"/);
  assert.match(questionnaire,/aria-valuenow=\{progress\}/);
  assert.match(questionnaire,/aria-current=\{i===step\?"step":undefined\}/);
  assert.match(questionnaire,/aria-label=\{`Step \$\{i\+1\} of \$\{steps\.length\}: \$\{label\}/);
  assert.match(questionnaire,/prefers-reduced-motion: reduce/);
});

test("global accessibility styles preserve focus, contrast, touch targets, and reduced motion",async()=>{
  const css=await read("app/accessibility.css");
  assert.match(css,/:focus-visible/);
  assert.match(css,/outline:3px solid/);
  assert.match(css,/min-height:24px/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
