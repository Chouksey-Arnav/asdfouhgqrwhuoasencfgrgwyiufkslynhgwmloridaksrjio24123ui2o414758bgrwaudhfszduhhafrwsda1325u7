// ── Seeded shuffling ──────────────────────────────────────────────────────────
//
// Smart Mix deals every card in the library in a fresh random order each time it is opened, so
// a student never walks the same run of cards twice. That cannot be done with Math.random():
// the deck order is computed inside a React useMemo that re-runs on every card rating (rating a
// card writes the progressed deck back into state), and an unseeded shuffle would silently
// re-deal the whole session mid-review — losing the student's place and resurfacing cards they
// had already answered.
//
// mulberry32 keyed off a per-session seed gives the property that is actually wanted: the order
// is random ACROSS sessions and perfectly stable WITHIN one. Re-rolling the seed is what starts
// a new shuffle, and that is an explicit action (opening Smart Mix, or pressing Reshuffle)
// rather than a side effect of rendering.

/** Small, fast, well-distributed 32-bit PRNG. Returns a function producing floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates over a copy, driven by `seed`. Same seed + same input ⇒ same output, always.
 * Never mutates the input array.
 */
export function seededShuffle(arr, seed) {
  const rnd = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A fresh seed for a new shuffle. Never 0, which mulberry32 handles but reads as "unset". */
export function newShuffleSeed() {
  return ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 1;
}
