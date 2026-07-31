import { createHmac, createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { Storage } from "@google-cloud/storage";
import { GoogleAuth } from "google-auth-library";

const maxFileBytes=4*1024*1024;
const definitionMaxAgeSeconds=Number(process.env.MAX_DEFINITION_AGE_SECONDS||86400);
const scanTimeoutMs=Number(process.env.SCAN_TIMEOUT_MS||45000);
const storage=new Storage();
const taskAuth=new GoogleAuth({scopes:["https://www.googleapis.com/auth/cloud-platform"]});
const required=name=>{const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value};
const config={
  quarantineBucket:required("GCS_QUARANTINE_BUCKET"),
  cleanBucket:required("GCS_CLEAN_BUCKET"),
  rejectedBucket:process.env.GCS_REJECTED_BUCKET?.trim()||"",
  definitionsBucket:required("GCS_DEFINITIONS_BUCKET"),
  callbackUrl:required("DEBRIEF_SCAN_CALLBACK_URL"),
  callbackSecret:required("DOCUMENT_SCAN_CALLBACK_SECRET"),
  projectId:required("GCP_PROJECT_ID"),
  taskQueue:required("CLOUD_TASKS_QUEUE"),
  taskLocation:required("CLOUD_TASKS_LOCATION"),
  taskTargetUrl:required("SCAN_TASK_TARGET_URL"),
  taskAudience:required("SCAN_TASK_AUDIENCE"),
  taskServiceAccount:required("SCAN_TASK_SERVICE_ACCOUNT"),
};
if(config.callbackSecret.length<32)throw new Error("Scanner callback secret must be at least 32 characters");

function scannerVersion(){return process.env.SCANNER_POLICY_VERSION||"gcs-clamav-quarantine-v1"}
function sendJson(response,status,payload={}){response.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});response.end(JSON.stringify(payload))}
// Deliberately excludes object names, account information, document data, and
// secrets. Cloud Run already supplies the timestamp and request correlation.
function operationalEvent(stage,code){process.stdout.write(`${JSON.stringify({event:"scanner_operation",stage,code})}\n`)}
function callbackSignature(timestamp,body){return createHmac("sha256",config.callbackSecret).update(`${timestamp}.${body}`).digest("hex")}
async function callback(payload){
  const body=JSON.stringify(payload);const timestamp=String(Date.now());
  const response=await fetch(config.callbackUrl,{method:"POST",headers:{"Content-Type":"application/json","X-Debrief-Scan-Timestamp":timestamp,"X-Debrief-Scan-Signature":callbackSignature(timestamp,body)},body,signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error("SCAN_CALLBACK_FAILED");
  const value=await response.json().catch(()=>null);if(!value||!["accepted","already_committed","discard"].includes(value.disposition))throw new Error("SCAN_CALLBACK_FAILED");return value.disposition;
}
function safeError(error){const message=error instanceof Error?error.message:"UNKNOWN_SCANNER_RESPONSE";return new Set(["MALWARE_DETECTED","SCANNER_TIMEOUT","SCANNER_UNAVAILABLE","STALE_DEFINITIONS","UNKNOWN_SCANNER_RESPONSE","PROMOTION_FAILED","SOURCE_MISSING","SOURCE_GENERATION_MISMATCH","CLEAN_OBJECT_MISSING","CLEAN_OBJECT_CHECKSUM_MISMATCH","TASK_AUTH_FAILED","TASK_HTTP_400","TASK_HTTP_401","TASK_HTTP_403","TASK_HTTP_404","TASK_HTTP_409","TASK_HTTP_429","TASK_HTTP_500","TASK_HTTP_503"]).has(message)?message:"UNKNOWN_SCANNER_RESPONSE"}
function cleanKeyFor(bucket,name,generation){return `clean/${createHash("sha256").update(`${bucket}\0${name}\0${generation}`).digest("hex")}${extname(name).toLowerCase()||".bin"}`}
function definitionVersion(files){return createHash("sha256").update(files.sort().join("\n")).digest("hex").slice(0,32)}
function storageErrorCode(error){return typeof error==="object"&&error&&"code" in error?Number(error.code):0}
function taskParent(){return `projects/${config.projectId}/locations/${config.taskLocation}/queues/${config.taskQueue}`}
function taskIdFor(event){return `scan-${createHash("sha256").update(`${event.bucket}\0${event.name}\0${event.generation}`).digest("hex")}`}
async function enqueueScan(event){
  const parent=taskParent();const task={name:`${parent}/tasks/${taskIdFor(event)}`,httpRequest:{httpMethod:"POST",url:config.taskTargetUrl,headers:{"Content-Type":"application/json"},body:Buffer.from(JSON.stringify(event)).toString("base64"),oidcToken:{serviceAccountEmail:config.taskServiceAccount,audience:config.taskAudience}}};
  const accessToken=await taskAuth.getAccessToken();if(!accessToken)throw new Error("TASK_AUTH_FAILED");
  const response=await fetch(`https://cloudtasks.googleapis.com/v2/${parent}/tasks`,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify({task})});
  if(response.status===409)return;
  if(!response.ok)throw new Error(`TASK_HTTP_${response.status}`);
}
async function saveExactlyOnce(file,bytes,options){
  try{await file.save(bytes,options)}catch{
    const [existing]=await file.download({validation:"crc32c"}).catch(()=>[null]);
    if(!existing||!Buffer.from(existing).equals(Buffer.from(bytes)))throw new Error("PROMOTION_FAILED");
  }
}
async function deleteSourceOnce(source,generation){
  try{await source.delete({ifGenerationMatch:Number(generation)})}catch(error){
    const code=storageErrorCode(error);if(code!==404&&code!==412)throw error;
  }
}
async function deleteDestinationOnce(file){try{await file.delete()}catch(error){if(storageErrorCode(error)!==404)throw error}}
function parsedEventCandidate(value){
  if(!value||typeof value!=="object")return null;
  if(typeof value.bucket==="string")return value;
  if(typeof value.data==="object"&&value.data)return parsedEventCandidate(value.data);
  if(typeof value.message?.data==="string"){
    try{return parsedEventCandidate(JSON.parse(Buffer.from(value.message.data,"base64").toString("utf8")))}catch{return null}
  }
  return null;
}
function validEventData(data){return Boolean(data&&data.bucket===config.quarantineBucket&&typeof data.name==="string"&&data.name.length&&/^\d+$/.test(String(data.generation||""))&&Number.isSafeInteger(Number(data.size))&&Number(data.size)>=1&&Number(data.size)<=maxFileBytes)}
function normalizedScanEvent(data,eventId){return {id:String(eventId||randomUUID()).slice(0,160),bucket:data.bucket,name:data.name,generation:String(data.generation),size:Number(data.size)}}

async function loadDefinitions(directory){
  await mkdir(directory,{recursive:true});
  const [files]=await storage.bucket(config.definitionsBucket).getFiles({prefix:"clamav/"});
  const definitionFiles=files.filter(file=>/\.(?:cvd|cld)$/i.test(file.name));
  if(!definitionFiles.length)throw new Error("STALE_DEFINITIONS");
  let oldest=Date.now();
  for(const file of definitionFiles){
    const [metadata]=await file.getMetadata();const updated=Date.parse(String(metadata.updated||""));
    if(!Number.isFinite(updated))throw new Error("STALE_DEFINITIONS");
    oldest=Math.min(oldest,updated);
    await file.download({destination:join(directory,basename(file.name))});
  }
  if((Date.now()-oldest)/1000>definitionMaxAgeSeconds)throw new Error("STALE_DEFINITIONS");
  return definitionVersion(definitionFiles.map(file=>file.name));
}

async function run(command,args,timeoutMs){
  return await new Promise((resolve,reject)=>{
    const child=spawn(command,args,{stdio:["ignore","ignore","ignore"]});
    const timer=setTimeout(()=>{child.kill("SIGKILL");reject(new Error("SCANNER_TIMEOUT"))},timeoutMs);
    child.once("error",()=>{clearTimeout(timer);reject(new Error("SCANNER_UNAVAILABLE"))});
    child.once("exit",code=>{clearTimeout(timer);resolve(code??2)});
  });
}

async function processObject(event){
  const {id,bucket,name,generation,size}=event;
  if(bucket!==config.quarantineBucket)return;
  if(!name||!/^\d+$/.test(String(generation))||!Number.isSafeInteger(Number(size))||Number(size)<1||Number(size)>maxFileBytes)return;
  const base={eventId:String(id||randomUUID()).slice(0,160),sourceBucket:bucket,sourceKey:name,sourceGeneration:String(generation),engine:"clamav",engineVersion:scannerVersion()};
  const working=await mkdtemp(join(tmpdir(),"debrief-scan-"));
  try{
    const definitions=await loadDefinitions(join(working,"definitions"));
    const startDisposition=await callback({...base,outcome:"STARTED",definitionVersion:definitions});if(startDisposition==="discard")return;
    const source=storage.bucket(bucket).file(name,{generation:String(generation)});
    const [metadata]=await source.getMetadata();
    if(String(metadata.generation)!==String(generation))throw new Error("SOURCE_GENERATION_MISMATCH");
    if(Number(metadata.size)!==Number(size)||Number(metadata.size)>maxFileBytes)throw new Error("SOURCE_GENERATION_MISMATCH");
    const sourcePath=join(working,"document");await source.download({destination:sourcePath,validation:"crc32c"});
    const exitCode=await run("clamscan",["--no-summary","--infected",`--database=${join(working,"definitions")}`,"--max-files=1",`--max-scansize=${maxFileBytes}`,`--max-filesize=${maxFileBytes}`,sourcePath],scanTimeoutMs);
    if(exitCode===0){
      const [bytes]=await source.download({validation:"crc32c"});
      const cleanKey=cleanKeyFor(bucket,name,String(generation));const clean=storage.bucket(config.cleanBucket).file(cleanKey);
      await saveExactlyOnce(clean,bytes,{resumable:false,validation:"crc32c",contentType:metadata.contentType||"application/octet-stream",metadata:{cacheControl:"private, no-store"},preconditionOpts:{ifGenerationMatch:0}});
      const [cleanMetadata]=await clean.getMetadata();
      if(Number(cleanMetadata.size)!==bytes.length||String(cleanMetadata.md5Hash||"")!==String(metadata.md5Hash||""))throw new Error("PROMOTION_FAILED");
      const disposition=await callback({...base,outcome:"CLEAN",cleanKey,definitionVersion:definitions});
      if(disposition==="discard"){await deleteDestinationOnce(clean);return;}
      await deleteSourceOnce(source,generation);
      return;
    }
    if(exitCode===1){
      let rejected;let rejectedKey;
      if(config.rejectedBucket){
        const [bytes]=await source.download({validation:"crc32c"});rejectedKey=`rejected/${createHash("sha256").update(`${bucket}\0${name}\0${generation}`).digest("hex")}`;rejected=storage.bucket(config.rejectedBucket).file(rejectedKey);
        await saveExactlyOnce(rejected,bytes,{resumable:false,validation:"crc32c",contentType:"application/octet-stream",metadata:{cacheControl:"private, no-store"},preconditionOpts:{ifGenerationMatch:0}});
      }
      const disposition=await callback({...base,outcome:"REJECTED_MALWARE",rejectedKey,definitionVersion:definitions,errorCode:"MALWARE_DETECTED"});
      if(disposition==="discard"){if(rejected)await deleteDestinationOnce(rejected);return;}
      await deleteSourceOnce(source,generation);
      return;
    }
    throw new Error("SCANNER_UNAVAILABLE");
  }catch(error){
    await callback({...base,outcome:"FAILED",errorCode:safeError(error)}).catch(()=>{});
    throw error;
  }finally{await rm(working,{recursive:true,force:true})}
}

async function refreshDefinitions(){
  const working=await mkdtemp(join(tmpdir(),"debrief-definitions-"));
  try{
    const configPath=join(working,"freshclam.conf");
    await writeFile(configPath,[
      `DatabaseDirectory ${working}`,
      "DatabaseOwner node",
      "DatabaseMirror database.clamav.net",
      "DNSDatabaseInfo yes",
    ].join("\n"),{mode:0o600});
    const code=await run("freshclam",["--config-file",configPath,"--no-warnings","--stdout"],120000);
    if(code!==0)throw new Error("SCANNER_UNAVAILABLE");
    for(const name of await readdir(working))if(/\.(?:cvd|cld)$/i.test(name))await storage.bucket(config.definitionsBucket).file(`clamav/${name}`).save(await import("node:fs/promises").then(({readFile})=>readFile(join(working,name))),{resumable:false,validation:"crc32c",metadata:{cacheControl:"private, no-store"}});
  }finally{await rm(working,{recursive:true,force:true})}
}

createServer(async(request,response)=>{
  if(request.method!=="POST")return sendJson(response,405,{error:"method_not_allowed"});
  // Eventarc appends delivery-control query parameters. Route only by the
  // pathname so those transport details cannot turn a valid event into 404.
  const pathname=new URL(request.url||"/",`http://${request.headers.host||"localhost"}`).pathname;
  if(pathname==="/refresh-definitions"){
    // Cloud Run requires an authenticated Scheduler service account for this route.
    // Keeping authorization at the private service boundary avoids copying a secret
    // into a Scheduler job configuration.
    try{await refreshDefinitions();return sendJson(response,204)}catch{return sendJson(response,503,{error:"definitions_unavailable"})}
  }
  if(pathname!=="/events"&&pathname!=="/scan")return sendJson(response,404,{error:"not_found"});
  const chunks=[];for await(const chunk of request)chunks.push(chunk);let event;
  try{event=JSON.parse(Buffer.concat(chunks).toString("utf8"))}catch{operationalEvent("event_rejected","INVALID_EVENT_JSON");return sendJson(response,400,{error:"invalid_event"})}
  // Eventarc sends CloudEvents in binary HTTP mode to Cloud Run: the request
  // body is the Storage event data and `ce-*` metadata is in request headers.
  // Also accept structured and Pub/Sub-wrapped fixtures for controlled testing.
  const data=parsedEventCandidate(event);
  if(!validEventData(data)){operationalEvent("event_rejected","INVALID_EVENT_SHAPE");return sendJson(response,204)}
  const scanEvent=normalizedScanEvent(data,event.eventId||request.headers["ce-id"]);
  if(pathname==="/events"){
    try{await enqueueScan(scanEvent);operationalEvent("scan_queued","SUCCESS");return sendJson(response,204)}catch(error){operationalEvent("queue_failed",safeError(error));return sendJson(response,503,{error:"scan_unavailable"})}
  }
  try{await processObject(scanEvent);operationalEvent("scan_completed","SUCCESS");return sendJson(response,204)}catch(error){operationalEvent("scan_failed",safeError(error));return sendJson(response,503,{error:"scan_unavailable"})}
}).listen(Number(process.env.PORT||8080));
