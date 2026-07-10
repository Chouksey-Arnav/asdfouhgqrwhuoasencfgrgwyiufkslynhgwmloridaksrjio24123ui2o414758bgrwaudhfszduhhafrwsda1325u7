// ─────────────────────────────────────────────────────────────────────────────
// Fuse.js — Fuzzy search for all search fields
// Handles typos, partial matches, multi-field search.
// ─────────────────────────────────────────────────────────────────────────────
import Fuse from 'fuse.js';

export function buildQuizSearch(quizzes) {
  return new Fuse(quizzes, {
    keys: [
      { name: 'title', weight: 0.6 },
      { name: 'cat',   weight: 0.2 },
      { name: 'diff',  weight: 0.1 },
      { name: 'qs.q',  weight: 0.1 },
    ],
    threshold: 0.35,
    includeScore: true,
    useExtendedSearch: true,
    minMatchCharLength: 2,
  });
}

export function buildLibrarySearch(resources) {
  return new Fuse(resources, {
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'desc',  weight: 0.35 },
      { name: 'cat',   weight: 0.1 },
      { name: 'type',  weight: 0.05 },
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2,
  });
}

export function buildDeckSearch(decks) {
  // Typo-tolerant fuzzy matching on the deck NAME only — fuzzy matching card
  // front/back text too (with a loose threshold) turned out to surface mostly
  // unrelated decks for a specific term, since Fuse's approximate matching
  // treats a long deck name or a 15-card block of text as one big haystack
  // that a short query can "sort of" fit into. Card content search is handled
  // separately (exact substring) in searchDecks below for precision.
  return new Fuse(decks, {
    keys: [{ name: 'name', weight: 1 }],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

/**
 * Search decks by name (fuzzy/typo-tolerant) or by exact card content
 * (front/back text) — merged, deck-name matches ranked first.
 * @param {ReturnType<typeof buildDeckSearch>} deckFuse
 * @param {Array} decks
 * @param {string} query
 * @returns {Array|null} null if the query is empty (caller should show all)
 */
export function searchDecks(deckFuse, decks, query) {
  const q = query && query.trim();
  if (!q) return null;
  const nameMatches = fuseSearch(deckFuse, q) || [];
  const matchedNames = new Set(nameMatches.map(d => d.name));
  const needle = q.toLowerCase();
  const contentMatches = decks.filter(d =>
    !matchedNames.has(d.name) &&
    (d.cards || []).some(c =>
      (c.front && c.front.toLowerCase().includes(needle)) ||
      (c.back && c.back.toLowerCase().includes(needle))
    )
  );
  return [...nameMatches, ...contentMatches];
}

export function buildSchoolSearch(schools) {
  return new Fuse(schools, {
    keys: [
      { name: 'name',  weight: 0.7 },
      { name: 'state', weight: 0.2 },
      { name: 'type',  weight: 0.1 },
    ],
    threshold: 0.35,
    includeScore: true,
    minMatchCharLength: 2,
  });
}

/** Run a fuzzy search. Returns null (show all) if query is empty. */
export function fuseSearch(index, query) {
  if (!query || !query.trim()) return null;
  return index.search(query).map(r => r.item);
}
