import { readFile } from "node:fs/promises";

const lock=JSON.parse(await readFile(new URL("../package-lock.json",import.meta.url),"utf8"));
const notices=await readFile(new URL("../THIRD_PARTY_NOTICES.md",import.meta.url),"utf8");
const permissive=new Set(["0BSD","Apache-2.0","BSD-2-Clause","BSD-3-Clause","ISC","MIT"]);
const reviewedExceptions=new Set(["CC-BY-4.0","LGPL-3.0-or-later","Apache-2.0 AND LGPL-3.0-or-later","Apache-2.0 AND LGPL-3.0-or-later AND MIT"]);
const packages=Object.entries(lock.packages||{}).filter(([path,entry])=>path&&!(entry).dev).map(([path,entry])=>({name:path.replace(/^node_modules\//,""),version:entry.version||"unknown",license:entry.license||"UNKNOWN",optional:Boolean(entry.optional)}));
const rejected=packages.filter(item=>!permissive.has(item.license)&&!reviewedExceptions.has(item.license));
const requiredNoticeTokens=["caniuse-lite","CC-BY-4.0","libvips","LGPL-3.0-or-later","Lucide","ISC","eCFR","VA forms"];
const missingNotices=requiredNoticeTokens.filter(token=>!notices.includes(token));

console.log(JSON.stringify({checkedAt:new Date().toISOString(),productionPackages:packages.length,licenseKinds:[...new Set(packages.map(item=>item.license))].sort(),reviewedExceptions:[...reviewedExceptions]},null,2));
if(rejected.length){console.error(`Unreviewed production licenses:\n${rejected.map(item=>`- ${item.name}@${item.version}: ${item.license}`).join("\n")}`);process.exitCode=1;}
if(missingNotices.length){console.error(`THIRD_PARTY_NOTICES.md is missing: ${missingNotices.join(", ")}`);process.exitCode=1;}
