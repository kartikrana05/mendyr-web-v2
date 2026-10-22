#!/usr/bin/env node
// Regenerates every app icon and splash screen (both platforms) from public/mendyr.png:
//   1. writes the source images @capacitor/assets expects into assets/
//   2. runs @capacitor/assets to produce each size inside android/ and ios/
// Run after changing the logo:  npm run app:assets
//
// Rules baked in: App Store icons must be fully opaque; Android adaptive icons are masked
// to a circle/squircle, so the mark stays inside the always-visible centre of the canvas.

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

import sharp from "sharp";

const LOGO = "public/mendyr.png";
const ICON_BG = { r: 255, g: 255, b: 255, alpha: 1 }; // white tile, like the original app icon
const SPLASH_BG = { r: 247, g: 249, b: 252, alpha: 1 }; // #F7F9FC, the app's background
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

async function logo(size) {
  return sharp(LOGO).resize(size, size, { fit: "contain", background: CLEAR }).png().toBuffer();
}

async function square(size, background, logoSize, out, { opaque = true } = {}) {
  let image = sharp({ create: { width: size, height: size, channels: 4, background } }).composite([
    { input: await logo(logoSize), gravity: "center" },
  ]);
  if (opaque) image = image.flatten({ background }).removeAlpha();
  await image.png().toFile(out);
  console.log(`wrote ${out}`);
}

mkdirSync("assets", { recursive: true });
// iOS (and the legacy Android icon): mark at ~70% on an opaque white square.
await square(1024, ICON_BG, 720, "assets/icon-only.png");
// Android adaptive icon: 1024 canvas, of which the centre ~66% always survives the mask.
await square(1024, CLEAR, 600, "assets/icon-foreground.png", { opaque: false });
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: ICON_BG } })
  .png()
  .toFile("assets/icon-background.png");
console.log("wrote assets/icon-background.png");
// Splash: mark centred on the app background (the app has no dark theme).
await square(2732, SPLASH_BG, 560, "assets/splash.png");
await square(2732, SPLASH_BG, 560, "assets/splash-dark.png");

const result = spawnSync(
  "npx",
  [
    "@capacitor/assets",
    "generate",
    "--android",
    "--ios",
    "--iconBackgroundColor",
    "#FFFFFF",
    "--iconBackgroundColorDark",
    "#FFFFFF",
    "--splashBackgroundColor",
    "#F7F9FC",
    "--splashBackgroundColorDark",
    "#F7F9FC",
  ],
  { stdio: "inherit", shell: process.platform === "win32" },
);
process.exit(result.status ?? 1);
