import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { DeleteAccountButton, SignOutIcon } from "@/components/account-controls";
import { prisma } from "@/lib/prisma";
import { Cloud, FileText, Info, ShieldCheck } from "lucide-react";
import "./account.css";

export default async function AccountPage(){
  const session=await auth();if(!session?.user?.id)redirect("/login?redirectTo=/account");
  const user=session.user;
  const [claims,documents]=await Promise.all([prisma.claim.count({where:{userId:user.id}}),prisma.document.count({where:{userId:user.id}})]);
  return <AppShell current="account" user={{id:user.id,name:user.name,email:user.email,image:user.image}}><div className="account-wrap">
    <header><span className="kicker">Account and data</span><h1>Control your alpha workspace</h1><p>Review what Debrief stores for this account and remove it when you are finished testing.</p></header>
    <section className="account-card"><ShieldCheck size={20}/><div><h2>Google sign-in</h2><p>Debrief uses your Google name, email address, profile image, and account identifier only to authenticate you and connect your private workspaces to your account.</p><strong>{user.email}</strong></div></section>
    <div className="account-counts"><div><Cloud size={18}/><span>Saved workspaces</span><strong>{claims}</strong></div><div><FileText size={18}/><span>Test documents</span><strong>{documents}</strong></div></div>
    <section className="account-card"><Info size={20}/><div><h2>Alpha data boundary</h2><p>This build is restricted to fictional information. Do not enter real health information, an SSN, a VA file number, or another person’s information.</p><p>Read the <a href="/privacy">Alpha Privacy Notice</a> and <a href="/terms">Alpha Terms of Use</a>.</p></div></section>
    <section className="account-actions"><div><h2>Sign out</h2><p>End the current browser session without deleting saved work.</p><form action={async()=>{"use server";await signOut({redirectTo:"/"})}}><button className="button secondary"><SignOutIcon/>Sign out</button></form></div><div className="danger-zone"><h2>Delete account</h2><p>Permanently deletes the account, authentication records, saved claims, drafts, and uploaded test files. This cannot be undone.</p><DeleteAccountButton/></div></section>
  </div></AppShell>;
}
