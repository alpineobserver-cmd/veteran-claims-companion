import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authAuditLogger, logAuthEvent } from "@/lib/auth-audit";

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
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    }
  }
});
