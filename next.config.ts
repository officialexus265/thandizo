import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Vercel build shouldn't fail on eslint package path quirks
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep type checking on; only ignore if truly needed
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
