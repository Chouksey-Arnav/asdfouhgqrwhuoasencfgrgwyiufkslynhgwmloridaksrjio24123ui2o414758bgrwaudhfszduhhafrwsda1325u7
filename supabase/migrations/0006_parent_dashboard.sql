-- 0006_parent_dashboard.sql
--
-- Makes a parent a first-class account, linked to a student by mutual consent, with a read-only
-- view of that student's progress.
--
-- ── Why a parent is a row in app_users, not its own table ──────────────────
-- Everything an account needs already exists and is well-tested: scrypt password hashing
-- (api/_lib/password.js), the OTP chain (send-otp → verify-otp → complete-signup), the sessions
-- table with its 30-day tokens, DB-backed rate limiting, and getUserFromRequest(). A parallel
-- parent_users/parent_sessions pair would have meant a second copy of all of it, and a second
-- place for an auth bug to live.
--
-- The cost of that reuse is that a parent's bearer token is indistinguishable from a student's to
-- every handler that already exists. That is not a schema problem and it is not solved here — it
-- is solved by requireStudent/requireParent in api/_lib/session.js, applied to every student-only
-- endpoint, and audited mechanically by scripts/verifyParentDashboard.mjs. This comment exists so
-- that the next person to add an endpoint knows the guard is load-bearing rather than decorative.
--
-- ── Consent is mutual, and revocation is immediate ─────────────────────────
-- Either side can invite; nothing flows until the other side accepts; either side can revoke and
-- it takes effect on the very next request, because getActiveLink() re-reads status per request
-- and never caches it in the session. A 30-day token stays valid for authentication and stops
-- being sufficient for authorization the moment a link is revoked.
--
-- ── What a parent can see ──────────────────────────────────────────────────
-- Progress and outcomes only. Never coach transcripts, lesson notes, or essay text. That boundary
-- is enforced in api/_lib/parentSummary.js by building an allowlist rather than filtering a
-- blocklist, so a field added to the student snapshot tomorrow is invisible to parents by default
-- instead of leaking until someone notices.

-- ── role ───────────────────────────────────────────────────────────────────
-- Defaults to 'student', which backfills every existing account correctly and means no existing
-- row changes meaning. Role is set at signup and never written by any endpoint afterwards: a
-- student who could flip themselves to 'parent' could then invite anyone and read their progress.
alter table app_users add column if not exists role text not null default 'student';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'app_users_role_check'
  ) then
    alter table app_users add constraint app_users_role_check check (role in ('student', 'parent'));
  end if;
end $$;

create index if not exists app_users_role_idx on app_users (role);

-- ── parent_links ───────────────────────────────────────────────────────────
-- One row per parent↔student relationship, from invitation through to revocation.
--
-- Both user id columns are NULLABLE because an invitation is addressed to an EMAIL, which may not
-- have an account yet — that is the whole point of inviting someone. The invitee's id is filled in
-- by accept_parent_link() once they exist and have proven they own the address.
--
-- ON DELETE SET NULL, deliberately, NOT CASCADE. api/auth/account.js deletes the app_users row and
-- lets foreign keys do the rest; under CASCADE the link would simply vanish and the other party
-- would watch their dashboard go empty with no explanation anywhere. Under SET NULL the row
-- survives as a record, and the BEFORE DELETE trigger below flips it to 'revoked' first so it is
-- never left looking active with a missing counterparty.
create table if not exists parent_links (
  id                 uuid primary key default gen_random_uuid(),
  parent_user_id     uuid references app_users(id) on delete set null,
  student_user_id    uuid references app_users(id) on delete set null,
  status             text not null default 'pending' check (status in ('pending', 'active', 'revoked', 'declined', 'expired')),
  initiated_by       text not null check (initiated_by in ('parent', 'student')),
  relationship       text,
  invite_email       text not null,
  invite_token_hash  text not null,
  invite_expires_at  timestamptz not null default now() + interval '7 days',
  consumed_at        timestamptz,
  created_at         timestamptz not null default now(),
  accepted_at        timestamptz,
  revoked_at         timestamptz,
  revoked_by         text,

  -- Linking an account to itself would make a student their own guardian and hand them a second
  -- route to their own data with different authorization rules. Rejected in the schema so no
  -- handler can forget to check it.
  constraint parent_links_no_self_link check (
    parent_user_id is null or student_user_id is null or parent_user_id <> student_user_id
  )
);

-- One live relationship per pair. Partial on status so a revoked link does not permanently poison
-- the pair — a parent and student who reconnect later must be able to link again.
--
-- The IS NOT NULL predicates are not redundant with the NULL-distinctness of unique indexes; they
-- state the intent (this index constrains *established* links) and keep the index off the
-- invitation rows entirely.
create unique index if not exists parent_links_active_pair_idx
  on parent_links (parent_user_id, student_user_id)
  where parent_user_id is not null and student_user_id is not null and status <> 'revoked';

-- The index above cannot constrain invitations, because a pending invite has a NULL on one side
-- and NULLs are distinct in a unique index — so without these two, one parent could mint an
-- unlimited number of simultaneously-valid invite tokens for a single address. Lowercased because
-- email addresses are matched case-insensitively everywhere else in this codebase.
create unique index if not exists parent_links_pending_parent_invite_idx
  on parent_links (parent_user_id, lower(invite_email))
  where status = 'pending' and parent_user_id is not null;

create unique index if not exists parent_links_pending_student_invite_idx
  on parent_links (student_user_id, lower(invite_email))
  where status = 'pending' and student_user_id is not null;

create unique index if not exists parent_links_token_idx on parent_links (invite_token_hash);

create index if not exists parent_links_parent_idx on parent_links (parent_user_id) where parent_user_id is not null;
create index if not exists parent_links_student_idx on parent_links (student_user_id) where student_user_id is not null;
create index if not exists parent_links_pending_token_idx on parent_links (invite_token_hash) where status = 'pending';

-- ── parent_link_events ─────────────────────────────────────────────────────
-- Every state change, written inside the same transaction as the change itself. A link is a
-- consent record; "who granted access to whose data, and when did they take it back" is exactly
-- the question that gets asked after something goes wrong, and it cannot be reconstructed from
-- the current row alone.
create table if not exists parent_link_events (
  id         bigserial primary key,
  link_id    uuid references parent_links(id) on delete cascade,
  event      text not null check (event in ('created', 'accepted', 'declined', 'revoked', 'expired', 'resent')),
  actor      text,
  reason     text,
  created_at timestamptz not null default now()
);

create index if not exists parent_link_events_link_idx on parent_link_events (link_id, created_at desc);

-- ── parent_summary_cache ───────────────────────────────────────────────────
-- The parent-facing summary derived from progress_sync.data, computed once per snapshot rather
-- than once per poll. A student with three linked parents, each polling every 20 seconds, would
-- otherwise reparse a multi-megabyte JSON blob nine times a minute to produce byte-identical
-- output.
--
-- source_updated_at is the progress_sync.updated_at the summary was built from; it is both the
-- cache key and the value the client echoes back as `since`, which is what keeps freshness
-- comparisons on server time and immune to client clock skew.
create table if not exists parent_summary_cache (
  student_user_id   uuid primary key references app_users(id) on delete cascade,
  summary           jsonb not null,
  source_updated_at timestamptz,
  computed_at       timestamptz not null default now()
);

-- ── Row level security ─────────────────────────────────────────────────────
-- Enabling RLS with no policies is already a complete deny for every role that is subject to it;
-- the service role used by /api/* has BYPASSRLS and is unaffected. The explicit deny-all policies
-- below are therefore semantically a no-op — they are here to state the intent in the schema so
-- that "there are no policies on this table" reads as a decision rather than an oversight.
alter table parent_links enable row level security;
alter table parent_link_events enable row level security;
alter table parent_summary_cache enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'parent_links' and policyname = 'parent_links_deny_all') then
    create policy parent_links_deny_all on parent_links for all using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'parent_link_events' and policyname = 'parent_link_events_deny_all') then
    create policy parent_link_events_deny_all on parent_link_events for all using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'parent_summary_cache' and policyname = 'parent_summary_cache_deny_all') then
    create policy parent_summary_cache_deny_all on parent_summary_cache for all using (false) with check (false);
  end if;
end $$;

-- ── revoke_links_on_user_delete ────────────────────────────────────────────
-- BEFORE DELETE, so OLD.id still matches the link rows; the foreign keys then null the deleted
-- side out. The result is a row that says "this relationship existed and ended because the account
-- was deleted", which is what the surviving party needs to be told and what an audit needs to see.
create or replace function revoke_links_on_user_delete() returns trigger
language plpgsql
as $$
begin
  insert into parent_link_events (link_id, event, actor, reason)
  select id, 'revoked', 'system', 'account_deletion'
    from parent_links
   where (parent_user_id = OLD.id or student_user_id = OLD.id)
     and status not in ('revoked', 'declined', 'expired');

  update parent_links
     set status = 'revoked', revoked_at = now(), revoked_by = 'account_deletion'
   where (parent_user_id = OLD.id or student_user_id = OLD.id)
     and status not in ('revoked', 'declined', 'expired');

  return OLD;
end;
$$;

drop trigger if exists trg_revoke_links_on_user_delete on app_users;
create trigger trg_revoke_links_on_user_delete
  before delete on app_users
  for each row execute function revoke_links_on_user_delete();

-- ── accept_parent_link ─────────────────────────────────────────────────────
-- Redeeming an invitation is a read-then-write across several conditions (is the token real, is it
-- unexpired, is it unconsumed, does the address match, which side is empty), and every one of them
-- is invalidated by a concurrent redemption of the same token. Doing it in Node would mean two
-- requests could both pass their checks before either wrote, and the second would overwrite the
-- first's link — quietly attaching the wrong account to a parent.
--
-- SELECT ... FOR UPDATE holds the row for the whole body, so the losing caller blocks, re-reads a
-- row that is now consumed, and is told so. Callers get a reason code rather than an exception
-- because every one of these outcomes is a normal thing a user can do, not an error condition.
create or replace function accept_parent_link(
  p_token_hash text,
  p_user_id uuid,
  p_email text
) returns jsonb
language plpgsql
security definer
as $$
declare
  lnk        parent_links%rowtype;
  actor_role text;
  filled     text;
begin
  select * into lnk from parent_links where invite_token_hash = p_token_hash for update;

  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'not_found');
  end if;

  if lnk.consumed_at is not null or lnk.status <> 'pending' then
    return jsonb_build_object('accepted', false, 'reason', 'already_used', 'status', lnk.status);
  end if;

  if lnk.invite_expires_at < now() then
    update parent_links set status = 'expired' where id = lnk.id;
    insert into parent_link_events (link_id, event, actor, reason) values (lnk.id, 'expired', 'system', 'ttl');
    return jsonb_build_object('accepted', false, 'reason', 'expired');
  end if;

  -- The invitation is addressed to a specific mailbox. Accepting from a different account would
  -- link whoever happened to click the link, which is precisely the failure a typo'd address
  -- produces. The inviter can correct the address and resend instead.
  if lower(lnk.invite_email) <> lower(p_email) then
    return jsonb_build_object('accepted', false, 'reason', 'email_mismatch');
  end if;

  select role into actor_role from app_users where id = p_user_id;
  if actor_role is null then
    return jsonb_build_object('accepted', false, 'reason', 'unknown_user');
  end if;

  if lnk.parent_user_id is null and lnk.student_user_id is not null then
    if lnk.student_user_id = p_user_id then
      return jsonb_build_object('accepted', false, 'reason', 'self_link');
    end if;
    if actor_role <> 'parent' then
      return jsonb_build_object('accepted', false, 'reason', 'role_mismatch', 'expected', 'parent');
    end if;
    update parent_links
       set parent_user_id = p_user_id, status = 'active', accepted_at = now(), consumed_at = now()
     where id = lnk.id;
    filled := 'parent';

  elsif lnk.student_user_id is null and lnk.parent_user_id is not null then
    if lnk.parent_user_id = p_user_id then
      return jsonb_build_object('accepted', false, 'reason', 'self_link');
    end if;
    if actor_role <> 'student' then
      return jsonb_build_object('accepted', false, 'reason', 'role_mismatch', 'expected', 'student');
    end if;
    update parent_links
       set student_user_id = p_user_id, status = 'active', accepted_at = now(), consumed_at = now()
     where id = lnk.id;
    filled := 'student';

  else
    -- Both sides already populated, or both empty: not a shape any code path should produce.
    return jsonb_build_object('accepted', false, 'reason', 'malformed');
  end if;

  insert into parent_link_events (link_id, event, actor, reason)
  values (lnk.id, 'accepted', p_user_id::text, 'filled_' || filled);

  return jsonb_build_object('accepted', true, 'linkId', lnk.id, 'filled', filled);
exception
  -- The unique index on an established pair can fire here when the same two people already have a
  -- link through another invitation. That is a duplicate, not a crash.
  when unique_violation then
    return jsonb_build_object('accepted', false, 'reason', 'already_linked');
end;
$$;
