# Full-length SAT tests

How a student gets a *different* test each time they sit one, and how the app
decides what "different" means.

## The problem

Every full-length test used to be assembled from `Date.now()`. That produced a
different-ish test each time and nothing a student could reason about:

- No way to plan around one. "I'm sitting Form C on Saturday" is a study plan;
  "I'll press the button again" is not.
- No way to know whether the test in front of them repeated the one they sat
  last week. Two draws from the same bank overlapped by however much the shuffle
  happened to overlap, and nothing on screen said so.
- No way to compare two scores, or one student's score with another's.
- Nothing prevented the same question appearing in Module 1 and again in
  Module 2 of a single sitting. `buildModule` de-duplicates within one call and
  each module is a separate call, so the only thing keeping a repeat off the
  screen was luck.

## What replaced it

A test is now something you pick from a catalogue (`SatTestPicker`), and the
catalogue has three kinds of entry.

### 1. Official College Board tests — listed first

Because they are better than ours and saying otherwise would be a disservice.
Nothing of theirs is reproduced: `src/data/sat/forms.js` stores a title, a link
and enough structure to hand the student off. What comes back is a score they
type in, recorded as a completed `full` attempt with `meta.official` set, so it
charts and projects alongside everything else.

- **Bluebook** — one entry, not a numbered list. College Board rotates which
  adaptive tests are live each cycle, so the student names the one they sat.
- **Eleven printable linear forms** — booklet, answer key and raw-to-scaled
  scoring guide for each. All 33 URLs verified live (`npm run audit:sat-resources`).

An official score has no per-question evidence behind it, so it deliberately
does *not* drive the skill heat map. Inventing per-skill data from a section
score would be a fabrication.

### 2. In-app forms — A, B, C

A **form** is a named, fixed selection of bank questions: identical for
everyone, identical every time it is assembled. Its `seed` must never change
once shipped — changing it silently rewrites a test students have already sat.

Forms are apportioned once, in catalogue order, against a running set of
already-claimed questions (`src/lib/sat/forms.js`). Form A takes its share,
Form B takes from what is left, and so on. Appending a form therefore cannot
disturb an existing one.

**The guarantee: no form shares a single question with any other form.**
`scripts/verifySatForms.mjs` enforces it absolutely rather than as a percentage,
because a threshold would let the catalogue's promise decay quietly as forms are
appended to a bank that cannot carry them.

### 3. Fresh mix

Seeded from the clock, excluding every question the student has answered
anywhere in the app. Maximum novelty; not reproducible, so not comparable.

## Why three forms and not six

A form's footprint is about 130 bank questions. Six were drafted; with the bank
at 328 questions only two were genuinely distinct and Form C onwards was a
reshuffle. Expansion batch C (138 new questions, weighted to the bands that ran
out first) took the bank to 466 and the catalogue to three fully distinct forms.

A fourth came out 26% new, which is not a fourth test. It was cut. To add one,
grow the bank until `npm run verify:sat-forms` goes quiet — the audit will not
let the list outrun what is behind it.

    forms in catalogue      3
    fully fresh forms       3
    414 of 466 bank questions committed to forms; 52 spare

## Design decisions worth knowing

**Upper and lower Module 2 may share questions with each other.** Routing sends
a student to exactly one of them, so a question in both is never seen twice in a
sitting. Forcing them apart would reserve 147 questions per form instead of ~98
— a third of the bank spent on a collision that cannot happen. When the bank is
roomy the two come out nearly distinct anyway, because the seeded draw has room
to spread; they converge only as the bank tightens, which is when the sharing is
worth having. Module 1 *does* block both, because that pairing is a real sitting.

**The exclusion ladder releases oldest-first.** When the bank forces a form to
recycle, it recycles the questions the student met longest ago. That is the
difference between "your fourth test repeats a few items from your first" and
"repeats the test you sat last week", and it costs nothing.

**A resumed test rebuilds from stored question ids, not by re-running the
builder.** Re-running was safe while every test was a pure function of a stored
seed. A fresh mix is also a function of what the student had already seen —
which the test itself changes as they answer it — so rebuilding one mid-test
handed them a different paper on resume. `meta.questionsByStage` removes the
whole class of problem.

## Commands

    npm run verify:sat-forms      forms are full-length, distinct, on-blueprint
    npm run audit:sat             bank integrity, including answer-shape bias
    npm run audit:sat-resources   every official link still resolves
