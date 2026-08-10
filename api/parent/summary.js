// /api/parent/summary — the read-only progress view, for parents only.
//
//   GET                      → { students: [{ studentId, link, summary }] }
//   GET ?studentId=<uuid>    → { student: { studentId, link, summary } }
//
// Two guards stand between a bearer token and a student's data, and both run on every request:
//
//   1. requireParent — a student's token cannot reach this endpoint at all, so a bug here can
//      never become a student-to-student read.
//   2. getActiveLink — re-read from parent_links per request, never cached on the session. Session
//      tokens live 30 days; consent does not. This is what makes "revoke" mean "now" instead of
//      "within a month", and it is why the status check is part of the query rather than a
//      JavaScript comparison on a row fetched for another purpose.
//
// What comes back is built by an allowlist in api/_lib/parentSummary.js — progress and outcomes,
// never coach transcripts, lesson notes, or essay text. See that file's header for why the
// boundary is drawn there and why it is an allowlist rather than a filter.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireParent, getActiveLink, getActiveLinksForParent, isUuid } from '../_lib/session.js';
import { getParentSummary } from '../_lib/parentSummary.js';
import { requireCompleteProfile } from '../_lib/parentProfile.js';

const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
const isMissingSchema = (err) => !!err && (MISSING_SCHEMA.has(err.code) || /does not exist|schema cache/i.test(err.message || ''));

const linkShape = (link) => ({
  linkId: link.id,
  relationship: link.relationship || null,
  connectedAt: link.accepted_at || link.created_at || null,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const parent = await requireParent(req, res);
  if (!parent) return;

  const supabase = getSupabaseAdmin();

  // A third check, and the only one that is not about authorization: the account must have
  // finished its declaration (see api/_lib/parentProfile.js). It is deliberately not load-bearing
  // for privacy — the two guards above already are — so it fails open on a database without
  // migration 0009 rather than locking out guardians whose children already consented.
  if (!(await requireCompleteProfile(res, { supabase, userId: parent.id }))) return;
  const rawId = Array.isArray(req.query?.studentId) ? req.query.studentId[0] : req.query?.studentId;
  const studentId = rawId ? String(rawId) : null;

  try {
    // ── One student ──────────────────────────────────────────────────────────
    if (studentId) {
      if (!isUuid(studentId)) return res.status(400).json({ error: 'Unknown student.' });

      const link = await getActiveLink(supabase, { parentUserId: parent.id, studentUserId: studentId });
      // 403 with the same message whether the link was revoked, declined, or never existed. A
      // parent who guesses a student id should not be able to tell "that account exists and you
      // used to be connected" from "that account does not exist" — the first leaks a real
      // relationship to whoever holds a stale token.
      if (!link) return res.status(403).json({ error: 'You are not connected to that student.' });

      const { data: student, error } = await supabase
        .from('app_users')
        .select('id, name, grade_level')
        .eq('id', studentId)
        .maybeSingle();
      if (error) throw error;
      if (!student) return res.status(403).json({ error: 'You are not connected to that student.' });

      const summary = await getParentSummary(supabase, student);
      return res.status(200).json({ student: { studentId: student.id, link: linkShape(link), summary } });
    }

    // ── Every connected student ──────────────────────────────────────────────
    const links = await getActiveLinksForParent(supabase, parent.id);
    if (!links.length) return res.status(200).json({ students: [] });

    // Sequential rather than Promise.all, matching api/auth/account.js's reasoning: a household
    // has a handful of children at most, and a burst of parallel queries per poll is a far better
    // way to trip Supabase's connection limits than it is to save a few hundred milliseconds.
    const students = [];
    for (const link of links) {
      const student = link.app_users;
      if (!student) continue;
      students.push({
        studentId: student.id,
        link: linkShape(link),
        summary: await getParentSummary(supabase, student),
      });
    }

    return res.status(200).json({ students });
  } catch (err) {
    if (isMissingSchema(err)) return res.status(200).json({ students: [] });
    console.error('parent summary error:', err);
    return res.status(500).json({ error: 'Could not load progress.' });
  }
}
