import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/handover/:path*",
        destination: "/private/handover/:path*",
        permanent: true,
      },
      {
        source: "/handovers/:path*",
        destination: "/private/handovers/:path*",
        permanent: true,
      },
      {
        source: "/admin/:path*",
        destination: "/private/admin/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
