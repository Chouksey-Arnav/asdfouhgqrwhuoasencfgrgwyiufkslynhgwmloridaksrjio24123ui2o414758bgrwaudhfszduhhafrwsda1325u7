// ─────────────────────────────────────────────────────────────────────────────
// The medicine-specific scholarship database.
//
// ── Why a third scholarship file ────────────────────────────────────────────
// There are already two, and each answers a question this one does not:
//
//   src/data/scholarships.js         — ~90 general awards a strong high schooler
//                                      of any intended major can win. Four of
//                                      them are health-specific.
//   src/data/healthCareerScholarships.js
//                                    — health-career awards and discovery
//                                      routes scoped to a HIGH SCHOOLER, plus
//                                      the local money no national list covers.
//   src/data/pathwayFinance.js       — the SERVICE-COMMITMENT programs (HPSP,
//                                      NHSC, Nurse Corps, IHS, ROTC, PSLF),
//                                      which are decisions rather than
//                                      applications and are presented as such.
//
// What none of them covers is the rest of the road. A student using this app is
// fourteen to eighteen, and the money that will actually pay for their medicine
// is mostly awarded at twenty-one, twenty-three and twenty-five: pre-med
// undergraduate awards, medical-school scholarships, research fellowships that
// fund a year out, and the institutional aid that decides which acceptance is
// affordable. Those are exactly the things nobody tells a sixteen-year-old, and
// they are the things that change what they should do NOW — which college to
// pick, which state to stay in, whether to keep undergraduate debt low, which
// experiences to start logging in ninth grade rather than twelfth.
//
// So this file is the pipeline: every stage from high school to residency, with
// each entry stating plainly which stage it belongs to and — where it matters —
// what a high schooler should do about it today.
//
// ── The honesty rules, inherited and non-negotiable ─────────────────────────
//  1. AMOUNTS AND DEADLINES ARE RANGES AND SEASONS, never this year's figures.
//     They move annually. A confidently wrong deadline costs a student the
//     award, which is strictly worse than making them look it up.
//  2. EVERY ENTRY CARRIES ITS OFFICIAL URL. Not an aggregator — the program's
//     own page, because that is the only page that is current.
//  3. ELIGIBILITY STATES THE DISQUALIFIER FIRST where one exists. The failure
//     mode this file exists to prevent is a student spending an evening on an
//     application they were never eligible for. Several entries here are listed
//     precisely so a student knows NOT to apply yet.
//  4. NOTHING HERE PROMISES ANYONE ANYTHING. These are competitive awards.
//
// ── A note on what changed under us ─────────────────────────────────────────
// The Tylenol Future Care Scholarship is the standing example of why rule 1
// exists. It was for years the one large national health award a graduating
// high school senior could enter, and it is now open only to graduate students
// and to college seniors entering graduate school. A student who trusted a
// stale entry would have written an application they could not submit. The
// entry below says so in its first line, and the high-school file's version has
// been corrected to match.
// ─────────────────────────────────────────────────────────────────────────────

/** When a human last read every official page linked below, end to end. */
export const MED_SCHOLARSHIP_READ_ON = '2026-08-26';

/**
 * Where on the road an award sits.
 *
 * The order matters — it is the order the UI lists them in, and it is the order
 * a student's life happens in. `note` is what makes a stage they cannot apply
 * for yet worth reading rather than discouraging.
 */
export const MED_STAGES = {
  'high-school': {
    label: 'You can apply now',
    short: 'High school',
    order: 0,
    color: 'green',
    note: 'Open to a high school student today. This is the shortest list on the page, and that is the honest shape of the landscape rather than a gap in ours.',
  },
  undergrad: {
    label: 'College / pre-med',
    short: 'Undergrad',
    order: 1,
    color: 'blue',
    note: 'Awarded during your undergraduate degree. Several of these have prerequisites you build in high school — research, service, a tribal enrollment record, a college that hosts the program — so they are worth reading years before you can apply.',
  },
  'med-school': {
    label: 'Medical / professional school',
    short: 'Professional school',
    order: 2,
    color: 'violet',
    note: 'Awarded once you are in medical, dental, PA, nursing or pharmacy school. You cannot apply now, and the reason to read them now is different: they are most of the money, and knowing they exist should change how much undergraduate debt you are willing to take on.',
  },
  resident: {
    label: 'Residency and beyond',
    short: 'Residency',
    order: 3,
    color: 'teal',
    note: 'After your degree. Listed because the biggest numbers on this whole page are loan repayment rather than scholarships, and because the job you take at twenty-eight is a financial decision as much as a clinical one.',
  },
};

/**
 * What kind of thing an entry is. The distinction is load-bearing: a student
 * should not read a $0 enrichment program as an award they lost, or a
 * fee waiver as a scholarship they can live on.
 */
export const MED_ENTRY_KINDS = {
  named: { label: 'Scholarship', note: 'A named award you apply for.' },
  fellowship: { label: 'Fellowship', note: 'Funded time — usually a research year — rather than tuition.' },
  program: { label: 'Funded program', note: 'A place rather than a check: tuition, housing or training paid for.' },
  'fee-assistance': { label: 'Fee assistance', note: 'Not money you receive — costs you no longer pay. Frequently worth more than a small scholarship.' },
  institutional: { label: 'School-funded', note: 'Attached to a school rather than to you. Which school you get into decides it.' },
  discovery: { label: 'Where to look', note: 'Not one award — a documented place to find awards that no national list can enumerate.' },
};

/** The filter rails. An entry may sit in several. */
export const MED_TRACKS = [
  { id: 'all', label: 'All' },
  { id: 'premed', label: 'Pre-med & undergrad' },
  { id: 'med-school-aid', label: 'Medical school' },
  { id: 'research', label: 'Research & fellowships' },
  { id: 'urim', label: 'Underrepresented in medicine' },
  { id: 'women', label: 'Women in medicine' },
  { id: 'specialty', label: 'Specialty-specific' },
  { id: 'tuition-free', label: 'Tuition-free & institutional' },
  { id: 'fee-help', label: 'Application & exam costs' },
  { id: 'rural', label: 'Rural & underserved' },
  { id: 'other-pathways', label: 'Nursing, PA, dental, pharmacy' },
];

export const MED_SCHOLARSHIPS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH SCHOOL — the short, honest list
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'med-hs-reality',
    kind: 'discovery',
    name: 'Read this before you search "medical school scholarships"',
    org: 'MedSchoolPrep',
    stage: ['high-school'],
    tracks: ['premed'],
    pathways: ['md', 'pa', 'rn', 'pharmd', 'dds'],
    eligibility: 'Everyone reading this page.',
    howToFind: 'Nothing to find — this is the map. Work down the stages: everything under "You can apply now" is live for you today, and everything below it is a reason to make a different decision now rather than an application to write.',
    why: "Almost every award with 'medical' in its name requires you to be enrolled in medical school already. That is not a wall — it is a timeline. The money for your MD is real and it is large, and it is awarded in your twenties. What a high schooler does about it is: keep undergraduate debt low, because it is the debt nobody forgives; build the record (research, service in underserved communities, tribal or first-generation status documented) that the twenty-three-year-old versions of these applications read for; and win the general and local awards that ARE open to you now, which live in the two databases below this one.",
    linkTo: 'general-database',
  },
  {
    id: 'med-shpep',
    kind: 'program',
    name: 'Summer Health Professions Education Program (SHPEP)',
    org: 'SHPEP National Program Office, at 10 host universities',
    stage: ['undergrad'],
    tracks: ['premed', 'urim'],
    pathways: ['md', 'dds', 'pa', 'rn', 'pharmd'],
    amount: 'Free to attend — tuition, housing and meals are covered, and most sites pay a stipend on top',
    deadline: 'Applications have historically opened on 1 November and closed in early February, with decisions in March',
    eligibility: 'College freshmen and sophomores (some sites, juniors) interested in medicine, dentistry, nursing, pharmacy, public health, optometry or physical therapy. NOT open to high school students — this is the first thing to aim at once you matriculate.',
    commitment: 'Six weeks of your summer, on campus.',
    why: 'Six weeks of academic enrichment, clinical exposure and application coaching, at no cost, at a real medical or dental school. For a first-generation or low-income pre-med it is the single most useful thing available in the first two years of college, and its alumni network is a genuine advantage at application time. Read the honest caveat below and check the current status before you build a plan around it.',
    caution: 'SHPEP\'s founding funder, the Robert Wood Johnson Foundation, announced it would end its funding after the 2026 summer cohort. The program\'s future beyond that depends on replacement funding — confirm on shpep.org that it is running before you count on it.',
    url: 'https://www.shpep.org/',
    tags: ['summer program', 'free', 'pipeline', 'first generation'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UNDERGRAD — pre-med
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'med-nih-ugsp',
    kind: 'named',
    name: 'NIH Undergraduate Scholarship Program (UGSP)',
    org: 'National Institutes of Health',
    stage: ['undergrad'],
    tracks: ['premed', 'research', 'urim'],
    pathways: ['md'],
    amount: 'Up to $20,000 per academic year toward tuition, educational expenses and living expenses; renewable up to four years',
    deadline: 'One cycle a year, historically opening in the winter and closing in the spring',
    eligibility: 'Undergraduates from disadvantaged backgrounds — established when your financial aid office certifies "exceptional financial need" as the federal government defines it — with a strong GPA, committed to a career in biomedical, behavioral or social science research.',
    commitment: 'Two paid service obligations per scholarship year: a ten-week full-time summer internship at the NIH straight after the funded year, and one year of full-time employment at the NIH after you graduate — which may be deferred until you finish an advanced degree, including medical school.',
    why: 'The largest undergraduate award on this page, and one of very few whose "service commitment" is a line on a CV people would pay to have. The deferral is the part students miss: you can take the money, do the summers, go to medical school, and serve the NIH year afterwards. If you want an MD-PhD or an academic career, this is close to a perfect fit.',
    hsAction: 'The application reads for genuine research interest, and "exceptional financial need" is certified from the FAFSA. Both are set up before you apply: do real research in high school or your first year, and file the FAFSA properly.',
    url: 'https://www.training.nih.gov/research-training/pb/ugsp/',
    tags: ['research', 'financial need', 'NIH', 'renewable', 'MD-PhD'],
  },
  {
    id: 'med-ihs-prep-pregrad',
    kind: 'named',
    name: 'IHS Preparatory and Pre-Graduate Scholarships',
    org: 'Indian Health Service',
    stage: ['undergrad'],
    tracks: ['premed', 'rural', 'urim'],
    pathways: ['md', 'dds', 'pa', 'rn', 'pharmd'],
    amount: 'Tuition, fees and a monthly stipend',
    deadline: 'Annual cycle, historically closing in the spring for the following academic year',
    eligibility: 'American Indian and Alaska Native students who are members or descendants of federally recognized, state-recognized or terminated tribes, with a minimum 2.0 GPA and acceptance into an accredited U.S. program. Preparatory funds prerequisite coursework for a health-professions degree; Pre-Graduate funds the bachelor\'s coursework required to apply to medical, dental or podiatry school.',
    commitment: 'The Preparatory and Pre-Graduate tracks carry a service obligation only if you go on to hold the Health Professions scholarship; read the current handbook, because this is the detail that most often surprises people.',
    why: 'Almost no federal program funds PRE-professional undergraduate years. These two do. An eligible student can have the pre-med years themselves paid for rather than borrowed — which, given that undergraduate debt is the debt nobody forgives, can be worth more over a lifetime than a larger award at medical school.',
    hsAction: 'Tribal enrollment or descendancy has to be documented, and getting the paperwork in order takes longer than anyone expects. Start it in high school, not the week before the deadline.',
    url: 'https://www.ihs.gov/scholarship/scholarships/',
    tags: ['American Indian', 'Alaska Native', 'tribal', 'undergraduate', 'pre-med'],
  },
  {
    id: 'med-aamc-fap',
    kind: 'fee-assistance',
    name: 'AAMC Fee Assistance Program',
    org: 'Association of American Medical Colleges',
    stage: ['undergrad'],
    tracks: ['premed', 'fee-help'],
    pathways: ['md'],
    amount: 'A reduced MCAT registration fee, free official MCAT prep materials, a free MSAR subscription, and AMCAS fees waived for an initial set of medical schools — a package that has been worth well over $1,000 against costs that otherwise run into thousands',
    deadline: 'Rolling — but apply BEFORE you register for the MCAT or submit AMCAS, because the benefits are not applied retroactively',
    eligibility: 'Each household on your application (yours, and your parents\' if applicable) must have a total family income at or under 400% of the national poverty level for that family size — for the 2026 cycle, roughly $62,600 for a family of one and $128,600 for a family of four. You must have a U.S. home address, and must not already be accepted or enrolled at a medical school.',
    why: 'The 400% threshold is far more generous than students assume, and the single most common mistake here is not applying because "we probably earn too much". Applying costs an hour. The MCAT plus a normal AMCAS run costs thousands, and this is the difference between applying to fifteen schools and applying to six.',
    hsAction: 'Nothing to do yet — but know the number 400%, and know that the parental income used is from the year before you apply.',
    url: 'https://students-residents.aamc.org/fee-assistance-program/fee-assistance-program',
    alsoInGeneralDatabase: 'aamc-fap',
    tags: ['MCAT', 'AMCAS', 'fee waiver', 'financial need'],
  },
  {
    id: 'med-aacomas-waiver',
    kind: 'fee-assistance',
    name: 'AACOMAS Fee Waiver',
    org: 'American Association of Colleges of Osteopathic Medicine',
    stage: ['undergrad'],
    tracks: ['premed', 'fee-help'],
    pathways: ['md'],
    amount: 'Waives the AACOMAS application fee for an initial set of osteopathic medical schools',
    deadline: 'Requested at the start of the application cycle; a limited number are granted, so early matters',
    eligibility: 'Based on documented financial need, generally evidenced through federal tax information. Separate from the AAMC program — applying to DO schools means a second application service and a second waiver to request.',
    why: 'Students applying to both MD and DO schools routinely secure the AAMC waiver and forget this one exists, then pay full price for the half of their list that is osteopathic. It is a separate form for a separate service.',
    url: 'https://www.aacom.org/become-a-doctor/apply-to-medical-school/aacomas',
    tags: ['osteopathic', 'DO', 'fee waiver', 'AACOMAS'],
  },
  {
    id: 'med-summer-research',
    kind: 'discovery',
    name: 'Paid summer research programs at medical schools (SURP / SUR)',
    org: 'Most academic medical centers, individually',
    stage: ['undergrad'],
    tracks: ['premed', 'research'],
    pathways: ['md'],
    eligibility: 'Undergraduates, usually after freshman or sophomore year. Many programs explicitly prioritize students from backgrounds underrepresented in medicine, first-generation students, or students from institutions without research infrastructure.',
    howToFind: 'Search "[medical school name] summer undergraduate research program" for every academic medical center within reach, plus the NIH\'s own Summer Internship Program. Applications cluster between December and February for the following summer — earlier than students expect, which is why the good ones fill.',
    why: 'These pay a stipend (commonly $3,000–$6,000 for ten weeks) and produce the thing a medical school application actually needs, which is a real research experience with a real letter behind it. As a way of turning a summer into both money and admissions capital, nothing else on this page competes.',
    url: 'https://www.training.nih.gov/research-training/hs-ug/sip/',
    tags: ['summer research', 'stipend', 'undergraduate', 'letters of recommendation'],
  },
  {
    id: 'med-postbacc-funded',
    kind: 'discovery',
    name: 'Funded post-baccalaureate pre-medical programs',
    org: 'Universities and the NIH, individually',
    stage: ['undergrad'],
    tracks: ['premed', 'urim'],
    pathways: ['md'],
    eligibility: 'College graduates — career-changers who did not take the pre-med sciences, and "record-enhancer" students strengthening a GPA. Many of the strongest are specifically for students from disadvantaged or underrepresented backgrounds, and several of those are free or funded.',
    howToFind: 'The AAMC keeps a searchable post-bacc directory with a filter for programs aimed at underrepresented and disadvantaged students; the NIH runs its own paid Post-baccalaureate IRTA research year. Filter for funded ones before you look at anything else.',
    why: 'Listed here because a high schooler needs to know it exists: not getting into medical school on the first try is common, recoverable and routine, and there is a funded, structured route through it. A student who knows that is a student who does not treat one bad semester as the end of a career.',
    url: 'https://mec.aamc.org/postbac/',
    tags: ['post-bacc', 'career changer', 'second chance', 'GPA'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDICAL SCHOOL — the money that pays for the MD
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'med-ama-physicians-of-tomorrow',
    kind: 'named',
    name: 'AMA Foundation Physicians of Tomorrow Scholarship',
    org: 'American Medical Association Foundation',
    stage: ['med-school'],
    tracks: ['med-school-aid', 'urim', 'specialty'],
    pathways: ['md'],
    amount: '$10,000 in tuition assistance, across a large number of separately-named awards',
    deadline: 'Applications have historically opened in the winter and closed in the spring, for the following academic year',
    eligibility: 'Rising final-year medical students — you apply during your third year — at a fully accredited U.S. allopathic (MD) or osteopathic (DO) school. U.S. citizen, permanent resident or DACA status. Some schools nominate rather than letting students apply directly, so check with your dean\'s office first.',
    why: 'The best-known national scholarship for medical students, and unusually it is not one award but seventeen-plus separate named categories — several for students underrepresented in medicine, several tied to a specialty or a form of service. Reading the category list carefully is worth more than polishing the essay: most applicants are eligible for more than they realize.',
    url: 'https://amafoundation.org/physicians-of-tomorrow',
    tags: ['AMA', 'final year', 'MD', 'DO', 'tuition'],
  },
  {
    id: 'med-nmf-general',
    kind: 'named',
    name: 'National Medical Fellowships Scholarships',
    org: 'National Medical Fellowships (NMF)',
    stage: ['med-school'],
    tracks: ['med-school-aid', 'urim'],
    pathways: ['md'],
    amount: 'Varies by award, commonly $5,000–$10,000; NMF administers a large portfolio of separately-funded scholarships and runs more than one application cycle a year',
    deadline: 'Multiple cycles annually — historically one closing in the spring and another later in the year',
    eligibility: 'Generally students enrolled in an accredited U.S. medical or health-professions program, with U.S. citizenship, permanent residency or DACA status, financial need, and a demonstrated, ongoing commitment to serving medically underserved communities. Individual awards within the portfolio add their own criteria.',
    why: 'NMF has been the central scholarship organization for students underrepresented in medicine since 1946, and it is the one name worth knowing on this page. Because it administers many separately-funded awards through one application, a single well-written submission is considered for several.',
    hsAction: '"A proven and ongoing commitment to serving medically underserved communities" is not a sentence you can write from nothing at twenty-three. It is a decade of logged service — which is exactly what the Portfolio tab in this app is for.',
    url: 'https://nmfonline.org/scholarships-programs/scholarships-and-awards/',
    tags: ['underrepresented in medicine', 'underserved', 'financial need', 'NMF'],
  },
  {
    id: 'med-nbme-nmf',
    kind: 'named',
    name: 'NBME/NMF Scholarship',
    org: 'National Board of Medical Examiners with National Medical Fellowships',
    stage: ['med-school'],
    tracks: ['med-school-aid', 'urim'],
    pathways: ['md'],
    amount: '$10,000 a year, renewable for up to three years — so up to $30,000 — to a small cohort of second-year students',
    deadline: 'Has recently opened in early April and closed in mid-May',
    eligibility: 'Second-year medical students at accredited U.S. schools, with demonstrated financial need and a commitment to serving medically underserved communities. U.S. citizenship or a DACA approval letter required.',
    why: 'Renewable is the word that matters: most medical school scholarships are one-off checks, and three years of $10,000 is a materially different number. The cohort is small, which is the trade.',
    url: 'https://www.nbme.org/',
    tags: ['renewable', 'second year', 'financial need', 'NBME'],
  },
  {
    id: 'med-nbme-fee-assistance',
    kind: 'fee-assistance',
    name: 'NBME Fee Assistance Program',
    org: 'National Board of Medical Examiners',
    stage: ['med-school'],
    tracks: ['fee-help'],
    pathways: ['md'],
    amount: 'Awards covering the registration cost of USMLE Step 1 or Step 2 CK — recently around $695 each, to over a thousand students a year',
    deadline: 'Annual cycle; check the NBME site for the current window',
    eligibility: 'Medical students with demonstrated financial need at accredited U.S. schools.',
    why: 'Step registration is a four-figure line item nobody warns you about, arriving in the same year as dedicated study time when you cannot work. Small, specific, and it removes a real cost at exactly the wrong moment for it.',
    url: 'https://www.nbme.org/',
    tags: ['USMLE', 'Step 1', 'Step 2', 'exam fees'],
  },
  {
    id: 'med-nickens',
    kind: 'named',
    name: 'Herbert W. Nickens Medical Student Scholarships',
    org: 'AAMC — Association of American Medical Colleges',
    stage: ['med-school'],
    tracks: ['med-school-aid', 'urim'],
    pathways: ['md'],
    amount: '$5,000 each, five awarded a year, plus covered travel and registration for the AAMC annual meeting where they are presented',
    deadline: 'Annual cycle, historically nominated in the late winter or early spring',
    eligibility: 'Students entering their THIRD year at an LCME-accredited U.S. medical school (MD/PhD students qualify when entering their third medical school year), who are U.S. citizens, permanent residents or hold DACA status. Your school may nominate one student per year — this is a nomination, not an open application.',
    why: 'Small in dollars and large in everything else: five a year, nationally, for leadership in eliminating inequities in medical education and health care. It is a career credential, and the AAMC meeting it is presented at is where the people who run academic medicine are standing.',
    url: 'https://www.aamc.org/about-us/aamc-awards/nickens-medical-student-scholarships',
    tags: ['AAMC', 'health equity', 'leadership', 'nomination', 'third year'],
  },
  {
    id: 'med-arnstein',
    kind: 'named',
    name: 'Sherry R. Arnstein Scholarship',
    org: 'AACOM — American Association of Colleges of Osteopathic Medicine',
    stage: ['med-school'],
    tracks: ['med-school-aid', 'urim'],
    pathways: ['md'],
    amount: '$5,000 to a number of osteopathic medical students each year',
    deadline: 'Annual cycle — check AACOM for the current window',
    eligibility: 'Students at an AACOM member college of osteopathic medicine, from backgrounds historically underrepresented in medicine. Both newly accepted and continuing students are eligible, which is unusual and useful — most medical school scholarships require you to already be enrolled.',
    why: 'The flagship national award on the osteopathic side, and it opens to students who have merely been ACCEPTED. If you are choosing between a DO acceptance and a gap year, this is one of the few awards you can pursue in that window.',
    url: 'https://www.aacom.org/become-a-doctor/apply-to-medical-school/pay-for-medical-school/sherry-r-arnstein-scholarship',
    tags: ['osteopathic', 'DO', 'underrepresented in medicine', 'newly accepted'],
  },
  {
    id: 'med-tylenol-future-care',
    kind: 'named',
    name: 'Tylenol Future Care Scholarship',
    org: 'Kenvue / Tylenol',
    stage: ['med-school'],
    tracks: ['med-school-aid', 'other-pathways'],
    pathways: ['md', 'rn', 'pharmd'],
    amount: 'Recently 10 awards of $10,000 and 25 of $5,000 — around $350,000 in total each year',
    deadline: 'Recently closing in mid-July, which makes it one of the latest deadlines in the health-scholarship year',
    eligibility: 'READ THIS FIRST — this is no longer a high school award. Current eligibility is graduate students, or college seniors who will be enrolled in graduate school the following academic year, with proof of enrollment in a medical, nursing or pharmacy graduate program and at least one year of study remaining. Residents of the 50 states, D.C. or Puerto Rico.',
    why: "One of the largest and best-known health-career awards in the country, with an unusually late deadline — it is still open after almost everything else has closed. It is in this file rather than the high school one because its eligibility moved: it used to be reachable by a graduating senior and is not any more, and a stale entry would have cost somebody an evening they did not have.",
    url: 'https://www.tylenol.com/tylenol-future-care-scholarship',
    tags: ['nursing', 'pharmacy', 'graduate', 'late deadline'],
  },
  {
    id: 'med-soros',
    kind: 'fellowship',
    name: 'Paul & Daisy Soros Fellowships for New Americans',
    org: 'The Paul & Daisy Soros Fellowships',
    stage: ['med-school'],
    tracks: ['med-school-aid', 'research'],
    pathways: ['md', 'dds'],
    amount: 'Up to $90,000 over two years — around $40,000 toward tuition and around $50,000 in stipend',
    deadline: 'One cycle a year, historically closing in the autumn',
    eligibility: 'Immigrants and the children of immigrants: naturalised citizens, green card holders, asylees, refugees, DACA recipients, or people who graduated from both a U.S. high school and a U.S. college. Aged 30 or under at the deadline. Must be entering graduate school, or in the first two years of it — which for a medical student means applying as an M1 or M2, and no later.',
    why: 'The largest and most prestigious award a medical student in this category can win, and one of the few that funds a professional degree at this scale. The two-year window is a hard edge: an M3 who has only just heard of it has missed it, which is the entire reason it is listed here rather than left to be discovered.',
    url: 'https://pdsoros.org/',
    tags: ['immigrant', 'DACA', 'new American', 'prestigious', 'M1', 'M2'],
  },
  {
    id: 'med-jkcf-graduate',
    kind: 'named',
    name: 'Jack Kent Cooke Foundation Graduate Scholarship',
    org: 'Jack Kent Cooke Foundation',
    stage: ['med-school'],
    tracks: ['med-school-aid'],
    pathways: ['md', 'dds'],
    amount: 'Up to $150,000 over four years, capped at $75,000 a year',
    deadline: 'Annual cycle for eligible Cooke Scholars',
    eligibility: 'READ THIS FIRST — this is a closed award. It is open ONLY to existing Cooke Scholars: students who held a Cooke undergraduate scholarship and are applying to their first graduate program, generally within three years of finishing that funded degree. There is no route in from outside.',
    why: 'It is here to make one thing plain to a high schooler: winning the Cooke College Scholarship as a senior is not just four years of undergraduate funding — it opens a door to $150,000 for medical school that nobody else can walk through. That compounding is invisible from the outside, and it should change how seriously a low-income high achiever takes the Cooke application in the autumn of senior year.',
    url: 'https://www.jkcf.org/cooke-scholar-community/graduate-scholarship/',
    relatedGeneralId: 'jkcf-college-scholarship',
    tags: ['Cooke scholar', 'closed award', 'compounding', 'financial need'],
  },
  {
    id: 'med-amwa-awards',
    kind: 'named',
    name: 'AMWA scholarships, awards and fellowships',
    org: 'American Medical Women\'s Association',
    stage: ['med-school', 'undergrad'],
    tracks: ['med-school-aid', 'women'],
    pathways: ['md'],
    amount: 'A portfolio of small awards — recently four $500 Medical Education Scholarships, two $2,000 Underrepresented Students in Medicine Scholarships, membership waivers, essay and research prizes, and a residency-application scholarship',
    deadline: 'Each award runs its own window across the year; several open on 1 July and close within weeks',
    eligibility: 'AMWA student members. Flat-rate medical student membership has recently been a one-time fee of around $75 covering all your years in medical school, and that membership is the prerequisite for essentially every award listed.',
    why: 'The amounts are small and that is not the point. Membership is one payment for four years, it unlocks a dozen separate awards and prizes with tiny applicant pools, and the essay and research prizes are CV lines at a stage when CV lines are scarce. AMWA also runs premedical awards, so an undergraduate member is eligible earlier than most people realize.',
    url: 'https://amwa-doc.org/members/students/awards-scholarships-and-fellowships/',
    tags: ['women in medicine', 'membership', 'essay prize', 'research award'],
  },
  {
    id: 'med-women-in-medicine',
    kind: 'discovery',
    name: 'Women-in-medicine awards beyond AMWA',
    org: 'Specialty women\'s organizations, medical school women\'s groups and regional foundations',
    stage: ['med-school', 'undergrad'],
    tracks: ['women', 'specialty'],
    pathways: ['md', 'dds'],
    eligibility: 'Varies. Most require membership or enrollment; several of the strongest are attached to a specialty rather than to medicine generally.',
    howToFind: 'Beyond AMWA, look at the women\'s organization inside whichever specialty interests you — the Association of Women Surgeons, the American Medical Women\'s Association branches, and the women\'s committees inside most specialty colleges all fund awards, travel grants and research prizes. Then ask your medical school\'s own women-in-medicine group which internal awards exist; many schools hold named endowments that are only advertised on a noticeboard.',
    why: 'Women are now the majority of medical students and a minority in several specialties, and the funding follows that gap: the awards concentrate where the under-representation still is — surgery, orthopaedics, cardiology, academic leadership. Which means the more specific your interest, the better the odds, exactly inverting how scholarships usually work.',
    hsAction: 'The undergraduate version of this is real and worth doing now: AMWA runs premedical awards, and most of the women-in-STEM scholarships in the general database below are open to you as a high schooler this year.',
    url: 'https://www.womensurgeons.org/',
    tags: ['women in medicine', 'surgery', 'specialty', 'research prize'],
  },
  {
    id: 'med-schweitzer',
    kind: 'fellowship',
    name: 'Albert Schweitzer Fellowship',
    org: 'The Albert Schweitzer Fellowship, at ~10 U.S. sites',
    stage: ['med-school'],
    tracks: ['med-school-aid', 'rural'],
    pathways: ['md', 'dds', 'pa', 'rn', 'pharmd'],
    amount: 'A stipend of around $3,000 for the fellowship year',
    deadline: 'Site-specific, generally closing in the winter for an April-to-April fellowship year',
    eligibility: 'Graduate and professional students in the health professions at a partner institution in one of the fellowship\'s U.S. sites. You need a community partner and a project idea — the application is a proposal, not a personal statement.',
    commitment: 'At least 200 hours of service across the year, of which at least 100 are direct client contact, delivering a project designed to outlast you.',
    why: 'Modest money for real work, and it is on this page because of what it becomes: a year-long, self-designed community health project with a named partner organization is one of the strongest things a residency application can carry, and it is open to every health profession rather than to medicine alone.',
    url: 'https://schweitzerfellowship.org/',
    tags: ['community health', 'service', 'project', 'residency application'],
  },

  // ── Research fellowships: the funded year out ─────────────────────────────
  {
    id: 'med-mstp',
    kind: 'program',
    name: 'MD-PhD / Medical Scientist Training Programs (MSTP)',
    org: 'NIH-funded MSTPs and other MD-PhD programs',
    stage: ['med-school'],
    tracks: ['med-school-aid', 'research', 'tuition-free'],
    pathways: ['md'],
    amount: 'Full medical school tuition, health insurance and an annual living stipend — recently in the region of $38,000–$52,000 depending on the institution and year — for the whole of a seven-to-eight-year dual degree',
    deadline: 'You apply through the normal medical school cycle (AMCAS/AACOMAS) with additional MD-PhD essays, so the deadline is the ordinary one — the summer before matriculation',
    eligibility: 'Applicants to medical school with substantial prior research experience — in practice, years of it, with publications or presentations, not a single summer. Around 59 programs are NIH-funded as MSTPs; other MD-PhD programs are institutionally funded and vary in what they cover.',
    commitment: 'Not a service obligation — a career expectation. These programs are built to produce physician-scientists, and they are a poor fit for anyone who wants to practice full-time.',
    why: "The largest single financial package available to any medical student in the country: a fully funded MD and PhD, with a stipend, and no service commitment. The price is three to four extra years and a genuine commitment to research. If you are the kind of student who likes the lab as much as the clinic, no scholarship on this page comes close.",
    hsAction: 'This is the entry on this page with the longest lead time and the clearest instruction for a fourteen-year-old: if there is any chance you want this, start doing real research early and keep doing it. Nothing else about the application can be compressed into senior year of college.',
    url: 'https://www.nigms.nih.gov/training/instpredoc/pages/predocoverview-mstp.aspx',
    tags: ['MD-PhD', 'MSTP', 'research', 'fully funded', 'stipend', 'physician scientist'],
  },
  {
    id: 'med-nih-mrsp',
    kind: 'fellowship',
    name: 'NIH Medical Research Scholars Program (MRSP)',
    org: 'National Institutes of Health',
    stage: ['med-school'],
    tracks: ['research'],
    pathways: ['md', 'dds'],
    amount: 'A full-year stipend plus housing/travel support, for a mentored research year on the NIH campus in Bethesda',
    deadline: 'One cycle a year, historically closing in the winter for the following academic year',
    eligibility: 'Medical, dental and veterinary students, usually taking a year out between their second and third or third and fourth years.',
    why: 'A year inside the NIH, mentored by an intramural investigator, with the resources of the largest biomedical research institution in the world. As a route into a competitive residency it is close to unmatched, and it is funded rather than costing you a year of tuition.',
    url: 'https://www.training.nih.gov/research-training/mrsp/',
    tags: ['research year', 'NIH', 'Bethesda', 'residency', 'mentored'],
  },
  {
    id: 'med-sarnoff',
    kind: 'fellowship',
    name: 'Sarnoff Cardiovascular Research Fellowship',
    org: 'Sarnoff Cardiovascular Research Foundation',
    stage: ['med-school'],
    tracks: ['research', 'specialty'],
    pathways: ['md'],
    amount: 'A full year\'s stipend — recently reported in the $32,000–$45,000 range — plus a travel and equipment allowance',
    deadline: 'One cycle a year, historically closing in the winter',
    eligibility: 'Students at accredited U.S. medical schools taking a year out for intensive cardiovascular research, generally between the second and third or third and fourth years. You do the research at an institution OTHER than your own medical school, which is deliberate.',
    why: 'One of the best-funded research years available to a medical student, and the fellowship follows you: Sarnoff maintains its fellows as a lifelong academic network. If cardiology is where you are heading, this is the single strongest thing you can do in medical school.',
    url: 'https://www.sarnofffoundation.org/',
    tags: ['cardiology', 'research year', 'cardiovascular', 'stipend'],
  },
  {
    id: 'med-hhmi-medical-fellows',
    kind: 'fellowship',
    name: 'Research year fellowships at HHMI, Doris Duke and Fogarty',
    org: 'Howard Hughes Medical Institute, Doris Duke Foundation, NIH Fogarty International Center',
    stage: ['med-school'],
    tracks: ['research'],
    pathways: ['md'],
    amount: 'Typically a full year\'s stipend plus research and travel support; amounts and the exact programs on offer change from year to year',
    deadline: 'Each runs its own annual cycle, most closing in the winter',
    eligibility: 'Medical (and often dental and veterinary) students taking a year out for mentored research. Fogarty-linked programs fund global health research at an international site.',
    why: 'Grouped rather than listed separately on purpose: the funded-research-year landscape is genuinely volatile — programs are renamed, refunded and retired between cohorts — and any specific entry here would go stale faster than a student could use it. What does not go stale is the shape: if you want a research year, there are several national funders of it, your school\'s research office knows which are running this year, and asking them is the move.',
    url: 'https://www.hhmi.org/programs',
    tags: ['research year', 'global health', 'HHMI', 'Doris Duke', 'Fogarty'],
  },
  {
    id: 'med-aoa-kuckein',
    kind: 'fellowship',
    name: 'Alpha Omega Alpha Carolyn L. Kuckein Student Research Fellowship',
    org: 'Alpha Omega Alpha Honor Medical Society',
    stage: ['med-school'],
    tracks: ['research'],
    pathways: ['md'],
    amount: 'A summer research stipend, historically around $6,000',
    deadline: 'Annual cycle, historically closing in the winter',
    eligibility: 'Medical students at institutions with an active AOA chapter. You do NOT need to be an AOA member to apply — a detail that stops a large number of eligible students from ever applying.',
    why: 'Summer research funding is the bottleneck between the first and second years of medical school: the work is available, the money to live on while doing it is not. This is one of the few national sources, and the "you need not be a member" point is the reason it is worth naming.',
    url: 'https://alphaomegaalpha.org/programs-awards/student-programs/carolyn-l-kuckein-student-research-fellowship/',
    tags: ['summer research', 'AOA', 'stipend', 'first year'],
  },

  // ── Specialty and association awards ──────────────────────────────────────
  {
    id: 'med-pisacano',
    kind: 'named',
    name: 'Pisacano Scholars Leadership Program',
    org: 'Pisacano Leadership Foundation (American Board of Family Medicine)',
    stage: ['med-school'],
    tracks: ['specialty', 'med-school-aid', 'rural'],
    pathways: ['md'],
    amount: 'Up to $28,000 in total — $5,000 a year for the final year of medical school and the first three years of family medicine residency',
    deadline: 'Annual cycle; recent application materials have been posted the preceding autumn',
    eligibility: 'Third-year students at U.S. medical schools with a demonstrated, specific commitment to family medicine, plus documented leadership, academic and clinical strength and a record of service.',
    commitment: 'Not a contract, but the funding continues into family medicine residency — so it is structured around you actually going into the specialty.',
    why: 'The rare award that keeps paying through residency, when your salary is at its lowest relative to your debt. It also comes with leadership symposia and mentoring from the people who run the specialty, which for a student heading into primary care is worth as much as the money.',
    url: 'https://pisacano.org/',
    tags: ['family medicine', 'primary care', 'leadership', 'residency', 'renewable'],
  },
  {
    id: 'med-specialty-societies',
    kind: 'discovery',
    name: 'Specialty society student awards, grants and research prizes',
    org: 'Essentially every medical specialty society',
    stage: ['med-school'],
    tracks: ['specialty', 'research'],
    pathways: ['md'],
    eligibility: 'Usually student membership in the society, which is typically free or heavily discounted for medical students — and is the prerequisite almost everybody misses.',
    howToFind: 'Once you have any sense of a specialty, join its society as a student member and read its awards page in full. Search "[specialty society] medical student research grant" and "[specialty society] student scholarship". Then do the same for your STATE chapter, where the applicant pool collapses to double digits.',
    why: 'This is the highest-yield unlisted money in medical school and it is invisible from outside: the American College of Physicians, the American Academy of Family Physicians, the American College of Surgeons, emergency medicine, anaesthesia, radiology, psychiatry, obstetrics and the rest all fund student research grants, travel awards and named scholarships, and student membership is usually free. The applicant pools are small because they are only advertised to members.',
    tags: ['specialty', 'society', 'membership', 'research grant', 'travel award'],
  },
  {
    id: 'med-identity-orgs',
    kind: 'discovery',
    name: 'SNMA, LMSA, APAMSA and AAIP scholarships',
    org: 'Student National Medical Association; Latino Medical Student Association; Asian Pacific American Medical Student Association; Association of American Indian Physicians',
    stage: ['med-school', 'undergrad'],
    tracks: ['urim', 'med-school-aid'],
    pathways: ['md'],
    eligibility: 'Membership in the relevant organization. All four have PRE-MEDICAL membership as well as medical student membership — which is the part worth knowing years early.',
    howToFind: 'Join as a pre-med undergraduate, not as a medical student. Then read each organization\'s scholarship and travel-award page, and its regional chapter\'s page, every year. LMSA has awarded $5,000 scholarships funded by health systems that came with mentoring and a clinical rotation attached; conference travel scholarships in the several-hundred-dollar range are common across all four.',
    why: 'These are the organizations that will still be around you at forty, and their scholarships are the least contested in medicine because they are advertised to members and nowhere else. The conferences alone — SNMA\'s annual meeting draws thousands, including pre-meds — are worth the membership before you count a single award.',
    url: 'https://snma.org/',
    tags: ['SNMA', 'LMSA', 'APAMSA', 'AAIP', 'underrepresented in medicine', 'pre-med membership'],
  },

  // ── Institutional aid: the acceptance IS the scholarship ──────────────────
  {
    id: 'med-tuition-free-schools',
    kind: 'institutional',
    name: 'Tuition-free and tuition-covered medical schools',
    org: 'A small number of U.S. medical schools',
    stage: ['med-school'],
    tracks: ['tuition-free', 'med-school-aid'],
    pathways: ['md'],
    amount: 'Full tuition, and at some schools living expenses as well — a package worth $250,000–$400,000+ over four years',
    deadline: 'There is no separate application. You apply to the school in the normal cycle; the funding follows admission.',
    eligibility: 'Varies sharply, and the distinction matters: some schools fund EVERY admitted student regardless of need (NYU Grossman and NYU Grossman Long Island; Cleveland Clinic Lerner). Others are means-tested — Johns Hopkins, following a 2024 Bloomberg Philanthropies gift, covers tuition for students from families under a stated income threshold and living expenses below a lower one. Kaiser Permanente Bernard J. Tyson waived tuition for a defined set of early cohorts rather than permanently. Several other schools have moved to loan-free or largely-scholarship financial aid without being "tuition-free".',
    why: 'The largest number on this entire page, and the one nobody can apply for: it is decided by admission, not by an essay. It is here because it should change how a high schooler thinks about the next eight years — the way to a free medical education is to be the kind of applicant these schools admit, which is a decade of work, not an application form.',
    caution: 'These programs change with their endowments and their donors. Every one of them has moved in the last five years, and at least one is time-limited by cohort. Confirm the current policy on the school\'s own financial aid page before it influences a single decision.',
    url: 'https://students-residents.aamc.org/financial-aid/financial-aid-resources',
    tags: ['tuition free', 'NYU', 'Cleveland Clinic', 'Johns Hopkins', 'Kaiser Permanente', 'full ride'],
  },
  {
    id: 'med-institutional-merit',
    kind: 'discovery',
    name: 'Your medical school\'s own merit and need-based scholarships',
    org: 'Every medical school, individually',
    stage: ['med-school'],
    tracks: ['tuition-free', 'med-school-aid'],
    pathways: ['md', 'dds', 'pa', 'rn', 'pharmd'],
    eligibility: 'Admitted and enrolled students. Many awards are made automatically from the admissions file with no separate application; many others require the CSS Profile or the school\'s own need form, filed by a deadline that is NOT the admissions deadline.',
    howToFind: 'The moment you hold an acceptance, read that school\'s financial aid page end to end and email the aid office with one question: "Which of your scholarships require a separate application, and what are their deadlines?" Do this before you decide where to deposit.',
    why: 'Institutional aid dwarfs every external scholarship on this page combined — it is where the overwhelming majority of medical school scholarship money actually comes from. Students spend months chasing $5,000 national awards and miss a school form worth ten times that because it had its own deadline in April.',
    hsAction: 'The version of this that applies to you NOW is identical and just as underused: colleges award far more than outside scholarships do, and their own deadlines are often earlier than their admissions ones.',
    tags: ['institutional aid', 'CSS Profile', 'merit aid', 'deadline'],
  },

  // ── Other pathways ────────────────────────────────────────────────────────
  {
    id: 'med-pa-foundation',
    kind: 'named',
    name: 'PA Foundation Scholarships',
    org: 'Physician Assistant Foundation (AAPA)',
    stage: ['med-school'],
    tracks: ['other-pathways'],
    pathways: ['pa'],
    amount: 'A portfolio of awards; the Foundation reports over $2.7 million awarded to nearly 1,600 PA students to date',
    deadline: 'One main cycle a year — check the Foundation for the current window',
    eligibility: 'Students in an ARC-PA accredited PA program who are in the PROFESSIONAL phase (not the pre-professional coursework) and are student members of AAPA. Judged on academic achievement, financial need, and leadership and service.',
    why: 'The central national scholarship source for PA students. The two gating conditions — professional phase, AAPA student membership — are both easy to satisfy and both regularly missed.',
    url: 'https://pa-foundation.org/pa-student-scholarships/',
    tags: ['physician assistant', 'PA', 'AAPA', 'membership'],
  },
  {
    id: 'med-dental-adea-asda',
    kind: 'discovery',
    name: 'Dental student scholarships — ADEA, ASDA and the ADA Foundation',
    org: 'American Dental Education Association; American Student Dental Association; ADA Foundation',
    stage: ['med-school'],
    tracks: ['other-pathways'],
    pathways: ['dds'],
    eligibility: 'Predoctoral dental students, generally with membership in the relevant organization. ADEA runs several named scholarships including awards for students pursuing academic careers; ASDA maintains the most useful aggregated list of dental school scholarships anywhere.',
    howToFind: 'Start with the ASDA "paying for dental school" scholarship list — it is maintained by dental students and is more current than any general database — then read ADEA\'s own awards page and the ADA Foundation\'s student scholarship.',
    why: 'Dental school is among the most expensive professional degrees in the United States and has the thinnest external scholarship landscape of any pathway in this app. That makes the two things that DO move the number — institutional aid and the service-commitment programs — matter more here than anywhere else.',
    url: 'https://www.asdanet.org/index/dental-student-resources/paying-for-dental-school/dental-school-scholarships',
    tags: ['dental', 'DDS', 'DMD', 'ADEA', 'ASDA'],
  },
  {
    id: 'med-nursing-pharmacy-orgs',
    kind: 'discovery',
    name: 'Nursing and pharmacy student scholarships',
    org: 'FNSNA, AACN, state nurses associations; APhA, ASHP and state pharmacy associations',
    stage: ['undergrad', 'med-school'],
    tracks: ['other-pathways'],
    pathways: ['rn', 'pharmd'],
    eligibility: 'Enrolled students in an accredited program. The Foundation of the National Student Nurses\' Association is the largest single source on the nursing side and requires current enrollment — high school students are explicitly not eligible.',
    howToFind: 'Nursing: FNSNA first, then your STATE nurses association foundation, then your school\'s own fund. Pharmacy: your school\'s APhA-ASP chapter, then the state pharmacy association, then ASHP. In both cases the state-level award is where the odds are.',
    why: 'Both pathways have deep, well-organized scholarship infrastructure that is almost entirely invisible until you are enrolled — and both have far better odds at the state level than the national one, because a state association fields dozens of applicants rather than thousands.',
    url: 'https://www.forevernursing.org/',
    tags: ['nursing', 'RN', 'BSN', 'pharmacy', 'PharmD', 'state association'],
  },

  // ── The two biggest packages, both with a contract attached ───────────────
  // These sit here rather than in the service-commitment section of the
  // Financial Aid tab for one reason: that section covers the programs a
  // student CHOOSES between (HPSP, NHSC, ROTC, Nurse Corps, IHS, PSLF), and
  // these two are the outliers big enough that leaving them out of a list of
  // "how medical school gets paid for" would make the list dishonest.
  {
    id: 'med-usuhs',
    kind: 'program',
    name: 'Uniformed Services University (USU) School of Medicine',
    org: 'U.S. Department of Defense',
    stage: ['med-school'],
    tracks: ['tuition-free', 'med-school-aid'],
    pathways: ['md'],
    amount: 'No tuition at all, plus a junior officer\'s salary while you are a student — base pay with housing and subsistence allowances, recently in the region of $50,000–$60,000 a year — plus health care for you and your family and paid annual leave',
    deadline: 'You apply through the normal AMCAS cycle, with additional military paperwork and a physical',
    eligibility: 'U.S. citizens who meet military accession standards and are admitted to USU in Bethesda, Maryland. No prior military service is required.',
    commitment: 'A seven-year active-duty service obligation after residency. That is longer than HPSP\'s, and it is the trade for being PAID through medical school rather than merely having it paid for.',
    why: 'The only medical school in the country where you finish with no debt and four years of income and retirement credit behind you rather than zero. It is also a genuine military career decision made at twenty-two, and the seven years are not negotiable. Both halves of that are true at once, which is why it is worth reading years before you have to weigh them.',
    hsAction: 'Nothing to apply for, but two things to know: military accession standards include medical ones, and some conditions that are trivial in civilian life require a waiver. If this route interests you at all, find that out early rather than at twenty-two.',
    url: 'https://medschool.usuhs.edu/',
    tags: ['military', 'USUHS', 'free tuition', 'salary', 'active duty', 'service commitment'],
  },
  {
    id: 'med-nhsc-s2s',
    kind: 'named',
    name: 'NHSC Students to Service Loan Repayment Program',
    org: 'HRSA — Health Resources and Services Administration',
    stage: ['med-school'],
    tracks: ['rural', 'med-school-aid'],
    pathways: ['md', 'dds'],
    amount: 'Up to $120,000 in tax-free loan repayment, paid as up to $30,000 a year over four years, with an additional supplemental award available for maternity care shortage areas',
    deadline: 'One cycle a year, historically closing in the winter of your final year',
    eligibility: 'FINAL-YEAR students in medicine (MD or DO) and dentistry, plus some other disciplines. This is the one federal service program you apply for in your last year of school rather than your first — which is exactly why students who assumed they had missed the boat on NHSC still have this one open.',
    commitment: 'Three years of full-time service in a high-need rural, tribal or urban community at an NHSC-approved site.',
    why: 'The second chance for anyone who did not take the NHSC scholarship at the start. Same idea, applied at the other end of school, and $120,000 tax-free against loans is worth materially more than $120,000 of salary. Three years is a real commitment; it is also three years at a stage of life when many people would take that job anyway.',
    url: 'https://nhsc.hrsa.gov/loan-repayment/nhsc-students-to-service-loan-repayment-program',
    linkTo: 'service-commitments',
    tags: ['NHSC', 'loan repayment', 'final year', 'rural', 'underserved', 'tax free'],
  },
  {
    id: 'med-cbcf-stokes',
    kind: 'named',
    name: 'CBCF Louis Stokes Health Scholars Program',
    org: 'Congressional Black Caucus Foundation, sponsored by the United Health Foundation',
    stage: ['undergrad', 'med-school'],
    tracks: ['urim', 'med-school-aid', 'premed'],
    pathways: ['md'],
    amount: 'A minimum award of $5,000–$10,000, set against your cost of attendance and financial need, paid to your institution across the fall and spring terms',
    deadline: 'Annual cycle — the CBCF scholarship portal opens in the winter and closes in the spring',
    eligibility: 'Students pursuing a degree aimed at a career in internal medicine, family medicine or pediatrics, with a GPA of at least 3.0 and proof of U.S. citizenship or lawful presence. Judged on leadership, community service and academic record.',
    why: 'One of the few sizable awards that names PRIMARY CARE specifically, and one of the few open across both undergraduate and professional study. If you already know you are heading for family medicine, internal medicine or paediatrics, that specificity is an advantage rather than a restriction — you are the exact candidate rather than one of thousands of generalists.',
    url: 'https://www.cbcfinc.org/scholarships/',
    tags: ['primary care', 'pediatrics', 'internal medicine', 'family medicine', 'CBCF'],
  },
  {
    id: 'med-aaip-paw',
    kind: 'program',
    name: 'AAIP Pre-Admission Workshop',
    org: 'Association of American Indian Physicians',
    stage: ['undergrad'],
    tracks: ['premed', 'urim'],
    pathways: ['md'],
    amount: 'Free to attend — participant scholarships have covered airfare, hotel, registration, materials and most meals',
    deadline: 'Applications open in the spring for a summer workshop',
    eligibility: 'American Indian and Alaska Native students preparing to apply to medical school. Hosted with the Four Corners Alliance (Colorado, Utah, New Mexico, and both Arizona schools) and the University of Minnesota Duluth.',
    why: 'Several days of mock interviews, personal statement work, and direct access to admissions and financial aid officers at the schools running it — with travel paid. For a Native pre-med applicant it compresses a year of guesswork into a long weekend, and the people in the room are the people who will read the application.',
    hsAction: 'Not open to you yet, but the organization is worth knowing now: AAIP and ANAMS (the Association of Native American Medical Students) are the network to be inside from your first year of college.',
    url: 'https://www.aaip.org/program/pre-admission-workshop',
    tags: ['American Indian', 'Alaska Native', 'AAIP', 'admissions', 'workshop', 'free'],
  },
  {
    id: 'med-nih-lrp',
    kind: 'named',
    name: 'NIH Loan Repayment Programs (LRP)',
    org: 'National Institutes of Health',
    stage: ['resident', 'med-school'],
    tracks: ['research', 'med-school-aid'],
    pathways: ['md'],
    amount: 'Repayment of a substantial share of qualifying educational debt per two-year contract, renewable — the extramural programs have run to tens of thousands of dollars a year',
    deadline: 'One main cycle a year, historically opening in the summer and closing in the autumn',
    eligibility: 'Researchers with qualifying educational debt who devote a significant majority of their professional time to NIH-mission-relevant research — clinical, pediatric, health disparities, contraception and infertility, or research in emerging areas. Generally applied for after training, not during medical school; there is a separate intramural track for researchers at the NIH itself.',
    commitment: 'A two-year research commitment per contract, renewable.',
    why: 'The single largest financial reason a physician can afford an academic research career rather than being priced out of it by debt. It is on this page because "I want to do research but I will have $300,000 of loans" is a real thought that ends real careers, and the answer to it exists.',
    url: 'https://www.lrp.nih.gov/',
    tags: ['NIH', 'loan repayment', 'research career', 'academic medicine'],
  },
  {
    id: 'med-aafp-primary-care',
    kind: 'discovery',
    name: 'Family medicine and primary care student awards',
    org: 'AAFP Foundation, state academies of family physicians, and primary care interest groups',
    stage: ['med-school'],
    tracks: ['specialty', 'rural'],
    pathways: ['md'],
    eligibility: 'Medical students, usually with student membership in the AAFP (free to medical students) or its state chapter.',
    howToFind: 'Join the AAFP as a student member — it costs nothing — then read the AAFP Foundation\'s student award page and, more importantly, your STATE academy\'s. State academies fund conference travel, rural rotation stipends and named scholarships that are advertised to a few dozen people.',
    why: 'Primary care is the most heavily subsidized direction in American medicine, because the shortage is real and everyone funding anything knows it. The Pisacano program above is the flagship; underneath it sits a whole layer of state-level money that almost nobody applies for.',
    url: 'https://www.aafp.org/students-residents/medical-students.html',
    tags: ['family medicine', 'primary care', 'AAFP', 'state academy', 'rural rotation'],
  },

  // ── Residency and after ───────────────────────────────────────────────────
  {
    id: 'med-loan-repayment-after',
    kind: 'discovery',
    name: 'Loan repayment after training — the biggest numbers on this page',
    org: 'HRSA, the NIH, individual states, and your employer',
    stage: ['resident'],
    tracks: ['rural', 'med-school-aid'],
    pathways: ['md', 'pa', 'rn', 'pharmd', 'dds'],
    eligibility: 'Licensed clinicians, generally after or during training. The NHSC Loan Repayment Program and state programs pay against outstanding loans in exchange for service at approved sites; the NIH Loan Repayment Programs pay researchers; PSLF forgives the remaining federal balance after ten years of qualifying payments at a non-profit or government employer.',
    howToFind: 'The service-commitment section above this one covers NHSC, IHS, PSLF and the state programs in full, including what they cost you in return. Read that rather than a duplicate here.',
    why: 'Worth naming even at fifteen for one reason: the biggest financial event in a physician\'s life is not a scholarship, it is whether their loans are federal and where they take their first job. State programs have recently reached $150,000–$200,000 in several rural states. A student who knows this at fifteen makes different choices about undergraduate debt than one who learns it at thirty.',
    hsAction: 'One concrete consequence now: keep undergraduate borrowing FEDERAL where you borrow at all. Almost every forgiveness and repayment program in this paragraph applies only to federal loans, and private refinancing is a one-way door out of all of them.',
    linkTo: 'service-commitments',
    tags: ['loan repayment', 'PSLF', 'NHSC', 'rural', 'federal loans'],
  },
];

export const MED_SCHOLARSHIP_BY_ID = Object.fromEntries(MED_SCHOLARSHIPS.map(s => [s.id, s]));

/** Entries at one stage, in stage order. */
export function medScholarshipsForStage(stage) {
  if (!stage || stage === 'all') return MED_SCHOLARSHIPS;
  return MED_SCHOLARSHIPS.filter(s => (s.stage || []).includes(stage));
}

/** Entries on one track (see MED_TRACKS). */
export function medScholarshipsForTrack(track) {
  if (!track || track === 'all') return MED_SCHOLARSHIPS;
  return MED_SCHOLARSHIPS.filter(s => (s.tracks || []).includes(track));
}

/** Entries relevant to one pathway id (see src/data/pathwayFinance.js). */
export function medScholarshipsForPathway(pathwayId) {
  if (!pathwayId) return MED_SCHOLARSHIPS;
  return MED_SCHOLARSHIPS.filter(s => (s.pathways || []).includes(pathwayId));
}

/**
 * Counts for the filter chips, so a chip that would show nothing can say so
 * rather than being a dead end a student taps twice.
 */
export function medScholarshipCounts() {
  const byStage = {};
  for (const key of Object.keys(MED_STAGES)) byStage[key] = medScholarshipsForStage(key).length;
  return {
    total: MED_SCHOLARSHIPS.length,
    byStage,
    withUrl: MED_SCHOLARSHIPS.filter(s => !!s.url).length,
    discovery: MED_SCHOLARSHIPS.filter(s => s.kind === 'discovery').length,
  };
}
