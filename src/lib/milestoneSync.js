// ─────────────────────────────────────────────────────────────────────────────
// Two-way milestones.
//
// Saving a program already created milestones. The other direction did not
// exist: a student who finished a combined-degree application had exactly one
// thing they could do to the milestone, which was delete it — and deleting is
// not the same act as finishing. It destroys the record, it leaves the three
// 60/30/7 alerts behind counting down to a date that no longer applies, and it
// leaves the college-list row that produced the milestone still sitting at
// "researching" three weeks after the application went in.
//
// So a milestone can be COMPLETED, and completing it propagates:
//
//     the milestone            →  the thing it came from
//     ─────────────────────────────────────────────────────────────
//     combined-degree due      →  that program's college-list row → "submitted"
//     opportunity due          →  the tracked activity            → "completed"
//     scholarship due          →  the tracked scholarship         → "applied"
//     college round due        →  that college                    → "submitted"
//     any of the above         →  its own 60/30/7 alerts          → completed too
//
// ── The rule that shapes the whole module ───────────────────────────────────
// It only ever moves a status FORWARD, and only from a status that means "not
// yet". A student who has already recorded a decision from a school must never
// have that overwritten by a tidy-up action on a date, and completing an alert
// reminder must never be read as completing the application. Every effect is
// returned as a described patch before it is applied, so the UI can tell the
// student what else it is about to change rather than silently editing three
// other panels.
//
// `source_ref` is the join, written at creation time by whichever panel created
// the row. Format: "<kind>:<id>", and for reminders "alert:<parent-ref>:<days>".
// ─────────────────────────────────────────────────────────────────────────────

import { updateItem } from './dataApi';
import { alertParentRef, isAlertRow } from './milestoneUrgency';

/** Build a source_ref. The one place the format is written. */
export const sourceRef = (kind, id) => (kind && id ? `${kind}:${id}` : null);

/** Split one apart. Returns null for an alert row or anything unrecognised. */
export function parseSourceRef(ref) {
  const s = String(ref || '');
  if (!s || s.startsWith('alert:')) return null;
  const idx = s.indexOf(':');
  if (idx < 1) return null;
  return { kind: s.slice(0, idx), id: s.slice(idx + 1) };
}

/** Statuses that mean "has not happened yet" — the only ones we will move. */
const ADVANCEABLE = {
  colleges: ['researching', 'applying', 'in_progress', null, undefined, ''],
  scholarships: ['researching', 'planning', 'in_progress', null, undefined, ''],
  activities: ['planned', 'ongoing', 'in_progress', null, undefined, ''],
};

const ADVANCE_TO = {
  colleges: 'submitted',
  scholarships: 'applied',
  activities: 'completed',
};

const RESOURCE_LABEL = {
  colleges: 'your college list',
  scholarships: 'your financial-aid tracker',
  activities: 'your activities list',
};

/**
 * What completing this milestone should change elsewhere.
 *
 * Pure: it reads the snapshot and returns described patches without performing
 * any of them, which is what lets the confirmation dialog be specific ("this
 * will also mark Drexel as submitted on your college list") instead of vague.
 *
 * @param {object} row       the `deadlines` row being completed
 * @param {object} snapshot  { colleges, scholarships, activities, deadlines }
 * @returns [{ resource, id, patch, describe }]
 */
export function completionEffects(row, snapshot = {}) {
  const effects = [];
  const seen = new Set();
  const push = (resource, target, patch, describe) => {
    if (!target?.id) return;
    const key = `${resource}:${target.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    effects.push({ resource, id: target.id, patch, describe });
  };

  // 1 — the alerts this row owns. Always, and regardless of what else matches:
  // three reminders counting down to a date that has been dealt with is the
  // single most common way a milestone feed loses a student's trust.
  const ref = row?.source_ref;
  if (ref && !isAlertRow(row)) {
    (snapshot.deadlines || []).forEach(d => {
      if (d.id === row.id || d.completed_at) return;
      if (alertParentRef(d) === ref) {
        push('deadlines', d, { completed_at: new Date().toISOString() },
          `the ${offsetOf(d)}-day reminder for this`);
      }
    });
  }

  // 2 — the thing the milestone came from. An alert row deliberately propagates
  // nothing: finishing a reminder is not finishing the application.
  if (isAlertRow(row)) return effects;

  const parsed = parseSourceRef(ref);
  if (!parsed) {
    // No source_ref, but a college_id — a date the student attached to a school
    // by hand. Only advance the college when the row is plainly the application
    // itself rather than, say, a campus visit.
    if (row?.college_id && /deadline|due|application|submit/i.test(row.title || '')) {
      const college = (snapshot.colleges || []).find(c => c.id === row.college_id);
      advance('colleges', college);
    }
    return effects;
  }

  if (parsed.kind === 'combined' || parsed.kind === 'college') {
    // A tracked combined-degree program IS a college-list row (collegeRowFor in
    // src/lib/combinedDegree.js), so both refer to the same resource.
    const college = (snapshot.colleges || []).find(c => c.id === row.college_id)
      || matchByName(snapshot.colleges, row.title);
    advance('colleges', college);
  } else if (parsed.kind === 'scholarship') {
    const s = (snapshot.scholarships || []).find(x => x.id === parsed.id) || matchByName(snapshot.scholarships, row.title, 'name');
    advance('scholarships', s);
  } else if (parsed.kind === 'opportunity') {
    const a = matchByName(snapshot.activities, row.title, 'organization')
      || matchByName(snapshot.activities, row.title, 'position');
    advance('activities', a);
  }

  return effects;

  function advance(resource, target) {
    if (!target) return;
    if (!ADVANCEABLE[resource].includes(target.status)) return; // never move a recorded outcome backwards or sideways
    push(resource, target, { status: ADVANCE_TO[resource] },
      `${nameOf(target)} → “${ADVANCE_TO[resource]}” on ${RESOURCE_LABEL[resource]}`);
  }
}

const nameOf = (row) => row?.name || row?.position || row?.organization || 'that entry';

const offsetOf = (row) => (String(row?.source_ref || '').match(/:(\d+)$/) || [])[1] || '';

/**
 * Loose name match, for rows created before source_ref existed and for the
 * opportunity rows whose titles are written as "<program name> — …". Prefix
 * matching only: a substring match would let "Red Cross CPR" complete every
 * Red Cross row the student has.
 */
function matchByName(rows, title, field = 'name') {
  const t = String(title || '').toLowerCase();
  if (!t) return null;
  return (rows || []).find(r => {
    const v = String(r?.[field] || '').toLowerCase().trim();
    return v.length > 3 && t.startsWith(v);
  }) || null;
}

/**
 * Complete a milestone and everything it implies.
 * Returns the effects that were actually applied, for the confirmation toast.
 */
export async function completeMilestone(row, snapshot = {}) {
  const effects = completionEffects(row, snapshot);
  await updateItem('deadlines', row.id, { completed_at: new Date().toISOString() });
  const applied = [];
  for (const e of effects) {
    try { await updateItem(e.resource, e.id, e.patch); applied.push(e); }
    catch { /* one failed side-effect must not undo the completion the student asked for */ }
  }
  return applied;
}

/** Undo. Clears the milestone's own completion only — never reverses a status
 *  change elsewhere, because by then the student may have set it deliberately. */
export async function reopenMilestone(row) {
  await updateItem('deadlines', row.id, { completed_at: null });
}

/**
 * A one-sentence plain-English summary of what completing this will also do,
 * for the confirmation prompt. Null when it changes nothing else.
 */
export function describeEffects(effects = []) {
  if (!effects.length) return null;
  const parts = effects.map(e => e.describe);
  if (parts.length === 1) return `This will also update ${parts[0]}.`;
  return `This will also update ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`;
}
