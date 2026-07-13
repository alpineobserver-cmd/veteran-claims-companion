import { AppShell } from "@/components/app-shell";
import { ClaimQuestionnaire } from "@/components/claim-questionnaire";
import "./claim-builder.css";
import "./questionnaire-status.css";
export default function ClaimBuilderPage(){return <AppShell current="builder"><ClaimQuestionnaire/><footer className="disclaimer">Veteran Claims Companion is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer></AppShell>}
