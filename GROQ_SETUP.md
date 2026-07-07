# Metabrain 2.0 — Groq API Setup

Metabrain, the AI coach, is powered server-side by [Groq](https://console.groq.com) (free tier).
The API key is never exposed to the browser — all requests go through `/api/groq.js`.

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

| Tier   | Model                     | Used for                                              |
|--------|---------------------------|--------------------------------------------------------|
| `deep` | `llama-3.3-70b-versatile` | Coaching conversations, explanations, feedback         |
| `fast` | `llama-3.1-8b-instant`    | Lightweight/quick generation tasks                     |

Both are free-tier eligible on Groq. `llama-3.3-70b-versatile` gives noticeably better
reasoning and explanation quality for a tutoring use case, while `llama-3.1-8b-instant`
is reserved for cheaper, latency-sensitive calls.

## Branding note

The product-facing name for the coach is **"Metabrain 2.0."** This is fine to keep as your
own product name — you're not required to disclose the underlying model vendor in your UI.
To stay on the safe side of advertising law, avoid claiming you trained/built the model
yourselves; a line like "Metabrain is powered by large language model technology" (already
present in Settings/About) keeps things honest without undercutting the branding.

## Rate limits

`api/groq.js` applies its own conservative in-memory limits (20 requests/minute, 1200
requests/day per IP) to stay comfortably inside Groq's free-tier caps regardless of traffic.
