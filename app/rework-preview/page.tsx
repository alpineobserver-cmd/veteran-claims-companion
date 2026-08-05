import {auth} from "@/auth";
import type {Metadata} from "next";
import {ReworkPrototype} from "@/components/rework-prototype";
import {getDeploymentIdentity} from "@/lib/deployment-environment";
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
  return <ReworkPrototype user={{name:session?.user?.name||"Fictional tester",localTestProfile}}/>;
}
