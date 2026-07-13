type PackageInput={condition:string;claimType:string;name:string;statement:string;timeline:{date:string;title:string;details:string;source:string;approximate:boolean}[];evidenceMap:Record<string,string>;selectedEvidence:string[];qualityFindings:{level:string;title:string;detail:string}[]};
const clean=(value:string)=>value.normalize("NFKD").replace(/[^\x20-\x7E\n]/g,"-").replace(/\s+/g," ").trim();
const escapePdf=(value:string)=>value.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
const wrap=(value:string,max=88)=>{const words=clean(value).split(" ");const lines:string[]=[];let line="";for(const word of words){if(!word)continue;if(`${line} ${word}`.trim().length>max){if(line)lines.push(line);line=word}else line=`${line} ${word}`.trim()}if(line)lines.push(line);return lines.length?lines:[""]};

export function createClaimPackagePdf(input:PackageInput){
  const pages:string[][]=[[]];let page=0,y=728;
  const command=(value:string)=>pages[page].push(value);
  const newPage=()=>{pages.push([]);page+=1;y=728};
  const ensure=(height:number)=>{if(y-height<60)newPage()};
  const line=(value:string,{size=10,bold=false,indent=0,leading=14}:{size?:number;bold?:boolean;indent?:number;leading?:number}={})=>{ensure(leading);command(`BT /${bold?"F2":"F1"} ${size} Tf ${54+indent} ${y} Td (${escapePdf(clean(value))}) Tj ET`);y-=leading};
  const paragraph=(value:string,options:{size?:number;bold?:boolean;indent?:number;gap?:number}={})=>{const lines=wrap(value,options.indent?82:88);ensure(lines.length*14+(options.gap??7));for(const valueLine of lines)line(valueLine,{size:options.size||10,bold:options.bold,indent:options.indent});y-=options.gap??7};
  const heading=(value:string)=>{ensure(28);line(value.toUpperCase(),{size:12,bold:true,leading:18});command(`0.83 0.85 0.81 RG 54 ${y+8} m 558 ${y+8} l S`);y-=6};
  const bullet=(value:string)=>paragraph(`- ${value}`,{indent:10,gap:3});

  line("VETERAN CLAIMS COMPANION",{size:9,bold:true,leading:18});
  line("PERSONAL STATEMENT REVIEW PACKAGE",{size:19,bold:true,leading:28});
  paragraph("Preparation document - not an official VA form and not proof of submission.",{size:9,gap:18});
  heading("Package details");
  line(`Condition: ${input.condition}`,{bold:true});line(`Claim path: ${input.claimType||"Not selected"}`);if(input.name)line(`Name: ${input.name}`);line(`Generated: ${new Date().toISOString().slice(0,10)}`);y-=12;
  heading("Personal statement");
  input.statement.split(/\n\s*\n/).filter(Boolean).forEach(value=>paragraph(value));
  heading("Condition timeline");
  if(input.timeline.length)input.timeline.forEach(event=>{line(`${event.date||"Date not recorded"}${event.approximate?" (approximate)":""} - ${event.title||"Untitled event"}`,{bold:true});if(event.details)paragraph(event.details,{indent:10,gap:2});if(event.source)paragraph(`Source: ${event.source}`,{size:9,indent:10,gap:7})});else paragraph("No timeline events were entered.");
  heading("Evidence identified");
  if(input.selectedEvidence.length)input.selectedEvidence.forEach(bullet);else paragraph("No evidence types were selected.");
  y-=5;line("Fact-to-evidence links",{size:11,bold:true,leading:18});
  const links=Object.entries(input.evidenceMap).filter(([,value])=>value);if(links.length)links.forEach(([fact,value])=>bullet(`${fact}: ${value}`));else paragraph("No facts were linked to supporting information.");
  ensure(90);heading("Readiness checks");
  if(input.qualityFindings.length)input.qualityFindings.forEach(item=>{ensure(50);line(`[${item.level.toUpperCase()}] ${item.title}`,{bold:true});paragraph(item.detail,{indent:10})});else paragraph("No automated issues were identified. This does not replace review by the person making the statement or an accredited representative.");
  ensure(105);heading("Final review");
  paragraph("Before using this package, confirm that every statement is accurate, dates are exact or marked approximate, medical conclusions are attributed to a qualified source, and the current VA filing instructions and form requirements have been checked.");
  line("Signature: __________________________________________",{leading:24});line("Date: ______________________________________________");

  pages.forEach((commands,index)=>{commands.push(`BT /F1 8 Tf 54 34 Td (Preparation document - Page ${index+1} of ${pages.length}) Tj ET`)});
  const count=pages.length;const font1=3+count*2,font2=font1+1;const objects:string[]=[];
  objects[1]="<< /Type /Catalog /Pages 2 0 R >>";
  objects[2]=`<< /Type /Pages /Count ${count} /Kids [${pages.map((_,index)=>`${3+index*2} 0 R`).join(" ")}] >>`;
  pages.forEach((commands,index)=>{const pageId=3+index*2,contentId=pageId+1,stream=commands.join("\n");objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentId} 0 R >>`;objects[contentId]=`<< /Length ${Buffer.byteLength(stream,"ascii")} >>\nstream\n${stream}\nendstream`});
  objects[font1]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";objects[font2]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  let pdf="%PDF-1.4\n%VCC1\n";const offsets:number[]=[0];for(let id=1;id<objects.length;id++){offsets[id]=Buffer.byteLength(pdf,"ascii");pdf+=`${id} 0 obj\n${objects[id]}\nendobj\n`}const xref=Buffer.byteLength(pdf,"ascii");pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let id=1;id<objects.length;id++)pdf+=`${String(offsets[id]).padStart(10,"0")} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf,"ascii");
}
