// ─────────────────────────────────────────────────────────────────────────────
// Academic history intelligence — the GPA half of the Activities & Resume
// Builder, and the thing that makes the student's transcript actually *decide*
// something instead of drawing a line chart nobody acts on.
//
// THE PROBLEM THIS FIXES
// Before this module, Academic History was a form, a table, and a chart. A
// student could type 4.0 four terms in a row and the app's only response was a
// line that went sideways at the top of the y-axis. Nothing downstream read it:
// the college matcher in collegeRecommend.js worked purely off SAT/ACT, so the
// single number that admissions offices weight most heavily — the one the
// student was dutifully entering term after term — changed precisely nothing
// about what the app recommended, said, or believed about them.
//
// WHAT IT DOES NOW
// Academic history is a first-class input to the whole Portfolio:
//
//   1. It is READ — trend, momentum, rigor, weighted vs unweighted, the
//      difference between a 3.6 that is climbing and a 3.6 that is falling
//      (which are not remotely the same application).
//   2. It DECIDES — recommendByAcademics() matches the student against all 151
//      U.S. schools on BOTH axes (their GPA against the school's admitted-student
//      GPA, their score against its SAT/ACT midpoints) and against the career
//      they told us they want, so a future nurse and a future researcher with
//      identical numbers get different slates.
//   3. It TALKS BACK — reactToGpa() is the "you just entered a 4.0" moment: a
//      real verdict on the number, three named schools that fit it and fit
//      their stated career, and a reason for each. This is the specific
//      behaviour the panel was rebuilt around.
//
// HONESTY RULES, non-negotiable, same as everywhere else in the app:
//   - Praise is proportional and specific. A 4.0 gets told it is excellent and
//     also told what it does NOT do (a perfect GPA at a school with no rigor,
//     or with a 1050 SAT, is a specific and common trap — we name it).
//   - A weak GPA is never dressed up, and never catastrophized either. It gets
//     the truth plus the two things that actually still move.
//   - Every school named comes from SCHOOL_DATA. Nothing is invented, and every
//     recommendation carries the numbers it was made from.
//
// Pure functions. Asserted on by scripts/verifyResumeBuilder.mjs.
// ─────────────────────────────────────────────────────────────────────────────
// Explicit .js extensions: scripts/verifyResumeBuilder.mjs loads this module in Node, which
// does not resolve extensionless ESM specifiers the way Vite does.
import { SCHOOL_DATA } from '../data/constants.js';
import { categorizeSchool } from './collegeRecommend.js';

// ── Reading the transcript ───────────────────────────────────────────────────

// GPA entries have a free-text `term` ("Grade 11, Fall", "Junior year S1"), so
// chronology has to be inferred rather than sorted. Grade number first, then
// term-within-year, then insertion order — which is right far more often than
// alphabetical sorting on a free-text field, and when it is wrong the student
// can see the order in the list and fix the labels.
const TERM_ORDER = [
  [/fall|sem(ester)?\s*1|s1|q1|first/i, 1],
  [/winter|q2/i, 2],
  [/spring|sem(ester)?\s*2|s2|q3|second/i, 3],
  [/summer|q4/i, 4],
];
export function termSortKey(term, index) {
  const t = String(term || '');
  const gradeMatch = t.match(/\b(9|10|11|12)\b/) || t.match(/\b(freshman|sophomore|junior|senior)\b/i);
  let grade = 0;
  if (gradeMatch) {
    const g = gradeMatch[1].toLowerCase();
    grade = { freshman: 9, sophomore: 10, junior: 11, senior: 12 }[g] || parseInt(g, 10) || 0;
  }
  let within = 0;
  for (const [re, v] of TERM_ORDER) if (re.test(t)) { within = v; break; }
  return grade * 100 + within * 10 + Math.min(9, index);
}

export function sortGpaEntries(entries = []) {
  return [...entries]
    .map((e, i) => ({ e, i, k: termSortKey(e.term, i) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map(x => x.e);
}

// Approximate unweighted equivalent of a weighted GPA. Weighting schemes vary
// wildly between schools (5.0 scales, 4.5 scales, +1 for AP only, +0.5 for
// honors), so this is explicitly a rough conversion and every caller labels it
// as one. It exists because SCHOOL_DATA's `gpa` values are unweighted admitted
// averages: comparing a 4.4 weighted against a 3.9 unweighted admitted average
// and concluding "you're above their average" is the exact wrong answer.
export function approxUnweighted(gpa, weighted) {
  const g = Number(gpa);
  if (!Number.isFinite(g)) return null;
  if (!weighted) return g;
  if (g <= 4.0) return g;
  return Math.min(4.0, Math.round((g - (g - 4.0) * 0.85) * 100) / 100);
}

/**
 * The transcript, read. Everything downstream — matching, verdicts, the AI
 * prompt — is built from this one object.
 */
export function analyzeAcademics(gpaEntries = []) {
  const sorted = sortGpaEntries(gpaEntries).filter(e => Number.isFinite(Number(e.gpa)));
  if (!sorted.length) {
    return { hasData: false, count: 0, latest: null, entries: [], trend: 'none', unweightedLatest: null };
  }
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const values = sorted.map(e => Number(e.gpa));
  const unweighted = sorted.map(e => approxUnweighted(e.gpa, e.weighted));

  const best = Math.max(...values);
  const worst = Math.min(...values);
  const mean = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 1000) / 1000;
  const delta = Math.round((Number(latest.gpa) - Number(first.gpa)) * 100) / 100;

  // Trend needs at least three terms to be a trend rather than a coin flip, and
  // the threshold is deliberately 0.1 — GPA noise between two terms is real and
  // calling a 0.03 dip "a downward trend" is the kind of false alarm that makes
  // a student stop reading.
  let trend = 'flat';
  if (sorted.length >= 2) {
    if (delta >= 0.1) trend = 'rising';
    else if (delta <= -0.1) trend = 'falling';
  }
  if (sorted.length >= 3) {
    const half = Math.floor(sorted.length / 2);
    const early = values.slice(0, half).reduce((s, v) => s + v, 0) / half;
    const late = values.slice(-half).reduce((s, v) => s + v, 0) / half;
    const swing = late - early;
    if (swing >= 0.15) trend = 'rising';
    else if (swing <= -0.15) trend = 'falling';
  }

  const rigorText = sorted.map(e => e.course_rigor).filter(Boolean).join(' ');
  const apCount = (rigorText.match(/\bap\b/gi) || []).length;
  const apNumber = (() => {
    const m = rigorText.match(/(\d+)\s*(?:ap|advanced placement|honors|ib)/i);
    return m ? parseInt(m[1], 10) : null;
  })();
  const hasRigorNote = sorted.some(e => String(e.course_rigor || '').trim());
  const anyWeighted = sorted.some(e => e.weighted);
  const allWeighted = sorted.every(e => e.weighted);

  return {
    hasData: true,
    count: sorted.length,
    entries: sorted,
    latest,
    latestGpa: Number(latest.gpa),
    latestWeighted: !!latest.weighted,
    unweightedLatest: approxUnweighted(latest.gpa, latest.weighted),
    unweightedSeries: unweighted,
    first, best, worst, mean, delta, trend,
    anyWeighted, allWeighted, hasRigorNote, apCount, apNumber,
    // The number every downstream comparison should use: an unweighted-scale
    // GPA, because that is the scale SCHOOL_DATA is on.
    comparableGpa: approxUnweighted(latest.gpa, latest.weighted),
  };
}

// ── The verdict on a number ──────────────────────────────────────────────────
// Bands are stated in terms of what the GPA DOES — which doors it opens, which
// it closes — not in adjectives. "Good" is not information; "at or above the
// admitted average at roughly two-thirds of the schools we track" is.
export function gpaBand(unweightedGpa) {
  const g = Number(unweightedGpa);
  if (!Number.isFinite(g)) return null;
  if (g >= 3.95) return { id: 'exceptional', label: 'Exceptional', tone: 'great' };
  if (g >= 3.8) return { id: 'excellent', label: 'Excellent', tone: 'good' };
  if (g >= 3.6) return { id: 'strong', label: 'Strong', tone: 'good' };
  if (g >= 3.3) return { id: 'solid', label: 'Solid', tone: 'info' };
  if (g >= 3.0) return { id: 'building', label: 'Building', tone: 'warn' };
  return { id: 'needswork', label: 'Needs a real push', tone: 'critical' };
}

/** How many of the tracked U.S. schools this GPA sits at or above. Real arithmetic, not a vibe. */
export function gpaPercentileContext(unweightedGpa) {
  const g = Number(unweightedGpa);
  const universe = SCHOOL_DATA.filter(s => Number.isFinite(s.gpa));
  if (!Number.isFinite(g) || !universe.length) return null;
  const atOrAbove = universe.filter(s => g >= s.gpa).length;
  return { total: universe.length, atOrAbove, pct: Math.round((atOrAbove / universe.length) * 100) };
}

// ── Career fit ───────────────────────────────────────────────────────────────
// The student told us what they want to be. A school's fit for a future nurse
// is not the same as its fit for a future biotech researcher, and until now the
// app collected that answer at signup and never used it to pick a school.
const ROLE_PROFILES = {
  physician: {
    label: 'physician or surgeon',
    specialties: ['Pre-Med'], bsmdBonus: 12, clinicalBonus: 8, committeeBonus: 6,
    note: 'a strong pre-med committee and a hospital you can actually get to are what matter most on the road to medical school',
  },
  nurse: {
    label: 'nurse or nurse practitioner',
    specialties: ['Nursing'], bsmdBonus: 2, clinicalBonus: 12, committeeBonus: 2,
    note: 'a direct-entry BSN program and clinical placements nearby matter far more than general prestige',
  },
  pa: {
    label: 'physician assistant',
    specialties: ['Pre-Med', 'Nursing'], bsmdBonus: 3, clinicalBonus: 12, committeeBonus: 5,
    note: 'PA programs want documented patient-contact hours, so proximity to clinical work is the thing to optimize for',
  },
  mental_health: {
    label: 'psychiatry or mental health',
    specialties: ['Pre-Med', 'Research'], bsmdBonus: 8, clinicalBonus: 6, committeeBonus: 6,
    note: 'psychiatry runs through medical school, so this is a pre-med path with a psychology/neuroscience emphasis',
  },
  research: {
    label: 'medical research or biotech',
    specialties: ['Research'], bsmdBonus: 4, clinicalBonus: 3, committeeBonus: 3,
    note: 'undergraduate lab access is the whole game here — a research-heavy school beats a more selective teaching-focused one',
  },
  other_health: {
    label: 'another health career',
    specialties: ['Pharmacy', 'Public Health', 'Dentistry', 'Nursing', 'Pre-Med'], bsmdBonus: 4, clinicalBonus: 8, committeeBonus: 5,
    note: 'pharmacy, PT, and public health all reward a school with a real health-sciences school attached',
  },
  undecided: {
    label: 'a health career you are still choosing between',
    specialties: ['Pre-Med', 'Research', 'Nursing'], bsmdBonus: 5, clinicalBonus: 7, committeeBonus: 6,
    note: 'while the specific role is still open, breadth matters — a school with strong programs in several health tracks keeps the decision cheap',
  },
};
export const roleProfile = (dreamRole) => ROLE_PROFILES[dreamRole] || ROLE_PROFILES.undecided;

// ── Academic categorization ──────────────────────────────────────────────────
// Reach/target/safety from GPA alone, on the same shape as categorizeSchool()
// in collegeRecommend.js so the two can be combined without one silently
// dominating.
const GPA_REACH_GAP = 0.12;   // school's admitted average this far ABOVE them → reach
const GPA_SAFETY_GAP = 0.25;  // this far BELOW them → safety

export function categorizeByGpa(school, comparableGpa) {
  // `comparableGpa == null` is checked before the numeric coercion on purpose: Number(null) is 0,
  // which is finite, so a student with no GPA logged would otherwise be silently treated as a 0.0
  // and every selective school would come back as a reach "because of their grades".
  if (comparableGpa == null || !Number.isFinite(Number(comparableGpa)) || !Number.isFinite(school?.gpa)) return null;
  const gap = school.gpa - comparableGpa;
  if (school.accept != null && school.accept < 15) return 'reach';
  let cat = gap > GPA_REACH_GAP ? 'reach' : gap < -GPA_SAFETY_GAP ? 'safety' : 'target';
  if (cat === 'safety' && school.accept != null && school.accept < 50) cat = 'target';
  return cat;
}

// The combined call, which is the one the student should actually act on: a
// school where the GPA says target and the SAT says reach is a reach, because
// admissions offices do not average two axes into a comfortable middle. The
// stricter of the two wins, and we keep both so the UI can show the student
// exactly which number is holding them back.
const SEVERITY = { safety: 0, target: 1, reach: 2 };
export function categorizeCombined(school, { comparableGpa, effectiveSat }) {
  const byGpa = categorizeByGpa(school, comparableGpa);
  const bySat = effectiveSat != null ? categorizeSchool(school, effectiveSat) : null;
  if (!byGpa && !bySat) return { category: null, byGpa, bySat, driver: null };
  if (!byGpa) return { category: bySat, byGpa, bySat, driver: 'score' };
  if (!bySat) return { category: byGpa, byGpa, bySat, driver: 'gpa' };
  const category = SEVERITY[byGpa] >= SEVERITY[bySat] ? byGpa : bySat;
  const driver = SEVERITY[byGpa] === SEVERITY[bySat] ? 'both' : (SEVERITY[byGpa] > SEVERITY[bySat] ? 'gpa' : 'score');
  return { category, byGpa, bySat, driver };
}

/**
 * How well a school fits THIS student — academics, scores, and the career they
 * told us they want. 0-100. Career weight is real (up to ~26 points) because
 * that is the entire premise: the student said they want to be a nurse, and a
 * ranking that hands them the same seven liberal-arts colleges as everyone else
 * has ignored the only thing they actually told us about themselves.
 */
export function academicFit(school, { comparableGpa, effectiveSat, dreamRole, category }) {
  const profile = roleProfile(dreamRole);
  let base;
  const gpaGap = Number.isFinite(school.gpa) && Number.isFinite(comparableGpa) ? school.gpa - comparableGpa : 0;
  if (category === 'reach') base = 100 - Math.min(100, Math.max(0, gpaGap - GPA_REACH_GAP) * 110);
  else if (category === 'safety') base = 100 - Math.min(100, Math.max(0, -gpaGap - GPA_SAFETY_GAP) * 60);
  else base = 100 - Math.abs(gpaGap) * 55;

  // Test score pulls the base toward or away from where GPA put it, at half
  // weight — GPA is four years of evidence, a test is four hours of it.
  if (effectiveSat != null && Number.isFinite(school.sat)) {
    const satGap = school.sat - effectiveSat;
    base = base - Math.min(30, Math.abs(satGap) * 0.06);
  }

  let bonus = 0;
  if (profile.specialties.includes(school.specialtyStrong)) bonus += 10;
  if (school.preHealthRank) bonus += (school.preHealthRank - 3) * 3;
  if (school.bsmd) bonus += profile.bsmdBonus;
  if (school.clinicalProximity === 'Excellent') bonus += profile.clinicalBonus;
  else if (school.clinicalProximity === 'Good') bonus += Math.round(profile.clinicalBonus * 0.4);
  if (school.hasPreMedCommittee) bonus += profile.committeeBonus;

  return Math.max(0, Math.min(100, Math.round(base * 0.78 + bonus)));
}

/** The plain-English reason a school made the cut — never a bare name without one. */
export function academicReason(school, { comparableGpa, effectiveSat, dreamRole, category, driver }) {
  const profile = roleProfile(dreamRole);
  const bits = [];
  if (Number.isFinite(school.gpa) && Number.isFinite(comparableGpa)) {
    const gap = Math.round((comparableGpa - school.gpa) * 100) / 100;
    if (category === 'reach') bits.push(`admitted students average a ${school.gpa} GPA against your ${comparableGpa}${gap < 0 ? ` — ${Math.abs(gap)} above you` : ''}, and they admit ${school.accept}%`);
    else if (category === 'safety') bits.push(`your ${comparableGpa} sits ${Math.abs(gap)} above their ${school.gpa} admitted average — you are in a strong position here`);
    else bits.push(`your ${comparableGpa} is right at their ${school.gpa} admitted average`);
  }
  if (effectiveSat != null && Number.isFinite(school.sat)) {
    const d = effectiveSat - school.sat;
    bits.push(`SAT mid ${school.sat} / ACT ${school.act} vs your ${effectiveSat}${d >= 0 ? ` (+${d})` : ` (${d})`}`);
  }
  if (profile.specialties.includes(school.specialtyStrong)) bits.push(`known for ${school.specialtyStrong} — the exact track for ${profile.label}`);
  if (school.bsmd) bits.push('has a BS/MD program you could apply straight into');
  if (school.preHealthRank >= 5) bits.push('top-tier pre-health advising');
  else if (school.hasPreMedCommittee) bits.push('has a pre-med committee');
  if (school.clinicalProximity === 'Excellent') bits.push('excellent clinical access nearby');
  if (driver === 'gpa') bits.push('your GPA is what decides this one, not your test score');
  else if (driver === 'score') bits.push('your test score is the binding constraint here, not your GPA');
  return bits.join(' · ');
}

const DEFAULT_QUOTA = { reach: 2, target: 3, safety: 2 };

/**
 * The academic-history-driven college slate.
 *
 * @param {Object} opts
 * @param {Object} opts.academics  output of analyzeAcademics()
 * @param {Object} opts.scores     output of resolveStudentScores() (may have no score)
 * @param {Object} opts.user       the app user (dreamRole drives career fit)
 * @param {Array}  opts.existing   colleges already on their list — excluded
 * @param {Object} opts.quota      how many of each category
 */
export function recommendByAcademics({ academics, scores = null, user = null, existing = [], quota = DEFAULT_QUOTA } = {}) {
  const comparableGpa = academics?.comparableGpa ?? null;
  const effectiveSat = scores?.effectiveSat ?? null;
  if (comparableGpa == null && effectiveSat == null) return [];

  const taken = new Set((existing || []).map(c => String(c.name || '').trim().toLowerCase()));
  const dreamRole = user?.dreamRole || 'undecided';

  const scored = SCHOOL_DATA
    .filter(s => Number.isFinite(s.gpa) && !taken.has(s.name.toLowerCase()))
    .map(school => {
      const { category, byGpa, bySat, driver } = categorizeCombined(school, { comparableGpa, effectiveSat });
      if (!category) return null;
      return {
        school, name: school.name, category, byGpa, bySat, driver,
        fit: academicFit(school, { comparableGpa, effectiveSat, dreamRole, category }),
        reason: academicReason(school, { comparableGpa, effectiveSat, dreamRole, category, driver }),
        gpaGap: Number.isFinite(comparableGpa) ? Math.round((school.gpa - comparableGpa) * 100) / 100 : null,
        satGap: effectiveSat != null && Number.isFinite(school.sat) ? school.sat - effectiveSat : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.fit - a.fit);

  const out = [];
  const order = ['reach', 'target', 'safety'];
  for (const cat of order) out.push(...scored.filter(r => r.category === cat).slice(0, quota[cat] ?? 0));
  const want = order.reduce((n, c) => n + (quota[c] ?? 0), 0);
  if (out.length < want) {
    const chosen = new Set(out.map(r => r.name));
    out.push(...scored.filter(r => !chosen.has(r.name)).slice(0, want - out.length));
  }
  return out.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || b.fit - a.fit);
}

// ── "You just entered a 4.0" ─────────────────────────────────────────────────
// The moment the whole panel was rebuilt around. A GPA entry is saved and
// Medabrain reacts to the actual number: what it means, what it opens, three
// named schools that fit both it and the career the student told us they want,
// and — where it is earned — genuine belief, said once and meant.

const BAND_VERDICT = {
  exceptional: (g) => `A ${g} is as good as this number gets. At that level your GPA stops being the thing that decides your applications and becomes the thing that lets everything else decide them — which means the rest of your file (what you have actually done, and how you write about it) is now carrying the weight.`,
  excellent: (g) => `A ${g} is genuinely excellent. It clears the academic bar at most of the schools worth applying to, and it means an admissions reader will spend their time on your activities and essays rather than on whether you can handle the coursework.`,
  strong: (g) => `A ${g} is a strong GPA. It puts you in range at a wide band of very good schools; where it stops short is the most selective handful, and at those the honest lever is rigor and an upward trend, not a decimal point.`,
  solid: (g) => `A ${g} is solid and workable. It is not going to open the most selective doors on its own, and pretending otherwise would waste your year — but it is comfortably in range at a lot of schools with real pre-health programs, and those are the ones worth your applications.`,
  building: (g) => `A ${g} is below where you want to be for a competitive pre-health path, and that is worth saying plainly rather than softening. It is also early enough to move: GPA is cumulative, so the next four report cards count more than anything else on this page.`,
  needswork: (g) => `A ${g} is the thing standing between you and most of your options right now, and no activities list fixes it. The good news is that it is also the most fixable — it responds directly to work, on a schedule you control.`,
};

const TREND_LINE = {
  rising: (d) => `Your GPA has climbed ${Math.abs(d)} across the terms you have logged. An upward trend is the single most persuasive pattern a transcript can show — admissions readers explicitly look for it, and it is the one thing that makes an early bad semester stop mattering.`,
  falling: (d) => `Your GPA has dropped ${Math.abs(d)} across the terms you have logged. A downward trend costs more than the average itself does, because it is the pattern readers are most wary of. If there is a reason, that is what the additional-information section on the application is for — and if there is not, this is the term to reverse it.`,
  flat: () => `Your GPA has held steady across the terms you have logged. Consistency reads well; the question a reader will have is whether the rigor went up while the number stayed level, which is what makes a flat line impressive rather than neutral.`,
  none: () => '',
};

/**
 * The full reaction to a saved GPA entry.
 * @returns {{headline, verdict, trend, context, careerLine, picks, belief, tone}}
 */
export function reactToGpa({ academics, scores = null, user = null, existing = [] }) {
  if (!academics?.hasData) return null;
  const g = academics.comparableGpa;
  const band = gpaBand(g);
  const profile = roleProfile(user?.dreamRole);
  const ctx = gpaPercentileContext(g);
  const picks = recommendByAcademics({
    academics, scores, user, existing,
    quota: { reach: 1, target: 2, safety: 1 },
  }).slice(0, 3);

  const weightedNote = academics.latestWeighted
    ? ` (you logged ${academics.latestGpa} weighted, which is roughly a ${g} unweighted — the scale colleges compare on)`
    : '';

  const headline =
    band.id === 'exceptional' ? `A ${academics.latestGpa}${academics.latestWeighted ? ' weighted' : ''} — that is a genuinely outstanding GPA.` :
    band.id === 'excellent' ? `A ${academics.latestGpa}${academics.latestWeighted ? ' weighted' : ''} is an excellent GPA.` :
    band.id === 'strong' ? `A ${academics.latestGpa}${academics.latestWeighted ? ' weighted' : ''} is a strong GPA.` :
    band.id === 'solid' ? `A ${academics.latestGpa}${academics.latestWeighted ? ' weighted' : ''} is solid — and honestly assessed, it is workable.` :
    `A ${academics.latestGpa}${academics.latestWeighted ? ' weighted' : ''} is below where you need it, and it is early enough to say so usefully.`;

  const contextLine = ctx
    ? `On the unweighted scale colleges compare against, you are at or above the admitted-student average at ${ctx.atOrAbove} of the ${ctx.total} U.S. schools MedSchoolPrep tracks — ${ctx.pct}% of them.`
    : '';

  const careerLine = picks.length
    ? `You told us you are aiming at ${profile.label}, so these are matched on that too, not just on the number — for you, ${profile.note}.`
    : '';

  // Belief, earned and stated once. The stance file is explicit that praise is
  // specific or absent — so this is tied to the actual number and trend, and
  // there is no version of it for a student who has not done anything yet.
  const belief =
    band.id === 'exceptional' && academics.trend !== 'falling'
      ? 'You are doing the academic part right. Keep it there, put the same seriousness into what you actually build outside class, and the schools below are genuinely in play — I would not list them if they were not.'
      : band.id === 'excellent' || (band.id === 'strong' && academics.trend === 'rising')
        ? 'This is real work and it is showing. Hold this line through next term and your application stops being about your grades at all — which is exactly where you want it.'
        : academics.trend === 'rising'
          ? 'The direction matters more than today\'s number, and yours is going the right way. Keep the climb going and the story your transcript tells is a good one.'
          : '';

  return {
    tone: band.tone,
    band,
    headline,
    verdict: (BAND_VERDICT[band.id] || BAND_VERDICT.solid)(g) + weightedNote,
    trend: academics.count >= 2 ? TREND_LINE[academics.trend](academics.delta) : '',
    context: contextLine,
    careerLine,
    picks,
    belief,
  };
}

/**
 * Standing, always-visible statements about the academic record — the same role
 * slateInsights() plays for activities. Computed, so they stay correct with the
 * network down.
 */
export function academicInsights({ academics, scores = null, user = null, existing = [] }) {
  const out = [];
  if (!academics?.hasData) {
    out.push({ tone: 'info', text: 'No GPA logged yet. This is the number admissions offices weight most heavily, and until it is here the college matching below is running on test scores alone — which is half the picture.' });
    return out;
  }
  const g = academics.comparableGpa;
  const band = gpaBand(g);
  const ctx = gpaPercentileContext(g);

  out.push({
    tone: band.tone === 'great' ? 'good' : band.tone,
    text: `${band.label}: ${academics.latestGpa}${academics.latestWeighted ? ` weighted (≈ ${g} unweighted)` : ' unweighted'} as of ${academics.latest.term}.${ctx ? ` At or above the admitted-student average at ${ctx.atOrAbove} of ${ctx.total} tracked U.S. schools.` : ''}`,
  });

  if (academics.count === 1) {
    out.push({ tone: 'info', text: 'One term logged. Add the rest — a single GPA is a snapshot, and the trend across terms is what an admissions reader actually reads. Two terms is enough to start showing a direction.' });
  } else {
    out.push({
      tone: academics.trend === 'rising' ? 'good' : academics.trend === 'falling' ? 'warn' : 'info',
      text: TREND_LINE[academics.trend](academics.delta),
    });
  }

  if (academics.anyWeighted && !academics.allWeighted) {
    out.push({ tone: 'warn', text: 'Some of your entries are weighted and some are not, so the chart is comparing two different scales against each other. Pick one and re-enter the odd ones out, or the trend line is telling you something that is not true.' });
  }
  if (!academics.hasRigorNote) {
    out.push({ tone: 'info', text: 'No course rigor recorded on any term. A 3.8 with five APs and a 3.8 with none are different applications, and rigor is the field that tells the difference — it also gets handed to Medabrain when it reasons about your college list.' });
  } else if (academics.apNumber != null && academics.apNumber >= 4 && g >= 3.8) {
    out.push({ tone: 'good', text: `A ${g} unweighted while carrying ${academics.apNumber} advanced courses is the combination that actually reads well — the number and the rigor behind it together. That is a stronger position than a 4.0 with an easy schedule, and readers know it.` });
  }

  const hasScore = scores?.hasScore;
  if (hasScore && g >= 3.85 && scores.effectiveSat < 1250) {
    out.push({ tone: 'warn', text: `Your GPA (${g}) and your test score (SAT ${scores.effectiveSat} equivalent) are telling different stories, and readers notice the gap. Right now the test is the binding constraint on your list — the SAT tab is where that moves, and it moves faster than a GPA does.` });
  } else if (hasScore && g < 3.4 && scores.effectiveSat >= 1350) {
    out.push({ tone: 'info', text: `Strong test score (SAT ${scores.effectiveSat} equivalent) against a ${g} GPA. That combination is workable but it needs the transcript to be climbing — a high score with a flat, low GPA reads as capable-but-not-doing-the-work, and that is a harder file to admit.` });
  } else if (!hasScore) {
    out.push({ tone: 'info', text: 'No SAT or ACT logged, so the matches below are being decided by GPA alone. Adding a real score in the Score Tracker sharpens every recommendation on this page.' });
  }

  const listed = (existing || []).length;
  if (listed === 0 && band.id !== 'needswork') {
    out.push({ tone: 'info', text: 'Your college list is empty. The matches below are picked from your GPA, your score, and the career you told us you want — adding a few of them is the fastest way to turn this page into an actual plan.' });
  }
  return out;
}
