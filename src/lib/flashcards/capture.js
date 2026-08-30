// ─────────────────────────────────────────────────────────────────────────────
// Photo → cards. Point a phone at a textbook page or a worksheet and get a deck.
//
// WHY THIS MATTERS MORE THAN IT LOOKS
// Everything else in this app is about a career four to twelve years away. This
// is the one feature that is useful tonight, for the biology test tomorrow —
// which is what turns an app a student opens occasionally when they're thinking
// about their future into one they open on a Tuesday because they have
// homework. That shift, from occasional to habitual, is the single largest
// available change to weekly active use, and it costs a student nothing to try.
//
// ── HOW THE TEXT IS ACTUALLY READ ────────────────────────────────────────────
// Three routes, tried in order, because device capability varies wildly across
// the phones this audience actually owns:
//
//   1. The Shape Detection API (`window.TextDetector`). Native, instant, zero
//      download, zero network. Available on some Chromium/Android builds.
//   2. tesseract.js, dynamically imported. Real OCR, runs in a worker on the
//      device — but it fetches its wasm and language data on first use, which
//      for a student on limited data is a real cost and is therefore stated
//      out loud before it happens, never silently incurred.
//   3. Nothing. The photo still gets shown, with a box to type or paste what's
//      on it. A failed OCR must never be a dead end — the student came here
//      with material they wanted turned into cards, and typing three lines is
//      a worse experience than OCR but an infinitely better one than an error.
//
// Once text is out of the image, it goes through exactly the same fully-offline
// extraction engine that pasted notes do (lib/flashcards/engine.js). There is
// no separate "AI card generation" path here and nothing is uploaded anywhere:
// the image never leaves the device.
// ─────────────────────────────────────────────────────────────────────────────
import { generateFlashcardsFromNotes } from './engine.js';
import { cleanNotesText } from '../noteFlashcardEngine.js';

/** Longest edge, in px, an image is scaled to before OCR. */
const MAX_EDGE = 1600;

export const OCR_DOWNLOAD_NOTE =
  'Reading a photo needs a one-time download of the text-recognition engine (about 15 MB). It happens once and then works offline, but if you are on limited data you may want to wait for wi-fi.';

/** Is native, no-download text detection available on this device? */
export function hasNativeTextDetection() {
  return typeof window !== 'undefined' && typeof window.TextDetector === 'function';
}

/**
 * Downscale and grayscale an image file. Both help OCR accuracy materially and
 * both cut the work the recognizer has to do — a 12-megapixel phone photo of a
 * textbook page is mostly wasted pixels.
 * @returns {Promise<{canvas:HTMLCanvasElement, dataUrl:string}>}
 */
export async function prepareImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);

  // Grayscale + a gentle contrast stretch. Textbook photos are typically
  // low-contrast under room lighting, and that is where OCR fails hardest.
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, (g - 128) * 1.25 + 128));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  bitmap.close?.();
  return { canvas, dataUrl: canvas.toDataURL('image/jpeg', 0.85) };
}

/** Route 1: native text detection. Resolves to '' when unavailable or empty. */
async function readWithNative(canvas) {
  if (!hasNativeTextDetection()) return '';
  try {
    const detector = new window.TextDetector();
    const blocks = await detector.detect(canvas);
    return (blocks || []).map(b => b.rawValue).filter(Boolean).join('\n');
  } catch {
    return '';
  }
}

/** Route 2: tesseract.js, imported only when we actually get here. */
async function readWithTesseract(canvas, onProgress) {
  // Dynamic import: this keeps the OCR engine (and its wasm) entirely out of the
  // main bundle, so a student who never photographs anything never pays for it.
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: m => {
      if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    return data?.text || '';
  } finally {
    await worker.terminate();
  }
}

/**
 * Read text out of an image file.
 *
 * @param {File} file
 * @param {object} opts
 * @param {boolean} opts.allowDownload  may we fall through to tesseract.js (and
 *                                      its one-time download)? The student
 *                                      answers this, not us.
 * @param {(pct:number)=>void} opts.onProgress
 * @returns {Promise<{text:string, dataUrl:string, engine:'native'|'tesseract'|'none'}>}
 */
export async function readTextFromImage(file, { allowDownload = true, onProgress = null } = {}) {
  const { canvas, dataUrl } = await prepareImage(file);

  const native = await readWithNative(canvas);
  if (native.trim().length >= 40) return { text: native, dataUrl, engine: 'native' };

  if (!allowDownload) return { text: native, dataUrl, engine: 'none' };

  try {
    const text = await readWithTesseract(canvas, onProgress);
    return { text, dataUrl, engine: 'tesseract' };
  } catch (err) {
    console.error('OCR failed', err);
    // Deliberately not a throw: the caller shows the photo and a type-it-in box.
    return { text: native, dataUrl, engine: 'none' };
  }
}

/**
 * OCR output is messy in specific, predictable ways — hyphenated line breaks,
 * hard-wrapped lines mid-sentence, page furniture, stray single characters. The
 * extraction engine is built for prose, so cleaning this up first is the
 * difference between a usable deck and twenty cards of garbage.
 */
export function tidyOcrText(raw) {
  if (!raw) return '';
  return raw
    // Re-join words split across a line break with a hyphen.
    .replace(/(\w)-\n(\w)/g, '$1$2')
    // A line ending without terminal punctuation is a hard wrap, not a new
    // sentence — rejoin it so sentence segmentation works.
    .replace(/([^.!?:;\n])\n(?=[a-z(])/g, '$1 ')
    .split('\n')
    .map(l => l.trim())
    // Page numbers, running heads, and OCR noise: a line of one or two
    // characters carries nothing and reliably poisons the candidate pool.
    .filter(l => l.length > 2 && /[a-zA-Z]/.test(l))
    .join('\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Whole pipeline: image in, cards out.
 * @returns {Promise<{cards:Array, text:string, dataUrl:string, engine:string, generated:number}>}
 */
export async function cardsFromImage(file, { count = 15, allowDownload = true, onProgress = null } = {}) {
  const { text, dataUrl, engine } = await readTextFromImage(file, { allowDownload, onProgress });
  const tidied = tidyOcrText(text);
  if (tidied.length < 40) {
    return { cards: [], text: tidied, dataUrl, engine, generated: 0 };
  }
  const result = generateFlashcardsFromNotes(cleanNotesText(tidied), count);
  return { ...result, cards: result.cards, text: tidied, dataUrl, engine };
}

/**
 * One card, authored by the student. The whole point of self-authored cards is
 * that a student can build a deck for the actual biology test tomorrow, so this
 * validates the two things that make a card usable and nothing else.
 */
export function makeCard({ front, back, deckName = null }) {
  const f = String(front || '').trim();
  const b = String(back || '').trim();
  if (!f) throw new Error('A card needs a front — the question or prompt.');
  if (!b) throw new Error('A card needs a back — the answer.');
  return { front: f, back: b, source: 'student', createdAt: Date.now(), ...(deckName ? { deckName } : {}) };
}

/** Reject a duplicate before it reaches the deck rather than after. */
export function isDuplicateCard(cards, front) {
  const key = String(front || '').trim().toLowerCase();
  return (cards || []).some(c => String(c.front || '').trim().toLowerCase() === key);
}
