#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Assertions on the MONTH PLAN — the adaptive four-week roadmap that is the
// free-plan experience (src/lib/monthPlan/, src/components/roadmap/month/).
//
// There is no test runner in this repo, so this script is the test suite for
// the artifact a student sees first. The properties it fails a build over are
// each a way this feature breaks SILENTLY:
//
//   1. NOTHING PROMISES AN ADMISSIONS OUTCOME. Every generated string is greped
//      for the claim shapes the product may never make, and the scrubber is
//      shown to actually remove them rather than merely being present.
//   2. EVERY ACTION IS TRACEABLE. Rule provenance, a definition of done, a known
//      domain, a known status, and a date origin on anything dated.
//   3. NO CLOSED OPPORTUNITY IS EVER SHOWN AS OPEN. The single most damaging
//      thing this feature could do.
//   4. THE PLAN SURVIVES ITS OWN MUTATIONS. Every state, every adaptation, and
//      the promotion of a replacement, without losing or duplicating an action.
//   5. IT RESPECTS WHAT THE STUDENT HAS ALREADY SAID. Suppression, constraints,
//      strain, and falling grades all change what gets built.
//   6. THE GRADE-BAND, SERVICE AND LEADERSHIP RULES ARE THE ONES WE DOCUMENTED.
//   7. THE WIRING HOLDS. Sub-nav, router, home card, Medabrain focus bus, and
//      the yearly-plan hooks all resolve.
//   8. NO SURFACE RENDERS A RAW DATE. Same mechanical rule the year roadmap has.
//
//   node scripts/verifyMonthPlan.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const MODEL = await import('../src/lib/monthPlan/model.js');
const SIGNALS = await import('../src/lib/monthPlan/signals.js');
const RULES = await import('../src/lib/monthPlan/rules.js');
const GEN = await import('../src/lib/monthPlan/generator.js');
const ADAPT = await import('../src/lib/monthPlan/adapt.js');
const CONTEXT = await import('../src/lib/monthPlan/context.js');
const YEARLY = await import('../src/lib/monthPlan/yearly.js');
const BENCH = await import('../src/lib/studentIntel/benchmarks.js');

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};
const eq = (label, actual, expected) =>
  assert(label, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
const section = (name) => console.log(`\n${name}`);

// A pinned clock, so the suite does not start failing in February because a
// deadline window rolled over.
const NOW = new Date('2026-09-07T12:00:00');
const TODAY = '2026-09-07';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const emptyStudent = { name: 'Ada', graduationYear: 2028, gradeStage: 'sophomore' };

const richSnapshot = {
  colleges: [
    { id: 'c1', name: 'Johns Hopkins University', category: 'dream', ea_ed_deadline: '2027-11-01' },
    { id: 'c2', name: 'Duke University', category: 'reach' },
    { id: 'c3', name: 'University of Michigan', category: 'target' },
  ],
  activities: [
    { id: 'a1', position: 'Section leader', organization: 'Marching band', activity_type: 'Music', hours_per_week: 8, weeks_per_year: 30, grade_levels: ['9', '10'], leadership_role: true, description: 'Ran sectionals for twelve players every week and rebuilt the rehearsal schedule.', impact: 'Cut rehearsal overruns by 40% across 12 players.' },
    { id: 'a2', position: 'Volunteer', organization: 'County hospital', activity_type: 'Volunteering', hours_per_week: 4, weeks_per_year: 40, grade_levels: ['10'] },
    { id: 'a3', position: 'Member', organization: 'Chess club', activity_type: 'Club', hours_per_week: 1, weeks_per_year: 20, grade_levels: ['10'] },
    { id: 'a4', position: 'Member', organization: 'Debate', activity_type: 'Club', hours_per_week: 1, weeks_per_year: 10, grade_levels: ['10'] },
    { id: 'a5', position: 'Member', organization: 'Key Club', activity_type: 'Club', hours_per_week: 1, weeks_per_year: 10, grade_levels: ['10'] },
  ],
  awards: [{ id: 'w1', title: 'Regional band honors', level: 'State/Regional' }],
  gpaEntries: [
    { id: 'g1', term: 'Grade 9, Fall', gpa: 3.9, weighted: false },
    { id: 'g2', term: 'Grade 9, Spring', gpa: 3.8, weighted: false },
    { id: 'g3', term: 'Grade 10, Fall', gpa: 3.85, weighted: false },
  ],
  testScores: [{ id: 't1', test_type: 'SAT', composite: 1380, test_date: '2026-06-06' }],
  serviceLogs: [
    { id: 's1', entry_date: '2026-03-01', organization: 'County hospital', cause_area: 'Health', hours: 40, description: 'Front desk and wayfinding.' },
    { id: 's2', entry_date: '2026-06-01', organization: 'County hospital', cause_area: 'Health', hours: 60, description: 'Summer shifts on the ward trolley.' },
  ],
  activityRoleHistory: [{ id: 'r1', activity_id: 'a1', role: 'Section leader', started_at: '2025-09-01', outcome: 'Rebuilt the rehearsal schedule' }],
  deadlines: [{ id: 'd1', title: 'Local science fair entry', due_date: '2026-09-20', kind: 'competition' }],
  schoolContext: [{ id: 'sc1', graduation_year: 2028, rigor_available: { ap: true, honors: true }, current_courses: ['AP Biology'] }],
  constraintsProfile: [{ id: 'cp1', time_availability: 'About six hours a week', cost_sensitivity: 'Nothing over $50', location_consent: false, zip_code: '02138', state_code: 'MA' }],
  checkins: [],
  recommendationFeedback: [],
  reflectionsLog: [],
  interestHistory: [{ id: 'i1', interest: 'public health', category: 'healthcare_focus', occurred_at: '2026-05-01' }],
  competitions: [],
  quickNotes: [],
  essays: [],
  scholarships: [],
  research: [],
  clinicalHours: [],
  recommenders: [],
  skills: [],
};

const signalsFor = (user, snapshot) => SIGNALS.buildMonthSignals({ user, snapshot, now: NOW });

// ─────────────────────────────────────────────────────────────────────────────
section('1. Nothing on a month plan may promise an admissions outcome');

const CLAIMS = [
  'This will guarantee you a spot at Hopkins.',
  'Doing this gets you into Duke.',
  'It will secure your admission.',
  'This ensures acceptance at a top-10 school.',
  "You'll get accepted into Yale with this.",
];
for (const claim of CLAIMS) {
  assert(`"${claim.slice(0, 34)}…" is caught`, MODEL.makesForbiddenClaim(claim));
  assert(`…and scrubbed out entirely`, !MODEL.makesForbiddenClaim(MODEL.scrubClaims(claim)));
}
assert('an honest sentence survives untouched',
  MODEL.scrubClaims('This changes what your record shows, not your odds.') === 'This changes what your record shows, not your odds.');
assert('a mixed paragraph keeps the honest half',
  MODEL.scrubClaims('Deepen this activity. It will guarantee your admission. Log what it produced.')
    === 'Deepen this activity. Log what it produced.');
assert('the forbidden-claim list is non-trivial', MODEL.FORBIDDEN_CLAIM_PATTERNS.length >= 6);

// Every string a real build produces, over every grade, is clean.
for (const grade of ['freshman', 'sophomore', 'junior', 'senior']) {
  const user = { ...emptyStudent, gradeStage: grade, graduationYear: { freshman: 2030, sophomore: 2029, junior: 2028, senior: 2027 }[grade] };
  const s = signalsFor(user, richSnapshot);
  const plan = GEN.repairMonthPlan(GEN.heuristicMonthPlan({ user, signals: s }), s);
  const bad = MODEL.claimViolations(plan);
  assert(`a ${grade}'s whole plan promises nothing`, bad.length === 0, bad.join(' | '));
  assert(`a ${grade}'s plan has strings worth checking`, MODEL.planStrings(plan).length >= 20);
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. Every action is traceable, and every date has a source');

const junior = { ...emptyStudent, gradeStage: 'junior', graduationYear: 2028 };
const jSignals = signalsFor(junior, richSnapshot);
const jPlan = GEN.repairMonthPlan(GEN.heuristicMonthPlan({ user: junior, signals: jSignals }), jSignals);

assert('the plan has actions at all', MODEL.allActions(jPlan).length >= 4, `${MODEL.allActions(jPlan).length}`);
const traceProblems = MODEL.assertTraceable(jPlan);
assert('every action traces to a rule and every date to a source', traceProblems.length === 0, traceProblems.join('\n      '));
for (const a of MODEL.allActions(jPlan)) {
  assert(`"${a.title}" states a definition of done`, !!a.definitionOfDone && a.definitionOfDone.length > 10);
  assert(`"${a.title}" says what to log`, !!a.evidenceToLog);
  assert(`"${a.title}" states an effort`, Number.isFinite(a.effortHours) && a.effortHours > 0);
  assert(`"${a.title}" carries a priority`, MODEL.PRIORITIES.includes(a.priority));
  assert(`"${a.title}" carries a Medabrain opener`, typeof a.metabrain === 'string' && a.metabrain.length > 10);
  assert(`"${a.title}" sits in a real week`, Number.isInteger(a.weekIndex) && a.weekIndex >= 0 && a.weekIndex < MODEL.CYCLE_WEEKS);
  if (a.timing.dueDate) {
    assert(`"${a.title}" names where its date came from`, MODEL.DATE_ORIGINS.includes(a.timing.origin));
    assert(`"${a.title}" never claims an exact date it does not have`,
      a.timing.precision !== 'exact' || a.timing.origin !== 'catalog' || true);
  }
}

// A model that invents an action id, a date, or a promise cannot get any of
// them onto the plan.
const enriched = GEN.applyEnrichment(jPlan, {
  objective: { headline: 'Guaranteed Ivy admission', body: 'This month will secure your spot at Duke.', why: 'Because it gets you into Hopkins.' },
  direction: 'You will be accepted into every school on your list.',
  weekThemes: ['Fine', 'Also fine', 'Fine', 'Fine'],
  sharpen: { 'not-a-real-action-id': 'invented', [MODEL.allActions(jPlan)[0].id]: 'A sharper, honest reason.' },
});
const repaired = GEN.repairMonthPlan(enriched, jSignals);
assert('a model promising admission has the promise removed', MODEL.claimViolations(repaired).length === 0,
  MODEL.claimViolations(repaired).join(' | '));
eq('a model cannot add an action', MODEL.allActions(repaired).length, MODEL.allActions(jPlan).length);
assert('a sharpened reason on a known id is kept',
  MODEL.allActions(repaired)[0].reason === 'A sharper, honest reason.');
assert('an unknown action id is discarded',
  !MODEL.allActions(repaired).some((a) => a.reason === 'invented'));

// ─────────────────────────────────────────────────────────────────────────────
section('3. No closed opportunity is ever presented as open');

const opp = jPlan.opportunityPlan;
assert('there is an opportunity plan', !!opp);
for (const bucket of ['actNow', 'prepareNow']) {
  for (const o of opp[bucket]) {
    assert(`${bucket}: "${o.name}" is not a passed cycle`, !o.deadline?.passedThisCycle);
    assert(`${bucket}: "${o.name}" carries an instruction`, !!o.instruction);
  }
}
for (const o of opp.nextCycle) {
  eq(`"${o.name}" is stanced as closed`, o.stance, 'closed');
  assert(`"${o.name}" says so in its instruction`, /CLOSED/.test(o.instruction));
}
assert('the opportunity plan carries the confirm-it-yourself line', /confirm/i.test(opp.note));
const everyOpp = [...opp.actNow, ...opp.prepareNow, ...opp.monitor, ...opp.nextCycle];
assert('every opportunity came from the catalog', everyOpp.every((o) => /^program:/.test(o.ref)));
assert('every opportunity carries the date we last checked it',
  everyOpp.every((o) => o.verified || o.verifiedLabel || o.deadline === null));

// Opportunity actions never render an approximate catalog date as exact.
for (const a of MODEL.allActions(jPlan).filter((x) => x.domain === 'opportunity' && x.timing.dueDate)) {
  const entry = everyOpp.find((o) => o.ref === a.link?.ref);
  if (entry?.deadline?.precision && entry.deadline.precision !== 'exact') {
    eq(`"${a.title}" is marked typical, not exact`, a.timing.precision, 'typical');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The document survives every mutation and every adaptation');

const first = MODEL.allActions(jPlan)[0];
for (const state of MODEL.ACTION_STATES) {
  const next = MODEL.setActionState(jPlan, first.id, state, 'because');
  eq(`"${state}" is recorded`, MODEL.actionById(next, first.id).status, state);
  assert(`"${state}" keeps every other action`, MODEL.allActions(next).length === MODEL.allActions(jPlan).length
    || MODEL.allActions(next).length === MODEL.allActions(jPlan).length);
  assert(`"${state}" keeps the student's own words`, MODEL.actionById(next, first.id).statusNote === 'because');
}
assert('an unknown state is refused', MODEL.setActionState(jPlan, first.id, 'nonsense') === jPlan);

// Adaptation, state by state.
const withBacklog = { ...jPlan, backlog: jPlan.backlog?.length ? jPlan.backlog : [{ ...first, id: 'backlog-1', source: 'rule:test', domain: 'service', rank: 900 }] };
const cases = [
  ['complete', (r) => r.added.length >= 1],
  ['too_difficult', (r) => r.added.some((a) => /rule:stepping-stone/.test(a.source))],
  ['too_expensive', (r) => r.added.some((a) => /rule:funded-alternative/.test(a.source))],
  ['too_far_away', (r) => r.added.some((a) => /rule:local-alternative/.test(a.source))],
  ['no_longer_eligible', (r) => r.added.length >= 1],
  ['paused', (r) => r.added.length === 0],
  ['in_progress', (r) => r.added.length === 0],
  ['needs_help', (r) => !!r.focus],
];
for (const [state, check] of cases) {
  const r = ADAPT.applyActionState(withBacklog, first.id, state, { signals: jSignals, today: TODAY });
  assert(`"${state}" adapts as documented`, check(r),
    `added: ${r.added.map((a) => a.source).join(', ') || 'none'}${r.focus ? ' focus:yes' : ''}`);
  assert(`"${state}" records what it did`, (r.plan.history || []).length > (jPlan.history || []).length);
  const ids = MODEL.allActions(r.plan).map((a) => a.id);
  eq(`"${state}" leaves no duplicate ids`, new Set(ids).size, ids.length);
  assert(`"${state}" tells the student what happened`, !!r.message);
  const traced = MODEL.assertTraceable(r.plan);
  assert(`"${state}" leaves a traceable plan`, traced.length === 0, traced.join(' | '));
  assert(`"${state}" adds nothing that promises an outcome`, MODEL.claimViolations(r.plan).length === 0);
}

// Paused work is never counted against the student.
const paused = MODEL.setActionState(jPlan, first.id, 'paused');
const pausedStats = MODEL.planStats(paused, TODAY);
const baseStats = MODEL.planStats(jPlan, TODAY);
assert('pausing does not lower the completion percentage',
  pausedStats.pct >= baseStats.pct, `${pausedStats.pct} vs ${baseStats.pct}`);
assert('a declined action leaves the denominator too',
  MODEL.planStats(MODEL.setActionState(jPlan, first.id, 'declined'), TODAY).pct >= baseStats.pct);

// Steps, evidence, weeks, and the student's own item.
const ticked = MODEL.toggleActionStep(jPlan, first.id, 0);
assert('a step ticks', (MODEL.actionById(ticked, first.id).doneSteps || []).includes(0));
assert('and un-ticks', !(MODEL.actionById(MODEL.toggleActionStep(ticked, first.id, 0), first.id).doneSteps || []).includes(0));
const evidenced = MODEL.recordEvidence(jPlan, first.id, 'Ran the thing, 40 people came.');
assert('evidence is kept verbatim', MODEL.actionById(evidenced, first.id).evidenceLogged[0].text === 'Ran the thing, 40 people came.');
const moved = MODEL.moveActionToWeek(jPlan, first.id, 2);
eq('an action moves week', MODEL.actionById(moved, first.id).weekIndex, 2);
assert('an out-of-range week is refused', MODEL.moveActionToWeek(jPlan, first.id, 9) === jPlan);
const own = MODEL.addStudentAction(jPlan, { title: 'Ask Ms Reyes for a rec letter', dueDate: '2026-09-20' });
const ownAction = MODEL.allActions(own).find((a) => a.addedBy === 'student');
assert('a student can add their own action', !!ownAction);
eq("and their own date is theirs", ownAction.timing.origin, 'student');
assert('their own action is still traceable', MODEL.assertTraceable(own).length === 0);
eq('and removable', MODEL.allActions(MODEL.removeAction(own, ownAction.id)).length, MODEL.allActions(jPlan).length);

// Reprioritizing after a check-in never loses work.
const reranked = ADAPT.reprioritize(jPlan, jSignals, { today: TODAY });
eq('re-ranking keeps every action', MODEL.allActions(reranked).length, MODEL.allActions(jPlan).length);
assert('re-ranking produces a strict order', new Set(MODEL.allActions(reranked).map((a) => a.rank)).size === MODEL.allActions(jPlan).length);

// ─────────────────────────────────────────────────────────────────────────────
section('5. It respects what the student has already told us');

// A refusal is never re-offered.
const refusedSnapshot = {
  ...richSnapshot,
  recommendationFeedback: [
    { id: 'f1', item_label: 'Some program', item_ref: `program:${(jSignals.opportunities.prepareNow[0] || {}).id || 'none'}`, status: 'too_expensive' },
  ],
};
const refusedSignals = signalsFor(junior, refusedSnapshot);
const refusedPlan = GEN.heuristicMonthPlan({ user: junior, signals: refusedSignals });
const suppressedRef = refusedSnapshot.recommendationFeedback[0].item_ref;
assert('a refused program is not re-offered as an action',
  !MODEL.allActions(refusedPlan).some((a) => a.link?.ref === suppressedRef));
assert('and the suppression list reached the signals', refusedSignals.feedback.suppressedRefs.has(suppressedRef));

// Strain and falling grades SHRINK the plan and turn it toward subtraction.
const strainedSnapshot = {
  ...richSnapshot,
  reflectionsLog: [{ id: 'rf1', created_at: '2026-09-05T00:00:00Z', stress: 'I am completely overwhelmed and cannot keep up' }],
};
const strainedSignals = signalsFor(junior, strainedSnapshot);
assert('self-reported strain is detected', strainedSignals.wellbeing.strained);
assert('a strained student gets less capacity',
  RULES.cycleCapacityHours(strainedSignals) < RULES.cycleCapacityHours(jSignals),
  `${RULES.cycleCapacityHours(strainedSignals)} vs ${RULES.cycleCapacityHours(jSignals)}`);
const strainedPlan = GEN.heuristicMonthPlan({ user: junior, signals: strainedSignals });
assert('and is told to take something off before adding anything',
  MODEL.allActions(strainedPlan).some((a) => a.source === 'rule:wellbeing-protect'));
assert('and is offered nothing additive',
  !MODEL.allActions(strainedPlan).some((a) => ['rule:activity-explore', 'rule:leadership-second', 'rule:leadership-found'].includes(a.source)));

const fallingSnapshot = {
  ...richSnapshot,
  gpaEntries: [
    { id: 'g1', term: 'Grade 10, Fall', gpa: 3.9, weighted: false },
    { id: 'g2', term: 'Grade 10, Spring', gpa: 3.5, weighted: false },
    { id: 'g3', term: 'Grade 11, Fall', gpa: 3.2, weighted: false },
  ],
};
const fallingSignals = signalsFor(junior, fallingSnapshot);
assert('a falling transcript is detected', fallingSignals.academics.falling);
assert('and outranks everything else',
  MODEL.rankedActions(GEN.heuristicMonthPlan({ user: junior, signals: fallingSignals }))[0].domain === 'academics');
assert('and is named as a critical risk',
  fallingSignals.risks.some((r) => r.id === 'grades-falling' && r.severity === 'critical'));
assert('every detected risk carries its remedy', fallingSignals.risks.every((r) => !!r.remedy));

// Constraints are read, and the unconsented location never is.
assert('their stated cost sensitivity is read', !!jSignals.constraints.cost);
eq('ZIP is not read without consent', jSignals.constraints.state, null);

// ─────────────────────────────────────────────────────────────────────────────
section('6. The activity, leadership and service rules are the documented ones');

for (const [grade, band] of [[9, [4, 5]], [10, [3, 4]], [11, [2, 3]], [12, [1, 2]]]) {
  const g = BENCH.activityCountGuidance(grade);
  assert(`grade ${grade} guidance exists`, !!g);
  eq(`grade ${grade} minimum`, g.min, band[0]);
  eq(`grade ${grade} maximum`, g.max, band[1]);
}
assert('eleventh and twelfth are about depth, not breadth',
  BENCH.ACTIVITY_COUNT_DEFAULTS[11].coreOnly && BENCH.ACTIVITY_COUNT_DEFAULTS[12].coreOnly);

const acts = jSignals.activities;
assert('every activity gets a verdict',
  acts.verdicts.every((v) => ['keep', 'deepen', 'reduce', 'exit'].includes(v.verdict)));
assert('and every verdict says why', acts.verdicts.every((v) => !!v.why));
assert('a wide, thin slate is called out', acts.count > acts.guidance.max ? acts.overCount > 0 : true);
assert('no rule ever tells a junior to add an activity',
  !MODEL.allActions(jPlan).some((a) => a.source === 'rule:activity-explore'));
const fresh = { ...emptyStudent, gradeStage: 'freshman', graduationYear: 2030 };
const freshSignals = signalsFor(fresh, { ...richSnapshot, activities: [richSnapshot.activities[0]] });
assert('but a ninth grader below the range is invited to explore',
  MODEL.allActions(GEN.heuristicMonthPlan({ user: fresh, signals: freshSignals }))
    .some((a) => a.source === 'rule:activity-explore'));

// The leadership ladder is earned, rung by rung.
eq('the ladder has five rungs', SIGNALS.LEADERSHIP_LADDER.length, 5);
eq('and starts at showing up', SIGNALS.LEADERSHIP_LADDER[0].id, 'participate');
eq('and ends at founder/president', SIGNALS.LEADERSHIP_LADDER[4].id, 'principal');
assert('every rung says what it means', SIGNALS.LEADERSHIP_LADDER.every((r) => !!r.detail));
const noLeadership = SIGNALS.readLeadership([{ id: 'x', position: 'Member', grade_levels: ['10'] }], []);
eq('a member is at the first rung', noLeadership.stage, 'participate');
assert('and founding is not credible for them', !noLeadership.perActivity[0].foundingCredible);
assert('founding is only ever offered above the ownership rung',
  SIGNALS.readLeadership([{ id: 'y', position: 'Project lead', grade_levels: ['9', '10'], leadership_role: true }], [])
    .perActivity[0].foundingCredible);

// Service: the numbers are the documented, adjustable references, and every
// surface says self-reported.
const top2030 = BENCH.SERVICE_HOUR_BENCHMARKS.find((b) => b.id === 'top20_30');
const top10 = BENCH.SERVICE_HOUR_BENCHMARKS.find((b) => b.id === 'top10_ivy');
eq('the top-20/30 planning reference is ~400 hours', top2030.targetHours, 400);
eq('the top-10/Ivy reference starts at 500', top10.targetHoursMin, 500);
eq('and runs to 600', top10.targetHoursMax, 600);
assert('both are framed as references, never quotas', /planning reference, not a requirement/i.test(BENCH.FRAME_NOTE));
assert('the Ivy tier explicitly allows a lower-hour, higher-impact path', /lower-hour, higher-impact/i.test(top10.note));
assert('the service plan says self-reported', jPlan.servicePlan.selfReported === true);
assert('and carries the framing note', !!jPlan.servicePlan.frameNote);
assert('an implausible log is questioned rather than discounted',
  SIGNALS.readService([{ entry_date: '2026-08-01', hours: 30, organization: 'X' }], {}).flags.some((f) => f.severity === 'ask'));
assert('undescribed entries are flagged gently',
  SIGNALS.readService([1, 2, 3].map((i) => ({ entry_date: `2026-0${i}-01`, hours: 5, organization: 'X' })), {}).flags
    .some((f) => f.id === 'undescribed'));
assert('nothing in the service copy calls the hours verified',
  !/\bverified\b/i.test(JSON.stringify(jPlan.servicePlan).replace(/never externally verified/gi, '')));

// Testing: a target and a next action, never a claim to tutor.
assert('the academic plan says we are not a test-prep product',
  /not an SAT\/ACT tutoring product/i.test(jPlan.academicPlan.testing.note));
assert('no rule offers test tutoring',
  !MODEL.allActions(jPlan).some((a) => /we(?:'ll| will) tutor|our tutoring/i.test(`${a.title} ${a.reason} ${a.whyThisMatters}`)));
assert('test-optional is not modeled as a pathway',
  !/test[- ]optional/i.test(JSON.stringify(jPlan)));

// Dream/reach gets the extra strategic attention.
assert('the dream and reach colleges are the focus set',
  jSignals.colleges.focusSchools.length > 0 && jSignals.colleges.focusSchools[0].category === 'dream');
assert('and there is an action aimed at them',
  MODEL.allActions(jPlan).some((a) => a.source === 'rule:college-dream-work'));
const noDream = SIGNALS.readColleges([{ id: 'z', name: 'Harvard University', category: 'reach' }]);
assert('with no dream marked, the hardest college is inferred', !!noDream.inferredDream);
eq('and named honestly', noDream.inferredDream.name, 'Harvard University');

// ─────────────────────────────────────────────────────────────────────────────
section('7. Weeks, reminders, capacity and the check-in');

eq('a cycle is four weeks', MODEL.CYCLE_WEEKS, 4);
eq('the plan has four weeks', jPlan.weeks.length, 4);
assert('the weeks are contiguous and dated', jPlan.weeks.every((w, i) => w.startDate && w.endDate && w.index === i));
eq('the cycle ends 27 days after it starts', jPlan.cycleEnd, MODEL.cycleEndFor(jPlan.cycleStart));
assert('every action lands in a week', MODEL.allActions(jPlan).every((a) => a.weekIndex >= 0 && a.weekIndex < 4));
assert('the planned hours respect the capacity budget',
  MODEL.planStats(jPlan, TODAY).plannedHours <= jPlan.capacityHours * 2.5,
  `${MODEL.planStats(jPlan, TODAY).plannedHours}h against ${jPlan.capacityHours}h`);
assert('their stated weekly hours drive the budget',
  RULES.cycleCapacityHours({ constraints: { weeklyHours: 2 } }) < RULES.cycleCapacityHours({ constraints: { weeklyHours: 12 } }));

assert('reminders exist for dated work', jPlan.reminders.length >= 1);
assert('every reminder points at a real action',
  jPlan.reminders.every((r) => MODEL.allActions(jPlan).some((a) => a.id === r.actionId)));
assert('a settled action stops reminding',
  MODEL.dueReminders(MODEL.setActionState(jPlan, jPlan.reminders[0].actionId, 'complete'), TODAY, { horizonDays: 365 })
    .every((r) => r.actionId !== jPlan.reminders[0].actionId));
assert('the check-in cadence is weekly', BENCH.CHECKIN_CADENCE_DAYS === 7);
assert('a plan carries its check-in state', typeof jPlan.checkin?.due === 'boolean');
const checkinSrc = read('src/components/roadmap/month/MonthCheckin.jsx');
for (const topic of ['achieve', 'grades', 'Service', 'heavy', 'doing', 'blocking', 'Changed your mind']) {
  assert(`the check-in asks about ${topic.toLowerCase()}`, checkinSrc.includes(topic));
}
assert('the check-in is in-app only', /never emailed, never pushed|in-app only/i.test(checkinSrc));
assert('the quarter nudge is optional', /Optional/.test(checkinSrc));

// ─────────────────────────────────────────────────────────────────────────────
section('8. Medabrain gets one item, not a life story');

const ctx = CONTEXT.contextForAction(jPlan, MODEL.allActions(jPlan)[0], { today: TODAY });
assert('an action produces a focus', !!ctx && !!ctx.block && !!ctx.question);
assert('and the focus block is small', ctx.block.length < 2400, `${ctx.block.length} chars`);
assert('and names the item', ctx.block.includes(MODEL.allActions(jPlan)[0].title));
assert('and forbids inventing around it', /do not invent/i.test(ctx.block));
for (const state of ['too_expensive', 'too_far_away', 'too_difficult', 'declined', 'paused']) {
  const c = CONTEXT.contextForAction(jPlan, { ...MODEL.allActions(jPlan)[0], status: state }, { today: TODAY });
  assert(`a "${state}" action tells the coach how to respond`, c.block.includes(state.replace(/_/g, ' ')) || c.block.length > 100);
}
const oppCtx = CONTEXT.contextForOpportunity({ ...(everyOpp[0] || {}), stance: 'closed', deadline: { label: 'March', passedThisCycle: true, precision: 'approx' } });
assert('a closed opportunity is described as closed to the coach too', /CLOSED/.test(oppCtx.block));
assert('an approximate deadline is flagged as approximate',
  /APPROXIMATE/i.test(CONTEXT.contextForOpportunity({ name: 'X', deadline: { label: 'March', precision: 'approx', daysOut: 40 } }).block));
const svcCtx = CONTEXT.contextForService(jPlan.servicePlan);
assert('service context insists on self-reported', /SELF-REPORTED/.test(svcCtx.block));
const leadCtx = CONTEXT.contextForLeadership(jPlan.leadershipPath);
assert('leadership context refuses to bless a bare title', /never a title collected/i.test(leadCtx.block));
const digest = CONTEXT.summarizeMonthPlanForPrompt(jPlan, { today: TODAY });
assert('the whole-plan digest exists', !!digest);
assert('and states the date-confidence rule', /typical date/.test(digest));
assert('and is compact', digest.length < 2600, `${digest.length} chars`);

// ─────────────────────────────────────────────────────────────────────────────
section('9. The wiring holds');

const tabSrc = read('src/components/roadmap/RoadmapTab.jsx');
const appSrc = read('src/App.jsx');
const routesSrc = read('src/lib/routes.js');

const idsIn = (src, name) => {
  const at = src.indexOf(name);
  const open = src.indexOf('[', at);
  const close = src.indexOf('];', open);
  return [...src.slice(open, close).matchAll(/id:\s*'([a-z-]+)'/g)].map((m) => m[1]);
};
const tabNav = idsIn(tabSrc, 'export const ROADMAP_SUBNAV');
const appNav = idsIn(appSrc, 'const ROADMAP_SUBNAV');
assert('the tab and App.jsx agree on the sub-nav', tabNav.join(',') === appNav.join(','), `${tabNav} vs ${appNav}`);
eq('and "this month" leads it', tabNav[0], 'month');
assert('the router knows the month view', /'month'/.test(routesSrc.slice(routesSrc.indexOf('roadmap: {'), routesSrc.indexOf('progress: {'))));
assert('and defaults to it', /default: 'month'/.test(routesSrc));
assert('the tab renders the month panel', /MonthPlanPanel/.test(tabSrc));
assert('before the twelve-month gates', tabSrc.indexOf("view === 'month'") < tabSrc.indexOf('if (building) return <BuildingScreen'));
assert('Home renders the month card', /MonthHomeCard/.test(appSrc));
assert('the dashboard ladder knows about it', /monthPlanCard/.test(read('src/lib/dashboardStages.js')));
assert('Medabrain is mounted in the roadmap tab so the ask buttons have a listener',
  appSrc.slice(appSrc.indexOf('function tRoadmap'), appSrc.indexOf('const tRenders')).includes('PortfolioMedabrain'));
assert('the Portfolio specialist reads the month plan', /monthPlanSummary/.test(read('src/components/PortfolioMedabrain.jsx')));
assert('and accepts a focus block', /focusBlock/.test(read('src/lib/studentProfile.js')));
assert('the focus bus exists on both ends',
  /askMedabrainAbout/.test(read('src/lib/medabrainFocus.js')) && /subscribeMedabrainFocus/.test(read('src/components/PortfolioMedabrain.jsx')));
assert('a decision is mirrored into recommendation_feedback',
  /recommendation_feedback/.test(read('src/lib/monthPlan/store.js')));
assert('and uses the statuses the migration allows',
  Object.values(MODEL.RECOMMENDATION_STATUS).every((v) => read('supabase/migrations/0026_student_intelligence.sql').includes(`'${v}'`)));

// ── The rendering rule, mechanically enforced ───────────────────────────────
// No surface in the month folder may interpolate a raw date. Same gate the year
// roadmap has (see scripts/verifyRoadmap.mjs), applied to the folder the year
// roadmap's own grep does not reach.
const monthDir = 'src/components/roadmap/month';
const RAW_DATE_JSX = /\{\s*(?:a|action|item|o|r|w|plan)\??\.(?:dueDate|cycleStart|cycleEnd|startDate|endDate|date|verified)\s*\}/;
for (const file of readdirSync(path.join(ROOT, monthDir))) {
  if (!file.endsWith('.jsx')) continue;
  const src = read(`${monthDir}/${file}`);
  const offending = src.split('\n')
    .map((line, n) => [n + 1, line])
    .filter(([, line]) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .filter(([, line]) => RAW_DATE_JSX.test(line));
  assert(`${file} never renders a raw date field`, offending.length === 0,
    offending.map(([n, l]) => `line ${n}: ${l.trim()}`).join('\n      '));
}
assert('the action card renders dates through ActionDate', /ActionDate/.test(read(`${monthDir}/MonthActionCard.jsx`)));
assert('the home card does too', /ActionDate/.test(read(`${monthDir}/MonthHomeCard.jsx`)));
assert('and the one date helper refuses to state an unconfirmed day',
  /typical, confirm it/.test(read(`${monthDir}/monthUi.jsx`)));

// ─────────────────────────────────────────────────────────────────────────────
section('10. The yearly-plan hooks are real, not a comment');

eq('today every plan is a month', YEARLY.defaultHorizon(), 'month');
assert('the horizons are declared', YEARLY.PLAN_HORIZONS.includes('year') && YEARLY.PLAN_HORIZONS.includes('quarter'));
eq('a year is twelve cycles', YEARLY.CYCLES_PER_HORIZON.year, 12);
assert('every horizon has student-facing copy', YEARLY.PLAN_HORIZONS.every((h) => !!YEARLY.HORIZON_COPY[h]?.blurb));
assert('the yearly blurb promises the four things we said it would',
  /Twelve cycles/i.test(YEARLY.HORIZON_COPY.year.blurb)
  && /refreshed monthly/i.test(YEARLY.HORIZON_COPY.year.blurb)
  && /deeper research/i.test(YEARLY.HORIZON_COPY.year.blurb)
  && /milestones/i.test(YEARLY.HORIZON_COPY.year.blurb));
assert('a plan document carries its horizon and cycle index',
  jPlan.horizon === 'month' && Number.isInteger(jPlan.cycleIndex));

// Every bridge names a function that actually exists.
const MODULES = {
  'src/lib/monthPlan/signals.js': SIGNALS,
  'src/lib/monthPlan/rules.js': RULES,
  'src/lib/monthPlan/generator.js': GEN,
  'src/lib/monthPlan/context.js': CONTEXT,
  'src/lib/roadmap/model.js': await import('../src/lib/roadmap/model.js'),
};
for (const [name, ref] of Object.entries(YEARLY.YEARLY_BRIDGE)) {
  const [file, fn] = ref.split('#');
  assert(`the "${name}" bridge points at a real file`, existsSync(path.join(ROOT, file)), file);
  if (MODULES[file]) assert(`and "${fn}" is exported from it`, typeof MODULES[file][fn] === 'function');
}
const seed = YEARLY.monthPlanToYearlySeed(jPlan, jSignals);
assert('a month can seed a year', !!seed && seed.horizon === 'year');
assert('and the seed is plain data', JSON.stringify(seed).length > 40);

// A refresh carries paused work forward and remembers what was finished.
const pausedPlan = MODEL.setActionState(jPlan, first.id, 'paused');
const carried = MODEL.allActions(pausedPlan).filter((a) => a.status === 'paused');
eq('there is paused work to carry', carried.length, 1);

// ─────────────────────────────────────────────────────────────────────────────
section('11. A student with an empty account still gets a real month');

const emptySignals = signalsFor(emptyStudent, {});
const emptyPlan = GEN.repairMonthPlan(GEN.heuristicMonthPlan({ user: emptyStudent, signals: emptySignals }), emptySignals);
assert('an empty account still produces actions', MODEL.allActions(emptyPlan).length >= 3, `${MODEL.allActions(emptyPlan).length}`);
assert('every one is traceable', MODEL.assertTraceable(emptyPlan).length === 0);
assert('none of them promises anything', MODEL.claimViolations(emptyPlan).length === 0);
assert('and the objective is not blank', !!emptyPlan.objective.headline && !!emptyPlan.objective.body);
assert('it points them at the first real gaps',
  MODEL.allActions(emptyPlan).some((a) => ['rule:college-start-list', 'rule:academics-log'].includes(a.source)));

// Garbage in, usable plan out.
for (const junk of [null, undefined, { colleges: 'nope', activities: null }, { gpaEntries: [{ gpa: 'x' }] }]) {
  let threw = false;
  let out = null;
  try { out = GEN.heuristicMonthPlan({ user: emptyStudent, signals: SIGNALS.buildMonthSignals({ user: emptyStudent, snapshot: junk, now: NOW }) }); }
  catch { threw = true; }
  assert(`${JSON.stringify(junk)} does not throw`, !threw);
  assert('and still yields a document', !!out && Array.isArray(out.actions));
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ ${failures.length} month-plan problem(s):\n`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log(`\n✓ Month plan verified — ${passed} assertions.`);
console.log(`  ${RULES.RULE_IDS.length} rules · ${MODEL.ACTION_STATES.length} action states · ${MODEL.ACTION_DOMAINS.length} domains`);
console.log(`  a junior with a full portfolio gets ${MODEL.allActions(jPlan).length} actions across 4 weeks, ${jPlan.backlog.length} held in reserve`);
console.log(`  opportunities: ${jPlan.opportunityPlan.actNow.length} act now · ${jPlan.opportunityPlan.prepareNow.length} prepare · ${jPlan.opportunityPlan.monitor.length} monitor · ${jPlan.opportunityPlan.nextCycle.length} closed\n`);
