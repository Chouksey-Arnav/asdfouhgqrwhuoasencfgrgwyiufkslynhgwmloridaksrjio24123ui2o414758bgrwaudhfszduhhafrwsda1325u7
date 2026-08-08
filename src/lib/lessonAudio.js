// ─────────────────────────────────────────────────────────────────────────────
// Listen-to-the-lesson: turning a lesson article into narratable audio.
//
// Why this exists: every Learning Pathway lesson was text-only, which quietly
// excluded the single biggest chunk of a high schooler's free time — the bus,
// the walk, the drive, the dishes. Reading requires eyes and a still body;
// listening requires neither. This module is the text side of that fix (the
// player UI lives in components/LessonAudioPlayer.jsx).
//
// Everything here is pure and browser-agnostic apart from the two tiny
// localStorage preference helpers, so the narration text can be unit-tested
// and audited by scripts/verifyLessonDelivery.mjs without a DOM.
//
// It deliberately builds on src/lib/speech.js rather than adding a second TTS
// stack: the Web Speech API is already wired up there (voice roster, chunking,
// cancel semantics) for the interview simulator, it needs no API key, no
// network round trip and no per-character cost, and it works offline. If we
// ever move to a hosted neural-TTS vendor, the segment list this module
// produces is exactly the payload that would get sent — the player only ever
// talks to `speakSegment`, so the swap is one function deep.
// ─────────────────────────────────────────────────────────────────────────────
import { speak, getInterviewerVoices, isTTSSupported } from './speech.js';

// ── Segment model ────────────────────────────────────────────────────────────
// A narration is an ordered list of segments. Segment granularity is one
// heading or one paragraph — not one sentence — because that is the unit a
// listener actually wants to skip back to ("replay that paragraph"), and it is
// also the unit the on-screen article is laid out in, so the reader can follow
// along with the spoken position highlighted.
//
//   { key, kind, text, sectionIdx }
//     kind: 'title' | 'heading' | 'body' | 'takeaways' | 'takeaway'
//     sectionIdx: index into article.sections for heading/body segments, so the
//                 player can tell HighlightableArticle which block is speaking.
//                 null for the title and key-takeaway segments.

// Spoken text is not written text. Screen-readable shorthand ("e.g.", "vs.",
// "~", "&") either gets spelled out letter-by-letter or swallowed entirely by
// speech engines, and an em dash with no surrounding pause makes two clauses
// run together. These substitutions are the difference between "sounds like a
// person reading" and "sounds like a screen reader".
const SPOKEN_REPLACEMENTS = [
  [/\be\.g\.\s*/gi, 'for example, '],
  [/\bi\.e\.\s*/gi, 'that is, '],
  [/\betc\.\s*/gi, 'and so on. '],
  [/\bvs\.?\s/gi, 'versus '],
  [/\bapprox\.\s*/gi, 'approximately '],
  [/\bDr\.\s*/g, 'Doctor '],
  [/\bMr\.\s*/g, 'Mister '],
  [/\bMs\.\s*/g, 'Miss '],
  [/\bMrs\.\s*/g, 'Missus '],
  [/&/g, ' and '],
  [/~/g, 'about '],
  [/\+/g, ' plus '],
  [/(\d)\s*%/g, '$1 percent'],
  [/(\d)\s*\/\s*(\d)/g, '$1 out of $2'],
  // Em/en dashes and slashes read as run-on text; a comma buys a real breath.
  [/\s*[—–]\s*/g, ', '],
  [/([a-z])\/([a-z])/gi, '$1, $2'],
  // Parentheticals are asides — a comma on each side keeps the prosody sane.
  [/\s*\(\s*/g, ', '],
  [/\s*\)\s*/g, ', '],
  [/["“”'']/g, ''],
];

/** Normalize authored article prose into something a speech engine reads well. */
export function speechText(raw) {
  let out = String(raw || '').replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of SPOKEN_REPLACEMENTS) out = out.replace(pattern, replacement);
  return out
    .replace(/\s+([,.!?])/g, '$1')   // no space before punctuation
    .replace(/,\s*,/g, ',')          // collapse the doubles the rules above can create
    .replace(/,\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Flatten a lesson's article into an ordered narration script.
 * @param {object} content  LESSON_CONTENT[lessonId]
 * @param {string} title    Lesson title, read as the opening line.
 */
export function buildArticleSegments(content, title = '') {
  const sections = content?.article?.sections || [];
  const takeaways = content?.article?.keyTakeaways || [];
  const segments = [];
  if (title) segments.push({ key: 'title', kind: 'title', text: speechText(title), sectionIdx: null });
  sections.forEach((sec, i) => {
    if (sec?.heading) segments.push({ key: `h${i}`, kind: 'heading', text: speechText(sec.heading), sectionIdx: i });
    if (sec?.body) segments.push({ key: `b${i}`, kind: 'body', text: speechText(sec.body), sectionIdx: i });
  });
  if (takeaways.length) {
    segments.push({ key: 'kt', kind: 'takeaways', text: 'Key takeaways.', sectionIdx: null });
    takeaways.forEach((t, i) => segments.push({ key: `kt${i}`, kind: 'takeaway', text: speechText(t), sectionIdx: null }));
  }
  return segments.filter(s => s.text);
}

// Rough spoken length, used for the "about 7 min listen" label. 165 wpm is the
// middle of the natural-speech range and matches how these voices land at 1x.
const WORDS_PER_MINUTE = 165;

export function estimateListenSeconds(segments, rate = 1) {
  const words = segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  // Each segment boundary costs a short breath, which is audible over 30+ of them.
  const pauses = segments.length * 0.35;
  return Math.round(((words / WORDS_PER_MINUTE) * 60) / (rate || 1) + pauses);
}

export function formatListenLength(seconds) {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min listen`;
}

// ── Playback preferences ─────────────────────────────────────────────────────
// Speed and narrator are remembered across lessons: a student who listens at
// 1.5x once wants 1.5x every time, and re-picking it per lesson is friction
// that shows up on every single article.
export const AUDIO_RATES = [0.8, 1, 1.25, 1.5, 1.75];
const RATE_KEY = 'msp_lesson_audio_rate';
const NARRATOR_KEY = 'msp_lesson_audio_voice';

export function getSavedRate() {
  try {
    const v = parseFloat(localStorage.getItem(RATE_KEY));
    return AUDIO_RATES.includes(v) ? v : 1;
  } catch { return 1; }
}
export function setSavedRate(rate) {
  try { localStorage.setItem(RATE_KEY, String(rate)); } catch { /* storage disabled */ }
}
export function getSavedNarratorId() {
  try { return localStorage.getItem(NARRATOR_KEY) || null; } catch { return null; }
}
export function setSavedNarratorId(id) {
  try {
    if (id) localStorage.setItem(NARRATOR_KEY, id);
    else localStorage.removeItem(NARRATOR_KEY);
  } catch { /* storage disabled */ }
}

/**
 * The narrator roster for lessons. Same resolved persona slots the interview
 * simulator uses (a device only has so many good voices), but the *choice* is
 * stored separately — the voice you want reading you a biology article at 1.5x
 * is not necessarily the one you want conducting a mock interview.
 */
export function getNarratorVoices(voices) {
  return getInterviewerVoices(voices);
}

export function pickNarrator(options) {
  if (!options?.length) return null;
  const saved = getSavedNarratorId();
  return options.find(o => o.id === saved) || options[0];
}

/**
 * Speak one segment. Thin wrapper over speech.js `speak()` that applies the
 * narrator persona's pitch but the *student's* chosen rate (the persona rates
 * are tuned for conversation, and a listener choosing 1.5x means 1.5x), and
 * gives headings a slightly lower, slower delivery so a listener can hear the
 * structure of the article rather than one undifferentiated wall of speech.
 * Returns a cancel() function.
 */
export function speakSegment(segment, { narrator, rate = 1, onEnd, onError } = {}) {
  if (!segment?.text) { onEnd?.(); return () => {}; }
  const isHeading = segment.kind === 'heading' || segment.kind === 'title' || segment.kind === 'takeaways';
  return speak(segment.text, {
    persona: narrator,
    voice: narrator?.voice || null,
    rate: rate * (isHeading ? 0.95 : 1),
    pitch: (narrator?.pitch ?? 1) * (isHeading ? 0.97 : 1),
    onEnd,
    onError,
  });
}

export { isTTSSupported };
