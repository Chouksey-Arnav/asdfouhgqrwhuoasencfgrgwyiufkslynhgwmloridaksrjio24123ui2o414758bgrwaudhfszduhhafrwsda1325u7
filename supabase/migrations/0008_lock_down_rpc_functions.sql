-- 0008_lock_down_rpc_functions.sql
--
-- Closes two defects in the functions this schema exposes as RPCs — accept_parent_link,
-- save_master_plan and bump_progress_counters. Both were surfaced by Supabase's own database
-- linter after 0006 went in, and one of them is serious.
--
-- ── The serious one: anon could call accept_parent_link ────────────────────
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and Supabase exposes every
-- public-schema function as an RPC endpoint at /rest/v1/rpc/<name>. Between those two facts,
-- accept_parent_link was callable by the `anon` role — and the anon key ships inside the browser
-- bundle of every deployment of this app.
--
-- That matters more here than it would for most functions, because accept_parent_link TRUSTS ITS
-- ARGUMENTS. It takes p_user_id and p_email and does not verify that the caller is that user: it
-- cannot, because it is called from api/parent/accept.js, which has already authenticated the
-- session and is the only thing that knows who the caller is. Under the default grant, anyone
-- holding an invite token — which is emailed, and therefore lands in an inbox, a mail client's
-- cache, and any forwarding chain — could redeem it against an arbitrary user id and email, and
-- link an account they do not control to a student they have never met.
--
-- The fix is to make "only the service role calls this" true in the database rather than true by
-- convention. Nothing in the app changes: /api/* uses the service role key, which is the one role
-- that keeps EXECUTE.
--
-- save_master_plan and bump_progress_counters have the identical exposure, and both take the user
-- id they operate on as an argument. save_master_plan is the milder of the two: the worst an
-- attacker does is overwrite a stranger's study plan. bump_progress_counters is not mild at all —
-- it upserts the entire progress_sync snapshot for whichever user id it is handed, so an anon
-- caller could erase any account's XP, streak, quiz history and flashcard scheduling in one
-- request. Neither is in this feature's blast radius; both are the same defect with the same fix,
-- found while checking the two that are, and leaving them would mean this migration deliberately
-- locked one door in a corridor of three.
--
-- ── The second one: mutable search_path ────────────────────────────────────
-- A SECURITY DEFINER function runs as its owner (here, a superuser). If its search_path is not
-- pinned, the CALLER chooses which schema the unqualified names inside it resolve to — so a caller
-- who can create a schema can shadow `parent_links` or `app_users` with their own table and have
-- the function operate on that instead, as the owner. This project has already been bitten by this
-- once; migration 0004 has a follow-up whose entire purpose was fixing exactly this on
-- bump_progress_counters, and 0006 reintroduced it on two new functions because the pattern was
-- not carried forward. Pinning it here, on all four, is what stops there being a fourth incident.
--
-- pg_temp is last deliberately: leaving it out entirely is also safe, but naming it explicitly at
-- the END means a temp-table name can never take precedence over a real one, which is the specific
-- trick the unqualified-name attack relies on.

-- ── search_path ────────────────────────────────────────────────────────────
-- ALTER FUNCTION rather than a rewrite: the bodies are correct and re-stating them here would mean
-- two copies of each function in the migration history, silently diverging the moment someone
-- edits one. `if exists` on each, so this chain still applies to a database where an earlier
-- migration has not created every function yet.
do $$
begin
  if to_regprocedure('public.accept_parent_link(text,uuid,text)') is not null then
    alter function public.accept_parent_link(text, uuid, text) set search_path = public, pg_temp;
  end if;

  if to_regprocedure('public.save_master_plan(uuid,jsonb,bigint,text,boolean)') is not null then
    alter function public.save_master_plan(uuid, jsonb, bigint, text, boolean) set search_path = public, pg_temp;
  end if;

  -- Already pinned by 0004's follow-up, but to `public` alone. Restated with pg_temp last so all
  -- four functions carry the same setting rather than three-and-a-near-miss.
  if to_regprocedure('public.bump_progress_counters(uuid,jsonb,jsonb)') is not null then
    alter function public.bump_progress_counters(uuid, jsonb, jsonb) set search_path = public, pg_temp;
  end if;

  -- Not SECURITY DEFINER, but it runs as part of a DELETE on app_users and touches the consent
  -- record. Same reasoning, no reason to leave the one out.
  if to_regprocedure('public.revoke_links_on_user_delete()') is not null then
    alter function public.revoke_links_on_user_delete() set search_path = public, pg_temp;
  end if;
end $$;

-- ── EXECUTE grants ─────────────────────────────────────────────────────────
-- Written as a loop over roles that actually exist, because this same chain is applied to a bare
-- PostgreSQL by scripts/verifyMigrations.mjs, where `anon`, `authenticated` and `service_role` are
-- Supabase inventions that do not exist. A migration that only works against Supabase is exactly
-- what that harness was built to catch.
--
-- REVOKE FROM PUBLIC is the load-bearing line: revoking from anon and authenticated individually
-- would leave the default PUBLIC grant behind them, and they would still be able to execute.
do $$
declare
  fn   text;
  role text;
begin
  foreach fn in array array[
    'public.accept_parent_link(text,uuid,text)',
    'public.save_master_plan(uuid,jsonb,bigint,text,boolean)',
    'public.bump_progress_counters(uuid,jsonb,jsonb)'
  ] loop
    continue when to_regprocedure(fn) is null;

    execute format('revoke all on function %s from public', fn);

    foreach role in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = role) then
        execute format('revoke all on function %s from %I', fn, role);
      end if;
    end loop;

    -- The one role that must keep it: every /api/* handler runs as service_role (see
    -- api/_lib/supabaseAdmin.js). Without this the revoke above would take the app down with it.
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end $$;
