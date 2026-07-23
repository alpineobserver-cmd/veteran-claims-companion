import {AppShell} from "@/components/app-shell";
import {changeLog} from "@/lib/changelog";
import {ExternalLink,History,Info} from "lucide-react";
import type { Metadata } from "next";
import "./changelog.css";

export const metadata:Metadata={title:"Change log",description:"Review meaningful Debrief content, guidance, and platform changes."};

export default function ChangeLogPage(){return <AppShell current="changelog"><div className="change-wrap">
  <header className="change-hero"><span className="kicker">Transparency and maintenance</span><h1>Change log</h1><p>Track meaningful updates to regulatory content, form links, guidance, and platform behavior.</p></header>
  <div className="change-note"><Info size={17}/><p>This history records changes to Debrief—not changes made by VA itself. Regulatory and form updates include official source links when available.</p></div>
  <div className="change-timeline">{changeLog.map((entry,index)=><article className="change-entry" key={`${entry.date}-${entry.title}`}><div className="change-marker"><History size={15}/><span>{new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${entry.date}T00:00:00Z`))}</span></div><div className="change-card"><span className={`change-category ${entry.category.toLowerCase().replace(" ","-")}`}>{entry.category}</span>{index===0&&<span className="latest-label">Latest</span>}<h2>{entry.title}</h2><p>{entry.summary}</p><ul>{entry.changes.map(change=><li key={change}>{change}</li>)}</ul>{entry.sources&&<div className="change-sources">{entry.sources.map(source=><a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.label}<ExternalLink size={12}/></a>)}</div>}</div></article>)}</div>
  <footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer>
</div></AppShell>}
