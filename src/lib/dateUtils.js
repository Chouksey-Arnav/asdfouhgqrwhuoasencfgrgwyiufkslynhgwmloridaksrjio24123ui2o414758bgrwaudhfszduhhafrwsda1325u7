// ─────────────────────────────────────────────────────────────────────────────
// Local-calendar date keys — the ONE place that turns a Date into a YYYY-MM-DD
// string for anything day-boundary-sensitive (daily check-in, streaks, "today").
//
// Never use `Date#toISOString()` for this: it's UTC, and for any student west
// of UTC (all of North America) the UTC calendar day rolls over while it's
// still afternoon/evening local time. That silently moves "today" forward a
// day mid-afternoon, which is exactly what caused the daily check-in chest to
// re-trigger a second time on the same local day (getTodayCheckinStatus() and
// getNextCheckinDay() disagreed about what day it already was). Always build
// day keys from a Date's local getFullYear/getMonth/getDate instead.
// ─────────────────────────────────────────────────────────────────────────────

/** YYYY-MM-DD for the given Date, in the browser's local timezone. */
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** localDateStr() for N days before/after today (n may be negative). */
export function localDateStrOffset(n, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
