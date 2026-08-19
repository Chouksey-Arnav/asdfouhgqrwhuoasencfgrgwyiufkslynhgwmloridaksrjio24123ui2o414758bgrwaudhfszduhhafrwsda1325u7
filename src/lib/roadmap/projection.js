// ─────────────────────────────────────────────────────────────────────────────
// The climb — what finishing this roadmap is actually worth, month by month.
//
// ── The one thing this file refuses to do ───────────────────────────────────
// It does not predict admission. Not to a named college, not as a percentage,
// not as a "chance" of any kind, and no amount of product pressure should ever
// make it. Nobody outside an admissions office can compute that number, every
// product that claims to is guessing dressed as arithmetic, and a seventeen-
// year-old shown "68% chance at Duke" will believe it — and will make real
// decisions with it. That is the same line the catalog draws about dates, for
// the same reason, and it is drawn here before a single line of chart code.
//
// ── What it computes instead, and why that is genuinely useful ──────────────
// The app already has an honest number: computeApplicationStrength (see
// src/lib/applicationStrength.js) — a defined, published 0-100 synthesis of
// four things the student can see and change, measured against their pathway's
// own benchmarks. It is OUR score, it is transparent, and it is about the
// application rather than about the outcome.
//
// This projects that score forward across the twelve months of the roadmap. The
// question it answers is the one every student actually has and no list of
// deadlines can answer:
//
//     "If I do all of this — what does it get me?"
//
// A roadmap that cannot answer that is a chore list. The answer here is a
// curve: where the four parts of an application stand today, which months each
// item builds which part in, and where the whole thing lands at the end of the
// year if the work gets done. Two lines and a gap.
//
// ── The model, stated so it can be argued with ──────────────────────────────
// 1. Every roadmap item feeds exactly ONE of the four subscores, by its track
//    (TRACK_TO_COMPONENT below). A scholarship builds the application; a
//    hospital placement builds clinical exposure. Nothing feeds two, because
//    splitting a contribution across components is a knob with no principled
//    setting and it would make the arithmetic unauditable.
// 2. An item is worth POINTS_PER_EFFORT_UNIT points in its component, scaled by
//    the same effort weights monthlyLoad uses. That constant is a judgement,
//    not a measurement, and it is named and exported so it reads as one.
// 3. A component cannot exceed 100, and contributions are applied against the
//    remaining headroom rather than added blindly — so a student already at 90
//    on academics does not get projected to 140, and the chart stops rewarding
//    piling more of what they already have.
// 4. The gain lands across the item's PREPARATION window, not on its deadline,
//    exactly as monthlyLoad spreads load. The work is what moves the number,
//    and the work happens before the date.
// 5. Items already done are folded into today's score rather than into the
//    projection. They are not a future gain; they are why the line starts where
//    it starts.
//
// Every one of those five is a modelling choice a reasonable person could argue
// with, which is why the UI that renders this says out loud that it is a
// projection of this app's own score under the assumption that the roadmap gets
// finished. An honest model, labelled, beats a confident one.
// ─────────────────────────────────────────────────────────────────────────────
import { dayKey, daysBetween, shiftDays } from '../timeline.js';
import { allItems, effectiveDue, OPEN_STATUSES } from './model.js';

/** Which part of an application each roadmap track builds. */
export const TRACK_TO_COMPONENT = {
  academics: 'academic',
  testing: 'academic',
  experience: 'clinical',
  program: 'clinical',
  competition: 'activities',
  scholarship: 'activities',
  application: 'application',
  essays: 'application',
  relationships: 'application',
  aid: 'application',
};

/** The four components, in the order they are drawn, with their public names. */
export const COMPONENTS = [
  { id: 'academic', label: 'Academics', colorKey: 'sky', blurb: 'Coursework, mastery and test scores' },
  { id: 'clinical', label: 'Experience', colorKey: 'teal', blurb: 'Clinical hours, shadowing, real placements' },
  { id: 'activities', label: 'Activities', colorKey: 'amber', blurb: 'Competitions, leadership, service, awards' },
  { id: 'application', label: 'Application', colorKey: 'violet', blurb: 'Colleges, essays, recommenders, aid' },
];

export const COMPONENT_IDS = COMPONENTS.map((c) => c.id);

/** The weights monthlyLoad uses, so "how heavy" means one thing across the tab. */
const EFFORT_UNITS = { light: 1, moderate: 2, heavy: 4, immersive: 6 };

/**
 * Points of subscore movement one unit of effort is assumed to buy.
 *
 * A judgement call, exported so it is visible as one. Calibrated so that a
 * typical twelve-item year — the capacity the generator targets for a moderate
 * weekly load — closes roughly half to two thirds of an average student's gap
 * to 100, which is about what a genuinely good year does and is deliberately
 * short of "finish the roadmap and you are done".
 */
export const POINTS_PER_EFFORT_UNIT = 3.2;

/** The score bands computeApplicationStrength names, reused so the words match. */
export function bandFor(score) {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'On Track';
  if (score >= 35) return 'Building';
  return 'Just Starting';
}

/** Every month key from `from` to `to` inclusive, as 'YYYY-MM'. */
function monthsBetween(from, to) {
  const out = [];
  let [y, m] = String(from).slice(0, 7).split('-').map(Number);
  const end = String(to).slice(0, 7);
  for (let guard = 0; guard < 26; guard += 1) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.push(key);
    if (key >= end) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/**
 * Project the student's application strength across the roadmap's twelve months.
 *
 * @param {object} roadmap
 * @param {object} strength  the result of computeApplicationStrength — { score, subscores }
 * @param {string} today
 * @returns {{
 *   months: Array<{ month, parts: {academic,clinical,activities,application}, total, isPast, isNow }>,
 *   today: { score, band, parts },
 *   projected: { score, band, parts },
 *   gain: number,
 *   contributions: Array<{ component, points, items }>,
 *   itemCount: number,
 *   ok: boolean
 * }}
 */
export function projectClimb(roadmap, strength = null, today = dayKey()) {
  const start = roadmap?.startDate || today;
  const end = roadmap?.endDate || shiftDays(start, 364);
  const months = monthsBetween(start, end);
  const nowMonth = String(today).slice(0, 7);

  // Where they stand right now. A missing strength reading is treated as zeroes
  // rather than as a reason to refuse to draw: a brand-new account genuinely IS
  // near zero, and a chart that appears only for students who already have a
  // record is a chart that never shows up for the people it would help most.
  const base = {
    academic: clamp(strength?.subscores?.academic),
    clinical: clamp(strength?.subscores?.clinical),
    activities: clamp(strength?.subscores?.activities),
    application: clamp(strength?.subscores?.application),
  };

  // ── Spread each open item's gain across its preparation window ─────────────
  // `pending[component][month]` accumulates raw points before headroom is
  // applied, because headroom has to be applied in time order — a component
  // near its ceiling should stop paying out as the year goes on, not have its
  // whole year scaled down uniformly.
  const pending = Object.fromEntries(COMPONENT_IDS.map((c) => [c, new Map()]));
  const rawByComponent = Object.fromEntries(COMPONENT_IDS.map((c) => [c, 0]));
  const itemsByComponent = Object.fromEntries(COMPONENT_IDS.map((c) => [c, 0]));
  let counted = 0;

  allItems(roadmap).forEach((item) => {
    if (!OPEN_STATUSES.has(item.status)) return;
    const component = TRACK_TO_COMPONENT[item.track];
    if (!component) return;
    const due = effectiveDue(item);
    const units = EFFORT_UNITS[item.effort] || 2;
    const points = units * POINTS_PER_EFFORT_UNIT;
    counted += 1;
    rawByComponent[component] += points;
    itemsByComponent[component] += 1;

    // An undated item still counts toward what the year is worth — it is real
    // work the student has been asked to do — but it has no month to land in,
    // so it is spread evenly across the whole remaining year rather than
    // silently dropped or dumped on month one.
    if (!due) {
      const remaining = months.filter((m) => m >= nowMonth);
      const share = points / Math.max(1, remaining.length);
      remaining.forEach((m) => bump(pending[component], m, share));
      return;
    }

    const from = item.startBy && item.startBy < due ? item.startBy : due;
    const span = Math.max(1, Math.ceil((daysBetween(from, due) + 1) / 30));
    const share = points / span;
    for (let i = 0; i < span; i += 1) {
      bump(pending[component], shiftDays(from, i * 30).slice(0, 7), share);
    }
  });

  // ── Walk the year, applying headroom as we go ─────────────────────────────
  const running = { ...base };
  const series = months.map((month) => {
    // Months already behind the student contribute nothing new — the line is
    // flat at today's measured value up to today, because that value IS the
    // measurement of everything already done and re-deriving history from a
    // model would be inventing a past we never recorded.
    if (month > nowMonth) {
      COMPONENT_IDS.forEach((c) => {
        const raw = pending[c].get(month) || 0;
        if (raw <= 0) return;
        const headroom = Math.max(0, 100 - running[c]);
        // Diminishing against the ceiling rather than a hard clip, so a
        // component approaching 100 slows down instead of stopping dead.
        running[c] = Math.min(100, running[c] + Math.min(raw, headroom * 0.9));
      });
    }
    return {
      month,
      parts: { ...running },
      total: weighted(running),
      isPast: month < nowMonth,
      isNow: month === nowMonth,
    };
  });

  const todayScore = weighted(base);
  const projectedParts = series.length ? series[series.length - 1].parts : base;
  const projectedScore = weighted(projectedParts);

  return {
    months: series,
    today: { score: todayScore, band: bandFor(todayScore), parts: base },
    projected: { score: projectedScore, band: bandFor(projectedScore), parts: projectedParts },
    gain: Math.max(0, projectedScore - todayScore),
    contributions: COMPONENTS.map((c) => ({
      component: c.id,
      label: c.label,
      points: Math.round(rawByComponent[c.id]),
      items: itemsByComponent[c.id],
      from: Math.round(base[c.id]),
      to: Math.round(projectedParts[c.id]),
    })),
    itemCount: counted,
    // Below three contributing items the curve is a straight line with a kink in
    // it, which says less than the sentence it would sit under. The UI shows the
    // numbers without the drawing in that case.
    ok: counted >= 3 && series.length >= 4,
  };
}

const clamp = (v) => Math.max(0, Math.min(100, Number.isFinite(Number(v)) ? Number(v) : 0));
const bump = (map, key, amount) => map.set(key, (map.get(key) || 0) + amount);

/**
 * The four components back into one score, using computeApplicationStrength's
 * own weights. Duplicated rather than imported because that function takes raw
 * counts (hours, essays, recommenders) and this has already-computed subscores —
 * but the weights themselves MUST match, so any change there is a change here.
 * scripts/verifyRoadmap.mjs asserts the two agree on a known input.
 */
export const COMPONENT_WEIGHTS = { academic: 0.35, clinical: 0.30, application: 0.20, activities: 0.15 };

function weighted(parts) {
  return Math.round(
    parts.academic * COMPONENT_WEIGHTS.academic
    + parts.clinical * COMPONENT_WEIGHTS.clinical
    + parts.application * COMPONENT_WEIGHTS.application
    + parts.activities * COMPONENT_WEIGHTS.activities,
  );
}
