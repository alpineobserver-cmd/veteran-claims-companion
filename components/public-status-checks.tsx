"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";

type CheckState="checking"|"operational"|"degraded";
type Snapshot={state:CheckState;checkedAt:string|null;checks:Array<{id:string;label:string;ok:boolean}>};

const initialChecks=[
  {id:"site",label:"Public website and status service",ok:false},
  {id:"authentication",label:"Google sign-in configuration",ok:false},
  {id:"session",label:"Session service",ok:false}
];

async function safeJson(route:string,signal:AbortSignal){
  const response=await fetch(route,{cache:"no-store",credentials:"omit",signal,headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error("Unavailable");
  return response.json() as Promise<Record<string,unknown>>;
}

export function PublicStatusChecks(){
  const controllerRef=useRef<AbortController|null>(null);
  const [snapshot,setSnapshot]=useState<Snapshot>({state:"checking",checkedAt:null,checks:initialChecks});

  const runChecks=useCallback(async()=>{
    controllerRef.current?.abort();
    const controller=new AbortController();controllerRef.current=controller;
    setSnapshot(current=>({...current,state:"checking"}));
    const results=await Promise.allSettled([
      safeJson("/api/health",controller.signal).then(body=>body.status==="ok"&&body.service==="debrief"),
      safeJson("/api/auth/providers",controller.signal).then(body=>Boolean((body.google as {signinUrl?:unknown}|undefined)?.signinUrl)),
      safeJson("/api/auth/session",controller.signal).then(()=>true)
    ]);
    if(controller.signal.aborted)return;
    const checks=initialChecks.map((check,index)=>({...check,ok:results[index].status==="fulfilled"&&results[index].value===true}));
    setSnapshot({state:checks.every(check=>check.ok)?"operational":"degraded",checkedAt:new Date().toISOString(),checks});
  },[]);

  useEffect(()=>{void runChecks();return()=>controllerRef.current?.abort()},[runChecks]);

  const StatusIcon=snapshot.state==="checking"?LoaderCircle:snapshot.state==="operational"?CheckCircle2:CircleAlert;
  const label=snapshot.state==="checking"?"Checking services…":snapshot.state==="operational"?"Public services are responding":"One or more public services need attention";
  return <div className="status-snapshot" aria-live="polite" aria-busy={snapshot.state==="checking"}>
    <div className={`status-summary ${snapshot.state}`}><StatusIcon size={20} aria-hidden="true"/><div><strong>{label}</strong><p>{snapshot.checkedAt?`Checked ${new Date(snapshot.checkedAt).toLocaleString()}.`:"Running a privacy-safe check from this browser."}</p></div></div>
    <ul className="status-check-list">
      {snapshot.checks.map(check=><li key={check.id}><span className={snapshot.state==="checking"?"checking":check.ok?"operational":"degraded"} aria-hidden="true"/><strong>{check.label}</strong><small>{snapshot.state==="checking"?"Checking":check.ok?"Responding":"Unavailable"}</small></li>)}
    </ul>
    <button className="status-refresh" type="button" onClick={()=>void runChecks()} disabled={snapshot.state==="checking"}><RefreshCw size={14} aria-hidden="true"/>Check again</button>
  </div>;
}
