-- 0009_parent_profiles.sql
--
-- Makes a parent account something a person has to *build* before it can ask for anything.
--
-- ── The problem this closes ────────────────────────────────────────────────
-- Migration 0006 made the consent model correct: nothing about a student reaches a parent until
-- that student clicks a link sent to their own mailbox, and either side can end it in one tap.
-- That is, and remains, the actual authorization boundary — knowing a student's name has never
-- been enough to see their progress, and this migration does not change that.
--
-- What it changes is what a parent account IS before that point. Until now it was an email
-- address and a password: anyone could create one in ninety seconds, and the invitation it sent
-- arrived at a student's inbox saying "a parent would like to follow your progress" with no
-- statement of who that person claimed to be. The student was asked to make a consent decision
-- with nothing to base it on except an email address, which is the one thing an impersonator can
-- choose freely.
--
-- So a parent account now carries a declaration: who you are, your relationship to the student,
-- a contact number, and — signed under an explicit attestation — the name of the student you are
-- asking about. None of that is verified against a government record, and this file does not
-- pretend otherwise. What it does is:
--
--   1. Put a claim on the record. The invitation email and the acceptance screen now say "Priya
--      Shah, who says she is your mother, is asking to follow your progress" — so a student who
--      does not know that person recognises it immediately, which is a check no amount of
--      server-side validation can perform.
--   2. Cost something. An attestation with a name, a relationship and a phone number attached is
--      a materially different act from clicking Sign Up, both practically and legally.
--   3. Be auditable. parent_profiles rows are timestamped and never deleted independently of the
--      account, so "who claimed what, and when" survives the relationship ending.
--
-- ── Why a separate table rather than columns on app_users ──────────────────
-- Every column here is meaningless for the 99% of app_users rows that are students, and a NULL
-- that means "not applicable" sitting next to a NULL that means "not filled in yet" is how a
-- completeness check ends up wrong. A row that exists with completed_at set IS the completeness
-- check, which is the whole reason /api/parent/summary can gate on one cheap lookup.
create table if not exists parent_profiles (
  user_id            uuid primary key references app_users(id) on delete cascade,

  -- The parent's own details. full_name is separate from app_users.name deliberately: the account
  -- name is a display handle the user can change at will, and this is the name they attested to.
  full_name          text not null,
  relationship       text not null,
  phone              text,
  -- Free text, not a fixed list: households do not agree on what a guardian is called, and a
  -- dropdown that omits someone's actual relationship teaches them to pick the nearest lie.
  postal_code        text,

  -- What they claim about the student they are here for. Checked by no server — checked by the
  -- student, on the acceptance screen, which is the only party who can actually check it.
  student_full_name  text not null,
  student_grade      text,

  -- The attestation itself. Recorded as a value and a time rather than inferred from the row's
  -- existence, so that changing the wording later leaves the old agreements distinguishable.
  attested           boolean not null default false,
  attested_at        timestamptz,
  attestation_text   text,

  -- Set when every required field is present AND the attestation was given. The API reads this
  -- one column; nothing else re-derives the rule.
  completed_at       timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint parent_profiles_full_name_len     check (char_length(full_name) between 2 and 120),
  constraint parent_profiles_relationship_len  check (char_length(relationship) between 2 and 40),
  constraint parent_profiles_student_name_len  check (char_length(student_full_name) between 2 and 120),
  -- An account cannot be "complete" without having attested. Stated in the schema because the
  -- completeness column is the thing every authorization check reads, and a bug that sets it
  -- without the attestation would be invisible at every layer above this one.
  constraint parent_profiles_complete_needs_attestation check (completed_at is null or attested)
);

create index if not exists parent_profiles_complete_idx on parent_profiles (user_id) where completed_at is not null;

-- ── The claim travels with the invitation ──────────────────────────────────
-- Copied onto the link row rather than joined from the profile at read time, on purpose: the
-- student is consenting to what the invitation SAID, and a parent who later edits their profile
-- must not retroactively change what was agreed to. This column is the record of the claim as
-- made.
alter table parent_links add column if not exists claimed_student_name text;
alter table parent_links add column if not exists claimed_by_name      text;
alter table parent_links add column if not exists claimed_relationship text;

alter table parent_profiles enable row level security;

-- Deny-all, exactly as in 0006: /api/* holds the service role (BYPASSRLS) and nothing else may
-- read this table. The explicit policy states that as a decision rather than an omission.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'parent_profiles' and policyname = 'parent_profiles_deny_all') then
    create policy parent_profiles_deny_all on parent_profiles for all using (false) with check (false);
  end if;
end $$;

-- updated_at maintained in the database rather than by the handler: there is exactly one writer
-- today, and the value is worthless the first time there are two and one of them forgets.
-- search_path pinned for the same reason every other function in this schema pins it (see the
-- header of 0008): an unqualified name inside a function body resolves through the CALLER's
-- search_path unless the function says otherwise, and pg_temp last means a temp table can never
-- shadow a real one.
create or replace function touch_parent_profile_updated_at() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_touch_parent_profile on parent_profiles;
create trigger trg_touch_parent_profile
  before update on parent_profiles
  for each row execute function touch_parent_profile_updated_at();
