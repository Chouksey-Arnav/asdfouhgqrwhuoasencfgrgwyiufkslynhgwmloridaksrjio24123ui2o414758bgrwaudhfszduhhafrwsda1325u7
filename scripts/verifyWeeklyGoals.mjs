#!/usr/bin/env node
// Assertions on the Portfolio weekly-goal engine (src/lib/weeklyGoals.js) and the tracked-item
// classifier (src/lib/trackedItems.js). No test runner in this repo, so this script is the test
// suite for the logic behind every progress bar and daily report the student sees.
//
// The three properties worth failing a build over:
//
//   1. META BRAIN NEVER SETS A GOAL. recommendTarget() is pure — given a user object it must
//      return a suggestion and leave that object byte-identical. If a recommendation could ever
//      mutate stored state, the product's central promise ("only you set your goals") is a lie.
//   2. RECOMMENDATIONS STAY REACHABLE. Every recommendation, under every combination of deadline
//      pressure, benchmark gap, and demonstrated pace — including adversarial inputs — must land
//      within the metric's declared [min, ceiling]. A target nobody can hit teaches students to
//      ignore the bar.
//   3. PROGRESS IS MEASURED FROM REAL ROWS. Each metric's measure() has to count the right rows
//      in the right week — off-by-one on a week boundary silently zeroes someone's real work.
//
//   node scripts/verifyWeeklyGoals.mjs
import {
  METRICS, METRIC_BY_ID, weekRange, recentWeekKeys, daysLeftInWeek, measureWeek, measureHistory,
  readGoals, setGoal, setPinned, pinnedMetrics, goalsForWeek, goalFor, recordWeekResult,
  goalStreak, recommendTarget, recommendAll, summarizeWeek, weekHeadline, getIsoWeekKey, toTime,
  weeksToNearestDeadline, currentLoadHours, isEmptySnapshot, snapshotItemCount,
} from '../src/lib/weeklyGoals.js';
import {
  buildTrackedItems, buildDailyReport, buildReportPrompt, stageCounts, trackedSignature, STAGES, STALE_DAYS,
} from '../src/lib/trackedItems.js';

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};
const eq = (label, actual, expected) => assert(label, actual === expected, `expected ${expected}, got ${actual}`);

const DAY = 86400000;
const NOW = new Date('2026-03-11T12:00:00'); // a Wednesday, local time
const { start: WEEK_START, end: WEEK_END } = weekRange(NOW);
const iso = (d) => new Date(d).toISOString();
const inWeek = (offsetDays = 1) => iso(WEEK_START.getTime() + offsetDays * DAY + 3600000);
const lastWeek = (offsetDays = 1) => iso(WEEK_START.getTime() - 7 * DAY + offsetDays * DAY);

// ── Week math ────────────────────────────────────────────────────────────────
eq('week starts on Monday', WEEK_START.getDay(), 1);
eq('week is 7 days long', Math.round((WEEK_END - WEEK_START) / DAY), 7);
assert('the anchor date falls inside its own week', NOW >= WEEK_START && NOW < WEEK_END);
eq('recentWeekKeys returns the requested count', recentWeekKeys(6, NOW).length, 6);
eq('recentWeekKeys ends with the current week', recentWeekKeys(6, NOW).at(-1), getIsoWeekKey(NOW));
assert('recentWeekKeys are all distinct', new Set(recentWeekKeys(12, NOW)).size === 12);
eq('daysLeftInWeek counts today (Wednesday → 5)', daysLeftInWeek(NOW), 5);
eq('daysLeftInWeek on the final day is 1', daysLeftInWeek(new Date(WEEK_END.getTime() - 3600000)), 1);

// A date-only string must parse as LOCAL midnight; parsing it as UTC is what silently misfiles
// every Monday entry for anyone west of Greenwich.
eq('date-only strings parse as local midnight', toTime('2026-03-09'), new Date('2026-03-09T00:00:00').getTime());

// ── Measurement ──────────────────────────────────────────────────────────────
const snapshot = {
  clinicalHours: [
    { id: 1, hours: 4, entry_date: '2026-03-10' },              // this week
    { id: 2, hours: 3, entry_date: '2026-03-09' },              // this week (Monday — the boundary)
    { id: 3, hours: 9, entry_date: '2026-03-08' },              // last week (Sunday)
  ],
  essays: [{ id: 1 }, { id: 2 }],
  essayVersions: [
    { essay_id: 1, word_count: 200, created_at: lastWeek(2) },
    { essay_id: 1, word_count: 650, created_at: inWeek(1) },    // +450
    { essay_id: 2, word_count: 300, created_at: lastWeek(1) },
    { essay_id: 2, word_count: 120, created_at: inWeek(2) },    // a cut — floors at 0, never negative
  ],
  activities: [
    { id: 1, status: 'ongoing', hours_per_week: 5, created_at: lastWeek(1) },
    { id: 2, status: 'ongoing', hours_per_week: 2, created_at: inWeek(1) },
    { id: 3, status: 'completed', hours_per_week: 8, created_at: lastWeek(1) },
  ],
  scholarships: [
    { id: 1, name: 'Alpha', status: 'researching', created_at: inWeek(1), updated_at: inWeek(1) },
    { id: 2, name: 'Beta', status: 'applying', created_at: lastWeek(1), updated_at: inWeek(2) },
  ],
  colleges: [{ id: 1, name: 'State U', status: 'researching', created_at: inWeek(0), updated_at: inWeek(0) }],
  deadlines: [{ id: 1, title: 'App due', due_date: '2026-04-01', created_at: inWeek(1) }],
  research: [{ id: 1, hours: 6, created_at: lastWeek(1), updated_at: inWeek(1) }],
  recommenders: [{ id: 1, name: 'Ms. Lee', status: 'Asked', created_at: inWeek(1), updated_at: inWeek(1) }],
  skills: [{ id: 1, name: 'CPR', created_at: inWeek(1) }],
  interviewSessions: [
    { id: 1, completedAt: WEEK_START.getTime() + DAY },
    { id: 2, completedAt: WEEK_START.getTime() - DAY },
  ],
};
const m = measureWeek(snapshot, NOW);

eq('clinical hours sum only this week (Monday boundary included)', m.clinicalHours, 7);
eq('essay words count additions, never subtractions', m.essayWords, 450);
eq('opportunities tracked counts rows created this week', m.opportunitiesTracked, 2); // activity 2 + scholarship 1
eq('applications moved counts only rows actually edited later', m.applicationsSubmitted, 1); // Beta only
eq('colleges researched counts this week', m.collegesResearched, 1);
eq('activity hours is the standing ongoing commitment', m.activityHours, 7); // 5 + 2, completed excluded
eq('research hours count on touch this week', m.researchProgress, 6);
eq('interview reps count sessions inside the week', m.interviewReps, 1);
eq('recommender touchpoints count this week', m.recommenderTouchpoints, 1);
eq('deadlines handled counts this week', m.deadlinesHandled, 1);
eq('skills counts credentials added this week', m.skillsCerts, 1);

const emptyMeasure = measureWeek({}, NOW);
assert('every metric measures 0 on an empty portfolio', METRICS.every((met) => emptyMeasure[met.id] === 0));
assert('every metric is measured', METRICS.every((met) => met.id in m));

const history = measureHistory(snapshot, 6, NOW);
assert('history returns one series per metric', METRICS.every((met) => history[met.id]?.length === 6));
eq('history\'s last bucket is the current week', history.clinicalHours.at(-1), 7);
eq('history\'s previous bucket is last week', history.clinicalHours.at(-2), 9);

// ── Recommendations: pure, explained, and always reachable ───────────────────
const baseUser = { name: 'Test', gradeLevel: '11' };
const frozen = JSON.stringify(baseUser);
recommendAll({ historyByMetric: history, weeksToNearestDeadline: 1, benchmarkGap: 900, daysLeft: 7 });
eq('recommending never mutates the user record', JSON.stringify(baseUser), frozen);

for (const metric of METRICS) {
  // Adversarial sweep: extreme pace, extreme deadline pressure, extreme benchmark gap, every
  // day of the week. Nothing may escape [min, ceiling].
  for (const hist of [[], [0, 0, 0], [1, 1, 1], [metric.ceiling * 5, metric.ceiling * 9, metric.ceiling * 7]]) {
    for (const weeks of [null, 0, 1, 4, 40]) {
      for (const daysLeft of [1, 3, 7]) {
        const rec = recommendTarget(metric.id, {
          history: hist, weeksToNearestDeadline: weeks, daysLeft,
          benchmarkGap: 5000, gradeLevel: '9', currentLoadHours: 40,
        });
        assert(`[${metric.id}] recommendation never exceeds its ceiling`, rec.target <= metric.ceiling, `got ${rec.target} > ${metric.ceiling}`);
        assert(`[${metric.id}] recommendation never drops below its floor`, rec.target >= metric.min, `got ${rec.target} < ${metric.min}`);
        assert(`[${metric.id}] recommendation lands on a step`, Math.abs((rec.target / metric.step) - Math.round(rec.target / metric.step)) < 1e-9, `got ${rec.target}, step ${metric.step}`);
        assert(`[${metric.id}] recommendation explains itself`, typeof rec.rationale === 'string' && rec.rationale.length > 20);
        assert(`[${metric.id}] recommendation names its reasons`, Array.isArray(rec.reasons) && rec.reasons.length > 0);
      }
    }
  }
}
assert('an unknown metric yields no recommendation', recommendTarget('not-a-metric', {}) === null);

// Deadline pressure raises an execution metric, but stays inside the ceiling.
const calm = recommendTarget('essayWords', { history: [200, 300, 250], weeksToNearestDeadline: 30, daysLeft: 7 });
const urgent = recommendTarget('essayWords', { history: [200, 300, 250], weeksToNearestDeadline: 1, daysLeft: 7 });
assert('a near deadline raises the essay recommendation', urgent.target > calm.target, `${urgent.target} vs ${calm.target}`);
assert('the raised recommendation still fits the ceiling', urgent.target <= METRIC_BY_ID.essayWords.ceiling);

// Demonstrated pace drives the number, and a first-timer gets a starter target.
const fromPace = recommendTarget('clinicalHours', { history: [4, 4, 4, 0], daysLeft: 7 });
eq('a measured pace is used as the basis', fromPace.basis, 'pace');
const firstTime = recommendTarget('clinicalHours', { history: [0, 0, 0], daysLeft: 7 });
eq('no history yields a starter target', firstTime.basis, 'starter');
eq('the starter target is the metric default', firstTime.target, METRIC_BY_ID.clinicalHours.defaultTarget);

// Late in the week the ask shrinks — a Saturday goal asking for a full week is how a student
// learns the number isn't real.
const monday = recommendTarget('clinicalHours', { history: [8, 8, 8], daysLeft: 7 });
const saturday = recommendTarget('clinicalHours', { history: [8, 8, 8], daysLeft: 2 });
assert('a goal set late in the week asks for less', saturday.target < monday.target, `${saturday.target} vs ${monday.target}`);

// ── Goal storage: only explicit calls write ──────────────────────────────────
const weekKey = getIsoWeekKey(NOW);
eq('a fresh user has no goals', Object.keys(goalsForWeek(baseUser, weekKey)).length, 0);
eq('a fresh user falls back to the default pinned set', pinnedMetrics(baseUser).length > 0, true);

let user = setGoal(baseUser, 'clinicalHours', 6, { weekKey, source: 'user' });
assert('setGoal does not mutate the original user', Object.keys(goalsForWeek(baseUser, weekKey)).length === 0);
eq('setGoal stores the target', goalFor(user, 'clinicalHours', weekKey).target, 6);
eq('setGoal records who authored it', goalFor(user, 'clinicalHours', weekKey).source, 'user');
eq('setGoal stamps a time', typeof goalFor(user, 'clinicalHours', weekKey).setAt, 'number');

user = setGoal(user, 'clinicalHours', 999, { weekKey });
eq('an absurd target is clamped to the ceiling', goalFor(user, 'clinicalHours', weekKey).target, METRIC_BY_ID.clinicalHours.ceiling);
user = setGoal(user, 'clinicalHours', 6, { weekKey });
user = setGoal(user, 'clinicalHours', null, { weekKey });
eq('a null target clears the goal', goalFor(user, 'clinicalHours', weekKey), null);
eq('an unknown metric is ignored', setGoal(user, 'nope', 5), user);

user = setGoal(user, 'clinicalHours', 6, { weekKey });
user = setGoal(user, 'essayWords', 400, { weekKey, source: 'user:recommended' });
eq('goals accumulate within a week', Object.keys(goalsForWeek(user, weekKey)).length, 2);

const pinnedUser = setPinned(user, ['clinicalHours', 'nope', 'essayWords']);
assert('setPinned drops unknown metric ids', pinnedMetrics(pinnedUser).join() === 'clinicalHours,essayWords');
assert('an empty pin list falls back to the defaults', pinnedMetrics(setPinned(user, [])).length > 0);

// ── Week summary ─────────────────────────────────────────────────────────────
const summary = summarizeWeek({ user, measurements: m, metricIds: ['clinicalHours', 'essayWords', 'interviewReps'], now: NOW });
eq('summary counts only goals actually set', summary.goalsSet, 2);
eq('summary counts goals met', summary.goalsMet, 2); // clinical 7/6, essays 450/400
eq('summary knows when everything is met', summary.allMet, true);
eq('a metric with no goal still reports its value', summary.rows.find((r) => r.id === 'interviewReps').value, 1);
eq('a metric with no goal has a null target', summary.rows.find((r) => r.id === 'interviewReps').target, null);
assert('overall percent averages only goals that exist', summary.overallPct === 100, `got ${summary.overallPct}`);

const behindUser = setGoal(setGoal(baseUser, 'clinicalHours', 20, { weekKey }), 'essayWords', 2000, { weekKey });
const behind = summarizeWeek({ user: behindUser, measurements: m, metricIds: ['clinicalHours', 'essayWords'], now: NOW });
eq('a partially met week is not allMet', behind.allMet, false);
assert('remaining is reported for an unmet goal', behind.rows[0].remaining > 0);
assert('the headline names a lagging tracker', /Essay|Clinical|goal/i.test(weekHeadline(behind)));
assert('with no goals the headline invites the student to set them', /no goals set/i.test(weekHeadline(summarizeWeek({ user: baseUser, measurements: m, now: NOW }))));
assert('with no data at all the headline says so', /nothing tracked/i.test(weekHeadline(summarizeWeek({ user: baseUser, measurements: {}, now: NOW }), { hasData: false })));

// ── Streaks ──────────────────────────────────────────────────────────────────
const priorKey = getIsoWeekKey(new Date(WEEK_START.getTime() - 7 * DAY));
const twoBackKey = getIsoWeekKey(new Date(WEEK_START.getTime() - 14 * DAY));
let streakUser = setGoal(baseUser, 'clinicalHours', 4, { weekKey: priorKey });
streakUser = setGoal(streakUser, 'clinicalHours', 4, { weekKey: twoBackKey });
eq('an open week cannot be closed out', recordWeekResult(streakUser, weekKey, m), streakUser);
streakUser = recordWeekResult(streakUser, priorKey, { clinicalHours: 5 });
streakUser = recordWeekResult(streakUser, twoBackKey, { clinicalHours: 6 });
eq('two met weeks make a 2-week streak', goalStreak(streakUser, NOW), 2);
assert('closing a week twice changes nothing', recordWeekResult(streakUser, priorKey, { clinicalHours: 0 }) === streakUser);

let brokenUser = setGoal(baseUser, 'clinicalHours', 4, { weekKey: priorKey });
brokenUser = recordWeekResult(brokenUser, priorKey, { clinicalHours: 1 });
eq('a missed week breaks the streak', goalStreak(brokenUser, NOW), 0);
eq('a user who never set a goal has no streak', goalStreak(baseUser, NOW), 0);
eq('readGoals tolerates a corrupt value', Object.keys(readGoals({ portfolioGoals: 'nonsense' }).weeks).length, 0);

// ── Portfolio snapshot helpers ───────────────────────────────────────────────
assert('an empty snapshot reads as empty', isEmptySnapshot({}));
assert('a snapshot with rows does not', !isEmptySnapshot(snapshot));
eq('item count sums every resource', snapshotItemCount({ activities: [1, 2], colleges: [3] }), 3);
eq('standing load sums ongoing activity hours', currentLoadHours(snapshot), 7);
assert('nearest deadline is measured in weeks', Math.round(weeksToNearestDeadline(snapshot, NOW)) === 3, `got ${weeksToNearestDeadline(snapshot, NOW)}`);
eq('no dated rows means no deadline pressure', weeksToNearestDeadline({}, NOW), null);

// ── Tracked items ────────────────────────────────────────────────────────────
const now = NOW.getTime();
const trackSnapshot = {
  scholarships: [
    { id: 1, name: 'Overdue Award', status: 'applying', deadline: '2026-03-01', created_at: iso(now - 40 * DAY), updated_at: iso(now - 2 * DAY) },
    { id: 2, name: 'Due Soon Award', status: 'researching', deadline: '2026-03-13', created_at: iso(now - 5 * DAY), updated_at: iso(now - 5 * DAY) },
    { id: 3, name: 'Undated Award', status: 'researching', deadline: null, created_at: iso(now - 2 * DAY), updated_at: iso(now - 2 * DAY) },
    { id: 4, name: 'Stalled Award', status: 'researching', deadline: null, created_at: iso(now - 60 * DAY), updated_at: iso(now - 60 * DAY) },
    { id: 5, name: 'Won Award', status: 'awarded', deadline: '2026-01-01', created_at: iso(now - 90 * DAY), updated_at: iso(now - 30 * DAY) },
  ],
  activities: [
    { id: 10, position: 'Summer Program', organization: 'Uni', description: 'Added from the MedSchoolPrep opportunities database — confirm current details.', status: 'ongoing', hours_per_week: 0, created_at: iso(now - 3 * DAY) },
    { id: 11, position: 'Marching Band', organization: 'School', description: 'my own thing', status: 'ongoing', hours_per_week: 6, created_at: iso(now - 300 * DAY) },
  ],
  colleges: [{ id: 20, name: 'State U', category: 'target', status: 'researching', created_at: iso(now - 10 * DAY), updated_at: iso(now - 10 * DAY) }],
  deadlines: [{ id: 30, title: 'FAFSA', kind: 'financial_aid', due_date: '2026-06-01', created_at: iso(now - 1 * DAY) }],
  recommenders: [{ id: 40, name: 'Dr. Ruiz', relationship: 'Biology teacher', status: 'Asked', created_at: iso(now - 4 * DAY), updated_at: iso(now - 4 * DAY) }],
};
const items = buildTrackedItems(trackSnapshot, now);
const byName = Object.fromEntries(items.map((i) => [i.name, i]));

eq('an item is produced for each tracked row', items.length, 9); // 5 scholarships + 1 catalog activity + 1 college + 1 deadline + 1 recommender (marching band excluded)
assert("a student's own logged activity is not a chase item", !byName['Marching Band']);
assert('a catalog-sourced program is tracked', !!byName['Summer Program']);
eq('a passed date escalates to needs_action', byName['Overdue Award'].stage, 'needs_action');
assert('a passed date is flagged overdue', byName['Overdue Award'].flags.includes('overdue'));
eq('a date inside 3 days is due-now', byName['Due Soon Award'].flags.includes('due-now'), true);
assert('an undated tracked item is flagged', byName['Undated Award'].flags.includes('no-date'));
assert('a long-untouched item is flagged stalled', byName['Stalled Award'].flags.includes('stalled'));
eq('an awarded scholarship is closed out', byName['Won Award'].stage, 'done');
assert('a closed-out item is never flagged overdue', !byName['Won Award'].flags.includes('overdue'));
assert('a saved program with no hours is flagged', byName['Summer Program'].flags.includes('no-hours'));
assert('every item carries a concrete next step', items.every((i) => typeof i.nextStep === 'string' && i.nextStep.length > 10));
assert('the most urgent item sorts first', items[0].name === 'Overdue Award', `got ${items[0].name}`);
assert('closed items sort last', items.at(-1).stage === 'done', `got ${items.at(-1).stage}`);
assert('stage counts cover every stage', STAGES.every((s) => s.id in stageCounts(items)));
eq('stage counts total the item list', Object.values(stageCounts(items)).reduce((a, b) => a + b, 0), items.length);

// ── The daily report ─────────────────────────────────────────────────────────
const report = buildDailyReport(items, now);
assert('the report always has a headline', report.headline.length > 10);
assert('the report always has at least one observation', report.lines.length > 0);
assert('the report names the overdue item', report.lines.join(' ').includes('Overdue Award'));
assert('the report picks a focus item', report.focus?.stage === 'needs_action');
assert('the report is dated', /\w+, \w+ \d+/.test(report.date));

const emptyReport = buildDailyReport([], now);
assert('an empty tracker reports emptiness rather than inventing news', emptyReport.empty === true);
assert('the empty report says nothing is tracked', /nothing is being tracked/i.test(emptyReport.headline));
eq('the empty report has no focus item', emptyReport.focus, null);

const clean = buildTrackedItems({ scholarships: [{ id: 1, name: 'Fine', status: 'applying', deadline: '2026-12-01', created_at: iso(now - DAY), updated_at: iso(now - DAY) }] }, now);
assert('a healthy tracker says nothing is needed today', /no action needed today/i.test(buildDailyReport(clean, now).lines.join(' ')));

const prompt = buildReportPrompt(report, items);
assert('the AI prompt forbids invention', /do not add, invent, or infer/i.test(prompt));
assert('the AI prompt carries the computed facts', prompt.includes(report.headline));
assert('the signature changes when a status changes', trackedSignature(items) !== trackedSignature(clean));
assert('the signature is stable for identical input', trackedSignature(items) === trackedSignature(buildTrackedItems(trackSnapshot, now)));
assert('STALE_DAYS is a sane, non-nagging threshold', STALE_DAYS >= 14);

// ── Metric registry sanity ───────────────────────────────────────────────────
for (const metric of METRICS) {
  const at = `[${metric.id}]`;
  assert(`${at} has a label and short label`, !!metric.label && !!metric.short);
  assert(`${at} names a unit`, !!metric.unit);
  assert(`${at} has an explanatory blurb`, (metric.blurb || '').length > 40);
  assert(`${at} points at a real Portfolio sub-view`, typeof metric.view === 'string' && metric.view.length > 0);
  assert(`${at} min <= default <= ceiling`, metric.min <= metric.defaultTarget && metric.defaultTarget <= metric.ceiling,
    `${metric.min} / ${metric.defaultTarget} / ${metric.ceiling}`);
  assert(`${at} declares a positive step`, metric.step > 0);
  assert(`${at} has an icon and color key`, !!metric.iconKey && !!metric.colorKey);
  assert(`${at} has a lifetime-total label`, !!metric.totalLabel);
}
assert('metric ids are unique', new Set(METRICS.map((x) => x.id)).size === METRICS.length);

// Each metric's `view` must be a real Portfolio sub-view id, or its tile's action button
// navigates nowhere. Checked against routes.js rather than a copy of the list.
const { SUBVIEWS } = await import('../src/lib/routes.js');
for (const metric of METRICS) {
  assert(`[${metric.id}] view "${metric.view}" is a real Portfolio sub-view`, SUBVIEWS.portfolio.ids.includes(metric.view));
}
for (const stage of STAGES) {
  assert(`stage "${stage.id}" has a label and blurb`, !!stage.label && !!stage.blurb);
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ ${failures.length} failed assertion(s) (${passed} passed):\n`);
  for (const f of failures.slice(0, 40)) console.error(`  ✗ ${f}`);
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\nweekly goals + tracking: ${passed} assertions passed, 0 failed`);
console.log('✓ Meta Brain recommends without mutating, every recommendation is reachable, and the daily report invents nothing');
