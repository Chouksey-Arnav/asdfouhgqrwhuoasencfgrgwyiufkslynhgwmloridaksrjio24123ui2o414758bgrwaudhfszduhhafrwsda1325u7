// /api/roadmap — durable server-side storage for the Roadmap tab's twelve-month roadmap.
//
//   GET                 → { roadmap, revision, clientUpdatedAt, updatedAt }
//   GET ?history=1      → { history: [{ revision, headline, reason, createdAt, startDate, itemCount }] }
//   GET ?revision=<n>   → { roadmap } for one archived revision (used by "restore this version")
//   PUT  { roadmap, reason?, force? } → { saved, stale, roadmap?, revision }
//   DELETE              → drops the stored roadmap and its history
//
// Everything is scoped to the signed-in student server-side; the client never touches Supabase
// directly. See supabase/migrations/0015_roadmaps.sql for why the roadmap gets its own table
// rather than riding inside the progress_sync blob or alongside the master plan, and for the
// concurrency rules save_roadmap() enforces.
//
// This endpoint is an UPGRADE, never a dependency: every failure path returns a shape the client
// treats as "no server copy", and src/lib/roadmap/store.js keeps the roadmap working out of the
// local copy on a deployment where migration 0015 has not been applied by hand yet.
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireStudent } from './_lib/session.js';

// A roadmap is a year of items, each with its steps, rationale and preparation notes — a few
// hundred KB at the outside. Generous enough that no real roadmap approaches it, tight enough
// that a corrupted client loop cannot write unbounded rows.
const MAX_BYTES = 1024 * 1024;

// Postgres error codes meaning "this project has not run migration 0015 yet". Treated as an empty
// result rather than a failure, so an un-migrated deployment degrades to local-only storage
// instead of showing the student an error they cannot act on.
const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
const isMissingSchema = (err) => !!err && (MISSING_SCHEMA.has(err.code) || /does not exist|schema cache/i.test(err.message || ''));

function roadmapStamp(roadmap) {
  const v = Number(roadmap?.updatedAt);
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
      const revisionRaw = req.query?.revision;
      const revision = revisionRaw
        ? parseInt(Array.isArray(revisionRaw) ? revisionRaw[0] : revisionRaw, 10)
        : null;

      if (Number.isFinite(revision)) {
        const { data, error } = await supabase
          .from('roadmap_revisions')
          .select('roadmap, revision, created_at')
          .eq('user_id', user.id)
          .eq('revision', revision)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) { if (isMissingSchema(error)) return res.status(200).json({ roadmap: null }); throw error; }
        return res.status(200).json({ roadmap: data?.roadmap || null, revision: data?.revision ?? null, createdAt: data?.created_at || null });
      }

      if (wantsHistory) {
        const { data, error } = await supabase
          .from('roadmap_revisions')
          .select('revision, headline, reason, created_at, roadmap')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) { if (isMissingSchema(error)) return res.status(200).json({ history: [] }); throw error; }
        // The bodies are fetched but not returned — a history list is a picker, and shipping ten
        // full roadmaps to render ten rows would be megabytes for nothing.
        return res.status(200).json({
          history: (data || []).map((r) => ({
            revision: r.revision,
            headline: r.headline || r.roadmap?.headline || 'Previous roadmap',
            reason: r.reason || null,
            createdAt: r.created_at,
            startDate: r.roadmap?.startDate || null,
            itemCount: Array.isArray(r.roadmap?.items) ? r.roadmap.items.length : null,
          })),
        });
      }

      const { data, error } = await supabase
        .from('roadmaps')
        .select('roadmap, revision, client_updated_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) { if (isMissingSchema(error)) return res.status(200).json({ roadmap: null, unavailable: true }); throw error; }
      return res.status(200).json({
        roadmap: data?.roadmap || null,
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
      const roadmap = body?.roadmap;
      if (!roadmap || typeof roadmap !== 'object' || Array.isArray(roadmap)) return res.status(400).json({ error: 'Missing roadmap.' });
      if (!Array.isArray(roadmap.items)) return res.status(400).json({ error: 'Roadmap is missing its items.' });
      if (!Array.isArray(roadmap.seasons)) return res.status(400).json({ error: 'Roadmap is missing its seasons.' });
      if (JSON.stringify(roadmap).length > MAX_BYTES) return res.status(413).json({ error: 'Roadmap too large.' });

      const { data, error } = await supabase.rpc('save_roadmap', {
        p_user_id: user.id,
        p_roadmap: roadmap,
        p_client_updated_at: roadmapStamp(roadmap),
        p_reason: typeof body?.reason === 'string' ? body.reason.slice(0, 120) : null,
        p_force: body?.force === true,
      });
      if (error) { if (isMissingSchema(error)) return res.status(200).json({ saved: false, unavailable: true }); throw error; }
      // `stale` means the server already holds a NEWER roadmap (another device) and kept it. The
      // stored roadmap travels back so the client can adopt it rather than retrying its own.
      return res.status(200).json({
        saved: !data?.stale,
        stale: !!data?.stale,
        roadmap: data?.stale ? data.roadmap : undefined,
        revision: data?.revision ?? null,
      });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('roadmaps').delete().eq('user_id', user.id);
      if (error && !isMissingSchema(error)) throw error;
      const { error: histError } = await supabase.from('roadmap_revisions').delete().eq('user_id', user.id);
      if (histError && !isMissingSchema(histError)) throw histError;
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('roadmap error:', err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}
