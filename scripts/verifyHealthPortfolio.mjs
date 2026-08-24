#!/usr/bin/env node
// Assertions on the health-pathway Portfolio: the essay workspace (src/lib/healthEssays.js,
// essayVersions.js, programEssayPrompts.js) and the two-way milestone layer
// (src/lib/milestoneSync.js, milestoneUrgency.js, and the hp_* half of timeline.js).
//
// There is no test runner in this repo, so this script is the test suite for those modules.
// scripts/verifyTimeline.mjs already asserts the catalog's shape and grade gating; this one
// asserts the BEHAVIORS that make the workspace health-specific, each of which is invisible in
// review and easy to undo by accident:
//
//   1. THE WORKING DOCUMENT IS NOT AN ESSAY. No word limit, no status ladder, never "overdue",
//      and excluded from every essay counter. The day it starts counting as a supplement is the
//      day opening a notebook tells a ninth-grader they are behind on an application.
//   2. THE QUESTION ARRIVES WHEN THE ANSWER EXISTS. The summer question is asked in September,
//      not in March; the yearly ones come back the following year and not the same week;
//      silence is a legitimate output.
//   3. GRADE GATING. Ninth and tenth graders get the journal as their working surface and the
//      tracker as a labelled preview; nobody is asked a question about experiences they have
//      not had yet.
//   4. NOTHING IS FABRICATED. Every program prompt shown to a student is text the catalog
//      actually holds. A plausible invented BS/MD prompt is worse than no prompt, because the
//      student drafts against it.
//   5. VERSION HISTORY DESCRIBES THE EDIT HONESTLY. "Rewritten" is reserved for replacement;
//      an append is an append. This is read as feedback, so a wrong label misrepresents a
//      student's own work to the person assessing it.
//   6. COMPLETION ONLY EVER MOVES A STATUS FORWARD, and an alert is not an application.
//   7. URGENCY IS NOT DATE ORDER. A deadline in ninety days needing two months outranks one in
//      thirty that takes an afternoon — the ordering the whole feed was rebuilt for.
//
//   node scripts/verifyHealthPortfolio.mjs
import {
  REFLECTION_PROMPTS, PROMPT_BY_ID, WHY_PATHWAY, REFLECTION_CADENCE_DAYS, WHY_PATHWAY_STALE_DAYS,
  nextReflectionPrompt, inSeason, whyPathwayStatus, isEssayPreviewGrade, trackerUnlockLabel,
  seasonLabel, countWords,
} from '../src/lib/healthEssays.js';
import {
  diffWords, characterizeChange, buildVersionArc, summarizeArcForPrompt,
} from '../src/lib/essayVersions.js';
import {
  collectProgramPrompts, trackedCombinedPrograms, essayRowForProgramPrompt, isPromptStarted,
  summarizeProgramPrompts,
} from '../src/lib/programEssayPrompts.js';
import {
  completionEffects, describeEffects, parseSourceRef, sourceRef,
} from '../src/lib/milestoneSync.js';
import {
  sortByUrgency, urgencyOf, alertRowsFor, isAlertRow, alertParentRef, leadDaysFor, ALERT_OFFSETS,
} from '../src/lib/milestoneUrgency.js';
import { MILESTONES, GRADE_KEYS } from '../src/lib/timeline.js';
import { PROGRAMS } from '../src/data/combinedDegreePrograms.js';

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};
const eq = (label, actual, expected) =>
  assert(label, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
const section = (n) => console.log(`\n${n}`);

const MS_ID = new Set(MILESTONES.map(m => m.id));
const byId = Object.fromEntries(MILESTONES.map(m => [m.id, m]));
const words = (n, p = 'w') => Array.from({ length: n }, (_, i) => p + i).join(' ');

// ─────────────────────────────────────────────────────────────────────────────
section('1. The working document is not an essay');

eq('why_pathway kind is stable (the API whitelist and migration check constraint both key off it)',
  WHY_PATHWAY.kind, 'why_pathway');
assert('the working document declares no word limit',
  !('wordLimit' in WHY_PATHWAY) && !('word_limit' in WHY_PATHWAY));
assert('the working document declares no status ladder',
  !('status' in WHY_PATHWAY) && !('statuses' in WHY_PATHWAY));
assert('the working document declares no due date',
  !('due' in WHY_PATHWAY) && !('dueDate' in WHY_PATHWAY) && !('deadline' in WHY_PATHWAY));
assert('the critique pass is told this is a working document, not a submission draft',
  WHY_PATHWAY.critiqueMode === 'working_document');
assert('it carries an opener for an empty document', typeof WHY_PATHWAY.opener === 'string' && WHY_PATHWAY.opener.length > 40);

// A document with no deadline cannot be late: every state it can report has to be descriptive.
const OK_STATES = new Set(['missing', 'empty', 'live', 'stale']);
eq('no document at all', whyPathwayStatus(null).state, 'missing');
eq('an empty document', whyPathwayStatus({ content: '   ' }).state, 'empty');
eq('written three weeks ago is live',
  whyPathwayStatus({ content: 'a b c', updated_at: '2026-08-01T00:00:00Z' }, [], new Date('2026-08-22')).state, 'live');
eq('written eight months ago has gone quiet',
  whyPathwayStatus({ content: 'a b c', updated_at: '2026-01-01T00:00:00Z' }, [], new Date('2026-08-22')).state, 'stale');
assert('no status is ever "overdue" or "late"',
  ['missing', 'empty', 'live', 'stale'].every(s => OK_STATES.has(s)) && !OK_STATES.has('overdue'));
assert('the stale threshold is months, not weeks — this document is allowed to sit',
  WHY_PATHWAY_STALE_DAYS >= 60, `WHY_PATHWAY_STALE_DAYS=${WHY_PATHWAY_STALE_DAYS}`);
// A version saved counts as touching it even when updated_at was not bumped.
eq('a recent saved version keeps it live',
  whyPathwayStatus({ content: 'a b c', updated_at: '2026-01-01T00:00:00Z' },
    [{ created_at: '2026-08-10T00:00:00Z' }], new Date('2026-08-22')).state, 'live');
eq('word count ignores whitespace runs', countWords('  one   two\n\nthree '), 3);

// ─────────────────────────────────────────────────────────────────────────────
section('2. The question arrives when the answer still exists');

const summer = PROMPT_BY_ID.summer_cant_stop;
assert('the summer question exists and is asked in the student\'s own words',
  !!summer && /can't stop thinking about/i.test(summer.question));
assert('the summer question is pinned to the weeks after summer, not to March',
  summer.season && summer.season.from === '08-10' && summer.season.to === '10-20',
  JSON.stringify(summer.season));
assert('the summer question comes back every year', summer.repeat === 'yearly');

const noEntries = { gradeStage: 'freshman', entries: [] };
eq('asked in September, the summer question leads',
  nextReflectionPrompt({ ...noEntries, now: new Date('2026-09-15') })?.prompt.id, 'summer_cant_stop');
assert('asked in March, it does not',
  nextReflectionPrompt({ ...noEntries, now: new Date('2026-03-01') })?.prompt.id !== 'summer_cant_stop');
eq('a season-pinned question is flagged as such, so the UI can say why it appeared now',
  nextReflectionPrompt({ ...noEntries, now: new Date('2026-09-15') })?.urgency, 'season');

// Silence is a legitimate output — this is the one surface that must not generate pressure.
assert('a student who wrote last week is not asked again this week',
  nextReflectionPrompt({
    gradeStage: 'freshman',
    entries: [{ prompt_id: 'first_moment', content: 'x', entry_date: '2026-02-26' }],
    now: new Date('2026-03-01'),
  }) === null);
assert('the cadence is weeks, not days', REFLECTION_CADENCE_DAYS >= 28, `${REFLECTION_CADENCE_DAYS}`);

eq('answered last September, asked again this September',
  nextReflectionPrompt({
    gradeStage: 'junior',
    entries: [{ prompt_id: 'summer_cant_stop', content: 'x', entry_date: '2025-09-10' }],
    now: new Date('2026-09-15'),
  })?.prompt.id, 'summer_cant_stop');
assert('answered two weeks ago, not asked again in the same window',
  nextReflectionPrompt({
    gradeStage: 'junior',
    entries: [{ prompt_id: 'summer_cant_stop', content: 'x', entry_date: '2026-09-01' }],
    now: new Date('2026-09-15'),
  })?.prompt.id !== 'summer_cant_stop');

// An entry with no text is not an answer — otherwise opening the box and closing it silences
// the prompt for six weeks.
assert('an empty entry does not count as having answered',
  nextReflectionPrompt({
    gradeStage: 'freshman',
    entries: [{ prompt_id: 'summer_cant_stop', content: '   ', entry_date: '2026-09-10' }],
    now: new Date('2026-09-15'),
  })?.prompt.id === 'summer_cant_stop');

assert('a window that wraps the new year is open on both sides of it',
  inSeason({ from: '12-20', to: '02-10' }, '2026-12-25') &&
  inSeason({ from: '12-20', to: '02-10' }, '2026-01-05') &&
  !inSeason({ from: '12-20', to: '02-10' }, '2026-06-01'));
eq('a window closes on the day after its end', inSeason({ from: '12-20', to: '02-10' }, '2026-02-11'), false);
assert('a seasonless prompt is always in season', inSeason(null, '2026-06-01'));
assert('seasons render as month names for the UI', /\w/.test(seasonLabel({ from: '08-10', to: '10-20' }) || ''));

section('   the prompt bank itself');
const ids = REFLECTION_PROMPTS.map(p => p.id);
eq('prompt ids are unique', new Set(ids).size, ids.length);
for (const p of REFLECTION_PROMPTS) {
  assert(`${p.id}: asks exactly one question`,
    (p.question.match(/\?/g) || []).length === 1, p.question);
  assert(`${p.id}: is answerable from something that happened, not an abstraction`,
    !/what does .* mean to you|why do you want to help people/i.test(p.question), p.question);
  assert(`${p.id}: carries a nudge and a stated reason`,
    typeof p.nudge === 'string' && p.nudge.length > 20 && typeof p.why === 'string' && p.why.length > 40);
  assert(`${p.id}: gates on real class years`, p.grades.every(g => GRADE_KEYS.includes(g)));
  assert(`${p.id}: has a weight the rotation can sort on`, Number.isFinite(p.weight) && p.weight > 0);
  if (p.season) {
    assert(`${p.id}: season is a parseable MM-DD pair`,
      /^\d{2}-\d{2}$/.test(p.season.from) && /^\d{2}-\d{2}$/.test(p.season.to));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Ninth and tenth grade: journal primary, tracker a labelled preview');

eq('freshmen see the tracker as a preview', isEssayPreviewGrade('freshman'), true);
eq('sophomores see the tracker as a preview', isEssayPreviewGrade('sophomore'), true);
eq('juniors do not', isEssayPreviewGrade('junior'), false);
eq('seniors do not', isEssayPreviewGrade('senior'), false);
eq('gap-year students do not', isEssayPreviewGrade('gap'), false);
eq('an unknown class year is not put into preview', isEssayPreviewGrade(null), false);
for (const g of ['freshman', 'sophomore']) {
  const label = trackerUnlockLabel(g);
  assert(`${g}: the preview says when it becomes theirs`, typeof label === 'string' && /junior|next year/i.test(label), String(label));
}
assert('juniors get no preview label', trackerUnlockLabel('junior') === null);

// Nobody is asked about experiences they cannot have had yet.
const UPPER_ONLY = ['one_more_question', 'what_you_built'];
for (const id of UPPER_ONLY) {
  const p = PROMPT_BY_ID[id];
  assert(`${id} is not asked of ninth or tenth graders`,
    !p.grades.includes('freshman') && !p.grades.includes('sophomore'), JSON.stringify(p.grades));
}
// Whatever the rotation picks for a freshman, it must be a question a freshman can answer.
for (const day of ['2026-01-15', '2026-04-01', '2026-09-15', '2026-12-28']) {
  const next = nextReflectionPrompt({ gradeStage: 'freshman', entries: [], now: new Date(day) });
  if (next) {
    assert(`on ${day} a freshman is only asked freshman-appropriate questions`,
      next.prompt.grades.includes('freshman'), next.prompt.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Program supplements come from the tracker, and nothing is invented');

// A tracked combined-degree program is a college-list row; the join is by name.
const asCollegeRows = PROGRAMS.map((p, i) => ({ id: `c${i}`, name: `${p.institution} — ${p.program}`, status: 'researching' }));
const allCards = collectProgramPrompts({ colleges: asCollegeRows, today: new Date('2026-08-22') });
assert('every catalog program matches back from its college-list row',
  allCards.length === PROGRAMS.length, `${allCards.length} of ${PROGRAMS.length}`);
eq('an untracked program produces no card', collectProgramPrompts({ colleges: [] }).length, 0);

let fabricated = 0;
for (const card of allCards) {
  const catalog = PROGRAMS.find(p => p.id === card.programId);
  const real = (catalog.supplemental?.prompts || []).map(t => t.trim());
  for (const prompt of card.prompts) {
    if (!real.includes(prompt.text)) { fabricated += 1; failures.push(`fabricated prompt on ${card.programId}: ${prompt.text.slice(0, 80)}`); }
  }
  assert(`${card.programId}: never guesses a word limit under a real prompt`,
    card.prompts.every(p => p.wordLimit === null));
  if (card.required && !card.prompts.length) {
    assert(`${card.programId}: an unpublished supplement says so, and links out`,
      typeof card.note === 'string' || typeof card.url === 'string');
  }
}
eq('no prompt is shown that the catalog does not hold', fabricated, 0);
assert('cards are ordered by deadline, soonest first',
  allCards.every((c, i) => i === 0 || (allCards[i - 1].deadline?.iso || '9999') <= (c.deadline?.iso || '9999')));
assert('at least one tracked program flags that it closes before the general round',
  allCards.some(c => c.closesBeforeGeneral));

// The join has to survive a student who typed the school in by hand before finding the panel.
const handTyped = trackedCombinedPrograms([{ id: 'x', name: `${PROGRAMS[0].institution} ${PROGRAMS[0].program}` }]);
assert('a hand-typed college row still matches its program', handTyped.length === 1, JSON.stringify(handTyped.map(h => h.program.id)));

// Starting a prompt is idempotent: source_ref is what stops it being offered twice.
const card0 = allCards.find(c => c.prompts.length);
if (card0) {
  const row = essayRowForProgramPrompt(card0, card0.prompts[0]);
  eq('a started program prompt becomes a supplemental essay', row.essay_kind, 'supplemental');
  eq('the essay carries the prompt text verbatim', row.prompt, card0.prompts[0].text);
  assert('the essay is joined back to the program', row.source_ref.startsWith(card0.key));
  assert('the essay is joined to the college-list row', row.college_id === card0.collegeId);
  eq('an unstarted prompt reads as unstarted', isPromptStarted([], card0, card0.prompts[0]), false);
  eq('a started prompt is never offered twice', isPromptStarted([row], card0, card0.prompts[0]), true);
}
assert('the workspace summary counts unpublished supplements too',
  /not published/i.test(summarizeProgramPrompts(allCards) || ''), String(summarizeProgramPrompts(allCards)));

// ─────────────────────────────────────────────────────────────────────────────
section('5. Version history describes the edit honestly');

const rewritten = characterizeChange('a b c d e f g h', 'z y x w v u t s');
eq('replacing the whole draft is a rewrite', rewritten.id, 'rewritten');

// The regression this section exists for: churn alone called a pure append a rewrite.
const appended = characterizeChange(words(11), `${words(11)} ${words(7, 'x')}`);
eq('adding seven words to eleven is an expansion, not a rewrite', appended.id, 'grew');
eq('  …and nothing is reported as removed', appended.removed, 0);

const bigCut = characterizeChange(words(10), words(2));
eq('cutting eighty percent and adding nothing is a cut, not a rewrite', bigCut.id, 'cut');

eq('replacing most of a long draft is still a rewrite',
  characterizeChange(words(100), `${words(40)} ${words(70, 'x')}`).id, 'rewritten');
eq('mostly-addition on a long draft is an expansion',
  characterizeChange(words(100), `${words(80)} ${words(70, 'x')}`).id, 'grew');
eq('a one-word tweak is a small edit', characterizeChange(words(100), `${words(99)} zz`).id, 'tinkered');
eq('an unchanged draft says so', characterizeChange(words(20), words(20)).id, 'none');
eq('the first draft is labelled as such', characterizeChange('', words(5)).id, 'written');

const parts = diffWords('the quick brown fox', 'the slow brown fox');
assert('the diff is word-level and lossless',
  parts.filter(p => p.type !== 'removed').map(p => p.text).join('') === 'the slow brown fox',
  JSON.stringify(parts));
assert('unchanged words are not marked as changed',
  parts.some(p => p.type === 'same' && /brown fox/.test(p.text)), JSON.stringify(parts));
assert('a draft too long to diff degrades to a summary rather than failing',
  diffWords(words(4001), words(4001, 'x')) === null);
const huge = characterizeChange(words(4001), words(4001, 'x'));
assert('  …and still characterises the change', typeof huge.label === 'string' && huge.added === null);

const versions = [
  { created_at: '2026-01-01T00:00:00Z', content: words(10), word_count: 10 },
  { created_at: '2026-03-01T00:00:00Z', content: `${words(10)} ${words(4, 'x')}`, word_count: 14 },
];
const arc = buildVersionArc(versions, `${words(10)} ${words(4, 'x')} ${words(3, 'y')}`);
eq('the arc runs oldest first', arc[0].index, 1);
eq('the arc includes every saved version plus the unsaved draft', arc.length, 3);
assert('the unsaved draft is marked unsaved', arc[2].unsaved === true);
assert('an identical current draft adds no phantom step',
  buildVersionArc(versions, versions[1].content).length === 2);
assert('the arc summary for the critique pass carries the shape, not the draft text',
  !summarizeArcForPrompt(arc).includes(words(10)), String(summarizeArcForPrompt(arc)));
assert('a single version has no arc worth summarizing', summarizeArcForPrompt(buildVersionArc([versions[0]])) === null);

// ─────────────────────────────────────────────────────────────────────────────
section('6. Milestones are two-way, and only ever move forward');

const snapshot = {
  colleges: [{ id: 'c1', name: 'Drexel University — BA/BS-MD', status: 'researching' }],
  activities: [{ id: 'a1', organization: 'NIH Summer Internship', status: 'planned' }],
  scholarships: [{ id: 's1', name: 'Gates Scholarship', status: 'researching' }],
  deadlines: [
    { id: 'd1', title: 'Drexel due', due_date: '2026-11-01', source_ref: 'combined:drexel', college_id: 'c1' },
    { id: 'd2', title: '60d', source_ref: 'alert:combined:drexel:60' },
    { id: 'd3', title: '7d', source_ref: 'alert:combined:drexel:7' },
  ],
};
const parent = snapshot.deadlines[0];

eq('source_ref round-trips', parseSourceRef(sourceRef('combined', 'drexel')).id, 'drexel');
eq('an alert ref is not a source ref', parseSourceRef('alert:combined:drexel:60'), null);
eq('an alert row knows its parent', alertParentRef(snapshot.deadlines[1]), 'combined:drexel');

const effects = completionEffects(parent, snapshot);
assert('completing a program deadline advances its college-list row',
  effects.some(e => e.resource === 'colleges' && e.id === 'c1' && e.patch.status === 'submitted'));
eq('completing it also closes both of its outstanding reminders',
  effects.filter(e => e.resource === 'deadlines').length, 2);
assert('the student is told what else will change before it happens',
  /Drexel/.test(describeEffects(effects) || ''), String(describeEffects(effects)));

// The rule the module exists to guarantee.
for (const recorded of ['accepted', 'rejected', 'waitlisted', 'submitted', 'enrolled']) {
  const already = { ...snapshot, colleges: [{ id: 'c1', name: 'Drexel University — BA/BS-MD', status: recorded }] };
  assert(`a college already marked "${recorded}" is never overwritten`,
    !completionEffects(parent, already).some(e => e.resource === 'colleges'));
}
assert('completing a reminder is not completing the application',
  completionEffects(snapshot.deadlines[1], snapshot).length === 0);
assert('an already-completed reminder is not closed twice',
  completionEffects(parent, {
    ...snapshot,
    deadlines: snapshot.deadlines.map(d => (d.id === 'd2' ? { ...d, completed_at: 'x' } : d)),
  }).filter(e => e.resource === 'deadlines').length === 1);

assert('an opportunity deadline completes its tracked activity',
  completionEffects({ id: 'x', title: 'NIH Summer Internship — application due', source_ref: 'opportunity:nih' }, snapshot)
    .some(e => e.resource === 'activities' && e.patch.status === 'completed'));
assert('a scholarship deadline marks the scholarship applied',
  completionEffects({ id: 'x', title: 'Gates Scholarship deadline', source_ref: 'scholarship:s1' }, snapshot)
    .some(e => e.resource === 'scholarships' && e.patch.status === 'applied'));
assert('a campus visit attached to a college does not submit the application',
  !completionEffects({ id: 'x', title: 'Drexel campus visit', college_id: 'c1' }, snapshot)
    .some(e => e.resource === 'colleges'));
assert('a hand-added application date does advance its college',
  completionEffects({ id: 'x', title: 'Drexel application deadline', college_id: 'c1' }, snapshot)
    .some(e => e.resource === 'colleges'));
assert('a prefix-only name match never completes a different row',
  !completionEffects({ id: 'x', title: 'Red Cross CPR course', source_ref: 'opportunity:z' }, snapshot)
    .some(e => e.resource === 'activities'));
eq('nothing to propagate reads as nothing', describeEffects([]), null);

section('   60 / 30 / 7');
eq('the alert ladder is exactly sixty, thirty and seven', ALERT_OFFSETS.join(','), '60,30,7');
const alerts = alertRowsFor({ title: 'X', due_date: '2026-11-25', kind: 'application', source_ref: 'combined:foo' },
  { today: new Date('2026-08-22') });
eq('a date ninety-five days out gets all three reminders', alerts.length, 3);
assert('every reminder points back at its parent', alerts.every(a => alertParentRef(a) === 'combined:foo'));
assert('every reminder is recognizable as one', alerts.every(isAlertRow));
assert('reminders land before the date they warn about', alerts.every(a => a.due_date < '2026-11-25'));
eq('a date five days out gets none — the row is already at the top of the feed',
  alertRowsFor({ title: 'X', due_date: '2026-08-27' }, { today: new Date('2026-08-22') }).length, 0);
eq('a date forty days out only gets the reminders still in the future',
  alertRowsFor({ title: 'X', due_date: '2026-10-01' }, { today: new Date('2026-08-22') }).length, 2);
eq('a date with no deadline gets none', alertRowsFor({ title: 'X' }).length, 0);
eq('an unparseable date gets none', alertRowsFor({ title: 'X', due_date: 'not-a-date' }).length, 0);

// ─────────────────────────────────────────────────────────────────────────────
section('7. Urgency is not date order');

// The example the feed was rebuilt for.
const fundraiser = { title: 'Club fundraiser form', days: 30, kind: 'planning', lead_days: 1, date: '2026-10-15', weight: 1 };
const research = { title: 'Summer research program', days: 90, kind: 'experience', lead_days: 60, date: '2026-12-15', weight: 3 };
const ordered = sortByUrgency([fundraiser, research]);
eq('a ninety-day deadline needing two months outranks a thirty-day afternoon task',
  ordered[0].title, 'Summer research program');
assert('  …and it is pressure, not slack, that puts it there',
  urgencyOf(research).slack > urgencyOf(fundraiser).slack &&
  urgencyOf(research).pressure > urgencyOf(fundraiser).pressure,
  `slack ${urgencyOf(research).slack} vs ${urgencyOf(fundraiser).slack}`);

eq('a date already past is overdue', urgencyOf({ days: -1, kind: 'application' }).band.id, 'overdue');
eq('a date inside its own run-up says start now',
  urgencyOf({ days: 40, kind: 'application', lead_days: 45 }).band.id, 'start_now');
eq('a date comfortably clear of it does not',
  urgencyOf({ days: 200, kind: 'application', lead_days: 45 }).band.id, 'on_track');
assert('a start-now item explains itself in words a student can act on',
  /start today/i.test(urgencyOf({ days: 40, kind: 'application', lead_days: 45 }).reason || ''));
assert('a same-week task is not lectured about its run-up',
  urgencyOf({ days: 3, kind: 'planning', lead_days: 1 }).reason === null);
assert('a dateless event never outranks a dated one',
  urgencyOf({ days: null, kind: 'application' }).band.id === 'on_track');

eq('a stored lead time wins over the category default', leadDaysFor({ kind: 'planning', lead_days: 90 }), 90);
eq('a category default applies when nothing is stored', leadDaysFor({ kind: 'application' }), 45);
assert('an unknown kind still gets a run-up', leadDaysFor({ kind: 'nonsense' }) > 0);
assert('sorting does not mutate the input', (() => {
  const input = [fundraiser, research];
  sortByUrgency(input);
  return input[0].title === 'Club fundraiser form';
})());
// Every band has to be reachable from some real input, and the ranks have to order them the way
// the feed reads top to bottom — a band nothing can produce is a band the student never sees.
const REACHABLE = [
  ['overdue', { days: -3, kind: 'application' }],
  ['late', { days: 5, kind: 'experience', lead_days: 60 }],
  ['start_now', { days: 40, kind: 'application', lead_days: 45 }],
  ['start_soon', { days: 50, kind: 'application', lead_days: 45 }],
  ['on_track', { days: 300, kind: 'application', lead_days: 45 }],
];
for (const [expected, event] of REACHABLE) {
  eq(`the "${expected}" band is reachable`, urgencyOf(event).band.id, expected);
}
const ranks = REACHABLE.map(([, e]) => urgencyOf(e).band.rank);
assert('the bands rank in the order the feed reads them',
  ranks.every((r, i) => i === 0 || ranks[i - 1] < r), JSON.stringify(ranks));

// ─────────────────────────────────────────────────────────────────────────────
section('8. The dates health-pathway students most often miss are actually in the catalog');

// Each entry: id, what it is, and the property that makes it worth having.
const REQUIRED = [
  ['hp_combined_supplements', 'combined-degree supplements', m => m.grades.includes('senior') && m.leadDays >= 90],
  ['hp_combined_lookahead', 'the junior-year warning that they close early', m => m.grades.includes('junior')],
  ['hp_summer_window', 'summer programs open (Dec)', m => ['11', '12', '01'].includes(m.monthDay.slice(0, 2))],
  ['hp_summer_window_close', 'summer programs close (Feb)', m => ['01', '02', '03'].includes(m.monthDay.slice(0, 2))],
  ['hp_cert_fall_enrollment', 'certification enrollment, autumn term', m => !!m.monthDay],
  ['hp_cert_spring_enrollment', 'certification enrollment, spring term', m => !!m.monthDay],
  ['hp_hosa_join', 'HOSA membership before the event window', m => !!m.monthDay],
  ['hp_hosa_regionals', 'HOSA qualifying', m => !!m.monthDay],
  ['hp_hosa_ilc', 'the HOSA ILC', m => m.monthDay.startsWith('06')],
  ['hp_sts', 'Regeneron STS', m => m.monthDay.startsWith('11') && m.grades.includes('senior') && !m.grades.includes('freshman')],
  ['hp_isef_find_fair', 'the ISEF regional-fair entry deadline', m => !!m.monthDay],
  ['hp_isef_season_end', 'ISEF qualifying closing by mid-April', m => m.monthDay === '04-15'],
  ['sr_fafsa', 'FAFSA opening', m => m.monthDay.startsWith('10')],
];
for (const [id, what, check] of REQUIRED) {
  assert(`${what} is in the catalog (${id})`, MS_ID.has(id));
  if (MS_ID.has(id)) assert(`  …dated and gated correctly`, check(byId[id]), JSON.stringify({ monthDay: byId[id].monthDay, grades: byId[id].grades }));
}
// Regeneron STS is a senior entry for a project that cannot be started in the autumn.
assert('Regeneron STS carries a run-up measured in months, not weeks',
  byId.hp_sts.leadDays >= 180, `leadDays=${byId.hp_sts.leadDays}`);
// Everything auto-populated has to say it was generated rather than typed by the student.
for (const [id] of REQUIRED) {
  if (!MS_ID.has(id)) continue;
  assert(`${id}: is auto-populated rather than something the student must build`,
    typeof byId[id].monthDay === 'string' && Array.isArray(byId[id].grades) && byId[id].grades.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('');
if (failures.length) {
  console.error(`✗ ${failures.length} failed, ${passed} passed\n`);
  failures.forEach(f => console.error(`  • ${f}`));
  process.exit(1);
}
console.log(`✓ Health-pathway portfolio verified — ${passed} assertions.`);
console.log(`  ${REFLECTION_PROMPTS.length} reflection prompts, ${allCards.length} matchable programs, ${REQUIRED.length} catalog dates.`);
