-- 0022 — Repair three write paths that were failing silently in production.
--
-- Found by auditing pg_stat_user_tables against the code: several tables had a complete,
-- correct-looking write path in the app and n_tup_ins = 0 since launch. Two of the three
-- problems below are why. (The third is a security hole found in the same pass.)
--
-- The medex_scores half of this repair is application-side — the table was fine, the endpoint
-- never had a WRITABLE column list for it — and lives in api/data/[resource].js.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. lesson_feedback: every POST has been failing with 42P10 since 0012.
--
-- 0012 created the dedupe index as a PARTIAL unique index:
--
--     CREATE UNIQUE INDEX lesson_feedback_dedupe_idx
--       ON lesson_feedback (user_id, lesson_id, client_ts) WHERE client_ts IS NOT NULL;
--
-- api/lesson-feedback.js upserts with onConflict 'user_id,lesson_id,client_ts'. Postgres will
-- only infer a partial index for ON CONFLICT when the statement repeats the index predicate,
-- and PostgREST does not emit one — so the insert raised
--
--     42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
--
-- on every call. The endpoint turned that into a 500, and the client fires and forgets by
-- design, so nothing surfaced. The table has never held a row.
--
-- The WHERE clause was never doing any work: client_ts is nullable and NULLs are distinct in a
-- unique index, so rows with a NULL client_ts are unconstrained either way. Dropping the
-- predicate makes the index inferrable and changes nothing else about what it permits.
drop index if exists lesson_feedback_dedupe_idx;
create unique index if not exists lesson_feedback_dedupe_idx
  on public.lesson_feedback (user_id, lesson_id, client_ts);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. rls_auto_enable() is callable by anon over the public REST API.
--
-- It is an event-trigger function: it takes no arguments, runs SECURITY DEFINER as its owner,
-- and is meaningless outside DDL. But because it lives in the `public` schema it is exposed at
-- /rest/v1/rpc/rls_auto_enable and PUBLIC holds EXECUTE by default, so any unauthenticated
-- caller could invoke an owner-privileged function. It errors out harmlessly when called
-- outside an event trigger, which makes this low-severity — but a definer-rights function
-- reachable by anon is not something to leave standing on the argument that today's body
-- happens to be safe.
-- Guarded, because rls_auto_enable() is created by the Supabase platform on hosted projects and
-- does not exist on a bare local Postgres. An unconditional REVOKE aborts the whole migration
-- there, which would make `verify:migrations` (and any fresh local bring-up) fail on a statement
-- that is a no-op for that environment by definition.
do $$
begin
  if exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. student_quests.link_id has no covering index.
--
-- Every other foreign key on the table is indexed; this one was missed in 0014. It matters for
-- deletes on parent_links, which must scan student_quests to enforce the constraint.
create index if not exists student_quests_link_idx
  on public.student_quests (link_id) where link_id is not null;
