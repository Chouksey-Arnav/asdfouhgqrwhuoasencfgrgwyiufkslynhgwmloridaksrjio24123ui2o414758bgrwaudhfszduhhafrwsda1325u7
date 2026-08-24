#!/usr/bin/env node
/*
 * Splits public/logo.png into the six transparent layers the brand loader
 * animates: the two halves of the book, the figure, its head, the dotted trail
 * and the star.
 *
 * Why derive them instead of hand-drawing SVG: the loader has to be the real
 * mark, not a lookalike. Every layer here is literally logo.png's own pixels —
 * stacked back on top of each other at inset:0 they reproduce the source art
 * exactly — so the animation can reveal the mark part by part without any
 * chance of the shapes drifting away from the brand asset.
 *
 * How it works:
 *   1. logo.png is glow art rendered over a near-black backdrop, so a pixel's
 *      max channel is its coverage. Un-premultiplying by that gives straight
 *      alpha and the true color, which is what puts the mark on the app's own
 *      background instead of a black tile.
 *   2. Bright cores are labelled with a connected-component pass and named by
 *      size + centroid (see CLASSIFY).
 *   3. Every remaining pixel is assigned to its nearest core by a multi-source
 *      BFS, so each layer carries its own glow and the partition is complete —
 *      no pixel is dropped and none is counted twice.
 *
 * Run with `npm run brand:layers` after changing public/logo.png.
 * Requires no dependencies beyond Node — PNG decode/encode is done inline.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'public/logo.png');
const OUT_DIR = resolve(ROOT, 'public/brand');

// Everything at or below this channel value is the backdrop, not art. Set just
// above the source's #00000c matte plus its dithering noise.
const BLACK_FLOOR = 22;
// Connected-component seeds. High enough that the glow between parts does not
// bridge them, low enough to keep each part whole.
const CORE_LEVEL = 110;
// The two sails of the M genuinely touch at the spine, so they arrive as one
// component and get cut down the middle.
const SPINE_X = 625;
// The star's lower spike and the topmost trail dot are joined by a hairline.
const STAR_CUT_Y = 370;
// The four trail dots are one run of pixels. Cutting between them (rows taken
// from the gaps in the trail's alpha profile) lets the loader light them one at
// a time, so the path visibly draws itself from the figure's hand to the star.
const TRAIL_CUTS_Y = [537, 482, 417];
// Layers are emitted at this size: ~3x the largest on-screen loader mark.
const OUT_SIZE = 512;

// ── minimal PNG codec ────────────────────────────────────────────────────────
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function decodePng(buf) {
  let pos = 8, width = 0, height = 0, depth = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; colorType = data[9];
      if (depth !== 8 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`unsupported PNG: depth ${depth}, color type ${colorType}`);
      }
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : 3;
  const stride = width * ch;
  const out = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride); p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { width, height, channels: ch, data: out };
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    // Filter 1 (Sub) compresses these flat, glow-heavy layers well and keeps
    // the encoder simple; the files are a few tens of KB either way.
    raw[y * (stride + 1)] = 1;
    const src = rgba.subarray(y * stride, (y + 1) * stride);
    const dst = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) dst[x] = (src[x] - (x >= 4 ? src[x - 4] : 0)) & 0xff;
  }
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Box-filter downscale in premultiplied space, so transparent pixels cannot
// bleed their color into the edges of the art.
function resize(width, height, rgba, size) {
  const out = Buffer.alloc(size * size * 4);
  const sx = width / size, sy = height / size;
  for (let y = 0; y < size; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let j = y0; j < y1; j++) {
        for (let i = x0; i < x1; i++) {
          const k = (j * width + i) * 4, av = rgba[k + 3] / 255;
          r += rgba[k] * av; g += rgba[k + 1] * av; b += rgba[k + 2] * av;
          a += rgba[k + 3]; n++;
        }
      }
      const k = (y * size + x) * 4;
      const am = a / n;
      out[k + 3] = Math.round(am);
      if (am > 0) {
        const s = 255 / a;
        out[k] = Math.min(255, Math.round(r * s));
        out[k + 1] = Math.min(255, Math.round(g * s));
        out[k + 2] = Math.min(255, Math.round(b * s));
      }
    }
  }
  return out;
}

// ── extraction ───────────────────────────────────────────────────────────────
const { width: W, height: H, channels, data } = decodePng(readFileSync(SRC));
const N = W * H;

const alpha = new Uint8Array(N);
const color = new Uint8Array(N * 3);
const core = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const k = i * channels;
  const r = data[k], g = data[k + 1], b = data[k + 2];
  const v = Math.max(r, g, b);
  core[i] = v > CORE_LEVEL ? 1 : 0;
  if (v <= BLACK_FLOOR) continue;
  alpha[i] = Math.min(255, Math.round(((v - BLACK_FLOOR) * 255) / (255 - BLACK_FLOOR)));
  const s = 255 / v;
  color[i * 3] = Math.min(255, Math.round(r * s));
  color[i * 3 + 1] = Math.min(255, Math.round(g * s));
  color[i * 3 + 2] = Math.min(255, Math.round(b * s));
}

const LAYERS = [
  'book-left', 'book-right', 'figure', 'head',
  'trail-1', 'trail-2', 'trail-3', 'trail-4', 'star',
];

// Which trail dot a pixel belongs to, counted outward from the figure's hand.
function trailLayer(y) {
  for (let i = 0; i < TRAIL_CUTS_Y.length; i++) if (y >= TRAIL_CUTS_Y[i]) return `trail-${i + 1}`;
  return `trail-${TRAIL_CUTS_Y.length + 1}`;
}

// Named by size and centroid rather than by hard-coded pixel boxes, so a
// re-exported logo.png that shifts a little still lands in the right buckets.
function classify(count, cx, cy) {
  if (count > 50000) return 'wings';               // both sails, joined at the spine
  if (cy > 820) return cx < SPINE_X ? 'book-left' : 'book-right';  // the page fans
  if (count < 9000 && cy < 620) return 'head';
  if (cx > 780) return 'trail';                    // trail + star, split by row
  return 'figure';
}

const label = new Int32Array(N).fill(-1);
const queue = new Int32Array(N);
let head = 0, tail = 0;

// 1. Seed: label the bright cores, 8-connected.
const seedName = [];
const stack = new Int32Array(N);
for (let i = 0; i < N; i++) {
  if (!core[i] || label[i] !== -1) continue;
  const id = seedName.length;
  let sp = 0, count = 0, sx = 0, sy = 0;
  stack[sp++] = i; label[i] = id;
  const pixels = [];
  while (sp) {
    const j = stack[--sp];
    pixels.push(j); count++;
    const jx = j % W, jy = (j / W) | 0;
    sx += jx; sy += jy;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = jx + dx, ny = jy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (core[k] && label[k] === -1) { label[k] = id; stack[sp++] = k; }
      }
    }
  }
  if (count < 300) { for (const p of pixels) label[p] = -1; continue; }  // speck
  const name = classify(count, sx / count, sy / count);
  seedName.push(name);
  for (const p of pixels) {
    // 'wings' is one component covering both sails; 'trail' arrives fused to
    // the star. Both are resolved per pixel here rather than per component.
    let n = name;
    if (n === 'wings') n = p % W < SPINE_X ? 'book-left' : 'book-right';
    else if (n === 'trail') n = ((p / W) | 0) < STAR_CUT_Y ? 'star' : trailLayer((p / W) | 0);
    label[p] = LAYERS.indexOf(n);
    queue[tail++] = p;
  }
  console.log(`  component ${String(count).padStart(6)}px @(${Math.round(sx / count)},${Math.round(sy / count)}) → ${name}`);
}

// 2. Grow: every pixel joins its nearest core, so glow travels with its part.
const owner = label;
while (head < tail) {
  const j = queue[head++];
  const g = owner[j];
  const jx = j % W, jy = (j / W) | 0;
  if (jx + 1 < W && owner[j + 1] === -1) { owner[j + 1] = g; queue[tail++] = j + 1; }
  if (jx > 0 && owner[j - 1] === -1) { owner[j - 1] = g; queue[tail++] = j - 1; }
  if (jy + 1 < H && owner[j + W] === -1) { owner[j + W] = g; queue[tail++] = j + W; }
  if (jy > 0 && owner[j - W] === -1) { owner[j - W] = g; queue[tail++] = j - W; }
}

// 3. Emit one full-canvas RGBA layer each, plus the whole mark on transparency.
mkdirSync(OUT_DIR, { recursive: true });
const full = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  full[i * 4] = color[i * 3]; full[i * 4 + 1] = color[i * 3 + 1];
  full[i * 4 + 2] = color[i * 3 + 2]; full[i * 4 + 3] = alpha[i];
}
for (let li = 0; li < LAYERS.length; li++) {
  const buf = Buffer.alloc(N * 4);
  let kept = 0;
  for (let i = 0; i < N; i++) {
    if (owner[i] !== li || !alpha[i]) continue;
    buf[i * 4] = color[i * 3]; buf[i * 4 + 1] = color[i * 3 + 1];
    buf[i * 4 + 2] = color[i * 3 + 2]; buf[i * 4 + 3] = alpha[i];
    kept++;
  }
  const png = encodePng(OUT_SIZE, OUT_SIZE, resize(W, H, buf, OUT_SIZE));
  writeFileSync(resolve(OUT_DIR, `${LAYERS[li]}.png`), png);
  console.log(`${LAYERS[li].padEnd(11)} ${String(kept).padStart(7)}px → ${(png.length / 1024).toFixed(1)} kB`);
}
const markPng = encodePng(OUT_SIZE, OUT_SIZE, resize(W, H, full, OUT_SIZE));
writeFileSync(resolve(OUT_DIR, 'mark.png'), markPng);
console.log(`mark        ${' '.repeat(7)}  → ${(markPng.length / 1024).toFixed(1)} kB`);
