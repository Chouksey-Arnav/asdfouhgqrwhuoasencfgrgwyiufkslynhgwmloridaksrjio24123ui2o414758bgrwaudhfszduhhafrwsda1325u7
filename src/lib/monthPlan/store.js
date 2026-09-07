// ─────────────────────────────────────────────────────────────────────────────
// The month plan's side effects: the two writes it makes, and nothing else.
//
// The plan document itself rides the user record (App.jsx's saveUser owns the
// local Dexie copy and the progress_sync snapshot), exactly the way the
// twelve-month roadmap and the master plan do. There is deliberately no second
// table for it: a month plan is small, it is rebuilt cheaply, and a durable
// table for it would be a fourth place a student's plan could disagree with
// itself.
//
// What DOES go to the server is the part other features have to see:
//
//   1. recommendation_feedback — every state a student puts an action into.
//      This is the same table Medabrain's context block, the master plan
//      generator and the opportunity matcher already read, so a decision made
//      once on a roadmap card is respected everywhere without any of them
//      knowing this feature exists.
//   2. checkins — the weekly check-in, which is what re-ranks the plan.
//
// Every function resolves to a benign value on any failure. Losing a feedback
// write costs a future suppression; throwing would cost the student the
// interaction they were in the middle of, which is much worse.
// ─────────────────────────────────────────────────────────────────────────────
import { listItems, createItem, updateItem } from '../dataApi';
import { invalidateStudentIntel } from '../studentIntel/store';
import { currentWeekKey } from '../studentIntel/checkins';
import { RECOMMENDATION_STATUS } from './model.js';
import { feedbackRowFor } from './adapt.js';

/**
 * Mirror one action state into recommendation_feedback.
 *
 * Upserts on `item_ref`: a student who marks something "too expensive" and then
 * "completed" a month later should have ONE row saying completed, not two rows
 * that disagree. The lookup is a list-and-match rather than a server-side
 * upsert because api/data/[resource].js is a generic CRUD layer with no
 * conflict target — the same pattern every other singleton-ish write in this
 * app uses.
 */
export async function recordActionFeedback(action, status, note = '') {
  const row = feedbackRowFor(action, status, note, RECOMMENDATION_STATUS);
  if (!row) return null;
  try {
    const existing = await listItems('recommendation_feedback').catch(() => []);
    const match = (existing || []).find((r) => r.item_ref && r.item_ref === row.item_ref);
    const saved = match
      ? await updateItem('recommendation_feedback', match.id, { status: row.status, note: row.note, item_label: row.item_label })
      : await createItem('recommendation_feedback', row);
    // The tutoring surfaces cache their intel slice; a refusal recorded here
    // has to reach the next chat send rather than the next page load.
    invalidateStudentIntel();
    return saved;
  } catch {
    return null;
  }
}

/**
 * Submit a weekly check-in.
 *
 * `changes` is the optional structured half (the migration's `changes` jsonb) —
 * whichever of the small set of questions the student actually answered.
 * `raw_text` is whatever they typed or dictated, kept verbatim, and it is what
 * the coach reads as current.
 */
export async function submitCheckin({ text = '', changes = {} } = {}) {
  const raw = String(text || '').trim();
  if (!raw && !Object.keys(changes || {}).length) return null;
  try {
    const saved = await createItem('checkins', {
      week_key: currentWeekKey(),
      raw_text: raw || null,
      changes: changes || {},
    });
    invalidateStudentIntel();
    return saved;
  } catch {
    return null;
  }
}

/**
 * Record an optional academic update at a grading-quarter boundary.
 *
 * Two writes, both optional and both skippable: the GPA entry itself, and the
 * school-context row that carries the course list and their own words about
 * workload. Either half can be submitted alone.
 */
export async function submitAcademicUpdate({ gpa = null, term = '', weighted = false, rigor = '', courses = null, workloadNotes = '' } = {}) {
  const results = { gpa: null, context: null };
  try {
    if (gpa != null && String(gpa).trim() !== '') {
      results.gpa = await createItem('gpa_entries', {
        term: String(term || '').slice(0, 60) || 'Latest term',
        gpa: Number(gpa),
        weighted: !!weighted,
        course_rigor: String(rigor || '').slice(0, 200) || null,
      });
    }
  } catch { /* the context half is still worth writing */ }
  try {
    if ((Array.isArray(courses) && courses.length) || String(workloadNotes || '').trim()) {
      const existing = await listItems('school_context').catch(() => []);
      const patch = {
        ...(Array.isArray(courses) && courses.length ? { current_courses: courses.slice(0, 20) } : {}),
        ...(String(workloadNotes || '').trim() ? { workload_notes: String(workloadNotes).slice(0, 600) } : {}),
      };
      results.context = existing?.[0]
        ? await updateItem('school_context', existing[0].id, patch)
        : await createItem('school_context', patch);
    }
  } catch { /* best effort — an update nobody asked for must never block the UI */ }
  invalidateStudentIntel();
  return results;
}

/**
 * Log a piece of portfolio evidence a completed action produced.
 *
 * Deliberately writes to `quick_notes` rather than guessing which structured
 * table the evidence belongs in: the student has just typed a sentence about
 * something they did, and forcing that into an activity/award/competition shape
 * at the moment of capture is how capture stops happening. The existing
 * extraction pass (src/lib/studentIntel/extract.js) is what turns it structured
 * later, on their terms.
 */
export async function logEvidence({ text = '', actionTitle = '' } = {}) {
  const body = String(text || '').trim();
  if (!body) return null;
  try {
    const saved = await createItem('quick_notes', {
      raw_text: actionTitle ? `${actionTitle} — ${body}` : body,
      category: 'evidence',
    });
    invalidateStudentIntel();
    return saved;
  } catch {
    return null;
  }
}
