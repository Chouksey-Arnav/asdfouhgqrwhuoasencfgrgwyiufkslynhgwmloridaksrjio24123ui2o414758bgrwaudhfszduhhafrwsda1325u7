-- 0029_parent_channel_sync.sql
--
-- Three unrelated repairs that share one property: each is a thing the LIVE
-- database already knows and the REPOSITORY does not. A migrations directory
-- that cannot rebuild the database it describes is not a migrations directory,
-- it is a changelog — so the first section here is pure back-fill, and re-running
-- it against production is a no-op by construction.
--
-- ═══ 1. THE THREE HOT FIXES THAT ONLY EVER EXISTED IN PRODUCTION ══════════════
--
-- Three migrations were applied by hand through the Supabase SQL editor and never
-- written down here:
--
--   restore_baseline_public_schema_grants  (2026-07-20)
--   reward_and_counter_sync_search_path    (2026-08-01)
--   lock_down_bump_progress_counters       (2026-08-10)
--
-- The first is the serious one. Supabase's standard baseline privileges on the
-- `public` schema had gone missing, which produced "permission denied for table
-- X" for EVERY role on EVERY table — including service_role, which is the only
-- role this application uses. Anyone rebuilding this database from
-- supabase/migrations/ — a staging environment, a disaster recovery, a new
-- developer running the stack locally — would get a schema that is structurally
-- perfect and answers every single query with a permission error, with nothing
-- in the repository to explain why.
--
-- RLS stays on with no policies (see the AUTH MODEL note in 0000_base_schema.sql):
-- these grants restore the baseline Supabase ships with, and row-level access for
-- anon/authenticated is still gated by RLS having no policy at all. service_role
-- bypasses RLS as intended and remains the only key the API holds.
--
-- Each role is granted individually and only if it exists. The production copy
-- of this fix named all four in one statement, which is correct against Supabase
-- and fails outright against the bare PostgreSQL instance
-- scripts/verifyMigrations.mjs builds — where `anon`, `authenticated` and
-- `service_role` are Supabase's roles and simply are not there. A migration that
-- cannot run on the machine that checks migrations is a migration nothing checks.
do $$
declare
  role_name text;
begin
  foreach role_name in array array['postgres', 'anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = role_name) then continue; end if;
    execute format('grant usage on schema public to %I', role_name);
    execute format('grant all on all tables in schema public to %I', role_name);
    execute format('grant all on all sequences in schema public to %I', role_name);
    execute format('grant all on all routines in schema public to %I', role_name);
    execute format('alter default privileges in schema public grant all on tables to %I', role_name);
    execute format('alter default privileges in schema public grant all on sequences to %I', role_name);
    execute format('alter default privileges in schema public grant all on routines to %I', role_name);
  end loop;
end $$;

-- The other two are search_path hardening on the two functions that predate the
-- convention 0008/0016/0024 established. Guarded on existence because
-- bump_progress_counters is superseded by merge_progress_snapshot (0024) and may
-- legitimately be absent from a database built after it, and because `anon` and
-- `authenticated` are Supabase roles that do not exist in the bare PostgreSQL
-- instance scripts/verifyMigrations.mjs builds.
do $$
declare
  role_name text;
begin
  if to_regprocedure('public.bump_progress_counters(uuid,jsonb,jsonb)') is not null then
    alter function public.bump_progress_counters(uuid, jsonb, jsonb) set search_path = public, pg_temp;
    revoke all on function public.bump_progress_counters(uuid, jsonb, jsonb) from public;
    foreach role_name in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = role_name) then
        execute format('revoke all on function public.bump_progress_counters(uuid, jsonb, jsonb) from %I', role_name);
      end if;
    end loop;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      grant execute on function public.bump_progress_counters(uuid, jsonb, jsonb) to service_role;
    end if;
  end if;

  if to_regprocedure('public.claim_reward(uuid,text,text,int)') is not null then
    -- pg_temp added to match the convention every other function in this schema
    -- follows; the production copy only had `public`.
    alter function public.claim_reward(uuid, text, text, int) set search_path = public, pg_temp;
  end if;
end $$;

-- ═══ 2. THE PARENT → STUDENT CHANNEL HAD NO LIVE-SYNC SIGNAL ══════════════════
--
-- 0027 attaches its version-bump trigger by DISCOVERING tables that carry a
-- `user_id` column, specifically so a table added later cannot be silently
-- missed. It has been silently missing three tables since the day it shipped,
-- because the discovery predicate is the bug: `parent_links`, `parent_messages`
-- and `student_quests` name their student column `student_user_id`, not
-- `user_id`, so the loop skipped all three without a word.
--
-- The consequence is the exact failure 0027 was written to prevent, on the one
-- channel where it matters most — the one where another PERSON is waiting:
--
--   * A parent assigns a quest. The student's open tab never learns. App.jsx
--     loads quests once, keyed on [dbReady, user.id], so the assignment appears
--     only after a reload — which for a student who leaves the tab open all
--     evening means "tomorrow".
--   * A parent sends a message. Same: FamilyThread fetches when it mounts and
--     has nothing to tell it the thread moved.
--   * A parent's access is revoked or accepted. The student's Family screen
--     keeps showing the old state.
--
-- Fixed in two places, because either alone is useless: the function has to be
-- able to find a student id under both names, and the trigger has to be attached
-- to the three tables. The client half — refetching when the signal arrives —
-- is in src/App.jsx.
--
-- Only the STUDENT's version is bumped, never the parent's, and that asymmetry
-- is deliberate rather than an oversight: /api/sync-state is a student-only
-- endpoint (requireStudent), so a parent's counter is a number nothing reads.
-- The parent application refetches on its own navigation.
create or replace function public.bump_user_data_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec jsonb;
  uid uuid;
begin
  rec := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;

  -- `user_id` on the student's own tables; `student_user_id` on the three shared
  -- parent/student tables. coalesce rather than a branch so a table carrying both
  -- (none today) would still resolve, and so a table with neither yields null and
  -- is skipped exactly as before.
  uid := coalesce((rec ->> 'user_id')::uuid, (rec ->> 'student_user_id')::uuid);

  if uid is not null then
    insert into public.user_data_version as v (user_id, version, updated_at)
    values (uid, 1, now())
    on conflict (user_id) do update
      set version = v.version + 1,
          updated_at = now();
  end if;

  return null;  -- AFTER trigger; the return value is discarded
end;
$$;

revoke all on function public.bump_user_data_version() from public;
do $$
declare
  role_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on function public.bump_user_data_version() from %I', role_name);
    end if;
  end loop;
end $$;

-- Re-run 0027's attachment loop with the predicate widened to either column
-- name. Idempotent (drop-then-create per table), and re-attaching a trigger that
-- is already correct costs nothing, so this is also the block to re-run whenever
-- a new per-user table is added.
--
-- The exclusion list is 0027's, unchanged and for its stated reasons:
--   progress_sync        already carries `rev`, and is written on every debounced
--                        push — bumping from it would make every device refetch
--                        its whole Portfolio every few seconds.
--   sessions, otp_codes, login_attempts, email_verifications
--                        sign-in bookkeeping, not student data.
--   safety_events        nothing client-facing reads it (0023).
--   parent_link_events   an append-only audit trail of changes to parent_links,
--                        which is itself now covered — bumping from both would
--                        double every notification for one event.
do $$
declare
  t record;
begin
  for t in
    select distinct c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
                       and a.attname in ('user_id', 'student_user_id')
                       and a.attnum > 0 and not a.attisdropped
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname not in (
        'user_data_version', 'progress_sync', 'sessions', 'otp_codes',
        'login_attempts', 'email_verifications', 'safety_events', 'parent_link_events'
      )
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      't_bump_data_version_' || t.relname, t.relname
    );
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.bump_user_data_version()',
      't_bump_data_version_' || t.relname, t.relname
    );
  end loop;
end $$;

-- ═══ 3. THE ONE MISSING FOREIGN-KEY INDEX ═════════════════════════════════════
--
-- safety_events.reviewed_by references app_users with no covering index, which
-- makes deleting an account scan the whole table. The table is empty today and
-- an account deletion is rare, so this is housekeeping rather than a fix — but
-- account deletion is a COPPA path (see src/lib/ageGate.js), and a slow one is
-- a path that times out on the day it is finally used.
create index if not exists safety_events_reviewed_by_idx
  on safety_events (reviewed_by)
  where reviewed_by is not null;
