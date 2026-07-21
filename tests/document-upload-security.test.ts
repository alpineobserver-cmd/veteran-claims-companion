import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { inspectDocument, MAX_SYNTHETIC_FILE_BYTES } from "../lib/document-security";

const root=process.cwd();
const fixture=()=>readFile(path.join(root,"test-fixtures/fictional-alpha-record.pdf"));
const png=()=>Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=","base64");
function jpeg(width=1,height=1){
  return Buffer.from([0xff,0xd8,0xff,0xc0,0,17,8,height>>8,height&255,width>>8,width&255,3,1,0x11,0,2,0x11,0,3,0x11,0,0xff,0xda,0,12,3,1,0,2,0,3,0,0,0x3f,0,0,0xff,0xd9]);
}

test("valid PDF, JPEG, and PNG fixtures pass content, name, extension, and MIME checks",async()=>{
  assert.equal(inspectDocument(await fixture(),{fileName:"fictional-record.pdf",declaredMimeType:"application/pdf"}).mimeType,"application/pdf");
  assert.equal(inspectDocument(jpeg(),{fileName:"fictional-photo.JPEG",declaredMimeType:"image/jpeg"}).extension,"jpg");
  assert.equal(inspectDocument(png(),{fileName:"fictional-scan.png",declaredMimeType:"image/png"}).mimeType,"image/png");
});

test("content signatures cannot be disguised with a different extension or declared MIME type",async()=>{
  const pdf=await fixture();
  assert.throws(()=>inspectDocument(pdf,{fileName:"record.jpg",declaredMimeType:"application/pdf"}),/extension does not match/i);
  assert.throws(()=>inspectDocument(pdf,{fileName:"record.pdf",declaredMimeType:"image\/jpeg"}),/does not match the file contents/i);
  assert.throws(()=>inspectDocument(Buffer.from("PK\u0003\u0004archive"),{fileName:"record.pdf",declaredMimeType:"application/pdf"}),/genuine PDF, JPEG, and PNG/i);
});

test("unsafe, misleading, and excessive filenames are rejected before storage",async()=>{
  const pdf=await fixture();
  for(const name of ["../record.pdf","record\\name.pdf","record.exe.pdf","record\u202Efdp.exe.pdf","x".repeat(181)+".pdf"]){
    assert.throws(()=>inspectDocument(pdf,{fileName:name,declaredMimeType:"application/pdf"}),/filename|extension/i,name);
  }
});

test("malformed structures, active PDF content, and trailing polyglot data are rejected",async()=>{
  const pdf=await fixture();
  const active=Buffer.from(pdf.toString("latin1").replace("trailer","/JavaScript (fictional)\ntrailer"),"latin1");
  const trailing=Buffer.concat([pdf,Buffer.from("PK\u0003\u0004")]);
  const corruptPng=png();corruptPng[corruptPng.length-8]^=0xff;
  assert.throws(()=>inspectDocument(active,{fileName:"active.pdf",declaredMimeType:"application/pdf"}),/active PDF content/i);
  assert.throws(()=>inspectDocument(trailing,{fileName:"polyglot.pdf",declaredMimeType:"application/pdf"}),/trailing data/i);
  assert.throws(()=>inspectDocument(corruptPng,{fileName:"corrupt.png",declaredMimeType:"image/png"}),/integrity check|malformed|missing/i);
  assert.throws(()=>inspectDocument(jpeg().subarray(0,-2),{fileName:"truncated.jpg",declaredMimeType:"image/jpeg"}),/incomplete/i);
});

test("page, decoded-image, stream, and total-size parser limits fail closed",async()=>{
  const pdf=await fixture();
  const excessivePages=Buffer.from(pdf.toString("latin1").replace("trailer",`${"/Type /Page\n".repeat(501)}trailer`),"latin1");
  assert.throws(()=>inspectDocument(excessivePages,{fileName:"pages.pdf",declaredMimeType:"application/pdf"}),/500 pages/i);
  assert.throws(()=>inspectDocument(jpeg(12_001,1),{fileName:"wide.jpg",declaredMimeType:"image/jpeg"}),/dimensions exceed/i);
  assert.throws(()=>inspectDocument(Buffer.alloc(MAX_SYNTHETIC_FILE_BYTES+1,0x20),{fileName:"large.pdf",declaredMimeType:"application/pdf"}),/4 MB/i);
});

test("the upload route supplies untrusted filename and MIME metadata to the inspector",async()=>{
  const route=await readFile(path.join(root,"app/api/documents/route.ts"),"utf8");
  assert.match(route,/inspectDocument\(buffer,\{fileName:file\.name,declaredMimeType:file\.type\}\)/);
  assert.match(route,/originalName:inspected\.displayName/);
  assert.match(route,/MAX_DOCUMENT_REQUEST_BYTES/);
});
