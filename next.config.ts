import type { NextConfig } from "next";
import { appBasePath } from "./src/lib/app-paths";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  basePath: appBasePath,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: `${appBasePath}/login`,
        basePath: false,
        permanent: false,
      },
      {
        source: "/login",
        destination: `${appBasePath}/login`,
        basePath: false,
        permanent: false,
      },
      {
        source: "/robots.txt",
        destination: `${appBasePath}/robots.txt`,
        basePath: false,
        permanent: false,
      },
      {
        source: "/reset-password/:path*",
        destination: `${appBasePath}/reset-password/:path*`,
        basePath: false,
        permanent: false,
      },
      {
        source: "/settings/:path*",
        destination: `${appBasePath}/settings/:path*`,
        basePath: false,
        permanent: false,
      },
      {
        source: "/results/:path*",
        destination: `${appBasePath}/results/:path*`,
        basePath: false,
        permanent: false,
      },
      {
        source: "/manual/:path*",
        destination: `${appBasePath}/manual/:path*`,
        basePath: false,
        permanent: false,
      },
      {
        source: "/privacy/:path*",
        destination: `${appBasePath}/privacy/:path*`,
        basePath: false,
        permanent: false,
      },
      {
        source: "/terms/:path*",
        destination: `${appBasePath}/terms/:path*`,
        basePath: false,
        permanent: false,
      },
      {
        source: "/api/:path*",
        destination: `${appBasePath}/api/:path*`,
        basePath: false,
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
