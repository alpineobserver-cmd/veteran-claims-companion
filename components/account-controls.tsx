"use client";

import { Download, LogOut, Trash2 } from "lucide-react";
import { useState } from "react";

export function DeleteAccountButton(){
  const [deleting,setDeleting]=useState(false);const [error,setError]=useState("");
  async function remove(){
    if(!window.confirm("Permanently delete your Debrief account, claim workspaces, drafts, and uploaded test documents? This cannot be undone."))return;
    if(!window.confirm("Final confirmation: delete all account data now?"))return;
    setDeleting(true);setError("");
    const response=await fetch("/api/account",{method:"DELETE"});
    if(response.ok){const data=await response.json() as {receipt?:unknown};if(data.receipt){const blob=new Blob([JSON.stringify(data.receipt,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=window.document.createElement("a");link.href=url;link.download=`debrief-deletion-receipt-${new Date().toISOString().slice(0,10)}.json`;window.document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>{URL.revokeObjectURL(url);window.location.replace("/?accountDeleted=1")},250)}else window.location.replace("/?accountDeleted=1");return}
    const data=await response.json().catch(()=>({})) as {error?:string};setError(data.error||"The account could not be deleted.");setDeleting(false);
  }
  return <div><button type="button" className="button danger" onClick={remove} disabled={deleting}><Trash2 size={15}/>{deleting?"Deleting account…":"Delete account and data"}</button>{error&&<p className="account-error" role="alert">{error}</p>}</div>;
}

export function SignOutIcon(){return <LogOut size={15}/>}
export function ExportIcon(){return <Download size={15}/>}
