import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  serverExternalPackages: ["@vercel/blob"]
};
export default nextConfig;
