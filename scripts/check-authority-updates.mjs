import { readFile } from "node:fs/promises";

const manifest=JSON.parse(await readFile(new URL("../config/content-authorities.json",import.meta.url),"utf8"));
const findings=[];
const timeoutMs=10000;
const userAgent="Debrief-Authority-Monitor/1.0";

function approvedGovernmentUrl(raw){
  const url=new URL(raw);return url.protocol==="https:"&&(url.hostname==="va.gov"||url.hostname.endsWith(".va.gov")||url.hostname==="ecfr.gov"||url.hostname.endsWith(".ecfr.gov"));
}

async function request(url,options={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{redirect:"follow",signal:controller.signal,headers:{"User-Agent":userAgent,Accept:"application/json,text/html,application/pdf;q=0.9,*/*;q=0.5",...options.headers},...options})}
  finally{clearTimeout(timer)}
}

try{
  const response=await request(manifest.ecfr.url);
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const body=await response.json();const latest=body?.meta?.latest_issue_date;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(latest||""))throw new Error("missing latest issue date");
  if(latest>manifest.ecfr.latestIssueDateReviewed)findings.push({authority:"38-cfr-part-4",result:"review-required",reason:"newer-issue-date",observed:latest,reviewedThrough:manifest.ecfr.latestIssueDateReviewed});
  else console.log(JSON.stringify({source:"debrief-authority-monitor",authority:"38-cfr-part-4",result:"current",observed:latest,reviewedThrough:manifest.ecfr.latestIssueDateReviewed}));
}catch(error){findings.push({authority:"38-cfr-part-4",result:"unavailable",reason:error instanceof Error?error.name:"UnknownError"})}

for(const form of manifest.forms){
  for(const [route,url] of [["information",form.informationUrl],["download",form.downloadUrl]]){
    try{
      if(!approvedGovernmentUrl(url))throw new Error("UnapprovedAuthorityHost");
      let response=await request(url,{method:"HEAD"});
      if(response.status===405||response.status===501)response=await request(url,{headers:{Range:"bytes=0-0"}});
      if(!response.ok)throw new Error(`HTTP${response.status}`);
      if(!approvedGovernmentUrl(response.url))throw new Error("UnexpectedRedirectHost");
      if(route==="download"&&form.kind==="pdf"){
        const type=response.headers.get("content-type")||"";
        if(!type.toLowerCase().includes("pdf"))throw new Error("UnexpectedContentType");
        const modified=response.headers.get("last-modified");
        if(modified){const observed=new Date(modified);const reviewed=new Date(`${manifest.formsVerifiedThrough}T23:59:59Z`);if(Number.isFinite(observed.getTime())&&observed>reviewed)findings.push({authority:`va-form-${form.number}`,route,result:"review-required",reason:"modified-after-review",observed:observed.toISOString(),reviewedThrough:manifest.formsVerifiedThrough});}
      }
      console.log(JSON.stringify({source:"debrief-authority-monitor",authority:`va-form-${form.number}`,route,result:"reachable",status:response.status}));
    }catch(error){findings.push({authority:`va-form-${form.number}`,route,result:"unavailable",reason:error instanceof Error?error.name:"UnknownError"})}
  }
}

for(const finding of findings)console.error(JSON.stringify({timestamp:new Date().toISOString(),source:"debrief-authority-monitor",...finding}));
if(findings.length)process.exitCode=1;
