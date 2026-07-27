// ─────────────────────────────────────────────────────────────────────────────
// "Graph this question" — pulling Desmos-ready expressions out of a question.
//
// The single biggest thing separating students who beat the Digital SAT Math
// section from students who do not is whether they reach for the calculator at
// all. Retyping an equation is enough friction to stop most of them, so this
// module reads the question and hands the expressions to Desmos in one click.
//
// DESIGN RULE: quietly extract nothing rather than extract something wrong.
// A mis-parsed equation graphs a curve that is not the question's curve, and a
// student who trusts it gets the item wrong for a reason we invented. Every
// candidate has to survive the checks below, and anything ambiguous is dropped.
// ─────────────────────────────────────────────────────────────────────────────

/** Expression ids we own, so seeding twice replaces rather than accumulates. */
export const SEED_ID_PREFIX = 'msp-seed-';

// Letter runs that are real mathematics, not prose, and so must not be treated
// as the boundary between an English sentence and an equation.
const FUNCTION_WORDS = new Set([
  'sin', 'cos', 'tan', 'csc', 'sec', 'cot', 'arcsin', 'arccos', 'arctan',
  'log', 'ln', 'sqrt', 'abs', 'pi', 'max', 'min', 'mean', 'median',
]);

// Short letter runs are usually coefficients times variables — "kx + 6y",
// "ax", "xy" — not English. The exceptions are the one- and two-letter words
// that actually appear in question stems, which are listed here so they still
// read as prose and still terminate an expression.
const SHORT_ENGLISH_WORDS = new Set([
  'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is',
  'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we',
]);

// Single letters are variables far more often than they are words, with two
// exceptions: the article "a" and the pronoun "I". Those are disambiguated by
// what follows them — "y = a(x − 2)" is a coefficient, "a nonzero constant" is
// an article — which is why this takes the next character.
const AMBIGUOUS_SINGLE = new Set(['a', 'i']);

/** Is this letter run prose (and therefore an expression boundary)? */
function isProseWord(word, nextChar = ' ') {
  const w = word.toLowerCase();
  if (FUNCTION_WORDS.has(w)) return false;
  if (w.length === 1) {
    return AMBIGUOUS_SINGLE.has(w) && !/[([√\d]/.test(nextChar || ' ');
  }
  if (w.length === 2) return SHORT_ENGLISH_WORDS.has(w);
  return true;
}

/** Prose-word matches inside a candidate side, in order. */
function proseWords(side) {
  return [...side.matchAll(/[A-Za-z]+/g)]
    .filter(w => isProseWord(w[0], side[w.index + w[0].length]));
}

const SUPERSCRIPTS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

/**
 * Fold the typography the question bank writes in — x², ½ — down to the ASCII
 * the matcher below understands. Runs before matching, not after, because an
 * unrecognised x² would otherwise split "x² − 6x + 5 = 0" mid-expression and
 * silently graph the wrong curve.
 */
function normalizeText(text) {
  return String(text).replace(
    /[⁰¹²³⁴-⁹⁻]+/g,
    (run) => `^${[...run].map(ch => SUPERSCRIPTS[ch] || '').join('')}`,
  );
}

/** Index of the first comma not inside brackets — points like (4, 1) survive. */
function topLevelCommaIndex(s, fromEnd = false) {
  let depth = 0;
  const idxs = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth <= 0) idxs.push(i);
  }
  if (!idxs.length) return -1;
  return fromEnd ? idxs[idxs.length - 1] : idxs[0];
}

// One side of a relation: digits, single-letter variables, operators, grouping.
// Deliberately excludes anything that only shows up in prose (quotes, colons,
// semicolons, question marks) so a match cannot span a sentence boundary.
const SIDE = 'A-Za-z0-9+\\-\u2212\u2013\u2014*\u00d7\u00b7/\u00f7^()\\[\\]\\s.,\u221a\u03c0\u03b8|';

const RELATION_RE = new RegExp(`([${SIDE}]{1,80}?)\\s*(<=|>=|=|\u2264|\u2265|<|>)\\s*([${SIDE}]{1,80})`, 'g');

/**
 * Drop the English that ran into a candidate side.
 *
 * For a left side we keep everything AFTER the last prose word ("If 5(x − 3)"
 * becomes "5(x − 3)"); for a right side we keep everything BEFORE the first
 * one ("2x + 9, what is the value" becomes "2x + 9").
 */
function stripProse(side, fromEnd) {
  const words = proseWords(side);
  let s = side;
  if (words.length) {
    if (fromEnd) {
      const last = words[words.length - 1];
      s = side.slice(last.index + last[0].length);
    } else {
      s = side.slice(0, words[0].index);
    }
  }
  // A comma at bracket depth zero ends the expression: "4x + c = 4x − 9, c is
  // a constant" must not graph "4x − 9, c".
  const comma = topLevelCommaIndex(s, fromEnd);
  if (comma !== -1) s = fromEnd ? s.slice(comma + 1) : s.slice(0, comma);
  return s.trim();
}

/** Trailing punctuation a sentence left behind, plus unbalanced brackets. */
function tidy(side) {
  let s = side.replace(/^[\s,.]+|[\s,.]+$/g, '');
  // Balance parentheses by trimming the unmatched ones off the ends — a
  // question that says "(where y = 2x + 1)" otherwise yields "2x + 1)".
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) { s = s.replace(/^\)+/, ''); depth = 0; }
  }
  while (depth > 0 && s.endsWith(')')) { s = s.slice(0, -1).trim(); depth--; }
  while (depth < 0 && s.startsWith('(')) { s = s.slice(1).trim(); depth++; }
  return s.trim();
}

/** Plain text as it appears in a question → LaTeX Desmos will accept. */
export function toLatex(text) {
  let s = String(text);
  s = s.replace(/[\u2212\u2013\u2014]/g, '-');   // unicode minus / en / em dash
  s = s.replace(/[\u00d7\u00b7]/g, '\\cdot ');   // × ·
  s = s.replace(/\u00f7/g, '/');                 // ÷
  s = s.replace(/\u03c0/g, '\\pi ');             // π
  s = s.replace(/\u03b8/g, '\\theta ');          // θ
  // √(expr) and √expr — Desmos needs an explicit \sqrt{} group.
  s = s.replace(/\u221a\s*\(([^()]*)\)/g, '\\sqrt{$1}');
  s = s.replace(/\u221a\s*([A-Za-z0-9.]+)/g, '\\sqrt{$1}');
  // Named functions must be escaped or Desmos reads them as a product of
  // variables (s·i·n rather than sine).
  s = s.replace(/\b(sin|cos|tan|csc|sec|cot|log|ln)\b/g, '\\$1');
  s = s.replace(/\|([^|]{1,40})\|/g, '\\left|$1\\right|');
  // Multi-character exponents need braces: x^10, not x^1 followed by a 0.
  s = s.replace(/\^\s*(-?\d{2,})/g, '^{$1}');
  return s.replace(/\s+/g, ' ').trim();
}

/** Does this side carry actual mathematics rather than a stray fragment? */
function isUsableSide(side) {
  if (!side || side.length < 1 || side.length > 80) return false;
  if (!/[0-9A-Za-z]/.test(side)) return false;
  // A prose word that survived stripProse means we failed to find the boundary.
  if (proseWords(side).length) return false;
  // A dangling operator ("+ 6y") means the match started mid-expression.
  if (/^[+*/^]/.test(side) || /[+\-*/^]$/.test(side)) return false;
  return true;
}

// f(2) = 11 states a constraint on an unknown function, not a curve. Graphing
// it either errors or draws something meaningless, so these are dropped.
const FUNCTION_EVALUATION = /^[A-Za-z]\s*\(\s*-?\d+(?:\.\d+)?\s*\)$/;

/**
 * Every relation we can confidently pull out of a block of text.
 * @returns {string[]} LaTeX strings, de-duplicated, in document order
 */
export function extractRelations(text) {
  if (!text) return [];
  const source = normalizeText(text);
  const out = [];
  const seen = new Set();
  // exec rather than matchAll so the cursor can be rewound: the regex is greedy
  // enough to swallow the start of a following equation ("… − 3 and y" eats the
  // second y of "y = x² − 2x − 3 and y = x + 1"), and rewinding to the end of
  // the text we actually kept lets the next relation be found.
  const re = new RegExp(RELATION_RE.source, 'g');
  let m;
  while ((m = re.exec(source)) !== null) {
    const consumedUpTo = m.index + m[1].length + m[2].length;
    const left = tidy(stripProse(m[1], true));
    const right = tidy(stripProse(m[3], false));

    // Never let the cursor stall — it must always pass the relation operator.
    const rewound = consumedUpTo + Math.max(1, right.length);
    if (rewound < re.lastIndex) re.lastIndex = rewound;

    if (!isUsableSide(left) || !isUsableSide(right)) continue;
    if (FUNCTION_EVALUATION.test(left) || FUNCTION_EVALUATION.test(right)) continue;

    // Something has to vary, or it is arithmetic and belongs in the scientific
    // calculator, not on a graph.
    if (!/[a-z]/.test(`${left}${right}`)) continue;

    const rel = m[2].replace('<=', '\\le').replace('>=', '\\ge')
      .replace('\u2264', '\\le').replace('\u2265', '\\ge');
    const latex = `${toLatex(left)}${rel}${toLatex(right)}`;
    const key = latex.replace(/\s+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(latex);
    if (out.length >= 6) break; // a wall of expressions helps nobody
  }
  return out;
}

/** Parse a table cell into a number, tolerating $, %, commas and unicode minus. */
function cellNumber(cell) {
  const n = Number(String(cell).replace(/[$,%\s]/g, '').replace(/[\u2212\u2013]/g, '-'));
  return Number.isFinite(n) ? n : null;
}

/**
 * A two-column numeric `figure` table becomes a real Desmos table, so
 * scatterplot / line-of-best-fit questions can be plotted instead of squinted
 * at. Returns null unless at least two fully numeric columns exist.
 */
export function tableExpression(figure) {
  if (!figure || figure.type !== 'table' || !Array.isArray(figure.rows) || figure.rows.length < 2) return null;
  const colCount = figure.columns?.length || 0;
  if (colCount < 2) return null;

  const numeric = [];
  for (let c = 0; c < colCount; c++) {
    const values = figure.rows.map(r => cellNumber(r[c]));
    if (values.every(v => v != null)) numeric.push({ index: c, values });
  }
  if (numeric.length < 2) return null;

  const [xs, ys] = numeric;
  return {
    type: 'table',
    id: `${SEED_ID_PREFIX}table`,
    columns: [
      { latex: 'x_1', values: xs.values.map(String) },
      { latex: 'y_1', values: ys.values.map(String), points: true, lines: false, color: '#2d7fff' },
    ],
  };
}

/**
 * Everything worth pushing into Desmos for one question.
 *
 * @param {object} question
 * @returns {{expressions: {id:string, latex:string}[], table: object|null, count: number}}
 */
export function seedForQuestion(question) {
  const empty = { expressions: [], table: null, count: 0 };
  if (!question || question.section !== 'math') return empty;

  // An author can always override the heuristics by putting exact LaTeX on the
  // question itself — the bank should be able to say "graph precisely this".
  const authored = Array.isArray(question.desmos) ? question.desmos.filter(s => typeof s === 'string') : null;

  const relations = authored?.length
    ? authored
    : extractRelations([question.stimulus, question.q].filter(Boolean).join('\n'));

  const expressions = relations.map((latex, i) => ({ id: `${SEED_ID_PREFIX}${i}`, latex }));
  const table = tableExpression(question.figure);
  return { expressions, table, count: expressions.length + (table ? 1 : 0) };
}

/** Is there anything to graph? Drives whether the button renders at all. */
export function canGraph(question) {
  return seedForQuestion(question).count > 0;
}
