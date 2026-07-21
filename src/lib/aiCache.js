// Lightweight client-side cache for Groq (Iatra) responses that repeat in shape across
// sessions — e.g. the daily "why this quiz" narration for the #1 recommendation. Backed by
// localStorage (not Dexie) since entries are small strings with a short TTL and don't need to
// survive a full data export/import cycle.
const PREFIX = 'aiCache:';

export function getCached(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { value, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) { localStorage.removeItem(PREFIX + key); return null; }
    return value;
  } catch {
    return null;
  }
}

export function setCached(key, value, ttlMs = 24 * 60 * 60 * 1000) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ value, expiresAt: Date.now() + ttlMs }));
  } catch {
    // localStorage full/unavailable — caching is a pure optimization, safe to no-op
  }
}

// Keys the day into the cache key so the narration refreshes once every 24h instead of never.
export function dailyKey(...parts) {
  const today = new Date().toISOString().slice(0, 10);
  return [...parts, today].join(':');
}
