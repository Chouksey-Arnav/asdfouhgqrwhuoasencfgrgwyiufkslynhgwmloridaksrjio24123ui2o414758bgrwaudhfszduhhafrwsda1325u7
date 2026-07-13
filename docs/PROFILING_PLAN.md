# Deeper Profiling — Design Plan (not yet active)

MedSchoolPrep is still in dev stage, so no behavioral tracking or analytics pipeline runs today.
This document is the plan for what a real profiling system should look like once the product is
ready for it — written now so the eventual build has a clear target instead of being bolted on
ad hoc.

## Goals

- Understand *how* a student actually studies (not just final scores) — dwell time on lessons,
  time-to-verification, retry patterns on quizzes — so the app can nudge and recommend better.
- Give students an honest, detailed picture of their own study habits in the Progress tab.
- Eventually support cohort-level benchmarking ("students on this pathway typically verify a
  unit within X days") without exposing any individual's data to other users.

## Phase 1 — Local-only engagement log (shipped)

`src/lib/eventLog.js` + the Dexie `studyEvents` table (`src/lib/db.js`, v8) already record, purely
on-device:
- `lesson_video_watched` — a lesson's Study action was taken
- `quiz_attempt` — a verification quiz was started
- `unit_lesson_verified` / `unit_verified` — a lesson/unit passed verification

Nothing here is transmitted anywhere. It exists to power the Verified Progress view's honesty
(distinguishing "opened" from "proved") and as the seed schema for Phase 2.

## Phase 2 — Opt-in cross-device sync (future)

Once there's a real consent flow (a clear, specific opt-in — not a buried settings toggle), sync
the local `studyEvents` log to new Supabase tables so a student's study history follows them
across devices:

```sql
create table user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  event_type text not null,      -- mirrors studyEvents.type
  ref_id text,                   -- lesson/unit/quiz id
  occurred_at timestamptz not null
);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  events_count integer not null default 0
);
```

Consent requirements before this phase ships:
- Explicit, specific opt-in screen (not enabled by default, not bundled into a generic ToS).
- A visible way to see exactly what's been recorded and to delete it.
- No sale or third-party sharing of this data, ever.

## Phase 3 — Anonymized cohort insights (future)

Aggregate Phase 2 data across consenting users, stripped of anything identifying, to power
benchmarking language like "students on the Physician pathway typically verify Unit 1 within 9
days of starting." Requires a minimum cohort size per aggregate (e.g., never show a stat computed
from fewer than ~25 students) to avoid re-identification risk.

## What this is explicitly NOT

Not a third-party analytics SDK (no PostHog/Mixpanel/Amplitude/GA), not ad-tech, not anything that
leaves the app's own infrastructure. If that ever changes, this document needs a rewrite and a new
consent flow — it should never happen silently as a byproduct of an unrelated feature update.
