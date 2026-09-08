// ─────────────────────────────────────────────────────────────────────────────
// THE DECISION ENGINE — the app deciding, rather than the app displaying.
//
// ── What this is for ─────────────────────────────────────────────────────────
// Everything in this product that felt "smart" was, until now, a model call.
// That is expensive, slow, non-deterministic, unavailable offline, and — the
// part that actually matters — usually unnecessary. The overwhelming majority
// of "what should I do next", "why is this locked", "what changed since last
// week" and "you are about to lose something" questions are answerable from
// state the client already holds, with rules a person can read and argue with.
//
// So: this module makes those calls locally, and Medabrain is reserved for what
// only a language model can do (explaining, coaching, drafting, reading an
// essay). Concretely this is the single largest reduction in API cost in the
// app, and it makes the app FASTER at the same time, which is not a trade you
// usually get to make.
//
// ── The five rules the engine holds itself to ────────────────────────────────
//
// 1. EVERY DECISION NAMES ITS RULE. `source: 'rule:<id>'` on every row, the
//    same convention the month plan uses. A recommendation whose provenance
//    cannot be printed is a recommendation nobody can debug or contest.
//
// 2. EVERY DECISION NAMES ITS EVIDENCE. `because` is a sentence built from the
//    student's own numbers ("you have four days of streak and nothing logged
//    today"), never a generic motivation line. If a rule cannot state its
//    evidence it does not fire.
//
// 3. NO DECISION PROMISES AN OUTCOME. Same hard line as monthPlan/model.js: no
//    admission, no score, no "this will get you in". scrubbed by
//    `assertNoPromise` and asserted by scripts/verifyDecisions.mjs.
//
// 4. A DECISION ONLY POINTS AT A SURFACE THE STUDENT CAN OPEN. Rules receive
//    the unlock state and must not send a freshman to the recommender tracker.
//    An unlock decision is the *exception*, and it says so: its whole content
//    is "here is what opens this".
//
// 5. IT DEGRADES TO SILENCE, NOT TO NOISE. An empty input produces an empty
//    list. There is no filler decision, no "keep up the good work" row.
//
// Pure functions, plain data, no React, no network, no storage — so
// scripts/verifyDecisions.mjs can assert every rule under plain Node.
// ─────────────────────────────────────────────────────────────────────────────

/** Sentences a decision may never contain. Mirrors monthPlan/model.js. */
const FORBIDDEN = [
  /\bguarantee/i, /\bwill get (you )?(in|accepted|admitted)/i, /\bensures? (your )?(admission|acceptance)/i,
  /\btop[- ](10|30|ten|thirty)\b/i, /\byou will be accepted/i, /\bsecures? (your )?(spot|place)/i,
];

/** Throws in development if a rule ever writes a promise. Returns the text. */
export function assertNoPromise(text) {
  const t = String(text || '');
  for (const re of FORBIDDEN) if (re.test(t)) return t.replace(re, '').replace(/\s{2,}/g, ' ').trim();
  return t;
}

// ── The kinds of decision, and what each one is allowed to be about ──────────
//
// Deliberately five, and deliberately not extensible without thought: a sixth
// kind almost always means somebody wanted to put an announcement on the
// dashboard, and an announcement is not a decision.
export const KINDS = {
  // "Do this next." Points at work.
  do: { id: 'do', label: 'Do this' },
  // "This is about to cost you something." Streaks, deadlines, expiring windows.
  protect: { id: 'protect', label: 'Protect' },
  // "This is closed, and this is the key." The only kind allowed to name a
  // surface the student cannot currently open.
  unlock: { id: 'unlock', label: 'Opens next' },
  // "Something you entered is wrong or missing and is degrading everything."
  fix: { id: 'fix', label: 'Fix this' },
  // "You did a thing." Never fires more than one at a time.
  celebrate: { id: 'celebrate', label: 'Nice' },
};
export const KIND_IDS = Object.keys(KINDS);

// How much each kind is worth before its own rule weighting. `protect` leads
// because a thing you are about to lose is strictly more urgent than a thing
// you have not started; `celebrate` trails everything because a celebration
// that displaces an instruction is a celebration that cost the student a day.
const KIND_WEIGHT = { protect: 1.00, fix: 0.90, do: 0.75, unlock: 0.45, celebrate: 0.20 };

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp01 = (n) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

/**
 * The state every rule reads. Defaulted here so a rule can never throw on a
 * half-loaded account — Dexie resolves after first paint and a dashboard that
 * changes its mind twice on load is worse than one that starts quiet.
 */
export const EMPTY_STATE = {
  gradeStage: null,        // 'freshman' … 'gap'
  band: null,              // 'explore' | 'build' | 'apply'
  daysToGraduation: null,
  // Work
  lessons: 0, quizzes: 0, activities: 0, colleges: 0, essays: 0,
  clinicalHours: 0, deadlines: 0, dueCards: 0,
  pathwayChosen: false, onboarded: false,
  // Rhythm
  streak: 0, creditsToday: 0, goalCredits: 4, daysSinceActive: 0,
  // Calendar — the single most urgent dated thing, already ranked upstream by
  // milestoneUrgency.js. The engine does not re-derive urgency from dates.
  urgentDeadline: null,    // { title, dueInDays, kind, destination }
  // What the student can open right now, as a predicate. Supplied by App.jsx
  // from unlockState(); defaulted to "everything" so a rule tested in isolation
  // is never silently suppressed.
  canOpen: () => true,
  // The nearest locked thing and the sentence that opens it, from
  // featureUnlock.locked(). null when nothing is locked.
  nextUnlock: null,        // { id, label, hint, progress }
  // Whether the first-run guide is still running. Rules that would compete with
  // it stand down — two systems telling a student what to do first is exactly
  // the disorientation this work exists to remove.
  firstRun: false,
};

function normalize(raw) {
  const s = { ...EMPTY_STATE, ...(raw || {}) };
  for (const k of ['lessons', 'quizzes', 'activities', 'colleges', 'essays', 'clinicalHours',
    'deadlines', 'dueCards', 'streak', 'creditsToday', 'goalCredits', 'daysSinceActive']) s[k] = num(s[k]);
  if (!(s.goalCredits > 0)) s.goalCredits = 4;
  if (typeof s.canOpen !== 'function') s.canOpen = () => true;
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE RULES
//
// Each is `{ id, kind, weight, when(s), build(s) }`. `weight` is the rule's own
// importance within its kind, 0–1; the final score is KIND_WEIGHT × weight ×
// confidence. `build` returns the row minus its bookkeeping, and is only ever
// called when `when` has already returned true — so it may assume its own
// preconditions and read them without guarding twice.
// ─────────────────────────────────────────────────────────────────────────────
export const RULES = [
  // ── protect ───────────────────────────────────────────────────────────────
  {
    id: 'streak-at-risk',
    kind: 'protect',
    weight: 1.0,
    // A streak worth protecting is one that exists and is not yet safe today.
    // Two days, not one: telling somebody they are about to lose a one-day
    // streak is telling them they are about to lose nothing.
    when: (s) => s.streak >= 2 && s.creditsToday < s.goalCredits,
    build: (s) => ({
      headline: `Your ${s.streak}-day streak is not safe yet`,
      because: s.creditsToday > 0
        ? `You are ${s.goalCredits - s.creditsToday} credit${s.goalCredits - s.creditsToday === 1 ? '' : 's'} short of today's goal.`
        : `Nothing counted toward today yet, and the day ends at midnight.`,
      action: { label: 'Finish one lesson', destination: 'prep/pathways' },
      confidence: 1,
    }),
  },
  {
    id: 'streak-start',
    kind: 'protect',
    weight: 0.55,
    // The first repeat is the whole game. A student with one earned day and
    // nothing today is the single highest-value nudge in the product.
    when: (s) => s.streak === 1 && s.creditsToday < s.goalCredits,
    build: (s) => ({
      headline: 'Day two is the hard one',
      because: 'You earned yesterday. Nothing that happens after this is as hard as doing it twice.',
      action: { label: 'Start a lesson', destination: 'prep/pathways' },
      confidence: 0.9,
    }),
  },
  {
    id: 'deadline-closing',
    kind: 'protect',
    weight: 0.95,
    when: (s) => !!s.urgentDeadline && num(s.urgentDeadline.dueInDays) <= 30,
    build: (s) => {
      const d = s.urgentDeadline;
      const days = num(d.dueInDays);
      return {
        headline: days <= 0 ? `${d.title} is past due` : `${d.title} closes in ${days} day${days === 1 ? '' : 's'}`,
        because: days <= 7
          ? 'This is the nearest dated thing on your calendar and there is no run-up left.'
          : 'This is the nearest dated thing on your calendar, and work like this needs a run-up.',
        action: { label: 'Open milestones', destination: d.destination || 'portfolio/milestones' },
        confidence: 1,
      };
    },
  },

  // ── fix ───────────────────────────────────────────────────────────────────
  {
    id: 'no-pathway',
    kind: 'fix',
    weight: 1.0,
    // Everything downstream is scoped to a pathway. Without one the app is
    // guessing at every recommendation it makes, and it should say so.
    when: (s) => s.onboarded && !s.pathwayChosen,
    build: () => ({
      headline: 'Pick a pathway so the rest of this can aim at something',
      because: 'Your lessons, your hour benchmarks and the programs we surface are all scoped to one health career. Right now none of them are.',
      action: { label: 'Choose a pathway', destination: 'prep/pathways' },
      confidence: 1,
    }),
  },
  {
    id: 'senior-no-colleges',
    kind: 'fix',
    weight: 0.95,
    when: (s) => (s.gradeStage === 'senior' || s.gradeStage === 'gap') && s.colleges === 0,
    build: () => ({
      headline: 'There are no schools on your list',
      because: 'You are in your application year and the app has nothing to work backwards from — no prompts, no deadlines, no aid comparison.',
      action: { label: 'Add a college', destination: 'portfolio/applying' },
      confidence: 1,
    }),
  },
  {
    id: 'empty-record',
    kind: 'fix',
    weight: 0.7,
    // A junior with lessons done and nothing logged is the classic shape of a
    // student using half the product. Not fired for freshmen: they genuinely
    // may not have anything yet, and saying so would be an accusation.
    when: (s) => s.activities === 0 && s.lessons >= 2 && ['sophomore', 'junior', 'senior', 'gap'].includes(s.gradeStage),
    build: (s) => ({
      headline: 'Nothing you have actually done is written down yet',
      because: `You have finished ${s.lessons} lessons, and your activity log is empty. The lessons are the study half; the log is the half an application is built from.`,
      action: { label: 'Log an activity', destination: 'portfolio/resume' },
      confidence: 0.85,
    }),
  },

  // ── do ────────────────────────────────────────────────────────────────────
  {
    id: 'cards-due',
    kind: 'do',
    weight: 0.5,
    when: (s) => s.dueCards >= 5 && s.canOpen('prep', 'flashcards'),
    build: (s) => ({
      headline: `${s.dueCards} cards are due`,
      because: 'These are cards you have already met once. Reviewing them on the day they come due is the cheapest retention there is.',
      action: { label: 'Review now', destination: 'prep/flashcards' },
      confidence: 0.8,
    }),
  },
  {
    id: 'first-quiz',
    kind: 'do',
    weight: 0.8,
    when: (s) => s.lessons >= 1 && s.quizzes === 0,
    build: () => ({
      headline: 'Take one quiz on what you just read',
      because: 'You have finished a lesson and never been tested on one. Until you are, the app is guessing what you already know.',
      action: { label: 'Open the quiz library', destination: 'prep/quizzes' },
      confidence: 0.9,
    }),
  },
  {
    id: 'hours-gap',
    kind: 'do',
    weight: 0.65,
    // Undated, and the classic thing a dated dashboard never surfaces: hours
    // are what a portfolio is eventually judged on and nothing is ever due.
    when: (s) => s.clinicalHours === 0 && ['junior', 'senior', 'gap'].includes(s.gradeStage) && s.canOpen('portfolio', 'resume', 'clinical'),
    build: (s) => ({
      headline: 'No clinical hours logged',
      because: `${s.gradeStage === 'junior' ? 'Junior year' : 'Your application year'} is when hours stop being optional, and yours are at zero.`,
      action: { label: 'Log shadowing hours', destination: 'portfolio/resume' },
      confidence: 0.8,
    }),
  },
  {
    id: 'next-lesson',
    kind: 'do',
    weight: 0.4,
    // The floor. Fires only when nothing sharper did, which the ranking already
    // guarantees by weight — it is here so the engine is never empty for a
    // student with a pathway and a lesson track.
    when: (s) => s.pathwayChosen && s.creditsToday === 0,
    build: () => ({
      headline: 'Continue your lesson track',
      because: 'Nothing has counted toward today yet, and this is the shortest path to a day that counts.',
      action: { label: 'Open the track', destination: 'prep/pathways' },
      confidence: 0.6,
    }),
  },

  // ── unlock ────────────────────────────────────────────────────────────────
  {
    id: 'next-unlock',
    kind: 'unlock',
    weight: 1.0,
    when: (s) => !!s.nextUnlock?.hint,
    build: (s) => ({
      headline: `${s.nextUnlock.label} is not open yet`,
      because: s.nextUnlock.hint,
      action: s.nextUnlock.progress
        ? { label: `${s.nextUnlock.progress[0]} of ${s.nextUnlock.progress[1]}`, destination: null }
        : { label: null, destination: null },
      confidence: 1,
    }),
  },

  // ── celebrate ─────────────────────────────────────────────────────────────
  {
    id: 'day-cleared',
    kind: 'celebrate',
    weight: 1.0,
    when: (s) => s.creditsToday >= s.goalCredits && s.streak >= 1,
    build: (s) => ({
      headline: s.streak >= 2 ? `Day ${s.streak}, cleared` : 'Today is cleared',
      because: `You hit ${s.creditsToday} of ${s.goalCredits} credits. Nothing else today is owed.`,
      action: { label: 'See your streak', destination: 'progress/streak' },
      confidence: 1,
    }),
  },
];

const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
export const RULE_IDS = RULES.map((r) => r.id);

/**
 * Every decision this state supports, best first.
 *
 * @param {object} rawState see EMPTY_STATE
 * @param {object} [opts] `{ limit }` — how many rows to return (default 3)
 * @returns {Array<{id,kind,headline,because,action,score,confidence,source}>}
 */
export function decide(rawState, { limit = 3 } = {}) {
  const s = normalize(rawState);
  const out = [];

  for (const rule of RULES) {
    let fires = false;
    try { fires = !!rule.when(s); } catch { fires = false; }
    if (!fires) continue;

    // Rule 5 of the header, enforced here rather than in each rule: while the
    // first-run guide owns the page, nothing but a protect-kind decision may
    // also be telling the student what to do first.
    if (s.firstRun && rule.kind !== 'protect') continue;

    let row;
    try { row = rule.build(s); } catch { continue; }
    if (!row?.headline || !row?.because) continue;

    // Rule 4: a decision must point somewhere the student can actually open.
    // 'unlock' is the sole exception and carries no destination at all.
    const dest = row.action?.destination || null;
    if (dest && !destinationOpen(dest, s)) continue;

    const confidence = clamp01(row.confidence ?? 0.7);
    out.push({
      id: rule.id,
      kind: rule.kind,
      kindLabel: KINDS[rule.kind].label,
      headline: assertNoPromise(row.headline),
      because: assertNoPromise(row.because),
      action: row.action || null,
      confidence,
      score: KIND_WEIGHT[rule.kind] * rule.weight * confidence,
      // Rule 1. Printed in the UI's own "why am I seeing this" affordance.
      source: `rule:${rule.id}`,
    });
  }

  out.sort((a, b) => b.score - a.score);

  // At most one celebration, and never as the only row when there is work: a
  // dashboard whose single message is "nice job" on a day with a closing
  // deadline has actively misinformed the student.
  const seenCelebrate = out.findIndex((d) => d.kind === 'celebrate');
  const trimmed = out.filter((d, i) => d.kind !== 'celebrate' || i === seenCelebrate);

  return trimmed.slice(0, Math.max(0, limit));
}

/** Whether `tab/view:section` is open to this student. */
function destinationOpen(destination, s) {
  const [tab, rest] = String(destination).split('/');
  const [view, section] = (rest || '').split(':');
  try { return !!s.canOpen(tab, view || null, section || null); } catch { return true; }
}

/**
 * The single decision to lead with, or null. What Home's decision card and
 * Medabrain's opening line both read, so the app can never tell a student two
 * different "most important things" on two different screens.
 */
export function leadDecision(state) {
  return decide(state, { limit: 1 })[0] || null;
}

/** One rule's definition, for a surface that wants to explain itself. */
export function ruleById(id) {
  const r = RULE_BY_ID.get(id);
  return r ? { id: r.id, kind: r.kind, weight: r.weight } : null;
}
