-- 0003_progress_sync.sql
--
-- Cross-device sync for study progress. Before this, everything below lived only in the
-- browser's IndexedDB (src/lib/db.js/Dexie) — XP, streak, quiz scores, flashcard decks/FSRS
-- state, achievements, pathway/lesson completion, unit mastery, coach chat threads, etc. That
-- meant signing in from a second browser or device showed a completely empty profile even
-- though the account itself (app_users) was shared. This table stores one JSON snapshot per
-- user so the client can pull it down on sign-in and merge it into the local Dexie store, and
-- push updates back as the student studies (see src/lib/progressSync.js).
--
-- Deliberately excludes the local-only `studyEvents` behavioral log (src/lib/eventLog.js) —
-- that stays unsynced per docs/PROFILING_PLAN.md's Phase 1 scope (no granular behavioral
-- tracking leaves the device without a dedicated consent flow). This table only carries the
-- coarse progress a student already sees on their own Home/Progress tabs.
create table if not exists progress_sync (
  user_id uuid primary key references app_users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table progress_sync enable row level security;
