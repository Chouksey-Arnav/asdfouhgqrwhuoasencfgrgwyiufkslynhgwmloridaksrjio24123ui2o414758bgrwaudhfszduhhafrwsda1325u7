# SAT test-day tools — Desmos, the formula sheet, and the SAT coach

How the SAT tab's tooling is put together, and the constraints that shaped it.
Read this before changing anything under `src/components/sat/` that touches the
calculator, the reference sheet, or Medabrain.

---

## 1. Desmos

### Why the real thing

The Digital SAT embeds Desmos inside Bluebook and makes it available on **every
Math question, in both modules, with no usage limit**. A student who practises
with a different calculator — or with none — is rehearsing a workflow test day
will not honour. So this app loads the genuine Desmos API rather than
approximating it, and makes it reachable from every SAT screen rather than one.

### Files

| File | Job |
|---|---|
| `src/lib/sat/desmos.js` | Loads the remote API exactly once, owns the API key, owns graph-state and window-geometry persistence. |
| `src/lib/sat/desmosSeed.js` | Extracts Desmos-ready LaTeX from a question — "Graph this question". |
| `src/components/sat/DesmosSurface.jsx` | Mounts one live calculator into a `<div>`. Every calculator in the app is this component. |
| `src/components/sat/DesmosCalculator.jsx` | The draggable/resizable floating window wrapped around a `DesmosSurface`. |
| `src/components/sat/SatToolsContext.jsx` | Mounts the calculator + reference sheet once for the whole SAT pillar; exposes them to every panel. |
| `src/components/sat/SatToolkitPanel.jsx` | The Calculator sub-tab: full-size calculator + the technique playbook. |

### The API key

```
VITE_DESMOS_API_KEY=<your key>
```

Free from <https://www.desmos.com/api>. It is a **build-time** variable — Vite
inlines `import.meta.env.VITE_*` into the bundle — so it has to be set where the
build runs (Vercel project settings, or the Coolify build environment), not only
in the runtime environment.

If it is unset, `desmos.js` falls back to `dcb31709b452b1cf9dc26972add0fda6`,
the demo key Desmos publishes throughout its own documentation. That works for
development. Ship a real key: the demo key is rate-limited and unsupported, and
`USING_DEMO_KEY` is exported so the UI can say so.

Desmos's terms require loading `calculator.js` from their CDN, so there is no
bundled/offline build. The SAT tab is otherwise fully offline-capable; the
calculator is the one part that needs a connection, and it fails to a card with
a retry and a link to desmos.com rather than breaking the page.

### The one-live-instance rule

Two Desmos instances would both write to the same saved graph state and the
loser would silently overwrite the winner's expressions. So:

- `DesmosSurface` saves on change (debounced) and flushes on unmount.
- `SatToolkitPanel` calls `setEmbedded(true)` while it is mounted, and
  `SatToolsContext` stops rendering the floating window while `embedded` is
  true (the left-rail Calculator button hides too).
- Switching graphing ↔ scientific destroys the old calculator before building
  the new one.

If you add a third calculator surface, route it through `SatToolsContext` the
same way. Do not construct `Desmos.GraphingCalculator` directly.

### The seed-timing trap

`DesmosSurface`'s seeding effect keys off `calcGeneration` — a counter bumped
when a calculator is actually constructed — **not** off `status`. Once the
Desmos script is cached, `status` initialises to `'ready'`, so setting it to
`'ready'` again is a no-op React bails out of; a status-keyed effect would run
once before the calculator existed and never run again. That is exactly how
"Graph this question" silently did nothing. Keep the counter.

### What the extractor will and will not do

`desmosSeed.js` reads a question's stimulus and stem and pulls out relations it
can be confident about. Its governing rule is **extract nothing rather than
extract something wrong** — a mis-parsed equation graphs a curve that is not the
question's curve, and a student who trusts it gets the item wrong for a reason
we invented.

It handles: unicode superscripts (`x²`), unicode minus/×/÷/√/π, prose stripping
("If 5(x − 3) = 2x + 9, what is…" → `5(x-3)=2x+9`), multi-relation stems
(`y = x² − 2x − 3 and y = x + 1` → both), inequalities, single-letter
coefficients (`y = a(x−2)(x+6)`), and two-column numeric `figure` tables
(→ a real Desmos table for regression work).

It deliberately drops: function-evaluation constraints (`f(2) = 11`), anything
containing a word it cannot rule out as prose, and anything with a dangling
operator. Roughly 40% of the current math bank yields at least one expression;
the rest are geometry-with-a-described-figure or word problems where a graph
would not help anyway.

An author can bypass the heuristics entirely by putting exact LaTeX on the
question:

```js
{ id: 'sat-m-…', section: 'math', /* … */ desmos: ['y=x^2-4x+3', 'y=2x-1'] }
```

---

## 2. The formula sheet

`src/data/sat/reference.js` holds three lists and the split between them is the
point:

- `GIVEN_FORMULAS` — what Bluebook puts on screen. Shown so students stop
  spending memory on it.
- `MEMORIZE_FORMULAS` — what it does **not**. This is the list that costs
  points, so it is the tab that opens first.
- `DESMOS_PLAYS` — ten calculator techniques, each with the exact expressions
  to type. The Calculator tab loads them into the live calculator, because
  demonstrating a technique lands and describing one does not.

All of it is standard mathematics and published exam policy. No College Board
item content, ever — see the licensing note at the top of
`src/data/sat/taxonomy.js`.

---

## 3. Medabrain, SAT branch

`purpose: 'sat'` on `/api/groq` already existed for generated drills and
question explanations (`src/lib/sat/aiQuestions.js`). It now also has a
conversational surface.

| Piece | Where |
|---|---|
| System prompt | `buildSatSystemPrompt()` in `src/lib/studentProfile.js` |
| Chat panel | `src/components/sat/SatMedabrain.jsx` |
| Inline hint | `hintForQuestion()` in `src/lib/sat/aiQuestions.js` |
| Regrounded explanation | `explainQuestion()`, same file |

### Two rules the prompt enforces, not the model's judgement

**Score honesty.** The SAT tab's entire design premise is that no number appears
without its evidence base (see the header comment in `SatOverviewPanel.jsx`). A
coach that says "you're at a 1400" off three answered questions undoes that in
one sentence. The projection is passed in *with* its confidence and sample size,
and the prompt forbids restating it as a point estimate or inventing any
percentile, mastery figure, or question count not in the data block.

**Answer withholding.** While a question is unanswered, the prompt forbids
revealing the key, eliminating choices, or working the problem to its answer —
one nudge, then stop. Once answered, it switches to teaching the miss in full.

`hintForQuestion()` goes further and is a *separate call* rather than a flag on
`explainQuestion()`: the answer key and rationale are never put into the hint
prompt at all. A prompt that contains the answer and is merely asked not to say
it will eventually say it. `scripts/verifySatDesmos.mjs` asserts the hint
payload contains neither.

Hints are also gated to tutor mode. A hint mid-timed-module would corrupt the
accuracy and pacing data the rest of the tab is computed from.

---

## 4. Verifying

```bash
npm run dev            # in one shell
npm run verify:sat-tab     # the original SAT tab walkthrough
npm run verify:sat-tools   # calculator, formula sheet, Medabrain
```

`verify:sat-tools` **stubs desmos.com by default**. `calculator.js` is a ~4 MB
third-party script; depending on it would make the check slow, flaky, and
useless in a sandbox with no egress — and it would be testing Desmos rather than
our integration. The stub implements exactly the API surface `desmos.js` uses
and records every call, so the assertions are about the things we can actually
get wrong: construction, teardown, persistence, seeding, and the single-instance
rule.

To run it against the genuine API:

```bash
SAT_DESMOS_LIVE=1 npm run verify:sat-tools
```

Note that headless Chromium needs outbound access to `www.desmos.com` for that,
which some sandboxes do not grant even when `curl` can reach it.
