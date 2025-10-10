const nextConfig = {
  // Explicitly set Turbopack root to this workspace to avoid lockfile root warnings
  turbopack: {
    root: __dirname,
  },
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
