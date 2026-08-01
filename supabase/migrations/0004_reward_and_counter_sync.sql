-- 0004_reward_and_counter_sync.sql
--
-- Closes a family of cross-device double-count / lost-progress bugs in reward XP. Before this,
-- xp/aiChatCount/interviewCount synced as absolute values merged client-side via
-- Math.max(local, remote) (see src/lib/db.js's old mergeUserRecord) — correct only when one
-- device's progress is a strict superset of the other's, and silently lossy the moment two
-- devices earn real, independent progress between syncs (studying on the phone during the day,
-- then the laptop that evening — the ordinary case, not an edge case). Separately, one-time
-- rewards (today's check-in, an achievement, a weekly quest) had no cross-device guard at all,
-- so two devices that each independently noticed the same milestone before either synced could
-- both grant its XP.
--
-- Two atomic Postgres functions replace the old blind client-side merge:
--
--   bump_progress_counters — additive delta sync for naturally-repeating XP (quizzes, lessons,
--     flashcards, coach chats, interview sessions, SAT sessions). Each device reports only the
--     increment since its own last confirmed sync (src/lib/db.js's claimSyncDelta/
--     commitSyncDelta); the server always ADDS incoming deltas, never overwrites, so two
--     devices' independent gains both land instead of the smaller one being discarded.
--
--   claim_reward — idempotent, exactly-once milestone claims (checkin/achievement/quest),
--     backed by reward_claims' (user_id, claim_key) primary key. Whichever device's claim
--     lands first wins; a second device's claim for the same key is told so and rolls its
--     optimistic local grant back (src/lib/rewardClaimQueue.js).
--
-- Both hold a row lock for their entire single-transaction function body, so concurrent calls
-- for the same user serialize correctly instead of racing a read-then-write from application
-- code (a classic lost-update bug: two concurrent "read total, add delta, write back" calls from
-- Node can both read the same stale total and one call's addition silently overwrites the
-- other's).

create table if not exists reward_claims (
  user_id     uuid not null references app_users(id) on delete cascade,
  claim_key   text not null,
  attempt_id  text not null,
  xp_amount   int  not null default 0,
  claimed_at  timestamptz not null default now(),
  primary key (user_id, claim_key)
);

alter table reward_claims enable row level security;
-- No policies: access is exclusively through api/reward-claim.js using the service-role admin
-- client, which bypasses RLS — same model as progress_sync (0003_progress_sync.sql).

-- ── Additive counter sync ───────────────────────────────────────────────────────
-- p_deltas is a flat jsonb map of non-negative increments, e.g. {"xp": 20, "cardReviewCount": 8}
-- — a map rather than fixed parameters so a future counter doesn't need another migration.
create or replace function bump_progress_counters(
  p_user_id uuid,
  p_data    jsonb,
  p_deltas  jsonb
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  current_data jsonb;
  k text;
  v text;
begin
  insert into progress_sync (user_id, data, updated_at)
  values (p_user_id, p_data, now())
  on conflict (user_id) do update set data = excluded.data, updated_at = now();

  -- Row lock held for the remainder of this transaction — this is what makes two concurrent
  -- calls for the same user_id serialize instead of racing.
  select data into current_data from progress_sync where user_id = p_user_id for update;

  if p_deltas is not null then
    for k, v in select * from jsonb_each_text(p_deltas)
    loop
      if v is not null and v::numeric <> 0 then
        current_data := jsonb_set(
          current_data,
          array['user', k],
          to_jsonb(coalesce((current_data #>> array['user', k])::numeric, 0) + v::numeric),
          true
        );
      end if;
    end loop;
    update progress_sync set data = current_data, updated_at = now() where user_id = p_user_id;
  end if;

  return current_data;
end;
$$;

-- ── Idempotent milestone claims ─────────────────────────────────────────────────
-- granted=true            → this call is the one that created the claim (XP just added).
-- granted=false, mine=true  → this exact attempt_id already succeeded earlier (a retry after a
--                              lost response) — the caller should treat this as success, not as
--                              "someone else beat me."
-- granted=false, mine=false → a different device/attempt claimed this key first — caller rolls
--                              its optimistic local grant back.
create or replace function claim_reward(
  p_user_id uuid,
  p_claim_key text,
  p_attempt_id text,
  p_xp_amount int
) returns table(granted boolean, mine boolean, total_xp bigint)
language plpgsql
set search_path = public
as $$
declare
  existing_attempt text;
  computed_total bigint;
begin
  insert into reward_claims (user_id, claim_key, attempt_id, xp_amount)
  values (p_user_id, p_claim_key, p_attempt_id, p_xp_amount)
  on conflict (user_id, claim_key) do nothing;

  if found then
    insert into progress_sync (user_id, data, updated_at)
    values (p_user_id, jsonb_build_object('user', jsonb_build_object('xp', p_xp_amount)), now())
    on conflict (user_id) do update
      set data = jsonb_set(
            progress_sync.data, '{user,xp}',
            to_jsonb(coalesce((progress_sync.data #>> '{user,xp}')::bigint, 0) + p_xp_amount),
            true
          ),
          updated_at = now()
    returning (data #>> '{user,xp}')::bigint into computed_total;
    if computed_total is null then computed_total := p_xp_amount; end if;
    return query select true, true, computed_total;
  else
    select r.attempt_id into existing_attempt from reward_claims r
      where r.user_id = p_user_id and r.claim_key = p_claim_key;
    select (data #>> '{user,xp}')::bigint into computed_total from progress_sync where user_id = p_user_id;
    return query select false, (existing_attempt = p_attempt_id), coalesce(computed_total, 0);
  end if;
end;
$$;
