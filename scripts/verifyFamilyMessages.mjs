#!/usr/bin/env node
/**
 * Family messages, driven as requests.
 *
 * ── Why this one is worth the harness ───────────────────────────────────────
 * Everything else under /api/parent/ is read-only or writes a consent record. This endpoint is the
 * first place where one account writes a row that another account reads on a screen — which means
 * every authorization mistake here shows up as one person's message appearing in a stranger's
 * family. verifyParentDashboard.mjs proves the guard is called; it cannot prove that the guard is
 * consulted about the RIGHT link, that a revoked connection actually goes quiet, or that the row
 * takes its user ids from the link rather than from whatever the client typed.
 *
 * So this drives api/parent/messages.js the way a browser does and checks what comes back. The
 * only thing replaced is Supabase, by the same style of in-memory store the claim harness uses —
 * an unsupported operator throws rather than quietly matching everything, because a fake that
 * ignores a filter turns a suite like this into a source of false confidence.
 *
 * Run:  npm run verify:family-messages
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; console.log(`  ✓ ${label}`); return true; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  return false;
};
const section = (name) => console.log(`\n${name}`);

// ── An in-memory Supabase ───────────────────────────────────────────────────
const db = { app_users: [], sessions: [], parent_links: [], parent_messages: [] };
const nextId = () => crypto.randomUUID();

const DEFAULTS = {
  parent_messages: { status: 'open', reply: null, responded_at: null, read_at: null, topic: null },
};

function makeQuery(table, kind, payload) {
  const filters = [];
  let limit = null;
  let head = false;
  let wantCount = false;
  let joinSessions = false;

  const matches = (row) => filters.every(({ op, col, val }) => {
    const cell = row[col];
    if (op === 'eq') return cell === val;
    if (op === 'neq') return cell !== val;
    if (op === 'is') return (cell ?? null) === val;
    if (op === 'not_is') return (cell ?? null) !== val;
    if (op === 'in') return val.includes(cell);
    if (op === 'gte') return String(cell) >= String(val);
    // `.or('a.eq.X,b.eq.X')` — the only or() shape this codebase uses (getActiveLinkForUser).
    if (op === 'or') {
      return String(val).split(',').some((clause) => {
        const [c, o, v] = clause.split('.');
        if (o !== 'eq') throw new Error(`fake supabase: unsupported or() operator ${o}`);
        return row[c] === v;
      });
    }
    throw new Error(`fake supabase: unsupported operator ${op}`);
  });

  const resolve = () => {
    let rows = db[table].filter(matches);
    // Newest-first is the only ordering any caller asks for, and the store appends.
    rows = rows.slice().reverse();
    if (limit != null) rows = rows.slice(0, limit);

    if (kind === 'select') {
      if (head && wantCount) return { data: null, count: db[table].filter(matches).length, error: null };
      const shaped = joinSessions
        ? rows.map((r) => ({ ...r, app_users: db.app_users.find((u) => u.id === r.user_id) || null }))
        : rows;
      return { data: shaped, count: shaped.length, error: null };
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
    select(cols, opts) {
      if (opts?.head) head = true;
      if (opts?.count) wantCount = true;
      if (typeof cols === 'string' && cols.includes('app_users(')) joinSessions = true;
      return builder;
    },
    eq(col, val) { filters.push({ op: 'eq', col, val }); return builder; },
    neq(col, val) { filters.push({ op: 'neq', col, val }); return builder; },
    is(col, val) { filters.push({ op: 'is', col, val }); return builder; },
    not(col, op, val) {
      if (op !== 'is') throw new Error(`fake supabase: unsupported not() operator ${op}`);
      filters.push({ op: 'not_is', col, val });
      return builder;
    },
    or(expr) { filters.push({ op: 'or', col: null, val: expr }); return builder; },
    in(col, val) { filters.push({ op: 'in', col, val }); return builder; },
    gte(col, val) { filters.push({ op: 'gte', col, val }); return builder; },
    order() { return builder; },
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

const fakeSupabase = {
  from(table) {
    if (!db[table]) db[table] = [];
    return {
      select: (cols, opts) => makeQuery(table, 'select').select(cols, opts),
      insert: (payload) => makeQuery(table, 'insert', payload),
      update: (payload) => makeQuery(table, 'update', payload),
    };
  },
  rpc() { return Promise.resolve({ data: null, error: { code: '42883', message: 'function does not exist' } }); },
};

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

process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
const { __setTestClient } = await import('../api/_lib/supabaseAdmin.js');
__setTestClient(fakeSupabase);
const { default: messages, TOPICS } = await import('../api/parent/messages.js');

// ── Fixtures ────────────────────────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;

function makeUser(role, name) {
  const user = { id: nextId(), email: `${crypto.randomUUID()}@test`, name, role };
  db.app_users.push(user);
  const session = { id: nextId(), user_id: user.id, expires_at: new Date(Date.now() + 30 * DAY).toISOString() };
  db.sessions.push(session);
  return { user, token: session.id };
}

function connect({ status = 'active' } = {}) {
  const parent = makeUser('parent', 'Priya Shah');
  const student = makeUser('student', 'Aanya Rao');
  const link = {
    id: nextId(),
    parent_user_id: parent.user.id,
    student_user_id: student.user.id,
    status,
    initiated_by: 'student',
    relationship: 'Mother',
  };
  db.parent_links.push(link);
  return { parent, student, link };
}

const call = async (method, token, { body = {}, query = {} } = {}) => {
  const res = makeRes();
  await messages({
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    socket: { remoteAddress: '203.0.113.5' },
    body,
    query,
  }, res);
  return res;
};

// ── 1. The ordinary round trip ──────────────────────────────────────────────
section('A parent says something and the student answers');
{
  const { parent, student, link } = connect();

  const sent = await call('POST', parent.token, {
    body: { linkId: link.id, kind: 'quiz_request', topic: 'SAT Math', body: 'Ten minutes before dinner would do it.' },
  });
  assert('the parent can send a quiz request', sent.statusCode === 200, JSON.stringify(sent.body));
  assert('…which comes back marked as theirs', sent.body?.message?.mine === true);
  assert('…carrying the topic they chose', sent.body?.message?.topic === 'SAT Math');
  assert('…and starts open', sent.body?.message?.status === 'open');

  const inbox = await call('GET', student.token);
  assert('the student sees it', inbox.body?.messages?.length === 1);
  assert('…as not theirs', inbox.body.messages[0].mine === false);
  assert('…and as unread', inbox.body.messages[0].unread === true && inbox.body.unread === 1);

  const messageId = inbox.body.messages[0].id;
  const answered = await call('PATCH', student.token, { body: { messageId, status: 'done', reply: 'Did it, 8/10.' } });
  assert('the student can answer it', answered.statusCode === 200, JSON.stringify(answered.body));
  assert('…which records the reply', answered.body?.message?.reply === 'Did it, 8/10.');
  assert('…and closes it', answered.body?.message?.status === 'done');

  const back = await call('GET', parent.token);
  assert('the parent sees the answer on their own message', back.body?.messages?.[0]?.reply === 'Did it, 8/10.');
  assert('…and is not told their own message is unread', back.body.unread === 0);
}

// ── 2. Saying no is a first-class answer ────────────────────────────────────
section('A student can refuse');
{
  const { parent, student, link } = connect();
  await call('POST', parent.token, { body: { linkId: link.id, kind: 'quiz_request', body: 'Please sit one.' } });
  const inbox = await call('GET', student.token);
  const declined = await call('PATCH', student.token, { body: { messageId: inbox.body.messages[0].id, status: 'declined' } });
  assert('"not this week" is stored as an outcome, not as silence', declined.body?.message?.status === 'declined');

  const parentView = await call('GET', parent.token);
  assert('and the parent is told so plainly', parentView.body?.messages?.[0]?.status === 'declined');
}

// ── 3. Consent is re-read on every request ──────────────────────────────────
section('A revoked connection goes quiet immediately');
{
  const { parent, student, link } = connect();
  await call('POST', parent.token, { body: { linkId: link.id, kind: 'note', body: 'Proud of you.' } });

  // Exactly what "revoke" does in api/parent/links.js: the row stays, the status changes.
  link.status = 'revoked';

  const blocked = await call('POST', parent.token, { body: { linkId: link.id, kind: 'note', body: 'One more thing.' } });
  assert('the parent cannot send another', blocked.statusCode === 403 && blocked.body?.reason === 'no_link');

  const gone = await call('GET', parent.token);
  assert('…and the thread stops being readable at all', (gone.body?.messages || []).length === 0);

  const studentGone = await call('GET', student.token);
  assert('…from both sides', (studentGone.body?.messages || []).length === 0);
}

// ── 4. The rows belong to the link, never to the request body ───────────────
section('A client cannot name somebody else');
{
  const theirs = connect();
  const mine = connect();

  // The shape of the attack: a real session, a real link they are on, and another family's ids
  // in the body. Every one of these fields is written from the link row, so all three are noise.
  const res = await call('POST', mine.parent.token, {
    body: {
      linkId: mine.link.id,
      kind: 'note',
      body: 'hello',
      studentUserId: theirs.student.user.id,
      parentUserId: theirs.parent.user.id,
      authorRole: 'student',
    },
  });
  assert('the message is written', res.statusCode === 200);
  const row = db.parent_messages.find((m) => m.id === res.body.message.id);
  assert('…against the link the sender is actually on', row.link_id === mine.link.id);
  assert('…with the student id from that link, not the body', row.student_user_id === mine.student.user.id);
  assert('…with the parent id from that link, not the body', row.parent_user_id === mine.parent.user.id);
  assert('…and authored by whoever the session says, not the body', row.author_role === 'parent');

  const outsider = await call('GET', theirs.student.token);
  assert('the other family sees nothing of it', (outsider.body?.messages || []).length === 0);

  const reachIn = await call('POST', mine.parent.token, { body: { linkId: theirs.link.id, kind: 'note', body: 'hello' } });
  assert('and naming their link outright is refused', reachIn.statusCode === 403 && reachIn.body?.reason === 'no_link');
}

// ── 5. Who may answer what ──────────────────────────────────────────────────
section('Answering is the recipient\'s move');
{
  const { parent, student, link } = connect();
  const sent = await call('POST', parent.token, { body: { linkId: link.id, kind: 'quiz_request', body: 'Please.' } });
  const id = sent.body.message.id;

  const self = await call('PATCH', parent.token, { body: { messageId: id, status: 'done' } });
  assert('a parent cannot mark their own request done', self.statusCode === 403 && self.body?.reason === 'own_message');

  const stranger = connect();
  const outside = await call('PATCH', stranger.student.token, { body: { messageId: id, status: 'done' } });
  assert('and somebody outside the family cannot touch it', outside.statusCode === 403);

  const ok = await call('PATCH', student.token, { body: { messageId: id, status: 'done' } });
  assert('the student can', ok.statusCode === 200);
}

// ── 6. What each role may send ──────────────────────────────────────────────
section('A quiz request is a parent\'s move');
{
  const { student, link } = connect();
  const res = await call('POST', student.token, { body: { linkId: link.id, kind: 'quiz_request', body: 'You sit one.' } });
  assert('a student asking their parent to sit a quiz is refused', res.statusCode === 400 && res.body?.reason === 'wrong_role');

  const note = await call('POST', student.token, { body: { linkId: link.id, kind: 'note', body: 'Got a B+.' } });
  assert('…but a student can still say something', note.statusCode === 200 && note.body?.message?.kind === 'note');
}

// ── 7. Input the endpoint has to survive ────────────────────────────────────
section('Bad input is answered, not crashed into');
{
  const { parent, link } = connect();

  const anon = await call('GET', null);
  assert('no session is a 401', anon.statusCode === 401);

  const empty = await call('POST', parent.token, { body: { linkId: link.id, body: '   ' } });
  assert('an empty message is refused', empty.statusCode === 400);

  const huge = await call('POST', parent.token, { body: { linkId: link.id, body: 'x'.repeat(601) } });
  assert('an over-long one is refused with the limit in words', huge.statusCode === 400 && /600/.test(huge.body.error));

  const noId = await call('POST', parent.token, { body: { kind: 'note', body: 'hi' } });
  assert('a missing link id is refused before any lookup', noId.statusCode === 400);

  const notUuid = await call('POST', parent.token, { body: { linkId: 'not-a-uuid', body: 'hi' } });
  assert('a malformed link id is refused too', notUuid.statusCode === 400);

  const junkKind = await call('POST', parent.token, { body: { linkId: link.id, kind: 'exec', body: 'hi' } });
  assert('an unknown kind degrades to a note rather than storing itself', junkKind.body?.message?.kind === 'note');

  const junkTopic = await call('POST', parent.token, {
    body: { linkId: link.id, kind: 'quiz_request', topic: '<script>alert(1)</script>', body: 'hi' },
  });
  assert('a topic off the allowlist never reaches the row', TOPICS.includes(junkTopic.body?.message?.topic));

  const nothing = await call('PATCH', parent.token, { body: { messageId: nextId() } });
  assert('answering a message that does not exist is a 404', nothing.statusCode === 404);
}

// ── 8. Volume ───────────────────────────────────────────────────────────────
section('One person cannot bury the other');
{
  const { parent, student, link } = connect();
  let refusedAt = null;
  for (let i = 0; i < 30; i += 1) {
    const res = await call('POST', parent.token, { body: { linkId: link.id, kind: 'note', body: `note ${i}` } });
    if (res.statusCode === 429) { refusedAt = i; break; }
  }
  assert('the daily cap stops it', refusedAt === 25, `stopped after ${refusedAt} messages`);

  // The cap is per author, so a student buried under 25 notes can still answer.
  const reply = await call('POST', student.token, { body: { linkId: link.id, kind: 'note', body: 'ok' } });
  assert('…without silencing the other side', reply.statusCode === 200);
}

// ── 9. Reading ──────────────────────────────────────────────────────────────
section('Opening a thread is reading it');
{
  const { parent, student, link } = connect();
  await call('POST', parent.token, { body: { linkId: link.id, kind: 'note', body: 'one' } });
  await call('POST', parent.token, { body: { linkId: link.id, kind: 'note', body: 'two' } });

  const before = await call('GET', student.token);
  assert('two unread', before.body.unread === 2);

  const marked = await call('PATCH', student.token, { body: { linkId: link.id, read: true } });
  assert('marking the thread read covers both', marked.body?.read === 2);

  const after = await call('GET', student.token);
  assert('…and the count clears', after.body.unread === 0);

  const parentSide = await call('GET', parent.token);
  assert('the parent\'s own two messages were never unread for them', parentSide.body.unread === 0);

  const again = await call('PATCH', student.token, { body: { linkId: link.id, read: true } });
  assert('marking an already-read thread is a no-op, not a re-stamp', again.body?.read === 0);
}

// ── 10. Static guarantees the harness cannot exercise ───────────────────────
section('The promises this feature makes in prose');
{
  const handler = fs.readFileSync(path.join(ROOT, 'api/parent/messages.js'), 'utf8');
  const client = fs.readFileSync(path.join(ROOT, 'src/lib/parentApi.js'), 'utf8');
  const migration = fs.readFileSync(path.join(ROOT, 'supabase/migrations/0011_family_messages.sql'), 'utf8');

  // The single most expensive mistake available here: wiring "your mother sent you a note" to the
  // metered relay the invitation itself depends on. Nothing in this feature may send mail.
  assert('no message ever sends email', !/sendMail|sendOtpEmail|sendInviteEmail|mailer/.test(handler),
    'family messages must never spend the relay quota — see the header of supabase/migrations/0011');

  assert('the handler resolves consent through getActiveLinkForUser, never from the body',
    /getActiveLinkForUser/.test(handler) && !/body\.(studentUserId|parentUserId|authorRole)/.test(handler));

  // The client's copy of the topic list is convenience; the server's is authority. They have to
  // agree or a parent picks a topic that is silently replaced with a different one.
  const serverTopics = TOPICS;
  const clientTopics = JSON.parse(
    `[${(client.match(/export const QUIZ_TOPICS = \[([\s\S]*?)\];/) || [])[1]
      .split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
      .replace(/'/g, '"').replace(/,\s*$/, '')}]`,
  );
  assert('the client\'s topic list matches the server\'s allowlist',
    JSON.stringify(clientTopics) === JSON.stringify(serverTopics),
    `client: ${JSON.stringify(clientTopics)}\n      server: ${JSON.stringify(serverTopics)}`);

  assert('the table denies everyone but the service role',
    /enable row level security/.test(migration) && /for all using \(false\)/.test(migration));
  assert('the body length cap is in the schema and not only in the handler',
    /char_length\(body\) between 1 and 600/.test(migration));
  assert('"declined" is a storable outcome, not an absence',
    /'open', 'done', 'declined'/.test(migration));
  assert('a deleted link takes its conversation with it',
    /references parent_links\(id\) on delete cascade/.test(migration));
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(`\nFamily messages verification FAILED:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('Family messages verified.');
