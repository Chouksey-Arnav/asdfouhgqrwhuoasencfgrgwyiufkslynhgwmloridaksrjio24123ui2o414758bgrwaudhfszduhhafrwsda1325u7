// Integrity audit for the SAT question bank.
//
// The SAT tab makes claims about a student's score. Those claims are only as
// trustworthy as the bank underneath them, so this script is a gate, not a
// report: it exits non-zero on any ERROR. Run it before shipping bank changes.
//
//   node scripts/auditSatBank.mjs            full audit
//   node scripts/auditSatBank.mjs --verbose  also print per-skill coverage
//
// Checks:
//   1.  Unique ids, and ids that match their declared section.
//   2.  Every question carries a valid section / domain / skill triple that
//       agrees with the taxonomy.
//   3.  MCQ items: 4 choices, in-range answer index, an explanation, and a
//       distractorExp entry for EVERY choice (the Review Log depends on this).
//   4.  SPR items: sprAccept.values present and non-empty, no stray choices.
//   5.  Answer-position balance — a bank where the answer is disproportionately
//       "C" is gameable and teaches the wrong habit.
//   6.  Longest-answer bias, the same heuristic scripts/auditQuizBias.mjs
//       guards against in the science quiz bank.
//   7.  Per-skill minimum coverage, so adaptive selection has room to work.
//   8.  Domain share drift versus the published blueprint.
//   9.  Difficulty spread per section.
//  10.  Unknown trap tags (warning only — the taxonomy is meant to grow).
import { SAT_QUESTIONS, QUESTIONS_BY_SKILL, bankCoverage } from '../src/data/sat/questions/index.js';
import { bankBalanceStats } from '../src/lib/sat/answerBalance.js';
import {
  SAT_SKILLS, SAT_DOMAINS, SAT_SECTIONS, SKILL_IDS, DOMAIN_IDS, SECTION_IDS,
  DIFFICULTY_IDS, TRAP_TAGS,
} from '../src/data/sat/taxonomy.js';

const VERBOSE = process.argv.includes('--verbose');

// Minimum questions per leaf skill before adaptive selection starts repeating
// itself noticeably. Raise this as the bank grows (target is ~35 in Phase 7).
const MIN_PER_SKILL = 2;
// Acceptable drift between a domain's realised share of the bank and its
// blueprint share, in percentage points.
const DOMAIN_SHARE_TOLERANCE = 12;

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ── 1-4. Per-question structural validation ─────────────────────────────────
const seen = new Set();
for (const q of SAT_QUESTIONS) {
  const at = `[${q.id || '(no id)'}]`;

  if (!q.id) { err(`${at} missing id`); continue; }
  if (seen.has(q.id)) err(`${at} duplicate id`);
  seen.add(q.id);

  if (!SECTION_IDS.includes(q.section)) err(`${at} unknown section "${q.section}"`);
  if (!DOMAIN_IDS.includes(q.domain)) err(`${at} unknown domain "${q.domain}"`);
  if (!SKILL_IDS.includes(q.skill)) { err(`${at} unknown skill "${q.skill}"`); continue; }

  // The triple must be internally consistent, or the heat map and score report
  // will attribute a question to the wrong place.
  const skill = SAT_SKILLS[q.skill];
  if (skill.domain !== q.domain) err(`${at} skill "${q.skill}" belongs to domain "${skill.domain}", not "${q.domain}"`);
  const domainSection = SAT_DOMAINS[q.domain]?.section;
  if (domainSection && domainSection !== q.section) err(`${at} domain "${q.domain}" is in section "${domainSection}", not "${q.section}"`);

  if (!DIFFICULTY_IDS.includes(q.difficulty)) err(`${at} invalid difficulty "${q.difficulty}"`);
  if (!q.exp || q.exp.length < 20) err(`${at} missing or too-short explanation`);
  if (typeof q.targetSeconds !== 'number' || q.targetSeconds <= 0) err(`${at} missing targetSeconds`);
  if (q.trap && !TRAP_TAGS[q.trap]) warn(`${at} unknown trap tag "${q.trap}"`);

  if (q.format === 'mcq') {
    if (!Array.isArray(q.ch) || q.ch.length !== 4) {
      err(`${at} MCQ must have exactly 4 choices (has ${q.ch?.length ?? 0})`);
    }
    if (typeof q.ans !== 'number' || q.ans < 0 || q.ans >= (q.ch?.length ?? 0)) {
      err(`${at} answer index ${q.ans} out of range`);
    }
    if (!Array.isArray(q.distractorExp) || q.distractorExp.length !== (q.ch?.length ?? 0)) {
      err(`${at} needs one distractorExp per choice (has ${q.distractorExp?.length ?? 0} for ${q.ch?.length ?? 0} choices)`);
    } else if (q.distractorExp.some(d => !d || d.length < 10)) {
      err(`${at} has an empty or trivially short distractorExp entry`);
    }
  } else if (q.format === 'spr') {
    if (q.ch) err(`${at} SPR items must not define choices`);
    if (!q.sprAccept?.values?.length) err(`${at} SPR item missing sprAccept.values`);
  } else {
    err(`${at} invalid format "${q.format}" (expected "mcq" or "spr")`);
  }
}

// ── 5. Answer-position balance ──────────────────────────────────────────────
const mcqs = SAT_QUESTIONS.filter(q => q.format === 'mcq' && Array.isArray(q.ch));
const posCounts = [0, 0, 0, 0];
for (const q of mcqs) if (posCounts[q.ans] !== undefined) posCounts[q.ans]++;
// NOTE: position skew in the source is neutralised at runtime — every question
// is passed through shuffleChoices() in src/lib/sat/shuffle.js before a student
// ever sees it, so the stored index is not the presented index. This check is
// therefore informational: it protects against the shuffle being bypassed and
// keeps the raw bank honest, but a skew here is not itself a student-facing bug.
// Length bias (check 6) is the one shuffling cannot fix, which is why that one
// gets the aggressive threshold.
posCounts.forEach((count, i) => {
  const share = mcqs.length ? count / mcqs.length : 0;
  // Only meaningful once the bank is big enough for the ratio to mean anything.
  if (mcqs.length >= 40 && (share > 0.4 || share < 0.12)) {
    warn(`answer position ${'ABCD'[i]} used ${count}/${mcqs.length} times (${Math.round(share * 100)}%) vs ~25% expected — harmless while runtime shuffling is on, but rebalance as the bank grows`);
  }
});

// ── 6. Answer-shape bias ────────────────────────────────────────────────────
// This is a GATE, not a report. It was a warning, and the warning did not fire:
// its threshold was a 40% whole-bank rate, and the bank sat at 32% — while
// Reading & Writing on its own was at 47.5% against a 25% baseline, and the
// correct choice was the SHORTEST in 5.6% of items bank-wide. A student who
// adopted "pick the longest" would have beaten this practice set. Averaging
// R&W together with maths (where numeric choices are naturally the same length)
// is what hid it, so the rate is now checked per section as well as overall.
//
// The per-item rule is imported rather than reimplemented: the generator in
// src/lib/sat/aiPractice.js validates AI-authored items against exactly this,
// and two copies of a heuristic become two different heuristics.
const SECTION_LABELS = { rw: 'Reading & Writing', math: 'Math' };
// Chance is 25%. The ceiling allows real sampling noise on a small bank without
// admitting a systematic tell.
const MAX_LONGEST_RATE = 0.36;
// The mirror check. A bank can pass the longest test while never once making
// the correct choice the shortest — which is the same tell wearing a hat, and
// teaches the same "the terse one is a trap" reflex.
const MIN_SHORTEST_RATE = 0.12;
const MIN_SECTION_N = 18; // textual MCQs below this are too noisy to gate on

const bankStats = bankBalanceStats(SAT_QUESTIONS);
if (bankStats.n) {
  const check = (label, stats, hard) => {
    if (stats.textualN < MIN_SECTION_N) return;
    const report = hard ? err : warn;
    if (stats.longestRate > MAX_LONGEST_RATE) {
      report(`${label}: the correct choice is the single longest in ${Math.round(stats.longestRate * 100)}% of MCQs (${stats.longest}/${stats.textualN}) — chance is 25%, ceiling is ${Math.round(MAX_LONGEST_RATE * 100)}%`);
    }
    if (stats.shortestRate < MIN_SHORTEST_RATE) {
      report(`${label}: the correct choice is the single shortest in only ${Math.round(stats.shortestRate * 100)}% of MCQs (${stats.shortest}/${stats.textualN}) — it should happen about as often as being longest (floor is ${Math.round(MIN_SHORTEST_RATE * 100)}%)`);
    }
  };

  check('bank-wide', bankStats, true);
  for (const sec of SECTION_IDS) {
    const secStats = bankBalanceStats(SAT_QUESTIONS.filter(q => q.section === sec));
    check(SECTION_LABELS[sec] || sec, secStats, true);
  }

  // Per-item violations are errors too. One badly balanced item is a bug in
  // that item, and there is no reason to let it through just because the
  // aggregate happens to look healthy.
  if (bankStats.violations.length) {
    err(`${bankStats.violations.length} MCQ item(s) fail the per-item choice-balance rule:`);
    bankStats.violations
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 20)
      .forEach(v => err(`    ${v.id} — ${v.reasons[0]}`));
    if (bankStats.violations.length > 20) err(`    …and ${bankStats.violations.length - 20} more`);
  }
}
const strictLongestCorrect = bankStats.longest || 0;
const strictRate = bankStats.longestRate || 0;

// ── 7. Per-skill coverage ───────────────────────────────────────────────────
const thin = [];
for (const s of SKILL_IDS) {
  const n = QUESTIONS_BY_SKILL[s]?.length || 0;
  if (n === 0) err(`skill "${s}" (${SAT_SKILLS[s].label}) has NO questions — adaptive selection cannot cover it`);
  else if (n < MIN_PER_SKILL) thin.push(`${s} (${n})`);
}
if (thin.length) warn(`skills below the ${MIN_PER_SKILL}-question floor: ${thin.join(', ')}`);

// ── 8. Domain share drift ───────────────────────────────────────────────────
for (const sec of SECTION_IDS) {
  const inSection = SAT_QUESTIONS.filter(q => q.section === sec);
  if (inSection.length < 20) continue; // too small for the ratio to be meaningful
  for (const d of DOMAIN_IDS.filter(d => SAT_DOMAINS[d].section === sec)) {
    const actual = inSection.filter(q => q.domain === d).length / inSection.length * 100;
    const target = SAT_DOMAINS[d].share * 100;
    if (Math.abs(actual - target) > DOMAIN_SHARE_TOLERANCE) {
      warn(`${SAT_DOMAINS[d].label}: ${actual.toFixed(0)}% of the ${sec} bank vs ${target.toFixed(0)}% on the real exam`);
    }
  }
}

// ── 9. Difficulty spread ────────────────────────────────────────────────────
for (const sec of SECTION_IDS) {
  const inSection = SAT_QUESTIONS.filter(q => q.section === sec);
  if (!inSection.length) { err(`section "${sec}" has no questions at all`); continue; }
  for (const d of DIFFICULTY_IDS) {
    if (!inSection.some(q => q.difficulty === d)) {
      warn(`section "${sec}" has no ${d}-difficulty questions — adaptive modules need all three bands`);
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\nSAT bank audit — ${SAT_QUESTIONS.length} questions across ${SKILL_IDS.length} skills\n`);
for (const sec of SECTION_IDS) {
  const inSection = SAT_QUESTIONS.filter(q => q.section === sec);
  const byDiff = DIFFICULTY_IDS.map(d => `${d}:${inSection.filter(q => q.difficulty === d).length}`).join('  ');
  const spr = inSection.filter(q => q.format === 'spr').length;
  console.log(`  ${SAT_SECTIONS[sec].label.padEnd(20)} ${String(inSection.length).padStart(4)} questions   ${byDiff}${sec === 'math' ? `   SPR:${spr}` : ''}`);
}
// Stored answer position is deliberately NOT balanced by hand — every question
// goes through shuffleChoices() before a student sees it (see src/lib/sat/
// shuffle.js), so the stored index is an implementation detail. Choice LENGTH
// is the opposite: shuffling moves it around but cannot make it stop being a
// tell, which is exactly why it needs a gate here.
console.log(`\n  MCQ answer positions  A:${posCounts[0]}  B:${posCounts[1]}  C:${posCounts[2]}  D:${posCounts[3]}   (of ${mcqs.length}, shuffled at runtime)`);
console.log(`  Correct is single longest   ${strictLongestCorrect}/${bankStats.textualN} (${Math.round(strictRate * 100)}%, chance ~25%, ceiling ${Math.round(MAX_LONGEST_RATE * 100)}%)`);
console.log(`  Correct is single shortest  ${bankStats.shortest}/${bankStats.textualN} (${Math.round(bankStats.shortestRate * 100)}%, floor ${Math.round(MIN_SHORTEST_RATE * 100)}%)`);
for (const sec of SECTION_IDS) {
  const st = bankBalanceStats(SAT_QUESTIONS.filter(q => q.section === sec));
  if (st.n) console.log(`    ${(SAT_SECTIONS[sec].label + ':').padEnd(22)} longest ${String(Math.round(st.longestRate * 100)).padStart(3)}%   shortest ${String(Math.round(st.shortestRate * 100)).padStart(3)}%   (${st.textualN} textual MCQs)`);
}
console.log(`  Per-item balance failures   ${bankStats.violations.length}/${mcqs.length}`);

if (VERBOSE) {
  console.log('\n  Per-skill coverage (thinnest first):');
  for (const row of bankCoverage()) {
    console.log(`    ${String(row.count).padStart(3)}  ${row.section.padEnd(5)} ${row.label}`);
  }
}

if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s):`);
  warnings.forEach(w => console.log(`    ! ${w}`));
}
if (errors.length) {
  console.log(`\n  ${errors.length} ERROR(s):`);
  errors.forEach(e => console.log(`    x ${e}`));
  console.log('\nBank audit FAILED.\n');
  process.exit(1);
}
console.log('\nBank audit passed.\n');
