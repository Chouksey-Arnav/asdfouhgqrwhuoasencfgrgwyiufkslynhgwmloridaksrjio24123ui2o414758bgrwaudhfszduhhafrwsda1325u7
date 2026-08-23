// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — hard gates. The things that multiply to zero.
//
// ── The modelling mistake this replaces ─────────────────────────────────────
// The old calculator gave every input a weight and added them up. Under that
// design a requirement is just a heavy feature: an international student who is
// categorically ineligible for UMKC's six-year programme lost some points and
// still got a percentage, and a student 170 hours short of Drexel's documented
// service requirement saw a number rather than the sentence they needed to
// read. A weighted model cannot express "no", only "less" — and admissions is
// full of genuine noes.
//
// So gates are evaluated FIRST and separately, and a failed hard gate does not
// produce a low percentage. It produces no percentage at all, plus the exact
// thing that would have to change. That is the entire contract of this file.
//
// ── Three outcomes, never two ───────────────────────────────────────────────
// Every gate resolves to pass, fail, or UNKNOWN. Unknown is the one that
// matters: it is what happens when the student skipped the field, and it must
// never quietly become either of the other two. A skipped citizenship question
// is not a failed citizenship gate (we would be telling an eligible student
// they cannot apply) and it is not a passed one (we would be showing a
// confident number built on a guess). It surfaces as "we can't check this yet",
// it widens the model's uncertainty band, and it caps the confidence label.
//
// ── Hard vs preference ──────────────────────────────────────────────────────
// `severity: 'hard'` is a published bar and zeroes the estimate. `preference`
// is for the honest middle case — a programme *designed for* a group without
// stating a bar (CUNY and New York residency; ASU's direct-admission routes).
// It applies a stated multiplier and is shown to the student with the
// distinction intact, because "you are ineligible" and "this is harder for you
// and here is roughly how much" are different sentences and students can tell.
// ─────────────────────────────────────────────────────────────────────────────

const PASS = 'pass', FAIL = 'fail', UNKNOWN = 'unknown';

// Number(null) === 0 and 0 is finite, so the naive version reads an unanswered
// numeric field as a logged zero. This is the most consequential of the four
// copies of this helper: a gate reading 0 instead of null returns FAIL where it
// should return UNKNOWN, and a failed hard gate suppresses the estimate
// entirely. A student who simply had not logged their service hours yet would
// have been told they do not meet a published requirement.
const num = (v) => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Combines child results the way a logical AND must when 'unknown' exists. */
function andResults(results) {
  if (results.some(r => r === FAIL)) return FAIL;
  if (results.some(r => r === UNKNOWN)) return UNKNOWN;
  return PASS;
}

/** Combines child results the way a logical OR must when 'unknown' exists. */
function orResults(results) {
  // A single satisfied branch is enough, even if a sibling is unknown — this is
  // what makes "top 10% class rank OR a 3.80 GPA OR a 3.50 with a 25 ACT"
  // resolve for a student whose school does not report rank at all.
  if (results.some(r => r === PASS)) return PASS;
  if (results.some(r => r === UNKNOWN)) return UNKNOWN;
  return FAIL;
}

/**
 * Evaluates one requirement expression against the applicant.
 *
 * Leaf shapes are deliberately tiny and declarative so that a programme profile
 * stays readable as data — see src/data/admissions/programProfiles.js. Adding a
 * new leaf kind means adding a case here and a line to GATE_KINDS there.
 */
function evalRequirement(req, applicant) {
  if (!req || typeof req !== 'object') return UNKNOWN;

  if (Array.isArray(req.anyOf)) return orResults(req.anyOf.map(r => evalRequirement(r, applicant)));
  if (Array.isArray(req.allOf)) return andResults(req.allOf.map(r => evalRequirement(r, applicant)));

  const checks = [];

  if (req.citizenship) {
    const v = applicant.citizenship;
    checks.push(!v ? UNKNOWN : req.citizenship.includes(v) ? PASS : FAIL);
  }

  if (req.stateResidency) {
    const v = applicant.stateResidency;
    checks.push(!v ? UNKNOWN : req.stateResidency.includes(v) ? PASS : FAIL);
  }

  if (req.gradeLevel) {
    const v = applicant.gradeLevel;
    checks.push(!v ? UNKNOWN : req.gradeLevel.includes(String(v)) ? PASS : FAIL);
  }

  if (req.unweightedGpa != null) {
    const v = num(applicant.unweightedGpa);
    checks.push(v == null ? UNKNOWN : v >= req.unweightedGpa ? PASS : FAIL);
  }

  if (req.weightedGpa != null) {
    const v = num(applicant.weightedGpa);
    checks.push(v == null ? UNKNOWN : v >= req.weightedGpa ? PASS : FAIL);
  }

  if (req.hundredPointAverage != null) {
    // Some students only have a 4.0 GPA and some only have a New York-style
    // 100-point average. Converting between them is genuinely lossy, so we ask
    // for whichever they have and only convert when we must — and when we do,
    // we say the number is converted.
    const direct = num(applicant.hundredPointAverage);
    if (direct != null) checks.push(direct >= req.hundredPointAverage ? PASS : FAIL);
    else {
      const uw = num(applicant.unweightedGpa);
      checks.push(uw == null ? UNKNOWN : (uw * 25) >= req.hundredPointAverage ? PASS : FAIL);
    }
  }

  if (req.sat != null) {
    const v = num(applicant.tests?.sat?.composite);
    checks.push(v == null ? UNKNOWN : v >= req.sat ? PASS : FAIL);
  }

  if (req.act != null) {
    const v = num(applicant.tests?.act?.composite);
    checks.push(v == null ? UNKNOWN : v >= req.act ? PASS : FAIL);
  }

  if (req.classRankTopPercent != null) {
    const rank = applicant.classRank;
    // A school that does not rank is not a student who ranks badly. This is the
    // whole reason the intake asks whether the school reports rank at all.
    if (rank?.reported === false) checks.push(UNKNOWN);
    else {
      const p = num(rank?.percentile);
      checks.push(p == null ? UNKNOWN : p <= req.classRankTopPercent ? PASS : FAIL);
    }
  }

  if (req.courses) {
    checks.push(andResults(req.courses.map((id) => {
      const c = applicant.courses?.[id];
      if (c == null) return UNKNOWN;
      if (c.taken === false) return FAIL;
      if (c.taken !== true) return UNKNOWN;
      if (req.minGrade && c.grade) return gradeAtLeast(c.grade, req.minGrade) ? PASS : FAIL;
      return PASS;
    })));
  }

  if (req.documentedServiceHours != null) {
    // Deliberately reads DOCUMENTED hours, not total hours. Drexel's
    // requirement is for service that is documented and advisor-approved, and a
    // student with 300 unlogged hours does not meet it. Telling them they do is
    // the expensive kind of wrong.
    const v = num(applicant.documentedServiceHours);
    checks.push(v == null ? UNKNOWN : v >= req.documentedServiceHours ? PASS : FAIL);
  }

  if (req.hasOfficialScore != null) {
    const has = applicant.tests?.hasOfficialScore;
    checks.push(has == null ? UNKNOWN : (!!has === !!req.hasOfficialScore) ? PASS : FAIL);
  }

  if (req.ifTest && req.section) {
    // Section-presence gates (UMKC requires the ACT Science section) only bind
    // when the student is actually applying with that test.
    const test = req.ifTest.toLowerCase();
    const composite = num(applicant.tests?.[test]?.composite);
    if (composite == null) checks.push(PASS); // not applying with this test — the gate does not bind
    else {
      const sectionVal = applicant.tests?.[test]?.sections?.[req.section];
      if (req.present) checks.push(sectionVal == null ? UNKNOWN : PASS);
      else if (req.min != null) {
        const v = num(sectionVal);
        checks.push(v == null ? UNKNOWN : v >= req.min ? PASS : FAIL);
      } else checks.push(PASS);
    }
  }

  if (!checks.length) return UNKNOWN;
  return andResults(checks);
}

const GRADE_ORDER = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
function gradeAtLeast(got, min) {
  const gi = GRADE_ORDER.indexOf(String(got).toUpperCase());
  const mi = GRADE_ORDER.indexOf(String(min).toUpperCase());
  if (gi < 0 || mi < 0) return true; // unrecognised grade string — do not manufacture a failure
  return gi >= mi;
}

/**
 * Runs every gate on a programme profile.
 *
 * @returns {{
 *   eligible: boolean,          // false only when a HARD gate is definitively failed
 *   blocked: Array,             // failed hard gates, each with its remedy
 *   unmetPreferences: Array,    // preference gates the applicant does not meet, with multipliers
 *   uncheckable: Array,         // gates we could not evaluate because a field is missing
 *   preferenceMultiplier: number, // product of the unmet preferences' multipliers
 *   passed: Array,
 * }}
 */
export function evaluateGates(profile, applicant) {
  const gates = profile?.gates || [];
  const blocked = [], unmetPreferences = [], uncheckable = [], passed = [];

  for (const gate of gates) {
    const result = evalRequirement(gate.requires, applicant || {});
    const entry = {
      id: gate.id, kind: gate.kind, severity: gate.severity, label: gate.label,
      published: gate.published, remedy: gate.remedy, fixable: gate.fixable, note: gate.note,
    };
    if (result === PASS) { passed.push(entry); continue; }
    if (result === UNKNOWN) {
      uncheckable.push({ ...entry, missing: describeMissing(gate) });
      continue;
    }
    if (gate.severity === 'hard') blocked.push(entry);
    else unmetPreferences.push({ ...entry, multiplier: gate.multiplierIfUnmet ?? 0.5 });
  }

  const preferenceMultiplier = unmetPreferences.reduce((m, g) => m * g.multiplier, 1);

  return {
    eligible: blocked.length === 0,
    blocked, unmetPreferences, uncheckable, passed,
    preferenceMultiplier,
  };
}

/** Which intake fields would let us evaluate a gate we currently cannot. */
function describeMissing(gate) {
  const r = gate.requires || {};
  const out = new Set();
  const walk = (req) => {
    if (!req || typeof req !== 'object') return;
    (req.anyOf || []).forEach(walk);
    (req.allOf || []).forEach(walk);
    if (req.citizenship) out.add('citizenship');
    if (req.stateResidency) out.add('stateResidency');
    if (req.gradeLevel) out.add('gradeLevel');
    if (req.unweightedGpa != null) out.add('unweightedGpa');
    if (req.weightedGpa != null) out.add('weightedGpa');
    if (req.hundredPointAverage != null) out.add('hundredPointAverage');
    if (req.sat != null) out.add('satComposite');
    if (req.act != null) out.add('actComposite');
    if (req.classRankTopPercent != null) out.add('classRank');
    if (req.courses) out.add('courses');
    if (req.documentedServiceHours != null) out.add('documentedServiceHours');
    if (req.hasOfficialScore != null) out.add('testPolicy');
    if (req.ifTest && req.section) out.add(`${req.ifTest.toLowerCase()}Sections`);
  };
  walk(r);
  return [...out];
}
