// ─────────────────────────────────────────────────────────────────────────────
// The start-to-finish cost calculator, and the debt-trajectory comparison
// behind the Financial Aid tab and the parent dashboard.
//
// ── What this module is for ─────────────────────────────────────────────────
// src/data/pathwayFinance.js says what people who FINISHED each pathway
// typically owed. That is the right anchor and the wrong answer to "what would
// it cost ME", because the student's own answer turns almost entirely on four
// choices they are making right now:
//
//   1. in-state public vs out-of-state public vs private, for undergrad
//   2. the same choice again for professional school
//   3. how much of it is paid rather than borrowed (family, savings,
//      scholarships, an employer)
//   4. whether interest accrues unpaid through years when they earn nothing —
//      which is where a $205,000 medical school balance becomes a $270,000 one
//      before a single payment is made
//
// Point 4 is the one nobody shows a seventeen-year-old, and it is the entire
// reason a longer pathway costs more than the tuition difference.
//
// ── Rules this module is written under ──────────────────────────────────────
//   • Pure. No React, no network, no Date.now() in any exported result. Every
//     function takes its inputs and returns a plain object, so
//     scripts/verifyPathwayFinance.mjs can assert on the arithmetic directly.
//   • Every returned figure carries the assumptions that produced it in
//     `assumptions`, and every consumer displays them. A projection whose
//     assumptions are not on screen beside it is a prediction, and this is not
//     a prediction.
//   • Nothing rounds to a false precision. Results are rounded to whole
//     dollars and every UI that shows them shows them as approximate.
//   • A missing input is never silently replaced with an optimistic one. The
//     defaults are the published averages from pathwayFinance.js, and
//     `usedDefaults` names every field the caller did not supply.
// ─────────────────────────────────────────────────────────────────────────────
import {
  PATHWAY_FINANCE, FINANCE_BY_ID, LOAN_ASSUMPTIONS, FEDERAL_LOAN_LIMITS, DEFAULT_COMPARISON,
} from '../data/pathwayFinance';

export const SCHOOL_TYPES = [
  { id: 'publicInState', label: 'Public, in-state', note: 'The cheapest realistic option for most students, and usually the single biggest lever on this whole page.' },
  { id: 'publicOutState', label: 'Public, out-of-state', note: 'Often as expensive as a private school without the private school\'s aid budget.' },
  { id: 'private', label: 'Private', note: 'The highest sticker price and also the largest aid budgets — the number that matters is what they actually offer you, not the published cost.' },
];

const SCHOOL_TYPE_IDS = SCHOOL_TYPES.map(t => t.id);

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v) => Math.round(num(v));

/**
 * The cost of one year of a phase, before any aid.
 *
 * Undergraduate years use the school-type figure the student picked.
 * Professional years use the pathway's own professional figure, scaled by
 * school type — an in-state public medical school is materially cheaper than a
 * private one, and flattening that produces a number no student recognises.
 *
 * The scaling factors are stated estimates, not published ratios, and they are
 * declared here rather than buried so they can be argued with.
 */
export const PROFESSIONAL_SCHOOL_TYPE_FACTOR = {
  publicInState: 0.72,
  publicOutState: 1.05,
  private: 1.22,
};

export function phaseCostPerYear(pathway, phase, schoolType) {
  const type = SCHOOL_TYPE_IDS.includes(schoolType) ? schoolType : 'publicInState';
  const cpy = pathway.costPerYear || {};
  if (phase.kind === 'undergrad') {
    if (type === 'publicOutState') return num(cpy.undergradPublicOutState);
    if (type === 'private') return num(cpy.undergradPrivate);
    return num(cpy.undergradPublicInState);
  }
  if (phase.kind === 'professional') {
    const base = num(cpy.professional);
    if (!base) return 0;
    return Math.round(base * (PROFESSIONAL_SCHOOL_TYPE_FACTOR[type] ?? 1));
  }
  // Postgraduate (residency) years are paid employment, not a bill. They cost
  // nothing in tuition — their financial weight is the interest that keeps
  // accruing on everything borrowed before them, which accrueDuringTraining()
  // charges separately.
  return 0;
}

/**
 * Which federal interest rate applies to a phase's borrowing.
 *
 * Undergraduate borrowing is at the undergraduate rate. Professional-school
 * borrowing above the annual Direct Unsubsidized cap is Grad PLUS, at a higher
 * rate — which is most of it for medicine and dentistry, and is why those two
 * accrue so much faster than their sticker cost suggests. The blend is
 * computed per year rather than assumed.
 */
export function blendedRateForPhase(phase, borrowedPerYear) {
  const A = LOAN_ASSUMPTIONS;
  if (phase.kind === 'undergrad') return A.undergradRate;
  const borrowed = Math.max(0, num(borrowedPerYear));
  if (borrowed <= 0) return A.gradRate;
  const atGradRate = Math.min(borrowed, FEDERAL_LOAN_LIMITS.gradAnnual);
  const atPlusRate = Math.max(0, borrowed - FEDERAL_LOAN_LIMITS.gradAnnual);
  return (atGradRate * A.gradRate + atPlusRate * A.gradPlusRate) / borrowed;
}

/**
 * Interest accrued on a balance that is not being repaid yet.
 *
 * Simple annual compounding on the running balance. Real federal unsubsidized
 * interest accrues daily and capitalises at defined events; compounding
 * annually is close enough for a planning figure and is a stated simplification
 * rather than an unstated one.
 */
function grow(balance, rate, years) {
  return balance * Math.pow(1 + rate, Math.max(0, years));
}

/**
 * The standard-plan monthly payment on a balance.
 *
 * The standard ten-year plan is used because it is the plan that ends.
 * Income-driven plans produce a smaller monthly number and a larger total, and
 * showing the smaller number without the larger one is how this subject is
 * normally mis-sold.
 */
export function monthlyPayment(balance, annualRate = LOAN_ASSUMPTIONS.gradRate, years = LOAN_ASSUMPTIONS.repaymentYears) {
  const P = Math.max(0, num(balance));
  if (P === 0) return 0;
  const r = num(annualRate) / 12;
  const n = Math.max(1, Math.round(num(years) * 12));
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * The whole projection for one pathway.
 *
 * @param {string} pathwayId          — a PATHWAY_FINANCE id ('md' | 'pa' | …)
 * @param {object} inputs
 *   undergradSchoolType      'publicInState' | 'publicOutState' | 'private'
 *   professionalSchoolType   same three
 *   annualAidUndergrad       scholarships/grants/family money per undergrad year
 *   annualAidProfessional    the same for professional school
 *   familyContributionTotal  a one-off lump sum applied to the earliest years
 *   residencyYears           override for pathways with a postgrad phase
 *   inflate                  apply LOAN_ASSUMPTIONS.costInflation across years
 *
 * @returns {object|null} null for an unknown pathway id — callers render
 *   nothing rather than a zeroed row, because a zeroed row reads as "free".
 */
export function estimatePathwayCost(pathwayId, inputs = {}) {
  const pathway = FINANCE_BY_ID[pathwayId];
  if (!pathway) return null;

  const usedDefaults = [];
  const pick = (key, fallback) => {
    if (inputs[key] === undefined || inputs[key] === null || inputs[key] === '') {
      usedDefaults.push(key);
      return fallback;
    }
    return inputs[key];
  };

  const undergradSchoolType = SCHOOL_TYPE_IDS.includes(pick('undergradSchoolType', 'publicInState'))
    ? pick('undergradSchoolType', 'publicInState') : 'publicInState';
  const professionalSchoolType = SCHOOL_TYPE_IDS.includes(pick('professionalSchoolType', 'publicInState'))
    ? pick('professionalSchoolType', 'publicInState') : 'publicInState';
  const annualAidUndergrad = Math.max(0, num(pick('annualAidUndergrad', 0)));
  const annualAidProfessional = Math.max(0, num(pick('annualAidProfessional', 0)));
  // Defaults to OFF, so the first number a student sees is in today's dollars
  // and can be read against the published medians directly above it. Turning it
  // on answers a different and also real question — what a ninth-grader will
  // actually be billed — but a projection that silently inflated by three per
  // cent a year would look like it disagreed with the published figures.
  const inflate = !!pick('inflate', false);
  const residencyOverride = inputs.residencyYears;

  let lumpRemaining = Math.max(0, num(pick('familyContributionTotal', 0)));

  const rows = [];
  let balance = 0;             // outstanding borrowed principal + accrued interest
  let totalBorrowed = 0;       // principal only
  let totalPaidOutOfPocket = 0;
  let totalSticker = 0;
  let yearIndex = 0;           // years since starting college, for inflation

  for (const phase of pathway.phases) {
    const years = phase.id === 'residency' && Number.isFinite(Number(residencyOverride))
      ? clamp(Number(residencyOverride), 1, 8)
      : phase.years;

    const schoolType = phase.kind === 'professional' ? professionalSchoolType : undergradSchoolType;
    const baseCost = phaseCostPerYear(pathway, phase, schoolType);
    const aidPerYear = phase.kind === 'professional' ? annualAidProfessional : annualAidUndergrad;

    const phaseRow = {
      id: phase.id, label: phase.label, kind: phase.kind, years, earning: phase.earning,
      note: phase.note, schoolType: phase.kind === 'postgrad' ? null : schoolType,
      sticker: 0, aid: 0, outOfPocket: 0, borrowed: 0, interestAccrued: 0,
      startYear: yearIndex, endYear: yearIndex + years,
    };

    // Whole years bill in full; a fractional final year (PA's 2.5) bills pro rata.
    // A postgrad phase bills nothing at all — it is handled below, because what
    // happens during residency is interest, not tuition.
    const wholeYears = phase.kind === 'postgrad' ? 0 : Math.floor(years);
    const fraction = phase.kind === 'postgrad' ? 0 : years - wholeYears;

    const chargeYear = (portion) => {
      const inflated = inflate
        ? baseCost * Math.pow(1 + LOAN_ASSUMPTIONS.costInflation, yearIndex)
        : baseCost;
      const sticker = inflated * portion;
      const aid = Math.min(sticker, aidPerYear * portion);
      let net = Math.max(0, sticker - aid);

      const fromLump = Math.min(lumpRemaining, net);
      lumpRemaining -= fromLump;
      net -= fromLump;

      // Interest accrues on everything already owed, for this year, before the
      // new borrowing is added — the compounding a student never sees coming.
      const rate = blendedRateForPhase(phase, net / Math.max(portion, 0.0001));
      const interest = grow(balance, rate, portion) - balance;
      balance += interest;
      balance += net;

      phaseRow.sticker += sticker;
      phaseRow.aid += aid;
      phaseRow.outOfPocket += fromLump;
      phaseRow.borrowed += net;
      phaseRow.interestAccrued += interest;

      totalSticker += sticker;
      totalBorrowed += net;
      totalPaidOutOfPocket += fromLump;
      yearIndex += portion;
    };

    for (let i = 0; i < wholeYears; i += 1) chargeYear(1);
    if (fraction > 0.001) chargeYear(fraction);

    // A postgrad phase bills nothing but is the most financially consequential
    // stretch on the whole timeline: the balance keeps accruing while the
    // resident earns a stipend that barely touches the principal.
    //
    // How much of that accrual is actually paid is the assumption that decides
    // whether this row is honest. A resident on an income-driven plan makes
    // real payments — typically covering some but not all of the interest —
    // so modelling zero payments produces a scare number, and modelling full
    // payments produces the fiction that residency is financially neutral.
    // `residencyInterestPaidShare` sits between the two, defaults to half, is
    // stated in `assumptions`, and is shown on screen beside the result.
    if (phase.kind === 'postgrad' && years > 0) {
      const rate = LOAN_ASSUMPTIONS.gradPlusRate;
      const paidShare = clamp(num(pick('residencyInterestPaidShare', 0.5), 0.5), 0, 1);
      const gross = grow(balance, rate, years) - balance;
      const interest = gross * (1 - paidShare);
      balance += interest;
      phaseRow.interestAccrued += interest;
      phaseRow.interestPaidDuringPhase = round(gross - interest);
      yearIndex += years;
    }

    ['sticker', 'aid', 'outOfPocket', 'borrowed', 'interestAccrued'].forEach(k => { phaseRow[k] = round(phaseRow[k]); });
    rows.push(phaseRow);
  }

  const balanceAtRepayment = round(balance);
  const repaymentRate = pathway.phases.some(p => p.kind === 'professional')
    ? LOAN_ASSUMPTIONS.gradPlusRate : LOAN_ASSUMPTIONS.undergradRate;
  const monthly = monthlyPayment(balanceAtRepayment, repaymentRate, LOAN_ASSUMPTIONS.repaymentYears);
  const totalRepaid = monthly * 12 * LOAN_ASSUMPTIONS.repaymentYears;

  const medianEarnings = num(pathway.earnings?.medianAnnual);
  const monthlyIncomeAtMedian = medianEarnings / 12;

  return {
    pathwayId,
    pathway,
    phases: rows,
    totalYears: round(yearIndex * 10) / 10,
    yearsUntilFirstFullSalary: pathway.yearsUntilFirstFullSalary,
    totalSticker: round(totalSticker),
    totalAid: round(rows.reduce((s, r) => s + r.aid, 0)),
    totalPaidOutOfPocket: round(totalPaidOutOfPocket),
    totalBorrowed: round(totalBorrowed),
    interestDuringTraining: round(balanceAtRepayment - totalBorrowed),
    balanceAtRepayment,
    monthlyPayment: round(monthly),
    totalRepaid: round(totalRepaid),
    // What the payment actually feels like. Deliberately expressed against the
    // OCCUPATION median rather than starting pay, and every caller must say so:
    // a new graduate's real share is higher than this number.
    paymentShareOfMedianIncome: monthlyIncomeAtMedian > 0
      ? Math.round((monthly / monthlyIncomeAtMedian) * 1000) / 10 : null,
    medianEarnings: medianEarnings || null,
    assumptions: {
      undergradSchoolType, professionalSchoolType, annualAidUndergrad, annualAidProfessional,
      familyContributionTotal: Math.max(0, num(inputs.familyContributionTotal)),
      inflate, costInflation: LOAN_ASSUMPTIONS.costInflation,
      repaymentYears: LOAN_ASSUMPTIONS.repaymentYears,
      repaymentRate,
      residencyYears: pathway.phases.find(p => p.kind === 'postgrad')
        ? (Number.isFinite(Number(residencyOverride)) ? clamp(Number(residencyOverride), 1, 8)
          : pathway.phases.find(p => p.kind === 'postgrad').years)
        : null,
      residencyInterestPaidShare: pathway.phases.some(p => p.kind === 'postgrad')
        ? clamp(num(inputs.residencyInterestPaidShare, 0.5), 0, 1) : null,
      // The assumption that swamps every other one, and the reason this figure
      // is not a prediction: it is what happens if you borrow every dollar of
      // the published cost of attendance, minus whatever aid you entered above.
      borrowsFullCostOfAttendance: annualAidUndergrad === 0 && annualAidProfessional === 0
        && Math.max(0, num(inputs.familyContributionTotal)) === 0,
    },
    usedDefaults,
  };
}

/** Every pathway at once, in the file's own display order. */
export function compareDebtTrajectories(pathwayIds = DEFAULT_COMPARISON, inputs = {}) {
  const wanted = new Set(pathwayIds);
  return PATHWAY_FINANCE
    .filter(p => wanted.has(p.id))
    .sort((a, b) => a.order - b.order)
    .map(p => estimatePathwayCost(p.id, inputs))
    .filter(Boolean);
}

/**
 * The published-reality row that sits above every projection.
 *
 * The calculator's numbers are the student's own assumptions compounded. These
 * are what people who actually finished owed. Both belong on screen, clearly
 * distinguished, because a student who sees only the projection is reading
 * their own guess back to themselves.
 */
export function publishedDebtRows(pathwayIds = DEFAULT_COMPARISON) {
  const wanted = new Set(pathwayIds);
  return PATHWAY_FINANCE
    .filter(p => wanted.has(p.id))
    .sort((a, b) => a.order - b.order)
    .map(p => ({
      id: p.id,
      label: p.label,
      short: p.short,
      colorKey: p.colorKey,
      years: p.totalYearsAfterHighSchool,
      yearsUntilFirstFullSalary: p.yearsUntilFirstFullSalary,
      phases: p.phases,
      debt: p.debt,
      earnings: p.earnings,
      headline: p.headline,
      tradeoff: p.tradeoff,
      credential: p.credential,
      // Debt as a multiple of the occupation's median annual earnings. The one
      // figure that makes five very different pathways comparable at all: 0.35
      // and 1.76 say more about a decision than $30,000 and $300,000 do.
      debtToIncome: p.earnings?.medianAnnual
        ? Math.round((p.debt.median / p.earnings.medianAnnual) * 100) / 100
        : null,
    }));
}

/**
 * Service programs relevant to a pathway, ordered by how soon the door closes.
 *
 * Sorted by COMMITMENT_TIMING order rather than by award size, because the
 * thing a fifteen-year-old needs from this list is which one they are about to
 * miss — not which one is worth most.
 */
export function serviceProgramsFor(pathwayId, programs, timingOrder) {
  const list = (programs || []).filter(p => !pathwayId || (p.pathways || []).includes(pathwayId));
  return list.slice().sort((a, b) => {
    const ao = timingOrder?.[a.timing]?.order ?? 99;
    const bo = timingOrder?.[b.timing]?.order ?? 99;
    return ao - bo || String(a.name).localeCompare(String(b.name));
  });
}

/** $205,000 → "$205,000"; null → "—". Shared so every surface formats alike. */
export function money(v, { compact = false } = {}) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  if (compact && Math.abs(n) >= 1000) {
    const k = n / 1000;
    return `$${k >= 100 ? Math.round(k) : Math.round(k * 10) / 10}k`;
  }
  return `$${Math.round(n).toLocaleString()}`;
}

/** 6.5 → "6½ years". Half-years are real on the PA path and "6.5 years" reads as a typo. */
export function yearsLabel(y) {
  const n = num(y);
  if (!n) return '—';
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac > 0.4 && frac < 0.6) return `${whole}½ years`;
  const rounded = Math.round(n * 10) / 10;
  return `${rounded} year${rounded === 1 ? '' : 's'}`;
}
