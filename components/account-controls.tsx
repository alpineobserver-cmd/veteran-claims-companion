"use client";

import { LogOut, Trash2 } from "lucide-react";
import { useState } from "react";

export function DeleteAccountButton(){
  const [deleting,setDeleting]=useState(false);const [error,setError]=useState("");
  async function remove(){
    if(!window.confirm("Permanently delete your Debrief account, claim workspaces, drafts, and uploaded test documents? This cannot be undone."))return;
    if(!window.confirm("Final confirmation: delete all account data now?"))return;
    setDeleting(true);setError("");
    const response=await fetch("/api/account",{method:"DELETE"});
    if(response.ok){window.location.replace("/");return}
    const data=await response.json().catch(()=>({})) as {error?:string};setError(data.error||"The account could not be deleted.");setDeleting(false);
  }
  return <div><button type="button" className="button danger" onClick={remove} disabled={deleting}><Trash2 size={15}/>{deleting?"Deleting account…":"Delete account and data"}</button>{error&&<p className="account-error" role="alert">{error}</p>}</div>;
}

export function SignOutIcon(){return <LogOut size={15}/>}
