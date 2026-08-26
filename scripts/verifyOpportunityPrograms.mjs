#!/usr/bin/env node
// Data-integrity and behavior assertions for the structured programs layer:
// src/data/opportunityPrograms.js + src/lib/opportunityEligibility.js.
//
// There is no test runner in this repo, so this script IS the test suite for
// the part of Opportunities that makes factual claims about the real world.
// What it guards, in order of how badly it hurts when it breaks:
//
//   1. A wrong or invented eligibility rule. A student who is told they qualify
//      and does not spends a week on an application they cannot submit; a
//      student told they do not qualify and does loses a program entirely.
//   2. A deadline that renders as more certain than it is. Every non-exact date
//      has to carry its precision, and the next occurrence has to roll forward
//      to next cycle once this cycle's has passed — the April student is the
//      whole reason this feature exists.
//   3. Alerts that fire in the past, or a saved program with no alerts at all.
//   4. Tier drift. In particular: the pay-to-play tier must stay OUT of the
//      browsable catalog (which excludes pay-to-attend products by design) and
//      must keep saying, in words, why it costs what it costs.
//   5. Ids that do not line up with the browsable catalog, which would fork one
//      program into two.
//
//   node scripts/verifyOpportunityPrograms.mjs
import {
  PROGRAMS, PROGRAM_TIERS, TIER_BY_ID, DEADLINE_PRECISIONS, COST_MODELS,
  PROGRAM_CATEGORIES, CATEGORY_BY_ID, programsInState, isRegional,
  HOSA_EVENTS, HOSA_CATEGORIES, HOSA_EVENTS_BY_CAT, HOSA_LEVELS,
} from '../src/data/opportunityPrograms.js';
import { OPPORTUNITIES, OPPORTUNITY_TYPES } from '../src/data/opportunities.js';
import {
  evaluateEligibility, nextDeadline, milestoneRowsFor, ALERT_OFFSETS,
  isFreeOrFunded, costLabel, verifiedLabel, studentEligibilityFacts, GENERIC_ALTERNATIVE,
  deadlineCalendar, upcomingDeadlines, MONTH_SHORT,
} from '../src/lib/opportunityEligibility.js';
import { PIPELINE_STAGES, STAGE_BY_ID, ACTIVE_STAGES, stageCounts, readPrefs, writePrefs } from '../src/lib/opportunityMatch.js';
import { PATHS, US_STATES } from '../src/data/constants.js';

const STATE_CODES = new Set(US_STATES.map(s => s.code));

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};

const TYPES = OPPORTUNITY_TYPES.filter(t => t !== 'All');
const catalogIds = new Set(OPPORTUNITIES.map(o => o.id));
const catalogById = Object.fromEntries(OPPORTUNITIES.map(o => [o.id, o]));

// ── 1. Identity and shape ────────────────────────────────────────────────────
const ids = PROGRAMS.map(p => p.id);
assert('every program id is unique', new Set(ids).size === ids.length,
  `duplicates: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);

for (const p of PROGRAMS) {
  const at = `[${p.id}]`;
  assert(`${at} has a name`, !!p.name?.trim());
  assert(`${at} has an organizing body`, !!p.org?.trim());
  assert(`${at} type is a catalog type`, TYPES.includes(p.type), `got: ${p.type}`);
  assert(`${at} is in a known tier`, !!TIER_BY_ID[p.tier], `got: ${p.tier}`);
  assert(`${at} names at least one pathway`, Array.isArray(p.pathways) && p.pathways.length > 0);
  assert(`${at} pathways all exist in PATHS`, (p.pathways || []).every(k => PATHS[k]),
    `unknown: ${(p.pathways || []).filter(k => !PATHS[k]).join(', ')}`);
  assert(`${at} explains why it matters`, (p.why || '').trim().length >= 40);
  assert(`${at} states who can apply`, (p.eligibility || '').trim().length >= 30);
  assert(`${at} carries a last-verified date`, /^\d{4}-\d{2}-\d{2}$/.test(p.verified || ''));
  assert(`${at} verified date is not in the future`, new Date(`${p.verified}T00:00:00`) <= new Date());
  assert(`${at} cost model is known`, COST_MODELS.includes(p.cost?.model), `got: ${p.cost?.model}`);
  assert(`${at} cost carries a note`, (p.cost?.note || '').trim().length > 0);
  assert(`${at} a free program never also carries a price`,
    !(p.cost?.model === 'free' && p.cost?.usd > 0));
  assert(`${at} citizenship is a known value`, p.citizenship == null || ['us', 'us_or_pr'].includes(p.citizenship));
  assert(`${at} selectivity is known`, ['elite', 'competitive', 'open'].includes(p.selectivity), `got: ${p.selectivity}`);
  if (p.deadline) {
    assert(`${at} deadline precision is known`, DEADLINE_PRECISIONS.includes(p.deadline.precision), `got: ${p.deadline.precision}`);
    assert(`${at} deadline carries a note a student can act on`, (p.deadline.note || '').trim().length >= 15);
    assert(`${at} an exact deadline names a day`, p.deadline.precision !== 'exact' || p.deadline.day != null);
    assert(`${at} a non-rolling deadline names a month or says it varies`,
      p.deadline.precision === 'rolling' || p.deadline.precision === 'varies' || p.deadline.month != null);
  }
  if (p.url) assert(`${at} url is https`, /^https:\/\//.test(p.url), p.url);
  // Grade/age gates have to be internally consistent or the badge lies.
  if (p.minGrade != null && p.maxGrade != null) assert(`${at} minGrade <= maxGrade`, p.minGrade <= p.maxGrade);
  if (p.minAge != null && p.maxAge != null) assert(`${at} minAge <= maxAge`, p.minAge <= p.maxAge);
  // ── The two fields the expansion added ──────────────────────────────────
  // `category` drives the explorer's filter chips; a value outside the
  // vocabulary is invisible to every chip and the program becomes unreachable
  // by browsing, which is the same failure enum drift causes in the catalog.
  assert(`${at} category is a known category`, !!CATEGORY_BY_ID[p.category], `got: ${p.category}`);
  // `states` is the field that decides whether a student is shown a program at
  // all once they set their home state. A typo'd or lowercase code silently
  // hides a real program from the students it is FOR, which is worse than
  // showing it to everyone.
  assert(`${at} states is null or a non-empty array`, p.states === null || (Array.isArray(p.states) && p.states.length > 0));
  if (Array.isArray(p.states)) {
    const bad = p.states.filter(s => !STATE_CODES.has(s));
    assert(`${at} every state code is real and uppercase`, bad.length === 0, `unknown: ${bad.join(', ')}`);
  }
}

// ── 2. The two catalogs agree ────────────────────────────────────────────────
for (const p of PROGRAMS) {
  if (p.tier === 'pay_to_play') {
    // opportunities.js excludes pay-to-attend products by design (see its
    // header). These live ONLY here, where the tier itself is the warning.
    assert(`[${p.id}] pay-to-play programs stay out of the browsable catalog`, !catalogIds.has(p.id));
    assert(`[${p.id}] says plainly why it costs what it costs`,
      /open enrollment|open enrollment|anyone who pays|not a selective/i.test(`${p.why} ${p.eligibility}`));
    assert(`[${p.id}] is never labelled free`, !isFreeOrFunded(p));
  } else if (catalogIds.has(p.id)) {
    assert(`[${p.id}] name matches the browsable catalog`, catalogById[p.id].name === p.name,
      `structured: ${p.name} · catalog: ${catalogById[p.id].name}`);
    assert(`[${p.id}] type matches the browsable catalog`, catalogById[p.id].type === p.type);
  } else {
    failures.push(`[${p.id}] is not in the browsable catalog — a student browsing would never see it`);
  }
}
assert('every tier has at least one program', PROGRAM_TIERS.every(t => PROGRAMS.some(p => p.tier === t.id)));
assert('the honest-about-cost tier exists and says so', /anyone who pays gets in/i.test(TIER_BY_ID.pay_to_play.blurb));

// ── 3. Eligibility ───────────────────────────────────────────────────────────
const simr = PROGRAMS.find(p => p.id === 'stanford-simr');
assert('SIMR is in the structured set', !!simr);
{
  const fourteen = { age: 14, grade: 9 };
  const v = evaluateEligibility(simr, fourteen);
  assert('a 14-year-old is told they are too young for SIMR', v.status === 'too_young');
  assert('being too young is never a dead end', !!v.alternative && v.alternative.length > 40);
  assert('the too-young verdict names the gap', v.blockers.some(b => /16/.test(b)));
  assert('the too-young verdict knows when it clears', v.waitUntil?.kind === 'age' && v.waitUntil.value === 16);

  const junior = { age: 17, grade: 11 };
  const jv = evaluateEligibility(simr, junior);
  assert('an eligible junior is not blocked from SIMR', jv.blockers.length === 0);
  assert('SIMR still surfaces its citizenship requirement', jv.notes.some(n => /green card|citizenship/i.test(n)));
  assert('a citizenship requirement is a note, never a verdict about the student', jv.status === 'citizenship');

  const unknown = evaluateEligibility(simr, { age: null, grade: null });
  assert('we never clear a student on facts we do not have', unknown.status === 'unknown');
  assert('an unknown verdict asks for the missing fact', unknown.notes.some(n => /Settings|grade/i.test(n)));
  // One unresolved gate is enough, even when the other one passes: a
  // senior-only competition must never read "you qualify" to a student whose
  // grade we do not know, however much else we do know about them.
  const sts = PROGRAMS.find(p => p.id === 'regeneron-science-talent-search');
  assert('a known age does not clear an unknown grade gate',
    evaluateEligibility(sts, { age: 17, grade: null }).status === 'unknown');
  assert('a known grade does not clear an unknown age gate',
    evaluateEligibility(simr, { age: null, grade: 11 }).status === 'unknown');
}
{
  const sts = PROGRAMS.find(p => p.id === 'regeneron-science-talent-search');
  const senior = evaluateEligibility(sts, { age: 17, grade: 12 });
  assert('a senior is cleared for a senior-only competition', senior.status === 'eligible');
  const soph = evaluateEligibility(sts, { age: 15, grade: 10 });
  assert('a sophomore is told STS is a senior-year competition', soph.status === 'wrong_grade');
  assert('the wrong-year verdict still says what to do now', !!soph.alternative);
}
assert('every program that can block a student can answer "what instead"',
  PROGRAMS.every(p => p.altUnder || GENERIC_ALTERNATIVE));
assert('a program with no gates at all reads as likely eligible',
  evaluateEligibility({ id: 'x', name: 'x' }, { age: 14, grade: 9 }).status === 'likely');
assert('studentEligibilityFacts never invents a citizenship answer',
  studentEligibilityFacts({ user: { age: 16 } }).citizenshipKnown === false);

// ── 4. Deadlines and alerts ──────────────────────────────────────────────────
{
  // A student browsing on 1 April, after February closed. The next occurrence
  // has to be next year's, and it has to say so.
  const april = new Date(2026, 3, 1);
  const dl = nextDeadline(simr, april);
  assert('a passed deadline rolls forward to the next cycle', dl.passedThisCycle === true);
  assert('the next occurrence is in the future', dl.daysOut > 0);
  assert('an approximate date never renders as an exact one', /approx/i.test(dl.label));

  const rows = milestoneRowsFor(simr, dl.iso, april);
  assert('saving a program writes the deadline plus its alerts', rows.length === 1 + ALERT_OFFSETS.length);
  assert('the deadline row is flagged as approximate when it is', /approx/i.test(rows[0].title));
  assert('every alert row is dated before the deadline',
    rows.slice(1).every(r => r.due_date < rows[0].due_date));
  assert('every row lands in the opportunity lane', rows.every(r => r.kind === 'opportunity'));
  assert('the alerts are 60, 30 and 7 days out',
    ALERT_OFFSETS.every(o => rows.some(r => r.title.includes(`${o} days out`))));

  // Two days before the deadline: three alerts in the past are clutter, not
  // reminders, so only the deadline itself is written.
  const twoDaysBefore = new Date(new Date(`${dl.iso}T00:00:00`).getTime() - 2 * 86400000);
  const late = milestoneRowsFor(simr, dl.iso, twoDaysBefore);
  assert('alerts that would land in the past are not written', late.length === 1);
}
{
  const rolling = PROGRAMS.find(p => p.deadline?.precision === 'rolling');
  assert('a rolling program exists and says it has no deadline',
    !!rolling && /no deadline/i.test(nextDeadline(rolling).label));
  assert('a rolling program writes no milestone rows without a date', milestoneRowsFor(rolling, null).length === 0);
}
assert('every dated program produces a future deadline',
  PROGRAMS.filter(p => p.deadline?.month != null).every(p => nextDeadline(p).daysOut > 0));

// ── 5. Cost ──────────────────────────────────────────────────────────────────
assert('free-and-funded includes stipend programs',
  PROGRAMS.filter(p => p.stipend === true).every(isFreeOrFunded));
assert('the free-and-funded filter excludes every pay-to-play program',
  PROGRAMS.filter(p => p.tier === 'pay_to_play').every(p => !isFreeOrFunded(p)));
assert('a cost with no published number never renders a fake one',
  PROGRAMS.filter(p => p.cost?.usd == null && p.cost?.model !== 'free' && p.cost?.model !== 'free_plus_stipend')
    .every(p => !/\$/.test(costLabel(p))));
assert('the last-checked line is human-readable', /checked/i.test(verifiedLabel(PROGRAMS[0]) || ''));

// ── 6. HOSA ──────────────────────────────────────────────────────────────────
const hosaIds = HOSA_EVENTS.map(e => e.id);
assert('every HOSA event id is unique', new Set(hosaIds).size === hosaIds.length,
  `duplicates: ${hosaIds.filter((id, i) => hosaIds.indexOf(id) !== i).join(', ')}`);
assert('every HOSA event names a real category',
  HOSA_EVENTS.every(e => HOSA_CATEGORIES.some(c => c.id === e.cat)),
  `bad: ${HOSA_EVENTS.filter(e => !HOSA_CATEGORIES.some(c => c.id === e.cat)).map(e => e.id).join(', ')}`);
assert('HOSA\'s six categories are all represented',
  HOSA_EVENTS_BY_CAT.every(c => c.events.length > 0),
  `empty: ${HOSA_EVENTS_BY_CAT.filter(c => !c.events.length).map(c => c.id).join(', ')}`);
assert('the categories are HOSA\'s own',
  ['health_science', 'health_professions', 'emergency_preparedness', 'leadership', 'teamwork', 'recognition']
    .every(id => HOSA_CATEGORIES.some(c => c.id === id)));
assert('the qualification ladder runs interested → national',
  HOSA_LEVELS[0].id === 'interested' && HOSA_LEVELS[HOSA_LEVELS.length - 1].id === 'national');

// ── 7. Scale and coverage ────────────────────────────────────────────────────
// The database's usefulness is breadth. These are floors, not targets: a
// student in any grade, in any state, with no money, has to find something.
assert('the structured layer has at least 90 programs', PROGRAMS.length >= 90, `got ${PROGRAMS.length}`);
for (const c of PROGRAM_CATEGORIES) {
  const n = PROGRAMS.filter(p => p.category === c.id).length;
  assert(`category "${c.id}" has at least 2 programs`, n >= 2, `got ${n}`);
}
assert('every category id is unique', new Set(PROGRAM_CATEGORIES.map(c => c.id)).size === PROGRAM_CATEGORIES.length);
assert('every category has a label, blurb and color token',
  PROGRAM_CATEGORIES.every(c => c.label && c.blurb && c.colorKey));

// The hidden-gem tier makes an editorial promise — small, real and winnable —
// and a tier that quietly fills up with elite national programs has broken it
// without anything failing. These two assertions are that promise, in code.
const gems = PROGRAMS.filter(p => p.tier === 'hidden_gem');
assert('the hidden-gem tier is substantial', gems.length >= 15, `got ${gems.length}`);
assert('most hidden gems cost the student nothing',
  gems.filter(isFreeOrFunded).length >= gems.length * 0.7,
  `${gems.filter(isFreeOrFunded).length}/${gems.length}`);
assert('the hidden-gem tier is not mostly elite programs wearing a friendlier label',
  gems.filter(p => p.selectivity === 'elite').length <= gems.length * 0.25,
  `${gems.filter(p => p.selectivity === 'elite').length}/${gems.length} are elite`);

// A student who has told us nothing must still see most of the database, and a
// student in any single state must still have real options. The second one is
// the check that catches a future expansion that is accidentally all New York.
assert('geography never hides a national program', programsInState('NE').every(p => !p.states || p.states.includes('NE')));
assert('a national program is open in every state',
  PROGRAMS.filter(p => !isRegional(p)).every(p => programsInState('WY').includes(p)));
for (const code of ['CA', 'TX', 'NY', 'NE', 'WY']) {
  const n = programsInState(code).length;
  assert(`a student in ${code} sees at least 60 programs`, n >= 60, `got ${n}`);
}

// ── 8. The year, as a shape ──────────────────────────────────────────────────
{
  const { months, undated } = deadlineCalendar(PROGRAMS, new Date(2026, 7, 26));
  assert('the calendar is twelve months long', months.length === 12);
  assert('the calendar starts at the current month', months[0].month === 8 && months[0].isNow === true);
  assert('the calendar wraps rather than stopping at December', months.some(m => m.month === 1));
  assert('every month carries a short label', months.every(m => MONTH_SHORT.includes(m.label)));
  const bucketed = months.reduce((n, m) => n + m.count, 0);
  assert('every dated program lands in exactly one month',
    bucketed === PROGRAMS.filter(p => p.deadline?.month != null).length, `bucketed ${bucketed}`);
  assert('undated programs are reported rather than dropped',
    bucketed + undated.length === PROGRAMS.length);
  // The fact the whole strip exists to make visible: the winter really is where
  // the deadlines are. If a future edit made this false, the copy on the tab
  // ("the good summer programs close in December through February") would be
  // telling students something untrue.
  const winter = months.filter(m => [12, 1, 2].includes(m.month)).reduce((n, m) => n + m.count, 0);
  const spring = months.filter(m => [4, 5, 6].includes(m.month)).reduce((n, m) => n + m.count, 0);
  assert('the winter really is the busiest deadline season', winter > spring, `winter ${winter} vs spring ${spring}`);
}

// ── 9. What is closing soonest ───────────────────────────────────────────────
{
  const facts = { age: 17, grade: 11 };
  const soon = upcomingDeadlines(PROGRAMS, facts, { limit: 6 });
  assert('the closing-soonest board returns a full slate', soon.length === 6);
  assert('it is sorted by how soon each one closes',
    soon.every((r, i) => i === 0 || soon[i - 1].dl.daysOut <= r.dl.daysOut));
  assert('a pay-to-play program is never urged on anyone',
    soon.every(r => r.p.tier !== 'pay_to_play'));
  assert('nothing in it has already passed', soon.every(r => r.dl.daysOut > 0));

  // A fourteen-year-old must never be given a countdown to something with a
  // sixteen-or-over gate: an urgent reminder about a program you cannot enter
  // is worse than no reminder.
  const young = upcomingDeadlines(PROGRAMS, { age: 14, grade: 9 }, { limit: 20 });
  assert('a too-young student is never shown a countdown they cannot act on',
    young.every(r => evaluateEligibility(r.p, { age: 14, grade: 9 }).status !== 'too_young'));

  assert('free-only really is free-only',
    upcomingDeadlines(PROGRAMS, facts, { limit: 20, freeOnly: true }).every(r => isFreeOrFunded(r.p)));
  assert('a state filter never surfaces a program that state cannot enter',
    upcomingDeadlines(PROGRAMS, facts, { limit: 20, state: 'NE' })
      .every(r => !r.p.states || r.p.states.includes('NE')));
  assert('a student who sets their state still gets a usable board',
    upcomingDeadlines(PROGRAMS, facts, { limit: 6, state: 'NE' }).length === 6);
}

// ── 10. The application pipeline ─────────────────────────────────────────────
{
  const ids = PIPELINE_STAGES.map(s => s.id);
  assert('every pipeline stage id is unique', new Set(ids).size === ids.length);
  assert('the pipeline runs interested → accepted', ids[0] === 'interested' && ids[ids.length - 1] === 'accepted');
  assert('STAGE_BY_ID indexes every stage', ids.every(id => STAGE_BY_ID[id]));
  assert('every stage has a label, a color token and a one-line meaning',
    PIPELINE_STAGES.every(s => s.label && s.colorKey && s.sub));
  assert('the active stages are the ones with work left in them',
    ACTIVE_STAGES.every(id => STAGE_BY_ID[id]) && !ACTIVE_STAGES.includes('submitted') && !ACTIVE_STAGES.includes('accepted'));

  // Stages round-trip through the user record, and a junk value from an older
  // build is dropped rather than rendered as a blank chip forever.
  const saved = writePrefs({ name: 'x' }, {
    stages: { 'stanford-simr': 'applying', 'made-up-program': 'not_a_stage' },
    homeState: 'ny',
  });
  const back = readPrefs(saved);
  assert('a real stage survives the round trip', back.stages['stanford-simr'] === 'applying');
  assert('an unknown stage value is dropped', back.stages['made-up-program'] === undefined);
  assert('a home state is normalized to uppercase', back.homeState === 'NY');
  assert('a junk home state is refused', readPrefs(writePrefs({}, { homeState: 'nonsense' })).homeState === null);
  assert('writePrefs does not clobber the rest of the user record', saved.name === 'x');

  const counts = stageCounts({ a: 'applying', b: 'applying', c: 'submitted' });
  assert('stage counts add up', counts.applying === 2 && counts.submitted === 1 && counts.interested === 0);
  assert('stage counts name every stage even at zero', ids.every(id => counts[id] != null));
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nStructured programs: ${PROGRAMS.length}`);
for (const t of PROGRAM_TIERS) {
  const list = PROGRAMS.filter(p => p.tier === t.id);
  console.log(`  ${t.label}: ${list.length} (${list.filter(isFreeOrFunded).length} free or funded)`);
}
console.log(`  ${PROGRAMS.filter(p => p.deadline?.month != null).length} carry a dated deadline · ${PROGRAMS.filter(p => p.citizenship).length} require US citizenship or a green card`);
console.log(`  ${PROGRAMS.filter(p => !isRegional(p)).length} national · ${PROGRAMS.filter(isRegional).length} open to particular states`);
console.log(`  by kind: ${PROGRAM_CATEGORIES.map(c => `${c.label.toLowerCase()} ${PROGRAMS.filter(p => p.category === c.id).length}`).join(' · ')}`);
{
  const { months } = deadlineCalendar(PROGRAMS, new Date(2026, 0, 1));
  console.log(`  the year: ${months.map(m => `${m.label} ${m.count}`).join(' · ')}`);
}
console.log(`HOSA: ${HOSA_EVENTS.length} competitive events across ${HOSA_CATEGORIES.length} categories`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} failed assertion(s) (${passed} passed):\n`);
  for (const f of failures.slice(0, 40)) console.error(`  ✗ ${f}`);
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\n✓ ${passed} assertions passed.`);
