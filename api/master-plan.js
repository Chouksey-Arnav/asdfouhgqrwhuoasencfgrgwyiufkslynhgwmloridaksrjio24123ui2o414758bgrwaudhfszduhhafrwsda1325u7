// /api/master-plan — durable server-side storage for the Plans tab's master plan.
//
//   GET                 → { plan, revision, clientUpdatedAt, updatedAt }
//   GET ?history=1      → { history: [{ revision, headline, reason, createdAt, planStartDate }] }
//   GET ?revision=<n>   → { plan } for one archived revision (used by "restore this version")
//   PUT  { plan, reason?, force? } → { saved, stale, plan?, revision }
//   DELETE              → drops the stored plan and its history (student rebuilt from scratch)
//
// Everything is scoped to the signed-in user server-side; the client never touches Supabase
// directly. See supabase/migrations/0005_master_plans.sql for why the plan gets its own table
// instead of riding along inside the progress_sync blob, and for the concurrency rules the
// save_master_plan() RPC enforces.
//
// This endpoint is an UPGRADE, never a dependency: every failure path returns a shape the
// client treats as "no server copy", and src/lib/masterPlanStore.js keeps the plan working out
// of the existing local + progress_sync path when this table has not been migrated in yet.
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireStudent } from './_lib/session.js';

// A plan is a rolling ~2-3 week window of day detail plus the roadmap spine — a few hundred KB
// at the outside. The cap is generous enough that no real plan hits it and tight enough that a
// corrupted client loop cannot write unbounded rows.
const MAX_BYTES = 1024 * 1024;

// Postgres error codes meaning "this project has not run migration 0005 yet". Treated as an
// empty result rather than a failure, so an un-migrated deployment degrades to the old
// blob-only behavior instead of showing the student an error they cannot act on.
const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
const isMissingSchema = (err) => !!err && (MISSING_SCHEMA.has(err.code) || /does not exist|schema cache/i.test(err.message || ''));

function planStamp(plan) {
  const v = Number(plan?.updatedAt);
  return Number.isFinite(v) ? Math.trunc(v) : 0;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireStudent(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const wantsHistory = req.query?.history === '1' || req.query?.history === 'true';
      const revision = req.query?.revision ? parseInt(Array.isArray(req.query.revision) ? req.query.revision[0] : req.query.revision, 10) : null;

      if (Number.isFinite(revision)) {
        const { data, error } = await supabase
          .from('master_plan_revisions')
          .select('plan, revision, created_at')
          .eq('user_id', user.id)
          .eq('revision', revision)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) { if (isMissingSchema(error)) return res.status(200).json({ plan: null }); throw error; }
        return res.status(200).json({ plan: data?.plan || null, revision: data?.revision ?? null, createdAt: data?.created_at || null });
      }

      if (wantsHistory) {
        const { data, error } = await supabase
          .from('master_plan_revisions')
          .select('revision, headline, reason, created_at, plan')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) { if (isMissingSchema(error)) return res.status(200).json({ history: [] }); throw error; }
        // The plan bodies are fetched but not returned — a history list is a picker, and
        // shipping ten full plans to render ten rows would be megabytes for nothing.
        return res.status(200).json({
          history: (data || []).map(r => ({
            revision: r.revision,
            headline: r.headline || r.plan?.headline || 'Previous plan',
            reason: r.reason || null,
            createdAt: r.created_at,
            planStartDate: r.plan?.startDate || null,
            horizonWeeks: r.plan?.horizonWeeks || null,
          })),
        });
      }

      const { data, error } = await supabase
        .from('master_plans')
        .select('plan, revision, client_updated_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) { if (isMissingSchema(error)) return res.status(200).json({ plan: null, unavailable: true }); throw error; }
      return res.status(200).json({
        plan: data?.plan || null,
        revision: data?.revision ?? null,
        clientUpdatedAt: data?.client_updated_at ?? null,
        updatedAt: data?.updated_at || null,
      });
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body.' });
      }
      const plan = body?.plan;
      if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return res.status(400).json({ error: 'Missing plan.' });
      if (!Array.isArray(plan.days)) return res.status(400).json({ error: 'Plan is missing its days.' });
      if (JSON.stringify(plan).length > MAX_BYTES) return res.status(413).json({ error: 'Plan too large.' });

      const { data, error } = await supabase.rpc('save_master_plan', {
        p_user_id: user.id,
        p_plan: plan,
        p_client_updated_at: planStamp(plan),
        p_reason: typeof body?.reason === 'string' ? body.reason.slice(0, 120) : null,
        p_force: body?.force === true,
      });
      if (error) { if (isMissingSchema(error)) return res.status(200).json({ saved: false, unavailable: true }); throw error; }
      // `stale` means the server already holds a NEWER plan (another device) and kept it. The
      // stored plan travels back so the client can adopt it rather than retrying its own.
      return res.status(200).json({ saved: !data?.stale, stale: !!data?.stale, plan: data?.stale ? data.plan : undefined, revision: data?.revision ?? null });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('master_plans').delete().eq('user_id', user.id);
      if (error && !isMissingSchema(error)) throw error;
      const { error: histError } = await supabase.from('master_plan_revisions').delete().eq('user_id', user.id);
      if (histError && !isMissingSchema(histError)) throw histError;
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('master-plan error:', err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}
