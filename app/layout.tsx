import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./shell.css";
import "./theme.css";
import "./accessibility.css";
import "./deployment-banner.css";
import { DeploymentBanner } from "@/components/deployment-banner";
const searchIndexable=process.env.DATA_ENVIRONMENT==="production";
export const metadata: Metadata = { metadataBase:new URL("https://debriefclaims.com"), title: { default:"Debrief VA claim resources", template:"%s | Debrief" }, description: "Browse VA disability rating resources, official forms, and exposure-record guidance.", robots:{index:searchIndexable,follow:searchIndexable} };
export default async function RootLayout({children}:{children:React.ReactNode}) {
  // Reading the middleware-provided nonce makes App Router rendering request
  // specific. Next.js then applies that nonce to its bootstrap scripts instead
  // of falling back to Production unsafe-inline execution.
  const nonce=(await headers()).get("x-nonce")||undefined;
  return <html lang="en"><body nonce={nonce} suppressHydrationWarning><DeploymentBanner/>{children}</body></html>;
}
