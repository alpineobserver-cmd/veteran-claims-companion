import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
const emailProvider = process.env.EMAIL_SERVER && process.env.EMAIL_FROM
  ? [Nodemailer({ server: process.env.EMAIL_SERVER, from: process.env.EMAIL_FROM })]
  : [];

export const {handlers,auth,signIn,signOut}=NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google, ...emailProvider],
  pages: { signIn: "/login" },
  session: { strategy: "database" }
});
