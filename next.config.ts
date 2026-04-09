import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { hostname: "shopping-phinf.pstatic.net" },
      { hostname: "*.coupangcdn.com" },
      { hostname: "thumbnail*.coupangcdn.com" },
    ],
  },
};

export default nextConfig;
