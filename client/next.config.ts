import type { NextConfig } from "next";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  compress: true,
  async headers() {
    return [
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
