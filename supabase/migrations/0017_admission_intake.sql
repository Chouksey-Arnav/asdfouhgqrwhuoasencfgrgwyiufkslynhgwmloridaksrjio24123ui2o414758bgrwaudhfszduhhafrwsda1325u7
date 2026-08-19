-- 0017_admission_intake.sql
--
-- Storage for the rebuilt Admissions Calculator's intake, plus the one column the Portfolio was
-- missing to answer a question the calculator has to ask.
--
-- ── Why the intake needs a table at all ─────────────────────────────────────────────────────────
-- The old calculator kept its seven inputs in React state. They lived until the tab was closed,
-- which meant a student re-typed their GPA, their score and their hours every single visit, and
-- meant nothing else in the app could ever read what they had said. The rebuilt calculator asks
-- for fifteen things — citizenship, state of residence, weighted AND unweighted GPA, class rank
-- and whether the school ranks at all, course rigor against what the school offers, section
-- scores, superscore policy, required-course grades, documented service hours, hooks, and the
-- round intended per programme — and asking a student for fifteen things they will lose on
-- refresh is not a product, it is an insult.
--
-- One row per user, jsonb payload. The shape is deliberately schemaless: the field set is owned by
-- src/lib/admissions/intake.js (INTAKE_FIELDS) and will change as more programmes are added to the
-- catalog, and a migration per new question would guarantee the questions stop being added. The
-- three columns that are NOT in the blob (citizenship, state, grade) are the ones other features
-- will want to read without parsing the payload.
--
-- ── PRIVACY: why citizenship is stored at all ───────────────────────────────────────────────────
-- Several combined-degree programmes are categorically closed to international applicants (UMKC,
-- RPI and Drexel all state it in their own admissions copy). A calculator that does not know this
-- about a student cannot avoid showing them a percentage at a programme they cannot attend, which
-- is the single most harmful thing this feature could do. The field is optional at every point in
-- the UI, it has an explicit "prefer not to say" answer, and skipping it widens the model's
-- uncertainty rather than assuming anything. It is included in the user's data export and deleted
-- with their account like every other resource — see api/_lib/resources.js.

-- ── The shadowing/hands-on split ────────────────────────────────────────────────────────────────
-- Programmes weight observation hours and patient-contact hours differently, and heavily so: a
-- physician-scientist track and a six-year clinical programme read the same 200 hours completely
-- differently depending on which they are. The clinical_hours table could not tell them apart, so
-- the calculator had to guess — and a guessed split silently decides part of the answer. Now the
-- student says which it is at the point of logging, where they actually know.
--
-- Existing rows default to 'hands-on' and the derivation in intake.js marks the split `estimated`
-- until at least one row carries an explicit kind, so nothing is retroactively claimed about hours
-- logged before this column existed.
alter table clinical_hours
  add column if not exists experience_kind text not null default 'hands-on';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clinical_hours_experience_kind_check'
  ) then
    alter table clinical_hours
      add constraint clinical_hours_experience_kind_check
      check (experience_kind in ('hands-on', 'shadowing', 'scribing', 'other'));
  end if;
end $$;

-- ── The intake row ──────────────────────────────────────────────────────────────────────────────
create table if not exists admission_intake (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,

  -- Promoted out of the blob because eligibility gates elsewhere in the app will want them.
  citizenship text,
  state_residency text,
  grade_level text,

  -- Everything else: weighted/unweighted GPA, 100-point average, class rank and whether the school
  -- reports it, rigor counts and what the school offers, section scores, superscore policy,
  -- required-course grades, documented service hours, hooks. Shape owned by INTAKE_FIELDS.
  answers jsonb not null default '{}'::jsonb,

  -- Intended application round per programme id, e.g. {"rpi-amc-physician-scientist": "rd"}.
  program_rounds jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One intake per account. The client treats this as a singleton (list → first row, create if
-- none), and without this constraint a double-submit on a slow connection would leave two rows
-- and a calculator that reads a different answer depending on insertion order.
create unique index if not exists admission_intake_user_id_key on admission_intake(user_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admission_intake_citizenship_check') then
    alter table admission_intake
      add constraint admission_intake_citizenship_check
      check (citizenship is null or citizenship in ('us-citizen', 'permanent-resident', 'international', 'prefer-not'));
  end if;
end $$;

-- ── Row-level security ──────────────────────────────────────────────────────────────────────────
-- Enabled with no policies, exactly as every other table in this schema: auth is custom
-- (api/auth/*), there is no auth.uid(), and all per-user scoping happens in application code with
-- the service-role key. See the AUTH MODEL note at the top of 0000_base_schema.sql.
alter table admission_intake enable row level security;
