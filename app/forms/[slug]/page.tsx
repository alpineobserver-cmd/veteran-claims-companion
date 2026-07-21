import {notFound} from "next/navigation";
import {AppShell} from "@/components/app-shell";
import {getVAForm,getVAFormDownload,vaForms} from "@/lib/va-forms";
import {ArrowLeft,CheckCircle2,Download,ExternalLink,FileCheck2,Info,UserRound} from "lucide-react";
import Link from "next/link";
import "../forms.css";
import "../downloads.css";

export function generateStaticParams(){return vaForms.map(f=>({slug:f.slug}))}

export default async function FormPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const f=getVAForm(slug);
  if(!f)notFound();
  const download=getVAFormDownload(slug);
  return <AppShell current="forms"><div className="form-detail">
    <Link href="/forms" className="forms-back"><ArrowLeft size={15}/>All forms</Link>
    <header className="form-detail-hero"><div><span className="form-number large">{f.number}</span><span className="form-category">{f.category}</span></div><h1>{f.name}</h1><p>{f.purpose}</p><div className="form-current"><CheckCircle2 size={14}/>{f.status} · {f.revision}</div></header>
    <div className="form-detail-layout"><main>
      <FormSection title="When this form is commonly used"><p>{f.whenToUse}</p></FormSection>
      <FormSection title="Who completes it"><div className="who-completes"><UserRound size={18}/><strong>{f.completedBy}</strong></div></FormSection>
      <FormSection title="What it helps document"><FormList items={f.details}/></FormSection>
      <FormSection title="Common mistakes to avoid"><FormList items={f.mistakes}/></FormSection>
      <div className="official-form-box"><FileCheck2 size={22}/><div><span className="kicker">Official VA source</span><h2>Use a fresh official copy</h2><p>Review the VA instructions before completing the form. The direct action opens a VA-hosted PDF or, for DBQs, the official download directory.</p><div className="official-form-actions">{download&&<a href={download.url} target="_blank" rel="noreferrer" className="button primary">{download.kind==="pdf"?<Download size={14}/>:<ExternalLink size={14}/>} {download.label}</a>}<a href={f.officialUrl} target="_blank" rel="noreferrer" className="button secondary">Form information <ExternalLink size={14}/></a></div>{download&&<small>Download destination verified {download.verified}</small>}</div></div>
    </main><aside><div className="form-side"><span className="kicker">Related resources</span>{f.related.map(x=><div key={x}>{x}</div>)}</div><div className="form-side form-warning"><Info size={16}/><p>Do not send completed forms or personal information to Debrief. This application does not submit claims.</p></div></aside></div>
    <footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer>
  </div></AppShell>
}
function FormSection({title,children}:{title:string;children:React.ReactNode}){return <section className="form-section"><h2>{title}</h2>{children}</section>}
function FormList({items}:{items:string[]}){return <ul>{items.map(x=><li key={x}>{x}</li>)}</ul>}
