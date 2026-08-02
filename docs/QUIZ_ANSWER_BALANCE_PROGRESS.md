# Quiz bank answer-length bias — remediation progress

## The problem

Across the hand-written quiz bank (`src/data/quizzes/{bioBiochem,chemPhys,psychSoc,lessonQuizzes}.js`,
362 quizzes / 4,488 questions as of this writing), the correct choice was the
strict-longest option in **72%** of questions against a 25% chance baseline,
and "visibly" longest (the SAT bank's `MAX_LENGTH_RATIO`/`MAX_ABSOLUTE_GAP`
gate) in roughly two-thirds of them. A student can score well above chance by
picking the longest, most-qualified-sounding choice without reading the
question — this was confirmed by user testing and is a critical validity
problem for every quiz in the library, not an isolated few.

This is the same failure mode the SAT tab's AI question generator already had
to solve — see `src/lib/sat/answerBalance.js`. Rather than invent a second,
subtly different heuristic for the hand-written bank, this remediation reuses
that exact module as the one definition of "balanced" for both corpora.

## The rule (from `src/lib/sat/answerBalance.js`, unchanged)

A 4-choice question is balanced when **all** of the following hold
(`balanceViolations(choices, ansIdx)` returns `[]`):

- **Ratio**: once the wrong choices average ≥20 characters, the correct
  choice may not exceed their mean by more than 22%.
- **Absolute gap**: the correct choice may not be more than 18 characters
  longer than the longest wrong choice (backstop for cases where the ratio
  check's denominator is too small to fire).
- **Spread**: once the longest choice is ≥30 characters, no choice may be
  more than 2.1x the length of the shortest — a distractor set that's "three
  words vs. thirty" narrows the field even when the correct choice isn't the
  outlier.

In practice this produces the mix the rule's own contract
(`CHOICE_LENGTH_CONTRACT`) describes: most questions have choices of similar
length where the correct answer is only sometimes the longest (no more often
than it's the shortest); a smaller share have one longer distractor built
around a specific plausible misconception, with the correct choice never
being that one; and a small remainder have the correct choice genuinely
longest but only marginally so, within the ratio/gap limits — never a giveaway.

**Fixing a violation means rewriting content, not padding.** Per the
contract: "if a choice needs padding to fit, the misconception behind it was
too thin and the choice should be replaced." Over-long correct answers get
trimmed of redundant qualifiers (not stripped of the fact that makes them
correct); thin distractors get rebuilt around a real, specific wrong-but-
plausible claim, not filler words.

## Verifying a batch

```
node scripts/auditQuizBankBalance.mjs --range=bb01-bb100
node scripts/auditQuizBankBalance.mjs --prefix=bb
node scripts/auditQuizBankBalance.mjs --ids=bb01,bb02,bb03
```

A batch is done when the script reports **0 violations** for that range AND
every quiz in it carries `lengthAudited: true` right after its `diff:`
field — that flag is the per-quiz, in-source signal that a future session
should trust the quiz as already fixed and skip it. `auditQuizBankBalance.mjs`
also warns if a quiz is marked `lengthAudited` but still has violations
(e.g. someone edited it afterward without re-running the audit), so the flag
never silently goes stale.

## Batches (100 quizzes at a time, in `ALL_QUIZZES` order)

| Batch | IDs | Quizzes | Questions | Status | PR |
|---|---|---|---|---|---|
| 1 | `bb01`–`bb100` (all of Life Sciences) | 100 | 1,337 | **Done** | "The First 100 Quizzes" |
| 2 | `cp01`–`cp100` (all of Physical Sciences) | 100 | — | Not started | — |
| 3 | `ps01`–`ps120` (all of Behavioral & Social Sciences) | 120 | — | Not started | — |
| 4 | Lesson/career-guidance quizzes (`lessonQuizzes.js`, 42 quizzes) | 42 | — | Not started | — |

Total bank: 362 quizzes / 4,488 questions across 4 batches.

When starting the next batch: confirm the count with
`node scripts/auditQuizBankBalance.mjs --prefix=<cp|ps>` (or `--ids=` a
comma list for the lesson file, since those ids don't share a numeric
prefix), split into ~20-quiz chunks the same way batch 1 did, and update the
table above when done.
