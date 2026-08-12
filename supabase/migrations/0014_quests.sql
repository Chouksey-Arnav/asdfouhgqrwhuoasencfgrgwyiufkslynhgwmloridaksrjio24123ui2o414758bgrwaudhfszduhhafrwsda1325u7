-- 0014_quests.sql
--
-- Quests: the long-horizon commitments a student takes on, or a parent asks for.
--
-- ── Why this is a table and the weekly quests are not ──────────────────────
-- The existing weekly quest set (src/lib/gamification.js) is three fixed items that reset every
-- Monday and pay 30 XP. Its claim state lives in localStorage because losing it costs a student
-- almost nothing and because there is nothing about it that another person needs to see.
--
-- These are different on both counts. A quest here runs for one to six weeks, pays up to 2,000 XP,
-- and — this is the part that forces a table — can be assigned by somebody other than the person
-- who has to do it. A parent asking their child to verify twenty-four lessons over a month is a
-- fact about a relationship, not a fact about a browser, and it has to survive a cleared cache, a
-- new phone, and the student signing in somewhere else.
--
-- ── The row snapshots the quest ────────────────────────────────────────────
-- target / window_days / daily_cap / min_active_days / xp are COPIED onto the row at assignment
-- time from the catalog (src/data/questCatalog.js, mirrored in api/_lib/questCatalog.js). They are
-- not looked up live. A live quest is a promise already made to a student, and re-pricing a
-- catalog entry next month must not move the finish line of one somebody is three weeks into —
-- nor quietly change what they were told it pays. The catalog id is still stored so the app can
-- find the copy, the icon and the "what counts" text, all of which are safe to update in place.
--
-- ── Progress is REPORTED, not computed here ────────────────────────────────
-- The evidence a quest is measured against — every card review, every SAT response, every
-- verified lesson — lives in the student's own IndexedDB and is summarised into progress_sync
-- (see src/lib/db.js buildSyncSnapshot). The student's device runs the engine (src/lib/quests.js)
-- and PATCHes the result here.
--
-- That is a deliberate trust position, and it is the same one the rest of the product already
-- takes: XP itself is computed on-device and synced additively. What this table does NOT do is
-- let a reported number turn into a reward on its own — claiming routes through the existing
-- idempotent reward-claim path (api/reward-claim.js, `reward_claims` (user_id, claim_key) primary
-- key) with the XP amount taken from the SERVER's copy of the catalog, so the worst a tampered
-- client achieves is claiming a quest it did not finish for exactly the XP that quest was always
-- worth. Inventing a 50,000 XP quest is not reachable from here.
--
-- The parent reads the same reported numbers. They are told, on that screen, that progress comes
-- from their child's device — because a dashboard that presents a self-reported number as an
-- audited one is worse than one that explains itself.
--
-- ── What a parent cannot do ────────────────────────────────────────────────
-- Assign more than three quests at once (enforced in the handler), assign to a student they are
-- not actively linked to, mark one complete, or stop one being declined. `declined` is a
-- first-class status for exactly the reason migration 0011 gave quiz_request one: a request that
-- cannot be refused is an instruction, and this product does not let a parent instruct.

create table if not exists student_quests (
  id                uuid primary key default gen_random_uuid(),

  -- Whose quest it is. Always the student, never the assigner.
  student_user_id   uuid not null references app_users(id) on delete cascade,

  -- 'self' or 'parent'. The student app renders the two differently — a quest somebody asked for
  -- carries their name and their note, and that framing is most of why an assigned quest works.
  assigned_by       text not null default 'self' check (assigned_by in ('self', 'parent')),

  -- Set only for assigned_by = 'parent'. The link is kept alongside the parent id so a revoked
  -- connection can be reasoned about without a second query: the quest survives (the student
  -- keeps the work and the XP they earned) but nothing about the parent is shown once the link
  -- is gone. On delete set null rather than cascade for that reason — losing the connection must
  -- not delete a student's half-finished commitment.
  parent_user_id    uuid references app_users(id) on delete set null,
  link_id           uuid references parent_links(id) on delete set null,

  -- The catalog entry this came from. Text rather than an enum because the catalog changes far
  -- more often than this schema should; unknown ids are tolerated on read (the row still renders
  -- from its own snapshot) and rejected on write by the handler's allowlist.
  quest_id          text not null check (char_length(quest_id) between 1 and 64),

  -- ── The snapshot. See the header. ────────────────────────────────────────
  title             text not null check (char_length(title) between 1 and 120),
  tier              text not null default 'standard' check (tier in ('standard', 'hard', 'elite', 'legendary')),
  metric            text not null check (char_length(metric) between 1 and 40),
  xp                integer not null check (xp between 0 and 5000),
  target            integer not null check (target between 1 and 100000),
  window_days       integer not null check (window_days between 1 and 120),
  daily_cap         integer not null check (daily_cap between 1 and 100000),
  min_active_days   integer not null default 0 check (min_active_days between 0 and 120),

  -- What the assigner said when they assigned it. Same cap and same reasoning as parent_messages:
  -- this sits next to a study plan, not in an inbox.
  note              text check (note is null or char_length(note) <= 600),

  status            text not null default 'active'
                      check (status in ('active', 'completed', 'claimed', 'expired', 'declined', 'cancelled')),

  -- Reported by the student's device. `progress` is already daily-capped by the engine — this
  -- column is the credited number, not the raw one, so a parent reading it is reading the same
  -- figure the student's progress bar shows.
  progress          integer not null default 0 check (progress >= 0),
  active_days       integer not null default 0 check (active_days >= 0),
  reported_at       timestamptz,

  started_at        timestamptz not null default now(),
  due_at            timestamptz not null,
  completed_at      timestamptz,
  claimed_at        timestamptz,
  ended_at          timestamptz,
  -- Why it ended, for the one line the history list shows. Free text from a small handler-side
  -- set rather than a constraint, since the reasons are product copy and will grow.
  ended_reason      text check (ended_reason is null or char_length(ended_reason) <= 80),

  created_at        timestamptz not null default now()
);

-- The two access patterns, and only these two: "this student's quests, newest first" (the board,
-- the home card, every strip) and "the quests I assigned" (the parent dashboard).
create index if not exists student_quests_student_idx
  on student_quests (student_user_id, created_at desc);
create index if not exists student_quests_parent_idx
  on student_quests (parent_user_id, created_at desc) where parent_user_id is not null;

-- The active-quest caps are enforced in the handler, but this partial index is what makes the
-- count that enforces them cheap enough to run on every assignment.
create index if not exists student_quests_active_idx
  on student_quests (student_user_id) where status in ('active', 'completed');

-- One live assignment per catalog entry per student. Two copies of "Retention Marathon" running
-- at once is not a feature anyone asked for; it is what happens when a parent assigns something
-- the student had already picked for themselves, and it would double the XP for one body of work.
-- Partial so a FINISHED quest can be taken again later, which is the whole point of a repeatable
-- catalog — you can run the Marathon again next month, just not twice this month.
create unique index if not exists student_quests_one_live_per_quest
  on student_quests (student_user_id, quest_id) where status in ('active', 'completed');

-- Same posture as every other table in this feature (migration 0006): RLS on, deny all, and every
-- read and write goes through a serverless handler holding the service role that has already
-- checked the session and, for a parent, the link.
alter table student_quests enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'student_quests' and policyname = 'student_quests_deny_all') then
    create policy student_quests_deny_all on student_quests for all using (false) with check (false);
  end if;
end $$;
