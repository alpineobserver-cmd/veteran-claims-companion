import type { NextConfig } from "next";
const isDevelopment=process.env.NODE_ENV!=="production";
const contentSecurityPolicy=[
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment?" 'unsafe-eval'":""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:"
].join("; ");
const nextConfig: NextConfig = {
  serverExternalPackages: ["@vercel/blob"],
  poweredByHeader:false,
  async headers(){return [{source:"/:path*",headers:[
    {key:"Content-Security-Policy",value:contentSecurityPolicy},
    {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"X-Frame-Options",value:"DENY"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=(), usb=()"},
    {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
    {key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"}
  ]},{source:"/api/:path*",headers:[{key:"Cache-Control",value:"private, no-store"}]}]}
};
export default nextConfig;
