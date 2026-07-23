import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isOperationalControlValue, parseOperationalControl } from "../lib/operational-controls";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");

test("operational controls default on, accept explicit states, and fail closed on typos",()=>{
  assert.equal(parseOperationalControl(undefined),true);
  for(const value of ["true","1","on","enabled"," TRUE "])assert.equal(parseOperationalControl(value),true,value);
  for(const value of ["false","0","off","disabled","pause","paused","typo"])assert.equal(parseOperationalControl(value),false,value);
  assert.equal(isOperationalControlValue("enabled"),true);
  assert.equal(isOperationalControlValue("typo"),false);
});

test("upload and AI routes enforce containment while preserving recovery paths",async()=>{
  const [documents,ai,deleteDocument,account]=await Promise.all([read("app/api/documents/route.ts"),read("app/api/ai/personal-statement/route.ts"),read("app/api/documents/[id]/route.ts"),read("app/api/account/route.ts")]);
  assert.match(documents,/!uploadsEnabled\(\)/);
  assert.match(documents,/Existing files remain available/);
  assert.match(ai,/!process\.env\.OPENAI_API_KEY\|\|!aiGenerationEnabled\(\)/);
  assert.match(ai,/mode:"template"/);
  assert.doesNotMatch(deleteDocument,/uploadsEnabled/);
  assert.doesNotMatch(account,/uploadsEnabled|registrationsEnabled/);
});

test("registration pause checks the provider account without blocking existing users",async()=>{
  const auth=await read("auth.ts");
  assert.match(auth,/if\(registrationsEnabled\(\)\|\|!account\?\.provider/);
  assert.match(auth,/provider_providerAccountId/);
  assert.match(auth,/if\(existing\)return true/);
  assert.match(auth,/RegistrationPaused/);
  assert.doesNotMatch(auth,/email:\s*account/);
});

test("deployment validation and the environment template enumerate every control",async()=>{
  const [validator,example]=await Promise.all([read("scripts/validate-deployment-env.mjs"),read(".env.example")]);
  for(const key of ["DEBRIEF_UPLOADS_ENABLED","DEBRIEF_AI_GENERATION_ENABLED","DEBRIEF_REGISTRATIONS_ENABLED"]){
    assert.match(validator,new RegExp(key));
    assert.match(example,new RegExp(`${key}="true"`));
  }
  assert.match(validator,/DEBRIEF_AI_POLICY_VERSION/);
  assert.match(example,/DEBRIEF_AI_POLICY_VERSION="personal-statement-v1"/);
});
