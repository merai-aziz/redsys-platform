import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow this host to access Next.js dev resources during development
  allowedDevOrigins: ["192.168.1.7"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.renewtech.fr",
      },
      {
        protocol: "https",
        hostname: "renewtech.fr",
      },
    ],
  },
};

export default nextConfig;
