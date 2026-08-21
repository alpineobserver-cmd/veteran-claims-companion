import {auth} from "@/auth";
import type {Metadata} from "next";
import {ReworkPrototype} from "@/components/rework-prototype";
import {getDeploymentIdentity} from "@/lib/deployment-environment";
import {prisma} from "@/lib/prisma";
import {reworkStateSchema,type SavedState} from "@/lib/rework-state";
import {redirect} from "next/navigation";
import "./rework-preview.css";

export const metadata:Metadata={
  title:"Guided case journey preview",
  description:"A fictional, interactive preview of the proposed Debrief case journey."
};

export default async function ReworkPreviewPage({searchParams}:{searchParams:Promise<{fictionalTester?:string}>}){
  const [session,params]=await Promise.all([auth(),searchParams]);
  const localTestProfile=getDeploymentIdentity().environment==="development"&&params.fictionalTester==="1";
  if(!session?.user?.id&&!localTestProfile)redirect("/login?redirectTo=/rework-preview");
  const accountData=session?.user?.id?await Promise.all([
    prisma.reworkProfile.findUnique({where:{userId:session.user.id},select:{state:true,version:true}}),
    prisma.reworkPackageSnapshot.findMany({where:{userId:session.user.id},select:{packageId:true}})
  ]):null;
  const parsed=accountData?.[0]?reworkStateSchema.safeParse(accountData[0].state):null;
  const initialState=(parsed?.success?parsed.data:null) as SavedState|null;
  return <ReworkPrototype user={{name:session?.user?.name||"Fictional tester",localTestProfile}} initialState={initialState} initialVersion={accountData?.[0]?.version||0} approvedPackageIds={accountData?.[1].map(item=>item.packageId)||[]}/>;
}
