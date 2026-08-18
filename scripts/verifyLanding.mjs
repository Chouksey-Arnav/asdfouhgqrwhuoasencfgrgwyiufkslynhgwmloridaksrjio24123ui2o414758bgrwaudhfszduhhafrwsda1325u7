#!/usr/bin/env node
/**
 * Fails the build if the landing page ever ships as two pages at once.
 *
 * ── Why this is a build gate ────────────────────────────────────────────────
 *
 * This repo keeps every landing page it has ever shipped. v1
 * (src/components/LandingPage.jsx) is still in the tree and still compiles even
 * though v2 is what a visitor sees, because "put the old one back" has to be a
 * one-line change to a page that provably WAS live — not a reconstruction from
 * memory six months later.
 *
 * That arrangement has exactly one failure mode, and it is quiet: a second
 * import of a retired version creeps in somewhere, and now the app renders one
 * landing page down one route and a different one down another. Nobody reports
 * it, because whoever looks only ever takes one of the two paths. So the rule is
 * mechanical — every version is imported in src/components/landing/landingVersions.js
 * and nowhere else, and exactly one of them is active.
 *
 * Run: `node scripts/verifyLanding.mjs` (wired into `npm run build`).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const REGISTRY = 'src/components/landing/landingVersions.js';
const failures = [];
const fail = (why) => failures.push(why);

const registry = read(REGISTRY);

// ── 1. The registry names every version, and marks exactly one active ───────

const declared = [...registry.matchAll(/^\s{2}(\d+):\s*\{/gm)].map((m) => Number(m[1]));
if (declared.length < 2) {
  fail(`${REGISTRY} declares ${declared.length} version(s). The point of the registry is that retired versions stay in it — deleting one is what this check exists to stop.`);
}

const activeMatch = /export const ACTIVE_LANDING_VERSION = (\d+);/.exec(registry);
if (!activeMatch) {
  fail(`${REGISTRY} no longer exports ACTIVE_LANDING_VERSION. That constant is the switch; without it nothing decides which page ships.`);
}
const active = activeMatch ? Number(activeMatch[1]) : null;
if (active != null && !declared.includes(active)) {
  fail(`ACTIVE_LANDING_VERSION is ${active}, which is not one of the declared versions (${declared.join(', ')}).`);
}

// Each declared version must point at a source file that exists, and each of
// those files must be the one the registry imports.
const sources = [...registry.matchAll(/source:\s*'([^']+)'/g)].map((m) => m[1]);
if (sources.length !== declared.length) {
  fail(`${REGISTRY} declares ${declared.length} versions but ${sources.length} source paths. Every version records the file it lives in.`);
}
for (const source of sources) {
  try {
    statSync(path.join(ROOT, source));
  } catch {
    fail(`${REGISTRY} names ${source}, which does not exist. A retired landing page stays in the tree — see the header of the registry.`);
  }
}

// ── 2. Nothing else imports a landing page directly ─────────────────────────
//
// The registry is the single door. An import anywhere else is how two versions
// end up on screen at once.

const SRC = path.join(ROOT, 'src');
const IMPORT_RE = /(?:import\s[^;]*?from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(jsx?|tsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

const registryAbs = path.join(ROOT, REGISTRY);
const landingModules = new Set(
  sources.map((s) => path.join(ROOT, s).replace(/\.jsx?$/, '')),
);

for (const file of walk(SRC)) {
  if (file === registryAbs) continue;
  const source = readFileSync(file, 'utf8');
  for (const [, spec] of source.matchAll(IMPORT_RE)) {
    if (!spec.startsWith('.')) continue;
    const resolved = path.resolve(path.dirname(file), spec).replace(/\.jsx?$/, '');
    if (landingModules.has(resolved)) {
      fail(
        `${path.relative(ROOT, file)} imports a landing page version directly ("${spec}"). ` +
          `Import { ActiveLandingPage } from '${REGISTRY}' instead — otherwise two versions can render in one build.`,
      );
    }
  }
}

// ── 3. The active version is actually wired to the signed-out route ─────────

const authGate = read('src/components/AuthGate.jsx');
if (!authGate.includes('ActiveLandingPage')) {
  fail(
    'src/components/AuthGate.jsx no longer renders ActiveLandingPage. It is the only place the landing page is mounted; ' +
      'if it stopped asking the registry, the registry stopped deciding anything.',
  );
}

// ── Report ──────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error('\n✗ Landing page versioning is broken:\n');
  for (const why of failures) console.error(`  • ${why}\n`);
  process.exit(1);
}

console.log(
  `✓ Landing versions: ${declared.join(', ')} in the tree, v${active} active, imported only through the registry.`,
);
