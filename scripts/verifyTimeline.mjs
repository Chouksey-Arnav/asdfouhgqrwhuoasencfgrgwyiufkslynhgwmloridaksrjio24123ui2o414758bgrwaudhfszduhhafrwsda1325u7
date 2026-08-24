#!/usr/bin/env node
// Assertions on the Timeline engine (src/lib/timeline.js) — the module that decides which dates
// a given student actually sees. There is no test runner in this repo, so this script is the
// test suite for it.
//
// The properties worth failing a build over, in the order they matter:
//
//   1. GRADE GATING IS ABSOLUTE. A freshman must never be shown financial aid, decision-day,
//      application-submission, or recommender-letter milestones. This is the single rule the
//      feature was asked for and the one a careless catalog edit is most likely to break — a
//      milestone whose `grades` list quietly grows is invisible in review and glaring in the app.
//   2. DATES LAND IN THE RIGHT ACADEMIC YEAR. "Senior year, October 1" has to resolve to the
//      October of that student's senior fall, for every class year, on both sides of the
//      August rollover. An off-by-one-year FAFSA date is worse than no FAFSA date.
//   3. GENERATED DATES ARE LABELLED AS GENERATED. Everything the app invented carries
//      confidence:'typical'; everything the student typed carries 'exact'. The UI and the AI
//      prompt both key off this, so a mislabelled date becomes a confident wrong claim.
//   4. THE CATALOG IS WELL-FORMED. Unique ids, real kinds, parseable month-days, real grades.
//   5. REAL DATA WINS AND STOPS THE NAGGING. Milestones with done() flip once the rows exist,
//      and generic generated deadlines step aside for the student's own dates.
//
//   node scripts/verifyTimeline.mjs
import {
  MILESTONES, TIMELINE_KINDS, KIND_BY_ID, GRADE_KEYS,
  buildTimeline, buildTimelineContext, summarizeTimelineForPrompt,
  academicFallYear, classFallYears, effectiveGradeStage, resolveDate, nthWeekday,
  daysBetween, dayKey, shiftDays, groupUpcoming,
} from '../src/lib/timeline.js';
// The urgency layer is asserted here too rather than in a second script: it is meaningless apart
// from the catalog it orders, and a lead time that disappears from a milestone is a bug in the
// ordering even though the milestone itself still verifies.
import { sortByUrgency, urgencyOf, alertRowsFor } from '../src/lib/milestoneUrgency.js';

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};
const eq = (label, actual, expected) => assert(label, actual === expected, `expected ${expected}, got ${actual}`);

// A fixed clock so every assertion below is deterministic. Mid-October of the
// 2026-27 school year: past the August rollover, deep in application season.
const NOW = new Date(2026, 9, 15, 12, 0, 0); // 2026-10-15, local
const SPRING = new Date(2027, 2, 3, 12, 0, 0); // 2027-03-03 — same school year, other side of Jan 1

const userFor = (gradeStage, extra = {}) => ({
  name: 'Test', gradeStage, gradeStageYear: 2026, ...extra,
});
const EMPTY = {
  activities: [], awards: [], colleges: [], deadlines: [], essays: [], essayVersions: [],
  scholarships: [], research: [], skills: [], clinicalHours: [], recommenders: [],
  gpaEntries: [], interviewSessions: [],
};
const build = (gradeStage, { user = {}, snapshot = {}, now = NOW } = {}) =>
  buildTimeline({ user: userFor(gradeStage, user), snapshot: { ...EMPTY, ...snapshot }, now });

// ─── 1. Date primitives ───────────────────────────────────────────────────────
eq('academicFallYear: October 2026 is the 2026 school year', academicFallYear(NOW), 2026);
eq('academicFallYear: March 2027 is still the 2026 school year', academicFallYear(SPRING), 2026);
eq('academicFallYear: July 2027 is still the 2026 school year', academicFallYear(new Date(2027, 6, 20)), 2026);
eq('academicFallYear: August 2027 rolls over', academicFallYear(new Date(2027, 7, 1)), 2027);

eq('nthWeekday: 1st Saturday of Oct 2026', nthWeekday(2026, 10, 6, 1), '2026-10-03');
eq('nthWeekday: 2nd Saturday of Mar 2027', nthWeekday(2027, 3, 6, 2), '2027-03-13');
eq('nthWeekday: last Saturday of Aug 2026', nthWeekday(2026, 8, 6, -1), '2026-08-29');
eq('daysBetween is inclusive of direction', daysBetween('2026-10-15', '2026-10-18'), 3);
eq('daysBetween across a DST boundary stays whole', daysBetween('2026-10-15', '2026-12-15'), 61);
eq('shiftDays crosses a month', shiftDays('2026-10-15', -28), '2026-09-17');

// ─── 2. Class-year resolution ─────────────────────────────────────────────────
{
  const jr = classFallYears('junior', NOW);
  eq('junior in fall 2026: junior year is 2026', jr.junior, 2026);
  eq('junior in fall 2026: senior year is 2027', jr.senior, 2027);
  eq('junior in fall 2026: graduates 2028', jr.gradYear, 2028);
  const jrSpring = classFallYears('junior', SPRING);
  eq('the same junior in March keeps the same senior fall', jrSpring.senior, 2027);
  eq("freshman's senior year is three years out", classFallYears('freshman', NOW).senior, 2029);
  eq("a gap-year applicant's senior calendar is the current year", classFallYears('gap', NOW).senior, 2026);

  eq('senior-year Oct 1 for a junior resolves to 2027', resolveDate('senior', '10-01', jr), '2027-10-01');
  eq('senior-year Jan 1 for a junior resolves to 2028', resolveDate('senior', '01-01', jr), '2028-01-01');
  eq('senior-year May 1 for a junior resolves to 2028', resolveDate('senior', '05-01', jr), '2028-05-01');
  eq('junior-year Aug 25 resolves to this fall', resolveDate('junior', '08-25', jr), '2026-08-25');
}

// Grade auto-advance: the stored grade is a snapshot, and a stale one shows the wrong year.
{
  const u = { gradeStage: 'sophomore', gradeStageYear: 2024 };
  eq('a sophomore recorded two years ago is now a senior', effectiveGradeStage(u, NOW), 'senior');
  eq('same year = no advance', effectiveGradeStage({ gradeStage: 'junior', gradeStageYear: 2026 }, NOW), 'junior');
  eq('advancing past senior lands on gap, not a fifth year',
    effectiveGradeStage({ gradeStage: 'senior', gradeStageYear: 2020 }, NOW), 'gap');
  eq('no recorded year means trust the stored grade',
    effectiveGradeStage({ gradeStage: 'freshman' }, NOW), 'freshman');
  eq('onboardingCompletedAt is the fallback anchor',
    effectiveGradeStage({ gradeStage: 'freshman', onboardingCompletedAt: new Date(2025, 8, 1).getTime() }, NOW), 'sophomore');
  eq('an unknown grade yields no timeline grade', effectiveGradeStage({ gradeStage: 'nonsense' }, NOW), null);
}

// ─── 3. Catalog well-formedness ───────────────────────────────────────────────
{
  const ids = new Set();
  let dupes = 0, badKind = 0, badGrade = 0, badMonthDay = 0, noDetail = 0, badAction = 0;
  const KIND_IDS = new Set(TIMELINE_KINDS.map(k => k.id));
  const TABS = new Set(['home', 'sat', 'prep', 'portfolio', 'plans', 'progress', 'settings']);
  MILESTONES.forEach(m => {
    if (ids.has(m.id)) dupes += 1;
    ids.add(m.id);
    if (!KIND_IDS.has(m.kind)) badKind += 1;
    if (!m.grades?.length || m.grades.some(g => !GRADE_KEYS.includes(g))) badGrade += 1;
    if (!/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(m.monthDay)) badMonthDay += 1;
    if (!m.detail || m.detail.length < 40) noDetail += 1;
    if (m.action && !TABS.has(m.action.tab)) badAction += 1;
  });
  eq('every milestone id is unique', dupes, 0);
  eq('every milestone kind exists in TIMELINE_KINDS', badKind, 0);
  eq('every milestone targets real grades', badGrade, 0);
  eq('every monthDay is a real MM-DD', badMonthDay, 0);
  eq('every milestone explains itself', noDetail, 0);
  eq('every action points at a real tab', badAction, 0);
  assert('the catalog is actually substantial', MILESTONES.length >= 45, `only ${MILESTONES.length} milestones`);
  eq('every kind carries UI metadata', TIMELINE_KINDS.every(k => k.label && k.colorKey && k.blurb), true);
  eq('KIND_BY_ID covers every kind', Object.keys(KIND_BY_ID).length, TIMELINE_KINDS.length);
}

// ─── 4. THE FRESHMAN GATE ─────────────────────────────────────────────────────
// The rule the whole feature turns on: nothing about aid, decisions, applications, or letters
// belongs on a ninth-grader's calendar.
{
  const t = build('freshman');
  const kinds = new Set(t.events.map(e => e.kind));
  assert('freshman sees no financial-aid milestones', !kinds.has('aid'),
    [...t.events.filter(e => e.kind === 'aid').map(e => e.title)].join(', '));
  assert('freshman sees no decision/commit milestones', !kinds.has('decision'),
    [...t.events.filter(e => e.kind === 'decision').map(e => e.title)].join(', '));
  assert('freshman sees no application-submission milestones', !kinds.has('application'),
    [...t.events.filter(e => e.kind === 'application').map(e => e.title)].join(', '));
  assert('freshman sees no recommender milestones', !kinds.has('recommenders'),
    [...t.events.filter(e => e.kind === 'recommenders').map(e => e.title)].join(', '));
  assert('freshman still gets a real timeline', t.upcoming.length >= 4, `${t.upcoming.length} upcoming`);
  const horizon = Math.max(...t.events.map(e => daysBetween(t.ctx.today, e.date)));
  assert('freshman horizon stays inside about a year', horizon <= 400, `${horizon} days out`);
  assert('nothing on a freshman timeline mentions FAFSA or Decision Day',
    !t.events.some(e => /fafsa|css profile|decision day|deposit/i.test(e.title)));
}

// A sophomore is the next gate: still no aid, no applications, no letters.
{
  const t = build('sophomore');
  const kinds = new Set(t.events.map(e => e.kind));
  assert('sophomore sees no aid milestones', !kinds.has('aid'));
  assert('sophomore sees no application milestones', !kinds.has('application'));
  assert('sophomore sees no decision milestones', !kinds.has('decision'));
}

// ─── 5. Juniors and seniors get the heavy calendar ────────────────────────────
{
  const jr = build('junior');
  const kinds = new Set(jr.events.map(e => e.kind));
  assert('junior gets recommender milestones (ask in the spring)', kinds.has('recommenders'));
  assert('junior gets planning/college-list milestones', kinds.has('planning'));
  assert('junior gets essay drafting in the summer', kinds.has('essays'));
  assert('junior still gets no FAFSA', !jr.events.some(e => /FAFSA/i.test(e.title)),
    jr.events.filter(e => /FAFSA/i.test(e.title)).map(e => e.date).join(','));
  const commonApp = jr.events.find(e => e.id === 'jr_lookahead_commonapp');
  assert('junior gets exactly one senior-year look-ahead', !!commonApp);
  eq('...and it lands on the August after junior year', commonApp?.date, '2027-08-01');
  // Was >= 12. Removing the SAT/ACT calendar (see section 8) took two junior
  // milestones with it — the fall registration window and the PSAT — so the
  // honest floor is ten. Anything below that means real content went missing.
  assert('junior timeline is genuinely dense', jr.upcoming.length >= 10, `${jr.upcoming.length} upcoming`);

  const sr = build('senior');
  const srKinds = new Set(sr.events.map(e => e.kind));
  ['application', 'aid', 'essays', 'recommenders', 'decision'].forEach(k =>
    assert(`senior gets ${k} milestones`, srKinds.has(k)));
  const fafsa = sr.events.find(e => e.id === 'sr_fafsa');
  eq('senior FAFSA lands Oct 1 of senior fall', fafsa?.date, '2026-10-01');
  eq('senior Decision Day lands May 1 of senior spring',
    sr.events.find(e => e.id === 'sr_decision_day')?.date, '2027-05-01');
  eq('senior RD deadline lands Jan 1 after senior fall',
    sr.events.find(e => e.id === 'sr_rd')?.date, '2027-01-01');
  assert('senior timeline is dense', sr.upcoming.length >= 12, `${sr.upcoming.length} upcoming`);

  // A gap-year applicant runs the senior calendar against the CURRENT year.
  const gap = build('gap');
  eq('gap-year FAFSA is this October, not next', gap.events.find(e => e.id === 'sr_fafsa')?.date, '2026-10-01');
}

// ─── 6. Generated vs. real dates ──────────────────────────────────────────────
{
  const t = build('senior', {
    snapshot: {
      deadlines: [{ id: 'd1', title: 'Michigan — supplement', due_date: '2026-11-01', kind: 'early_action' }],
      colleges: [{ id: 'c1', name: 'Duke University', category: 'reach', status: 'application_started', ea_ed_deadline: '2026-11-02', rd_deadline: '2027-01-03' }],
    },
  });
  const mine = t.events.filter(e => e.source === 'profile');
  assert('every student-entered date is labelled exact', mine.every(e => e.confidence === 'exact'),
    mine.filter(e => e.confidence !== 'exact').map(e => e.title).join(', '));
  const generated = t.events.filter(e => e.source === 'catalog');
  assert('every generated date is labelled typical', generated.every(e => e.confidence === 'typical'));
  assert("the generic EA/ED placeholder steps aside once a college has its own date",
    !t.events.some(e => e.id === 'sr_ea_ed'));
  assert('the generic RD placeholder steps aside too', !t.events.some(e => e.id === 'sr_rd'));
  assert("the college's own dates are on the timeline",
    t.events.some(e => e.date === '2026-11-02' && /Duke/.test(e.title)));

  // ...and with an empty college list the placeholders are exactly what saves the student.
  const bare = build('senior');
  assert('with no college dates entered, the typical EA/ED date is shown',
    bare.events.some(e => e.id === 'sr_ea_ed' && e.confidence === 'typical'));

  // ── ownerRef: which rows the Milestones tab is allowed to edit in place ────
  // The merged Milestones tab renders a delete control on exactly the events
  // that are backed by a real `deadlines` row, and links everything else to the
  // panel that owns it. If ownerRef ever leaked onto a derived event, the UI
  // would offer to delete something it cannot delete; if it vanished from the
  // deadline events, the tab would silently become read-only again and the
  // merge would be undone. Both directions are asserted here.
  const owned = t.events.filter(e => e.ownerRef);
  eq('exactly the student\'s own deadline rows carry ownerRef', owned.length, 1);
  eq('...and it names the resource and row id', owned[0]?.ownerRef?.resource, 'deadlines');
  eq('...with the real row id, not the event id', owned[0]?.ownerRef?.id, 'd1');
  assert('an editable row never also carries a navigate-away action',
    owned.every(e => !e.action));
  assert('nothing derived from another panel is marked editable',
    t.events.filter(e => e.source !== 'profile').every(e => !e.ownerRef));
  assert('college-list and scholarship dates stay owned by their own panels',
    t.events.filter(e => /Duke/.test(e.title)).every(e => !e.ownerRef && e.action?.view === 'colleges'));
}

// FAFSA/AP placeholders defer to a deadline row the student already keeps.
{
  const t = build('senior', { snapshot: { deadlines: [{ id: 'f', title: 'FAFSA Opens', due_date: '2026-10-01', kind: 'fafsa' }] } });
  assert('generated FAFSA defers to a tracked FAFSA row', !t.events.some(e => e.id === 'sr_fafsa'));
  const ap = build('junior', { user: { apIb: true }, snapshot: { deadlines: [{ id: 'a', title: 'AP Exams', due_date: '2027-05-04', kind: 'ap_exam' }] } });
  assert('generated AP window defers to a tracked AP row', !ap.events.some(e => e.id === 'ap_exams'));
  assert('AP registration still shows for an AP student', ap.events.some(e => e.id === 'ap_registration'));
  const noAp = build('junior');
  assert('a non-AP student gets no AP milestones at all', !noAp.events.some(e => e.id.startsWith('ap_')));
}

// ─── 7. Real rows satisfy milestones instead of nagging ───────────────────────
{
  const nagging = build('junior');
  const askRecs = nagging.events.find(e => e.id === 'jr_ask_recs');
  eq('with no recommenders, the ask is still open', askRecs?.status !== 'done', true);

  const handled = build('junior', {
    snapshot: {
      recommenders: [{ id: 1, name: 'Ms. A', status: 'Confirmed' }, { id: 2, name: 'Mr. B', status: 'Asked' }],
      colleges: Array.from({ length: 9 }, (_, i) => ({ id: i, name: `School ${i}`, category: i < 3 ? 'reach' : i < 6 ? 'target' : 'safety' })),
      essays: [{ id: 1, title: 'PS', status: 'draft' }],
    },
  });
  eq('two recommenders marks the ask done', handled.events.find(e => e.id === 'jr_ask_recs')?.status, 'done');
  eq('...and says so with a real count', handled.events.find(e => e.id === 'jr_ask_recs')?.doneLabel, '2 tracked');
  eq('nine colleges marks the list-building milestone done',
    handled.events.find(e => e.id === 'jr_build_list')?.status, 'done');
  eq('a balanced list marks the balance check done',
    handled.events.find(e => e.id === 'jr_list_balance')?.status, 'done');
  assert('done milestones are pulled out of the upcoming feed',
    !handled.upcoming.some(e => e.status === 'done'));
  assert('...and counted in their own bucket', handled.done.length >= 3, `${handled.done.length} done`);
  assert('the why line references the student\'s real numbers',
    /9 school/.test(handled.events.find(e => e.id === 'jr_build_list')?.why || ''),
    handled.events.find(e => e.id === 'jr_build_list')?.why);
}

// ─── 8. No standardized-test calendar at all ──────────────────────────────────
// The SAT pillar is sealed for v1 (src/lib/betaFlags.js), so the timeline no
// longer generates SAT/ACT sittings, registration cutoffs, score-release dates
// or PSAT milestones, and no longer reads a student's exam date. A dated
// milestone whose only action is "open the SAT tab" would land on a locked
// screen; these assertions are what stop one creeping back in.
{
  for (const stage of ['freshman', 'sophomore', 'junior', 'senior', 'gap']) {
    const t = build(stage, { user: { examDate: '2027-03-13', testTrack: 'SAT' } });
    assert(`${stage}: no 'testing' milestones`, !t.events.some(e => e.kind === 'testing'),
      t.events.filter(e => e.kind === 'testing').map(e => e.title).join(', '));
    assert(`${stage}: nothing mentions the SAT, the ACT or the PSAT`,
      !t.events.some(e => /\bP?SAT\b|\bACT\b/.test(`${e.title} ${e.detail || ''}`)),
      t.events.filter(e => /\bP?SAT\b|\bACT\b/.test(`${e.title} ${e.detail || ''}`)).map(e => e.title).join(', '));
    assert(`${stage}: nothing sends the student to the sealed SAT tab`,
      !t.events.some(e => e.action?.tab === 'sat'),
      t.events.filter(e => e.action?.tab === 'sat').map(e => e.title).join(', '));
    assert(`${stage}: a stored exam date no longer generates milestones`,
      !t.events.some(e => ['exam_day', 'exam_reg', 'exam_scores'].includes(e.id)));
  }
}

// ─── 9. Personalization from the college list ─────────────────────────────────
{
  const uc = build('senior', { snapshot: { colleges: [{ id: 1, name: 'University of California, Berkeley', category: 'reach' }] } });
  assert('a UC on the list adds the UC-only November 30 deadline',
    uc.events.some(e => e.id === 'sr_uc' && e.date === '2026-11-30'));
  const noUc = build('senior', { snapshot: { colleges: [{ id: 1, name: 'Emory University' }] } });
  assert('no UC on the list means no UC deadline', !noUc.events.some(e => e.id === 'sr_uc'));

  const cpr = build('freshman', { user: { healthExperience: ['cpr'] } });
  assert('a CPR-certified student is not told to get CPR certified', !cpr.events.some(e => e.id === 'fr_summer_cpr'));
  const noCpr = build('freshman');
  assert('a student without it is', noCpr.events.some(e => e.id === 'fr_summer_cpr'));
}

// ─── 10. Classification, ordering, grouping ───────────────────────────────────
{
  const t = build('senior', {
    snapshot: {
      deadlines: [
        { id: 'past', title: 'Slipped', due_date: '2026-10-01', kind: 'early_action' },
        { id: 'today', title: 'Due today', due_date: '2026-10-15', kind: 'custom' },
        { id: 'soon', title: 'Due soon', due_date: '2026-10-20', kind: 'custom' },
        { id: 'far', title: 'Far off', due_date: '2027-04-01', kind: 'custom' },
        { id: 'ancient', title: 'Long gone', due_date: '2026-01-05', kind: 'custom' },
      ],
    },
  });
  const byTitle = Object.fromEntries(t.events.map(e => [e.title, e]));
  eq('a past-dated critical deadline reads as missed', byTitle['Slipped'].status, 'missed');
  eq("today's deadline reads as today", byTitle['Due today'].status, 'today');
  eq('five days out reads as soon', byTitle['Due soon'].status, 'soon');
  eq('six months out reads as upcoming', byTitle['Far off'].status, 'upcoming');
  assert('a deadline nine months gone drops out of the actionable feed',
    !t.upcoming.some(e => e.title === 'Long gone'));
  assert('...and is kept in the past record', t.past.some(e => e.title === 'Long gone'));

  const dates = t.events.map(e => e.date);
  assert('events come out in date order', dates.every((d, i) => i === 0 || dates[i - 1] <= d));

  const groups = t.groups;
  eq('slipped items lead the grouping', groups[0].key, 'missed');
  assert('there is a this-week group', groups.some(g => g.key === 'now'));
  assert('there is a next-30-days group', groups.some(g => g.key === 'month'));
  assert('later items are bucketed by calendar month', groups.some(g => /^\d{4}-\d{2}$/.test(g.key)));
  assert('every event in the feed lands in exactly one group',
    groups.reduce((n, g) => n + g.items.length, 0) === t.upcoming.length,
    `${groups.reduce((n, g) => n + g.items.length, 0)} grouped vs ${t.upcoming.length} upcoming`);
  assert('grouping an empty feed yields no groups', groupUpcoming([], dayKey(NOW)).length === 0);

  eq('stats count what the app generated vs what the student owns',
    t.stats.generated + t.stats.fromYourData, t.stats.total);
  assert('next points at something actionable', !!t.next && t.next.days >= 0);
}

// ─── 11. Clinical hours roll up by month instead of flooding the feed ─────────
{
  const clinicalHours = Array.from({ length: 12 }, (_, i) => ({
    id: i, entry_date: i < 6 ? `2026-09-0${i + 1}` : `2026-08-1${i - 6}`, hours: 3, site_name: i % 2 ? 'St. Mary' : 'Clinic',
  }));
  const t = build('senior', { snapshot: { clinicalHours } });
  const logged = t.events.filter(e => e.kind === 'logged' && /clinical/.test(e.title));
  assert('logged work never appears in the forward-looking feed',
    !t.upcoming.some(e => e.kind === 'logged'));
  assert('...even when a row carries a future date',
    !build('senior', { snapshot: { clinicalHours: [{ id: 'x', entry_date: '2026-12-01', hours: 5, site_name: 'Clinic' }] } })
      .upcoming.some(e => e.kind === 'logged'));
  eq('twelve shifts across two months become two entries', logged.length, 2);
  assert('the roll-up totals the hours', logged.some(e => /18 clinical hours/.test(e.title)),
    logged.map(e => e.title).join(' | '));
}

// ─── 12. Certification expiry is surfaced ─────────────────────────────────────
{
  const t = build('junior', { snapshot: { skills: [{ id: 1, name: 'CPR/BLS', earned_date: '2025-06-01', expiry_date: '2027-06-01', issuing_body: 'Red Cross' }] } });
  const exp = t.events.find(e => e.id.startsWith('skill_exp_'));
  assert('an expiring certification lands on the timeline', !!exp);
  eq('...on its real expiry date', exp?.date, '2027-06-01');
  eq('...marked exact', exp?.confidence, 'exact');
}

// ─── 13. Missing/partial profiles degrade instead of exploding ────────────────
{
  const none = buildTimeline({ user: null, snapshot: {}, now: NOW });
  eq('no user yields no grade', none.gradeStage, null);
  eq('...and no crash', Array.isArray(none.events), true);
  eq('...and an empty feed rather than a wrong one', none.upcoming.length, 0);

  const noGrade = buildTimeline({ user: { name: 'X' }, snapshot: { ...EMPTY }, now: NOW });
  eq('a user with no grade still gets a safe empty timeline', noGrade.events.length, 0);

  const junk = buildTimeline({
    user: userFor('senior'),
    snapshot: { ...EMPTY, deadlines: [{ id: 1, title: 'No date' }], colleges: [{ id: 2 }], recommenders: [{ id: 3, name: 'X' }] },
    now: NOW,
  });
  assert('rows without dates are dropped, not rendered as Invalid Date',
    junk.events.every(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date)),
    junk.events.filter(e => !/^\d{4}-\d{2}-\d{2}$/.test(e.date)).map(e => `${e.title}=${e.date}`).join(', '));
  assert('every event carries the fields the UI reads',
    junk.events.every(e => e.id && e.title && e.kind && KIND_BY_ID[e.kind] && e.status && Number.isFinite(e.days)));
}

// ─── 14. Determinism ──────────────────────────────────────────────────────────
{
  const snapshot = { ...EMPTY, colleges: [{ id: 1, name: 'Duke', ea_ed_deadline: '2026-11-01' }] };
  const a = build('senior', { snapshot });
  const b = build('senior', { snapshot });
  eq('the same input produces the same feed twice',
    JSON.stringify(a.events.map(e => [e.id, e.date, e.status])),
    JSON.stringify(b.events.map(e => [e.id, e.date, e.status])));
  const user = userFor('senior');
  const frozen = JSON.stringify(user);
  buildTimelineContext({ user, snapshot, now: NOW });
  build('senior', { snapshot });
  eq('building a timeline never mutates the user record', JSON.stringify(user), frozen);
  eq('...or the snapshot', snapshot.colleges.length, 1);
}

// ─── 15. The AI summary ───────────────────────────────────────────────────────
{
  const sr = build('senior');
  const summary = summarizeTimelineForPrompt(sr);
  assert('a senior timeline produces a prompt block', !!summary && summary.length > 200);
  assert('the summary distinguishes generated dates from the student\'s own',
    /typical date/.test(summary) && /their own date/.test(summary));
  assert('the summary names the class year', /Senior/.test(summary));
  assert('the summary forbids inventing milestones', /[Nn]ever invent/.test(summary));

  const fr = build('freshman');
  const frSummary = summarizeTimelineForPrompt(fr);
  assert('a freshman summary exists too', !!frSummary);
  assert('...and tells the coach not to push aid/decision advice at them',
    /financial aid forms or decision deadlines/.test(frSummary), frSummary);
  assert('...and contains no aid or decision dates', !/FAFSA|Decision Day/i.test(frSummary));

  eq('an empty timeline produces no prompt block', summarizeTimelineForPrompt({ upcoming: [] }), null);
  eq('a null timeline produces no prompt block', summarizeTimelineForPrompt(null), null);
}

// ─── 16. Every grade produces a usable timeline, in both semesters ────────────
{
  ['freshman', 'sophomore', 'junior', 'senior', 'gap'].forEach(g => {
    [NOW, SPRING].forEach((clock, i) => {
      const t = build(g, { now: clock });
      const season = i === 0 ? 'fall' : 'spring';
      assert(`${g} (${season}) gets at least three upcoming milestones`, t.upcoming.length >= 3,
        `${t.upcoming.length} upcoming`);
      assert(`${g} (${season}) has a next milestone`, !!t.next);
      assert(`${g} (${season}) never shows a date before today in the upcoming feed except misses`,
        t.upcoming.every(e => e.days >= 0 || e.status === 'missed'));
      assert(`${g} (${season}) every event carries a why line`, t.events.every(e => e.source !== 'catalog' || !!e.why));
    });
  });
}

// ─── 17. The health-pathway block ─────────────────────────────────────────────
//
// The dates a health-track student misses entirely, and the reason they miss them: every one is
// applied for in a season that has nothing to do with the season it happens in. These assertions
// exist because the failure mode is silent — a milestone quietly dropped from the catalog, or
// gated to the wrong grade, looks like nothing in review and costs a student a year in the app.
{
  const idsFor = (g, clock = NOW) => new Set(build(g, { now: clock }).events.map(e => e.id));
  const anyYear = (id) => GRADE_KEYS.some(g => [NOW, SPRING].some(c => idsFor(g, c).has(id)));

  const HEALTH_IDS = [
    'hp_summer_window', 'hp_summer_window_close', 'hp_cert_fall_enrollment', 'hp_cert_spring_enrollment',
    'hp_hosa_join', 'hp_hosa_regionals', 'hp_hosa_state', 'hp_hosa_ilc',
    'hp_sts', 'hp_isef_find_fair', 'hp_isef_season_end',
    'hp_combined_supplements', 'hp_combined_lookahead', 'hp_combined_requirements',
  ];
  HEALTH_IDS.forEach(id => {
    assert(`the catalog still contains ${id}`, MILESTONES.some(m => m.id === id));
  });

  // Summer programs: December-to-February, for the FOLLOWING summer, at every grade.
  ['freshman', 'sophomore', 'junior', 'senior'].forEach(g => {
    assert(`${g} is told summer programs open in December`, idsFor(g).has('hp_summer_window'));
    assert(`${g} is told the summer window closes in February`, idsFor(g).has('hp_summer_window_close'));
  });
  const summerOpen = MILESTONES.find(m => m.id === 'hp_summer_window');
  eq('the summer-program opening sits in December', summerOpen.monthDay.slice(0, 2), '12');
  eq('the summer-program closing sits in February',
    MILESTONES.find(m => m.id === 'hp_summer_window_close').monthDay.slice(0, 2), '02');

  // Certification enrollment windows, HOSA, and the science competitions.
  assert('certification enrollment is offered to a freshman', idsFor('freshman').has('hp_cert_fall_enrollment'));
  assert('HOSA membership closes in the autumn', MILESTONES.find(m => m.id === 'hp_hosa_join').monthDay.slice(0, 2) === '09');
  assert('the HOSA ILC is in June', MILESTONES.find(m => m.id === 'hp_hosa_ilc').monthDay.slice(0, 2) === '06');
  assert('HOSA qualifying reaches every class year', GRADE_KEYS.filter(g => g !== 'gap').every(g => idsFor(g).has('hp_hosa_regionals')));

  const sts = MILESTONES.find(m => m.id === 'hp_sts');
  eq('Regeneron STS is an early-November date', sts.monthDay.slice(0, 2), '11');
  assert('Regeneron STS is seniors only', sts.grades.every(g => g === 'senior' || g === 'gap'));
  const isefEnd = MILESTONES.find(m => m.id === 'hp_isef_season_end');
  eq('ISEF regional qualifying concludes by mid-April', isefEnd.monthDay, '04-15');
  assert('the ISEF entry milestone comes months before the fair season ends',
    MILESTONES.find(m => m.id === 'hp_isef_find_fair').monthDay < '04-15' === false
    || MILESTONES.find(m => m.id === 'hp_isef_find_fair').monthDay.slice(0, 2) === '11');

  // Grade gating still holds for the new block: nothing here may leak a senior date to a freshman.
  const frIds = idsFor('freshman');
  assert('a freshman never sees the combined-degree supplemental deadline', !frIds.has('hp_combined_supplements'));
  assert('a freshman never sees the Regeneron STS entry', !frIds.has('hp_sts'));
  assert('a freshman IS told combined-degree requirements start now', frIds.has('hp_combined_requirements'));
  assert('a senior is not told combined-degree requirements "start now"',
    !idsFor('senior').has('hp_combined_requirements'));

  // The combined-degree supplement only appears for a student who tracks one.
  const withProgram = buildTimeline({
    user: { gradeStage: 'senior', gradeStageYear: academicFallYear(NOW) }, now: NOW,
    snapshot: { deadlines: [{ id: 'd1', title: 'Drexel — application due', due_date: '2027-11-01', kind: 'early_action', source_ref: 'combined:drexel-bams-md' }] },
  });
  assert('tracking a combined-degree program surfaces its supplemental milestone',
    withProgram.events.some(e => e.id === 'hp_combined_supplements'));
  assert('a senior tracking no combined-degree program is not shown it',
    !idsFor('senior').has('hp_combined_supplements'));

  // Lead times are what the urgency sort reads; a health milestone without one is filed as an
  // ordinary two-week task and buried behind every form due sooner.
  HEALTH_IDS.forEach(id => {
    const m = MILESTONES.find(x => x.id === id);
    assert(`${id} declares how long its work takes`, Number.isFinite(m.leadDays) && m.leadDays > 0, String(m.leadDays));
  });
  assert('the catalog\'s lead times survive into the built events',
    build('senior').events.filter(e => e.id.startsWith('hp_')).every(e => e.leadDays > 0));
}

// ─── 18. Urgency is slack, not date order ─────────────────────────────────────
{
  const near = { id: 'a', title: 'Form due', kind: 'planning', days: 30, weight: 2, date: '2026-11-14', leadDays: 3 };
  const far = { id: 'b', title: 'Summer research application', kind: 'experience', days: 90, weight: 3, date: '2027-01-13', leadDays: 60 };
  const ordered = sortByUrgency([near, far]);
  eq('a 90-day deadline with a 60-day run-up outranks a 30-day one that takes an afternoon',
    ordered[0].id, 'b');
  eq('...and the afternoon task still comes second, not last-forever', ordered[1].id, 'a');

  eq('slack is days minus lead time', urgencyOf(far).slack, 30);
  eq('a date already inside its run-up says start now', urgencyOf({ ...far, days: 55 }).band.id, 'start_now');
  eq('an overdue date outranks everything', urgencyOf({ ...far, days: -2 }).band.id, 'overdue');
  assert('a long-lead item explains itself in words', /run-up|takes/.test(urgencyOf(far).reason || ''));
  eq('a same-week task needs no lead-time explanation', urgencyOf(near).reason, null);

  // A kind with no declared lead still gets a sensible default rather than zero.
  assert('an undeclared lead falls back to the category default',
    urgencyOf({ kind: 'recommenders', days: 20 }).lead === 45);

  // The 60/30/7 ladder.
  const rows = alertRowsFor({ title: 'Stanford SIMR — application due', due_date: '2027-02-15', kind: 'opportunity', source_ref: 'opportunity:stanford-simr' },
    { today: new Date(2026, 9, 15) });
  eq('a distant deadline gets all three alerts', rows.length, 3);
  assert('every alert points back at its parent', rows.every(r => r.source_ref === 'alert:opportunity:stanford-simr:60'
    || r.source_ref === 'alert:opportunity:stanford-simr:30' || r.source_ref === 'alert:opportunity:stanford-simr:7'));
  assert('alerts land before the deadline', rows.every(r => r.due_date < '2027-02-15'));
  eq('a deadline inside a week gets no alerts at all',
    alertRowsFor({ title: 'x', due_date: '2026-10-18', kind: 'custom' }, { today: new Date(2026, 9, 15) }).length, 0);
  eq('an alert dated in the past is never created',
    alertRowsFor({ title: 'x', due_date: '2026-11-01', kind: 'custom' }, { today: new Date(2026, 9, 15) }).length, 1);
}

// ─── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ Timeline verification FAILED — ${failures.length} problem(s), ${passed} passed:\n`);
  failures.forEach(f => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`✓ Timeline verification passed — ${passed} assertions.`);
console.log(`  ${MILESTONES.length} catalog milestones across ${TIMELINE_KINDS.length} categories.`);
['freshman', 'sophomore', 'junior', 'senior', 'gap'].forEach(g => {
  const t = build(g);
  console.log(`  ${g.padEnd(10)} → ${String(t.upcoming.length).padStart(2)} upcoming, ${t.stats.generated} generated, kinds: ${Object.keys(t.stats.byKind).join(', ')}`);
});
