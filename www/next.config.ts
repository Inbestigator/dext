import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => [
    {
      source: "/docs",
      destination: "/docs/commands",
      permanent: false,
    },
  ],
};

export default nextConfig;
