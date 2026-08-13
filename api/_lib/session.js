// Shared session-lookup and role-guard helpers for serverless functions.
//
// ── Why the guards live here and not in each handler ────────────────────────
// A parent is a row in app_users with role='parent' (see the header of
// supabase/migrations/0006_parent_dashboard.sql for why it is not its own table). The consequence
// is that a parent's bearer token authenticates exactly like a student's: every handler written
// before parents existed would happily let a parent write to /api/progress-sync, save a master
// plan, or create portfolio rows — under their OWN user id, which is nonsense data in a student's
// table rather than a data leak, but nonsense that a real student might later be linked to.
//
// So authentication and authorization are separated. getUserFromRequest answers "who is this",
// requireStudent/requireParent answer "may they be here", and every /api handler calls exactly one
// of them. scripts/verifyParentDashboard.mjs asserts that mechanically, because the failure mode
// of forgetting is silent.
import { getSupabaseAdmin, withRetry } from './supabaseAdmin.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a valid session-token shape. Exported so handlers can validate ids without re-typing it. */
export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

export async function getUserFromRequest(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token || !UUID_RE.test(token)) return null;

  const supabase = getSupabaseAdmin();
  const { data: session } = await withRetry(() => supabase
    .from('sessions')
    .select('*, app_users(*)')
    .eq('id', token)
    .maybeSingle());

  if (!session || new Date(session.expires_at) < new Date()) return null;
  return session.app_users;
}

// `role` is NOT NULL DEFAULT 'student' in the schema, but this code also runs against deployments
// where migration 0006 has not been applied by hand yet (migrations here are manual — see the
// header of any migration file). There, the column is simply absent from the row and every account
// is a student, which is exactly what defaulting to 'student' says.
export const roleOf = (user) => (user?.role === 'parent' ? 'parent' : 'student');
export const isParent = (user) => roleOf(user) === 'parent';
export const isStudent = (user) => roleOf(user) === 'student';

/**
 * The student-only chokepoint: authenticates, then rejects parent accounts.
 *
 * Returns the user, or null after having already sent the response — so a handler's first line is
 * `const user = await requireStudent(req, res); if (!user) return;` and there is no way to use the
 * result without having passed the check.
 *
 * The 403 names the reason rather than 404-ing, because a parent hitting a student endpoint is not
 * an attacker probing for data — it is almost always a parent who followed their child's bookmark,
 * and "this is the student's area" is the honest and useful thing to say.
 */
export async function requireStudent(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) { res.status(401).json({ error: 'Not signed in.' }); return null; }
  if (isParent(user)) {
    res.status(403).json({
      error: 'This is a student area. Your parent account can view progress from the parent dashboard.',
      role: 'parent',
    });
    return null;
  }
  return user;
}

/** The mirror of requireStudent, for /api/parent/* endpoints a student must not reach. */
export async function requireParent(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) { res.status(401).json({ error: 'Not signed in.' }); return null; }
  if (!isParent(user)) {
    res.status(403).json({ error: 'This area is for parent accounts.', role: roleOf(user) });
    return null;
  }
  return user;
}

/** Authenticate only — for endpoints both roles legitimately use (profile, logout, export, delete). */
export async function requireUser(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) { res.status(401).json({ error: 'Not signed in.' }); return null; }
  return user;
}

/**
 * The one function that decides whether a parent may see a student's data.
 *
 * Read it on EVERY request that returns student data — never at sign-in, never cached on the
 * session. A session token lives 30 days; consent does not. Re-reading here is what makes
 * revocation take effect on the next request rather than in up to a month, and it is the reason
 * `status = 'active'` is part of the query rather than checked afterwards in JavaScript.
 *
 * Returns the link row, or null when there is no live consent between these two accounts.
 */
export async function getActiveLink(supabase, { parentUserId, studentUserId }) {
  if (!isUuid(parentUserId) || !isUuid(studentUserId)) return null;
  const { data, error } = await supabase
    .from('parent_links')
    .select('id, parent_user_id, student_user_id, status, relationship, accepted_at, created_at')
    .eq('parent_user_id', parentUserId)
    .eq('student_user_id', studentUserId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) return null;
  return data || null;
}

/**
 * The active link with this id, IF the caller is one of its two parties.
 *
 * The symmetric twin of getActiveLink, for the endpoints a student and a parent both use against
 * a relationship they are each half of (api/parent/messages.js). Both the id match and the party
 * check are in the query rather than fetched-then-compared, for the reason the header of that
 * function gives and one more: a party check written in JavaScript against a row you already hold
 * is one early `return` away from being skipped, and the failure is silent.
 *
 * Returns the row — including both user ids, which callers write onto their own rows rather than
 * trusting a request body for — or null.
 */
export async function getActiveLinkForUser(supabase, { linkId, userId }) {
  if (!isUuid(linkId) || !isUuid(userId)) return null;
  const { data, error } = await supabase
    .from('parent_links')
    .select('id, parent_user_id, student_user_id, status, relationship')
    .eq('id', linkId)
    .eq('status', 'active')
    .or(`parent_user_id.eq.${userId},student_user_id.eq.${userId}`)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

/**
 * Every active link this account is a party to, whichever side it sits on.
 *
 * Ids only, no embedded counterparty: the one caller (api/parent/messages.js) needs this to know
 * which threads it may read, and the names it renders come from the summary it already holds.
 * Asking PostgREST for a join it does not need would make this the second place in the codebase
 * that has to spell a foreign-key constraint name correctly.
 */
export async function getActiveLinksForUser(supabase, { userId, role }) {
  if (!isUuid(userId)) return [];
  const mine = role === 'parent' ? 'parent_user_id' : 'student_user_id';
  const other = role === 'parent' ? 'student_user_id' : 'parent_user_id';
  const { data, error } = await supabase
    .from('parent_links')
    .select('id, parent_user_id, student_user_id, relationship')
    .eq(mine, userId)
    .eq('status', 'active')
    .not(other, 'is', null);
  if (error) return [];
  return data || [];
}

/** Every student a parent currently has live consent for. Same per-request re-read as above. */
export async function getActiveLinksForParent(supabase, parentUserId) {
  if (!isUuid(parentUserId)) return [];
  const { data, error } = await supabase
    .from('parent_links')
    .select('id, student_user_id, relationship, accepted_at, app_users!parent_links_student_user_id_fkey(id, name, email, grade_level)')
    .eq('parent_user_id', parentUserId)
    .eq('status', 'active')
    .not('student_user_id', 'is', null);
  if (error) return [];
  return data || [];
}
