import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

export const MAX_SYNTHETIC_FILE_BYTES=4*1024*1024;
export const ACCEPTED_DOCUMENT_TYPES=["application/pdf","image/jpeg","image/png"] as const;
export const MAX_DOCUMENT_PAGES=500;
export const MAX_IMAGE_DIMENSION=12_000;
export const MAX_DECODED_IMAGE_BYTES=64*1024*1024;

type AcceptedMime=(typeof ACCEPTED_DOCUMENT_TYPES)[number];
type InspectionOptions={fileName:string;declaredMimeType?:string};
type Signature={mimeType:AcceptedMime;extension:"pdf"|"jpg"|"png";extensions:readonly string[];matches:(value:Buffer)=>boolean};

const signatures:readonly Signature[]=[
  {mimeType:"application/pdf",extension:"pdf",extensions:[".pdf"],matches:value=>value.subarray(0,5).toString("ascii")==="%PDF-"},
  {mimeType:"image/jpeg",extension:"jpg",extensions:[".jpg",".jpeg"],matches:value=>value.length>3&&value[0]===0xff&&value[1]===0xd8&&value[2]===0xff},
  {mimeType:"image/png",extension:"png",extensions:[".png"],matches:value=>value.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))}
] as const;

const unsafeName=/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;
const dangerousEmbeddedExtension=/\.(?:app|bat|cmd|com|dmg|exe|html?|jar|js|msi|ps1|scr|sh|svg|vbs|xht|zip)(?:\.|$)/iu;
const allowedPdfFilters=new Set(["ASCII85Decode","ASCIIHexDecode","CCITTFaxDecode","DCTDecode","FlateDecode","JPXDecode","RunLengthDecode"]);

function validatedName(value:string,signature:Signature){
  const normalized=value.normalize("NFKC").trim();
  if(!normalized||normalized==="."||normalized==="..")throw new Error("The file must have a valid name.");
  if(normalized.length>180||Buffer.byteLength(normalized,"utf8")>255)throw new Error("The filename is too long.");
  if(unsafeName.test(normalized)||normalized.includes("/")||normalized.includes("\\"))throw new Error("The filename contains unsafe characters.");
  if(dangerousEmbeddedExtension.test(normalized))throw new Error("The filename contains a potentially executable or archive extension.");
  const extension=path.extname(normalized).toLowerCase();
  if(!signature.extensions.includes(extension))throw new Error(`The filename extension does not match the detected ${signature.extension.toUpperCase()} file type.`);
  return normalized;
}

function validateDeclaredMime(value:string|undefined,detected:AcceptedMime){
  const declared=value?.split(";",1)[0]?.trim().toLowerCase();
  if(!declared||declared==="application/octet-stream")return;
  if(!ACCEPTED_DOCUMENT_TYPES.includes(declared as AcceptedMime))throw new Error("The browser-reported file type is not accepted.");
  if(declared!==detected)throw new Error("The browser-reported file type does not match the file contents.");
}

function decodedImageLimit(width:number,height:number,channels=4){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw new Error("The image dimensions are invalid.");
  if(width>MAX_IMAGE_DIMENSION||height>MAX_IMAGE_DIMENSION||width*height*channels>MAX_DECODED_IMAGE_BYTES)throw new Error("The image dimensions exceed the safe processing limit.");
}

function crc32(value:Buffer){
  let crc=0xffffffff;
  for(const byte of value){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  return (crc^0xffffffff)>>>0;
}

function validatePng(buffer:Buffer){
  if(buffer.length<45)throw new Error("The PNG file is incomplete.");
  let offset=8;let chunks=0;let sawHeader=false;let sawData=false;let sawEnd=false;
  while(offset<buffer.length){
    if(offset+12>buffer.length)throw new Error("The PNG chunk table is malformed.");
    const length=buffer.readUInt32BE(offset);const type=buffer.subarray(offset+4,offset+8).toString("ascii");const end=offset+12+length;
    if(length>MAX_SYNTHETIC_FILE_BYTES||end>buffer.length)throw new Error("The PNG chunk length exceeds the safe parser limit.");
    if(crc32(buffer.subarray(offset+4,offset+8+length))!==buffer.readUInt32BE(offset+8+length))throw new Error("The PNG integrity check failed.");
    chunks+=1;if(chunks>1_000)throw new Error("The PNG contains too many chunks.");
    if(chunks===1){
      if(type!=="IHDR"||length!==13)throw new Error("The PNG header is malformed.");
      decodedImageLimit(buffer.readUInt32BE(offset+8),buffer.readUInt32BE(offset+12));
      const compression=buffer[offset+18];const filter=buffer[offset+19];const interlace=buffer[offset+20];
      if(compression!==0||filter!==0||interlace>1)throw new Error("The PNG uses unsupported processing parameters.");
      sawHeader=true;
    }
    if(type==="acTL"||type==="fcTL"||type==="fdAT")throw new Error("Animated PNG files are not accepted.");
    if(type==="IDAT")sawData=true;
    if(type==="IEND"){
      if(length!==0||end!==buffer.length)throw new Error("The PNG has trailing or malformed data.");
      sawEnd=true;
    }
    offset=end;if(sawEnd)break;
  }
  if(!sawHeader||!sawData||!sawEnd)throw new Error("The PNG is missing required image data.");
}

const jpegSofMarkers=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
function validateJpeg(buffer:Buffer){
  if(buffer.length<22||buffer.at(-2)!==0xff||buffer.at(-1)!==0xd9)throw new Error("The JPEG is incomplete or contains trailing data.");
  let offset=2;let segments=0;let sawFrame=false;let sawScan=false;
  while(offset<buffer.length-2){
    if(buffer[offset]!==0xff)throw new Error("The JPEG marker table is malformed.");
    while(buffer[offset]===0xff)offset+=1;
    const marker=buffer[offset++];
    if(marker===0xda){sawScan=true;break}
    if(marker===0xd8||marker===0xd9||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
    if(offset+2>buffer.length-2)throw new Error("The JPEG segment table is incomplete.");
    const length=buffer.readUInt16BE(offset);if(length<2||offset+length>buffer.length-2)throw new Error("The JPEG segment length is invalid.");
    segments+=1;if(segments>1_000)throw new Error("The JPEG contains too many metadata segments.");
    if(jpegSofMarkers.has(marker)){
      if(length<8)throw new Error("The JPEG frame header is malformed.");
      const height=buffer.readUInt16BE(offset+3);const width=buffer.readUInt16BE(offset+5);const channels=Math.max(1,buffer[offset+7]||1);
      decodedImageLimit(width,height,channels);sawFrame=true;
    }
    offset+=length;
  }
  if(!sawFrame||!sawScan)throw new Error("The JPEG is missing required frame or image data.");
}

function matches(value:string,pattern:RegExp){return value.match(pattern)?.length??0}
function validatePdf(buffer:Buffer){
  const text=buffer.toString("latin1");
  if(!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r?\n|\r)/.test(text))throw new Error("The PDF version header is malformed or unsupported.");
  const eof=text.lastIndexOf("%%EOF");
  if(eof<0||text.length-eof>1_024||!/^[\s\0]*$/.test(text.slice(eof+5)))throw new Error("The PDF is incomplete or contains trailing data.");
  if(!/startxref\s+\d+\s+%%EOF/.test(text.slice(Math.max(0,text.length-2_048))))throw new Error("The PDF cross-reference trailer is malformed.");
  if(/\/(?:Encrypt|EmbeddedFile|JavaScript|JS|Launch|RichMedia|XFA)\b/.test(text))throw new Error("Encrypted, executable, embedded, or active PDF content is not accepted.");
  const objects=matches(text,/\b\d+\s+\d+\s+obj\b/g);const pages=matches(text,/\/Type\s*\/Page\b/g);const streams=matches(text,/(?:\r?\n|\r)stream(?:\r?\n|\r)/g);
  if(objects<1||objects>10_000)throw new Error("The PDF object count is outside the safe parser limit.");
  if(pages<1||pages>MAX_DOCUMENT_PAGES)throw new Error(`PDF files are limited to ${MAX_DOCUMENT_PAGES} pages.`);
  if(streams>1_000)throw new Error("The PDF contains too many data streams.");
  for(const item of text.matchAll(/\/Length\s+(\d+)/g))if(Number(item[1])>MAX_SYNTHETIC_FILE_BYTES)throw new Error("A PDF stream declares an unsafe processing size.");
  for(const item of text.matchAll(/\/Filter\s*(\[[^\]]{0,300}\]|\/[A-Za-z0-9]+)/g)){
    const filters=[...item[1].matchAll(/\/([A-Za-z0-9]+)/g)].map(match=>match[1]);
    if(!filters.length||filters.length>2||filters.some(filter=>!allowedPdfFilters.has(filter)))throw new Error("The PDF uses an unsupported or excessive decoding chain.");
  }
  for(const dictionary of text.matchAll(/<<(?=[\s\S]{0,4_000}\/Subtype\s*\/Image\b)([\s\S]{0,4_000}?)>>/g)){
    const width=Number(dictionary[1].match(/\/Width\s+(\d+)/)?.[1]);const height=Number(dictionary[1].match(/\/Height\s+(\d+)/)?.[1]);
    if(width&&height)decodedImageLimit(width,height);
  }
}

export function inspectDocument(buffer:Buffer,options:InspectionOptions){
  if(!buffer.length)throw new Error("The selected file is empty.");
  if(buffer.length>MAX_SYNTHETIC_FILE_BYTES)throw new Error("Test files must be 4 MB or smaller.");
  const signature=signatures.find(item=>item.matches(buffer));
  if(!signature)throw new Error("Only genuine PDF, JPEG, and PNG files are accepted.");
  const displayName=validatedName(options.fileName,signature);validateDeclaredMime(options.declaredMimeType,signature.mimeType);
  if(signature.mimeType==="application/pdf")validatePdf(buffer);
  if(signature.mimeType==="image/jpeg")validateJpeg(buffer);
  if(signature.mimeType==="image/png")validatePng(buffer);
  return{mimeType:signature.mimeType,extension:signature.extension,displayName,sha256:createHash("sha256").update(buffer).digest("hex")};
}

export function safeDisplayName(value:string){return value.normalize("NFKC").replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/gu,"").replace(/[\\/]/g,"-").trim().slice(0,180)||"synthetic-document"}
export function syntheticStorageKey(userId:string,claimId:string,extension:string){return`synthetic-intake/${userId}/${claimId}/${randomUUID()}.${extension}`}
