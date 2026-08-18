-- 0016_roadmap_function_hardening.sql
--
-- Three things 0015_roadmaps.sql should have done to save_roadmap and did not. None of them are
-- new ideas: each is a fix this schema already made once, for the same reason, in a migration
-- 0015's own header says it was copying.
--
--   1. Serialize concurrent saves with an advisory lock  (what 0013 did to save_master_plan)
--   2. Pin the SECURITY DEFINER search_path              (what 0008 did to all four RPCs)
--   3. Grant EXECUTE back to service_role after the revoke from PUBLIC  (0008, 0010 and 0013)
--
-- That all three went missing at once is the story, and it is a process story rather than three
-- separate oversights: every one of these protections lives in a migration, and a migration only
-- protects the functions that existed when it was written. scripts/verifyMigrations.mjs now derives
-- the set of SECURITY DEFINER functions from pg_proc instead of from a hardcoded list, so 2 and 3
-- cannot go missing again without failing the build.
--
-- ── Why this is a NEW file rather than an edit to 0015 ──────────────────────
-- Migrations here are applied BY HAND to one live Supabase project, so a fix that only exists as
-- an edit to an already-applied file never runs anywhere. 0015 was corrected in place ONLY for its
-- unguarded `revoke ... from anon`, which is behaviour-identical on Supabase (the role exists
-- there, so guarded and unguarded do the same thing) and merely stops the file aborting on a stock
-- PostgreSQL. Everything that changes what the database ends up looking like is here instead.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 + 2. The function, with the lock it should have had and the search_path pin.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ── The lost update ────────────────────────────────────────────────────────
-- 0015's header says its concurrency design is "deliberately identical to 0005_master_plans.sql …
-- because that design was arrived at the hard way and this artifact has exactly the same
-- concurrency problem". It copied 0005 faithfully — including the defect 0013 was written to fix,
-- three migrations earlier, and did not copy the fix.
--
-- The defect, restated from 0013: `select ... for update` locks the rows a query RETURNS. On a
-- user with no roadmap row yet it returns none, so it locks nothing. Two devices saving at the
-- same moment therefore both take the not-found path, both compute revision 1, both fall through
-- to the INSERT, and the second resolves its primary-key conflict through ON CONFLICT DO UPDATE —
-- overwriting the first roadmap without ever running the archive branch.
--
-- The result is the failure 0015's own header calls out as the reason this table exists at all:
-- "Losing their roadmap costs them the twelve-question intake, four Oracle generations, and the
-- only record of which deadlines they had already decided to skip." That is precisely what a lost
-- update here destroys, and it destroys it silently — the student sees a roadmap, just not theirs.
--
-- pg_advisory_xact_lock serializes callers for one user BEFORE anything is read, including the
-- case where there is nothing to read. Released automatically at end of transaction. The FOR
-- UPDATE below is kept for the same reason 0013 kept it: it is redundant while every writer goes
-- through this function, and it stays correct if one ever does not.
--
-- The key is built from two hashes — a constant naming this lock, and the user id — because
-- advisory locks share one cluster-wide namespace. `save_master_plan` and `save_roadmap` hash to
-- different constants, so a student's plan save and roadmap save do not block each other.
--
-- Everything else in this body is byte-for-byte 0015's. Only the lock line is new.
create or replace function save_roadmap(
  p_user_id uuid,
  p_roadmap jsonb,
  p_client_updated_at bigint,
  p_reason text default null,
  p_force boolean default false
) returns jsonb
language plpgsql
security definer
-- ── The pin (2) ────────────────────────────────────────────────────────────
-- save_roadmap runs with its owner's privileges and refers to `roadmaps` and `roadmap_revisions`
-- by bare, unqualified name. Which tables those names resolve to is decided by the CALLER's
-- search_path — so a caller who can create a schema and put it first chooses the tables a
-- privileged function reads and writes. That is the textbook SECURITY DEFINER escalation, it is
-- why 0008 pinned all four functions that existed then, and until this migration save_roadmap was
-- the only definer function in the schema without it.
--
-- pg_temp is named explicitly, and last, for the reason 0008 gives: a caller can always create
-- objects in their own temp schema, and leaving it implicit means it is searched EARLY. Naming it
-- at the end puts it after public, where it can no longer shadow a real table.
--
-- Stated in the definition rather than applied with ALTER FUNCTION afterwards because CREATE OR
-- REPLACE replaces a function's configuration parameters along with its body — the same trap 0013
-- documents. Anything not restated here is silently dropped.
set search_path = public, pg_temp
as $$
declare
  MAX_REVISIONS constant int := 10;
  existing      roadmaps%rowtype;
  next_revision int := 1;
begin
  -- ── The line 0015 was missing ────────────────────────────────────────────
  perform pg_advisory_xact_lock(hashtext('save_roadmap'), hashtext(p_user_id::text));

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. The grants.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- CREATE OR REPLACE preserves an existing function's privileges, so 0015's revoke survives the
-- replacement above. These are restated anyway, for two reasons: this file has to leave the
-- function in the right state on a database where 0015's chain aborted before reaching its revoke
-- (which is every stock PostgreSQL, until the guard added to 0015 in this same change), and a
-- privilege that is only correct because of a file three migrations back is a privilege nobody can
-- audit by reading the current one.
--
-- The missing half is the grant. 0015 revokes EXECUTE from PUBLIC — correctly, since PUBLIC is how
-- anon would otherwise reach a SECURITY DEFINER function that trusts its user-id argument. But
-- PUBLIC is also how any role with no explicit grant of its own reaches a function, and 0015 never
-- granted it back to anybody. Every comparable migration here (0008, 0010, 0013) pairs its revoke
-- with this grant and says, in as many words, that without it the revoke would take the feature
-- down with it.
--
-- Whether that has already broken roadmap saving on the live project depends on something this
-- schema should not be depending on: whether Supabase's ALTER DEFAULT PRIVILEGES happened to give
-- service_role an explicit grant when the function was created, which would survive a revoke aimed
-- at PUBLIC. The other three migrations deliberately do not rely on that. Neither does this.
do $$
declare role_name text;
begin
  revoke all on function public.save_roadmap(uuid, jsonb, bigint, text, boolean) from public;

  foreach role_name in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format(
        'revoke all on function public.save_roadmap(uuid, jsonb, bigint, text, boolean) from %I',
        role_name
      );
    end if;
  end loop;

  -- The role /api/* actually connects as (see api/_lib/supabaseAdmin.js). Guarded for the same
  -- reason the revokes are: it is Supabase's role, not PostgreSQL's, and this file is applied to a
  -- stock cluster by scripts/verifyMigrations.mjs.
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.save_roadmap(uuid, jsonb, bigint, text, boolean) to service_role;
  end if;
end $$;
