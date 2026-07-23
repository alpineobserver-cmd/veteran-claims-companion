import { ArrowLeft, ExternalLink, Scale } from "lucide-react";
import Link from "next/link";
import "../legal.css";

const components=[
  ["Next.js and React","Web framework and interface runtime","MIT","https://nextjs.org"],
  ["Auth.js","Sign-in and sessions","ISC","https://authjs.dev"],
  ["Prisma","Database client and migration tooling","Apache-2.0","https://www.prisma.io"],
  ["Vercel Blob SDK","Object-storage client","Apache-2.0","https://vercel.com/storage/blob"],
  ["Lucide","Interface icons","ISC","https://lucide.dev"],
  ["Sharp","Image processing dependency","Apache-2.0","https://sharp.pixelplumbing.com"]
];

export default function LicensesPage(){return <main className="legal-page"><Link className="legal-back" href="/"><ArrowLeft size={14}/>Debrief home</Link><header><Scale size={25}/><span className="kicker">Open-source notices</span><h1>Licenses and attribution</h1><p>Debrief is built with open-source software and links to official government sources. This page identifies material components and attribution-sensitive dependencies in the current release.</p></header>
  <section><h2>Core components</h2><div className="source-register">{components.map(([name,use,license,url])=><article key={name}><div><strong>{name}</strong><span>{license}</span></div><small>{use}</small><a href={url} target="_blank" rel="noreferrer">Project and license information <ExternalLink size={11}/></a></article>)}</div></section>
  <section><h2>Additional notices</h2><ul><li>Sharp’s optional packaged libvips binaries identify their license as LGPL-3.0-or-later. Debrief does not modify libvips.</li><li>caniuse-lite browser-compatibility data is licensed under CC-BY-4.0 and maintained by its contributors.</li><li>eCFR and VA.gov links identify primary government authorities. Debrief’s explanations are local educational summaries and do not imply VA endorsement.</li></ul><div className="legal-sources"><a href="https://www.libvips.org/" target="_blank" rel="noreferrer">libvips <ExternalLink size={11}/></a><a href="https://github.com/browserslist/caniuse-lite" target="_blank" rel="noreferrer">caniuse-lite <ExternalLink size={11}/></a><Link href="/sources">Debrief source register</Link></div></section>
  <section><h2>Scope</h2><p>The complete machine-readable production dependency record is the release’s package lock and installed package license files. Product and project names remain the property of their owners. Inclusion does not imply endorsement. This notice is an engineering attribution record, not legal advice.</p></section>
  <footer><span><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span><span>Review recorded July 22, 2026.</span></footer>
</main>}
