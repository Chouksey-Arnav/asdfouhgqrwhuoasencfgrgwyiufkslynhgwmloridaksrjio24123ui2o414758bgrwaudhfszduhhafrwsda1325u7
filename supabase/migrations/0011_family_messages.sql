-- 0011_family_messages.sql
--
-- Gives the parent dashboard a way to say something, and the student a way to answer.
--
-- ── Why a read-only dashboard was not finished ─────────────────────────────
-- 0006 through 0010 built a careful one-way window: a parent sees effort and outcomes, never the
-- work itself, and only because the student agreed. That boundary is right and nothing here moves
-- it. What it left out is that the dashboard does not exist in isolation — it exists in a house,
-- and a parent who can see that their daughter has not studied since Tuesday and has no way to
-- say anything inside the product says it at dinner instead. The feature's own privacy promise
-- ("we show effort, never a verdict about your child") is undermined by the fact that the only
-- channel it leaves open is the confrontational one.
--
-- So: short messages, both directions, in the app. Not email — see the note on volume below.
--
-- ── The three kinds, and why the shape is one table ────────────────────────
--   note         a thing said. No answer expected, nothing to do.
--   question     a thing asked. The student answers in a line.
--   quiz_request a thing asked for: "sit a quiz on <topic>". The student marks it done or says no.
--
-- They are one table with a `kind` rather than three tables because they are one thread from both
-- sides' point of view — a parent reading their side wants what they said and what came back in
-- the order it happened, and three tables would mean three queries and a merge to render one list
-- that is never displayed any other way.
--
-- ── What this deliberately is NOT ──────────────────────────────────────────
-- Not a chat. There are no attachments, no editing, no delivery receipts, and a hard length cap:
-- the failure mode of a parent-child messaging channel inside a study app is that it becomes the
-- place an argument happens, and a 600-character box that shows up next to a study plan is a
-- different object from a chat window. A student can always ignore one; nothing here can compel
-- an answer, and a quiz_request is a suggestion on their plan, never a change to it.
--
-- Not a notification system either. Nothing in this migration or its endpoint sends email. The
-- relay is metered (api/_lib/mailer.js) and the invitation is the first mail that dies when the
-- quota runs out — spending that quota on "your mother sent you a note" would trade the thing
-- families cannot do without for a thing they can. Messages surface in the app, where both people
-- already are.

create table if not exists parent_messages (
  id               uuid primary key default gen_random_uuid(),

  -- The link, not the pair. Authorization for every read and write in api/parent/messages.js is
  -- "is there an ACTIVE link with this id that you are a party to", re-read per request exactly
  -- like api/parent/summary.js does — so revoking a connection silences the thread immediately
  -- rather than at the end of a 30-day session. On delete cascade because a link that is gone
  -- takes its conversation with it; there is no legitimate reader left.
  link_id          uuid not null references parent_links(id) on delete cascade,

  -- Denormalised from the link so a message can be filtered to one person without a join, and so
  -- the row still says who was talking to whom if the link is later revoked. Written by the API
  -- from the link row, never from the request body.
  parent_user_id   uuid not null references app_users(id) on delete cascade,
  student_user_id  uuid not null references app_users(id) on delete cascade,

  author_role      text not null check (author_role in ('parent', 'student')),
  kind             text not null check (kind in ('note', 'question', 'quiz_request')),

  -- 600 characters. Enforced here and not only in the handler because the cap is a product
  -- decision about what this channel is for (see the header), and a constraint in one place that
  -- the database does not know about is a constraint that lasts until the next caller.
  body             text not null check (char_length(body) between 1 and 600),

  -- quiz_request only: the subject area asked for, from the allowlist in the handler. Free text
  -- in the column rather than an enum because the allowlist tracks the app's own catalogue, which
  -- changes far more often than this schema should.
  topic            text check (topic is null or char_length(topic) <= 80),

  -- Only the actionable kinds ever leave 'open'. A note is said and that is the end of it.
  --   done      the student did the thing, or answered
  --   declined  the student said no — an explicit, first-class outcome, because a request you
  --             cannot refuse is an instruction, and this product does not let a parent instruct
  status           text not null default 'open' check (status in ('open', 'done', 'declined')),
  reply            text check (reply is null or char_length(reply) <= 600),
  responded_at     timestamptz,

  -- When the OTHER side first loaded it. Drives the unread count and nothing else — there is no
  -- "seen at 9:04" anywhere in the UI, deliberately.
  read_at          timestamptz,

  created_at       timestamptz not null default now()
);

-- The only access pattern: one thread, newest first.
create index if not exists parent_messages_link_idx
  on parent_messages (link_id, created_at desc);

-- The unread badge, per recipient. Partial so the index only carries rows that can still be
-- counted — a thread that has been read costs nothing to keep.
create index if not exists parent_messages_unread_student_idx
  on parent_messages (student_user_id) where read_at is null and author_role = 'parent';
create index if not exists parent_messages_unread_parent_idx
  on parent_messages (parent_user_id) where read_at is null and author_role = 'student';

-- Same posture as every other table in this feature (migration 0006): RLS on, deny all, and every
-- read and write goes through a serverless handler holding the service role that has already
-- checked the link. The anon key must never be able to reach a family's conversation, and a
-- policy that tries to express "a party to an active link" in SQL would be a second, subtly
-- different copy of the check in api/_lib/session.js.
alter table parent_messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'parent_messages' and policyname = 'parent_messages_deny_all') then
    create policy parent_messages_deny_all on parent_messages for all using (false) with check (false);
  end if;
end $$;
