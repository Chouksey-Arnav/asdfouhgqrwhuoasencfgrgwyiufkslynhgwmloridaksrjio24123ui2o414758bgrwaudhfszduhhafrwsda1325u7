-- 0002_password_auth.sql
--
-- Adds password-based login alongside the existing email-OTP flow. Signup and
-- "forgot password" both still start with an emailed 6-digit code (api/auth/send-otp,
-- api/auth/verify-otp); the code proves inbox ownership and yields a short-lived
-- email_verifications token, which api/auth/complete-signup or api/auth/reset-password
-- then spends to actually set app_users.password_hash. Verifying a code never sets a
-- password by itself. Plain sign-in (api/auth/login) is email + password, no code.
--
-- Existing accounts created before this migration (password_hash is null) aren't
-- broken: api/auth/login tells them to use "Forgot password" to set one, and that
-- flow works whether or not a password was ever set.

alter table app_users add column if not exists password_hash text;

alter table otp_codes add column if not exists purpose text not null default 'signin'
  check (purpose in ('signin','signup','password_reset'));

-- Proof that an emailed code for a given (email, purpose) was verified, spent exactly
-- once to complete signup or a password reset. Keeps "I received the code" separate
-- from "the account/password was actually changed".
create table if not exists email_verifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('signup','password_reset')),
  consumed boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists email_verifications_email_created_idx on email_verifications(email, created_at);

-- Login attempt log for rate limiting, mirroring otp_codes' per-email/per-ip approach
-- (an in-memory counter doesn't survive across ephemeral serverless instances).
create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_email_created_idx on login_attempts(email, created_at);
create index if not exists login_attempts_ip_created_idx on login_attempts(ip, created_at);

-- RLS enabled with no policies, same defense-in-depth stance as 0000_base_schema.sql —
-- real authorization happens in application code via the service-role key.
alter table email_verifications enable row level security;
alter table login_attempts enable row level security;
