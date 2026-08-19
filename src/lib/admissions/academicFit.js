// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — academic fit, benchmarked against the actual admitted profile.
//
// ── Bias #1: the twenty-fifth percentile ────────────────────────────────────
// Every chancing tool on the market benchmarks against the 25th percentile of
// admitted students, because it is the number schools publish most prominently
// and because it flatters. The consequence is structural, not cosmetic: a
// student who clears a low bar reads as "qualified", and somewhere between the
// model and the UI, qualified quietly becomes "likely". But the 25th percentile
// of ADMITTED students is not a threshold for admission — it is the point below
// which sit the quarter of admits who were, overwhelmingly, admitted for a
// reason other than their scores. Recruited athletes. Legacies. Development
// cases. Students from contexts the school is deliberately reaching into. An
// unhooked applicant who matches the 25th percentile is matching a group they
// are not a member of.
//
// So this module computes the student's position against all three of the 25th,
// 50th and 75th, returns all three, and requires the UI to show all three. The
// centre of gravity for scoring is the MEDIAN: z = 0 means "you look like the
// median admitted student", not "you cleared the bar".
//
// ── Bias #5: academics stop discriminating at the top ───────────────────────
// This is the big one, and it is the reason a well-built model can be more
// pessimistic than a naive one while being more accurate.
//
// At a programme admitting under about 15%, the applicant pool has ALREADY been
// filtered on academics — by self-selection, by counsellors, by the students
// who never apply. Nearly everyone in that pool clears the bar. Which means
// GPA and test scores have almost no discriminating power left INSIDE it: they
// separate applicants from non-applicants, not admits from rejects. A model
// that keeps leaning on them at that selectivity collapses toward the base rate
// of an already-elite pool and hands a normal strong student a number that
// describes a competition they are not actually in.
//
// `academicLeverage()` below encodes that decay explicitly. At a 60% admit rate
// academics carry nearly their full weight. At 4% they carry a fraction, and
// the model's honesty depends on the rest of the portfolio — and on the
// irreducible randomness — carrying the difference.
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

// p25 and p75 of a normal distribution sit at ∓0.6745σ, which is what lets a
// published quartile band be turned into a z-score without inventing a spread.
const IQR_Z = 0.6745;

/**
 * Where one value sits in a published/derived quartile band, as a z-score
 * centred on the MEDIAN admit (not the 25th percentile).
 */
export function positionInBand(value, band) {
  const v = num(value);
  if (v == null || !band || band.p50 == null) return null;
  const p25 = num(band.p25), p50 = num(band.p50), p75 = num(band.p75);
  // Prefer the full band; fall back to a one-sided spread if only half is known.
  let sigma = null;
  if (p25 != null && p75 != null) sigma = (p75 - p25) / (2 * IQR_Z);
  else if (p75 != null) sigma = (p75 - p50) / IQR_Z;
  else if (p25 != null) sigma = (p50 - p25) / IQR_Z;
  if (!sigma || sigma <= 0) return null;

  const z = clamp((v - p50) / sigma, -3, 3);
  const position =
    p25 != null && v < p25 ? 'below-25th' :
    v < p50 ? '25th-to-median' :
    p75 != null && v < p75 ? 'median-to-75th' : 'at-or-above-75th';

  return {
    value: v, z, position, p25, p50, p75, basis: band.basis, note: band.note,
    // Plain-language line the panel shows verbatim. Written to never let
    // "above the 25th" read as "qualified".
    readout: describePosition(position, v, { p25, p50, p75 }),
  };
}

function describePosition(position, v, b) {
  switch (position) {
    case 'below-25th':
      return `Your ${fmt(v)} is below their 25th percentile (${fmt(b.p25)}). A quarter of admitted students are below that line too — but that quarter is disproportionately recruited athletes, legacies and students admitted for reasons you cannot replicate.`;
    case '25th-to-median':
      return `Your ${fmt(v)} is above their 25th percentile (${fmt(b.p25)}) but below the median admit (${fmt(b.p50)}). This is the band where most chancing tools would call you "qualified" and then show you a comfortable number. Half of admitted students are above you here.`;
    case 'median-to-75th':
      return `Your ${fmt(v)} is above the median admitted student (${fmt(b.p50)}) and below their 75th (${fmt(b.p75)}). Genuinely strong — and at a selective programme it is close to the most academics can do for you.`;
    default:
      return `Your ${fmt(v)} is at or above their 75th percentile (${fmt(b.p75)}). You are academically in the top quarter of people they admit. Past this point more points buy very little.`;
  }
}

const fmt = (v) => (v == null ? '—' : (v < 10 ? v.toFixed(2) : String(Math.round(v))));

/**
 * How much academic position can move the outcome at a programme of this
 * selectivity. 1 = full weight, 0 = none.
 *
 * The shape: essentially flat above ~40% admit, falling steeply through the
 * 25–10% band, and floored at 0.18 rather than 0 — academics never stop
 * mattering entirely, they stop DISCRIMINATING, which is a different claim and
 * a smaller number rather than a zero.
 */
export function academicLeverage(admitRate) {
  const a = num(admitRate);
  if (a == null) return 0.6;
  const raw = 1 - Math.exp(-a / 0.13);   // 0.18 at 2.5%, 0.46 at 8%, 0.68 at 15%, 0.95 at 40%
  return clamp(Math.max(0.18, raw), 0.18, 1);
}

export function leverageNote(admitRate, leverage) {
  const a = num(admitRate);
  if (a == null) return 'We do not know this programme\'s admit rate, so we assume academics carry moderate weight and widen the range instead of pretending to know.';
  const pct = Math.round(a * 100);
  if (a < 0.15) {
    return `At roughly ${pct}% admitted, this pool is already pre-filtered on academics — almost everyone applying clears the bar. Your GPA and scores are worth about ${Math.round(leverage * 100)}% of what they would be worth at a less selective programme, because inside this pool they barely separate anyone. Being stronger academically is not what decides it here.`;
  }
  if (a < 0.35) {
    return `At roughly ${pct}% admitted, academics still separate applicants meaningfully — worth about ${Math.round(leverage * 100)}% of full weight in this model.`;
  }
  return `At roughly ${pct}% admitted, academics do most of the work: they carry about ${Math.round(leverage * 100)}% of full weight here.`;
}

/**
 * Course rigor, scored the way the user actually asked for it: as a share of
 * what the STUDENT'S SCHOOL offers, not as a raw count.
 *
 * Four APs at a school that offers five is a student who took everything
 * available. Six at a school that offers twenty is a student who took a third
 * of it. Every tool that counts APs scores the second one higher, and every
 * admissions office reads the first one higher, because the transcript is read
 * in the context of the school profile that arrives with it.
 */
export function scoreRigor(rigor) {
  if (!rigor) return { available: false, z: 0, note: 'No course-rigor information yet, so rigor is not moving this estimate in either direction.' };
  const taken = (num(rigor.ap) || 0) + (num(rigor.ib) || 0) + (num(rigor.honors) || 0) * 0.5 + (num(rigor.dualEnrollment) || 0);
  const offered = num(rigor.offeredAdvanced);

  if (!taken && !offered) return { available: false, z: 0, note: 'No advanced coursework recorded yet.' };

  // Absolute component: what an admissions reader sees before the school profile.
  const absoluteZ = clamp((taken - 6) / 4, -1.5, 1.5);

  if (offered == null || offered <= 0) {
    return {
      available: true, takenWeighted: taken, offered: null,
      z: absoluteZ * 0.7,
      note: `${taken.toFixed(1)} weighted advanced courses. We do not know how many your school offers, so this is scored on the raw count alone and the range is wider than it needs to be — telling us how many your school offers is one of the cheapest ways to tighten this estimate.`,
      needsOffered: true,
    };
  }

  const ratio = clamp(taken / offered, 0, 1.2);
  const ratioZ = clamp((ratio - 0.55) / 0.3, -1.5, 1.8);
  // Weighted toward the ratio, because that is the number the school profile
  // makes visible to the reader, but not entirely — a student at a school with
  // two APs who took both is not automatically equivalent to one with twelve.
  const z = ratioZ * 0.65 + absoluteZ * 0.35;

  return {
    available: true, takenWeighted: taken, offered, ratio, z,
    note: `${taken.toFixed(1)} weighted advanced courses out of roughly ${offered} your school offers (${Math.round(ratio * 100)}%). Taking most of what is available reads stronger than a bigger number at a school with more on the menu — that is how the school profile that ships with your transcript is actually used.`,
  };
}

/**
 * Resolves which test score to benchmark, honouring the programme's superscore
 * policy.
 *
 * Some programmes explicitly refuse superscores. Handing them a superscored
 * composite is a silent overestimate of exactly the kind this rebuild exists to
 * remove — so when the policy is 'refused' and we only hold a superscore, we
 * say we cannot use it rather than using it anyway.
 */
export function resolveTestForProgram(tests, academics) {
  const policy = academics?.superscore;
  const out = { sat: null, act: null, notes: [], degraded: false };
  for (const t of ['sat', 'act']) {
    const rec = tests?.[t];
    if (!rec) continue;
    const composite = num(rec.composite);
    if (composite == null) continue;
    if (policy === 'refused' && rec.superscored === true) {
      const single = num(rec.bestSingleSitting);
      if (single != null) {
        out[t] = single;
        out.notes.push(`This programme does not accept superscores, so we are using your best single ${t.toUpperCase()} sitting (${single}) rather than your superscore (${composite}).`);
      } else {
        out.notes.push(`This programme does not accept superscores and the only ${t.toUpperCase()} we hold from you is superscored. We have left it out rather than benchmark you on a number this programme will not read — tell us your best single sitting and this tightens considerably.`);
        out.degraded = true;
      }
    } else {
      out[t] = composite;
      if (policy === 'accepted' && rec.superscored !== true && (rec.sittings || 0) > 1) {
        out.notes.push(`This programme superscores, and you have more than one ${t.toUpperCase()} sitting — check whether your best sections across sittings combine higher than the composite we are using.`);
      }
    }
  }
  return out;
}

/**
 * LAYER 2 entry point.
 *
 * @returns {{available, z, leverage, bands:{gpa,sat,act}, rigor, notes:string[],
 *            unknowns:string[], testCounts:boolean}}
 */
export function scoreAcademicFit({ profile, applicant }) {
  const academics = profile?.academics || {};
  const admitRate = profile?.admitRate?.value ?? profile?.admitRate?.assumed ?? null;
  const leverage = academicLeverage(admitRate);
  const notes = [], unknowns = [];

  // ── GPA, on whichever scale this programme actually specifies ─────────────
  // Programmes specify different scales and mixing them up is how you get a
  // wrong answer. Drexel's 3.5 is weighted; VCU's 3.5 is unweighted; CUNY's 85
  // is a 100-point average. So the profile names its scale and we read the
  // matching field, converting only when we have to and saying when we did.
  let gpaValue = null, gpaConverted = false;
  if (academics.gpaScale === 'weighted-4.0') {
    gpaValue = num(applicant.weightedGpa);
    if (gpaValue == null && num(applicant.unweightedGpa) != null) {
      gpaValue = num(applicant.unweightedGpa); gpaConverted = true;
      notes.push('This programme measures GPA on a WEIGHTED scale and we only have your unweighted number, so we are using it as a floor. Your real position is at least this good and probably better — adding your weighted GPA fixes it.');
    }
  } else if (academics.gpaScale === 'hundred-point') {
    gpaValue = num(applicant.hundredPointAverage);
    if (gpaValue == null && num(applicant.unweightedGpa) != null) {
      gpaValue = num(applicant.unweightedGpa) * 25; gpaConverted = true;
      notes.push('This programme uses a 100-point average and we only have your 4.0 GPA, so we converted it. Conversions between the two scales are approximate and school-specific — your actual 100-point average is the number that counts.');
    }
  } else {
    gpaValue = num(applicant.unweightedGpa);
    if (gpaValue == null && num(applicant.weightedGpa) != null) {
      // Never silently pass a weighted GPA off as unweighted: it is almost
      // always higher, and the whole error would land on the optimistic side.
      notes.push('This programme benchmarks unweighted GPA and we only have your weighted one. We have left GPA out of the academic position rather than treat a weighted number as unweighted, which would flatter you.');
      unknowns.push('unweightedGpa');
    }
  }
  if (gpaValue == null) unknowns.push(academics.gpaScale === 'hundred-point' ? 'hundredPointAverage' : academics.gpaScale === 'weighted-4.0' ? 'weightedGpa' : 'unweightedGpa');

  const resolvedTests = resolveTestForProgram(applicant.tests, academics);
  notes.push(...resolvedTests.notes);

  const bands = {
    gpa: positionInBand(gpaValue, academics.gpa),
    sat: positionInBand(resolvedTests.sat, academics.sat),
    act: positionInBand(resolvedTests.act, academics.act),
  };
  if (bands.gpa) bands.gpa.converted = gpaConverted;

  // Tests only count where the programme actually reads them.
  const testCounts = academics.testPolicy !== 'optional' && academics.testPolicy !== 'not-applicable';
  if (!testCounts && (resolvedTests.sat != null || resolvedTests.act != null)) {
    notes.push('This programme is test-optional, so your SAT/ACT is carrying very little of this estimate. That is worth knowing before you spend another summer on it.');
  }

  // Best available test position — a student compared on either test should get
  // the same answer, so we take whichever of their two results reads stronger.
  const testZ = testCounts
    ? [bands.sat?.z, bands.act?.z].filter(z => z != null).reduce((best, z) => (best == null || z > best ? z : best), null)
    : null;
  if (testCounts && testZ == null) unknowns.push('testScore');

  const rigor = scoreRigor(applicant.rigor);

  // ── Compose ──────────────────────────────────────────────────────────────
  // GPA is the heavier of the two everywhere, for the ordinary reason: it is
  // four years of evidence against one morning's. Rigor is a modifier on the
  // GPA rather than a third independent axis, because that is how a transcript
  // is actually read.
  const parts = [];
  if (bands.gpa) parts.push({ z: bands.gpa.z + (rigor.available ? rigor.z * 0.35 : 0), w: testZ != null ? 0.6 : 1 });
  if (testZ != null) parts.push({ z: testZ, w: bands.gpa ? 0.4 : 1 });

  const totalW = parts.reduce((s, p) => s + p.w, 0);
  const z = totalW > 0 ? parts.reduce((s, p) => s + p.z * p.w, 0) / totalW : null;

  return {
    available: z != null,
    z: z ?? 0,
    leverage,
    leverageNote: leverageNote(admitRate, leverage),
    bands, rigor, testCounts,
    notes, unknowns,
    degraded: resolvedTests.degraded,
  };
}
