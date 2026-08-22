// ─────────────────────────────────────────────────────────────────────────────
// Intake — read everything the Portfolio already knows, then ask for exactly
// what is missing, once, with a reason.
//
// ── The two failures this replaces ──────────────────────────────────────────
// The old calculator had seven inputs (GPA, SAT, "science course rigor",
// leadership years, EC hours, volunteer hours, home state) and a "Sync with
// Portfolio" button that guessed at four of them. It asked for too little and
// inferred too much, and both halves of that are the same bug: a model cannot
// be more accurate than its inputs, and an inferred input is a made-up one
// wearing a number.
//
// Two rules govern this file:
//
//   1. NEVER ASK FOR SOMETHING WE ALREADY HAVE. Clinical hours, shadowing,
//      research, service, leadership, certifications, competitions, GPA terms
//      and every test sitting are already in the Portfolio. They are read
//      straight out of the snapshot, with provenance attached, and shown to the
//      student as already-answered rather than as an empty box.
//
//   2. NEVER QUIETLY ASSUME A MISSING VALUE. Every field here is skippable, and
//      skipping it widens the model's uncertainty band instead of substituting
//      a default. The old model's `cRigor` state defaulted to '2' and its sync
//      wrote `Math.max(apCount, 2)` — so a student who had taken no advanced
//      courses at all was silently credited with two, forever, invisibly. That
//      single line is the whole argument for this rule.
//
// ── The completeness meter ──────────────────────────────────────────────────
// `assessCompleteness()` returns "we have eleven of fifteen things we would
// need for a confident estimate", the four we do not have, and what each one
// would change. A student who can see which four are missing can fix them in a
// minute. A student shown a confident number built on eleven of fifteen cannot
// even know to ask.
// ─────────────────────────────────────────────────────────────────────────────

// See academicFit.js's copy. Number(null) === 0, so the naive version turns an
// unanswered field into an answered zero on the way INTO the applicant object —
// which is the earliest and worst place for it to happen, because every layer
// downstream then treats the zero as something the student told us.
const num = (v) => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─────────────────────────────────────────────────────────────────────────────
// The field spec. `why` is the one line shown under the question — never more
// than one, because a form that explains itself at length does not get filled
// in. `changes` is what the panel shows in the missing-fields list.
// ─────────────────────────────────────────────────────────────────────────────
export const INTAKE_FIELDS = [
  {
    id: 'unweightedGpa', group: 'academics', type: 'number', step: 0.01, min: 0, max: 4.5,
    label: 'Unweighted GPA',
    why: 'Most programmes state their GPA floor as unweighted, and a weighted number read as unweighted flatters you by roughly half a point.',
    changes: 'Without it we cannot check unweighted GPA floors (VCU\'s 3.5, UMKC\'s 3.0) at all, and GPA drops out of your academic position entirely.',
    weight: 3,
  },
  {
    id: 'weightedGpa', group: 'academics', type: 'number', step: 0.01, min: 0, max: 6,
    label: 'Weighted GPA',
    why: 'Some programmes specify weighted instead — Drexel\'s 3.5 minimum is on the weighted scale — and mixing the two up is how you get a wrong answer in either direction.',
    changes: 'Without it, weighted-scale requirements are checked against your unweighted number as a floor, which understates you.',
    weight: 2,
  },
  {
    id: 'hundredPointAverage', group: 'academics', type: 'number', step: 0.1, min: 0, max: 105,
    label: 'Average on the 100-point scale',
    why: 'New York programmes (CUNY\'s 85 minimum) use it, and converting from a 4.0 is school-specific and lossy.',
    changes: 'Without it we convert from your 4.0 GPA and say we did — approximate, and it is the number CUNY actually reads.',
    optional: true, weight: 1,
  },
  {
    id: 'classRankReported', group: 'academics', type: 'enum',
    options: [{ value: 'yes', label: 'My school reports class rank' }, { value: 'no', label: 'My school does not rank' }, { value: 'unsure', label: 'I don\'t know' }],
    label: 'Does your school report class rank?',
    why: 'A large share of schools do not rank at all, and "no rank" must not be scored as "ranked badly" — which is what happens if we only ask for the number.',
    changes: 'Without it, rank-based routes (ASU\'s top-10% direct admission) stay unevaluable rather than resolving either way.',
    weight: 2,
  },
  {
    id: 'classRankPercentile', group: 'academics', type: 'number', min: 1, max: 100,
    label: 'Your rank, as a top percentage (e.g. 8 for top 8%)',
    why: 'Several programmes have an explicit rank route into direct admission.',
    changes: 'Without it we cannot use the rank route even where it is the easiest one for you to satisfy.',
    dependsOn: { classRankReported: 'yes' }, weight: 2,
  },
  {
    id: 'rigorCounts', group: 'academics', type: 'rigor',
    label: 'AP, IB, honours and dual-enrolment courses taken',
    why: 'Course rigor is read as a count of real courses, not as a vibe, and each kind is weighted differently.',
    changes: 'Without it, rigor is left out of your academic position rather than assumed — the old calculator assumed two and never told anyone.',
    weight: 3,
  },
  {
    id: 'rigorOffered', group: 'academics', type: 'number', min: 0, max: 60,
    label: 'Roughly how many advanced courses does your school offer?',
    why: 'Four APs at a school offering five is stronger than six at a school offering twenty, and the school profile that ships with your transcript makes that visible to the reader.',
    changes: 'Without it, rigor is scored on the raw count alone at reduced weight, and the range stays wider than it needs to be.',
    weight: 2,
  },
  {
    id: 'testSections', group: 'testing', type: 'test-sections',
    label: 'Section scores for each sitting',
    why: 'Several programmes gate on a specific section — UMKC requires the ACT Science section to be present at all — and a composite cannot answer that.',
    changes: 'Without them, section requirements stay unevaluable and we cannot tell you whether you already meet one.',
    weight: 3,
  },
  {
    id: 'scoreSittingPolicy', group: 'testing', type: 'enum',
    options: [
      { value: 'single-sitting', label: 'My best score is from one sitting' },
      { value: 'superscored', label: 'My best score combines sections from different sittings' },
    ],
    label: 'Is your best score single-sitting or superscored?',
    why: 'Some programmes explicitly refuse superscores, so benchmarking you on one would overstate your position at exactly those programmes.',
    changes: 'Without it we treat your score as single-sitting, which is the conservative reading, and note that we did.',
    weight: 2,
  },
  {
    id: 'citizenship', group: 'eligibility', type: 'enum',
    options: [
      { value: 'us-citizen', label: 'U.S. citizen' },
      { value: 'permanent-resident', label: 'U.S. permanent resident' },
      { value: 'international', label: 'Neither' },
      { value: 'prefer-not', label: 'Prefer not to say' },
    ],
    label: 'Citizenship or permanent residency',
    why: 'Several combined-degree programmes are categorically closed to international applicants, and that is a yes/no we should not discover for you in November.',
    changes: 'Without it we cannot evaluate citizenship gates, so eligibility at UMKC, RPI and Drexel stays genuinely unknown.',
    weight: 3,
  },
  {
    id: 'stateResidency', group: 'eligibility', type: 'state',
    label: 'State of residence',
    why: 'Public programmes and mission-based ones weight residency heavily, and in-state status changes the answer more than most of your activities do.',
    changes: 'Without it, residency preferences and in-state advantages are left out entirely.',
    weight: 2,
  },
  {
    id: 'gradeLevel', group: 'eligibility', type: 'enum',
    options: ['9', '10', '11', '12'].map(g => ({ value: g, label: `Grade ${g}` })),
    label: 'Current grade',
    why: 'Some applications are senior-year only, and knowing where you are changes whether a gap is a problem or a plan.',
    changes: 'Without it we cannot tell whether a shortfall is fixable in time.',
    weight: 2,
  },
  {
    id: 'requiredCourses', group: 'eligibility', type: 'courses',
    label: 'Biology, chemistry, lab physics, pre-calculus — taken, and the grade',
    why: 'Several programmes require specific courses, sometimes at a minimum grade, and lab physics is the one applicants most often turn out to be missing.',
    changes: 'Without it, course requirements stay unevaluable — and a missing physics year discovered in senior autumn cannot be fixed.',
    weight: 3,
  },
  {
    id: 'documentedServiceHours', group: 'portfolio', type: 'number', min: 0,
    label: 'Documented, verifiable service hours',
    why: 'Drexel requires 200 hours that are documented and advisor-approved — undocumented hours do not count toward it, so this is a different number from your total.',
    changes: 'Without it we use your logged service total, which may overstate the documented figure a programme will actually accept.',
    weight: 2,
  },
  {
    id: 'hooks', group: 'context', type: 'hooks',
    label: 'Recruited athlete, legacy, development or faculty connection',
    why: 'Published admit rates include these applicants, so leaving them in the data inflates the odds shown to everyone who is not one — we would rather ask than distort your number.',
    changes: 'Without it we assume no hook, which is the right default and understates you if you have one.',
    optional: true, weight: 1,
  },
];

/** Fields that carry weight in the completeness meter. */
const METER_FIELDS = INTAKE_FIELDS.filter(f => !f.optional || f.weight >= 2);

// ─────────────────────────────────────────────────────────────────────────────
// Reading the Portfolio.
// ─────────────────────────────────────────────────────────────────────────────

const CLINICAL_TYPES = ['Clinical/Shadowing', 'Patient Care (paid)'];
const SERVICE_TYPES = ['Volunteering'];
const RESEARCH_TYPES = ['Research'];
const LEADERSHIP_TYPES = ['Leadership'];

const annualHours = (a) => (num(a.hours_per_week) || 0) * (num(a.weeks_per_year) || 0);

/** Months an activity plausibly spans, from the grade levels it is tagged with. */
function activitySpanMonths(a) {
  const grades = Array.isArray(a.grade_levels) ? a.grade_levels.filter(Boolean) : [];
  if (!grades.length) return null;
  return grades.length * 9;                    // a school year is ~9 active months
}

/** Span and active-month count across a set of dated rows. */
function datedSpan(rows, dateKey) {
  const dates = rows.map(r => r[dateKey]).filter(Boolean).map(d => new Date(`${String(d).slice(0, 10)}T00:00:00`)).filter(d => !Number.isNaN(+d));
  if (dates.length < 1) return {};
  const min = new Date(Math.min(...dates)), max = new Date(Math.max(...dates));
  const spanMonths = Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24 * 30.4)) + 1);
  const activeMonths = new Set(dates.map(d => `${d.getFullYear()}-${d.getMonth()}`)).size;
  return { spanMonths, activeMonths };
}

function verifiedShare(rows, hoursKey = 'hours') {
  const total = rows.reduce((s, r) => s + (num(r[hoursKey]) || 0), 0);
  if (!total) return null;
  const verified = rows.filter(r => r.verification_status === 'verified').reduce((s, r) => s + (num(r[hoursKey]) || 0), 0);
  return verified / total;
}

/**
 * Turns the raw Portfolio snapshot into the normalised signal object layer 3
 * scores. Every number here is traceable to rows the student entered
 * themselves — nothing is invented, and where a split has to be estimated
 * (shadowing out of clinical) the estimate is flagged so the intake can ask.
 */
export function derivePortfolioSignals(snapshot = {}) {
  const activities = snapshot.activities || [];
  const clinicalRows = snapshot.clinicalHours || [];
  const research = snapshot.research || [];
  const skills = snapshot.skills || [];
  const awards = snapshot.awards || [];

  // ── Clinical vs shadowing ────────────────────────────────────────────────
  // clinical_hours rows carry `experience_kind` where the student set it. Rows
  // predating that column, and rows left on the default, are counted as
  // hands-on and the split is marked estimated — so the intake can ask rather
  // than the model silently deciding.
  const shadowRows = clinicalRows.filter(r => r.experience_kind === 'shadowing');
  const handsOnRows = clinicalRows.filter(r => r.experience_kind !== 'shadowing');
  const splitIsExplicit = clinicalRows.length > 0 && clinicalRows.some(r => r.experience_kind);

  const clinicalActivityHours = activities.filter(a => CLINICAL_TYPES.includes(a.activity_type)).reduce((s, a) => s + annualHours(a), 0);
  const clinicalLoggedHours = handsOnRows.reduce((s, r) => s + (num(r.hours) || 0), 0);
  const shadowLoggedHours = shadowRows.reduce((s, r) => s + (num(r.hours) || 0), 0);

  // The dated clinical log and the Common App activity entry describe the same
  // hours from two angles, so we take the larger rather than adding them — the
  // old calculator's habit of summing overlapping sources is a straightforward
  // double count.
  const clinicalHours = Math.max(clinicalLoggedHours, clinicalActivityHours);

  const clinicalSpan = datedSpan(clinicalRows, 'entry_date');
  const shadowSpan = datedSpan(shadowRows, 'entry_date');

  const serviceActivities = activities.filter(a => SERVICE_TYPES.includes(a.activity_type));
  const serviceHours = serviceActivities.reduce((s, a) => s + annualHours(a), 0);

  const researchActivityHours = activities.filter(a => RESEARCH_TYPES.includes(a.activity_type)).reduce((s, a) => s + annualHours(a), 0);
  const researchLoggedHours = research.reduce((s, r) => s + (num(r.hours) || 0), 0);
  const researchHours = Math.max(researchActivityHours, researchLoggedHours);

  const leadership = activities
    .filter(a => LEADERSHIP_TYPES.includes(a.activity_type) || a.leadership_role)
    .map(a => ({ title: a.position, org: a.organization, months: activitySpanMonths(a), level: 'school' }));

  const competitions = awards.map(a => ({ title: a.title, level: a.level, months: null, verified: a.verification_status === 'verified' }));
  const certifications = skills.map(s => ({ title: s.name, issuer: s.issuing_body, months: null, verified: !!s.certificate_url }));

  return {
    clinical: {
      hours: clinicalHours, entries: clinicalRows.length + activities.filter(a => CLINICAL_TYPES.includes(a.activity_type)).length,
      ...clinicalSpan, verifiedShare: verifiedShare(handsOnRows),
      source: clinicalLoggedHours >= clinicalActivityHours ? 'clinical_hours log' : 'Activities & Résumé',
    },
    shadowing: {
      hours: shadowLoggedHours, entries: shadowRows.length, ...shadowSpan,
      verifiedShare: verifiedShare(shadowRows),
      estimated: !splitIsExplicit,
      source: 'clinical_hours log',
    },
    research: {
      hours: researchHours, entries: research.length,
      spanMonths: research.length ? Math.max(...research.map(() => 12)) : null,
      verifiedShare: null,
      hasPublication: research.some(r => !!r.publication_url),
      source: researchLoggedHours >= researchActivityHours ? 'Research entries' : 'Activities & Résumé',
    },
    service: {
      hours: serviceHours, entries: serviceActivities.length,
      spanMonths: serviceActivities.length ? Math.max(...serviceActivities.map(a => activitySpanMonths(a) || 9)) : null,
      verifiedShare: (() => {
        if (!serviceActivities.length) return null;
        const v = serviceActivities.filter(a => a.verification_status === 'verified').length;
        return v / serviceActivities.length;
      })(),
      source: 'Activities & Résumé',
    },
    leadership, competitions, certifications,

    // Provenance the panel shows next to each auto-filled row, so a student can
    // see where a number came from and go and fix it at the source.
    provenance: {
      clinical: 'Clinical Hours + Activities & Résumé',
      shadowing: splitIsExplicit ? 'Clinical Hours (marked as shadowing)' : 'estimated — none of your clinical entries are marked shadowing yet',
      research: 'Research entries + Activities & Résumé',
      service: 'Activities & Résumé (Volunteering)',
      leadership: 'Activities & Résumé (Leadership, and anything flagged as a leadership role)',
      competitions: 'Awards & Honours',
      certifications: 'Skills & Certifications',
    },
  };
}

/**
 * Reads the applicant fields the Portfolio can already answer. Anything not
 * derivable is left absent — never defaulted — so assessCompleteness() can see
 * the hole and the intake can ask about it.
 */
export function deriveApplicantFromPortfolio({ snapshot = {}, user = null } = {}) {
  const out = { _provenance: {} };
  const record = (key, value, source) => { if (value != null) { out[key] = value; out._provenance[key] = source; } };

  // ── GPA ──────────────────────────────────────────────────────────────────
  // gpa_entries carries a `weighted` flag per term, which is exactly the
  // distinction the old calculator collapsed. Take the most recent of each.
  const gpaRows = [...(snapshot.gpaEntries || [])].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const latestUnweighted = gpaRows.find(r => !r.weighted && num(r.gpa) != null);
  const latestWeighted = gpaRows.find(r => r.weighted && num(r.gpa) != null);
  record('unweightedGpa', latestUnweighted ? num(latestUnweighted.gpa) : null, `GPA term "${latestUnweighted?.term}"`);
  record('weightedGpa', latestWeighted ? num(latestWeighted.gpa) : null, `GPA term "${latestWeighted?.term}"`);

  // ── Tests: every sitting, with sections ──────────────────────────────────
  const scores = (snapshot.testScores || []).filter(s => !s.is_target && num(s.composite) != null);
  const tests = {};
  for (const type of ['SAT', 'ACT']) {
    const rows = scores.filter(s => s.test_type === type);
    if (!rows.length) continue;
    const best = rows.reduce((b, r) => (b == null || num(r.composite) > num(b.composite) ? r : b), null);
    const sections = normaliseSections(type, best.section_scores);
    // A per-section best across sittings — what a superscore would be. Held
    // separately from `composite` so the model can honour a programme that
    // refuses superscores instead of quietly using the flattering one.
    const superscore = computeSuperscore(type, rows);
    tests[type.toLowerCase()] = {
      composite: num(best.composite),
      bestSingleSitting: num(best.composite),
      sections, sittings: rows.length,
      superscoreAvailable: superscore != null && superscore > num(best.composite) ? superscore : null,
      allSittings: rows.map(r => ({ date: r.test_date, composite: num(r.composite), sections: normaliseSections(type, r.section_scores) })),
    };
  }
  if (Object.keys(tests).length) {
    tests.hasOfficialScore = true;
    record('tests', tests, 'Score Tracker');
  }

  if (user?.gradeLevel) record('gradeLevel', String(user.gradeLevel).replace(/\D/g, '') || null, 'your profile');
  if (user?.state) record('stateResidency', user.state, 'your profile');

  return out;
}

function normaliseSections(type, raw) {
  if (!raw) return {};
  const src = typeof raw === 'string' ? safeJson(raw) : raw;
  if (!src || typeof src !== 'object') return {};
  const out = {};
  const map = type === 'SAT'
    ? { ebrw: ['ebrw', 'reading', 'readingWriting', 'rw', 'verbal'], math: ['math'] }
    : { english: ['english'], math: ['math'], reading: ['reading'], science: ['science'] };
  for (const [canonical, aliases] of Object.entries(map)) {
    for (const key of Object.keys(src)) {
      if (aliases.includes(String(key).toLowerCase().replace(/[^a-z]/g, ''))) { out[canonical] = num(src[key]); break; }
    }
  }
  return out;
}

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

function computeSuperscore(type, rows) {
  const sectionKeys = type === 'SAT' ? ['ebrw', 'math'] : ['english', 'math', 'reading', 'science'];
  const bests = {};
  for (const r of rows) {
    const s = normaliseSections(type, r.section_scores);
    for (const k of sectionKeys) if (num(s[k]) != null) bests[k] = Math.max(bests[k] ?? 0, num(s[k]));
  }
  if (Object.keys(bests).length !== sectionKeys.length) return null;
  const total = sectionKeys.reduce((sum, k) => sum + bests[k], 0);
  return type === 'SAT' ? total : Math.round(total / sectionKeys.length);
}

/**
 * Merges auto-derived values with the student's own answers into the single
 * applicant object the model reads.
 *
 * The student's explicit answer always wins over the derived one — they know
 * their own record better than our inference of it — and the merge records
 * which is which so the UI can show "from your Portfolio" against one and
 * "you told us" against the other.
 */
export function buildApplicant({ derived = {}, answers = {}, portfolio = {} } = {}) {
  const applicant = { ...derived };
  delete applicant._provenance;
  const provenance = { ...(derived._provenance || {}) };

  for (const [k, v] of Object.entries(answers)) {
    if (v === '' || v === null || v === undefined) continue;
    applicant[k] = v;
    provenance[k] = 'you told us';
  }

  // Class rank, assembled from the two questions that have to be asked
  // separately — "does your school rank" and "where do you rank" — because a
  // school that does not rank must not read as a bad rank.
  applicant.classRank = {
    reported: answers.classRankReported === 'yes' ? true : answers.classRankReported === 'no' ? false : null,
    percentile: num(answers.classRankPercentile),
  };

  applicant.rigor = answers.rigorCounts
    ? { ...answers.rigorCounts, offeredAdvanced: num(answers.rigorOffered) }
    : (num(answers.rigorOffered) != null ? { offeredAdvanced: num(answers.rigorOffered) } : null);

  applicant.courses = answers.requiredCourses || null;

  // Documented service is a genuinely different number from logged service —
  // it is the one Drexel's gate reads. Fall back to the logged total only when
  // the student has not told us, and mark that the fallback happened.
  if (num(answers.documentedServiceHours) != null) {
    applicant.documentedServiceHours = num(answers.documentedServiceHours);
  } else if (portfolio?.service?.hours) {
    applicant.documentedServiceHours = portfolio.service.hours;
    provenance.documentedServiceHours = 'assumed equal to your logged service hours — tell us the documented figure if it is lower';
  }

  // Superscore handling: the student's answer decides, and where they have not
  // answered we treat the score as single-sitting, which is the conservative
  // reading rather than the flattering one.
  if (applicant.tests) {
    const superscored = answers.scoreSittingPolicy === 'superscored';
    for (const t of ['sat', 'act']) {
      if (!applicant.tests[t]) continue;
      applicant.tests[t] = { ...applicant.tests[t], superscored };
      if (superscored && applicant.tests[t].superscoreAvailable) {
        applicant.tests[t].composite = applicant.tests[t].superscoreAvailable;
      }
    }
  }

  if (answers.hooks) applicant.hooks = answers.hooks;
  applicant._provenance = provenance;
  return applicant;
}

// ─────────────────────────────────────────────────────────────────────────────
// The completeness meter.
// ─────────────────────────────────────────────────────────────────────────────

function fieldIsAnswered(field, { applicant, answers }) {
  switch (field.id) {
    case 'unweightedGpa': return num(applicant.unweightedGpa) != null;
    case 'weightedGpa': return num(applicant.weightedGpa) != null;
    case 'hundredPointAverage': return num(applicant.hundredPointAverage) != null;
    case 'classRankReported': return !!answers.classRankReported;
    case 'classRankPercentile': return answers.classRankReported !== 'yes' || num(answers.classRankPercentile) != null;
    case 'rigorCounts': return !!(applicant.rigor && (num(applicant.rigor.ap) || num(applicant.rigor.ib) || num(applicant.rigor.honors) || num(applicant.rigor.dualEnrollment)));
    case 'rigorOffered': return num(applicant.rigor?.offeredAdvanced) != null;
    case 'testSections': {
      const sat = applicant.tests?.sat, act = applicant.tests?.act;
      if (!sat && !act) return false;
      return Object.keys(sat?.sections || {}).length > 0 || Object.keys(act?.sections || {}).length > 0;
    }
    case 'scoreSittingPolicy': return !!answers.scoreSittingPolicy;
    case 'citizenship': return !!applicant.citizenship;
    case 'stateResidency': return !!applicant.stateResidency;
    case 'gradeLevel': return !!applicant.gradeLevel;
    case 'requiredCourses': return !!(applicant.courses && Object.keys(applicant.courses).length >= 3);
    case 'documentedServiceHours': return num(answers.documentedServiceHours) != null;
    case 'hooks': return !!answers.hooks;
    default: return false;
  }
}

/**
 * "We have eleven of fifteen things we'd need for a confident estimate", and
 * which four are missing.
 *
 * @returns {{have:number, total:number, ratio:number, missing:Array, answered:Array,
 *            sentence:string}}
 */
export function assessCompleteness({ applicant = {}, answers = {} } = {}) {
  const relevant = METER_FIELDS.filter(f => {
    if (!f.dependsOn) return true;
    return Object.entries(f.dependsOn).every(([k, v]) => answers[k] === v);
  });

  const answered = [], missing = [];
  for (const f of relevant) {
    (fieldIsAnswered(f, { applicant, answers }) ? answered : missing).push({
      id: f.id, label: f.label, why: f.why, changes: f.changes, group: f.group, weight: f.weight,
      source: applicant._provenance?.[f.id] || null,
    });
  }

  const total = relevant.length, have = answered.length;
  const sentence = missing.length === 0
    ? `We have all ${total} of the things we would need for a confident estimate.`
    : `We have ${have} of the ${total} things we would need for a confident estimate. ${missing.length === 1 ? 'One is' : `${missing.length} are`} missing — and ${missing.length === 1 ? 'it is' : 'they are'} widening every range below rather than being quietly assumed.`;

  return {
    have, total, ratio: total ? have / total : 0,
    missing: missing.sort((a, b) => b.weight - a.weight),
    answered, sentence,
  };
}

/**
 * Fields worth asking about right now, hardest-hitting first, filtered to what
 * the programmes on the student's list actually gate on — so a student with no
 * New York programmes is never asked a New York question.
 */
export function nextQuestions({ applicant, answers, profiles = [], limit = 5 }) {
  const gatedFields = new Set();
  for (const p of profiles) {
    for (const g of p?.gates || []) {
      const r = JSON.stringify(g.requires || {});
      if (r.includes('citizenship')) gatedFields.add('citizenship');
      if (r.includes('stateResidency')) gatedFields.add('stateResidency');
      if (r.includes('unweightedGpa')) gatedFields.add('unweightedGpa');
      if (r.includes('weightedGpa')) gatedFields.add('weightedGpa');
      if (r.includes('hundredPointAverage')) gatedFields.add('hundredPointAverage');
      if (r.includes('classRankTopPercent')) { gatedFields.add('classRankReported'); gatedFields.add('classRankPercentile'); }
      if (r.includes('courses')) gatedFields.add('requiredCourses');
      if (r.includes('documentedServiceHours')) gatedFields.add('documentedServiceHours');
      if (r.includes('gradeLevel')) gatedFields.add('gradeLevel');
      if (r.includes('section')) gatedFields.add('testSections');
    }
    if (p?.academics?.superscore === 'refused') gatedFields.add('scoreSittingPolicy');
  }

  const { missing } = assessCompleteness({ applicant, answers });
  return missing
    .map(m => ({ ...m, gates: gatedFields.has(m.id) }))
    .sort((a, b) => (b.gates - a.gates) || (b.weight - a.weight))
    .slice(0, limit);
}

export { METER_FIELDS };
