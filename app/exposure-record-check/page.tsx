import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ExposureRecordCheck } from "@/components/exposure-record-check";
import "./exposure-record-check.css";

export const metadata:Metadata={
  title:"Exposure Record Check",
  description:"A guided educational check for military environmental exposure programs and records.",
  alternates:{canonical:"/exposure-record-check"},
  robots:{index:process.env.DATA_ENVIRONMENT==="production",follow:process.env.DATA_ENVIRONMENT==="production"}
};

export default function ExposureRecordCheckPage(){
  return <AppShell current="exposures" publicMode>
    <ExposureRecordCheck/>
    <footer className="disclaimer">This educational check does not verify an exposure, registry enrollment, health condition, or eligibility for VA benefits.</footer>
  </AppShell>;
}
