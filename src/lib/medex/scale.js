// ─────────────────────────────────────────────────────────────────────────────
// The MedEx Score's scale — what the number means, and why it is that number.
//
// ── The one thing this file exists to prevent ───────────────────────────────
// Every "admissions score" on the market is a 0-100 that is really a progress
// bar: it counts what you have logged and rewards you for logging more. Two
// students with identical portfolios get identical scores whether they are
// aiming at a state flagship or at Brown PLME, which makes the number
// motivating and meaningless at the same time.
//
// The MedEx Score is not a progress bar. It is a POSITION — where the student
// currently sits relative to the median admitted student at one specific,
// named program. That is why it needs a benchmark (benchmark.js), why it is
// built on the admissions model's own standardized dimensions rather than on
// raw hour counts (score.js), and why moving it gets harder near the top rather
// than easier.
//
// ── Why 0-1000 and not 0-100 ────────────────────────────────────────────────
// Three reasons, all practical:
//   • A 0-100 invites a percentage reading, and this is not a probability.
//     The probability lives in the Admissions Calculator, per program, as a
//     range — see src/lib/admissions/. Anyone who reads "742" as "74% chance"
//     is making an error a 0-100 scale actively encourages.
//   • A week's real work is a visible number of points. Twelve clinical hours
//     and a finished essay move a 1000-scale by ~20 and a 100-scale by ~2,
//     and "+2" reads as noise even when it is a genuinely good week.
//   • It has room to compress at the top (see ANCHORS) without the top fifty
//     points becoming unreachable rounding.
//
// ── The anchor that makes it interpretable ──────────────────────────────────
// 850 is the median admitted student at your benchmark program. Not the 25th
// percentile — the median. This is the same fight the admissions model picks in
// academicFit.js: benchmark against the 25th and "cleared a low bar" quietly
// becomes "qualified", which quietly becomes "likely". A student at 850 looks
// like the middle of the class that got in. A student at 620 does not, and the
// number should say so while there is still time to act on it.
// ─────────────────────────────────────────────────────────────────────────────

export const MEDEX_MIN = 0;
export const MEDEX_MAX = 1000;

/** The score of a student who matches the median admitted student exactly. */
export const MEDEX_COHORT_MEDIAN = 850;

/**
 * The z → score curve, as interpolation anchors.
 *
 * `z` is the applicant's weighted standardized position against the benchmark
 * program's admitted cohort — the same z the admissions model composes on
 * (model.js), so the two features can never disagree about who is stronger.
 *
 * The curve DECELERATES: 240 points per z below the median, 110 just above it,
 * 40 above that. That shape is the honest part of the scale. Below the cohort,
 * effort translates into position almost linearly, because the gap is real and
 * closable. At and above the cohort median you are competing inside a pool that
 * has already been filtered on every axis this model can see, and further
 * separation there is decided by things no model reads — the letters, the
 * essay, the reader. A scale that kept paying 240 points per z into that region
 * would be inventing precision, and would tell the strongest students that a
 * perfect 1000 is a thing preparation can buy. It is not.
 */
export const ANCHORS = [
  { z: -3.5, score: 0 },
  { z: -2.0, score: 380 },
  { z: -1.0, score: 620 },
  { z: 0.0, score: MEDEX_COHORT_MEDIAN },
  { z: 1.0, score: 960 },
  { z: 2.0, score: MEDEX_MAX },
];

/**
 * The bands. These are what the student reads out loud, so they are written to
 * be true rather than kind — "Building" is not an insult and "Apex" is not a
 * promise of admission.
 *
 * `min` is inclusive, and the bands tile 0-1000 with no gaps; verifyMedex.mjs
 * asserts both, because a gap here would render a blank tier on the card for
 * exactly the students at the boundary.
 */
export const BANDS = [
  {
    id: 'baseline', min: 0, label: 'Baseline', short: 'Baseline',
    tone: 'slate',
    blurb: 'The record is mostly empty rather than mostly weak. Almost anything you log from here moves this a lot.',
  },
  {
    id: 'building', min: 300, label: 'Building', short: 'Building',
    tone: 'blue',
    blurb: 'Real activity is on the record and it is being counted. The gap to the admitted cohort is wide and it is closable — this is the band where weeks compound fastest.',
  },
  {
    id: 'contender', min: 500, label: 'Contender', short: 'Contender',
    tone: 'cyan',
    blurb: 'You are inside the range a reader would take seriously. Depth in one or two dimensions is now worth more than breadth across all of them.',
  },
  {
    id: 'competitive', min: 680, label: 'Competitive', short: 'Competitive',
    tone: 'violet',
    blurb: 'You are approaching the middle of the class that gets in at your benchmark. What separates people here is sustain and evidence, not new activities.',
  },
  {
    id: 'cohort', min: 800, label: 'Cohort Match', short: 'Cohort',
    tone: 'green',
    blurb: 'You look like the admitted cohort at your benchmark program. That is what this scale is anchored to, and it is a genuinely strong place to stand.',
  },
  {
    id: 'apex', min: 890, label: 'Apex', short: 'Apex',
    tone: 'gold',
    blurb: 'Above the median admit at one of the most selective programs in the country. Read this as "nothing in your control is holding you back" — not as a probability, which at these programs stays low for everyone.',
  },
];

/** The band a score falls in. Never returns null: the bands tile the range. */
export function bandFor(score) {
  const s = clamp(Number(score) || 0, MEDEX_MIN, MEDEX_MAX);
  let found = BANDS[0];
  for (const b of BANDS) if (s >= b.min) found = b;
  return found;
}

/** Where the next band starts, and how far it is. `null` at the top band. */
export function nextBand(score) {
  const s = clamp(Number(score) || 0, MEDEX_MIN, MEDEX_MAX);
  const next = BANDS.find(b => b.min > s);
  return next ? { ...next, pointsAway: next.min - Math.floor(s) } : null;
}

/**
 * z → 0-1000, by linear interpolation between ANCHORS.
 *
 * Piecewise-linear rather than a closed-form curve on purpose: every bend in
 * this scale is a claim about admissions, and a claim you can only change by
 * editing a table of numbers with a comment attached is a claim someone has to
 * argue with first. A logistic with a magic steepness constant would hide the
 * same decisions inside a parameter nobody can defend.
 */
export function scoreFromZ(z) {
  const v = Number.isFinite(z) ? z : ANCHORS[0].z;
  if (v <= ANCHORS[0].z) return MEDEX_MIN;
  const last = ANCHORS[ANCHORS.length - 1];
  if (v >= last.z) return MEDEX_MAX;
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i], b = ANCHORS[i + 1];
    if (v >= a.z && v <= b.z) {
      const t = (v - a.z) / (b.z - a.z);
      return Math.round(a.score + t * (b.score - a.score));
    }
  }
  return MEDEX_MIN;
}

/**
 * The inverse — what weighted z a score corresponds to. Used to answer "what
 * would this specific improvement be worth in points", by scoring the
 * hypothetical z rather than by inventing a per-point rule that would drift out
 * of agreement with scoreFromZ the first time an anchor moves.
 */
export function zFromScore(score) {
  const s = clamp(Number(score) || 0, MEDEX_MIN, MEDEX_MAX);
  if (s <= MEDEX_MIN) return ANCHORS[0].z;
  const last = ANCHORS[ANCHORS.length - 1];
  if (s >= MEDEX_MAX) return last.z;
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i], b = ANCHORS[i + 1];
    if (s >= a.score && s <= b.score) {
      const t = (s - a.score) / (b.score - a.score);
      return a.z + t * (b.z - a.z);
    }
  }
  return ANCHORS[0].z;
}

/**
 * How the score is allowed to be spoken about, in one place.
 *
 * This exists because the single most likely way this feature does harm is
 * copy drift: one card says "your chance", another says "your score", and the
 * student ends up believing the number is a probability. It is not, anywhere,
 * ever. Components import these strings rather than writing their own.
 */
export const MEDEX_COPY = {
  name: 'MedEx Score',
  short: 'MedEx',
  tagline: 'Where you stand against the class that gets in.',
  scaleNote: `0–1000. ${MEDEX_COHORT_MEDIAN} is the median admitted student at your benchmark program.`,
  // Logging can move the number DOWN, and the app has to say so before it
  // happens rather than after. A dimension nobody has logged is scored as
  // unknown, and a genuinely thin dimension scores below unknown — so a student
  // who logs eight shadowing hours can watch the score fall. That is the model
  // being right, but only if they were told to expect it; otherwise it reads as
  // a punishment for honesty, and the lesson learned is to stop logging.
  canGoDown:
    'Logging something can move this down as well as up. An activity you have never logged is counted as unknown, and a thin one is counted as thin — so the first honest entry sometimes costs points. It is still the right move: every point after that one is real, and a score built on blanks was never yours.',
  notAProbability:
    'This is a position, not a probability. It says how you compare to the students who get admitted at your benchmark — not how likely you are to be one of them. The odds live in the Admissions Calculator, per program, as a range, because that is the only honest shape for them.',
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
