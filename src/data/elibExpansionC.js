// ELIB expansion batch C — a third real, human-verified batch spanning all
// nine existing library categories (Life Sciences, Physical Sciences,
// Behavioral & Social Sciences, Research Methods, Test Prep, Admissions &
// Planning, Clinical Exposure, Wellness & Balance, Math & Data).
//
// Verification checklist applied to every entry below (same bar as
// elib.js/elibExtra.js/elibExpansionA.js/elibExpansionB.js — see elib.js's
// header for the full history of why this bar exists):
//   1. The URL is a canonical .gov/.edu/established nonprofit, test-maker,
//      publisher, or long-standing educational-platform domain — no
//      shortlinks, no personal blogs, no domain that isn't independently
//      recognizable on sight.
//   2. The resource is publicly accessible without a login/paywall, matching
//      its `free:true` claim (a "freemium" product with a real, substantial
//      free tier — e.g. Khan Academy's model — qualifies; a subscription
//      product with only a trial does not, and was left out rather than
//      mis-marked).
//   3. Title/desc accurately describes what's actually at that URL — no
//      templated/generic titles (the exact anti-pattern already purged once
//      from this file, see elib.js's header comment).
//   4. No duplicate title or URL against elib.js, elibExtra.js,
//      elibExpansionA.js, or elibExpansionB.js, and no duplicate within this
//      file. Checked programmatically (not just by memory): this batch was
//      first drafted at ~107 entries, cross-checked against all 576 existing
//      titles/URLs, and every entry that collided with something already in
//      the library (a large fraction — the existing library already covers
//      most of the obvious canonical sources) was removed rather than kept
//      as a near-duplicate. What remains below is 100% net-new, then topped
//      back up past the "100+ new resources" target with a second round of
//      WebSearch-verified additions (mostly NIH institutes, national health
//      nonprofits, and university open-courseware not yet represented).
//   5. No individual YouTube `ytId` entries in this batch — this sandbox
//      cannot reach youtube.com's oEmbed endpoint to verify a video id
//      resolves (see elib.js's own note on this), so this batch sticks
//      entirely to Article/Book/Course/App/Community/Podcast entries whose
//      canonical URL is the organization's own stable domain.

export const ELIB_EXPANSION_C = [
  // ───────────────────────────── LIFE SCIENCES ─────────────────────────────
  { cat:'Life Sciences', title:"Understanding Evolution", url:'https://evolution.berkeley.edu/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:"UC Berkeley's clear, well-organized primer on how evolution works and the evidence behind it." },
  { cat:'Life Sciences', title:"Smithsonian's Human Origins Program", url:'https://humanorigins.si.edu/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The Smithsonian\'s deep dive into human evolution, the fossil record, and what makes us human.' },
  { cat:'Life Sciences', title:'CK-12 Life Science FlexBook', url:'https://www.ck12.org/life-science/', type:'Book', free:true, difficulty:'Introductory', desc:'A free, modular life science textbook covering cells, genetics, ecology, and human body systems at an introductory level.' },
  { cat:'Life Sciences', title:'Khan Academy AP Environmental Science', url:'https://www.khanacademy.org/science/ap-environmental-science', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Full AP Environmental Science course content aligned to the College Board exam framework.' },
  { cat:'Life Sciences', title:'Smithsonian Ocean Portal', url:'https://ocean.si.edu/', type:'Article', free:true, difficulty:'Introductory', desc:"The Smithsonian's public education site on marine biology, ocean ecosystems, and ocean science." },
  { cat:'Life Sciences', title:'Bozeman Science', url:'https://www.bozemanscience.com/', type:'Course', free:true, difficulty:'AP / Intermediate', desc:'A well-known free science education site with organized lessons covering AP Biology, Chemistry, Physics, and Environmental Science.' },
  { cat:'Life Sciences', title:'eBird', url:'https://ebird.org/', type:'App', free:true, difficulty:'Introductory', desc:"The Cornell Lab of Ornithology's free citizen-science platform for logging bird sightings — real field-biology data collection anyone can join." },
  { cat:'Life Sciences', title:'BioDigital Human', url:'https://www.biodigital.com/human', type:'App', free:true, difficulty:'AP / Intermediate', desc:'A free interactive 3D human anatomy visualization tool letting you explore body systems layer by layer.' },
  { cat:'Life Sciences', title:'Open Learning Initiative (Carnegie Mellon)', url:'https://oli.cmu.edu/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'Free, self-paced online courses from Carnegie Mellon covering anatomy, physiology, biology, and biochemistry.' },
  { cat:'Life Sciences', title:'Science Friday', url:'https://www.sciencefriday.com/', type:'Podcast', free:true, difficulty:'Introductory', desc:'A long-running public-radio science program and podcast covering biology, medicine, and research news in an accessible way.' },

  // ──────────────────────────── PHYSICAL SCIENCES ──────────────────────────
  { cat:'Physical Sciences', title:'CK-12 Physics FlexBook', url:'https://www.ck12.org/physics/', type:'Book', free:true, difficulty:'AP / Intermediate', desc:'A free, modular physics textbook covering mechanics, energy, waves, and electricity at an AP-adjacent level.' },
  { cat:'Physical Sciences', title:'CK-12 Earth Science FlexBook', url:'https://www.ck12.org/earth-science/', type:'Book', free:true, difficulty:'Introductory', desc:'A free earth science textbook covering geology, meteorology, oceanography, and astronomy basics.' },
  { cat:'Physical Sciences', title:'CK-12 Chemistry FlexBook', url:'https://www.ck12.org/chemistry/', type:'Book', free:true, difficulty:'AP / Intermediate', desc:'A free, modular chemistry textbook covering atomic structure, bonding, reactions, and stoichiometry.' },
  { cat:'Physical Sciences', title:'CK-12 Astronomy FlexBook', url:'https://www.ck12.org/astronomy/', type:'Book', free:true, difficulty:'Introductory', desc:'A free astronomy textbook covering the solar system, stars, and cosmology at an introductory level.' },
  { cat:'Physical Sciences', title:'OpenStax Astronomy 2e', url:'https://openstax.org/details/books/astronomy-2e', type:'Book', free:true, difficulty:'Undergrad / Advanced', desc:'A free, comprehensive college-level astronomy textbook covering the solar system, stars, and the universe.' },
  { cat:'Physical Sciences', title:'NASA Climate — Climate Change and Global Warming', url:'https://climate.nasa.gov/', type:'Article', free:true, difficulty:'Introductory', desc:"NASA's public education site on climate science, backed by real satellite and research data." },
  { cat:'Physical Sciences', title:'NASA Solar System Exploration', url:'https://solarsystem.nasa.gov/', type:'Article', free:true, difficulty:'Introductory', desc:"NASA's public education site on planetary science and space exploration, built on real mission data." },
  { cat:'Physical Sciences', title:'USGS Education', url:'https://www.usgs.gov/educational-resources', type:'Article', free:true, difficulty:'Introductory', desc:'Free educational resources from the U.S. Geological Survey on earth science, geology, and natural hazards.' },
  { cat:'Physical Sciences', title:'NOAA Education', url:'https://www.noaa.gov/education', type:'Article', free:true, difficulty:'Introductory', desc:'Free educational resources on weather, climate, and ocean science from the National Oceanic and Atmospheric Administration.' },
  { cat:'Physical Sciences', title:'Khan Academy AP Chemistry', url:'https://www.khanacademy.org/science/ap-chemistry', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Full AP Chemistry course content aligned to the College Board exam framework.' },
  { cat:'Physical Sciences', title:'Khan Academy Cosmology and Astronomy', url:'https://www.khanacademy.org/science/cosmology-and-astronomy', type:'Article', free:true, difficulty:'Introductory', desc:'Free lessons on the origins of the universe, stars, galaxies, and space-time.' },
  { cat:'Physical Sciences', title:'American Museum of Natural History OLogy', url:'https://www.amnh.org/explore/ology', type:'Article', free:true, difficulty:'Introductory', desc:"The American Museum of Natural History's free science site for students, covering earth science, biology, and astronomy." },
  { cat:'Physical Sciences', title:'American Physical Society', url:'https://www.aps.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional society for physicists, with free public-facing resources on physics careers and research.' },
  { cat:'Physical Sciences', title:'American Chemical Society', url:'https://www.acs.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional society for chemists, with free student resources on chemistry education and careers.' },
  { cat:'Physical Sciences', title:'Radiolab', url:'https://radiolab.org/', type:'Podcast', free:true, difficulty:'Introductory', desc:'A long-running public-radio show and podcast exploring science, physics, and big ideas through storytelling.' },

  // ───────────────────── BEHAVIORAL & SOCIAL SCIENCES ──────────────────────
  { cat:'Behavioral & Social Sciences', title:'Khan Academy Psychology (MCAT prep track)', url:'https://www.khanacademy.org/test-prep/mcat/behavior', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Khan Academy\'s psychology and behavioral-science content, covering the biological basis of behavior, cognition, and social psychology.' },
  { cat:'Behavioral & Social Sciences', title:'National Institute of Mental Health', url:'https://www.nimh.nih.gov/', type:'Article', free:true, difficulty:'Introductory', desc:'The federal mental-health research agency\'s public education pages on mental health conditions and the science behind them.' },
  { cat:'Behavioral & Social Sciences', title:'OER Project — Big History Project', url:'https://www.oerproject.com/', type:'Course', free:true, difficulty:'Introductory', desc:'A free, full course tracing human and social history from the Big Bang to today, built for high school classrooms.' },
  { cat:'Behavioral & Social Sciences', title:'CommonLit', url:'https://www.commonlit.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A free library of leveled nonfiction and literary reading passages, including many on psychology and social issues.' },
  { cat:'Behavioral & Social Sciences', title:'Newsela', url:'https://newsela.com/', type:'Article', free:true, difficulty:'Introductory', desc:'Current-events articles rewritten at multiple reading levels, with a free tier covering science and social-studies topics.' },
  { cat:'Behavioral & Social Sciences', title:'Khan Academy AP U.S. Government and Politics', url:'https://www.khanacademy.org/humanities/ap-us-government-and-politics', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Full AP U.S. Government and Politics course content aligned to the College Board exam framework.' },
  { cat:'Behavioral & Social Sciences', title:'Khan Academy AP U.S. History', url:'https://www.khanacademy.org/humanities/ap-us-history', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Full AP U.S. History course content aligned to the College Board exam framework.' },
  { cat:'Behavioral & Social Sciences', title:'OpenStax U.S. History', url:'https://openstax.org/details/books/us-history', type:'Book', free:true, difficulty:'AP / Intermediate', desc:'A free, comprehensive U.S. history textbook from the colonial era through the modern day.' },
  { cat:'Behavioral & Social Sciences', title:'Open Yale Courses', url:'https://oyc.yale.edu/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'Free full video lecture courses from Yale professors across psychology, history, and the social sciences — no registration required.' },
  { cat:'Behavioral & Social Sciences', title:'The Story Collider', url:'https://www.storycollider.org/', type:'Podcast', free:true, difficulty:'Introductory', desc:'A podcast where scientists and everyday people tell true, personal stories about how science has shaped their lives.' },

  // ───────────────────────────── RESEARCH METHODS ──────────────────────────
  { cat:'Research Methods', title:'Science Buddies', url:'https://www.sciencebuddies.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A free resource for designing a science fair project, from picking a topic to writing up results using real scientific method steps.' },
  { cat:'Research Methods', title:'OpenIntro Statistics', url:'https://www.openintro.org/book/os/', type:'Book', free:true, difficulty:'AP / Intermediate', desc:'A free, widely-used open-source statistics textbook covering the inferential methods behind interpreting research data.' },
  { cat:'Research Methods', title:'Society for Science', url:'https://www.societyforscience.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The nonprofit behind Regeneron ISEF and the Science Talent Search — free guidance on designing and presenting an independent research project.' },
  { cat:'Research Methods', title:'Cochrane Library', url:'https://www.cochranelibrary.com/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The home of Cochrane systematic reviews — the gold standard for how evidence-based medicine actually evaluates treatments.' },
  { cat:'Research Methods', title:'NIGMS Biomedical Beat Blog', url:'https://biobeat.nigms.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:"The National Institute of General Medical Sciences' blog explaining real, current biomedical research in accessible terms." },
  { cat:'Research Methods', title:'OSF (Open Science Framework)', url:'https://osf.io/', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'A free platform from the Center for Open Science supporting transparent, reproducible research — a real look at how modern research is shared and verified.' },
  { cat:'Research Methods', title:'National Science Foundation', url:'https://www.nsf.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The federal agency funding basic scientific research, with public-facing science news and student resources.' },
  { cat:'Research Methods', title:'This Podcast Will Kill You', url:'https://thispodcastwillkillyou.com/', type:'Podcast', free:true, difficulty:'AP / Intermediate', desc:'Two epidemiologists break down the science, history, and research behind infectious diseases, episode by episode.' },

  // ─────────────────────────────── TEST PREP ───────────────────────────────
  { cat:'Test Prep', title:'College Board SAT Suite of Assessments', url:'https://satsuite.collegeboard.org/', type:'Article', free:true, difficulty:'Introductory', desc:'The official College Board hub for the digital SAT and PSAT, including registration, scoring, and practice resources.' },
  { cat:'Test Prep', title:'Official ACT Test Prep', url:'https://www.act.org/content/act/en/products-and-services/the-act/test-prep.html', type:'Article', free:true, difficulty:'Introductory', desc:'Free official ACT practice tests, sample questions, and test-day guidance directly from ACT, Inc.' },

  // ────────────────────────── ADMISSIONS & PLANNING ────────────────────────
  { cat:'Admissions & Planning', title:'My Next Move', url:'https://www.mynextmove.org/', type:'App', free:true, difficulty:'Introductory', desc:'A free, student-friendly career exploration tool (built on U.S. Department of Labor O*NET data) that matches interests to real career paths.' },
  { cat:'Admissions & Planning', title:'BLS Occupational Outlook Handbook — Healthcare', url:'https://www.bls.gov/ooh/healthcare/home.htm', type:'Article', free:true, difficulty:'Introductory', desc:'The federal government\'s official data on pay, education requirements, and job outlook for every healthcare occupation.' },
  { cat:'Admissions & Planning', title:'Khan Academy Personal Finance', url:'https://www.khanacademy.org/college-careers-more/personal-finance', type:'Article', free:true, difficulty:'Introductory', desc:'A free course covering budgeting, loans, and paying for college — directly useful alongside financial aid planning.' },
  { cat:'Admissions & Planning', title:'Federal TRIO Programs', url:'https://www.ed.gov/grants-and-programs/grants-higher-education/federal-trio-programs', type:'Article', free:true, difficulty:'Introductory', desc:'The U.S. Department of Education\'s official page on TRIO — free federal outreach programs supporting first-generation and low-income students into college.' },
  { cat:'Admissions & Planning', title:'College Possible', url:'https://www.collegepossible.org/', type:'Community', free:true, difficulty:'Introductory', desc:'A national nonprofit providing free near-peer coaching for college admissions and financial aid to students from low-income backgrounds.' },
  { cat:'Admissions & Planning', title:'Road2College', url:'https://www.road2college.com/', type:'Article', free:true, difficulty:'Introductory', desc:'A free, family-facing resource with practical articles on college costs, financial aid strategy, and the admissions process.' },

  // ────────────────────────────── CLINICAL EXPOSURE ────────────────────────
  { cat:'Clinical Exposure', title:'FDA — Center for Drug Evaluation and Research', url:'https://www.fda.gov/about-fda/center-drug-evaluation-and-research-cder', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'How the FDA reviews and approves new medications — useful grounding for students interested in pharmacy or pharmacology.' },
  { cat:'Clinical Exposure', title:'American Red Cross — Take a Class', url:'https://www.redcross.org/take-a-class', type:'Article', free:true, difficulty:'Introductory', desc:'The official Red Cross hub for finding local CPR, First Aid, and lifeguarding certification classes.' },
  { cat:'Clinical Exposure', title:'American Heart Association', url:'https://www.heart.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Free patient-education resources on cardiovascular disease, stroke, and heart-healthy living from the leading U.S. cardiovascular nonprofit.' },
  { cat:'Clinical Exposure', title:'American Cancer Society', url:'https://www.cancer.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Free, thorough patient-education resources on cancer types, treatment, and prevention from the national cancer nonprofit.' },
  { cat:'Clinical Exposure', title:'American Diabetes Association', url:'https://diabetes.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Free patient-education resources on diabetes management, prevention, and research from the leading diabetes nonprofit.' },
  { cat:'Clinical Exposure', title:'American Lung Association', url:'https://www.lung.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Free patient-education resources on asthma, lung disease, and respiratory health.' },
  { cat:'Clinical Exposure', title:"Alzheimer's Association", url:'https://www.alz.org/', type:'Article', free:true, difficulty:'Introductory', desc:"Free patient- and caregiver-facing education on Alzheimer's disease and dementia." },
  { cat:'Clinical Exposure', title:'National Eye Institute', url:'https://www.nei.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute focused on vision research and public education on eye health and disease.' },
  { cat:'Clinical Exposure', title:'National Institute of Neurological Disorders and Stroke', url:'https://www.ninds.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute focused on brain and nervous system disorders, with public education on neurological conditions.' },
  { cat:'Clinical Exposure', title:'National Heart, Lung, and Blood Institute', url:'https://www.nhlbi.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute focused on cardiovascular, lung, and blood disease research and public education.' },
  { cat:'Clinical Exposure', title:'National Institute on Drug Abuse', url:'https://nida.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute focused on the science of substance use and addiction, with public education resources for teens and educators.' },
  { cat:'Clinical Exposure', title:'National Institute on Alcohol Abuse and Alcoholism', url:'https://www.niaaa.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute focused on alcohol-related research, with public health education resources.' },
  { cat:'Clinical Exposure', title:'Genetic and Rare Diseases Information Center (GARD)', url:'https://rarediseases.info.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'An NIH-run, free reference on thousands of genetic and rare diseases, written for patients and the public.' },

  // ─────────────────────────────── WELLNESS & BALANCE ──────────────────────
  { cat:'Wellness & Balance', title:'Mental Health America', url:'https://www.mhanational.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A national nonprofit offering free mental-health screening tools and educational resources.' },
  { cat:'Wellness & Balance', title:'Sleep Education (American Academy of Sleep Medicine)', url:'https://sleepeducation.org/', type:'Article', free:true, difficulty:'Introductory', desc:'The medical specialty society\'s free public education site on healthy sleep habits and sleep disorders.' },
  { cat:'Wellness & Balance', title:'Anxiety and Depression Association of America', url:'https://adaa.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A nonprofit dedicated to anxiety and depression education, prevention, and treatment, with free public resources.' },
  { cat:'Wellness & Balance', title:'HelpGuide', url:'https://www.helpguide.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A long-standing free, nonprofit mental-health and wellness information site covering stress, sleep, and emotional health.' },
  { cat:'Wellness & Balance', title:'Harvard Health Publishing', url:'https://www.health.harvard.edu/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:"Harvard Medical School's public health-education arm, with free articles translating medical research into practical guidance." },

  // ───────────────────────────────── MATH & DATA ───────────────────────────
  { cat:'Math & Data', title:'Desmos', url:'https://www.desmos.com/', type:'App', free:true, difficulty:'Introductory', desc:'A free, widely-used graphing calculator and math-visualization tool, useful across algebra, statistics, and calculus.' },
  { cat:'Math & Data', title:'Kaggle Learn', url:'https://www.kaggle.com/learn', type:'Course', free:true, difficulty:'AP / Intermediate', desc:'Free, hands-on micro-courses in data science, statistics, and machine learning basics.' },
  { cat:'Math & Data', title:'Code.org', url:'https://code.org/', type:'Course', free:true, difficulty:'Introductory', desc:'A free platform teaching computer science fundamentals through structured, self-paced courses for all skill levels.' },
  { cat:'Math & Data', title:'CS50 (Harvard, via edX)', url:'https://cs50.harvard.edu/x/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:"Harvard's famous introduction to computer science and programming — free to take at your own pace." },
  { cat:'Math & Data', title:'StatTrek', url:'https://stattrek.com/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A free online statistics reference and tutorial site covering probability, distributions, and AP Statistics topics.' },
  { cat:'Math & Data', title:'Khan Academy AP Computer Science Principles', url:'https://www.khanacademy.org/computing/ap-computer-science-principles', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Full AP Computer Science Principles course content aligned to the College Board exam framework.' },
  { cat:'Math & Data', title:'MIT OpenCourseWare', url:'https://ocw.mit.edu/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'Free, complete MIT course materials — lecture notes, problem sets, and exams — spanning math, statistics, and computer science.' },
  { cat:'Math & Data', title:'Project Euler', url:'https://projecteuler.net/', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'A free archive of challenging math/programming problems designed to be solved with code — a fun stretch for strong math students.' },
  { cat:'Math & Data', title:'Khan Academy AP Precalculus', url:'https://www.khanacademy.org/math/ap-precalculus', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Full AP Precalculus course content aligned to the College Board exam framework.' },
  { cat:'Math & Data', title:'W3Schools', url:'https://www.w3schools.com/', type:'Course', free:true, difficulty:'Introductory', desc:'A free, beginner-friendly reference and tutorial site for learning to code — useful for students exploring health informatics or biostatistics.' },
  { cat:'Math & Data', title:'Photomath', url:'https://photomath.com/', type:'App', free:true, difficulty:'Introductory', desc:'A free app that scans a math problem and walks through the step-by-step solution — useful for checking work, not just getting answers.' },

  // ── Round 3 — pathway-specific professional bodies & OER platforms ───────
  { cat:'Admissions & Planning', title:'National Council of State Boards of Nursing (NCLEX)', url:'https://www.ncsbn.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The organization that develops the NCLEX nursing licensure exam — useful for understanding what nursing licensure actually requires.' },
  { cat:'Admissions & Planning', title:'American Association of Colleges of Nursing', url:'https://www.aacnnursing.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The national voice for university and four-year nursing education, with free resources on nursing degree pathways.' },
  { cat:'Admissions & Planning', title:'American Society of Health-System Pharmacists', url:'https://www.ashp.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional home for pharmacists who work in hospitals and health systems, with career-path resources for future pharmacists.' },
  { cat:'Admissions & Planning', title:'American Association of Colleges of Pharmacy', url:'https://www.aacp.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The national organization representing pharmacy education, with free resources on choosing and preparing for a PharmD program.' },
  { cat:'Admissions & Planning', title:'National Association of Boards of Pharmacy', url:'https://nabp.pharmacy/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The organization coordinating pharmacy licensure standards across all 50 states.' },
  { cat:'Admissions & Planning', title:'PharmCAS', url:'https://www.pharmcas.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The centralized application service for PharmD programs — useful for understanding the pharmacy-school application timeline early.' },
  { cat:'Admissions & Planning', title:'American College of Healthcare Executives', url:'https://www.ache.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional society for healthcare administration leaders, with free resources on the health-management career path.' },
  { cat:'Admissions & Planning', title:'Medical Group Management Association', url:'https://www.mgma.com/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A leading association for medical practice administration and management professionals.' },
  { cat:'Admissions & Planning', title:'American College of Physicians', url:'https://www.acponline.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The largest medical specialty society in the U.S. (internal medicine), with free public resources on the physician career path.' },
  { cat:'Admissions & Planning', title:'American Academy of Family Physicians', url:'https://www.aafp.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The national association for family medicine physicians, with free resources on primary care as a career path.' },
  { cat:'Admissions & Planning', title:'American Psychiatric Association', url:'https://www.psychiatry.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional organization for psychiatrists (distinct from the American Psychological Association), with resources on psychiatry as a medical specialty.' },

  { cat:'Clinical Exposure', title:'National Institute of Arthritis and Musculoskeletal and Skin Diseases', url:'https://www.niams.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute focused on arthritis, bone, muscle, and skin disease research and public education.' },
  { cat:'Clinical Exposure', title:'National Institute of Dental and Craniofacial Research', url:'https://www.nidcr.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute focused on oral, dental, and craniofacial health research — a strong resource for students interested in dentistry.' },
  { cat:'Clinical Exposure', title:'CDC Foundation', url:'https://www.cdcfoundation.org/', type:'Article', free:true, difficulty:'Introductory', desc:"The CDC's independent nonprofit partner, with free public-health storytelling and program resources distinct from cdc.gov itself." },
  { cat:'Clinical Exposure', title:'American Society for Biochemistry and Molecular Biology', url:'https://www.asbmb.org/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'A scientific society for biochemists and molecular biologists, with free student and career resources.' },
  { cat:'Clinical Exposure', title:'Federation of American Societies for Experimental Biology', url:'https://www.faseb.org/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'An umbrella organization for biological and biomedical research societies, with public science-policy and education resources.' },

  { cat:'Math & Data', title:'freeCodeCamp', url:'https://www.freecodecamp.org/', type:'Course', free:true, difficulty:'Introductory', desc:'A free, project-based coding curriculum covering web development, data analysis, and more, with optional certifications.' },
  { cat:'Math & Data', title:'Saylor Academy', url:'https://www.saylor.org/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'A nonprofit offering free, self-paced college-level courses across math, computer science, and the sciences.' },
  { cat:'Math & Data', title:'Lumen Learning', url:'https://courses.lumenlearning.com/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'Free, openly-licensed college course materials covering statistics, biology, and other introductory subjects.' },
  { cat:'Math & Data', title:'edX', url:'https://www.edx.org/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'A large platform of free-to-audit university courses (Harvard, MIT, and more) across math, computer science, and data science.' },

  { cat:'Life Sciences', title:'The Biology Corner', url:'https://www.biologycorner.com/', type:'Article', free:true, difficulty:'Introductory', desc:'A long-running, free biology teacher resource site with clear worksheets and explainers on core high school biology topics.' },
];
