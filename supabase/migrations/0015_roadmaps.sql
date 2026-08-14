-- 0015_roadmaps.sql
--
-- Server-side storage for the Roadmap tab's twelve-month roadmap
-- (src/lib/roadmap/generator.js).
--
-- ── Why this is its own table rather than a field on master_plans ───────────
-- The two artifacts look superficially similar — both are AI-generated, both are expensive, both
-- have revision history — and they are genuinely different objects with different lifecycles:
--
--   * DIFFERENT TIME SCALE. A master plan is a rolling two-day window that is rewritten daily and
--     whose old days are compacted away. A roadmap is a twelve-month document that is written
--     three or four times a YEAR and whose whole value is that it does not churn. Sharing a row
--     would mean every daily plan rewrite bumped the roadmap's revision and burned a history slot
--     that exists to make "rebuild my roadmap" reversible.
--   * DIFFERENT FAILURE MODE. Losing today's plan costs a student a day. Losing their roadmap
--     costs them the twelve-question intake, four Oracle generations, and the only record of
--     which deadlines they had already decided to skip.
--   * DIFFERENT READERS. The roadmap is read by the parent digest, the Portfolio timeline merge
--     and the coach's system prompt. Those want the roadmap without deserializing a plan.
--
-- Everything else here is deliberately identical to 0005_master_plans.sql — the same
-- client_updated_at conflict key, the same row-locked save function, the same trimmed revision
-- history — because that design was arrived at the hard way and this artifact has exactly the
-- same concurrency problem.
--
-- Like every migration in this folder, this is applied BY HAND. The app treats the table as an
-- upgrade and never as a prerequisite: api/roadmap.js maps "relation does not exist" onto an
-- empty result, and src/lib/roadmap/store.js keeps the roadmap working out of the local copy and
-- the progress_sync snapshot on a deployment where this has not been run.

create table if not exists roadmaps (
  user_id           uuid primary key references app_users(id) on delete cascade,
  roadmap           jsonb not null,
  -- Denormalized from the body so the row is useful, greppable and indexable without
  -- deserializing a few hundred KB of JSON.
  headline          text,
  grade_stage       text,
  start_date        date,
  end_date          date,
  item_count        int,
  -- The roadmap's own updatedAt (epoch ms, client clock). This is the conflict-resolution key,
  -- NOT updated_at, which is server time and therefore always "now" for whichever write lands
  -- last. Same reasoning as master_plans.client_updated_at.
  client_updated_at bigint not null default 0,
  revision          int    not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Every superseded roadmap, newest first, trimmed to MAX_REVISIONS per user by save_roadmap.
-- This is what makes "Rebuild my roadmap" a reversible action rather than a destructive one —
-- which matters more here than it does for a daily plan, because a student who rebuilds after
-- changing one intake answer and preferred the original has no other way back.
create table if not exists roadmap_revisions (
  id          bigserial primary key,
  user_id     uuid not null references app_users(id) on delete cascade,
  revision    int  not null,
  roadmap     jsonb not null,
  headline    text,
  reason      text,
  created_at  timestamptz not null default now()
);

create index if not exists roadmap_revisions_user_idx
  on roadmap_revisions (user_id, created_at desc);

-- The client never talks to Supabase directly (every request goes through /api/* with the
-- service role), so anon/authenticated must not reach these rows.
alter table roadmaps enable row level security;
alter table roadmap_revisions enable row level security;

-- ── save_roadmap ───────────────────────────────────────────────────────────
-- One atomic call: archive whatever is stored, upsert the new roadmap, trim history. The row
-- lock is held for the whole body, so two devices saving at once cannot interleave a
-- read-then-write and lose one side's archive.
--
-- Staleness resolves on p_client_updated_at rather than arrival order: a push carrying an OLDER
-- roadmap than the stored one is rejected and the stored row is returned, so the client adopts
-- the newer one instead of overwriting it. p_force exists for an explicit student-driven restore,
-- where "older" is precisely the intent.
create or replace function save_roadmap(
  p_user_id uuid,
  p_roadmap jsonb,
  p_client_updated_at bigint,
  p_reason text default null,
  p_force boolean default false
) returns jsonb
language plpgsql
security definer
as $$
declare
  MAX_REVISIONS constant int := 10;
  existing      roadmaps%rowtype;
  next_revision int := 1;
begin
  select * into existing from roadmaps where user_id = p_user_id for update;

  if found then
    if not p_force and p_client_updated_at < existing.client_updated_at then
      return jsonb_build_object(
        'stale', true,
        'roadmap', existing.roadmap,
        'revision', existing.revision,
        'clientUpdatedAt', existing.client_updated_at,
        'updatedAt', existing.updated_at
      );
    end if;

    next_revision := existing.revision + 1;

    -- Only archive a genuinely different roadmap. Without this, the client's ordinary debounced
    -- re-saves (ticking a preparation step, entering a local deadline) would burn the ten history
    -- slots in an afternoon and push out the generated versions that are the point of keeping any.
    if existing.roadmap is distinct from p_roadmap then
      insert into roadmap_revisions (user_id, revision, roadmap, headline, reason)
      values (p_user_id, existing.revision, existing.roadmap, existing.headline, p_reason);

      delete from roadmap_revisions
      where user_id = p_user_id
        and id not in (
          select id from roadmap_revisions
          where user_id = p_user_id
          order by created_at desc
          limit MAX_REVISIONS
        );
    end if;
  end if;

  insert into roadmaps (user_id, roadmap, headline, grade_stage, start_date, end_date, item_count, client_updated_at, revision, updated_at)
  values (
    p_user_id,
    p_roadmap,
    nullif(p_roadmap->>'headline', ''),
    nullif(p_roadmap->>'gradeStage', ''),
    nullif(p_roadmap->>'startDate', '')::date,
    nullif(p_roadmap->>'endDate', '')::date,
    coalesce(jsonb_array_length(p_roadmap->'items'), 0),
    coalesce(p_client_updated_at, 0),
    next_revision,
    now()
  )
  on conflict (user_id) do update set
    roadmap           = excluded.roadmap,
    headline          = excluded.headline,
    grade_stage       = excluded.grade_stage,
    start_date        = excluded.start_date,
    end_date          = excluded.end_date,
    item_count        = excluded.item_count,
    client_updated_at = excluded.client_updated_at,
    revision          = excluded.revision,
    updated_at        = now();

  return jsonb_build_object(
    'stale', false,
    'revision', next_revision,
    'clientUpdatedAt', coalesce(p_client_updated_at, 0),
    'updatedAt', now()
  );
end;
$$;

-- Same lockdown as migration 0008 applies to every other RPC in this schema: these run with
-- security definer, so they must not be callable by the anon or authenticated roles. Only the
-- service role (which is what /api/* uses) may execute them.
revoke all on function save_roadmap(uuid, jsonb, bigint, text, boolean) from public;
revoke all on function save_roadmap(uuid, jsonb, bigint, text, boolean) from anon;
revoke all on function save_roadmap(uuid, jsonb, bigint, text, boolean) from authenticated;
