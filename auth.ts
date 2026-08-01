import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authAuditLogger, logAuthEvent } from "@/lib/auth-audit";
import { registrationsEnabled } from "@/lib/operational-controls";
import {cookies} from "next/headers";
import {emitSecurityEvent} from "@/lib/security-events";
import {googleAuthenticationClaims,googleMfaMode,googleMfaSatisfied} from "@/lib/google-auth-strength";

const nextAuth=NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({authorization:{params:{claims:JSON.stringify(googleAuthenticationClaims)}}}),
    ...(process.env.AUTH_MICROSOFT_ENTRA_ID_ID?.trim()&&process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET?.trim()?[MicrosoftEntraID]:[])
  ],
  pages: { signIn: "/login", error: "/auth/error" },
  session: { strategy: "database" },
  logger: authAuditLogger,
  events: {
    signIn({account,isNewUser}) {
      logAuthEvent("sign_in_succeeded",{provider:account?.provider??"unknown",isNewUser:Boolean(isNewUser)});
    },
    signOut() {
      logAuthEvent("sign_out_succeeded");
    }
  },
  callbacks: {
    async signIn({account,profile}) {
      if(account?.provider==="google"){
        const mode=googleMfaMode();const satisfied=googleMfaSatisfied(profile);
        if(mode!=="disabled")emitSecurityEvent("auth_strength_observed",{code:satisfied?"google_strong_auth_present":"google_strong_auth_missing",provider:"google"},satisfied?"info":"warn");
        if(mode==="enforced"&&!satisfied){
          logAuthEvent("sign_in_blocked",{code:"google_mfa_required",provider:"google"});
          return "/auth/error?error=MfaRequired";
        }
      }
      if(registrationsEnabled()||!account?.provider||!account.providerAccountId)return true;
      const existing=await prisma.account.findUnique({where:{provider_providerAccountId:{provider:account.provider,providerAccountId:account.providerAccountId}},select:{id:true}});
      if(existing)return true;
      logAuthEvent("sign_in_blocked",{code:"registrations_paused",provider:account.provider});
      return "/auth/error?error=RegistrationPaused";
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    }
  }
});

export const {handlers,signIn,signOut}=nextAuth;

export async function auth(){
  const browserTestRuntime=
    process.env.NODE_ENV!=="production"&&
    process.env.APP_ENV==="development"&&
    process.env.RELEASE_ID==="browser-test"&&
    process.env.DEBRIEF_BROWSER_TEST_PROFILE==="enabled";
  const browserTestSession=browserTestRuntime&&(await cookies()).get("debrief-browser-test-profile")?.value==="enabled";
  if(browserTestSession){
    return {
      user:{
        id:"fictional-browser-tester",
        name:"Fictional browser tester",
        email:"fictional-browser-tester@example.invalid",
        image:null
      },
      expires:new Date(Date.now()+60*60*1000).toISOString()
    };
  }
  return nextAuth.auth();
}
