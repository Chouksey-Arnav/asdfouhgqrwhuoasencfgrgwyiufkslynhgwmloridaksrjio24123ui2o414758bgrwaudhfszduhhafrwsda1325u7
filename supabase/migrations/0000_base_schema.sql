-- 0000_base_schema.sql
--
-- Foundational schema for MedSchoolPrep's account system and Portfolio data model. This was
-- never actually created in the linked Supabase project even though api/auth/* and
-- api/data/[resource].js were already written against it, and 0001_portfolio_credibility_expansion.sql
-- already assumes app_users/activities/awards exist. This file creates everything those two
-- rely on, in dependency order, so 0001 can be applied on top of it.
--
-- AUTH MODEL: custom email-OTP auth (api/auth/*), not Supabase Auth — there is no auth.uid(),
-- so RLS is enabled with no policies as defense-in-depth only. All real per-user authorization
-- happens in application code (api/data/[resource].js: every query is scoped with
-- .eq('user_id', ...)) using the service-role key, which bypasses RLS entirely. The service-role
-- key is never exposed to the browser — only server-side serverless functions use it.

-- ── Accounts / auth ──────────────────────────────────────────────────────────────────────────

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  grade_level text,
  test_track text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip text,
  code_hash text not null,
  attempts integer not null default 0,
  consumed boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
-- send-otp.js rate-limits by (email, created_at) and (ip, created_at); verify-otp.js looks up
-- the latest non-consumed row per email.
create index if not exists otp_codes_email_created_idx on otp_codes(email, created_at);
create index if not exists otp_codes_ip_created_idx on otp_codes(ip, created_at);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_id_idx on sessions(user_id);

-- ── Portfolio / application data (api/data/[resource].js) ──────────────────────────────────────

create table if not exists colleges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  category text,
  status text not null default 'considering',
  ea_ed_deadline date,
  rd_deadline date,
  notes text,
  css_profile_required boolean not null default false,
  financial_aid_deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists colleges_user_id_idx on colleges(user_id);

create table if not exists college_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  college_id uuid references colleges(id) on delete cascade,
  label text not null,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists college_checklist_items_user_id_idx on college_checklist_items(user_id);
create index if not exists college_checklist_items_college_id_idx on college_checklist_items(college_id);

create table if not exists deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  college_id uuid references colleges(id) on delete cascade,
  title text not null,
  due_date date not null,
  kind text,
  created_at timestamptz not null default now()
);
create index if not exists deadlines_user_id_idx on deadlines(user_id);
create index if not exists deadlines_college_id_idx on deadlines(college_id);

create table if not exists essays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  college_id uuid references colleges(id) on delete cascade,
  title text not null,
  prompt text,
  word_limit integer,
  status text not null default 'drafting',
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists essays_user_id_idx on essays(user_id);
create index if not exists essays_college_id_idx on essays(college_id);

create table if not exists essay_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  essay_id uuid not null references essays(id) on delete cascade,
  content text,
  word_count integer,
  created_at timestamptz not null default now()
);
create index if not exists essay_versions_user_id_idx on essay_versions(user_id);
create index if not exists essay_versions_essay_id_idx on essay_versions(essay_id);

create table if not exists test_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  test_type text not null,
  test_date date,
  composite numeric,
  section_scores jsonb,
  is_target boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists test_scores_user_id_idx on test_scores(user_id);

create table if not exists scholarships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  amount numeric,
  deadline date,
  status text not null default 'researching',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists scholarships_user_id_idx on scholarships(user_id);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  activity_type text,
  position text,
  organization text,
  description text,
  impact text,
  status text not null default 'ongoing',
  hours_per_week numeric,
  weeks_per_year numeric,
  grade_levels text[] default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists activities_user_id_idx on activities(user_id);

create table if not exists awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  title text not null,
  grade_level text,
  level text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists awards_user_id_idx on awards(user_id);

create table if not exists gpa_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  term text not null,
  gpa numeric not null,
  weighted boolean not null default false,
  course_rigor text,
  created_at timestamptz not null default now()
);
create index if not exists gpa_entries_user_id_idx on gpa_entries(user_id);

-- ── Row-level security (defense-in-depth; no policies added — see AUTH MODEL note above) ───────

alter table app_users enable row level security;
alter table otp_codes enable row level security;
alter table sessions enable row level security;
alter table colleges enable row level security;
alter table college_checklist_items enable row level security;
alter table deadlines enable row level security;
alter table essays enable row level security;
alter table essay_versions enable row level security;
alter table test_scores enable row level security;
alter table scholarships enable row level security;
alter table activities enable row level security;
alter table awards enable row level security;
alter table gpa_entries enable row level security;
