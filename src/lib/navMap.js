// ─────────────────────────────────────────────────────────────────────────────
// What every screen in the app is CALLED by the person looking for it.
//
// ── The problem this solves, stated exactly ─────────────────────────────────
// The app has a quick-jump palette (⌘K), and it worked by substring-matching
// the labels in the nav. That is fine for a student who already knows the name
// of the screen they want, and useless for everybody else — which is most
// people, most of the time, because the name of a screen is a decision the
// product made and the word in a student's head is a decision their life made.
//
// The gap is not small. Every one of these returned NOTHING before this file:
//
//   they type          they want                          the label is
//   ─────────────────────────────────────────────────────────────────────────
//   "deadlines"        Portfolio → Milestones             "Milestones"
//   "gpa"              Activities & Résumé → Academics    "Academics"
//   "fafsa"            Portfolio → Financial Aid          "Financial Aid"
//   "money"            Financial Aid / Scholarships       —
//   "shadowing"        Activities & Résumé → Clinical     "Clinical Hours"
//   "dark mode"        Settings → Appearance              "Appearance"
//   "parents"          Settings → Family Access           "Family Access"
//   "chatbot"          Prep → AI Coach                    "AI Coach"
//   "what do i do today"  Plans                           "Plans"
//
// A student who searches for the thing they need and is told "no matches — try
// a different word" does not try a different word. They conclude the app does
// not have it, and they are wrong, and nothing in the product will ever correct
// them. That is the most expensive kind of navigation failure there is, because
// it is invisible from the inside: the feature exists, it is finished, it is
// good, and it is unreachable.
//
// ── What this is, and what it deliberately is not ──────────────────────────
// It is a KEYWORD map, keyed by the same destination ids the router uses
// ('portfolio/milestones'), plus a small scorer over them. It is not a second
// nav: labels, icons, colours and order all still come from the NAV/*_SUBNAV
// arrays in App.jsx, which stay the single source of truth for what the nav
// looks like. This file only answers "what else might somebody call it".
//
// Every id here is asserted to name a real destination by
// scripts/verifyNavSearch.mjs, which also runs a list of real searches a
// student would type and fails the build if any of them stops finding the right
// screen. A keyword map with no gate on it rots the moment a view is renamed,
// and it rots silently — the search just quietly gets worse.
//
// ── Authoring rules ─────────────────────────────────────────────────────────
//  1. Keywords are what a STUDENT or a PARENT would type, in their words. Not
//     internal names, not feature names, not the words in the marketing.
//  2. Include the wrong-but-common word. People search for "resume" with no
//     accent, "recommendation letters" rather than "recommenders", "sat scores"
//     for a screen we call "Scores".
//  3. Do not repeat the label. The scorer already matches labels, and a keyword
//     that duplicates one is dead weight in a file whose whole value is the
//     words that are NOT the label.
//  4. Two or three words earn their place more than ten. A keyword that also
//     matches four other screens makes the search worse, not better.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * destination id → the other things it is called.
 *
 * Ids are `tab` or `tab/view`, matching src/lib/routes.js, with one extra shape
 * for the sections of Activities & Résumé (`portfolio/resume:clinical`) that are
 * a level below a sub-view and are real destinations the palette can open.
 */
export const NAV_KEYWORDS = {
  // ── Pillars ───────────────────────────────────────────────────────────────
  home: ['dashboard', 'start', 'today', 'front page'],
  sat: ['test prep', 'act', 'digital sat', 'exam prep', 'practice test', 'mock test', 'my score', 'desmos'],
  prep: ['study', 'lessons', 'learn', 'curriculum', 'course'],
  portfolio: ['application', 'tracker', 'my record', 'admissions'],
  roadmap: ['year plan', 'twelve months', 'what is coming', 'long term', 'the path'],
  plans: ['what do i do today', 'daily plan', 'schedule', 'my week', 'to do'],
  progress: ['stats', 'how am i doing', 'analytics', 'my numbers'],
  settings: ['preferences', 'options', 'account', 'configure'],

  // ── Prep ──────────────────────────────────────────────────────────────────
  'prep/diagnostic': ['which pathway', 'career quiz', 'what should i do', 'placement'],
  'prep/pathways': ['nursing', 'medicine', 'specialty', 'my track', 'career path', 'units'],
  'prep/quizzes': ['practice questions', 'test myself', 'mcq'],
  'prep/flashcards': ['anki', 'spaced repetition', 'memorise', 'memorize', 'revision cards'],
  'prep/coach': ['chatbot', 'ask a question', 'tutor', 'medabrain', 'help me understand'],
  'prep/library': ['videos', 'reading', 'resources', 'watch'],

  // ── Portfolio ─────────────────────────────────────────────────────────────
  'portfolio/opportunities:tracked': ['saved', 'bookmarks', 'watching', 'shortlist'],
  'portfolio/opportunities': ['programs', 'summer programs', 'internships', 'competitions', 'volunteering'],
  'portfolio/milestones': ['deadlines', 'due dates', 'calendar', 'important dates', 'timeline', 'when is it due'],
  'portfolio/applying:colleges': ['universities', 'schools', 'where to apply', 'reach safety', 'my list'],
  'portfolio/applying:essays': ['personal statement', 'writing', 'supplementals', 'common app essay', 'drafts'],
  'portfolio/applying:aid': ['fafsa', 'money', 'cost', 'paying for college', 'css profile', 'scholarships', 'grants'],
  // Activities & Résumé holds five sections. Three of them are destinations the
  // palette offers in their own right; the other two are reached by opening the
  // tab, so THEIR words live here, on the tab. A keyword pointing at a screen
  // nothing can open is the same dead end as no keyword at all.
  'portfolio/resume': [
    'cv', 'resume', 'activities list', 'extracurriculars', 'what i have done',
    'gpa', 'grades', 'transcript', 'class rank', 'honors', 'clubs', 'leadership',
  ],
  'portfolio/applying:recommenders': ['recommendation letters', 'letters of rec', 'teachers', 'who will write'],
  'portfolio/applying:interview': ['mock interview', 'practice talking', 'questions they ask'],
  'portfolio/applying:calc': ['my chances', 'will i get in', 'odds', 'admissions calculator'],
  // Every name students and parents actually use for this, including the wrong
  // ones. Someone searching "hpme" is looking for a program that closed in 2020
  // and needs to land on the screen that tells them so.
  'portfolio/applying:combined': [
    'bs/md', 'bsmd', 'ba/md', 'bamd', 'combined degree', 'direct admit', 'direct entry',
    'accelerated medical program', 'guaranteed medical school', 'seven year medical',
    'six year medical', 'plme', 'hpme', 'direct admit nursing', 'bsn direct',
    '0-6 pharmacy', 'pharmd direct', 'seven year dental', 'direct entry pa', '3+3 dpt',
  ],
  'portfolio/resume:clinical': ['shadowing', 'hospital hours', 'patient care', 'volunteering hours', 'cna'],
  'portfolio/resume:research': ['lab', 'publications', 'science fair', 'projects'],
  'portfolio/resume:credentials': ['certifications', 'cpr', 'first aid', 'licences', 'licenses'],

  // ── Roadmap ───────────────────────────────────────────────────────────────
  'roadmap/overview': ['what now', 'next thing', 'my thesis'],
  'roadmap/year': ['the path', 'the road', 'my whole year', 'when does it get busy', 'crunch'],
  'roadmap/climb': ['what do i get', 'is this worth it', 'my dream schools', 'application strength', 'progress toward college', 'trajectory', 'the payoff'],
  'roadmap/seasons': ['quarters', 'terms', 'chapters'],
  'roadmap/list': ['all items', 'full list', 'every deadline', 'filter'],
  'roadmap/intake': ['my answers', 'change my answers', 'redo the questions'],

  // ── Progress ──────────────────────────────────────────────────────────────
  'progress/streak': ['daily', 'calendar', 'consistency', 'do not break the chain'],
  'progress/quests': ['challenges', 'missions', 'daily tasks', 'rewards'],
  'progress/verified': ['proof', 'mastery', 'what i actually know'],
  'progress/performance': ['weak topics', 'scores by subject', 'what am i bad at'],
  'progress/achievements': ['badges', 'trophies', 'awards', 'unlocked'],

  // The SAT pillar's sub-views are sealed for v1 (src/lib/betaFlags.js): they
  // render behind a cover that cannot be clicked or tabbed into, so the palette
  // does not offer them and their words belong on the tab itself. A search for
  // "practice test" should land a student on the SAT tab, where the seal
  // explains itself — not on a screen they cannot use, and not on nothing.

  // ── Settings ──────────────────────────────────────────────────────────────
  'settings/profile': ['my name', 'grade', 'goals', 'change my year'],
  'settings/study': ['study time', 'how many hours', 'availability', 'pace'],
  'settings/family': ['parents', 'mum', 'mom', 'dad', 'guardian', 'share my progress', 'invite'],
  'settings/appearance': ['dark mode', 'light mode', 'theme', 'font size', 'accessibility', 'colours', 'colors', 'contrast'],
  'settings/medabrain': ['ai settings', 'voice', 'model', 'coach settings'],
  'settings/data': ['export', 'download my data', 'delete', 'privacy', 'sound'],
  'settings/account': ['password', 'email', 'log out', 'sign out', 'delete account'],
};

/** Every destination id this map speaks for. Used by the verify script. */
export const KEYWORD_IDS = Object.keys(NAV_KEYWORDS);

/**
 * Keywords for a destination, by the palette's command id.
 *
 * The palette's ids are prefixed ('port-milestones', 'nav-roadmap') because they
 * come from several arrays that would otherwise collide. This translates, so
 * App.jsx does not have to carry a second naming scheme in its head.
 */
export const keywordsFor = (destId) => NAV_KEYWORDS[destId] || [];

// ─────────────────────────────────────────────────────────────────────────────
// The scorer
// ─────────────────────────────────────────────────────────────────────────────

const normalise = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Is `query` a subsequence of `text` — i.e. do its letters appear in order?
 *
 * This is what makes "flshcrds" and "adm calc" find things, and it is the one
 * fuzzy rule worth having. Anything looser (edit distance, phonetics) starts
 * returning confident wrong answers, and a palette whose first result is wrong
 * is worse than one that returns nothing: the student has already pressed
 * Enter.
 */
function isSubsequence(query, text) {
  let i = 0;
  for (let j = 0; j < text.length && i < query.length; j += 1) {
    if (text[j] === query[i]) i += 1;
  }
  return i === query.length;
}

/**
 * How well one destination answers one query. 0 means "do not show this".
 *
 * The tiers are ordered by how sure we are, and the gaps between them are wide
 * on purpose: a label match must always outrank a keyword match, and a keyword
 * match must always outrank a fuzzy one, so that typing "essays" can never put
 * a screen that merely contains the letters e-s-s-a-y-s above the Essays tab.
 */
export function scoreDestination(query, { label = '', group = '', keywords = [] } = {}) {
  const q = normalise(query);
  if (!q) return 1;                       // no query: everything is equally shown
  const l = normalise(label);
  const g = normalise(group);

  if (l === q) return 1000;               // exactly what they typed
  if (l.startsWith(q)) return 900 - l.length;      // "ess" → "Essays", shortest label first
  if (l.includes(q)) return 700 - l.length;

  // A word inside the label starting with the query: "aid" → "Financial Aid".
  if (l.split(' ').some((w) => w.startsWith(q))) return 650 - l.length;

  for (const kw of keywords) {
    const k = normalise(kw);
    if (k === q) return 600;
    if (k.startsWith(q)) return 520;
    if (k.includes(q)) return 460;
    // The query is a phrase and the keyword is inside it: someone typing
    // "when is my essay due" should still reach Milestones on "due".
    if (q.includes(k) && k.length >= 4) return 430;
  }

  if (g.startsWith(q)) return 300;        // the group name — "portfolio" lists its screens
  if (g.includes(q)) return 240;

  // Fuzzy, last and lowest. Only over the label and only when the query is long
  // enough for a subsequence to mean anything — with two letters, everything is
  // a subsequence of everything.
  if (q.length >= 3 && isSubsequence(q.replace(/\s/g, ''), l.replace(/\s/g, ''))) return 120;
  for (const kw of keywords) {
    if (q.length >= 4 && isSubsequence(q.replace(/\s/g, ''), normalise(kw).replace(/\s/g, ''))) return 90;
  }
  return 0;
}

/**
 * Rank a list of destinations against a query.
 *
 * Stable within a score, so the nav's own order survives wherever the query
 * does not have an opinion — which is what stops the results reshuffling
 * distractingly as somebody types.
 */
export function searchNav(query, commands) {
  const scored = commands
    .map((cmd, i) => ({ cmd, i, score: scoreDestination(query, cmd) }))
    .filter((r) => r.score > 0);
  scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  return scored.map((r) => r.cmd);
}

// ─────────────────────────────────────────────────────────────────────────────
// Recently visited
// ─────────────────────────────────────────────────────────────────────────────

const RECENTS_KEY = 'msp_navRecents';
const RECENTS_MAX = 6;

/**
 * The last few screens this student was actually on.
 *
 * Shown at the top of the palette when nothing has been typed, because an empty
 * palette is a list of thirty-odd destinations in a fixed order, and the one a
 * person wants is overwhelmingly one of the handful they were just on. It costs
 * one line of storage and removes a scan of the whole list from the most common
 * interaction in the app.
 *
 * Deliberately per-device rather than synced: it is a convenience about this
 * browser session's habits, not a fact about the student worth carrying to
 * another machine.
 */
export function readRecents() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string').slice(0, RECENTS_MAX) : [];
  } catch { return []; }
}

export function pushRecent(destId) {
  if (!destId) return readRecents();
  try {
    const next = [destId, ...readRecents().filter((x) => x !== destId)].slice(0, RECENTS_MAX);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    return next;
  } catch { return readRecents(); }
}
