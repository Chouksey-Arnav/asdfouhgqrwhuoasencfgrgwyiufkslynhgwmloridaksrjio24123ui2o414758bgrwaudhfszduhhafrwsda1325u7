// Score-based college recommendations for the College List & Application Tracker.
//
// Everything here is driven by the scores the student has ACTUALLY told MedSchoolPrep —
// their logged SAT/ACT sittings in the Score Tracker (`test_scores`), falling back to the
// score they self-reported during onboarding. Nothing is invented: if we have no score,
// resolveStudentScores() returns nulls and the UI says so instead of guessing.
//
// SCOPE: recommendations come only from SCHOOL_DATA (src/data/constants.js), which is
// U.S. institutions only. See US_ONLY_NOTE.
// Explicit .js extension so Node's ESM resolver can load this module directly — scripts/
// verifyResumeBuilder.mjs imports the matching engines that depend on this file, and Node
// (unlike Vite) will not guess an extension.
import { SCHOOL_DATA } from '../data/constants.js';

// Official College Board/ACT concordance (ACT composite -> equivalent SAT total). Used in both
// directions so a student who has only taken one test still gets compared against both of a
// school's stored scores rather than being excluded from half the data.
const ACT_TO_SAT = {
  36: 1590, 35: 1540, 34: 1500, 33: 1460, 32: 1430, 31: 1400, 30: 1370, 29: 1340,
  28: 1310, 27: 1280, 26: 1240, 25: 1210, 24: 1180, 23: 1140, 22: 1110, 21: 1080,
  20: 1040, 19: 1010, 18: 970, 17: 930, 16: 890, 15: 850, 14: 810, 13: 770, 12: 710,
  11: 630, 10: 560, 9: 480,
};

export function actToSat(act) {
  const a = Math.round(Number(act));
  if (!Number.isFinite(a)) return null;
  if (ACT_TO_SAT[a] != null) return ACT_TO_SAT[a];
  return a > 36 ? 1600 : 400;
}

export function satToAct(sat) {
  const s = Number(sat);
  if (!Number.isFinite(s)) return null;
  let best = null, bestDelta = Infinity;
  for (const [act, total] of Object.entries(ACT_TO_SAT)) {
    const d = Math.abs(total - s);
    if (d < bestDelta) { bestDelta = d; best = Number(act); }
  }
  return best;
}

/**
 * Works out the SAT/ACT we should reason with, and where each number came from, so the UI can
 * tell the student exactly which of their scores is driving the recommendations.
 *
 * Logged sittings beat the onboarding self-report — a real test result is better evidence than a
 * number typed before any studying happened. Within logged sittings we take the student's best
 * composite per test (target rows are excluded: a goal isn't a score they have).
 *
 * @param {Array}  testScores rows from the `test_scores` resource
 * @param {Object} user       app user record (onboardingCurrentScore / testTrack)
 * @returns {{sat:number|null, act:number|null, satSource:string|null, actSource:string|null,
 *            effectiveSat:number|null, primaryTest:'SAT'|'ACT'|null, hasScore:boolean}}
 */
export function resolveStudentScores(testScores = [], user = null) {
  const actual = (testScores || []).filter(s => !s.is_target && Number.isFinite(Number(s.composite)));
  const bestOf = (type) => actual
    .filter(s => s.test_type === type)
    .reduce((best, s) => (best == null || Number(s.composite) > Number(best.composite) ? s : best), null);

  const bestSat = bestOf('SAT');
  const bestAct = bestOf('ACT');

  let sat = bestSat ? Number(bestSat.composite) : null;
  let act = bestAct ? Number(bestAct.composite) : null;
  let satSource = sat != null ? 'logged' : null;
  let actSource = act != null ? 'logged' : null;

  // Onboarding fallback — only for a test the student hasn't logged a real sitting for.
  const onboard = Number(user?.onboardingCurrentScore);
  if (Number.isFinite(onboard) && onboard > 0) {
    const track = user?.testTrack === 'ACT' ? 'ACT' : (onboard <= 36 ? 'ACT' : 'SAT');
    if (track === 'SAT' && sat == null) { sat = onboard; satSource = 'onboarding'; }
    if (track === 'ACT' && act == null) { act = onboard; actSource = 'onboarding'; }
  }

  // A single effective SAT-scale number, so schools can be ranked on one axis. If the student has
  // both tests we use whichever converts higher — colleges accept either, so the stronger result is
  // the one that actually describes their admissions position.
  const satFromAct = act != null ? actToSat(act) : null;
  const effectiveSat = sat != null && satFromAct != null ? Math.max(sat, satFromAct) : (sat ?? satFromAct);
  const primaryTest = effectiveSat == null ? null
    : (satFromAct != null && (sat == null || satFromAct > sat) ? 'ACT' : 'SAT');

  return { sat, act, satSource, actSource, effectiveSat, primaryTest, hasScore: effectiveSat != null };
}

// Category thresholds, in SAT points of gap between the school's midpoint and the student's
// effective score. Deliberately wider than the old ±60 add-form heuristic: a school whose median
// admit scored 100+ above you is a genuine reach, and one 100+ below is a genuine safety.
const REACH_GAP = 60;    // school midpoint this far ABOVE the student => reach
const SAFETY_GAP = 80;   // school midpoint this far BELOW the student => safety

/**
 * Reach / target / safety for one school at one score. Acceptance rate is a hard override at the
 * extremes: a sub-15% school is a reach for everyone regardless of test score (nobody is "safe" at
 * a school that rejects 85%+ of applicants), and no school admitting under 50% is ever a "safety".
 */
export function categorizeSchool(school, effectiveSat) {
  if (effectiveSat == null || school?.sat == null) return null;
  const gap = school.sat - effectiveSat;
  if (school.accept != null && school.accept < 15) return 'reach';
  let cat = gap > REACH_GAP ? 'reach' : gap < -SAFETY_GAP ? 'safety' : 'target';
  if (cat === 'safety' && school.accept != null && school.accept < 50) cat = 'target';
  return cat;
}

// How well a school matches this student, 0-100. Fit is mostly "is this school reachable at your
// score" (a perfect match sits right at your level for targets, slightly above for reaches),
// nudged by pre-health strength since every student on this platform is heading toward a health
// career, and by whether the school has a BS/MD program or a pre-med committee.
function fitScore(school, effectiveSat, category) {
  const gap = school.sat - effectiveSat;
  let base;
  if (category === 'reach') base = 100 - Math.min(100, Math.max(0, gap - REACH_GAP) * 0.55);
  else if (category === 'safety') base = 100 - Math.min(100, Math.max(0, -gap - SAFETY_GAP) * 0.35);
  else base = 100 - Math.abs(gap) * 0.25;

  let bonus = 0;
  if (school.preHealthRank) bonus += (school.preHealthRank - 3) * 4;      // ±8
  if (school.bsmd) bonus += 5;
  if (school.hasPreMedCommittee) bonus += 3;
  if (school.clinicalProximity === 'Excellent') bonus += 3;
  else if (school.clinicalProximity === 'Good') bonus += 1;

  // No flat bump on top: an earlier version added one and pinned half the slate at a flat 100%,
  // which made the fit number useless for telling two recommendations apart.
  return Math.max(0, Math.min(100, Math.round(base * 0.82 + bonus)));
}

// Human-readable reason a school made the cut — shown on each recommendation card so the student
// never sees a bare name with no justification.
function reasonFor(school, scores, category) {
  const bits = [];
  const gap = school.sat - scores.effectiveSat;
  if (category === 'reach') bits.push(`SAT mid ${school.sat} / ACT ${school.act} sits ${gap} above your ${scores.effectiveSat} — a stretch worth one application`);
  else if (category === 'safety') bits.push(`your ${scores.effectiveSat} is ${-gap} above their SAT mid ${school.sat} (ACT ${school.act}) — a strong-position school`);
  else bits.push(`SAT mid ${school.sat} / ACT ${school.act} is right at your ${scores.effectiveSat}`);
  if (school.bsmd) bits.push('has a BS/MD program');
  if (school.preHealthRank >= 5) bits.push('top-tier pre-health advising');
  else if (school.hasPreMedCommittee) bits.push('has a pre-med committee');
  if (school.clinicalProximity === 'Excellent') bits.push('excellent clinical access nearby');
  return bits.join(' · ');
}

const DEFAULT_QUOTA = { reach: 2, target: 3, safety: 2 };

/**
 * Recommends U.S. schools for this student from SCHOOL_DATA, skipping anything already on their
 * list, and returns a balanced spread rather than seven versions of the same school.
 *
 * @param {Object} opts
 * @param {Object} opts.scores      output of resolveStudentScores()
 * @param {Array}  opts.existing    the student's current `colleges` rows (excluded from results)
 * @param {Object} opts.quota       how many of each category to return
 * @returns {Array} recommendation objects, reach-first, each with { school, category, fit, reason, ... }
 */
export function recommendColleges({ scores, existing = [], quota = DEFAULT_QUOTA } = {}) {
  if (!scores?.hasScore) return [];
  const taken = new Set((existing || []).map(c => String(c.name || '').trim().toLowerCase()));

  const scored = SCHOOL_DATA
    .filter(s => s.sat != null && !taken.has(s.name.toLowerCase()))
    .map(school => {
      const category = categorizeSchool(school, scores.effectiveSat);
      return {
        school,
        name: school.name,
        category,
        fit: fitScore(school, scores.effectiveSat, category),
        reason: reasonFor(school, scores, category),
        satGap: school.sat - scores.effectiveSat,
        actGap: scores.act != null ? school.act - scores.act : null,
      };
    })
    .sort((a, b) => b.fit - a.fit);

  // Fill each bucket to quota, then spread the leftovers so a student with an unusual score still
  // gets a full slate instead of, say, two safeties and nothing else.
  const out = [];
  const order = ['reach', 'target', 'safety'];
  for (const cat of order) {
    out.push(...scored.filter(r => r.category === cat).slice(0, quota[cat] ?? 0));
  }
  const total = order.reduce((n, c) => n + (quota[c] ?? 0), 0);
  if (out.length < total) {
    const chosen = new Set(out.map(r => r.name));
    out.push(...scored.filter(r => !chosen.has(r.name)).slice(0, total - out.length));
  }
  return out.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || b.fit - a.fit);
}

/**
 * Insight lines about the student's list, given their scores — what the score means across the
 * whole U.S. database, whether the reach/target/safety split is healthy, and what's missing.
 * Each returns { tone: 'good'|'warn'|'info', text }.
 */
export function collegeListInsights({ scores, existing = [] }) {
  const out = [];
  const counts = { reach: 0, target: 0, safety: 0 };
  (existing || []).forEach(c => { if (counts[c.category] != null) counts[c.category]++; });
  const listed = existing?.length || 0;

  if (scores?.hasScore) {
    const universe = SCHOOL_DATA.filter(s => s.sat != null);
    const bucket = { reach: 0, target: 0, safety: 0 };
    universe.forEach(s => { const c = categorizeSchool(s, scores.effectiveSat); if (bucket[c] != null) bucket[c]++; });
    const testLabel = scores.primaryTest === 'ACT'
      ? `ACT ${scores.act} (≈ SAT ${scores.effectiveSat})`
      : `SAT ${scores.sat ?? scores.effectiveSat}`;
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    out.push({ tone: 'info', text: `Working from your ${testLabel}. Across the ${universe.length} U.S. schools tracked here, ${plural(bucket.target, 'target', 'targets')}, ${plural(bucket.safety, 'safety', 'safeties')} and ${plural(bucket.reach, 'reach', 'reaches')}.` });

    // Being told to "add a safety" is useless if the database has none at this score. Say so, and
    // point at the thing that would actually change it.
    if (bucket.safety === 0) {
      out.push({ tone: 'warn', text: `None of the ${universe.length} schools we track is a true safety at this score — the lowest SAT midpoints here sit around 1100. Pulling your score up, or looking at your in-state publics and community-college transfer routes, is the real move rather than forcing a safety off this list.` });
    }

    if (scores.sat != null && scores.act == null) {
      out.push({ tone: 'info', text: `You've only given us an SAT. Your ${scores.sat} converts to roughly a ${satToAct(scores.sat)} ACT — if that feels low relative to your practice work, sitting the ACT once could open a different set of schools.` });
    } else if (scores.act != null && scores.sat == null) {
      out.push({ tone: 'info', text: `You've only given us an ACT. Your ${scores.act} converts to roughly a ${actToSat(scores.act)} SAT — logging an SAT too would let us compare you against both numbers each school reports.` });
    } else if (scores.sat != null && scores.act != null) {
      const satFromAct = actToSat(scores.act);
      const better = satFromAct > scores.sat ? 'ACT' : 'SAT';
      out.push({ tone: 'good', text: `Your ACT ${scores.act} (≈ SAT ${satFromAct}) and SAT ${scores.sat} put your ${better} slightly ahead — send the ${better} where a school takes either.` });
    }
  } else {
    out.push({ tone: 'warn', text: 'No SAT or ACT on file yet. Log a score in the Score Tracker and this panel will recommend U.S. schools matched to it.' });
  }

  if (listed === 0) {
    out.push({ tone: 'info', text: 'Your list is empty — a healthy first slate is about 2 reaches, 3 targets and 2 safeties.' });
    return out;
  }
  if (!counts.safety) out.push({ tone: 'warn', text: 'No safety school on your list. Add at least one you would genuinely be happy attending — it is the single biggest protection against a bad April.' });
  if (!counts.target) out.push({ tone: 'warn', text: 'No target schools yet. Targets are where most students actually enroll; aim for 3-4.' });
  if (counts.reach > counts.target + counts.safety) out.push({ tone: 'warn', text: `${counts.reach} reaches against ${counts.target + counts.safety} target/safety schools is top-heavy. Balance it out before essay season.` });
  else if (counts.reach && counts.target && counts.safety) out.push({ tone: 'good', text: `Balanced spread: ${counts.reach} reach / ${counts.target} target / ${counts.safety} safety.` });

  // Category sanity check against the real data — a school the student filed as a safety that our
  // stats say is a reach for them is the kind of thing that quietly wrecks an application plan.
  if (scores?.hasScore) {
    const mislabeled = (existing || []).map(c => {
      const s = SCHOOL_DATA.find(x => x.name.toLowerCase() === String(c.name || '').trim().toLowerCase());
      if (!s || !c.category) return null;
      const real = categorizeSchool(s, scores.effectiveSat);
      return real && real !== c.category ? { name: s.name, filed: c.category, real } : null;
    }).filter(Boolean);
    if (mislabeled.length) {
      const first = mislabeled.slice(0, 2).map(m => `${m.name} (filed ${m.filed}, looks like a ${m.real})`).join(', ');
      out.push({ tone: 'warn', text: `Category check: ${first}${mislabeled.length > 2 ? ` and ${mislabeled.length - 2} more` : ''}.` });
    }
  }
  return out;
}
