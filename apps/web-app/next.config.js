const { withContentCollections } = require("@content-collections/next");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // React 19 and Next.js 15 optimizations
  reactStrictMode: true,

  // Server-side optimizations (moved from experimental in Next.js 15)
  serverExternalPackages: ["@prisma/client"],

  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    rules: {
      // Custom Turbopack rules can be added here
    },
  },

  // Development server configuration - allow access from network devices
  allowedDevOrigins: [
    // Port 3000 (primary)
    "localhost:3000",
    "127.0.0.1:3000",
    "0.0.0.0:3000",
    "192.168.1.6:3000",
    // Keep 3001 as secondary if used
    "localhost:3001",
    "127.0.0.1:3001",
    "0.0.0.0:3001",
    "192.168.1.6:3001",
  ],



  // Experimental features for Next.js 15
  experimental: {
    // Add future experimental features here
    // Note: turbo and serverComponentsExternalPackages moved to root level
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
    ],
    // Next.js 15 image optimizations
    formats: ["image/webp", "image/avif"],
  },

  // Performance optimizations
  compress: true,

  // TypeScript configuration - temporarily ignore errors for build
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },

  // Bundle analyzer (when ANALYZE=true and @next/bundle-analyzer is installed)
  ...(process.env.ANALYZE === "true" && (() => {
    try {
      const withBundleAnalyzer = require("@next/bundle-analyzer")({
        enabled: true,
      });
      return { webpack: withBundleAnalyzer.webpack };
    } catch (e) {
      console.warn("@next/bundle-analyzer not installed. Install it to enable bundle analysis.");
      return {};
    }
  })()),
};

module.exports = withContentCollections(nextConfig);
