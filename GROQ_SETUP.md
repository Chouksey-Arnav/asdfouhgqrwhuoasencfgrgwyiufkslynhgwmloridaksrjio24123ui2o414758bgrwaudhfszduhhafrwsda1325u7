# Axio — Groq API Setup

Axio, the AI coach, is powered server-side by [Groq](https://console.groq.com) (free tier).
The API key is never exposed to the browser — all requests go through `/api/groq.js`.

Note: flashcard generation does **not** use Groq (or any hosted model) — it runs
entirely offline in the browser. See "Flashcard generation" below.

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

`GROQ_API_KEY_2` and `GROQ_API_KEY_3` are both entirely optional — Axio works fine with just one
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

| Tier    | Model                     | Used for                                                        |
|---------|---------------------------|------------------------------------------------------------------|
| `scout` | `llama-3.1-8b-instant`    | Fastest — quick turns, lightweight generation                    |
| `guide` | `openai/gpt-oss-20b`      | Balanced default — structured reasoning without 70B-model cost    |
| `sage`  | `llama-3.3-70b-versatile` | Deepest reasoning — essay feedback, complex pathway questions     |

(`fast`/`deep` are still accepted as aliases for `scout`/`guide` for backwards compatibility.)

Scout and Guide are both cheap on Groq's pay-as-you-go pricing (`llama-3.1-8b-instant` ≈
$0.05/$0.08 per million input/output tokens; `openai/gpt-oss-20b` ≈ $0.075/$0.30) and get much
higher tokens-per-minute headroom than Sage's `llama-3.3-70b-versatile` (≈$0.59/$0.79) — which is
exactly why the classifier only routes to Sage for messages that actually look like they need it:
it's the most capable tier, but the priciest and most likely to hit Groq's TPM limits if it were
the default for every chat turn.

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

The product-facing name for the coach is **"Axio."** This is fine to keep as your
own product name — you're not required to disclose the underlying model vendor in your UI.
To stay on the safe side of advertising law, avoid claiming you trained/built the model
yourselves; a line like "Axio is powered by large language model technology" (already
present in Settings/About) keeps things honest without undercutting the branding. This
does not apply to flashcard generation, which is offline/extraction-based and should be
described as such (not as AI-generated).

## Rate limits

`api/groq.js` applies its own conservative in-memory limits (8 requests/minute, 300
requests/day per IP) to stay comfortably inside Groq's free-tier caps regardless of traffic —
per-account headroom that grows with each additional key configured (see above).
