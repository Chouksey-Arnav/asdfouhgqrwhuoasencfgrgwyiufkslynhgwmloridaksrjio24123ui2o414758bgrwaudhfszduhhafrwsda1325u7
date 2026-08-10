-- 0007_backfill_activities_constraint.sql
--
-- Guarantees that activities_verification_status_check exists, in every environment, without
-- editing the migration that originally added it.
--
-- ── The problem ────────────────────────────────────────────────────────────
-- 0001_portfolio_credibility_expansion.sql adds that constraint with a bare
--
--     alter table activities add constraint activities_verification_status_check check (...)
--
-- which throws `constraint ... already exists` if it runs a second time. Every other statement in
-- that file is guarded with `if not exists`; this one was missed. Migrations here are applied by
-- hand against a single live project, so a retry — a dropped connection, an ambiguous error, two
-- people deploying at once — is an ordinary event rather than a hypothetical, and the whole file
-- fails partway through when it happens.
--
-- ── Why this is a new file rather than a fix to 0001 ───────────────────────
-- 0001 is already applied to production. Rewriting an applied migration in place makes the
-- repository disagree with what actually ran, and the disagreement is invisible: nothing replays
-- old migrations, so the edit changes no database anywhere while quietly making the file a
-- fiction. Anyone reconstructing an environment from the repo would then get a different result
-- from anyone who applied them as they were written.
--
-- So 0001 keeps its history and stays on the documented allowlist in
-- scripts/verifyMigrations.mjs (LEGACY_NON_IDEMPOTENT), and this file carries the convergence
-- guarantee instead. The two goals are genuinely separate:
--
--   * "every environment HAS the constraint"        → this migration, idempotently
--   * "re-running 0001 is safe"                     → not fixable without editing 0001, so it is
--                                                     recorded as a known exception instead of
--                                                     pretended away
--
-- The allowlist admits exactly this one file. Anything new that fails the idempotency gate fails
-- the build, which is what stops this defect from spreading to migration 0008.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activities_verification_status_check'
  ) then
    alter table activities
      add constraint activities_verification_status_check
      check (verification_status in ('self_reported', 'pending', 'verified'));
  end if;
end $$;
