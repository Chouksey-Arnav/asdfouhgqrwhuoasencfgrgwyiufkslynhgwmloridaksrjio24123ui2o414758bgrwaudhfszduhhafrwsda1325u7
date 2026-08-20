// ─────────────────────────────────────────────────────────────────────────────
// Opportunities — the structured layer.
//
// src/data/opportunities.js is a browsable reference library: ~220 real
// programs described in prose, deliberately without hard dates or links,
// because most of them vary by chapter, hospital or state and a hardcoded
// specific would rot or point at the wrong place.
//
// That is the right call for a local hospital volunteer program. It is the
// WRONG call for the twenty-odd national programs where the specifics are the
// whole point — where a student loses a year because they found out in April
// that the application closed in February, or spends a week on an application
// they were never eligible for. Those get this file: real fields, real dates,
// real eligibility, a link, and a date we last checked.
//
// ── The integrity rules ─────────────────────────────────────────────────────
//
//  1. Nothing here is invented. Every program is real, every URL is the
//     program's own, and every field is either known or absent. `null` means
//     "we do not know", never "no".
//  2. Dates are stored as a month/day that recurs each cycle, with an explicit
//     `precision`: 'exact' (published and stable), 'approx' (the same week
//     every year, the exact day moves), 'window' (a season, not a date),
//     'rolling' (no deadline), 'varies' (set locally). The UI NEVER renders an
//     approximate date as if it were exact, and every card carries the
//     "confirm on the official site" line plus `verified`.
//  3. `verified` is the day a human last checked the program's own page. It is
//     shown to the student. A stale date is information, not a bug to hide.
//  4. Cost is never guessed. `cost.usd` is present only where the program
//     publishes a number; otherwise the model carries the meaning and the note
//     carries the caveat.
//  5. Tiers are honest, including the tier that says a program is not worth
//     what it costs. A family about to spend $6,000 is owed that sentence.
//
// ── Why eligibility is a first-class field ──────────────────────────────────
// Age and citizenship are where students lose the most time. Most hospital
// shadowing and volunteering starts at 16 (some at 14). Most real research
// programs want 16+ AND rising junior/senior standing. A few — SIMR is the
// famous one — additionally require US citizenship or a green card. None of
// that belongs on the application page as a surprise; it belongs on the card,
// before the student spends any attention. See src/lib/opportunityEligibility.js.
//
// And when a student IS too young: never a dead end. `altUnder` is the
// sentence that says what they can do at fourteen instead.
// ─────────────────────────────────────────────────────────────────────────────

/** The three honesty tiers. Order is the order they render in. */
export const PROGRAM_TIERS = [
  {
    id: 'admissions_moving',
    label: 'Genuinely admissions-moving',
    colorKey: 'gold',
    blurb: 'National awards and programs that admissions readers recognise on sight. Almost all are free to enter, and almost all have deadlines months earlier than students expect.',
  },
  {
    id: 'accessible',
    label: 'Accessible and real',
    colorKey: 'green',
    blurb: 'Free or low-cost, open or lightly selective, and available in most places. This is where a portfolio is actually built — the tier above is what happens on top of it.',
  },
  {
    id: 'pay_to_play',
    label: 'Expensive, and worth knowing why',
    colorKey: 'rose',
    blurb: 'Open-enrollment summer programs that cost thousands of dollars. Listed because families are marketed to aggressively and deserve a straight answer: anyone who pays gets in, and admissions readers know that.',
  },
];
export const TIER_BY_ID = Object.fromEntries(PROGRAM_TIERS.map(t => [t.id, t]));

export const DEADLINE_PRECISIONS = ['exact', 'approx', 'window', 'rolling', 'varies'];
export const COST_MODELS = ['free', 'free_plus_stipend', 'entry_fee', 'course_fee', 'tuition', 'varies'];
export const CITIZENSHIP = { US: 'us', US_OR_PR: 'us_or_pr' };

/**
 * The structured programs. `id` matches src/data/opportunities.js where the
 * program is already in the browsable catalog, so the two never fork.
 *
 * Shape:
 *   id, name, org, type, tier, pathways[]
 *   deadline   { month, day|null, precision, note }   — recurs each cycle
 *   starts     { month, note }                        — when the thing runs
 *   minAge, minGrade, maxGrade                        — null = no stated limit
 *   citizenship                                       — CITIZENSHIP.* or null
 *   cost       { model, usd|null, note }
 *   feeWaiver  true|false|null                        — null = not published
 *   stipend    true|false|'need_based'|null
 *   location, remote, selectivity                     — 'elite'|'competitive'|'open'
 *   url, verified
 *   eligibility, why, altUnder                        — prose
 */
export const PROGRAMS = [
  // ── Tier 1: genuinely admissions-moving ────────────────────────────────────
  {
    id: 'regeneron-science-talent-search',
    name: 'Regeneron Science Talent Search',
    org: 'Society for Science',
    type: 'Competition', tier: 'admissions_moving',
    pathways: ['biomedResearch', 'physician', 'pharmacy'],
    deadline: { month: 11, day: null, precision: 'approx', note: 'Early-to-mid November, for the following spring' },
    starts: { month: 3, note: 'Finalists announced in January; finals week in Washington, DC in March' },
    minAge: null, minGrade: 12, maxGrade: 12,
    citizenship: null,
    cost: { model: 'free', usd: 0, note: 'No entry fee' },
    feeWaiver: null, stipend: false,
    location: 'National (application) · Washington, DC (finals)', remote: true,
    selectivity: 'elite',
    url: 'https://www.societyforscience.org/regeneron-sts/',
    verified: '2026-08-20',
    eligibility: 'US high school seniors (plus students at US-affiliated schools abroad) submitting an original individual research project.',
    why: 'The oldest and most recognised pre-college science competition in the country. Being named a scholar — not only a finalist — is a line an admissions reader knows.',
    altUnder: 'Not a senior yet? The project is the point, not the entry. Start the research now; you enter with it in twelfth grade. ISEF and JSHS take you from grade nine.',
  },
  {
    id: 'regeneron-isef',
    name: 'Regeneron International Science and Engineering Fair (ISEF)',
    org: 'Society for Science',
    type: 'Competition', tier: 'admissions_moving',
    pathways: ['biomedResearch', 'physician', 'pharmacy', 'publicHealth'],
    deadline: { month: 4, day: null, precision: 'window', note: 'You cannot apply directly. You qualify through an affiliated regional or state fair — those run from roughly January through mid-April, and each sets its own entry deadline months earlier.' },
    starts: { month: 5, note: 'ISEF week is in May' },
    minAge: null, minGrade: 9, maxGrade: 12,
    citizenship: null,
    cost: { model: 'varies', usd: null, note: 'ISEF itself charges students nothing; your affiliated fair may charge a small entry fee, and many waive it.' },
    feeWaiver: null, stipend: false,
    location: 'Affiliated fair (local) → ISEF (varies by year)', remote: false,
    selectivity: 'elite',
    url: 'https://www.societyforscience.org/isef/',
    verified: '2026-08-20',
    eligibility: 'Grades 9–12, through an ISEF-affiliated regional or state fair. Find your affiliated fair first — that, not ISEF, is the deadline that will catch you out.',
    why: 'The largest pre-college science competition in the world, and the one whose qualifying route students most often discover too late — the local fair closes long before ISEF happens.',
    altUnder: null,
  },
  {
    id: 'davidson-fellows',
    name: 'Davidson Fellows Scholarship',
    org: 'Davidson Institute',
    type: 'Scholarship', tier: 'admissions_moving',
    pathways: ['biomedResearch', 'physician'],
    deadline: { month: 2, day: null, precision: 'approx', note: 'Mid-February, for work you have already completed' },
    starts: { month: 9, note: 'Fellows announced in the summer, honoured in Washington, DC in the fall' },
    minAge: null, maxAge: 18, minGrade: null, maxGrade: 12,
    citizenship: 'us_or_pr',
    cost: { model: 'free', usd: 0, note: 'No application fee' },
    feeWaiver: null, stipend: false,
    location: 'National', remote: true,
    selectivity: 'elite',
    url: 'https://www.davidsongifted.org/gifted-programs/fellows-scholarship/',
    verified: '2026-08-20',
    eligibility: '18 or under, US citizen or permanent resident, submitting a significant piece of work in science, technology, mathematics, music, literature, philosophy or "outside the box".',
    why: '$10,000–$50,000 scholarships for work that is genuinely significant. Small cohorts, and the recognition travels.',
    altUnder: 'There is no minimum age — a strong middle schooler can and does win this. What it needs is a real body of work, which takes years, so start it now.',
  },
  {
    id: 'usa-biology-olympiad',
    name: 'USA Biology Olympiad (USABO)',
    org: 'Center for Excellence in Education',
    type: 'Competition', tier: 'admissions_moving',
    pathways: ['physician', 'biomedResearch', 'nursing', 'pharmacy'],
    deadline: { month: 11, day: null, precision: 'window', note: 'Your SCHOOL registers you — registration runs through the fall and closes before the Open Exam in early February. Ask your biology teacher in September; a student cannot register alone.' },
    starts: { month: 2, note: 'Open Exam in early February; Semifinal Exam follows in March' },
    minAge: null, minGrade: 9, maxGrade: 12,
    citizenship: null,
    cost: { model: 'entry_fee', usd: null, note: 'The school pays a registration fee to enter its students; many schools absorb it entirely. Ask before assuming it costs you anything.' },
    feeWaiver: null, stipend: false,
    location: 'Your school', remote: false,
    selectivity: 'competitive',
    url: 'https://www.usabo-trc.org/',
    verified: '2026-08-20',
    eligibility: 'Grades 9–12 at a registered school. The bottleneck is not you — it is whether a teacher registers the school in time.',
    why: 'The route to the US team for the International Biology Olympiad, and the most recognisable biology credential available to a high schooler. Semifinalist alone is a real line.',
    altUnder: 'Below grade nine, work the same material: Science Olympiad and the Brain Bee both start earlier and use the same anatomy and physiology.',
  },
  {
    id: 'research-science-institute',
    name: 'Research Science Institute (RSI)',
    org: 'Center for Excellence in Education, hosted at MIT',
    type: 'Research', tier: 'admissions_moving',
    pathways: ['biomedResearch', 'physician'],
    deadline: { month: 1, day: null, precision: 'approx', note: 'Mid-January for that summer' },
    starts: { month: 6, note: 'Six weeks, late June to early August' },
    minAge: null, minGrade: 11, maxGrade: 11,
    citizenship: null,
    cost: { model: 'free', usd: 0, note: 'Free, including housing and meals' },
    feeWaiver: null, stipend: false,
    location: 'MIT, Cambridge, MA', remote: false,
    selectivity: 'elite',
    url: 'https://www.cee.org/programs/research-science-institute',
    verified: '2026-08-20',
    eligibility: 'Rising seniors (apply in eleventh grade) with a strong STEM record; roughly 80 US students are selected each year from a very large pool.',
    why: 'Free, residential, and about as selective as anything a high schooler can apply to. Alumni lists read like faculty directories.',
    altUnder: 'Too early? The application is decided on coursework, scores and prior research — all things you build in ninth and tenth grade. A local university lab or a science fair project is the real preparation.',
  },
  {
    id: 'stanford-simr',
    name: 'Stanford Institutes of Medicine Summer Research Program (SIMR)',
    org: 'Stanford University School of Medicine',
    type: 'Research', tier: 'admissions_moving',
    pathways: ['physician', 'biomedResearch'],
    deadline: { month: 2, day: null, precision: 'approx', note: 'Late February for that summer — the 2026 deadline was 21 February' },
    starts: { month: 6, note: 'Eight weeks, roughly mid-June to early August' },
    minAge: 16, minGrade: 11, maxGrade: 12,
    citizenship: 'us_or_pr',
    cost: { model: 'free_plus_stipend', usd: 0, note: 'No tuition; participants receive a minimum stipend' },
    feeWaiver: null, stipend: true,
    location: 'Stanford, CA (in person)', remote: false,
    selectivity: 'elite',
    url: 'https://simr.stanford.edu/',
    verified: '2026-08-20',
    eligibility: 'Current juniors or seniors who are at least 16 by the start of the program, and US citizens or permanent residents. Housing is not provided — most participants commute.',
    why: 'A real eight-week wet-lab or clinical research placement at a medical school, paid, at sixteen. The single most-asked-about program on this list.',
    altUnder: 'At fourteen or fifteen, the equivalent is local: email three professors at the nearest university, volunteer at a hospital that takes fourteen-year-olds, and take the Brain Bee or Science Olympiad. Come back to SIMR the summer after you turn sixteen — put it in your Milestones now so you do not miss the February date.',
  },
  {
    id: 'nih-high-school-sip',
    name: 'NIH High School Summer Internship Program (SIP)',
    org: 'National Institutes of Health',
    type: 'Research', tier: 'admissions_moving',
    pathways: ['biomedResearch', 'physician', 'publicHealth'],
    deadline: { month: 2, day: null, precision: 'approx', note: 'Early February for that summer' },
    starts: { month: 6, note: 'At least eight weeks over the summer' },
    minAge: 17, minGrade: 11, maxGrade: 12,
    citizenship: 'us_or_pr',
    cost: { model: 'free_plus_stipend', usd: 0, note: 'Paid — NIH publishes a monthly stipend scale' },
    feeWaiver: null, stipend: true,
    location: 'Bethesda, MD and other NIH campuses', remote: false,
    selectivity: 'elite',
    url: 'https://www.training.nih.gov/research-training/hs/sip/',
    verified: '2026-08-20',
    eligibility: 'US citizens or permanent residents, 17 or older by the start of the internship, enrolled at least half-time in high school. Check the current age rule on the NIH page — it is the field most likely to move.',
    why: 'Paid research inside the federal biomedical research agency. The application asks for a CV and a statement, which most sixteen-year-olds have never written — that is the real work.',
    altUnder: 'Under 17? NIH runs shorter high-school outreach programs, and a university lab near you is the same experience with a smaller name on it.',
  },
  {
    id: 'junior-science-humanities-symposium',
    name: 'Junior Science and Humanities Symposium (JSHS)',
    org: 'National Science Teaching Association / US Department of Defense',
    type: 'Competition', tier: 'admissions_moving',
    pathways: ['biomedResearch', 'physician', 'publicHealth'],
    deadline: { month: 1, day: null, precision: 'varies', note: 'Each regional symposium sets its own deadline, typically December–February' },
    starts: { month: 3, note: 'Regional symposia in late winter; nationals in the spring' },
    minAge: null, minGrade: 9, maxGrade: 12,
    citizenship: null,
    cost: { model: 'free', usd: 0, note: 'Free to compete; regionals usually cover travel to nationals' },
    feeWaiver: null, stipend: false,
    location: 'Regional (by state/university host)', remote: false,
    selectivity: 'competitive',
    url: 'https://www.jshs.org/',
    verified: '2026-08-20',
    eligibility: 'Grades 9–12 presenting original STEM research at their regional symposium.',
    why: 'The most winnable of the national research competitions, because you compete regionally first and the field is smaller than ISEF. Scholarships attached.',
    altUnder: null,
  },
  {
    id: 'congressional-award',
    name: 'The Congressional Award',
    org: 'United States Congress',
    type: 'Academic', tier: 'admissions_moving',
    pathways: ['physician', 'nursing', 'publicHealth', 'healthAdmin'],
    deadline: { month: null, day: null, precision: 'rolling', note: 'Register any time; the medals are earned over months of logged hours' },
    starts: { month: null, note: 'Self-paced — you set goals and log hours until each level is met' },
    minAge: 13.5, minGrade: null, maxGrade: 12,
    citizenship: null,
    cost: { model: 'free', usd: 0, note: 'Free to register and to earn' },
    feeWaiver: null, stipend: false,
    location: 'Wherever you are', remote: true,
    selectivity: 'open',
    url: 'https://congressionalaward.org/',
    verified: '2026-08-20',
    eligibility: 'Ages 13½ to 23. Not selective — you earn it by logging voluntary public service, personal development, physical fitness and an expedition against goals you set.',
    why: 'The one national honour on this list that is earned rather than won, which makes it the one a fourteen-year-old can start today. The Gold Medal takes about two years, so starting early is the whole trick.',
    altUnder: null,
  },

  // ── Tier 2: accessible and real ────────────────────────────────────────────
  {
    id: 'hospital-junior-volunteer',
    name: 'Hospital Junior/Teen Volunteer Program',
    org: 'Most hospital systems (local)',
    type: 'Volunteering', tier: 'accessible',
    pathways: ['physician', 'nursing', 'physicianAssistant', 'publicHealth'],
    deadline: { month: null, day: null, precision: 'varies', note: 'Most hospitals run intake cycles for summer starting in the spring; some are rolling' },
    starts: { month: null, note: 'Usually a fixed weekly shift for a minimum number of months' },
    minAge: 14, minGrade: null, maxGrade: null,
    citizenship: null,
    cost: { model: 'free', usd: 0, note: 'Free, though many require a paid TB test or immunisation records' },
    feeWaiver: null, stipend: false,
    location: 'Your local hospital', remote: false,
    selectivity: 'open',
    url: null,
    verified: '2026-08-20',
    eligibility: 'Age minimums vary sharply by hospital: some take 14, many require 15 or 16, and a few require 18 for patient-facing roles. Call the volunteer services office and ask for the age minimum before you apply.',
    why: 'The single most common source of real, countable clinical hours for a high schooler, and the one that turns "I want to be a doctor" into something with dates and a supervisor on it.',
    altUnder: 'Under fourteen: Red Cross youth programs, a nursing-home activities volunteer role, and library or food-bank service all count as service hours and all start earlier.',
  },
  {
    id: 'hosa-future-health-professionals',
    name: 'HOSA-Future Health Professionals',
    org: 'HOSA, Inc.',
    type: 'Organization', tier: 'accessible',
    pathways: ['physician', 'nursing', 'physicianAssistant', 'pharmacy', 'dentistry', 'publicHealth', 'physicalOccupTherapy'],
    deadline: { month: 10, day: null, precision: 'window', note: 'Chapter membership usually closes in the fall; competitive-event registration follows, with regionals in winter and state in the spring' },
    starts: { month: 9, note: 'Runs across the school year' },
    minAge: null, minGrade: 9, maxGrade: 12,
    citizenship: null,
    cost: { model: 'entry_fee', usd: null, note: 'National plus state dues, typically in the tens of dollars; chapters often cover them' },
    feeWaiver: null, stipend: false,
    location: 'Your school chapter', remote: false,
    selectivity: 'open',
    url: 'https://hosa.org/competitive-events/',
    verified: '2026-08-20',
    eligibility: 'Any student at a school with a HOSA chapter — or any student willing to start one, which is a leadership line in itself.',
    why: 'The competitive events are the part that matters: a state or national placement in a health-science event is a specific, verifiable achievement rather than a membership.',
    altUnder: null,
  },
  {
    id: 'american-chemical-society-project-seed',
    name: 'Project SEED',
    org: 'American Chemical Society',
    type: 'Program', tier: 'accessible',
    pathways: ['pharmacy', 'biomedResearch', 'physician'],
    deadline: { month: 2, day: null, precision: 'varies', note: 'Set by your local ACS section, generally in late winter' },
    starts: { month: 6, note: '8–10 weeks over the summer' },
    minAge: 16, minGrade: 10, maxGrade: 12,
    citizenship: null,
    cost: { model: 'free_plus_stipend', usd: 0, note: 'Paid summer fellowship' },
    feeWaiver: null, stipend: true,
    location: 'A university or industry lab near you', remote: false,
    selectivity: 'competitive',
    url: 'https://www.acs.org/education/students/highschool/seed.html',
    verified: '2026-08-20',
    eligibility: 'Students from economically disadvantaged backgrounds, usually 16+ and rising juniors or seniors. Financial-need criteria are the point of the program, not a barrier to it.',
    why: 'Paid, mentored, real lab research explicitly built for students whose families cannot fund a summer. If cost is the binding constraint, start here.',
    altUnder: 'Under sixteen, ask the same local ACS section about outreach events and science-fair mentoring — the people are the same.',
  },
  {
    id: 'american-red-cross-certifications',
    name: 'American Red Cross CPR/First Aid/Lifeguard Certification',
    org: 'American Red Cross',
    type: 'Program', tier: 'accessible',
    pathways: ['nursing', 'physician', 'physicianAssistant'],
    deadline: { month: null, day: null, precision: 'rolling', note: 'Courses run year-round' },
    starts: { month: null, note: 'A weekend, typically' },
    minAge: 11, minGrade: null, maxGrade: null,
    citizenship: null,
    cost: { model: 'course_fee', usd: null, note: 'Usually $70–$150 depending on the course and location; some schools and fire departments run them free' },
    feeWaiver: null, stipend: false,
    location: 'Local', remote: false,
    selectivity: 'open',
    url: 'https://www.redcross.org/take-a-class',
    verified: '2026-08-20',
    eligibility: 'Age minimums vary by course — babysitting and basic first aid start around 11, lifeguarding at 15.',
    why: 'The cheapest real credential on this list, and a prerequisite for a surprising number of volunteer roles. Log it in Skills & Certs with its expiry date — these lapse.',
    altUnder: null,
  },
  {
    id: 'usa-brain-bee',
    name: 'USA Brain Bee',
    org: 'International Brain Bee',
    type: 'Competition', tier: 'accessible',
    pathways: ['physician', 'biomedResearch'],
    deadline: { month: 1, day: null, precision: 'varies', note: 'Set by your local or regional chapter, generally in the winter' },
    starts: { month: 2, note: 'Local competitions in late winter, nationals in the spring' },
    minAge: 13, minGrade: 9, maxGrade: 12,
    citizenship: null,
    cost: { model: 'free', usd: 0, note: 'Usually free at the local level' },
    feeWaiver: null, stipend: false,
    location: 'A local university host', remote: false,
    selectivity: 'competitive',
    url: 'https://www.thebrainbee.org/',
    verified: '2026-08-20',
    eligibility: 'High school students, through a local chapter competition. If there is no chapter near you, the Brain Bee organisation helps schools start one.',
    why: 'Studiable — the syllabus is a published neuroscience primer — which makes it one of the few competitions where effort converts directly into placement.',
    altUnder: null,
  },
  {
    id: 'nremt-emt-pathway',
    name: 'EMT-Basic Certification (dual-enrollment pathway)',
    org: 'National Registry of EMTs, via school or community-college courses',
    type: 'Program', tier: 'accessible',
    pathways: ['physician', 'nursing', 'physicianAssistant'],
    deadline: { month: null, day: null, precision: 'varies', note: 'Follows your district or college enrolment calendar' },
    starts: { month: 8, note: 'A semester or a summer, depending on the provider' },
    minAge: 16, minGrade: 11, maxGrade: 12,
    citizenship: null,
    cost: { model: 'course_fee', usd: null, note: 'Free through many school CTE pathways; several hundred to over a thousand dollars privately' },
    feeWaiver: null, stipend: false,
    location: 'Local', remote: false,
    selectivity: 'competitive',
    url: 'https://www.nremt.org/',
    verified: '2026-08-20',
    eligibility: 'State minimum ages vary — often 16 to start the course and 18 to certify. Check your own state before enrolling.',
    why: 'The most substantial clinical credential available before college, and the one that most reliably converts into paid, hands-on patient care.',
    altUnder: 'Under sixteen: CPR/BLS first, then a hospital volunteer role, then this.',
  },

  // ── Tier 3: expensive, and worth knowing why ───────────────────────────────
  //
  // These are real programs and this is not an accusation of fraud — students
  // do enjoy them and do learn things. The claim being made is narrower and
  // well-supported: they are open-enrollment, they cost thousands of dollars,
  // and an admissions reader cannot distinguish "was selected" from "could
  // pay", because there was no selection. A family deciding how to spend
  // $6,000 on a summer is owed that sentence before they spend it, not after.
  {
    id: 'congress-of-future-medical-leaders',
    name: 'Congress of Future Medical Leaders',
    org: 'National Academy of Future Physicians and Medical Scientists',
    type: 'Program', tier: 'pay_to_play',
    pathways: ['physician'],
    deadline: { month: null, day: null, precision: 'rolling', note: 'Enrolment is open until the event fills' },
    starts: { month: 6, note: 'A multi-day summer event' },
    minAge: 14, minGrade: 9, maxGrade: 12,
    citizenship: null,
    cost: { model: 'tuition', usd: 1000, note: 'Roughly $1,000 plus travel, as published in recent years — confirm the current figure' },
    feeWaiver: null, stipend: false,
    location: 'Varies (large convention venue)', remote: false,
    selectivity: 'open',
    url: 'https://www.futuredocs.com/',
    verified: '2026-08-20',
    eligibility: 'Arrives as a "nomination" letter, often addressed to students who never applied for anything. Open enrollment: anyone who pays attends, and there is no competitive selection to be named in.',
    why: 'Listed here so you can recognise the letter. If you want the speakers, the talks are inspiring; if you want something an application reader will weigh, a hundred logged shadowing hours costs nothing and says more.',
    altUnder: null,
  },
  {
    id: 'nslc-medicine',
    name: 'NSLC Medicine & Health Care',
    org: 'National Student Leadership Conference',
    type: 'Program', tier: 'pay_to_play',
    pathways: ['physician', 'nursing'],
    deadline: { month: null, day: null, precision: 'rolling', note: 'Rolling enrolment until sessions fill' },
    starts: { month: 6, note: '9–12 day summer sessions on university campuses' },
    minAge: 14, minGrade: 9, maxGrade: 12,
    citizenship: null,
    cost: { model: 'tuition', usd: 3995, note: 'Around $4,000 in recent years, plus travel — confirm the current figure' },
    feeWaiver: null, stipend: false,
    location: 'Host university campuses', remote: false,
    selectivity: 'open',
    url: 'https://www.nslcleaders.org/',
    verified: '2026-08-20',
    eligibility: 'Open enrolment. Being "invited" is marketing, not selection.',
    why: 'Genuinely fun, genuinely instructive, and genuinely not a selective credential. If the money is available and nothing free is being displaced, it is a good experience — just log it as an experience rather than an honor.',
    altUnder: null,
  },
  {
    id: 'university-precollege-summer',
    name: 'Brand-name university pre-college summer programs',
    org: 'Various universities (Brown, Georgetown, Harvard Secondary School Program and others)',
    type: 'Program', tier: 'pay_to_play',
    pathways: ['physician', 'biomedResearch', 'nursing', 'publicHealth'],
    deadline: { month: 3, day: null, precision: 'varies', note: 'Typically rolling from winter until sessions fill' },
    starts: { month: 6, note: 'Two to seven weeks over the summer' },
    minAge: 15, minGrade: 10, maxGrade: 12,
    citizenship: null,
    cost: { model: 'tuition', usd: null, note: 'Commonly $5,000–$15,000 with housing; some offer real need-based aid, which changes the calculation — ask' },
    feeWaiver: null, stipend: false,
    location: 'Host campus', remote: false,
    selectivity: 'open',
    url: null,
    verified: '2026-08-20',
    eligibility: 'Admission is usually by application-and-payment rather than by competitive selection. The exceptions exist and are worth finding — a few of these carry real financial aid and real selection, and they say so plainly.',
    why: 'Open enrollment — anyone who pays attends — so it is not a selective credential. Attending a university\'s summer program is not attending the university, and admissions offices are explicit that it confers no advantage in their own process. Ask two questions before paying: what is the acceptance rate, and is there need-based aid? If the answers are "we accept everyone" and "no", the money buys a summer, not a credential.',
    altUnder: null,
  },
];

export const PROGRAM_BY_ID = Object.fromEntries(PROGRAMS.map(p => [p.id, p]));

// ─────────────────────────────────────────────────────────────────────────────
// HOSA competitive events, organised the way HOSA organises them.
//
// A HOSA chapter member's question is never "what is HOSA" — it is "which event
// do I enter". The categories below are HOSA's own; the event lineup is
// reviewed each year, so hosa.org's Competitive Event Guidelines are the
// authority and this list is a map, not a rulebook. Students track which ones
// they have qualified for (see the Opportunities tab), which is what makes a
// state placement land in the portfolio instead of in a group chat.
// ─────────────────────────────────────────────────────────────────────────────
export const HOSA_CATEGORIES = [
  { id: 'health_science', label: 'Health Science', colorKey: 'blue', blurb: 'Knowledge tests and applied-knowledge events — the ones you study for.' },
  { id: 'health_professions', label: 'Health Professions', colorKey: 'pink', blurb: 'Skills events judged the way the profession judges them.' },
  { id: 'emergency_preparedness', label: 'Emergency Preparedness', colorKey: 'rose', blurb: 'Response skills, under time pressure, usually hands-on.' },
  { id: 'leadership', label: 'Leadership', colorKey: 'violet', blurb: 'Speaking, writing, interviewing — the transferable half.' },
  { id: 'teamwork', label: 'Teamwork', colorKey: 'teal', blurb: 'Team events. The lowest-friction way into competing.' },
  { id: 'recognition', label: 'Recognition', colorKey: 'gold', blurb: 'Earned by sustained service or chapter work rather than by placing at an event.' },
];

export const HOSA_EVENTS = [
  // Health Science
  { id: 'hosa-behavioral-health', cat: 'health_science', name: 'Behavioral Health', team: false },
  { id: 'hosa-cultural-diversities', cat: 'health_science', name: 'Cultural Diversities and Disparities in Health Care', team: false },
  { id: 'hosa-dental-terminology', cat: 'health_science', name: 'Dental Terminology', team: false },
  { id: 'hosa-human-growth', cat: 'health_science', name: 'Human Growth and Development', team: false },
  { id: 'hosa-medical-law-ethics', cat: 'health_science', name: 'Medical Law and Ethics', team: false },
  { id: 'hosa-medical-math', cat: 'health_science', name: 'Medical Math', team: false },
  { id: 'hosa-medical-reading', cat: 'health_science', name: 'Medical Reading', team: false },
  { id: 'hosa-medical-spelling', cat: 'health_science', name: 'Medical Spelling', team: false },
  { id: 'hosa-medical-terminology', cat: 'health_science', name: 'Medical Terminology', team: false },
  { id: 'hosa-nutrition', cat: 'health_science', name: 'Nutrition', team: false },
  { id: 'hosa-pharmacology', cat: 'health_science', name: 'Pharmacology', team: false },
  // Health Professions
  { id: 'hosa-biomedical-lab-science', cat: 'health_professions', name: 'Biomedical Laboratory Science', team: false },
  { id: 'hosa-clinical-nursing', cat: 'health_professions', name: 'Clinical Nursing', team: false },
  { id: 'hosa-clinical-specialty', cat: 'health_professions', name: 'Clinical Specialty', team: false },
  { id: 'hosa-dental-science', cat: 'health_professions', name: 'Dental Science', team: false },
  { id: 'hosa-home-health-aide', cat: 'health_professions', name: 'Home Health Aide', team: false },
  { id: 'hosa-nursing-assisting', cat: 'health_professions', name: 'Nursing Assisting', team: false },
  { id: 'hosa-personal-care', cat: 'health_professions', name: 'Personal Care', team: false },
  { id: 'hosa-physical-therapy', cat: 'health_professions', name: 'Physical Therapy', team: false },
  { id: 'hosa-sports-medicine', cat: 'health_professions', name: 'Sports Medicine', team: false },
  { id: 'hosa-veterinary-science', cat: 'health_professions', name: 'Veterinary Science', team: false },
  { id: 'hosa-pharmacy-science', cat: 'health_professions', name: 'Pharmacy Science', team: false },
  // Emergency Preparedness
  { id: 'hosa-cert-skills', cat: 'emergency_preparedness', name: 'CERT Skills', team: true },
  { id: 'hosa-cpr-first-aid', cat: 'emergency_preparedness', name: 'CPR/First Aid', team: true },
  { id: 'hosa-emt', cat: 'emergency_preparedness', name: 'Emergency Medical Technician', team: true },
  { id: 'hosa-epidemiology', cat: 'emergency_preparedness', name: 'Epidemiology', team: false },
  { id: 'hosa-life-support-skills', cat: 'emergency_preparedness', name: 'Life Support Skills', team: false },
  { id: 'hosa-mrc-partnership', cat: 'emergency_preparedness', name: 'MRC Partnership', team: true },
  { id: 'hosa-public-health', cat: 'emergency_preparedness', name: 'Public Health', team: true },
  // Leadership
  { id: 'hosa-extemporaneous-health-poster', cat: 'leadership', name: 'Extemporaneous Health Poster', team: false },
  { id: 'hosa-extemporaneous-writing', cat: 'leadership', name: 'Extemporaneous Writing', team: false },
  { id: 'hosa-healthy-lifestyle', cat: 'leadership', name: 'Healthy Lifestyle', team: false },
  { id: 'hosa-interviewing-skills', cat: 'leadership', name: 'Interviewing Skills', team: false },
  { id: 'hosa-job-seeking-skills', cat: 'leadership', name: 'Job Seeking Skills', team: false },
  { id: 'hosa-prepared-speaking', cat: 'leadership', name: 'Prepared Speaking', team: false },
  { id: 'hosa-researched-persuasive', cat: 'leadership', name: 'Researched Persuasive Writing and Speaking', team: false },
  { id: 'hosa-speaking-skills', cat: 'leadership', name: 'Speaking Skills', team: false },
  // Teamwork
  { id: 'hosa-biomedical-debate', cat: 'teamwork', name: 'Biomedical Debate', team: true },
  { id: 'hosa-community-awareness', cat: 'teamwork', name: 'Community Awareness', team: true },
  { id: 'hosa-creative-problem-solving', cat: 'teamwork', name: 'Creative Problem Solving', team: true },
  { id: 'hosa-forensic-science', cat: 'teamwork', name: 'Forensic Science', team: true },
  { id: 'hosa-health-career-display', cat: 'teamwork', name: 'Health Career Display', team: true },
  { id: 'hosa-hosa-bowl', cat: 'teamwork', name: 'HOSA Bowl', team: true },
  { id: 'hosa-medical-innovation', cat: 'teamwork', name: 'Medical Innovation', team: true },
  { id: 'hosa-parliamentary-procedure', cat: 'teamwork', name: 'Parliamentary Procedure', team: true },
  { id: 'hosa-public-service-announcement', cat: 'teamwork', name: 'Public Service Announcement', team: true },
  // Recognition
  { id: 'hosa-barbara-james', cat: 'recognition', name: 'Barbara James Service Award', team: false },
  { id: 'hosa-happenings', cat: 'recognition', name: 'HOSA Happenings', team: true },
  { id: 'hosa-healthcare-issues-exam', cat: 'recognition', name: 'Healthcare Issues Exam', team: false },
  { id: 'hosa-national-service-project', cat: 'recognition', name: 'National Service Project', team: true },
  { id: 'hosa-outstanding-chapter', cat: 'recognition', name: 'Outstanding HOSA Chapter', team: true },
];

export const HOSA_EVENTS_BY_CAT = HOSA_CATEGORIES.map(c => ({
  ...c, events: HOSA_EVENTS.filter(e => e.cat === c.id),
}));

/** Where the HOSA event list itself is authoritative — shown next to the list. */
export const HOSA_GUIDELINES_URL = 'https://hosa.org/competitive-events/';
export const HOSA_VERIFIED = '2026-08-20';

/** The levels a student can have reached in a HOSA event, in order. */
export const HOSA_LEVELS = [
  { id: 'interested', label: 'Interested', colorKey: 't3' },
  { id: 'competing', label: 'Competing', colorKey: 'blue' },
  { id: 'regional', label: 'Qualified — regional', colorKey: 'teal' },
  { id: 'state', label: 'Qualified — state', colorKey: 'violet' },
  { id: 'national', label: 'Qualified — national', colorKey: 'gold' },
];
