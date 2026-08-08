// /api/data/[resource] — generic authenticated CRUD for per-user feature tables.
// Every row is scoped to the signed-in user (user_id), enforced server-side
// since the client never talks to Supabase directly (RLS denies anon/authenticated).
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getUserFromRequest } from '../_lib/session.js';
// Shared with api/auth/account.js so a new table is exportable and deletable
// the moment it is readable — see api/_lib/resources.js.
import { RESOURCE_SET as RESOURCES } from '../_lib/resources.js';

// Columns a client may write per resource (id, user_id, created_at are server-controlled).
const WRITABLE = {
  colleges: ['name', 'category', 'status', 'ea_ed_deadline', 'rd_deadline', 'notes', 'css_profile_required', 'financial_aid_deadline'],
  college_checklist_items: ['college_id', 'label', 'done', 'sort_order'],
  deadlines: ['college_id', 'title', 'due_date', 'kind'],
  essays: ['college_id', 'title', 'prompt', 'word_limit', 'status', 'content'],
  essay_versions: ['essay_id', 'content', 'word_count'],
  test_scores: ['test_type', 'test_date', 'composite', 'section_scores', 'is_target'],
  scholarships: ['name', 'amount', 'deadline', 'status', 'notes'],
  activities: ['activity_type', 'position', 'organization', 'description', 'impact', 'status', 'hours_per_week', 'weeks_per_year', 'grade_levels', 'sort_order', 'evidence_url', 'verification_status', 'verifier_name', 'verifier_email', 'verifier_relationship', 'skills_tags', 'leadership_role'],
  awards: ['title', 'grade_level', 'level', 'sort_order', 'issuing_organization', 'category', 'certificate_url', 'verification_status'],
  gpa_entries: ['term', 'gpa', 'weighted', 'course_rigor'],
  research_experience: ['title', 'mentor_name', 'institution', 'description', 'publication_url', 'hours', 'status', 'sort_order'],
  skills_certifications: ['name', 'issuing_body', 'earned_date', 'expiry_date', 'certificate_url'],
  clinical_hours: ['site_name', 'site_type', 'supervisor_name', 'supervisor_email', 'hours', 'entry_date', 'notes', 'verification_status', 'verified_at'],
  recommenders: ['name', 'relationship', 'type', 'status', 'due_date', 'notes', 'verification_status'],
  portfolio_evidence: ['entity_type', 'entity_id', 'url', 'label'],
};

// Resources whose rows get an `updated_at` bump on PATCH (only tables that actually have that
// column — see the migration file for which ones do).
const TOUCHES_UPDATED_AT = new Set([
  'colleges', 'essays', 'research_experience', 'skills_certifications', 'clinical_hours', 'recommenders',
]);

// entity_type -> table, for validating portfolio_evidence's polymorphic entity_id ownership.
const EVIDENCE_ENTITY_TABLES = new Set(['activities', 'awards', 'research_experience', 'clinical_hours']);

function pick(body, keys) {
  const out = {};
  for (const k of keys) if (k in (body || {})) out[k] = body[k];
  return out;
}

// Foreign keys a client can set, and the resource+column that must be owned
// by the requesting user for that value to be accepted.
const FK_OWNERSHIP = {
  college_checklist_items: { college_id: 'colleges' },
  deadlines: { college_id: 'colleges' },
  essays: { college_id: 'colleges' },
  essay_versions: { essay_id: 'essays' },
};

async function assertOwnedForeignKeys(supabase, resource, row, userId) {
  // portfolio_evidence's foreign key target depends on its own entity_type field, so it can't
  // use the static FK_OWNERSHIP map — validate it against whichever table entity_type names.
  if (resource === 'portfolio_evidence') {
    const entityType = row.entity_type;
    const entityId = row.entity_id;
    if (entityId == null) return true;
    if (!EVIDENCE_ENTITY_TABLES.has(entityType)) return false;
    const { data } = await supabase.from(entityType).select('id').eq('id', entityId).eq('user_id', userId).maybeSingle();
    return !!data;
  }
  const rules = FK_OWNERSHIP[resource];
  if (!rules) return true;
  for (const [column, targetTable] of Object.entries(rules)) {
    const value = row[column];
    if (value == null) continue;
    const { data } = await supabase.from(targetTable).select('id').eq('id', value).eq('user_id', userId).maybeSingle();
    if (!data) return false;
  }
  return true;
}

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
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
      const fields = pick(body, WRITABLE[resource]);
      if (!(await assertOwnedForeignKeys(supabase, resource, fields, user.id))) {
        return res.status(403).json({ error: 'Referenced record not found.' });
      }
      const row = { ...fields, user_id: user.id };
      const { data, error } = await table.insert(row).select('*').single();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (req.method === 'PATCH') {
      const id = firstValue(body?.id);
      if (!id) return res.status(400).json({ error: 'Missing id.' });
      const updates = pick(body, WRITABLE[resource]);
      if (!(await assertOwnedForeignKeys(supabase, resource, updates, user.id))) {
        return res.status(403).json({ error: 'Referenced record not found.' });
      }
      if (TOUCHES_UPDATED_AT.has(resource)) updates.updated_at = new Date().toISOString();
      const { data, error } = await table.update(updates).eq('id', id).eq('user_id', user.id).select('*').single();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (req.method === 'DELETE') {
      const id = firstValue(req.query.id);
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
