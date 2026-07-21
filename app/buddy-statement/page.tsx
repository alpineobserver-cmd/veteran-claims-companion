import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { BuddyStatementBuilder } from "@/components/buddy-statement-builder";
import { claimDraftSchema } from "@/lib/claim-drafts";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import "./buddy-statement.css";

export default async function BuddyStatementPage({searchParams}:{searchParams:Promise<{claim?:string}>}){
  const [session,params]=await Promise.all([auth(),searchParams]);if(!session?.user?.id)redirect("/login?redirectTo=/buddy-statement");
  const claims=await prisma.claim.findMany({where:{userId:session.user.id,status:{not:"ARCHIVED"}},orderBy:{updatedAt:"desc"},select:{id:true,title:true,draftVersion:true,draftData:true}});if(!claims.length)redirect("/claim-builder?new=1");
  const selected=claims.find(claim=>claim.id===params.claim)||claims[0];const draft=claimDraftSchema.safeParse(selected.draftData);
  const user={id:session.user.id,name:session.user.name,email:session.user.email,image:session.user.image};
  return <AppShell current="package" user={user}><div className="buddy-page-back"><Link className="button secondary" href={`/claim-builder?claim=${encodeURIComponent(selected.id)}`}>Return to Claim Builder</Link></div><BuddyStatementBuilder workspaces={claims.map(claim=>({id:claim.id,title:claim.title}))} claimId={selected.id} claimTitle={selected.title} initialVersion={selected.draftVersion} initialStatements={draft.success?draft.data.buddyStatements||[]:[]}/><footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer></AppShell>;
}
