# Medabrain — Groq API Setup

Medabrain is the AI "head brain" of the app, powered server-side by
[Groq](https://console.groq.com) (free tier). API keys are never exposed to the browser —
all requests go through `/api/groq.js`.

Note: flashcard generation does **not** use Groq (or any hosted model) — it runs
entirely offline in the browser. See "Flashcard generation" below.

## The Medabrain "brain" architecture (purpose-scoped keys)

Medabrain sits on top of several subsystems, each of which can have its **own dedicated Groq
account/key** so their traffic and free-tier rate limits don't compete, and so usage is
attributable per subsystem. Every request to `/api/groq.js` carries a `purpose`, which selects a
key pool and a cost-appropriate default model:

| `purpose`    | What it powers                                                        | Default model tier | Dedicated env var          |
|--------------|-------------------------------------------------------------------------|--------------------|-----------------------------|
| `coach`      | The head Medabrain chat coach (highest-volume, general purpose)       | Guide / auto       | *(shared pool)*             |
| `interview`  | The mock-interview simulator (spoken, conversational)                 | Guide              | `GROQ_API_KEY_INTERVIEW`    |
| `portfolio`  | Portfolio intelligence over a student's full application tracker      | Guide              | `GROQ_API_KEY_PORTFOLIO`    |
| `prep`       | In-context prep help (a question about the current lesson/quiz/video) | Scout (cheapest)   | `GROQ_API_KEY_PREP`         |
| `plan`       | The one-time onboarding "max-out plan" generation                     | Sage (best)        | `GROQ_API_KEY_PLAN`         |
| `masterplan` | The **Plans tab**'s full day-by-day roadmap generation (rare, heaviest)| Oracle (biggest)   | `GROQ_API_KEY_MASTERPLAN`   |

**Every purpose falls back to the shared Medabrain pool** (`GROQ_API_KEY` / `_2` / `_3`) when its
dedicated key isn't set — so the whole app works with a single key today, and simply gains more
headroom and cleaner per-subsystem attribution as you add dedicated keys. All dedicated keys are
optional.

### What to name the environment variables

Create these in Vercel → **Settings → Environment Variables** (or Coolify's Environment tab),
across **Production, Preview, Development**, then redeploy:

```
# Shared Medabrain head pool (required — at least GROQ_API_KEY) + failover
GROQ_API_KEY=gsk_...          # from your 1st Groq account
GROQ_API_KEY_2=gsk_...        # optional, 2nd account
GROQ_API_KEY_3=gsk_...        # optional, 3rd account

# Dedicated per-subsystem keys (all optional — each falls back to the shared pool above)
GROQ_API_KEY_INTERVIEW=gsk_...    # 4th account → interview simulator
GROQ_API_KEY_PORTFOLIO=gsk_...    # 5th account → portfolio tracker intelligence
GROQ_API_KEY_PREP=gsk_...         # 6th account → in-context prep help
GROQ_API_KEY_PLAN=gsk_...         # 7th account → onboarding max-out plan generation
GROQ_API_KEY_MASTERPLAN=gsk_...   # 8th account → Plans tab full day-by-day roadmap generation
```

Put the same values in a `.env.local` at the project root for local dev.

## 1. Get a free Groq API key (or several)

1. Sign up at https://console.groq.com
2. Go to **API Keys** → **Create API Key**
3. Copy the key (starts with `gsk_...`)

Optional but recommended: repeat this with up to **two more Groq accounts** (different emails —
e.g. a friend's account) to get additional keys. `api/groq.js` spreads requests across every key
you configure and automatically fails over from one to another if an account's rate limit is
hit — see "Multiple accounts, maximized usage" below.

## 2. Add it to your deployment

1. Open your project in the Vercel dashboard (or Coolify's Environment Variables tab for the
   self-hosted deployment — see the root `README.md` for how the two deployments differ)
2. Go to **Settings → Environment Variables**
3. Add:
   - **Name**: `GROQ_API_KEY`
   - **Value**: your key from step 1
   - **Environments**: Production, Preview, Development
4. If a second person made an account (e.g. a friend), also add:
   - **Name**: `GROQ_API_KEY_2`
   - **Value**: that account's key
5. If a third account exists, also add:
   - **Name**: `GROQ_API_KEY_3`
   - **Value**: that account's key
6. Redeploy for the variables to take effect

For local development, add the same value(s) to a `.env.local` file at the project root:

```
GROQ_API_KEY=gsk_your_first_key_here
GROQ_API_KEY_2=gsk_your_second_key_here
GROQ_API_KEY_3=gsk_your_third_key_here
```

## Multiple accounts, maximized usage

`GROQ_API_KEY_2` and `GROQ_API_KEY_3` are both entirely optional — Medabrain works fine with just one
key. When more than one is set, `api/groq.js` round-robins requests across every configured
account to spread load evenly, and if one account's key comes back rate-limited (or errors), the
same request automatically retries on the next key before failing — so a burst of traffic that
would have hit one account's free-tier ceiling can keep flowing on another account instead. Keys
are pooled globally across all 3 model tiers below (not locked one-key-per-tier), which is what
actually maximizes combined headroom. This is transparent to students; there's nothing to
configure client-side.

## Model tiers used — chosen automatically, not by the student

`api/groq.js` routes requests to one of three named tiers depending on the `tier` field in the
request body — the same idea as Claude's Haiku/Sonnet/Opus. Unlike a typical model switcher,
students never pick a tier themselves: `classifyCoachTier()` in `src/App.jsx` reads each message
and routes it automatically — short/simple asks get Scout, essay feedback/deep-strategy asks get
Sage, everything else gets Guide. The AI Coach header shows a small "Auto" badge with whichever
tier just answered, purely for transparency.

| Tier     | Model                     | Used for                                                          |
|----------|---------------------------|--------------------------------------------------------------------|
| `scout`  | `llama-3.1-8b-instant`    | Fastest — quick turns, lightweight generation                      |
| `guide`  | `openai/gpt-oss-20b`      | Balanced default — structured reasoning without 70B-model cost      |
| `sage`   | `llama-3.3-70b-versatile` | Deepest chat-facing reasoning — essay feedback, complex questions   |
| `oracle` | `openai/gpt-oss-120b`     | Server-side only — the Plans tab's full day-by-day roadmap          |

(`fast`/`deep` are still accepted as aliases for `scout`/`guide` for backwards compatibility.)

Scout and Guide are both cheap on Groq's pay-as-you-go pricing (`llama-3.1-8b-instant` ≈
$0.05/$0.08 per million input/output tokens; `openai/gpt-oss-20b` ≈ $0.075/$0.30) and get much
higher tokens-per-minute headroom than Sage's `llama-3.3-70b-versatile` (≈$0.59/$0.79) — which is
exactly why the classifier only routes to Sage for messages that actually look like they need it:
it's the most capable tier, but the priciest and most likely to hit Groq's TPM limits if it were
the default for every chat turn.

Oracle (`openai/gpt-oss-120b`) is never offered in the student-facing Scout/Guide/Sage picker —
it's reserved entirely for `purpose:'masterplan'`. It was chosen deliberately over Groq's other
options for that one job: a 131K-token context window with a **32,768-token max completion**
(vs. Kimi K2's 8,192-token cap — too small to hold a multi-week structured JSON plan in one
response), native support for `reasoning_effort` (run at `'high'` for the initial roadmap so the
model actually thinks before committing to a multi-month structure) and Groq's JSON-object
response mode (cheap insurance against malformed JSON on the largest generation in the app), at
$0.15/$0.75 per million input/output tokens — a fraction of Kimi K2's ~$1/$3. See
`src/lib/masterPlanGenerator.js` for the full generation architecture (roadmap + rolling
day-by-day window) and rationale.

## The Plans tab — the full day-by-day master plan

The Plans tab (`src/components/PlansTab.jsx`) is a permanent, always-available upgrade on the
onboarding "max-out plan" (`generatedPlan`, still shown on Home via `MyPlanCard`) — instead of one
short summary generated once, it's a genuinely deep, long-horizon roadmap the student can revisit,
check off, and keep extending.

- **Grounded in real resources, not invented ones.** `buildResourceCatalog()` feeds the model the
  student's actual pathway units/lessons, real quiz categories, flashcard deck categories, E-Library
  subjects, and every Portfolio tool by name — the model is instructed to never reference a
  resource outside that list.
- **Two-layer generation, not one giant blob.** `generateRoadmap()` makes one call for the durable
  "spine" (phases + a one-line theme for every week across the whole horizon), then
  `generateDayChunk()` makes small calls that explode only the *near-term* rolling window (a couple
  weeks at a time) into real day-by-day tasks. This keeps every individual call fast/reliable, keeps
  the stored plan small (the synced snapshot has a shared 2MB cap — see `api/progress-sync.js`), and
  means far-future days get planned once they're actually close, using up-to-date progress instead of
  a stale guess made months earlier.
- **Keeps planning itself.** `needsExtension()`/`extendMasterPlan()` roll the day-by-day window
  forward automatically as the student works through it (triggered client-side when the Plans tab is
  open and the window is running low) — this is the mechanism behind "it keeps extending itself,"
  not a background server job (there isn't one in this serverless architecture).
- **One brain, not two features.** `summarizePlanForCoach()` folds today's tasks and this week's
  theme into `buildCoachSystemPrompt()` (`src/lib/studentProfile.js`), so Scout, Guide, and Sage —
  whichever tier answers a given chat message — all know the same plan the Plans tab shows, without
  a separate integration per tier.

## Portfolio Meta Brain — the `purpose:'portfolio'` key finally in use

The `portfolio` purpose/key pool (table above) existed server-side in `api/groq.js` for a while
before anything on the client actually called it. It now powers three separate surfaces, all
routed exclusively through `purpose:'portfolio'` — none of them use the shared coach pool:

- **Ask Medabrain** (`src/components/PortfolioMedabrain.jsx`) — a slide-out panel reachable from
  a small pull-tab on the right edge of the Portfolio tab (desktop) or a floating button above the
  bottom nav (mobile). Self-contained: it fetches the student's full colleges/essays/deadlines/
  scholarships/activities/research/skills/clinical-hours/recommenders/test-scores/awards/GPA lists
  itself on open and grounds every answer in `buildPortfolioSystemPrompt()`
  (`src/lib/studentProfile.js`) — a deliberately more detailed prompt than the head coach's
  `buildCoachSystemPrompt`, since this surface exists specifically to reason over the full tracker
  rather than summary counts.
- **Scholarship database AI fallback** (`src/components/ScholarshipDatabase.jsx`, via
  `askPortfolioMedabrain()` in `App.jsx`) — when a search matches nothing in the curated database
  (`src/data/scholarships.js`), a button offers to ask Meta Brain from general knowledge, clearly
  labeled unverified/AI-generated in the UI rather than presented as a database result.
- **Deadlines priority summary** (`src/components/DeadlinesPanel.jsx`) — a short, cached
  (`src/lib/aiCache.js`, keyed per-day and per-list-shape) read on what's most urgent, grounded in
  the student's real upcoming deadlines list embedded directly in the prompt. The actual suggested
  *dates* come from `src/lib/autoDeadlines.js`, which is deliberately non-AI/deterministic (derived
  from college EA/ED/RD/aid dates and tracked scholarship deadlines already entered elsewhere in
  Portfolio, plus FAFSA's well-known Oct 1 opening and the AP/IB exam window) — a wrong date is a
  missed application, not a stylistic miss, so it's never left to a model to guess.

Lighter, template-based reactions after a student updates something in Portfolio (added a college,
logged clinical hours, etc.) are handled separately by `src/lib/medabrainComments.jsx` and are
**not** Groq calls — see the comment at the top of that file for why.

## Flashcard generation (no Groq, no network)

Flashcard decks are generated entirely client-side by `src/lib/noteFlashcardEngine.js`
(a multi-strategy extraction pipeline built on `compromise`, MIT-licensed, running
fully in the browser). There is no hosted/generative path for this feature anymore —
`api/flashcards.js` was removed, and `src/lib/aiFlashcards.js` calls the local engine
directly with no fetch, no API key, and no rate limit.

The engine only ever extracts facts already present in the notes you paste — it never
invents content — which is why "generate a deck about a topic with no source text" is
no longer offered: there is nothing to extract from. Paste notes, get a deck built from
exactly what's in them. FSRS (`ts-fsrs`, the open-source spaced-repetition algorithm Anki
uses by default) handles all scheduling downstream of generation, unchanged.

## Branding note

The product-facing name for the coach is **"Medabrain."** This is fine to keep as your
own product name — you're not required to disclose the underlying model vendor in your UI.
To stay on the safe side of advertising law, avoid claiming you trained/built the model
yourselves; a line like "Medabrain is powered by large language model technology" (already
present in Settings/About) keeps things honest without undercutting the branding. This
does not apply to flashcard generation, which is offline/extraction-based and should be
described as such (not as AI-generated).

## Rate limits

`api/groq.js` applies its own conservative in-memory limits (8 requests/minute, 300
requests/day per IP) to stay comfortably inside Groq's free-tier caps regardless of traffic —
per-account headroom that grows with each additional key configured (see above).
