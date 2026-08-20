// A one-shot handoff from the Admissions Calculator to Interview Prep.
//
// The calculator knows that Drexel runs an MMI. Interview Prep has the MMI circuit. Getting a
// student from one to the other means carrying two facts across a tab change — which mode to open
// and which stations to filter to — and the app's navigation helper (goPortfolio) takes a view id
// and nothing else.
//
// Threading two new props from App.jsx's render map through to the panel for the sake of one
// button would put a permanent widening in a shared signature to serve a transient intent. So the
// intent goes through sessionStorage instead: written on click, read once on mount, cleared
// immediately. It is deliberately session-scoped — an intent that survived a browser restart and
// silently reopened a circuit three days later would be a bug, not a feature.
const KEY = 'interviewIntent';

export function setInterviewIntent(intent) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...intent, at: Date.now() }));
  } catch { /* private mode, or storage full — the navigation still works, it just lands on the default tab */ }
}

/** Reads and clears. Calling it twice returns null the second time, which is the intended contract. */
export function takeInterviewIntent() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw);
    // A stale intent left by a navigation the student abandoned ten minutes ago should not
    // hijack the tab when they arrive under their own steam.
    if (!parsed?.at || Date.now() - parsed.at > 5 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}
