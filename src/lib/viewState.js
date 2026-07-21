// Persists which tab/sub-view (and, for an active flashcard session, which deck/card) a
// student was on, so reloading the page — a stuck PWA, a phone locking mid-session, a flaky
// connection — resumes where they were instead of dropping them back to Home. Local-only (per
// browser) UI-state, same spirit as a browser remembering scroll position; not part of the
// cross-device progress sync in db.js/progressSync.js since "which screen was open" isn't
// something that should follow a student to a different device.
const KEY = 'mspViewState';

export function loadViewState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveViewState(partial) {
  try {
    const current = loadViewState();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...partial }));
  } catch {
    // Best-effort — private browsing / a full storage quota shouldn't break navigation.
  }
}

// Called alongside DB.clearAllData() (sign-out, or a different account signing in on a shared
// device) so the next person in doesn't land on whatever tab the previous account was last on.
export function clearViewState() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
