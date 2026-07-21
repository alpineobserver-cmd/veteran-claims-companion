import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const DOCUMENT_DOWNLOAD_TTL_MS=60_000;
const CLOCK_SKEW_MS=5_000;
const TICKET_PURPOSE="document-download";

type TicketPayload={
  version:1;
  purpose:typeof TICKET_PURPOSE;
  documentId:string;
  userId:string;
  issuedAt:number;
  expiresAt:number;
  nonce:string;
};

type TicketOptions={now?:number;secret?:string};

export class DocumentDownloadConfigurationError extends Error {}

function signingSecret(explicit?:string){
  const secret=explicit??process.env.AUTH_SECRET??process.env.NEXTAUTH_SECRET;
  if(!secret||secret.length<32)throw new DocumentDownloadConfigurationError("A permanent authentication secret is required for secure document downloads.");
  return secret;
}

function signature(payload:string,secret:string){
  return createHmac("sha256",secret).update(payload).digest("base64url");
}

function isPayload(value:unknown):value is TicketPayload{
  if(!value||typeof value!=="object")return false;
  const payload=value as Partial<TicketPayload>;
  return payload.version===1&&payload.purpose===TICKET_PURPOSE&&typeof payload.documentId==="string"&&payload.documentId.length>0&&payload.documentId.length<=200&&typeof payload.userId==="string"&&payload.userId.length>0&&payload.userId.length<=200&&Number.isSafeInteger(payload.issuedAt)&&Number.isSafeInteger(payload.expiresAt)&&typeof payload.nonce==="string"&&payload.nonce.length>=16&&payload.nonce.length<=64;
}

export function issueDocumentDownloadTicket(documentId:string,userId:string,options:TicketOptions={}){
  const now=options.now??Date.now();
  const payload:TicketPayload={version:1,purpose:TICKET_PURPOSE,documentId,userId,issuedAt:now,expiresAt:now+DOCUMENT_DOWNLOAD_TTL_MS,nonce:randomBytes(12).toString("base64url")};
  const encoded=Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {token:`${encoded}.${signature(encoded,signingSecret(options.secret))}`,expiresAt:payload.expiresAt};
}

export function verifyDocumentDownloadTicket(token:string,documentId:string,userId:string,options:TicketOptions={}){
  if(!token||token.length>2_048)return false;
  const parts=token.split(".");
  if(parts.length!==2)return false;
  const [encoded,provided]=parts;
  try{
    const expected=signature(encoded,signingSecret(options.secret));
    const providedBytes=Buffer.from(provided,"base64url");
    const expectedBytes=Buffer.from(expected,"base64url");
    if(providedBytes.length!==expectedBytes.length||!timingSafeEqual(providedBytes,expectedBytes))return false;
    const payload:unknown=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"));
    if(!isPayload(payload))return false;
    const now=options.now??Date.now();
    return payload.documentId===documentId&&payload.userId===userId&&payload.issuedAt<=now+CLOCK_SKEW_MS&&payload.expiresAt>now&&payload.expiresAt-payload.issuedAt===DOCUMENT_DOWNLOAD_TTL_MS&&payload.expiresAt<=now+DOCUMENT_DOWNLOAD_TTL_MS+CLOCK_SKEW_MS;
  }catch{
    return false;
  }
}
