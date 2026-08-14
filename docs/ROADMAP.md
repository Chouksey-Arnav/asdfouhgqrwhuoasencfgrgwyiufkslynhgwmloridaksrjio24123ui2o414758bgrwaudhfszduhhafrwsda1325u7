# The Roadmap tab

A twelve-month admissions plan, built from a thirteen-question intake plus everything the app
already knows about a student, and grounded in a hand-verified deadline catalog so no date shown
to a student was ever invented by a language model.

**The product thesis, stated once.** A private admissions counselor costs several thousand dollars
a year, and the students who need one most are the ones who will never have one. What they
actually do is not mysterious: they know which deadlines exist, which ones apply to *this*
student, how far ahead each one has to start, and they say so a season before it matters. This tab
does that, for free, for anyone.

---

## 1. The one design decision everything else follows from

> **The catalog owns facts. The model owns judgement.**

A language model asked for exact deadlines will produce them — fluently, confidently, and often
wrong. *"The Coca-Cola Scholars application is due October 31"* reads as authoritative to a
seventeen-year-old and costs them a $20,000 scholarship when the real date was October 2. There is
no prompt that makes a model reliable about a hundred separate organisations' calendars.

So the split is strict:

| | Owns | Where |
|---|---|---|
| **Catalog** | Which programs exist, who is eligible, roughly when they open and close, what they cost, where to confirm | `src/data/roadmap/` — hand-written, source-linked |
| **Model** | Which of these fit *this* student, in what order, at what intensity, with what preparation, and why | `src/lib/roadmap/generator.js` |

The model is **never asked for a date**, in any of its four passes. It is handed a shortlist of
catalog entries that already carry their dates and asked to *select, sequence and explain*.
Anything it returns that is not a known catalog id is discarded before rendering. A model cannot
hallucinate a deadline it was never asked to produce.

### The rendering rule

Facts being right in the data is only half of it — they also have to survive reaching the screen.
Every date in the tab passes through `displaysExactDate()` / `dateCaption()`
(`src/data/roadmap/schema.js`), surfaced as the `<ItemDate>` component:

| `confidence` | Meaning | Rendered as |
|---|---|---|
| `fixed` | The institution sets the same date every year and publishes it (Common App opens Aug 1; ED I is Nov 1) | a date |
| `typical` | Predictable annual rhythm, exact day moves (most scholarships and summer programs) | a **window** + "confirm on the official site" + link |
| `varies` | Genuinely local: regional science fairs, hospital volunteer intakes, your school's finals week | a **season**, never a date — plus a prompt to look yours up and pin it |

Three ways to earn an exact date, and no fourth: the student typed it in, it is structurally
fixed, or nothing.

A `varies` entry *may* still carry a `window`. That is a private **scheduling estimate** so the
item lands in roughly the right season with a sensible lead time; it is never shown. That is why a
`varies` entry is required to carry a human-readable `season` string — it is the only date text
the UI is allowed to render for it.

`scripts/verifyRoadmap.mjs` greps `src/components/roadmap/` for raw date interpolation and fails
the build on any hit. The rule is a mechanism, not a convention, because a convention is one
careless `{item.due}` away from failing silently.

---

## 2. What a student actually experiences

1. **Thirteen questions**, one per screen (`RoadmapIntake.jsx`). Nine arrive already answered from
   the user record and the Portfolio, each marked with where it came from, so most are one tap of
   confirmation. In practice that is about four minutes.
2. **A review screen** listing every answer, with anything we filled in and they never looked at
   flagged **Assumed**. A wrong guess that was never shown is the fastest route to a confidently
   wrong roadmap.
3. **Four generation passes**, narrated honestly while they run (~1–2 minutes).
4. **The roadmap**: a year's thesis, four named seasons, the dated items inside each with real
   preparation steps, the risks specific to *them*, and an honest read-back naming what the plan
   is betting on and what it does not cover.

### The five views

| View | The question only it answers |
|---|---|
| **Overview** | What do I do *now* — plus the year's thesis and the straight-talk read-back |
| **Your Year** | *When does my year get hard?* Load is drawn from **preparation windows**, not deadlines, so a wall in March appears here in January |
| **Seasons** | What is this stretch of my life *for* |
| **Everything** | Filterable reference, plus adding items of your own |
| **Your Answers** | The inputs, editable — a roadmap is only as good as what it knows |

---

## 3. Why the intake is capped at thirteen

Onboarding already asks about thirty questions. Asking thirty more before showing any value is how
a feature gets abandoned at question nine. The cap is structural: `MAX_QUESTIONS` is asserted at
module load *and* by the verify script, so a fourteenth question means deleting one.

Every question earns its place by being something the app **cannot already answer**. Grade,
pathway, GPA band, why-medicine, prior experience and dream role come from onboarding; colleges,
activities, essays, hours and awards come from the Portfolio. Re-asking any of them would tell the
student, correctly, that the app has not been paying attention.

What is left is what a real counselor asks in a first meeting and this app never had reason to
collect: **money, transport, citizenship, family circumstance, appetite for risk, and what the
student wants this specific year to be about** — precisely the answers that gate the catalog.

Two related mechanisms, deliberately kept apart:

- **`prefill`** — inferred from something they told us. Carries a visible "we worked this out
  from…" note and appears on the review screen as an assumption to check.
- **`defaultValue`** — a constant starting selection making no claim about them at all
  (`selectivityStomach` defaults to `balanced`).

Presenting a constant under the prefill label would be a small lie that makes every real prefill
less believable. The verify script asserts a blank user gets zero prefills.

---

## 4. Slate composition — why a good year is not just good items

The two ways an AI-written roadmap fails are opposite and both invisible to the student reading it:

- **All reaches.** Eight lottery programs and a national olympiad, none of which they will get,
  and a year with nothing to show at the end of it.
- **All filler.** Nine club meetings and a webinar, every one achievable and not one worth a line
  on an application.

A real counselor balances these instinctively. `SLATE_RULES` encodes the instinct, and
`validateSlate()` checks it after generation:

- no track exceeds 45% of dated items
- at least four items the student can definitely do
- at most three long shots
- **every long shot has a same-track achievable item beside it** — enforced in the deterministic
  path too, which drops an unbacked reach rather than shipping one
- crunch months are surfaced to the student rather than hidden

Warnings are shown, not suppressed: *"your year leans hard on long shots"* is something a student
is entitled to know about their own plan.

---

## 5. Generation

Routes through `purpose: 'roadmap'` in `api/groq.js`, pinned to **Oracle** (`openai/gpt-oss-120b`)
— the largest-context (131K), largest-max-output (32,768-token) model Groq hosts, with native JSON
mode and tunable `reasoning_effort`. The roadmap is the one generation where all three matter at
once: the prompt carries a catalog shortlist plus a whole Portfolio, the answer is a year of
structured JSON, and getting the *sequencing* right is a reasoning problem, not a writing one.

Four passes, because one completion spends its output budget in order and arrives exhausted by the
third season:

| Pass | Calls | Produces |
|---|---|---|
| `strategy` | 1 | The year's thesis, four named seasons, the risks specific to this student |
| `selectSlate` | 1 | Which catalog entries, in which season, why each, with a fallback named for every reach |
| `deepen` | 1 **per near season** | Real preparation: ordered steps, what usually goes wrong, honest time cost |
| `review` | 1 | The verdict, what the plan is betting on, what it does not cover |

Only the **first two seasons** are deepened at build time. The back half of a year gets rewritten
by life, and spending two more expensive calls detailing next August is exactly the waste the
master plan's rolling window exists to avoid. `deepenSeason()` fills a later season in when the
student comes within eight weeks of it, so the roadmap keeps writing itself forward instead of
thinning out in month seven.

### Never fails silently

Every pass resolves to a complete result. A failed pass falls back to a **deterministic roadmap**
built purely from the scored catalog slate — genuinely usable (real programs, real dates, sensible
sequencing), missing only the personal reasoning. When that happens the roadmap is stamped
`generation.degraded` and the UI **says so and offers a retry**, rather than presenting the
fallback as Medabrain's best thinking. That failure mode — a plan that arrives suspiciously fast
and says the same generic things every time — is documented at length in
`src/lib/masterPlanGenerator.js` and is the reason this contract exists.

### The two API keys

`roadmap` is the only purpose with a two-key pool of its own, and students are pinned to a lane by
a hash of their user id rather than round-robined. Full reasoning in **GROQ_SETUP.md** — the short
version is that serverless instances share no counter, a four-call build must not straddle two
accounts, and a retry should land on the same key. The verify script simulates the hash over 4,000
ids and fails the build if the split drifts outside 42–58%.

---

## 6. How it plugs into the rest of the app

The Roadmap deliberately **does not keep its own calendar**. A student with two calendars has
none.

| Surface | Integration |
|---|---|
| **Portfolio → Milestones** | Open roadmap items become timeline events (`roadmapEvents` in `lib/timeline.js`), interleaved with the student's own dates and generated milestones, with a "From your roadmap" lens |
| **Home** | One card naming the single most urgent thing — nearly always something whose *preparation* starts now for a deadline months away, which the Plans card structurally cannot see |
| **Medabrain (coach + Portfolio specialist)** | `summarizeRoadmapForPrompt()` in every system prompt, including which dates may be stated flatly and which need a caveat |
| **Calendar export** | Unconfirmed items export as `TENTATIVE` with "(typical)" in the summary — the one context where nobody will ever see our on-screen caveat |
| **Plans tab** | Complementary, not competing: Plans is today, the Roadmap is the year. The Roadmap never schedules a day |

---

## 7. Files

```
src/data/roadmap/
  schema.js          Vocabularies, authoring rules, validateEntry, displaysExactDate, dateCaption
  anchors.js         Application / testing / aid / academic fixed calendar
  competitions.js    Dated competitions with registration windows
  programs.js        Summer + pipeline programs (applied for in winter — the big timing trap)
  awards.js          Scholarship cycles, sized to real writing lead time
  index.js           Assembly + defaults

src/lib/roadmap/
  catalog.js         Resolve → gate → score → roll. Dates and eligibility for one student
  intake.js          The thirteen questions, prefill, gates, prompt rendering
  generator.js       Four-pass generation, repair, deterministic fallback
  model.js           The document: shape, invariants, urgency, mutations, export, summaries
  store.js           Durable persistence (upgrade over local, never a dependency)

src/components/roadmap/
  RoadmapTab.jsx     The five views
  RoadmapIntake.jsx  Question-per-screen flow + review
  RoadmapItem.jsx    Collapsed row + expanded working detail
  RoadmapSpine.jsx   The year, drawn — load by preparation window
  RoadmapHomeCard.jsx
  roadmapUi.jsx      Shared vocabulary + <ItemDate>, the date-rendering chokepoint

api/roadmap.js                          Durable storage
api/groq.js                             'roadmap' purpose + two-key lane assignment
supabase/migrations/0015_roadmaps.sql   Table, revisions, save_roadmap RPC
scripts/verifyRoadmap.mjs               493 assertions, wired into `npm run build`
```

---

## 8. Adding to the catalog

Read the header of `src/data/roadmap/schema.js` first — it states the honesty rules in full. The
short version:

1. **Every entry is a real, independently verifiable program.** No invented names, organisations
   or URLs. If you cannot find the official page, the entry does not go in.
2. **`confidence` is not decoration.** It changes the sentence the student reads. Do not mark
   something `fixed` unless the institution genuinely sets the same date every year.
3. **No pay-to-attend prestige products** — the "leadership summits" that mail teenagers
   congratulatory nominations. Same line `src/data/opportunities.js` already draws.
4. **Amounts and cutoffs are ranges, never promises.**
5. **Grade-gate honestly.** A freshman shown a senior deadline learns only that this list is not
   about them.

Then run `npm run verify:roadmap`. It will tell you if the entry is malformed, if its cross-links
dangle, if it declares a gate the intake cannot answer, or if it has quietly emptied a track.
