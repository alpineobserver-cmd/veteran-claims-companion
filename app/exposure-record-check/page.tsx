import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { ExposureRecordCheck } from "@/components/exposure-record-check";
import "./exposure-record-check.css";

export const metadata:Metadata={
  title:"Exposure Record Check",
  description:"A guided educational check for military environmental exposure programs and records."
};

export default async function ExposureRecordCheckPage(){
  const session=await auth();
  const user=session?.user?{id:session.user.id,name:session.user.name}:undefined;
  return <AppShell current="exposures" user={user}>
    <ExposureRecordCheck/>
    <footer className="disclaimer">This educational check does not verify an exposure, registry enrollment, health condition, or eligibility for VA benefits.</footer>
  </AppShell>;
}
