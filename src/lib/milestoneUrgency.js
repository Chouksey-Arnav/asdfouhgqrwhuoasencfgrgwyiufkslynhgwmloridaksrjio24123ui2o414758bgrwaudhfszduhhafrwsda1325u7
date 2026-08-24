// ─────────────────────────────────────────────────────────────────────────────
// Urgency, which is not the same thing as date order.
//
// A chronological feed answers "what happens next" and quietly answers the
// wrong question. Consider two dates a student is looking at in September:
//
//   • A summer research program closing in 95 days. The application wants two
//     recommendation letters, a personal statement and a transcript request —
//     eight weeks of elapsed time, most of it waiting on other people.
//   • A club fundraiser form due in 30 days. It takes an afternoon.
//
// Sorted by date, the fundraiser is at the top and the research program is four
// screens down under "December". The student reads the list top to bottom, does
// the fundraiser, and starts the research application in November — three weeks
// after the point where it was still possible to ask a teacher for a letter and
// get a good one. The feed did not lie to them. It just sorted by the wrong key.
//
// The right key is SLACK: how many days are left after you subtract the run-up
// the work actually needs.
//
//     slack = days_until_due − lead_days
//
// Slack going negative is the moment a deadline stops being a future problem,
// and it is usually weeks or months before the date itself. That is the number
// the BANDS are cut from — overdue, start now, start within two weeks, time in
// hand — and it is what the feed colors by.
//
// Slack alone is not enough to ORDER within a band, though, and the reason is
// worth stating because it is where a naive implementation gets the original
// example backwards. A form due in thirty days that takes an afternoon has
// twenty-nine days of slack; a summer research application due in ninety that
// needs two months has thirty. Sorted by slack the afternoon form still wins by
// a day, which is exactly the wrong answer. What distinguishes them is not how
// much slack is left but how much of the remaining window is already spoken
// for:
//
//     pressure = lead_days ÷ days_until_due
//
// The form consumes 3% of its window; the research application consumes 67% of
// its. So the band comes from slack and the order within it comes from
// pressure, which is the arithmetic version of "you have ninety days and you
// need sixty of them."
//
// ── Where lead_days comes from ──────────────────────────────────────────────
// In order of authority: the number stored on the row (written by whatever
// created it — a combined-degree program knows its supplement takes five
// months), then the catalog milestone's own declared lead, then a per-category
// default. The defaults are deliberately conservative and deliberately coarse:
// being roughly right about "this needs about two months" is worth far more
// than being precisely wrong about 47 days.
//
// Pure functions, plain data, no imports from React or the network — so
// scripts/verifyTimeline.mjs can assert on the ordering.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How long the work behind a date typically takes, by timeline `kind`.
 *
 * These are elapsed-time estimates, not effort estimates — the number that
 * matters is how early you have to START, and for most application work the
 * binding constraint is waiting on other people (a teacher's letter, a
 * counselor's transcript, a supervisor's signature) rather than your own hours.
 */
export const LEAD_DAYS_BY_KIND = {
  application: 45,   // an application form plus whatever it asks other people for
  essays: 30,        // a draft, a week away from it, a revision
  recommenders: 45,  // the ask, the brag sheet, and the fact that teachers are busy
  aid: 21,           // forms, but forms that need a parent and their tax documents
  experience: 60,    // program applications: essays, letters, sometimes a project
  academics: 14,     // registration windows and exam prep blocks
  planning: 7,
  decision: 7,
  logged: 0,
};

/** The alert ladder. Sixty, thirty, seven — the three moments that matter. */
export const ALERT_OFFSETS = [60, 30, 7];

const ALERT_COPY = {
  60: (title) => `${title} — 60 days out: start it`,
  30: (title) => `${title} — 30 days out: ask anyone whose help you need`,
  7: (title) => `${title} — 7 days out: submit, don't wait for the last night`,
};

const DAY = 86400000;
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The run-up this event needs, from the most authoritative source available. */
export function leadDaysFor(event) {
  const stored = event?.ownerRef?.leadDays ?? event?.lead_days ?? event?.leadDays;
  if (Number.isFinite(Number(stored)) && Number(stored) > 0) return Number(stored);
  return LEAD_DAYS_BY_KIND[event?.kind] ?? 14;
}

export const URGENCY_BANDS = {
  overdue: { id: 'overdue', label: 'Past its date', rank: 0, colorKey: 'rose' },
  late: { id: 'late', label: 'Later than you wanted', rank: 1, colorKey: 'rose' },
  start_now: { id: 'start_now', label: 'Start this now', rank: 2, colorKey: 'amber' },
  start_soon: { id: 'start_soon', label: 'Start within two weeks', rank: 3, colorKey: 'amber' },
  on_track: { id: 'on_track', label: 'Time in hand', rank: 4, colorKey: 'sky' },
};

/**
 * The urgency read for one event.
 *
 * `slack` is the whole answer; the band and the sentence are renderings of it.
 * The sentence is written to be said to a student — "this closes in 95 days and
 * needs about two months of run-up" is actionable in a way that a colored dot
 * is not.
 */
export function urgencyOf(event) {
  const lead = leadDaysFor(event);
  // `days == null` is checked separately because Number(null) is 0, not NaN — so a finiteness
  // check alone silently reads an event with no resolvable date as one due TODAY, which puts it
  // in the `late` band and floats it above every real deadline in the feed. Empty string coerces
  // to 0 the same way. An undated event is not urgent; it is unknown.
  const raw = event?.days;
  const days = raw == null || raw === '' ? NaN : Number(raw);
  if (!Number.isFinite(days)) return { slack: null, pressure: 0, band: URGENCY_BANDS.on_track, lead, reason: null };

  const slack = days - lead;
  // How much of the time remaining the work itself will consume. Clamped at the top so an
  // overdue or same-day item does not divide by zero, and so nothing outranks a genuine
  // start-now item on pressure alone.
  const pressure = days <= 0 ? 1 : Math.min(1, lead / days);
  let band;
  if (days < 0) band = URGENCY_BANDS.overdue;
  else if (slack <= -Math.max(7, lead * 0.25)) band = URGENCY_BANDS.late;
  else if (slack <= 0) band = URGENCY_BANDS.start_now;
  else if (slack <= 14) band = URGENCY_BANDS.start_soon;
  else band = URGENCY_BANDS.on_track;

  return { slack, lead, pressure, band, reason: reasonFor(days, lead, slack) };
}

function reasonFor(days, lead, slack) {
  if (days < 0) return null; // the feed already says "slipped past"; a lead-time note adds nothing
  if (lead <= 7) return null; // a same-week task needs no explanation of its run-up
  const leadWords = lead >= 60 ? `about ${Math.round(lead / 30)} months` : `about ${Math.round(lead / 7)} weeks`;
  if (slack <= 0) {
    return `This is ${days} days away but the work behind it takes ${leadWords} — the point where starting late stops being recoverable has already passed. Start today.`;
  }
  if (slack <= 14) {
    return `${days} days away, and it needs ${leadWords} of run-up. You have about ${slack} day${slack === 1 ? '' : 's'} before you have to begin.`;
  }
  return `${days} days away, and ${leadWords} of run-up behind it — begin around ${slack} days from now, not in the last fortnight.`;
}

/**
 * Sort by real urgency: band first (overdue → start now → time in hand), then
 * pressure, then slack, then consequence, then date. Date is the LAST tiebreak
 * rather than the first — which is the whole point of the module.
 *
 * `weight` (3 = a date with consequences if missed) breaks the remaining ties so
 * that a binding application deadline outranks a habit pinned to the same week.
 */
export function sortByUrgency(events = []) {
  return [...events].sort((a, b) => {
    const ua = urgencyOf(a), ub = urgencyOf(b);
    if (ua.band.rank !== ub.band.rank) return ua.band.rank - ub.band.rank;
    // Pressure, not slack, decides the order inside a band — see the header for why sorting by
    // slack alone puts the afternoon form above the summer research application.
    if (Math.abs(ua.pressure - ub.pressure) > 0.01) return ub.pressure - ua.pressure;
    const sa = ua.slack ?? 9999, sb = ub.slack ?? 9999;
    if (sa !== sb) return sa - sb;
    if ((b.weight || 0) !== (a.weight || 0)) return (b.weight || 0) - (a.weight || 0);
    return String(a.date).localeCompare(String(b.date));
  });
}

/**
 * The 60/30/7 alert rows for a dated milestone.
 *
 * Rules, each one a bug that existed before this was centralised:
 *   • An alert dated in the past is clutter, not a reminder — skipped.
 *   • An alert is never generated for a date less than eight days out; three
 *     reminders for something due on Friday is noise, and the row itself is
 *     already at the top of the feed.
 *   • Every alert carries `source_ref` pointing at its parent, so removing or
 *     completing the parent takes its alerts with it rather than leaving three
 *     orphaned countdowns to a date that no longer applies.
 */
export function alertRowsFor(parent, { today = new Date(), parentRef = null } = {}) {
  const dueIso = parent?.due_date;
  if (!dueIso) return [];
  const due = new Date(`${dueIso}T00:00:00`);
  if (Number.isNaN(due.getTime())) return [];
  const t = startOfDay(today);
  const daysOut = Math.round((due - t) / DAY);
  if (daysOut < 8) return [];

  const ref = parentRef || parent.source_ref || null;
  const rows = [];
  for (const offset of ALERT_OFFSETS) {
    const when = new Date(due.getTime() - offset * DAY);
    if (when <= t) continue;
    rows.push({
      title: ALERT_COPY[offset](truncate(parent.title, 48)),
      due_date: iso(when),
      kind: parent.kind || 'custom',
      college_id: parent.college_id || null,
      source_ref: ref ? `alert:${ref}:${offset}` : null,
      lead_days: offset === 7 ? 3 : 7,
    });
  }
  return rows;
}

const truncate = (s, n) => (String(s || '').length > n ? `${String(s).slice(0, n).trim()}…` : String(s || ''));

/** True for a row this module generated, so the UI can group them as reminders. */
export const isAlertRow = (row) => String(row?.source_ref || '').startsWith('alert:');

/** The parent ref an alert row points at, or null. */
export function alertParentRef(row) {
  const m = String(row?.source_ref || '').match(/^alert:(.+):(\d+)$/);
  return m ? m[1] : null;
}
