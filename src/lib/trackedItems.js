// ─────────────────────────────────────────────────────────────────────────────
// The Tracked tab's engine — turns "I tapped Track on a thing" into an actually tracked thing.
//
// Tapping Track wrote a row and that was the end of it: the program landed in the activity list
// or the scholarship tracker and then sat there, undated and unmoved, indistinguishable from
// something the student had already finished. Nothing ever asked "did you apply?", nothing
// noticed that a scholarship had been sitting in `researching` since February, and nothing knew
// that a tracked program had no deadline on it at all.
//
// This module is the missing follow-through. It normalizes every tracked thing (scholarships,
// programs/activities, colleges, deadlines) into one shape, classifies each one's real state,
// and produces the daily report Meta Brain delivers on the Tracked tab.
//
// The classification is DETERMINISTIC and computed locally, on purpose. The daily report has to
// exist every single day — offline, rate-limited, signed out, whatever — so the substance is
// computed here and the AI blurb layered on top is commentary, not the report itself. That also
// means the report can never hallucinate a status: every line it makes is derived from a column.
// ─────────────────────────────────────────────────────────────────────────────
import { toTime } from './weeklyGoals.js';

const DAY = 86400000;

// ── Status vocabulary ────────────────────────────────────────────────────────
// Mirrors the per-panel status enums (FinancialAidPanel's scholarship statuses, CollegeListPanel's
// college statuses, RecommendersPanel's letter statuses) collapsed into the four states that
// matter when you're looking at everything at once.
export const STAGES = [
  { id: 'needs_action', label: 'Needs action', colorKey: 'rose', blurb: 'Dated, close, or stalled — these are the ones that bite.' },
  { id: 'in_progress', label: 'In progress', colorKey: 'blue', blurb: 'Actively moving. Keep them moving.' },
  { id: 'watching', label: 'Watching', colorKey: 'amber', blurb: 'Saved but not started. Fine for now; not fine forever.' },
  { id: 'done', label: 'Closed out', colorKey: 'green', blurb: 'Submitted, awarded, or wrapped up.' },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));

// How long a tracked item may sit untouched before it counts as stalled. Deliberately generous:
// nagging a student about something they saved four days ago is how they learn to ignore the tab.
export const STALE_DAYS = 21;

const SCHOLARSHIP_STAGE = {
  researching: 'watching',
  applying: 'in_progress',
  submitted: 'done',
  awarded: 'done',
  denied: 'done',
};
const COLLEGE_STAGE = {
  researching: 'watching',
  application_started: 'in_progress',
  essays_in_progress: 'in_progress',
  submitted: 'done',
  decision_received: 'done',
  enrolled: 'done',
  declined: 'done',
};
const RECOMMENDER_STAGE = {
  'Planning to ask': 'watching',
  Asked: 'in_progress',
  Confirmed: 'in_progress',
  Submitted: 'done',
};

function daysBetween(a, b) {
  return Math.round((a - b) / DAY);
}

function daysUntil(dateStr, now) {
  const t = toTime(dateStr);
  if (t === null) return null;
  return Math.ceil((t - now) / DAY);
}

/**
 * One tracked thing, normalized.
 *
 * @typedef {{
 *   key:string, resource:string, id:number, name:string, sub:string,
 *   stage:string, statusLabel:string, dueInDays:number|null, dueDate:string|null,
 *   addedAt:number|null, touchedAt:number|null, idleDays:number|null,
 *   flags:string[], nextStep:string, view:string, sortWeight:number
 * }} TrackedItem
 */

/** Everything the student is tracking, as one normalized, ranked list. */
export function buildTrackedItems(snapshot = {}, now = Date.now()) {
  const items = [];

  for (const s of snapshot.scholarships || []) {
    const stage = SCHOLARSHIP_STAGE[s.status] || 'watching';
    items.push(finalize({
      key: `scholarships:${s.id}`, resource: 'scholarships', id: s.id,
      name: s.name || 'Untitled scholarship',
      sub: s.amount ? `$${Number(s.amount).toLocaleString()}` : 'Amount not confirmed',
      stage, statusLabel: labelize(s.status || 'researching'),
      dueDate: s.deadline || null, view: 'aid', kind: 'Scholarship',
      addedAt: toTime(s.created_at), touchedAt: toTime(s.updated_at || s.created_at),
      // A tracked scholarship with no date is the single most common way one gets missed: it
      // can never appear in a countdown, so it silently drops out of the student's attention.
      missingDate: !s.deadline && stage !== 'done',
      notes: s.notes || '',
    }, now));
  }

  for (const a of snapshot.activities || []) {
    // Only rows that came out of the catalog, or that carry no logged hours yet, are "tracked"
    // in the follow-through sense. An activity the student already does 5 hours a week is not
    // waiting on anything — it belongs on the resume, not in a chase list.
    const fromCatalog = /opportunities database|MedSchoolPrep/i.test(a.description || '');
    const hours = (parseFloat(a.hours_per_week) || 0);
    if (!fromCatalog && hours > 0) continue;
    items.push(finalize({
      key: `activities:${a.id}`, resource: 'activities', id: a.id,
      name: a.position || 'Untitled activity',
      sub: a.organization || a.activity_type || '',
      stage: hours > 0 ? 'in_progress' : (a.status === 'completed' ? 'done' : 'watching'),
      statusLabel: hours > 0 ? `${hours} hrs/wk` : labelize(a.status || 'ongoing'),
      dueDate: null, view: 'resume', kind: 'Program',
      addedAt: toTime(a.created_at), touchedAt: toTime(a.updated_at || a.created_at),
      missingDate: false,
      // The concrete thing that is missing: a saved program with no hours is a bookmark until
      // the student either applies or starts logging time against it.
      missingHours: hours === 0 && a.status !== 'completed',
      notes: a.description || '',
    }, now));
  }

  for (const c of snapshot.colleges || []) {
    const stage = COLLEGE_STAGE[c.status] || 'watching';
    const nextDate = [c.ea_ed_deadline, c.rd_deadline].filter(Boolean).sort()[0] || null;
    items.push(finalize({
      key: `colleges:${c.id}`, resource: 'colleges', id: c.id,
      name: c.name || 'Untitled school',
      sub: c.category ? labelize(c.category) : 'Uncategorized',
      stage, statusLabel: labelize(c.status || 'researching'),
      dueDate: nextDate, view: 'colleges', kind: 'College',
      addedAt: toTime(c.created_at), touchedAt: toTime(c.updated_at || c.created_at),
      missingDate: !nextDate && stage !== 'done',
      notes: c.notes || '',
    }, now));
  }

  for (const d of snapshot.deadlines || []) {
    const until = daysUntil(d.due_date, now);
    items.push(finalize({
      key: `deadlines:${d.id}`, resource: 'deadlines', id: d.id,
      name: d.title || 'Untitled deadline',
      sub: d.kind ? labelize(d.kind) : 'Deadline',
      stage: until != null && until < 0 ? 'done' : 'in_progress',
      statusLabel: until == null ? 'No date' : until < 0 ? 'Passed' : `${until} day${until === 1 ? '' : 's'} out`,
      dueDate: d.due_date || null, view: 'deadlines', kind: 'Deadline',
      addedAt: toTime(d.created_at), touchedAt: toTime(d.created_at),
      missingDate: !d.due_date,
      notes: '',
    }, now));
  }

  for (const r of snapshot.recommenders || []) {
    const stage = RECOMMENDER_STAGE[r.status] || 'watching';
    items.push(finalize({
      key: `recommenders:${r.id}`, resource: 'recommenders', id: r.id,
      name: r.name || 'Recommender',
      sub: r.relationship || r.type || 'Letter of recommendation',
      stage, statusLabel: r.status || 'Planning to ask',
      dueDate: r.due_date || null, view: 'recommenders', kind: 'Recommender',
      addedAt: toTime(r.created_at), touchedAt: toTime(r.updated_at || r.created_at),
      missingDate: false,
      notes: r.notes || '',
    }, now));
  }

  return items.sort((a, b) => b.sortWeight - a.sortWeight);
}

function labelize(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Applies the urgency rules that decide whether something is quietly fine or actually needs the
 * student today. Escalation to `needs_action` is intentionally narrow — three concrete triggers,
 * each of which a student would agree with if you showed them the row.
 */
function finalize(item, now) {
  const flags = [];
  const dueInDays = item.dueDate ? daysUntil(item.dueDate, now) : null;
  const idleDays = item.touchedAt ? daysBetween(now, item.touchedAt) : null;
  let stage = item.stage;

  if (dueInDays != null && dueInDays >= 0 && dueInDays <= 14 && stage !== 'done') {
    flags.push(dueInDays <= 3 ? 'due-now' : 'due-soon');
    stage = 'needs_action';
  }
  if (dueInDays != null && dueInDays < 0 && stage !== 'done') {
    flags.push('overdue');
    stage = 'needs_action';
  }
  if (item.missingDate) flags.push('no-date');
  if (item.missingHours) flags.push('no-hours');
  if (idleDays != null && idleDays >= STALE_DAYS && stage === 'watching') {
    flags.push('stalled');
    stage = 'needs_action';
  }

  const nextStep = nextStepFor({ ...item, dueInDays, idleDays, flags });
  // Ranking, highest first: overdue > due now > due soon > stalled > missing date > everything
  // else, with recency as the tiebreaker so a long list stays stable between renders.
  const weight =
    (flags.includes('overdue') ? 1000 : 0) +
    (flags.includes('due-now') ? 800 : 0) +
    (flags.includes('due-soon') ? 500 : 0) +
    (flags.includes('stalled') ? 300 : 0) +
    (flags.includes('no-date') ? 120 : 0) +
    (flags.includes('no-hours') ? 80 : 0) +
    (stage === 'done' ? -500 : 0) +
    (dueInDays != null && dueInDays >= 0 ? Math.max(0, 60 - dueInDays) : 0);

  return { ...item, stage, flags, dueInDays, idleDays, nextStep, sortWeight: weight };
}

/** The single most useful next move for one item, in the student's own terms. */
export function nextStepFor(item) {
  if (item.flags?.includes('overdue')) {
    return item.resource === 'deadlines'
      ? 'This date has passed — mark it done or push the date so your countdown stays honest.'
      : 'The date you entered has passed. Confirm whether the window really closed, or update it.';
  }
  if (item.flags?.includes('due-now')) return `Due in ${item.dueInDays} day${item.dueInDays === 1 ? '' : 's'} — this is the one to do today.`;
  if (item.flags?.includes('due-soon')) return `Due in ${item.dueInDays} days. Block time for it this week.`;
  if (item.flags?.includes('no-date')) {
    return item.resource === 'scholarships'
      ? "Look up this year's actual deadline on the program's site and add it — undated scholarships are the ones people miss."
      : 'Add the real deadline so it shows up in your countdown.';
  }
  if (item.flags?.includes('no-hours')) return "You saved this but haven't logged any time against it. Apply, or set your weekly hours once you start.";
  if (item.flags?.includes('stalled')) return `Untouched for ${item.idleDays} days. Move it forward or drop it — a list you don't believe is worse than a short one.`;
  if (item.stage === 'done') return 'Closed out. Nothing owed here.';
  if (item.stage === 'in_progress') return 'In motion — keep the status current as it moves.';
  return 'Saved. Decide whether you are actually applying, and when.';
}

/** Counts by stage, for the Tracked tab's header tiles. */
export function stageCounts(items = []) {
  const counts = Object.fromEntries(STAGES.map((s) => [s.id, 0]));
  for (const i of items) counts[i.stage] = (counts[i.stage] || 0) + 1;
  return counts;
}

/**
 * The daily tracking report. Deterministic and always available — this is what Meta Brain
 * "reports every day", and it is real regardless of whether the AI call succeeds.
 *
 * Returns { date, headline, lines, focus, empty } where `lines` are the concrete observations
 * (each traceable to a row) and `focus` is the single item to do first, if any.
 */
export function buildDailyReport(items = [], now = Date.now()) {
  const date = new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  if (!items.length) {
    return {
      date, empty: true,
      headline: "Nothing is being tracked yet, so there's nothing to report today.",
      lines: ["Track a program, scholarship, or school and I'll start reporting on it here every day — deadlines, stalls, and what's owed next."],
      focus: null,
    };
  }

  const counts = stageCounts(items);
  const overdue = items.filter((i) => i.flags.includes('overdue'));
  const dueNow = items.filter((i) => i.flags.includes('due-now'));
  const dueSoon = items.filter((i) => i.flags.includes('due-soon'));
  const noDate = items.filter((i) => i.flags.includes('no-date'));
  const stalled = items.filter((i) => i.flags.includes('stalled'));
  const lines = [];

  if (overdue.length) lines.push(`${overdue.length} tracked item${overdue.length === 1 ? ' has' : 's have'} a date that already passed: ${namesOf(overdue)}.`);
  if (dueNow.length) lines.push(`Due within 3 days: ${namesOf(dueNow)}.`);
  if (dueSoon.length) lines.push(`Coming up inside two weeks: ${namesOf(dueSoon)}.`);
  if (noDate.length) lines.push(`${noDate.length} item${noDate.length === 1 ? '' : 's'} still ${noDate.length === 1 ? 'has' : 'have'} no real deadline on ${noDate.length === 1 ? 'it' : 'them'} — ${namesOf(noDate)}. An undated item can't warn you.`);
  if (stalled.length) lines.push(`Untouched for over ${STALE_DAYS} days: ${namesOf(stalled)}.`);
  if (!lines.length) {
    lines.push(`All ${items.length} tracked item${items.length === 1 ? ' is' : 's are'} dated, current, and nothing is due inside two weeks. No action needed today.`);
  }
  if (counts.done) lines.push(`${counts.done} closed out so far — that's real, finished work.`);

  const focus = items.find((i) => i.stage === 'needs_action') || null;
  const headline = overdue.length
    ? `${overdue.length} tracked item${overdue.length === 1 ? '' : 's'} slipped past ${overdue.length === 1 ? 'its' : 'their'} date.`
    : dueNow.length ? `${dueNow.length} thing${dueNow.length === 1 ? '' : 's'} due in the next 3 days.`
      : counts.needs_action ? `${counts.needs_action} tracked item${counts.needs_action === 1 ? ' needs' : 's need'} something from you.`
        : `You're tracking ${items.length} item${items.length === 1 ? '' : 's'} and nothing is behind.`;

  return { date, empty: false, headline, lines, focus, counts };
}

function namesOf(items, max = 4) {
  const names = items.slice(0, max).map((i) => i.name);
  const rest = items.length - names.length;
  return names.join(', ') + (rest > 0 ? `, and ${rest} more` : '');
}

/**
 * The prompt for the AI layer of the daily report. Every fact is handed over pre-computed and
 * the model is explicitly forbidden from inventing status — its job is to be the voice on top of
 * a report that already exists, not to work out what's true.
 */
export function buildReportPrompt(report, items = []) {
  const detail = items.slice(0, 12).map((i) => {
    const bits = [i.kind, i.statusLabel];
    if (i.dueInDays != null) bits.push(i.dueInDays < 0 ? `${Math.abs(i.dueInDays)}d overdue` : `due in ${i.dueInDays}d`);
    if (i.flags.length) bits.push(i.flags.join('/'));
    return `- ${i.name} (${bits.join(', ')})`;
  }).join('\n');
  return `Here is today's factual tracking report for this student's tracked applications, generated deterministically from their real rows. Do not add, invent, or infer any item, date, or status that is not listed here.

Headline: ${report.headline}
Observations:
${report.lines.map((l) => `- ${l}`).join('\n')}

Tracked items:
${detail}

In 2-4 short sentences, speak directly to the student as Meta Brain: tell them what today's report actually means, name the ONE item to do first and why, and keep it plain and encouraging. No bullet lists, no headers, no invented deadlines.`;
}

/**
 * A signature of the tracked set's meaningful state — used as the daily AI cache key so the
 * report regenerates when something actually changes (a status moved, a date landed, an item
 * became overdue) rather than only at midnight.
 */
export function trackedSignature(items = []) {
  return items.map((i) => `${i.key}:${i.stage}:${i.dueInDays ?? 'x'}:${i.flags.join('+')}`).join('|');
}
