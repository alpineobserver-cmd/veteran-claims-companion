import { NextResponse } from "next/server";
import { z } from "zod";
import { createClaimPackagePdf } from "@/lib/claim-package-pdf";
export const runtime="nodejs";
const text=(max:number)=>z.string().trim().max(max).default("");
const schema=z.object({condition:z.string().trim().min(1).max(200),claimType:text(200),name:text(120),statement:z.string().trim().min(1).max(30000),timeline:z.array(z.object({date:text(500),title:text(500),details:text(4000),source:text(1000),approximate:z.boolean()})).max(30),evidenceMap:z.record(z.string(),z.string().max(500)).default({}),selectedEvidence:z.array(z.string().max(200)).max(30),qualityFindings:z.array(z.object({level:text(30),title:text(500),detail:text(2000)})).max(30)});
export async function POST(request:Request){try{const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Please review the package information and try again."},{status:400});const pdf=createClaimPackagePdf(parsed.data);return new NextResponse(pdf,{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=personal-statement-review-package.pdf","Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"The review package could not be created."},{status:500})}}
