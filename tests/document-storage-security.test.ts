import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { DOCUMENT_DOWNLOAD_TTL_MS, issueDocumentDownloadTicket, verifyDocumentDownloadTicket } from "../lib/document-download-ticket";
import { configuredDocumentStorageName, documentStorage, StorageConfigurationError, storageProviderNames } from "../lib/storage";

const root=process.cwd();
const read=(relative:string)=>readFile(path.join(root,relative),"utf8");
const secret="fictional-test-secret-that-is-longer-than-thirty-two-characters";
const now=Date.parse("2026-07-21T12:00:00.000Z");

test("document download tickets are short-lived and bound to one user and document",()=>{
  const ticket=issueDocumentDownloadTicket("document-a","user-a",{now,secret});
  assert.equal(ticket.expiresAt-now,DOCUMENT_DOWNLOAD_TTL_MS);
  assert.equal(verifyDocumentDownloadTicket(ticket.token,"document-a","user-a",{now:now+1_000,secret}),true);
  assert.equal(verifyDocumentDownloadTicket(ticket.token,"document-b","user-a",{now:now+1_000,secret}),false);
  assert.equal(verifyDocumentDownloadTicket(ticket.token,"document-a","user-b",{now:now+1_000,secret}),false);
  assert.equal(verifyDocumentDownloadTicket(ticket.token,"document-a","user-a",{now:ticket.expiresAt,secret}),false);
});

test("document download tickets reject tampering, malformed input, and the wrong signing secret",()=>{
  const ticket=issueDocumentDownloadTicket("document-a","user-a",{now,secret});
  const tampered=`${ticket.token.slice(0,-1)}${ticket.token.endsWith("a")?"b":"a"}`;
  assert.equal(verifyDocumentDownloadTicket(tampered,"document-a","user-a",{now,secret}),false);
  assert.equal(verifyDocumentDownloadTicket(ticket.token,"document-a","user-a",{now,secret:`${secret}-different`}),false);
  assert.equal(verifyDocumentDownloadTicket("not-a-ticket","document-a","user-a",{now,secret}),false);
});

test("private document delivery keeps tickets out of URLs and requires an authenticated same-origin handshake",async()=>{
  const [issueRoute,contentRoute,intake]=await Promise.all([
    read("app/api/documents/[id]/download-link/route.ts"),
    read("app/api/documents/[id]/content/route.ts"),
    read("components/document-intake.tsx")
  ]);
  assert.match(issueRoute,/rejectCrossOriginMutation\(request\)/);
  assert.match(issueRoute,/await auth\(\)/);
  assert.match(issueRoute,/findFirst\(\{where:\{id,userId:session\.user\.id\}/);
  assert.match(issueRoute,/issueDocumentDownloadTicket\(document\.id,session\.user\.id\)/);
  assert.match(contentRoute,/export async function POST/);
  assert.match(contentRoute,/authorization/);
  assert.match(contentRoute,/verifyDocumentDownloadTicket\(token,id,session\.user\.id\)/);
  assert.ok(contentRoute.indexOf("verifyDocumentDownloadTicket")<contentRoute.indexOf("storageKey:true"));
  assert.match(contentRoute,/"Cache-Control":"private, no-store"/);
  assert.match(contentRoute,/"Referrer-Policy":"no-referrer"/);
  assert.match(contentRoute,/"X-Content-Type-Options":"nosniff"/);
  assert.match(intake,/method:"POST"/);
  assert.match(intake,/\/download-link/);
  assert.match(intake,/Authorization:`Bearer \$\{ticket\.token\}`/);
  assert.doesNotMatch(issueRoute,/content\?token/);
  assert.doesNotMatch(intake,/<a href=\{`\/api\/documents\/\$\{document\.id\}\/content`\}/);
});

test("storage adapters prohibit public object access and list responses omit storage keys",async()=>{
  const [storage,documentsRoute,contentRoute,deleteRoute]=await Promise.all([read("lib/storage.ts"),read("app/api/documents/route.ts"),read("app/api/documents/[id]/content/route.ts"),read("app/api/documents/[id]/route.ts")]);
  assert.match(storage,/putBlob\(key,file,\{access:"private"/);
  assert.match(storage,/getBlob\(key,\{access:"private"/);
  assert.match(storage,/class GoogleCloudStorageProvider/);
  assert.match(storage,/preconditionOpts:\{ifGenerationMatch:0\}/);
  assert.match(storage,/validation:"crc32c"/);
  assert.match(storage,/getVercelOidcToken/);
  assert.doesNotMatch(storage,/private_key|GCP_PRIVATE_KEY|GOOGLE_APPLICATION_CREDENTIALS/);
  assert.doesNotMatch(storage,/access:\s*["']public["']/);
  assert.match(contentRoute,/documentStorage\(document\.provider\)/);
  assert.match(deleteRoute,/documentStorage\(document\.provider\)/);
  const publicSelect=documentsRoute.match(/const documentSelect=\{([^;]+)\} as const;/)?.[1]||"";
  assert.ok(publicSelect.length>0);
  assert.doesNotMatch(publicSelect,/storageKey/);
});

test("storage selection is explicit, backward compatible, and fail closed",()=>{
  const priorProvider=process.env.DOCUMENT_STORAGE_PROVIDER;
  const priorNodeEnv=process.env.NODE_ENV;
  try{
    process.env.DOCUMENT_STORAGE_PROVIDER="gcs";
    assert.equal(configuredDocumentStorageName(),storageProviderNames.google);
    assert.equal(documentStorage(storageProviderNames.google).name,storageProviderNames.google);
    process.env.DOCUMENT_STORAGE_PROVIDER="unsupported";
    assert.throws(()=>configuredDocumentStorageName(),StorageConfigurationError);
    Reflect.set(process.env,"NODE_ENV","production");
    assert.throws(()=>documentStorage(storageProviderNames.local),/prohibited/);
  }finally{
    if(priorProvider===undefined)delete process.env.DOCUMENT_STORAGE_PROVIDER;else process.env.DOCUMENT_STORAGE_PROVIDER=priorProvider;
    if(priorNodeEnv===undefined)Reflect.deleteProperty(process.env,"NODE_ENV");else Reflect.set(process.env,"NODE_ENV",priorNodeEnv);
  }
});
