import { NextResponse } from "next/server";

export const MAX_JSON_REQUEST_BYTES=800_000;
export const MAX_DOCUMENT_REQUEST_BYTES=4_500_000;
export const MAX_ACTIVE_CLAIMS_PER_USER=25;
export const MAX_DOCUMENTS_PER_WORKSPACE=10;
export const MAX_DOCUMENTS_PER_USER=25;

export function hasAcceptableContentLength(request:Request,maxBytes:number){
  const raw=request.headers.get("content-length");
  if(!raw)return true;
  const length=Number(raw);
  return Number.isFinite(length)&&length>=0&&length<=maxBytes;
}

export function rejectCrossOriginMutation(request:Request){
  const origin=request.headers.get("origin");
  if(!origin)return null;
  let expected:string;
  try{expected=new URL(request.url).origin}catch{return NextResponse.json({error:"The request origin could not be verified."},{status:403})}
  if(origin!==expected)return NextResponse.json({error:"Cross-site requests are not accepted."},{status:403});
  return null;
}
