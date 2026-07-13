import { AppShell } from "@/components/app-shell";
import { ConditionLibrary } from "@/components/condition-library";
import { Info } from "lucide-react";
import "./conditions.css";
import "./catalog.css";
export default function ConditionsPage(){return <AppShell current="conditions"><div className="library-wrap"><header className="library-hero"><span className="kicker">Conditions and rating schedules</span><h1>Search in your own words. See how the CFR is organized.</h1><p>Browse approachable condition guides alongside potentially relevant diagnostic codes and official rating sources. Search by a diagnosis, body part, symptom, or code.</p></header><div className="library-caution"><Info size={18}/><p>A condition name does not always correspond to one diagnostic code. VA decides the applicable code, service connection, and severity from the complete record and current law. Always confirm rating language in the linked official source.</p></div><ConditionLibrary/><footer className="disclaimer">Veteran Claims Companion is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer></div></AppShell>}
