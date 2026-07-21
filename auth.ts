import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authAuditLogger, logAuthEvent } from "@/lib/auth-audit";
import { registrationsEnabled } from "@/lib/operational-controls";

export const {handlers,auth,signIn,signOut}=NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
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
    async signIn({account}) {
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
