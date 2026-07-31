import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { ExposureRecordCheck } from "@/components/exposure-record-check";
import {redirect} from "next/navigation";
import "./exposure-record-check.css";

export const metadata:Metadata={
  title:"Exposure Record Check",
  description:"A guided educational check for military environmental exposure programs and records."
};

export default async function ExposureRecordCheckPage(){
  const session=await auth();
  if(!session?.user?.id)redirect("/login?redirectTo=/exposure-record-check");
  const user={id:session.user.id,name:session.user.name};
  return <AppShell current="exposures" user={user}>
    <ExposureRecordCheck/>
    <footer className="disclaimer">This educational check does not verify an exposure, registry enrollment, health condition, or eligibility for VA benefits.</footer>
  </AppShell>;
}
