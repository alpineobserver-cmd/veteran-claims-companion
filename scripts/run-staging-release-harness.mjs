import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base=(process.env.RELEASE_HARNESS_BASE_URL||"").replace(/\/$/,"");
const secret=process.env.DEBRIEF_RELEASE_HARNESS_SECRET||"";
assert.ok(base.startsWith("https://"),"RELEASE_HARNESS_BASE_URL must be HTTPS");
assert.ok(secret.length>=32,"DEBRIEF_RELEASE_HARNESS_SECRET is required");

let runId="";
let sessionA="";
let sessionB="";
let references=[];
const passed=[];

function check(value,label){assert.ok(value,label);passed.push(label)}
async function harness(action,data={}){
  const response=await fetch(`${base}/api/internal/release-harness`,{method:"POST",headers:{"content-type":"application/json","x-debrief-release-harness":secret},body:JSON.stringify({action,...data})});
  const body=await response.json().catch(()=>({}));
  assert.equal(response.status,200,`Harness ${action} failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}
function cookie(token){return `__Secure-authjs.session-token=${encodeURIComponent(token)}`}
async function api(path,token,init={}){
  const headers=new Headers(init.headers);headers.set("cookie",cookie(token));headers.set("accept","application/json");
  if(init.method&&init.method!=="GET")headers.set("origin",base);
  return fetch(`${base}${path}`,{...init,headers,redirect:"manual"});
}
async function json(response){return response.json()}
async function createClaim(token,title){
  const response=await api("/api/claims",token,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title,progress:0,draft:{answers:{},step:0}})});
  assert.equal(response.status,201,`Claim creation failed: ${await response.text()}`);return (await json(response)).claim;
}
async function upload(token,claimId,name,bytes){
  const form=new FormData();form.set("claimId",claimId);form.set("syntheticConfirmed","true");form.set("file",new File([bytes],name,{type:"application/pdf"}));
  const response=await api("/api/documents",token,{method:"POST",body:form});
  assert.equal(response.status,202,`Upload failed: ${await response.text()}`);return (await json(response)).document;
}
async function waitFor(token,claimId,documentId,statuses,timeoutMs=180000){
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    const response=await api(`/api/documents?claimId=${claimId}`,token);assert.equal(response.status,200);
    const document=(await json(response)).documents.find(item=>item.id===documentId);
    if(document&&statuses.includes(document.status))return document;
    await new Promise(resolve=>setTimeout(resolve,2500));
  }
  throw new Error(`Document ${documentId} did not reach ${statuses.join("/")}`);
}
async function download(token,id){
  const link=await api(`/api/documents/${id}/download-link`,token,{method:"POST"});
  if(link.status!==200)return {link};
  const ticket=await json(link);const content=await api(`/api/documents/${id}/content`,token,{method:"POST",headers:{authorization:`Bearer ${ticket.token}`}});
  return {link,content};
}
function setCookies(response){
  const values=typeof response.headers.getSetCookie==="function"?response.headers.getSetCookie():[response.headers.get("set-cookie")||""];
  return values.map(value=>value.split(";",1)[0]).filter(Boolean);
}

try{
  const boot=await harness("bootstrap");runId=boot.runId;sessionA=boot.users.a.sessionToken;sessionB=boot.users.b.sessionToken;
  check(runId&&sessionA&&sessionB,"two disposable database sessions bootstrapped");

  const sessionResponse=await api("/api/auth/session",sessionA);assert.equal(sessionResponse.status,200);check((await json(sessionResponse)).user?.email===boot.users.a.email,"authenticated session callback resolves synthetic user A");
  const claimA=await createClaim(sessionA,"Fictional Alpha release record");const claimB=await createClaim(sessionB,"Fictional Bravo isolation marker");
  check(claimA.id!==claimB.id,"two isolated fictional workspaces created through normal API");

  const listA=await json(await api("/api/claims",sessionA));check(listA.claims.some(item=>item.id===claimA.id)&&!listA.claims.some(item=>item.id===claimB.id),"user A claim listing excludes user B");
  check((await api(`/api/claims/${claimA.id}`,sessionB)).status===404,"foreign claim read is denied");
  check((await api(`/api/claims/${claimA.id}`,sessionB,{method:"DELETE"})).status===404,"foreign claim deletion is denied");

  const cleanPdf=await readFile(new URL("../test-fixtures/fictional-alpha-record.pdf",import.meta.url));
  const eicar=Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
  const marker=Buffer.from("startxref");const markerAt=cleanPdf.lastIndexOf(marker);assert.ok(markerAt>0,"PDF fixture has startxref");
  const eicarPdf=Buffer.concat([cleanPdf.subarray(0,markerAt),eicar,Buffer.from("\n"),cleanPdf.subarray(markerAt)]);

  const cleanA=await upload(sessionA,claimA.id,"fictional-clean-a.pdf",cleanPdf);
  const pending=await download(sessionA,cleanA.id);check(pending.link.status===409,"pending upload is fail-closed before scan completion");
  const cleanAResult=await waitFor(sessionA,claimA.id,cleanA.id,["CLEAN"]);check(cleanAResult.status==="CLEAN","clean upload is promoted by live scanner");
  const downloaded=await download(sessionA,cleanA.id);assert.equal(downloaded.link.status,200);assert.equal(downloaded.content.status,200);check(Buffer.compare(Buffer.from(await downloaded.content.arrayBuffer()),cleanPdf)===0,"clean promoted object downloads byte-for-byte");
  check((await api(`/api/documents/${cleanA.id}/download-link`,sessionB,{method:"POST"})).status===404,"foreign document delivery is denied");
  const duplicate=await harness("scanCallback",{runId,documentId:cleanA.id,outcome:"CLEAN"});check(duplicate.disposition==="already_committed","duplicate clean callback is idempotent");

  const failureCreate=await fetch(`${base}/api/internal/release-harness`,{method:"POST",headers:{"content-type":"application/json","x-debrief-release-harness":secret},body:JSON.stringify({action:"createFailureFixture",runId,claimId:claimA.id})});
  assert.equal(failureCreate.status,201);const failedId=(await json(failureCreate)).document.id;
  const failureCallback=await harness("scanCallback",{runId,documentId:failedId,outcome:"FAILED"});check(failureCallback.disposition==="accepted","signed scanner failure callback is accepted");
  check((await api(`/api/documents/${failedId}/download-link`,sessionA,{method:"POST"})).status===409,"scanner failure state remains fail-closed");

  const infected=await upload(sessionB,claimB.id,"fictional-eicar.pdf",eicarPdf);
  const infectedResult=await waitFor(sessionB,claimB.id,infected.id,["REJECTED_MALWARE","SCAN_RETRY_PENDING","SCAN_FAILED"]);
  check(infectedResult.status==="REJECTED_MALWARE",`EICAR upload rejected by live scanner (observed ${infectedResult.status})`);
  check((await api(`/api/documents/${infected.id}/download-link`,sessionB,{method:"POST"})).status===409,"malware-rejected object cannot be delivered");
  const cleanB=await upload(sessionB,claimB.id,"fictional-clean-b.pdf",cleanPdf);await waitFor(sessionB,claimB.id,cleanB.id,["CLEAN"]);check(true,"second account clean lifecycle completes independently");

  const exported=await api("/api/account/export",sessionA);assert.equal(exported.status,200);const exportText=await exported.text();
  check(exportText.includes(claimA.id)&&!exportText.includes(claimB.id)&&!exportText.includes("Fictional Bravo isolation marker"),"account export contains only the requesting user's data");

  const snapshot=await harness("snapshot",{runId});
  for(const document of snapshot.documents){
    if(document.quarantineKey||document.storageKey)references.push({key:document.quarantineKey||document.storageKey,zone:"quarantine",provider:document.provider});
    if(document.cleanStorageKey)references.push({key:document.cleanStorageKey,zone:"clean",provider:document.provider});
    if(document.rejectedStorageKey)references.push({key:document.rejectedStorageKey,zone:"rejected",provider:document.provider});
  }

  assert.equal((await api(`/api/documents/${cleanA.id}`,sessionA,{method:"DELETE"})).status,204);check(true,"normal document deletion completes");
  assert.equal((await api("/api/account",sessionB,{method:"DELETE"})).status,200);check(true,"account B deletion removes mixed clean and rejected lifecycle data");

  const csrfResponse=await api("/api/auth/csrf",sessionA);assert.equal(csrfResponse.status,200);const csrf=await json(csrfResponse);const csrfCookies=setCookies(csrfResponse);
  const signoutBody=new URLSearchParams({csrfToken:csrf.csrfToken,callbackUrl:base});
  const signout=await fetch(`${base}/api/auth/signout`,{method:"POST",headers:{origin:base,cookie:[cookie(sessionA),...csrfCookies].join("; "),"content-type":"application/x-www-form-urlencoded"},body:signoutBody,redirect:"manual"});
  assert.ok(signout.status===302||signout.status===303,`Unexpected signout status ${signout.status}`);
  const afterLogout=await api("/api/auth/session",sessionA);check(!(await json(afterLogout)).user,"logout invalidates the database session");
  sessionA=(await harness("issueSession",{runId,actor:"a"})).sessionToken;
  assert.equal((await api("/api/account",sessionA,{method:"DELETE"})).status,200);check(true,"account A deletion completes after logout/session reissue");

  const absent=await harness("verifyAbsent",{runId,references});check(absent.clean&&absent.remainingUsers===0&&absent.remainingObjects===0,"database rows and all known storage objects are absent after deletion");
  console.log(JSON.stringify({result:"PASS",checks:passed.length,runId,passed},null,2));
}catch(error){
  console.error(JSON.stringify({result:"FAIL",runId,message:error instanceof Error?error.message:String(error),completedChecks:passed},null,2));
  throw error;
}finally{
  if(runId)await harness("cleanup",{runId}).catch(()=>{});
}
