import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import {createReworkPackagePdf} from "@/lib/rework-package-pdf";
import {enforceAccountRateLimit,rateLimitPolicies} from "@/lib/rate-limit";
import type {ApprovedPackageSnapshot} from "@/lib/rework-state";
import {NextResponse} from "next/server";

export const runtime="nodejs";
type Context={params:Promise<{packageId:string}>};

export async function GET(_:Request,context:Context){
  const session=await auth();
  if(!session?.user?.id)return NextResponse.json({error:"Sign in to download this package."},{status:401});
  const limited=await enforceAccountRateLimit(session.user.id,[rateLimitPolicies.reworkDownload]);if(limited)return limited;
  const {packageId}=await context.params;
  const snapshot=await prisma.reworkPackageSnapshot.findUnique({where:{userId_packageId:{userId:session.user.id,packageId}},select:{state:true,checksum:true}});
  if(!snapshot)return NextResponse.json({error:"Approved package not found."},{status:404,headers:{"Cache-Control":"private, no-store"}});
  const pdf=createReworkPackagePdf(snapshot.state as unknown as ApprovedPackageSnapshot,snapshot.checksum);
  const safePackageId=packageId.replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,80);
  return new NextResponse(pdf,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="debrief-${safePackageId}.pdf"`,"Cache-Control":"private, no-store","Content-Security-Policy":"sandbox","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","X-Debrief-Snapshot-Checksum":snapshot.checksum}});
}
