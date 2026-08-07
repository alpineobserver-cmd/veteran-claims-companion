import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  outputFileTracingRoot:process.cwd(),
  serverExternalPackages: ["@vercel/blob"],
  poweredByHeader:false,
  async headers(){return [{source:"/:path*",headers:[
    {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"X-Frame-Options",value:"DENY"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=(), usb=()"},
    {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
    {key:"Cross-Origin-Embedder-Policy",value:"require-corp"},
    {key:"Cross-Origin-Resource-Policy",value:"same-origin"},
    {key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains"}
  ]},{source:"/api/:path*",headers:[{key:"Cache-Control",value:"private, no-store"}]}]}
};
export default nextConfig;
