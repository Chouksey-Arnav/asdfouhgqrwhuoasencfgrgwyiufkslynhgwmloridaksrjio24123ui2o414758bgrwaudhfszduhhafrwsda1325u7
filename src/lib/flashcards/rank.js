// ─────────────────────────────────────────────────────────────────────────────
// Global ranking, deduplication, and count fulfillment. Runs once, after the
// ENTIRE document has been scanned by every extractor — never mid-scan — so a
// count cap never truncates coverage of the source, only the final selection.
// ─────────────────────────────────────────────────────────────────────────────
import { wordsOf } from './text.js';

function normalizeForDedup(s) {
  // Hyphens are kept as part of the token (not stripped to a space): "non-rapid"
  // must never collapse into "rapid" — that flips the meaning of REM vs NREM,
  // dopamine-producing vs producing, etc. — and containment-based similarity
  // would otherwise treat a negated/modified term as a duplicate of its root.
  return (s || '').toLowerCase().replace(/[^a-z0-9-]+/g, ' ').trim();
}

/** Containment-style token overlap: catches near-duplicate answers even when one is a subset/superset of the other (not just literal string equality). */
function answerSimilarity(a, b) {
  const A = new Set(normalizeForDedup(a).split(' ').filter(Boolean));
  const B = new Set(normalizeForDedup(b).split(' ').filter(Boolean));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.min(A.size, B.size);
}

function qualityFilter(candidates) {
  const seenFront = new Set();
  const out = [];
  for (const c of candidates) {
    if (!c || !c.front || !c.back) continue;
    const back = c.back.trim();
    // A single-word answer is fine for an acronym expansion ("Electroencephalogram") but
    // usually signals junk for every other card type.
    if (c.type !== 'acronym' && wordsOf(back).length < 2) continue;
    if (c.front.trim().toLowerCase() === back.toLowerCase()) continue;
    const key = normalizeForDedup(c.front).slice(0, 90);
    if (!key || seenFront.has(key)) continue;
    seenFront.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Selects up to maxCards distinct candidates: round-robins across sections
 * (highest-confidence candidate from each section first) so coverage is broad
 * before it's deep, then rejects near-duplicate answers as it goes. Never pads
 * — returns fewer than maxCards if that's all the source genuinely supports.
 */
export function rankAndSelect(candidates, maxCards) {
  const pool = qualityFilter(candidates);

  const bySection = new Map();
  for (const c of pool) {
    const k = c.sectionIndex ?? 0;
    if (!bySection.has(k)) bySection.set(k, []);
    bySection.get(k).push(c);
  }
  for (const arr of bySection.values()) arr.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  const sectionKeys = [...bySection.keys()];
  const selected = [];
  const selectedBacks = [];

  function tryAdd(c) {
    for (const b of selectedBacks) {
      if (answerSimilarity(c.back, b) > 0.82) return false;
    }
    selected.push(c);
    selectedBacks.push(c.back);
    return true;
  }

  let progress = true;
  while (selected.length < maxCards && progress) {
    progress = false;
    for (const k of sectionKeys) {
      if (selected.length >= maxCards) break;
      const arr = bySection.get(k);
      while (arr.length) {
        const c = arr.shift();
        if (tryAdd(c)) { progress = true; break; }
      }
    }
  }

  return selected;
}
