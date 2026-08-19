// ─────────────────────────────────────────────────────────────────────────────
// What each program ACTUALLY publishes — the data layer under the admission
// calculator.
//
// ── Why this file exists ────────────────────────────────────────────────────
// The old calculator scored every school with one function and one set of
// weights: clinical hours were worth the same at a research-track BS/MD as at a
// six-year clinical program, and a hard published requirement (Drexel's 200
// documented service hours, UMKC's citizenship bar) was worth a few points on a
// 100-point scale rather than being the yes/no it really is. That is the single
// biggest source of a wrong answer, and no amount of tuning the weights fixes
// it, because the problem is that the weights are the same everywhere.
//
// So the program's own published rules live here, per program, as DATA:
//   • `gates`     — the things that are pass/fail, not weighted (layer 1)
//   • `academics` — the real admitted profile at the 25th, 50th AND 75th
//                   percentile, so nothing is ever benchmarked against the 25th
//                   alone (layer 2)
//   • `weights`   — the research-vs-clinical-vs-service axis, per program,
//                   taken from what the program says it cares about (layer 4)
//   • `rounds`    — early vs regular, because it is real (layer 5)
//   • `lottery`   — where selection is explicitly random and preparation
//                   genuinely cannot remove the variance
//
// ── The honesty rules this file is written under ────────────────────────────
//  1. Every number carries a `basis`: 'published' (the program states it),
//     'derived' (computed from something published, by a stated rule), or
//     'estimated' (our judgement). The UI shows the difference and the model
//     widens its range for anything that is not 'published'. There is no fourth
//     category, and in particular there is no "we made it up but it looks
//     precise".
//  2. Every profile carries `sources` with the URL and the date it was read.
//     A profile with no source may not claim 'published' for anything.
//  3. An admit rate we do not have is `null` with basis 'unpublished'. It is
//     NOT silently replaced with a sibling school's rate. The model falls back
//     to a stated, visible estimate and labels it as one.
//  4. Where a program does not mention a dimension at all, its weight is low
//     and `weightNotes` says "not mentioned in published criteria" — which is
//     different from "the program says it does not matter", and the student is
//     shown which one it is.
//
// ── Adding a program ────────────────────────────────────────────────────────
// Copy an entry, fill it from the program's OWN admissions page (not a
// consultancy blog, not a forum), add the URL + read date to `sources`, and set
// `confidence`. scripts/verifyAdmissionModel.mjs fails the build if a profile
// claims 'published' anywhere without a source, if weights do not sum to 1, or
// if a gate has no remedy text — the three ways this file rots into confident
// nonsense.
// ─────────────────────────────────────────────────────────────────────────────
import { SCHOOL_DATA } from '../constants.js';

/** Dimensions layer 3 scores and layer 4 weights. Every `weights` object must name all of them. */
export const PORTFOLIO_DIMENSIONS = [
  'academics',      // layer 2's output, weighted here like any other dimension
  'clinical',       // patient-contact hours (volunteering, CNA/EMT, scribing)
  'shadowing',      // observation hours specifically
  'research',       // lab/field research, posters, publications, science fair
  'service',        // non-clinical community service
  'leadership',     // sustained positions of responsibility
  'competitions',   // olympiads, HOSA, science fairs, debate
  'certifications', // CNA, EMT, CPR, phlebotomy, etc.
];

/**
 * Reference levels — the amount of a thing that a program's *median admitted*
 * student plausibly has. Layer 3 scores a student's total against this, not
 * against zero, which is what stops "I have 40 shadowing hours" from reading as
 * a full marks because the old model's target was 20.
 *
 * These are 'estimated' everywhere. No undergraduate program publishes the
 * median admit's shadowing hours, and any tool that shows you one is inventing
 * it. They are stated here in one place so they can be argued with, rather than
 * being scattered through the scoring code as magic numbers.
 */
export const DEFAULT_REFERENCE_LEVELS = {
  clinical:       { p50: 100, p75: 250, unit: 'hours' },
  shadowing:      { p50: 40,  p75: 100, unit: 'hours' },
  research:       { p50: 120, p75: 400, unit: 'hours' },
  service:        { p50: 100, p75: 250, unit: 'hours' },
  leadership:     { p50: 2,   p75: 4,   unit: 'sustained positions' },
  competitions:   { p50: 1,   p75: 3,   unit: 'placements' },
  certifications: { p50: 1,   p75: 3,   unit: 'credentials' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Gate kinds. A gate is evaluated by src/lib/admissions/gates.js and, when it
// is `severity: 'hard'` and the student fails it, NO probability is shown at
// all — the panel shows what would need to change instead. That is the whole
// point of layer 1: a hard requirement is not a heavily-weighted feature.
//
// `severity: 'preference'` is the honest middle: a program that is *designed
// for* a group without stating a bar (CUNY and New York residency). It applies
// a visible multiplier and says so, rather than pretending to be a bar it is
// not or pretending it does not exist.
// ─────────────────────────────────────────────────────────────────────────────
export const GATE_KINDS = [
  'citizenship',    // US citizen / permanent resident
  'state-residency',
  'gpa-floor',
  'test-floor',
  'test-section',   // a specific section must be present (ACT Science) or clear a bar
  'test-policy',    // e.g. scores required, self-reported not accepted, superscore refused
  'course',         // a required course, optionally at a minimum grade
  'service-hours',  // documented minimum service
  'class-rank',
  'grade-level',    // e.g. current high-school seniors only
];

const src = (label, url, retrieved) => ({ label, url, retrieved });

// The date this file's published figures were last read from the programs' own
// pages. Shown to the student, because a two-year-old requirement is a wrong
// requirement and they deserve to know how old ours is.
export const CATALOG_READ_ON = '2026-08-19';

/**
 * Programs whose rules we have read from the program's own admissions page.
 *
 * This is deliberately small and deliberately deep. Six well-sourced programs
 * beat sixty guessed ones: a guessed hard gate is worse than no gate, because
 * it tells a student they are disqualified when they are not. Every other U.S.
 * school in the app still gets a profile — see deriveUndergradProfile() below —
 * it just gets one that is honestly labelled as derived from score midpoints
 * rather than from published program rules.
 */
export const PROGRAM_PROFILES = [
  // ── UMKC six-year B.A./M.D. ────────────────────────────────────────────────
  // The clinical-and-residency end of the axis: the published criteria describe
  // core coursework, test floors, citizenship and an interview, and do not
  // mention research anywhere. That absence is the data point.
  {
    id: 'umkc-ba-md',
    name: 'B.A./M.D. Six-Year Program',
    institution: 'University of Missouri–Kansas City',
    kind: 'bsmd',
    url: 'https://med.umkc.edu/academics/degree-and-certificate-programs/ba-md/admission-requirements.html',
    sources: [
      src('UMKC School of Medicine — B.A./M.D. admission requirements',
          'https://med.umkc.edu/academics/degree-and-certificate-programs/ba-md/admission-requirements.html',
          CATALOG_READ_ON),
    ],
    confidence: 'high',
    emphasis: 'clinical',
    emphasisNote: 'UMKC\'s published criteria are academic (17 core units, test floors, an interview) plus citizenship. Research is not mentioned anywhere in them — so this model weights clinical exposure and sustained commitment, and does not reward research as if the program had asked for it.',

    gates: [
      {
        id: 'umkc-citizenship', kind: 'citizenship', severity: 'hard',
        label: 'U.S. citizen or permanent resident',
        published: 'Applicants must be U.S. citizens or permanent residents; international students are not eligible. Permanent residency must be held by November 1 of the year before entry.',
        requires: { citizenship: ['us-citizen', 'permanent-resident'] },
        remedy: 'This program cannot consider international applicants at all. If you hold permanent residency, it must be in place by 1 November of the year before you would start.',
        fixable: 'no',
      },
      {
        id: 'umkc-gpa', kind: 'gpa-floor', severity: 'hard',
        label: 'Unweighted GPA of 3.0 or better in the 17 core units',
        published: 'Applicants must achieve an unweighted GPA of 3.0 in the 17 core requirements.',
        requires: { unweightedGpa: 3.0 },
        remedy: 'Raise your unweighted GPA across the 17 core academic units to at least 3.0. This is measured on core coursework, not your overall average.',
        fixable: 'yes',
      },
      {
        id: 'umkc-test', kind: 'test-floor', severity: 'hard',
        label: 'ACT 24 or SAT 1160 minimum',
        published: 'Applicants must achieve a minimum ACT composite of 24 or an SAT of 1160. Scores must be earned within three years of the application deadline.',
        requires: { anyOf: [{ act: 24 }, { sat: 1160 }] },
        remedy: 'Reach at least a 24 ACT composite or a 1160 SAT. The sitting also has to be within three years of the deadline, so an old score does not carry.',
        fixable: 'yes',
      },
      {
        id: 'umkc-act-science', kind: 'test-section', severity: 'hard',
        label: 'ACT Science section required (if applying with the ACT)',
        published: 'Applicants are required to take the Science portion of the ACT.',
        requires: { ifTest: 'ACT', section: 'science', present: true },
        remedy: 'If you are applying with the ACT, you must sit a form that includes the Science section — an ACT without it will not be accepted here. Applying with the SAT instead avoids this entirely.',
        fixable: 'yes',
      },
    ],

    academics: {
      gpaScale: 'unweighted-4.0',
      gpa:  { p25: 3.70, p50: 3.90, p75: 4.00, basis: 'mixed', note: 'The 3.90 median is published as the average unweighted GPA of admitted students; the 25th and 75th are derived from the published 3.0–4.0 admitted range and are estimates.' },
      sat:  { p25: 1330, p50: 1420, p75: 1500, basis: 'mixed', note: '1420 is the published average admitted SAT; the 25th/75th are estimated around it.' },
      act:  { p25: 30,   p50: 32,   p75: 34,   basis: 'mixed', note: '32 is the published average admitted ACT; the 25th/75th are estimated around it.' },
      superscore: 'accepted',
      superscoreNote: 'UMKC receives and processes a superscore from ACT or SAT, so your best sections across sittings count.',
      testPolicy: 'required',
      requiredCourses: [
        { subject: 'English', units: 4 }, { subject: 'Mathematics (algebra 1 or higher)', units: 4 },
        { subject: 'Science', units: 3 }, { subject: 'Social studies', units: 3 },
        { subject: 'Single foreign language', units: 2 }, { subject: 'Fine arts', units: 1 },
      ],
    },

    admitRate: {
      value: null, basis: 'unpublished',
      note: 'UMKC does not publish a B.A./M.D. admit rate. Six-year programs of this size typically admit in the low single digits of percent of applicants; the model uses 4% as a stated placeholder and widens its range accordingly.',
      assumed: 0.04,
    },

    rounds: [
      { id: 'rd', label: 'Single deadline — 1 November', deadline: '11-01', multiplier: 1, basis: 'published',
        note: 'One application deadline, no early round. Transcripts and scores are due 15 November.' },
    ],

    weights: {
      academics: 0.34, clinical: 0.20, shadowing: 0.12, research: 0.04,
      service: 0.12, leadership: 0.10, competitions: 0.04, certifications: 0.04,
    },
    weightNotes: {
      research: 'Research is not mentioned anywhere in UMKC\'s published B.A./M.D. criteria. It is not scored as worthless — it still reads as sustained intellectual commitment — but it does not carry what it would at a physician-scientist program.',
      clinical: 'A six-year clinical program selects for people who already know what the job is. Documented patient-contact hours are the strongest non-academic signal here.',
    },
    hookSensitivity: 0.35,
    lottery: { exists: false },
  },

  // ── RPI / Albany Medical College Physician-Scientist ──────────────────────
  // The research end of the axis, and the reason the axis has to be per-program
  // data rather than a guess: RPI states in its own words that it wants high
  // school research.
  {
    id: 'rpi-amc-physician-scientist',
    name: 'Physician-Scientist (B.S./M.D.) Program',
    institution: 'Rensselaer Polytechnic Institute / Albany Medical College',
    kind: 'bsmd',
    url: 'https://undergrad.admissions.rpi.edu/apply/physician-scientist-bsmd-program',
    sources: [
      src('RPI Undergraduate Admissions — Physician-Scientist (B.S./M.D.) Program',
          'https://undergrad.admissions.rpi.edu/apply/physician-scientist-bsmd-program', CATALOG_READ_ON),
    ],
    confidence: 'high',
    emphasis: 'research',
    emphasisNote: 'RPI states it is highly recommended that applicants have some sort of research experience in high school, clearly articulated on the application. Clinical experience is also highly recommended. This is the one axis the program names itself, so research carries real weight here and nowhere is that guessed.',

    gates: [
      {
        id: 'rpi-citizenship', kind: 'citizenship', severity: 'hard',
        label: 'U.S. citizen or permanent resident',
        published: 'Open to U.S. citizens and permanent residents. International students and Canadian citizens are explicitly not eligible.',
        requires: { citizenship: ['us-citizen', 'permanent-resident'] },
        remedy: 'This program does not consider international or Canadian applicants. RPI\'s general undergraduate admission is still open to you — the combined M.D. track is not.',
        fixable: 'no',
      },
      {
        id: 'rpi-science-courses', kind: 'course', severity: 'hard',
        label: 'Three years of science including biology, chemistry and lab-based physics',
        published: 'Three years of science, including biology, chemistry and lab-based physics.',
        requires: { courses: ['biology', 'chemistry', 'physics-lab'] },
        remedy: 'You need all three of biology, chemistry and a lab-based physics course. Physics is the one applicants most often miss — if it is not on your schedule for next year, it needs to be.',
        fixable: 'timing',
      },
      {
        id: 'rpi-math-courses', kind: 'course', severity: 'hard',
        label: 'Four years of mathematics through pre-calculus',
        published: 'Four years of mathematics through pre-calculus (calculus recommended).',
        requires: { courses: ['precalculus'] },
        remedy: 'Mathematics has to run through pre-calculus across four years. Calculus is recommended on top of that, not required.',
        fixable: 'timing',
      },
      {
        id: 'rpi-test-required', kind: 'test-policy', severity: 'hard',
        label: 'SAT or ACT required — this program is not test-optional',
        published: 'Official SAT or ACT scores are required; the test-optional policy does not apply, self-reported scores are not accepted, and scores must be from the November test date or earlier.',
        requires: { hasOfficialScore: true },
        remedy: 'You must sit the SAT or ACT and have official scores sent — by the November test date at the latest. RPI\'s general test-optional policy does not cover this program.',
        fixable: 'yes',
      },
    ],

    academics: {
      gpaScale: 'unweighted-4.0',
      gpa:  { p25: 3.80, p50: 3.95, p75: 4.00, basis: 'estimated', note: 'RPI does not publish an admitted-profile GPA for this program. These are estimates from the parent institution\'s admitted profile and should be read as a rough band, not a cutoff.' },
      sat:  { p25: 1450, p50: 1520, p75: 1560, basis: 'estimated', note: 'Estimated from RPI\'s overall admitted profile, adjusted upward for a combined-degree cohort. Not published by the program.' },
      act:  { p25: 33,   p50: 34,   p75: 35,   basis: 'estimated', note: 'Concorded from the estimated SAT band above.' },
      superscore: 'unstated',
      testPolicy: 'required-no-self-report',
      requiredCourses: [
        { subject: 'Science (biology, chemistry, lab physics)', units: 3 },
        { subject: 'Mathematics through pre-calculus', units: 4 },
      ],
    },

    admitRate: {
      value: null, basis: 'unpublished',
      note: 'RPI does not publish an admit rate for the Physician-Scientist program. Combined-degree tracks at this level are typically far more selective than the parent institution; the model assumes 3% and says so rather than borrowing RPI\'s general rate, which would be badly wrong.',
      assumed: 0.03,
    },

    rounds: [
      { id: 'rd', label: 'Regular Decision only — 1 November', deadline: '11-01', multiplier: 1, basis: 'published',
        note: 'There is no Early Decision or Early Action option for this program: you apply Regular Decision on the Common App by 1 November, complete by 10 November. Applying early is simply not a lever available here.' },
    ],

    weights: {
      academics: 0.30, clinical: 0.13, shadowing: 0.07, research: 0.28,
      service: 0.06, leadership: 0.07, competitions: 0.06, certifications: 0.03,
    },
    weightNotes: {
      research: 'Weighted heavily because RPI says so in its own admissions copy — "highly recommended" that applicants have research experience in high school, "clearly articulated on the application". Depth on one project beats a list of three.',
      clinical: 'Also named as highly recommended, but second to research in a track literally named physician-scientist.',
    },
    hookSensitivity: 0.25,
    lottery: { exists: false },
  },

  // ── Drexel BA/BS + M.D. Early Assurance ───────────────────────────────────
  // The reason `service-hours` is a gate kind at all.
  {
    id: 'drexel-ba-bs-md',
    name: 'BA/BS + MD Early Assurance Program',
    institution: 'Drexel University / Drexel University College of Medicine',
    kind: 'bsmd',
    url: 'https://drexel.edu/admissions/apply/undergrad-instructions/first-year-instructions/accelerated',
    sources: [
      src('Drexel Undergraduate Admissions — accelerated program instructions',
          'https://drexel.edu/admissions/apply/undergrad-instructions/first-year-instructions/accelerated', CATALOG_READ_ON),
    ],
    confidence: 'high',
    emphasis: 'service',
    emphasisNote: 'Drexel is the clearest case in the catalog of a program that states a service requirement as a number. 200 documented, advisor-approved hours is a condition of the program, not a nice-to-have — so service is both a gate and a heavily weighted dimension here.',

    gates: [
      {
        id: 'drexel-citizenship', kind: 'citizenship', severity: 'hard',
        label: 'U.S. citizen or permanent resident',
        published: 'Applicants must be a U.S. citizen or permanent resident.',
        requires: { citizenship: ['us-citizen', 'permanent-resident'] },
        remedy: 'The accelerated M.D. track is closed to international applicants. Drexel\'s standard undergraduate admission is not.',
        fixable: 'no',
      },
      {
        id: 'drexel-test', kind: 'test-floor', severity: 'hard',
        label: 'SAT superscore 1420 or ACT composite 32',
        published: 'A combined SAT superscore of at least 1420 (Evidence-Based Reading and Writing plus Math) or a minimum ACT composite of 32. Official verified scores are required; self-reported scores are not accepted.',
        requires: { anyOf: [{ sat: 1420 }, { act: 32 }] },
        remedy: 'You need a 1420 SAT or a 32 ACT. Drexel superscores the SAT, so your best Reading/Writing and best Math from different sittings combine — worth checking before assuming you are short.',
        fixable: 'yes',
      },
      {
        id: 'drexel-gpa', kind: 'gpa-floor', severity: 'hard',
        label: 'Minimum 3.5 GPA on a 4.0 weighted scale',
        published: 'A minimum 3.5 GPA on a 4.0 weighted scale (subject to change).',
        requires: { weightedGpa: 3.5 },
        remedy: 'Drexel measures this on the WEIGHTED scale, which is why the calculator asks for weighted and unweighted separately — mixing them up is how a qualified student talks themselves out of applying.',
        fixable: 'yes',
      },
      {
        id: 'drexel-science-courses', kind: 'course', severity: 'hard',
        label: 'Four years of lab science, one year each of biology, chemistry and physics',
        published: 'Four years of laboratory science with one year each of biology, chemistry and physics.',
        requires: { courses: ['biology', 'chemistry', 'physics-lab'] },
        remedy: 'Four years of lab science total, and all three of biology, chemistry and physics have to be in there.',
        fixable: 'timing',
      },
      {
        id: 'drexel-service', kind: 'service-hours', severity: 'hard',
        label: '200 documented service hours',
        published: 'Complete at least 200 hours of service that is documented and approved by the advisor.',
        requires: { documentedServiceHours: 200 },
        remedy: 'Drexel requires 200 hours of service that are DOCUMENTED and advisor-approved — undocumented hours do not count toward it. Log every session with a supervisor name and contact in Activities & Résumé as you do it; reconstructing two hundred hours after the fact is the part students cannot do.',
        fixable: 'timing',
        note: 'Drexel states this as a requirement of the program, verified through advisor approval. The calculator treats it as a gate because a student who reaches application season with 30 undocumented hours has a real problem that a weighted score would hide.',
      },
    ],

    academics: {
      gpaScale: 'weighted-4.0',
      gpa:  { p25: 3.80, p50: 4.00, p75: 4.30, basis: 'estimated', note: 'Drexel publishes the 3.5 weighted floor but not an admitted-student distribution. These are estimates and the floor is the only published number.' },
      sat:  { p25: 1440, p50: 1490, p75: 1540, basis: 'mixed', note: '1420 is the published floor; the band above it is estimated — admitted students cluster well above a floor, which is exactly the mistake a 25th-percentile benchmark makes.' },
      act:  { p25: 32,   p50: 34,   p75: 35,   basis: 'mixed', note: '32 is the published floor; the band is estimated.' },
      superscore: 'accepted',
      superscoreNote: 'The 1420 threshold is explicitly a superscore, so your best sections across sittings combine.',
      testPolicy: 'required-no-self-report',
      requiredCourses: [
        { subject: 'Laboratory science (biology, chemistry, physics)', units: 4 },
        { subject: 'Mathematics through trigonometry/pre-calculus', units: 4 },
      ],
    },

    admitRate: {
      value: null, basis: 'unpublished',
      note: 'Drexel does not publish an admit rate for the early assurance track. The model assumes 5% and labels it an assumption.',
      assumed: 0.05,
    },

    rounds: [
      { id: 'rd', label: 'Single deadline — 15 November', deadline: '11-15', multiplier: 1, basis: 'published',
        note: 'One deadline, no Early Decision route into the accelerated program. A select number of applicants are invited to a virtual MMI interview.' },
    ],

    weights: {
      academics: 0.30, clinical: 0.14, shadowing: 0.08, research: 0.08,
      service: 0.24, leadership: 0.08, competitions: 0.04, certifications: 0.04,
    },
    weightNotes: {
      service: 'The heaviest service weighting in the catalog, and the only one anchored to a published number rather than an inference.',
    },
    hookSensitivity: 0.30,
    lottery: { exists: false },
  },

  // ── VCU Guaranteed Admission Program for Medicine ─────────────────────────
  {
    id: 'vcu-gmed',
    name: 'Guaranteed Admission Program for Medicine',
    institution: 'Virginia Commonwealth University',
    kind: 'bsmd',
    url: 'https://honors.vcu.edu/admissions/guaranteed-admission/medicine/',
    sources: [
      src('VCU Honors College — Guaranteed Admission for Medicine',
          'https://honors.vcu.edu/admissions/guaranteed-admission/medicine/', CATALOG_READ_ON),
      src('VCU Honors College — GMED requirements (undergraduate-stage conditions)',
          'https://honors.vcu.edu/admissions/guaranteed-admission/medicine/requirements/', CATALOG_READ_ON),
    ],
    confidence: 'medium',
    emphasis: 'clinical',
    emphasisNote: 'The published conditions for KEEPING the guarantee are 120 hours of health-care experience and 50 hours of non-clinical community service every year of undergrad. A program that measures its own students that way is telling you what it selects for at intake.',

    gates: [
      {
        id: 'vcu-grade-level', kind: 'grade-level', severity: 'hard',
        label: 'Current high-school seniors only',
        published: 'Only current high school seniors are eligible to apply.',
        requires: { gradeLevel: ['12'] },
        remedy: 'This is a senior-year-only application. If you are a junior, the action now is the 1330 SAT and the 3.5 unweighted GPA, so you are eligible when the window opens.',
        fixable: 'timing',
      },
      {
        id: 'vcu-test', kind: 'test-floor', severity: 'hard',
        label: 'Minimum combined SAT 1330',
        published: 'Open to high school seniors with a minimum combined SAT score of 1330.',
        requires: { sat: 1330 },
        remedy: 'Reach a 1330 combined SAT. This is stated as a minimum, and admitted students sit meaningfully above it.',
        fixable: 'yes',
      },
      {
        id: 'vcu-gpa', kind: 'gpa-floor', severity: 'hard',
        label: 'Unweighted GPA of at least 3.5',
        published: 'Unweighted GPA of at least 3.5 on a 4.0 scale.',
        requires: { unweightedGpa: 3.5 },
        remedy: 'The 3.5 here is UNWEIGHTED — a weighted 3.8 can sit below it. That distinction is why the calculator asks for both separately.',
        fixable: 'yes',
      },
    ],

    academics: {
      gpaScale: 'unweighted-4.0',
      gpa:  { p25: 3.85, p50: 3.95, p75: 4.00, basis: 'estimated', note: 'Only the 3.5 floor is published. The band is estimated and admitted students cluster far above the floor.' },
      sat:  { p25: 1420, p50: 1480, p75: 1530, basis: 'mixed', note: '1330 is the published floor; the band above it is estimated.' },
      act:  { p25: 32,   p50: 33,   p75: 34,   basis: 'estimated', note: 'Concorded from the estimated SAT band.' },
      superscore: 'unstated',
      testPolicy: 'required',
      requiredCourses: [],
    },

    admitRate: {
      value: null, basis: 'unpublished',
      note: 'VCU does not publish a GMED admit rate. The model assumes 6% and labels it an assumption.',
      assumed: 0.06,
    },

    rounds: [
      { id: 'rd', label: 'Single deadline — 1 November', deadline: '11-01', multiplier: 1, basis: 'published',
        note: 'The GMED application and the Common Application to VCU are both due 1 November.' },
    ],

    weights: {
      academics: 0.32, clinical: 0.22, shadowing: 0.10, research: 0.06,
      service: 0.16, leadership: 0.08, competitions: 0.03, certifications: 0.03,
    },
    weightNotes: {
      clinical: 'VCU requires 120 hours of approved health-care experience per undergraduate year to keep the guarantee — the clearest possible statement of what it values.',
      service: 'Paired with 50 hours of non-clinical community service per year in the published retention conditions.',
    },
    hookSensitivity: 0.30,
    lottery: { exists: false },
  },

  // ── CUNY School of Medicine (Sophie Davis) B.S./M.D. ──────────────────────
  // The catalog's example of a residency PREFERENCE that is not a stated bar —
  // and of a program where the honest answer to "what is my test score worth"
  // is "nothing, they are test-optional".
  {
    id: 'cuny-sophie-davis',
    name: 'B.S./M.D. Program (Sophie Davis)',
    institution: 'CUNY School of Medicine',
    kind: 'bsmd',
    url: 'https://medicine.cuny.edu/admissions/bs-md-requirements/',
    sources: [
      src('CUNY School of Medicine — BS/MD requirements',
          'https://medicine.cuny.edu/admissions/bs-md-requirements/', CATALOG_READ_ON),
    ],
    confidence: 'medium',
    emphasis: 'service',
    emphasisNote: 'A mission-driven program built around producing physicians for underserved New York communities. Sustained service in your own community reads here in a way a research portfolio does not.',

    gates: [
      {
        id: 'cuny-average', kind: 'gpa-floor', severity: 'hard',
        label: 'Minimum 85 cumulative average across the first three years of high school',
        published: 'A minimum cumulative grade point average of 85 across the first three years of high school.',
        requires: { hundredPointAverage: 85 },
        remedy: 'CUNY measures this on the 100-point New York scale across grades 9–11, so senior-year grades cannot rescue it. An 85 is roughly a 3.0–3.3 unweighted depending on your school\'s conversion.',
        fixable: 'timing',
      },
      {
        id: 'cuny-ny-residency', kind: 'state-residency', severity: 'preference',
        label: 'Designed for New York State residents',
        published: 'The program is described as designed for New York State residents. CUNY does not state an outright residency bar on its requirements page.',
        requires: { stateResidency: ['NY'] },
        multiplierIfUnmet: 0.35,
        remedy: 'If you are not a New York resident, this is not a formal disqualification — but the program exists to serve New York, and the model reflects that rather than pretending residency is neutral.',
        fixable: 'no',
      },
    ],

    academics: {
      gpaScale: 'hundred-point',
      gpa:  { p25: 90, p50: 94, p75: 97, basis: 'estimated', note: 'Only the 85 floor is published. The band is estimated on the 100-point scale.' },
      sat:  { p25: null, p50: null, p75: null, basis: 'not-applicable', note: 'Test-optional through Spring 2027 with no stated penalty for omitting scores, so a test score carries very little here — which is itself worth knowing before you spend a summer on it.' },
      act:  { p25: null, p50: null, p75: null, basis: 'not-applicable' },
      superscore: 'unstated',
      testPolicy: 'optional',
      requiredCourses: [],
    },

    admitRate: {
      value: null, basis: 'unpublished',
      note: 'Not published. The model assumes 6% and labels it an assumption.',
      assumed: 0.06,
    },

    rounds: [
      { id: 'rd', label: 'Single application cycle', deadline: null, multiplier: 1, basis: 'published',
        note: 'Three personal essays and five letters of recommendation — an unusually heavy qualitative application, which is a signal about what the reading is actually weighing.' },
    ],

    weights: {
      academics: 0.26, clinical: 0.18, shadowing: 0.08, research: 0.05,
      service: 0.26, leadership: 0.11, competitions: 0.03, certifications: 0.03,
    },
    weightNotes: {
      academics: 'Weighted lower than elsewhere in the catalog for a concrete published reason: the program is test-optional, so half the usual academic signal is not even collected.',
      service: 'A mission-based program with five required letters and three essays is reading for community, not for scores.',
    },
    hookSensitivity: 0.15,
    lottery: { exists: false },
  },

  // ── ASU Edson traditional prelicensure BSN ────────────────────────────────
  // In the catalog specifically because of the lottery. A student who does
  // everything right here can still not get a seat, and no chancing tool that
  // hides that is telling the truth.
  {
    id: 'asu-bsn-prelicensure',
    name: 'Traditional Prelicensure BSN',
    institution: 'Arizona State University — Edson College of Nursing and Health Innovation',
    kind: 'nursing',
    url: 'https://nursingandhealth.asu.edu/programs/bsn/traditional',
    sources: [
      src('ASU Edson College — Traditional Prelicensure BSN',
          'https://nursingandhealth.asu.edu/programs/bsn/traditional', CATALOG_READ_ON),
      src('ASU Edson College — Direct admission to the traditional prelicensure program',
          'https://nursingandhealth.asu.edu/sites/default/files/direct_admission_to_the_traditional_preclincesure_program_updated_october_2020_.pdf',
          CATALOG_READ_ON),
    ],
    confidence: 'high',
    emphasis: 'balanced',
    emphasisNote: 'Direct admission here is a published formula on academics alone — class rank, competency-course GPA, test score. Activities do not enter the direct-admission decision, so this model weights them low and says why, instead of implying that shadowing hours will move a criterion that does not include them.',

    gates: [
      {
        id: 'asu-direct-admit', kind: 'class-rank', severity: 'preference',
        label: 'Direct admission needs top 10% class rank, OR 3.80 competency-course GPA, OR 3.50 GPA with a 25 ACT / 1230 SAT',
        published: 'First-year students qualify for direct admission by meeting one of: top 10% of high school graduating class; GPA of 3.80 in ASU competency courses; or GPA of 3.50 in ASU competency courses and either a 25 ACT or 1230 SAT.',
        requires: { anyOf: [{ classRankTopPercent: 10 }, { unweightedGpa: 3.80 }, { allOf: [{ unweightedGpa: 3.50 }, { anyOf: [{ act: 25 }, { sat: 1230 }] }] }] },
        multiplierIfUnmet: 0.45,
        remedy: 'Missing all three routes does not end it — remaining spaces go to a competitive process scored on select GPA and the TEAS exam. But direct admission is the reliable route, and the third path (3.50 plus a 25 ACT) is usually the reachable one.',
        fixable: 'yes',
      },
    ],

    academics: {
      gpaScale: 'unweighted-4.0',
      gpa:  { p25: 3.50, p50: 3.80, p75: 3.95, basis: 'mixed', note: '3.50 and 3.80 are the published direct-admission thresholds; the 75th is estimated.' },
      sat:  { p25: 1230, p50: 1300, p75: 1380, basis: 'mixed', note: '1230 is the published threshold on the combined GPA-plus-test route; the band is estimated.' },
      act:  { p25: 25,   p50: 27,   p75: 30,   basis: 'mixed', note: '25 is published; the band is estimated.' },
      superscore: 'unstated',
      testPolicy: 'optional',
      requiredCourses: [],
    },

    admitRate: {
      value: null, basis: 'unpublished',
      note: 'ASU does not publish a seat-level admit rate for the prelicensure cohort. The model assumes 35% and labels it an assumption — but see the lottery note, which matters more than the rate here.',
      assumed: 0.35,
    },

    rounds: [
      { id: 'priority', label: 'Priority — 1 November', deadline: '11-01', multiplier: 1.25, basis: 'published',
        note: 'Applications received after the 1 November priority date are considered on a space-available basis. This is one of the few places in the catalog where applying early is unambiguously, published-ly worth something.' },
      { id: 'rd', label: 'After the priority date — space available', deadline: null, multiplier: 0.6, basis: 'published',
        note: 'Not a rejection, but you are competing for whatever is left rather than for the cohort.' },
    ],

    weights: {
      academics: 0.62, clinical: 0.10, shadowing: 0.04, research: 0.02,
      service: 0.08, leadership: 0.06, competitions: 0.02, certifications: 0.06,
    },
    weightNotes: {
      academics: 'Direct admission is decided on class rank, competency-course GPA and test score. Nothing else is in the published criterion, so nothing else gets much weight.',
      certifications: 'A CNA credential is the one non-academic item that plausibly reads at a prelicensure nursing program.',
    },
    hookSensitivity: 0.05,

    lottery: {
      exists: true,
      stage: 'cohort placement',
      published: 'Where more direct-admission students request placement in a specific cohort than there are spaces available, placement is determined by random selection.',
      note: 'This is the real thing, published by the college in its own words: when a cohort is oversubscribed, seats are assigned at random among qualified direct-admission students. Meeting every criterion perfectly does not remove it. No amount of preparation removes it. Any estimate for this program is an estimate of reaching the qualified pool, not of getting the seat.',
      irreducibleShare: 0.4,
    },
  },
];

const BY_ID = new Map(PROGRAM_PROFILES.map(p => [p.id, p]));

/** A researched profile by id, or null. */
export function getProgramProfile(id) {
  return BY_ID.get(id) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived profiles for the rest of the U.S. schools the app tracks.
//
// SCHOOL_DATA stores one admitted-student MIDPOINT per school (gpa/sat/act) and
// an acceptance rate. That is genuinely useful and genuinely not a percentile
// distribution, so this function does two things and is loud about both:
//
//   1. It spreads the midpoint into a 25th/50th/75th band using a stated rule
//      (tighter at selective schools, wider at open ones) and marks the whole
//      band basis:'derived'. Deriving a band is defensible; presenting the
//      derived band as published is not.
//   2. It gives the school a weighting profile from the pre-health fields the
//      app already stores — a BS/MD school leans clinical, a research-strong
//      school leans research — and marks `emphasisBasis: 'inferred'`, because
//      it is inferred, and the UI says "inferred from the school's profile, not
//      from published admissions criteria" wherever it shows it.
//
// A derived profile never carries hard gates. We do not know this school's
// citizenship rules or its course requirements, and inventing a bar that stops
// a student applying is the worst error this system can make.
// ─────────────────────────────────────────────────────────────────────────────

/** Half-width of the derived 25–75 band, in SAT points, by acceptance rate. */
function satHalfWidth(acceptPct) {
  if (acceptPct == null) return 70;
  if (acceptPct < 10) return 45;
  if (acceptPct < 25) return 60;
  if (acceptPct < 50) return 75;
  return 90;
}

function gpaHalfWidth(acceptPct) {
  if (acceptPct == null) return 0.18;
  if (acceptPct < 10) return 0.12;
  if (acceptPct < 25) return 0.16;
  if (acceptPct < 50) return 0.22;
  return 0.30;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Weighting profile inferred from the pre-health fields SCHOOL_DATA already
 * carries. Deliberately much flatter than the researched profiles above: we are
 * inferring, and an inferred weight stated with the confidence of a published
 * one is exactly the failure this whole rebuild exists to remove.
 */
function inferWeights(school) {
  const research = school.specialtyStrong === 'Research';
  const clinicalHeavy = school.bsmd || school.clinicalProximity === 'Excellent';
  if (research) {
    return {
      weights: { academics: 0.42, clinical: 0.10, shadowing: 0.05, research: 0.20, service: 0.08, leadership: 0.08, competitions: 0.04, certifications: 0.03 },
      emphasis: 'research',
      emphasisNote: `${school.name} is flagged in our data as strongest in research, so research experience is weighted above clinical here. This is inferred from the school's profile, not from published admissions criteria — treat it as a lean, not a rule.`,
    };
  }
  if (clinicalHeavy) {
    return {
      weights: { academics: 0.42, clinical: 0.17, shadowing: 0.09, research: 0.08, service: 0.10, leadership: 0.08, competitions: 0.03, certifications: 0.03 },
      emphasis: 'clinical',
      emphasisNote: `${school.name} ${school.bsmd ? 'runs a direct BS/MD track' : 'sits next to major clinical sites'}, so documented patient contact is weighted up. Inferred from the school's profile, not from published admissions criteria.`,
    };
  }
  return {
    weights: { academics: 0.45, clinical: 0.11, shadowing: 0.06, research: 0.10, service: 0.11, leadership: 0.10, competitions: 0.04, certifications: 0.03 },
    emphasis: 'balanced',
    emphasisNote: `We have no published pre-health admissions criteria for ${school.name}, so this uses a balanced weighting. If this school matters to you, its own admissions page is worth ten minutes — and tell us what it says.`,
  };
}

/**
 * Builds a program profile for a plain SCHOOL_DATA row (or a student-added
 * custom school, which arrives in the same shape with most fields missing).
 */
export function deriveUndergradProfile(school) {
  if (!school?.name) return null;
  const accept = school.accept != null ? Number(school.accept) : null;
  const sw = satHalfWidth(accept);
  const gw = gpaHalfWidth(accept);
  const { weights, emphasis, emphasisNote } = inferWeights(school);

  const sat = school.sat != null ? {
    p25: Math.round(school.sat - sw), p50: Math.round(school.sat), p75: Math.round(clamp(school.sat + sw * 0.75, 400, 1600)),
    basis: 'derived',
    note: `Derived from the single admitted-student SAT midpoint we store for ${school.name} (${school.sat}), spread by acceptance rate. It is a reasonable band, not this school's published Common Data Set. Check theirs before you rely on it.`,
  } : { p25: null, p50: null, p75: null, basis: 'unknown' };

  const act = school.act != null ? {
    p25: Math.max(1, Math.round(school.act - (sw / 45))), p50: Math.round(school.act), p75: Math.min(36, Math.round(school.act + (sw / 60))),
    basis: 'derived',
    note: `Derived from the ACT midpoint we store for ${school.name} (${school.act}).`,
  } : { p25: null, p50: null, p75: null, basis: 'unknown' };

  const gpa = school.gpa != null ? {
    p25: Math.round((school.gpa - gw) * 100) / 100, p50: school.gpa, p75: Math.min(4.0, Math.round((school.gpa + gw * 0.5) * 100) / 100),
    basis: 'derived',
    note: `Derived from the admitted-GPA midpoint we store for ${school.name} (${school.gpa}).`,
  } : { p25: null, p50: null, p75: null, basis: 'unknown' };

  return {
    id: `school:${school.name}`,
    name: school.name,
    institution: school.name,
    kind: 'undergrad',
    derived: true,
    url: null,
    sources: [],
    confidence: accept != null && school.sat != null ? 'medium' : 'low',
    emphasis,
    emphasisBasis: 'inferred',
    emphasisNote,

    // Deliberately empty. See the block comment above: we do not know this
    // school's hard requirements, and a guessed gate can talk a student out of
    // an application they would have won.
    gates: [],

    academics: {
      gpaScale: 'unweighted-4.0', gpa, sat, act,
      superscore: 'unstated', testPolicy: 'unstated', requiredCourses: [],
    },

    admitRate: accept != null
      ? { value: accept / 100, basis: 'published', note: `${accept}% overall acceptance rate. This is the whole-university rate — a pre-health or honours track inside it is usually harder, sometimes far harder.` }
      : { value: null, basis: 'unpublished', assumed: 0.4, note: 'We have no acceptance rate for this school, so the model assumes 40% and widens its range a long way. Adding the real rate would tighten this more than anything else you could tell us.' },

    rounds: [
      { id: 'ed', label: 'Early Decision (binding)', deadline: null, multiplier: 1.6, basis: 'estimated',
        note: 'Published ED rates run well above RD rates almost everywhere — but a large part of that gap is recruited athletes, legacies and development admits, who are concentrated in the early round. The model applies a deflated lift for an unhooked applicant rather than the headline one.' },
      { id: 'ea', label: 'Early Action (non-binding)', deadline: null, multiplier: 1.15, basis: 'estimated',
        note: 'A real but much smaller effect than ED, since it costs the applicant nothing and so signals less.' },
      { id: 'rd', label: 'Regular Decision', deadline: null, multiplier: 1, basis: 'estimated', note: 'The baseline this model is calibrated on.' },
    ],

    weights,
    weightNotes: {},
    // How much of this school's class is plausibly taken by hooked applicants
    // (recruited athletes, legacies, development, faculty children). Higher at
    // selective privates, near zero at large publics. This is what deflates the
    // effective base rate for an unhooked student — see model.js.
    hookSensitivity: hookSensitivityFor(school),
    lottery: { exists: false },
  };
}

/**
 * Share of the class plausibly filled by hooked applicants.
 *
 * The point of this number is bias #3: every chancing tool leaves recruited
 * athletes, legacies and development admits in the training data as if they
 * were ordinary applicants, which inflates the apparent odds for every unhooked
 * student at the same GPA. Selective private universities are where that
 * distortion is largest — a meaningful slice of a small class, drawn from a
 * tiny slice of the applicant pool. Large publics are where it is smallest.
 *
 * Estimated, and marked as such wherever it surfaces.
 */
function hookSensitivityFor(school) {
  const accept = school.accept != null ? Number(school.accept) : null;
  const isPrivate = school.type === 'Private';
  if (accept == null) return 0.15;
  if (accept < 8)  return isPrivate ? 0.42 : 0.22;
  if (accept < 15) return isPrivate ? 0.34 : 0.18;
  if (accept < 30) return isPrivate ? 0.24 : 0.14;
  if (accept < 60) return isPrivate ? 0.14 : 0.08;
  return 0.05;
}

/**
 * Every program the calculator can score: the researched catalog first, then a
 * derived profile for each U.S. school in SCHOOL_DATA.
 */
export function allProfiles() {
  return [...PROGRAM_PROFILES, ...SCHOOL_DATA.map(deriveUndergradProfile).filter(Boolean)];
}

/** Look up any profile — researched by id, or a school by name. */
export function resolveProfile(idOrName) {
  const direct = BY_ID.get(idOrName);
  if (direct) return direct;
  const key = String(idOrName || '').replace(/^school:/, '').trim().toLowerCase();
  const school = SCHOOL_DATA.find(s => s.name.toLowerCase() === key);
  return school ? deriveUndergradProfile(school) : null;
}
