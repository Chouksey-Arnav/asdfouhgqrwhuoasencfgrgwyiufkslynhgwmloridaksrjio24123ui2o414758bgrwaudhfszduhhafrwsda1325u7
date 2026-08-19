// ─────────────────────────────────────────────────────────────────────────────
// Persistence for the calculator's intake.
//
// `admission_intake` is a singleton per account (one row, unique on user_id —
// see migration 0017), so this module hides the list-or-create dance from every
// caller. The generic CRUD client has no concept of a singleton resource and
// should not grow one for a single table.
//
// Writes are debounced and coalesced. The intake is a fifteen-field form that a
// student edits in bursts, and firing a PATCH per keystroke would be both rude
// to the API and racy — the last response to land would win rather than the
// last edit made.
// ─────────────────────────────────────────────────────────────────────────────
import { listItems, createItem, updateItem } from '../dataApi';

const SAVE_DEBOUNCE_MS = 900;

let cachedRow = null;
let pending = null;
let timer = null;
let inFlight = false;

/** Normalises a stored row into the shape the calculator works with. */
export function unpackIntake(row) {
  if (!row) return { answers: {}, programRounds: {}, id: null, updatedAt: null };
  const answers = (typeof row.answers === 'string' ? safeJson(row.answers) : row.answers) || {};
  const programRounds = (typeof row.program_rounds === 'string' ? safeJson(row.program_rounds) : row.program_rounds) || {};
  return {
    id: row.id,
    updatedAt: row.updated_at || null,
    // The three promoted columns read back as ordinary answers, so the rest of
    // the calculator never has to care which of them live in the blob.
    answers: {
      ...answers,
      ...(row.citizenship ? { citizenship: row.citizenship } : {}),
      ...(row.state_residency ? { stateResidency: row.state_residency } : {}),
      ...(row.grade_level ? { gradeLevel: row.grade_level } : {}),
    },
    programRounds,
  };
}

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

/** Splits the answers object back into promoted columns plus the blob. */
function packIntake({ answers = {}, programRounds = {} }) {
  const { citizenship, stateResidency, gradeLevel, ...rest } = answers;
  return {
    citizenship: citizenship || null,
    state_residency: stateResidency || null,
    grade_level: gradeLevel || null,
    answers: rest,
    program_rounds: programRounds,
  };
}

/**
 * Loads the intake. Accepts an already-fetched snapshot so the Portfolio's one
 * shared fetch (portfolioData.js) covers this too instead of a second request.
 */
export async function loadIntake(snapshot = null) {
  if (snapshot?.admissionIntake) {
    cachedRow = snapshot.admissionIntake[0] || null;
    return unpackIntake(cachedRow);
  }
  const rows = await listItems('admission_intake').catch(() => []);
  cachedRow = rows[0] || null;
  return unpackIntake(cachedRow);
}

/**
 * Queues a save. Returns immediately; the write lands on the debounce.
 *
 * `next` is the WHOLE intake state, not a patch — the form owns it, and sending
 * whole state means a dropped request loses nothing that the next save will not
 * carry anyway.
 */
export function saveIntake(next) {
  pending = next;
  clearTimeout(timer);
  timer = setTimeout(() => { flushIntake().catch(() => {}); }, SAVE_DEBOUNCE_MS);
}

/** Writes any queued intake immediately. Safe to call when nothing is queued. */
export async function flushIntake() {
  clearTimeout(timer);
  if (!pending || inFlight) return null;
  const payload = packIntake(pending);
  pending = null;
  inFlight = true;
  try {
    if (cachedRow?.id) {
      cachedRow = await updateItem('admission_intake', cachedRow.id, payload);
    } else {
      cachedRow = await createItem('admission_intake', payload);
    }
    return unpackIntake(cachedRow);
  } catch (err) {
    // The form keeps its own state, so a failed save costs the student nothing
    // this session — it just does not survive a reload. Re-queue so the next
    // edit (or an explicit flush) retries rather than silently giving up.
    if (!pending) pending = { answers: unpackIntake(cachedRow).answers, programRounds: unpackIntake(cachedRow).programRounds };
    throw err;
  } finally {
    inFlight = false;
    if (pending) { clearTimeout(timer); timer = setTimeout(() => { flushIntake().catch(() => {}); }, SAVE_DEBOUNCE_MS); }
  }
}

/** Drops the module-level cache. Called on sign-out so a second account on the
 *  same browser never sees the first one's intake. */
export function resetIntakeCache() {
  cachedRow = null; pending = null; inFlight = false; clearTimeout(timer);
}
