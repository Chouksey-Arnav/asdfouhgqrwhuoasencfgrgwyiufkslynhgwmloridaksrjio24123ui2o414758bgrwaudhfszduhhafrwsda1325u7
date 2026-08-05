// Assertions on the full-length test forms. There is no test runner in this
// repo, so this script IS the test suite for src/lib/sat/forms.js.
//
//   node scripts/verifySatForms.mjs
//
// What it is protecting, in order of how badly a regression would hurt:
//
//   1. Every module is full length. The raw-to-scaled conversion assumes 27
//      R&W and 22 Math questions per module; a short module deflates the score
//      we show a student without anything on screen saying so.
//   2. No question repeats inside a form. Seeing the same question twice in one
//      sitting is the single most obvious way a practice test loses a student's
//      trust, and it is also a scoring error — they get two bites at one skill.
//   3. Forms are actually different from each other. That is the entire point
//      of the feature; if Form B is Form A with a reshuffle, the catalog is a
//      lie.
//   4. The blueprint still holds per form — domain mix, difficulty mix and the
//      grid-in share, checked against the same spec the single-test builder is
//      held to.
import { SAT_FORMS } from '../src/data/sat/forms.js';
import { BANK_SIZE } from '../src/data/sat/questions/index.js';
import { allFormManifests, formCapacity, buildTestModule1, buildTestModule2 } from '../src/lib/sat/forms.js';
import { SECTION_IDS, SAT_SECTIONS, SAT_DOMAINS, DOMAINS_BY_SECTION } from '../src/data/sat/taxonomy.js';
import { MATH_SPR_SHARE } from '../src/lib/sat/adaptive.js';

let passed = 0;
const failures = [];
const warnings = [];

function assert(label, condition, detail = '') {
  if (condition) { passed++; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
}

const manifests = allFormManifests();
const SLOTS = ['module1', 'upper', 'lower'];

// ── 1. Shape ────────────────────────────────────────────────────────────────
assert('the catalog assembled every form', manifests.length === SAT_FORMS.length,
  `catalog has ${SAT_FORMS.length}, assembled ${manifests.length}`);

for (const form of manifests) {
  for (const section of SECTION_IDS) {
    const want = SAT_SECTIONS[section].questionsPerModule;
    for (const slot of SLOTS) {
      const got = form.sections[section][slot];
      assert(
        `${form.id}/${section}/${slot}: is a full-length module`,
        got.length === want,
        `expected ${want} questions, got ${got.length}`,
      );
    }
  }
}

// ── 2. No repeats inside a sitting ──────────────────────────────────────────
// A sitting is Module 1 plus exactly ONE Module 2, so that is the pairing to
// check. The upper and lower variants are alternatives and are allowed to share
// questions with each other — see the SLOTS comment in src/lib/sat/forms.js for
// why that is worth a third of the bank.
for (const form of manifests) {
  for (const section of SECTION_IDS) {
    for (const path of ['upper', 'lower']) {
      const all = [...form.sections[section].module1, ...form.sections[section][path]].map(q => q.id);
      const unique = new Set(all);
      assert(
        `${form.id}/${section}: no repeats in a module 1 + ${path} sitting`,
        unique.size === all.length,
        `${all.length - unique.size} question(s) appear in both modules of one sitting`,
      );
    }
    for (const slot of SLOTS) {
      const one = form.sections[section][slot].map(q => q.id);
      assert(
        `${form.id}/${section}/${slot}: no repeats inside the module`,
        new Set(one).size === one.length,
      );
    }
  }
}

// ── 3. Every form is a genuinely different test ─────────────────────────────
//
// This is the gate that keeps the catalog honest, and it is deliberately
// absolute rather than a percentage: NO form may share a single question with
// any other. A catalog is a promise that picking Form C gets you something
// Form A did not, and a threshold like "less than half shared" would let that
// promise degrade quietly as forms are appended to a bank that cannot carry
// them. If this fails, the fix is to grow the bank or shorten the catalog —
// never to loosen the number.
const capacity = formCapacity();

for (let i = 0; i < manifests.length; i++) {
  for (let j = i + 1; j < manifests.length; j++) {
    const a = new Set(manifests[i].questionIds);
    const shared = manifests[j].questionIds.filter(id => a.has(id));
    assert(
      `${manifests[i].id} and ${manifests[j].id} share no questions`,
      shared.length === 0,
      `${shared.length} shared, e.g. ${shared.slice(0, 3).join(', ')} — the bank cannot carry this many forms; grow it or drop a form`,
    );
  }
}

assert(
  'every form in the catalog is fully fresh',
  capacity.fullyFreshForms === manifests.length,
  `${capacity.fullyFreshForms} of ${manifests.length} forms are fully fresh`,
);

// Bank headroom, reported so it is obvious how close the next form is.
{
  const used = new Set(manifests.flatMap(m => m.questionIds));
  warnings.push(`${used.size} of ${BANK_SIZE} bank questions are committed to forms; ${BANK_SIZE - used.size} spare.`);
}

// ── 4. Blueprint per form ───────────────────────────────────────────────────
for (const form of manifests) {
  for (const section of SECTION_IDS) {
    for (const slot of SLOTS) {
      const qs = form.sections[section][slot];

      // Every domain in the section is represented — a module that skips a
      // whole domain is not a practice test of the SAT.
      for (const domainId of DOMAINS_BY_SECTION[section]) {
        const n = qs.filter(q => q.domain === domainId).length;
        assert(
          `${form.id}/${section}/${slot}: covers ${SAT_DOMAINS[domainId].label}`,
          n > 0,
          'domain missing from the module entirely',
        );
      }

      // The upper module must actually be harder than the lower one, or its
      // higher score ceiling is unearned.
      if (slot === 'upper') {
        const lower = form.sections[section].lower;
        const hard = a => a.filter(q => q.difficulty === 'H').length;
        assert(
          `${form.id}/${section}: the upper module is harder than the lower one`,
          hard(qs) > hard(lower),
          `upper has ${hard(qs)} hard questions, lower has ${hard(lower)}`,
        );
      }

      // Grid-in share, Math only. Tolerance is a couple of questions: the
      // format swap is best-effort by design and must never cost the content
      // blueprint (see balanceSprShare).
      if (section === 'math') {
        const spr = qs.filter(q => q.format === 'spr').length;
        const want = Math.round(qs.length * MATH_SPR_SHARE);
        assert(
          `${form.id}/math/${slot}: grid-in share is close to ${Math.round(MATH_SPR_SHARE * 100)}%`,
          Math.abs(spr - want) <= 2,
          `expected about ${want} grid-ins, got ${spr}`,
        );
      }
    }
  }
}

// ── 5. Determinism ──────────────────────────────────────────────────────────
// A form that changes between assemblies is not a form. Re-derive one through
// the delivery API and check it matches the manifest.
{
  const form = manifests[0];
  const again = buildTestModule1(form.id, 'rw');
  assert(
    `${form.id}: delivery returns the manifest's module 1 unchanged`,
    again.questions.map(q => q.id).join() === form.sections.rw.module1.map(q => q.id).join(),
  );

  // Routing must pick the module the student earned, both ways.
  const allWrong = form.sections.rw.module1.map(q => ({ questionId: q.id, correct: false, difficulty: q.difficulty }));
  const allRight = form.sections.rw.module1.map(q => ({ questionId: q.id, correct: true, difficulty: q.difficulty }));
  assert(`${form.id}: a perfect module 1 routes to the upper module`,
    buildTestModule2(form.id, 'rw', allRight).path === 'upper');
  assert(`${form.id}: a blank module 1 routes to the lower module`,
    buildTestModule2(form.id, 'rw', allWrong).path === 'lower');
}

// ── 6. Fresh mix ────────────────────────────────────────────────────────────
// The unseeded option still has to produce a full-length module, including for
// a student who has already answered a large slice of the bank.
{
  const heavilySeen = new Set(manifests[0].questionIds);
  for (const section of SECTION_IDS) {
    const built = buildTestModule1('fresh-mix', section, { seed: 12345, exclude: heavilySeen });
    assert(
      `fresh mix/${section}: full length even when a whole form is excluded`,
      built.questions.length === SAT_SECTIONS[section].questionsPerModule,
      `got ${built.questions.length}`,
    );
    const m1 = built.questions.map(q => ({ questionId: q.id, correct: true, difficulty: q.difficulty }));
    const m2 = buildTestModule2('fresh-mix', section, m1, {
      seed: 12345,
      exclude: new Set([...heavilySeen, ...built.questions.map(q => q.id)]),
    });
    assert(
      `fresh mix/${section}: module 2 does not repeat module 1`,
      !m2.questions.some(q => built.questions.some(p => p.id === q.id)),
    );
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log('\nSAT test forms\n');
console.log(`  forms in catalog      ${capacity.forms}`);
console.log(`  fully fresh forms       ${capacity.fullyFreshForms}  (share nothing with any earlier form)`);
console.log(`  questions per form      ${capacity.questionsReservedPerForm}  (module 1 + both module 2 variants, both sections)`);
console.log('');
for (const m of manifests) {
  const pct = Math.round(m.freshness.ratio * 100);
  console.log(`  ${m.label.padEnd(8)} ${String(pct).padStart(3)}% new   ${m.freshness.fresh}/${m.freshness.total} questions unused by earlier forms`);
}

if (warnings.length) {
  console.log('\n  Notes:');
  for (const w of warnings) console.log(`    · ${w}`);
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`\n✓ ${passed} checks passed\n`);
