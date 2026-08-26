// ─────────────────────────────────────────────────────────────────────────────
// Health-career scholarships, filtered to what a high school senior can
// actually apply for.
//
// ── Why this is a separate file from src/data/scholarships.js ───────────────
// The general database is 90-odd well-established awards a strong student of
// any intended major can win. A handful are health-career specific.
// That is not a gap in the curation — it reflects the real landscape, in which
// nearly every profession-specific award (nursing associations, dental
// foundations, pharmacy societies, the AMA Foundation) requires you to be
// ENROLLED in the professional program already. A pre-health high schooler who
// searches "nursing scholarships" finds a hundred results and is eligible for
// almost none of them, which teaches them the wrong lesson: that there is
// nothing for them.
//
// There is something for them. It is just not where they are looking.
//
// So this file does two things the general database cannot:
//
//   1. NAMED AWARDS a senior can genuinely enter now, each with its eligibility
//      stated honestly including the "accepted to a program" condition that
//      trips seniors up.
//
//   2. DISCOVERY ENTRIES — `kind: 'discovery'` — which are not awards at all
//      but a documented place to look. The hospital-auxiliary entry is the
//      single highest-yield health scholarship for a graduating senior in the
//      country and no national database lists it, because it is four thousand
//      separate local awards. Telling a student "search this, in this way, by
//      this date" is worth more than another national award with a 0.4% rate.
//      A discovery entry never states an amount or a deadline, because it does
//      not have one, and the UI renders it visibly differently.
//
//   3. NOT-YET entries — `openTo: ['undergrad']` — the profession-specific
//      awards that open the moment they matriculate. A senior should know these
//      are coming and should NOT spend October on them.
//
// ── The honesty rules ───────────────────────────────────────────────────────
// The same rules as src/data/scholarships.js: amounts and deadlines are stated
// as typical ranges and seasons, never as this year's figures, because those
// move annually and a confident wrong deadline costs a student the award. Every
// named entry carries the program's own URL. Nothing here is a claim that a
// student will win anything.
// ─────────────────────────────────────────────────────────────────────────────

export const HEALTH_SCHOLARSHIP_READ_ON = '2026-08-26';

/** Which stage of life an entry is actually open to. */
export const OPEN_TO = {
  senior: { label: 'Open to high school seniors', order: 0, color: 'green' },
  'hs-any': { label: 'Open to any high schooler', order: 1, color: 'blue' },
  undergrad: { label: 'Once you\'re enrolled — not yet', order: 2, color: 'amber' },
};

export const HEALTH_SCHOLARSHIPS = [
  // ── Named awards a senior can enter now ──────────────────────────────────
  {
    id: 'hc-hosa',
    kind: 'named',
    name: 'HOSA–Future Health Professionals Scholarships',
    org: 'HOSA and its state chapters',
    openTo: ['hs-any', 'senior'],
    pathways: ['md', 'pa', 'rn', 'pharmd', 'dds'],
    amount: 'Typically $1,000–$2,500 nationally; state chapter awards vary widely and are often less competitive',
    deadline: 'National applications typically open in the winter and close in the spring, ahead of the International Leadership Conference',
    eligibility: 'Current HOSA members in good standing pursuing a health-science career. Membership runs through your school\'s chapter, so joining is the prerequisite — and joining as a freshman rather than a senior is what makes the application competitive.',
    why: 'The most directly health-career-specific award a high schooler can win, and the state-level ones are genuinely winnable — far fewer applicants than any national program in the general database.',
    url: 'https://hosa.org/scholarships/',
    alsoInGeneralDatabase: 'hosa-scholarships',
  },
  // ── Corrected 2026-08-26, and left in place rather than deleted ───────────
  // This entry used to say a graduating high school senior holding an
  // acceptance could apply. That was true for years and is no longer true: the
  // program's current eligibility is graduate students, or college seniors
  // enrolling in a medical, nursing or pharmacy graduate program the following
  // year, with at least one year of study remaining.
  //
  // Deleting it would have been the wrong fix. Tylenol is one of the most
  // searched health scholarships there is, a student who has heard of it WILL
  // look for it here, and finding nothing teaches them the database is
  // incomplete rather than that they are not eligible. So it stays, marked
  // 'undergrad', saying plainly that this door is further down the road — which
  // is the same job the FNSNA and NHSC entries below already do.
  {
    id: 'hc-tylenol-future-care',
    kind: 'named',
    name: 'Tylenol Future Care Scholarship',
    org: 'Kenvue / Tylenol',
    openTo: ['undergrad'],
    pathways: ['md', 'pa', 'rn', 'pharmd', 'dds'],
    amount: 'Recently 10 awards of $10,000 and 25 of $5,000, around $350,000 in total each year',
    deadline: 'Recently closing in mid-July — one of the latest deadlines in the health-scholarship year',
    eligibility: 'NOT open to high school students. You must be a graduate student, or a college senior who will be enrolled in a graduate program in medicine, nursing or pharmacy the following academic year, with proof of enrollment and at least one year of study remaining. Residents of the 50 states, D.C. or Puerto Rico.',
    why: 'One of the largest and best-known health-career awards in the country — and it is listed here precisely so you do not spend an evening on it now. Put it in your calendar for the spring you apply to a health graduate program; the mid-July deadline means it is still open long after everything else has closed.',
    url: 'https://www.tylenol.com/tylenol-future-care-scholarship',
  },
  {
    id: 'hc-amt',
    kind: 'named',
    name: 'AMT Student Scholarship',
    org: 'American Medical Technologists',
    openTo: ['senior'],
    pathways: ['rn', 'pa'],
    amount: 'Typically around $1,000',
    deadline: 'Annual cycle, historically closing in the spring',
    eligibility: 'Students pursuing study in one of the allied health fields AMT certifies — medical technology, medical assisting, phlebotomy, dental assisting and related. High school seniors entering such a program are eligible.',
    why: 'Small, specific, and almost nobody applies. If you are heading toward an allied-health credential (and many pre-nursing students take one on the way), the odds here are unlike anything national.',
    url: 'https://americanmedtech.org/Get-Involved/Scholarships',
  },
  {
    id: 'hc-nfaa-nursing-note',
    kind: 'named',
    name: 'State nursing association student scholarships',
    org: 'Your state nurses association or its foundation',
    openTo: ['senior'],
    pathways: ['rn'],
    amount: 'Commonly $500–$5,000',
    deadline: 'Set by each state association, most commonly late winter through spring',
    eligibility: 'Most state nurses associations run a scholarship fund; many accept graduating high school seniors who have been accepted into a nursing program in that state. Eligibility genuinely varies state to state — some are open to entering students, some are not.',
    why: 'A state-level pool is a few dozen applicants rather than a few thousand. Search "[your state] nurses association foundation scholarship" and read the eligibility line before writing anything.',
    url: 'https://www.nursingworld.org/ana/about-ana/constituent-and-state-nurses-associations/',
  },

  // ── Discovery entries: where the money actually is ───────────────────────
  {
    id: 'hc-hospital-auxiliary',
    kind: 'discovery',
    name: 'Your local hospital\'s auxiliary or volunteer services scholarship',
    org: 'Community hospitals, almost everywhere',
    openTo: ['senior'],
    pathways: ['md', 'pa', 'rn', 'pharmd', 'dds'],
    eligibility: 'Typically a graduating senior heading into a health career, very often with a requirement or strong preference for students who have volunteered at that hospital. Some are open to any local student; many are effectively reserved for their own volunteers.',
    howToFind: 'Call or email the volunteer services office at the hospital where you volunteer or shadow and ask, in these words: "Does the auxiliary or the foundation offer a scholarship for graduating seniors, and when is the deadline?" Do this in the autumn — most close between January and April and are advertised on a noticeboard inside the hospital and nowhere else.',
    why: 'This is the single highest-yield health-career scholarship in the country for a graduating senior, and there is no national database of it because it is thousands of separate local awards. The applicant pool is often single digits. If you have logged volunteer hours at a hospital, you are already the candidate they are looking for — and your hours log is the evidence.',
    linkTo: 'clinical',
  },
  {
    id: 'hc-state-medical-society',
    kind: 'discovery',
    name: 'State medical, dental and pharmacy society auxiliaries',
    org: 'State professional societies and their alliances/auxiliaries',
    openTo: ['senior'],
    pathways: ['md', 'dds', 'pharmd', 'pa'],
    eligibility: 'Varies. Many state medical society alliances and dental society foundations fund graduating seniors entering health careers from that state, sometimes restricted to children of members and sometimes not.',
    howToFind: 'Search "[your state] medical society alliance scholarship", "[your state] dental association foundation scholarship" and "[your state] pharmacists association scholarship". Check the county-level chapter too — county awards are smaller and far less contested than state ones.',
    why: 'These bodies exist to build their own profession\'s pipeline in their own state, which is exactly what you are. They are also the least-searched scholarships in this whole app.',
  },
  {
    id: 'hc-employer-health-system',
    kind: 'discovery',
    name: 'Health-system employee and dependent scholarships',
    org: 'Large hospital systems, as employers',
    openTo: ['senior'],
    pathways: ['md', 'pa', 'rn', 'pharmd', 'dds'],
    eligibility: 'If a parent or guardian works anywhere in a hospital system — including in food service, transport, administration or environmental services, not only clinically — that system very often funds scholarships for employees\' children, with a preference for health careers.',
    howToFind: 'Ask the employed parent to search the system\'s internal benefits or HR portal for "scholarship" and "tuition". These are almost never posted publicly, which is exactly why they are winnable.',
    why: 'Restricted-pool awards are the highest expected value in scholarship searching, and an employer restriction is the tightest pool there is.',
  },
  {
    id: 'hc-rural-hometown',
    kind: 'discovery',
    name: 'Rural and hometown "come back and practice here" funds',
    org: 'Rural hospitals, county health departments and community foundations',
    openTo: ['senior'],
    pathways: ['md', 'pa', 'rn', 'pharmd', 'dds'],
    eligibility: 'Rural counties, critical-access hospitals and community foundations frequently fund a local student entering a health profession, sometimes with an informal or formal expectation that they return to practice.',
    howToFind: 'Ask your school counselor for the local community foundation\'s scholarship list, and ask the administrator at your nearest rural hospital directly. Also read the state rural service programs in the section above — they are the professional-school version of this same idea.',
    why: 'If you are from a rural county, this and the state rural pipeline programs together are worth more than any national scholarship you are likely to win, and they compound: the same story wins both.',
  },

  // ── Not yet: the ones that open when they matriculate ────────────────────
  {
    id: 'hc-fnsna',
    kind: 'named',
    name: 'FNSNA General Scholarship',
    org: 'Foundation of the National Student Nurses\' Association',
    openTo: ['undergrad'],
    pathways: ['rn'],
    amount: 'Typically $1,000–$7,500',
    deadline: 'Annual cycle, historically closing in the winter',
    eligibility: 'Students currently enrolled in a state-approved nursing program. High school students are explicitly not eligible — this is the one that catches out ambitious seniors every year.',
    why: 'Put it in your calendar for the winter of your first year of nursing school. Applying as a senior is a wasted evening, and knowing that now is the point of listing it.',
    url: 'https://www.forevernursing.org/',
  },
  {
    id: 'hc-nhsc-note',
    kind: 'named',
    name: 'NHSC Scholarship and Nurse Corps Scholarship',
    org: 'HRSA',
    openTo: ['undergrad'],
    pathways: ['md', 'pa', 'rn'],
    amount: 'Full tuition, fees and a living stipend, in exchange for a service commitment',
    deadline: 'One cycle a year, generally late winter to spring',
    eligibility: 'Nursing students (Nurse Corps, including undergraduate BSN students) and health professional students (NHSC). Not open to high school students — but the Nurse Corps opens as early as your first year of a nursing program, which is sooner than most people realize.',
    why: 'The largest awards on this whole page and the ones with a real commitment attached. Read them in the service-commitment section above rather than here — the decision they need is about where you want to live at thirty, not about an essay.',
    url: 'https://bhw.hrsa.gov/funding/apply-scholarship',
  },
];

export const HEALTH_SCHOLARSHIP_BY_ID = Object.fromEntries(HEALTH_SCHOLARSHIPS.map(s => [s.id, s]));
