"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteClaimButton({id,title}:{id:string;title:string}){
  const router=useRouter();
  const [deleting,setDeleting]=useState(false);
  async function remove(){
    if(!window.confirm(`Delete the saved ${title} workspace? This cannot be undone.`))return;
    setDeleting(true);
    const response=await fetch(`/api/claims/${encodeURIComponent(id)}`,{method:"DELETE"});
    if(response.ok){router.refresh();return}
    setDeleting(false);window.alert("The claim could not be deleted. Please try again.");
  }
  return <button type="button" className="delete-claim" onClick={remove} disabled={deleting} aria-label={`Delete ${title} claim`}>{deleting?"…":<Trash2 size={15}/>}</button>;
}
