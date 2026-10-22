import type { NextConfig } from "next";

// The FastAPI backend. The browser only ever talks to this app's own origin: `/api/*` is
// proxied to the backend, so the backend's httponly session cookies are first-party here —
// no CORS setup, and nothing for browsers' third-party-cookie blocking to break.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

if (process.env.VERCEL && !process.env.BACKEND_URL) {
  throw new Error(
    "BACKEND_URL is not set. Add it in Vercel → Project → Settings → Environment Variables " +
      "(e.g. https://<your-app>.fastapicloud.dev).",
  );
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The signed-in areas (/patient, /pro) render client-side after the session check, so
    // they can't navigate "instantly" and would flood dev with instant-navigation insights.
    // Validate only routes that opt in with `export const instant = true`.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
