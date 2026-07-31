import { signIn } from "@/auth";
import { ArrowLeft, Fingerprint } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { MicrosoftSignInButton } from "@/components/microsoft-sign-in-button";
import { logAuthEvent } from "@/lib/auth-audit";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata:Metadata={title:"Sign in",description:"Sign in to open your private Debrief account and save your claim progress."};

export default async function Login({searchParams}:{searchParams:Promise<{redirectTo?:string;retry?:string}>}){
  const params=await searchParams;
  const requested=params.redirectTo;
  const redirectTo=requested?.startsWith("/")&&!requested.startsWith("//")?requested:"/dashboard";

  return <main className="login-screen">
    <div className="login-grid" aria-hidden="true"/>
    <Link className="login-back" href="/"><ArrowLeft size={15} aria-hidden="true"/> Return to Debrief home</Link>
    <section className="login-card">
      <div className="login-emblem"><Fingerprint size={25} aria-hidden="true"/></div>
      <div className="classification">SECURE ACCESS // AUTHENTICATION REQUIRED</div>
      <span className="login-kicker">Your private Debrief account</span>
      <h1>Sign in before adding claim information.</h1>
      <p>New accounts begin with a clean service and health intake. Returning users resume their active claim package.</p>
      {params.retry==="1"&&<div className="login-retry-note" role="status"><strong>Fresh sign-in ready.</strong><span>Close any older Google sign-in tabs, then continue once below.</span></div>}
      <form action={async()=>{"use server";logAuthEvent("sign_in_started",{provider:"google"});await signIn("google",{redirectTo})}}><GoogleSignInButton/></form>
      {process.env.AUTH_MICROSOFT_ENTRA_ID_ID?.trim()&&process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET?.trim()?<form action={async()=>{"use server";logAuthEvent("sign_in_started",{provider:"microsoft-entra-id"});await signIn("microsoft-entra-id",{redirectTo})}}><MicrosoftSignInButton/></form>:null}
      <div className="login-caution"><strong>Alpha data boundary</strong><span>Use fictional information and documents only. Do not enter health information, a Social Security number, a VA file number, or another person’s information.</span></div>
      <p className="login-disclaimer">By continuing, you acknowledge the <Link href="/terms">Alpha Terms</Link> and <Link href="/privacy">Privacy Notice</Link>. Debrief is independent educational software, not VA or a VA-accredited representative, and does not provide legal or medical advice.</p>
    </section>
  </main>
}
