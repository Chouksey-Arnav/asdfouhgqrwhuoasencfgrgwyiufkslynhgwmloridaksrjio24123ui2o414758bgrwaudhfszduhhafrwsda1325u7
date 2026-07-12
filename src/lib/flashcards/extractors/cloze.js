// ─────────────────────────────────────────────────────────────────────────────
// Cloze fallback — last resort for sentences no other strategy mined anything
// from. Automatic key-term extraction via compromise noun-phrase frequency,
// lowest confidence so it only fills remaining slots after every stronger
// strategy has had its shot at the whole document.
// ─────────────────────────────────────────────────────────────────────────────
import nlp from 'compromise';
import { escapeRegExp, wordsOf, normalizeTerm, cleanAnswer } from '../text.js';

function extractKeyTerms(proseText, excludeKeys) {
  const doc = nlp(proseText);
  const phrases = doc.match('#Determiner? #Adjective* #Noun+ #Noun?').out('array');
  const freq = new Map();
  const order = [];
  for (const raw of phrases) {
    const term = normalizeTerm(raw);
    if (!term || term.length < 3) continue;
    const words = wordsOf(term);
    if (words.length > 3) continue;
    if (/^\d+$/.test(term)) continue;
    const key = term.toLowerCase();
    if (excludeKeys.has(key)) continue;
    if (!freq.has(key)) { freq.set(key, { term, count: 0 }); order.push(key); }
    freq.get(key).count++;
  }
  return order
    .map(k => freq.get(k))
    .sort((a, b) => b.count - a.count || order.indexOf(a.term.toLowerCase()) - order.indexOf(b.term.toLowerCase()));
}

/** Builds cloze cards from sentences no stronger extractor used, within one section. */
export function extractCloze(sentences, usedSentences, category, usedTermKeys) {
  const remaining = sentences.filter(s => !usedSentences.has(s) && s.length >= 40 && s.length <= 300);
  if (!remaining.length) return [];
  const proseText = remaining.join(' ');
  const keyTerms = extractKeyTerms(proseText, usedTermKeys);
  const out = [];
  const localUsed = new Set();
  for (const { term } of keyTerms) {
    const rx = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    const sentence = remaining.find(s => !localUsed.has(s) && rx.test(s));
    if (!sentence) continue;
    const match = sentence.match(rx);
    if (!match) continue;
    localUsed.add(sentence);
    out.push({
      front: sentence.replace(rx, '_____'),
      back: cleanAnswer(match[0]),
      category,
      type: 'cloze',
      confidence: 1,
      hint: sentence,
    });
  }
  return out;
}
