// /api/parent/quests — assignment, progress and claiming for long-horizon quests.
//
//   GET                          → student: { role:'student', quests, assigners }
//                                  parent:  { role:'parent',  students:[{ studentId, quests }] }
//   GET  ?studentId=<uuid>       → parent, narrowed to one child
//   POST { questId, studentId?, note? }        → { quest }   assign (self, or to a linked child)
//   PATCH { id, progress, activeDays }         → { quest }   student reports progress
//   PATCH { id, action:'claim' }               → { quest, xp } student takes the reward
//   PATCH { id, action:'decline' }             → { quest }   student refuses an assigned quest
//   DELETE { id }                              → { ok }      assigner withdraws
//
// ── Why this lives under /api/parent when a student uses it constantly ─────
// Because the interesting question it answers is a parent question. Assignment is the reason the
// table exists; self-assignment is the same code path with `parent_user_id` null. Putting it
// beside links/messages/summary keeps every endpoint that can see across the parent-student
// boundary in one directory, which is the property that makes "what can a parent's session
// actually reach" answerable by listing a folder.
//
// ── Authorization, in one sentence each ────────────────────────────────────
//   A student may only ever name their own quests (`student_user_id = user.id`, in the query).
//   A parent may only name a student they hold an ACTIVE link to, re-read per request, exactly as
//   api/parent/summary.js does — so revoking consent stops assignment on the very next request
//   rather than whenever the 30-day session lapses.
//   Neither may put a number in the body that becomes a reward: every numeric column is looked up
//   from api/_lib/questCatalog.js by quest id. See that file's header.
//
// ── What the server will not do ────────────────────────────────────────────
// It does not compute progress (it cannot see the evidence — that lives in the student's
// IndexedDB; see migration 0014's header), and it does not grant XP. Claiming here marks the row
// and returns the catalog's XP figure; the actual grant goes through the existing idempotent
// reward-claim path (api/reward-claim.js, claim_key `quest:assigned:<row id>`), which is the only
// thing in this product that can pay a milestone exactly once across devices.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireUser, roleOf, isUuid, getActiveLink, getActiveLinksForParent } from '../_lib/session.js';
import { assignableSpec, isKnownQuest, meetsCompletion, minimumDays } from '../_lib/questCatalog.js';

// How many quests one student may have running at once, and how many of those a parent may have
// put there. Both are product limits rather than anti-abuse ones.
//
// Five is the number at which a quest board stops being a commitment and starts being a to-do
// list — and a student with nine simultaneous month-long quests has, functionally, none. Three
// parent-assigned is deliberately below that: a parent who can fill the entire board leaves no
// room for the student to choose anything, and a quest nobody chose is the kind that gets
// declined. See migration 0014 on why `declined` exists at all.
const MAX_ACTIVE = 5;
const MAX_PARENT_ACTIVE = 3;
const MAX_NOTE = 600;

const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
const isMissingSchema = (err) => !!err
  && (MISSING_SCHEMA.has(err.code) || /does not exist|schema cache/i.test(err.message || ''));

// Postgres's unique_violation — here it can only be student_quests_one_live_per_quest, i.e. the
// student already has this exact quest running. Worth its own message: "you already have this
// one" is a different fact from "something went wrong", and a parent who assigns a quest their
// child had already picked deserves to be told which of those happened.
const UNIQUE_VIOLATION = '23505';

const SELECT = `
  id, student_user_id, assigned_by, parent_user_id, link_id, quest_id, title, tier, metric,
  xp, target, window_days, daily_cap, min_active_days, note, status, progress, active_days,
  reported_at, started_at, due_at, completed_at, claimed_at, ended_at, ended_reason, created_at
`;

const LIVE = ['active', 'completed'];

/** Row → the shape both apps render. camelCase, and nothing the caller cannot already see. */
const serialize = (row, { assignerName = null } = {}) => ({
  id: row.id,
  questId: row.quest_id,
  title: row.title,
  tier: row.tier,
  metric: row.metric,
  xp: row.xp,
  target: row.target,
  windowDays: row.window_days,
  dailyCap: row.daily_cap,
  minActiveDays: row.min_active_days,
  minimumDays: minimumDays(row.quest_id),
  note: row.note || null,
  status: row.status,
  assignedBy: row.assigned_by,
  // The name, never the id or the address. A student's card says "Mum asked for this", which is
  // the entire reason an assigned quest lands differently from one they picked — and it is all
  // the student app needs to say it.
  assignerName: row.assigned_by === 'parent' ? assignerName : null,
  progress: row.progress,
  activeDays: row.active_days,
  reportedAt: row.reported_at || null,
  startedAt: new Date(row.started_at).getTime(),
  dueAt: new Date(row.due_at).getTime(),
  completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
  claimedAt: row.claimed_at ? new Date(row.claimed_at).getTime() : null,
  endedReason: row.ended_reason || null,
  createdAt: new Date(row.created_at).getTime(),
});

const clampInt = (v, max = 1e9) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
};

/** Names for the parent ids appearing on a student's rows, in one query. */
async function assignerNames(supabase, rows) {
  const ids = [...new Set(rows.map((r) => r.parent_user_id).filter(Boolean))];
  if (!ids.length) return {};
  const { data } = await supabase.from('app_users').select('id, name').in('id', ids);
  return Object.fromEntries((data || []).map((u) => [u.id, u.name || null]));
}

/**
 * Expire anything whose window closed while nobody was looking.
 *
 * Runs on read rather than on a schedule: this product has no cron, and a quest that still says
 * "4 days left" a week after it lapsed is worse than one that says nothing. Only ever moves
 * `active` rows — a `completed` quest that was never claimed keeps its reward available, because
 * the student did the work inside the window and losing the XP to a missed tap would be a bug
 * that reads as a betrayal.
 */
async function expireLapsed(supabase, studentIds) {
  if (!studentIds.length) return;
  await supabase
    .from('student_quests')
    .update({ status: 'expired', ended_at: new Date().toISOString(), ended_reason: 'Time ran out' })
    .in('student_user_id', studentIds)
    .eq('status', 'active')
    .lt('due_at', new Date().toISOString());
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

  const role = roleOf(user);
  const supabase = getSupabaseAdmin();

  const readBody = () => {
    try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
    catch { return null; }
  };

  try {
    // ── Read ────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      if (role === 'student') {
        await expireLapsed(supabase, [user.id]);
        const { data, error } = await supabase
          .from('student_quests')
          .select(SELECT)
          .eq('student_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        const names = await assignerNames(supabase, data || []);
        return res.status(200).json({
          role,
          quests: (data || []).map((r) => serialize(r, { assignerName: names[r.parent_user_id] })),
        });
      }

      // A parent sees the quests on each child they are linked to — all of them, including the
      // ones the student set for themselves. That is not a privacy expansion: a quest is a public
      // commitment by construction (it is the one thing in the app designed to be seen by someone
      // else), and a dashboard that hid self-set quests would show a parent an empty board for a
      // student working hard on three of their own.
      const links = await getActiveLinksForParent(supabase, user.id);
      if (!links.length) return res.status(200).json({ role, students: [] });

      const wanted = String(req.query?.studentId || '').trim();
      const scoped = wanted
        ? links.filter((l) => l.student_user_id === wanted)
        : links;
      if (wanted && !scoped.length) {
        return res.status(403).json({ error: 'You are not connected to that student.' });
      }

      const ids = scoped.map((l) => l.student_user_id);
      await expireLapsed(supabase, ids);
      const { data, error } = await supabase
        .from('student_quests')
        .select(SELECT)
        .in('student_user_id', ids)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const names = await assignerNames(supabase, data || []);
      const byStudent = new Map(ids.map((id) => [id, []]));
      for (const row of (data || [])) {
        byStudent.get(row.student_user_id)?.push(serialize(row, { assignerName: names[row.parent_user_id] }));
      }
      return res.status(200).json({
        role,
        students: scoped.map((l) => ({
          studentId: l.student_user_id,
          name: l.app_users?.name || null,
          linkId: l.id,
          quests: byStudent.get(l.student_user_id) || [],
        })),
      });
    }

    // ── Assign ──────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = readBody();
      if (!body) return res.status(400).json({ error: 'Invalid JSON body.' });

      const questId = String(body.questId || '').trim();
      if (!isKnownQuest(questId)) {
        return res.status(400).json({ error: 'That is not a quest.', reason: 'unknown_quest' });
      }
      // Every number on the row comes from here. Nothing numeric is read off the request.
      const spec = assignableSpec(questId);

      // Who it is for, and who is asking.
      let studentId = user.id;
      let parentUserId = null;
      let linkId = null;
      if (role === 'parent') {
        studentId = String(body.studentId || '').trim();
        if (!isUuid(studentId)) return res.status(400).json({ error: 'Choose a student.' });
        const link = await getActiveLink(supabase, { parentUserId: user.id, studentUserId: studentId });
        if (!link) return res.status(403).json({ error: 'You are not connected to that student.', reason: 'no_link' });
        parentUserId = user.id;
        linkId = link.id;
      } else if (body.studentId && body.studentId !== user.id) {
        // A student naming somebody else. Not a 403 with an explanation — there is nothing to
        // explain, and confirming that the id exists would be the leak.
        return res.status(403).json({ error: 'You can only take on your own quests.' });
      }

      await expireLapsed(supabase, [studentId]);

      const { data: live, error: liveErr } = await supabase
        .from('student_quests')
        .select('id, assigned_by, quest_id')
        .eq('student_user_id', studentId)
        .in('status', LIVE);
      if (liveErr) throw liveErr;

      if ((live || []).length >= MAX_ACTIVE) {
        return res.status(409).json({
          error: role === 'parent'
            ? `They already have ${MAX_ACTIVE} quests running. Quests are commitments, not a to-do list — let one finish first.`
            : `You already have ${MAX_ACTIVE} quests running. Finish or drop one first.`,
          reason: 'too_many_active',
        });
      }
      if (role === 'parent' && (live || []).filter((q) => q.assigned_by === 'parent').length >= MAX_PARENT_ACTIVE) {
        return res.status(409).json({
          error: `You have already assigned ${MAX_PARENT_ACTIVE} quests. Leave them room to choose their own.`,
          reason: 'too_many_parent_active',
        });
      }

      const note = body.note == null ? null : String(body.note).trim().slice(0, MAX_NOTE) || null;
      const now = Date.now();

      const { data, error } = await supabase
        .from('student_quests')
        .insert({
          ...spec,
          student_user_id: studentId,
          assigned_by: role === 'parent' ? 'parent' : 'self',
          parent_user_id: parentUserId,
          link_id: linkId,
          note,
          started_at: new Date(now).toISOString(),
          due_at: new Date(now + spec.window_days * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select(SELECT)
        .single();
      if (error) {
        if (error.code === UNIQUE_VIOLATION) {
          return res.status(409).json({
            error: role === 'parent'
              ? 'They already have that quest running — including, possibly, because they picked it themselves.'
              : 'That quest is already running.',
            reason: 'already_running',
          });
        }
        throw error;
      }

      return res.status(200).json({ quest: serialize(data, { assignerName: user.name || null }) });
    }

    // ── Report progress, claim, or decline ──────────────────────────────────
    if (req.method === 'PATCH') {
      const body = readBody();
      if (!body) return res.status(400).json({ error: 'Invalid JSON body.' });
      if (role !== 'student') {
        // A parent marking their own assignment complete would be writing their child's homework
        // record for them — the same line api/parent/messages.js draws on answering.
        return res.status(403).json({ error: 'Only the student can update a quest.', reason: 'wrong_role' });
      }

      const id = String(body.id || '').trim();
      if (!isUuid(id)) return res.status(400).json({ error: 'Missing quest id.' });

      // Scoped to this student in the query, so there is no row to compare ids against later.
      const { data: row, error: readErr } = await supabase
        .from('student_quests')
        .select(SELECT)
        .eq('id', id)
        .eq('student_user_id', user.id)
        .maybeSingle();
      if (readErr) throw readErr;
      if (!row) return res.status(404).json({ error: 'That quest no longer exists.' });

      const action = String(body.action || 'report');
      const nowIso = new Date().toISOString();

      if (action === 'decline') {
        if (row.assigned_by !== 'parent') {
          return res.status(400).json({ error: 'Drop your own quests instead of declining them.', reason: 'not_assigned' });
        }
        if (row.status !== 'active') {
          return res.status(409).json({ error: 'That quest is not running.', reason: 'not_active' });
        }
        const { data, error } = await supabase
          .from('student_quests')
          .update({ status: 'declined', ended_at: nowIso, ended_reason: 'Declined' })
          .eq('id', id).eq('student_user_id', user.id)
          .select(SELECT).single();
        if (error) throw error;
        return res.status(200).json({ quest: serialize(data) });
      }

      if (action === 'claim') {
        // Only a row the server itself has already moved to `completed` can be claimed, and the
        // completion check is re-run here rather than trusted from the status column — belt and
        // braces, because this is the one branch that ends in XP.
        if (row.status === 'claimed') {
          return res.status(409).json({ error: 'Already claimed.', reason: 'already_claimed' });
        }
        if (row.status !== 'completed' || !meetsCompletion(row)) {
          return res.status(409).json({ error: 'That quest is not finished yet.', reason: 'not_complete' });
        }
        const { data, error } = await supabase
          .from('student_quests')
          .update({ status: 'claimed', claimed_at: nowIso, ended_at: nowIso, ended_reason: 'Completed' })
          .eq('id', id).eq('student_user_id', user.id)
          // Only from `completed`: two devices tapping Claim at the same moment means exactly one
          // of them updates a row, and the other is told it was already claimed. The XP itself is
          // deduped again downstream by reward_claims — this just stops the second tap looking
          // like a success.
          .eq('status', 'completed')
          .select(SELECT).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(409).json({ error: 'Already claimed.', reason: 'already_claimed' });
        // `xp` is the server's number, from the row that was written from the server's catalog.
        // The client passes it to /api/reward-claim; it never chooses it.
        return res.status(200).json({
          quest: serialize(data),
          xp: data.xp,
          claimKey: `quest:assigned:${data.id}`,
        });
      }

      // Default: a progress report.
      if (row.status !== 'active' && row.status !== 'completed') {
        return res.status(409).json({ error: 'That quest is over.', reason: 'not_active' });
      }

      const progress = Math.min(clampInt(body.progress), row.target);
      const activeDays = Math.min(clampInt(body.activeDays), 400);

      // Monotonic. A device that has synced less of the student's history than another one must
      // not be able to walk a quest backwards — the engine is deterministic, so a lower number is
      // always a less complete view of the same evidence, never a correction.
      const nextProgress = Math.max(row.progress, progress);
      const nextActiveDays = Math.max(row.active_days, activeDays);

      const candidate = { ...row, progress: nextProgress, active_days: nextActiveDays };
      const nowComplete = meetsCompletion(candidate);

      const patch = {
        progress: nextProgress,
        active_days: nextActiveDays,
        reported_at: nowIso,
      };
      if (nowComplete && row.status === 'active') {
        patch.status = 'completed';
        patch.completed_at = nowIso;
      }

      const { data, error } = await supabase
        .from('student_quests')
        .update(patch)
        .eq('id', id).eq('student_user_id', user.id)
        .select(SELECT).single();
      if (error) throw error;
      return res.status(200).json({ quest: serialize(data) });
    }

    // ── Withdraw ────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const body = readBody();
      if (!body) return res.status(400).json({ error: 'Invalid JSON body.' });
      const id = String(body.id || '').trim();
      if (!isUuid(id)) return res.status(400).json({ error: 'Missing quest id.' });

      // Whoever put it there may take it away, and nobody else. A student dropping a quest their
      // parent assigned is a `decline` (above), which is a different word on purpose: it is
      // visible on the parent's board as a refusal rather than disappearing as a cancellation.
      const scope = supabase
        .from('student_quests')
        .update({
          status: 'cancelled',
          ended_at: new Date().toISOString(),
          ended_reason: role === 'parent' ? 'Withdrawn by parent' : 'Dropped',
        })
        .eq('id', id)
        .in('status', LIVE);

      const { data, error } = role === 'parent'
        ? await scope.eq('parent_user_id', user.id).select('id').maybeSingle()
        : await scope.eq('student_user_id', user.id).eq('assigned_by', 'self').select('id').maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(404).json({
          error: role === 'parent'
            ? 'That quest is not one of yours to withdraw.'
            : 'You can decline an assigned quest, but only drop your own.',
          reason: 'not_yours',
        });
      }
      return res.status(200).json({ ok: true, id: data.id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    // Migrations here are applied by hand (see any migration header), so "the code is ahead of the
    // schema" is a real deployment state. A reader degrades to an empty board — every surface
    // around it still works, because every quest surface in the app renders nothing when the list
    // is empty — and a writer says plainly that the feature is not on yet.
    if (isMissingSchema(err)) {
      return req.method === 'GET'
        ? res.status(200).json({ role, quests: [], students: [], available: false })
        : res.status(503).json({ error: 'Quests are not available on this deployment yet.', reason: 'schema_missing' });
    }
    console.error('quests error:', err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}

export { MAX_ACTIVE, MAX_PARENT_ACTIVE };
