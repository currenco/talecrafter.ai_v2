import type { NextConfig } from "next";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  compress: true,
  async redirects() {
    return [{
      source: "/:path*",
      has: [{ type: "host", value: "talecrafterai.com" }],
      destination: "https://www.talecrafterai.com/:path*",
      permanent: true,
    }];
  },
  async headers() {
    return [
      ...(process.env.VERCEL_ENV === "preview" ? [{
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      }] : []),
      {
        source: "/frames/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.pollinations.ai",
      },
      {
        protocol: "https",
        hostname: "gen.pollinations.ai",
      },
    ],
  },
};

export default nextConfig;
