import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth", "xlsx"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/score", destination: "/upload/score", permanent: false },
      { source: "/score/:id", destination: "/upload/score/:id", permanent: false },
      { source: "/transcribe", destination: "/upload/prepare", permanent: false },
      { source: "/transcribe/:id", destination: "/upload/prepare/:id", permanent: false },
      { source: "/calls/:id/score", destination: "/upload/score/:id", permanent: false },
      { source: "/calls/:id/transcribe", destination: "/upload/prepare/:id", permanent: false },
    ];
  },
};

export default nextConfig;
