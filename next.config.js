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
