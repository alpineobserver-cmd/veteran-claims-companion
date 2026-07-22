import { execFileSync } from "node:child_process";

const protectedFiles=new Set(["lib/conditions.ts","lib/diagnostic-codes.ts","lib/rating-schemes.ts","lib/va-forms.ts"]);
function changedFiles(){
  if(process.env.CONTENT_CHANGED_FILES)return process.env.CONTENT_CHANGED_FILES.split(",").map(value=>value.trim()).filter(Boolean);
  const base=process.env.CONTENT_BASE_SHA;const head=process.env.CONTENT_HEAD_SHA||"HEAD";
  if(!base)throw new Error("Set CONTENT_BASE_SHA or CONTENT_CHANGED_FILES.");
  return execFileSync("git",["diff","--name-only",`${base}...${head}`],{encoding:"utf8"}).split("\n").map(value=>value.trim()).filter(Boolean);
}

const changed=changedFiles();const authorityChanges=changed.filter(file=>protectedFiles.has(file));
if(!authorityChanges.length){console.log("No protected condition or form content changed.");process.exit(0)}
const failures=[];
if(!changed.includes("lib/changelog.ts"))failures.push("A protected content change must update the public changelog.");
if(process.env.CONTENT_REVIEW_REQUIRED==="true"&&process.env.CONTENT_REVIEW_APPROVED!=="true")failures.push("A human reviewer must apply the content-reviewed pull-request label after checking authoritative sources.");
if(failures.length){for(const failure of failures)console.error(failure);process.exit(1)}
console.log(`Content governance passed for: ${authorityChanges.join(", ")}`);
