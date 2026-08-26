// Client for /api/parent/quests — the one endpoint both the student app and the parent app call.
//
// Kept separate from parentApi.js despite sharing its prefix, because the two have different
// audiences in the student app: parentApi is imported by the family screens, this is imported by
// Home, Prep, SAT, Portfolio, Plans and Progress. A quest call failing must never take a study
// surface down with it, which is why every read here resolves to an empty board rather than
// throwing (see `list`), and only the writes — where the student pressed a button and is owed an
// answer — surface an error.
//
// Explicit .js extension so scripts/verifyQuests.mjs can load it under plain Node.
import { getToken } from './authApi.js';
import { apiFetch, parseJson } from './http.js';

async function req(options = {}) {
  const token = getToken();
  const res = await apiFetch(`/parent/quests${options.search || ''}`, {
    method: options.method || 'GET',
    // One retry for a write, two for a read — same reasoning as dataApi.js:
    // repeating a request whose response was lost can claim a quest twice.
    retries: options.method && options.method !== 'GET' ? 1 : 2,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await parseJson(res).catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed.');
    err.reason = data.reason;
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * The student's own board.
 *
 * Never throws. A signed-out student, an offline phone, or a deployment whose migration has not
 * been applied yet all produce `{ quests: [], available: false }` — and every quest surface in the
 * app renders nothing for an empty board, so the failure mode is "the feature is not there today"
 * rather than a broken Home tab.
 */
export async function list() {
  try {
    const data = await req();
    return { quests: data.quests || [], available: data.available !== false };
  } catch {
    return { quests: [], available: false };
  }
}

/** Every connected student's board. Parent sessions only; same no-throw contract. */
export async function listForParent(studentId = null) {
  try {
    const data = await req({ search: studentId ? `?studentId=${encodeURIComponent(studentId)}` : '' });
    return { students: data.students || [], available: data.available !== false };
  } catch {
    return { students: [], available: false };
  }
}

/**
 * Take on a quest, or hand one to a linked student.
 *
 * `studentId` is meaningful for a parent session only; a student session naming anyone but
 * themselves is refused server-side rather than quietly ignored.
 */
export const assign = ({ questId, studentId = null, note = null }) =>
  req({ method: 'POST', body: { questId, ...(studentId ? { studentId } : {}), ...(note ? { note } : {}) } });

/**
 * Report what the engine computed. Student sessions only.
 *
 * The server takes the max of this and what it already had (see the handler), so calling it with
 * a stale device's smaller number is safe — which is what makes it fine to fire this on a plain
 * interval and after every action, without coordinating between tabs.
 */
export const report = (id, { progress, activeDays }) =>
  req({ method: 'PATCH', body: { id, progress, activeDays } });

/** Take the reward. Returns `{ quest, xp, claimKey }` — the XP is the server's figure. */
export const claim = (id) => req({ method: 'PATCH', body: { id, action: 'claim' } });

/** Refuse a quest a parent assigned. A first-class outcome, not a failure. */
export const decline = (id) => req({ method: 'PATCH', body: { id, action: 'decline' } });

/** Withdraw: a parent takes back their assignment, or a student drops one they set themselves. */
export const withdraw = (id) => req({ method: 'DELETE', body: { id } });
