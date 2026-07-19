import { readFile } from "node:fs/promises";

const packageJson=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
const configured=packageJson.dependencies?.["next-auth"];
const current=typeof configured==="string"?configured.replace(/^[^0-9]*/,""):"";
if(!current)throw new Error("next-auth is not declared in package.json dependencies.");

const response=await fetch("https://registry.npmjs.org/-/package/next-auth/dist-tags",{headers:{accept:"application/json"}});
if(!response.ok)throw new Error(`Unable to read next-auth release tags (${response.status}).`);
const tags=await response.json();
const latest=typeof tags.latest==="string"?tags.latest:"unknown";
const beta=typeof tags.beta==="string"?tags.beta:"unknown";
const stableV5=latest.startsWith("5.");
const newerBeta=beta!=="unknown"&&beta!==current;

console.log(JSON.stringify({checkedAt:new Date().toISOString(),current,latest,beta},null,2));

if(stableV5||newerBeta){
  const reason=stableV5?`Stable Auth.js ${latest} is available.`:`Auth.js beta ${beta} differs from the configured ${current}.`;
  console.error(`::warning title=Auth.js review required::${reason} Follow docs/auth-dependency-decision.md before changing versions.`);
  process.exitCode=1;
}else{
  console.log("No Auth.js version decision is required today.");
}
