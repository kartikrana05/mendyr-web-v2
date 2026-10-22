#!/usr/bin/env node
// Builds the mobile app bundle: a static export of this Next.js app with the app-only
// settings (NEXT_PUBLIC_BUILD_TARGET=app, see src/lib/platform.ts), then copies it into the
// native projects with `cap sync`.
//
//   NEXT_PUBLIC_API_URL=https://<backend>.fastapicloud.dev npm run build:app
//   npm run build:app -- --no-sync      # export only (CI syncs per platform)
//
// Cross-platform on purpose (plain Node, no shell env syntax) so it runs on Windows too.

import { spawnSync } from "node:child_process";

const env = { ...process.env, NEXT_PUBLIC_BUILD_TARGET: "app" };
if (!env.NEXT_PUBLIC_API_URL) {
  console.error(
    "NEXT_PUBLIC_API_URL is not set. The app talks to the backend directly, e.g.\n" +
      "  NEXT_PUBLIC_API_URL=https://<backend>.fastapicloud.dev npm run build:app",
  );
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["next", "build"]);
if (!process.argv.includes("--no-sync")) run("npx", ["cap", "sync"]);
