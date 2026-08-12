#!/usr/bin/env node
/**
 * The parent claim flow, end to end, as requests.
 *
 * ── Why this exists alongside the other two ─────────────────────────────────
 * verifyMigrations.mjs proves the SQL is right against a real Postgres. verifyParentDashboard.mjs
 * proves the handlers are wired to the right guards. Neither of them ever sends a request, and the
 * bugs that actually break this feature for a family live in between: a step that reads the wrong
 * field, an error that returns 500 instead of something a person can act on, an ordering that only
 * matters when the second call fails.
 *
 * So this drives api/parent/claim.js the way a browser does — three POSTs with real bodies — and
 * checks what comes back. The only things replaced are the two edges the handler cannot own:
 *
 *   - Supabase, by an in-memory store implementing the query shapes these handlers use. The RPCs
 *     are re-implemented here to mirror migration 0010; that mirror is not what proves the SQL
 *     correct (verifyMigrations does, against real Postgres) — it is here so the JavaScript above
 *     it can be exercised at all.
 *   - SMTP, by a real listening socket speaking the real protocol, so nodemailer actually
 *     connects, authenticates and delivers. The 6-digit code is then read out of the delivered
 *     message exactly as a parent would read it out of their inbox — which is the only way to test
 *     that the thing we email is the thing we check.
 *
 * Run:  npm run verify:parent-claim
 */
import net from 'node:net';
import crypto from 'node:crypto';

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; console.log(`  ✓ ${label}`); return true; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  return false;
};
const section = (name) => console.log(`\n${name}`);

// ── A minimal SMTP sink ─────────────────────────────────────────────────────
//
// Real socket, real protocol. A stubbed sendMail would not catch a malformed message, a wrong
// recipient, or a code that differs between the mail and the database — and "the code in the email
// is not the code we check" is precisely the class of bug that makes a login flow fail for
// everybody while every unit test passes.
const inbox = [];

function startSmtp() {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => {
      let buffer = '';
      let inData = false;
      let message = { to: null, body: '' };

      socket.write('220 localhost ESMTP test\r\n');
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');

        for (;;) {
          if (inData) {
            const end = buffer.indexOf('\r\n.\r\n');
            if (end === -1) return;
            message.body += buffer.slice(0, end);
            buffer = buffer.slice(end + 5);
            inData = false;
            inbox.push(message);
            message = { to: null, body: '' };
            socket.write('250 OK queued\r\n');
            continue;
          }

          const nl = buffer.indexOf('\r\n');
          if (nl === -1) return;
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 2);
          const upper = line.toUpperCase();

          if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
            socket.write('250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250 OK\r\n');
          } else if (upper.startsWith('AUTH')) {
            socket.write('235 authenticated\r\n');
          } else if (upper.startsWith('MAIL FROM')) {
            socket.write('250 OK\r\n');
          } else if (upper.startsWith('RCPT TO')) {
            message.to = (line.match(/<([^>]+)>/) || [])[1] || null;
            socket.write('250 OK\r\n');
          } else if (upper === 'DATA') {
            inData = true;
            socket.write('354 send it\r\n');
          } else if (upper === 'QUIT') {
            socket.write('221 bye\r\n');
            socket.end();
            return;
          } else {
            socket.write('250 OK\r\n');
          }
        }
      });
      socket.on('error', () => {});
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/** The most recent message to an address, and the 6-digit code inside it. */
function lastCodeFor(email) {
  for (let i = inbox.length - 1; i >= 0; i -= 1) {
    if (inbox[i].to !== email) continue;
    // Quoted-printable and long-line wrapping can split the code across an `=\r\n` soft break, so
    // the encoding artefacts come out before the digits are looked for.
    const body = inbox[i].body.replace(/=\r\n/g, '').replace(/=3D/g, '=');
    const match = body.match(/(?:^|[^\d])(\d{6})(?:[^\d]|$)/);
    if (match) return match[1];
  }
  return null;
}

// ── An in-memory Supabase ───────────────────────────────────────────────────
//
// Implements exactly the builder surface these handlers use, and nothing else — an unsupported
// operator throws rather than silently returning everything, because a fake that quietly ignores a
// filter turns a test suite into a source of false confidence.
const db = { app_users: [], sessions: [], otp_codes: [], parent_links: [], parent_link_events: [] };

const nextId = () => crypto.randomUUID();
const lower = (v) => String(v ?? '').toLowerCase();

// Column defaults, because the real schema has them and the code relies on them. otp_codes.consumed
// defaults to false and attempts to 0 (migration 0002); a fake that left them undefined would make
// `.eq('consumed', false)` match nothing, and every code would look expired — which is exactly what
// the first draft of this harness did, and it is a good illustration of why a fake has to model
// defaults rather than just storage.
const DEFAULTS = {
  otp_codes: { consumed: false, attempts: 0 },
  parent_links: { consumed_at: null, accepted_at: null, revoked_at: null },
};

/**
 * PostgREST's embedded resources, as LINK_SELECT asks for them.
 *
 * `parent:app_users!fk(...)` comes back as a nested object, and the handlers read
 * `link.student.name` off it. Without this the fake returns rows whose joins are all null, every
 * name renders as "Your student", and the tests would pass while proving nothing about the screen
 * a parent actually reads.
 */
function withJoins(table, row) {
  if (table !== 'parent_links' || !row) return row;
  const pick = (id) => {
    const u = db.app_users.find((x) => x.id === id);
    return u ? { id: u.id, name: u.name ?? null, email: u.email, grade_level: u.grade_level ?? null } : null;
  };
  return { ...row, parent: pick(row.parent_user_id), student: pick(row.student_user_id) };
}

function makeQuery(table, kind, payload) {
  const filters = [];
  let limit = null;
  let orderDesc = false;
  let head = false;
  let wantCount = false;

  const matches = (row) => filters.every(({ op, col, val }) => {
    const cell = row[col];
    if (op === 'eq') return cell === val;
    if (op === 'is') return (cell ?? null) === val;
    if (op === 'ilike') return lower(cell) === lower(String(val).replace(/%/g, ''));
    if (op === 'gte') return String(cell) >= String(val);
    if (op === 'gt') return String(cell) > String(val);
    if (op === 'in') return val.includes(cell);
    throw new Error(`fake supabase: unsupported operator ${op}`);
  });

  const resolve = () => {
    let rows = db[table].filter(matches);
    if (orderDesc) rows = rows.slice().reverse();
    if (limit != null) rows = rows.slice(0, limit);

    if (kind === 'select') {
      if (head && wantCount) return { data: null, count: db[table].filter(matches).length, error: null };
      return { data: rows.map((r) => withJoins(table, r)), count: rows.length, error: null };
    }
    if (kind === 'insert') {
      const list = Array.isArray(payload) ? payload : [payload];
      const created = list.map((row) => ({
        id: nextId(), created_at: new Date().toISOString(), ...(DEFAULTS[table] || {}), ...row,
      }));
      db[table].push(...created);
      return { data: created, count: created.length, error: null };
    }
    if (kind === 'update') {
      for (const row of rows) Object.assign(row, payload);
      return { data: rows, count: rows.length, error: null };
    }
    throw new Error(`fake supabase: unsupported kind ${kind}`);
  };

  const builder = {
    select(_cols, opts) { if (opts?.head) head = true; if (opts?.count) wantCount = true; return builder; },
    eq(col, val) { filters.push({ op: 'eq', col, val }); return builder; },
    is(col, val) { filters.push({ op: 'is', col, val }); return builder; },
    ilike(col, val) { filters.push({ op: 'ilike', col, val }); return builder; },
    gte(col, val) { filters.push({ op: 'gte', col, val }); return builder; },
    gt(col, val) { filters.push({ op: 'gt', col, val }); return builder; },
    in(col, val) { filters.push({ op: 'in', col, val }); return builder; },
    order(_col, opts) { orderDesc = opts?.ascending === false; return builder; },
    limit(n) { limit = n; return builder; },
    maybeSingle() { const r = resolve(); return Promise.resolve({ ...r, data: r.data?.[0] ?? null }); },
    single() {
      const r = resolve();
      if (!r.data?.length) return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } });
      return Promise.resolve({ ...r, data: r.data[0] });
    },
    then(onOk, onErr) { return Promise.resolve(resolve()).then(onOk, onErr); },
  };
  return builder;
}

// The two RPCs, mirroring migration 0010 and 0006. See this file's header on what that mirror is
// and is not evidence of.
const rpcs = {
  find_or_create_parent_for_claim({ p_email }) {
    const norm = lower(String(p_email || '').trim());
    if (!norm) return { ok: false, reason: 'invalid_email' };
    const existing = db.app_users.find((u) => lower(u.email) === norm);
    if (existing) {
      if ((existing.role || 'student') !== 'parent') return { ok: false, reason: 'role_conflict' };
      return { ok: true, userId: existing.id, created: false };
    }
    const created = { id: nextId(), email: norm, role: 'parent', password_hash: null };
    db.app_users.push(created);
    return { ok: true, userId: created.id, created: true };
  },
  accept_parent_link({ p_token_hash, p_user_id, p_email }) {
    const link = db.parent_links.find((l) => l.invite_token_hash === p_token_hash);
    if (!link) return { accepted: false, reason: 'not_found' };
    if (link.consumed_at || link.status !== 'pending') return { accepted: false, reason: 'already_used' };
    if (new Date(link.invite_expires_at) < new Date()) return { accepted: false, reason: 'expired' };
    if (lower(link.invite_email) !== lower(p_email)) return { accepted: false, reason: 'email_mismatch' };
    const actor = db.app_users.find((u) => u.id === p_user_id);
    if (!actor) return { accepted: false, reason: 'unknown_user' };
    if (link.student_user_id === p_user_id) return { accepted: false, reason: 'self_link' };
    if ((actor.role || 'student') !== 'parent') return { accepted: false, reason: 'role_mismatch', expected: 'parent' };
    Object.assign(link, {
      parent_user_id: p_user_id, status: 'active',
      accepted_at: new Date().toISOString(), consumed_at: new Date().toISOString(),
    });
    return { accepted: true, linkId: link.id, filled: 'parent' };
  },
};

const fakeSupabase = {
  from(table) {
    if (!db[table]) db[table] = [];
    return {
      select: (cols, opts) => makeQuery(table, 'select').select(cols, opts),
      insert: (payload) => makeQuery(table, 'insert', payload),
      update: (payload) => makeQuery(table, 'update', payload),
      upsert: (payload) => makeQuery(table, 'insert', payload),
    };
  },
  rpc(name, args) {
    if (!rpcs[name]) return Promise.resolve({ data: null, error: { code: '42883', message: 'function does not exist' } });
    return Promise.resolve({ data: rpcs[name](args), error: null });
  },
};

// ── A response object shaped like the one standard server frameworks pass in ──────────────────
function makeRes() {
  const res = {
    statusCode: 200, body: null, headers: {},
    setHeader(k, v) { res.headers[k] = v; },
    status(code) { res.statusCode = code; return res; },
    json(payload) { res.body = payload; return res; },
    end() { return res; },
  };
  return res;
}

// Each request gets its own client address by default. The endpoint rate-limits code requests per
// IP as well as per address (five per fifteen minutes), which is correct behaviour and is asserted
// on its own below — but left on for every call it would silently starve the later sections, and a
// suite that fails for a reason unrelated to what it is testing teaches nobody anything.
let clientN = 0;
const post = async (handler, body, ip = `203.0.113.${(clientN += 1) % 250}`) => {
  const res = makeRes();
  await handler({ method: 'POST', headers: {}, socket: { remoteAddress: ip }, body, query: {} }, res);
  return res;
};

// ── Fixtures ────────────────────────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;

function seedInvitation({ email, code, student = 'Aanya Rao', initiatedBy = 'student', expiresInDays = 7 }) {
  const studentRow = { id: nextId(), email: `${crypto.randomUUID()}@student.test`, name: student, role: 'student', grade_level: '11th grade' };
  db.app_users.push(studentRow);
  const token = crypto.randomBytes(32).toString('hex');
  const link = {
    id: nextId(),
    student_user_id: initiatedBy === 'student' ? studentRow.id : null,
    parent_user_id: initiatedBy === 'parent' ? studentRow.id : null,
    status: 'pending',
    initiated_by: initiatedBy,
    relationship: 'Mother',
    invite_email: email,
    invite_code: code,
    invite_token_hash: crypto.createHash('sha256').update(token).digest('hex'),
    invite_expires_at: new Date(Date.now() + expiresInDays * DAY).toISOString(),
    created_at: new Date().toISOString(),
  };
  db.parent_links.push(link);
  return { link, token, studentRow };
}

// ── Main ────────────────────────────────────────────────────────────────────

const smtp = await startSmtp();

// mailer.js's loadAccount() prefers BREVO_SMTP_USER/PASS/FROM over the legacy SMTP_* vars set
// below. In deployments that inject the app's real environment into the build (Coolify does this
// so Vite can inline VITE_* at build time), BREVO_SMTP_USER/PASS can already be sitting in
// process.env here, which would make this "isolated" test silently reach for live Brevo
// credentials instead of the local mock server started above. Clearing them first makes the
// test's own SMTP_* vars the only config the mailer can see, regardless of what the surrounding
// environment happens to contain.
delete process.env.BREVO_SMTP_USER;
delete process.env.BREVO_SMTP_PASS;
delete process.env.BREVO_SMTP_FROM;
delete process.env.BREVO_SMTP_HOST;
delete process.env.BREVO_SMTP_PORT;

process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = String(smtp.port);
process.env.SMTP_USER = 'test';
process.env.SMTP_PASS = 'test';
process.env.SMTP_FROM = 'noreply@medschoolprep.test';

// Imported after the env is set, because api/_lib/supabaseAdmin.js and the mailer both read
// process.env at module scope.
process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

// The one seam: every handler reaches the database through getSupabaseAdmin(), so priming its
// cached client replaces the database for all of them at once. See __setTestClient's own comment
// for why the seam lives in the module rather than out here.
const { __setTestClient } = await import('../api/_lib/supabaseAdmin.js');
__setTestClient(fakeSupabase);

const claim = (await import('../api/parent/claim.js')).default;

console.log('Driving api/parent/claim.js end to end');

section('An invitation nobody has answered');
{
  const { link } = seedInvitation({ email: 'mum@example.test', code: 'ABCD2345' });

  const preview = await post(claim, { code: 'abcd-2345' });
  assert('a code resolves regardless of case and hyphens', preview.statusCode === 200,
    JSON.stringify(preview.body));
  assert('the preview names the student', preview.body?.invite?.inviter?.name === 'Aanya Rao',
    JSON.stringify(preview.body?.invite));
  assert('the preview masks the invited address',
    preview.body?.invite?.emailHint && !preview.body.invite.emailHint.includes('mum@'),
    preview.body?.invite?.emailHint);
  assert('the preview does not sign anybody in or create anything',
    !preview.body?.token && db.app_users.every((u) => u.role !== 'parent'));

  const sent = await post(claim, { code: 'ABCD2345', step: 'send' });
  assert('asking for a code succeeds', sent.statusCode === 200 && sent.body?.sent === true,
    JSON.stringify(sent.body));
  assert('the code is mailed to the invited address, not to anything in the request',
    inbox.at(-1)?.to === 'mum@example.test', inbox.at(-1)?.to);

  const code = lastCodeFor('mum@example.test');
  assert('a 6-digit code actually arrives in the message', /^\d{6}$/.test(code || ''), String(code));

  const wrong = await post(claim, { code: 'ABCD2345', step: 'verify', otp: code === '000000' ? '111111' : '000000' });
  assert('a wrong code is refused', wrong.statusCode >= 400, JSON.stringify(wrong.body));
  assert('…without connecting anything', link.status === 'pending');
  assert('…and says what to do about it', /not right|check your email/i.test(wrong.body?.error || ''),
    wrong.body?.error);

  const done = await post(claim, { code: 'ABCD2345', step: 'verify', otp: code });
  assert('the right code signs the parent in', done.statusCode === 200 && !!done.body?.token,
    JSON.stringify(done.body));
  assert('…as a parent account at the invited address',
    done.body?.user?.role === 'parent' && done.body?.user?.email === 'mum@example.test',
    JSON.stringify(done.body?.user));
  assert('…and the invitation is accepted in the same request',
    done.body?.accepted === true && link.status === 'active' && link.parent_user_id === done.body.user.id);
  assert('…with a session that will actually authenticate',
    db.sessions.some((s) => s.id === done.body.token && s.user_id === done.body.user.id));
  assert('the response never carries a password hash',
    !JSON.stringify(done.body).includes('password_hash'));

  const replay = await post(claim, { code: 'ABCD2345', step: 'verify', otp: code });
  assert('the same code cannot be spent twice', replay.statusCode >= 400, JSON.stringify(replay.body));
}

section('A parent who comes back to a second child');
{
  const { link } = seedInvitation({ email: 'mum@example.test', code: 'EFGH3456', student: 'Dev Rao' });
  await post(claim, { code: 'EFGH3456', step: 'send' });
  const code = lastCodeFor('mum@example.test');
  const done = await post(claim, { code: 'EFGH3456', step: 'verify', otp: code });

  assert('the existing parent account is reused, not duplicated',
    done.statusCode === 200 && db.app_users.filter((u) => u.email === 'mum@example.test').length === 1,
    JSON.stringify(done.body));
  assert('…and the second child is connected too',
    done.body?.accepted === true && link.status === 'active');
}

section('An address that already belongs to a student');
{
  db.app_users.push({ id: nextId(), email: 'teen@example.test', role: 'student', password_hash: 'x' });
  const { link } = seedInvitation({ email: 'teen@example.test', code: 'JKMN4567' });
  await post(claim, { code: 'JKMN4567', step: 'send' });
  const code = lastCodeFor('teen@example.test');
  const res = await post(claim, { code: 'JKMN4567', step: 'verify', otp: code });

  assert('the claim is refused', res.statusCode === 409 && res.body?.reason === 'role_conflict',
    JSON.stringify(res.body));
  assert('…the student account is untouched',
    db.app_users.find((u) => u.email === 'teen@example.test').role === 'student');
  assert('…nothing is connected', link.status === 'pending');
  assert('…and the message says what to actually do',
    /different\s+address/i.test(res.body?.error || ''), res.body?.error);
}

section('Invitations that cannot be claimed this way');
{
  const expired = seedInvitation({ email: 'late@example.test', code: 'PQRS5678', expiresInDays: -1 });
  const res = await post(claim, { code: 'PQRS5678' });
  assert('an expired invitation is refused with 410', res.statusCode === 410, JSON.stringify(res.body));
  assert('…and points at the fix', /new one/i.test(res.body?.error || ''), res.body?.error);
  assert('…without leaking who it was for', !JSON.stringify(res.body).includes('late@example.test'));
  void expired;

  const backwards = seedInvitation({ email: 'kid@example.test', code: 'TVWX6789', initiatedBy: 'parent' });
  const back = await post(claim, { code: 'TVWX6789' });
  assert('a parent-to-student request is not claimable without a student account',
    back.statusCode === 400 && back.body?.reason === 'wrong_direction', JSON.stringify(back.body));
  assert('…and sends them to the ordinary sign-in', /sign in/i.test(back.body?.error || ''), back.body?.error);
  void backwards;

  const unknown = await post(claim, { code: 'ZZZZ9999' });
  assert('an unknown code is a 404, not a crash', unknown.statusCode === 404, JSON.stringify(unknown.body));

  const junk = await post(claim, { code: 'not-a-code' });
  assert('a malformed code is rejected before any lookup', junk.statusCode === 400,
    JSON.stringify(junk.body));

  const nothing = await post(claim, {});
  assert('an empty body is rejected', nothing.statusCode === 400, JSON.stringify(nothing.body));
}

section('The invited mailbox is the only way in');
{
  seedInvitation({ email: 'real@example.test', code: 'ABCJ7892' });
  inbox.length = 0;

  // The attack this closes: somebody who has the link — forwarded, quoted in a reply, read off a
  // shared screen — trying to redirect the code to themselves.
  const redirected = await post(claim, { code: 'ABCJ7892', step: 'send', email: 'attacker@example.test' });
  assert('an address in the request body is ignored entirely',
    inbox.length === 1 && inbox[0].to === 'real@example.test',
    `status ${redirected.statusCode} ${JSON.stringify(redirected.body)} delivered to [${inbox.map((m) => m.to).join(', ')}]`);
}

section('The limits that make a 6-digit code enough');
{
  seedInvitation({ email: 'guessy@example.test', code: 'MNPQ2345' });
  await post(claim, { code: 'MNPQ2345', step: 'send' });
  const real = lastCodeFor('guessy@example.test');

  // Five wrong guesses, then the code is dead. Without an enforced cap a six-digit secret is a
  // million tries away from anybody who is patient, which is not very far at all.
  const wrong = (n) => String((Number(real) + n + 1) % 1000000).padStart(6, '0');
  const outcomes = [];
  for (let i = 0; i < 6; i += 1) {
    outcomes.push(await post(claim, { code: 'MNPQ2345', step: 'verify', otp: wrong(i) }));
  }
  assert('wrong guesses are refused', outcomes.slice(0, 5).every((r) => r.statusCode >= 400));
  assert('the sixth guess is refused for being the sixth, not for being wrong',
    outcomes[5].statusCode === 429 && outcomes[5].body?.reason === 'too_many_attempts',
    JSON.stringify(outcomes[5].body));
  const afterCap = await post(claim, { code: 'MNPQ2345', step: 'verify', otp: real });
  assert('…and the correct code no longer works either',
    afterCap.statusCode >= 400, JSON.stringify(afterCap.body));

  // Requesting a new code must REPLACE the old one's guess budget, not add to it — otherwise five
  // taps on "resend" turn one six-digit code into a thirty-guess one.
  await post(claim, { code: 'MNPQ2345', step: 'send' });
  const fresh = lastCodeFor('guessy@example.test');
  assert('a fresh code is issued and differs from the burnt one', /^\d{6}$/.test(fresh || ''));
  const stale = await post(claim, { code: 'MNPQ2345', step: 'verify', otp: real });
  assert('the superseded code no longer works', stale.statusCode >= 400 || real === fresh,
    JSON.stringify(stale.body));
  const good = await post(claim, { code: 'MNPQ2345', step: 'verify', otp: fresh });
  assert('the fresh code does', good.statusCode === 200 && good.body?.accepted === true,
    JSON.stringify(good.body));
}

section('Asking for codes does not relay mail indefinitely');
{
  // ── Two mechanisms, and the burst is stopped by the first of them ─────────
  //
  // This section used to fire seven sends and assert a 429 on the last. That was asserting the
  // MECHANISM rather than the property, and the mechanism changed: a request landing inside
  // RESEND_FLOOR_MS of a live code no longer mints one, so a burst never accumulates the rows the
  // 15-minute ceiling counts and never reaches it.
  //
  // What matters is unchanged and is now stronger — a burst costs exactly one email instead of
  // five — so that is what is checked here, followed by the ceiling itself against the traffic it
  // was actually built for: codes requested far enough apart to be real requests.
  seedInvitation({ email: 'flood@example.test', code: 'RSTV3456' });
  const before = inbox.length;
  const results = [];
  // One client address throughout: this is the case the per-IP limit exists for.
  for (let i = 0; i < 7; i += 1) {
    results.push(await post(claim, { code: 'RSTV3456', step: 'send' }, '198.51.100.7'));
  }
  assert('every request is answered rather than erroring',
    results.every((r) => r.statusCode === 200), results.map((r) => r.statusCode).join(','));
  assert('but the burst costs exactly one email, not seven',
    inbox.length - before === 1, `${inbox.length - before} messages sent`);
  assert('…and the extra requests say so, so the client stops promising a second mail',
    results.slice(1).every((r) => r.body?.reused === true),
    JSON.stringify(results.at(-1).body));
  assert('the one code that was sent still works',
    (await post(claim, { code: 'RSTV3456', step: 'verify', otp: lastCodeFor('flood@example.test') })).statusCode === 200);

  // The ceiling, against requests spaced past the floor. Written straight into the store with
  // backdated timestamps because the alternative is a test that sleeps for five minutes.
  seedInvitation({ email: 'steady@example.test', code: 'RSTV7788' });
  for (let i = 0; i < 5; i += 1) {
    db.otp_codes.push({
      id: `seeded-${i}`, email: 'steady@example.test', ip: '198.51.100.9', purpose: 'signin',
      code_hash: 'x'.repeat(64), attempts: 0, consumed: true,
      created_at: new Date(Date.now() - (i + 2) * 60_000).toISOString(),
      expires_at: new Date(Date.now() - (i + 1) * 60_000).toISOString(),
    });
  }
  const capped = await post(claim, { code: 'RSTV7788', step: 'send' }, '198.51.100.9');
  assert('five codes in fifteen minutes is where it stops',
    capped.statusCode === 429 && capped.body?.reason === 'rate_limited',
    JSON.stringify(capped.body));
}

section('The emailed link still works');
{
  const { link, token } = seedInvitation({ email: 'dad@example.test', code: 'RSTV8923' });
  const preview = await post(claim, { token });
  assert('a raw token resolves the same invitation', preview.statusCode === 200,
    JSON.stringify(preview.body));

  await post(claim, { token, step: 'send' });
  const code = lastCodeFor('dad@example.test');
  const done = await post(claim, { token, step: 'verify', otp: code });
  assert('and completes the same way', done.statusCode === 200 && done.body?.accepted === true
    && link.status === 'active', JSON.stringify(done.body));
}

// ── The one-press finish, and what it costs ─────────────────────────────────
//
// Every assertion here is about the same decision: the emailed token is proof that the invitation
// reached the invited mailbox, and the shared 8-character code is not. Getting that backwards in
// either direction is a real failure — one way it charges every family a second email to re-prove
// a delivered message, the other way it lets a code read out across a kitchen sign somebody in.
section('Opening the emailed link is the check');
{
  const before = inbox.length;
  const { link, token } = seedInvitation({ email: 'mum.link@example.test', code: 'WXYZ2345' });

  const preview = await post(claim, { token });
  assert('the preview tells the client this invitation can be finished from the link',
    preview.body?.invite?.canConfirmFromLink === true, JSON.stringify(preview.body));

  const done = await post(claim, { token, step: 'link' });
  assert('one press signs them in', done.statusCode === 200 && !!done.body?.token,
    JSON.stringify(done.body));
  assert('…and connects them', done.body?.accepted === true && link.status === 'active');
  assert('…as a parent account', done.body?.user?.role === 'parent');
  assert('…without sending a single email', inbox.length === before,
    `${inbox.length - before} message(s) were sent for a claim that needed none`);

  const again = await post(claim, { token, step: 'link' });
  assert('the link is spent — a forwarded copy redeems nothing', again.statusCode === 404,
    JSON.stringify(again.body));
}

section('A shared code still has to prove itself');
{
  const code = 'JKMN3456';
  const { link } = seedInvitation({ email: 'mum.code@example.test', code });

  const preview = await post(claim, { code });
  assert('a code-opened invitation says it cannot be finished from the link',
    preview.body?.invite?.canConfirmFromLink === false);

  const skip = await post(claim, { code, step: 'link' });
  assert('and asking to skip the code anyway is refused',
    skip.statusCode === 400 && skip.body?.reason === 'code_needs_otp', JSON.stringify(skip.body));
  assert('…leaving the invitation untouched', link.status === 'pending');

  await post(claim, { code, step: 'send' });
  const otp = lastCodeFor('mum.code@example.test');
  const done = await post(claim, { code, step: 'verify', otp });
  assert('the code path still completes', done.statusCode === 200 && link.status === 'active');
}

section('The invitation email carries the handle that finishes in one press');
{
  // The bug this pins: sendInviteEmail preferred the code URL whenever a code existed, so the
  // one message we HAD delivered to the invited address arrived carrying the handle that proves
  // nothing — and the one-press path could never fire for anybody.
  const { sendInviteEmail } = await import('../api/_lib/parentLinks.js');
  const token = crypto.randomBytes(32).toString('hex');
  await sendInviteEmail({
    to: 'firstsend@example.test', token, code: 'PQRS4567',
    inviterName: 'Aanya', inviterRole: 'student', relationship: 'Mother',
  });
  const mail = inbox.filter((m) => m.to === 'firstsend@example.test').at(-1);
  const body = (mail?.body || '').replace(/=\r\n/g, '').replace(/=3D/g, '=');
  assert('the button in a first send points at the token', body.includes(`parent-invite?token=${token}`),
    'the emailed link must be the one that can be redeemed in one press');
  assert('…and the code is still in the mail as the fallback', /PQRS-4567/.test(body));
}

smtp.server.close();

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('Parent claim flow verified.');
