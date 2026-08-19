// Speech I/O for the live voice interview — the layer that actually talks to the browser.
//
// Two halves, both built on the browser-native Web Speech API (no network, no key, no vendor):
//   • Text-to-speech (speechSynthesis) — the interviewer's voice. This module does NOT decide how a
//     line should sound; that is voicePipeline.js (normalisation, clause segmentation, real pauses,
//     per-segment prosody) and interviewPanel.js (who is speaking, and in what register). What
//     happens here is the mechanical part: resolve each panellist to the closest real voice this
//     device ships, then walk the prosody plan segment by segment, inserting genuine silence at the
//     boundaries — Web Speech has no SSML, so a "pause" has to be a scheduled gap between two
//     utterances, which is exactly what speakPlan() does.
//   • Speech-to-text (SpeechRecognition) — the student answering out loud. Support is patchy (good
//     in Chrome/Edge, absent in Firefox and some mobile browsers), so every entry point degrades to
//     typing when it's missing — the interview works end to end without a mic.
//
// PRIVACY: SpeechRecognition in Chrome and Edge streams microphone audio to a cloud service. Our
// users are minors. Nothing in this module starts a recogniser on its own — the caller must gate it
// behind explicit consent (see components/VoiceConsentGate.jsx and docs/INTERVIEW_VOICE_PRIVACY.md).
// TTS is local on every platform we support and carries no such exposure.
//
// Everything here is defensive: unsupported APIs return no-ops/false instead of throwing, so the
// panel can feature-detect and adapt its UI.

import { planUtterance, addFilledPauses } from './voicePipeline';
import { PANEL, DEFAULT_PANEL_ID, FIRST_TIMER_PANEL_ID } from './interviewPanel';

// ── Text-to-speech ───────────────────────────────────────────────────────────

export function isTTSSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

let voicesCache = [];

// Voices load asynchronously in most browsers — getVoices() is often empty on first call and fills
// in after a 'voiceschanged' event. Resolve as soon as we have any, with a timeout so a browser
// that never fires the event (or has no voices) doesn't hang the caller forever.
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
    // Fallback: some engines populate lazily without ever firing the event.
    setTimeout(done, 1200);
  });
}

// macOS/iOS ships a pile of novelty and legacy-synth voices in the same getVoices() list as the
// real ones. These are exactly the "extremely unrealistic and scary" voices — they must never reach
// a panellist slot, not even as a last-resort fallback.
const EXCLUDED_VOICE = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|junior|organ|pipe|ralph|superstar|trinoids|whisper|wobble|zarvox|bruce|^fred\b|kathy|princess|grandma|grandpa|rocko|sandy|shelley|eddy|^flo\b|reed|novelty|eloquence|rishi|sangeeta|^agnes\b|^vicki\b|^victoria \(/i;

// A device may expose several variants of the same voice ("Ava", "Ava (Enhanced)", "Ava (Premium)").
// Always take the highest-fidelity one — the premium/enhanced/neural variants are the ones that
// actually sound like a person, and a low-fidelity variant is where the artifacts live.
function fidelityRank(v) {
  if (/premium/i.test(v.name)) return 0;
  if (/enhanced|neural|natural/i.test(v.name)) return 1;
  if (!v.localService) return 2; // network voices (Google/Microsoft online) beat legacy local ones
  return 3;
}

function usableVoices(list) {
  return (list || []).filter(v => /^en/i.test(v.lang || '') && !EXCLUDED_VOICE.test(v.name || ''));
}

// ── Panellist selection (persisted student preference) ──────────────────────
// We persist the panellist id, not a voiceURI: "Dr. Reyes, mid-career faculty" is the stable,
// human-meaningful choice and it re-resolves to whatever voice that device offers today, so a
// student who picks the dean on their laptop still gets the dean on their phone even though the
// underlying system voice differs.
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

// Resolve the panel against this device: each panellist claims the best unclaimed voice matching
// its preference list, so five labels never read the same voice. Panellists with nothing left fall
// back to any unused usable English voice; if even that runs out they are dropped, because a
// panellist with no voice is just a label.
export function getInterviewerVoices(voices) {
  const pool = usableVoices(voices && voices.length ? voices : voicesCache);
  if (!pool.length) return [];
  const claimed = new Set();

  const resolved = PANEL.map(p => {
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

/**
 * Who speaks when the student hasn't chosen.
 *
 * A first-timer gets the medical student: closest to their age, least formal, the gentlest room to
 * be in for someone who has never done this before. Anyone who has practised before gets the
 * mid-career faculty member, which is the realistic default. A saved explicit pick always wins.
 */
export function pickInterviewerVoice(voices, { firstTimer = false } = {}) {
  const options = getInterviewerVoices(voices);
  if (!options.length) return null;
  const savedId = getSavedVoiceId();
  if (savedId) {
    const saved = options.find(o => o.id === savedId);
    if (saved) return saved;
  }
  const wantedId = firstTimer ? FIRST_TIMER_PANEL_ID : DEFAULT_PANEL_ID;
  return options.find(o => o.id === wantedId) || options[0];
}

// ── Speaking a prosody plan ──────────────────────────────────────────────────

// One in-flight utterance chain at a time. Tracked at module scope so a barge-in can kill audio
// synchronously from anywhere without needing the cancel handle.
let activeChain = null;

/**
 * Speak `text` as the given panellist. Returns a cancel() function that silences the voice
 * immediately (the student's barge-in budget is 150ms; this is synchronous).
 *
 * Options:
 *   persona     – a resolved panellist from getInterviewerVoices(); supplies voice + prosody
 *   intent      – 'greeting' | 'question' | 'probe' | 'acknowledge' | 'closing' | 'feedback';
 *                 inferred from the text when omitted
 *   isFirstTurn – forces the greeting intent
 *   onStart / onEnd / onError – fire once for the whole passage, not per segment
 *   onSegment(i, segment)     – optional, for UI that wants to follow along
 */
export function speak(text, { persona, voice, rate, pitch, volume = 1, intent, isFirstTurn = false, onStart, onEnd, onError, onSegment } = {}) {
  if (!isTTSSupported() || !String(text || '').trim()) { onEnd?.(); return () => {}; }
  const synth = window.speechSynthesis;
  synth.cancel(); // never overlap with a previous line

  const p = persona || pickInterviewerVoice();
  // Filled pauses are a persona-level permission and are off for every panellist — see
  // interviewPanel.js. addFilledPauses() is a no-op unless a role-play actor is speaking.
  const source = addFilledPauses(String(text), { persona: p || {}, seedSalt: intent || '' });
  const plan = planUtterance(source, { persona: p || {}, intent, isFirstTurn });

  const chosen = voice || p?.voice || null;
  const chain = { cancelled: false, timers: [] };
  activeChain = chain;
  let started = false;

  const finish = () => {
    if (chain.cancelled) return;
    if (activeChain === chain) activeChain = null;
    onEnd?.();
  };

  function speakSegment(i) {
    if (chain.cancelled) return;
    const seg = plan.segments[i];
    if (!seg) { finish(); return; }
    onSegment?.(i, seg);

    const u = new window.SpeechSynthesisUtterance(seg.text);
    if (chosen) { u.voice = chosen; u.lang = chosen.lang || 'en-US'; }
    // Explicit overrides win over the plan; otherwise each segment carries its own rate and pitch,
    // which is what stops the delivery from being metronomic.
    u.rate = rate ?? seg.rate;
    u.pitch = pitch ?? seg.pitch;
    u.volume = volume;
    u.onstart = () => { if (!started) { started = true; onStart?.(); } };
    u.onerror = (e) => {
      if (chain.cancelled) return;
      // 'interrupted'/'canceled' are what a barge-in looks like from the engine's side — not errors.
      if (e?.error && /interrupt|cancel/i.test(e.error)) return;
      onError?.(e);
      finish();
    };
    u.onend = () => {
      if (chain.cancelled) return;
      const gap = seg.pauseAfter;
      if (!gap) { speakSegment(i + 1); return; }
      chain.timers.push(setTimeout(() => speakSegment(i + 1), gap));
    };
    try { synth.speak(u); } catch { finish(); }
  }

  if (!plan.segments.length) { onEnd?.(); return () => {}; }

  // The intent's lead-in: a probe sits for a moment before it lands, a greeting doesn't. This is
  // the beat that stops a hard question from arriving like a slap.
  if (plan.leadMs > 0) chain.timers.push(setTimeout(() => speakSegment(0), plan.leadMs));
  else speakSegment(0);

  return function cancel() {
    chain.cancelled = true;
    chain.timers.forEach(clearTimeout);
    chain.timers = [];
    if (activeChain === chain) activeChain = null;
    try { synth.cancel(); } catch { /* engine already torn down */ }
  };
}

/**
 * Silence the interviewer immediately, from anywhere. This is the barge-in path: the student
 * started talking, so the interviewer stops, synchronously, mid-word if necessary.
 */
export function cancelSpeech() {
  if (activeChain) {
    activeChain.cancelled = true;
    activeChain.timers.forEach(clearTimeout);
    activeChain = null;
  }
  if (isTTSSupported()) {
    try { window.speechSynthesis.cancel(); } catch { /* nothing playing */ }
  }
}

/**
 * A backchannel — "mm-hm" — spoken quietly WHILE the student is still talking. Deliberately not
 * routed through the prosody pipeline: it is one token, it should be quiet and quick, and it must
 * never cancel anything. Station-gated by backchannelPolicy() in interviewPanel.js, so the empathic
 * nurse educator does this and the dean chairing an ethics station never does.
 */
export function speakBackchannel(token, { persona, volume = 0.35 } = {}) {
  if (!isTTSSupported() || !token) return;
  try {
    const u = new window.SpeechSynthesisUtterance(token);
    const v = persona?.voice;
    if (v) { u.voice = v; u.lang = v.lang || 'en-US'; }
    u.rate = (persona?.rate ?? 1) * 1.05;
    u.pitch = (persona?.pitch ?? 1) * 1.02;
    u.volume = volume;
    window.speechSynthesis.speak(u); // no cancel() — this layers over nothing and interrupts nothing
  } catch { /* backchannels are a nicety; never let one break a turn */ }
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

/**
 * Whether this browser's recogniser ships the student's audio off-device. Chrome and Edge stream to
 * a cloud service; Safari does it on-device on recent versions. We cannot detect this reliably, so
 * we assume the privacy-worst case for any Chromium browser and tell the student so plainly rather
 * than guessing in our own favour. See docs/INTERVIEW_VOICE_PRIVACY.md.
 */
export function recognitionSendsAudioOffDevice() {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent || '';
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
  return !isSafari;
}

// ── Microphone consent ───────────────────────────────────────────────────────
// Voice answers are off until the student turns them on, and the ask happens before the browser's
// own permission prompt so they are deciding with the facts in front of them rather than deciding
// what a padlock icon means. This is not decoration: our users are minors, the audio is their
// voice, and on Chromium it goes to a third party. The simulator works end to end by typing, so
// "no" costs them nothing — which is what makes the consent real rather than coerced.
const CONSENT_KEY = 'msp_voice_input_consent';

export function getVoiceConsent() {
  try { return localStorage.getItem(CONSENT_KEY) || null; } catch { return null; } // 'granted' | 'declined' | null
}
export function setVoiceConsent(value) {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, value);
    else localStorage.removeItem(CONSENT_KEY);
  } catch { /* storage disabled — the student is simply asked again next session, which is the safe way to fail */ }
}
export function hasVoiceConsent() {
  return getVoiceConsent() === 'granted';
}

/**
 * Create a dictation recogniser for one answer. Continuous + interim results so the student sees
 * their words appear live and can speak in full paragraphs.
 *
 * `onSpeechStart` is what makes barge-in work: it fires the moment the engine detects speech, which
 * is the caller's cue to silence the interviewer. Endpointing is NOT done here — the recogniser's
 * own idea of when someone has finished is far too aggressive for a nervous teenager. The caller
 * drives createEndpointer() from turnTaking.js instead, and this recogniser just keeps listening.
 *
 * Returns { start, stop, abort } or null if unsupported.
 */
export function createRecognizer({ onResult, onSpeechStart, onEnd, onError, lang = 'en-US' } = {}) {
  const SR = getSpeechRecognition();
  if (!SR) return null;
  const rec = new SR();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = '';
  let announcedSpeech = false;

  rec.onspeechstart = () => { if (!announcedSpeech) { announcedSpeech = true; onSpeechStart?.(); } };
  rec.onresult = (e) => {
    // Some engines never fire onspeechstart; a first result is equally good proof of a barge-in.
    if (!announcedSpeech) { announcedSpeech = true; onSpeechStart?.(); }
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
    start() { finalText = ''; announcedSpeech = false; try { rec.start(); } catch { /* already started */ } },
    stop() { try { rec.stop(); } catch { /* not running */ } },
    abort() { try { rec.abort(); } catch { /* not running */ } },
  };
}
