// All non-quiz, non-elib constants

// ── LEARNING PATHS ────────────────────────────────────────────────────────────
// Interest-based study tracks for college-bound high schoolers. "Pre-Health" is
// an opt-in career-exploration track, not the default — the default track is
// "Undecided / Exploring" so a new user isn't assumed into any single career path.
export const PATHS = {
  undecided: {
    label:'Exploring / Undecided', accent:'#64748b', quizCats:['Life Sciences','Physical Sciences','Behavioral & Social Sciences'],
    tagline:'Keep every door open while you figure out what excites you.',
    overview:'You don\'t need a declared major to get into a great college — you need strong fundamentals and evidence that you can think clearly across subjects. This pathway builds a balanced foundation in math, reading/writing, and science so that whichever major you eventually pick (in high school or your first undecided year of undergrad), you\'re not starting from behind. It\'s the default track for students who want to keep exploring rather than lock in early.',
    highlights:[
      'A balanced core across math, verbal reasoning, and science — the exact mix colleges and the SAT/ACT test',
      'Freedom to sample STEM, humanities, business, and social-science content before committing to one',
      'A stronger, more flexible application profile if you haven\'t settled on an intended major yet',
      'A natural on-ramp into any other pathway here once your interests sharpen',
    ],
    outcomes:['Undeclared / General Studies','Liberal Arts (any concentration)','Any major requiring strong SAT/ACT scores'],
    bestFor:['You genuinely don\'t know what you want to study yet','You want to keep your options as wide as possible','You\'d rather build broad strength than specialize early'],
    units:[
      { id:'ud1', title:'Core Math Review', quizCat:'Physical Sciences', lessons:[
        { id:'ud1l1', title:'Algebra II Essentials', url:'https://www.khanacademy.org/math/algebra2', src:'Khan Academy' },
        { id:'ud1l2', title:'Precalculus Foundations', url:'https://www.khanacademy.org/math/precalculus', src:'Khan Academy' },
        { id:'ud1l3', title:'Statistics & Data Basics', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
      ]},
      { id:'ud2', title:'SAT Reading & Writing', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ud2l1', title:'SAT Reading & Writing Practice', url:'https://www.khanacademy.org/test-prep/sat', src:'Khan Academy' },
        { id:'ud2l2', title:'Grammar & Usage Essentials', url:'https://www.khanacademy.org/test-prep/sat', src:'Khan Academy' },
        { id:'ud2l3', title:'Essay Writing Fundamentals', url:'https://owl.purdue.edu/owl/general_writing/index.html', src:'Purdue OWL' },
      ]},
      { id:'ud3', title:'Science Survey', quizCat:'Life Sciences', lessons:[
        { id:'ud3l1', title:'Biology Fundamentals', url:'https://www.khanacademy.org/science/biology', src:'Khan Academy' },
        { id:'ud3l2', title:'Chemistry Fundamentals', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'ud3l3', title:'Physics Fundamentals', url:'https://www.khanacademy.org/science/physics', src:'Khan Academy' },
      ]},
    ]
  },
  stem: {
    label:'STEM & Engineering', accent:'#3b82f6', quizCats:['Life Sciences','Physical Sciences'],
    tagline:'For students who want to build, calculate, and solve technical problems.',
    overview:'This pathway sharpens the math and science reasoning that STEM and engineering majors lean on from day one of freshman year — functions, problem-solving under time pressure, and the physics/chemistry fundamentals that show up on both the SAT/ACT and in intro college coursework. It\'s built for students heading toward engineering, computer science, math, or the physical sciences, where a strong quantitative foundation in high school translates directly into a smoother first year of undergrad.',
    highlights:[
      'Deep practice in algebra, precalculus, and trigonometry — the math tested on the SAT/ACT and required for calculus-based intro STEM courses',
      'Chemistry and physics fundamentals that mirror what engineering and CS majors take freshman year',
      'An introduction to programming logic, useful whether or not you\'ve coded before',
      'Strong Physical Sciences and Life Sciences quiz performance, the sections that matter most for STEM-focused admissions',
    ],
    outcomes:['Computer Science','Mechanical / Electrical / Civil Engineering','Mathematics','Physics','Data Science'],
    bestFor:['You like problems with a clear, provable answer','You\'re drawn to building things — apps, robots, systems','You want a technical major that rewards quantitative skill'],
    units:[
      { id:'st1', title:'Algebra II & Precalculus', quizCat:'Physical Sciences', lessons:[
        { id:'st1l1', title:'Functions & Graphing', url:'https://www.khanacademy.org/math/algebra2', src:'Khan Academy' },
        { id:'st1l2', title:'Polynomial & Rational Functions', url:'https://www.khanacademy.org/math/algebra2', src:'Khan Academy' },
        { id:'st1l3', title:'Trigonometry Basics', url:'https://www.khanacademy.org/math/precalculus', src:'Khan Academy' },
      ]},
      { id:'st2', title:'Chemistry & Physics Core', quizCat:'Physical Sciences', lessons:[
        { id:'st2l1', title:'Chemical Reactions & Stoichiometry', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'st2l2', title:'Motion, Forces & Energy', url:'https://www.khanacademy.org/science/physics', src:'Khan Academy' },
        { id:'st2l3', title:'Electricity & Circuits', url:'https://www.khanacademy.org/science/physics', src:'Khan Academy' },
      ]},
      { id:'st3', title:'AP Science & Intro Programming', quizCat:'Life Sciences', lessons:[
        { id:'st3l1', title:'AP Biology Review', url:'https://www.khanacademy.org/science/ap-biology', src:'Khan Academy' },
        { id:'st3l2', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
        { id:'st3l3', title:'Intro to Computer Science', url:'https://www.khanacademy.org/computing/computer-science', src:'Khan Academy' },
      ]},
    ]
  },
  humanities: {
    label:'Humanities & Writing', accent:'#8b5cf6', quizCats:['Behavioral & Social Sciences'],
    tagline:'For students who think in arguments, stories, and ideas.',
    overview:'This pathway trains the close reading, persuasive writing, and historical/civic reasoning that humanities majors and strong college essayists rely on. It\'s aimed at students who want to sharpen their voice and their thinking — through literature, history, government, and rhetoric — before heading into majors like English, history, political science, or pre-law tracks, where the ability to build a clear written argument matters more than any single test score.',
    highlights:[
      'Advanced reading comprehension and rhetorical analysis — directly boosts SAT/ACT Reading & Writing scores',
      'U.S. and world history depth that strengthens both classroom performance and college essay material',
      'A structured approach to essay writing that carries over to the college application essay itself',
      'Practice building and defending an argument, a core skill for humanities, law, and journalism paths',
    ],
    outcomes:['English / Literature','History','Political Science','Pre-Law','Journalism & Communications'],
    bestFor:['You\'d rather write an essay than solve an equation','You\'re curious about why things happened, not just what happened','You want a major built around reading, discussion, and argument'],
    units:[
      { id:'hu1', title:'Reading & Rhetoric', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'hu1l1', title:'SAT Reading & Writing Practice', url:'https://www.khanacademy.org/test-prep/sat', src:'Khan Academy' },
        { id:'hu1l2', title:'Analyzing Arguments & Rhetoric', url:'https://www.khanacademy.org/test-prep/sat', src:'Khan Academy' },
        { id:'hu1l3', title:'Grammar & Usage Essentials', url:'https://www.khanacademy.org/test-prep/sat', src:'Khan Academy' },
      ]},
      { id:'hu2', title:'U.S. & World History', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'hu2l1', title:'U.S. History Overview', url:'https://www.khanacademy.org/humanities/us-history', src:'Khan Academy' },
        { id:'hu2l2', title:'World History Overview', url:'https://www.khanacademy.org/humanities/world-history', src:'Khan Academy' },
        { id:'hu2l3', title:'Government & Civics', url:'https://www.khanacademy.org/humanities/us-government-and-civics', src:'Khan Academy' },
      ]},
      { id:'hu3', title:'Essay Writing & Composition', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'hu3l1', title:'The College Essay & Narrative Voice', url:'https://owl.purdue.edu/owl/general_writing/index.html', src:'Purdue OWL' },
        { id:'hu3l2', title:'Persuasive Writing Techniques', url:'https://owl.purdue.edu/owl/general_writing/index.html', src:'Purdue OWL' },
        { id:'hu3l3', title:'Literary Analysis Basics', url:'https://www.khanacademy.org/humanities', src:'Khan Academy' },
      ]},
    ]
  },
  business: {
    label:'Business & Economics', accent:'#f59e0b', quizCats:['Physical Sciences','Behavioral & Social Sciences'],
    tagline:'For students who want to understand markets, money, and how organizations work.',
    overview:'This pathway blends quantitative reasoning with economics, leadership, and communication — the mix that undergraduate business schools and economics departments expect incoming students to already have some comfort with. It\'s built for students eyeing majors like business administration, finance, marketing, or economics, where being fluent in statistics, market logic, and public speaking gives you a head start over classmates encountering it for the first time freshman year.',
    highlights:[
      'Micro- and macroeconomic reasoning that shows up in both SAT/ACT passages and intro college econ courses',
      'Statistics and data literacy — core to business analytics, finance, and any data-driven major',
      'Leadership and communication practice (public speaking, teamwork, negotiation) that group-project-heavy business programs reward',
      'A strong foundation for case-based and quantitative-reasoning admissions interviews',
    ],
    outcomes:['Business Administration','Finance','Economics','Marketing','Entrepreneurship'],
    bestFor:['You\'re interested in how companies and markets actually work','You like leading teams and pitching ideas','You want a major that mixes numbers with people skills'],
    units:[
      { id:'bz1', title:'Micro & Macroeconomics', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'bz1l1', title:'Supply, Demand & Markets', url:'https://www.khanacademy.org/economics-finance-domain/microeconomics', src:'Khan Academy' },
        { id:'bz1l2', title:'Macroeconomic Indicators', url:'https://www.khanacademy.org/economics-finance-domain/macroeconomics', src:'Khan Academy' },
        { id:'bz1l3', title:'Personal Finance Basics', url:'https://www.khanacademy.org/college-careers-more/personal-finance', src:'Khan Academy' },
      ]},
      { id:'bz2', title:'Statistics & Data for Business', quizCat:'Physical Sciences', lessons:[
        { id:'bz2l1', title:'Descriptive Statistics', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'bz2l2', title:'Probability Fundamentals', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'bz2l3', title:'Reading Charts & Data Sets', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
      ]},
      { id:'bz3', title:'Leadership & Communication', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'bz3l1', title:'Public Speaking Fundamentals', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'bz3l2', title:'Teamwork & Group Projects', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'bz3l3', title:'Negotiation Basics', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  socialSci: {
    label:'Social Sciences', accent:'#10b981', quizCats:['Behavioral & Social Sciences'],
    tagline:'For students fascinated by why people think, act, and organize the way they do.',
    overview:'This pathway builds the psychology, sociology, and research-methods literacy that social-science majors need — how studies are designed, how bias creeps into data, and how individuals behave in groups. It\'s aimed at students considering psychology, sociology, criminal justice, or public policy, where understanding both human behavior and how to responsibly study it is the foundation of nearly every intro course.',
    highlights:[
      'Core psychology concepts (cognition, learning, development) tested on the SAT/ACT and used throughout intro psych courses',
      'Sociology and research-methods grounding — study design, bias, and statistics applied to real social questions',
      'Civics and current-events fluency that strengthens both classroom discussion and college interviews',
      'A head start on the statistical reasoning social-science majors need for research methods requirements',
    ],
    outcomes:['Psychology','Sociology','Criminal Justice','Public Policy','Social Work'],
    bestFor:['You\'re endlessly curious about why people do what they do','You like reading and interpreting studies, not just numbers','You want a major centered on people, communities, and behavior'],
    units:[
      { id:'ss1', title:'Psychology Foundations', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ss1l1', title:'Social Psychology & Cognition', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOPRKzVLY0jJY-uHOH9KVU6', src:'Crash Course' },
        { id:'ss1l2', title:'Learning Theory & Memory', url:'https://www.khanacademy.org/science/ap-psychology/behavior', src:'Khan Academy' },
        { id:'ss1l3', title:'Personality & Development', url:'https://www.khanacademy.org/science/ap-psychology/personality', src:'Khan Academy' },
      ]},
      { id:'ss2', title:'Sociology & Research Methods', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ss2l1', title:'Social Stratification & Inequality', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtMJ-AfB_7J1538YKWkZAnGA', src:'Crash Course' },
        { id:'ss2l2', title:'Study Design & Bias', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'ss2l3', title:'Statistics & Hypothesis Testing', url:'https://www.youtube.com/c/joshstarmer', src:'StatQuest' },
      ]},
      { id:'ss3', title:'Government, Civics & Current Events', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ss3l1', title:'Government & Civics', url:'https://www.khanacademy.org/humanities/us-government-and-civics', src:'Khan Academy' },
        { id:'ss3l2', title:'World History Overview', url:'https://www.khanacademy.org/humanities/world-history', src:'Khan Academy' },
        { id:'ss3l3', title:'Cultural Anthropology Basics', url:'https://www.khanacademy.org/science/ap-psychology/social-psychology', src:'Khan Academy' },
      ]},
    ]
  },
  preHealth: {
    label:'Pre-Health (Optional)', accent:'#ef4444', quizCats:['Life Sciences','Physical Sciences'],
    tagline:'For students weighing a future in medicine or another health profession — no commitment required.',
    overview:'This is an opt-in exploration track, not a requirement — it exists for students who suspect they might want to pursue medicine, nursing, dentistry, or another health career and want to test that interest before committing to it in college. It emphasizes biology, chemistry, and physiology fundamentals alongside honest guidance on what shadowing, volunteering, and health-career admissions actually look for, so you arrive at undergrad already knowing whether a pre-health track is worth pursuing.',
    highlights:[
      'Cell biology, genetics, and physiology fundamentals that map directly onto intro biology and pre-med coursework',
      'Chemistry grounding (acid-base, organic basics) that eases the transition into college-level chem, a common pre-health bottleneck',
      'Realistic guidance on clinical exposure — shadowing, volunteering, and what health programs actually screen for',
      'A low-pressure way to confirm (or rule out) a health-sciences path before declaring anything in college',
    ],
    outcomes:['Biology / Pre-Med','Nursing','Public Health','Dentistry','Physician Assistant Studies'],
    bestFor:['You\'re curious about medicine but not sure it\'s "the" path yet','You want to test a health-sciences interest before committing in college','You like biology and chemistry more than most of your other classes'],
    units:[
      { id:'ph1', title:'Biology & Biochemistry Foundations', quizCat:'Life Sciences', lessons:[
        { id:'ph1l1', title:'Cell Biology & Metabolism', url:'https://www.youtube.com/watch?v=4eLjRcHnMCk', src:'YouTube' },
        { id:'ph1l2', title:'Genetics & Molecular Biology', url:'https://www.youtube.com/watch?v=Qqe4thU-os8', src:'YouTube' },
        { id:'ph1l3', title:'Human Physiology Overview', url:'https://www.youtube.com/watch?v=X9ZZ6tcxArI', src:'YouTube' },
      ]},
      { id:'ph2', title:'Chemistry for Health Sciences', quizCat:'Physical Sciences', lessons:[
        { id:'ph2l1', title:'Acid-Base Chemistry', url:'https://www.youtube.com/watch?v=eB1qG5EEDk0', src:'YouTube' },
        { id:'ph2l2', title:'Organic Chemistry Basics', url:'https://www.youtube.com/watch?v=wX-y00bZ4qI', src:'YouTube' },
        { id:'ph2l3', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
      ]},
      { id:'ph3', title:'Exploring a Health Career', quizCat:'Life Sciences', lessons:[
        { id:'ph3l1', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ph3l2', title:'What Pre-Health Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ph3l3', title:'Intro to Public Health', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
      ]},
    ]
  },
};

// ── COURSE → QUIZ CATEGORY MAP ────────────────────────────────────────────────
// Maps a student's self-reported courses (Settings) to the 3 quiz-library
// categories, so the Quiz Library and Metabrain Quiz Recommendations can both
// surface "matches your courses" without duplicating this mapping.
export const COURSE_CAT_MAP = {
  Biology:'Life Sciences', 'Environmental Science':'Life Sciences',
  Chemistry:'Physical Sciences', Physics:'Physical Sciences',
  'AP Psychology':'Behavioral & Social Sciences', 'US History':'Behavioral & Social Sciences',
  'World History':'Behavioral & Social Sciences', 'AP US History':'Behavioral & Social Sciences',
  'AP World History':'Behavioral & Social Sciences',
};

// ── AI COACH — PATHWAY-SPECIFIC BEHAVIORAL NOTES ─────────────────────────────
// Short, behavioral (not marketing) guidance injected into the Metabrain system
// prompt so the coach's advice matches what's actually realistic/appropriate for
// a high schooler on each track. Distinct from PATHS[].overview/highlights above.
export const PATH_COACH_NOTES = {
  undecided: 'This student hasn\'t settled on a direction yet — encourage exploration (electives, clubs, a diagnostic quiz) rather than pushing them toward any single major or career.',
  stem: 'Point them toward math/science depth, coding exposure, and STEM competitions (Science Olympiad, FIRST Robotics, Regeneron STS) when relevant — keep it high-school-scaled (school clubs, summer programs), not college-lab-level.',
  humanities: 'Point them toward reading/writing depth, debate or Model UN, school publications, and essay craft when relevant.',
  business: 'Point them toward DECA/FBLA, personal-finance literacy, and leadership roles (clubs, student government) when relevant.',
  socialSci: 'Point them toward psychology/sociology curiosity, school research projects, and civic involvement when relevant.',
  preHealth: 'This is an EXPLORATORY track only, not a commitment. Steer them toward age-appropriate exposure — shadowing a local provider with a parent/guardian\'s help, hospital teen-volunteer programs, HOSA, school science fairs, or a summer pre-college research program. Never bring up the MCAT, clinical rotations, or medical-school-style interview prep (MMI/CASPer) — this student is years away from any of that, and it isn\'t useful or relevant to them right now.',
};

// ── FLASHCARD DECKS ───────────────────────────────────────────────────────────
export const FLASH_DECKS = {
  'Algebra II Essentials': [
    { front:'Quadratic formula?', back:'x = (-b ± √(b² - 4ac)) / 2a — solves ax² + bx + c = 0.' },
    { front:'What is the discriminant and what does it tell you?', back:'b² - 4ac. Positive → 2 real roots; zero → 1 real root; negative → 2 complex roots.' },
    { front:'Slope-intercept form of a line?', back:'y = mx + b, where m is the slope and b is the y-intercept.' },
    { front:'How do you find the vertex of a parabola y = ax² + bx + c?', back:'x = -b/2a, then plug back in to find y.' },
    { front:'Rule for exponents: aᵐ · aⁿ = ?', back:'aᵐ⁺ⁿ — add exponents when multiplying same base.' },
  ],
  'SAT Reading & Writing: Grammar Rules': [
    { front:'Subject-verb agreement rule?', back:'A singular subject takes a singular verb; a plural subject takes a plural verb — watch for words between subject and verb.' },
    { front:'When do you use "who" vs. "whom"?', back:'"Who" is a subject pronoun (who did it); "whom" is an object pronoun (to whom it was given).' },
    { front:'What is a comma splice?', back:'Joining two independent clauses with only a comma — fix with a period, semicolon, or conjunction.' },
    { front:'Its vs. it\'s?', back:'"Its" is possessive (the dog wagged its tail); "it\'s" is a contraction of "it is."' },
    { front:'What does a semicolon connect?', back:'Two independent clauses that are closely related, without a conjunction.' },
  ],
  'U.S. History: Key Events': [
    { front:'What did the Declaration of Independence (1776) establish?', back:'The 13 colonies\' formal separation from Britain and the philosophical basis of natural rights and self-government.' },
    { front:'What was the significance of the 13th, 14th, and 15th Amendments?', back:'Reconstruction Amendments: abolished slavery, granted citizenship and equal protection, and prohibited denying the vote based on race.' },
    { front:'What caused the Great Depression (1929)?', back:'Stock market crash, bank failures, overproduction, and reduced consumer spending led to a decade-long global economic collapse.' },
    { front:'What was the main goal of the Civil Rights Movement?', back:'To end racial segregation and discrimination and secure equal legal rights for Black Americans, culminating in the Civil Rights Act of 1964.' },
    { front:'What was the Cold War?', back:'A decades-long geopolitical tension between the U.S. and Soviet Union (1947–1991) marked by proxy wars, nuclear arms race, and ideological rivalry.' },
  ],
  'Biology Basics': [
    { front:'What is the central dogma of molecular biology?', back:'DNA → RNA → Protein (transcription then translation).' },
    { front:'What is the function of mitochondria?', back:'Produce ATP (cellular energy) through cellular respiration — the "powerhouse of the cell."' },
    { front:'Difference between mitosis and meiosis?', back:'Mitosis produces 2 identical diploid cells (growth/repair); meiosis produces 4 genetically distinct haploid gametes (reproduction).' },
    { front:'What is natural selection?', back:'The process by which organisms with traits better suited to their environment survive and reproduce more successfully, driving evolution.' },
    { front:'What do enzymes do?', back:'Act as biological catalysts that speed up chemical reactions without being consumed, by lowering activation energy.' },
  ],
  'Chemistry Basics': [
    { front:'What is a mole?', back:'A unit representing 6.022 × 10²³ particles (Avogadro\'s number) of a substance.' },
    { front:'What determines an element\'s chemical properties?', back:'The number and arrangement of valence (outermost) electrons.' },
    { front:'Difference between an ionic and covalent bond?', back:'Ionic: electrons transferred between atoms (metal + nonmetal). Covalent: electrons shared between atoms (nonmetal + nonmetal).' },
    { front:'What is pH a measure of?', back:'The concentration of hydrogen ions (H+) in a solution — lower pH = more acidic, higher pH = more basic.' },
    { front:'Law of conservation of mass?', back:'Matter cannot be created or destroyed in a chemical reaction — mass of reactants equals mass of products.' },
  ],
  'Physics Basics': [
    { front:'Newton\'s Second Law?', back:'F = ma — force equals mass times acceleration.' },
    { front:'What is kinetic energy?', back:'KE = ½mv² — energy of motion, dependent on mass and velocity squared.' },
    { front:'What is Ohm\'s Law?', back:'V = IR — voltage equals current times resistance.' },
    { front:'Law of conservation of energy?', back:'Energy cannot be created or destroyed, only converted from one form to another; total energy in a closed system stays constant.' },
    { front:'What is acceleration due to gravity on Earth?', back:'Approximately 9.8 m/s², directed downward toward Earth\'s center.' },
  ],
  'Vocabulary Builder': [
    { front:'Ubiquitous', back:'Present, appearing, or found everywhere.' },
    { front:'Ambivalent', back:'Having mixed or contradictory feelings about something.' },
    { front:'Pragmatic', back:'Dealing with things sensibly and realistically rather than theoretically.' },
    { front:'Candid', back:'Truthful and straightforward; frank.' },
    { front:'Ephemeral', back:'Lasting for a very short time.' },
  ],
  'Essay Writing Toolkit': [
    { front:'What is a thesis statement?', back:'A one- or two-sentence claim that states the main argument or focus of an essay, usually placed at the end of the introduction.' },
    { front:'What makes a strong college essay topic?', back:'A specific, personal moment or detail that reveals character, growth, or values — not just a list of accomplishments.' },
    { front:'What is "show, don\'t tell" in writing?', back:'Using concrete details, sensory language, and scenes to let readers infer meaning, rather than stating conclusions outright.' },
    { front:'What should a strong conclusion do?', back:'Reinforce the main idea and leave the reader with a clear sense of significance — avoid simply repeating the introduction.' },
    { front:'What is a common weakness in first-draft essays?', back:'Vague, general statements ("I learned a lot") instead of specific, reflective insight tied to concrete examples.' },
  ],
  'Economics Fundamentals': [
    { front:'What is opportunity cost?', back:'The value of the next-best alternative given up when making a choice.' },
    { front:'What is supply and demand?', back:'The relationship between how much of a good producers offer (supply) and how much consumers want (demand); their intersection sets market price.' },
    { front:'What is inflation?', back:'A general increase in prices and fall in the purchasing value of money over time.' },
    { front:'Difference between microeconomics and macroeconomics?', back:'Microeconomics studies individual markets/consumers/firms; macroeconomics studies the economy as a whole (GDP, unemployment, inflation).' },
    { front:'What is GDP?', back:'Gross Domestic Product — the total monetary value of all goods and services produced within a country in a given period.' },
  ],
  'Psychology Basics': [
    { front:'What is classical conditioning?', back:'Learning process where a neutral stimulus becomes associated with a meaningful stimulus, eliciting a similar response (Pavlov\'s dogs).' },
    { front:'What is the bystander effect?', back:'The phenomenon where individuals are less likely to help a victim when other people are present, due to diffusion of responsibility.' },
    { front:'Nature vs. nurture?', back:'The debate over how much of behavior/traits is due to genetics (nature) versus environment and experience (nurture) — most traits involve both.' },
    { front:'What is cognitive dissonance?', back:'The mental discomfort experienced when holding two conflicting beliefs, values, or attitudes at the same time.' },
    { front:'Maslow\'s hierarchy of needs (bottom to top)?', back:'Physiological, Safety, Love/Belonging, Esteem, Self-Actualization.' },
  ],
  'World History Highlights': [
    { front:'What was the Renaissance?', back:'A period (14th–17th century) of renewed interest in classical art, science, and humanism, originating in Italy.' },
    { front:'What triggered World War I?', back:'The assassination of Archduke Franz Ferdinand (1914), which escalated existing alliances and tensions into global conflict.' },
    { front:'What was the Industrial Revolution?', back:'A period of major industrialization (starting ~1760 in Britain) shifting economies from agriculture to manufacturing and machine production.' },
    { front:'What was decolonization?', back:'The mid-20th-century process by which former colonies in Africa, Asia, and elsewhere gained independence from European colonial powers.' },
    { front:'What was the Silk Road?', back:'A network of trade routes connecting East Asia and the Mediterranean, facilitating exchange of goods, ideas, and culture for centuries.' },
  ],
  'Statistics & Data Basics': [
    { front:'Mean vs. median?', back:'Mean is the average of all values; median is the middle value when sorted. Median is less affected by outliers.' },
    { front:'What is standard deviation?', back:'A measure of how spread out data points are from the mean — low = clustered, high = widely spread.' },
    { front:'What is correlation vs. causation?', back:'Correlation means two variables move together; causation means one variable directly causes the change in another. Correlation alone doesn\'t prove causation.' },
    { front:'What is a p-value?', back:'The probability of observing results as extreme as the data, assuming the null hypothesis is true — a small p-value (typically <0.05) suggests a statistically significant result.' },
    { front:'What is sampling bias?', back:'When a sample is not representative of the population, leading to skewed or inaccurate conclusions.' },
  ],
  'SAT Math Strategies': [
    { front:'Best strategy when stuck on a hard SAT math problem?', back:'Plug in answer choices or pick simple numbers for variables — often faster than solving algebraically.' },
    { front:'How should you manage time on the SAT Math section?', back:'Don\'t linger — mark difficult questions and return if time allows; easier questions are worth the same as hard ones.' },
    { front:'What\'s a common trap in SAT word problems?', back:'Misreading what\'s actually being asked (e.g., solving for x when the question asks for x + 2) — always reread the question before selecting an answer.' },
    { front:'When should you use a calculator strategically?', back:'For arithmetic-heavy or multi-step problems; skip it for problems better solved by recognizing patterns or simplifying algebraically.' },
    { front:'How do you approach data/graph interpretation questions?', back:'Read axis labels and units first, then locate the specific data point or trend the question asks about before calculating.' },
  ],
  'Study Skills & Test Strategy': [
    { front:'What is spaced repetition?', back:'Reviewing material at increasing intervals over time to move information into long-term memory more efficiently than cramming.' },
    { front:'What is active recall?', back:'Testing yourself on material (e.g., flashcards, practice questions) rather than passively re-reading notes — proven to improve retention.' },
    { front:'How far ahead should you start studying for the SAT/ACT?', back:'Ideally 2–3 months of consistent practice, with full-length timed practice tests in the final few weeks.' },
    { front:'What should you do after a practice test?', back:'Review every wrong answer, understand why the correct answer is right, and identify patterns in your mistakes.' },
    { front:'Why is sleep important before a test?', back:'Sleep consolidates memory and restores focus — pulling an all-nighter typically hurts performance more than extra cramming helps.' },
  ],
};

// ── US STATES ──────────────────────────────────────────────────────────────────
// Full state list for the Admissions Calculator's "home state" field, so the
// in-state-tuition bonus resolves reliably instead of relying on a free-typed
// 2-letter code that silently fails to match on any typo.
export const US_STATES = [
  {code:'AL',name:'Alabama'},{code:'AK',name:'Alaska'},{code:'AZ',name:'Arizona'},{code:'AR',name:'Arkansas'},
  {code:'CA',name:'California'},{code:'CO',name:'Colorado'},{code:'CT',name:'Connecticut'},{code:'DE',name:'Delaware'},
  {code:'DC',name:'District of Columbia'},{code:'FL',name:'Florida'},{code:'GA',name:'Georgia'},{code:'HI',name:'Hawaii'},
  {code:'ID',name:'Idaho'},{code:'IL',name:'Illinois'},{code:'IN',name:'Indiana'},{code:'IA',name:'Iowa'},
  {code:'KS',name:'Kansas'},{code:'KY',name:'Kentucky'},{code:'LA',name:'Louisiana'},{code:'ME',name:'Maine'},
  {code:'MD',name:'Maryland'},{code:'MA',name:'Massachusetts'},{code:'MI',name:'Michigan'},{code:'MN',name:'Minnesota'},
  {code:'MS',name:'Mississippi'},{code:'MO',name:'Missouri'},{code:'MT',name:'Montana'},{code:'NE',name:'Nebraska'},
  {code:'NV',name:'Nevada'},{code:'NH',name:'New Hampshire'},{code:'NJ',name:'New Jersey'},{code:'NM',name:'New Mexico'},
  {code:'NY',name:'New York'},{code:'NC',name:'North Carolina'},{code:'ND',name:'North Dakota'},{code:'OH',name:'Ohio'},
  {code:'OK',name:'Oklahoma'},{code:'OR',name:'Oregon'},{code:'PA',name:'Pennsylvania'},{code:'RI',name:'Rhode Island'},
  {code:'SC',name:'South Carolina'},{code:'SD',name:'South Dakota'},{code:'TN',name:'Tennessee'},{code:'TX',name:'Texas'},
  {code:'UT',name:'Utah'},{code:'VT',name:'Vermont'},{code:'VA',name:'Virginia'},{code:'WA',name:'Washington'},
  {code:'WV',name:'West Virginia'},{code:'WI',name:'Wisconsin'},{code:'WY',name:'Wyoming'},
];

// ── COLLEGE DATA ──────────────────────────────────────────────────────────────
// Approximate, illustrative admitted-student GPA/SAT ranges and acceptance rates
// for well-known U.S. undergraduate institutions. Figures are rounded estimates
// for planning purposes — verify against each school's official Common Data Set
// before relying on them for real decisions.
export const SCHOOL_DATA = [
  // ── Highly selective private (reach for most) ──────────────────────────────
  { name:'Harvard University', gpa:3.9, sat:1520, accept:3.4, state:'MA', type:'Private' },
  { name:'Massachusetts Institute of Technology', gpa:3.9, sat:1540, accept:4.0, state:'MA', type:'Private' },
  { name:'Stanford University', gpa:3.96, sat:1505, accept:3.9, state:'CA', type:'Private' },
  { name:'Princeton University', gpa:3.9, sat:1505, accept:4.4, state:'NJ', type:'Private' },
  { name:'Yale University', gpa:3.9, sat:1515, accept:4.6, state:'CT', type:'Private' },
  { name:'Columbia University', gpa:3.9, sat:1505, accept:3.9, state:'NY', type:'Private' },
  { name:'University of Pennsylvania', gpa:3.9, sat:1510, accept:5.9, state:'PA', type:'Private' },
  { name:'Duke University', gpa:3.9, sat:1515, accept:6.0, state:'NC', type:'Private', preHealth:true },
  { name:'Northwestern University', gpa:3.9, sat:1500, accept:7.2, state:'IL', type:'Private' },
  { name:'Johns Hopkins University', gpa:3.92, sat:1535, accept:6.5, state:'MD', type:'Private', preHealth:true },
  { name:'Cornell University', gpa:3.9, sat:1490, accept:7.3, state:'NY', type:'Private' },
  { name:'Brown University', gpa:3.9, sat:1495, accept:5.1, state:'RI', type:'Private' },
  { name:'Dartmouth College', gpa:3.9, sat:1505, accept:6.2, state:'NH', type:'Private' },
  { name:'Rice University', gpa:3.9, sat:1520, accept:9.0, state:'TX', type:'Private', preHealth:true },
  { name:'Vanderbilt University', gpa:3.85, sat:1510, accept:6.7, state:'TN', type:'Private', preHealth:true },
  { name:'University of Chicago', gpa:3.9, sat:1535, accept:5.4, state:'IL', type:'Private' },
  { name:'Washington University in St. Louis', gpa:3.85, sat:1520, accept:12.0, state:'MO', type:'Private', preHealth:true },
  { name:'Emory University', gpa:3.8, sat:1470, accept:11.0, state:'GA', type:'Private', preHealth:true },
  { name:'Georgetown University', gpa:3.9, sat:1470, accept:12.0, state:'DC', type:'Private' },
  { name:'Carnegie Mellon University', gpa:3.85, sat:1520, accept:11.3, state:'PA', type:'Private' },
  { name:'University of Notre Dame', gpa:3.9, sat:1480, accept:12.9, state:'IN', type:'Private' },
  { name:'Tufts University', gpa:3.9, sat:1470, accept:9.7, state:'MA', type:'Private' },

  // ── Selective private (target/reach depending on profile) ─────────────────
  { name:'New York University', gpa:3.7, sat:1470, accept:8.0, state:'NY', type:'Private' },
  { name:'University of Southern California', gpa:3.79, sat:1460, accept:9.5, state:'CA', type:'Private' },
  { name:'Boston University', gpa:3.7, sat:1440, accept:10.8, state:'MA', type:'Private' },
  { name:'Boston College', gpa:3.8, sat:1440, accept:15.9, state:'MA', type:'Private', preHealth:true },
  { name:'Case Western Reserve University', gpa:3.8, sat:1440, accept:33.0, state:'OH', type:'Private', preHealth:true },
  { name:'Tulane University', gpa:3.6, sat:1400, accept:11.0, state:'LA', type:'Private', preHealth:true },
  { name:'University of Miami', gpa:3.7, sat:1370, accept:19.0, state:'FL', type:'Private', preHealth:true },
  { name:'University of Rochester', gpa:3.6, sat:1400, accept:41.0, state:'NY', type:'Private', preHealth:true },
  { name:'Northeastern University', gpa:3.9, sat:1480, accept:6.6, state:'MA', type:'Private' },
  { name:'Fordham University', gpa:3.6, sat:1330, accept:47.0, state:'NY', type:'Private' },
  { name:'Villanova University', gpa:3.8, sat:1420, accept:23.0, state:'PA', type:'Private' },
  { name:'Wake Forest University', gpa:3.75, sat:1400, accept:22.0, state:'NC', type:'Private' },
  { name:'Southern Methodist University', gpa:3.6, sat:1350, accept:53.0, state:'TX', type:'Private' },
  { name:'Syracuse University', gpa:3.5, sat:1300, accept:44.0, state:'NY', type:'Private' },
  { name:'University of Denver', gpa:3.6, sat:1290, accept:66.0, state:'CO', type:'Private' },
  { name:'Drexel University', gpa:3.5, sat:1290, accept:76.0, state:'PA', type:'Private' },
  { name:'Baylor University', gpa:3.7, sat:1290, accept:45.0, state:'TX', type:'Private' },
  { name:'Loyola Marymount University', gpa:3.7, sat:1290, accept:47.0, state:'CA', type:'Private' },

  // ── Small liberal arts colleges (a mix, not just elite) ────────────────────
  { name:'Williams College', gpa:3.9, sat:1500, accept:8.5, state:'MA', type:'Private' },
  { name:'Amherst College', gpa:3.9, sat:1495, accept:7.1, state:'MA', type:'Private' },
  { name:'Swarthmore College', gpa:3.9, sat:1480, accept:7.5, state:'PA', type:'Private' },
  { name:'Davidson College', gpa:3.8, sat:1420, accept:17.0, state:'NC', type:'Private' },
  { name:'Colgate University', gpa:3.8, sat:1430, accept:19.0, state:'NY', type:'Private' },
  { name:'Bates College', gpa:3.7, sat:1400, accept:15.0, state:'ME', type:'Private' },
  { name:'Kenyon College', gpa:3.7, sat:1370, accept:32.0, state:'OH', type:'Private' },
  { name:'Denison University', gpa:3.6, sat:1350, accept:30.0, state:'OH', type:'Private' },
  { name:'DePauw University', gpa:3.6, sat:1290, accept:59.0, state:'IN', type:'Private' },
  { name:'Allegheny College', gpa:3.5, sat:1230, accept:79.0, state:'PA', type:'Private' },
  { name:'Hope College', gpa:3.6, sat:1220, accept:82.0, state:'MI', type:'Private' },

  // ── Flagship / large public universities across many states ───────────────
  { name:'University of California, Berkeley', gpa:3.89, sat:1440, accept:11.4, state:'CA', type:'Public' },
  { name:'University of California, Los Angeles', gpa:3.93, sat:1440, accept:8.6, state:'CA', type:'Public' },
  { name:'University of California, San Diego', gpa:3.85, sat:1400, accept:23.8, state:'CA', type:'Public' },
  { name:'University of California, Davis', gpa:3.8, sat:1330, accept:38.0, state:'CA', type:'Public' },
  { name:'University of California, Irvine', gpa:3.85, sat:1330, accept:21.0, state:'CA', type:'Public' },
  { name:'University of California, Santa Barbara', gpa:3.85, sat:1360, accept:26.0, state:'CA', type:'Public' },
  { name:'University of Michigan', gpa:3.88, sat:1470, accept:17.7, state:'MI', type:'Public' },
  { name:'University of North Carolina at Chapel Hill', gpa:4.0, sat:1425, accept:16.8, state:'NC', type:'Public', preHealth:true },
  { name:'University of Virginia', gpa:4.0, sat:1450, accept:18.7, state:'VA', type:'Public' },
  { name:'College of William & Mary', gpa:3.9, sat:1420, accept:33.0, state:'VA', type:'Public' },
  { name:'Georgia Institute of Technology', gpa:3.9, sat:1465, accept:16.0, state:'GA', type:'Public' },
  { name:'University of Georgia', gpa:3.85, sat:1350, accept:40.0, state:'GA', type:'Public' },
  { name:'University of Washington', gpa:3.8, sat:1350, accept:45.0, state:'WA', type:'Public' },
  { name:'Washington State University', gpa:3.5, sat:1130, accept:83.0, state:'WA', type:'Public' },
  { name:'Ohio State University', gpa:3.7, sat:1310, accept:53.0, state:'OH', type:'Public' },
  { name:'University of Pittsburgh', gpa:3.8, sat:1360, accept:47.0, state:'PA', type:'Public', preHealth:true },
  { name:'Penn State University', gpa:3.6, sat:1280, accept:49.0, state:'PA', type:'Public' },
  { name:'Rutgers University-New Brunswick', gpa:3.7, sat:1310, accept:66.0, state:'NJ', type:'Public', preHealth:true },
  { name:'University of Texas at Austin', gpa:3.84, sat:1355, accept:29.0, state:'TX', type:'Public' },
  { name:'Texas A&M University', gpa:3.6, sat:1250, accept:63.0, state:'TX', type:'Public' },
  { name:'University of Wisconsin-Madison', gpa:3.8, sat:1400, accept:43.0, state:'WI', type:'Public' },
  { name:'Indiana University Bloomington', gpa:3.6, sat:1240, accept:78.0, state:'IN', type:'Public' },
  { name:'Purdue University', gpa:3.7, sat:1320, accept:53.0, state:'IN', type:'Public' },
  { name:'University of Florida', gpa:4.0, sat:1390, accept:23.0, state:'FL', type:'Public' },
  { name:'Florida State University', gpa:3.9, sat:1290, accept:33.0, state:'FL', type:'Public' },
  { name:'Arizona State University', gpa:3.5, sat:1220, accept:88.0, state:'AZ', type:'Public' },
  { name:'University of Arizona', gpa:3.5, sat:1200, accept:87.0, state:'AZ', type:'Public' },
  { name:'University of Oregon', gpa:3.6, sat:1200, accept:85.0, state:'OR', type:'Public' },
  { name:'University of Alabama', gpa:3.7, sat:1200, accept:80.0, state:'AL', type:'Public' },
  { name:'Auburn University', gpa:3.7, sat:1250, accept:44.0, state:'AL', type:'Public' },
  { name:'University of South Carolina', gpa:3.7, sat:1250, accept:64.0, state:'SC', type:'Public' },
  { name:'Clemson University', gpa:3.9, sat:1330, accept:41.0, state:'SC', type:'Public' },
  { name:'University of Colorado Boulder', gpa:3.6, sat:1260, accept:79.0, state:'CO', type:'Public' },
  { name:'University of Minnesota Twin Cities', gpa:3.75, sat:1350, accept:70.0, state:'MN', type:'Public' },
  { name:'University of Iowa', gpa:3.6, sat:1190, accept:84.0, state:'IA', type:'Public' },
  { name:'University of Kansas', gpa:3.5, sat:1150, accept:93.0, state:'KS', type:'Public' },
  { name:'University of Missouri', gpa:3.5, sat:1180, accept:78.0, state:'MO', type:'Public' },
  { name:'University of Nebraska-Lincoln', gpa:3.5, sat:1160, accept:79.0, state:'NE', type:'Public' },
  { name:'University of Utah', gpa:3.6, sat:1210, accept:78.0, state:'UT', type:'Public' },
  { name:'University of Connecticut', gpa:3.7, sat:1310, accept:56.0, state:'CT', type:'Public' },
  { name:'University of Maryland, College Park', gpa:3.85, sat:1380, accept:44.0, state:'MD', type:'Public' },
  { name:'University at Buffalo (SUNY)', gpa:3.5, sat:1250, accept:66.0, state:'NY', type:'Public' },
  { name:'Stony Brook University (SUNY)', gpa:3.6, sat:1330, accept:47.0, state:'NY', type:'Public', preHealth:true },
  { name:'University at Albany (SUNY)', gpa:3.4, sat:1180, accept:71.0, state:'NY', type:'Public' },
  { name:'James Madison University', gpa:3.6, sat:1190, accept:74.0, state:'VA', type:'Public' },
  { name:'Virginia Tech', gpa:3.8, sat:1310, accept:51.0, state:'VA', type:'Public' },
  { name:'Michigan State University', gpa:3.5, sat:1180, accept:83.0, state:'MI', type:'Public' },
  { name:'University of Illinois Urbana-Champaign', gpa:3.8, sat:1400, accept:44.0, state:'IL', type:'Public' },
  { name:'University of Delaware', gpa:3.6, sat:1230, accept:74.0, state:'DE', type:'Public' },
  { name:'University of New Hampshire', gpa:3.4, sat:1170, accept:88.0, state:'NH', type:'Public' },
  { name:'University of Vermont', gpa:3.5, sat:1250, accept:64.0, state:'VT', type:'Public' },
  { name:'Miami University (Ohio)', gpa:3.7, sat:1280, accept:85.0, state:'OH', type:'Public', preHealth:true },
  { name:'University of Cincinnati', gpa:3.5, sat:1190, accept:78.0, state:'OH', type:'Public' },
  { name:'University of Oklahoma', gpa:3.6, sat:1220, accept:80.0, state:'OK', type:'Public' },
  { name:'Louisiana State University', gpa:3.4, sat:1160, accept:76.0, state:'LA', type:'Public' },
  { name:'University of Mississippi', gpa:3.4, sat:1130, accept:88.0, state:'MS', type:'Public' },
  { name:'West Virginia University', gpa:3.3, sat:1100, accept:88.0, state:'WV', type:'Public' },
  { name:'University of Nevada, Reno', gpa:3.4, sat:1120, accept:87.0, state:'NV', type:'Public' },
  { name:'Montana State University', gpa:3.3, sat:1120, accept:91.0, state:'MT', type:'Public' },
];

// ── EXTRACURRICULARS, COMPETITIONS & PROGRAMS ────────────────────────────────
export const COMPETITIONS = [
  { name:'Regeneron Science Talent Search', type:'Competition', desc:'The nation\'s oldest and most prestigious science research competition for high school seniors.', effort:'Elite', level:'National' },
  { name:'Science Olympiad', type:'Competition', desc:'Team-based STEM competition covering biology, chemistry, physics, and engineering events.', effort:'Competitive', level:'National' },
  { name:'National Merit Scholarship Program', type:'Scholarship', desc:'Academic scholarship competition based on PSAT/NMSQT performance.', effort:'Elite', level:'National' },
  { name:'Coca-Cola Scholars Program', type:'Scholarship', desc:'$20,000 scholarship for graduating seniors based on leadership and community service.', effort:'Elite', level:'National' },
  { name:'Model United Nations (MUN)', type:'Organization', desc:'Simulated UN debate and diplomacy — builds public speaking, research, and negotiation skills.', effort:'Open', level:'State' },
  { name:'DECA', type:'Competition', desc:'Business, marketing, and finance competitions for high school students.', effort:'Open', level:'National' },
  { name:'Future Business Leaders of America (FBLA)', type:'Organization', desc:'Student business organization with competitive events and leadership development.', effort:'Open', level:'National' },
  { name:'National Speech & Debate Association', type:'Competition', desc:'Competitive speech and debate leagues — strong for developing argumentation and communication skills.', effort:'Competitive', level:'National' },
  { name:'Habitat for Humanity', type:'Volunteering', desc:'Community service building homes — shows sustained commitment to service.', effort:'Open', level:'State' },
  { name:'Student Government', type:'Organization', desc:'Elected leadership role within your school — direct evidence of leadership and initiative.', effort:'Open', level:'State' },
  { name:'Jack Kent Cooke Foundation Scholarship', type:'Scholarship', desc:'Scholarship for high-achieving students from lower-income families.', effort:'Elite', level:'National' },
  { name:'Technovation Girls', type:'Competition', desc:'Global technology and entrepreneurship competition for young women building mobile apps.', effort:'Competitive', level:'National' },
  { name:'FIRST Robotics Competition', type:'Competition', desc:'Team-based robotics design and engineering competition with regional and world championships.', effort:'Competitive', level:'National' },
  { name:'National History Day', type:'Competition', desc:'Research-based history competition culminating in papers, documentaries, or exhibits.', effort:'Competitive', level:'National' },
  { name:'Congressional App Challenge', type:'Competition', desc:'District-level coding competition sponsored by members of Congress for student-built apps.', effort:'Open', level:'State' },
  { name:'QuestBridge National College Match', type:'Scholarship', desc:'Connects high-achieving, low-income students with full four-year scholarships at top colleges.', effort:'Elite', level:'National' },
  { name:'Pre-College Summer Research Programs', type:'Research', desc:'Summer research opportunities at local universities — builds research experience and mentor relationships.', effort:'Competitive', level:'State' },
  { name:'Local Food Bank / Community Volunteering', type:'Volunteering', desc:'Ongoing local community service — depth and consistency matter more than a single event.', effort:'Open', level:'State' },
  { name:'Key Club International', type:'Organization', desc:'Student-led service organization with local, district, and international leadership opportunities.', effort:'Open', level:'State' },
  { name:'AP Scholar Awards', type:'Academic', desc:'College Board recognition for outstanding performance on multiple AP Exams.', effort:'Competitive', level:'National' },
];

// ── DIAGNOSTIC QUESTIONS ──────────────────────────────────────────────────────
// Interest diagnostic mapping to study tracks: stem, humanities, business, socialSci
export const DIAG_QS = [
  { q:'Which subject excites you most right now?', ch:['Math & Science','History, Literature & Writing','Business, Economics & Finance','Psychology & Sociology'], type:'interest', map:['stem','humanities','business','socialSci'] },
  { q:'You find the most satisfaction in work that involves:', ch:['Solving technical or quantitative problems','Reading, writing, and analyzing ideas','Strategy, markets, and organizing people','Understanding human behavior and society'], type:'interest', map:['stem','humanities','business','socialSci'] },
  { q:'Which elective would you choose if you could add one to your schedule?', ch:['Computer Science or Engineering','Creative Writing or World Literature','Entrepreneurship or Personal Finance','Sociology or AP Psychology'], type:'interest', map:['stem','humanities','business','socialSci'] },
  { q:'A graph shows a company\'s revenue rising while profit falls. What explains this best?', ch:['Rising variable costs outpacing revenue growth','A shift in public perception of the brand','A change in consumer social behavior','A statistical sampling error in the data'], type:'content', map:['business','humanities','socialSci','stem'] },
  { q:'Which career aspect appeals to you most?', ch:['Designing, building, or analyzing systems','Telling stories or shaping ideas that influence people','Leading teams and making strategic decisions','Helping people and communities directly'], type:'interest', map:['stem','humanities','business','socialSci'] },
  { q:'When you think about your future work, you imagine:', ch:['A lab, workshop, or technical environment','A studio, classroom, or publication','A boardroom, startup, or trading floor','A clinic, school, or community organization'], type:'interest', map:['stem','humanities','business','socialSci'] },
  { q:'Which aspect of studying energizes you the most?', ch:['Working through math and science problems','Reading deeply and forming arguments','Analyzing markets, trends, and decisions','Discussing human behavior and society'], type:'interest', map:['stem','humanities','business','socialSci'] },
  { q:'The bystander effect describes:', ch:['A statistical sampling bias','A rhetorical technique in persuasive writing','A pricing anomaly in behavioral economics','Diffusion of responsibility reducing individual action in groups'], type:'content', map:['stem','humanities','business','socialSci'] },
  { q:'Which project would you rather lead?', ch:['Building an app or entering a science fair','Editing the school newspaper or literary magazine','Running a school fundraiser or small business pitch','Organizing a community service initiative'], type:'interest', map:['stem','humanities','business','socialSci'] },
  { q:'How comfortable are you with ambiguity in your work?', ch:['I prefer clear problems with defined, correct answers','I enjoy interpreting and arguing multiple perspectives','I like calculated risk-taking with uncertain outcomes','I thrive in complex, interpersonal, uncertain situations'], type:'interest', map:['stem','humanities','business','socialSci'] },
  { q:'Which best describes opportunity cost?', ch:['The energy lost in an inefficient system','The persuasive cost of a weak argument','The value of the next-best alternative given up by a choice','The social cost of a norm violation'], type:'content', map:['stem','humanities','business','socialSci'] },
];
