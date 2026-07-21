import { AppShell } from "@/components/app-shell";
import { ClaimQuestionnaire } from "@/components/claim-questionnaire";
import { auth } from "@/auth";
import "./claim-builder.css";
import "./questionnaire-status.css";
import "./personal-statement.css";
import "./statement-provenance.css";
import "./smart-builder.css";
import "./intent-to-file.css";
export default async function ClaimBuilderPage({searchParams}:{searchParams:Promise<{claim?:string;new?:string}>}){const [session,params]=await Promise.all([auth(),searchParams]);const user=session?.user?{id:session.user.id,name:session.user.name}:undefined;const fresh=params.new==="1"&&!params.claim;return <AppShell current="builder" user={user}><ClaimQuestionnaire user={user} initialClaimId={params.claim} fresh={fresh}/><footer className="disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</footer></AppShell>}
