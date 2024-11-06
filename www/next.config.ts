import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => [
    {
      source: "/docs",
      destination: "/docs/home",
    },
  ],
};

export default nextConfig;
