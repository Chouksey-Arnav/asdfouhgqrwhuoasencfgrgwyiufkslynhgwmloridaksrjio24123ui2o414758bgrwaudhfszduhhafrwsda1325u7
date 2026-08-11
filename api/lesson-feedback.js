// /api/lesson-feedback — the queryable log of "was this lesson too easy / too hard / just
// right?" answers (see supabase/migrations/0012_lesson_feedback.sql for why this exists
// alongside the progress_sync snapshot rather than instead of it).
//
//   POST  { lessonId, rating, ... }  → upserts one row for this student, deduped on client_ts
//   GET   ?lessonId=…                → this student's own history (all, or for one lesson)
//
// A student's answer is already durable in IndexedDB before this is ever called, so every
// failure path here is non-fatal by design: the client fires and forgets, and a dropped POST
// costs the analytics row, never the student's feedback.
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { requireStudent } from './_lib/session.js';

const RATINGS = new Set(['too_easy', 'just_right', 'too_hard']);
// The generated passage can legitimately run long; anything past this is a client bug, not a
// lesson. Truncated rather than rejected — the rating is the part worth keeping.
const MAX_AI_TEXT = 20000;
const MAX_RESOURCES = 12;

const str = (v, max = 300) => (typeof v === 'string' ? v.slice(0, max) : null);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireStudent(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      let q = supabase
        .from('lesson_feedback')
        .select('lesson_id, lesson_title, unit_title, pathway_key, category, rating, client_ts, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);
      const lessonId = str(req.query?.lessonId, 120);
      if (lessonId) q = q.eq('lesson_id', lessonId);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ feedback: data || [] });
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body.' });
      }

      const lessonId = str(body?.lessonId, 120);
      const rating = str(body?.rating, 20);
      if (!lessonId) return res.status(400).json({ error: 'Missing lessonId.' });
      if (!RATINGS.has(rating)) return res.status(400).json({ error: 'Invalid rating.' });

      const resources = Array.isArray(body?.resources)
        ? body.resources.slice(0, MAX_RESOURCES).map((r) => ({
            title: str(r?.title, 200), url: str(r?.url, 500),
            type: str(r?.type, 60), source: str(r?.source, 40),
          })).filter((r) => r.url)
        : [];

      const clientTs = Number.isFinite(Number(body?.clientTs)) ? Math.trunc(Number(body.clientTs)) : null;

      const row = {
        user_id: user.id,
        lesson_id: lessonId,
        lesson_title: str(body?.lessonTitle),
        unit_id: str(body?.unitId, 120),
        unit_title: str(body?.unitTitle),
        pathway_key: str(body?.pathwayKey, 60),
        category: str(body?.category, 120),
        rating,
        ai_text: typeof body?.aiText === 'string' ? body.aiText.slice(0, MAX_AI_TEXT) : null,
        resources,
        client_ts: clientTs,
      };

      // Upsert on the dedupe key so the client can post twice for one answer — once when the
      // student taps (durable immediately, even if the generation later fails or they close the
      // tab) and again when Medabrain's reply arrives to fill in ai_text. Without client_ts
      // there is nothing to dedupe on, so those become two rows; the client always sends it.
      const { error } = clientTs
        ? await supabase.from('lesson_feedback').upsert(row, { onConflict: 'user_id,lesson_id,client_ts' })
        : await supabase.from('lesson_feedback').insert(row);
      if (error) throw error;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    console.error('lesson-feedback error:', err);
    return res.status(500).json({ error: 'Could not record lesson feedback.' });
  }
}
