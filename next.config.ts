import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
