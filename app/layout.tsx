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
  // Reading request headers makes App Router rendering request specific.
  // Next.js reads the middleware-provided CSP nonce for its bootstrap scripts
  // instead of falling back to Production unsafe-inline execution.
  await headers();
  return <html lang="en"><body><DeploymentBanner/>{children}</body></html>;
}
