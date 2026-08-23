-- 0021_medex_score.sql
--
-- The MedEx Score's weekly seal history.
--
-- ── Why this is a table and not a computed value ────────────────────────────────────────────────
-- The score itself is pure: given a portfolio and a benchmark programme, src/lib/medex/score.js
-- recomputes it identically every time, and storing a derived number is normally a mistake.
--
-- What is NOT recomputable is history. The whole mechanic (see src/lib/medex/week.js) is that the
-- score seals once a week and everything logged between seals banks up until the next one — which
-- only means something if last week's number is a fact rather than a re-derivation. And it cannot
-- be re-derived: the portfolio it was computed from no longer exists. Recomputing week 34's score
-- from today's portfolio would show a student a "history" in which they were always as strong as
-- they are now, quietly erasing the improvement the chart exists to show. So each seal is written
-- down once, at the moment it is taken, and never recalculated.
--
-- ── One row per user per ISO week ───────────────────────────────────────────────────────────────
-- `week_key` is 'YYYY-Www', local to the STUDENT's timezone (a countdown that disagrees with the
-- calendar on their wall reads as broken). It is an identifier, not an instant — nothing may parse
-- it back into a timestamp to decide anything. `sealed_at` is the real instant, kept separately,
-- because a student whose first visit of the week is Sunday night has a seal that is technically
-- this week's and practically a few hours old, and hiding that would be more confusing than
-- showing it.
--
-- The unique constraint is what makes the seal immutable in practice: the client's INSERT for a
-- week that already sealed loses rather than overwriting. A score that can re-seal downward on a
-- second visit, or upward on a third, is a score nobody has to believe.
--
-- ── Why the benchmark is denormalised into the row ──────────────────────────────────────────────
-- The score is only meaningful relative to the programme it was measured against, and students
-- edit their college lists. Storing 742 without storing "vs. Brown PLME" produces a history chart
-- that shows a 90-point jump on the week a student removed their reach school — which is a real
-- change in what the number means, not an improvement. Both the id and the display name are kept
-- so the chart can label a week whose programme has since been dropped from the list entirely.

create table if not exists medex_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,

  -- 'YYYY-Www', ISO-8601 week numbering, in the student's local timezone.
  week_key text not null,

  -- 0-1000. See src/lib/medex/scale.js for what the anchors mean; 850 is the
  -- median admitted student at the benchmark programme.
  score integer not null check (score >= 0 and score <= 1000),

  -- The band id at seal time ('building', 'contender', …). Denormalised on
  -- purpose: band boundaries are a product decision that may be retuned, and a
  -- history chart must keep showing what the student was actually told that
  -- week rather than silently restating it under new thresholds.
  band text,

  -- What it was measured against, at seal time. See the note above.
  benchmark_id text,
  benchmark_name text,

  -- The five-pillar breakdown and the composite z, as computed that week. Kept
  -- so a student can see WHICH part of their profile moved between two seals,
  -- which is the only actionable thing a history chart can tell them.
  pillars jsonb not null default '{}'::jsonb,

  -- Coverage ratio and confidence at seal time, so an old seal can be shown
  -- with the same honesty as a fresh one instead of hardening into a fact.
  coverage numeric,
  confidence text,

  sealed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- One seal per user per week. This is the immutability guarantee, not a hint.
create unique index if not exists medex_scores_user_week_idx
  on medex_scores (user_id, week_key);

-- The read path is always "this user's seals, most recent first" — the Home
-- card wants the last two, the history chart wants the last ~26.
create index if not exists medex_scores_user_sealed_idx
  on medex_scores (user_id, sealed_at desc);

-- ── Row-level security ──────────────────────────────────────────────────────────────────────────
-- Enabled with no policies, exactly as every other table in this schema: auth is custom
-- (api/auth/*), there is no auth.uid(), and all per-user scoping happens in application code with
-- the service-role key. See the AUTH MODEL note at the top of 0000_base_schema.sql.
alter table medex_scores enable row level security;
