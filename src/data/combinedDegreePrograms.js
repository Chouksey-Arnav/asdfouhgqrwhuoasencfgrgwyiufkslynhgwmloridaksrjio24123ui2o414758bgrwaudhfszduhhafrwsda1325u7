// ─────────────────────────────────────────────────────────────────────────────
// Combined-degree and direct-admit programs — the ones you apply to FROM HIGH
// SCHOOL.
//
// ── Why this file exists ────────────────────────────────────────────────────
// Every other admissions surface in this app is about a decision a student
// makes later: which college, which major, which medical school. This is the
// only medical-school-adjacent decision they will ever make while they are
// still in high school, and it is the one with the earliest prep timeline —
// a combined BS/MD wants documented service hours, a test score and a science
// record that a ninth-grader has to start building now, not in twelfth grade.
//
// It is also the worst-documented corner of admissions. Requirements are
// idiosyncratic, published in a PDF, changed without announcement, and
// aggregated almost entirely by consultancies with something to sell.
//
// ── The honesty rules ───────────────────────────────────────────────────────
// Same rules as src/data/admissions/programProfiles.js and
// src/data/opportunityPrograms.js, because they exist for the same reason.
//
//  1. `null` means "we do not know". It never means "no". A program with
//     `casper: null` has not told us; a program with `casper: false` has.
//  2. Every number that a student could plan around carries a `basis`:
//       'official'  — the program states it on its own page.
//       'derived'   — computed from something official, by a stated rule.
//       'estimated' — our judgment, or a widely-repeated third-party figure.
//     There is no fourth category and in particular no "we made it up but it
//     looks precise". The UI renders the basis next to the number, always.
//  3. ACCEPTANCE RATES ARE THE DANGEROUS ONE. Almost no BS/MD program
//     publishes an acceptance rate. Nearly every number circulating online is
//     a consultancy estimate built by dividing a known class size by a GUESSED
//     applicant count, and it gets laundered into fact by blogs citing each
//     other. So the default here is `{ rate: null, basis: 'unpublished' }`,
//     and an 'official' rate may not exist without a `source`.
//  4. `verified` is mandatory and is shown to the student. Anything not
//     verified inside twelve months renders a visible warning — see
//     STALE_AFTER_DAYS in src/lib/combinedDegree.js. Stale admissions data does
//     not merely age; it actively harms a student who plans around it.
//  5. Programs DIE, and the dead ones keep being recommended for years. A
//     terminated program stays in this file with `status: 'closed'` rather
//     than being deleted, because deleting it means the student who heard
//     about it from a cousin finds nothing here and believes the cousin. See
//     MISLISTED_PROGRAMS.
//
// ── The two tiers, and why ──────────────────────────────────────────────────
// There are roughly sixty-two combined baccalaureate–MD programs across
// thirty-one states plus DC, plus direct-admit BSN, 0-6 PharmD, seven-year
// dental and direct-entry PA and PT/OT tracks. We do not have every one of
// them checked to the standard above, and shipping a half-checked requirement
// as if it were checked is exactly the failure this file exists to stop. So:
//
//   PROGRAMS  — fully specified. Every field is either read off the program's
//               own page or explicitly null. These get requirement gaps,
//               milestones, tracking and interview links.
//   ROSTER    — programs we know exist, with the institution, the degree, the
//               length and the state, and NOTHING ELSE. A roster entry may not
//               carry a single requirement claim (the verifier enforces this).
//               It exists so a student in Ohio learns NEOMED is a thing, and
//               is sent to the official page rather than to a blog.
//
// This is the same split src/data/opportunities.js (prose catalog) and
// src/data/opportunityPrograms.js (structured layer) already use, for the same
// reason: coverage and precision are different jobs, and pretending one is the
// other is how a tool starts lying.
//
// ── Adding a program ────────────────────────────────────────────────────────
// Fill it from the program's OWN page — not a consultancy, not a forum, not
// another aggregator. Add the URL and the date you read it to `sources`, set
// `verified` to today, and run `npm run verify:combined-degree`.
// ─────────────────────────────────────────────────────────────────────────────

/** Every claim's provenance. Order is "most trustworthy first". */
export const BASES = ['official', 'derived', 'estimated', 'unpublished'];

export const BASIS_META = {
  official: { label: 'Official', colorKey: 'green', blurb: "The program publishes this number itself." },
  derived: { label: 'Derived', colorKey: 'blue', blurb: 'Computed from something the program publishes, by a stated rule.' },
  estimated: { label: 'Estimated', colorKey: 'amber', blurb: 'Not published anywhere. This is a judgment — treat it as a rough shape, never as a target.' },
  unpublished: { label: 'Not published', colorKey: 'rose', blurb: 'The program does not publish this, and anyone who shows you a precise number for it invented it.' },
};

/**
 * The pathways a combined-degree program can lead to. Keys are PATHS keys from
 * src/data/constants.js so a student's chosen pathway filters this catalog
 * without a translation table in between.
 */
export const PATHWAY_GROUPS = [
  {
    id: 'physician', label: 'Combined BS/BA + MD', colorKey: 'blue',
    blurb: 'Apply as a high-school senior, get a seat held at a medical school. Six to eight years end to end. The most competitive thing a seventeen-year-old can apply to, and the most badly documented.',
  },
  {
    id: 'nursing', label: 'Direct-admit BSN', colorKey: 'fuchsia',
    blurb: 'Admitted straight into the nursing major rather than into "pre-nursing" and a second competitive application after sophomore year. That second application is the part students do not know exists.',
  },
  {
    id: 'pharmacy', label: 'Six-year PharmD (0-6)', colorKey: 'violet',
    blurb: 'Two pre-professional years and four professional years, entered from high school, with the PharmD seat conditionally held.',
  },
  {
    id: 'dentistry', label: 'Seven-year dental', colorKey: 'teal',
    blurb: 'Combined BA/BS + DDS or DMD, entered from high school, usually seven years and sometimes six.',
  },
  {
    id: 'physicianAssistant', label: 'Direct-entry PA', colorKey: 'cyan',
    blurb: 'A five-year BS + MS Physician Assistant track with the graduate seat held from freshman year — the alternative to the brutal open PA-school cycle later.',
  },
  {
    id: 'physicalOccupTherapy', label: 'Direct-entry PT / OT', colorKey: 'lime',
    blurb: 'Freshman-entry 3+3 DPT or combined MS-OT, with the doctoral or masters seat held on condition of GPA and prerequisites.',
  },
];
export const PATHWAY_BY_ID = Object.fromEntries(PATHWAY_GROUPS.map(p => [p.id, p]));

/** Round types, in the order they fall in a senior year. */
export const ROUND_TYPES = {
  early_decision: { label: 'Early Decision', binding: true, blurb: 'Binding. If they admit you, you go.' },
  early_action: { label: 'Early Action', binding: false, blurb: 'Non-binding, but the combined-degree deadline is usually the early one whether or not you want it to be.' },
  regular: { label: 'Regular Decision', binding: false, blurb: 'The standard round.' },
  priority: { label: 'Priority / rolling', binding: false, blurb: 'Reviewed as they arrive. Early is materially better, not just tidier.' },
  separate: { label: 'Separate program deadline', binding: false, blurb: 'The program closes on its own date, which is usually EARLIER than the university’s. This is the single most common way a student loses a combined-degree seat.' },
};

/** Test policies. `required_no_self_report` is its own case because it changes what a student must DO. */
export const TEST_POLICIES = {
  required: { label: 'Test required', tone: 'warn', blurb: 'A score is required for the combined-degree program even where the university itself is test-optional.' },
  required_no_self_report: { label: 'Test required — official scores only', tone: 'bad', blurb: 'Required, and self-reported scores are not accepted. You must have the testing agency send them, which takes weeks. Plan the send date, not just the test date.' },
  optional: { label: 'Test optional', tone: 'good', blurb: 'Genuinely optional for this program. A strong score still helps; its absence is not disqualifying.' },
  not_used: { label: 'Scores not considered', tone: 'good', blurb: 'The program does not look at SAT/ACT at all.' },
};

const V = '2026-08-21'; // The day this catalog was compiled and each entry below last checked.

/**
 * The fully specified programs.
 *
 * Shape:
 *   id, institution, program, pathway, degree, years, state
 *   admissionProfileId   — the matching id in src/data/admissions/programProfiles.js,
 *                          so the calculator and this catalog never fork. null if none.
 *   status               — 'open' | 'closed'
 *   deadline   { month, day|null, precision:'exact'|'approx'|'window'|'rolling', round, note }
 *   supplemental { required, prompts[], note }
 *   test       { policy, satMin, actMin, sections[], basis, note }
 *   gpa        { min, scale:'weighted'|'unweighted', basis, note }
 *   interview  { required, format:'mmi'|'traditional-panel'|'group'|null, basis, note }
 *   casper     true|false|null
 *   acceptance { rate, basis, admitted, enrolled, note }
 *   citizenship 'us'|'us_or_pr'|null
 *   residency  { restricted, note }
 *   serviceHours { required, basis, note }
 *   cost       { usd, basis, note }
 *   url, verified, sources[]
 *   why        — prose: what makes this one different
 */
export const PROGRAMS = [
  // ── Combined BS/BA + MD ────────────────────────────────────────────────────
  {
    id: 'drexel-ba-bs-md',
    institution: 'Drexel University',
    program: 'BA/BS + MD Early Assurance Program',
    pathway: 'physician', degree: 'BA or BS + MD', years: 7, state: 'PA',
    admissionProfileId: 'drexel-ba-bs-md',
    status: 'open',
    deadline: { month: 11, day: 1, precision: 'exact', round: 'early_action', note: 'The program closes with the university’s early round, months before regular decision.' },
    supplemental: {
      required: true,
      prompts: [
        'Why medicine, and why an accelerated program rather than a traditional pre-med route?',
        'Describe your documented clinical, service and shadowing experience, with hours.',
      ],
      note: 'The supplement is where the 200-hour service requirement is actually evidenced. Start the log in ninth grade, not in the autumn of twelfth.',
    },
    test: {
      policy: 'required_no_self_report', satMin: 1420, actMin: 32, sections: [], basis: 'official',
      note: 'A hard minimum of 1420 SAT or 32 ACT. Drexel is test-optional for general admission; this program is NOT, and it does not accept self-reported scores. Below the minimum is not a weak application, it is not an application.',
    },
    gpa: { min: 3.5, scale: 'weighted', basis: 'official', note: 'Stated minimum weighted GPA. A minimum is a floor to clear, not a target to aim at — admitted students sit well above it.' },
    interview: { required: true, format: 'mmi', basis: 'official', note: 'Selected applicants are invited to a Multiple Mini Interview — a circuit of short stations with a different rater at each one.' },
    casper: null,
    acceptance: {
      rate: null, basis: 'official', admitted: 66, enrolled: 34,
      note: 'Drexel is one of the very few programs that discloses this cleanly: 66 admitted and 34 enrolled for fall 2026. Note that it publishes the ADMITTED and ENROLLED counts, not an acceptance rate — the applicant count is not published, so any percentage you see quoted for Drexel was made up by dividing by a guess.',
    },
    citizenship: 'us_or_pr',
    residency: { restricted: false, note: null },
    serviceHours: { required: 200, basis: 'official', note: '200+ hours of documented community service. "Documented" is the operative word: hours you cannot evidence with a supervisor and a date do not count.' },
    cost: { usd: null, basis: 'unpublished', note: 'No separate program fee published beyond the university’s own application fee.' },
    url: 'https://drexel.edu/medicine/education/programs/ba-bs-md/',
    verified: V,
    sources: [{ label: 'Drexel College of Medicine — BA/BS + MD', url: 'https://drexel.edu/medicine/education/programs/ba-bs-md/', retrieved: V }],
    why: 'The cleanest disclosure of any program on this list, and the clearest hard gates: a real test floor with no test-optional escape hatch, a real GPA floor, and a service-hours requirement with a number on it. The MCAT is still required to matriculate into the MD years — an accelerated seat is not an exemption from the MCAT.',
  },
  {
    id: 'psu-jefferson-pmm',
    institution: 'Penn State University · Sidney Kimmel Medical College (Thomas Jefferson University)',
    program: 'Accelerated Premedical–Medical Program',
    pathway: 'physician', degree: 'BS + MD', years: 7, state: 'PA',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: null, precision: 'approx', round: 'separate', note: 'The program has its own autumn deadline, separate from and earlier than Penn State’s general admission. Confirm the exact date on the program page — it moves.' },
    supplemental: { required: true, prompts: [], note: 'A program-specific application in addition to the university application. Prompts are not published outside the applicant portal.' },
    test: {
      policy: 'required', satMin: 1470, actMin: 32, sections: [], basis: 'official',
      // The one flag in this file that changes a student's whole testing plan.
      // See the 'test-single-sitting' gap row in src/lib/combinedDegree.js: a
      // student whose superscore clears 1470 but whose best single date does
      // not has been quoting themselves a number this program will not read.
      singleSitting: true,
      note: 'A minimum of 1470 SAT or 32 ACT, achieved IN A SINGLE SITTING — superscoring across dates does not satisfy this. Prior admitted students have averaged around 1570 SAT and 36 ACT, so the minimum and the realistic bar are very far apart.',
    },
    gpa: { min: null, scale: null, basis: 'unpublished', note: 'No published GPA minimum. Admitted students are typically at or near the top of their class.' },
    interview: { required: true, format: null, basis: 'official', note: 'Interviews are part of selection; the format is not published, so prepare for the harder case.' },
    // Rare enough to be worth a field: almost every selective application in
    // the country runs on letters, and a student who does not know this one
    // does not will spend weeks cultivating recommenders it will never read.
    recommendations: { used: false, basis: 'official', note: 'This program explicitly does not use letters of recommendation. Put that effort into the score and the essays instead — but note that the UNIVERSITY application may still want them, so check both.' },
    casper: null,
    acceptance: {
      rate: null, basis: 'official', admitted: null, enrolled: 25,
      note: 'Roughly twenty-five students enrol each year. That is a class size, not an acceptance rate, and it must not be turned into one.',
    },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'unpublished', note: 'No published hours requirement. Clinical exposure is expected in practice.' },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://science.psu.edu/premed/accelerated-premedical-medical',
    verified: V,
    sources: [{ label: 'Penn State Eberly College of Science — Accelerated Premedical–Medical Program', url: 'https://science.psu.edu/premed/accelerated-premedical-medical', retrieved: V }],
    why: 'Notable for two things students get wrong. The score minimum must be met in a single sitting, which changes your whole testing plan. And the program explicitly does NOT use letters of recommendation — so the effort a student would normally spend cultivating recommenders is better spent on the score and the essays here.',
  },
  {
    id: 'rochester-rems',
    institution: 'University of Rochester',
    program: 'Rochester Early Medical Scholars (REMS)',
    pathway: 'physician', degree: 'BA or BS + MD', years: 8, state: 'NY',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: 1, precision: 'approx', round: 'early_decision', note: 'REMS runs on the Early Decision timetable. Confirm the exact date — Rochester has moved it.' },
    supplemental: { required: true, prompts: [], note: 'A REMS-specific supplement on top of Rochester’s own writing. Prompts change year to year.' },
    test: { policy: 'optional', satMin: null, actMin: null, sections: [], basis: 'official', note: 'Rochester is test-optional. For a program this selective a strong score is still doing real work, but its absence is not a bar.' },
    gpa: {
      min: null, scale: 'unweighted', basis: 'official',
      note: 'No stated minimum. Rochester describes strong REMS candidates as typically holding around a 3.95 unweighted GPA and sitting in the top three percent of their class. That is a description of who gets in, not a cut-off — it is far more useful than a minimum, and far more brutal.',
    },
    interview: { required: true, format: 'traditional-panel', basis: 'official', note: 'REMS finalists interview with the School of Medicine and Dentistry.' },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Rochester does not publish a REMS acceptance rate. The class is very small; every percentage circulating for REMS is someone’s arithmetic on a guessed denominator.' },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://enrollment.rochester.edu/rems/',
    verified: V,
    sources: [{ label: 'University of Rochester — REMS', url: 'https://enrollment.rochester.edu/rems/', retrieved: V }],
    why: 'One of the few programs that tells you what a strong candidate actually looks like instead of only what the floor is. A 3.95 unweighted and a top-three-percent rank is not a minimum you clear — it is the middle of the admitted group, which is exactly the fact a student needs in tenth grade while course choices are still open.',
  },
  {
    id: 'rpi-amc-physician-scientist',
    institution: 'Rensselaer Polytechnic Institute · Albany Medical College',
    program: 'Physician-Scientist (B.S./M.D.) Program',
    pathway: 'physician', degree: 'BS + MD', years: 7, state: 'NY',
    admissionProfileId: 'rpi-amc-physician-scientist',
    status: 'open',
    deadline: { month: 11, day: null, precision: 'approx', round: 'early_decision', note: 'Runs on RPI’s early timetable. Confirm the exact date on the program page.' },
    supplemental: { required: true, prompts: [], note: 'A program-specific application in addition to RPI’s.' },
    test: {
      policy: 'required_no_self_report', satMin: null, actMin: null, sections: [], basis: 'official',
      note: 'A test score is required and the program explicitly does not permit test-optional applications or self-reported scores. No published numeric minimum — but there is no route in without an official score on file.',
    },
    gpa: { min: null, scale: null, basis: 'unpublished', note: null },
    interview: { required: true, format: null, basis: 'official', note: 'Interview with Albany Medical College as part of selection.' },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: 'us_or_pr',
    residency: { restricted: false, note: null },
    serviceHours: {
      required: null, basis: 'official',
      note: 'No hours requirement, but the program states that high-school research experience AND clinical experience are highly recommended. For a physician-scientist track, "highly recommended" is doing a great deal of work: research is the point of the program.',
    },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://www.amc.edu/academic/Admissions/physician_scientist.cfm',
    verified: V,
    sources: [{ label: 'Albany Medical College — Physician-Scientist Program', url: 'https://www.amc.edu/academic/Admissions/physician_scientist.cfm', retrieved: V }],
    why: 'Restricted to US citizens and permanent residents, and one of the clearest "no test-optional, no self-reported scores" statements of any program here. If you are building toward this one, high-school research is not decoration — it is the thing the program is selecting for.',
  },
  {
    id: 'umkc-ba-md',
    institution: 'University of Missouri–Kansas City',
    program: 'B.A./M.D. Six-Year Program',
    pathway: 'physician', degree: 'BA + MD', years: 6, state: 'MO',
    admissionProfileId: 'umkc-ba-md',
    status: 'open',
    deadline: { month: 11, day: null, precision: 'approx', round: 'separate', note: 'The School of Medicine sets its own autumn deadline, ahead of the university’s.' },
    supplemental: { required: true, prompts: [], note: 'A separate School of Medicine application with its own essays and recommendation requirements.' },
    recommendations: { used: true, basis: 'official', note: 'The School of Medicine application carries its own recommendation requirements, separate from the university\u2019s. Confirm how many and from whom on the program page \u2014 the count is not published outside the applicant portal.' },
    test: { policy: 'required', satMin: null, actMin: null, sections: ['ACT Science'], basis: 'official', note: 'A score is required, and the ACT Science section is treated as a distinct requirement rather than folded into the composite.' },
    gpa: { min: null, scale: null, basis: 'official', note: 'A published GPA floor applies — see the program page for this cycle’s number.' },
    interview: { required: true, format: 'traditional-panel', basis: 'official', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: 'us',
    residency: { restricted: true, note: 'Missouri residents are admitted in far greater numbers and on different terms; a non-resident seat is a much narrower door. Check the current in-state / out-of-state split before you build a year around this.' },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://med.umkc.edu/ba-md/',
    verified: V,
    sources: [{ label: 'UMKC School of Medicine — B.A./M.D.', url: 'https://med.umkc.edu/ba-md/', retrieved: V }],
    why: 'The oldest six-year program in the country and the shortest route from a high-school diploma to an MD. It is also a hard citizenship gate, which is a fact worth knowing in ninth grade rather than in twelfth.',
  },
  {
    id: 'vcu-gmed',
    institution: 'Virginia Commonwealth University',
    program: 'Guaranteed Admission Program for Medicine (GMED)',
    pathway: 'physician', degree: 'BS + MD', years: 8, state: 'VA',
    admissionProfileId: 'vcu-gmed',
    status: 'open',
    deadline: { month: 11, day: null, precision: 'approx', round: 'early_action', note: 'Applications close in the autumn of senior year, on the university’s early timetable.' },
    supplemental: { required: true, prompts: [], note: 'A separate GMED application in addition to VCU’s own.' },
    test: { policy: 'required', satMin: null, actMin: null, sections: [], basis: 'official', note: 'A score floor applies to the guaranteed-admission programs even where VCU is otherwise test-optional.' },
    gpa: { min: null, scale: null, basis: 'official', note: 'A published GPA floor applies — see the program page.' },
    interview: { required: true, format: null, basis: 'official', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: true, note: 'Strongly oriented to Virginia residents.' },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://honors.vcu.edu/academics/guaranteed-admission/medicine/',
    verified: V,
    sources: [{ label: 'VCU Honors College — Guaranteed Admission, Medicine', url: 'https://honors.vcu.edu/academics/guaranteed-admission/medicine/', retrieved: V }],
    why: 'Runs through the Honors College, so the honors application and the GMED application are one process with one autumn deadline. Virginia residency does most of the work here.',
  },
  {
    id: 'cuny-sophie-davis',
    institution: 'CUNY School of Medicine (City College of New York)',
    program: 'B.S./M.D. Program (Sophie Davis)',
    pathway: 'physician', degree: 'BS + MD', years: 7, state: 'NY',
    admissionProfileId: 'cuny-sophie-davis',
    status: 'open',
    deadline: { month: 12, day: null, precision: 'approx', round: 'separate', note: 'A separate School of Medicine deadline, distinct from CUNY’s general admission timetable.' },
    supplemental: { required: true, prompts: [], note: 'A dedicated application to the School of Medicine.' },
    test: { policy: 'optional', satMin: null, actMin: null, sections: [], basis: 'official', note: 'CUNY has been test-optional; confirm the program’s own stance for this cycle, which has not always matched the university’s.' },
    gpa: { min: null, scale: null, basis: 'official', note: 'A published academic-average floor applies.' },
    interview: { required: true, format: null, basis: 'official', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: true, note: 'New York City residency is a strong preference rather than an absolute bar. The program’s stated mission is physicians for underserved New York communities, and selection reflects that.' },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://www.ccny.cuny.edu/csom',
    verified: V,
    sources: [{ label: 'CUNY School of Medicine', url: 'https://www.ccny.cuny.edu/csom', retrieved: V }],
    why: 'A mission-driven program: it exists to produce physicians for underserved New York communities, and an application that does not speak to that mission is reading the program wrong however strong the numbers are.',
  },
  {
    id: 'uab-emsap',
    institution: 'University of Alabama at Birmingham',
    program: 'Early Medical School Acceptance Program (EMSAP)',
    pathway: 'physician', degree: 'BS + MD', years: 8, state: 'AL',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: null, precision: 'approx', round: 'separate', note: 'EMSAP closes on its own autumn date, earlier than UAB’s general admission.' },
    supplemental: { required: true, prompts: [], note: 'A separate EMSAP application with essays and recommendations.' },
    recommendations: { used: true, basis: 'official', note: 'The EMSAP application asks for recommendations in addition to its essays. The number and the required relationships are set in the program application itself \u2014 read it before you decide who to ask.' },
    test: { policy: 'required', satMin: null, actMin: null, sections: [], basis: 'official', note: 'A score is required for EMSAP. Confirm this cycle’s floor on the program page.' },
    gpa: { min: null, scale: null, basis: 'official', note: 'A published GPA floor applies.' },
    interview: { required: true, format: null, basis: 'official', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: false, note: 'Open to non-residents, though Alabama residents make up most of the class.' },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://www.uab.edu/medicine/home/education/emsap',
    verified: V,
    sources: [{ label: 'UAB Heersink School of Medicine — EMSAP', url: 'https://www.uab.edu/medicine/home/education/emsap', retrieved: V }],
    why: 'An eight-year program rather than an accelerated one, which means a normal undergraduate experience with the seat held — a genuinely different trade-off from the six-year programs, and usually the better one for a student who is not certain at seventeen.',
  },
  {
    id: 'uic-gppa-medicine',
    institution: 'University of Illinois Chicago',
    program: 'Guaranteed Professional Program Admissions (GPPA) — Medicine',
    pathway: 'physician', degree: 'BS + MD', years: 8, state: 'IL',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: null, precision: 'approx', round: 'separate', note: 'GPPA has its own deadline, earlier than UIC’s general admission.' },
    supplemental: { required: true, prompts: [], note: 'A separate GPPA application with its own essays.' },
    test: { policy: 'required', satMin: null, actMin: null, sections: [], basis: 'official', note: 'Confirm this cycle’s requirement — GPPA has historically required scores even when UIC was test-optional.' },
    gpa: { min: null, scale: null, basis: 'official', note: 'A published class-rank and GPA expectation applies.' },
    interview: { required: true, format: null, basis: 'official', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: true, note: 'Illinois residents are the large majority of the class.' },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://honors.uic.edu/future-students/gppa/',
    verified: V,
    sources: [{ label: 'UIC Honors College — GPPA', url: 'https://honors.uic.edu/future-students/gppa/', retrieved: V }],
    why: 'GPPA covers several professions, not only medicine — so a student who is genuinely torn between medicine, dentistry and pharmacy can look at one institution’s guaranteed tracks side by side rather than choosing blind.',
  },
  {
    id: 'stony-brook-scholars-for-medicine',
    institution: 'Stony Brook University',
    program: 'Scholars for Medicine',
    pathway: 'physician', degree: 'BS or BA + MD', years: 8, state: 'NY',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: null, precision: 'approx', round: 'separate', note: 'Entry runs through the Honors College / scholars programs, which close in the autumn.' },
    supplemental: { required: true, prompts: [], note: 'Applied for through Stony Brook’s honors programs application.' },
    test: { policy: 'optional', satMin: null, actMin: null, sections: [], basis: 'official', note: 'Confirm the current stance — SUNY test policy has changed repeatedly.' },
    gpa: { min: null, scale: null, basis: 'unpublished', note: null },
    interview: { required: true, format: null, basis: 'official', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: false, note: 'Open to non-residents; New York residents dominate the applicant pool.' },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://www.stonybrook.edu/honorsprograms/scholars-medicine/',
    verified: V,
    sources: [{ label: 'Stony Brook — Scholars for Medicine', url: 'https://www.stonybrook.edu/honorsprograms/scholars-medicine/', retrieved: V }],
    why: 'Entry is bundled into the honors-programs application rather than being a separate medical-school form, which means the deadline that matters is the honors one — and students routinely miss it while watching the general admission date.',
  },
  {
    id: 'neomed-bsmd',
    institution: 'Northeast Ohio Medical University (with Kent State, University of Akron and Youngstown State)',
    program: 'BS/MD Combined Program',
    pathway: 'physician', degree: 'BS + MD', years: 6, state: 'OH',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: null, precision: 'approx', round: 'separate', note: 'You apply to the partner undergraduate campus AND to NEOMED. Two applications, two deadlines.' },
    supplemental: { required: true, prompts: [], note: 'A NEOMED application in addition to the partner university’s.' },
    test: { policy: 'required', satMin: null, actMin: null, sections: [], basis: 'official', note: 'Confirm the current requirement and floor on the NEOMED page.' },
    gpa: { min: null, scale: null, basis: 'official', note: 'A published GPA and class-rank expectation applies.' },
    interview: { required: true, format: null, basis: 'official', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: true, note: 'Ohio residents are strongly favored.' },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://www.neomed.edu/admissions/bsmd/',
    verified: V,
    sources: [{ label: 'NEOMED — BS/MD', url: 'https://www.neomed.edu/admissions/bsmd/', retrieved: V }],
    why: 'The two-application structure is the trap. A student who applies only to Kent State and assumes the BS/MD is a checkbox on that form has not applied to the BS/MD at all.',
  },
  {
    id: 'bu-seven-year-bamd',
    institution: 'Boston University',
    program: 'Seven-Year Liberal Arts/Medical Education Program',
    pathway: 'physician', degree: 'BA + MD', years: 7, state: 'MA',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: 1, precision: 'approx', round: 'early_decision', note: 'Runs on BU’s Early Decision timetable. Confirm the exact date.' },
    supplemental: { required: true, prompts: [], note: 'A program-specific supplement on top of BU’s own writing requirements.' },
    test: { policy: 'required', satMin: null, actMin: null, sections: [], basis: 'official', note: 'The combined-degree program has historically required scores independently of BU’s general test policy. Confirm for this cycle.' },
    gpa: { min: null, scale: null, basis: 'unpublished', note: null },
    interview: { required: true, format: null, basis: 'official', note: 'Finalists interview with the Chobanian & Avedisian School of Medicine.' },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published. This is one of the most commonly mis-cited rates online.' },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://www.bu.edu/admissions/apply/first-year/seven-year-medical/',
    verified: V,
    sources: [{ label: 'Boston University — Seven-Year Medical Program', url: 'https://www.bu.edu/admissions/apply/first-year/seven-year-medical/', retrieved: V }],
    why: 'Binding Early Decision, which is a bigger commitment than most seventeen-year-olds realize: applying here means you cannot compare a financial aid offer against anywhere else.',
  },
  {
    id: 'case-ppsp-medicine',
    institution: 'Case Western Reserve University',
    program: 'Pre-Professional Scholars Program in Medicine',
    pathway: 'physician', degree: 'BA or BS + MD', years: 8, state: 'OH',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: 1, precision: 'approx', round: 'early_action', note: 'PPSP closes with Case’s early round. Confirm the exact date.' },
    supplemental: { required: true, prompts: [], note: 'A PPSP-specific supplement in addition to the Common App and Case’s own writing.' },
    test: { policy: 'optional', satMin: null, actMin: null, sections: [], basis: 'official', note: 'Confirm the program’s own stance for this cycle.' },
    gpa: { min: null, scale: null, basis: 'unpublished', note: null },
    interview: { required: true, format: null, basis: 'official', note: 'PPSP finalists interview with the School of Medicine.' },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://case.edu/admission/apply/pre-professional-scholars-program',
    verified: V,
    sources: [{ label: 'Case Western Reserve — Pre-Professional Scholars Program', url: 'https://case.edu/admission/apply/pre-professional-scholars-program', retrieved: V }],
    why: 'Case runs pre-professional scholars tracks in medicine, dentistry and law from the same application, and an unsuccessful PPSP application is still considered for regular admission — so the downside of applying is unusually small.',
  },
  {
    id: 'brown-plme',
    institution: 'Brown University',
    program: 'Program in Liberal Medical Education (PLME)',
    pathway: 'physician', degree: 'AB or ScB + MD', years: 8, state: 'RI',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 1, day: null, precision: 'approx', round: 'regular', note: 'PLME runs on Brown’s regular timetable (early applicants use Brown’s Early Decision date instead). Confirm the exact day — Brown has moved it.' },
    supplemental: {
      required: true,
      prompts: ['PLME-specific essays about your commitment to medicine and why an eight-year continuum rather than a conventional route.'],
      note: 'The PLME essays are additional to Brown’s own supplement, and they are the whole application: PLME is famous for reading them as an argument about why you specifically need eight uninterrupted years.',
    },
    test: { policy: 'required', satMin: null, actMin: null, sections: [], basis: 'official', note: 'Brown reinstated an SAT/ACT requirement. Confirm the current cycle’s policy before you plan around it.' },
    gpa: { min: null, scale: null, basis: 'unpublished', note: 'No minimum published. The admitted profile is extremely strong.' },
    interview: { required: null, format: null, basis: 'unpublished', note: 'Interviews are alumni-led and not guaranteed; PLME does not publish a distinct medical-school interview requirement.' },
    casper: null,
    acceptance: {
      rate: null, basis: 'unpublished', admitted: null, enrolled: null,
      note: 'Brown does not publish a PLME-specific acceptance rate. The class is roughly ninety students. Every "PLME acceptance rate" you have read was computed by someone dividing that class size by an applicant number they did not have.',
    },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://admission.brown.edu/explore/special-programs/plme',
    verified: V,
    sources: [{ label: 'Brown University Admission — PLME', url: 'https://admission.brown.edu/explore/special-programs/plme', retrieved: V }],
    why: 'The best-known program of its kind and the one most often held up as the model. It is also eight years with no acceleration — the value is the freedom to study anything as an undergraduate without a pre-med scramble, not speed.',
  },

  // ── Direct-admit BSN ───────────────────────────────────────────────────────
  {
    id: 'asu-bsn-prelicensure',
    institution: 'Arizona State University (Edson College)',
    program: 'Traditional Prelicensure BSN — direct admission',
    pathway: 'nursing', degree: 'BSN', years: 4, state: 'AZ',
    admissionProfileId: 'asu-bsn-prelicensure',
    status: 'open',
    deadline: { month: 2, day: null, precision: 'approx', round: 'priority', note: 'Direct-admission consideration follows the university’s priority timetable. Later applicants are considered for pre-nursing instead, which is a materially different outcome.' },
    supplemental: { required: false, prompts: [], note: 'No separate supplemental application; direct admission is decided from the university application and academic record.' },
    test: { policy: 'optional', satMin: null, actMin: null, sections: [], basis: 'official', note: 'ASU is test-optional; a score can still support a direct-admission decision.' },
    gpa: { min: null, scale: 'unweighted', basis: 'official', note: 'A published academic threshold applies for direct admission.' },
    interview: { required: false, format: null, basis: 'official', note: 'No interview.' },
    casper: false,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published at the direct-admission level.' },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://nursingandhealth.asu.edu/degree-programs/nursing',
    verified: V,
    sources: [{ label: 'ASU Edson College of Nursing', url: 'https://nursingandhealth.asu.edu/degree-programs/nursing', retrieved: V }],
    why: 'The thing to understand about direct-admit BSN generally: without it you are admitted to "pre-nursing" and must win a SECOND competitive application to the nursing major after two years, at a school where most pre-nursing students do not get in. Direct admission removes that cliff. Students almost never know the cliff exists.',
  },

  // ── Six-year PharmD ────────────────────────────────────────────────────────
  {
    id: 'onu-pharmd-0-6',
    institution: 'Ohio Northern University',
    program: 'Direct-Entry PharmD (0-6)',
    pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'OH',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 12, day: null, precision: 'approx', round: 'priority', note: 'Reviewed on a priority/rolling basis; earlier is materially better for a fixed cohort size.' },
    supplemental: { required: true, prompts: [], note: 'A pharmacy-program application in addition to the university application.' },
    test: { policy: 'optional', satMin: null, actMin: null, sections: [], basis: 'official', note: 'Confirm the current policy — 0-6 programs have moved on this repeatedly.' },
    gpa: { min: null, scale: null, basis: 'official', note: 'A published GPA and maths/science course expectation applies.' },
    interview: { required: true, format: 'traditional-panel', basis: 'official', note: 'Direct-entry pharmacy admission normally includes an interview day.' },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://www.onu.edu/academics/colleges/raabe-college-pharmacy',
    verified: V,
    sources: [{ label: 'Ohio Northern University — Raabe College of Pharmacy', url: 'https://www.onu.edu/academics/colleges/raabe-college-pharmacy', retrieved: V }],
    why: 'A 0-6 PharmD holds the professional seat from freshman year, so you never enter the separate PharmCAS cycle. The condition is a GPA you must MAINTAIN — the seat is held, not given, and progression requirements are where students lose it.',
  },

  // ── Seven-year dental ──────────────────────────────────────────────────────
  {
    id: 'umkc-six-year-dds',
    institution: 'University of Missouri–Kansas City',
    program: 'Six-Year B.A./D.D.S. Program',
    pathway: 'dentistry', degree: 'BA + DDS', years: 6, state: 'MO',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: null, precision: 'approx', round: 'separate', note: 'The School of Dentistry sets its own autumn deadline.' },
    supplemental: { required: true, prompts: [], note: 'A separate School of Dentistry application.' },
    test: { policy: 'required', satMin: null, actMin: null, sections: [], basis: 'official', note: 'A score is required. Confirm this cycle’s floor.' },
    gpa: { min: null, scale: null, basis: 'official', note: 'A published GPA floor applies.' },
    interview: { required: true, format: 'traditional-panel', basis: 'official', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: true, note: 'Missouri residency materially affects both admission and cost.' },
    serviceHours: { required: null, basis: 'unpublished', note: 'Dental shadowing is expected in practice even where no number is published — it is the evidence that you know what the job is.' },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://dentistry.umkc.edu/',
    verified: V,
    sources: [{ label: 'UMKC School of Dentistry', url: 'https://dentistry.umkc.edu/', retrieved: V }],
    why: 'Six years from high school to a DDS, and no DAT cycle to survive in between. The trade is that you commit to dentistry at seventeen, which is exactly why shadowing before you apply matters more here than anywhere else.',
  },
  {
    id: 'bu-seven-year-dental',
    institution: 'Boston University (Henry M. Goldman School of Dental Medicine)',
    program: 'Seven-Year Liberal Arts/Dental Medicine Program',
    pathway: 'dentistry', degree: 'BA + DMD', years: 7, state: 'MA',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: 1, precision: 'approx', round: 'early_decision', note: 'Runs on BU’s Early Decision timetable. Confirm the exact date.' },
    supplemental: { required: true, prompts: [], note: 'A program-specific supplement on top of BU’s own.' },
    test: { policy: 'required', satMin: null, actMin: null, sections: [], basis: 'official', note: 'Confirm the current requirement for the combined program specifically.' },
    gpa: { min: null, scale: null, basis: 'unpublished', note: null },
    interview: { required: true, format: null, basis: 'official', note: 'Finalists interview with the dental school.' },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'unpublished', note: null },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://www.bu.edu/admissions/apply/first-year/seven-year-dental/',
    verified: V,
    sources: [{ label: 'Boston University — Seven-Year Dental Program', url: 'https://www.bu.edu/admissions/apply/first-year/seven-year-dental/', retrieved: V }],
    why: 'Binding Early Decision. Same warning as BU’s medical program: you are giving up the ability to compare aid offers, at seventeen, for a profession you have committed to at seventeen.',
  },

  // ── Direct-entry PA ────────────────────────────────────────────────────────
  {
    id: 'drexel-bs-pa',
    institution: 'Drexel University',
    program: 'BS + MHS Physician Assistant (accelerated dual-degree)',
    pathway: 'physicianAssistant', degree: 'BS + MHS', years: 5, state: 'PA',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 11, day: 1, precision: 'approx', round: 'early_action', note: 'Closes with Drexel’s early round.' },
    supplemental: { required: true, prompts: [], note: 'A program-specific supplement; PA programs weigh direct patient-care exposure heavily.' },
    test: { policy: 'required', satMin: null, actMin: null, sections: [], basis: 'official', note: 'Confirm the current requirement — Drexel’s accelerated health programs have kept score requirements when the university did not.' },
    gpa: { min: null, scale: null, basis: 'official', note: 'A published GPA floor applies, and a higher GPA must be MAINTAINED through the undergraduate years to keep the graduate seat.' },
    interview: { required: true, format: null, basis: 'official', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'official', note: 'Direct patient-care hours are the currency of PA admissions. Even where no number is published for the direct-entry route, this is the experience to start accumulating in high school.' },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://drexel.edu/cnhp/academics/undergraduate/BS-Physician-Assistant/',
    verified: V,
    sources: [{ label: 'Drexel CNHP — BS/MHS Physician Assistant', url: 'https://drexel.edu/cnhp/academics/undergraduate/BS-Physician-Assistant/', retrieved: V }],
    why: 'Direct-entry PA is the least-known of these routes and arguably the highest-value: the open PA-school cycle is savage and demands thousands of patient-care hours from applicants who are already graduates. Holding the seat from freshman year skips that entirely.',
  },

  // ── Direct-entry PT / OT ───────────────────────────────────────────────────
  {
    id: 'ithaca-3-3-dpt',
    institution: 'Ithaca College',
    program: 'Freshman-entry Doctor of Physical Therapy (3+3)',
    pathway: 'physicalOccupTherapy', degree: 'BS + DPT', years: 6, state: 'NY',
    admissionProfileId: null,
    status: 'open',
    deadline: { month: 2, day: null, precision: 'approx', round: 'regular', note: 'Runs on the college’s regular timetable; earlier applications are stronger for a fixed cohort.' },
    supplemental: { required: false, prompts: [], note: 'Applied for as a major on the standard application rather than through a separate form.' },
    test: { policy: 'optional', satMin: null, actMin: null, sections: [], basis: 'official', note: null },
    gpa: { min: null, scale: null, basis: 'official', note: 'Progression to the doctoral years is conditional on maintaining a stated undergraduate GPA — that condition, not the admission, is what students actually fail.' },
    interview: { required: false, format: null, basis: 'unpublished', note: null },
    casper: null,
    acceptance: { rate: null, basis: 'unpublished', admitted: null, enrolled: null, note: 'Not published.' },
    citizenship: null,
    residency: { restricted: false, note: null },
    serviceHours: { required: null, basis: 'unpublished', note: 'Observation hours in a physical-therapy setting are expected by the profession and are worth logging from tenth grade.' },
    cost: { usd: null, basis: 'unpublished', note: null },
    url: 'https://www.ithaca.edu/academics/school-health-sciences-human-performance/physical-therapy-dpt',
    verified: V,
    sources: [{ label: 'Ithaca College — Physical Therapy (DPT)', url: 'https://www.ithaca.edu/academics/school-health-sciences-human-performance/physical-therapy-dpt', retrieved: V }],
    why: 'Six years to a doctorate with no separate PTCAS cycle. The risk profile is different from BS/MD: admission is easier, and the failure mode is a progression GPA you have to hold for three years while nobody is reminding you it exists.',
  },
];

export const PROGRAM_BY_ID = Object.fromEntries(PROGRAMS.map(p => [p.id, p]));

/**
 * Programs we know exist and can place, and NOTHING ELSE.
 *
 * A roster entry carries only what does not rot: the institution, the program's
 * name, the degree, the length and the state. It carries no deadline, no score
 * floor, no acceptance rate and no interview claim, because we have not read
 * those off the program's own page — and a requirement we half-know is worse
 * than one we do not claim at all. The verifier enforces exactly that.
 *
 * The point of the roster is DISCOVERY. A student in Ohio should learn that
 * NEOMED exists from us, and be sent to NEOMED, rather than learning it from a
 * consultancy blog with a made-up acceptance rate attached.
 */
export const ROSTER = [
  // Combined BS/BA + MD
  { id: 'r-baylor2', institution: 'Baylor University', program: 'Baylor2 Medical Track (Baylor College of Medicine)', pathway: 'physician', degree: 'BS/BA + MD', years: 8, state: 'TX' },
  { id: 'r-pitt-gap', institution: 'University of Pittsburgh', program: 'Guaranteed Admit Program (GAP) — Medicine', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'PA' },
  { id: 'r-temple-scholars', institution: 'Temple University', program: 'Pre-Medical Health Scholars Program', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'PA' },
  { id: 'r-lehigh-drexel', institution: 'Lehigh University', program: 'Accelerated Medical Program with Drexel', pathway: 'physician', degree: 'BS + MD', years: 7, state: 'PA' },
  { id: 'r-union-albany', institution: 'Union College', program: 'Leadership in Medicine (Albany Medical College)', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'NY' },
  { id: 'r-siena-albany', institution: 'Siena College', program: 'Siena–Albany Medical College Program', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'NY' },
  { id: 'r-hofstra-zucker', institution: 'Hofstra University', program: 'BS-BA/MD with the Zucker School of Medicine', pathway: 'physician', degree: 'BS or BA + MD', years: 8, state: 'NY' },
  { id: 'r-brooklyn-downstate', institution: 'Brooklyn College (CUNY)', program: 'BA-MD Program with SUNY Downstate', pathway: 'physician', degree: 'BA + MD', years: 8, state: 'NY' },
  { id: 'r-rutgers-njms', institution: 'Rutgers University–Newark', program: 'BA/MD with New Jersey Medical School', pathway: 'physician', degree: 'BA + MD', years: 7, state: 'NJ' },
  { id: 'r-tcnj-njms', institution: 'The College of New Jersey', program: 'Seven-Year Medical Program with Rutgers NJMS', pathway: 'physician', degree: 'BS + MD', years: 7, state: 'NJ' },
  { id: 'r-njit-njms', institution: 'New Jersey Institute of Technology', program: 'BS/MD with Rutgers NJMS', pathway: 'physician', degree: 'BS + MD', years: 7, state: 'NJ' },
  { id: 'r-drew-njms', institution: 'Drew University', program: 'Dual Degree Medical Program with Rutgers NJMS', pathway: 'physician', degree: 'BA + MD', years: 7, state: 'NJ' },
  { id: 'r-miami-hpme', institution: 'University of Miami', program: 'Medical Scholars Program', pathway: 'physician', degree: 'BS + MD', years: 7, state: 'FL' },
  { id: 'r-fsu-honors-med', institution: 'Florida State University', program: 'Honors Medical Scholars Program', pathway: 'physician', degree: 'BS + MD', years: 7, state: 'FL' },
  { id: 'r-nova-dual-md', institution: 'Nova Southeastern University', program: 'Dual Admission Medical Program', pathway: 'physician', degree: 'BS + DO/MD', years: 7, state: 'FL' },
  { id: 'r-slu-medical-scholars', institution: 'Saint Louis University', program: 'Medical Scholars Program', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'MO' },
  { id: 'r-cincinnati-connections', institution: 'University of Cincinnati', program: 'Connections Dual Admissions Program', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'OH' },
  { id: 'r-toledo-bacc2md', institution: 'University of Toledo', program: 'BACC2MD', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'OH' },
  { id: 'r-wayne-med-direct', institution: 'Wayne State University', program: 'Med-Direct', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'MI' },
  { id: 'r-unm-bamd', institution: 'University of New Mexico', program: 'BA/MD Degree Program', pathway: 'physician', degree: 'BA + MD', years: 8, state: 'NM' },
  { id: 'r-unr-bsmd', institution: 'University of Nevada, Reno', program: 'Accelerated BS/MD Program', pathway: 'physician', degree: 'BS + MD', years: 7, state: 'NV' },
  { id: 'r-ou-medical-humanities', institution: 'University of Oklahoma', program: 'Medical Humanities Scholars', pathway: 'physician', degree: 'BA + MD', years: 8, state: 'OK' },
  { id: 'r-ttu-umsi', institution: 'Texas Tech University', program: 'Undergraduate to Medical School Initiative (UMSI)', pathway: 'physician', degree: 'BS + MD', years: 7, state: 'TX' },
  { id: 'r-howard-bsmd', institution: 'Howard University', program: 'BS/MD Dual Degree Program', pathway: 'physician', degree: 'BS + MD', years: 6, state: 'DC' },
  { id: 'r-gwu-bamd', institution: 'The George Washington University', program: 'Seven-Year BA/MD Program', pathway: 'physician', degree: 'BA + MD', years: 7, state: 'DC' },
  { id: 'r-augusta-medical-scholars', institution: 'Augusta University', program: 'Medical Scholars Program', pathway: 'physician', degree: 'BS + MD', years: 7, state: 'GA' },
  { id: 'r-ecu-brody-scholars', institution: 'East Carolina University', program: 'Early Assurance to the Brody School of Medicine', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'NC' },
  { id: 'r-louisville-gems', institution: 'University of Louisville', program: 'Guaranteed Entrance to Medical School (GEMS)', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'KY' },
  { id: 'r-usc-bacc-md', institution: 'University of Southern California', program: 'Baccalaureate/MD Program', pathway: 'physician', degree: 'BS/BA + MD', years: 8, state: 'CA' },
  { id: 'r-indiana-state-rural', institution: 'Indiana State University', program: 'Rural Health Program with IU School of Medicine', pathway: 'physician', degree: 'BS + MD', years: 8, state: 'IN' },

  // Direct-admit BSN
  { id: 'r-nyu-meyers-bsn', institution: 'New York University (Rory Meyers)', program: 'Direct-Admit BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'NY' },
  { id: 'r-penn-nursing-bsn', institution: 'University of Pennsylvania', program: 'Direct-Entry BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'PA' },
  { id: 'r-villanova-bsn', institution: 'Villanova University (Fitzpatrick)', program: 'Direct-Admit BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'PA' },
  { id: 'r-bc-connell-bsn', institution: 'Boston College (Connell)', program: 'Direct-Admit BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'MA' },
  { id: 'r-georgetown-bsn', institution: 'Georgetown University', program: 'Direct-Entry BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'DC' },
  { id: 'r-pitt-bsn', institution: 'University of Pittsburgh', program: 'Direct-Admit BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'PA' },
  { id: 'r-marquette-bsn', institution: 'Marquette University', program: 'Direct-Entry BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'WI' },
  { id: 'r-duquesne-bsn', institution: 'Duquesne University', program: 'Direct-Entry BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'PA' },
  { id: 'r-creighton-bsn', institution: 'Creighton University', program: 'Direct-Entry BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'NE' },
  { id: 'r-case-bsn', institution: 'Case Western Reserve University (Bolton)', program: 'Direct-Admit BSN', pathway: 'nursing', degree: 'BSN', years: 4, state: 'OH' },

  // Six-year PharmD (0-6)
  { id: 'r-northeastern-pharmd', institution: 'Northeastern University', program: 'Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'MA' },
  { id: 'r-stjohns-pharmd', institution: "St. John's University", program: 'Six-Year Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'NY' },
  { id: 'r-mcphs-pharmd', institution: 'Massachusetts College of Pharmacy and Health Sciences', program: 'Accelerated Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'MA' },
  { id: 'r-uconn-pharmd', institution: 'University of Connecticut', program: 'Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'CT' },
  { id: 'r-uri-pharmd', institution: 'University of Rhode Island', program: 'Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'RI' },
  { id: 'r-duquesne-pharmd', institution: 'Duquesne University', program: 'Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'PA' },
  { id: 'r-findlay-pharmd', institution: 'University of Findlay', program: 'Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'OH' },
  { id: 'r-butler-pharmd', institution: 'Butler University', program: 'Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'IN' },
  { id: 'r-drake-pharmd', institution: 'Drake University', program: 'Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'IA' },
  { id: 'r-uhsp-pharmd', institution: 'University of Health Sciences and Pharmacy in St. Louis', program: 'Direct-Entry PharmD', pathway: 'pharmacy', degree: 'PharmD', years: 6, state: 'MO' },

  // Seven-year dental
  { id: 'r-case-bsdmd', institution: 'Case Western Reserve University', program: 'Pre-Professional Scholars Program in Dental Medicine', pathway: 'dentistry', degree: 'BA/BS + DMD', years: 8, state: 'OH' },
  { id: 'r-pacific-dugoni', institution: 'University of the Pacific (Arthur A. Dugoni)', program: 'Accelerated Pre-Dental / DDS Pathway', pathway: 'dentistry', degree: 'BS + DDS', years: 6, state: 'CA' },
  { id: 'r-detroit-mercy-dental', institution: 'University of Detroit Mercy', program: 'Direct-Entry Dental Program', pathway: 'dentistry', degree: 'BS + DDS', years: 7, state: 'MI' },
  { id: 'r-rutgers-dmd', institution: 'Rutgers University', program: 'Seven-Year BA/DMD Program', pathway: 'dentistry', degree: 'BA + DMD', years: 7, state: 'NJ' },
  { id: 'r-nyu-dental', institution: 'New York University', program: 'Seven-Year Combined BA/DDS', pathway: 'dentistry', degree: 'BA + DDS', years: 7, state: 'NY' },
  { id: 'r-buffalo-dental', institution: 'University at Buffalo', program: 'Combined BS/DDS Program', pathway: 'dentistry', degree: 'BS + DDS', years: 7, state: 'NY' },
  { id: 'r-nova-dental', institution: 'Nova Southeastern University', program: 'Dual Admission Dental Program', pathway: 'dentistry', degree: 'BS + DMD', years: 7, state: 'FL' },

  // Direct-entry PA
  { id: 'r-quinnipiac-pa', institution: 'Quinnipiac University', program: 'Entry-Level Master’s Physician Assistant (freshman entry)', pathway: 'physicianAssistant', degree: 'BS + MHS', years: 6, state: 'CT' },
  { id: 'r-duquesne-pa', institution: 'Duquesne University', program: 'Five-Year Physician Assistant Program', pathway: 'physicianAssistant', degree: 'BS + MPAS', years: 5, state: 'PA' },
  { id: 'r-seton-hill-pa', institution: 'Seton Hill University', program: 'Five-Year Physician Assistant Program', pathway: 'physicianAssistant', degree: 'BS + MS', years: 5, state: 'PA' },
  { id: 'r-kings-pa', institution: "King's College", program: 'Five-Year Physician Assistant Program', pathway: 'physicianAssistant', degree: 'BS + MS', years: 5, state: 'PA' },
  { id: 'r-gannon-pa', institution: 'Gannon University', program: 'Five-Year Physician Assistant Program', pathway: 'physicianAssistant', degree: 'BS + MPAS', years: 5, state: 'PA' },
  { id: 'r-marietta-pa', institution: 'Marietta College', program: 'Direct-Entry Physician Assistant Program', pathway: 'physicianAssistant', degree: 'BS + MPAS', years: 5, state: 'OH' },
  { id: 'r-lemoyne-pa', institution: 'Le Moyne College', program: 'Direct-Entry Physician Assistant Program', pathway: 'physicianAssistant', degree: 'BS + MS', years: 5, state: 'NY' },
  { id: 'r-wagner-pa', institution: 'Wagner College', program: 'Direct-Entry Physician Assistant Program', pathway: 'physicianAssistant', degree: 'BS + MS', years: 5, state: 'NY' },

  // Direct-entry PT / OT
  { id: 'r-northeastern-dpt', institution: 'Northeastern University', program: 'Direct-Entry Doctor of Physical Therapy', pathway: 'physicalOccupTherapy', degree: 'BS + DPT', years: 6, state: 'MA' },
  { id: 'r-sacred-heart-dpt', institution: 'Sacred Heart University', program: 'Freshman-Entry DPT (3+3)', pathway: 'physicalOccupTherapy', degree: 'BS + DPT', years: 6, state: 'CT' },
  { id: 'r-scranton-dpt', institution: 'University of Scranton', program: 'Direct-Entry Doctor of Physical Therapy', pathway: 'physicalOccupTherapy', degree: 'BS + DPT', years: 6, state: 'PA' },
  { id: 'r-springfield-dpt', institution: 'Springfield College', program: 'Freshman-Entry DPT', pathway: 'physicalOccupTherapy', degree: 'BS + DPT', years: 6, state: 'MA' },
  { id: 'r-misericordia-dpt', institution: 'Misericordia University', program: 'Direct-Entry Doctor of Physical Therapy', pathway: 'physicalOccupTherapy', degree: 'BS + DPT', years: 6, state: 'PA' },
  { id: 'r-bu-otd', institution: 'Boston University (Sargent)', program: 'Direct-Entry Occupational Therapy (BS/OTD)', pathway: 'physicalOccupTherapy', degree: 'BS + OTD', years: 6, state: 'MA' },
  { id: 'r-quinnipiac-ot', institution: 'Quinnipiac University', program: 'Entry-Level Master’s Occupational Therapy (freshman entry)', pathway: 'physicalOccupTherapy', degree: 'BS + MOT', years: 5, state: 'CT' },
  { id: 'r-ithaca-ot', institution: 'Ithaca College', program: 'Freshman-Entry Occupational Therapy (OTD)', pathway: 'physicalOccupTherapy', degree: 'BS + OTD', years: 6, state: 'NY' },
];

/**
 * Programs students WILL be told about that are not what they are told they are.
 *
 * This is the most useful list in the file, and the reason is boring: bad
 * information about a dead program outlives the program by years. A student who
 * finds nothing here concludes the app's catalog is incomplete and goes back to
 * the blog that told them wrong.
 *
 * Two failure kinds:
 *   'closed'      — the program was terminated. It is still recommended widely.
 *   'not_hs_entry'— the program is real and good, but you cannot apply to it
 *                   from high school. Listing it beside Brown PLME would be a
 *                   factual error, and a student who builds a senior year around
 *                   it loses that year.
 */
export const MISLISTED_PROGRAMS = [
  {
    id: 'northwestern-hpme',
    institution: 'Northwestern University',
    program: 'Honors Program in Medical Education (HPME)',
    kind: 'closed',
    headline: 'Closed. Terminated for all future cycles in 2020.',
    detail: 'HPME was for decades the most famous accelerated medical program in the country, and it is still recommended in guidebooks, forum posts and consultancy lists as though you could apply to it. You cannot. Northwestern ended admission to the program and it has not returned. There is no waitlist, no reduced version, and no route in.',
    instead: 'If HPME was your plan, the closest equivalents in shape are the eight-year programs where the seat is held but the undergraduate years are normal — Case Western’s Pre-Professional Scholars, Brown’s PLME, UAB’s EMSAP. Northwestern itself still has an excellent pre-medical route; it is simply a conventional one.',
    verified: V,
  },
  {
    id: 'texas-jamp',
    institution: 'Texas public universities (statewide)',
    program: 'Joint Admission Medical Program (JAMP)',
    kind: 'not_hs_entry',
    headline: 'Real, excellent, and NOT a high-school-entry program.',
    detail: 'JAMP is a need-based state program for students who are ALREADY ENROLLED at a participating Texas public university. You apply as an undergraduate, not as a high-school senior, and eligibility depends on financial need alongside academics. It is routinely listed next to Brown PLME and Drexel’s early assurance program in "BS/MD" roundups. That is a factual error, and acting on it costs a Texas student a senior year spent preparing an application that does not exist.',
    instead: 'If you are a Texas student aiming at JAMP, the high-school-era work is choosing a participating Texas public university and arriving with the GPA to qualify. Apply to JAMP in your first year there. Meanwhile, Baylor2 and Texas Tech’s UMSI are genuine high-school-entry Texas options.',
    verified: V,
  },
  {
    id: 'uf-jhmp',
    institution: 'University of Florida',
    program: 'Junior Honors Medical Program (JHMP)',
    kind: 'not_hs_entry',
    headline: 'Entered from inside UF, not from high school.',
    detail: 'JHMP admits students who are already undergraduates at the University of Florida, after their first years there. It appears on high-school BS/MD lists regularly because the name reads like one.',
    instead: 'The high-school move is getting into UF with a strong record. The JHMP application comes later, from inside.',
    verified: V,
  },
];

/** Every state that appears in the catalog or the roster, sorted, for the filter row. */
export const STATES = [...new Set([...PROGRAMS, ...ROSTER].map(p => p.state))].sort();
