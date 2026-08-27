// ─────────────────────────────────────────────────────────────────────────────
// Searching the CONTENT, not only the nav.
//
// ── The problem this solves, stated exactly ─────────────────────────────────
// src/lib/navMap.js taught the quick-jump palette (⌘K) the words a student uses
// for a SCREEN. That fixed half of the navigation problem. This file fixes the
// other half, which is bigger, and which the nav map cannot touch no matter how
// many keywords it grows:
//
//     A student does not think in screens. They think in things.
//
// They do not want "Financial Aid". They want the Coca-Cola scholarship,
// because their counselor said the word "Coca-Cola" to them this morning. They
// do not want "Opportunities & Competitions" — they want Regeneron, or the
// Brain Bee, or the thing their friend called "the Stanford summer research
// one". They do not want "Combined degrees"; they want to know whether Drexel
// still runs its BS/MD and when it closes.
//
// Before this file, every one of those searches returned the same thing:
// nothing. And the app HAS all of it — nine hundred-odd real, curated,
// human-checked records across scholarships, opportunities, combined-degree
// programs, colleges, lessons and decks — sitting two to four taps down inside
// a sub-tab of a sub-tab, behind a second search box the student has to know
// exists before they can use it. Portfolio alone is five sub-tabs holding
// fifteen sections. That is not a discovery problem; it is a wall.
//
// So the palette now searches the library itself, and a hit does two things
// rather than one:
//
//   1. It NAVIGATES to the exact screen that holds the record — the right tab,
//      the right sub-tab, the right section of that sub-tab.
//   2. It FOCUSES the record when it gets there: the panel's own search box
//      arrives pre-filled, its filters reset so nothing hides the answer, the
//      card expanded and scrolled to with a brief highlight.
//
// Landing a student on the Financial Aid page and leaving them to find
// Coca-Cola among ninety cards is the wall again with an extra step in front of
// it. The focus half is not polish; it is the feature.
//
// ── Why no AI, deliberately ────────────────────────────────────────────────
// Every one of these records is already on the device. Ranking them is string
// work — microseconds, offline, free, and identical for every student. An API
// round trip would make the same search slower, cost money per keystroke, fail
// on a school Wi-Fi network, and answer from a model's memory rather than from
// the curated data a human verified. Medabrain is the right tool for "what IS
// this scholarship"; it is the wrong tool for "where is it".
//
// ── Why the index is built lazily ──────────────────────────────────────────
// Nothing here is imported at module scope. The index is built by dynamic
// import on the FIRST keystroke of the first search, once per session, and
// cached. Two reasons, both measured:
//
//   1. Some of these catalogs are NOT in the entry graph today — the medicine
//      pipeline is a lazy chunk of its own — and a static import here would
//      have quietly dragged them onto the boot path of every student,
//      including the ones who never open the search. `npm run verify:payload`
//      is the gate that would have caught it; this is how we stay under it.
//   2. Building it is ~900 objects of string work. Small, but it is not free,
//      and it is pure waste in the session where nobody searches.
//
// Nav results are synchronous and already on screen by the time this resolves;
// content results land a tick later and the palette says so while they load.
//
// ── Authoring rules for new sources ────────────────────────────────────────
//  1. `dest` must be a real destination id (routes.js TABS/SUBVIEWS, or a
//     merged page's section). scripts/verifyContentSearch.mjs fails the build
//     otherwise — an unreachable search result is worse than no result, because
//     the student has already pressed Enter.
//  2. `where` is the breadcrumb the student READS. It is how someone learns
//     where a thing lives, which is the only way they ever stop needing search.
//  3. `focus.kind` must be a kind some panel actually consumes (also verified).
//     A focus nothing acts on is a promise the landing screen quietly breaks.
//  4. Keywords are the words a student would type that are NOT in the title.
//     Titles are already matched; repeating them is dead weight.
// ─────────────────────────────────────────────────────────────────────────────

import { scoreDestination } from './navMap';

/**
 * The focus kinds a panel can consume, and therefore the only values a source
 * may put in `focus.kind`.
 *
 * Each one names a panel that accepts a `focus` prop of the shape
 * `{ id, q, n }` and, on a new nonce, pre-fills its own search with `q`, clears
 * whatever filters would hide the answer, expands the card whose id is `id`,
 * and scrolls it into view. See ScholarshipDatabase.jsx for the reference
 * implementation and useSearchFocus() below for the shared behavior.
 *
 * 'none' is honest rather than lazy: some records are worth FINDING even where
 * the screen that holds them has no card-level focus to offer. Those land on
 * the right screen and say so, and are marked here so nobody mistakes the
 * absence for a bug.
 */
export const FOCUS_KINDS = ['scholarship', 'health-scholarship', 'med-scholarship', 'opportunity', 'combined', 'none'];

// ─────────────────────────────────────────────────────────────────────────────
// The index
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One searchable record.
 *
 * @typedef  {object} ContentEntry
 * @property {string} id       unique across the whole index ('sch:coca-cola-scholars')
 * @property {string} label    what the student sees, and what is matched first
 * @property {string} sub      one line of context under the label (org, state, degree)
 * @property {string} group    the palette section it renders under
 * @property {string} dest     the destination id it opens
 * @property {string} where    the breadcrumb a student reads to learn where it lives
 * @property {string[]} keywords  the other words somebody might type for it
 * @property {{kind:string,id:string|null,q:string}} focus  what the landing screen should do
 */

/** Falsy-safe join for the `sub` line, so a missing field never renders " · ". */
const dot = (...parts) => parts.filter(Boolean).join(' · ');

/** Every keyword list ends up here: flattened, de-duplicated, emptied of noise. */
const words = (...lists) => {
  const out = new Set();
  for (const list of lists) {
    for (const w of [].concat(list || [])) {
      const s = String(w || '').trim();
      if (s && s.length >= 2) out.add(s);
    }
  }
  return [...out];
};

/**
 * Which catalog owns a record when two of them describe the same thing.
 *
 * The curated catalogs overlap on purpose and by design — Regeneron STS is a
 * competition AND an award, HOSA is an organization AND a scholarship, and each
 * catalog carries the fields its own screen needs. That is right for the
 * screens and wrong for a palette: two rows with the same name and different
 * destinations is a decision the student has no way to make, so the search
 * shows exactly one, and this is how it picks.
 *
 * The rule is the record's own nature, not the catalog's size: a program the
 * opportunities catalog itself types as a 'Scholarship' belongs to Financial
 * Aid, and everything else it lists belongs to Opportunities.
 */
const PRIO = { combined: 6, opportunity: 5, scholarship: 4, 'opportunity-award': 3, college: 2, study: 1 };

/** One row per name, highest priority wins, original order broken deterministically. */
function dedupe(entries) {
  const best = new Map();
  for (const e of entries) {
    const key = normalise(e.label);
    const prev = best.get(key);
    if (!prev || (e.prio || 0) > (prev.prio || 0)) best.set(key, e);
  }
  // Map preserves insertion order, so the surviving rows stay in source order —
  // which is the tiebreak searchContent relies on when two rows score the same.
  return entries.filter((e) => best.get(normalise(e.label)) === e);
}

let indexPromise = null;
let indexCache = null;

/**
 * Build (once) and return the whole content index.
 *
 * Sources are imported in parallel and each is wrapped so that one failing
 * module degrades the search rather than breaking it: a palette that throws is
 * a palette that cannot navigate, which is strictly worse than a palette that
 * is missing the combined-degree programs.
 */
export function loadContentIndex() {
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    const safe = async (build) => { try { return await build(); } catch { return []; } };
    const parts = await Promise.all([
      safe(scholarshipEntries),
      safe(healthScholarshipEntries),
      safe(medScholarshipEntries),
      safe(serviceProgramEntries),
      safe(opportunityEntries),
      safe(opportunityProgramEntries),
      safe(combinedDegreeEntries),
      safe(collegeEntries),
      safe(lessonEntries),
      safe(deckEntries),
    ]);
    indexCache = dedupe(parts.flat());
    return indexCache;
  })();
  return indexPromise;
}

/** The index if it is already built, or null. Lets the palette render what it has. */
export const peekContentIndex = () => indexCache;

// ── Scholarships (the general database) ─────────────────────────────────────
// Financial Aid holds three scholarship databases with three different jobs and
// three different screens (see the headers of the data files). A student
// searching a scholarship's name does not know or care which of the three it is
// in, so all three are indexed, and each entry carries the focus kind of the
// panel that actually renders it.
async function scholarshipEntries() {
  const { SCHOLARSHIPS, SCHOLARSHIP_CATEGORIES } = await import('../data/scholarships');
  const catLabel = (id) => SCHOLARSHIP_CATEGORIES.find((c) => c.id === id)?.label || id;
  return SCHOLARSHIPS.map((s) => ({
    id: `sch:${s.id}`,
    label: s.name,
    sub: dot(s.org, s.amount),
    group: 'Scholarships',
    dest: 'portfolio/applying:aid',
    where: 'Portfolio › Applying › Financial aid',
    keywords: words(s.tags, (s.categories || []).map(catLabel), 'scholarship', 'award', 'money'),
    prio: PRIO.scholarship,
    focus: { kind: 'scholarship', id: s.id, q: s.name },
  }));
}

// ── Scholarships (health careers, high-school-eligible) ─────────────────────
async function healthScholarshipEntries() {
  const { HEALTH_SCHOLARSHIPS } = await import('../data/healthCareerScholarships');
  return HEALTH_SCHOLARSHIPS.map((s) => ({
    id: `hsch:${s.id}`,
    label: s.name,
    sub: dot(s.org, s.kind === 'discovery' ? 'Where to look' : s.amount),
    group: 'Scholarships',
    dest: 'portfolio/applying:aid',
    where: 'Portfolio › Applying › Financial aid › Health careers',
    keywords: words(s.pathways, 'health scholarship', 'nursing scholarship', 'award'),
    prio: PRIO.scholarship,
    focus: { kind: 'health-scholarship', id: s.id, q: s.name },
  }));
}

// ── Scholarships (the medicine pipeline, high school → residency) ───────────
async function medScholarshipEntries() {
  const { MED_SCHOLARSHIPS, MED_STAGES } = await import('../data/medicalScholarships');
  const stageLabel = (id) => MED_STAGES?.[id]?.label || id;
  return MED_SCHOLARSHIPS.map((s) => ({
    id: `msch:${s.id}`,
    label: s.name,
    sub: dot(s.org, (s.stage || []).map(stageLabel)[0]),
    group: 'Scholarships',
    dest: 'portfolio/applying:aid',
    where: 'Portfolio › Applying › Financial aid › The medicine pipeline',
    keywords: words(s.tracks, s.pathways, (s.stage || []).map(stageLabel), 'medical school scholarship'),
    prio: PRIO.scholarship,
    focus: { kind: 'med-scholarship', id: s.id, q: s.name },
  }));
}

// ── Service-commitment programs (HPSP, NHSC, Nurse Corps, ROTC…) ────────────
// These are decisions rather than applications, and they live on the same
// Financial Aid page. They are the single most-misremembered names in the whole
// product — "the army one", "the one that pays for med school" — so they are
// indexed with those phrases attached.
async function serviceProgramEntries() {
  const { SERVICE_PROGRAMS } = await import('../data/pathwayFinance');
  return SERVICE_PROGRAMS.map((p) => ({
    id: `svc:${p.id}`,
    label: p.name,
    sub: dot(p.org, 'Service commitment'),
    group: 'Scholarships',
    dest: 'portfolio/applying:aid',
    where: 'Portfolio › Applying › Financial aid › Service commitments',
    keywords: words(p.pathways, 'service commitment', 'pays for medical school', 'military', 'loan repayment'),
    prio: PRIO.scholarship,
    focus: { kind: 'none', id: p.id, q: p.name },
  }));
}

// ── Opportunities: the browsable catalog ────────────────────────────────────
async function opportunityEntries() {
  const { OPPORTUNITIES } = await import('../data/opportunities');
  return OPPORTUNITIES.map((o) => ({
    id: `opp:${o.id}`,
    label: o.name,
    sub: dot(o.org, o.type, o.level),
    group: 'Opportunities',
    dest: 'portfolio/opportunities',
    where: 'Portfolio › Opportunities › Find something',
    keywords: words(o.tags, o.type, o.level, o.pathways),
    prio: o.type === 'Scholarship' ? PRIO['opportunity-award'] : PRIO.opportunity,
    focus: { kind: 'opportunity', id: o.id, q: o.name },
  }));
}

// ── Opportunities: the structured programs (real dates, real eligibility) ───
// `id` is shared with the catalog above wherever a program appears in both (see
// the header of src/data/opportunityPrograms.js), so those are folded into one
// entry rather than offered twice — two rows with the same name in a palette is
// a decision a student has no way to make.
async function opportunityProgramEntries() {
  const [{ PROGRAMS }, { OPPORTUNITIES }] = await Promise.all([
    import('../data/opportunityPrograms'),
    import('../data/opportunities'),
  ]);
  const alreadyListed = new Set(OPPORTUNITIES.map((o) => o.id));
  return PROGRAMS.filter((p) => !alreadyListed.has(p.id)).map((p) => ({
    id: `oprog:${p.id}`,
    label: p.name,
    sub: dot(p.org, p.type),
    group: 'Opportunities',
    dest: 'portfolio/opportunities',
    where: 'Portfolio › Opportunities › Find something',
    keywords: words(p.pathways, p.type, p.location, 'summer program', 'internship'),
    prio: p.type === 'Scholarship' ? PRIO['opportunity-award'] : PRIO.opportunity,
    focus: { kind: 'opportunity', id: p.id, q: p.name },
  }));
}

// ── Combined-degree and direct-admit programs ───────────────────────────────
// Indexed under BOTH the institution and the program name, because a student
// says "Drexel" and a counselor says "BA/BS + MD Early Assurance" and they mean
// the same row. The closed programs (MISLISTED_PROGRAMS) are indexed too, and
// that is the whole point of them existing: a student who heard about HPME from
// a cousin needs to find the sentence that says it shut in 2020, and finding
// nothing teaches them the cousin was right.
async function combinedDegreeEntries() {
  const { PROGRAMS, ROSTER, MISLISTED_PROGRAMS } = await import('../data/combinedDegreePrograms');
  const where = 'Portfolio › Applying › Combined degrees';
  const detailed = PROGRAMS.map((p) => ({
    id: `cmb:${p.id}`,
    label: `${p.institution} — ${p.program}`,
    sub: dot(p.degree, p.years ? `${p.years} years` : null, p.state, p.status === 'closed' ? 'Closed' : null),
    group: 'Combined degrees',
    dest: 'portfolio/applying:combined',
    where,
    keywords: words(p.institution, p.degree, p.state, p.pathway, 'bs md', 'bsmd', 'direct admit', 'accelerated'),
    prio: PRIO.combined,
    focus: { kind: 'combined', id: p.id, q: p.institution },
  }));
  const roster = ROSTER.map((p) => ({
    id: `cmbr:${p.id}`,
    label: `${p.institution} — ${p.program}`,
    sub: dot(p.degree, p.years ? `${p.years} years` : null, p.state),
    group: 'Combined degrees',
    dest: 'portfolio/applying:combined',
    where,
    keywords: words(p.institution, p.degree, p.state, p.pathway, 'bs md', 'bsmd', 'direct admit'),
    prio: PRIO.combined,
    focus: { kind: 'combined', id: p.id, q: p.institution },
  }));
  const closed = MISLISTED_PROGRAMS.map((p) => ({
    id: `cmbx:${p.id}`,
    label: `${p.institution} — ${p.program}`,
    sub: p.headline || 'No longer running',
    group: 'Combined degrees',
    dest: 'portfolio/applying:combined',
    where,
    keywords: words(p.institution, 'closed', 'discontinued', 'does it still exist'),
    prio: PRIO.combined,
    focus: { kind: 'combined', id: p.id, q: p.institution },
  }));
  return [...detailed, ...roster, ...closed];
}

// ── Colleges ───────────────────────────────────────────────────────────────
// The college list's own picker searches these already. Indexing them here
// means "Johns Hopkins" typed anywhere in the app lands on the screen where a
// student can put Johns Hopkins on their list, which is the actual intent
// behind typing a university's name into a college-prep app.
async function collegeEntries() {
  const { SCHOOL_DATA } = await import('../data/constants');
  return SCHOOL_DATA.map((s) => ({
    id: `col:${s.name}`,
    label: s.name,
    sub: dot(s.state, s.type, s.bsmd ? 'Has a BS/MD program' : null),
    group: 'Colleges',
    dest: 'portfolio/applying:colleges',
    where: 'Portfolio › Applying › College list',
    keywords: words(s.state, s.region, s.type, s.specialtyStrong, 'university', 'add to my list'),
    prio: PRIO.college,
    focus: { kind: 'none', id: null, q: s.name },
  }));
}

// ── Lessons and units ──────────────────────────────────────────────────────
// A student who wants "Punnett squares" is not looking for a tab. Lessons are
// indexed by title and by their stated objectives, which is where the words a
// student actually remembers from class live.
async function lessonEntries() {
  const { PATHS } = await import('../data/constants');
  const out = [];
  for (const [key, path] of Object.entries(PATHS)) {
    for (const unit of path.units || []) {
      out.push({
        id: `unit:${key}:${unit.id}`,
        label: unit.title,
        sub: dot(path.label, 'Unit'),
        group: 'Lessons',
        dest: 'prep/pathways',
        where: `Prep › Pathways › ${path.label}`,
        keywords: words(unit.quizCat, path.label, 'unit', 'module'),
        prio: PRIO.study,
        focus: { kind: 'none', id: unit.id, q: unit.title },
      });
      for (const lesson of unit.lessons || []) {
        out.push({
          id: `lesson:${key}:${lesson.id}`,
          label: lesson.title,
          sub: dot(path.label, unit.title),
          group: 'Lessons',
          dest: 'prep/pathways',
          where: `Prep › Pathways › ${path.label} › ${unit.title}`,
          keywords: words(lesson.objectives, unit.quizCat, 'lesson', 'video'),
          prio: PRIO.study,
          focus: { kind: 'none', id: lesson.id, q: lesson.title },
        });
      }
    }
  }
  return out;
}

// ── Flashcard decks ────────────────────────────────────────────────────────
async function deckEntries() {
  const { FLASH_DECKS, DECK_CATEGORIES } = await import('../data/constants');
  return Object.keys(FLASH_DECKS).map((name) => {
    const cat = DECK_CATEGORIES?.[name];
    return {
      id: `deck:${name}`,
      label: name,
      sub: dot(cat?.category, cat?.subcategory, `${FLASH_DECKS[name].length} cards`),
      group: 'Flashcards',
      dest: 'prep/flashcards',
      where: 'Prep › Flashcards',
      keywords: words(cat?.category, cat?.subcategory, 'deck', 'cards', 'study'),
      prio: PRIO.study,
      focus: { kind: 'none', id: null, q: name },
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

const normalise = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * How far a content hit sits below a destination that matched equally well.
 *
 * A destination is a PLACE and a record is a THING IN one, and when both answer
 * a query exactly, the place is the safer bet: typing "essays" must open the
 * Essays section, never a scholarship that happens to be an essay contest. One
 * penalty band handles this — big enough that an exact screen name always wins,
 * small enough that an exact record name still beats a screen the query merely
 * starts.
 */
const CONTENT_PENALTY = 40;

/**
 * Are all of the query's words somewhere in the text, in any order?
 *
 * This is the rule that makes real names findable when a student half-remembers
 * them. "merit national", "drexel md", "stanford summer research" are all word
 * bags rather than substrings, and every one of them is how somebody actually
 * types a program they heard out loud. It sits below every exact tier and above
 * fuzzy, because word-for-word evidence is real evidence — just unordered.
 */
function allWordsPresent(queryWords, text) {
  return queryWords.every((w) => text.includes(w));
}

/**
 * Score one content entry against one query. 0 means "do not show this".
 *
 * Built on scoreDestination() rather than beside it, so records and screens are
 * ranked on ONE scale and can be merged into one ordered list — which is what
 * lets Enter always mean "open the best answer" regardless of which kind it is.
 */
export function scoreContent(query, entry) {
  const q = normalise(query);
  if (!q) return 0;                       // an empty palette lists screens, never records
  const base = scoreDestination(query, { label: entry.label, group: '', keywords: entry.keywords });
  const ordered = base > 0 ? Math.max(1, base - CONTENT_PENALTY) : 0;

  // The word bag, over two haystacks with two different strengths. Every word
  // in the NAME is strong evidence — "merit national" is National Merit however
  // it was typed. Every word somewhere in the name, the subtitle or the
  // keywords is weaker but still real: that is where the institution, the state
  // and the degree live, and it is what finds "drexel md" and "hopkins
  // maryland".
  //
  // Taken as a max against the ordered tiers rather than only as a fallback,
  // because a query the student typed out of order is not a worse query — and
  // leaving it below an incidental keyword brush is how the exactly-right
  // record ends up second.
  const qWords = q.split(' ').filter((w) => w.length >= 2);
  if (qWords.length < 2) return ordered;
  const label = normalise(entry.label);
  if (allWordsPresent(qWords, label)) return Math.max(ordered, 560);
  const hay = `${label} ${normalise(entry.sub)} ${normalise(entry.keywords.join(' '))}`;
  if (allWordsPresent(qWords, hay)) return Math.max(ordered, 400);
  return ordered;
}

/**
 * Rank the index against a query.
 *
 * `limit` exists because the index is ~1,400 records and a two-letter query
 * matches hundreds of them: a palette that renders them all is a scroll, and a
 * scroll is the wall this whole feature exists to remove. Ten is about what
 * fits above the fold on a phone before the student has to decide to scroll.
 *
 * `perGroup` stops one prolific source burying the rest — 90 scholarships would
 * otherwise crowd out the one combined-degree program that was the better
 * answer, purely by weight of numbers.
 */
export function searchContent(query, index, { limit = 10, perGroup = 4 } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2 || !index?.length) return [];
  const scored = [];
  for (let i = 0; i < index.length; i += 1) {
    const score = scoreContent(q, index[i]);
    if (score > 0) scored.push({ entry: index[i], score, i });
  }
  scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  const taken = new Map();
  const out = [];
  for (const { entry } of scored) {
    const n = taken.get(entry.group) || 0;
    if (n >= perGroup) continue;
    taken.set(entry.group, n + 1);
    out.push(entry);
    if (out.length >= limit) break;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// The focus handshake
// ─────────────────────────────────────────────────────────────────────────────

/** The class the focused card wears for a couple of seconds. See src/index.css. */
export const FOCUS_CLASS = 'msp-search-hit';

/**
 * Scroll the focused card into view and flash it, once it has rendered.
 *
 * Deliberately deferred a frame: the panel sets its query in the same commit,
 * so the card is not in the DOM yet when the effect runs, and scrolling to
 * where it used to be is worse than not scrolling at all. Honors
 * prefers-reduced-motion, which on this surface means "arrive there" rather
 * than "glide there" — the highlight still plays, because it is what says WHICH
 * card, and that is information, not decoration.
 */
export function revealFocused(el) {
  if (!el || typeof window === 'undefined') return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  window.requestAnimationFrame(() => {
    try { el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); } catch { el.scrollIntoView(); }
    el.classList.add(FOCUS_CLASS);
    window.setTimeout(() => el.classList.remove(FOCUS_CLASS), 2200);
  });
}

// The panel side of the handshake — the hook every focusable panel uses — lives
// in ./useSearchFocus.js rather than here, because this module is imported by
// scripts/verifyContentSearch.mjs under bare Node, where `react` does not
// resolve. Keeping the index and the scorer free of React is what makes the
// searches a student types testable in CI at all.
