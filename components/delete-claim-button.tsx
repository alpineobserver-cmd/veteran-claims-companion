"use client";

import { Archive, Copy, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteClaimButton({id,title,archived=false}:{id:string;title:string;archived?:boolean}){
  const router=useRouter();
  const [working,setWorking]=useState<""|"archive"|"restore"|"duplicate"|"delete">("");
  async function action(type:"archive"|"restore"|"duplicate"){
    if(type==="archive"&&!window.confirm(`Archive the ${title} workspace? It will be removed from the active dashboard but not permanently deleted.`))return;
    setWorking(type);
    const response=await fetch(`/api/claims/${encodeURIComponent(id)}/actions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:type})});
    const data=await response.json().catch(()=>({})) as {error?:string};
    if(response.ok){router.refresh();setWorking("");return}
    setWorking("");window.alert(data.error||`The claim could not be ${type==="archive"?"archived":"duplicated"}.`);
  }
  async function remove(){
    if(!window.confirm(`Permanently delete the saved ${title} workspace and all of its uploaded files? This cannot be undone. Archive it instead if you may need it later.`))return;
    setWorking("delete");
    const response=await fetch(`/api/claims/${encodeURIComponent(id)}`,{method:"DELETE"});
    if(response.ok){router.refresh();return}
    setWorking("");window.alert("The claim could not be deleted. Please try again.");
  }
  return <>{archived?<button type="button" className="delete-claim" onClick={()=>void action("restore")} disabled={Boolean(working)} title="Restore workspace" aria-label={`Restore ${title} claim`}>{working==="restore"?"…":<RotateCcwIcon/>}</button>:<><button type="button" className="delete-claim" onClick={()=>void action("duplicate")} disabled={Boolean(working)} title="Duplicate workspace" aria-label={`Duplicate ${title} claim`}>{working==="duplicate"?"…":<Copy size={14}/>}</button><button type="button" className="delete-claim" onClick={()=>void action("archive")} disabled={Boolean(working)} title="Archive workspace" aria-label={`Archive ${title} claim`}>{working==="archive"?"…":<Archive size={14}/>}</button></>}<button type="button" className="delete-claim permanent" onClick={remove} disabled={Boolean(working)} title="Permanently delete workspace" aria-label={`Permanently delete ${title} claim`}>{working==="delete"?"…":<Trash2 size={15}/>}</button></>;
}

function RotateCcwIcon(){return <span aria-hidden="true" className="restore-icon">↺</span>}
