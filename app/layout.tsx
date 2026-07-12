import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Veteran Claims Companion", description: "Organize evidence and understand the VA disability claims process." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
