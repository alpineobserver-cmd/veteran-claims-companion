import type { Metadata } from "next";
import "./globals.css";
import "./shell.css";
import "./theme.css";
export const metadata: Metadata = { title: { default:"Debrief", template:"%s | Debrief" }, description: "A self-directed educational tool for organizing fictional alpha claim scenarios.", robots:{index:false,follow:false,nocache:true} };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
