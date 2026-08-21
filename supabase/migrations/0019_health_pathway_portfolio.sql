-- 0019_health_pathway_portfolio.sql
--
-- Two changes that turn a generic essay tracker and a generic deadline table into
-- health-pathway instruments.
--
-- ── 1. Essays are not all the same object ───────────────────────────────────────────────────────
-- The workspace stored one kind of row: "an essay", with a title and a word limit and a status
-- that walks from not_started to final. That shape is correct for a supplement and wrong for the
-- two documents that actually separate a strong health-pathway applicant from a merely qualified
-- one:
--
--   • The "why this pathway" working document. It is not due in October of senior year. It is
--     started in ninth grade, revisited every few months for four years, and it is the source
--     material every later essay is quarried out of. It has no word limit, it is never "final",
--     and a status ladder aimed at a deadline actively misdescribes it.
--   • The personal statement, which is one document reused everywhere rather than one of N
--     school-specific ones.
--
-- `essay_kind` is what lets the workspace tell them apart — and, just as importantly, what lets
-- every counter in the app ("essays started") keep counting the things a student would call an
-- essay, rather than silently inflating by one the day they open the working document.
--
-- `source_ref` and `source_label` record where a prompt CAME from: a combined-degree program's
-- own supplement, a curated school prompt, or the student's own head. A student who discovers in
-- October that the BS/MD program has three extra essays has already lost; a row that knows it
-- came from `combined:drexel-bams-md` can be surfaced the moment the program is tracked.
--
-- ── 2. Version history has to be readable, not just retained ────────────────────────────────────
-- `essay_versions` already stored every saved draft. Nobody could tell what changed between two
-- of them, which made the history a pile rather than a record. `label` and `note` let a version
-- carry what it was ("after Ms. Herrera read it", "cut the hospital opening") so both the student
-- and whoever gives them feedback can see how the argument moved.
--
-- ── 3. The reflection journal ───────────────────────────────────────────────────────────────────
-- A separate table on purpose. A journal entry answers a question we asked, on a date, and it is
-- never submitted anywhere — it has no word limit, no school, no status, and it must never be
-- counted as an application essay by anything that counts application essays.
--
-- ── 4. Milestones need a done state and a lead time ─────────────────────────────────────────────
-- `completed_at` is what makes the milestone feed two-way: until now the only thing a student
-- could do to a date was delete it, which is not the same act as finishing it and loses the
-- record. `source_ref` points a generated milestone back at the program, competition or
-- certification it came from, so completing the milestone can update that thing.
--
-- `lead_days` is the one that changes how the list is ordered. A deadline ninety days out that
-- needs a two-month run-up is more urgent than one thirty days out that takes an afternoon, and
-- a feed sorted by date alone tells a student the opposite. Storing the run-up next to the date
-- is what lets the feed sort by slack instead.

alter table essays
  add column if not exists essay_kind text not null default 'supplemental'
    check (essay_kind in ('personal_statement', 'supplemental', 'why_pathway')),
  add column if not exists source_ref text,
  add column if not exists source_label text;

create index if not exists essays_user_kind_idx on essays(user_id, essay_kind);

alter table essay_versions
  add column if not exists label text,
  add column if not exists note text;

create table if not exists reflection_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  -- The id of the prompt from src/lib/healthEssays.js that produced this entry, or null when the
  -- student wrote unprompted. Kept so the prompt rotation never asks the same question twice.
  prompt_id text,
  -- The question as it was actually asked, stored verbatim. The bank will be edited over four
  -- years and an entry whose question has since been reworded is a record of a conversation that
  -- did not happen.
  prompt_text text,
  content text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reflection_entries_user_id_idx on reflection_entries(user_id);
create index if not exists reflection_entries_entry_date_idx on reflection_entries(user_id, entry_date);

alter table reflection_entries enable row level security;

alter table deadlines
  add column if not exists completed_at timestamptz,
  add column if not exists source_ref text,
  add column if not exists lead_days integer;

create index if not exists deadlines_source_ref_idx on deadlines(user_id, source_ref);
