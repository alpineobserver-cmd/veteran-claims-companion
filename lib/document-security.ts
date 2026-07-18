import { createHash, randomUUID } from "node:crypto";

export const MAX_SYNTHETIC_FILE_BYTES=4*1024*1024;
export const ACCEPTED_DOCUMENT_TYPES=["application/pdf","image/jpeg","image/png"] as const;

const signatures=[
  {mimeType:"application/pdf",extension:"pdf",matches:(value:Buffer)=>value.subarray(0,5).toString("ascii")==="%PDF-"},
  {mimeType:"image/jpeg",extension:"jpg",matches:(value:Buffer)=>value.length>3&&value[0]===0xff&&value[1]===0xd8&&value[2]===0xff},
  {mimeType:"image/png",extension:"png",matches:(value:Buffer)=>value.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))}
] as const;

export function inspectDocument(buffer:Buffer){
  if(!buffer.length)throw new Error("The selected file is empty.");
  if(buffer.length>MAX_SYNTHETIC_FILE_BYTES)throw new Error("Test files must be 4 MB or smaller.");
  const signature=signatures.find(item=>item.matches(buffer));
  if(!signature)throw new Error("Only genuine PDF, JPEG, and PNG files are accepted.");
  return{mimeType:signature.mimeType,extension:signature.extension,sha256:createHash("sha256").update(buffer).digest("hex")};
}

export function safeDisplayName(value:string){const cleaned=value.replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,180);return cleaned||"synthetic-document"}
export function syntheticStorageKey(userId:string,claimId:string,extension:string){return`synthetic-intake/${userId}/${claimId}/${randomUUID()}.${extension}`}
