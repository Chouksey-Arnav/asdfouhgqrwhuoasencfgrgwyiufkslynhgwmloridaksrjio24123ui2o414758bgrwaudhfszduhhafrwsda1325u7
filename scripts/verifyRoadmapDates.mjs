#!/usr/bin/env node
/**
 * The build-time half of the quadruple date check.
 *
 * src/lib/roadmap/dateAudit.js defines four independent gates every roadmap
 * date passes before a student sees it. Two of the three places they run are
 * inside the app, against one student and one clock. This is the third: every
 * catalog entry, resolved for every grade, at both year offsets, against a
 * spread of clocks chosen to cross the boundaries that arithmetic gets wrong.
 *
 * ── Why a matrix of clocks rather than "today" ─────────────────────────────
 * Almost everything this can catch is a boundary:
 *
 *   · a leap day that only exists in three years out of four
 *   · a February 29 lead time subtracted from a March deadline
 *   · the August 1 / July 31 seam where the academic year turns over, which is
 *     where a yearSlot off-by-one is invisible on either side and obvious
 *     across it
 *   · New Year's Day, where a January deadline and a December opening belong to
 *     the same academic year and different calendar ones
 *   · a build run in June, when next year's occurrence and this year's are both
 *     inside the twelve-month horizon
 *
 * A single "today" tests one point in that space. The failure this script
 * exists to prevent is a date that is correct in April and wrong in August, and
 * the only way to see one of those is to look from both months.
 *
 * ── What a failure here means ──────────────────────────────────────────────
 * It is not a warning and it is not tuneable. A build that ships a WITHHOLD is
 * a build that ships either a date a student will plan around and miss, or an
 * entry silently deleted from every roadmap. Both are worse than a red build.
 *
 * Run by `npm run verify:roadmap-dates`, wired into `npm run build`.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);

const CAT = await load('src/data/roadmap/index.js');
const { buildCandidateSlate, resolveWindow, fitsGrade } = await load('src/lib/roadmap/catalog.js');
const { auditItem, isRealDate, isRealMonthDay, VERDICT, CHECKS } = await load('src/lib/roadmap/dateAudit.js');
const { classFallYears, dayKey } = await load('src/lib/timeline.js');

let passed = 0;
const failures = [];
const notes = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(detail ? `${label}\n      ${detail}` : label);
};
const section = (name) => console.log(`\n${name}`);

const GRADES = ['freshman', 'sophomore', 'junior', 'senior', 'gap'];

/**
 * The clocks. Each one is a boundary something has historically been wrong at,
 * plus two ordinary mid-term dates so a regression that only breaks the normal
 * case cannot hide behind a suite made entirely of edge cases.
 */
const CLOCKS = [
  ['a leap year, mid-February', new Date('2028-02-14')],
  ['the leap day itself', new Date('2028-02-29')],
  ['the day after a leap day', new Date('2028-03-01')],
  ['the last day of an academic year', new Date('2026-07-31')],
  ['the first day of an academic year', new Date('2026-08-01')],
  ['New Year’s Eve', new Date('2026-12-31')],
  ['New Year’s Day', new Date('2027-01-01')],
  ['mid-autumn, application season', new Date('2026-10-15')],
  ['mid-spring, the quiet stretch', new Date('2027-04-20')],
  ['high summer, when both cycles are visible', new Date('2027-06-20')],
];

// ─────────────────────────────────────────────────────────────────────────────
section('1. Every authored date names a day that can exist');
// The catalog is MM-DD strings; before any arithmetic touches them, they have to
// be days. '02-30' and '04-31' are the ones that read as fine and are not.
for (const entry of CAT.ROADMAP_CATALOG) {
  const w = entry.window;
  if (!w) continue;
  for (const field of ['opensMonthDay', 'dueMonthDay', 'onMonthDay']) {
    const value = w[field];
    if (value == null) continue;
    assert(`"${entry.id}" · ${field} is a day that exists`, isRealMonthDay(value), `got ${JSON.stringify(value)}`);
  }
  // A lead time longer than a year schedules work before the previous year's
  // occurrence of the same thing, which is not preparation, it is an error.
  if (entry.prepWeeks != null) {
    assert(`"${entry.id}" · lead time is a plausible number of weeks`,
      Number.isInteger(entry.prepWeeks) && entry.prepWeeks >= 0 && entry.prepWeeks <= 52,
      `prepWeeks ${entry.prepWeeks}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. Every entry resolves to coherent dates, for every grade, at every clock');
// The full matrix. This is the expensive assertion and the one that earns the
// script: ~68 entries × 5 grades × 2 offsets × 10 clocks, each through all four
// gates.
let resolved = 0;
const brokenByEntry = new Map();
for (const [clockName, now] of CLOCKS) {
  const today = dayKey(now);
  for (const grade of GRADES) {
    const years = classFallYears(grade, now);
    for (const entry of CAT.ROADMAP_CATALOG) {
      for (let offset = 0; offset <= 1; offset += 1) {
        if (!fitsGrade(entry, grade, offset)) continue;
        const window = resolveWindow(entry, years, grade, offset);
        if (!window) continue;
        resolved += 1;
        const item = {
          catalogId: entry.id,
          confidence: entry.confidence,
          track: entry.track,
          url: entry.url || null,
          season: entry.season || null,
          prepWeeks: entry.prepWeeks || 0,
          ...window,
        };
        // CHECK 3 needs a `missed` flag and a horizon to be meaningful, and at
        // build time neither exists — this pass is about shape and coherence,
        // which is what checks 1, 2 and 4 own. The runtime pass in
        // buildCandidateSlate is where check 3 does its work, against a real
        // clock and a real student.
        const audit = auditItem(item, { today });
        const serious = audit.problems.filter((p) => p.verdict === VERDICT.WITHHOLD);
        if (serious.length) {
          const key = `${entry.id} @ ${clockName} (${grade}, +${offset})`;
          brokenByEntry.set(key, serious.map((p) => `${p.check}: ${p.message}`));
        }
      }
    }
  }
}
assert('no entry resolves to dates that contradict each other',
  brokenByEntry.size === 0,
  [...brokenByEntry.entries()].slice(0, 12).map(([k, v]) => `${k}\n        ${v.join('\n        ')}`).join('\n      '));
assert('the matrix actually resolved a meaningful number of occurrences', resolved > 1000, `${resolved} resolutions`);
notes.push(`${resolved} occurrences resolved and checked across ${CLOCKS.length} clocks × ${GRADES.length} grades`);

// ─────────────────────────────────────────────────────────────────────────────
section('3. An opening never follows the thing it opens');
// Called out separately from check 2 because this is the specific bug the audit
// found in the shipped catalog: a summer opening against an autumn deadline
// resolved a year late, because June belongs to the next academic year and
// November to this one. resolveWindow corrects it; this is the regression gate.
let summerOpenings = 0;
for (const [, now] of CLOCKS) {
  for (const grade of GRADES) {
    const years = classFallYears(grade, now);
    for (const entry of CAT.ROADMAP_CATALOG) {
      const w = entry.window;
      if (!w?.opensMonthDay || !(w.dueMonthDay || w.onMonthDay)) continue;
      const opensMonth = Number(w.opensMonthDay.slice(0, 2));
      const closesMonth = Number((w.dueMonthDay || w.onMonthDay).slice(0, 2));
      // The shape at issue: opens in the Jan–Jul half, closes in the Aug–Dec half.
      if (!(opensMonth < 8 && closesMonth >= 8)) continue;
      summerOpenings += 1;
      const window = resolveWindow(entry, years, grade, 0);
      if (!window) continue;
      assert(`"${entry.id}" · a summer opening precedes its autumn deadline`,
        window.opens && window.anchor && window.opens < window.anchor,
        `opens ${window.opens}, closes ${window.anchor}`);
      assert(`"${entry.id}" · and does so by less than a year`,
        !window.opens || (new Date(window.anchor) - new Date(window.opens)) / 86400000 < 366,
        `opens ${window.opens}, closes ${window.anchor}`);
    }
  }
}
notes.push(`${summerOpenings} summer-opening/autumn-deadline pairs checked`);

// ─────────────────────────────────────────────────────────────────────────────
section('4. Nothing a student is shown fails a check');
// The runtime path, end to end: the same call the app makes, at every clock and
// every grade. buildCandidateSlate audits internally, so what this asserts is
// that the audit had nothing left to do — a slate arriving with withheld items
// means the catalog shipped a bug that the runtime caught for us, which is a
// safety net firing, not a safety net being unnecessary.
for (const [clockName, now] of CLOCKS) {
  for (const grade of GRADES) {
    const slate = buildCandidateSlate({ user: { gradeStage: grade }, answers: {}, now });
    assert(`${grade} @ ${clockName} · nothing had to be withheld`,
      (slate.dateAudit?.withheld || []).length === 0,
      (slate.dateAudit?.withheld || []).map((w) => `${w.id}: ${w.problems.map((p) => p.message).join('; ')}`).join('\n      '));
    assert(`${grade} @ ${clockName} · nothing had its precision downgraded`,
      (slate.dateAudit?.downgraded || []).length === 0,
      (slate.dateAudit?.downgraded || []).map((w) => `${w.id}: ${w.problems.map((p) => p.message).join('; ')}`).join('\n      '));
    assert(`${grade} @ ${clockName} · still gets a real year`, slate.items.length >= 5, `${slate.items.length} items`);
    // Every surviving date is a real day. Belt and braces over the audit, and
    // cheap: this is the assertion that would catch a future change to the audit
    // itself letting something through.
    for (const item of slate.items) {
      for (const field of ['opens', 'due', 'on', 'anchor', 'startBy']) {
        if (item[field] == null) continue;
        assert(`${grade} @ ${clockName} · "${item.catalogId}".${field} is a real day`, isRealDate(item[field]), `${item[field]}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The checks themselves still catch what they claim to');
// A verification script whose assertions all pass because the code under test
// stopped checking anything is the worst outcome available here, so the gates
// are run against deliberately broken items. If any of these stops failing, the
// gate it exercises has been weakened.
const today = '2027-01-15';
const broken = [
  ['an impossible calendar day', { confidence: 'fixed', due: '2027-02-30', anchor: '2027-02-30' }, VERDICT.WITHHOLD],
  ['a leap day in a common year', { confidence: 'fixed', due: '2027-02-29', anchor: '2027-02-29' }, VERDICT.WITHHOLD],
  ['an opening after its deadline', { confidence: 'fixed', opens: '2027-06-01', due: '2027-03-01', anchor: '2027-03-01' }, VERDICT.WITHHOLD],
  ['a lead time landing after the deadline', { confidence: 'fixed', due: '2027-03-01', anchor: '2027-03-01', startBy: '2027-04-01', prepWeeks: 0 }, VERDICT.WITHHOLD],
  ['a lead time that is not prepWeeks before the anchor', { confidence: 'fixed', due: '2027-03-01', anchor: '2027-03-01', startBy: '2027-02-01', prepWeeks: 2 }, VERDICT.WITHHOLD],
  ['an anchor that is not the deadline', { confidence: 'fixed', due: '2027-03-01', anchor: '2027-05-05' }, VERDICT.WITHHOLD],
  ['something marked passed that has not', { confidence: 'fixed', due: '2027-09-01', anchor: '2027-09-01', missed: true }, VERDICT.REPAIR],
  ['something presented as upcoming that is long gone', { confidence: 'fixed', due: '2026-09-01', anchor: '2026-09-01', missed: false }, VERDICT.REPAIR],
  ['a fixed date with no date', { confidence: 'fixed' }, VERDICT.DOWNGRADE],
  ['a typical scholarship with nowhere to confirm', { confidence: 'typical', track: 'scholarship', due: '2027-03-01', anchor: '2027-03-01' }, VERDICT.DOWNGRADE],
  ['a local entry with no season to show', { confidence: 'varies' }, VERDICT.DOWNGRADE],
  ['a local entry showing a raw season id', { confidence: 'varies', season: 's3' }, VERDICT.DOWNGRADE],
  ['an unknown confidence', { confidence: 'probably', due: '2027-03-01', anchor: '2027-03-01' }, VERDICT.DOWNGRADE],
];
for (const [label, item, expected] of broken) {
  const audit = auditItem(item, { today });
  assert(`the checks reject ${label}`, audit.verdict === expected,
    `expected ${expected}, got ${audit.verdict}${audit.problems.length ? ` (${audit.problems.map((p) => p.message).join('; ')})` : ' — nothing was flagged at all'}`);
}
// And a clean item passes, so the gates are not simply rejecting everything.
const clean = auditItem({ confidence: 'fixed', due: '2027-11-01', anchor: '2027-11-01', startBy: '2027-09-20', prepWeeks: 6, track: 'application' }, { today });
assert('a well-formed item passes all four checks', clean.ok, clean.problems.map((p) => p.message).join('; '));
assert('and the report names all four checks by name', clean.checked.length === 4 && CHECKS.length === 4);

// ─────────────────────────────────────────────────────────────────────────────
console.log('');
if (failures.length) {
  console.error(`✗ Roadmap date verification FAILED — ${failures.length} problem(s), ${passed} assertions passed:\n`);
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`✓ Roadmap date verification passed — ${passed} assertions.`);
notes.forEach((n) => console.log(`  ${n}`));
console.log(`  four checks: ${CHECKS.join(' → ')}`);
