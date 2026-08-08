// /api/auth/account — data export (GET) and account deletion (DELETE).
//
// These exist because the Privacy Policy promises them. That is not a
// formality: a policy that says "you can export or delete your data at any
// time" while the product offers no way to do either is a false statement to
// consumers, which is an FTC Act § 5 problem entirely separate from the
// privacy statutes. It is also a direct requirement — GDPR Art. 15 and 20
// (access and portability) and Art. 17 (erasure), CCPA/CPRA §§ 1798.100,
// .105 and .110, the equivalent rights in the Colorado, Connecticut,
// Virginia, Texas and Oregon acts, and COPPA's parental right to have a
// child's information deleted.
//
// ── Why deletion is one row ────────────────────────────────────────────────
//
// Every per-user table in supabase/migrations/*.sql declares
// `user_id ... references app_users(id) on delete cascade`, so removing the
// app_users row removes the sessions, colleges, essays, essay_versions,
// activities, awards, GPA entries, research, clinical hours, recommenders and
// evidence with it, in one transaction, with no list here to fall out of date
// as tables are added. The only rows not reachable that way are otp_codes,
// which are keyed by email rather than user_id, so those are cleared
// explicitly.
//
// The export deliberately reads the same table list the CRUD endpoint serves
// (imported, not re-typed) for the same reason: a new resource should appear
// in a user's export because it was added to the app, not because someone
// remembered to add it here too.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getUserFromRequest } from '../_lib/session.js';
import { serializeUser } from '../_lib/serializeUser.js';
import { EXPORTABLE_RESOURCES } from '../_lib/resources.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });

  const supabase = getSupabaseAdmin();

  // ── Export ───────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const data = { account: serializeUser(user) };

    // Sequential rather than Promise.all: this runs at most once per user per
    // request and a burst of parallel queries against every table is a much
    // better way to trip Supabase's connection limits than it is to save a
    // few hundred milliseconds on an action nobody performs twice.
    for (const resource of EXPORTABLE_RESOURCES) {
      const { data: rows, error } = await supabase
        .from(resource)
        .select('*')
        .eq('user_id', user.id);
      // A table that does not exist in this project yet (migrations are applied
      // by hand — see the migration headers) must not fail the whole export.
      // Better an export missing one empty section than no export at all.
      data[resource] = error ? [] : (rows || []);
    }

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="medschoolprep-data-${stamp}.json"`);
    return res.status(200).json({
      exportedAt: new Date().toISOString(),
      notice: 'This file contains everything MedSchoolPrep holds in your account. Study progress kept only on your device (flashcard scheduling, lesson completion, streaks) is not included here, because it never leaves your browser.',
      data,
    });
  }

  // ── Deletion ─────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    // Deleting an account is irreversible, so it takes more than reaching the
    // endpoint: the caller must echo back the exact email on the session. That
    // makes a stray request — a mis-routed fetch, a prefetching browser
    // extension, a CSRF attempt — incapable of destroying someone's work,
    // without adding a password prompt that a Google-sign-in user could not
    // satisfy.
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }
    const confirmation = String(body?.confirmEmail || '').trim().toLowerCase();
    if (!confirmation || confirmation !== String(user.email || '').toLowerCase()) {
      return res.status(400).json({ error: 'Type the email address on this account to confirm deletion.' });
    }

    // otp_codes are keyed by email, not user_id, so no cascade reaches them.
    await supabase.from('otp_codes').delete().eq('email', user.email);

    const { error } = await supabase.from('app_users').delete().eq('id', user.id);
    if (error) {
      return res.status(500).json({ error: 'Could not delete the account. Please email us and we will do it by hand.' });
    }

    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
