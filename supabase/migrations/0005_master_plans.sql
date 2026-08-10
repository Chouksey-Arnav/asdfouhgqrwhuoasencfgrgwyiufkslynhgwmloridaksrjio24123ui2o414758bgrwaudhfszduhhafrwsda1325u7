-- 0005_master_plans.sql
--
-- First-class server-side storage for the Plans tab's master plan (src/lib/masterPlanGenerator.js).
--
-- ── Why this table exists ──────────────────────────────────────────────────
-- The master plan previously lived only inside the progress_sync JSON blob, as one field on the
-- user snapshot. That worked, but it made the app's single most expensive artifact — three
-- sequential Oracle generations, 20-40 seconds of the student's time, and the thing every other
-- surface (Home's today card, the quiz tab's plan strip, the coach's system prompt) reads from —
-- the least durable thing in the account:
--
--   * IT SHARED A 2MB CEILING with every other piece of synced progress. A plan is a few hundred
--     KB of JSON; a student with a long history could push the combined snapshot at the cap, and
--     the failure mode is the whole sync being rejected, not just the plan.
--   * IT HAD NO HISTORY. "Rebuild Roadmap" and the profile-change refresh both overwrite the
--     plan in place. A student who rebuilt and preferred what they had before had no way back —
--     the previous plan was simply gone, and regenerating does not reproduce it.
--   * IT COULD NOT BE READ WITHOUT THE WHOLE SNAPSHOT, so nothing server-side (a future reminder
--     email, an export, an admin support request) could see a student's plan without pulling and
--     parsing megabytes of unrelated state.
--   * CONFLICTS RESOLVED BY LAST WRITE. Two devices with the tab open both push a full snapshot;
--     the later push wins wholesale, so a plan edited on a phone could be replaced by a stale
--     copy from a laptop that had been sitting open since morning.
--
-- This table fixes all four: the current plan is its own row with its own size budget, every
-- overwrite archives the version it replaced, and save_master_plan() resolves concurrent writes
-- on the plan's own updatedAt stamp inside a row-locked transaction rather than by arrival order.
--
-- The plan continues to be mirrored into the progress_sync snapshot as well. That is deliberate
-- belt-and-braces during rollout: an app served from a deployment where this migration has not
-- been applied yet (migrations here are applied by hand — see the other migration headers) keeps
-- working exactly as before, because the client treats this table as an upgrade over the blob,
-- never as a prerequisite for it.

create table if not exists master_plans (
  user_id           uuid primary key references app_users(id) on delete cascade,
  plan              jsonb not null,
  -- Denormalized from the plan body so the row is useful (and greppable, and indexable) without
  -- deserializing a few hundred KB of JSON.
  headline          text,
  horizon_weeks     int,
  start_date        date,
  -- The plan's own updatedAt (epoch ms, client clock). This is the conflict-resolution key —
  -- see save_master_plan below — NOT updated_at, which is server time and therefore always
  -- "now" for whichever write arrives last.
  client_updated_at bigint not null default 0,
  revision          int    not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Every superseded plan, newest first, trimmed to MAX_REVISIONS per user by save_master_plan.
-- This is what makes "Rebuild Roadmap" a reversible action instead of a destructive one.
create table if not exists master_plan_revisions (
  id          bigserial primary key,
  user_id     uuid not null references app_users(id) on delete cascade,
  revision    int  not null,
  plan        jsonb not null,
  headline    text,
  reason      text,
  created_at  timestamptz not null default now()
);

create index if not exists master_plan_revisions_user_idx
  on master_plan_revisions (user_id, created_at desc);

-- The client never talks to Supabase directly (every request goes through /api/* with the
-- service role), so anon/authenticated must not reach these rows.
alter table master_plans enable row level security;
alter table master_plan_revisions enable row level security;

-- ── save_master_plan ───────────────────────────────────────────────────────
-- One atomic call: archive whatever is currently stored, upsert the new plan, trim history.
--
-- Concurrency is the whole reason this is a function rather than three statements in Node. Two
-- devices saving at once would otherwise interleave a read-then-write and the loser's archive
-- (or its plan) would vanish. Here the row lock is held for the entire body.
--
-- Staleness is resolved on p_client_updated_at, not on arrival order: a push carrying an OLDER
-- plan than the one stored is rejected and the stored row is returned unchanged, so the client
-- can adopt the newer plan instead of overwriting it. `stale` in the result tells it which
-- happened. p_force exists for an explicit user-driven restore, where the student has chosen an
-- older plan on purpose and "older" is exactly the intent.
create or replace function save_master_plan(
  p_user_id uuid,
  p_plan jsonb,
  p_client_updated_at bigint,
  p_reason text default null,
  p_force boolean default false
) returns jsonb
language plpgsql
security definer
as $$
declare
  MAX_REVISIONS constant int := 10;
  existing      master_plans%rowtype;
  next_revision int := 1;
begin
  select * into existing from master_plans where user_id = p_user_id for update;

  if found then
    if not p_force and p_client_updated_at < existing.client_updated_at then
      -- Incoming plan predates what is stored: keep the stored one and hand it back.
      return jsonb_build_object(
        'stale', true,
        'plan', existing.plan,
        'revision', existing.revision,
        'clientUpdatedAt', existing.client_updated_at,
        'updatedAt', existing.updated_at
      );
    end if;

    next_revision := existing.revision + 1;

    -- Only archive a genuinely different plan. Without this, the client's ordinary debounced
    -- re-saves (checking a task off, dragging one to tomorrow) would burn through the ten
    -- history slots in an afternoon and push out the roadmap versions worth restoring.
    if existing.plan is distinct from p_plan then
      insert into master_plan_revisions (user_id, revision, plan, headline, reason)
      values (p_user_id, existing.revision, existing.plan, existing.headline, p_reason);

      delete from master_plan_revisions
      where user_id = p_user_id
        and id not in (
          select id from master_plan_revisions
          where user_id = p_user_id
          order by created_at desc
          limit MAX_REVISIONS
        );
    end if;
  end if;

  insert into master_plans (user_id, plan, headline, horizon_weeks, start_date, client_updated_at, revision, updated_at)
  values (
    p_user_id,
    p_plan,
    nullif(p_plan->>'headline', ''),
    nullif(p_plan->>'horizonWeeks', '')::int,
    nullif(p_plan->>'startDate', '')::date,
    coalesce(p_client_updated_at, 0),
    next_revision,
    now()
  )
  on conflict (user_id) do update set
    plan              = excluded.plan,
    headline          = excluded.headline,
    horizon_weeks     = excluded.horizon_weeks,
    start_date        = excluded.start_date,
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
