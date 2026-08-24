// ─────────────────────────────────────────────────────────────────────────────
// The relief layer: a SECOND, independent AI provider behind Groq.
//
// ── The failure this exists to end ──────────────────────────────────────────
// Every generation in this app resolves rather than throws, which is the right
// contract — a student must never see a dead spinner. But the Roadmap made the
// cost of that contract visible: when Groq could not be reached, the roadmap
// still arrived, stamped `degraded`, carrying the sentence
//
//     "Medabrain could not be reached for part of this build, so some of it was
//      assembled from the deadline catalog rather than by judgment."
//
// That sentence is honest and it is also an admission that the product did not
// do the thing it exists to do. Retrying harder against Groq does not fix it:
// every retry in the roadmap generator, every key in the pool and every failover
// hop lives inside ONE vendor. A rate limit that covers the account covers all
// of them; an outage that covers the region covers all of them. The pool is deep
// and it is one point of failure.
//
// So there are two layers now, and they are deliberately different companies:
//
//   LAYER 1 — GROQ.    Primary for everything. Fastest, cheapest, and the one
//                      the model tiers (Scout/Guide/Sage/Oracle) are named for.
//                      Its own multi-key rotation and failover are unchanged.
//   LAYER 2 — RELIEF.  A different vendor entirely, reached ONLY when layer 1
//                      has exhausted every key it has. It is not load-balanced
//                      into normal traffic and it never sees a request Groq
//                      could have served, so a free tier lasts, and the bill on
//                      a paid one is a function of Groq's downtime rather than
//                      of our volume.
//
// ── Why this file is a registry rather than one hard-coded vendor ───────────
// Every provider worth putting here speaks the OpenAI chat-completions shape, so
// the difference between them is three strings (base URL, key, model id) and a
// note about which optional parameters they will reject. Encoding that as data
// means adding a provider is an env var, not a deploy — and, more importantly,
// it means the operator picks the second vendor. Whoever runs this instance may
// already have Cerebras credit, an OpenRouter account, or a Gemini key, and the
// right second provider is the one they can actually get a key for today.
//
// Configure ANY of these and the relief layer turns itself on:
//
//   CEREBRAS_API_KEY     — Cerebras Cloud. The closest match to Groq: same
//                          open-weight models (gpt-oss-120b, Llama 3.3 70B) at
//                          comparable speed, so a relief answer is not a worse
//                          answer, just a slower path to the same one.
//   OPENROUTER_API_KEY   — OpenRouter. The broadest catalog and the best
//                          single choice when you do not want to think about it:
//                          one key reaches every model named below.
//   TOGETHER_API_KEY     — Together AI. Same open-weight family again.
//   GEMINI_API_KEY       — Google Gemini through its OpenAI-compatible endpoint.
//                          The most different of the four, which is exactly what
//                          you want in a backup: a Gemini outage and a Groq
//                          outage have no common cause.
//   FALLBACK_AI_KEY + FALLBACK_AI_BASE_URL + FALLBACK_AI_MODEL
//                        — anything else OpenAI-compatible, including a private
//                          or self-hosted endpoint.
//
// With none of them set, nothing changes: `reliefProviders()` returns an empty
// array and every call path behaves exactly as it did before this file existed.
// The relief layer is an UPGRADE, never a dependency — the same contract
// api/roadmap.js holds itself to for durable storage.
//
// ── What a relief provider is NOT allowed to change ────────────────────────
// The date rule. A roadmap built on the relief provider is subject to the same
// catalog whitelist as one built on Groq: the model is handed catalog ids and
// its output is filtered against them (resolveSelection in
// src/lib/roadmap/generator.js). A second vendor widens who can be asked; it
// does not widen what may be believed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The tiers the app names its models by, mapped per provider.
 *
 * `oracle` is the one that matters here: the deep, large-output reasoning model
 * the roadmap and the master plan are built on. The others exist so a relief
 * hop from a chat turn lands on something proportionate rather than spending a
 * 120B call on a two-sentence answer.
 */
const PRESETS = [
  {
    id: 'cerebras',
    label: 'Cerebras',
    env: 'CEREBRAS_API_KEY',
    baseUrl: 'https://api.cerebras.ai/v1',
    models: {
      oracle: 'gpt-oss-120b',
      sage: 'llama-3.3-70b',
      guide: 'gpt-oss-120b',
      scout: 'llama3.1-8b',
    },
    // Cerebras accepts response_format json_object; it does not take Groq's
    // reasoning_effort on every model, and an unknown parameter is a 400 rather
    // than an ignored field — so it is dropped rather than forwarded.
    supports: { jsonMode: true, reasoningEffort: false },
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    env: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: {
      oracle: 'openai/gpt-oss-120b',
      sage: 'meta-llama/llama-3.3-70b-instruct',
      guide: 'openai/gpt-oss-20b',
      scout: 'meta-llama/llama-3.1-8b-instruct',
    },
    supports: { jsonMode: true, reasoningEffort: true },
    // OpenRouter asks callers to identify themselves; it is optional, and being
    // a good citizen on a service we only touch during someone else's outage
    // costs one header.
    headers: {
      'HTTP-Referer': 'https://medschoolprep.cloud',
      'X-Title': 'MedSchoolPrep',
    },
  },
  {
    id: 'together',
    label: 'Together',
    env: 'TOGETHER_API_KEY',
    baseUrl: 'https://api.together.xyz/v1',
    models: {
      oracle: 'openai/gpt-oss-120b',
      sage: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      guide: 'openai/gpt-oss-20b',
      scout: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    },
    supports: { jsonMode: true, reasoningEffort: false },
  },
  {
    id: 'gemini',
    label: 'Gemini',
    env: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: {
      oracle: 'gemini-2.5-pro',
      sage: 'gemini-2.5-pro',
      guide: 'gemini-2.5-flash',
      scout: 'gemini-2.5-flash-lite',
    },
    supports: { jsonMode: true, reasoningEffort: false },
  },
];

/** A fully custom endpoint, for operators whose second provider is none of the above. */
function customProvider() {
  const key = process.env.FALLBACK_AI_KEY;
  const baseUrl = process.env.FALLBACK_AI_BASE_URL;
  const model = process.env.FALLBACK_AI_MODEL;
  if (!key || !baseUrl || !model) return null;
  return {
    id: 'custom',
    label: process.env.FALLBACK_AI_LABEL || 'Reserve',
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey: key,
    models: {
      oracle: process.env.FALLBACK_AI_MODEL_ORACLE || model,
      sage: process.env.FALLBACK_AI_MODEL_SAGE || model,
      guide: process.env.FALLBACK_AI_MODEL_GUIDE || model,
      scout: process.env.FALLBACK_AI_MODEL_SCOUT || model,
    },
    // Unknown endpoint, so assume the smaller surface. A provider that does
    // support JSON mode loses nothing: the prompts all ask for JSON in words as
    // well, and parseLooseJSON on the client has always been the real guarantee.
    supports: { jsonMode: process.env.FALLBACK_AI_JSON_MODE !== 'false', reasoningEffort: false },
  };
}

/**
 * Every configured relief provider, in the order they will be tried.
 *
 * Order is preset order, then the custom endpoint last — a named preset means
 * the operator picked a vendor deliberately, while FALLBACK_AI_* is the generic
 * escape hatch and makes a sensible last resort.
 *
 * Recomputed per call rather than frozen at module load, because a serverless
 * instance can outlive an environment change and a cached empty list would keep
 * the relief layer switched off long after a key was added.
 */
export function reliefProviders() {
  const out = [];
  for (const preset of PRESETS) {
    const apiKey = process.env[preset.env];
    if (apiKey) out.push({ ...preset, apiKey });
  }
  const custom = customProvider();
  if (custom) out.push(custom);
  return out;
}

/** True when anything at all is configured behind Groq. Cheap enough to call anywhere. */
export const hasRelief = () => reliefProviders().length > 0;

/**
 * One chat completion against one relief provider.
 *
 * Returns the same `{ response, data }` shape api/groq.js's callGroqOnce does,
 * so the handler's existing error handling reads it without a translation
 * layer. Never throws for an HTTP error — only for an abort, which the caller
 * already distinguishes.
 *
 * @param {object}   provider     one entry from reliefProviders()
 * @param {string}   tier         'oracle' | 'sage' | 'guide' | 'scout'
 * @param {object[]} messages     OpenAI-shaped messages, already sanitized
 * @param {object}   opts         maxTokens, temperature, jsonMode, reasoningEffort
 * @param {number}   timeoutMs
 */
export async function callRelief(provider, tier, messages, opts, timeoutMs) {
  const model = provider.models[tier] || provider.models.guide || provider.models.oracle;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
        ...(provider.headers || {}),
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        // Optional parameters are forwarded only where the provider is known to
        // accept them. An unknown field is a 400 on most of these endpoints, and
        // a 400 during someone else's outage is the worst possible time to
        // discover a parameter was not portable.
        ...(opts.jsonMode && provider.supports.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        ...(opts.reasoningEffort && provider.supports.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
      }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return { response, data, model, providerId: provider.id, providerLabel: provider.label };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Walk every configured relief provider until one answers.
 *
 * `extract` is passed in rather than duplicated here so the relief path and the
 * Groq path agree, to the character, about what counts as a usable response —
 * including the reasoning-model quirk where the answer arrives in `reasoning`
 * with `content` empty. A relief hop that "succeeded" into an empty string and
 * then fell through to the deterministic roadmap would be the original bug with
 * more steps.
 *
 * Returns null when nothing is configured or nothing answered, which the caller
 * treats exactly as it treated a failed Groq call before this existed.
 */
export async function callWithRelief({ tier, messages, opts, timeoutMs, extract, onAttempt }) {
  for (const provider of reliefProviders()) {
    try {
      const result = await callRelief(provider, tier, messages, opts, timeoutMs);
      const content = extract(result.data?.choices?.[0]?.message);
      if (result.response.ok && content) {
        return { content, model: result.data?.model || result.model, providerId: provider.id, providerLabel: provider.label };
      }
      onAttempt?.(provider.id, result.response.ok ? 'empty response' : `HTTP ${result.response.status}`);
    } catch (err) {
      onAttempt?.(provider.id, err?.name === 'AbortError' ? 'timeout' : (err?.message || 'network error'));
    }
  }
  return null;
}
