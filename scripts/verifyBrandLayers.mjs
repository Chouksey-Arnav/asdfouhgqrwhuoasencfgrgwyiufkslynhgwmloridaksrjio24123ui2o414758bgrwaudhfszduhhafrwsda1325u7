#!/usr/bin/env node
/*
 * Fails the build if the brand loader's artwork and its animation have drifted
 * apart.
 *
 * The loader in src/components/BrandJourney.jsx composites nine transparent
 * slices of the logo, each positioned by a CSS class in src/index.css and each
 * relying on the others being the same square canvas — the layers register with
 * each other only because they are identical in size and stacked at inset:0.
 * Nothing about that is enforced by the type system, and every failure mode is
 * silent: a missing file is an invisible beat, a differently-sized export is a
 * mark whose head floats off its shoulders, a renamed class is a layer that
 * never animates. All of those look fine in a build log and wrong on screen.
 *
 * Checked here:
 *   1. every layer BrandJourney.jsx asks for exists in public/brand
 *   2. all of them are the same square size, and carry an alpha channel
 *   3. every layer's CSS class actually has a rule in index.css
 *   4. the JOURNEY_MS the component ships stays inside the intended range
 *
 * Run via `npm run verify:brand` (also part of `npm run build`). Regenerate the
 * artwork with `npm run brand:layers`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

// The journey is meant to be watchable, not endured. These are the bounds the
// design was signed off against; a change past them is a product decision, not
// a tweak, so it should have to come here and say so.
const DURATION_MIN_MS = 6000;
const DURATION_MAX_MS = 10000;

const errors = [];
const component = read('src/components/BrandJourney.jsx');
const css = read('src/index.css');

// 1 + 3. The layer table is the single source of truth for both halves.
const table = component.match(/const LAYERS = \[([\s\S]*?)\];/);
if (!table) {
  errors.push('BrandJourney.jsx: could not find the LAYERS table — has it been renamed?');
}
const layers = table ? [...table[1].matchAll(/\['([\w-]+)',\s*'([\w-]+)'\]/g)].map(m => [m[1], m[2]]) : [];
if (table && layers.length === 0) {
  errors.push('BrandJourney.jsx: the LAYERS table parsed as empty.');
}

// 2. PNG dimensions and colour type come straight out of the IHDR chunk; no
//    decoder needed, and no dependency to keep current.
function pngHeader(path) {
  const buf = readFileSync(resolve(ROOT, path));
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}

let expected = null;
for (const [name, cls] of layers) {
  const file = `public/brand/${name}.png`;
  if (!existsSync(resolve(ROOT, file))) {
    errors.push(`${file} is missing — run \`npm run brand:layers\`.`);
    continue;
  }
  const hdr = pngHeader(file);
  if (!hdr) { errors.push(`${file} is not a PNG.`); continue; }
  if (hdr.width !== hdr.height) {
    errors.push(`${file} is ${hdr.width}x${hdr.height}; layers must be square to stay in register.`);
  }
  if (hdr.colorType !== 6) {
    errors.push(`${file} has no alpha channel (colour type ${hdr.colorType}) — it would paint a black tile over the layers beneath it.`);
  }
  if (expected === null) expected = hdr.width;
  else if (hdr.width !== expected) {
    errors.push(`${file} is ${hdr.width}px wide but the other layers are ${expected}px; every layer must share one canvas.`);
  }
  if (!new RegExp(`\\.${cls}\\b`).test(css)) {
    errors.push(`index.css has no rule for .${cls} (the "${name}" layer), so it would never animate.`);
  }
}

// The mark is the fallback the loader shows at small sizes.
if (!existsSync(resolve(ROOT, 'public/brand/mark.png'))) {
  errors.push('public/brand/mark.png is missing — run `npm run brand:layers`.');
}

// 4.
const duration = component.match(/export const JOURNEY_MS = (\d+);/);
if (!duration) {
  errors.push('BrandJourney.jsx: JOURNEY_MS is no longer a plain literal, so its length cannot be checked here.');
} else {
  const ms = Number(duration[1]);
  if (ms < DURATION_MIN_MS || ms > DURATION_MAX_MS) {
    errors.push(`JOURNEY_MS is ${ms}ms; the journey is meant to run between ${DURATION_MIN_MS}ms and ${DURATION_MAX_MS}ms.`);
  }
}

if (errors.length) {
  console.error('verify:brand — FAILED\n');
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}
console.log(`verify:brand — OK: ${layers.length} layers at ${expected}px, journey ${duration[1]}ms`);
