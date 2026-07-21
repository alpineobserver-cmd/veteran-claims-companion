import { AppShell } from "@/components/app-shell";
import { ConditionLibrary } from "@/components/condition-library";
import { Info } from "lucide-react";
import "./conditions.css";
import "./catalog.css";
export default function ConditionsPage(){return <AppShell current="conditions"><div className="library-wrap"><header className="library-hero"><span className="kicker">Conditions and rating schedules</span><h1>Start with the body system, then open the condition and code.</h1><p>Each listed condition connects its plain-language rating guide to the potentially relevant diagnostic-code paths. You can also search by diagnosis, body part, symptom, or code.</p></header><div className="library-caution"><Info size={18}/><p>A condition name does not always correspond to one diagnostic code. VA decides the applicable code, service connection, and severity from the complete record and current law. Always confirm rating language in the linked official source.</p></div><ConditionLibrary/><footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer></div></AppShell>}
