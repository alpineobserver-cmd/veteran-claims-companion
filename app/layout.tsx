import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./shell.css";
import "./theme.css";
import "./accessibility.css";
import "./deployment-banner.css";
import { DeploymentBanner } from "@/components/deployment-banner";
export const metadata: Metadata = { title: { default:"Debrief", template:"%s | Debrief" }, description: "A self-directed educational tool for organizing fictional alpha claim scenarios.", robots:{index:false,follow:false,nocache:true} };
export default async function RootLayout({children}:{children:React.ReactNode}) {
  // Reading the middleware-provided nonce makes App Router rendering request
  // specific. Next.js then applies that nonce to its bootstrap scripts instead
  // of falling back to Production unsafe-inline execution.
  const nonce=(await headers()).get("x-nonce")||undefined;
  return <html lang="en"><body nonce={nonce} suppressHydrationWarning><DeploymentBanner/>{children}</body></html>;
}
