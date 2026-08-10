// /api/parent/profile — the parent's own declaration, and the gate on their dashboard.
//
//   GET               → { profile, complete, attestation }
//   PUT { …fields }   → { profile, complete } | 400 { errors: { field: message } }
//
// Parent-only, and about the caller's own row exclusively — there is no path through this file
// that reads or writes another account, which is why it can be a plain requireParent with no
// getActiveLink beside it.
//
// See api/_lib/parentProfile.js for what this declaration is for: it is not what keeps a stranger
// out (the student's consent is), it is what lets the student tell a stranger apart from their
// mother when the invitation lands.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireParent } from '../_lib/session.js';
import {
  ATTESTATION_TEXT, getParentProfile, isMissingSchema, isProfileComplete,
  normalizeProfileInput, saveParentProfile, serializeParentProfile,
} from '../_lib/parentProfile.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireParent(req, res);
  if (!user) return;

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { row, schemaMissing } = await getParentProfile(supabase, user.id);
      return res.status(200).json({
        profile: serializeParentProfile(row),
        // On a deployment without migration 0009 there is nothing to complete and nothing that
        // could be blocked by not completing it — the client renders the dashboard rather than an
        // intake form it cannot save. Same fail-open reasoning as requireCompleteProfile.
        complete: schemaMissing || isProfileComplete(row),
        available: !schemaMissing,
        attestation: ATTESTATION_TEXT,
      });
    }

    if (req.method === 'PUT') {
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
      catch { return res.status(400).json({ error: 'Invalid JSON body.' }); }

      const { values, errors } = normalizeProfileInput(body);
      if (Object.keys(errors).length) {
        return res.status(400).json({ error: 'Some details still need fixing.', errors });
      }

      const row = await saveParentProfile(supabase, user.id, values);
      return res.status(200).json({
        profile: serializeParentProfile(row),
        complete: isProfileComplete(row),
        available: true,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (isMissingSchema(err)) {
      return req.method === 'GET'
        ? res.status(200).json({ profile: null, complete: true, available: false, attestation: ATTESTATION_TEXT })
        : res.status(503).json({ error: 'Parent accounts are not fully available yet.' });
    }
    console.error('parent profile error:', err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}
