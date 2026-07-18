import type { Metadata } from "next";
import "./globals.css";
import "./shell.css";
import "./theme.css";
export const metadata: Metadata = { title: { default:"Debrief", template:"%s | Debrief" }, description: "Organize evidence, understand potential conditions, and prepare your VA disability claim." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
