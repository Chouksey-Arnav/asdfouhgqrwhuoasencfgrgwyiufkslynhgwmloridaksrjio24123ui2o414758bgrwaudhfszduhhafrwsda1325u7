// /api/data/[resource] — generic authenticated CRUD for per-user feature tables.
// Every row is scoped to the signed-in user (user_id), enforced server-side
// since the client never talks to Supabase directly (RLS denies anon/authenticated).
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireStudent } from '../_lib/session.js';
// Shared with api/auth/account.js so a new table is exportable and deletable
// the moment it is readable — see api/_lib/resources.js.
import { RESOURCES, RESOURCE_SET } from '../_lib/resources.js';

// Columns a client may write per resource (id, user_id, created_at are server-controlled).
const WRITABLE = {
  colleges: ['name', 'category', 'status', 'ea_ed_deadline', 'rd_deadline', 'notes', 'css_profile_required', 'financial_aid_deadline'],
  college_checklist_items: ['college_id', 'label', 'done', 'sort_order'],
  // `completed_at` is what makes the Milestones feed two-way (finishing a date is a different act
  // from deleting it); `source_ref` points a generated row back at the program it came from so
  // completing it can update that program; `lead_days` is the run-up the work needs, which is what
  // the feed sorts by instead of the date alone. See migration 0019.
  deadlines: ['college_id', 'title', 'due_date', 'kind', 'completed_at', 'source_ref', 'lead_days'],
  essays: ['college_id', 'title', 'prompt', 'word_limit', 'status', 'content', 'essay_kind', 'source_ref', 'source_label'],
  essay_versions: ['essay_id', 'content', 'word_count', 'label', 'note'],
  reflection_entries: ['prompt_id', 'prompt_text', 'content', 'entry_date'],
  test_scores: ['test_type', 'test_date', 'composite', 'section_scores', 'is_target'],
  scholarships: ['name', 'amount', 'deadline', 'status', 'notes'],
  activities: ['activity_type', 'position', 'organization', 'description', 'impact', 'status', 'hours_per_week', 'weeks_per_year', 'grade_levels', 'sort_order', 'evidence_url', 'verification_status', 'verifier_name', 'verifier_email', 'verifier_relationship', 'skills_tags', 'leadership_role'],
  awards: ['title', 'grade_level', 'level', 'sort_order', 'issuing_organization', 'category', 'certificate_url', 'verification_status'],
  gpa_entries: ['term', 'gpa', 'weighted', 'course_rigor'],
  research_experience: ['title', 'mentor_name', 'institution', 'description', 'publication_url', 'hours', 'status', 'sort_order'],
  // credential_id / credential_type / state_code link a row back to the credential database and
  // record which of the three legally distinct kinds of "certification" it is — see
  // supabase/migrations/0018_credential_catalog.sql. `name` stays authoritative for display
  // because it holds what the student's own certificate says, which in Ohio is "STNA".
  skills_certifications: ['name', 'issuing_body', 'earned_date', 'expiry_date', 'certificate_url', 'credential_id', 'credential_type', 'state_code'],
  // `status` is deliberately not writable: a student proposes, we review.
  credential_suggestions: ['name', 'issuing_body', 'credential_type', 'state_code', 'note'],
  clinical_hours: ['site_name', 'site_type', 'supervisor_name', 'supervisor_email', 'hours', 'entry_date', 'notes', 'verification_status', 'verified_at', 'experience_kind'],
  admission_intake: ['citizenship', 'state_residency', 'grade_level', 'answers', 'program_rounds'],
  // `asked_at` is what makes the one-month lead-time nudge possible — a status alone has no
  // memory of when it changed. See supabase/migrations/0020_recommender_asks.sql.
  recommenders: ['name', 'relationship', 'type', 'status', 'due_date', 'notes', 'verification_status', 'asked_at'],
  portfolio_evidence: ['entity_type', 'entity_id', 'url', 'label'],
  // The MedEx Score's weekly seal (see supabase/migrations/0021_medex_score.sql). A seal is
  // written once per ISO week and never edited — the unique index on (user_id, week_key) is what
  // makes that true, and src/lib/medex/store.js relies on the conflict to converge two devices.
  // `week_key` and `score` are the only NOT NULL columns; the rest describe how the number was
  // reached so a sealed week stays readable after the benchmark or pillar weights change.
  medex_scores: ['week_key', 'score', 'band', 'benchmark_id', 'benchmark_name', 'pillars', 'coverage', 'confidence'],
};

// Every readable resource must also declare what a client may write to it. This used to be an
// unwritten convention, and medex_scores broke it: it was added to RESOURCES (so it read and
// exported fine) but never given a WRITABLE row, which made `pick(body, undefined)` throw a
// TypeError on every POST. The endpoint caught it, logged it, and returned a generic 500 — and
// src/lib/medex/store.js treats a failed seal as "another device sealed first" and re-reads. The
// result was a table that had never received a single row since launch with nothing anywhere
// reporting a problem. Failing loudly at module load is the cheap way to make that class of drift
// impossible: a missing entry now breaks every request to this endpoint on the first deploy,
// instead of silently breaking one table forever.
for (const resource of RESOURCES) {
  if (!Array.isArray(WRITABLE[resource])) {
    throw new Error(`api/data/[resource]: '${resource}' is in RESOURCES but has no WRITABLE column list.`);
  }
}

// Resources whose rows get an `updated_at` bump on PATCH (only tables that actually have that
// column — see the migration file for which ones do).
const TOUCHES_UPDATED_AT = new Set([
  'colleges', 'essays', 'research_experience', 'skills_certifications', 'clinical_hours', 'recommenders',
  'admission_intake', 'credential_suggestions', 'reflection_entries',
]);

// Resources a client may create and delete but never edit. A MedEx seal is a record of what a
// student's profile looked like in one particular week; the whole point of sealing is that the
// number stops moving, so an endpoint that accepted a PATCH would quietly make the history
// rewritable and every week-over-week delta in the app unreliable.
const APPEND_ONLY = new Set(['medex_scores']);

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
  if (!RESOURCE_SET.has(resource)) return res.status(404).json({ error: 'Unknown resource.' });

  const user = await requireStudent(req, res);
  if (!user) return;

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
      if (APPEND_ONLY.has(resource)) return res.status(405).json({ error: 'This record cannot be edited once written.' });
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
    // A duplicate is not a failure — it is the unique index doing its job, and the caller's
    // correct response is to re-read rather than retry. Collapsing it into the same generic 500
    // every other error returns is what let a genuinely broken write path masquerade as a
    // harmless "another device got there first" for the entire life of the medex_scores table.
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'This record already exists.', reason: 'duplicate' });
    }
    return res.status(500).json({ error: 'Request failed.' });
  }
}
