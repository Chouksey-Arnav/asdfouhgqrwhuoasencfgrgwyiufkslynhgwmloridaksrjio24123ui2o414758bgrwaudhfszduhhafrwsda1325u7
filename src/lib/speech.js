// Web Speech API helpers for the live voice interview simulator.
//
// Two halves, both built on the browser-native Web Speech API (no network, no key):
//   • Text-to-speech (speechSynthesis) — the interviewer's *voice*. We pick the most natural
//     English voice the device offers and tune rate/pitch so it lands warm and unhurried
//     ("soothing") rather than robotic. The catalogue of voices is whatever the OS/browser ships;
//     we can't bundle a custom voice, so the win is careful selection + tuning + sentence-by-
//     sentence chunking (long single utterances cut off in some engines).
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

// Rank the available voices for a warm, natural, female-leaning admissions-interviewer feel.
// These are the well-known "good" Web Speech voices across macOS/iOS/Windows/Chrome; we match by
// name so we get the best one present and fall back gracefully down the list, finally to any
// en-* voice, finally to whatever exists.
const PREFERRED_VOICES = [
  'Google UK English Female',
  'Google US English',
  'Samantha',            // macOS/iOS — notably natural
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Zira',
  'Karen', 'Moira', 'Tessa', 'Serena', // other natural Apple voices
  'Google español',
];

export function pickInterviewerVoice(voices) {
  const list = voices && voices.length ? voices : voicesCache;
  if (!list || !list.length) return null;
  for (const name of PREFERRED_VOICES) {
    const hit = list.find(v => v.name === name);
    if (hit) return hit;
  }
  // Prefer any local en-US/en-GB voice, then any English voice, then anything.
  return (
    list.find(v => /^en[-_](US|GB)/i.test(v.lang) && v.localService) ||
    list.find(v => /^en[-_](US|GB)/i.test(v.lang)) ||
    list.find(v => /^en/i.test(v.lang)) ||
    list[0]
  );
}

// Split into sentence-sized chunks and queue them. Long utterances get truncated by some TTS
// engines (notably Chrome's ~200-char soft limit), and chunking also gives smoother pacing and
// lets a cancel take effect between sentences.
function chunkText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[^.!?]+[.!?]*/g) || [String(text || '')];
}

// Speak `text` in the interviewer voice. Returns a cancel() function. `onStart`/`onEnd` fire once
// for the whole passage (not per chunk). Tuned rate/pitch = unhurried and warm.
export function speak(text, { voice, rate = 0.94, pitch = 1.02, volume = 1, onStart, onEnd, onError } = {}) {
  if (!isTTSSupported() || !String(text || '').trim()) { onEnd?.(); return () => {}; }
  const synth = window.speechSynthesis;
  synth.cancel(); // never overlap with a previous line

  const chunks = chunkText(text);
  const chosen = voice || pickInterviewerVoice();
  let cancelled = false;
  let started = false;

  chunks.forEach((chunk, i) => {
    const u = new window.SpeechSynthesisUtterance(chunk.trim());
    if (chosen) { u.voice = chosen; u.lang = chosen.lang || 'en-US'; }
    u.rate = rate; u.pitch = pitch; u.volume = volume;
    u.onstart = () => { if (!started) { started = true; onStart?.(); } };
    u.onerror = (e) => { if (!cancelled) onError?.(e); };
    if (i === chunks.length - 1) u.onend = () => { if (!cancelled) onEnd?.(); };
    synth.speak(u);
  });

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
