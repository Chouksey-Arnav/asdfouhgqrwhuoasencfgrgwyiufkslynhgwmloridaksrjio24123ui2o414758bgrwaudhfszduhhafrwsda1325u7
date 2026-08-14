// /api/parent/messages — the one channel that runs in both directions.
//
//   GET                          → { messages: [...], links: [...], unread }
//   GET  ?linkId=<uuid>          → the same, narrowed to one relationship
//   POST { linkId, kind, body, topic? }   → { message }  say something
//   PATCH { messageId, status?, reply? }  → { message }  answer a request, or mark a thread read
//   PATCH { linkId, read: true }          → { read: n }  mark everything from the other side read
//
// ── Served to both roles, like api/parent/links.js and for the same reason ──
// A message thread with one writable end is not a conversation, it is a loudspeaker. The whole
// justification for letting a parent say anything here (see supabase/migrations/0011) is that the
// student can answer, decline, and be heard in the same place — so every operation below is
// symmetric, and the only role-dependent thing in the file is which column the caller's id sits in
// and which of the two `status` transitions they are allowed to make.
//
// ── Authorization, in one sentence ──────────────────────────────────────────
// Every read and every write resolves the link FIRST, by id, filtered to `status = 'active'` and
// to links the caller is a party to (getActiveLinkForUser), and takes both user ids off that row
// rather than from the request. Nothing in this file trusts a client-supplied student_user_id,
// parent_user_id or author_role, and a revoked connection stops the thread on the very next
// request rather than whenever the 30-day session happens to lapse.
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import {
  requireUser, roleOf, isUuid, getActiveLinkForUser, getActiveLinksForUser,
} from '../_lib/session.js';

const KINDS = ['note', 'question', 'quiz_request'];
const MAX_BODY = 600;

// How many messages one person may add to one relationship in a day.
//
// Not an anti-abuse limit in the usual sense — both parties consented to each other and either can
// end it in one tap. It is a product limit: forty notes in an evening is not a parent using a
// study app, and the cap is the difference between a channel that gets read and one that gets
// muted. Set where no ordinary week could reach it.
const MAX_PER_DAY = 25;

// The subject areas a quiz can be asked for.
//
// A curated, parent-legible list rather than the app's internal quiz ids: the person choosing here
// has not seen the catalogue and should not have to. It is also an allowlist, checked server-side,
// so `topic` can never become a free-text field that renders into the student's app.
const TOPICS = [
  'Anything — you pick',
  'Math & Data',
  'Reading & Writing',
  'Biology & Biochemistry',
  'Chemistry & Physics',
  'Psychology & Sociology',
  'Their current pathway lessons',
];

const MISSING_SCHEMA = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
const isMissingSchema = (err) => !!err
  && (MISSING_SCHEMA.has(err.code) || /does not exist|schema cache/i.test(err.message || ''));

const SELECT = `
  id, link_id, author_role, kind, body, topic, status, reply, responded_at, read_at, created_at
`;

/** Row → API shape, from the point of view of whoever is asking. */
const serialize = (row, viewerRole) => ({
  id: row.id,
  linkId: row.link_id,
  kind: row.kind,
  body: row.body,
  topic: row.topic || null,
  status: row.status,
  reply: row.reply || null,
  respondedAt: row.responded_at || null,
  createdAt: row.created_at,
  // "Did I write this" is the only thing the bubble needs to decide which side to sit on, and
  // deriving it here means the client never compares ids it should not have to hold.
  mine: row.author_role === viewerRole,
  // Only ever true for a message the viewer received. Their own unread message is a nonsense.
  unread: row.author_role !== viewerRole && !row.read_at,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await requireUser(req, res);
  if (!user) return;

  const role = roleOf(user);
  const supabase = getSupabaseAdmin();

  const readBody = () => {
    try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
    catch { return null; }
  };

  try {
    // ── Read the thread ──────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const linkId = String(req.query?.linkId || '').trim();

      // The set of relationships this caller may read at all, resolved before anything is
      // fetched. A parent with two children asking for everything gets two threads; a parent
      // asking for a link they are not on gets an empty list, not a 403, because "that link is
      // not yours" and "that link does not exist" should be one answer from outside.
      let links;
      if (linkId) {
        if (!isUuid(linkId)) return res.status(400).json({ error: 'Missing link id.' });
        const link = await getActiveLinkForUser(supabase, { linkId, userId: user.id });
        links = link ? [link] : [];
      } else {
        links = await getActiveLinksForUser(supabase, { userId: user.id, role });
      }

      if (!links.length) return res.status(200).json({ role, messages: [], unread: 0 });

      const { data, error } = await supabase
        .from('parent_messages')
        .select(SELECT)
        .in('link_id', links.map((l) => l.id))
        .order('created_at', { ascending: false })
        // A cap rather than pagination: nothing in the UI scrolls past this, and a thread long
        // enough to hit it has other problems.
        .limit(200);
      if (error) throw error;

      const messages = (data || []).map((row) => serialize(row, role));
      return res.status(200).json({
        role,
        messages,
        unread: messages.filter((m) => m.unread).length,
      });
    }

    // ── Say something ────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = readBody();
      if (!body) return res.status(400).json({ error: 'Invalid JSON body.' });

      const linkId = String(body.linkId || '').trim();
      if (!isUuid(linkId)) return res.status(400).json({ error: 'Missing link id.' });

      const link = await getActiveLinkForUser(supabase, { linkId, userId: user.id });
      if (!link) {
        return res.status(403).json({
          error: 'That connection is not active any more, so nothing can be sent through it.',
          reason: 'no_link',
        });
      }

      const kind = KINDS.includes(body.kind) ? body.kind : 'note';
      const text = String(body.body || '').trim();
      if (!text) return res.status(400).json({ error: 'Write something first.' });
      if (text.length > MAX_BODY) {
        return res.status(400).json({ error: `Keep it under ${MAX_BODY} characters — this sits next to a study plan, not in an inbox.` });
      }

      // Only a parent asks for a quiz. A student asking their parent to sit one is not a thing,
      // and allowing it would put a status the parent app has no control for onto their thread.
      if (kind === 'quiz_request' && role !== 'parent') {
        return res.status(400).json({ error: 'Only a parent can ask for a quiz.', reason: 'wrong_role' });
      }
      const topic = kind === 'quiz_request'
        ? (TOPICS.includes(body.topic) ? body.topic : TOPICS[0])
        : null;

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('parent_messages')
        .select('id', { count: 'exact', head: true })
        .eq('link_id', linkId)
        .eq('author_role', role)
        .gte('created_at', since);
      if ((count ?? 0) >= MAX_PER_DAY) {
        return res.status(429).json({
          error: 'That is a lot of messages for one day. Give it until tomorrow.',
          reason: 'rate_limited',
        });
      }

      // Both ids come off the link row. This is the line that makes the endpoint safe: a client
      // that names somebody else's student in the body is naming a field this insert never reads.
      const { data, error } = await supabase
        .from('parent_messages')
        .insert({
          link_id: link.id,
          parent_user_id: link.parent_user_id,
          student_user_id: link.student_user_id,
          author_role: role,
          kind,
          body: text,
          topic,
        })
        .select(SELECT)
        .single();
      if (error) throw error;

      return res.status(200).json({ message: serialize(data, role) });
    }

    // ── Answer one, or mark the thread read ──────────────────────────────────
    if (req.method === 'PATCH') {
      const body = readBody();
      if (!body) return res.status(400).json({ error: 'Invalid JSON body.' });

      // Marking a whole thread read. Separate from the per-message path because it is what
      // opening the screen does, and doing it one row at a time would be one request per bubble.
      if (body.read === true) {
        const linkId = String(body.linkId || '').trim();
        if (!isUuid(linkId)) return res.status(400).json({ error: 'Missing link id.' });
        const link = await getActiveLinkForUser(supabase, { linkId, userId: user.id });
        if (!link) return res.status(200).json({ read: 0 });

        const { data, error } = await supabase
          .from('parent_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('link_id', link.id)
          // Only the other side's messages, and only the ones not already marked — so the
          // timestamp records when it was FIRST read rather than when it was last looked at.
          .neq('author_role', role)
          .is('read_at', null)
          .select('id');
        if (error) throw error;
        return res.status(200).json({ read: (data || []).length });
      }

      const messageId = String(body.messageId || '').trim();
      if (!isUuid(messageId)) return res.status(400).json({ error: 'Missing message id.' });

      const { data: row, error: readErr } = await supabase
        .from('parent_messages')
        .select('id, link_id, author_role, kind, status')
        .eq('id', messageId)
        .maybeSingle();
      if (readErr) throw readErr;
      if (!row) return res.status(404).json({ error: 'That message no longer exists.' });

      const link = await getActiveLinkForUser(supabase, { linkId: row.link_id, userId: user.id });
      if (!link) return res.status(403).json({ error: 'That conversation is not yours.', reason: 'no_link' });

      // Answering is the recipient's move, always. A parent who could mark their own request
      // "done" would be writing their child's homework record for them, and a student who could
      // resolve their own note would be answering themselves.
      if (row.author_role === role) {
        return res.status(403).json({ error: 'You can only answer the other person’s messages.', reason: 'own_message' });
      }

      const status = ['done', 'declined'].includes(body.status) ? body.status : null;
      const reply = body.reply == null ? null : String(body.reply).trim().slice(0, MAX_BODY);
      if (!status && !reply) return res.status(400).json({ error: 'Nothing to change.' });

      const { data, error } = await supabase
        .from('parent_messages')
        .update({
          ...(status ? { status } : {}),
          ...(reply ? { reply } : {}),
          responded_at: new Date().toISOString(),
          // Answering is reading. Set here as well so a reply from a screen that never called the
          // bulk mark-read cannot leave its own message sitting in the unread count.
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select(SELECT)
        .single();
      if (error) throw error;

      return res.status(200).json({ message: serialize(data, role) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    // Migrations here are applied by hand (see the header of any migration file), so "the code is
    // ahead of the schema" is a state a deployment genuinely sits in. A reader degrades to an
    // empty thread — the dashboard around it still works — and a writer says plainly that the
    // feature is not on yet rather than 500-ing at somebody mid-sentence.
    if (isMissingSchema(err)) {
      return req.method === 'GET'
        ? res.status(200).json({ role, messages: [], unread: 0, available: false })
        : res.status(503).json({ error: 'Family messages are not available on this deployment yet.', reason: 'schema_missing' });
    }
    console.error('parent messages error:', err);
    return res.status(500).json({ error: 'Request failed.' });
  }
}

export { TOPICS };
