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
        hostname: "WWW.renewtech.fr",
      },

     {
        protocol: "https",
        hostname: "w7.pngwing.com",
      },
      

    ],
  },

  // Empêche Next.js de bundler pdfkit avec webpack, ce qui casse
  // la résolution de ses fichiers de polices (.afm) au runtime.
  serverExternalPackages: ["pdfkit"],

  // Sécurité supplémentaire pour le build/production (Vercel, standalone, etc.) :
  // s'assure que les fichiers de polices pdfkit sont bien inclus dans le bundle serveur.
  outputFileTracingIncludes: {
    "/api/admin/contracts": ["./node_modules/pdfkit/js/data/**"],
    "/api/admin/contracts/[id]/pdf": ["./node_modules/pdfkit/js/data/**"],
  },
};

export default nextConfig;