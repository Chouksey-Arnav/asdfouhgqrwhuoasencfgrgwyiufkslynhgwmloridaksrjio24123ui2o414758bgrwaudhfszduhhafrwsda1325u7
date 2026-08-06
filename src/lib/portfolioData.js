// ─────────────────────────────────────────────────────────────────────────────
// One fetch of the whole Portfolio, shared by everything on the Overview and Tracked tabs.
//
// Before this existed, four different surfaces each did their own Promise.all over
// /api/data/[resource] with slightly different resource lists (PortfolioMedabrain's twelve,
// OpportunitiesDatabase's three, App.jsx's two separate effects) — so opening Portfolio fired
// the same requests several times, and the weekly-goal dashboards, the tracked list, and the AI
// could each be reasoning over a different snapshot of the same account.
//
// The snapshot is deliberately a plain object of raw rows: every consumer (weeklyGoals.js's
// metric registry, trackedItems.js's status classifier) does its own derivation from real
// columns, so there is exactly one place that talks to the network and no derived value gets
// stale independently of the rows it came from.
// ─────────────────────────────────────────────────────────────────────────────
import { listItems } from './dataApi';
import * as DB from './db';

/** Resource name → snapshot key. Order is irrelevant; every fetch runs in parallel. */
const RESOURCE_MAP = {
  activities: 'activities',
  awards: 'awards',
  colleges: 'colleges',
  deadlines: 'deadlines',
  essays: 'essays',
  essay_versions: 'essayVersions',
  scholarships: 'scholarships',
  research_experience: 'research',
  skills_certifications: 'skills',
  clinical_hours: 'clinicalHours',
  recommenders: 'recommenders',
  gpa_entries: 'gpaEntries',
};

export const EMPTY_SNAPSHOT = Object.freeze({
  ...Object.fromEntries(Object.values(RESOURCE_MAP).map((k) => [k, []])),
  interviewSessions: [],
  fetchedAt: null,
  partial: false,
});

/**
 * Fetches every Portfolio resource in parallel.
 *
 * A single failing resource degrades to an empty array rather than rejecting the whole
 * snapshot — a dashboard that renders eleven of twelve trackers is strictly better than one
 * that renders a spinner forever because `awards` 500'd. `partial` says whether that happened,
 * so the UI can be honest about it instead of quietly showing zeros as if they were real.
 */
export async function buildPortfolioSnapshot() {
  const entries = Object.entries(RESOURCE_MAP);
  const results = await Promise.all([
    ...entries.map(([resource]) => listItems(resource).then((rows) => rows || []).catch(() => null)),
    DB.getInterviewSessions().then((rows) => rows || []).catch(() => null),
  ]);
  const snapshot = { ...EMPTY_SNAPSHOT, fetchedAt: Date.now(), partial: false };
  entries.forEach(([, key], i) => {
    const rows = results[i];
    if (rows === null) snapshot.partial = true;
    snapshot[key] = rows || [];
  });
  const sessions = results[entries.length];
  if (sessions === null) snapshot.partial = true;
  snapshot.interviewSessions = sessions || [];
  return snapshot;
}

/** True when the student has literally nothing in their Portfolio yet. */
export function isEmptySnapshot(snapshot) {
  if (!snapshot) return true;
  return Object.values(RESOURCE_MAP).every((key) => !(snapshot[key] || []).length)
    && !(snapshot.interviewSessions || []).length;
}

/** Total across every resource — the "N things tracked" figure. */
export function snapshotItemCount(snapshot) {
  if (!snapshot) return 0;
  return Object.values(RESOURCE_MAP).reduce((sum, key) => sum + (snapshot[key] || []).length, 0);
}

/**
 * Whole weeks until the student's nearest future deadline, or null when nothing is dated.
 * Feeds recommendTarget()'s deadline-pressure term — the only thing in the recommender allowed
 * to raise a number, and only because this comes from a real date the student entered.
 */
export function weeksToNearestDeadline(snapshot, now = new Date()) {
  const dates = [
    ...(snapshot?.deadlines || []).map((d) => d.due_date),
    ...(snapshot?.scholarships || []).map((s) => s.deadline),
    ...(snapshot?.colleges || []).flatMap((c) => [c.ea_ed_deadline, c.rd_deadline, c.financial_aid_deadline]),
    ...(snapshot?.recommenders || []).map((r) => r.due_date),
  ].filter(Boolean).map((d) => new Date(`${String(d).slice(0, 10)}T00:00:00`).getTime()).filter((t) => !Number.isNaN(t));
  const future = dates.filter((t) => t >= now.getTime()).sort((a, b) => a - b);
  if (!future.length) return null;
  return Math.max(0, (future[0] - now.getTime()) / (7 * 86400000));
}

/** Standing weekly commitment across ongoing activities — recommendTarget()'s load term. */
export function currentLoadHours(snapshot) {
  return (snapshot?.activities || [])
    .filter((a) => a.status === 'ongoing')
    .reduce((s, a) => s + (parseFloat(a.hours_per_week) || 0), 0);
}
