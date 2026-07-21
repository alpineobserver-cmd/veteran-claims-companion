import { signIn } from "@/auth";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { logAuthEvent } from "@/lib/auth-audit";
import Link from "next/link";

export default async function Login({searchParams}:{searchParams:Promise<{redirectTo?:string;retry?:string}>}){
  const params=await searchParams;
  const requested=params.redirectTo;
  const redirectTo=requested?.startsWith("/")&&!requested.startsWith("//")?requested:"/dashboard";

  return <main className="login-screen">
    <div className="login-grid" aria-hidden="true"/>
    <Link className="login-back" href="/"><ArrowLeft size={15} aria-hidden="true"/> Return to briefing</Link>
    <section className="login-card">
      <div className="login-emblem"><Fingerprint size={25} aria-hidden="true"/></div>
      <div className="classification">SECURE ACCESS // AUTHENTICATION REQUIRED</div>
      <span className="login-kicker">Debrief workspace</span>
      <h1>Resume your casework.</h1>
      <p>Continue securely with Google to save claim workspaces and resume them on another device.</p>
      {params.retry==="1"&&<div className="login-retry-note" role="status"><strong>Fresh sign-in ready.</strong><span>Close any older Google sign-in tabs, then continue once below.</span></div>}
      <form action={async()=>{"use server";logAuthEvent("sign_in_started",{provider:"google"});await signIn("google",{redirectTo})}}><GoogleSignInButton/></form>
      <div className="login-caution"><strong>Alpha data boundary</strong><span>Use fictional information and documents only. Do not enter health information, a Social Security number, a VA file number, or another person’s information.</span></div>
      <p className="login-disclaimer">By continuing, you acknowledge the <Link href="/terms">Alpha Terms</Link> and <Link href="/privacy">Privacy Notice</Link>. Debrief is independent educational software, not VA or a VA-accredited representative, and does not provide legal or medical advice.</p>
    </section>
  </main>
}
