// ─────────────────────────────────────────────────────────────────────────────
// The Roadmap intake — thirteen questions, and not one more.
//
// ── Why there is a hard cap, and why it is thirteen ──────────────────────────
// This app already asks a student about thirty questions during onboarding.
// Asking thirty more before they can see the thing they came for is how a
// feature gets abandoned at question nine. Thirteen is roughly four minutes at a
// teenager's pace, which is the most an unproven feature can spend before it has
// shown any value.
//
// The cap is enforced structurally rather than by discipline: QUESTIONS below is
// the complete set, MAX_QUESTIONS asserts its length, and scripts/verifyRoadmap.mjs
// fails the build if it grows. Adding a fourteenth question means deleting one.
//
// ── Why none of these duplicate onboarding ───────────────────────────────────
// Every question here earns its place by being something the app CANNOT already
// answer. Grade, pathway, GPA band, why-medicine, prior experience, study hours
// and dream role all came out of onboarding and are read straight off the user
// record; colleges, activities, essays, clinical hours and awards come out of the
// Portfolio. Re-asking any of them would tell the student, correctly, that the
// app has not been paying attention.
//
// What is left is the set of things a real admissions counselor asks in the first
// meeting and this app has never had a reason to collect: money, transport,
// citizenship, family circumstance, appetite for risk, and what the student
// actually wants this specific year to be about. Those are exactly the answers
// that gate the catalog (see `requires` in src/data/roadmap/schema.js), which is
// why they are worth the four minutes.
//
// ── Prefill is a first-class feature, not a convenience ──────────────────────
// Nine of the thirteen carry a `prefill` that reads the user record and the
// Portfolio and proposes an answer. A prefilled question renders as a confirmation
// ("we think this is you — change it if not") rather than a blank, which is
// faster to answer AND demonstrably reads as the app knowing them. `prefill`
// never silently commits: the student always sees and can change it, because a
// wrong guess that was never shown is the single fastest way to produce a
// confidently wrong roadmap.
// ─────────────────────────────────────────────────────────────────────────────
import { TRACK_IDS } from '../../data/roadmap/index.js';

/** Hard cap. See the header — raising this is a product decision, not a tweak. */
export const MAX_QUESTIONS = 13;

const yesNo = (yesLabel, noLabel, unsureLabel = 'Not sure') => ([
  { value: 'yes', label: yesLabel },
  { value: 'no', label: noLabel },
  { value: 'unsure', label: unsureLabel },
]);

/** 'yes'/'no'/'unsure' → true/false/null, the shape passesGates() expects. */
export const triState = (v) => (v === 'yes' ? true : v === 'no' ? false : null);

const countOf = (portfolio, key) => (Array.isArray(portfolio?.[key]) ? portfolio[key].length : 0);

/**
 * The intake, in the order it is asked.
 *
 * Each question:
 *   id        — persisted key on the answers object
 *   kind      — 'single' | 'multi' | 'schools' | 'text' | 'scale'
 *   question  — asked verbatim; written as a person would say it out loud
 *   help      — the "why are you asking me this" line, always present, because a
 *               teenager asked about their family's finances deserves a reason
 *   options   — for single/multi
 *   prefill   — (user, portfolio) => proposed answer | null
 *   gates     — how this answer maps onto GATE_KEYS in the catalog schema
 *   optional  — true when a blank answer is genuinely fine
 *
 * Order is deliberate: the two easiest and most interesting questions are first
 * (where do you want to go, what should this year be about), the money and
 * circumstance questions sit in the middle once the student is invested, and the
 * open text box is last where it reads as an invitation rather than a chore.
 */
export const QUESTIONS = [
  {
    id: 'targetSchools',
    kind: 'schools',
    question: 'Which colleges are you actually aiming for?',
    help: "Name up to six. This is the single most important answer here — every deadline, supplement and scholarship in your roadmap is back-planned from these schools' real calendars.",
    placeholder: 'Start typing a college…',
    max: 6,
    prefill: (user, portfolio) => {
      const names = (portfolio?.colleges || []).map((c) => c.name || c.college_name).filter(Boolean);
      return names.length ? names.slice(0, 6) : null;
    },
    prefillNote: 'Pulled from your College List — add or remove any.',
  },
  {
    id: 'yearTheme',
    kind: 'multi',
    max: 3,
    question: 'What should the next twelve months actually be about?',
    help: 'Pick at most three. A year that tries to be about everything ends up being about nothing, and the roadmap is built around what you choose here.',
    options: [
      { value: 'clinical', label: 'Getting real clinical hours', sublabel: 'Volunteering, shadowing, patient contact' },
      { value: 'research', label: 'Doing actual research', sublabel: 'A lab, a mentor, a project, a fair' },
      { value: 'competition', label: 'Winning something competitive', sublabel: 'Olympiads, HOSA, science fair, Science Bowl' },
      { value: 'leadership', label: 'Leading or building something', sublabel: 'Founding, running, organizing' },
      { value: 'academics', label: 'Fixing or raising my grades', sublabel: 'Rigor, GPA, test scores' },
      { value: 'money', label: 'Finding money for college', sublabel: 'Scholarships and aid' },
      { value: 'applications', label: 'Getting my applications in', sublabel: 'Essays, deadlines, recommenders' },
    ],
    gates: (v) => {
      const set = new Set(v || []);
      return {
        wantsClinical: set.has('clinical') ? true : null,
        wantsResearch: set.has('research') ? true : null,
        wantsCompetition: set.has('competition') ? true : null,
        wantsLeadership: set.has('leadership') ? true : null,
      };
    },
    prefill: (user) => {
      // Onboarding's "what do you want to accomplish" maps cleanly onto four of
      // these seven, so a student who answered it there sees three of their own
      // priorities already ticked rather than a blank grid.
      const map = { experience: 'clinical', application: 'applications', score: 'academics', gpa: 'academics' };
      const picked = [...new Set((user?.accomplish || []).map((a) => map[a]).filter(Boolean))];
      return picked.length ? picked.slice(0, 3) : null;
    },
    prefillNote: 'Based on what you told us during setup.',
  },
  {
    id: 'weeklyHours',
    kind: 'single',
    question: 'Outside of homework, how many hours a week do you genuinely have?',
    help: 'Be honest rather than aspirational. A roadmap built on hours you do not have is a roadmap you will abandon in three weeks, and then feel bad about.',
    options: [
      { value: 'low', label: 'Under 3 hours', sublabel: 'School and family take most of it' },
      { value: 'moderate', label: '3 to 8 hours', sublabel: 'Room for one real commitment' },
      { value: 'high', label: 'More than 8 hours', sublabel: 'I can carry several things at once' },
    ],
    maps: (v) => ({ timeAppetite: v }),
    prefill: (user) => ({ '0-5': 'low', '6-14': 'moderate', '15+': 'high' }[user?.studyHours] || null),
    prefillNote: 'From your study-hours answer during setup.',
  },
  {
    id: 'selectivityStomach',
    kind: 'single',
    question: 'How do you want your list of things to apply to weighted?',
    help: 'There is no wrong answer. Reaches are worth applying to and mostly say no; achievable things say yes and still count. A real counselor picks a mix, and this decides yours.',
    options: [
      { value: 'ambitious', label: 'Lean ambitious', sublabel: "I'd rather try for the big ones and miss" },
      { value: 'balanced', label: 'A genuine mix', sublabel: 'Some reaches, plenty I can actually get' },
      { value: 'realistic', label: 'Things I can actually get', sublabel: 'I want a year with results in it' },
    ],
    // A DEFAULT, not a prefill, and the distinction is load-bearing. `prefill` means "we inferred
    // this from something you told us" and the UI says so in those words; presenting a constant
    // under that label would be a small lie that makes every other prefill less believable. This
    // is simply the option pre-selected because it is the one a counselor would choose absent any
    // information — no claim about the student attached.
    defaultValue: 'balanced',
  },
  {
    id: 'existingCommitments',
    kind: 'multi',
    question: 'What already has a claim on your calendar?',
    help: 'The roadmap schedules around these instead of pretending your evenings are empty. A sport in season is twenty hours a week and it belongs in the plan.',
    options: [
      { value: 'sport', label: 'A sport, in season' },
      { value: 'job', label: 'A paid job' },
      { value: 'caregiving', label: 'Caring for family' },
      { value: 'arts', label: 'Music, theater or art' },
      { value: 'religious', label: 'Regular religious or community commitment' },
      { value: 'clubs', label: 'Clubs I already lead or run' },
      { value: 'none', label: 'Nothing fixed right now' },
    ],
    optional: true,
  },
  {
    id: 'needsFinancialAid',
    kind: 'single',
    question: 'Does the cost of college need to be part of the plan?',
    help: "This changes the roadmap more than almost anything else. If money matters, scholarship deadlines and aid forms get scheduled as hard deadlines rather than optional extras — and several of the best programs are free or paid. Nobody sees this but you.",
    options: yesNo(
      'Yes — cost is a real factor',
      'No — we can cover it',
      'I honestly do not know',
    ),
    gates: (v) => ({ needsFinancialAid: triState(v) }),
  },
  {
    id: 'firstGen',
    kind: 'single',
    question: 'Would you be the first in your family to go to a four-year college?',
    help: 'A large number of scholarships and pipeline programs exist specifically for first-generation students, and they are consistently under-applied to. This is the question that surfaces them.',
    options: yesNo('Yes', 'No', 'Not sure'),
    gates: (v) => ({ firstGen: triState(v) }),
  },
  {
    id: 'usCitizenOrPR',
    kind: 'single',
    question: 'Are you a U.S. citizen or permanent resident?',
    help: 'Federal programs — the NIH internship, several national scholarships, the FAFSA itself — require it. Asking means the roadmap never sends you at something you cannot apply to, and can point you at the ones with no citizenship requirement instead.',
    options: yesNo('Yes', 'No', 'Prefer not to say'),
    gates: (v) => ({ usCitizenOrPR: triState(v) }),
  },
  {
    id: 'mobility',
    kind: 'single',
    question: 'How far can you realistically get on a weekday afternoon?',
    help: 'A hospital volunteering slot forty minutes away with no lift is not an opportunity, it is a source of guilt. This decides whether the roadmap points you at in-person things or virtual ones.',
    options: [
      { value: 'car', label: 'I can drive or get driven', sublabel: 'Most local things are reachable' },
      { value: 'transit', label: 'Public transport or a short walk', sublabel: 'Some things, with planning' },
      { value: 'limited', label: 'Not far, most days', sublabel: 'Virtual and school-based, mainly' },
    ],
    gates: (v) => ({ hasCarOrTransit: v === 'limited' ? false : true }),
  },
  {
    id: 'canTravel',
    kind: 'single',
    question: 'Could you spend a few weeks away from home next summer?',
    help: 'Most of the selective research programs are residential. If the answer is no — for money, family, or a job you need — the roadmap builds the summer out of things you can do from where you are, which is a perfectly good summer.',
    options: yesNo(
      'Yes, if I got in and it was affordable',
      'No — I need to be home',
      'Depends on the cost',
    ),
    gates: (v) => ({ canTravel: v === 'no' ? false : v === 'yes' ? true : null }),
  },
  {
    id: 'setting',
    kind: 'single',
    question: 'Where do you live?',
    help: 'Rural and small-town students qualify for a whole set of health-pipeline programs built specifically for them, and they are among the least competitive good things in the country.',
    options: [
      { value: 'city', label: 'A city or large suburb' },
      { value: 'suburb', label: 'A smaller suburb or town' },
      { value: 'rural', label: 'A rural area or small town' },
    ],
    gates: (v) => ({ ruralOrSmallTown: v === 'rural' ? true : v === 'city' ? false : null }),
  },
  {
    id: 'academicStrength',
    kind: 'single',
    question: 'How are maths and science going right now, honestly?',
    help: 'This decides whether olympiad-track things belong in your year at all. There is nothing wrong with the answer being "not my strength" — it just means the roadmap spends your time somewhere it will actually pay off.',
    options: [
      { value: 'strong', label: 'They are my strongest subjects', sublabel: 'Top of the class, competitions plausible' },
      { value: 'solid', label: 'Solid, not exceptional', sublabel: 'Good grades, would need to work for it' },
      { value: 'struggling', label: 'I am working on it', sublabel: 'Shoring these up is the priority' },
    ],
    gates: (v) => ({ strongMathScience: v === 'strong' ? true : v === 'struggling' ? false : null }),
    prefill: (user) => {
      const band = user?.gpaBand;
      if (band === 'mostly_a') return 'strong';
      if (band === 'a_b' || band === 'mostly_b') return 'solid';
      if (band === 'below_b') return 'struggling';
      return null;
    },
    prefillNote: 'Guessed from your grades — correct it if that is not the whole picture.',
  },
  {
    id: 'anythingElse',
    kind: 'text',
    question: 'Anything else the roadmap should know about you?',
    help: "Anything at all. A specialty you are obsessed with, a chronic illness that shaped why you want this, a language you speak, a family business, a thing you already run, a reason next spring is going to be hard. This is the box that makes the roadmap yours rather than a template — write as much or as little as you like.",
    placeholder: 'For example: my mum is a nurse and I have been in hospitals my whole life; I speak Vietnamese and want to work in underserved clinics; I have a job every weekend…',
    maxLength: 1200,
    optional: true,
    prefill: (user) => {
      // The student's own "tell Medabrain about yourself" brief, if they wrote
      // one. Offered as a starting point, never silently submitted — see
      // src/lib/personalBrief.js.
      const entries = Array.isArray(user?.personalBrief) ? user.personalBrief : [];
      const text = entries.filter((e) => e?.pinned).map((e) => e.text).join('\n\n').trim();
      return text ? text.slice(0, 1200) : null;
    },
    prefillNote: 'From what you have already told Medabrain about yourself.',
  },
];

if (QUESTIONS.length > MAX_QUESTIONS) {
  // Thrown at module load rather than checked in a test, so this is impossible
  // to miss: the app will not start. The verify script asserts it too, for CI.
  throw new Error(`Roadmap intake has ${QUESTIONS.length} questions; the cap is ${MAX_QUESTIONS}. Remove one before adding another.`);
}

export const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

/** Questions a student MUST answer before a roadmap can be generated. */
export const REQUIRED_IDS = QUESTIONS.filter((q) => !q.optional).map((q) => q.id);

/**
 * The proposed starting answers for this student, from everything the app
 * already knows. Returned separately from the answers themselves so the UI can
 * show "we filled this in" affordances and the student can tell the difference
 * between their answer and our guess.
 */
export function buildPrefill(user, portfolio) {
  const values = {};
  const source = {};
  QUESTIONS.forEach((q) => {
    if (typeof q.prefill !== 'function') return;
    let v = null;
    try { v = q.prefill(user, portfolio); } catch { v = null; }
    if (v == null || (Array.isArray(v) && !v.length)) return;
    values[q.id] = v;
    source[q.id] = q.prefillNote || 'Filled in from what you have already told us.';
  });
  return { values, source };
}

/**
 * Constant starting selections — the answer a counselor would pick knowing nothing.
 *
 * Kept strictly separate from buildPrefill so the two can never be confused in the UI: a
 * prefilled answer carries a "we worked this out from what you told us" note and shows up on the
 * review screen as an assumption to check, while a default is just a pre-selected radio button
 * making no claim at all. Merged UNDER the prefill so a real inference always wins.
 */
export function buildDefaults() {
  return Object.fromEntries(
    QUESTIONS.filter((q) => q.defaultValue != null).map((q) => [q.id, q.defaultValue]),
  );
}

/** True when `value` counts as an answer for `q`. */
export function isAnswered(q, value) {
  if (q.optional) return true;
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/** { answered, total, pct, missingIds, complete } for a partially filled intake. */
export function intakeProgress(answers = {}) {
  const missingIds = REQUIRED_IDS.filter((id) => !isAnswered(QUESTION_BY_ID[id], answers[id]));
  const answered = REQUIRED_IDS.length - missingIds.length;
  return {
    answered,
    total: REQUIRED_IDS.length,
    pct: REQUIRED_IDS.length ? Math.round((answered / REQUIRED_IDS.length) * 100) : 100,
    missingIds,
    complete: missingIds.length === 0,
  };
}

/**
 * Raw intake answers → the flat object the catalog engine gates on.
 *
 * Every `gates`/`maps` function declared above is applied here, and null-valued
 * gates are stripped: a gate whose value is null means "unknown", and
 * passesGates() treats a MISSING key and a null key identically, so dropping
 * them keeps the object small and the intent obvious in a debugger.
 */
export function answersToGates(answers = {}) {
  const out = {};
  QUESTIONS.forEach((q) => {
    const v = answers[q.id];
    if (v == null) return;
    if (typeof q.gates === 'function') Object.assign(out, q.gates(v));
    if (typeof q.maps === 'function') Object.assign(out, q.maps(v));
  });
  Object.keys(out).forEach((k) => { if (out[k] == null) delete out[k]; });

  // `interests` is what scoreEntry() aligns against. It is assembled here rather
  // than declared on the question because it draws on two answers — the year's
  // theme and the free-text box — and translates them into the vocabulary the
  // catalog actually uses (track ids and tags).
  const themeToTrack = {
    clinical: 'experience', research: 'program', competition: 'competition',
    leadership: 'experience', academics: 'academics', money: 'scholarship', applications: 'application',
  };
  const interests = new Set();
  (answers.yearTheme || []).forEach((t) => {
    const track = themeToTrack[t];
    if (track && TRACK_IDS.includes(track)) interests.add(track);
    interests.add(t);
  });
  out.interests = [...interests];
  out.selectivityStomach = answers.selectivityStomach || 'balanced';
  out.timeAppetite = out.timeAppetite || 'moderate';
  return out;
}

/**
 * The intake rendered for the generation prompt — the student's own words and
 * choices, as prose, so the model reasons about a person rather than a JSON
 * blob. Labels come from the option lists rather than raw values for the same
 * reason: 'rural' is data, 'a rural area or small town' is a fact about someone.
 */
export function intakeToPromptText(answers = {}, { maxChars = 2400 } = {}) {
  const lines = [];
  QUESTIONS.forEach((q) => {
    const v = answers[q.id];
    if (v == null || (Array.isArray(v) && !v.length) || (typeof v === 'string' && !v.trim())) return;
    let rendered;
    if (q.kind === 'multi') {
      rendered = (v || []).map((val) => q.options?.find((o) => o.value === val)?.label || val).join('; ');
    } else if (q.kind === 'single') {
      rendered = q.options?.find((o) => o.value === v)?.label || v;
    } else if (q.kind === 'schools') {
      rendered = (v || []).join(', ');
    } else {
      rendered = String(v).slice(0, 900);
    }
    lines.push(`- ${q.question} → ${rendered}`);
  });
  if (!lines.length) return null;
  return `WHAT THEY TOLD THE ROADMAP INTAKE (their own answers, treat as ground truth about their life):\n${lines.join('\n')}`.slice(0, maxChars);
}

/** The colleges the roadmap is being back-planned from, deduped and trimmed. */
export function targetSchools(answers = {}) {
  return [...new Set((answers.targetSchools || []).map((s) => String(s).trim()).filter(Boolean))].slice(0, 6);
}
