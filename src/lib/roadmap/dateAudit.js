// ─────────────────────────────────────────────────────────────────────────────
// The four checks every roadmap date passes before a student sees it.
//
// ── Why four, and why they are separate ─────────────────────────────────────
// The catalog already forbids a model from inventing a deadline (see
// docs/ROADMAP.md §1). That closes the loudest failure and leaves the quiet
// one: a date that is real in the catalog and WRONG BY THE TIME IT REACHES A
// SCREEN. Every step between an authored `{ yearSlot: 'senior', dueMonthDay:
// '11-01' }` and a rendered "Nov 1, 2027" is arithmetic, and arithmetic has
// failure modes that no amount of careful authoring prevents:
//
//   · '02-30' is a plausible-looking string and not a day.
//   · '02-29' is a day three years in four.
//   · A six-week lead time on a January 5 deadline starts in November — of the
//     previous calendar year, which is where an off-by-one in the year slot
//     hides perfectly.
//   · A rolled-forward occurrence that lands in the past is still, technically,
//     a date; it is just useless.
//   · An entry marked 'typical' whose caption is built from a field the UI
//     happens to have prints a precise day for something nobody confirmed.
//
// Each of those is caught by a different KIND of reasoning, so they are four
// independent gates rather than one validate() with twenty branches. A gate
// that mixes "is this a real day" with "is this the right year" is a gate whose
// failures cannot be told apart, and the response to each of these is
// different:
//
//   CHECK 1 · WELL-FORMED   Is this a real calendar day at all?          → WITHHOLD
//   CHECK 2 · COHERENT      Do this item's own dates agree with each other? → WITHHOLD
//   CHECK 3 · CURRENT       Is it on the right side of today, in the right
//                           class year, for what it claims to be?        → REPAIR
//   CHECK 4 · DISCLOSED     Does what will be SHOWN match what is actually
//                           known?                                       → DOWNGRADE
//
// ── The three responses, and why they are not all "drop it" ────────────────
// WITHHOLD  — the item never reaches the student. A missing opportunity costs
//             them one option; a wrong date costs them the thing itself, and
//             they will not find out until it is gone.
// REPAIR    — the date is recoverable (roll to the next occurrence). Dropping a
//             recoverable item is the failure the roll-forward logic in
//             catalog.js exists to prevent, and this must not undo it.
// DOWNGRADE — the date is fine and only the PRECISION claimed for it is wrong.
//             Lowering `confidence` makes displaysExactDate() refuse to print a
//             day and makes the UI show the window and the "confirm on the
//             official site" line instead. The student keeps the item and loses
//             only a certainty nobody had earned.
//
// ── Where this runs ─────────────────────────────────────────────────────────
// All four, three times, on purpose — the "quadruple-checked" claim is about
// independent checks, and running them once is how a check becomes a comment:
//
//   1. BUILD TIME    scripts/verifyRoadmapDates.mjs runs every check over every
//                    catalog entry × every grade × both year offsets, and fails
//                    `npm run build`. An authoring mistake never ships.
//   2. RESOLVE TIME  auditSlate() in buildCandidateSlate — catches anything that
//                    depends on the real clock, the student's class years, or a
//                    leap year the fixture happened not to cross.
//   3. RENDER TIME   auditItem() on the assembled roadmap, including items a
//                    student added themselves and dates they pinned by hand,
//                    neither of which existed at either earlier stage.
//
// Pure functions, no imports beyond the date helpers, so the verify script can
// run the identical code the app runs rather than a re-implementation of it.
// ─────────────────────────────────────────────────────────────────────────────
import { dayKey, daysBetween, shiftDays } from '../timeline.js';

export const VERDICT = { OK: 'ok', WITHHOLD: 'withhold', REPAIR: 'repair', DOWNGRADE: 'downgrade' };

/** The four gates, in the order they run. Named so a failure report reads like a sentence. */
export const CHECKS = ['well-formed', 'coherent', 'current', 'disclosed'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY_RE = /^\d{2}-\d{2}$/;

/**
 * CHECK 1 · WELL-FORMED — is this string a real day on a real calendar?
 *
 * The round-trip is what makes this worth doing rather than a regex: JS
 * normalises an impossible date instead of rejecting it, so '2027-02-30' quietly
 * becomes March 2. Constructing the date and reading its parts back is the only
 * way to notice that a day was silently moved, and a silently moved deadline is
 * the exact class of bug this whole file exists for.
 */
export function isRealDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * A MM-DD that names a day that exists in SOME year.
 *
 * '02-29' passes here and is checked again in a specific year by isRealDate —
 * a leap day is a legitimate thing to author, and the year it resolves into is
 * what decides whether it survives.
 */
export function isRealMonthDay(value) {
  if (typeof value !== 'string' || !MONTH_DAY_RE.test(value)) return false;
  const [m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12) return false;
  const maxDay = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d >= 1 && d <= maxDay;
}

const problem = (check, message, verdict) => ({ check, message, verdict });

/**
 * CHECK 1 over one resolved item.
 *
 * Every date field the item carries has to be a real day, including the ones
 * the UI never prints: `startBy` is what the roadmap SCHEDULES against, so a
 * malformed one puts a real deadline in the wrong month of a student's year
 * without ever showing them a wrong date.
 */
function checkWellFormed(item) {
  const out = [];
  for (const field of ['opens', 'due', 'on', 'anchor', 'startBy', 'studentDate']) {
    const value = item?.[field];
    if (value == null) continue;
    if (!isRealDate(value)) {
      out.push(problem('well-formed', `${field} is not a real calendar date (${JSON.stringify(value)})`, VERDICT.WITHHOLD));
    }
  }
  return out;
}

/**
 * CHECK 2 · COHERENT — do this item's dates agree with each other?
 *
 * Each of these is a real ordering an item can violate through arithmetic
 * rather than through authoring, which is why they are checked on the RESOLVED
 * item and not on the catalog entry:
 *
 *   opens ≤ due       an application that closes before it opens has crossed a
 *                     year boundary in one field and not the other — the
 *                     classic yearSlot off-by-one, and invisible in either date
 *                     read on its own.
 *   startBy ≤ anchor  "start work by" after the deadline is a lead time that
 *                     was subtracted from the wrong date.
 *   startBy matches   startBy must be exactly prepWeeks before the anchor. Not
 *     prepWeeks       decoration: this is the number the spine draws load from
 *                     and the Home card ranks urgency by, so a drift here moves
 *                     work in a student's year without moving any date they see.
 *   due/on exclusive  an entry that is both a deadline and an event day has two
 *                     anchors and will sort inconsistently between surfaces.
 */
function checkCoherent(item) {
  const out = [];
  const { opens, due, on, anchor, startBy } = item || {};

  if (opens && due && opens > due) {
    out.push(problem('coherent', `opens (${opens}) is after its deadline (${due}) — a year boundary was crossed in one field and not the other`, VERDICT.WITHHOLD));
  }
  if (opens && on && opens > on) {
    out.push(problem('coherent', `opens (${opens}) is after the event day (${on})`, VERDICT.WITHHOLD));
  }
  if (startBy && anchor && startBy > anchor) {
    out.push(problem('coherent', `startBy (${startBy}) is after the date it prepares for (${anchor})`, VERDICT.WITHHOLD));
  }
  if (anchor) {
    const expected = due || on || opens;
    if (expected && anchor !== expected) {
      out.push(problem('coherent', `anchor (${anchor}) is not the deadline, event day or opening it should follow (${expected})`, VERDICT.WITHHOLD));
    }
  }
  if (startBy && anchor && Number.isInteger(item?.prepWeeks)) {
    const want = shiftDays(anchor, -7 * item.prepWeeks);
    if (startBy !== want) {
      out.push(problem('coherent', `startBy (${startBy}) is not ${item.prepWeeks} weeks before ${anchor} (expected ${want})`, VERDICT.WITHHOLD));
    }
  }
  return out;
}

/**
 * CHECK 3 · CURRENT — is this on the right side of today for what it claims?
 *
 * The only gate that needs a clock, and the only one whose verdict is REPAIR:
 * everything it catches is a wrong OCCURRENCE of a right date, and the fix is
 * to roll to the next one rather than to withhold an annual programme forever.
 *
 * `missed` is checked in both directions on purpose. An item flagged as missed
 * that is actually in the future tells a student to give up on something they
 * can still do — which is the more expensive of the two errors, and the one a
 * "is it in the past" check written the obvious way does not look for.
 */
function checkCurrent(item, today, horizonEnd) {
  const out = [];
  const anchor = item?.studentDate || item?.anchor || item?.due || item?.on;
  if (!anchor || !isRealDate(anchor)) return out;   // check 1 owns this case

  const days = daysBetween(today, anchor);
  if (item?.missed === true && days > 0) {
    out.push(problem('current', `flagged as already passed, but ${anchor} is still ${days} days away`, VERDICT.REPAIR));
  }
  if (item?.missed === false && days < -14) {
    out.push(problem('current', `presented as upcoming, but ${anchor} was ${-days} days ago`, VERDICT.REPAIR));
  }
  if (horizonEnd && anchor > horizonEnd) {
    out.push(problem('current', `${anchor} is past the end of the roadmap year (${horizonEnd})`, VERDICT.REPAIR));
  }
  // A lead time that starts before the roadmap does is not an error — a student
  // who should have started in August is exactly who this feature is for — but a
  // lead time starting more than a year before the deadline is arithmetic, not
  // planning.
  if (item?.startBy && isRealDate(item.startBy) && daysBetween(item.startBy, anchor) > 366) {
    out.push(problem('current', `startBy (${item.startBy}) is more than a year before ${anchor}`, VERDICT.REPAIR));
  }
  return out;
}

/**
 * CHECK 4 · DISCLOSED — does what will be shown match what is actually known?
 *
 * This is the gate that reads the item the way the UI will. displaysExactDate()
 * decides whether a day is printed; this asserts that the decision it is about
 * to make is one the item's evidence supports, in both directions:
 *
 *   · A 'fixed' item that will print a date must HAVE a date to print. A blank
 *     where a deadline belongs is read as "no deadline", which is worse than a
 *     window.
 *   · A 'typical' item must be able to say where to confirm. The caveat "check
 *     the official page" is not a caveat if there is no page.
 *   · A 'varies' item must carry the season string that is the ONLY text the UI
 *     may render for it, and must never be shaped so that a day could leak out.
 *   · A student-pinned date outranks all of it: they looked it up, they are
 *     right, and it renders exactly. But it still has to be a real day, which
 *     is check 1's job and is why these run in order.
 *
 * Verdict is DOWNGRADE throughout: the item is real, the date is real, and only
 * the precision claimed for it is not.
 */
function checkDisclosed(item) {
  const out = [];
  const confidence = item?.confidence;
  const pinned = !!item?.studentDate || item?.addedBy === 'student';

  if (pinned) {
    if (item?.studentDate && !isRealDate(item.studentDate)) {
      out.push(problem('disclosed', `a pinned date must be a real day (${JSON.stringify(item.studentDate)})`, VERDICT.DOWNGRADE));
    }
    return out;
  }

  if (confidence === 'fixed') {
    const shown = item?.due || item?.on || item?.anchor;
    if (!shown) {
      out.push(problem('disclosed', 'marked fixed — which renders as an exact date — but carries no date to render', VERDICT.DOWNGRADE));
    }
  } else if (confidence === 'typical') {
    if (!item?.due && !item?.on && !item?.anchor) {
      out.push(problem('disclosed', 'marked typical but carries no window to describe', VERDICT.DOWNGRADE));
    }
    const url = item?.url;
    if (['scholarship', 'program', 'competition'].includes(item?.track) && !(typeof url === 'string' && url.startsWith('https://'))) {
      out.push(problem('disclosed', 'tells the student to confirm on the official site but carries no https link to confirm at', VERDICT.DOWNGRADE));
    }
  } else if (confidence === 'varies') {
    const season = item?.seasonHint || item?.season;
    const usable = typeof season === 'string' && season.length > 3 && !/^s\d+$/i.test(season);
    if (!usable) {
      out.push(problem('disclosed', 'date varies locally, so its season string is the only text that may be shown — and it has none', VERDICT.DOWNGRADE));
    }
  } else {
    out.push(problem('disclosed', `confidence ${JSON.stringify(confidence)} is not one of fixed/typical/varies, so no rendering rule applies to it`, VERDICT.DOWNGRADE));
  }
  return out;
}

/**
 * Run all four checks over one item.
 *
 * Returns `{ ok, verdict, problems, checked }`. `checked` is always all four
 * names: the report is of four checks having RUN, not of four checks having
 * been attempted, and a caller that wants to show a student "quadruple-checked"
 * is entitled to know that is literally what happened.
 *
 * The verdict is the most severe of the problems found, ordered
 * WITHHOLD > REPAIR > DOWNGRADE, because that is the order of how much the
 * student loses if it is ignored.
 */
export function auditItem(item, { today = dayKey(), horizonEnd = null } = {}) {
  const problems = [
    ...checkWellFormed(item),
    ...checkCoherent(item),
    ...checkCurrent(item, today, horizonEnd),
    ...checkDisclosed(item),
  ];
  const verdict = problems.some((p) => p.verdict === VERDICT.WITHHOLD) ? VERDICT.WITHHOLD
    : problems.some((p) => p.verdict === VERDICT.REPAIR) ? VERDICT.REPAIR
      : problems.length ? VERDICT.DOWNGRADE : VERDICT.OK;
  return { ok: problems.length === 0, verdict, problems, checked: CHECKS };
}

/**
 * Apply an item's own audit to it.
 *
 * WITHHOLD returns null — the caller drops it.
 * DOWNGRADE returns the item with its confidence lowered one step, which is
 *   what makes displaysExactDate() refuse to print a day for it, plus the reason
 *   recorded on the item so a support conversation is not guesswork.
 * REPAIR and OK return the item unchanged; repair is the caller's business,
 *   because only the caller has the catalog entry and the year table needed to
 *   resolve the next occurrence.
 */
export function applyAudit(item, audit) {
  if (!audit || audit.ok) return item;
  if (audit.verdict === VERDICT.WITHHOLD) return null;
  if (audit.verdict === VERDICT.DOWNGRADE) {
    const lowered = item.confidence === 'fixed' ? 'typical' : 'varies';
    return {
      ...item,
      confidence: lowered,
      // A downgraded 'varies' item still needs something to render, and the
      // caption falls back to "Date varies — look yours up" when this is absent
      // — true, and better than a precision nobody earned.
      dateAudit: {
        downgradedFrom: item.confidence,
        reasons: audit.problems.map((p) => `${p.check}: ${p.message}`),
      },
    };
  }
  return item;
}

/**
 * Audit a whole resolved slate, returning the items that survived plus a report.
 *
 * The report is deliberately loud in development and silent in production: an
 * item withheld from a student's year is a catalog bug, and the person who can
 * fix it is reading a console, not a student.
 */
export function auditSlate(items, { today = dayKey(), horizonEnd = null } = {}) {
  const kept = [];
  const withheld = [];
  const downgraded = [];
  for (const item of items) {
    const audit = auditItem(item, { today, horizonEnd });
    const next = applyAudit(item, audit);
    if (!next) { withheld.push({ id: item?.catalogId || item?.id, problems: audit.problems }); continue; }
    if (audit.verdict === VERDICT.DOWNGRADE) downgraded.push({ id: item?.catalogId || item?.id, problems: audit.problems });
    kept.push(next);
  }
  return {
    items: kept,
    report: {
      checked: CHECKS,
      total: items.length,
      passed: kept.length - downgraded.length,
      withheld,
      downgraded,
    },
  };
}
