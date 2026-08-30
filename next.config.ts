import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth", "xlsx"],
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
