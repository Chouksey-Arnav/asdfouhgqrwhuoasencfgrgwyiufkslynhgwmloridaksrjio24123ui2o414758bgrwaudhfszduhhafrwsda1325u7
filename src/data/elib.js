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
  }
];
