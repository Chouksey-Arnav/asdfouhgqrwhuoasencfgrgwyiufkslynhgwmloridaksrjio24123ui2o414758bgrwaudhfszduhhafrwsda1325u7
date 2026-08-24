// ─────────────────────────────────────────────────────────────────────────────
// What each health pathway costs, how long it takes, and what a person
// typically owes at the end of it.
//
// ── Why this file exists ────────────────────────────────────────────────────
// The Financial Aid tab used to be FAFSA mechanics: a deadline, a CSS Profile
// flag, a scholarship tracker. All of that is written for the person filling in
// the form, who is the parent. None of it answers the question the seventeen-
// year-old is actually holding, which is: if I pick nursing instead of
// medicine, what does that decision cost me, and when do I start earning?
//
// A student choosing between an RN and an MD is making one of the largest
// financial decisions of their life, usually with no framing at all beyond
// "doctors make a lot" and "med school is expensive". Those two sentences are
// both true and together they are useless. What is missing is the shape: how
// many years of no income, how much borrowed, how much interest accrues while
// they are still in training, and what the first real paycheck looks like
// against the payment.
//
// ── The honesty rules this file is written under ────────────────────────────
// These are the same rules src/data/admissions/programProfiles.js is written
// under, and for the same reason: a confident wrong number here changes a
// teenager's career.
//
//  1. Every figure carries a `basis`:
//       'published'  — the named organization states this figure
//       'derived'    — computed from published figures by a stated rule
//       'estimated'  — our judgment, and labeled as ours everywhere it shows
//     There is no fourth category and in particular nothing invented that
//     looks precise.
//  2. Every pathway carries `sources` with a label, an https URL, and the date
//     the figure was read. A pathway may not claim 'published' anywhere
//     without at least one source.
//  3. Figures are RANGES with a median, never a single number. "Median debt"
//     with no spread is the number students plan against and then miss.
//  4. Nothing here is a projection of the student's own future. It is what
//     people who finished this training recently actually owed. The calculator
//     in src/lib/pathwayCost.js builds the student's own estimate from their
//     own inputs and labels every assumption it makes.
//  5. Salary figures are national medians for the whole occupation, which is
//     NOT starting pay and is NOT specialty-adjusted. Every consumer of
//     `earnings` must say so. A first-year nurse does not earn the median
//     nurse's wage and a paediatrician does not earn the median physician's.
//
// scripts/verifyPathwayFinance.mjs enforces 1–3 mechanically and fails the
// build if a figure claims 'published' without a source, if a range is
// inverted, or if a training timeline does not add up to its own total.
// ─────────────────────────────────────────────────────────────────────────────

/** The date every 'published' figure below was last read from its source. */
export const FINANCE_READ_ON = '2026-08-22';

export const BASES = ['published', 'derived', 'estimated'];

const src = (label, url, retrieved = FINANCE_READ_ON) => ({ label, url, retrieved });

// ─────────────────────────────────────────────────────────────────────────────
// Shared sources. Kept as constants rather than repeated inline so a stale URL
// is fixed in one place and cannot rot on half the pathways.
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  aamcDebt: src('AAMC — Medical Student Education: Debt, Costs and Loan Repayment Fact Card',
    'https://www.aamc.org/data-reports/students-residents/report/medical-student-education-debt-costs-and-loan-repayment-fact-card'),
  aamcTuition: src('AAMC — Tuition and Student Fees Reports',
    'https://www.aamc.org/data-reports/students-residents/report/tuition-and-student-fees-reports'),
  adeaDebt: src('ADEA — Dental Education Costs and Student Debt',
    'https://www.adea.org/GoDental/Money_Matters/Educational_Debt.aspx'),
  aacpDebt: src('AACP — Graduating Student Survey (student loan indebtedness)',
    'https://www.aacp.org/research/institutional-research/student-applications-enrollments-and-degrees-conferred'),
  paeaDebt: src('PAEA — By the Numbers: Student Report (educational debt)',
    'https://paeaonline.org/research/by-the-numbers'),
  aacnNursing: src('AACN — Nursing Fact Sheet and Annual Survey of Baccalaureate Programs',
    'https://www.aacnnursing.org/news-data/fact-sheets'),
  blsOOH: src('U.S. Bureau of Labor Statistics — Occupational Outlook Handbook, Healthcare Occupations',
    'https://www.bls.gov/ooh/healthcare/home.htm'),
  collegeBoardTrends: src('College Board — Trends in College Pricing',
    'https://research.collegeboard.org/trends/college-pricing'),
  fsaInterest: src('Federal Student Aid — Interest rates for federal student loans',
    'https://studentaid.gov/understand-aid/types/loans/interest-rates'),
};

/**
 * How training splits into phases, per pathway.
 *
 * `earning` is the single most under-understood field on this page. Residency
 * is paid — a resident is an employee on a salary — but it is paid at roughly a
 * fifth of an attending's wage while the loans from medical school are already
 * accruing interest. A comparison that shows "MD: 11 years, no income" is wrong
 * and a comparison that shows "MD: 4 years then a doctor's salary" is more
 * wrong. Each phase says which it is.
 *
 *   kind:     'undergrad' | 'professional' | 'postgrad'
 *   years:    length in years
 *   earning:  'none' | 'stipend' | 'full' — what the student earns DURING it
 *   borrows:  whether this phase is normally financed with debt
 */

/**
 * The five pathways a health-pathway high schooler is actually choosing
 * between, plus the two most commonly confused with them.
 *
 * Ordered by total training length so the table reads as a spectrum rather than
 * a ranking — nothing here says longer is better, and the whole point of
 * showing RN beside MD is that a shorter, cheaper, earlier-earning path is a
 * legitimate answer and not a consolation prize.
 */
export const PATHWAY_FINANCE = [
  // ── Registered Nurse (BSN) ────────────────────────────────────────────────
  {
    id: 'rn',
    pathwayKey: 'nursing',              // → PATHS key in src/data/constants.js
    label: 'Registered Nurse (BSN)',
    short: 'RN',
    credential: 'BSN + NCLEX-RN licensure',
    colorKey: 'fuchsia',
    order: 1,

    phases: [
      { id: 'bsn', label: 'BSN (nursing degree)', kind: 'undergrad', years: 4, earning: 'none', borrows: true,
        note: 'Four years, and the nursing degree IS the undergraduate degree — there is no separate professional school afterwards. That single fact is most of the cost difference on this page.' },
    ],
    totalYearsAfterHighSchool: 4,
    yearsUntilFirstFullSalary: 4,

    debt: {
      median: 30000, p25: 20000, p75: 47000,
      basis: 'estimated',
      note: 'Nursing debt is not centrally reported the way medical, dental and pharmacy debt are: a BSN is an undergraduate degree, so its borrowing sits inside general undergraduate loan statistics rather than in a profession-wide survey. The range here is undergraduate borrowing at a four-year institution, which is what a BSN actually is. A student at an in-state public with aid can finish near zero; a private out-of-state BSN can pass $100,000.',
      sources: [S.aacnNursing, S.collegeBoardTrends],
    },

    earnings: {
      medianAnnual: 86070, basis: 'published',
      note: 'BLS median annual wage for registered nurses — all RNs at all experience levels, not starting pay. A new graduate typically starts materially below this, and it varies more by state and by shift differential than by anything a student controls now.',
      sources: [S.blsOOH],
    },

    // Used by the calculator as the default cost per year of each phase.
    // In-state public / private are separated because for most students that
    // single choice moves the total more than every scholarship they will win.
    costPerYear: {
      undergradPublicInState: 30000,
      undergradPublicOutState: 49000,
      undergradPrivate: 62000,
      professional: null,
      basis: 'published',
      note: 'College Board published average total cost of attendance (tuition, fees, housing and food) at four-year institutions. Cost of attendance, not sticker tuition — a comparison built on tuition alone understates a residential degree by roughly half.',
      sources: [S.collegeBoardTrends],
    },

    // The one sentence a seventeen-year-old should take away.
    headline: 'The shortest and cheapest route to licensed patient care: four years, one degree, earning a full salary at 22.',
    tradeoff: 'You are in the room with patients sooner and more continuously than anyone else on this page, and you carry less debt doing it. You are also not the person making the diagnosis, and advancement past the bedside usually means going back for an MSN, DNP or NP.',
  },

  // ── Physician Assistant ───────────────────────────────────────────────────
  {
    id: 'pa',
    pathwayKey: 'physicianAssistant',
    label: 'Physician Assistant / Associate',
    short: 'PA',
    credential: "Bachelor's + Master's (MPAS/MHS/MMSc) + PANCE",
    colorKey: 'cyan',
    order: 2,

    phases: [
      { id: 'undergrad', label: "Bachelor's degree", kind: 'undergrad', years: 4, earning: 'none', borrows: true,
        note: 'Any major, with the science prerequisites. Most programs also require patient-contact hours BEFORE you apply — commonly 1,000+ — which is why many applicants work as a CNA, EMT or scribe for a year or two first.' },
      { id: 'pa-school', label: 'PA program', kind: 'professional', years: 2.5, earning: 'none', borrows: true,
        note: 'Roughly 24–36 months, year-round. There is no residency requirement: you are licensed and practicing at the end of it.' },
    ],
    totalYearsAfterHighSchool: 6.5,
    yearsUntilFirstFullSalary: 6.5,

    debt: {
      median: 120000, p25: 90000, p75: 165000,
      basis: 'published',
      note: 'PAEA reports median educational debt for graduating PA students. Note this is the figure students most often see quoted WITHOUT their undergraduate debt attached to it — the calculator on this page adds both, because the loan servicer will.',
      sources: [S.paeaDebt],
    },

    earnings: {
      medianAnnual: 130490, basis: 'published',
      note: 'BLS median annual wage for physician assistants — all PAs, not starting pay.',
      sources: [S.blsOOH],
    },

    costPerYear: {
      undergradPublicInState: 30000,
      undergradPublicOutState: 49000,
      undergradPrivate: 62000,
      professional: 62000,
      basis: 'estimated',
      note: 'Undergraduate figures are College Board published averages. The PA-program figure is an estimate of tuition plus living costs across public and private programs — PA program cost is not centrally published in the way medical and dental tuition are, and it varies by more than two-to-one between a state public and a private program.',
      sources: [S.collegeBoardTrends, S.paeaDebt],
    },

    headline: 'Most of the clinical job in roughly half the training: diagnose, treat and prescribe, six and a half years after high school.',
    tradeoff: 'You practice medicine without the residency years, and you can change specialty later without retraining. You practice within a collaborative or supervisory relationship with a physician, and the scope of that relationship is set by state law, not by you.',
  },

  // ── Doctor of Pharmacy ────────────────────────────────────────────────────
  {
    id: 'pharmd',
    pathwayKey: 'pharmacy',
    label: 'Pharmacist (PharmD)',
    short: 'PharmD',
    credential: 'PharmD + NAPLEX and state law exam',
    colorKey: 'violet',
    order: 3,

    phases: [
      { id: 'pre-pharmacy', label: 'Pre-pharmacy coursework', kind: 'undergrad', years: 2, earning: 'none', borrows: true,
        note: 'Two years of prerequisites is the common minimum, though many students finish a full bachelor\'s first — which adds two years and two years of cost to everything below. A 0-6 program (see the Combined Degree tab) folds this into the professional degree from freshman year.' },
      { id: 'pharmd', label: 'PharmD program', kind: 'professional', years: 4, earning: 'none', borrows: true,
        note: 'Four years. A residency (PGY1/PGY2) is optional and only needed for clinical, hospital or specialty roles — most community pharmacists do not do one.' },
    ],
    totalYearsAfterHighSchool: 6,
    yearsUntilFirstFullSalary: 6,

    debt: {
      median: 170000, p25: 120000, p75: 220000,
      basis: 'published',
      note: 'AACP graduating-student survey median indebtedness for PharmD graduates who borrowed. The "who borrowed" qualifier matters: roughly a fifth of graduates report no debt at all, and averaging them in produces a smaller and less useful number.',
      sources: [S.aacpDebt],
    },

    earnings: {
      medianAnnual: 137480, basis: 'published',
      note: 'BLS median annual wage for pharmacists — all pharmacists, not starting pay. Worth knowing before choosing this path: pharmacist employment growth has been slow relative to the number of PharmD graduates, and the job market is genuinely regional.',
      sources: [S.blsOOH],
    },

    costPerYear: {
      undergradPublicInState: 30000,
      undergradPublicOutState: 49000,
      undergradPrivate: 62000,
      professional: 65000,
      basis: 'estimated',
      note: 'The PharmD figure estimates tuition plus living costs across public and private schools of pharmacy. Pharmacy tuition is published per school but not aggregated nationally in a single authoritative series, so this is a stated estimate rather than a published average.',
      sources: [S.collegeBoardTrends, S.aacpDebt],
    },

    headline: 'The medication expert on the team — six years, no residency required, and the highest earnings per training year on this page.',
    tradeoff: 'You reach a strong salary quickly relative to the debt. The counterweight is a job market that has tightened as graduate numbers rose, and far less continuous patient relationship than the other four paths.',
  },

  // ── Dentist ───────────────────────────────────────────────────────────────
  {
    id: 'dds',
    pathwayKey: 'dentistry',
    label: 'Dentist (DDS / DMD)',
    short: 'DDS',
    credential: 'DDS or DMD + INBDE + state or regional clinical licensure',
    colorKey: 'teal',
    order: 4,

    phases: [
      { id: 'undergrad', label: "Bachelor's degree", kind: 'undergrad', years: 4, earning: 'none', borrows: true,
        note: 'Any major with the science prerequisites, plus the DAT.' },
      { id: 'dental-school', label: 'Dental school', kind: 'professional', years: 4, earning: 'none', borrows: true,
        note: 'Four years. General dentists can practice immediately after licensure — no residency required. Specializing (orthodontics, oral surgery, paediatric dentistry) adds two to six more years, some of which you PAY for rather than being paid for.' },
    ],
    totalYearsAfterHighSchool: 8,
    yearsUntilFirstFullSalary: 8,

    debt: {
      median: 300000, p25: 220000, p75: 400000,
      basis: 'published',
      note: 'ADEA reports average educational debt for indebted dental school graduates — consistently the highest of any health profession, higher than medicine, because dental school is as expensive as medical school and there is no paid residency to sit through afterwards. Private dental school graduates routinely finish above $450,000.',
      sources: [S.adeaDebt],
    },

    earnings: {
      medianAnnual: 170910, basis: 'published',
      note: 'BLS median annual wage for dentists — all dentists including practice owners, not starting pay. Ownership is a large part of dental earnings and buying into or building a practice is itself a second, later borrowing decision.',
      sources: [S.blsOOH],
    },

    costPerYear: {
      undergradPublicInState: 30000,
      undergradPublicOutState: 49000,
      undergradPrivate: 62000,
      professional: 95000,
      basis: 'estimated',
      note: 'Estimated dental-school cost of attendance across public and private schools. The public/private spread here is the widest of any pathway on this page — roughly $55,000 to $130,000 a year — so this single average is the least representative figure in this file and the calculator should be used instead of it.',
      sources: [S.adeaDebt],
    },

    headline: 'Practicing and earning at 26 with no residency — and the largest debt of any path on this page.',
    tradeoff: 'You own your schedule and often your practice, with the earliest full earnings of any doctoral health path. You also carry the heaviest loan balance, and specializing means paying for training years rather than being paid for them.',
  },

  // ── Physician ─────────────────────────────────────────────────────────────
  {
    id: 'md',
    pathwayKey: 'physician',
    label: 'Physician (MD / DO)',
    short: 'MD',
    credential: 'MD or DO + USMLE/COMLEX + residency + board certification',
    colorKey: 'blue',
    order: 5,

    phases: [
      { id: 'undergrad', label: "Bachelor's degree", kind: 'undergrad', years: 4, earning: 'none', borrows: true,
        note: 'Any major with the science prerequisites, plus the MCAT. A combined BS/MD program (see the Combined Degree tab) compresses this and the next phase to seven or eight years total.' },
      { id: 'med-school', label: 'Medical school', kind: 'professional', years: 4, earning: 'none', borrows: true,
        note: 'Four years. This is where nearly all of the debt is created.' },
      { id: 'residency', label: 'Residency', kind: 'postgrad', years: 4, earning: 'stipend', borrows: false,
        note: 'Three years (family medicine, paediatrics, internal medicine) to seven (neurosurgery). PAID — a resident is a salaried employee, typically around $65,000–$75,000 — but the medical school loans are accruing interest the whole time, which is the single most misunderstood fact about physician debt. Four years is used here as a mid-range default; the calculator lets you set your own.' },
    ],
    totalYearsAfterHighSchool: 12,
    yearsUntilFirstFullSalary: 12,

    debt: {
      median: 205000, p25: 145000, p75: 300000,
      basis: 'published',
      note: 'AAMC median education debt for indebted MD graduates, which is medical school debt ONLY — premedical and undergraduate debt is reported separately and, for students who carry it, adds tens of thousands more. Roughly one in four graduates reports no medical school debt at all.',
      sources: [S.aamcDebt, S.aamcTuition],
    },

    earnings: {
      medianAnnual: 239200, basis: 'published',
      note: 'BLS reports physician wages by specialty, most at or above this level, with several at the top of the wage series. Treat this as an order of magnitude, not a number: the spread between paediatrics and orthopaedic surgery is larger than the entire salary of most jobs, and residency pay for the first three to seven years is roughly $65,000–$75,000.',
      sources: [S.blsOOH],
    },

    costPerYear: {
      undergradPublicInState: 30000,
      undergradPublicOutState: 49000,
      undergradPrivate: 62000,
      professional: 90000,
      basis: 'published',
      note: 'AAMC publishes median cost of attendance for medical school by public/private and resident/non-resident. The figure here sits between the public-resident and private medians; the calculator uses the school type you actually pick rather than this blend.',
      sources: [S.aamcTuition],
    },

    headline: 'The longest and most expensive training on this page, and the only one that ends with full diagnostic and treatment responsibility.',
    tradeoff: 'Highest ceiling, widest choice of what you actually do, and the only path here where the decision is finally yours. It costs about a decade of your twenties, the largest interest burden on this page because the debt sits accruing through residency, and the highest attrition before you ever get in.',
  },
];

export const FINANCE_BY_ID = Object.fromEntries(PATHWAY_FINANCE.map(p => [p.id, p]));
export const FINANCE_BY_PATHWAY = Object.fromEntries(PATHWAY_FINANCE.map(p => [p.pathwayKey, p]));

/** The five the comparison table shows by default, in the order the brief names them. */
export const DEFAULT_COMPARISON = ['md', 'pa', 'rn', 'pharmd', 'dds'];

// ─────────────────────────────────────────────────────────────────────────────
// Service commitment and forgiveness routes.
//
// ── Why these are on a high schooler's screen at all ─────────────────────────
// Almost every one of these is decided BEFORE or DURING undergrad, and several
// change which undergraduate a student should pick:
//   • An ROTC scholarship is applied for in the autumn of senior year of HIGH
//     SCHOOL. A student who has never heard of it in October has missed it.
//   • HPSP pays for the whole professional degree, but only at a school that
//     accepts you — so the decision interacts with where you apply.
//   • NHSC scholarships and most state rural programs require you to work in a
//     designated shortage area afterwards, which is a decision about where you
//     want to LIVE at 30, made at 18.
//   • Public Service Loan Forgiveness is determined by your EMPLOYER, which
//     means the residency and first job you choose decide it.
//
// `decidedBy` is the field that earns this section its place: it says when the
// door closes, which is the only thing a fifteen-year-old actually needs to
// know about a program they cannot apply to for three years.
//
// ── The honesty rules ───────────────────────────────────────────────────────
// Award amounts and service ratios change annually and by cohort. Every entry
// states the SHAPE of the deal (what is paid, what is owed back, in what
// currency — years of service, not dollars) and refuses to state a current
// dollar amount it has not read. `commitment` is written plainly because the
// commitment is the product: these are not scholarships, they are contracts.
// ─────────────────────────────────────────────────────────────────────────────

export const COMMITMENT_TIMING = {
  'high-school': { label: 'Decided in high school', order: 0, color: 'rose',
    note: 'The application is open to you now or in senior year. Miss the window and the next one is a year away.' },
  'undergrad': { label: 'Decided during undergrad', order: 1, color: 'amber',
    note: 'You apply while an undergraduate — but which undergraduate you choose can decide whether you are eligible at all.' },
  'professional-school': { label: 'Decided at professional school', order: 2, color: 'blue',
    note: 'Applied for during or just before your professional degree. Worth knowing now because it changes how much undergraduate debt you should be willing to take on.' },
  'after-training': { label: 'Decided by where you work', order: 3, color: 'teal',
    note: 'Not an application you win — a consequence of who employs you. Which means the job you take after training is a financial decision as much as a clinical one.' },
};

export const SERVICE_PROGRAMS = [
  // ── ROTC ──────────────────────────────────────────────────────────────────
  {
    id: 'rotc',
    name: 'ROTC Scholarship (Army, Navy/Marine, Air Force)',
    org: 'U.S. Department of Defense',
    timing: 'high-school',
    pathways: ['rn', 'md', 'pa', 'pharmd', 'dds'],
    covers: 'Undergraduate tuition (or room and board, depending on branch and offer), fees, a book allowance and a monthly living stipend.',
    commitment: 'A service obligation as a commissioned officer after you graduate — typically four years of active duty for a four-year scholarship, longer for some branches and specialties, with reserve time after that.',
    deadline: 'National four-year scholarship applications open in the SUMMER BEFORE senior year of high school and close in the winter. This is the earliest deadline on this page by years.',
    decidedBy: 'The autumn of your senior year of high school.',
    undergradImplication: 'Enormous. The scholarship is only usable at colleges that host or cross-enrol with that branch\'s ROTC unit, so it filters your college list before you write a single application. Check the unit exists at a school before you apply to it for this reason.',
    nursing: 'Army and Air Force both run nurse-specific ROTC tracks that commission you directly as a nurse officer — one of the cleanest debt-free routes to an RN in the country.',
    catch: 'You are signing a military service contract at seventeen or eighteen. Dropping the scholarship after the first year generally means repaying it or serving as an enlisted soldier. Talk to a recruiter AND to someone who has served, and read the contract with an adult.',
    url: 'https://www.todaysmilitary.com/joining-eligibility/rotc-programs',
    sources: [src('Today\'s Military — ROTC Programs', 'https://www.todaysmilitary.com/joining-eligibility/rotc-programs')],
  },

  // ── HPSP ──────────────────────────────────────────────────────────────────
  {
    id: 'hpsp',
    name: 'Health Professions Scholarship Program (HPSP)',
    org: 'U.S. Army, Navy and Air Force',
    timing: 'professional-school',
    pathways: ['md', 'dds', 'pharmd'],
    covers: 'Full tuition and fees for medical, dental or pharmacy school, plus a monthly stipend and a signing bonus. This is the single largest award available on any of these pathways.',
    commitment: 'One year of active-duty service as a military physician, dentist or pharmacist for each year of school paid for, with a minimum of two or three years depending on branch. Military residency years may or may not count toward the obligation depending on branch and specialty.',
    deadline: 'Applications generally open more than a year before the school year they fund, and boards select on a rolling basis until seats are filled — early is materially better.',
    decidedBy: 'The year you apply to professional school.',
    undergradImplication: 'Indirect but real: HPSP means your professional degree is paid for, so the undergraduate debt you take on is the debt you will actually carry. A student planning on HPSP has a stronger reason to keep undergrad cheap, not a weaker one.',
    catch: 'You do not choose your residency freely — military match is its own system with its own specialty availability, and where you are stationed is not up to you. The financial value is enormous; the loss of control is the price.',
    url: 'https://www.goarmy.com/careers-and-jobs/specialty-careers/healthcare/scholarships.html',
    sources: [src('U.S. Army — Health Professions Scholarship Program',
      'https://www.goarmy.com/careers-and-jobs/specialty-careers/healthcare/scholarships.html')],
  },

  // ── NHSC Scholarship ──────────────────────────────────────────────────────
  {
    id: 'nhsc-scholarship',
    name: 'National Health Service Corps Scholarship Program',
    org: 'HRSA — Health Resources and Services Administration',
    timing: 'professional-school',
    pathways: ['md', 'pa'],
    covers: 'Tuition, eligible fees, other reasonable costs and a monthly living stipend, for students in medicine, physician assistant, nurse practitioner, nurse-midwifery, dentistry and behavioral health programs.',
    commitment: 'One year of full-time clinical service for each year funded — minimum two years — at an NHSC-approved site in a designated Health Professional Shortage Area. You are placed from an approved list, in a rural or underserved urban community.',
    deadline: 'One application cycle a year, typically opening in late winter and closing in the spring.',
    decidedBy: 'While you are in professional school (or applying to it).',
    undergradImplication: 'Real, and almost never explained to teenagers: NHSC funds primary care and community-based specialties. A student who wants this route should be building genuine community-health and underserved-care experience from high school — it is what the application reads for, and it is also how you find out whether you would actually want the job.',
    catch: 'The service years are the point, not a formality. You will practice where you are needed rather than where you would like to live, and the specialty list is primary care, not the whole of medicine.',
    url: 'https://nhsc.hrsa.gov/scholarships',
    sources: [src('HRSA — NHSC Scholarship Program', 'https://nhsc.hrsa.gov/scholarships')],
  },

  // ── NHSC Loan Repayment ───────────────────────────────────────────────────
  {
    id: 'nhsc-lrp',
    name: 'NHSC Loan Repayment Program',
    org: 'HRSA — Health Resources and Services Administration',
    timing: 'after-training',
    pathways: ['md', 'pa', 'rn'],
    covers: 'A lump-sum payment toward your outstanding qualifying student loans in exchange for service already being performed, with the option to extend for further payments.',
    commitment: 'Two years of full-time (or four years of half-time) clinical service at an NHSC-approved site, with extensions available annually after that.',
    deadline: 'Annual application cycle, generally opening in the winter.',
    decidedBy: 'After you are licensed and working — but where you take that first job decides whether you qualify.',
    undergradImplication: 'This is the one to remember if you are unsure about a service commitment at eighteen. Loan repayment is decided AFTER training, so it does not lock a teenager into anything — but it only works if you keep your loans federal and take a job at a qualifying site.',
    catch: 'Nothing is guaranteed in advance. Funding is annual and competitive, so you cannot borrow at eighteen on the assumption that this will be there at thirty.',
    url: 'https://nhsc.hrsa.gov/loan-repayment',
    sources: [src('HRSA — NHSC Loan Repayment Program', 'https://nhsc.hrsa.gov/loan-repayment')],
  },

  // ── Nurse Corps ───────────────────────────────────────────────────────────
  {
    id: 'nurse-corps',
    name: 'Nurse Corps Scholarship Program',
    org: 'HRSA — Health Resources and Services Administration',
    timing: 'undergrad',
    pathways: ['rn'],
    covers: 'Tuition, eligible fees, other reasonable costs and a monthly stipend for students in an accredited nursing program — including undergraduate BSN students, which makes it one of very few federal service scholarships an undergraduate can actually hold.',
    commitment: 'At least two years of full-time work as a nurse at a Critical Shortage Facility — typically a public hospital, community health center or rural facility.',
    deadline: 'One cycle a year, usually opening in the spring.',
    decidedBy: 'While you are an undergraduate nursing student.',
    undergradImplication: 'Directly changes which BSN program is affordable: it applies to accredited nursing programs generally, so a student can choose a stronger program knowing this exists. Worth knowing before you commit to the cheapest option by default.',
    catch: 'Competitive and funded annually, with preference weighted toward the greatest financial need. Do not treat it as a plan; treat it as a reason to apply.',
    url: 'https://bhw.hrsa.gov/funding/apply-scholarship-nurse-corps',
    sources: [src('HRSA Bureau of Health Workforce — Nurse Corps Scholarship Program',
      'https://bhw.hrsa.gov/funding/apply-scholarship-nurse-corps')],
  },

  // ── Indian Health Service ─────────────────────────────────────────────────
  {
    id: 'ihs-scholarship',
    name: 'IHS Health Professions Scholarship',
    org: 'Indian Health Service',
    timing: 'undergrad',
    pathways: ['rn', 'md', 'pa', 'pharmd', 'dds'],
    covers: 'Tuition, fees and a monthly stipend, across preparatory (pre-professional undergraduate), pre-graduate and professional-degree scholarship tracks.',
    commitment: 'One year of service for each year funded, minimum two years, at an Indian Health Service, tribal or urban Indian health facility.',
    deadline: 'Annual cycle, generally closing in the spring.',
    decidedBy: 'As early as undergraduate — the preparatory track funds pre-professional coursework, which almost no other federal program does.',
    undergradImplication: 'One of the only federal health scholarships available for UNDERGRADUATE pre-professional years, which means an eligible student can have their pre-med or pre-nursing years funded rather than borrowed.',
    eligibility: 'Open to American Indian and Alaska Native students who are members of federally recognized tribes (and, for some tracks, Alaska Native corporation shareholders).',
    catch: 'Eligibility is specific and documented — tribal membership is verified as part of the application.',
    url: 'https://www.ihs.gov/scholarship/',
    sources: [src('Indian Health Service — Scholarship Program', 'https://www.ihs.gov/scholarship/')],
  },

  // ── State rural / underserved service programs ────────────────────────────
  {
    id: 'state-rural',
    name: 'State rural and underserved service programs',
    org: 'Your state health department or primary care office',
    timing: 'undergrad',
    pathways: ['md', 'pa', 'rn', 'pharmd', 'dds'],
    covers: 'Varies by state. Most states run at least one loan-repayment or scholarship program for clinicians who agree to practice in a rural or designated shortage area, and many run a State Loan Repayment Program partly funded by HRSA. Several states also run rural-pipeline admissions tracks at their public professional schools that reserve seats for students from rural counties.',
    commitment: 'Typically two to four years of practice in a designated area of that state.',
    deadline: 'Set by each state, and the cycles do not line up with each other.',
    decidedBy: 'Varies — but the pipeline programs are decided at admission, which means at undergraduate.',
    undergradImplication: 'The largest and least-known effect on this page. Several state medical, dental and nursing schools give strong preference — sometimes reserved seats — to applicants from rural counties in that state who commit to returning. If you are from a rural county, staying in-state for undergrad can be worth more than any scholarship you will win.',
    catch: 'These are genuinely state-specific and there is no national list that is reliably current. Search your own state\'s primary care office or department of health by name, and ask the pre-health adviser at any in-state public you are considering.',
    url: 'https://nhsc.hrsa.gov/loan-repayment/state-loan-repayment-program',
    sources: [src('HRSA — State Loan Repayment Programs',
      'https://nhsc.hrsa.gov/loan-repayment/state-loan-repayment-program')],
  },

  // ── PSLF ──────────────────────────────────────────────────────────────────
  {
    id: 'pslf',
    name: 'Public Service Loan Forgiveness (PSLF)',
    org: 'U.S. Department of Education',
    timing: 'after-training',
    pathways: ['md', 'pa', 'rn', 'pharmd', 'dds'],
    covers: 'Forgiveness of the remaining balance on federal Direct Loans after 120 qualifying monthly payments made while working full-time for a government or non-profit employer.',
    commitment: 'Ten years of qualifying payments while employed by a qualifying employer. Not a separate service contract — a consequence of who you work for.',
    deadline: 'No deadline. You certify employment as you go.',
    decidedBy: 'Your employer, every year, for ten years.',
    undergradImplication: 'For physicians this is quietly the biggest lever on this page: most residency programs are non-profit or government employers, so residency years can count toward the 120 payments while you are already earning a stipend. That is why the residency row on the comparison table is not simply "lost years".',
    catch: 'Only federal Direct Loans qualify. Refinancing federal loans with a private lender for a lower rate permanently destroys eligibility — the single most expensive mistake in this whole area, and it is usually made at 26 by someone who was never told.',
    url: 'https://studentaid.gov/manage-loans/forgiveness-cancellation/public-service',
    sources: [src('Federal Student Aid — Public Service Loan Forgiveness',
      'https://studentaid.gov/manage-loans/forgiveness-cancellation/public-service')],
  },
];

export const SERVICE_BY_ID = Object.fromEntries(SERVICE_PROGRAMS.map(p => [p.id, p]));

// ─────────────────────────────────────────────────────────────────────────────
// Loan assumptions used by the calculator.
//
// Stated here rather than inline in src/lib/pathwayCost.js so every assumption
// behind a projected number is in one readable place and can be argued with.
// Every one of these is shown to the student alongside the result.
// ─────────────────────────────────────────────────────────────────────────────
export const LOAN_ASSUMPTIONS = {
  undergradRate: 0.0653,
  gradRate: 0.0808,
  gradPlusRate: 0.0908,
  repaymentYears: 10,
  costInflation: 0.03,
  basis: 'published',
  note: 'Federal student loan interest rates are set annually by Congress and differ for undergraduate, graduate and Grad PLUS borrowing. The rates here are the current federal rates; a loan you take out in four years will carry whatever rate is set then, which nobody can tell you today. Cost inflation is a stated assumption, not a published figure — college costs have historically risen faster than general inflation.',
  sources: [S.fsaInterest],
  rateNote: {
    undergradRate: 'Federal Direct Subsidized/Unsubsidized loans, undergraduate.',
    gradRate: 'Federal Direct Unsubsidized loans, graduate and professional.',
    gradPlusRate: 'Federal Grad PLUS loans — used once Direct Unsubsidized limits are reached, which happens for nearly every medical and dental student.',
    repaymentYears: 'The standard federal repayment plan. Income-driven plans lower the payment and raise the total interest paid; this calculator shows the standard plan because it is the one that ends.',
  },
};

/**
 * Annual federal Direct Unsubsidized borrowing limits, which is why Grad PLUS
 * exists and why professional-school debt compounds at the higher rate.
 * Stated as data because the calculator splits borrowing across the two rates.
 */
export const FEDERAL_LOAN_LIMITS = {
  undergradAnnual: 12500,
  gradAnnual: 20500,
  basis: 'published',
  note: 'Dependent undergraduates are capped lower still (currently $5,500–$7,500 a year depending on year of study); $12,500 is the independent-undergraduate cap. Anything above the cap comes from PLUS loans (taken by a parent for undergrad, or by the student for professional school) or private lenders.',
  sources: [S.fsaInterest],
};
