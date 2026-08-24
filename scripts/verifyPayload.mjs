// ─────────────────────────────────────────────────────────────────────────────
// First-load payload budget.
//
// Measures what a student actually downloads before this app can render
// anything: every asset index.html references as a module script, a
// modulepreload or a stylesheet, gzipped, added up. Those are all
// render-blocking — a modulepreload is not "deferred", it is "fetch this now
// because we are about to need it".
//
// ── Why this is an accessibility script and not just a perf one ─────────────
// The target audience is teenagers, and the modal device is a mid-range Android
// on a school or household connection, not a flagship on wifi. At the time this
// was written the entry graph came to ~3.0 MB gzipped, which is roughly 12 MB of
// JavaScript to decompress, parse and compile. On a mid-range phone that is tens
// of seconds to interactive, during which the app is a blank screen — and a
// blank screen is not a slow experience, it is an inaccessible one. WCAG has no
// criterion for it, which is precisely why it needs a number here instead.
//
// This script does not fix that. It is a ratchet: the budget is set at the
// measured value, so the number cannot quietly grow while the real work — route
// -level code splitting, and getting the question banks out of the entry graph —
// is scheduled. Lower the budget as chunks move out; run with --update to
// re-baseline after a deliberate change.
//
// Run: node scripts/verifyPayload.mjs [--update]
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const BASELINE = path.join(ROOT, 'scripts', 'payloadBaseline.json');
const UPDATE = process.argv.includes('--update');

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.log('\nFirst-load payload budget\n');
  console.log('  · no dist/index.html — run after `vite build`. Skipping.\n');
  process.exit(0);
}

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
// Everything the document pulls in before it can paint: module scripts,
// modulepreloads and stylesheets alike.
const refs = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))];

const rows = [];
let total = 0;
for (const r of refs) {
  const p = path.join(DIST, r);
  if (!fs.existsSync(p)) continue;
  const gz = zlib.gzipSync(fs.readFileSync(p)).length;
  rows.push([r, gz]);
  total += gz;
}
rows.sort((a, b) => b[1] - a[1]);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log('\nFirst-load payload budget\n');
console.log(`  entry       ${rows.length} render-blocking assets, ${kb(total)} gzipped`);
for (const [name, gz] of rows.slice(0, 5)) {
  console.log(`  · ${kb(gz).padStart(8)}  ${name}`);
}

const prev = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;

if (UPDATE || !prev) {
  fs.writeFileSync(BASELINE, `${JSON.stringify({ gzipBytes: total, assets: rows.length }, null, 2)}\n`);
  console.log(`\n✓ baseline set at ${kb(total)} gzipped.\n`);
  process.exit(0);
}

// A little headroom so an ordinary copy edit does not fail the build; anything
// that moves the number by more than this is a new dependency or a new screen
// in the entry graph, and wants a decision rather than a shrug.
const SLACK = 24 * 1024;
const delta = total - prev.gzipBytes;

if (delta > SLACK) {
  console.error(`\n✗ first-load payload grew by ${kb(delta)} (${kb(prev.gzipBytes)} → ${kb(total)} gzipped).\n`);
  console.error('  This is the number that decides whether a student on a mid-range Android');
  console.error('  ever sees the app. If the growth is deliberate, load the new code with a');
  console.error('  dynamic import() so it leaves the entry graph, or re-baseline with');
  console.error('  `node scripts/verifyPayload.mjs --update` and say why in the commit.\n');
  process.exit(1);
}

if (delta < -SLACK) {
  console.log(`\n✓ payload DOWN ${kb(-delta)} (${kb(prev.gzipBytes)} → ${kb(total)}). Re-baseline with --update to lock the win in.\n`);
  process.exit(0);
}

console.log(`\n✓ first-load payload holding at ${kb(total)} gzipped (baseline ${kb(prev.gzipBytes)}).\n`);
