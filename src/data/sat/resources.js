// ─────────────────────────────────────────────────────────────────────────────
// Official and free third-party SAT resources.
//
// WHY THIS EXISTS RATHER THAN MORE APP CONTENT
// The four adaptive practice tests in Bluebook are the only tests written by
// the people who write the real one, and no practice bank — including ours —
// substitutes for them. Pretending otherwise would be the single most damaging
// thing this tab could do to a student's score. So the app is explicit: use our
// bank for volume, diagnosis and drilling, and take the official tests in the
// official app.
//
// LICENSING. Nothing here is a copy of College Board material. These are links
// to material College Board publishes free, plus free third-party instruction.
// No official question text is reproduced anywhere in this repo — see the note
// at the top of src/data/sat/taxonomy.js.
//
// VERIFICATION. Every URL below returned HTTP 200 when it was added, including
// each of the six linear-form practice-test PDFs and their answer keys.
//
//   npm run audit:sat-resources    re-check every link
//
// A dead link here is worse than in most places: a student clicking "official
// practice test" and hitting a 404 reasonably concludes the whole tab is stale.
// ─────────────────────────────────────────────────────────────────────────────

export const RESOURCE_KINDS = {
  official_test: { id: 'official_test', label: 'Official practice test' },
  official_tool: { id: 'official_tool', label: 'Official tool' },
  official_doc: { id: 'official_doc', label: 'Official document' },
  free_course: { id: 'free_course', label: 'Free course' },
  logistics: { id: 'logistics', label: 'Registration & scores' },
};

export const SAT_RESOURCES = [
  // ── The official adaptive tests ───────────────────────────────────────────
  {
    id: 'bluebook',
    kind: 'official_tool',
    title: 'Bluebook — the official digital testing app',
    org: 'College Board',
    url: 'https://bluebook.collegeboard.org/',
    priority: 1,
    blurb:
      'The app you will sit the real exam in, and the only place to take the four full-length adaptive practice tests College Board wrote. Free, and the closest thing to test day that exists.',
    why: 'Take at least two of these before test day. Everything else, including this app, is preparation for them.',
  },
  {
    id: 'bluebook-practice',
    kind: 'official_test',
    title: 'Full-length digital practice tests',
    org: 'College Board',
    url: 'https://satsuite.collegeboard.org/practice/practice-tests/bluebook',
    priority: 2,
    blurb:
      'How to get the four adaptive practice tests, and what the score report afterwards tells you. Scores flow into Khan Academy for targeted follow-up practice.',
    why: 'Real adaptive routing, real questions, real timing. Nothing simulates it because it is not a simulation.',
  },
  {
    id: 'student-question-bank',
    kind: 'official_tool',
    title: 'Student Question Bank',
    org: 'College Board',
    url: 'https://satsuite.collegeboard.org/practice/student-question-bank',
    priority: 3,
    blurb:
      'Official SAT questions you can filter by section, domain and difficulty, each with College Board’s own answer rationale.',
    why: 'Official items in the exact skill you are weak in — the one thing an original bank cannot give you.',
  },
  {
    id: 'educator-question-bank',
    kind: 'official_tool',
    title: 'Educator Question Bank',
    org: 'College Board',
    url: 'https://satsuiteeducatorquestionbank.collegeboard.org/',
    priority: 4,
    blurb:
      'Over 3,500 official questions across the SAT Suite, filterable by assessment, section and domain, and exportable as question sets. Intended for teachers; free to access.',
    why: 'The deepest free pool of official questions there is. Worth asking a teacher to build you a set from it.',
  },

  // ── The linear (paper) forms ──────────────────────────────────────────────
  // These are NOT adaptive, so they cannot show a student which Module 2 they
  // would route into — which is why they rank below Bluebook rather than
  // alongside it. What they are good for is untimed content practice and for
  // anyone who works better on paper.
  {
    id: 'paper-tests',
    kind: 'official_test',
    title: 'Printable practice tests (linear forms)',
    org: 'College Board',
    url: 'https://satsuite.collegeboard.org/practice/practice-tests/paper',
    priority: 5,
    blurb:
      'Six full official practice tests as PDFs, with answer keys. These are linear rather than adaptive — the same questions for everyone, no Module 2 routing.',
    why: 'Use these for content practice and paper work; use Bluebook when you need a realistic score.',
    children: [
      { label: 'Practice Test 1', url: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-1-digital.pdf', answers: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-1-answers-digital.pdf' },
      { label: 'Practice Test 2', url: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-2-digital.pdf', answers: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-2-answers-digital.pdf' },
      { label: 'Practice Test 3', url: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-3-digital.pdf', answers: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-3-answers-digital.pdf' },
      { label: 'Practice Test 4', url: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-4-digital.pdf', answers: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-4-answers-digital.pdf' },
      { label: 'Practice Test 5', url: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-5-digital.pdf', answers: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-5-answers-digital.pdf' },
      { label: 'Practice Test 6', url: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-6-digital.pdf', answers: 'https://satsuite.collegeboard.org/media/pdf/sat-practice-test-6-answers-digital.pdf' },
    ],
  },

  // ── Free instruction ──────────────────────────────────────────────────────
  {
    id: 'khan-digital-sat',
    kind: 'free_course',
    title: 'Official Digital SAT Prep',
    org: 'Khan Academy',
    url: 'https://www.khanacademy.org/digital-sat',
    priority: 6,
    blurb:
      'College Board’s official free learning partner. Thousands of official practice questions organised by skill and difficulty, with video explanations and hints.',
    why: 'Free, official, and organised by the same skill taxonomy this tab uses. Link your Bluebook scores for targeted practice.',
  },
  {
    id: 'khan-sat-math',
    kind: 'free_course',
    title: 'Digital SAT Math course',
    org: 'Khan Academy',
    url: 'https://www.khanacademy.org/test-prep/v2-sat-math',
    priority: 7,
    blurb: 'The Math half, broken into the same four domains as the exam blueprint, with practice at each level.',
    why: 'Work here when a whole Math domain is weak, rather than drilling individual questions.',
  },
  {
    id: 'khan-sat-rw',
    kind: 'free_course',
    title: 'Digital SAT Reading and Writing course',
    org: 'Khan Academy',
    url: 'https://www.khanacademy.org/test-prep/sat-reading-and-writing',
    priority: 8,
    blurb: 'The Reading and Writing half, organised by the four content domains and their leaf skills.',
    why: 'The grammar units here are the fastest points on the test if Standard English Conventions is weak.',
  },

  // ── Understanding the exam itself ─────────────────────────────────────────
  {
    id: 'test-spec',
    kind: 'official_doc',
    title: 'Assessment specifications overview',
    org: 'College Board',
    url: 'https://satsuite.collegeboard.org/media/pdf/digital-sat-test-spec-overview.pdf',
    priority: 9,
    blurb:
      'The published blueprint: question counts, timing, domain percentages and what each skill is defined to test. This document is where this app’s skill taxonomy comes from.',
    why: 'Read it once. Knowing that Craft and Structure is 28% of Reading and Writing changes what you practise.',
  },
  {
    id: 'understanding-scores',
    kind: 'logistics',
    title: 'Understanding SAT scores',
    org: 'College Board',
    url: 'https://satsuite.collegeboard.org/sat/scores/understanding-scores',
    priority: 10,
    blurb: 'How the 400–1600 composite is built, what percentiles mean, and how score reports are laid out.',
    why: 'Worth reading before you interpret any score, including the estimates this app produces.',
  },
  {
    id: 'registration',
    kind: 'logistics',
    title: 'SAT dates and registration',
    org: 'College Board',
    url: 'https://satsuite.collegeboard.org/sat/registration',
    priority: 11,
    blurb: 'Test dates, deadlines, fees and fee waivers.',
    why: 'Register early. Preferred test centres fill, and a rushed registration costs you a date.',
  },
];

export const RESOURCES_BY_KIND = SAT_RESOURCES.reduce((acc, r) => {
  (acc[r.kind] ||= []).push(r);
  return acc;
}, {});

/** Everything, most important first. */
export const orderedResources = () =>
  [...SAT_RESOURCES].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

/** Every URL this file references, including nested children — for the audit. */
export function allResourceUrls() {
  const out = [];
  for (const r of SAT_RESOURCES) {
    out.push({ id: r.id, url: r.url, label: r.title });
    for (const c of r.children || []) {
      out.push({ id: `${r.id}:${c.label}`, url: c.url, label: `${r.title} — ${c.label}` });
      if (c.answers) out.push({ id: `${r.id}:${c.label}:answers`, url: c.answers, label: `${r.title} — ${c.label} answers` });
    }
  }
  return out;
}
