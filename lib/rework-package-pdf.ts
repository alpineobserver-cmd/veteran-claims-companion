import type {ApprovedPackageSnapshot} from "@/lib/rework-state";

const clean=(value:string)=>value.normalize("NFKD").replace(/[^\x20-\x7E\n]/g,"-").replace(/\s+/g," ").trim();
const escapePdf=(value:string)=>value.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
const wrap=(value:string,max=88)=>{const words=clean(value).split(" ");const lines:string[]=[];let line="";for(const word of words){if(!word)continue;if(`${line} ${word}`.trim().length>max){if(line)lines.push(line);line=word}else line=`${line} ${word}`.trim()}if(line)lines.push(line);return lines.length?lines:[""]};

export function createReworkPackagePdf(snapshot:ApprovedPackageSnapshot,checksum:string){
  const pages:string[][]=[[]];let page=0,y=728;
  const command=(value:string)=>pages[page].push(value);
  const newPage=()=>{pages.push([]);page+=1;y=728};
  const ensure=(height:number)=>{if(y-height<60)newPage()};
  const line=(value:string,{size=10,bold=false,indent=0,leading=14}:{size?:number;bold?:boolean;indent?:number;leading?:number}={})=>{ensure(leading);command(`BT /${bold?"F2":"F1"} ${size} Tf ${54+indent} ${y} Td (${escapePdf(clean(value))}) Tj ET`);y-=leading};
  const paragraph=(value:string,options:{size?:number;bold?:boolean;indent?:number;gap?:number}={})=>{const lines=wrap(value,options.indent?82:88);ensure(lines.length*14+(options.gap??7));for(const valueLine of lines)line(valueLine,{size:options.size||10,bold:options.bold,indent:options.indent});y-=options.gap??7};
  const heading=(value:string)=>{ensure(30);line(value.toUpperCase(),{size:12,bold:true,leading:18});command(`0.76 0.80 0.76 RG 54 ${y+8} m 558 ${y+8} l S`);y-=6};

  line("DEBRIEF",{size:9,bold:true,leading:18});
  line("APPROVED CLAIM PACKAGE",{size:20,bold:true,leading:29});
  paragraph("Preparation document - not an official VA form, submission, eligibility decision, or receipt.",{size:9,gap:16});
  heading("Package index");
  line(`Package: ${snapshot.packageId}`);line(`Filing path: ${snapshot.packageKind}`);line(`Approved: ${snapshot.approvedAt.slice(0,10)}`);line(`Snapshot checksum: ${checksum}`,{size:8});
  paragraph(`${snapshot.claims.length} claim ${snapshot.claims.length===1?"workspace":"workspaces"}; ${snapshot.documents.length} linked ${snapshot.documents.length===1?"record":"records"}.`);
  heading("Shared service and health foundation");
  snapshot.services.forEach(item=>{line(`${item.kind}: ${item.location||"Location not entered"}`,{bold:true});paragraph(`${item.service}; ${item.start||"start unknown"} to ${item.end||"end unknown"}${item.approximate?" (approximate)":""}. Role: ${item.role||"not entered"}. ${item.exposures||"No exposure details entered."}`,{indent:10})});
  snapshot.events.forEach(item=>{line(`${item.type}: ${item.title}`,{bold:true});paragraph(`${item.date||"Date unknown"}${item.approximate?" (approximate)":""}. ${item.details} ${item.care} ${item.impact}`,{indent:10})});
  if(!snapshot.services.length&&!snapshot.events.length)paragraph("No foundation information was included.");
  snapshot.claims.forEach((claim,index)=>{
    heading(`${index+1}. ${claim.title}`);
    line(`Filing path: ${claim.path}`);line(`Review status: ${claim.draft.statementReviewed?"Statement reviewed":"Review incomplete"}`);
    const sections:[[string,string],[string,string],[string,string],[string,string],[string,string],[string,string]]=[
      ["In-service event",claim.draft.serviceEvent],["Current symptoms",claim.draft.currentSymptoms],["Diagnosis",claim.draft.diagnosis],
      ["Possible relationship",claim.draft.relationship],["Daily impact",claim.draft.dailyImpact],["Treatment history",claim.draft.treatmentHistory]
    ];
    sections.forEach(([label,value])=>{line(label,{bold:true});paragraph(value||"Not entered.",{indent:10})});
    const claimSources=snapshot.sources.filter(source=>claim.sourceIds.includes(source.id));
    line("Source trace",{bold:true});
    if(claimSources.length)claimSources.forEach(source=>paragraph(`${source.label}${source.location?` - ${source.location}`:""}: ${source.excerpt} [${source.verification}]`,{size:8,indent:10,gap:3}));else paragraph("No sources linked.",{indent:10});
  });
  heading("Linked records");
  if(snapshot.documents.length)snapshot.documents.forEach(document=>paragraph(`${document.name} - ${document.type}; ${document.status}; ${document.dateRange||"date range not entered"}.`));else paragraph("No records were linked to this package.");
  heading("Submission boundary");
  paragraph("Debrief does not submit this package, verify receipt, or determine eligibility or outcome. Review the current official VA filing instructions and required forms before submitting through an official VA channel.");
  paragraph("Official guidance: https://www.va.gov/disability/how-to-file-claim/",{size:9});

  pages.forEach((commands,index)=>commands.push(`BT /F1 8 Tf 54 34 Td (Debrief approved snapshot - Page ${index+1} of ${pages.length}) Tj ET`));
  const count=pages.length,font1=3+count*2,font2=font1+1;const objects:string[]=[];
  objects[1]="<< /Type /Catalog /Pages 2 0 R >>";
  objects[2]=`<< /Type /Pages /Count ${count} /Kids [${pages.map((_,index)=>`${3+index*2} 0 R`).join(" ")}] >>`;
  pages.forEach((commands,index)=>{const pageId=3+index*2,contentId=pageId+1,stream=commands.join("\n");objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentId} 0 R >>`;objects[contentId]=`<< /Length ${Buffer.byteLength(stream,"ascii")} >>\nstream\n${stream}\nendstream`});
  objects[font1]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";objects[font2]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  let pdf="%PDF-1.4\n%DEBRIEF1\n";const offsets:number[]=[0];for(let objectId=1;objectId<objects.length;objectId++){offsets[objectId]=Buffer.byteLength(pdf,"ascii");pdf+=`${objectId} 0 obj\n${objects[objectId]}\nendobj\n`}const xref=Buffer.byteLength(pdf,"ascii");pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let objectId=1;objectId<objects.length;objectId++)pdf+=`${String(offsets[objectId]).padStart(10,"0")} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf,"ascii");
}
