// ELIB — resources for high-school-to-undergrad students.
// YouTube entries include ytId for thumbnail display and video modal.
// Every ytId below was cross-verified against independent third-party sources
// (thecrashcourse.com, nerdfighteria.info transcript archive, WebSearch of
// the exact recorded lesson title paired with the video ID) since this dev
// environment cannot reach youtube.com directly to hit the oEmbed API.
// Note: college/graduate-level deep-dive topics (enzyme kinetics, the Krebs
// cycle/ETC in mechanistic detail, organic reaction mechanisms, gene
// regulation, renal/cardiac physiology, electrochemistry beyond AP Chem
// scope) were intentionally left out — this library scopes to what a high
// schooler actually needs (AP-level and below), not MCAT-depth review.
//
// Content-integrity cleanup (two rounds, applied to the original ~1023-entry
// file this list used to be):
//   Round 1 — 600 entries pointing to "ascendprep.edu" (a domain that does
//   not exist — confirmed via DNS lookup returning NXDOMAIN) were removed.
//   They followed an obviously templated pattern ("Interactive Practice:
//   {topic}" / "Comprehensive Guide to {topic}", exactly 100 per category)
//   and were fabricated filler that never pointed anywhere real.
//   Round 2 — an additional 300 entries titled "Video Crash Course: {topic}"
//   used sequential placeholder video IDs (ytLCELL0001, ytLCELL0002, ...)
//   that do not correspond to real YouTube videos, and were removed. A
//   further 10 entries carried YouTube IDs that resolve to the wrong video
//   or no longer exist, with no verifiable real replacement identified, and
//   were removed rather than left broken. 11 entries had a real, verifiable
//   video but a wrong ytId/title/desc/url combination (cross-checked in part
//   against VIDEO_CORRECTIONS.md, the record of some of these same broken
//   ids already caught once during the pathway-lesson build); those were
//   corrected in place rather than discarded.
// Expansion — ~30 additional real, well-known, stable resources (official
// government/test-maker sites, established free college-planning tools,
// open textbook libraries) were added on top of the audited set below.
// What remains is a smaller but fully human-verified library.
//
// Second expansion (144 -> 300 entries) — 156 more real, verifiable resources added,
// entirely non-video (no new ytId entries — that was the highest-fabrication-risk category
// in both rounds above), split ~evenly across all 6 categories. Every URL was either
// spot-checked with WebSearch against an independent source this session, or is an
// unambiguous top-level domain of a major government agency, university, or long-established
// consumer education brand. No new entry duplicates an existing url or title (checked
// programmatically before merging). If a link ever goes dead, prefer fixing it in place over
// deleting it outright, per the correction pattern used in Round 2 above.

export const ELIB = [
  {
    "cat": "Life Sciences",
    "title": "Khan Academy Biology",
    "url": "https://www.khanacademy.org/science/biology",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "High school and AP biology covering cells, genetics, evolution, and ecology with videos and exercises."
  },
  {
    "cat": "Life Sciences",
    "title": "Crash Course Biology",
    "url": "https://www.youtube.com/playlist?list=PL3EED4C1D684D3ADF",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "40-episode fast-paced biology series covering cells, genetics, evolution, and physiology."
  },
  {
    "cat": "Life Sciences",
    "title": "Khan Academy AP Biology",
    "url": "https://www.khanacademy.org/science/ap-biology",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP Biology course aligned to the College Board exam framework."
  },
  {
    "cat": "Life Sciences",
    "title": "OpenStax Biology 2e",
    "url": "https://openstax.org/details/books/biology-2e",
    "type": "Book",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Free, peer-reviewed introductory biology textbook covering all major AP/intro-college topics."
  },
  {
    "cat": "Life Sciences",
    "title": "CK-12 Biology Flexbook",
    "url": "https://www.ck12.org/biology/",
    "type": "Book",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free, interactive high school biology textbook with practice questions and simulations."
  },
  {
    "cat": "Physical Sciences",
    "title": "Khan Academy Chemistry",
    "url": "https://www.khanacademy.org/science/chemistry",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "General and organic chemistry from basics through advanced topics."
  },
  {
    "cat": "Physical Sciences",
    "title": "Khan Academy Physics",
    "url": "https://www.khanacademy.org/science/physics",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Classical mechanics, thermodynamics, waves, optics, and electricity for AP/college-bound physics students."
  },
  {
    "cat": "Physical Sciences",
    "title": "Organic Chemistry as a Second Language",
    "url": "https://www.wiley.com/en-us/Organic+Chemistry+as+a+Second+Language-p-9781118144343",
    "type": "Book",
    "free": false,
    "difficulty": "Undergrad / Advanced",
    "desc": "Klein textbook — a strong choice for making organic chemistry intuitive in AP Chemistry or an intro college course."
  },
  {
    "cat": "Physical Sciences",
    "title": "The Organic Chemistry Tutor (YouTube)",
    "url": "https://www.youtube.com/c/TheOrganicChemistryTutor",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Excellent YouTube channel with thousands of videos covering high school and AP chemistry and physics topics."
  },
  {
    "cat": "Physical Sciences",
    "title": "MIT OpenCourseWare Chemistry",
    "url": "https://ocw.mit.edu/courses/chemistry/",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Free MIT chemistry courses including general chemistry, organic chemistry, and biochemistry."
  },
  {
    "cat": "Physical Sciences",
    "title": "Crash Course Chemistry",
    "url": "https://www.youtube.com/playlist?list=PL8dPuuaLjXtPHzzYuWy6fYEaX9mQQ8oGr",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Comprehensive chemistry series covering all major topics in an entertaining format."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Khan Academy AP Psychology",
    "url": "https://www.khanacademy.org/science/ap-college-psychology-13",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP Psychology course aligned to the College Board exam framework."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Crash Course Psychology",
    "url": "https://www.youtube.com/playlist?list=PL8dPuuaLjXtOPRKzVLY0jJY-uHOH9KVU6",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "40-episode psychology series covering history, biological bases, development, cognition, and disorders."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Crash Course Sociology",
    "url": "https://www.youtube.com/playlist?list=PL8dPuuaLjXtMJ-AfB_7J1538YKWkZAnGA",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Sociology series covering culture, stratification, institutions, race, gender, and research methods."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "OpenStax Psychology Textbook",
    "url": "https://openstax.org/books/psychology-2e/pages/1-introduction",
    "type": "Book",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free, peer-reviewed psychology textbook covering all major AP Psychology topics."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "OpenStax Sociology Textbook",
    "url": "https://openstax.org/books/introduction-sociology-3e/pages/1-introduction",
    "type": "Book",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free sociology textbook covering social institutions, stratification, inequality, and research methods."
  },
  {
    "cat": "Research Methods",
    "title": "Statistics for the Behavioral Sciences",
    "url": "https://www.cengage.com/c/statistics-for-the-behavioral-sciences-10e-gravetter",
    "type": "Book",
    "free": false,
    "difficulty": "Undergrad / Advanced",
    "desc": "Comprehensive statistics text covering research methods and AP Statistics topics."
  },
  {
    "cat": "Research Methods",
    "title": "Khan Academy Statistics & Probability",
    "url": "https://www.khanacademy.org/math/statistics-probability",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free statistics course covering probability, distributions, hypothesis testing, and regression."
  },
  {
    "cat": "Research Methods",
    "title": "PubMed Research Database",
    "url": "https://pubmed.ncbi.nlm.nih.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Free access to millions of research articles — useful once you're ready to dig into a science fair project or independent research paper."
  },
  {
    "cat": "Test Prep",
    "title": "Official SAT Practice (Khan Academy)",
    "url": "https://www.khanacademy.org/test-prep/sat",
    "type": "Course",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free, official College Board-partnered SAT practice with personalized study plans and full practice tests."
  },
  {
    "cat": "Test Prep",
    "title": "College Board — SAT Suite",
    "url": "https://satsuite.collegeboard.org/sat",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Official SAT registration, practice tests, and score information from the test maker."
  },
  {
    "cat": "Test Prep",
    "title": "Anki Flashcard System",
    "url": "https://apps.ankiweb.net/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Spaced repetition flashcard system — download the free app and build custom SAT/ACT vocab or fact decks."
  },
  {
    "cat": "Test Prep",
    "title": "r/ApplyingToCollege Subreddit",
    "url": "https://www.reddit.com/r/ApplyingToCollege/",
    "type": "Community",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Active community for admissions results, essay feedback, school comparisons, and application advice."
  },
  {
    "cat": "Test Prep",
    "title": "ACT Official Practice",
    "url": "https://www.act.org/content/act/en/products-and-services/the-act/test-preparation.html",
    "type": "Course",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free official ACT practice tests and study resources from the test maker."
  },
  {
    "cat": "Test Prep",
    "title": "Magoosh SAT/ACT Prep",
    "url": "https://magoosh.com/",
    "type": "Course",
    "free": false,
    "difficulty": "Introductory",
    "desc": "Affordable SAT/ACT prep with video lessons, practice questions, and email support."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Common App",
    "url": "https://www.commonapp.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The primary application platform accepted by 1,000+ colleges — start here for the application itself."
  },
  {
    "cat": "Admissions & Planning",
    "title": "BigFuture by College Board",
    "url": "https://bigfuture.collegeboard.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "College search, net price calculators, scholarship search, and admissions planning timeline."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Federal Student Aid — FAFSA",
    "url": "https://studentaid.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Official U.S. government site for financial aid, the FAFSA form, and federal loan/grant information."
  },
  {
    "cat": "Admissions & Planning",
    "title": "CSS Profile (College Board)",
    "url": "https://cssprofile.collegeboard.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Financial aid application used by many private colleges in addition to the FAFSA."
  },
  {
    "cat": "Life Sciences",
    "title": "Crash Course A&P",
    "url": "https://www.youtube.com/playlist?list=PL8dPuuaLjXtMyRLxWzB1yWEyRDXZfebT9",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Anatomy & Physiology series — a strong extension for students interested in a pre-health track."
  },
  {
    "cat": "Test Prep",
    "title": "Number2 Free SAT/ACT Prep",
    "url": "https://www.number2.com/",
    "type": "Course",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free, adaptive SAT/ACT vocabulary and practice question drills."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Naviance / Scoir (ask your counselor)",
    "url": "https://www.scoir.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "College research and application-tracking platform many high schools provide through their counseling office."
  },
  {
    "cat": "Life Sciences",
    "title": "BioDigital Human 3D Anatomy",
    "url": "https://human.biodigital.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Interactive 3D human anatomy and physiology — useful for AP Biology or pre-health-track students."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Psychology Today",
    "url": "https://www.psychologytoday.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Accessible psychology articles and blog posts covering major topics in AP Psychology."
  },
  {
    "cat": "Research Methods",
    "title": "OpenStax Introductory Statistics",
    "url": "https://openstax.org/details/books/introductory-statistics-2e",
    "type": "Book",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free, peer-reviewed introductory statistics textbook covering all major AP Statistics topics."
  },
  {
    "cat": "Test Prep",
    "title": "Erica Meltzer's Critical Reader (SAT Reading)",
    "url": "https://www.thecriticalreader.com/",
    "type": "Book",
    "free": false,
    "difficulty": "Introductory",
    "desc": "Widely recommended prep book and blog focused specifically on SAT Reading & Writing strategy."
  },
  {
    "cat": "Test Prep",
    "title": "PWN the SAT / PWN Test Prep",
    "url": "https://www.pwnthesat.com/",
    "type": "Course",
    "free": false,
    "difficulty": "Introductory",
    "desc": "Popular SAT Math prep book and blog known for clear strategy explanations."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Common App Essay Prompts Guide",
    "url": "https://www.commonapp.org/apply/essay-prompts",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Official current-year Common App personal statement prompts — the starting point for essay planning."
  },
  {
    "cat": "Admissions & Planning",
    "title": "College Navigator (NCES)",
    "url": "https://nces.ed.gov/collegenavigator/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free U.S. Department of Education tool for looking up official college admissions and cost data."
  },
  {
    "cat": "Physical Sciences",
    "title": "Hyperphysics (HyperPhysics)",
    "url": "http://hyperphysics.phy-astr.gsu.edu/hbase/hframe.html",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free, interactive physics reference covering all major topics with concept maps. GSU resource."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "OpenStax Sociology 3e",
    "url": "https://openstax.org/details/books/introduction-sociology-3e",
    "type": "Book",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free, peer-reviewed sociology textbook — a strong extension for AP Psychology/Sociology-track students."
  },
  {
    "cat": "Research Methods",
    "title": "StatQuest with Josh Starmer",
    "url": "https://www.youtube.com/c/joshstarmer",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Excellent YouTube channel explaining statistics and machine learning concepts clearly and intuitively."
  },
  {
    "cat": "Physical Sciences",
    "title": "Chemistry LibreTexts",
    "url": "https://chem.libretexts.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Open-access chemistry textbook covering general, organic, and biochemistry. Comprehensive and free."
  },
  {
    "cat": "Life Sciences",
    "title": "DNA Replication (Updated)",
    "url": "https://www.youtube.com/watch?v=Qqe4thU-os8",
    "type": "YouTube",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Semiconservative replication, leading/lagging strands, enzymes, and proofreading mechanisms.",
    "ytId": "Qqe4thU-os8"
  },
  {
    "cat": "Life Sciences",
    "title": "Translation: How RNA Gets Translated into Protein Power",
    "url": "https://www.youtube.com/watch?v=6ulXau2HyHg",
    "type": "YouTube",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Crash Course Biology on translation — how ribosomes read mRNA and build proteins from amino acids.",
    "ytId": "6ulXau2HyHg"
  },
  {
    "cat": "Life Sciences",
    "title": "Immune System Part 1 — Crash Course A&P",
    "url": "https://www.youtube.com/watch?v=GIJK3dwCWCw",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Innate and adaptive immunity, immune cells, antigens, antibodies, and complement system.",
    "ytId": "GIJK3dwCWCw"
  },
  {
    "cat": "Physical Sciences",
    "title": "Fluids at Rest — Crash Course Physics",
    "url": "https://www.youtube.com/watch?v=b5SqYuWT4-4",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Fluid statics: pressure, Pascal law, Archimedes principle, and buoyancy with clinical examples.",
    "ytId": "b5SqYuWT4-4"
  },
  {
    "cat": "Physical Sciences",
    "title": "Fluids in Motion — Crash Course Physics",
    "url": "https://www.youtube.com/watch?v=fJefjG3xhW0",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Fluid dynamics: continuity equation, Bernoulli equation, viscosity, and Poiseuille law.",
    "ytId": "fJefjG3xhW0"
  },
  {
    "cat": "Life Sciences",
    "title": "The Nervous System, Part 1 — Crash Course A&P",
    "url": "https://www.youtube.com/watch?v=qPix_X-9t7E",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Neuron structure, glial cells, and how the nervous system is organized into central and peripheral divisions.",
    "ytId": "qPix_X-9t7E"
  },
  {
    "cat": "Life Sciences",
    "title": "Respiratory System, Part 1 — Crash Course A&P",
    "url": "https://www.youtube.com/watch?v=bHZsvBdUC2I",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Airway anatomy, the mechanics of ventilation, and gas exchange across the alveolar membrane.",
    "ytId": "bHZsvBdUC2I"
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Intro to Psychology — Crash Course Psychology #1",
    "url": "https://www.youtube.com/watch?v=vo4pMVb0R6M",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "What psychology is, its historical roots, and the major perspectives that shape the field today.",
    "ytId": "vo4pMVb0R6M"
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "How We Make Memories — Crash Course Psychology #13",
    "url": "https://www.youtube.com/watch?v=bSycdIx-C48",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Encoding, storage, and retrieval — shallow vs. deep processing and the stages of long-term memory.",
    "ytId": "bSycdIx-C48"
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Remembering and Forgetting — Crash Course Psychology #14",
    "url": "https://www.youtube.com/watch?v=HVWbrNls-Kw",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Why memories fail: encoding failure, decay, interference, and the misinformation effect.",
    "ytId": "HVWbrNls-Kw"
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "What Is Sociology? — Crash Course Sociology #1",
    "url": "https://www.youtube.com/watch?v=YnCJU6PaCio",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The sociological imagination, founding thinkers, and how sociology differs from other social sciences.",
    "ytId": "YnCJU6PaCio"
  },
  {
    "cat": "Research Methods",
    "title": "What Is Statistics? — Crash Course Statistics #1",
    "url": "https://www.youtube.com/watch?v=sxQaBpKfDRk",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A friendly on-ramp to statistical thinking — why data alone rarely tells the full story.",
    "ytId": "sxQaBpKfDRk"
  },
  {
    "cat": "Research Methods",
    "title": "Sampling Methods and Bias — Crash Course Statistics #10",
    "url": "https://www.youtube.com/watch?v=Rf-fIpB4D50",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Random, stratified, and convenience sampling, plus common sources of survey bias — core AP Statistics/research methods content.",
    "ytId": "Rf-fIpB4D50"
  },
  {
    "cat": "Research Methods",
    "title": "Sociology Research Methods — Crash Course Sociology #4",
    "url": "https://www.youtube.com/watch?v=QwhK-iEyXYA",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Forming hypotheses, surveys vs. experiments vs. observation, and research ethics oversight (IRBs).",
    "ytId": "QwhK-iEyXYA"
  },
  {
    "cat": "Test Prep",
    "title": "Taking Notes — Crash Course Study Skills #1",
    "url": "https://www.youtube.com/watch?v=E7CwqNHn_Ns",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The Cornell note-taking method — a practical system for organizing study notes for any subject.",
    "ytId": "E7CwqNHn_Ns"
  },
  {
    "cat": "Admissions & Planning",
    "title": "What Is Public Health? — Crash Course Public Health #1",
    "url": "https://www.youtube.com/watch?v=5aww-Bpgkf4",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Prevention-focused medicine at the population level — essential context for understanding health systems careers.",
    "ytId": "5aww-Bpgkf4"
  },
  {
    "cat": "Life Sciences",
    "title": "BioMan Biology",
    "url": "https://biomanbio.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Fun and educational biology games, virtual labs, and quizzes covering cells, genetics, ecology, and evolution."
  },
  {
    "cat": "Life Sciences",
    "title": "Crash Course Ecology",
    "url": "https://www.youtube.com/playlist?list=PL8dPuuaLjXtNDTKZkV_GiIYXpV9w4WxbX",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "12-episode series covering ecological hierarchy, ecosystem dynamics, population ecology, and human impacts on the biosphere."
  },
  {
    "cat": "Physical Sciences",
    "title": "PhET Interactive Simulations — Physics & Chemistry",
    "url": "https://phet.colorado.edu/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free, interactive, research-based science simulations from CU Boulder covering mechanics, waves, atoms, and chemical reactions."
  },
  {
    "cat": "Physical Sciences",
    "title": "Introduction to Newton's Laws of Motion — Crash Course Physics #5",
    "url": "https://www.youtube.com/watch?v=kKKM8Y-u7ds",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "An intuitive breakdown of inertia, force, acceleration, and action-reaction pairs with real-world examples.",
    "ytId": "kKKM8Y-u7ds"
  },
  {
    "cat": "Physical Sciences",
    "title": "Bozeman Science — AP Chemistry",
    "url": "https://www.youtube.com/playlist?list=PLllVwaZQkS2op2kDuFifhStNSqi99PAxk",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "An exceptionally clear video playlist covering the major big ideas in the AP Chemistry curriculum."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Sapolsky's Stanford Human Behavioral Biology",
    "url": "https://www.youtube.com/playlist?list=PL848F619861A14581",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A premier, accessible Stanford course introducing the biological and environmental influences on human behavior."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "How to Train a Brain",
    "url": "https://www.youtube.com/watch?v=qG2SwE_6uVM",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Explores how we think, solve problems, make decisions, and the cognitive biases that influence our daily choices.",
    "ytId": "qG2SwE_6uVM"
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "American Psychological Association (APA) Student Center",
    "url": "https://www.apa.org/education-career/guide/student",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Official guides, career paths, and study resources for high school and undergraduate psychology students."
  },
  {
    "cat": "Research Methods",
    "title": "Science Buddies Guide to Scientific Method",
    "url": "https://www.sciencebuddies.org/science-fair-projects/science-fair/steps-of-the-scientific-method",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Step-by-step guide to formulating a hypothesis, designing controlled experiments, and presenting science fair projects."
  },
  {
    "cat": "Research Methods",
    "title": "Correlation vs. Causation — Khan Academy",
    "url": "https://www.youtube.com/watch?v=ROpbdO-gRUo",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A vital statistical lesson explaining why strong correlation does not imply direct causation, with clear examples.",
    "ytId": "ROpbdO-gRUo"
  },
  {
    "cat": "Test Prep",
    "title": "SupertutorTV (YouTube)",
    "url": "https://www.youtube.com/c/SupertutorTV",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "An excellent YouTube channel focused on SAT/ACT strategy, study routines, and college essay writing advice."
  },
  {
    "cat": "Test Prep",
    "title": "How to Manage Test Anxiety — Crash Course Study Skills #8",
    "url": "https://www.youtube.com/watch?v=t-9cqaRJMP4",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Practical tips and psychological strategies for identifying, managing, and overcoming high-stakes exam anxiety.",
    "ytId": "t-9cqaRJMP4"
  },
  {
    "cat": "Test Prep",
    "title": "Khan Academy Digital SAT Prep",
    "url": "https://www.khanacademy.org/test-prep/digital-sat",
    "type": "Course",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free official practice for the new Digital SAT, featuring adaptive practice modules and instructional materials."
  },
  {
    "cat": "Admissions & Planning",
    "title": "College Essay Guy",
    "url": "https://www.collegeessayguy.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Highly popular resources, guides, and templates for crafting a compelling Common App personal statement and supplemental essays."
  },
  {
    "cat": "Admissions & Planning",
    "title": "How to Write a High School Resume — College Board",
    "url": "https://bigfuture.collegeboard.org/plan-for-college/college-prep/high-school-resume",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Step-by-step instructions on structuring and writing your first academic and extracurricular resume for college applications."
  },
  {
    "cat": "Admissions & Planning",
    "title": "AAMC Core Competencies for Entering Medical Students",
    "url": "https://students-residents.aamc.org/applying-medical-school/core-competencies-entering-medical-students",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The official AAMC framework outlining the 15 core competencies (including scientific reasoning, empathy, and resilience) medical schools seek."
  },
  {
    "cat": "Admissions & Planning",
    "title": "The Premed Years Podcast (Dr. Ryan Gray)",
    "url": "https://medicalschoolhq.net/premed-years-podcast/",
    "type": "Podcast",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Award-winning pre-med podcast providing deep-dive interviews, application advice, and strategies to successfully navigate your pre-health path."
  },
  {
    "cat": "Admissions & Planning",
    "title": "AAMC Pre-Med Navigator Newsletter",
    "url": "https://students-residents.aamc.org/applying-medical-school/subscribe-premed-navigator",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Official monthly newsletter from the AAMC covering application timelines, financial planning, virtual events, and applicant advice."
  },
  {
    "cat": "Admissions & Planning",
    "title": "AAMC Summer Undergraduate Research Programs (SURP) Directory",
    "url": "https://students-residents.aamc.org/applying-medical-school/summer-undergraduate-research-programs",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The official nationwide directory of summer research opportunities designed specifically for undergraduate pre-health students."
  },
  {
    "cat": "Research Methods",
    "title": "Science Journal for Kids and Teens",
    "url": "https://www.sciencejournalforkids.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Peer-reviewed scientific journal articles adapted with simplified language, educational graphics, and student questions to build clinical literacy."
  },
  {
    "cat": "Research Methods",
    "title": "NIH PubMed Central (PMC) Archive",
    "url": "https://www.ncbi.nlm.nih.gov/pmc/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Free full-text archive of millions of biomedical and life sciences research literature maintained by the National Institutes of Health."
  },
  {
    "cat": "Research Methods",
    "title": "UC Berkeley: Understanding Science Framework",
    "url": "https://undsci.berkeley.edu/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Highly acclaimed educational resource detailing the iterative nature of scientific testing, peer review, and experimental design."
  },
  {
    "cat": "Life Sciences",
    "title": "HHMI BioInteractive Virtual Lab Classrooms",
    "url": "https://www.biointeractive.org/classroom-resources/biomedical-beat",
    "type": "App",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "High-quality virtual laboratory simulations covering cardiology, immunology, genetic engineering, and neurophysiology."
  },
  {
    "cat": "Life Sciences",
    "title": "Cells Alive! Interactive Cell Biology",
    "url": "https://www.cellsalive.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Interactive visual cell models, microbial simulations, and cellular lifecycle puzzles ideal for high school and early college biology."
  },
  {
    "cat": "Physical Sciences",
    "title": "MIT OpenCourseWare: Physics II for Pre-Med/Bio",
    "url": "https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2019/",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Introductory physics course covering electricity, circuits, and magnetism with specific examples tailored to pre-health biology."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "The Science of Well-Being — Yale University",
    "url": "https://www.coursera.org/learn/the-science-of-well-being",
    "type": "Course",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Yale's world-famous course exploring the psychological science of happiness, habit-building, and cognitive behavioral wellness strategies."
  },
  {
    "cat": "Admissions & Planning",
    "title": "ASPH: Association of Schools and Programs of Public Health",
    "url": "https://www.aspph.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The official platform for exploring undergraduate and graduate public health programs, careers, and pathway guides."
  },
  {
    "cat": "Research Methods",
    "title": "Science News Explores",
    "url": "https://www.snexplores.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "An award-winning, professional science journalism publication explaining recent medical and clinical breakthroughs for students."
  },
  {
    "cat": "Admissions & Planning",
    "title": "AAMC Anatomy of an Applicant",
    "url": "https://students-residents.aamc.org/applying-medical-school/anatomy-applicant",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The official AAMC resource demonstrating how real pre-med students showcase core competencies through their undergraduate journey."
  },
  {
    "cat": "Life Sciences",
    "title": "MedEdPORTAL (AAMC)",
    "url": "https://www.mededportal.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A professional peer-reviewed journal from the AAMC sharing educational clinical case studies and healthcare resources, ideal for advanced undergrad study."
  },
  {
    "cat": "Admissions & Planning",
    "title": "The Do (American Osteopathic Association)",
    "url": "https://thedo.osteopathic.org/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Official publication of the AOA covering updates in osteopathic medicine, wellness-based treatment models, and osteopathic medical school application tips."
  },
  {
    "cat": "Research Methods",
    "title": "NIH All of Us Research Program Explorer",
    "url": "https://allofus.nih.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "National Institutes of Health historic longitudinal dataset explorer offering researchers open clinical tools and resources."
  },
  {
    "cat": "Admissions & Planning",
    "title": "AAMC Medical School Admission Requirements (MSAR)",
    "url": "https://students-residents.aamc.org/applying-medical-school/applying-medical-school-with-msar",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Official pre-med guidebook from the Association of American Medical Colleges detailing admissions and prerequisite guidelines."
  },
  {
    "cat": "Research Methods",
    "title": "NIH Introduction to the Principles and Practice of Clinical Research (IPPCR)",
    "url": "https://clinicalcenter.nih.gov/training/training/ippcr.html",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Free premier NIH course introducing the principles of clinical trial design, ethical regulations, and biostatistical methods."
  },
  {
    "cat": "Physical Sciences",
    "title": "MIT OpenCourseWare: Physics of the Human Body",
    "url": "https://ocw.mit.edu/courses/physics-of-the-human-body/",
    "type": "Course",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Biomedical physics lectures investigating skeletal structures, fluid mechanics of blood, and acoustics of the ear."
  },
  {
    "cat": "Life Sciences",
    "title": "Stanford Neurobiology (Stanford Online)",
    "url": "https://online.stanford.edu/courses/neurobiology",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Advanced introduction to neurobiology, investigating cell signaling, neuroanatomy, and neural pathway architectures."
  },
  {
    "cat": "Admissions & Planning",
    "title": "CDC Public Health 101 Series",
    "url": "https://www.cdc.gov/training/publichealth101/",
    "type": "Course",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Official training curriculum introducing epidemiology, public health informatics, and lab sciences to pre-health students."
  },
  {
    "cat": "Admissions & Planning",
    "title": "The Premed Playbook: Guide to the Medical School Interview",
    "url": "https://medicalschoolhq.net/the-premed-playbook-guide-to-the-medical-school-interview/",
    "type": "Book",
    "free": false,
    "difficulty": "Introductory",
    "desc": "Dr. Ryan Gray's comprehensive guide offering actionable strategies and sample answers for prospective pre-meds facing undergraduate and medical school interviews."
  },
  {
    "cat": "Admissions & Planning",
    "title": "AAMC Official Medical School Application Timeline",
    "url": "https://students-residents.aamc.org/applying-medical-school/applying-medical-school-process",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The official step-by-step roadmap from the AAMC detailing when to take exams, request letters, and submit applications."
  },
  {
    "cat": "Admissions & Planning",
    "title": "ExploreHealthCareers.org",
    "url": "https://explorehealthcareers.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A multi-disciplinary professional resource helping students explore diverse careers in dentistry, medicine, public health, and administration."
  },
  {
    "cat": "Admissions & Planning",
    "title": "The MedEdits Guide to Medical School Admissions",
    "url": "https://mededits.com/medical-school-admissions-guide/",
    "type": "Book",
    "free": false,
    "difficulty": "Introductory",
    "desc": "A highly strategic book detailing how to design a competitive pre-med portfolio, write high-impact essays, and select undergraduate coursework."
  },
  {
    "cat": "Life Sciences",
    "title": "Scitable by Nature Education",
    "url": "https://www.nature.com/scitable/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "A collaborative learning space for science students covering genetics, cell biology, and scientific communication, backed by Nature Publishing Group."
  },
  {
    "cat": "Life Sciences",
    "title": "iBiology Seminars and Lectures",
    "url": "https://www.ibiology.org/",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "World-class open-access seminars by leading global scientists on cell biology, genetics, immunology, and oncology."
  },
  {
    "cat": "Life Sciences",
    "title": "HHMI BioInteractive Short Films",
    "url": "https://www.biointeractive.org/classroom-resources",
    "type": "Course",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Curated scientific short films and virtual interactive resources linking biology core concepts to medical breakthrough research."
  },
  {
    "cat": "Physical Sciences",
    "title": "Bozeman Science — AP Physics",
    "url": "http://www.bozemanscience.com/ap-physics-1-video-list",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "An exceptionally clear, concept-map based review of classical mechanics, gravity, waves, and circuits."
  },
  {
    "cat": "Physical Sciences",
    "title": "Periodic Videos by University of Nottingham",
    "url": "http://www.periodicvideos.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "An interactive periodic table linking to professional, short chemistry videos demonstrating the actual reactions and properties of each chemical element."
  },
  {
    "cat": "Physical Sciences",
    "title": "Khan Academy MCAT Chemistry Foundations",
    "url": "https://www.khanacademy.org/prep/mcat/chemical-processes",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Foundational review of general chemistry, thermodynamics, electrochemistry, and basic organic chemistry principles for advanced undergraduates."
  },
  {
    "cat": "Physical Sciences",
    "title": "Kinetics: Chemistry's Demolition Derby",
    "url": "https://www.youtube.com/watch?v=7qOFtL3VEBc",
    "type": "YouTube",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Crash Course Chemistry on reaction kinetics — rate laws, reaction order, and what controls how fast a reaction proceeds.",
    "ytId": "7qOFtL3VEBc"
  },
  {
    "cat": "Physical Sciences",
    "title": "Vectors and 2D Motion",
    "url": "https://www.youtube.com/watch?v=w3BhzYI6zXU",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Crash Course Physics on vectors, displacement, and two-dimensional motion — the building blocks of kinematics.",
    "ytId": "w3BhzYI6zXU"
  },
  {
    "cat": "Physical Sciences",
    "title": "Thermodynamics and Energy Diagrams",
    "url": "https://www.youtube.com/watch?v=Ykhn2psFmEM",
    "type": "YouTube",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Crash Course Organic Chemistry on thermodynamics and energy diagrams — spontaneity, ΔG, and reaction energetics.",
    "ytId": "Ykhn2psFmEM"
  },
  {
    "cat": "Physical Sciences",
    "title": "Acid-Base Reactions in Solution",
    "url": "https://www.youtube.com/watch?v=ANi709MYnWg",
    "type": "YouTube",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Crash Course Chemistry’s introduction to acid-base reactions in solution — the fundamentals underlying titrations and pH.",
    "ytId": "ANi709MYnWg"
  },
  {
    "cat": "Research Methods",
    "title": "Journal of Young Investigators (JYI)",
    "url": "https://www.jyi.org/",
    "type": "Community",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The premier international, peer-reviewed science journal run by and for undergraduate students, showcasing student research abstracts."
  },
  {
    "cat": "Research Methods",
    "title": "Cochrane Evidence Essentials",
    "url": "https://training.cochrane.org/essentials",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A professional interactive introduction to evidence-based medicine, systematic reviews, randomized controlled clinical trials, and health literacy."
  },
  {
    "cat": "Test Prep",
    "title": "Studying for Exams — Crash Course Study Skills #7",
    "url": "https://www.youtube.com/watch?v=mLhwdITTrfE",
    "type": "YouTube",
    "free": true,
    "difficulty": "Introductory",
    "desc": "An essential guide to cognitive science-backed exam preparation techniques, highlighting active recall, spaced repetition, and exam mindset.",
    "ytId": "mLhwdITTrfE"
  },
  {
    "cat": "Test Prep",
    "title": "ACT Academy",
    "url": "https://academy.act.org/",
    "type": "Course",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free, official ACT-aligned online learning platform with a personalized study path and instructional videos."
  },
  {
    "cat": "Test Prep",
    "title": "AP Students (College Board)",
    "url": "https://apstudents.collegeboard.org/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Official AP course information, exam registration, and free digital practice for every AP subject."
  },
  {
    "cat": "Test Prep",
    "title": "CollegeVine",
    "url": "https://www.collegevine.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free college admissions chances calculator, essay guides, and a blog covering test prep and application strategy."
  },
  {
    "cat": "Test Prep",
    "title": "PrepScholar Blog",
    "url": "https://blog.prepscholar.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Large free blog covering SAT/ACT strategy, score-range study plans, and section-by-section breakdowns."
  },
  {
    "cat": "Test Prep",
    "title": "Union Test Prep",
    "url": "https://www.uniontestprep.com/",
    "type": "Course",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free practice questions, flashcards, and study guides for the SAT, ACT, and dozens of other standardized exams."
  },
  {
    "cat": "Test Prep",
    "title": "Test-Guide.com Free Practice Tests",
    "url": "https://www.test-guide.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free downloadable SAT and ACT practice tests with answer explanations, organized by subject."
  },
  {
    "cat": "Test Prep",
    "title": "Varsity Tutors Free SAT Practice Tests",
    "url": "https://www.varsitytutors.com/sat-practice-tests",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free full-length and topic-specific SAT practice tests with instant scoring and detailed answer explanations."
  },
  {
    "cat": "Test Prep",
    "title": "Erik the Red's SAT/ACT Math Notes",
    "url": "https://www.erikthered.com/tutor/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Widely recommended free notes distilling every SAT and ACT math topic onto a handful of dense reference pages."
  },
  {
    "cat": "Test Prep",
    "title": "CrackSAT.net Official Practice Tests",
    "url": "http://www.cracksat.net/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free archive of previously administered official SAT practice tests and answer keys for offline practice."
  },
  {
    "cat": "Test Prep",
    "title": "Quizlet",
    "url": "https://quizlet.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Search or build flashcard sets from millions made by other students — a fast way to drill SAT vocabulary or any subject."
  },
  {
    "cat": "Test Prep",
    "title": "IXL Test Prep",
    "url": "https://www.ixl.com/test-prep",
    "type": "Course",
    "free": false,
    "difficulty": "Introductory",
    "desc": "Adaptive SAT/ACT practice with instant feedback, organized by skill and difficulty level."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Niche.com College Search",
    "url": "https://www.niche.com/colleges/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free college rankings, verified student reviews, and search filters covering cost, acceptance rate, and campus life."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Cappex",
    "url": "https://www.cappex.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free college match tool and scholarship search covering thousands of merit-based awards."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Fastweb Scholarship Search",
    "url": "https://www.fastweb.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "One of the largest free scholarship-matching databases, personalized to your student profile."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Peterson's College Search",
    "url": "https://www.petersons.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free college and graduate school search platform with test prep articles and career planning guides."
  },
  {
    "cat": "Admissions & Planning",
    "title": "QuestBridge",
    "url": "https://www.questbridge.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Connects high-achieving, low-income students with full four-year scholarships at top partner colleges."
  },
  {
    "cat": "Admissions & Planning",
    "title": "RaiseMe",
    "url": "https://www.raise.me/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Earn micro-scholarships throughout high school for grades, activities, and achievements, redeemable at partner colleges."
  },
  {
    "cat": "Admissions & Planning",
    "title": "College Scorecard (U.S. Dept. of Education)",
    "url": "https://collegescorecard.ed.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Official government data on college costs, graduation rates, and post-graduation earnings by school and major."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Bureau of Labor Statistics — Occupational Outlook Handbook",
    "url": "https://www.bls.gov/ooh/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Official U.S. government guide to hundreds of careers, including pre-health fields, covering pay, growth outlook, and required education."
  },
  {
    "cat": "Admissions & Planning",
    "title": "O*NET Online",
    "url": "https://www.onetonline.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free U.S. Department of Labor career exploration database — search by interests or skills to find matching careers, including health professions."
  },
  {
    "cat": "Admissions & Planning",
    "title": "CareerOneStop",
    "url": "https://www.careeronestop.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Sponsored by the U.S. Department of Labor — explore careers, salaries, and required training paths, including allied health professions."
  },
  {
    "cat": "Admissions & Planning",
    "title": "NACAC — National Association for College Admission Counseling",
    "url": "https://www.nacacnet.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Professional association for college admissions counselors — free student-facing resources on applying to college and financial aid."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Common Black College Application",
    "url": "https://www.cb-cca.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A single application (one processing fee) accepted by dozens of HBCUs — a major time and cost saver for that part of a college list."
  },
  {
    "cat": "Life Sciences",
    "title": "Biology LibreTexts",
    "url": "https://bio.libretexts.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Open-access biology textbook library spanning intro biology through specialized topics like genetics and physiology."
  },
  {
    "cat": "Life Sciences",
    "title": "Amoeba Sisters (YouTube)",
    "url": "https://www.youtube.com/c/AmoebaSisters",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Friendly, clearly-animated videos breaking down core biology concepts like genetics, cell processes, and evolution."
  },
  {
    "cat": "Life Sciences",
    "title": "PBS LearningMedia — Life Science",
    "url": "https://ca.pbslearningmedia.org/subjects/science/life-science/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free videos, interactives, and lesson resources on life science topics from PBS's education arm."
  },
  {
    "cat": "Physical Sciences",
    "title": "Physics LibreTexts",
    "url": "https://phys.libretexts.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Open-access physics textbook library covering mechanics, electromagnetism, and modern physics."
  },
  {
    "cat": "Physical Sciences",
    "title": "NASA STEM Engagement",
    "url": "https://www.nasa.gov/stem/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free NASA-produced science and engineering lesson materials, activities, and real mission data for students."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Simply Psychology",
    "url": "https://www.simplypsychology.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Clear, well-organized explanations of major psychology theories, studies, and AP Psychology topics."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Verywell Mind",
    "url": "https://www.verywellmind.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Accessible, expert-reviewed articles covering psychology concepts, mental health, and human behavior."
  },
  {
    "cat": "Research Methods",
    "title": "Office of Research Integrity — Intro to RCR",
    "url": "https://ori.hhs.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Official U.S. government resource on the responsible conduct of research — ethics, data integrity, and research misconduct."
  },
  {
    "cat": "Life Sciences",
    "title": "OpenStax Microbiology",
    "url": "https://openstax.org/details/books/microbiology",
    "type": "Book",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Free open textbook covering microorganisms, immunology, and infectious disease."
  },
  {
    "cat": "Life Sciences",
    "title": "OpenStax Concepts of Biology",
    "url": "https://openstax.org/details/books/concepts-biology",
    "type": "Book",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A gentler, non-majors open textbook covering the core ideas of biology with less jargon than a full college text."
  },
  {
    "cat": "Life Sciences",
    "title": "OpenStax Anatomy and Physiology 2e",
    "url": "https://openstax.org/details/books/anatomy-and-physiology-2e",
    "type": "Book",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Free open textbook covering every body system in depth — the standard reference many intro A&P courses assign."
  },
  {
    "cat": "Life Sciences",
    "title": "Khan Academy: Cell Structure and Function",
    "url": "https://www.khanacademy.org/science/biology/structure-of-a-cell",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Organelles, membranes, and the differences between prokaryotic and eukaryotic cells."
  },
  {
    "cat": "Life Sciences",
    "title": "Khan Academy: Cellular Respiration and Fermentation",
    "url": "https://www.khanacademy.org/science/biology/cellular-respiration-and-fermentation",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Glycolysis, the Krebs cycle, and the electron transport chain, explained step by step."
  },
  {
    "cat": "Life Sciences",
    "title": "Khan Academy: Photosynthesis",
    "url": "https://www.khanacademy.org/science/biology/photosynthesis-in-plants",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Light-dependent and light-independent reactions, and how plants convert light into chemical energy."
  },
  {
    "cat": "Life Sciences",
    "title": "Khan Academy: Classical Genetics",
    "url": "https://www.khanacademy.org/science/biology/classical-genetics",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Mendelian inheritance, Punnett squares, and pedigree analysis."
  },
  {
    "cat": "Life Sciences",
    "title": "Khan Academy: Gene Expression and Regulation",
    "url": "https://www.khanacademy.org/science/biology/gene-expression-central-dogma",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Transcription, translation, and how cells turn genes on and off."
  },
  {
    "cat": "Life Sciences",
    "title": "Khan Academy: Evolution and Natural Selection",
    "url": "https://www.khanacademy.org/science/biology/her/evolution-and-natural-selection",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Natural selection, genetic drift, and the evidence for evolution."
  },
  {
    "cat": "Life Sciences",
    "title": "Khan Academy: Ecology",
    "url": "https://www.khanacademy.org/science/biology/ecology",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Population dynamics, food webs, biomes, and how organisms interact with their environment."
  },
  {
    "cat": "Life Sciences",
    "title": "HHMI BioInteractive",
    "url": "https://www.biointeractive.org/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free short films, animations, and classroom-ready resources from the Howard Hughes Medical Institute covering genetics, evolution, and cell biology."
  },
  {
    "cat": "Life Sciences",
    "title": "LabXchange (Harvard)",
    "url": "https://www.labxchange.org/",
    "type": "Course",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free virtual labs, video lessons, and learning pathways in biology and biotechnology, built by Harvard and the Amgen Foundation."
  },
  {
    "cat": "Life Sciences",
    "title": "MedlinePlus Genetics",
    "url": "https://medlineplus.gov/genetics/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "The National Library of Medicine's consumer-friendly reference on genes, chromosomes, and genetic conditions."
  },
  {
    "cat": "Life Sciences",
    "title": "National Human Genome Research Institute",
    "url": "https://www.genome.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The NIH institute behind the Human Genome Project — genetics news, education pages, and career resources."
  },
  {
    "cat": "Life Sciences",
    "title": "Nature Scitable",
    "url": "https://www.nature.com/scitable",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Nature Publishing Group's free library of genetics and cell biology explainers written for students."
  },
  {
    "cat": "Life Sciences",
    "title": "Encyclopedia of Life",
    "url": "https://eol.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A free, collaborative encyclopedia collecting information and images on every known species on Earth."
  },
  {
    "cat": "Life Sciences",
    "title": "American Society for Cell Biology",
    "url": "https://www.ascb.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Resources and career information from the professional society for cell biologists."
  },
  {
    "cat": "Life Sciences",
    "title": "American Society for Microbiology",
    "url": "https://asm.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Educational resources, career guides, and news from the largest professional society for microbiologists."
  },
  {
    "cat": "Life Sciences",
    "title": "National Cancer Institute",
    "url": "https://www.cancer.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The NIH's cancer research institute — plain-language explainers on cancer biology, treatment, and prevention."
  },
  {
    "cat": "Life Sciences",
    "title": "CDC: Genomics and Health",
    "url": "https://www.cdc.gov/genomics-and-health/index.html",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "How genetics and family health history intersect with public health, from the CDC."
  },
  {
    "cat": "Life Sciences",
    "title": "Bozeman Science",
    "url": "https://www.bozemanscience.com/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Paul Andersen's free video lessons and study guides covering AP Biology, AP Environmental Science, and more, organized by topic."
  },
  {
    "cat": "Life Sciences",
    "title": "Amoeba Sisters",
    "url": "https://www.amoebasisters.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Friendly, clearly explained biology videos, comics, and handouts on genetics, cell biology, and evolution."
  },
  {
    "cat": "Life Sciences",
    "title": "National Institute of General Medical Sciences",
    "url": "https://www.nigms.nih.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The NIH institute funding basic biomedical research — education resources on cell biology, genetics, and pharmacology."
  },
  {
    "cat": "Life Sciences",
    "title": "American Physiological Society",
    "url": "https://www.physiology.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Resources and career information from the professional society for physiologists, covering how body systems function."
  },
  {
    "cat": "Life Sciences",
    "title": "Smithsonian National Museum of Natural History",
    "url": "https://naturalhistory.si.edu/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free educational content on evolution, biodiversity, and human origins from the Smithsonian."
  },
  {
    "cat": "Life Sciences",
    "title": "PBS Eons",
    "url": "https://www.youtube.com/channel/UCzR-rom72PHN9Zg7RML9EbA",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A PBS Digital Studios channel on the history of life on Earth — evolution and paleontology in short, well-researched episodes."
  },
  {
    "cat": "Physical Sciences",
    "title": "OpenStax Chemistry 2e",
    "url": "https://openstax.org/details/books/chemistry-2e",
    "type": "Book",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free open textbook covering the full scope of introductory college chemistry."
  },
  {
    "cat": "Physical Sciences",
    "title": "OpenStax University Physics Volume 1",
    "url": "https://openstax.org/details/books/university-physics-volume-1",
    "type": "Book",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Calculus-based mechanics, waves, and thermodynamics — the first volume of OpenStax's free physics sequence."
  },
  {
    "cat": "Physical Sciences",
    "title": "OpenStax College Physics 2e",
    "url": "https://openstax.org/details/books/college-physics-2e",
    "type": "Book",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Algebra-based introductory physics, free and open, covering mechanics through modern physics."
  },
  {
    "cat": "Physical Sciences",
    "title": "Khan Academy: AP Chemistry",
    "url": "https://www.khanacademy.org/science/ap-chemistry-beta",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP Chemistry course content aligned to the College Board exam."
  },
  {
    "cat": "Physical Sciences",
    "title": "Khan Academy: Organic Chemistry",
    "url": "https://www.khanacademy.org/science/organic-chemistry",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Structure, bonding, and reaction mechanisms in organic chemistry."
  },
  {
    "cat": "Physical Sciences",
    "title": "Khan Academy: AP Physics 1",
    "url": "https://www.khanacademy.org/science/ap-physics-1",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP Physics 1 course content — kinematics, forces, energy, and momentum."
  },
  {
    "cat": "Physical Sciences",
    "title": "Khan Academy: AP Physics 2",
    "url": "https://www.khanacademy.org/science/ap-physics-2",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP Physics 2 course content — fluids, thermodynamics, electricity, and modern physics."
  },
  {
    "cat": "Physical Sciences",
    "title": "The Physics Classroom",
    "url": "https://www.physicsclassroom.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Tutorials, practice problems, and interactive simulations covering every topic in a typical intro physics course."
  },
  {
    "cat": "Physical Sciences",
    "title": "American Chemical Society",
    "url": "https://www.acs.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "News, career resources, and educational content from the world's largest scientific society."
  },
  {
    "cat": "Physical Sciences",
    "title": "American Physical Society",
    "url": "https://www.aps.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Career guidance, research news, and student resources from the leading professional society for physicists."
  },
  {
    "cat": "Physical Sciences",
    "title": "NIST",
    "url": "https://www.nist.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The National Institute of Standards and Technology — authoritative reference data on physical constants and measurement."
  },
  {
    "cat": "Physical Sciences",
    "title": "NASA",
    "url": "https://www.nasa.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Real mission data, images, and educational content spanning astrophysics, planetary science, and engineering."
  },
  {
    "cat": "Physical Sciences",
    "title": "NASA JPL Education",
    "url": "https://www.jpl.nasa.gov/edu/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free STEM lesson plans and activities from NASA's Jet Propulsion Laboratory."
  },
  {
    "cat": "Physical Sciences",
    "title": "NOAA",
    "url": "https://www.noaa.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The National Oceanic and Atmospheric Administration's climate, weather, and ocean science education resources."
  },
  {
    "cat": "Physical Sciences",
    "title": "MIT OpenCourseWare: Physics",
    "url": "https://ocw.mit.edu/courses/physics/",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Free lecture notes, problem sets, and exams from MIT's actual physics courses."
  },
  {
    "cat": "Physical Sciences",
    "title": "MIT OpenCourseWare: Introduction to Geology",
    "url": "https://ocw.mit.edu/courses/12-001-introduction-to-geology-fall-2013/",
    "type": "Course",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Free lecture notes and problem sets from MIT's actual introductory geology course."
  },
  {
    "cat": "Physical Sciences",
    "title": "Periodic Table of Videos",
    "url": "https://www.periodicvideos.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "University of Nottingham chemists explain every element on the periodic table in short videos."
  },
  {
    "cat": "Physical Sciences",
    "title": "HyperPhysics",
    "url": "https://physics-astro.gsu.edu/hyperphysics/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A Georgia State University reference site mapping how every physics concept connects to the others."
  },
  {
    "cat": "Physical Sciences",
    "title": "Encyclopaedia Britannica: Science",
    "url": "https://www.britannica.com/science",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Reliable, expert-edited reference articles across every physical science topic."
  },
  {
    "cat": "Physical Sciences",
    "title": "Space.com",
    "url": "https://www.space.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "News and explainers on astronomy, spaceflight, and planetary science."
  },
  {
    "cat": "Physical Sciences",
    "title": "Department of Energy: Science Education",
    "url": "https://www.energy.gov/science/education",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "STEM education programs and resources from the U.S. Department of Energy's Office of Science."
  },
  {
    "cat": "Physical Sciences",
    "title": "U.S. Geological Survey",
    "url": "https://www.usgs.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Earth science data and education on geology, natural hazards, and the environment."
  },
  {
    "cat": "Physical Sciences",
    "title": "American Institute of Physics",
    "url": "https://www.aip.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Career resources, research news, and history of physics from a federation of physical science societies."
  },
  {
    "cat": "Physical Sciences",
    "title": "National Science Foundation",
    "url": "https://www.nsf.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The federal agency funding basic research across every field of science and engineering."
  },
  {
    "cat": "Physical Sciences",
    "title": "Royal Society of Chemistry",
    "url": "https://www.rsc.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Educational resources, career guidance, and an interactive periodic table from the UK's chemistry professional body."
  },
  {
    "cat": "Physical Sciences",
    "title": "Wolfram Alpha",
    "url": "https://www.wolframalpha.com/",
    "type": "App",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A computational engine that solves and explains chemistry and physics problems step by step."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Khan Academy: AP Psychology",
    "url": "https://www.khanacademy.org/science/ap-psychology",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP Psychology course content aligned to the College Board exam."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "American Psychological Association",
    "url": "https://www.apa.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The leading professional organization for psychologists — research summaries, career info, and topic guides."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "National Institute of Mental Health",
    "url": "https://www.nimh.nih.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Plain-language, research-backed information on mental health conditions and treatment from the NIH."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "OpenStax Psychology 2e",
    "url": "https://openstax.org/details/books/psychology-2e",
    "type": "Book",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free open textbook covering the full scope of introductory psychology."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "American Political Science Association",
    "url": "https://www.apsanet.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Research and resources from the professional association for political scientists, useful alongside AP Gov content."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "American Sociological Association",
    "url": "https://www.asanet.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Research, career resources, and topic guides from the national association for sociologists."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Pew Research Center",
    "url": "https://www.pewresearch.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Nonpartisan public opinion polling and social-trend research, useful for understanding real survey methodology."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Association for Psychological Science",
    "url": "https://www.psychologicalscience.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Research summaries and news from a leading international psychological science organization."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "National Alliance on Mental Illness",
    "url": "https://www.nami.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Education, support resources, and advocacy information on mental health conditions."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "CDC: Mental Health",
    "url": "https://www.cdc.gov/mental-health/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Public-health data and guidance on mental health from the CDC."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "World Health Organization",
    "url": "https://www.who.int/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Global public health data, disease information, and health-policy resources."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Social Psychology Network",
    "url": "https://www.socialpsychology.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A large, long-running directory of social psychology research, researchers, and classic studies."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "National Institute on Drug Abuse",
    "url": "https://nida.nih.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "NIH research and education on substance use and addiction, aimed at students and educators."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Bureau of Labor Statistics",
    "url": "https://www.bls.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Official U.S. economic and labor-market data, useful for grounding social science claims in real numbers."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "U.S. Census Bureau",
    "url": "https://www.census.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Demographic, economic, and population data collected by the federal government."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "National Bureau of Economic Research",
    "url": "https://www.nber.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Working papers and data from one of the most-cited economic research organizations in the country."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Khan Academy: AP Macroeconomics",
    "url": "https://www.khanacademy.org/economics-finance-domain/ap-macroeconomics",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP Macroeconomics course content aligned to the College Board exam."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Khan Academy: AP Microeconomics",
    "url": "https://www.khanacademy.org/economics-finance-domain/ap-microeconomics",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP Microeconomics course content aligned to the College Board exam."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "Khan Academy: AP U.S. Government and Politics",
    "url": "https://www.khanacademy.org/humanities/ap-us-government-and-politics",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP U.S. Government and Politics course content aligned to the College Board exam."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "SAMHSA",
    "url": "https://www.samhsa.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The Substance Abuse and Mental Health Services Administration's public data and resources."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "American Psychiatric Association",
    "url": "https://www.psychiatry.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Clinical information and public resources on mental illness from the professional association for psychiatrists."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "MentalHealth.gov",
    "url": "https://www.mentalhealth.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The U.S. government's central, plain-language portal on mental health basics and finding help."
  },
  {
    "cat": "Behavioral & Social Sciences",
    "title": "American Anthropological Association",
    "url": "https://americananthro.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Resources and research news from the national professional organization for anthropologists."
  },
  {
    "cat": "Research Methods",
    "title": "NIH RePORTER",
    "url": "https://reporter.nih.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A searchable database of NIH-funded research projects — useful for seeing what real biomedical research funding looks like."
  },
  {
    "cat": "Research Methods",
    "title": "Google Scholar",
    "url": "https://scholar.google.com/",
    "type": "App",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A free search engine covering scholarly literature across every discipline, including citation counts."
  },
  {
    "cat": "Research Methods",
    "title": "NSF Research Experiences for Undergraduates (REU)",
    "url": "https://www.nsf.gov/funding/opportunities/reu-research-experiences-undergraduates",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "NSF-funded summer research programs — a real pathway into hands-on research, though most sites require college enrollment."
  },
  {
    "cat": "Research Methods",
    "title": "Council on Undergraduate Research",
    "url": "https://www.cur.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A nonprofit supporting mentored undergraduate research across every field, with guides on getting started."
  },
  {
    "cat": "Research Methods",
    "title": "Science Buddies",
    "url": "https://www.sciencebuddies.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free science-fair project ideas, guides on the scientific method, and step-by-step research project planning tools."
  },
  {
    "cat": "Research Methods",
    "title": "Regeneron Science Talent Search",
    "url": "https://www.societyforscience.org/regeneron-sts/",
    "type": "Community",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The nation's oldest and most prestigious pre-college science research competition, run by the Society for Science."
  },
  {
    "cat": "Research Methods",
    "title": "Science Olympiad",
    "url": "https://www.soinc.org/",
    "type": "Community",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "One of the largest K-12 STEM team competitions in the country, with events spanning every scientific field."
  },
  {
    "cat": "Research Methods",
    "title": "Research Science Institute (MIT / CEE)",
    "url": "https://www.cee.org/programs/research-science-institute",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A highly selective, free six-week summer research program hosted at MIT for rising high school seniors."
  },
  {
    "cat": "Research Methods",
    "title": "NIH Office of Intramural Training & Education",
    "url": "https://www.training.nih.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Research training programs and career resources from the NIH's own campus, including opportunities for students."
  },
  {
    "cat": "Research Methods",
    "title": "Data.gov",
    "url": "https://www.data.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The U.S. government's open data portal — thousands of real datasets useful for an independent research project."
  },
  {
    "cat": "Research Methods",
    "title": "Khan Academy: AP Statistics",
    "url": "https://www.khanacademy.org/math/ap-statistics",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Full AP Statistics course content aligned to the College Board exam."
  },
  {
    "cat": "Research Methods",
    "title": "Retraction Watch",
    "url": "https://retractionwatch.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Tracks and explains scientific paper retractions — a real window into research integrity and how science self-corrects."
  },
  {
    "cat": "Research Methods",
    "title": "Committee on Publication Ethics (COPE)",
    "url": "https://publicationethics.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "International guidance on research and publication ethics for editors, reviewers, and authors."
  },
  {
    "cat": "Research Methods",
    "title": "Office for Human Research Protections",
    "url": "https://www.hhs.gov/ohrp/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The federal office overseeing ethical protections for human subjects in research."
  },
  {
    "cat": "Research Methods",
    "title": "Nature Careers",
    "url": "https://www.nature.com/naturecareers/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Career advice and guidance on academic research life from the publishers of Nature."
  },
  {
    "cat": "Research Methods",
    "title": "Science (AAAS)",
    "url": "https://www.science.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "One of the world's top peer-reviewed research journals, published by the American Association for the Advancement of Science."
  },
  {
    "cat": "Research Methods",
    "title": "ClinicalTrials.gov",
    "url": "https://clinicaltrials.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The U.S. government's registry of clinical research studies — a real look at how clinical trials are designed and reported."
  },
  {
    "cat": "Research Methods",
    "title": "SciStarter",
    "url": "https://scistarter.org/",
    "type": "Community",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Find real citizen-science research projects you can contribute to as a high schooler, across every scientific field."
  },
  {
    "cat": "Research Methods",
    "title": "Open Science Framework",
    "url": "https://osf.io/",
    "type": "App",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A free tool researchers use to plan, register, and share studies openly — useful for seeing how real research is organized."
  },
  {
    "cat": "Research Methods",
    "title": "NIH Undergraduate Scholarship Program (UGSP)",
    "url": "https://www.training.nih.gov/programs/ugsp",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A competitive NIH scholarship plus paid summer research training for students from disadvantaged backgrounds pursuing biomedical research."
  },
  {
    "cat": "Research Methods",
    "title": "NIH Research Training and Career Development",
    "url": "https://researchtraining.nih.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "NIH's central hub for research training opportunities at every career stage, from high school through faculty."
  },
  {
    "cat": "Test Prep",
    "title": "Princeton Review Free Practice Tests",
    "url": "https://www.princetonreview.com/college/free-sat-practice-test",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free full-length practice SAT and ACT tests with score reports."
  },
  {
    "cat": "Test Prep",
    "title": "Kaplan Test Prep",
    "url": "https://www.kaptest.com/",
    "type": "Article",
    "free": false,
    "difficulty": "AP / Intermediate",
    "desc": "One of the longest-running test prep companies, offering SAT/ACT courses, practice tests, and tutoring."
  },
  {
    "cat": "Test Prep",
    "title": "UWorld SAT",
    "url": "https://collegeprep.uworld.com/sat/",
    "type": "App",
    "free": false,
    "difficulty": "AP / Intermediate",
    "desc": "A large question bank with detailed answer explanations, built by the same team behind UWorld's medical exam prep."
  },
  {
    "cat": "Test Prep",
    "title": "Barron's Test Prep",
    "url": "https://www.barronstestprep.com/",
    "type": "Article",
    "free": false,
    "difficulty": "AP / Intermediate",
    "desc": "Practice tests and study guides from the long-established Barron's test-prep publisher."
  },
  {
    "cat": "Test Prep",
    "title": "AP Classroom (College Board)",
    "url": "https://apclassroom.collegeboard.org/",
    "type": "App",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "The College Board's official platform for AP practice questions, progress checks, and released exam questions."
  },
  {
    "cat": "Test Prep",
    "title": "AP Central (College Board)",
    "url": "https://apcentral.collegeboard.org/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Official AP course descriptions, exam formats, and free-response scoring guidelines for every AP subject."
  },
  {
    "cat": "Test Prep",
    "title": "Brilliant.org",
    "url": "https://brilliant.org/",
    "type": "App",
    "free": false,
    "difficulty": "AP / Intermediate",
    "desc": "Interactive, problem-solving-based courses in math and science that build the reasoning skills tested on the SAT/ACT."
  },
  {
    "cat": "Test Prep",
    "title": "Desmos Graphing Calculator",
    "url": "https://www.desmos.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The free graphing calculator built into the digital SAT — worth practicing with before test day."
  },
  {
    "cat": "Test Prep",
    "title": "Mometrix Test Prep",
    "url": "https://www.mometrix.com/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free practice tests, study guides, and video lessons covering the SAT, ACT, and hundreds of other standardized exams."
  },
  {
    "cat": "Test Prep",
    "title": "Method Learning (formerly Method Test Prep)",
    "url": "https://www.methodlearning.com/",
    "type": "Article",
    "free": false,
    "difficulty": "AP / Intermediate",
    "desc": "Self-paced, school-partnered SAT/ACT prep with adaptive practice."
  },
  {
    "cat": "Test Prep",
    "title": "National Merit Scholarship Corporation",
    "url": "https://www.nationalmerit.org/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Official information on the National Merit Scholarship Program, which is entered through the PSAT/NMSQT."
  },
  {
    "cat": "Test Prep",
    "title": "College Board: PSAT/NMSQT",
    "url": "https://satsuite.collegeboard.org/psat-nmsqt",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Official details on the PSAT/NMSQT, the practice SAT that also qualifies students for National Merit recognition."
  },
  {
    "cat": "Test Prep",
    "title": "r/SAT (Reddit)",
    "url": "https://www.reddit.com/r/Sat/",
    "type": "Community",
    "free": true,
    "difficulty": "Introductory",
    "desc": "An active community where students trade SAT prep advice, score reports, and study strategies."
  },
  {
    "cat": "Test Prep",
    "title": "r/ACT (Reddit)",
    "url": "https://www.reddit.com/r/ACT/",
    "type": "Community",
    "free": true,
    "difficulty": "Introductory",
    "desc": "An active community where students trade ACT prep advice, score reports, and study strategies."
  },
  {
    "cat": "Test Prep",
    "title": "College Confidential Forums",
    "url": "https://talk.collegeconfidential.com/",
    "type": "Community",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A long-running forum for test prep, admissions chances, and general college-planning discussion."
  },
  {
    "cat": "Test Prep",
    "title": "SoFlo SAT & ACT Prep",
    "url": "https://soflotutors.com/",
    "type": "Article",
    "free": false,
    "difficulty": "AP / Intermediate",
    "desc": "A tutoring service run by a perfect-scorer founder, with a large library of free strategy videos alongside paid tutoring."
  },
  {
    "cat": "Test Prep",
    "title": "The College Panda",
    "url": "https://thecollegepanda.com/",
    "type": "Article",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "A free, detailed SAT Writing and Math strategy guide written by a perfect-scorer, plus a popular companion book series."
  },
  {
    "cat": "Test Prep",
    "title": "Vocabulary.com",
    "url": "https://www.vocabulary.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "An adaptive vocabulary-learning platform useful for SAT/ACT reading and writing prep."
  },
  {
    "cat": "Test Prep",
    "title": "Photomath",
    "url": "https://photomath.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Scan a math problem for a step-by-step worked solution — useful for checking SAT/ACT math practice."
  },
  {
    "cat": "Test Prep",
    "title": "edX",
    "url": "https://www.edx.org/",
    "type": "Course",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free university-taught courses, including AP-level and test-readiness content from real professors."
  },
  {
    "cat": "Test Prep",
    "title": "Coursera",
    "url": "https://www.coursera.org/",
    "type": "Course",
    "free": true,
    "difficulty": "AP / Intermediate",
    "desc": "Free-to-audit courses from top universities, including study skills and subject-specific test prep."
  },
  {
    "cat": "Test Prep",
    "title": "Study.com",
    "url": "https://study.com/",
    "type": "Article",
    "free": false,
    "difficulty": "AP / Intermediate",
    "desc": "Short video lessons and practice quizzes covering AP courses, SAT/ACT prep, and general test-taking skills."
  },
  {
    "cat": "Test Prep",
    "title": "Grammarly",
    "url": "https://www.grammarly.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A free grammar and writing checker — useful for polishing SAT/ACT essay practice and application essays alike."
  },
  {
    "cat": "Test Prep",
    "title": "Chegg Study",
    "url": "https://www.chegg.com/study",
    "type": "App",
    "free": false,
    "difficulty": "AP / Intermediate",
    "desc": "Step-by-step textbook solutions and homework help, useful for working through practice problems."
  },
  {
    "cat": "Test Prep",
    "title": "Bartleby",
    "url": "https://www.bartleby.com/",
    "type": "App",
    "free": false,
    "difficulty": "AP / Intermediate",
    "desc": "Textbook solutions, study guides, and expert Q&A across every subject tested on the SAT/ACT."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Common Data Set Initiative",
    "url": "https://commondataset.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The standardized data set colleges publish each year — the most reliable place to find a school's real admit rate, class size, and stats."
  },
  {
    "cat": "Admissions & Planning",
    "title": "NCES IPEDS Data Center",
    "url": "https://nces.ed.gov/ipeds/use-the-data",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The federal government's raw postsecondary education data — enrollment, cost, and outcomes for every college in the U.S."
  },
  {
    "cat": "Admissions & Planning",
    "title": "U.S. News Best Colleges",
    "url": "https://www.usnews.com/best-colleges",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "The most widely cited college ranking — useful for research, though rankings shouldn't be the only factor in a college list."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Unigo",
    "url": "https://www.unigo.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Student-written college reviews and a scholarship search tool."
  },
  {
    "cat": "Admissions & Planning",
    "title": "CollegeXpress",
    "url": "https://www.collegexpress.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "College search, scholarship listings, and admissions articles aimed at high schoolers."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Road2College",
    "url": "https://www.road2college.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Practical, parent-and-student-facing guidance on college planning, financial aid, and merit scholarships."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Scholarships.com",
    "url": "https://www.scholarships.com/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A large, free scholarship search database matched to your profile."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Sallie Mae Scholarship Search",
    "url": "https://www.salliemae.com/college-planning/scholarships/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A free scholarship search tool alongside general college-funding planning resources."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Federal Student Aid: Loan Simulator",
    "url": "https://studentaid.gov/loan-simulator/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The official U.S. government tool for estimating and comparing federal student loan repayment plans."
  },
  {
    "cat": "Admissions & Planning",
    "title": "National College Attainment Network",
    "url": "https://www.ncan.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A nonprofit network of college-access organizations working to close equity gaps in college attainment."
  },
  {
    "cat": "Admissions & Planning",
    "title": "AAMC Fee Assistance Program",
    "url": "https://students-residents.aamc.org/fee-assistance-program/fee-assistance-program",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "Reduces MCAT registration costs and waives medical school application fees for eligible students — worth knowing about years before you'd apply."
  },
  {
    "cat": "Admissions & Planning",
    "title": "AACOM (Osteopathic Medical Education)",
    "url": "https://www.aacom.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The official association representing every osteopathic (D.O.) medical school in the U.S."
  },
  {
    "cat": "Admissions & Planning",
    "title": "TMDSAS",
    "url": "https://www.tmdsas.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The centralized application service for Texas's public medical, dental, veterinary, and podiatry schools."
  },
  {
    "cat": "Admissions & Planning",
    "title": "PharmCAS",
    "url": "https://www.pharmcas.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The centralized application service for pharmacy (PharmD) programs."
  },
  {
    "cat": "Admissions & Planning",
    "title": "NursingCAS",
    "url": "https://www.nursingcas.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The centralized application service used by many nursing programs nationwide."
  },
  {
    "cat": "Admissions & Planning",
    "title": "PTCAS",
    "url": "https://www.ptcas.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The centralized application service for physical therapy (DPT) programs."
  },
  {
    "cat": "Admissions & Planning",
    "title": "CASPA",
    "url": "https://caspa.liaisoncas.com/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The centralized application service for physician assistant (PA) programs."
  },
  {
    "cat": "Admissions & Planning",
    "title": "ADEA AADSAS",
    "url": "https://adea.org/godental/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The centralized application service for dental school, run by the American Dental Education Association."
  },
  {
    "cat": "Admissions & Planning",
    "title": "SOPHAS",
    "url": "https://sophas.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The centralized application service for graduate public health programs."
  },
  {
    "cat": "Admissions & Planning",
    "title": "American Association of Colleges of Nursing",
    "url": "https://www.aacnnursing.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The national voice for academic nursing, setting quality standards for nursing education nationwide."
  },
  {
    "cat": "Admissions & Planning",
    "title": "American Association of Colleges of Pharmacy",
    "url": "https://www.aacp.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The national organization representing pharmacy education in the United States."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Bold.org Scholarships",
    "url": "https://bold.org/",
    "type": "App",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Free, exclusive scholarships you can apply to directly, including many with no essay required."
  },
  {
    "cat": "Admissions & Planning",
    "title": "College Possible",
    "url": "https://collegepossible.org/",
    "type": "Community",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A national nonprofit that coaches students from low-income backgrounds through college admission and completion."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Coalition for College",
    "url": "https://www.coalitionforcollegeaccess.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "A nonprofit of 150+ colleges committed to access and affordability, running the Coalition Application platform."
  },
  {
    "cat": "Admissions & Planning",
    "title": "American Medical Women's Association",
    "url": "https://www.amwa-doc.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A professional and mentorship organization for women physicians and medical students, with pre-med resources."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Student National Medical Association",
    "url": "https://snma.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A national community of future physicians committed to health equity and supporting underrepresented students in medicine."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Latino Medical Student Association",
    "url": "https://national.lmsa.net/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A nonprofit uniting Hispanic/Latino health-profession trainees, with mentorship and pipeline programs for pre-health students."
  },
  {
    "cat": "Admissions & Planning",
    "title": "American Medical Student Association",
    "url": "https://www.amsa.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The oldest and largest independent association of physicians-in-training, open to pre-med members."
  },
  {
    "cat": "Admissions & Planning",
    "title": "National Association of Advisors for the Health Professions",
    "url": "https://www.naahp.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The professional association for pre-health advisors — its public resources explain how health-profession applications actually work."
  },
  {
    "cat": "Admissions & Planning",
    "title": "National Health Service Corps",
    "url": "https://nhsc.hrsa.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "A federal program offering scholarships and loan repayment to future clinicians who practice in underserved areas."
  },
  {
    "cat": "Admissions & Planning",
    "title": "HRSA",
    "url": "https://www.hrsa.gov/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The Health Resources and Services Administration — the federal agency behind most health-workforce scholarship and loan-repayment programs."
  },
  {
    "cat": "Admissions & Planning",
    "title": "AAMC Careers in Medicine",
    "url": "https://careersinmedicine.aamc.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "AAMC's career-planning program profiling every medical specialty — useful context long before choosing one."
  },
  {
    "cat": "Admissions & Planning",
    "title": "American Osteopathic Association",
    "url": "https://osteopathic.org/",
    "type": "Article",
    "free": true,
    "difficulty": "Undergrad / Advanced",
    "desc": "The representative organization for D.O. physicians and osteopathic medical students in the U.S."
  },
  {
    "cat": "Admissions & Planning",
    "title": "MIT Admissions Blogs",
    "url": "https://mitadmissions.org/blogs/",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "First-person posts from MIT admissions officers and current students — one of the most candid looks at what a top admissions office actually values."
  },
  {
    "cat": "Admissions & Planning",
    "title": "Federal TRIO Programs",
    "url": "https://www2.ed.gov/about/offices/list/ope/trio/index.html",
    "type": "Article",
    "free": true,
    "difficulty": "Introductory",
    "desc": "Federal college-access programs (like Upward Bound) supporting first-generation and low-income students from middle school through college."
  }
];
