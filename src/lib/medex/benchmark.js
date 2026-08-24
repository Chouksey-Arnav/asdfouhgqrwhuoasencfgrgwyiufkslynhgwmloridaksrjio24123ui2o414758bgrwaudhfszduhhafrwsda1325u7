// ─────────────────────────────────────────────────────────────────────────────
// What the MedEx Score is measured against.
//
// A position score is meaningless without saying "position relative to WHAT",
// and the honest answer has to be a specific, named program with a real
// admitted-student profile behind it — not "top schools" as a vibe.
//
// So there are exactly two references, and both are always visible on the card:
//
//   1. THE BENCHMARK — the most selective program on the student's OWN college
//      list. This is the headline. It is their number, against their reach, and
//      it moves when they change their list, which is correct: adding Harvard to
//      your list genuinely does change where you stand relative to your target.
//
//   2. THE APEX SLATE — a fixed, published slate of the most selective
//      undergraduate institutions we hold data for, plus every researched
//      combined-degree program in the catalog. This is the absolute reference:
//      it does not move when the student edits their list, so it is the one that
//      answers "how do I stack up against the top programs in the country"
//      without letting anyone flatter themselves by deleting their reach school.
//
// Keeping both is deliberate. Benchmark alone is gameable. Apex alone is
// demoralising and ignores what the student actually wants. Together they are
// the two sentences a good counselor says in the same breath.
// ─────────────────────────────────────────────────────────────────────────────
import { PROGRAM_PROFILES, resolveProfile, deriveUndergradProfile } from '../../data/admissions/programProfiles.js';
import { SCHOOL_DATA } from '../../data/constants.js';

/**
 * Ceiling on how selective a school must be to make the apex slate, and how
 * many make it. Both are stated here rather than being a `.slice(0, 25)` buried
 * in a function, because "which schools count as the top" is a judgment and
 * judgments belong where they can be argued with.
 *
 * 10% is the line because it is roughly where a published acceptance rate stops
 * describing a competition a student can prepare their way through and starts
 * describing a filtered pool plus a draw. The cap of 25 exists so the slate
 * stays a slate — a reference class you could name out loud — rather than
 * quietly becoming "the top sixth of our database".
 */
export const APEX_ACCEPT_CEILING = 10;
export const APEX_SLATE_SIZE = 25;

/**
 * The effective admit rate a profile is scored against: the published rate
 * where there is one, the model's stated assumption where there is not.
 *
 * Never silently substitutes a sibling school's rate. A program with no rate
 * is ranked on its own stated assumption and `rateIsEstimate` says so, so a
 * benchmark chosen on an assumed 3% is visibly a benchmark chosen on an
 * assumption.
 */
export function effectiveAdmitRate(profile) {
  const spec = profile?.admitRate || {};
  const published = spec.value ?? null;
  return {
    rate: published ?? spec.assumed ?? 0.25,
    published,
    isEstimate: published == null,
    basis: spec.basis || 'unpublished',
    note: spec.note || null,
  };
}

let apexCache = null;

/**
 * The apex slate, built once.
 *
 * Combined-degree programs are included unconditionally rather than by rate,
 * because their rates are all assumptions (none of the six publish one) and
 * ranking them against published undergraduate rates would be comparing a
 * measured number to a guessed one and calling the result an order.
 */
export function apexSlate() {
  if (apexCache) return apexCache;

  const undergrads = SCHOOL_DATA
    .filter(s => s.accept != null && Number(s.accept) <= APEX_ACCEPT_CEILING)
    .sort((a, b) => Number(a.accept) - Number(b.accept))
    .slice(0, APEX_SLATE_SIZE)
    .map(deriveUndergradProfile)
    .filter(Boolean);

  const combined = PROGRAM_PROFILES.filter(p => p.kind === 'bsmd');

  apexCache = [...combined, ...undergrads].sort(
    (a, b) => effectiveAdmitRate(a).rate - effectiveAdmitRate(b).rate,
  );
  return apexCache;
}

/** Test seam — the slate is derived from module-level data and never changes at runtime. */
export function resetApexCache() { apexCache = null; }

/**
 * Resolve the student's college list into scoreable profiles.
 *
 * Rows we cannot resolve are RETURNED, not dropped. A student with six schools
 * who sees five scored must be told which one is missing and why (almost always
 * a name typed by hand rather than picked from the autocomplete) — the
 * Admissions Calculator learned this the hard way and the same rule applies
 * here, because a silently shorter list makes the headline benchmark silently
 * wrong.
 */
export function resolveCollegeList(colleges = []) {
  const resolved = [];
  const unresolved = [];
  const seen = new Set();
  for (const row of colleges || []) {
    const name = typeof row === 'string' ? row : row?.name;
    if (!name) continue;
    const profile = resolveProfile(name);
    if (!profile) { unresolved.push(name); continue; }
    if (seen.has(profile.id)) continue;
    seen.add(profile.id);
    resolved.push({ profile, row: typeof row === 'string' ? { name } : row });
  }
  return { resolved, unresolved };
}

/**
 * Pick the headline benchmark: the most selective program on their list.
 *
 * `fallback` is what a student with no list (or a list of six schools we hold
 * nothing about) is measured against. It is the single most selective program
 * on the apex slate, and the card says explicitly that it is a stand-in and how
 * to replace it — because the alternative, showing no score at all until the
 * college list is populated, means the students furthest from applying (the
 * ones this whole app is for) never see the number that would tell them where
 * they stand.
 */
export function pickBenchmark(colleges = []) {
  const { resolved, unresolved } = resolveCollegeList(colleges);

  if (!resolved.length) {
    const stand = apexSlate()[0] || null;
    return {
      profile: stand,
      source: 'fallback',
      fromList: false,
      unresolved,
      listSize: (colleges || []).length,
      note: stand
        ? `You have no schools on your list we hold admitted-student data for, so this is measured against ${stand.name} — the most selective program we track. Add your real reach program and this becomes your number instead of a stand-in.`
        : null,
    };
  }

  const best = resolved.reduce((a, b) => (
    effectiveAdmitRate(b.profile).rate < effectiveAdmitRate(a.profile).rate ? b : a
  ));

  return {
    profile: best.profile,
    source: 'list',
    fromList: true,
    unresolved,
    listSize: resolved.length,
    note: resolved.length === 1
      ? `Measured against ${best.profile.name} — the only school on your list we hold admitted-student data for.`
      : `Measured against ${best.profile.name} — the most selective of the ${resolved.length} schools on your list we hold data for.`,
  };
}
