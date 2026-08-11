import { ELIB } from '../data/elib.js';

// ── Outside help for a lesson a student found too hard ────────────────────────
//
// When someone says "this is too hard", the useful response includes somewhere else to go —
// a video that explains it differently, a tutorial that starts further back. The hard
// requirement the product puts on that: **every link has to actually work.**
//
// So none of these links come from the language model. Asking an LLM for "a good YouTube video
// on osmosis" reliably produces a confident, correctly-formatted, completely dead video id, and
// a broken link handed to a student who already feels lost is worse than no link at all.
//
// Instead, links come from exactly two sources, both of which are structurally sound:
//
//   1. THE APP'S OWN E-LIBRARY (src/data/elib.js). Every entry there was hand-verified against
//      third-party sources, and the file's header documents the two cleanup rounds that removed
//      ~900 fabricated and 10 broken entries. It is the most trustworthy link set we have.
//   2. DETERMINISTIC SEARCH URLS on sites that are guaranteed to resolve — a YouTube/Khan
//      Academy/Wikipedia *search* for the lesson's actual topic. These cannot 404: the query
//      string is escaped, and the worst case is a results page instead of a perfect video.
//
// Matching is keyword overlap between the lesson (title, objectives, article headings) and each
// candidate entry, restricted to the unit's own subject category so a biology lesson cannot
// surface a physics video just because both mention "energy".

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with', 'from', 'by', 'at', 'as',
  'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that', 'these', 'those', 'how',
  'what', 'why', 'when', 'which', 'you', 'your', 'their', 'they', 'we', 'our', 'not', 'but',
  'into', 'about', 'more', 'than', 'them', 'can', 'will', 'do', 'does', 'has', 'have', 'had',
  'intro', 'introduction', 'basics', 'overview', 'guide', 'lesson', 'unit', 'part', 'ap',
  'understanding', 'explained', 'crash', 'course', 'video', 'series', 'vs',
]);

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** The words that describe what this lesson is actually about, most important first. */
export function lessonKeywords(lesson, unit, content) {
  const titleWords = tokenize(lesson?.title);
  const objWords = tokenize((lesson?.objectives || []).join(' '));
  const headWords = tokenize((content?.article?.sections || []).map((s) => s.heading).join(' '));
  const weights = new Map();
  const add = (words, w) => { for (const t of words) weights.set(t, (weights.get(t) || 0) + w); };
  add(titleWords, 3);
  add(headWords, 2);
  add(objWords, 1);
  return weights;
}

/** A short, human topic string — used for search URLs and for the "search for X" labels. */
export function lessonTopic(lesson, unit) {
  const raw = String(lesson?.title || unit?.title || '').trim();
  // Strip the course-code parentheticals the pathway titles carry ("… (AP Bio)"), which are
  // noise in a search query and make results worse, not better.
  return raw.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'biology basics';
}

/**
 * Two numbers, not one, and the distinction matters:
 *
 *   `topical` — how much this entry's words actually overlap the lesson's. This is the only
 *               evidence that the resource is about the right thing.
 *   `score`   — topical plus format bonuses (free, introductory, video), used only to ORDER
 *               resources that are already known to be relevant.
 *
 * They are kept apart because the bonuses alone sum to 3.0, so a single combined score let any
 * free introductory YouTube video in the category clear the relevance bar with zero topical
 * overlap at all — which is precisely how a student who said "this is too hard" ends up being
 * handed a video about something else entirely.
 */
function scoreEntry(entry, weights) {
  const hay = tokenize(`${entry.title} ${entry.desc || ''}`);
  if (!hay.length) return { topical: 0, score: 0 };
  let topical = 0;
  const seen = new Set();
  for (const t of hay) {
    if (seen.has(t)) continue;
    seen.add(t);
    topical += weights.get(t) || 0;
  }
  if (topical <= 0) return { topical: 0, score: 0 };
  // Free, introductory, video-first material is what someone who is stuck actually needs.
  let score = topical;
  if (entry.free) score += 0.5;
  if (entry.type === 'YouTube' && entry.ytId) score += 1.5;
  if (entry.difficulty === 'Introductory') score += 1;
  return { topical, score };
}

/** Minimum topical overlap for a resource to count as "about this lesson" at all. */
const MIN_TOPICAL = 3;

/**
 * Vetted in-library resources for this lesson, best match first.
 *
 * Returns [] rather than filler when nothing scores — an unrelated video presented as help is
 * worse than the search links, which at least go where the student expects. The caller always
 * renders searchLinksFor() alongside this, so an empty result is never a dead end.
 */
export function recommendLessonResources(lesson, unit, content, { limit = 4 } = {}) {
  const weights = lessonKeywords(lesson, unit, content);
  if (!weights.size) return [];
  const cat = unit?.quizCat;
  const pool = cat ? ELIB.filter((e) => e.cat === cat) : ELIB;
  // The lesson's own source video is already embedded in the player — recommending it back as
  // "try this instead" to someone who just said the lesson was too hard is a small insult.
  const ownId = content?.video?.ytId || null;

  return pool
    .filter((e) => e.url && /^https?:\/\//i.test(e.url) && (!ownId || e.ytId !== ownId))
    .map((e) => ({ entry: e, ...scoreEntry(e, weights) }))
    .filter((x) => x.topical >= MIN_TOPICAL)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => ({
      title: entry.title,
      url: entry.url,
      type: entry.type,
      ytId: entry.ytId || null,
      desc: entry.desc || '',
      free: !!entry.free,
      difficulty: entry.difficulty || null,
      source: 'library',
    }));
}

/**
 * Search links that cannot break. Every one is a query URL on a site that always resolves, with
 * the topic properly percent-encoded — the honest fallback when the curated library has nothing
 * close, and a useful supplement when it does.
 */
export function searchLinksFor(lesson, unit) {
  const topic = lessonTopic(lesson, unit);
  const q = encodeURIComponent(topic);
  return [
    {
      title: `YouTube: "${topic}" explained`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} explained`)}`,
      type: 'YouTube search', source: 'search',
      desc: 'Video explanations of this exact topic, newest and most-watched first.',
    },
    {
      title: `Khan Academy: ${topic}`,
      url: `https://www.khanacademy.org/search?page_search_query=${q}`,
      type: 'Course', source: 'search',
      desc: 'Free step-by-step lessons and practice, built to be started from zero.',
    },
    {
      title: `Wikipedia: ${topic}`,
      url: `https://en.wikipedia.org/w/index.php?search=${q}`,
      type: 'Reference', source: 'search',
      desc: 'The reference article, for definitions and how the pieces connect.',
    },
  ];
}

/** Everything the "too hard" panel needs, in one call. */
export function helpResourcesFor(lesson, unit, content, { limit = 4 } = {}) {
  return {
    curated: recommendLessonResources(lesson, unit, content, { limit }),
    searches: searchLinksFor(lesson, unit),
    topic: lessonTopic(lesson, unit),
  };
}
