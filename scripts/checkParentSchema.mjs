#!/usr/bin/env node
/**
 * Asks a LIVE database whether the parent feature can actually work on it.
 *
 * ── Why this script exists ──────────────────────────────────────────────────
 * Migrations in this repo are applied by hand (see the header of any file in supabase/migrations).
 * That is a deliberate trade and it has exactly one failure mode, which this feature hit in
 * production: 0006 was applied, 0009 and 0010 were not, and nobody found out for weeks.
 *
 * It went unnoticed because every endpoint in this feature degrades politely on missing schema —
 * api/parent/links.js returns an empty list, api/parent/summary.js returns no students,
 * api/parent/profile.js reports "complete" so nobody is trapped behind an intake form they cannot
 * save. Each of those is the right call in isolation. Together they meant a completely dead
 * feature rendered as an ordinary empty dashboard: a parent who had done everything right saw
 * "Nothing to show yet", and a student's invitation email went out carrying a code the database
 * had no column to store. The only hard failure was at the very last step of sign-in, where
 * email_verifications rejected purpose='signin' and the parent was told their correct code was
 * wrong — and told it again on every retry, burning a metered email each time.
 *
 * The lesson is not "add another fallback". It is that a deployment must be able to answer "is
 * this feature switched on here?" out loud, once, at deploy time, instead of leaving each request
 * to guess quietly. That is all this does.
 *
 * ── What it does not do ─────────────────────────────────────────────────────
 * It does not apply anything. Deciding to migrate a production database is a person's decision,
 * and a script that silently repairs the thing it was asked to inspect is one nobody can safely
 * run. It reports, and names the file to apply.
 *
 * Run:  SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run check:parent-schema
 * Exits 0 when the deployment can run the parent feature, 1 when it cannot.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to check a deployment.');
  console.error('This script talks to a real database; there is nothing meaningful to check without one.');
  process.exit(2);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const failures = [];
const ok = (label) => console.log(`  ✓ ${label}`);
const bad = (label, fix) => { failures.push({ label, fix }); console.error(`  ✗ ${label}`); };

/**
 * Reads one column from one table. PostgREST answers a missing table and a missing column with
 * distinguishable errors, and either one means the same thing here: the migration that adds it has
 * not run. Selecting with `limit(0)` so this costs nothing and reads nobody's data.
 */
async function hasColumn(table, column) {
  const { error } = await supabase.from(table).select(column).limit(0);
  return !error;
}

console.log(`\nChecking parent-dashboard schema on ${url}\n`);

console.log('Migration 0006 — the consent model');
if (await hasColumn('app_users', 'role')) ok('app_users.role'); else bad('app_users.role is missing', '0006_parent_dashboard.sql');
if (await hasColumn('parent_links', 'invite_token_hash')) ok('parent_links'); else bad('parent_links is missing', '0006_parent_dashboard.sql');
if (await hasColumn('parent_summary_cache', 'student_user_id')) ok('parent_summary_cache'); else bad('parent_summary_cache is missing', '0006_parent_dashboard.sql');

console.log('\nMigration 0009 — the parent declaration');
if (await hasColumn('parent_profiles', 'completed_at')) ok('parent_profiles'); else bad('parent_profiles is missing — parents cannot send invitations', '0009_parent_profiles.sql');
if (await hasColumn('parent_links', 'claimed_by_name')) ok('parent_links.claimed_by_name'); else bad('the claim columns are missing — invitations cannot name who is asking', '0009_parent_profiles.sql');

console.log('\nMigration 0010 — passwordless parent access');
if (await hasColumn('parent_links', 'invite_code')) ok('parent_links.invite_code'); else bad('invite_code is missing — shareable codes do not work', '0010_parent_access.sql');
if (await hasColumn('parent_links', 'last_sent_at')) ok('parent_links.last_sent_at'); else bad('last_sent_at is missing — invitations cannot be resent', '0010_parent_access.sql');

// The account-minting RPC. Called with an address that cannot exist, so a deployment that HAS the
// function answers with a role_conflict-free "created" verdict for a throwaway row we then remove
// — but the only thing being asserted is that the function is callable at all, which is what a
// missing 0010 breaks.
{
  const probe = `schema-probe-${Date.now()}@invalid.example`;
  const { data, error } = await supabase.rpc('find_or_create_parent_for_claim', { p_email: probe });
  if (error) {
    bad('find_or_create_parent_for_claim() is missing — the whole claim flow returns 503', '0010_parent_access.sql');
  } else {
    ok('find_or_create_parent_for_claim()');
    // The probe genuinely creates an account, because that is what proving the function works
    // means. Removing it again keeps the check side-effect-free, which is what makes it safe to
    // wire into a deploy step and run on every release.
    if (data?.userId) await supabase.from('app_users').delete().eq('id', data.userId);
  }
}

// The constraint that broke sign-in. Checked by attempting the exact insert api/auth/verify-otp.js
// performs and then removing it, because reading pg_constraint is not available through PostgREST
// — and because the insert is the thing that actually has to work.
{
  const probe = `schema-probe-${Date.now()}@invalid.example`;
  const { data, error } = await supabase
    .from('email_verifications')
    .insert({ email: probe, purpose: 'signin', expires_at: new Date(Date.now() + 60_000).toISOString() })
    .select('id')
    .maybeSingle();
  if (error) {
    bad("email_verifications rejects purpose='signin' — every passwordless sign-in fails at the last step", '0010_parent_access.sql');
  } else {
    ok("email_verifications accepts purpose='signin'");
    if (data?.id) await supabase.from('email_verifications').delete().eq('id', data.id);
  }
}

console.log('\nMigration 0011 — family messages');
// Absent, this is the one part of the feature that degrades to something people will report as a
// bug rather than as a gap: the Messages tab loads, is empty, and every send answers 503. Listed
// last because everything above it is what gets a family connected at all.
if (await hasColumn('parent_messages', 'author_role')) ok('parent_messages');
else bad('parent_messages is missing — the Messages tab loads empty and nothing can be sent', '0011_family_messages.sql');

if (!failures.length) {
  console.log('\nThis deployment can run the parent dashboard.\n');
  process.exit(0);
}

console.error(`\n${failures.length} problem${failures.length === 1 ? '' : 's'} — the parent dashboard is NOT fully working here.\n`);
const files = [...new Set(failures.map((f) => f.fix))].sort();
for (const f of failures) console.error(`  • ${f.label}\n    fix: supabase/migrations/${f.fix}`);
console.error(`\nApply, in order: ${files.join(', ')}`);
console.error('Until then the feature degrades quietly rather than erroring, which is exactly why this check exists.\n');
process.exit(1);
