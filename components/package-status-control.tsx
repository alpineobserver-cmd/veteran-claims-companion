"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { packageStatusLabels, packageStatuses, type PackageStatus } from "@/lib/claim-package-workflow";

export function PackageStatusControl({claimId,status,version}:{claimId:string;status:PackageStatus;version:number}){
  const router=useRouter();const [working,setWorking]=useState(false);const [error,setError]=useState("");
  async function update(next:PackageStatus){
    if(next===status)return;
    const confirmSubmitted=next!=="submitted"||window.confirm("Only mark this submitted if you completed the filing outside Debrief. Debrief cannot verify that VA received it. Continue?");
    if(!confirmSubmitted)return;
    setWorking(true);setError("");
    const response=await fetch(`/api/claims/${encodeURIComponent(claimId)}/actions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"package_status",status:next,version,confirmSubmitted})});
    const data=await response.json().catch(()=>({})) as {error?:string};
    if(!response.ok){setError(data.error||"The package status could not be updated.");setWorking(false);return}
    router.refresh();
  }
  return <div className="package-status-control"><label><span>Package item status</span><select value={status} disabled={working} onChange={event=>void update(event.target.value as PackageStatus)}>{packageStatuses.map(item=><option key={item} value={item}>{packageStatusLabels[item]}</option>)}</select></label>{working?<small><LoaderCircle className="spin" size={12}/>Saving status…</small>:status==="submitted"?<small><Check size={12}/>User-recorded status; VA receipt is not verified.</small>:null}{error&&<small className="error" role="alert">{error}</small>}</div>;
}
