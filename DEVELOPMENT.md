# Development Notes: Learning Pathway Content

This file documents how the Learning Pathway feature's lesson content is
structured and maintained, for anyone extending it after the initial 8-pathway
build (Nursing, Physician Assistant, Pharmacy, Dentistry, Biomedical &
Clinical Research, Physical & Occupational Therapy, Public Health, Health
Administration — plus the original Physician and Exploring pathways).

## File layout

- `src/data/constants.js` — `PATHS` defines each pathway's lessons (id, title,
  `readMins`, and a 3-item `objectives` array).
- `src/data/lessonContent/` — one file per pathway (e.g. `nursing.js`), each
  exporting a `*_CONTENT` object keyed by lesson id. `index.js` is the barrel
  that merges all of them into a single `LESSON_CONTENT` object, keyed exactly
  as the original single-file `lessonContent.js` used to be.
- Each `LESSON_CONTENT[lessonId]` has:
  - `readMins`
  - `article.sections` — 5 sections, each `{ heading, body }` (~150–220 words
    per section body)
  - `article.keyTakeaways` — 4 bullet strings
  - `video` — `{ ytId, title, channel }`, or omitted entirely (with a comment
    explaining why) when no confident, canonical video exists for that
    lesson's specific scope
- `src/lib/db.js` — Dexie schema/migrations, including `pathwayGoals` (v9) for
  the pacing/goal-setting feature, plus achievement/certificate helpers.
- `src/lib/exportPDF.js` — `exportPathwayCertificate()` generates the
  completion certificate PDF.

## Adding a new lesson to an existing pathway

1. Add the lesson's id/title/`readMins`/`objectives` to the pathway's entry in
   `PATHS` in `src/data/constants.js`.
2. Add a matching entry to that pathway's file in `src/data/lessonContent/`
   with 5 article sections, 4 key takeaways, and either a verified `video` or
   an explicit OMIT comment.
3. Run `npm run audit:all` (see below) before committing.
4. Run `npm run build` to confirm nothing broke.

## The reuse-with-reframe convention

Several pathways (e.g. Physician Assistant, Biomedical & Clinical Research)
share core science prerequisites with the Physician pathway. Rather than
duplicating content, those lessons reuse the same underlying science article
structure but reframe the opening/closing sections and later units around
that pathway's specific professional context (e.g. PA collaborative practice,
biomedical research methods). When reusing a `ytId` this way, check
`src/data/VIDEO_CORRECTIONS.md` first — a handful of the original ids that get
reused across pathways were found to be broken or misattributed and already
swapped for a confirmed replacement; reusing the *old* id would reintroduce a
known-bad link.

## Where lesson videos come from, and how to verify them

Every video is a specific, topic-matched Crash Course episode (the app's
single-channel convention — mixing in other channels breaks the visual/brand
consistency of the video step). Before attaching a `ytId`:

1. Confirm the id actually resolves (this sandbox's network policy blocks
   direct requests to youtube.com, so `npm run audit:videos` — which checks
   the public oEmbed endpoint — may report false failures here; if so, verify
   manually via WebSearch instead, matching the id against its claimed title).
2. Confirm the title genuinely matches the lesson's specific scope, not just
   the general subject area — a generic "intro to X" video for a
   narrowly-scoped lesson should be OMITted rather than force-fit.
3. If in doubt, OMIT rather than ship an unverified guess. 22 of the 90
   current lessons intentionally ship without a video for this reason.

## Running the audit scripts

```
npm run audit:lessons   # structural completeness: objectives + article + video/OMIT for every lesson
npm run audit:videos    # every ytId resolves via YouTube oEmbed, no title mismatches
npm run audit:all       # both, in sequence
```

Both scripts exit non-zero on failure, so they're safe to wire into CI or a
pre-commit hook. Any PR touching pathway content should pass both before
merging.
