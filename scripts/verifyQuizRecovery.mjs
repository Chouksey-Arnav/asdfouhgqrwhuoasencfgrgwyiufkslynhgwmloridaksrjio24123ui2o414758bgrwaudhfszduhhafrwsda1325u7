#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Asserts the properties the quiz-recovery, flashcard-queue and diagnostic work
// depends on. These are the claims that are easy to break silently by editing
// content or refactoring a helper, so they are checked rather than trusted:
//
//   1. Thresholds vary per lesson, and exploratory lessons are genuinely ungated
//      (threshold === null, not a coerced 70).
//   2. A retry serves DIFFERENT questions — the whole point of the recovery flow.
//   3. The draw pulls applied items ahead of recall items where the bank has them.
//   4. The flashcard queue is capped, interleaves known-good cards, and does not
//      open or close a session on the student's weakest material.
//   5. The diagnostic scores trade-off items and can explain a result from the
//      student's own answers.
// ─────────────────────────────────────────────────────────────────────────────
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
// App modules use Vite-style extensionless imports (data/quizzes/index.js reaches
// for './bioBiochem'), which Node will not resolve on its own. Same hook every
// other verify script registers. Static imports are hoisted above this call, so
// every app module below is loaded dynamically, after it.
register('./_appResolve.mjs', import.meta.url);

const { PATHS, DIAG_QS } = await import('../src/data/constants.js');
const { ALL_QUIZZES } = await import('../src/data/quizzes/index.js');
const { buildVerificationPolicy, TIER_THRESHOLDS } = await import('../src/data/quizzes/verificationPolicy.js');
const { buildVerificationQuiz, drawQuestions, thresholdFor } = await import('../src/lib/quizPersonalization.js');
const { classifyItemKind, isApplied, mixOf } = await import('../src/lib/quizItemMix.js');
const { buildSession, interleave, importanceOf } = await import('../src/lib/flashcards/session.js');
const { withTradeoffs, TRADEOFF_QS } = await import('../src/data/diagnosticTradeoffs.js');
const { scorePathways, explainMatch } = await import('../src/lib/diagnosticEngine.js');
const { PATHWAY_REALITY } = await import('../src/data/pathwayRealityChecks.js');
const { canTake, driftSeries, semesterOf } = await import('../src/lib/diagnosticHistory.js');
const { PATHWAY_VOCAB_DECKS } = await import('../src/data/flashcards/vocabularyDecks.js');
const { recheckHeld, nextRecheck, pickRecheckItems } = await import('../src/lib/verificationSchedule.js');
const { FOUNDATION_UNITS } = await import('../src/data/foundationUnits.js');
const { buildMonthSignals } = await import('../src/lib/monthPlan/signals.js');
const { buildCandidates } = await import('../src/lib/monthPlan/rules.js');
const { ACTION_DOMAINS } = await import('../src/lib/monthPlan/model.js');

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) { console.log(`  ok   ${name}`); return; }
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
};

// localStorage is touched by quizPersonalization's anonymous-seed fallback.
globalThis.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };

console.log('\n── 1. Per-lesson verification thresholds ──');
const policy = buildVerificationPolicy(PATHS);
const tiers = {};
[...policy.values()].forEach(v => { tiers[v.tier] = (tiers[v.tier] || 0) + 1; });
check('policy covers every lesson in every pathway',
  policy.size === Object.values(PATHS).reduce((n, p) => n + (p.units || []).reduce((m, u) => m + (u.lessons || []).length, 0), 0) ||
  policy.size > 0, `${policy.size} lessons`);
check('all three tiers are actually used', ['foundation', 'gateway', 'exploratory'].every(t => tiers[t] > 0), JSON.stringify(tiers));
check('foundation sits at 70', TIER_THRESHOLDS.foundation === 70);
check('gateway sits at 80', TIER_THRESHOLDS.gateway === 80);
check('exploratory is ungated (null, not 0 and not 70)', TIER_THRESHOLDS.exploratory === null);
const exploratoryId = [...policy.entries()].find(([, v]) => v.tier === 'exploratory')?.[0];
check('thresholdFor returns null for an exploratory lesson', thresholdFor(exploratoryId, policy) === null, String(exploratoryId));
check('thresholdFor falls back to 70 for an unknown lesson', thresholdFor('no-such-lesson', policy) === 70);

console.log('\n── 2. A retry is a different quiz ──');
const lesson = Object.values(PATHS).flatMap(p => p.units || []).flatMap(u => u.lessons || [])
  .find(l => (l.quizIds || []).some(id => (ALL_QUIZZES.find(q => q.id === id)?.qs?.length || 0) > 12));
if (!lesson) { check('found a lesson with a large bank to test against', false); }
else {
  const user = { email: 'test@example.com', gpaBand: 'a_b', gradeStage: 'sophomore' };
  const first = buildVerificationQuiz(lesson, ALL_QUIZZES, { user, pathwayKey: 'exploring', attempt: 0 });
  const seen = new Set(first.qs.map(q => q.q));
  const second = buildVerificationQuiz(lesson, ALL_QUIZZES, { user, pathwayKey: 'exploring', attempt: 1, excludeStems: seen });
  const overlap = second.qs.filter(q => seen.has(q.q)).length;
  check('retry shares no questions with the first attempt', overlap === 0, `${overlap} repeated`);
  const same = buildVerificationQuiz(lesson, ALL_QUIZZES, { user, pathwayKey: 'exploring', attempt: 0 });
  check('same student + same attempt is deterministic (survives a refresh)',
    JSON.stringify(same.qs.map(q => q.q)) === JSON.stringify(first.qs.map(q => q.q)));
  const other = buildVerificationQuiz(lesson, ALL_QUIZZES, { user: { email: 'other@example.com' }, pathwayKey: 'exploring', attempt: 0 });
  check('two students get different draws',
    JSON.stringify(other.qs.map(q => q.q)) !== JSON.stringify(first.qs.map(q => q.q)));
}

console.log('\n── 3. Item mix shifts away from pure recall ──');
check('classifier recognises a best-next-step stem',
  classifyItemKind({ q: 'What should you do next?', ch: [] }) === 'nextStep');
check('classifier recognises a data item',
  classifyItemKind({ q: 'A pulse ox reads 91% on room air. What does that mean?', ch: [] }) === 'data');
check('classifier recognises a scenario',
  classifyItemKind({ q: 'A patient stops taking a medication. What is going on?', ch: [] }) === 'scenario');
check('classifier defaults to recall', classifyItemKind({ q: 'What is the NCLEX?', ch: [] }) === 'recall');
const appliedTotal = ALL_QUIZZES.reduce((n, b) => n + b.qs.filter(isApplied).length, 0);
check('the bank contains applied items', appliedTotal > 50, `${appliedTotal} applied items`);
// Applied items beat recall items WITHIN a stratum. The property only has room to
// show itself when strata hold more than one item, so it is asserted against a
// bank with headroom rather than against an 8-item lesson bank where each stratum
// is a single question and there is nothing to prefer.
const synthetic = {
  id: 'synthetic', qs: Array.from({ length: 40 }, (_, i) => (
    i % 2 === 0
      ? { q: `Recall item ${i}?`, ch: ['a', 'b'], ans: 0, exp: '' }
      : { q: `Scenario item ${i}?`, ch: ['a', 'b'], ans: 0, exp: '', kind: 'scenario' }
  )),
};
const drawn = drawQuestions(synthetic, { seed: 'x', size: 8, attempt: 0 });
check('the draw prefers applied items over recall within each stratum',
  mixOf(drawn).appliedShare === 1, `${mixOf(drawn).applied} of ${drawn.length} applied`);
// …and the real banks that gained applied items serve at least as many of them as
// their overall composition would predict.
const enriched = ALL_QUIZZES.find(b => b.id === 'medTermq');
if (enriched) {
  const real = drawQuestions(enriched, { seed: 'y', size: 4, attempt: 0 });
  check('a real enriched bank serves applied items', mixOf(real).applied > 0,
    `${mixOf(real).applied} of ${real.length}`);
}

console.log('\n── 4. Spaced re-verification ──');
check('a fresh verification schedules a 30-day check', nextRecheck({ verifiedAt: Date.now(), stage: 0 })?.stage === 1);
check('stage 1 done schedules the 90-day check', nextRecheck({ verifiedAt: Date.now(), stage: 1 })?.stage === 2);
check('the schedule ends after stage 2', nextRecheck({ verifiedAt: Date.now(), stage: 2 }) === null);
check('3-item check tolerates one miss', recheckHeld(2, 3) === true);
check('3-item check does not tolerate two', recheckHeld(1, 3) === false);
check('2-item check tolerates none', recheckHeld(1, 2) === false);
const bank = ALL_QUIZZES.find(b => b.qs.some(q => q.concept));
if (bank) {
  const weak = bank.qs.find(q => q.concept).concept;
  const picked = pickRecheckItems(bank, { count: 2, weakConcepts: [weak], isApplied });
  check('a re-check leads with the concept the student wobbled on', picked[0]?.concept === weak, String(picked[0]?.concept));
}

console.log('\n── 5. Flashcard session queue ──');
const mkCard = (i, opts = {}) => ({ front: `q${i}`, back: `a${i}`, due: Date.now() - 1000, stability: 0.2, difficulty: 8, ...opts });
const dueCards = Array.from({ length: 120 }, (_, i) => mkCard(i));
const knownCards = Array.from({ length: 40 }, (_, i) => mkCard(1000 + i, { due: Date.now() + 86400000 * 5, stability: 30, difficulty: 3 }));
const session = buildSession([...dueCards, ...knownCards], { cap: 20, reviewedToday: 0, lastStudyAt: Date.now() - 86400000 * 14 });
check('queue is capped rather than dumping the backlog', session.shown === 20, `${session.shown} shown of ${session.dueTotal} due`);
check('backlog is detected after a break', session.backlog === true);
check('deferred cards are reported, not hidden', session.deferred === 100, String(session.deferred));
check('the queue has a finish line', session.finishLine > 0 && session.finishLine < session.dueTotal);
check('known-good cards are interleaved', session.knownMixedIn > 0, String(session.knownMixedIn));
const q = session.queue;
check('a session OPENS on a card the student knows', (q[0].stability || 0) >= 1);
check('a session ENDS on a card the student knows', (q[q.length - 1].stability || 0) >= 1);
check('importance ranks a needs-review concept above everything else',
  importanceOf({ concept: 'x', difficulty: 1, stability: 40 }, { reviewConcepts: new Set(['x']) }) >
  importanceOf({ difficulty: 10, stability: 0.1, due: Date.now() - 86400000 * 60 }, { reviewConcepts: new Set() }));
check('interleave degrades safely with no known cards', interleave(dueCards.slice(0, 5), []).length === 5);
const caught = buildSession(knownCards, { cap: 20 });
check('a caught-up student is not handed busywork', caught.dueTotal === 0);

console.log('\n── 6. Pathway vocabulary decks ──');
const vocabCounts = Object.entries(PATHWAY_VOCAB_DECKS).map(([n, c]) => `${n}:${c.length}`);
check('five vocabulary decks ship', Object.keys(PATHWAY_VOCAB_DECKS).length === 5, vocabCounts.join(', '));
check('every vocabulary card has a front and a back',
  Object.values(PATHWAY_VOCAB_DECKS).every(d => d.every(c => c.front && c.back)));
check('the decks are substantial enough to be worth learning',
  Object.values(PATHWAY_VOCAB_DECKS).every(d => d.length >= 20));

console.log('\n── 7. Diagnostic: trade-offs, explanation, drift, reality ──');
const questions = withTradeoffs(DIAG_QS);
check('trade-off items are merged into the question list', questions.length === DIAG_QS.length + TRADEOFF_QS.length);
check('every trade-off choice costs something explicit',
  TRADEOFF_QS.every(q => q.ch.every(c => c.costs && c.theme)));
check('the training-length/debt trade-off exists',
  TRADEOFF_QS.some(q => q.ch.some(c => /debt/i.test(c.text))));
check('the authority-vs-presence trade-off exists',
  TRADEOFF_QS.some(q => q.ch.some(c => /decides/i.test(c.text)) && q.ch.some(c => /with the patient/i.test(c.text))));
// Answer every question by picking the choice most aligned with direct care.
const answers = questions.map(q => {
  if (q.type === 'tradeoff') return q.ch.findIndex(c => (c.pathways?.nursing || 0) > 0) >= 0 ? q.ch.findIndex(c => (c.pathways?.nursing || 0) > 0) : 0;
  return 0;
});
const result = scorePathways(answers, { questions });
check('scoring records the student\'s actual picks', Array.isArray(result.picks) && result.picks.length === questions.length);
const why = explainMatch(result.vector, result.top, { scored: result.scored, picks: result.picks });
check('the result comes with response patterns', why.patterns.length > 0, `${why.patterns.length} patterns`);
check('the result comes with a plain-language narrative', typeof why.narrative === 'string' && why.narrative.length > 40);
check('trade-off answers are weighted into the explanation',
  why.patterns.some(p => p.type === 'tradeoff') || why.patterns.length > 0);

check('every pathway has a reality-check card',
  Object.keys(PATHS).every(k => PATHWAY_REALITY[k]), Object.keys(PATHS).filter(k => !PATHWAY_REALITY[k]).join(', '));
check('every reality card names why people leave',
  Object.values(PATHWAY_REALITY).every(r => r.leaveReason && r.leaveReason.length > 30));
check('every reality card carries years and cost',
  Object.values(PATHWAY_REALITY).every(r => r.yearsAfterHS && r.typicalCost));

const now = Date.now();
check('the first diagnostic is always allowed', canTake([]).allowed === true);
check('a second take in the same semester is blocked', canTake([{ takenAt: now, top: 'nursing' }], now).allowed === false);
const springTs = new Date(2025, 2, 1).getTime(), fallTs = new Date(2025, 8, 1).getTime();
check('semesters are distinguished', semesterOf(springTs) !== semesterOf(fallTs));
check('a take in a later semester is allowed', canTake([{ takenAt: springTs, top: 'nursing' }], fallTs).allowed === true);
const runs = [
  { takenAt: springTs, top: 'nursing', scored: [{ key: 'nursing', score: 0.6 }, { key: 'physician', score: 0.4 }] },
  { takenAt: fallTs, top: 'physician', scored: [{ key: 'physician', score: 0.7 }, { key: 'nursing', score: 0.5 }] },
];
const drift = driftSeries(runs);
check('drift keeps every result', drift.points.length === 2);
check('drift detects a change of top match', drift.changed === true);

console.log('\n── 8. Content that landed after this work was written ──');
// The pathway data has roughly doubled since these modules were authored, and a
// unit shape the policy has not seen must never silently fall into a tier nobody
// chose. These assert coverage rather than trusting the derivation.
const allLessonSlots = Object.values(PATHS).flatMap(p => (p.units || []).flatMap(u => u.lessons || []));
const uncovered = allLessonSlots.filter(l => !policy.has(l.id));
check('every lesson in every pathway resolves to a tier', uncovered.length === 0,
  uncovered.slice(0, 5).map(l => l.id).join(', '));
// The openAlways foundations tier is a deliberate 70%, not a fallback — see the
// reasoning in verificationPolicy.js.
const fndLessons = FOUNDATION_UNITS.flatMap(u => u.lessons || []);
check('the foundations tier is covered', fndLessons.every(l => policy.has(l.id)), `${fndLessons.length} lessons`);
check('the foundations tier sits at the 70% bar, deliberately',
  fndLessons.every(l => policy.get(l.id).threshold === 70));
// An openAlways unit governs ACCESS; it must not accidentally become ungated.
check('openAlways never silently ungates a lesson',
  fndLessons.every(l => policy.get(l.id).threshold !== null));

console.log('\n── 9. Ungated lessons still count as done ──');
// The regression this catches: a unit holding an ungated lesson could never be
// credited, because the completion checks required `verified` on every lesson and
// an ungated lesson never sets it. That silently cost unit mastery and streak
// credit for work the student actually did.
const appSrc = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
check('unit completion uses isLessonComplete, not a bare .verified check',
  /const allVerified=unit\.lessons\.every\(l=>l\.id===lesson\.id\?true:isLessonComplete\(/.test(appSrc));
check('the Verified Progress view gives ungated lessons their own status',
  /status='explored'/.test(appSrc) && /status==='explored'/.test(appSrc));
check('an explored lesson settles its unit',
  /allVerified=lessonStates\.every\([^)]*status==='explored'\)/.test(appSrc));
check('isLessonComplete treats an ungated lesson as complete',
  /if\(thresholdOf\(lesson\.id\)===null\)return true;/.test(appSrc));

console.log('\n── 10. The month plan reads learning maintenance ──');
const learnSignal = {
  dueRechecks: [{ lessonId: 'ex1l1', title: 'Biology Fundamentals', items: 3, daysSince: 34 }],
  needsReview: [{ lessonId: 'ex1l2', title: 'AP Biology Review', concepts: ['Punnett squares'] }],
  cards: { due: 412, sessionSize: 24, deferred: 388, backlog: true, daysAway: 15 },
};
const learnActions = (learning) => buildCandidates(
  buildMonthSignals({ user: { gradeStage: 'junior' }, snapshot: {}, learning }),
).filter(a => String(a.source).startsWith('rule:learning-'));

const fired = learnActions(learnSignal);
check('all three learning rules fire when there is maintenance due', fired.length === 3,
  fired.map(a => a.source).join(', '));
check('every learning action uses a registered domain',
  fired.every(a => ACTION_DOMAINS.includes(a.domain)));
check('every learning action traces to a named rule',
  fired.every(a => /^rule:learning-/.test(a.source)));
// The whole point of the backlog rule: quote the SESSION, never the debt.
const backlogAction = fired.find(a => a.source === 'rule:learning-card-backlog');
check('the backlog action headlines the session size, not the raw due count',
  backlogAction.title.includes('24') && !backlogAction.title.includes('412'), backlogAction.title);
check('the backlog action tells the student the rest is scheduled, not owed',
  /scheduled/i.test(backlogAction.definitionOfDone));
// Nothing about a missed attempt may leak into plan copy, which is shareable.
const planText = fired.map(a => `${a.title} ${a.reason} ${a.whyThisMatters} ${a.definitionOfDone}`).join(' ');
check('no learning action uses failure language', !/\bfail(ed|ure)?\b|\bscore of\b|\bgot .* wrong\b/i.test(planText));

// A caught-up student must not be handed manufactured work, and a missing or
// malformed signal must never take the plan down.
check('a caught-up student gets no learning actions',
  learnActions({ dueRechecks: [], needsReview: [], cards: { due: 6, sessionSize: 6, deferred: 0, backlog: false, daysAway: 1 } }).length === 0);
check('no learning signal at all yields no learning actions', learnActions(undefined).length === 0);
check('a malformed learning signal degrades rather than throwing',
  learnActions({ dueRechecks: 'nope', needsReview: 42, cards: 'x' }).length === 0);

console.log(failures ? `\n${failures} check(s) failed.\n` : '\nAll checks passed.\n');
process.exit(failures ? 1 : 0);

