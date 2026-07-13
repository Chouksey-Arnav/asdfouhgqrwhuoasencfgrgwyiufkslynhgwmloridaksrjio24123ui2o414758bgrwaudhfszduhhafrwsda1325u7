// ─────────────────────────────────────────────────────────────────────────────
// Nudge engine — realizes the SCENARIOS/TAGS phrase bank (src/data/nudgeBank.js)
// into a large, non-repetitive message library and hands out one message per
// call via pickNudge(scenario, ctx).
//
// Why combinatorial instead of one flat hand-written list: every scenario's
// cores × its tone's tags is a genuine, independently-reviewed sentence pair
// ("what happened" + "why it matters"), so the realized library reads as real
// copy rather than mad-libs, while still landing in the thousands from a few
// hundred hand-written lines. Run getNudgeLibraryStats() to see the realized
// total and per-scenario breakdown.
// ─────────────────────────────────────────────────────────────────────────────
import { TAGS, SCENARIOS } from '../data/nudgeBank';

function buildLibrary() {
  const lib = {};
  for (const [key, { tone, cores }] of Object.entries(SCENARIOS)) {
    const tags = TAGS[tone] || [];
    const combos = [];
    for (const core of cores) {
      for (const tag of tags) {
        combos.push(`${core} ${tag}`);
      }
    }
    lib[key] = combos;
  }
  return lib;
}

export const NUDGE_LIBRARY = buildLibrary();

function fillTemplate(template, ctx) {
  return template.replace(/\{(\w+)\}/g, (m, key) => (ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : m));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DEFAULT_FALLBACK = `Nice work — keep going.`;

// Hands back one message from `scenario`'s pool, filling {slot} tokens from
// `ctx`. Draws from a per-scenario shuffled "bag" (persisted in localStorage)
// so the same message can't repeat until every message in the pool has been
// shown once, then the bag reshuffles.
export function pickNudge(scenario, ctx = {}) {
  const pool = NUDGE_LIBRARY[scenario];
  if (!pool || !pool.length) return DEFAULT_FALLBACK;

  const bagKey = `nudgeBag:${scenario}`;
  let bag = [];
  try { bag = JSON.parse(localStorage.getItem(bagKey) || '[]'); } catch { bag = []; }
  if (!Array.isArray(bag) || bag.length === 0 || bag.some(i => i >= pool.length)) {
    bag = shuffle([...Array(pool.length).keys()]);
  }
  const idx = bag.pop();
  try { localStorage.setItem(bagKey, JSON.stringify(bag)); } catch { /* localStorage unavailable */ }

  return fillTemplate(pool[idx], ctx);
}

// Dev/verification helper — total realized message count and per-scenario
// breakdown, so the library size can be sanity-checked after edits.
export function getNudgeLibraryStats() {
  const perScenario = Object.fromEntries(Object.entries(NUDGE_LIBRARY).map(([k, v]) => [k, v.length]));
  const total = Object.values(perScenario).reduce((a, b) => a + b, 0);
  return { total, scenarioCount: Object.keys(perScenario).length, perScenario };
}
