-- 0018_credential_catalog.sql
--
-- Backs the rebuilt credential database (src/data/credentials/) with the three things a free-text
-- name column cannot hold.
--
-- ── 1. Which credential this actually is ────────────────────────────────────────────────────────
-- `name` stays exactly as it was and stays authoritative for display, because it holds what the
-- student's own certificate says — an Ohio student's row says "State Tested Nursing Assistant
-- (STNA)" and it should keep saying that. What was missing is the link back to the catalog:
-- `credential_id` is the stable key from src/data/credentials/index.js, and it is what lets us
-- know that the Ohio STNA and the New Hampshire LNA are the same underlying credential without
-- rewriting either student's row.
--
-- ── 2. Which of the three legally distinct things it is ─────────────────────────────────────────
-- `credential_type` is the whole point of the rebuild. A CNA (state occupational credential), a
-- CCMA (private national certification) and an AHA BLS card (course completion card, and the AHA
-- says explicitly that it does not certify individuals) are three different kinds of object, and
-- the résumé export has to file them under different headings. Storing the type on the row rather
-- than looking it up at render time means a student's own freeform entry can carry a type too,
-- and means a later correction to the catalog never silently re-files a record they already have.
--
-- It is nullable on purpose. Every row that existed before this migration has a null type, which
-- reads as "unclassified" in the UI rather than as a wrong guess. The app offers to classify them;
-- it does not do it behind the student's back.
--
-- ── 3. Where they earned it ─────────────────────────────────────────────────────────────────────
-- `state_code` is set only for state-issued credentials, and only to record which state's version
-- the student holds. It is not a residency field and nothing else reads it.
--
-- ── The suggestions table ───────────────────────────────────────────────────────────────────────
-- Students are never blocked from typing something that is not in the catalog — that would be a
-- worse product than a slightly incomplete list. But a freeform entry that goes nowhere means the
-- catalog never improves and slowly fills with typos of things it already contains. So a freeform
-- entry can be submitted for review, and lands here. One row per suggestion, reviewed by us, and
-- the student's own record is unaffected either way.

alter table skills_certifications
  add column if not exists credential_id text,
  add column if not exists credential_type text
    check (credential_type is null or credential_type in
      ('state-occupational', 'national-certification', 'course-completion', 'skill')),
  add column if not exists state_code text check (state_code is null or char_length(state_code) = 2);

create index if not exists skills_certifications_credential_id_idx
  on skills_certifications(credential_id);

create table if not exists credential_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  -- What they typed, verbatim. Not normalised — the exact string is the useful signal, because a
  -- suggestion that turns out to be a misspelling of something we already have is telling us our
  -- alias list is short, and normalising it away destroys that.
  name text not null,
  issuing_body text,
  -- The student's own answer to "which of these is it?", which is frequently right and is always
  -- more informative than our guess from the string alone.
  credential_type text
    check (credential_type is null or credential_type in
      ('state-occupational', 'national-certification', 'course-completion', 'skill')),
  state_code text check (state_code is null or char_length(state_code) = 2),
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'duplicate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists credential_suggestions_user_id_idx on credential_suggestions(user_id);
create index if not exists credential_suggestions_status_idx on credential_suggestions(status);

-- Same posture as every other per-user table: RLS on, and the anon/authenticated roles get
-- nothing. The client never talks to Supabase directly; api/data/[resource].js holds the service
-- key and scopes every query to the signed-in user.
alter table credential_suggestions enable row level security;
