import { AppShell } from "@/components/app-shell";
import { FormsLibrary } from "@/components/forms-library";
import { Download,Info } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import "./forms.css";
import "./downloads.css";
export const metadata:Metadata={title:"VA forms library",description:"Find current official VA forms and plain-language guidance about their common uses."};
export default function FormsPage(){return <AppShell current="forms"><div className="forms-wrap"><header className="forms-hero"><span className="kicker">VA forms library</span><h1>Find the right official form</h1><p>Understand what common forms are for, who completes them, and what to review before using the current version from VA.gov.</p></header><div className="fresh-form"><Download size={18}/><div><strong>Download when you’re ready to use it</strong><p>VA advises downloading a new copy from its official forms website instead of reusing a previously saved PDF.</p></div></div><FormsLibrary/><div className="forms-disclaimer"><Info size={16}/><p>This library explains common uses but does not determine which form or review option is right for a particular case. Follow the current official instructions or consult an accredited representative. <Link href="/support#content-correction">Report an outdated, broken, or incorrect form link.</Link></p></div><footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer></div></AppShell>}
