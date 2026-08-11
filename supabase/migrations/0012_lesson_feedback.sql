-- 0012_lesson_feedback.sql
--
-- Every "was this lesson too easy / too hard / just right?" answer a student gives at the
-- bottom of a pathway lesson, as its own queryable row.
--
-- Why a dedicated table when progress_sync (0003) already carries this data inside its JSON
-- snapshot: those are two different jobs, and only one of them is done by the snapshot.
--
--   progress_sync is DEVICE STATE. It is a whole-profile blob, overwritten on every push, read
--   only by the client that owns it, and shaped for "restore this student's app on a new
--   laptop". It is the right home for the generated passage text so the student finds it again
--   on their phone — and it is useless for asking a question across the data, because the
--   answer would mean parsing every user's entire blob.
--
--   lesson_feedback is a LOG. One immutable row per answer, with the lesson, the unit, the
--   pathway and the subject alongside the rating. That shape is what makes the questions this
--   data exists to answer answerable at all: which lessons does everyone find too hard, is a
--   given student trending toward "too easy" over time, does a unit's difficulty curve
--   actually match the order we teach it in.
--
-- Both are written. The client writes locally first (Dexie `lessonFeedback`, so an answer given
-- offline is never lost), rides along in the next progress_sync push, and posts here through
-- /api/lesson-feedback. A failed post is non-fatal by design — the answer is already durable in
-- two other places, and a student should never see an error for telling us how a lesson went.

create table if not exists lesson_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references app_users(id) on delete cascade,
  lesson_id    text not null,
  lesson_title text,
  unit_id      text,
  unit_title   text,
  pathway_key  text,
  category     text,
  -- Constrained at the database rather than trusted from the client: this column's whole value
  -- is that it can be grouped by, and one stray free-text rating makes every aggregate wrong.
  rating       text not null check (rating in ('too_easy', 'just_right', 'too_hard')),
  -- What Medabrain generated in response (the deeper continuation, or the re-teach). Nullable:
  -- 'just_right' has no generation, and a row is written before the model replies so the answer
  -- survives even if the generation fails.
  ai_text      text,
  -- The resource links attached to a 'too_hard' answer, as stored [{title,url,type,source}].
  resources    jsonb not null default '[]'::jsonb,
  -- Client-side creation time in epoch ms. Kept alongside created_at so a row written here can
  -- be matched to the same tap in the client's Dexie/progress_sync copies, which key on it.
  client_ts    bigint,
  created_at   timestamptz not null default now()
);

-- The two access patterns: "this student's history" (the Medabrain profile, newest first) and
-- "everything about this lesson" (which lessons are landing badly).
create index if not exists lesson_feedback_user_created_idx on lesson_feedback (user_id, created_at desc);
create index if not exists lesson_feedback_lesson_idx on lesson_feedback (lesson_id);

-- One row per physical tap. The client stamps client_ts from the same moment it writes its
-- local row, so a retry after a flaky network cannot log the same answer twice.
create unique index if not exists lesson_feedback_dedupe_idx
  on lesson_feedback (user_id, lesson_id, client_ts)
  where client_ts is not null;

alter table lesson_feedback enable row level security;
-- No policies, deliberately: every read and write goes through api/lesson-feedback.js using the
-- service-role admin client (which bypasses RLS) after requireStudent() has established who is
-- asking — the same model progress_sync (0003) and reward_claims (0004) use. RLS stays enabled
-- so that a future anon/authenticated client key cannot reach the table by default.
