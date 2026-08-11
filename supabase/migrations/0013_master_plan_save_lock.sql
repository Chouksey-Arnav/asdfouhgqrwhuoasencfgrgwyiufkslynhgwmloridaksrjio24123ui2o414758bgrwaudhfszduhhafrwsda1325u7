-- 0013_master_plan_save_lock.sql
--
-- Fixes a lost-update race in save_master_plan(): concurrent saves for a user who does not yet
-- have a stored plan can each write the SAME revision number, so the counter ends up lower than
-- the number of saves that succeeded and one or more archived versions are never written.
--
-- ── The bug ────────────────────────────────────────────────────────────────
-- 0005 opens the function with the standard serialize-on-the-row idiom:
--
--     select * into existing from master_plans where user_id = p_user_id for update;
--
-- FOR UPDATE locks the rows a query RETURNS. When the plan row does not exist yet, that query
-- returns nothing, and so it locks nothing. Every concurrent caller therefore sails through the
-- `if found` branch together, each leaving next_revision at its initial value of 1, and each then
-- runs the INSERT ... ON CONFLICT DO UPDATE. The unique index serializes the writes, but by then
-- the damage is done: they are all writing `revision = 1`, and the archive branch — which lives
-- inside `if found` — never runs for any of them. Nobody errors. The row just quietly holds a
-- revision that does not match how many saves really happened.
--
-- Once the row exists, FOR UPDATE does its job and later saves increment correctly, which is
-- exactly why this was so easy to miss: it is a race confined to the FIRST few saves of a plan's
-- life, and it only bites when two of them overlap. Running eight concurrent saves against a
-- fresh user reproduces it non-deterministically (observed revisions: 8, 5, 8, 6, 6 across five
-- runs of the same test on the same machine), which is also why the migration suite's
-- "revision advanced exactly once per concurrent save" assertion has been failing intermittently
-- on CI rather than every time.
--
-- ── Why it matters more now than it did ────────────────────────────────────
-- The revision counter is not decoration. save_master_plan archives the version it replaces under
-- the OLD revision number, and the Plans tab's "Restore this version" reads that history. A lost
-- increment means a version that was replaced was never archived — the student's own undo, gone,
-- silently. Concurrent saves also just became considerably more likely: the plan's two-day window
-- now refreshes itself daily and can be driven from two places at once (App-wide and the Plans tab
-- while it is open), and a first build flushes straight to the server rather than waiting out the
-- debounce.
--
-- ── The fix ────────────────────────────────────────────────────────────────
-- Take a lock that exists whether or not the row does. A transaction-scoped advisory lock keyed on
-- the user id serializes every caller operating on the same plan, from the first statement of the
-- function body to commit — covering the read, the archive and the upsert as one unit, which is
-- what the 0005 header already claimed the row lock was doing.
--
-- The FOR UPDATE is kept as well. It is redundant while every writer goes through this function,
-- and that is the point: it stays correct if some future statement touches the row directly.
--
-- Advisory locks are a single cluster-wide namespace shared by anything that uses them, so the key
-- is built from two hashes — a constant naming this lock, and the user id — rather than from the
-- user id alone. Nothing else in this schema takes advisory locks today; this keeps it that way by
-- construction if something ever does.
--
-- Everything else about the function is byte-for-byte 0005's. Only the lock line is new.

create or replace function save_master_plan(
  p_user_id uuid,
  p_plan jsonb,
  p_client_updated_at bigint,
  p_reason text default null,
  p_force boolean default false
) returns jsonb
language plpgsql
security definer
-- Restated because CREATE OR REPLACE FUNCTION replaces the function's configuration parameters
-- along with its body: omitting this would silently undo the search_path pinning 0008 applied,
-- reopening the SECURITY DEFINER schema-shadowing hole that migration exists to close.
set search_path = public, pg_temp
as $$
declare
  MAX_REVISIONS constant int := 10;
  existing      master_plans%rowtype;
  next_revision int := 1;
begin
  -- Serializes concurrent saves for THIS user before anything is read, including the case where
  -- the row does not exist yet and there is consequently nothing for FOR UPDATE to hold. Released
  -- automatically at end of transaction.
  perform pg_advisory_xact_lock(hashtext('save_master_plan'), hashtext(p_user_id::text));

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

-- CREATE OR REPLACE preserves an existing function's privileges, so 0008's revoke survives this on
-- any database where 0008 has already run. Restated anyway: this file must not be the reason a
-- default PUBLIC grant exists on a SECURITY DEFINER function that trusts its user-id argument,
-- whatever order these migrations reach a given database in.
revoke all on function public.save_master_plan(uuid, jsonb, bigint, text, boolean) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.save_master_plan(uuid, jsonb, bigint, text, boolean) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.save_master_plan(uuid, jsonb, bigint, text, boolean) from authenticated;
  end if;
  -- /api/* talks to Postgres as the service role (see api/_lib/supabaseAdmin.js); without this the
  -- revoke above would take the Plans tab down with it.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.save_master_plan(uuid, jsonb, bigint, text, boolean) to service_role;
  end if;
end $$;
