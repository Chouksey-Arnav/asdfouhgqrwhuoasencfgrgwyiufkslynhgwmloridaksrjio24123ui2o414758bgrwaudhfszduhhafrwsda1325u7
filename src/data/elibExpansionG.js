// ELIB expansion batch G — an eighth verified batch layered on top of
// elib.js + elibExtra.js + elibExpansionA.js..F.js (961 entries combined
// before this file, spanning nine categories).
//
// Why this batch exists: a fresh audit against category balance (Test Prep,
// Wellness & Balance, Behavioral & Social Sciences, and Math & Data were the
// thinnest of the nine) and against real, structural gaps in the library's
// coverage turned up several concrete openings:
//   1. Accessibility/inclusion was entirely absent — zero prior entries on
//      testing accommodations, learning differences (ADHD/dyslexia), or
//      access programs for undocumented, foster, or first-gen students,
//      despite the app framing itself around planning and admissions.
//   2. Nutrition and physical-activity resources were nearly absent (a
//      single MyPlate entry in Wellness & Balance for the whole library).
//   3. Disease-specific patient/advocacy organizations followed an
//      established pattern (Alzheimer's Association, American Diabetes
//      Association, National Kidney Foundation, etc. already in Clinical
//      Exposure) but stopped well short of the major national orgs a
//      pre-health student is likely to shadow, volunteer with, or research
//      (autoimmune disease, IBD, cystic fibrosis, Down syndrome, blood
//      cancer, Parkinson's, rare disease broadly, disability services).
//   4. Named national student science competitions beyond Regeneron
//      ISEF/STS and iGEM (USA Biolympiad, ExploraVision, Genes in Space)
//      had no entries at all.
//   5. Practical tooling gaps: no SQL/spreadsheet/Python-for-beginners
//      resources in Math & Data, no lab-protocol or image-analysis tools in
//      Research Methods, no free graphing-calculator guidebook anywhere.
//   6. A same-org symmetry gap in Life Sciences: the MCAT-track Khan Academy
//      pages for Chemistry and Psychology already existed elsewhere in the
//      library, but not the parallel path for Biology.
//   7. Honor societies and professional associations existed for medicine,
//      dentistry, and several allied-health fields, but not yet for nursing
//      (Sigma) or pharmacy (Rho Chi, AAPS, NCPA).
// Every entry below is a canonical URL for a real, currently-active
// institution, government agency, accredited nonprofit, or established
// educational project, individually confirmed via web search (this sandbox
// cannot reach most of these domains directly to hit them live) rather than
// assumed from memory. Two candidates researched for this batch were
// deliberately excluded as no longer live/current: the NCSBN Learning
// Extension NCLEX-RN question bank (acquired and folded into a paid
// Princeton Review product, no longer a free standalone resource) and the
// Junior Science and Humanities Symposium (suspended nationally as of
// October 2025). Two disease-advocacy orgs are listed under their current,
// post-rebrand names — Breakthrough T1D (formerly JDRF) and Blood Cancer
// United (formerly the Leukemia & Lymphoma Society) — since their old names
// no longer resolve to the organizations' primary branding.
// Checked programmatically against the full combined ELIB array for
// duplicate titles and duplicate URLs before being wired in; see elib.js
// for the single merged `ELIB` export.

export const ELIB_EXPANSION_G = [
  // ─────────────────────────────── ADMISSIONS & PLANNING ───────────────────────────────
  { cat:'Admissions & Planning', title:'College Board — Services for Students with Disabilities (SSD)', url:'https://accommodations.collegeboard.org/', type:'Article', free:true, difficulty:'Introductory', desc:'How to request and manage testing accommodations for the PSAT, SAT, and AP Exams for students with disabilities, IEPs, or 504 plans.' },
  { cat:'Admissions & Planning', title:'ACT — Test Accessibility and Accommodations', url:'https://www.act.org/content/act/en/products-and-services/the-act/registration/accommodations.html', type:'Article', free:true, difficulty:'Introductory', desc:'The official process for requesting accommodations on the ACT, including documentation requirements.' },
  { cat:'Admissions & Planning', title:'Immigrants Rising', url:'https://immigrantsrising.org/resources/', type:'Article', free:true, difficulty:'Introductory', desc:'College, career, and mental-health resources built specifically for undocumented students, including those pursuing health careers.' },
  { cat:'Admissions & Planning', title:'Foster Care to Success', url:'https://www.fc2success.org/', type:'Community', free:true, difficulty:'Introductory', desc:'Scholarships, mentoring, and college-transition support for current and former foster youth.' },
  { cat:'Admissions & Planning', title:'Healthy People 2030 (ODPHP)', url:'https://odphp.health.gov/healthypeople', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The federal government\'s national public-health objectives and data — foundational reading for anyone exploring a public-health career.' },
  { cat:'Admissions & Planning', title:'The Joint Commission', url:'https://www.jointcommission.org/en-us', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The nation\'s largest healthcare accreditor, setting the quality and safety standards hospitals and health systems are measured against.' },
  { cat:'Admissions & Planning', title:'Sigma — International Honor Society of Nursing', url:'https://www.sigmanursing.org/', type:'Community', free:true, difficulty:'Introductory', desc:'The global honor society recognizing academic and professional achievement in nursing.' },
  { cat:'Admissions & Planning', title:'Rho Chi Society', url:'https://rhochi.org/', type:'Community', free:true, difficulty:'Introductory', desc:'The international pharmacy honor society recognizing scholastic achievement in the pharmaceutical sciences.' },
  { cat:'Admissions & Planning', title:'American Association of Pharmaceutical Scientists (AAPS)', url:'https://www.aaps.org/', type:'Community', free:true, difficulty:'Undergrad / Advanced', desc:'Professional society for pharmaceutical scientists working in drug discovery, development, and regulation.' },
  { cat:'Admissions & Planning', title:'National Community Pharmacists Association (NCPA)', url:'https://ncpa.org/', type:'Community', free:true, difficulty:'Introductory', desc:'The voice of independent community pharmacy, representing pharmacist-owners across the country.' },
  { cat:'Admissions & Planning', title:'Pathways to Science', url:'https://www.pathwaystoscience.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A free, searchable database of STEM research, mentoring, and funding programs, with an emphasis on broadening participation.' },
  { cat:'Admissions & Planning', title:'SkillsUSA', url:'https://www.skillsusa.org/', type:'Community', free:true, difficulty:'Introductory', desc:'A career and technical student organization with a dedicated Health Science career pathway and national competitions.' },
  { cat:'Admissions & Planning', title:'Jack Kent Cooke Foundation', url:'https://www.jkcf.org/', type:'Community', free:true, difficulty:'Introductory', desc:'Scholarships and advising for high-achieving students with financial need, from 8th grade through graduate school.' },
  { cat:'Admissions & Planning', title:'The Gates Scholarship', url:'https://www.thegatesscholarship.org/', type:'Community', free:true, difficulty:'Introductory', desc:'A highly selective, full-cost-of-attendance scholarship for outstanding high school seniors from low-income backgrounds.' },
  { cat:'Admissions & Planning', title:'American School Counselor Association (ASCA)', url:'https://www.schoolcounselor.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Resources on the school counselor\'s role in academic planning, college readiness, and social-emotional support.' },
  { cat:'Admissions & Planning', title:'HRSA Bureau of Health Workforce', url:'https://bhw.hrsa.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The federal agency that funds health-career scholarships, loan repayment, and workforce placement in underserved communities.' },
  { cat:'Admissions & Planning', title:'Coca-Cola Scholars Foundation', url:'https://www.coca-colascholarsfoundation.org/', type:'Community', free:true, difficulty:'Introductory', desc:'One of the largest achievement-based scholarship programs for high school seniors, judged on leadership and service.' },
  { cat:'Admissions & Planning', title:'Dell Scholars Program', url:'https://www.dellscholars.org/', type:'Community', free:true, difficulty:'Introductory', desc:'Scholarships and ongoing coaching for students who have overcome significant obstacles to pursue a college degree.' },
  { cat:'Admissions & Planning', title:'Hispanic Scholarship Fund', url:'https://www.hsf.net/', type:'Community', free:true, difficulty:'Introductory', desc:'The nation\'s largest Hispanic scholarship organization, also offering career and internship resources.' },
  { cat:'Admissions & Planning', title:'UNCF', url:'https://uncf.org/', type:'Community', free:true, difficulty:'Introductory', desc:'Scholarships, internships, and mentoring supporting students at historically Black colleges and universities.' },
  { cat:'Admissions & Planning', title:'American Indian Science and Engineering Society (AISES)', url:'https://aises.org/', type:'Community', free:true, difficulty:'Introductory', desc:'Scholarships and STEM programming supporting Indigenous students, including those pursuing health careers.' },
  { cat:'Admissions & Planning', title:'Point Foundation', url:'https://pointfoundation.org/', type:'Community', free:true, difficulty:'Introductory', desc:'Scholarships and mentorship for LGBTQ+ students, including community-college and first-gen access tracks.' },
  { cat:'Admissions & Planning', title:'American Association of University Women (AAUW)', url:'https://www.aauw.org/', type:'Community', free:true, difficulty:'Introductory', desc:'Fellowships, grants, and local scholarships supporting women pursuing higher education and research careers.' },
  { cat:'Admissions & Planning', title:'Hispanic Association of Colleges and Universities (HACU)', url:'https://www.hacu.net/', type:'Community', free:true, difficulty:'AP / Intermediate', desc:'The national association representing Hispanic-Serving Institutions, with student programs and internship pipelines.' },
  { cat:'Admissions & Planning', title:'Ron Brown Scholar Program', url:'https://ronbrown.org/', type:'Community', free:true, difficulty:'Introductory', desc:'A scholarship and leadership program for African American high school seniors with a strong record of service.' },
  { cat:'Admissions & Planning', title:'Elks National Foundation — Most Valuable Student Scholarship', url:'https://www.elks.org/scholars/', type:'Community', free:true, difficulty:'Introductory', desc:'A merit- and need-based scholarship program awarding hundreds of four-year college scholarships every year.' },

  // ─────────────────────────────── WELLNESS & BALANCE ───────────────────────────────
  { cat:'Wellness & Balance', title:'Understood.org', url:'https://www.understood.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Free, expert-designed resources for students and families navigating ADHD, dyslexia, and other learning and thinking differences.' },
  { cat:'Wellness & Balance', title:'CHADD', url:'https://chadd.org/', type:'Community', free:true, difficulty:'Introductory', desc:'The national resource on ADHD, offering education, webinars, and support for students and families.' },
  { cat:'Wellness & Balance', title:'Nutrition.gov', url:'https://www.nutrition.gov/', type:'Article', free:true, difficulty:'Introductory', desc:'A USDA-run hub of evidence-based nutrition information, from meal planning to food safety.' },
  { cat:'Wellness & Balance', title:'EatRight.org', url:'https://www.eatright.org/', type:'Article', free:true, difficulty:'Introductory', desc:'The Academy of Nutrition and Dietetics\' consumer nutrition site, with practical guidance from registered dietitians.' },
  { cat:'Wellness & Balance', title:'ACE Fitness — Exercise Library', url:'https://www.acefitness.org/resources/everyone/exercise-library/', type:'App', free:true, difficulty:'Introductory', desc:'A free, searchable library of exercises with proper-form instructions from the American Council on Exercise.' },
  { cat:'Wellness & Balance', title:'President\'s Council on Sports, Fitness & Nutrition', url:'https://odphp.health.gov/pcsfn', type:'Article', free:true, difficulty:'Introductory', desc:'The federal advisory council promoting youth sports participation and healthy, active living.' },
  { cat:'Wellness & Balance', title:'Erika\'s Lighthouse', url:'https://erikaslighthouse.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Free, school-based depression education and suicide-prevention curricula for teens.' },
  { cat:'Wellness & Balance', title:'NAMI On Campus', url:'https://www.nami.org/kids-teens-and-young-adults/youth-and-young-adult-resources/nami-on-campus/', type:'Community', free:true, difficulty:'Introductory', desc:'Student-led high school and college mental-health awareness clubs affiliated with NAMI.' },
  { cat:'Wellness & Balance', title:'Sources of Strength', url:'https://sourcesofstrength.org/', type:'Community', free:true, difficulty:'Introductory', desc:'A peer-leader, strengths-based suicide-prevention program used in middle and high schools nationwide.' },

  // ─────────────────────────────── TEST PREP ───────────────────────────────
  { cat:'Test Prep', title:'MyAP — AP Classroom (College Board)', url:'https://myap.collegeboard.org/', type:'App', free:true, difficulty:'AP / Intermediate', desc:'The official College Board portal for AP students — practice questions, progress checks, and AP Daily videos tied to each course.' },
  { cat:'Test Prep', title:'ETS POWERPREP Online', url:'https://www.ets.org/gre/test-takers/general-test/prepare/powerprep.html', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'Official, free full-length GRE practice tests straight from the test maker.' },
  { cat:'Test Prep', title:'Mometrix Academy (YouTube)', url:'https://www.youtube.com/@MometrixAcademy', type:'Course', free:true, difficulty:'AP / Intermediate', desc:'Free tutorial videos covering math, science, English, and dozens of standardized tests.' },
  { cat:'Test Prep', title:'DSST Exams', url:'https://getcollegecredit.com/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'A credit-by-examination program letting motivated students earn real college credit outside the traditional classroom.' },

  // ─────────────────────────────── MATH & DATA ───────────────────────────────
  { cat:'Math & Data', title:'TI-84 Graphing Calculator Guidebooks (Texas Instruments)', url:'https://education.ti.com/en/product-resources/guidebooks/graphing-calculators', type:'App', free:true, difficulty:'Introductory', desc:'Free official guidebooks for the TI-84 family of calculators used on the SAT, ACT, and AP Math and Science exams.' },
  { cat:'Math & Data', title:'SQLBolt', url:'https://sqlbolt.com/', type:'App', free:true, difficulty:'Introductory', desc:'Free, interactive lessons that teach SQL directly in the browser — a practical skill for working with research data.' },
  { cat:'Math & Data', title:'Programming for Everybody (Getting Started with Python) — Coursera', url:'https://www.coursera.org/learn/python', type:'Course', free:true, difficulty:'Introductory', desc:'University of Michigan\'s beginner-friendly introduction to Python programming, free to audit.' },
  { cat:'Math & Data', title:'GCFGlobal — Google Sheets', url:'https://edu.gcfglobal.org/en/googlesheets/', type:'Course', free:true, difficulty:'Introductory', desc:'Free, self-paced tutorials on building spreadsheets, formulas, and charts in Google Sheets.' },
  { cat:'Math & Data', title:'GitHub Student Developer Pack', url:'https://education.github.com/pack', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'Free access to professional developer and data tools for verified students, from cloud credits to code editors.' },
  { cat:'Math & Data', title:'MIT OpenCourseWare — Linear Algebra (18.06)', url:'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'Gilbert Strang\'s widely-used full MIT linear algebra course, free with video lectures and problem sets.' },
  { cat:'Math & Data', title:'MIT OpenCourseWare — Differential Equations (18.03)', url:'https://ocw.mit.edu/courses/18-03-differential-equations-spring-2010/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'A complete MIT differential equations course with lecture videos, notes, and exams.' },
  { cat:'Math & Data', title:'MIT OpenCourseWare — Multivariable Calculus (18.02)', url:'https://ocw.mit.edu/courses/18-02-multivariable-calculus-fall-2007/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'MIT\'s full multivariable calculus course, the natural next step after AP Calculus BC.' },
  { cat:'Math & Data', title:'Project Jupyter', url:'https://jupyter.org/', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'The free, open-source notebook environment used across scientific computing and data analysis.' },

  // ─────────────────────────────── PHYSICAL SCIENCES ───────────────────────────────
  { cat:'Physical Sciences', title:'NASA — Eyes on Exoplanets', url:'https://eyes.nasa.gov/apps/exo/', type:'App', free:true, difficulty:'Introductory', desc:'An interactive 3D tool for exploring thousands of confirmed exoplanets and their host stars.' },
  { cat:'Physical Sciences', title:'NOAA — JetStream Online Weather School', url:'https://www.noaa.gov/jetstream', type:'Article', free:true, difficulty:'Introductory', desc:'The National Weather Service\'s free, illustrated online course on how weather actually works.' },
  { cat:'Physical Sciences', title:'Bozeman Science — AP Environmental Science Playlist', url:'https://www.youtube.com/playlist?list=PLllVwaZQkS2qK4Z6xBVDRak8an1-kqsgm', type:'Course', free:true, difficulty:'AP / Intermediate', desc:'Paul Andersen\'s full video series aligned to the AP Environmental Science curriculum.' },
  { cat:'Physical Sciences', title:'Bozeman Science — AP Physics 2 Video List', url:'http://www.bozemanscience.com/ap-physics-2-video-list', type:'Course', free:true, difficulty:'AP / Intermediate', desc:'Paul Andersen\'s video series covering the AP Physics 2 curriculum — fluids, thermodynamics, electricity, and modern physics.' },
  { cat:'Physical Sciences', title:'USGS Volcano Hazards Program', url:'https://www.usgs.gov/programs/VHP', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Real-time monitoring data and hazard education from the agency that tracks U.S. volcanic activity.' },
  { cat:'Physical Sciences', title:'PhET — Coulomb\'s Law', url:'https://phet.colorado.edu/en/simulations/coulombs-law', type:'App', free:true, difficulty:'AP / Intermediate', desc:'An interactive simulation for visualizing how charge and distance affect electrostatic force.' },
  { cat:'Physical Sciences', title:'PhET — Gas Properties', url:'https://phet.colorado.edu/en/simulations/gas-properties', type:'App', free:true, difficulty:'AP / Intermediate', desc:'A simulation for exploring the ideal gas law by changing volume, temperature, and pressure directly.' },
  { cat:'Physical Sciences', title:'PhET — Energy Forms and Changes', url:'https://phet.colorado.edu/en/simulations/energy-forms-and-changes', type:'App', free:true, difficulty:'Introductory', desc:'An interactive simulation for exploring heat transfer and energy conservation across materials.' },
  { cat:'Physical Sciences', title:'US Physics Team / USA Physics Olympiad (AAPT)', url:'https://aapt.org/physicsteam/PT-landing.cfm', type:'Community', free:true, difficulty:'Undergrad / Advanced', desc:'The national physics competition (F=ma and USAPhO exams) that selects the U.S. team for the International Physics Olympiad.' },

  // ─────────────────────────────── LIFE SCIENCES ───────────────────────────────
  { cat:'Life Sciences', title:'Zygote Body', url:'https://www.zygotebody.com/', type:'App', free:true, difficulty:'AP / Intermediate', desc:'A free, interactive 3D human anatomy viewer — peel back systems layer by layer in the browser.' },
  { cat:'Life Sciences', title:'Nucleus Medical Media (YouTube)', url:'https://www.youtube.com/@nucleusmedicalmedia', type:'Course', free:true, difficulty:'Introductory', desc:'The most-watched medical animation channel on YouTube, explaining conditions and procedures visually.' },
  { cat:'Life Sciences', title:'Big Picture (Wellcome / STEM Learning)', url:'https://www.stem.org.uk/big-picture', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Wellcome Trust\'s archive of free biology articles, animations, and posters covering the post-16 curriculum.' },
  { cat:'Life Sciences', title:'Ask a Geneticist (Stanford / The Tech Interactive)', url:'https://genetics.thetech.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Real genetics questions from students answered by Stanford geneticists, in plain language.' },
  { cat:'Life Sciences', title:'DNA from the Beginning', url:'https://dnaftb.org/', type:'Article', free:true, difficulty:'Introductory', desc:'An animated primer walking through 75 landmark experiments that built modern genetics, from Cold Spring Harbor\'s DNA Learning Center.' },
  { cat:'Life Sciences', title:'The Jackson Laboratory — Genetics Learning Resources', url:'https://www.jax.org/education-and-learning/high-school-students-and-undergraduates/teaching-the-genome-generation/stem-learning-resources', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Free genetics and genomics lessons and lab protocols built for high school classrooms.' },
  { cat:'Life Sciences', title:'Khan Academy — MCAT Biomolecules (Foundation 1)', url:'https://www.khanacademy.org/test-prep/mcat/biomolecules', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'The biomolecules foundation of Khan Academy\'s free MCAT collection — the biology/biochemistry counterpart to the physics and psychology MCAT tracks already in this library.' },

  // ─────────────────────────────── RESEARCH METHODS ───────────────────────────────
  { cat:'Research Methods', title:'protocols.io', url:'https://www.protocols.io/', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'A free, open-access repository where scientists publish and share step-by-step lab protocols.' },
  { cat:'Research Methods', title:'NIH Office of Laboratory Animal Welfare (OLAW)', url:'https://olaw.nih.gov/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'Federal guidance on the ethical treatment of animals in research — the animal-research counterpart to the Belmont Report.' },
  { cat:'Research Methods', title:'ImageJ', url:'https://imagej.net/', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'Free, NIH-developed image-analysis software used across biology and medicine to measure and process microscopy images.' },
  { cat:'Research Methods', title:'Genes in Space', url:'https://www.genesinspace.org/', type:'Community', free:true, difficulty:'AP / Intermediate', desc:'A free national biotech competition for grades 7-12 where winning experiments are run aboard the ISS.' },
  { cat:'Research Methods', title:'ExploraVision', url:'https://www.exploravision.org/', type:'Community', free:true, difficulty:'Introductory', desc:'Toshiba and NSTA\'s K-12 science competition challenging student teams to design the future of technology.' },
  { cat:'Research Methods', title:'USA Biolympiad (USABO)', url:'https://www.cee.org/programs/usa-biolympiad', type:'Community', free:true, difficulty:'AP / Intermediate', desc:'The national biology exam series that selects the U.S. team for the International Biology Olympiad.' },

  // ─────────────────────────────── BEHAVIORAL & SOCIAL SCIENCES ───────────────────────────────
  { cat:'Behavioral & Social Sciences', title:'OpenStax — World History, Volume 1: to 1500', url:'https://openstax.org/details/books/world-history-volume-1', type:'Book', free:true, difficulty:'Introductory', desc:'A free, peer-reviewed world history textbook covering ancient civilizations through 1500 CE.' },
  { cat:'Behavioral & Social Sciences', title:'OpenStax — World History, Volume 2: from 1400', url:'https://openstax.org/details/books/world-history-volume-2', type:'Book', free:true, difficulty:'Introductory', desc:'The second volume of OpenStax\'s free world history textbook, covering 1400 to the present.' },
  { cat:'Behavioral & Social Sciences', title:'Crash Course World History — Full Series', url:'https://www.youtube.com/playlist?list=PLaHVE04GYpbthnXayQoJ19K9JzcCVDxS_', type:'Course', free:true, difficulty:'Introductory', desc:'John Green\'s 42-episode world history series, based on the AP World History curriculum.' },
  { cat:'Behavioral & Social Sciences', title:'National Constitution Center — Interactive Constitution', url:'https://constitutioncenter.org/the-constitution/about-the-interactive-constitution', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Nonpartisan, clause-by-clause analysis of the U.S. Constitution written by scholars from across the political spectrum.' },
  { cat:'Behavioral & Social Sciences', title:'OpenStax — Introduction to Philosophy', url:'https://openstax.org/details/books/introduction-philosophy', type:'Book', free:true, difficulty:'Introductory', desc:'A free introductory philosophy textbook covering logic, ethics, metaphysics, and epistemology.' },

  // ─────────────────────────────── CLINICAL EXPOSURE ───────────────────────────────
  { cat:'Clinical Exposure', title:'National Center for Advancing Translational Sciences (NCATS)', url:'https://ncats.nih.gov/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The NIH institute focused on speeding the translation of research discoveries into real treatments.' },
  { cat:'Clinical Exposure', title:'NIH Clinical Center', url:'https://www.cc.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The nation\'s largest hospital devoted entirely to clinical research, with an active patient-participant registry.' },
  { cat:'Clinical Exposure', title:'Global Brigades', url:'https://medical.globalbrigades.org/', type:'Community', free:false, difficulty:'Undergrad / Advanced', desc:'Structured, ethics-first medical volunteer trips for pre-health students to under-resourced communities abroad.' },
  { cat:'Clinical Exposure', title:'Lions Clubs International', url:'https://www.lionsclubs.org/', type:'Community', free:true, difficulty:'Introductory', desc:'A global service organization with free student vision-screening and sight-related volunteer programs.' },
  { cat:'Clinical Exposure', title:'Crohn\'s & Colitis Foundation', url:'https://www.crohnscolitisfoundation.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Patient education and research updates on inflammatory bowel disease.' },
  { cat:'Clinical Exposure', title:'Cystic Fibrosis Foundation', url:'https://www.cff.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Disease information, research news, and patient resources for cystic fibrosis.' },
  { cat:'Clinical Exposure', title:'Arthritis Foundation', url:'https://www.arthritis.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Patient-facing education, research funding, and advocacy for the country\'s leading cause of disability.' },
  { cat:'Clinical Exposure', title:'Muscular Dystrophy Association', url:'https://www.mda.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Patient services and disease education for muscular dystrophy, ALS, and other neuromuscular conditions.' },
  { cat:'Clinical Exposure', title:'Breakthrough T1D (formerly JDRF)', url:'https://www.breakthrought1d.org/', type:'Article', free:true, difficulty:'Introductory', desc:'The leading type 1 diabetes research and advocacy organization.' },
  { cat:'Clinical Exposure', title:'National Down Syndrome Society', url:'https://ndss.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Resources on Down syndrome spanning health, education, and community across the lifespan.' },
  { cat:'Clinical Exposure', title:'Blood Cancer United (formerly LLS)', url:'https://www.lls.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Research funding and patient support for leukemia, lymphoma, and myeloma.' },
  { cat:'Clinical Exposure', title:'Parkinson\'s Foundation', url:'https://www.parkinson.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Patient education, care resources, and research updates for Parkinson\'s disease.' },
  { cat:'Clinical Exposure', title:'CDC — Learn the Signs. Act Early.', url:'https://www.cdc.gov/act-early/index.html', type:'Article', free:true, difficulty:'Introductory', desc:'Free child-development milestone checklists and screening resources from ages 2 months to 5 years.' },
  { cat:'Clinical Exposure', title:'St. Jude Children\'s Research Hospital', url:'https://www.stjude.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A pediatric research hospital treating catastrophic childhood diseases at no cost to families.' },
  { cat:'Clinical Exposure', title:'National Association of Free & Charitable Clinics (NAFC)', url:'https://nafcclinics.org/', type:'Community', free:true, difficulty:'AP / Intermediate', desc:'The national network of free and charitable clinics serving medically underserved communities — a common shadowing and volunteer setting.' },
  { cat:'Clinical Exposure', title:'Susan G. Komen', url:'https://www.komen.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Breast cancer research funding, education, and patient support.' },
  { cat:'Clinical Exposure', title:'Autism Speaks', url:'https://www.autismspeaks.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Resources, screening tools, and advocacy for autism spectrum disorder.' },
  { cat:'Clinical Exposure', title:'Prevent Blindness', url:'https://preventblindness.org/', type:'Article', free:true, difficulty:'Introductory', desc:'The nation\'s leading volunteer eye-health and vision-safety organization.' },
  { cat:'Clinical Exposure', title:'National Bleeding Disorders Foundation', url:'https://www.bleeding.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Patient education and research on hemophilia and other bleeding disorders (formerly the National Hemophilia Foundation).' },
  { cat:'Clinical Exposure', title:'Autoimmune Association', url:'https://autoimmune.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Patient advocacy and education spanning the 100-plus recognized autoimmune diseases (formerly AARDA).' },
  { cat:'Clinical Exposure', title:'United Cerebral Palsy', url:'https://ucp.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Services, advocacy, and resources for people with cerebral palsy and other disabilities.' },
  { cat:'Clinical Exposure', title:'Easterseals', url:'https://www.easterseals.com/', type:'Article', free:true, difficulty:'Introductory', desc:'One of the country\'s largest disability-services networks, spanning therapy, employment, and caregiver support.' },
  { cat:'Clinical Exposure', title:'Mended Hearts', url:'https://www.mendedhearts.org/', type:'Community', free:true, difficulty:'Introductory', desc:'An American Heart Association-affiliated peer-support network for heart-disease patients and families.' },
  { cat:'Clinical Exposure', title:'American Foundation for the Blind', url:'https://afb.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Research, advocacy, and resources supporting people who are blind or have low vision.' },
  { cat:'Clinical Exposure', title:'National Organization for Rare Disorders (NORD)', url:'https://rarediseases.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A patient-advocacy umbrella organization covering thousands of individually rare diseases and their care networks.' },
];
