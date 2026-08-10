-- 0010_parent_access.sql
--
-- Makes getting a parent INTO the dashboard a thirty-second job instead of a four-screen one.
--
-- ── The problem this closes ────────────────────────────────────────────────
-- 0006 built the consent model and 0009 built the accountability on top of it. Both are correct
-- and neither is changed here. What neither of them addressed is the step in between: a student
-- taps "Invite a parent", and their mother then has to
--
--   1. find an email that may never arrive (the SMTP relay has a monthly quota — see
--      api/_lib/mailer.js — and the invitation is the first thing to die when it runs out),
--   2. follow a link into a screen that tells her to create an account,
--   3. request a signup code, type it in, invent a password, confirm the password,
--   4. fill in a six-field declaration and sign an attestation,
--   5. and then — because the invite token was dropped somewhere around step 2 — go back and find
--      that email a second time to actually accept.
--
-- Five steps, two inbox visits, one password nobody will remember, and one dead end. The feature
-- worked in the sense that every endpoint returned what it promised, and did not work in the only
-- sense that matters, which is that a family got connected.
--
-- ── What replaces it ───────────────────────────────────────────────────────
-- One screen. The parent lands on the invitation (from the email, or from a link their child
-- texted them, or by typing an eight-character code), taps "Email me a code", types six digits,
-- and is signed in and connected. No password, no separate signup, no second visit to the inbox,
-- and nothing to lose track of in between.
--
-- ── Why that is not weaker than what it replaces ───────────────────────────
-- It is stronger, and this is the part worth reading carefully.
--
-- Before, the emailed token WAS the credential: whoever held it could accept, and the proof of
-- inbox ownership was "this link came out of that inbox" — which stops being true the moment the
-- mail is forwarded, quoted in a reply chain, or read off a shared family screen. Now the token
-- and the code are only *handles*: they name an invitation, and they authorize nothing at all.
-- Redemption requires a fresh one-time code delivered to the address the invitation was addressed
-- to, checked server-side against that address and never against one the client supplies.
--
-- So a shared link is no longer a shared credential, and the thing a person must actually control
-- to accept an invitation is the same thing it always should have been: the mailbox it was sent
-- to. See api/parent/claim.js, which is where that is enforced.

-- ── invite_code ────────────────────────────────────────────────────────────
-- The share-anywhere handle. Eight characters from an alphabet with no I/L/O/0/1/U in it, because
-- this gets read aloud across a kitchen and typed on a phone keyboard by someone who did not
-- choose to be doing this — every ambiguous glyph is a support conversation.
--
-- Stored in the clear, deliberately, and that is safe for exactly the reason above: it is not a
-- credential. The student has to be able to see it again to re-share it, which a hash cannot do,
-- and an attacker who guesses one still has to receive a code at the invited address to use it.
alter table parent_links add column if not exists invite_code text;

-- One live code per outstanding invitation. Partial on status so a code is released back into the
-- space once the invitation is answered, and case-insensitive because nobody types the case they
-- were shown.
create unique index if not exists parent_links_invite_code_idx
  on parent_links (upper(invite_code))
  where invite_code is not null and status = 'pending';

-- ── last_sent_at ───────────────────────────────────────────────────────────
-- When the invitation email last went out, so "Resend" can be throttled without a second table.
-- Resending is the single most useful thing a student can do when the mail did not arrive, and an
-- unthrottled resend button is a mail-bomb aimed at whatever address is typed into it.
alter table parent_links add column if not exists last_sent_at timestamptz;

-- ── email_verifications.purpose gains 'signin' ─────────────────────────────
-- A parent who joins through the claim flow has NO PASSWORD — that is the point of it. Without a
-- code-based way back in, their account would be a one-shot: usable on the day their child invited
-- them and never again, which is a worse failure than the one this migration set out to fix.
--
-- So the existing OTP chain (send-otp → verify-otp → spend the token) grows a third purpose, and
-- api/auth/login.js accepts a spent 'signin' verification in place of a password. That is not a
-- new trust assumption: api/auth/reset-password.js already turns control of an inbox into control
-- of the account, and it always has. This just stops requiring the person to invent a password on
-- the way through.
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conname = 'email_verifications_purpose_check'
  ) then
    alter table email_verifications drop constraint email_verifications_purpose_check;
  end if;

  alter table email_verifications
    add constraint email_verifications_purpose_check
    check (purpose in ('signup', 'password_reset', 'signin'));
end $$;

-- ── find_or_create_parent_for_claim ────────────────────────────────────────
-- Turns "this person proved they control the invited address" into an account, atomically.
--
-- It is a function rather than a read-then-insert in Node for the same reason accept_parent_link
-- is: two taps on the same button, or a retried request on a flaky phone connection, race. Both
-- callers would find no account, both would insert, and the second would fail on the unique index
-- on email — surfacing as "something went wrong" on the last screen of a flow the person had
-- already completed. Here the loser of the race simply reads the winner's row and proceeds.
--
-- ── Why it refuses a student account rather than upgrading it ──────────────
-- Role is written once, at account creation, and by nothing afterwards (see migration 0006's
-- header and scripts/verifyParentDashboard.mjs). A function that flipped an existing account to
-- 'parent' would be exactly the escalation that rule exists to prevent, reachable by anyone who
-- can receive mail at an address that already has a student account — i.e. by a student, at their
-- own address, to become their own guardian. So it returns a reason code and the caller explains
-- the situation in words; it never rewrites the row.
create or replace function find_or_create_parent_for_claim(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing app_users%rowtype;
  created  app_users%rowtype;
  norm     text := lower(trim(p_email));
begin
  if norm is null or norm = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email');
  end if;

  select * into existing from app_users where lower(email) = norm limit 1;

  if found then
    if coalesce(existing.role, 'student') <> 'parent' then
      return jsonb_build_object('ok', false, 'reason', 'role_conflict');
    end if;
    return jsonb_build_object('ok', true, 'userId', existing.id, 'created', false);
  end if;

  -- No password_hash. The account is reachable by emailed code from here on, and can set a
  -- password whenever it wants through the ordinary reset path.
  insert into app_users (email, role) values (norm, 'parent')
  returning * into created;

  return jsonb_build_object('ok', true, 'userId', created.id, 'created', true);
exception
  -- Lost the race against a concurrent claim for the same address. The winner's row is the
  -- answer, not an error — re-read it and carry on.
  when unique_violation then
    select * into existing from app_users where lower(email) = norm limit 1;
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'insert_failed');
    end if;
    if coalesce(existing.role, 'student') <> 'parent' then
      return jsonb_build_object('ok', false, 'reason', 'role_conflict');
    end if;
    return jsonb_build_object('ok', true, 'userId', existing.id, 'created', false);
end;
$$;

-- ── Locked down the same way migration 0008 locked down the others ─────────
--
-- A function that mints parent accounts must not be callable with the anon key, which ships inside
-- every browser that loads the app. REVOKE FROM PUBLIC is the load-bearing line — revoking from
-- anon and authenticated individually would leave the default PUBLIC grant standing behind them.
--
-- Guarded on pg_roles for the reason 0008 documents: this same file is applied to a stock
-- PostgreSQL by scripts/verifyMigrations.mjs, where `anon`, `authenticated` and `service_role` are
-- Supabase inventions that do not exist. A migration that only works against Supabase is exactly
-- what that harness was built to catch.
do $$
declare
  fn   text := 'public.find_or_create_parent_for_claim(text)';
  role text;
begin
  if to_regprocedure(fn) is null then return; end if;

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
end $$;

-- ── Backfill ───────────────────────────────────────────────────────────────
-- Invitations that were already outstanding when this shipped have no code, which would make them
-- the one cohort that still cannot use the new flow — and they are, by definition, the families
-- who are already stuck. They keep working through their token either way, but a code costs
-- nothing to mint and means the student can re-share the invitation the easy way.
--
-- gen_random_uuid() rather than a random()-driven subquery on purpose: an uncorrelated subquery
-- is an InitPlan and would be evaluated ONCE for the whole statement, handing every outstanding
-- invitation the same code and tripping the unique index above. A volatile function sitting
-- directly in the SET clause is evaluated per row, which is what this needs.
--
-- The hex alphabet is then translated away from its two ambiguous glyphs, so a backfilled code
-- reads the same way as a minted one (see mintInviteCode in api/_lib/parentLinks.js).
update parent_links
   set invite_code = translate(
     upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
     '01', '23'
   )
 where invite_code is null
   and status = 'pending';
