"use client";

import { AlertTriangle, Check, Download, FilePlus2, FileText, FolderPlus, LoaderCircle, LockKeyhole, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type Workspace={id:string;title:string;updatedAt:string;_count:{documents:number}};
type DocumentRecord={id:string;claimId:string;originalName:string;mimeType:string;size:number;status:string;provider:string;createdAt:string};

export function DocumentIntake({initialWorkspaces,initialDocuments}:{initialWorkspaces:Workspace[];initialDocuments:DocumentRecord[]}){
  const [workspaces,setWorkspaces]=useState(initialWorkspaces);const [documents,setDocuments]=useState(initialDocuments);
  const [claimId,setClaimId]=useState(initialWorkspaces[0]?.id||"");const [workspaceName,setWorkspaceName]=useState("");
  const [file,setFile]=useState<File|null>(null);const [confirmed,setConfirmed]=useState(false);const [dragging,setDragging]=useState(false);
  const [working,setWorking]=useState<""|"workspace"|"upload">("");const [error,setError]=useState("");const [notice,setNotice]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);const visibleDocuments=useMemo(()=>documents.filter(item=>item.claimId===claimId),[documents,claimId]);

  function chooseFile(next?:File){if(!next)return;setFile(next);setError("");setNotice("")}
  async function createWorkspace(event:React.FormEvent){event.preventDefault();setWorking("workspace");setError("");try{const response=await fetch("/api/workspaces",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:workspaceName})});const data=await response.json() as {workspace?:Workspace;error?:string};if(!response.ok||!data.workspace)throw new Error(data.error||"The workspace could not be created.");setWorkspaces(items=>[data.workspace!,...items]);setClaimId(data.workspace.id);setWorkspaceName("");setNotice("Test workspace created.")}catch(reason){setError(reason instanceof Error?reason.message:"The workspace could not be created.")}finally{setWorking("")}}
  async function upload(){if(!file||!claimId||!confirmed)return;setWorking("upload");setError("");setNotice("");const form=new FormData();form.set("file",file);form.set("claimId",claimId);form.set("syntheticConfirmed","true");try{const response=await fetch("/api/documents",{method:"POST",body:form});const data=await response.json() as {document?:DocumentRecord;error?:string};if(!response.ok||!data.document)throw new Error(data.error||"The test document could not be uploaded.");setDocuments(items=>[data.document!,...items]);setWorkspaces(items=>items.map(item=>item.id===claimId?{...item,_count:{documents:item._count.documents+1}}:item));setFile(null);setConfirmed(false);if(inputRef.current)inputRef.current.value="";setNotice("Test document stored privately.")}catch(reason){setError(reason instanceof Error?reason.message:"The test document could not be uploaded.")}finally{setWorking("")}}
  async function remove(document:DocumentRecord){if(!window.confirm(`Permanently delete ${document.originalName}?`))return;setError("");const response=await fetch(`/api/documents/${encodeURIComponent(document.id)}`,{method:"DELETE"});if(!response.ok){const data=await response.json().catch(()=>({})) as {error?:string};setError(data.error||"The document could not be deleted.");return}setDocuments(items=>items.filter(item=>item.id!==document.id));setWorkspaces(items=>items.map(item=>item.id===document.claimId?{...item,_count:{documents:Math.max(0,item._count.documents-1)}}:item));setNotice("The stored object and its active document record were deleted.")}

  return <div className="intake-wrap">
    <header className="intake-hero"><span className="kicker">Document intake foundation</span><h1>Start with a secure evidence workspace</h1><p>This development increment tests private document handling and ownership controls. AI review and real medical-record processing are not enabled.</p></header>
    <div className="test-only-warning"><AlertTriangle size={20}/><div><strong>Fictional test files only</strong><p>Do not upload real medical records, names, Social Security numbers, VA file numbers, or information about another person. Malware scanning and production health-data controls are not yet complete.</p></div></div>
    <section className="intake-security" aria-label="Current safeguards"><div><LockKeyhole size={18}/><span><strong>Private objects</strong><small>No public file URLs</small></span></div><div><ShieldCheck size={18}/><span><strong>Owner checks</strong><small>Every file request is authenticated</small></span></div><div><Check size={18}/><span><strong>Verified formats</strong><small>PDF, JPEG, and PNG signatures</small></span></div></section>

    <div className="intake-grid">
      <aside className="workspace-panel">
        <span className="kicker">Claim package</span><h2>Choose a workspace</h2>
        {workspaces.length?<label className="intake-field"><span>Workspace</span><select value={claimId} onChange={event=>{setClaimId(event.target.value);setError("");setNotice("")}}>{workspaces.map(item=><option value={item.id} key={item.id}>{item.title} · {item._count.documents} files</option>)}</select></label>:<p className="no-workspace">Create a workspace before adding a test document.</p>}
        <form className="new-workspace" onSubmit={createWorkspace}><label className="intake-field"><span>New workspace name</span><input value={workspaceName} onChange={event=>setWorkspaceName(event.target.value)} placeholder="For example, Migraine evidence review" maxLength={160}/></label><button className="button secondary" disabled={!workspaceName.trim()||Boolean(working)}>{working==="workspace"?<LoaderCircle className="spin" size={15}/>:<FolderPlus size={15}/>}Create workspace</button></form>
        <div className="intake-boundary"><strong>Not included yet</strong><ul><li>OCR or document summaries</li><li>AI issue identification</li><li>Malware scanning</li><li>Real-record authorization</li></ul></div>
      </aside>

      <main className="upload-panel">
        <div className="upload-heading"><div><span className="kicker">Document upload</span><h2>Add a test document</h2></div><span>Maximum 4 MB</span></div>
        <div className={`document-drop ${dragging?"dragging":""} ${file?"selected":""}`} onDragOver={event=>{event.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);chooseFile(event.dataTransfer.files[0])}}>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event=>chooseFile(event.target.files?.[0])}/>
          {file?<><FileText size={27}/><strong>{file.name}</strong><small>{formatBytes(file.size)} · ready for validation</small><button type="button" onClick={()=>inputRef.current?.click()}>Choose a different file</button></>:<><UploadCloud size={29}/><strong>Drop a fictional document here</strong><small>or choose a PDF, JPEG, or PNG</small><button type="button" onClick={()=>inputRef.current?.click()}><FilePlus2 size={14}/>Choose test file</button></>}
        </div>
        <label className="synthetic-confirm"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/><span><strong>I confirm this is an entirely fictional test document.</strong><small>It contains no real person’s health information, identifiers, or records.</small></span></label>
        <button type="button" className="button primary intake-upload-button" disabled={!file||!claimId||!confirmed||Boolean(working)} onClick={upload}>{working==="upload"?<LoaderCircle className="spin" size={16}/>:<UploadCloud size={16}/>}Upload to private test storage</button>
        {error&&<p className="intake-message error" role="alert">{error}</p>}{notice&&<p className="intake-message success" role="status">{notice}</p>}

        <div className="document-list"><div className="document-list-title"><h3>Documents in this workspace</h3><span>{visibleDocuments.length}</span></div>{visibleDocuments.length?visibleDocuments.map(document=><article key={document.id}><span className="document-icon"><FileText size={18}/></span><div><strong>{document.originalName}</strong><small>{formatBytes(document.size)} · {document.mimeType.replace("application/","").replace("image/","").toUpperCase()} · Uploaded {formatDate(document.createdAt)}</small><em>Test-only storage</em></div><div className="document-actions"><a href={`/api/documents/${document.id}/content`} aria-label={`Download ${document.originalName}`}><Download size={15}/></a><button type="button" onClick={()=>void remove(document)} aria-label={`Delete ${document.originalName}`}><Trash2 size={15}/></button></div></article>):<div className="empty-documents"><FileText size={22}/><p>No documents in this workspace yet.</p></div>}</div>
      </main>
    </div>
  </div>;
}

function formatBytes(value:number){if(value<1024)return`${value} bytes`;if(value<1024*1024)return`${(value/1024).toFixed(1)} KB`;return`${(value/(1024*1024)).toFixed(1)} MB`}
function formatDate(value:string){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value))}
