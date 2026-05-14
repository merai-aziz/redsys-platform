import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow this host to access Next.js dev resources during development
  allowedDevOrigins: ["192.168.229.58"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.renewtech.fr",
      },
      {
        protocol: "https",
        hostname: "WWW.renewtech.fr",
      },

     {
        protocol: "https",
        hostname: "w7.pngwing.com",
      },
      

    ],
  },
};

export default nextConfig;
