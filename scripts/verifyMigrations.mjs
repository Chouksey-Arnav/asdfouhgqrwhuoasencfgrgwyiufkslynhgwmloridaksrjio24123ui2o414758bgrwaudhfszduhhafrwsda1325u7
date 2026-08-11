#!/usr/bin/env node
/**
 * The gate on supabase/migrations/*.sql.
 *
 * Migrations here are applied BY HAND to a single live Supabase project (see the header of any
 * migration file). There is no framework tracking which ones have run, which means the only thing
 * standing between a bad migration and production is whether someone remembered to try it first.
 * That is how 0005_master_plans.sql came to be committed, deployed, and referenced by a live
 * endpoint (api/master-plan.js) without ever having been applied — the feature was simply broken
 * in production, silently, with no error anywhere except a 500 the student saw.
 *
 * So this script is the missing framework. It builds a throwaway Postgres from nothing, applies
 * the whole chain in order, and asserts the properties that a hand-applied migration set has to
 * hold:
 *
 *   1. THE CHAIN APPLIES CLEAN. Every file, in lexical order, against an empty database. A
 *      migration that only works against *your* database is not a migration.
 *   2. IT IS SAFE TO RUN TWICE. A hand-applied migration gets retried — a dropped connection, an
 *      ambiguous error, two people deploying. Re-running the chain must be a no-op, not a
 *      failure. See LEGACY_NON_IDEMPOTENT below for the one historical exception and why it is
 *      allowed to stay.
 *   3. IT PRODUCES EXACTLY THE EXPECTED SCHEMA. A manifest of every table and function the app
 *      depends on. If a migration silently stops creating something, the build fails here rather
 *      than at runtime for a user.
 *   4. FILENAMES ARE SEQUENTIAL. No gaps, no duplicate prefixes — the ordering is the contract.
 *   5. NOTHING IS EXPOSED THAT SHOULDN'T BE. Supabase publishes every public-schema function as
 *      an HTTP endpoint, and Postgres grants EXECUTE to PUBLIC by default — so a SECURITY DEFINER
 *      function is callable by the anon role the moment it is created, unless a migration says
 *      otherwise. See checkFunctionExposure.
 *   6. THE CONCURRENCY PRIMITIVES ACTUALLY SERIALIZE. save_master_plan and accept_parent_link
 *      both exist specifically to make a read-then-write atomic under a row lock. This runs real
 *      parallel clients at them and asserts no lost update and no double-accept, because a lock
 *      that is subtly wrong looks exactly like a lock that works until two users collide.
 *
 * Run:  npm run verify:migrations
 *
 * By default it creates its own cluster with initdb. In CI, point it at a service container
 * instead:  MIGRATION_TEST_DATABASE_URL=postgres://user:pass@host:5432/postgres
 */
import { execFileSync, execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; console.log(`  ✓ ${label}`); return true; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  return false;
};
const section = (name) => console.log(`\n${name}`);

// ── The one historical exception ────────────────────────────────────────────
//
// 0001 adds a CHECK constraint with a bare `alter table ... add constraint`, which throws if the
// constraint is already there. It is already applied to production, and rewriting an applied
// migration in place is the kind of history-editing that makes environments diverge without
// anyone noticing — so it stays as it is, and 0007_backfill_activities_constraint.sql exists to
// guarantee the constraint is present in environments that somehow lack it.
//
// This allowlist is deliberately not a general escape hatch: everything NOT in it must be
// idempotent, so a new migration cannot quietly acquire this defect. If a file in here starts
// passing, the entry should be deleted rather than left to rot.
const LEGACY_NON_IDEMPOTENT = new Set(['0001_portfolio_credibility_expansion.sql']);

/** Every table the application reads or writes. Sorted; compared as a set. */
const EXPECTED_TABLES = [
  'activities', 'app_users', 'awards', 'clinical_hours', 'college_checklist_items', 'colleges',
  'deadlines', 'email_verifications', 'essay_versions', 'essays', 'gpa_entries', 'login_attempts',
  'master_plan_revisions', 'master_plans', 'otp_codes', 'parent_link_events', 'parent_links',
  'parent_messages',
  'parent_profiles', 'parent_summary_cache', 'portfolio_evidence', 'progress_sync', 'recommenders',
  'research_experience', 'reward_claims', 'scholarships', 'sessions', 'skills_certifications',
  'test_scores',
];

/** Every function the API calls by name via supabase.rpc(). */
const EXPECTED_FUNCTIONS = [
  'accept_parent_link', 'bump_progress_counters', 'find_or_create_parent_for_claim',
  'revoke_links_on_user_delete', 'save_master_plan', 'touch_parent_profile_updated_at',
];

// ── Cluster management ──────────────────────────────────────────────────────

function findPgBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const base = '/usr/lib/postgresql';
  if (existsSync(base)) {
    const versions = readdirSync(base).filter(v => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a));
    for (const v of versions) {
      const bin = path.join(base, v, 'bin');
      if (existsSync(path.join(bin, 'initdb'))) return bin;
    }
  }
  return null;
}

/**
 * initdb refuses to run as root, and this container runs as root — so the cluster is created and
 * owned by the `postgres` system user, and every command that touches PGDATA is wrapped in `su`.
 * The data directory lives under /var/lib/postgresql rather than the repo or a temp dir because
 * `postgres` needs traversal permission on every parent directory, which a root-owned mkdtemp
 * does not grant.
 */
function makeRunner(pgBin) {
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  let hasPostgresUser = false;
  try { execFileSync('id', ['postgres'], { stdio: 'pipe' }); hasPostgresUser = true; } catch { /* none */ }

  if (isRoot && hasPostgresUser) {
    const dataRoot = '/var/lib/postgresql';
    mkdirSync(dataRoot, { recursive: true });
    const dir = path.join(dataRoot, `msp_verify_${process.pid}`);
    return {
      dir,
      prepare() {
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
        execFileSync('chown', ['postgres:postgres', dir]);
      },
      run(cmd) { execFileSync('su', ['postgres', '-s', '/bin/bash', '-c', cmd], { stdio: 'pipe' }); },
    };
  }

  const dir = path.join(mkdtempSync(path.join(os.tmpdir(), 'msp-verify-')), 'pgdata');
  return {
    dir,
    prepare() { mkdirSync(dir, { recursive: true }); },
    run(cmd) { execFileSync('bash', ['-c', cmd], { stdio: 'pipe' }); },
  };
}

const PORT = Number(process.env.PG_TEST_PORT || 55440);
const SOCKET_DIR = '/tmp';

async function withDatabase(fn) {
  const external = process.env.MIGRATION_TEST_DATABASE_URL;
  if (external) {
    console.log(`Using MIGRATION_TEST_DATABASE_URL (${external.replace(/:[^:@/]*@/, ':***@')})`);
    const url = new URL(external);
    const conn = {
      args: ['-h', url.hostname, '-p', url.port || '5432', '-U', decodeURIComponent(url.username || 'postgres')],
      env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password || '') },
    };
    return fn(conn);
  }

  const pgBin = findPgBin();
  if (!pgBin) {
    console.error('\nNo PostgreSQL binaries found.');
    console.error('Install postgresql, or set MIGRATION_TEST_DATABASE_URL to an existing server.');
    process.exit(1);
  }

  const runner = makeRunner(pgBin);
  const conn = { args: ['-h', SOCKET_DIR, '-p', String(PORT), '-U', 'postgres'], env: process.env };

  runner.prepare();
  try {
    runner.run(`${pgBin}/initdb -D ${runner.dir} -U postgres -A trust`);
    runner.run(`${pgBin}/pg_ctl -D ${runner.dir} -o "-p ${PORT} -k ${SOCKET_DIR}" -l ${runner.dir}/server.log -w start`);
  } catch (err) {
    console.error('Could not start a test PostgreSQL cluster.');
    console.error(String(err.stderr || err.message));
    process.exit(1);
  }

  try {
    return await fn(conn);
  } finally {
    try { runner.run(`${pgBin}/pg_ctl -D ${runner.dir} -m immediate -w stop`); } catch { /* already down */ }
    try { rmSync(runner.dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

function psql(conn, db, args, { input } = {}) {
  return execFileSync('psql', [...conn.args, '-d', db, '-v', 'ON_ERROR_STOP=1', '-q', ...args], {
    env: conn.env, stdio: 'pipe', input, encoding: 'utf8',
  });
}

function query(conn, db, sql) {
  return psql(conn, db, ['-tAc', sql]).trim();
}

/** Runs a statement and reports success/failure instead of throwing. */
function tryExec(conn, db, args, opts) {
  try { return { ok: true, out: psql(conn, db, args, opts) }; }
  catch (err) { return { ok: false, out: String(err.stderr || err.stdout || err.message) }; }
}

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
}

function recreate(conn, db) {
  psql(conn, 'postgres', ['-c', `drop database if exists ${db} with (force)`]);
  psql(conn, 'postgres', ['-c', `create database ${db}`]);
}

// ── The checks ──────────────────────────────────────────────────────────────

function checkFilenames(files) {
  section('Migration filenames');
  const prefixes = files.map(f => f.slice(0, 4));
  assert('every migration starts with a 4-digit prefix', prefixes.every(p => /^\d{4}$/.test(p)),
    `got: ${prefixes.filter(p => !/^\d{4}$/.test(p)).join(', ')}`);
  assert('no duplicate prefixes', new Set(prefixes).size === prefixes.length,
    `duplicates: ${prefixes.filter((p, i) => prefixes.indexOf(p) !== i).join(', ')}`);
  const nums = prefixes.map(Number);
  const gaps = nums.filter((n, i) => i > 0 && n !== nums[i - 1] + 1);
  assert('prefixes are sequential with no gaps', gaps.length === 0,
    gaps.length ? `first non-sequential: ${String(gaps[0]).padStart(4, '0')}` : '');
}

function applyChain(conn, db, files, label) {
  const results = [];
  for (const f of files) {
    const r = tryExec(conn, db, ['-f', path.join(MIGRATIONS_DIR, f)]);
    results.push({ file: f, ...r });
    if (!r.ok && label === 'first apply') {
      // A failure on the first pass invalidates everything downstream; stop and report it.
      break;
    }
  }
  return results;
}

function checkFirstApply(conn, db, files) {
  section('Chain applies to an empty database');
  const results = applyChain(conn, db, files, 'first apply');
  let allOk = true;
  for (const r of results) {
    const firstError = r.ok ? '' : (r.out.split('\n').find(l => /ERROR/i.test(l)) || r.out.split('\n')[0] || '').trim();
    if (!assert(`${r.file} applies`, r.ok, firstError)) allOk = false;
  }
  assert('every migration was reached', results.length === files.length,
    `stopped after ${results.length} of ${files.length}`);
  return allOk;
}

function checkIdempotency(conn, db, files) {
  section('Chain is safe to re-run (idempotency)');
  const results = applyChain(conn, db, files, 're-apply');
  for (const r of results) {
    const legacy = LEGACY_NON_IDEMPOTENT.has(r.file);
    if (legacy) {
      // Documented exception. Assert it is still failing for the reason we recorded — if someone
      // fixes it, this fires so the allowlist entry gets removed rather than quietly outliving
      // the problem it describes.
      assert(`${r.file} is the known legacy exception (remove from allowlist if this fails)`, !r.ok,
        r.ok ? 'now idempotent — delete it from LEGACY_NON_IDEMPOTENT' : '');
      continue;
    }
    const firstError = r.ok ? '' : (r.out.split('\n').find(l => /ERROR/i.test(l)) || '').trim();
    assert(`${r.file} re-runs cleanly`, r.ok, firstError);
  }
}

function checkManifest(conn, db) {
  section('Schema manifest');
  const tables = query(conn, db,
    "select tablename from pg_tables where schemaname='public' order by 1").split('\n').filter(Boolean);
  const missingTables = EXPECTED_TABLES.filter(t => !tables.includes(t));
  const extraTables = tables.filter(t => !EXPECTED_TABLES.includes(t));
  assert('every expected table exists', missingTables.length === 0, `missing: ${missingTables.join(', ')}`);
  assert('no unexpected tables (update EXPECTED_TABLES if intentional)', extraTables.length === 0,
    `unexpected: ${extraTables.join(', ')}`);

  const fns = query(conn, db,
    "select distinct proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1")
    .split('\n').filter(Boolean);
  const missingFns = EXPECTED_FUNCTIONS.filter(f => !fns.includes(f));
  assert('every expected function exists', missingFns.length === 0, `missing: ${missingFns.join(', ')}`);

  // RLS is the whole authorization story for this schema: every table is reachable only through
  // /api/* with the service role, which bypasses RLS. A table that forgot to enable it is
  // readable by the anon key the browser already holds.
  const unprotected = query(conn, db,
    `select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and not c.relrowsecurity order by 1`)
    .split('\n').filter(Boolean);
  assert('RLS is enabled on every table', unprotected.length === 0, `unprotected: ${unprotected.join(', ')}`);
}

// ── RPC exposure ────────────────────────────────────────────────────────────

/**
 * Every function in the public schema is an HTTP endpoint on Supabase (/rest/v1/rpc/<name>), and
 * Postgres grants EXECUTE to PUBLIC by default. Together that means a new SECURITY DEFINER
 * function is, on creation, callable by the anon role — whose key ships inside the browser bundle.
 *
 * accept_parent_link trusts its p_user_id and p_email arguments completely, because the handler
 * that calls it has already authenticated the session; exposed to anon, it becomes "redeem this
 * invite token against any account you like". That was true of this schema until 0008.
 *
 * These two checks are the reason it stays fixed. The first is the exposure itself. The second is
 * search_path, which decides whether the unqualified table names inside a definer function resolve
 * to the real tables or to something the caller planted.
 */
function checkFunctionExposure(conn, db) {
  section('SECURITY DEFINER functions are not publicly executable');

  // Roles are Supabase's, not Postgres'. On a bare cluster they do not exist, so the grant to
  // examine is the PUBLIC one — which is the one that mattered anyway, since anon and authenticated
  // inherit through it.
  for (const fn of ['accept_parent_link', 'save_master_plan', 'bump_progress_counters', 'find_or_create_parent_for_claim']) {
    const publicExec = query(conn, db,
      `select has_function_privilege('public', p.oid, 'execute')
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = '${fn}'`);
    assert(`${fn} is not executable by PUBLIC`, publicExec === 'f',
      publicExec === 't' ? 'anon holds this grant through PUBLIC — /rest/v1/rpc is open' : `got "${publicExec}"`);
  }

  const unpinned = query(conn, db,
    `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('accept_parent_link', 'save_master_plan', 'bump_progress_counters', 'revoke_links_on_user_delete', 'touch_parent_profile_updated_at', 'find_or_create_parent_for_claim')
        and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path%'
      order by 1`).split('\n').filter(Boolean);
  assert('every function pins its search_path', unpinned.length === 0,
    unpinned.length ? `unpinned: ${unpinned.join(', ')} — a definer function with a caller-controlled search_path runs the caller's tables as its owner` : '');
}

// ── Concurrency ─────────────────────────────────────────────────────────────

async function parallelQueries(conn, db, sqls) {
  return Promise.all(sqls.map(sql =>
    execFileAsync('psql', [...conn.args, '-d', db, '-v', 'ON_ERROR_STOP=1', '-tAqc', sql], { env: conn.env })
      .then(({ stdout }) => ({ ok: true, out: stdout.trim() }))
      .catch(err => ({ ok: false, out: String(err.stderr || err.message).trim() }))
  ));
}

async function checkConcurrency(conn, db) {
  section('Concurrency primitives serialize');

  const userId = query(conn, db,
    `insert into app_users (email, name) values ('mig-concurrency@example.test','Concurrency')
     returning id`);

  // save_master_plan: N devices saving different plans at the same moment. The function holds a
  // row lock across archive + upsert, so every call must succeed and the revision counter must
  // advance exactly once per call — a read-then-write outside a lock would skip or reuse numbers.
  const N = 8;
  const saves = Array.from({ length: N }, (_, i) =>
    `select save_master_plan('${userId}'::uuid, '{"headline":"plan ${i}","horizonWeeks":12,"updatedAt":${1000 + i}}'::jsonb, ${1000 + i}, 'concurrency', true)`);
  const saveResults = await parallelQueries(conn, db, saves);
  const saveFailures = saveResults.filter(r => !r.ok);
  assert(`${N} concurrent save_master_plan calls all succeed`, saveFailures.length === 0,
    saveFailures.map(r => r.out.split('\n')[0]).join(' | '));

  const revision = Number(query(conn, db, `select revision from master_plans where user_id='${userId}'::uuid`));
  assert('revision advanced exactly once per concurrent save (no lost update)', revision === N,
    `expected ${N}, got ${revision}`);

  const rows = Number(query(conn, db, `select count(*) from master_plans where user_id='${userId}'::uuid`));
  assert('exactly one master_plans row survives', rows === 1, `got ${rows}`);

  // accept_parent_link: the same invite token redeemed by several requests at once. Exactly one
  // must win; the rest must be told the token is already consumed. This is the race that would
  // otherwise link a student twice or link the wrong account.
  const parentId = query(conn, db,
    `insert into app_users (email, name, role) values ('mig-parent@example.test','P','parent') returning id`);
  const studentId = query(conn, db,
    `insert into app_users (email, name, role) values ('mig-student@example.test','S','student') returning id`);
  query(conn, db,
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email,
       invite_token_hash, invite_expires_at)
     values ('${parentId}'::uuid, null, 'pending', 'parent', 'mig-student@example.test',
       repeat('a', 64), now() + interval '7 days')`);

  const accepts = Array.from({ length: 6 }, () =>
    `select accept_parent_link(repeat('a',64), '${studentId}'::uuid, 'mig-student@example.test')`);
  const acceptResults = await parallelQueries(conn, db, accepts);
  const accepted = acceptResults.filter(r => r.ok && /"accepted"\s*:\s*true/.test(r.out));
  assert('exactly one concurrent accept_parent_link succeeds', accepted.length === 1,
    `${accepted.length} succeeded of ${acceptResults.length}`);

  const activeLinks = Number(query(conn, db,
    `select count(*) from parent_links where parent_user_id='${parentId}'::uuid and status='active'`));
  assert('exactly one active link exists after the race', activeLinks === 1, `got ${activeLinks}`);

  const consumed = query(conn, db,
    `select consumed_at is not null from parent_links where parent_user_id='${parentId}'::uuid limit 1`);
  assert('the winning accept stamped consumed_at', consumed === 't', `got ${consumed}`);
}

// ── Deletion semantics ──────────────────────────────────────────────────────

async function checkDeletionSemantics(conn, db) {
  section('Account deletion revokes links instead of erasing them');

  const parentId = query(conn, db,
    `insert into app_users (email, name, role) values ('del-parent@example.test','P','parent') returning id`);
  const studentId = query(conn, db,
    `insert into app_users (email, name, role) values ('del-student@example.test','S','student') returning id`);
  query(conn, db,
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email, invite_token_hash)
     values ('${parentId}'::uuid,'${studentId}'::uuid,'active','student','del-parent@example.test', repeat('b',64))`);

  psql(conn, db, ['-c', `delete from app_users where id='${studentId}'::uuid`]);

  const row = query(conn, db,
    `select status || '|' || coalesce(revoked_by,'') || '|' || (student_user_id is null)::text
       || '|' || (parent_user_id is not null)::text
     from parent_links where parent_user_id='${parentId}'::uuid`);
  const [status, revokedBy, studentNulled, parentKept] = row.split('|');
  assert('the link survives the student being deleted', row !== '', 'row disappeared — check ON DELETE SET NULL');
  assert('status flipped to revoked', status === 'revoked', `got ${status}`);
  assert('revoked_by records the cause', revokedBy === 'account_deletion', `got ${revokedBy}`);
  assert('the deleted side is nulled', studentNulled === 'true', `got ${studentNulled}`);
  assert('the surviving side is kept', parentKept === 'true', `got ${parentKept}`);
}

// ── Constraints that carry security weight ──────────────────────────────────

function checkConstraints(conn, db) {
  section('Link constraints');

  const selfId = query(conn, db,
    `insert into app_users (email, name) values ('self-link@example.test','Self') returning id`);
  const selfLink = tryExec(conn, db, ['-c',
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email, invite_token_hash)
     values ('${selfId}'::uuid,'${selfId}'::uuid,'active','parent','self-link@example.test', repeat('c',64))`]);
  assert('self-linking is rejected by the schema', !selfLink.ok, 'a user was able to link to themselves');

  const p = query(conn, db, `insert into app_users (email,name,role) values ('dup-p@example.test','P','parent') returning id`);
  const s = query(conn, db, `insert into app_users (email,name,role) values ('dup-s@example.test','S','student') returning id`);
  psql(conn, db, ['-c',
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email, invite_token_hash)
     values ('${p}'::uuid,'${s}'::uuid,'active','parent','dup-s@example.test', repeat('d',64))`]);
  const dupActive = tryExec(conn, db, ['-c',
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email, invite_token_hash)
     values ('${p}'::uuid,'${s}'::uuid,'active','parent','dup-s@example.test', repeat('e',64))`]);
  assert('a duplicate active link is rejected', !dupActive.ok, 'the same pair was linked twice');

  // The bug the naive index misses: NULLs are distinct in a unique index, so without a dedicated
  // partial index on the email a parent can mint unlimited live tokens for one address.
  const p2 = query(conn, db, `insert into app_users (email,name,role) values ('spam-p@example.test','P','parent') returning id`);
  psql(conn, db, ['-c',
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email, invite_token_hash)
     values ('${p2}'::uuid, null, 'pending','parent','target@example.test', repeat('f',64))`]);
  const dupPending = tryExec(conn, db, ['-c',
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email, invite_token_hash)
     values ('${p2}'::uuid, null, 'pending','parent','TARGET@example.test', repeat('0',64))`]);
  assert('a duplicate pending invite to the same address is rejected (case-insensitively)', !dupPending.ok,
    'a parent can mint unlimited live invite tokens for one address');

  // Revoking must free the pair so the relationship can legitimately be re-established later.
  psql(conn, db, ['-c', `update parent_links set status='revoked' where parent_user_id='${p}'::uuid`]);
  const relink = tryExec(conn, db, ['-c',
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email, invite_token_hash)
     values ('${p}'::uuid,'${s}'::uuid,'active','parent','dup-s@example.test', repeat('1',64))`]);
  assert('a revoked pair can be linked again', relink.ok, relink.out.split('\n')[0]);

  const dupToken = tryExec(conn, db, ['-c',
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email, invite_token_hash)
     values ('${p2}'::uuid, null, 'pending','parent','other@example.test', repeat('f',64))`]);
  assert('invite tokens are unique', !dupToken.ok, 'two links share an invite token hash');
}

// ── Family messages (migration 0011) ────────────────────────────────────────
//
// Everything asserted here is enforced in the handler as well, which is exactly why it is worth
// asserting in the database: a rule that lives only in JavaScript lasts until the next caller, and
// this table is the first one in the schema that one account writes for another to read.
function checkMessages(conn, db) {
  section('Family messages');

  const p = query(conn, db, `insert into app_users (email,name,role) values ('msg-p@example.test','P','parent') returning id`);
  const s = query(conn, db, `insert into app_users (email,name,role) values ('msg-s@example.test','S','student') returning id`);
  const link = query(conn, db,
    `insert into parent_links (parent_user_id, student_user_id, status, initiated_by, invite_email, invite_token_hash)
     values ('${p}'::uuid,'${s}'::uuid,'active','student','msg-p@example.test',
             md5('family-messages') || md5('family-messages')) returning id`);

  const write = (cols, vals) => tryExec(conn, db, ['-c',
    `insert into parent_messages (link_id, parent_user_id, student_user_id, ${cols})
     values ('${link}'::uuid,'${p}'::uuid,'${s}'::uuid, ${vals})`]);

  assert('an ordinary note is accepted',
    write("author_role, kind, body", `'parent','note','Proud of you.'`).ok);
  assert('an empty body is rejected by the schema',
    !write("author_role, kind, body", `'parent','note',''`).ok,
    'the length floor is in the handler only, so the next caller can write a blank message');
  assert('an over-long body is rejected by the schema',
    !write("author_role, kind, body", `'parent','note', repeat('x',601)`).ok,
    'the 600-character cap is a product decision and belongs where it cannot be bypassed');
  assert('an invented kind is rejected',
    !write("author_role, kind, body", `'parent','exec','rm -rf'`).ok);
  assert('an invented author role is rejected',
    !write("author_role, kind, body", `'admin','note','hello'`).ok);
  assert('an invented status is rejected',
    !write("author_role, kind, body, status", `'parent','quiz_request','sit one','ignored'`).ok);
  assert('"declined" is storable — refusing has to be a real outcome',
    write("author_role, kind, body, status", `'student','question','no','declined'`).ok);

  // The conversation is part of the consent record, not something that outlives it.
  psql(conn, db, ['-c', `delete from parent_links where id='${link}'::uuid`]);
  const left = query(conn, db, `select count(*) from parent_messages where link_id='${link}'::uuid`);
  assert('deleting a link takes its messages with it', left === '0',
    `${left} message(s) survived the link they belonged to`);
}

// ── The passwordless parent claim (migration 0010) ──────────────────────────
//
// find_or_create_parent_for_claim is the function that turns "this person proved they can read the
// invited mailbox" into an account. It is reachable, indirectly, by anyone holding an invitation
// code, so its refusals matter as much as its successes — and all of them are decided in SQL,
// where no amount of reading the JavaScript will tell you whether they work.
async function checkParentClaim(conn, db) {
  section('The parent claim function');

  const call = (email) => query(conn, db,
    `select find_or_create_parent_for_claim('${email}')::text`);

  // ── Creates ──────────────────────────────────────────────────────────────
  const created = JSON.parse(call('claim-new@example.test'));
  assert('an unknown address becomes a parent account', created.ok === true && created.created === true,
    JSON.stringify(created));

  const row = query(conn, db,
    `select role || '|' || (password_hash is null)::text from app_users where email='claim-new@example.test'`);
  assert("…with role='parent' and no password", row === 'parent|true', `got ${row}`);

  // ── Finds ────────────────────────────────────────────────────────────────
  const again = JSON.parse(call('claim-new@example.test'));
  assert('a returning parent is found, not duplicated', again.ok === true && again.created === false
    && again.userId === created.userId, JSON.stringify(again));

  const count = query(conn, db, `select count(*) from app_users where email='claim-new@example.test'`);
  assert('…and there is still exactly one row for that address', count === '1', `got ${count}`);

  // Case is not identity. An invitation addressed to Priya@Example.test and a claim arriving as
  // priya@example.test are the same mailbox, and creating a second account for the second spelling
  // would strand somebody on an empty dashboard with no way to tell why.
  const mixedCase = JSON.parse(call('Claim-New@Example.TEST'));
  assert('the address is matched case-insensitively',
    mixedCase.ok === true && mixedCase.userId === created.userId, JSON.stringify(mixedCase));

  // ── Refuses, rather than upgrading ───────────────────────────────────────
  //
  // The escalation this prevents: a student, at their own address, becoming their own guardian.
  // Role is written once at account creation and by nothing afterwards, and a function that
  // "helpfully" flipped this row would be the one exception that undoes the rule everywhere.
  psql(conn, db, ['-c',
    `insert into app_users (email, name, role) values ('claim-student@example.test','S','student')`]);
  const conflict = JSON.parse(call('claim-student@example.test'));
  assert('an address that already has a student account is refused',
    conflict.ok === false && conflict.reason === 'role_conflict', JSON.stringify(conflict));

  const stillStudent = query(conn, db,
    `select role from app_users where email='claim-student@example.test'`);
  assert('…and that account is left exactly as it was', stillStudent === 'student', `got ${stillStudent}`);

  const blank = JSON.parse(call('   '));
  assert('a blank address is refused', blank.ok === false && blank.reason === 'invalid_email',
    JSON.stringify(blank));

  // ── Races ────────────────────────────────────────────────────────────────
  //
  // Two taps on the same button, or a retry on a flaky phone connection. Both callers find no
  // account, both insert, and one loses on the unique index — which must resolve to the winner's
  // row rather than surfacing as an error on the last screen of a flow the person already
  // completed. This is the check that a plain read-then-write in Node would fail.
  const racers = await parallelQueries(conn, db, Array.from({ length: 4 }, () =>
    `select find_or_create_parent_for_claim('claim-race@example.test')::text`));
  const parsed = racers.filter(r => r.ok).map(r => JSON.parse(r.out));
  assert('four concurrent claims all succeed', racers.every(r => r.ok) && parsed.every(p => p.ok === true),
    racers.filter(r => !r.ok).map(r => r.out).join(' | '));
  assert('…and all four resolve to the same account',
    new Set(parsed.map(p => p.userId)).size === 1,
    JSON.stringify(parsed.map(p => p.userId)));
  assert('…and exactly one of them created it',
    parsed.filter(p => p.created === true).length === 1,
    JSON.stringify(parsed.map(p => p.created)));

  // ── The code index ───────────────────────────────────────────────────────
  section('Invitation codes');

  const s1 = query(conn, db, `insert into app_users (email,name,role) values ('code-s1@example.test','S1','student') returning id`);
  const s2 = query(conn, db, `insert into app_users (email,name,role) values ('code-s2@example.test','S2','student') returning id`);
  // Token hashes are namespaced to this section: they are globally unique by their own index, and
  // borrowing a value another check already inserted would fail here for a reason that has nothing
  // to do with codes.
  const mkLink = (student, email, hash, code, status = 'pending') => tryExec(conn, db, ['-c',
    `insert into parent_links (student_user_id, status, initiated_by, invite_email, invite_token_hash, invite_code)
     values ('${student}'::uuid, '${status}', 'student', '${email}', repeat('c0de${hash}',16), '${code}')`]);

  assert('a pending invitation can carry a code', mkLink(s1, 'code-p1@example.test', '1', 'ABCD2345').ok);

  const dupCode = mkLink(s2, 'code-p2@example.test', '2', 'ABCD2345');
  assert('two live invitations cannot share a code', !dupCode.ok,
    'a code that names two invitations names neither');

  const dupCaseCode = mkLink(s2, 'code-p3@example.test', '3', 'abcd2345');
  assert('…case-insensitively', !dupCaseCode.ok,
    'codes are matched with ilike, so a lowercase duplicate would be a real collision');

  // Answered invitations release their code back into the space. Without the partial predicate the
  // codes would be permanently consumed, and a family that reconnected later would collide with
  // their own history.
  psql(conn, db, ['-c', `update parent_links set status='revoked' where invite_code='ABCD2345'`]);
  const reused = mkLink(s2, 'code-p4@example.test', '4', 'ABCD2345');
  assert('an answered invitation releases its code', reused.ok, reused.out.split('\n').slice(0, 2).join(' '));
}

// ── Main ────────────────────────────────────────────────────────────────────

const files = migrationFiles();
console.log(`Verifying ${files.length} migrations from supabase/migrations/`);

checkFilenames(files);

await withDatabase(async (conn) => {
  const db = 'msp_migration_verify';
  recreate(conn, db);

  const clean = checkFirstApply(conn, db, files);
  if (!clean) {
    console.error('\nThe chain does not apply cleanly — skipping the checks that depend on it.');
  } else {
    checkManifest(conn, db);
    checkFunctionExposure(conn, db);
    checkConstraints(conn, db);
    await checkConcurrency(conn, db);
    await checkDeletionSemantics(conn, db);
    await checkParentClaim(conn, db);
    checkMessages(conn, db);
    // Idempotency runs last: it re-applies over a database that now has test rows in it, which is
    // a strictly harder case than a pristine one and closer to the production situation a retry
    // actually happens in.
    checkIdempotency(conn, db, files);
  }

  psql(conn, 'postgres', ['-c', `drop database if exists ${db} with (force)`]);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('Migrations verified.');
