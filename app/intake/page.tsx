import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { DocumentIntake } from "@/components/document-intake";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "./intake.css";

export const metadata:Metadata={title:"Document upload",description:"Add and organize fictional Alpha test documents in a private Debrief workspace."};

export default async function IntakePage(){
  const session=await auth();if(!session?.user?.id)redirect("/login?redirectTo=/intake");
  const [workspaces,documents]=await Promise.all([
    prisma.claim.findMany({where:{userId:session.user.id,status:{not:"ARCHIVED"}},orderBy:{updatedAt:"desc"},select:{id:true,title:true,updatedAt:true,_count:{select:{documents:true}}}}),
    prisma.document.findMany({where:{userId:session.user.id},orderBy:{createdAt:"desc"},select:{id:true,claimId:true,originalName:true,mimeType:true,size:true,status:true,provider:true,createdAt:true}})
  ]);
  const user={id:session.user.id,name:session.user.name,email:session.user.email,image:session.user.image};
  return <AppShell current="intake" user={user}><DocumentIntake initialWorkspaces={workspaces.map(item=>({...item,updatedAt:item.updatedAt.toISOString()}))} initialDocuments={documents.map(item=>({...item,createdAt:item.createdAt.toISOString()}))}/><footer className="disclaimer">Test-only document environment. Do not upload real medical records, SSNs, VA file numbers, or another person’s information.</footer></AppShell>;
}
