# Metabrain 2.0 — Groq API Setup

Metabrain, the AI coach, is powered server-side by [Groq](https://console.groq.com) (free tier).
The API key is never exposed to the browser — all requests go through `/api/groq.js`.

Note: flashcard generation does **not** use Groq (or any hosted model) — it runs
entirely offline in the browser. See "Flashcard generation" below.

## 1. Get a free Groq API key

1. Sign up at https://console.groq.com
2. Go to **API Keys** → **Create API Key**
3. Copy the key (starts with `gsk_...`)

## 2. Add it to Vercel

1. Open your project in the Vercel dashboard
2. Go to **Settings → Environment Variables**
3. Add:
   - **Name**: `GROQ_API_KEY`
   - **Value**: your key from step 1
   - **Environments**: Production, Preview, Development
4. Redeploy for the variable to take effect

For local development, add the same value to a `.env.local` file at the project root:

```
GROQ_API_KEY=gsk_your_key_here
```

## Models used

`api/groq.js` routes requests to two models depending on the `tier` field in the request body:

| Tier   | Model                  | Used for                                              |
|--------|------------------------|--------------------------------------------------------|
| `deep` | `openai/gpt-oss-20b`   | Tasks that benefit from stronger reasoning/structure   |
| `fast` | `llama-3.1-8b-instant` | Main chat coach + lightweight/quick generation tasks   |

Both are cheap on Groq's pay-as-you-go pricing (`llama-3.1-8b-instant` ≈ $0.05/$0.08
per million input/output tokens; `openai/gpt-oss-20b` ≈ $0.075/$0.30) and get much
higher tokens-per-minute headroom than `llama-3.3-70b-versatile` (≈$0.59/$0.79), which
was the previous default for the main chat coach and was the main driver of hitting
Groq's TPM limits quickly. The main chat coach now uses the `fast` tier since it's the
highest-volume call in the app; `deep` is kept for tasks where the extra
structure/reasoning of a 20B MoE model helps.

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

The product-facing name for the coach is **"Metabrain 2.0."** This is fine to keep as your
own product name — you're not required to disclose the underlying model vendor in your UI.
To stay on the safe side of advertising law, avoid claiming you trained/built the model
yourselves; a line like "Metabrain is powered by large language model technology" (already
present in Settings/About) keeps things honest without undercutting the branding. This
does not apply to flashcard generation, which is offline/extraction-based and should be
described as such (not as AI-generated).

## Rate limits

`api/groq.js` applies its own conservative in-memory limits (20 requests/minute, 1200
requests/day per IP) to stay comfortably inside Groq's free-tier caps regardless of traffic.
