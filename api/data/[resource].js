// /api/data/[resource] — generic authenticated CRUD for per-user feature tables.
// Every row is scoped to the signed-in user (user_id), enforced server-side
// since the client never talks to Supabase directly (RLS denies anon/authenticated).
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getUserFromRequest } from '../_lib/session.js';

const RESOURCES = new Set([
  'colleges',
  'college_checklist_items',
  'deadlines',
  'essays',
  'essay_versions',
  'test_scores',
  'scholarships',
  'activities',
  'awards',
]);

// Columns a client may write per resource (id, user_id, created_at are server-controlled).
const WRITABLE = {
  colleges: ['name', 'category', 'status', 'ea_ed_deadline', 'rd_deadline', 'notes', 'css_profile_required', 'financial_aid_deadline'],
  college_checklist_items: ['college_id', 'label', 'done', 'sort_order'],
  deadlines: ['college_id', 'title', 'due_date', 'kind'],
  essays: ['college_id', 'title', 'prompt', 'word_limit', 'status', 'content'],
  essay_versions: ['essay_id', 'content', 'word_count'],
  test_scores: ['test_type', 'test_date', 'composite', 'section_scores', 'is_target'],
  scholarships: ['name', 'amount', 'deadline', 'status', 'notes'],
  activities: ['activity_type', 'position', 'description', 'hours_per_week', 'weeks_per_year', 'grade_levels', 'sort_order'],
  awards: ['title', 'grade_level', 'level', 'sort_order'],
};

function pick(body, keys) {
  const out = {};
  for (const k of keys) if (k in (body || {})) out[k] = body[k];
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { resource } = req.query;
  if (!RESOURCES.has(resource)) return res.status(404).json({ error: 'Unknown resource.' });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });

  const supabase = getSupabaseAdmin();
  const table = supabase.from(resource);

  try {
    if (req.method === 'GET') {
      const { data, error } = await table.select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ data });
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }

    if (req.method === 'POST') {
      const row = { ...pick(body, WRITABLE[resource]), user_id: user.id };
      const { data, error } = await table.insert(row).select('*').single();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (req.method === 'PATCH') {
      const id = body?.id;
      if (!id) return res.status(400).json({ error: 'Missing id.' });
      const updates = pick(body, WRITABLE[resource]);
      if (resource === 'colleges' || resource === 'essays') updates.updated_at = new Date().toISOString();
      const { data, error } = await table.update(updates).eq('id', id).eq('user_id', user.id).select('*').single();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id.' });
      const { error } = await table.delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(`data/${resource} error:`, err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}
