// ─────────────────────────────────────────────────────────────────────────────
// The catalog of full-length tests a student can choose between.
//
// WHY NAMED FORMS AND NOT JUST A FRESH RANDOM SHUFFLE
// The full-test panel used to build every test from `Date.now()` as its seed.
// That gave a different-ish test each time but nothing a student could reason
// about: no way to say "I'm taking Test C on Saturday", no way to know whether
// the test in front of them repeats the one they sat last week, and no way for
// two students to compare a score on the same form. A practice test is a
// measuring instrument, and an instrument that quietly changes between readings
// is not one.
//
// So a test is now a FORM: a named, numbered, fixed selection of bank questions
// that is identical for everyone and identical every time it is assembled. The
// forms are laid out so that consecutive forms share as few questions as the
// bank allows — see src/lib/sat/forms.js, which does the actual apportionment
// and reports honestly how fresh each form really is.
//
// OFFICIAL TESTS
// The tests below marked `official` are NOT reproduced here and never will be.
// College Board's questions are theirs; this file stores a title, a link and
// enough structure for a student to pick one, go and sit it in the real app or
// on paper, and bring the score back so it lands in the same history as the
// in-app forms. That is the honest version of "use the Bluebook tests": send
// the student to them, then be useful about the result.
//
// See the licensing note at the top of src/data/sat/resources.js.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-app adaptive forms.
 *
 * `seed` is what makes a form reproducible; it must never change once a form
 * has shipped, because changing it silently rewrites a test students have
 * already sat and invalidates every score recorded against it. Add new forms by
 * appending — never by renumbering or reseeding an existing one.
 *
 * Order matters: src/lib/sat/forms.js apportions the bank in this order, so
 * earlier forms get first claim on the freshest questions and each later form
 * takes what is left. Appending a form therefore cannot disturb any existing
 * one, which is the property that makes the catalog safe to grow.
 *
 * HOW LONG THIS LIST IS ALLOWED TO BE
 * A form's footprint is around 145 bank questions, so the catalog length is
 * capped by the bank, not by taste. It was three for as long as the bank was
 * 466 questions: three tests that shared NOTHING was all that fitted, and a
 * fourth drafted against that bank came out 26% new, which is not a fourth
 * test, it is Form C with a coat of paint. Shipping it would have made the
 * picker a menu of four options where two were the same meal.
 *
 * Expansion batch D took the bank past a thousand questions, which is what
 * paid for Forms D and E. They were added the only way this list may grow: by
 * appending, and only after scripts/verifySatForms.mjs confirmed every form in
 * the catalog still shares zero questions with every other. That audit is the
 * gate — it fails if ANY form here overlaps another, so the list cannot quietly
 * outrun the bank behind it.
 */
export const SAT_FORMS = [
  {
    id: 'form-a',
    label: 'Form A',
    name: 'Form A — Baseline',
    seed: 'msp-sat-form-a-2026',
    blurb: 'The standard starting point. Full blueprint coverage across all eight domains, no bias toward any one of them.',
  },
  {
    id: 'form-b',
    label: 'Form B',
    name: 'Form B — Second sitting',
    seed: 'msp-sat-form-b-2026',
    blurb: 'Built from questions Form A does not use, so a back-to-back second test measures you rather than your memory.',
  },
  {
    id: 'form-c',
    label: 'Form C',
    name: 'Form C — Third sitting',
    seed: 'msp-sat-form-c-2026',
    blurb: 'The third independent draw from the bank. Same blueprint, same timing, questions you have not met in A or B.',
  },
  {
    id: 'form-d',
    label: 'Form D',
    name: 'Form D — Fourth sitting',
    seed: 'msp-sat-form-d-2026',
    blurb: 'Added once the bank passed a thousand questions. Shares nothing with A, B or C, so a fourth test still measures you.',
  },
  {
    id: 'form-e',
    label: 'Form E',
    name: 'Form E — Final rehearsal',
    seed: 'msp-sat-form-e-2026',
    blurb: 'The last fully independent draw the bank supports. Save it for the week before the real thing.',
  },
];

export const SAT_FORM_IDS = SAT_FORMS.map(f => f.id);
export const SAT_FORMS_BY_ID = SAT_FORMS.reduce((acc, f) => { acc[f.id] = f; return acc; }, {});

/**
 * The "just give me something I have not seen" option. Not a form: it is seeded
 * from the clock and excludes every question the student has answered anywhere
 * in the app, so it is maximally fresh but not reproducible and not comparable
 * between students.
 */
export const FRESH_MIX = {
  id: 'fresh-mix',
  label: 'Fresh mix',
  name: 'Fresh mix — questions you have never seen',
  blurb: 'Assembled on the spot from whatever you have not answered yet, anywhere in the app. Maximum novelty; the trade-off is that nobody else can sit the same test, so a score on it is not comparable with anyone.',
};

// ── Official College Board tests ────────────────────────────────────────────
//
// These are pickable in exactly the same list as the in-app forms, but choosing
// one hands the student off rather than starting a player. What comes back is a
// score they type in, which is recorded as a full-test attempt with
// `meta.official` set so it charts alongside everything else.
//
// LINK VERIFICATION. Every URL in OFFICIAL_LINEAR_TESTS returned HTTP 200 when
// it was added (tests 1 through 11; 12 does not exist yet). Re-check with:
//
//   npm run audit:sat-resources
//
const linearPdf = (n, suffix) =>
  `https://satsuite.collegeboard.org/media/pdf/${suffix}${n}-digital.pdf`;

/**
 * The printable linear forms. Eleven of them, each with a question booklet, an
 * answer key and a scoring guide that converts raw to scaled.
 *
 * They are linear, not adaptive: everyone gets the same second module, so they
 * cannot show a student which Module 2 they would have routed into. That is the
 * one thing they cannot do and both Bluebook and our own forms can, which is
 * why they rank below both.
 */
export const OFFICIAL_LINEAR_TESTS = Array.from({ length: 11 }, (_, i) => {
  const n = i + 1;
  return {
    id: `cb-linear-${n}`,
    kind: 'official',
    delivery: 'paper',
    label: `Official Practice Test ${n}`,
    name: `College Board Practice Test ${n} (printable, linear)`,
    org: 'College Board',
    number: n,
    url: linearPdf(n, 'sat-practice-test-'),
    answersUrl: linearPdf(n, 'sat-practice-test-').replace('-digital.pdf', '-answers-digital.pdf'),
    scoringUrl: `https://satsuite.collegeboard.org/media/pdf/scoring-sat-practice-test-${n}-digital.pdf`,
    blurb: 'A full official test as a PDF, with the answer key and the raw-to-scaled conversion table. Linear rather than adaptive — the same Module 2 for everyone.',
  };
});

/**
 * The official adaptive tests, which live inside Bluebook and cannot be
 * enumerated reliably from outside it — College Board adds and retires them
 * each testing cycle. So this is one entry, and the student tells us which
 * numbered test they sat when they log the score.
 */
export const OFFICIAL_BLUEBOOK_TEST = {
  id: 'cb-bluebook',
  kind: 'official',
  delivery: 'bluebook',
  label: 'Bluebook adaptive test',
  name: 'Official Bluebook full-length adaptive test',
  org: 'College Board',
  url: 'https://bluebook.collegeboard.org/',
  infoUrl: 'https://satsuite.collegeboard.org/practice/practice-tests/bluebook',
  blurb: 'The real thing: written by the people who write the exam, sat in the app you will sit the exam in, with genuine Module 2 routing and a real score. College Board keeps several available at a time and rotates them each cycle.',
  why: 'Take at least two of these before test day. Every other test, including ours, is preparation for them.',
};

export const OFFICIAL_TESTS = [OFFICIAL_BLUEBOOK_TEST, ...OFFICIAL_LINEAR_TESTS];
export const OFFICIAL_TESTS_BY_ID = OFFICIAL_TESTS.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});

/** Any pickable test, official or in-app, by id. */
export function testById(id) {
  return SAT_FORMS_BY_ID[id] || OFFICIAL_TESTS_BY_ID[id] || (id === FRESH_MIX.id ? FRESH_MIX : null);
}

/** Display name for an attempt's recorded test id, including legacy rows. */
export function testLabel(id) {
  if (!id) return 'Mixed questions'; // attempts recorded before forms existed
  return testById(id)?.label || id;
}
