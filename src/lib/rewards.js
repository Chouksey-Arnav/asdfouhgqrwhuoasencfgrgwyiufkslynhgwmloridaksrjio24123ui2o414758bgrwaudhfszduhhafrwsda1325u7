// ─────────────────────────────────────────────────────────────────────────────
// Variable-ratio XP rewards — the "surprise bonus" layer on top of fixed XP.
// Variable-ratio reinforcement (unpredictable payout size, same action) is the
// strongest known reward schedule for building repeat behavior — stronger than
// a fixed 1:1 XP-per-action rate. Applied only to frequent, small actions
// (lessons, flashcards, quizzes) — quest claims and achievements stay
// deterministic so milestone rewards remain predictable and trustworthy.
// ─────────────────────────────────────────────────────────────────────────────

// Ordered low→high; probabilities must sum to 1. Kept front-loaded toward ×1 so
// the *median* payout stays close to the base amount — this is meant to add
// delight, not to functionally shrink expected rewards.
export const BONUS_TABLE = [
  { multiplier: 1,   chance: 0.70, tier: 'none'   },
  { multiplier: 1.5, chance: 0.20, tier: 'bonus'   },
  { multiplier: 2.5, chance: 0.08, tier: 'big'      },
  { multiplier: 5,   chance: 0.02, tier: 'jackpot'   },
];

/** Pure roll — pass rng for testability, defaults to Math.random. */
export function rollBonusXP(baseXP, rng = Math.random) {
  const r = rng();
  let cumulative = 0;
  for (const row of BONUS_TABLE) {
    cumulative += row.chance;
    if (r < cumulative) {
      return { multiplier: row.multiplier, tier: row.tier, finalXP: Math.max(1, Math.round(baseXP * row.multiplier)) };
    }
  }
  const last = BONUS_TABLE[BONUS_TABLE.length - 1];
  return { multiplier: last.multiplier, tier: last.tier, finalXP: Math.max(1, Math.round(baseXP * last.multiplier)) };
}

/**
 * Roll + describe a variable XP award for a base amount.
 * `allowBonus=false` skips the roll entirely (e.g. for 0-XP actions) and
 * returns a flat ×1 result so call sites can always destructure the same shape.
 */
export function awardXP(baseXP, { allowBonus = true } = {}) {
  if (!allowBonus || baseXP <= 0) {
    return { multiplier: 1, tier: 'none', finalXP: baseXP, baseXP };
  }
  const rolled = rollBonusXP(baseXP);
  return { ...rolled, baseXP };
}

export const BONUS_COPY = {
  none:    (xp) => `+${xp} XP`,
  bonus:   (xp) => `+${xp} XP ✨ Bonus!`,
  big:     (xp) => `+${xp} XP 🔥 Big Bonus!`,
  jackpot: (xp) => `+${xp} XP 🎉 JACKPOT!`,
};
