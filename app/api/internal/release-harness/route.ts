import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { documentStorage } from "@/lib/storage";
import { configuredQuarantineBucket, signScanCallback } from "@/lib/malware-scanning";
import { POST as receiveScanCallback } from "@/app/api/internal/documents/scan/route";

export const runtime="nodejs";

const EMAIL_PREFIX="release-harness+";
const noStore={"Cache-Control":"no-store"};
const runPattern=/^[0-9a-f-]{36}$/;

function enabled(){return process.env.APP_ENV==="staging"&&process.env.DEBRIEF_RELEASE_HARNESS_ENABLED==="true"}
function authorized(request:Request){
  const expected=process.env.DEBRIEF_RELEASE_HARNESS_SECRET?.trim()||"";
  const supplied=request.headers.get("x-debrief-release-harness")||"";
  if(expected.length<32||supplied.length!==expected.length)return false;
  return timingSafeEqual(Buffer.from(supplied),Buffer.from(expected));
}
function denied(){return NextResponse.json({error:"Not found."},{status:404,headers:noStore})}
function email(runId:string,actor:"a"|"b"){return `${EMAIL_PREFIX}${runId}-${actor}@example.invalid`}
function validRunId(value:unknown):value is string{return typeof value==="string"&&runPattern.test(value)}
function token(){return randomBytes(32).toString("hex")}

async function issueSession(userId:string){
  const sessionToken=token();
  await prisma.session.create({data:{userId,sessionToken,expires:new Date(Date.now()+2*60*60*1000)}});
  return sessionToken;
}

async function fixtureUsers(runId:string){
  return prisma.user.findMany({where:{email:{in:[email(runId,"a"),email(runId,"b")]}},select:{id:true,email:true}});
}

export async function POST(request:Request){
  if(!enabled()||!authorized(request))return denied();
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const action=body?.action;
  if(action==="bootstrap"){
    const runId=randomUUID();
    const [userA,userB]=await prisma.$transaction([
      prisma.user.create({data:{name:"Fictional release user A",email:email(runId,"a")},select:{id:true,email:true}}),
      prisma.user.create({data:{name:"Fictional release user B",email:email(runId,"b")},select:{id:true,email:true}}),
    ]);
    const [sessionA,sessionB]=await Promise.all([issueSession(userA.id),issueSession(userB.id)]);
    return NextResponse.json({runId,users:{a:{id:userA.id,email:userA.email,sessionToken:sessionA},b:{id:userB.id,email:userB.email,sessionToken:sessionB}}},{headers:noStore});
  }
  if(!validRunId(body?.runId))return NextResponse.json({error:"Invalid run."},{status:400,headers:noStore});
  const runId=body.runId;
  const users=await fixtureUsers(runId);
  if(action==="issueSession"){
    const actor=body.actor;
    if(actor!=="a"&&actor!=="b")return NextResponse.json({error:"Invalid actor."},{status:400,headers:noStore});
    const user=users.find(item=>item.email===email(runId,actor));
    if(!user)return NextResponse.json({error:"Fixture user not found."},{status:404,headers:noStore});
    return NextResponse.json({sessionToken:await issueSession(user.id)},{headers:noStore});
  }
  if(action==="createFailureFixture"){
    const claimId=typeof body.claimId==="string"?body.claimId:"";
    const owner=users.find(item=>item.email===email(runId,"a"));
    if(!owner)return NextResponse.json({error:"Fixture user not found."},{status:404,headers:noStore});
    const claim=await prisma.claim.findFirst({where:{id:claimId,userId:owner.id},select:{id:true}});
    if(!claim)return NextResponse.json({error:"Fixture claim not found."},{status:404,headers:noStore});
    const storageKey=`release-harness/${runId}/${randomUUID()}.pdf`;
    const document=await prisma.document.create({data:{userId:owner.id,claimId,originalName:"fictional-scanner-failure.pdf",storageKey,quarantineKey:storageKey,objectGeneration:String(Date.now()),mimeType:"application/pdf",size:1,sha256:createHash("sha256").update("x").digest("hex"),provider:"google-cloud-storage",status:"PENDING_SCAN",syntheticConfirmed:true},select:{id:true}});
    return NextResponse.json({document},{status:201,headers:noStore});
  }
  if(action==="scanCallback"){
    const documentId=typeof body.documentId==="string"?body.documentId:"";
    const outcome=body.outcome;
    if(outcome!=="FAILED"&&outcome!=="CLEAN")return NextResponse.json({error:"Invalid outcome."},{status:400,headers:noStore});
    const document=await prisma.document.findFirst({where:{id:documentId,userId:{in:users.map(item=>item.id)}},select:{storageKey:true,objectGeneration:true,cleanStorageKey:true}});
    if(!document?.objectGeneration)return NextResponse.json({error:"Fixture document not found."},{status:404,headers:noStore});
    const callback={eventId:`release-harness-${randomUUID()}`,sourceBucket:configuredQuarantineBucket(),sourceKey:document.storageKey,sourceGeneration:document.objectGeneration,outcome,...(outcome==="CLEAN"&&document.cleanStorageKey?{cleanKey:document.cleanStorageKey}:{}),engine:"ClamAV",engineVersion:"release-gate",definitionVersion:"release-gate",...(outcome==="FAILED"?{errorCode:"SCANNER_UNAVAILABLE"}: {})};
    const raw=JSON.stringify(callback);const timestamp=String(Date.now());
    const result=await receiveScanCallback(new Request(new URL("/api/internal/documents/scan",request.url),{method:"POST",headers:{"content-type":"application/json","x-debrief-scan-timestamp":timestamp,"x-debrief-scan-signature":signScanCallback(timestamp,raw)},body:raw}));
    return new NextResponse(result.body,{status:result.status,headers:noStore});
  }
  if(action==="snapshot"){
    const documents=await prisma.document.findMany({where:{userId:{in:users.map(item=>item.id)}},select:{id:true,userId:true,status:true,storageKey:true,quarantineKey:true,cleanStorageKey:true,rejectedStorageKey:true,provider:true,objectGeneration:true}});
    const sessions=await prisma.session.count({where:{userId:{in:users.map(item=>item.id)}}});
    return NextResponse.json({users:users.length,sessions,documents},{headers:noStore});
  }
  if(action==="verifyAbsent"){
    const references=Array.isArray(body.references)?body.references:[];
    const remainingUsers=users.length;
    const objects=[] as Array<{zone:string,key:string}>;
    for(const item of references){
      if(!item||typeof item!=="object")continue;
      const reference=item as Record<string,unknown>;
      const key=typeof reference.key==="string"?reference.key:"";
      const zone=reference.zone;
      if(!["synthetic-intake/","clean/","rejected/",`release-harness/${runId}/`].some(prefix=>key.startsWith(prefix)))continue;
      if(zone!=="quarantine"&&zone!=="clean"&&zone!=="rejected"&&zone!=="primary")continue;
      if(await documentStorage(typeof reference.provider==="string"?reference.provider:undefined,zone).get(key))objects.push({zone,key});
    }
    return NextResponse.json({clean:remainingUsers===0&&objects.length===0,remainingUsers,remainingObjects:objects.length},{headers:noStore});
  }
  if(action==="cleanup"){
    const documents=await prisma.document.findMany({where:{userId:{in:users.map(item=>item.id)}},select:{storageKey:true,quarantineKey:true,cleanStorageKey:true,rejectedStorageKey:true,provider:true}});
    for(const document of documents){
      const references:Array<[string|null,"quarantine"|"clean"|"rejected"|"primary"]>=[[document.quarantineKey||document.storageKey,"quarantine"]];
      if(document.cleanStorageKey)references.push([document.cleanStorageKey,"clean"]);
      if(document.rejectedStorageKey)references.push([document.rejectedStorageKey,"rejected"]);
      for(const [key,zone] of references)if(key)await documentStorage(document.provider,zone).delete(key);
    }
    await prisma.user.deleteMany({where:{id:{in:users.map(item=>item.id)}}});
    return NextResponse.json({status:"cleaned"},{headers:noStore});
  }
  return NextResponse.json({error:"Invalid action."},{status:400,headers:noStore});
}
