import { signIn } from "@/auth";
import { ArrowLeft, Fingerprint, LockKeyhole } from "lucide-react";

export default async function Login({searchParams}:{searchParams:Promise<{redirectTo?:string}>}){
  const requested=(await searchParams).redirectTo;
  const redirectTo=requested?.startsWith("/")&&!requested.startsWith("//")?requested:"/dashboard";

  return <main className="login-screen">
    <div className="login-grid" aria-hidden="true"/>
    <a className="login-back" href="/"><ArrowLeft size={15}/> Return to briefing</a>
    <section className="login-card">
      <div className="login-emblem"><Fingerprint size={25}/></div>
      <div className="classification">SECURE ACCESS // AUTHENTICATION REQUIRED</div>
      <span className="login-kicker">Debrief workspace</span>
      <h1>Resume your casework.</h1>
      <p>Continue securely with Google to save claim workspaces and resume them on another device.</p>
      <form action={async()=>{"use server";await signIn("google",{redirectTo})}}><button className="login-submit"><LockKeyhole size={16}/> Continue with Google</button></form>
      <div className="login-caution"><strong>MVP data handling</strong><span>Use fictional documents for testing. Do not enter a Social Security number or VA file number.</span></div>
      <p className="login-disclaimer">Debrief is an independent educational resource and is not affiliated with the U.S. Department of Veterans Affairs.</p>
    </section>
  </main>
}
