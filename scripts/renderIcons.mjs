// Regenerates every raster icon in public/ from the one master vector,
// public/icon.svg, so the favicon, the PWA install icons and the iOS home
// screen icon can never drift away from the mark the app actually renders.
//
//   npm run icons
//
// Rasterises through the Playwright Chromium that already ships with the repo
// (used by the routing e2e checks) rather than adding a native image
// dependency just for this.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const master = path.join(root, 'public', 'icon.svg');

// The apple-touch icon is composited onto the tile itself (iOS ignores
// transparency and would otherwise flatten it onto white).
const TARGETS = [
  ['favicon.png', 64],
  ['icon-16.png', 16],
  ['icon-32.png', 32],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];

const svg = fs.readFileSync(master, 'utf8');
// CHROMIUM_PATH lets a preinstalled browser stand in when the local Playwright
// build revision doesn't match what's on disk (CI images, sandboxes).
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);

for (const [name, size] of TARGETS) {
  // iOS ignores alpha and rounds the corners itself, so the home-screen icon is
  // rendered opaque on the tile colour instead of leaving transparent corners
  // that would flatten to white.
  const opaque = name === 'apple-touch-icon.png';
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<body style="margin:0;background:${opaque ? '#03050d' : 'transparent'}">` +
    `<div style="width:${size}px;height:${size}px">` +
    svg.replace('<svg ', `<svg width="${size}" height="${size}" `) +
    `</div></body>`
  );
  await page.screenshot({ path: path.join(root, 'public', name), omitBackground: !opaque });
  await page.close();
  console.log(`  ✓ public/${name} (${size}×${size})`);
}

await browser.close();
console.log('\nIcons regenerated from public/icon.svg');
