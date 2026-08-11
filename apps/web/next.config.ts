import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  typedRoutes: false,
  async rewrites() {
    // INTERNAL_API_URL is a server-side-only secret (not prefixed NEXT_PUBLIC_)
    // Fall back to NEXT_PUBLIC_API_URL for backwards compat, stripping /api/v1 suffix
    const rawUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";
    const backendUrl = rawUrl.replace(/\/api\/v1\/?$/, "");

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
