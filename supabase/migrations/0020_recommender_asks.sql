-- 0020_recommender_asks.sql
--
-- Applied BY HAND to the live Supabase project, like every migration in this directory.
-- Safe to run twice.
--
-- ── Why the recommender tracker needed a date on it ─────────────────────────────────────────────
-- The panel already knew four statuses (planning → asked → confirmed → submitted) and when the
-- letter is due. It did not know WHEN the student asked, and that single missing fact is the
-- reason the whole feature could not do the one thing it most needed to do.
--
-- The failure mode this exists to prevent is specific and it happens every year. A student who
-- has never asked a professional adult for anything finds the ask genuinely frightening — that
-- fear is not a scheduling problem, it is the whole problem — so they put it off, and off, and
-- then ask a physician they shadowed twice for a letter eleven days before a deadline. The
-- physician, who is a person with a job, either says no or writes something generic in twenty
-- minutes. Both outcomes are worse than the letter they would have had with six weeks' notice.
--
-- With `asked_at` the tracker can say the two useful things:
--   • before the ask — "this is due in 19 days; you are inside the month you should have given
--     them, ask today and say so in the email"
--   • after the ask  — "you asked 12 days ago and they have not confirmed; here is the follow-up
--     to send, which is a normal and expected thing to send"
--
-- Neither is possible from `status` alone, because a status has no memory of when it changed.
--
-- Nullable with no default: a null means "not asked yet", which is a real and common state, and
-- backfilling it with now() for the rows that already say 'Asked' would invent a date the student
-- never entered and then count down from it. See src/lib/recommenders.js, which treats a row with
-- status Asked and a null asked_at as "asked, date unknown" rather than as "asked today".

alter table recommenders
  add column if not exists asked_at date;

-- The lead-time query is "everything not yet submitted, soonest due first" — the shape the panel's
-- nudge strip reads on every render.
create index if not exists recommenders_due_date_idx on recommenders(user_id, due_date);
