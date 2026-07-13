-- 0001_portfolio_credibility_expansion.sql
--
-- Expands the Portfolio feature's schema with evidence/verification tracking, three new
-- resource tables (research, skills & certifications, clinical hours), and migrates
-- "recommenders" off local-only device storage into this same Supabase-backed system so every
-- Portfolio panel shares one consistent, cross-device, verifiable data model.
--
-- HOW TO RUN: paste this file into the Supabase project's SQL Editor and run it once. This repo
-- has no migration runner/CLI wired up — there is no existing supabase/ CLI project here, so
-- this is a plain, idempotent-where-possible SQL script, not a tracked migration history.
--
-- AUTH MODEL NOTE: this app uses custom email-OTP auth (api/auth/*), not Supabase Auth, so there
-- is no `auth.uid()` to key row-level-security policies off of. All real per-user authorization
-- is enforced in application code (api/data/[resource].js, via `.eq('user_id', ...)` on every
-- query, using the server's service-role key which bypasses RLS entirely). Enabling RLS below
-- with *no* policies is still meaningful defense-in-depth: it means these tables are completely
-- inaccessible via the public anon/authenticated Supabase keys even if one were ever
-- accidentally exposed client-side — only the service-role key (used solely by api/data/*) can
-- reach them.

-- ── Extend existing tables ────────────────────────────────────────────────────────────────────

alter table activities
  add column if not exists evidence_url text,
  add column if not exists verification_status text not null default 'self_reported',
  add column if not exists verifier_name text,
  add column if not exists verifier_email text,
  add column if not exists verifier_relationship text,
  add column if not exists skills_tags text[] default '{}',
  add column if not exists leadership_role boolean not null default false;

alter table activities
  add constraint activities_verification_status_check
  check (verification_status in ('self_reported', 'pending', 'verified'));

alter table awards
  add column if not exists issuing_organization text,
  add column if not exists category text,
  add column if not exists certificate_url text,
  add column if not exists verification_status text not null default 'self_reported';

alter table awards
  add constraint awards_verification_status_check
  check (verification_status in ('self_reported', 'pending', 'verified'));

-- ── New tables ────────────────────────────────────────────────────────────────────────────────

create table if not exists research_experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  title text not null,
  mentor_name text,
  institution text,
  description text,
  publication_url text,
  hours numeric,
  status text not null default 'ongoing',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists research_experience_user_id_idx on research_experience(user_id);

create table if not exists skills_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  issuing_body text,
  earned_date date,
  expiry_date date,
  certificate_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists skills_certifications_user_id_idx on skills_certifications(user_id);

-- Replaces the local-only (Dexie/IndexedDB) `clinicalHours` table so shadowing/clinical hours
-- sync cross-device and can carry the same verification fields as the rest of Portfolio.
create table if not exists clinical_hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  site_name text not null,
  site_type text,
  supervisor_name text,
  supervisor_email text,
  hours numeric not null default 0,
  entry_date date not null,
  notes text,
  verification_status text not null default 'self_reported'
    check (verification_status in ('self_reported', 'pending', 'verified')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clinical_hours_user_id_idx on clinical_hours(user_id);

-- Replaces the local-only (Dexie/IndexedDB) `recommenders` table.
create table if not exists recommenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  relationship text,
  type text not null default 'individual' check (type in ('individual', 'committee')),
  status text not null default 'planning',
  due_date date,
  notes text,
  verification_status text not null default 'self_reported'
    check (verification_status in ('self_reported', 'pending', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recommenders_user_id_idx on recommenders(user_id);

-- Generic evidence/attachment table reusable across activities, awards, research, and clinical
-- hours — one place to store a "proof" link (certificate scan, letter, article, photo) per item
-- instead of bolting a bespoke evidence column onto every table.
create table if not exists portfolio_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  entity_type text not null
    check (entity_type in ('activities', 'awards', 'research_experience', 'clinical_hours')),
  entity_id uuid not null,
  url text not null,
  label text,
  uploaded_at timestamptz not null default now()
);
create index if not exists portfolio_evidence_user_id_idx on portfolio_evidence(user_id);
create index if not exists portfolio_evidence_entity_idx on portfolio_evidence(entity_type, entity_id);

-- ── Row-level security (defense-in-depth; see note above — no policies added on purpose) ──────

alter table research_experience enable row level security;
alter table skills_certifications enable row level security;
alter table clinical_hours enable row level security;
alter table recommenders enable row level security;
alter table portfolio_evidence enable row level security;
