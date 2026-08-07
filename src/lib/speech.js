// Web Speech API helpers for the live voice interview simulator.
//
// Two halves, both built on the browser-native Web Speech API (no network, no key):
//   • Text-to-speech (speechSynthesis) — the interviewer's *voice*. Rather than exposing the
//     device's raw voice catalog (which on macOS/iOS is mostly novelty junk — Zarvox, Deranged,
//     Bahh, Whisper — and on every platform is a long random list), we publish a fixed roster of
//     five interviewer personas, Apple-Voices style: a short named lineup, each resolved to the
//     best real voice that device actually ships, and tuned to a natural, professional cadence.
//     See INTERVIEWER_PERSONAS below.
//   • Speech-to-text (SpeechRecognition) — the student answering out loud. Support is patchy
//     (great in Chrome/Edge, absent in Firefox and some mobile browsers), so every entry point
//     degrades to typing when it's missing — the interview still works end to end without a mic.
//
// Everything here is defensive: unsupported APIs return no-ops/false instead of throwing, so the
// panel can feature-detect and adapt its UI.

// ── Text-to-speech ───────────────────────────────────────────────────────────

export function isTTSSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

let voicesCache = [];

// Voices load asynchronously in most browsers — getVoices() is often empty on first call and
// fills in after a 'voiceschanged' event. Resolve as soon as we have any, with a timeout so a
// browser that never fires the event (or has no voices) doesn't hang the caller forever.
export function loadVoices() {
  return new Promise((resolve) => {
    if (!isTTSSupported()) return resolve([]);
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing && existing.length) { voicesCache = existing; return resolve(existing); }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      voicesCache = synth.getVoices() || [];
      resolve(voicesCache);
    };
    synth.addEventListener?.('voiceschanged', done, { once: true });
    // Fallbacks: some engines populate lazily without ever firing the event.
    setTimeout(done, 1200);
  });
}

// ── The interviewer voice roster ─────────────────────────────────────────────
// Five personas, fixed, in this order — the whole point is that the student sees a short,
// human, professional lineup instead of forty raw system voices with names like "Zarvox" and
// "Bahh". Each persona is a *slot*: `prefer` is an ordered list of real voice-name patterns,
// best first, and the slot resolves to the first one the device actually has. Personas claim
// voices in roster order and never share one, so on a device with only a handful of usable
// voices you get fewer personas rather than five labels reading the same voice.
//
// rate/pitch are deliberately close to neutral. The old defaults (rate 0.94, pitch 1.02) were
// the "unrealistic and scary" part as much as the voice list was: slowed-down, pitched-up
// speech synthesis lands uncanny, not warm. Real assistant voices speak at roughly natural
// conversational tempo, so these sit in a narrow 0.96–1.02 band and differ only enough to give
// each persona its own character.
export const INTERVIEWER_PERSONAS = [
  {
    id: 'ava',
    label: 'Ava',
    role: 'Warm & measured',
    blurb: 'Even, unhurried, puts you at ease. The default.',
    rate: 0.99, pitch: 1.0,
    prefer: [/^ava\b/i, /^samantha\b/i, /^allison\b/i, /^joanna\b/i, /aria/i, /jenny/i, /google us english$/i, /^zira\b/i],
  },
  {
    id: 'evan',
    label: 'Evan',
    role: 'Calm & professional',
    blurb: 'Steady and matter-of-fact, like a faculty interviewer.',
    rate: 0.98, pitch: 0.98,
    prefer: [/^evan\b/i, /^tom\b/i, /^nathan\b/i, /^aaron\b/i, /^alex\b/i, /^matthew\b/i, /\bguy\b/i, /andrew/i, /christopher/i, /^david\b/i, /^mark\b/i],
  },
  {
    id: 'serena',
    label: 'Serena',
    role: 'Crisp & polished',
    blurb: 'Precise British delivery — formal without being cold.',
    rate: 1.0, pitch: 1.0,
    prefer: [/^serena\b/i, /^stephanie\b/i, /^kate\b/i, /google uk english female/i, /sonia/i, /libby/i, /^hazel\b/i, /^fiona\b/i, /^moira\b/i, /^tessa\b/i],
  },
  {
    id: 'daniel',
    label: 'Daniel',
    role: 'Composed & formal',
    blurb: 'Lower, deliberate, a touch more senior in the room.',
    rate: 0.96, pitch: 0.96,
    prefer: [/^daniel\b/i, /^oliver\b/i, /^arthur\b/i, /google uk english male/i, /^ryan\b/i, /^george\b/i, /^brian\b/i],
  },
  {
    id: 'nicky',
    label: 'Nicky',
    role: 'Bright & conversational',
    blurb: 'Lighter and quicker — feels like a friendly alum.',
    rate: 1.02, pitch: 1.02,
    prefer: [/^nicky\b/i, /^susan\b/i, /^zoe\b/i, /^joelle\b/i, /^karen\b/i, /^victoria\b/i, /michelle/i, /^ana\b/i, /natasha/i],
  },
];

// macOS/iOS ships a pile of novelty and legacy-synth voices in the same getVoices() list as the
// real ones. These are exactly the "extremely unrealistic and scary" voices — they must never
// reach a persona slot, not even as a last-resort fallback.
const EXCLUDED_VOICE = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|junior|organ|pipe|ralph|superstar|trinoids|whisper|wobble|zarvox|bruce|^fred\b|kathy|princess|grandma|grandpa|rocko|sandy|shelley|eddy|^flo\b|reed|novelty|eloquence|rishi|sangeeta|^agnes\b|^vicki\b|^victoria \(/i;

// Within a persona's preference list, a device may expose several variants of the same voice
// ("Ava", "Ava (Enhanced)", "Ava (Premium)"). Always take the highest-fidelity one — the
// premium/enhanced/neural variants are the ones that actually sound human.
function fidelityRank(v) {
  if (/premium/i.test(v.name)) return 0;
  if (/enhanced|neural|natural/i.test(v.name)) return 1;
  if (!v.localService) return 2; // network voices (Google/Microsoft online) beat legacy local ones
  return 3;
}

function usableVoices(list) {
  return (list || []).filter(v => /^en/i.test(v.lang || '') && !EXCLUDED_VOICE.test(v.name || ''));
}

// ── Voice selection (persisted student preference) ──────────────────────────
// We persist the persona id, not a voiceURI: the persona is the stable, human-meaningful choice
// ("Ava") and it re-resolves to whatever that device offers today, so a student who picks Ava on
// their laptop still gets the Ava slot on their phone even though the underlying system voice
// differs.
const VOICE_PREF_KEY = 'msp_interviewer_voice_id';

export function getSavedVoiceId() {
  try { return localStorage.getItem(VOICE_PREF_KEY) || null; } catch { return null; }
}
export function setSavedVoiceId(id) {
  try {
    if (id) localStorage.setItem(VOICE_PREF_KEY, id);
    else localStorage.removeItem(VOICE_PREF_KEY);
  } catch { /* private browsing / storage disabled — preference just won't persist */ }
}

// Resolve the roster against this device: returns at most five options, each a persona with a
// real `voice` attached. Personas whose preferred voices aren't present fall back to any unused
// usable English voice; personas with nothing left are dropped entirely.
export function getInterviewerVoices(voices) {
  const pool = usableVoices(voices && voices.length ? voices : voicesCache);
  if (!pool.length) return [];
  const claimed = new Set();

  const resolved = INTERVIEWER_PERSONAS.map(p => {
    for (const pattern of p.prefer) {
      const matches = pool
        .filter(v => !claimed.has(v.voiceURI) && pattern.test(v.name))
        .sort((a, b) => fidelityRank(a) - fidelityRank(b));
      if (matches.length) {
        claimed.add(matches[0].voiceURI);
        return { ...p, voice: matches[0] };
      }
    }
    return { ...p, voice: null };
  });

  // Second pass: hand unresolved personas whatever good voices are left over, best first, so a
  // device with generic voice names ("English United States") still offers a few real choices.
  const leftovers = pool
    .filter(v => !claimed.has(v.voiceURI))
    .sort((a, b) => fidelityRank(a) - fidelityRank(b));
  for (const r of resolved) {
    if (r.voice) continue;
    const next = leftovers.shift();
    if (next) { r.voice = next; claimed.add(next.voiceURI); }
  }

  return resolved.filter(r => r.voice);
}

// The persona to use when the student hasn't chosen: their saved pick if it still resolves,
// otherwise the top of the roster.
export function pickInterviewerVoice(voices) {
  const options = getInterviewerVoices(voices);
  if (!options.length) return null;
  const savedId = getSavedVoiceId();
  return options.find(o => o.id === savedId) || options[0];
}

// Group sentences into utterances of up to ~180 characters. Chunking is still necessary (Chrome
// truncates long utterances, and it lets a cancel land quickly), but the old one-utterance-per-
// sentence split inserted an audible gap after every single sentence, which is a big part of why
// the interviewer sounded stilted. Grouping keeps the natural prosody inside a thought.
function chunkText(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]*/g) || [clean];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if (current && current.length + piece.length + 1 > 180) { chunks.push(current); current = piece; }
    else current = current ? `${current} ${piece}` : piece;
  }
  if (current) chunks.push(current);
  return chunks;
}

// Speak `text` in the interviewer voice. Returns a cancel() function. `onStart`/`onEnd` fire once
// for the whole passage (not per chunk). Pass `persona` (a resolved option from
// getInterviewerVoices) and its voice + tuning are used; explicit voice/rate/pitch still win.
export function speak(text, { persona, voice, rate, pitch, volume = 1, onStart, onEnd, onError } = {}) {
  if (!isTTSSupported() || !String(text || '').trim()) { onEnd?.(); return () => {}; }
  const synth = window.speechSynthesis;
  synth.cancel(); // never overlap with a previous line

  const chunks = chunkText(text);
  const p = persona || pickInterviewerVoice();
  const chosen = voice || p?.voice || null;
  const finalRate = rate ?? p?.rate ?? 1;
  const finalPitch = pitch ?? p?.pitch ?? 1;
  let cancelled = false;
  let started = false;

  chunks.forEach((chunk, i) => {
    const u = new window.SpeechSynthesisUtterance(chunk);
    if (chosen) { u.voice = chosen; u.lang = chosen.lang || 'en-US'; }
    u.rate = finalRate; u.pitch = finalPitch; u.volume = volume;
    u.onstart = () => { if (!started) { started = true; onStart?.(); } };
    u.onerror = (e) => { if (!cancelled) onError?.(e); };
    if (i === chunks.length - 1) u.onend = () => { if (!cancelled) onEnd?.(); };
    synth.speak(u);
  });

  if (!chunks.length) onEnd?.();

  return function cancel() {
    cancelled = true;
    synth.cancel();
  };
}

export function cancelSpeech() {
  if (isTTSSupported()) window.speechSynthesis.cancel();
}

// ── Speech-to-text ───────────────────────────────────────────────────────────

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return typeof SR === 'function' ? SR : null;
}

export function isSTTSupported() {
  return !!getSpeechRecognition();
}

// Create a dictation recognizer for one answer. Continuous + interim results so the student sees
// their words appear live and can speak in full paragraphs. Returns { start, stop, abort } or null
// if unsupported.
//   onResult(fullTranscript, isFinal) — called on every update with the best-guess transcript
//   onEnd()   — recognition stopped (naturally or via stop())
//   onError(err) — recoverable errors are surfaced; 'no-speech'/'aborted' are passed through too
export function createRecognizer({ onResult, onEnd, onError, lang = 'en-US' } = {}) {
  const SR = getSpeechRecognition();
  if (!SR) return null;
  const rec = new SR();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t + ' ';
      else interim += t;
    }
    onResult?.((finalText + interim).trim(), !interim);
  };
  rec.onerror = (e) => onError?.(e);
  rec.onend = () => onEnd?.();

  return {
    start() { finalText = ''; try { rec.start(); } catch { /* already started */ } },
    stop() { try { rec.stop(); } catch { /* not running */ } },
    abort() { try { rec.abort(); } catch { /* not running */ } },
  };
}
