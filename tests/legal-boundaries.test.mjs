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
