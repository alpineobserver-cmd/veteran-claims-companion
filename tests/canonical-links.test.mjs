import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root=process.cwd();
const canonicalOrigin="https://debriefclaims.com";
const excludedDirectories=new Set([".git",".next","node_modules"]);
const textExtensions=new Set([".css",".example",".html",".js",".json",".md",".mjs",".ts",".tsx",".txt",".yml",".yaml"]);

async function textFiles(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    if(entry.isDirectory()&&excludedDirectories.has(entry.name))continue;
    const absolute=path.join(directory,entry.name);
    if(entry.isDirectory())files.push(...await textFiles(absolute));
    else if(entry.isFile()&&(textExtensions.has(path.extname(entry.name))||entry.name.startsWith(".env")))files.push(absolute);
  }
  return files;
}

test("repository text does not present a Vercel deployment address as the public origin",async()=>{
  const violations=[];
  for(const file of await textFiles(root)){
    const relative=path.relative(root,file);
    if(relative==="tests/canonical-host.test.ts")continue;
    const content=await readFile(file,"utf8");
    for(const match of content.matchAll(/https:\/\/[a-z0-9-]+\.vercel\.app/gi)){
      violations.push(`${relative}: ${match[0]}`);
    }
  }
  assert.deepEqual(violations,[],`Protected or non-canonical Vercel URLs found:\n${violations.join("\n")}`);
});

test("tester invitation contains the canonical address and protected-alias warning",async()=>{
  const invitation=await readFile(path.join(root,"docs/alpha-tester-invitation.md"),"utf8");
  assert.match(invitation,new RegExp(canonicalOrigin.replaceAll(".","\\.")));
  assert.match(invitation,/git-main/);
  assert.match(invitation,/protected development addresses/);
  assert.match(invitation,/fictional information and fictional documents only/i);
});

test("canonical public legal and authentication routes exist",async()=>{
  const required=[
    "app/page.tsx",
    "app/login/page.tsx",
    "app/auth/error/page.tsx",
    "app/privacy/page.tsx",
    "app/terms/page.tsx",
    "app/support/page.tsx",
    "app/status/page.tsx",
    "app/sources/page.tsx",
    "app/licenses/page.tsx",
    "app/api/health/route.ts",
    "app/api/auth/[...nextauth]/route.ts",
  ];
  for(const relative of required)assert.equal((await stat(path.join(root,relative))).isFile(),true,`${relative} is missing`);
});

test("public and authenticated navigation expose support and status routes",async()=>{
  const [landing,shell,conditions,forms]=await Promise.all([
    readFile(path.join(root,"app/page.tsx"),"utf8"),
    readFile(path.join(root,"components/app-shell.tsx"),"utf8"),
    readFile(path.join(root,"app/conditions/page.tsx"),"utf8"),
    readFile(path.join(root,"app/forms/page.tsx"),"utf8"),
  ]);
  assert.match(landing,/href="\/support"/);
  assert.match(shell,/href="\/support"/);
  assert.match(landing,/href="\/status"/);
  assert.match(shell,/href="\/status"/);
  assert.match(conditions,/href="\/support#content-correction"/);
  assert.match(forms,/href="\/support#content-correction"/);
});

test("environment example preserves local development and the canonical Production host",async()=>{
  const example=await readFile(path.join(root,".env.example"),"utf8");
  assert.match(example,/^AUTH_URL="http:\/\/localhost:3000"$/m);
  assert.match(example,/^AUTH_CANONICAL_HOST="debriefclaims\.com"$/m);
});

test("live canonical pages are public when PUBLIC_E2E_BASE_URL is supplied",{skip:!process.env.PUBLIC_E2E_BASE_URL},async()=>{
  const base=new URL(process.env.PUBLIC_E2E_BASE_URL);
  assert.equal(base.origin,canonicalOrigin,"Live release checks must target the canonical origin.");
  for(const route of ["/","/login","/privacy","/terms","/support","/status","/sources","/licenses"]){
    const response=await fetch(new URL(route,base),{redirect:"manual"});
    assert.equal(response.status,200,`${route} returned ${response.status}`);
    assert.doesNotMatch(response.headers.get("location")||"",/vercel\.com\/sso-api/);
  }
});
