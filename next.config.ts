import type { NextConfig } from "next";

// One codebase, two builds (see src/lib/platform.ts):
//   web (default) — the website on Vercel; /api/* is proxied to the backend.
//   app           — `npm run build:app`: a static export bundled into the iOS/Android apps.
const IS_APP = process.env.NEXT_PUBLIC_BUILD_TARGET === "app";

const turbopack: NextConfig["turbopack"] = {
  rules: {
    "*.css": {
      loaders: ["@tailwindcss/turbopack"],
      as: "*.css",
    },
  },
};

function webConfig(): NextConfig {
  // The FastAPI backend. The browser only ever talks to this site's own origin: `/api/*` is
  // proxied to the backend, so its httponly session cookies are first-party here — no CORS
  // setup, and nothing for browsers' third-party-cookie blocking to break.
  const backendUrl = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  if (process.env.VERCEL && !process.env.BACKEND_URL) {
    throw new Error(
      "BACKEND_URL is not set. Add it in Vercel → Project → Settings → Environment Variables " +
        "(e.g. https://<your-app>.fastapicloud.dev).",
    );
  }
  return {
    cacheComponents: true,
    partialPrefetching: true,
    experimental: {
      // The signed-in areas (/patient, /pro) render client-side after the session check, so
      // they can't navigate "instantly" and would flood dev with instant-navigation insights.
      // Validate only routes that opt in with `export const instant = true`.
      instantInsights: { validationLevel: "manual-warning" },
    },
    turbopack,
    async rewrites() {
      return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
    },
  };
}

function appConfig(): NextConfig {
  // Static files only: no Next server inside the app, so no rewrites, no image optimizer and
  // no Cache Components (the pages already fetch everything client-side). Each route exports
  // as <route>/index.html, which the native WebView's local file server resolves directly.
  return {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
    // With output: "export" this is where the finished site lands — Capacitor's webDir. It
    // also keeps the app build from clobbering the web build's .next/.
    distDir: "out",
    turbopack,
  };
}

const nextConfig: NextConfig = IS_APP ? appConfig() : webConfig();

export default nextConfig;
