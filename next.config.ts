import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./lib/content-security-policy";
const isDevelopment=process.env.NODE_ENV!=="production";
const csp=contentSecurityPolicy(isDevelopment);
const nextConfig: NextConfig = {
  serverExternalPackages: ["@vercel/blob"],
  poweredByHeader:false,
  async headers(){return [{source:"/:path*",headers:[
    {key:"Content-Security-Policy",value:csp},
    {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"X-Frame-Options",value:"DENY"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=(), usb=()"},
    {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
    {key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"}
  ]},{source:"/api/:path*",headers:[{key:"Cache-Control",value:"private, no-store"}]}]}
};
export default nextConfig;
