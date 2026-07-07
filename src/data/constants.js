// All non-quiz, non-elib constants

// ── LEARNING PATHS ────────────────────────────────────────────────────────────
// Interest-based study tracks for college-bound high schoolers. "Pre-Health" is
// an opt-in career-exploration track, not the default — the default track is
// "Undecided / Exploring" so a new user isn't assumed into any single career path.
export const PATHS = {
  undecided: {
    label:'Exploring / Undecided', accent:'#64748b', quizCats:['Life Sciences','Physical Sciences','Behavioral & Social Sciences'],
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
    units:[
      { id:'ss1', title:'Psychology Foundations', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ss1l1', title:'Social Psychology & Cognition', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOPRKzVLY0jJY-uHOH9KVU6', src:'Crash Course' },
        { id:'ss1l2', title:'Learning Theory & Memory', url:'https://www.khanacademy.org/test-prep/mcat', src:'Khan Academy' },
        { id:'ss1l3', title:'Personality & Development', url:'https://www.khanacademy.org/test-prep/mcat', src:'Khan Academy' },
      ]},
      { id:'ss2', title:'Sociology & Research Methods', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ss2l1', title:'Social Stratification & Inequality', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtMJ-AfB_7J1538YKWkZAnGA', src:'Crash Course' },
        { id:'ss2l2', title:'Study Design & Bias', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'ss2l3', title:'Statistics & Hypothesis Testing', url:'https://www.youtube.com/c/joshstarmer', src:'StatQuest' },
      ]},
      { id:'ss3', title:'Government, Civics & Current Events', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ss3l1', title:'Government & Civics', url:'https://www.khanacademy.org/humanities/us-government-and-civics', src:'Khan Academy' },
        { id:'ss3l2', title:'World History Overview', url:'https://www.khanacademy.org/humanities/world-history', src:'Khan Academy' },
        { id:'ss3l3', title:'Cultural Anthropology Basics', url:'https://www.khanacademy.org/test-prep/mcat', src:'Khan Academy' },
      ]},
    ]
  },
  preHealth: {
    label:'Pre-Health (Optional)', accent:'#ef4444', quizCats:['Life Sciences','Physical Sciences'],
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
        { id:'ph3l1', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/test-prep/mcat', src:'Khan Academy' },
        { id:'ph3l2', title:'What Pre-Health Programs Look For', url:'https://www.khanacademy.org/test-prep/mcat', src:'Khan Academy' },
        { id:'ph3l3', title:'Intro to Public Health', url:'https://www.khanacademy.org/test-prep/mcat', src:'Khan Academy' },
      ]},
    ]
  },
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

// ── COLLEGE DATA ──────────────────────────────────────────────────────────────
// Approximate, illustrative admitted-student GPA/SAT ranges and acceptance rates
// for well-known U.S. undergraduate institutions. Figures are rounded estimates
// for planning purposes — verify against each school's official Common Data Set
// before relying on them for real decisions.
export const SCHOOL_DATA = [
  { name:'Harvard University', gpa:3.9, sat:1520, accept:3.4, state:'MA', type:'Private' },
  { name:'Massachusetts Institute of Technology', gpa:3.9, sat:1540, accept:4.0, state:'MA', type:'Private' },
  { name:'Stanford University', gpa:3.96, sat:1505, accept:3.9, state:'CA', type:'Private' },
  { name:'Princeton University', gpa:3.9, sat:1505, accept:4.4, state:'NJ', type:'Private' },
  { name:'Yale University', gpa:3.9, sat:1515, accept:4.6, state:'CT', type:'Private' },
  { name:'Columbia University', gpa:3.9, sat:1505, accept:3.9, state:'NY', type:'Private' },
  { name:'University of Pennsylvania', gpa:3.9, sat:1510, accept:5.9, state:'PA', type:'Private' },
  { name:'Duke University', gpa:3.9, sat:1515, accept:6.0, state:'NC', type:'Private' },
  { name:'Northwestern University', gpa:3.9, sat:1500, accept:7.2, state:'IL', type:'Private' },
  { name:'Johns Hopkins University', gpa:3.92, sat:1535, accept:6.5, state:'MD', type:'Private' },
  { name:'Cornell University', gpa:3.9, sat:1490, accept:7.3, state:'NY', type:'Private' },
  { name:'University of California, Berkeley', gpa:3.89, sat:1440, accept:11.4, state:'CA', type:'Public' },
  { name:'University of California, Los Angeles', gpa:3.93, sat:1440, accept:8.6, state:'CA', type:'Public' },
  { name:'University of Michigan', gpa:3.88, sat:1470, accept:17.7, state:'MI', type:'Public' },
  { name:'University of North Carolina at Chapel Hill', gpa:4.0, sat:1425, accept:16.8, state:'NC', type:'Public' },
  { name:'University of Virginia', gpa:4.0, sat:1450, accept:18.7, state:'VA', type:'Public' },
  { name:'Georgia Institute of Technology', gpa:3.9, sat:1465, accept:16.0, state:'GA', type:'Public' },
  { name:'New York University', gpa:3.7, sat:1470, accept:8.0, state:'NY', type:'Private' },
  { name:'University of Southern California', gpa:3.79, sat:1460, accept:9.5, state:'CA', type:'Private' },
  { name:'Boston University', gpa:3.7, sat:1440, accept:10.8, state:'MA', type:'Private' },
  { name:'University of Washington', gpa:3.8, sat:1350, accept:45.0, state:'WA', type:'Public' },
  { name:'Ohio State University', gpa:3.7, sat:1310, accept:53.0, state:'OH', type:'Public' },
  { name:'Penn State University', gpa:3.6, sat:1280, accept:49.0, state:'PA', type:'Public' },
  { name:'University of Texas at Austin', gpa:3.84, sat:1355, accept:29.0, state:'TX', type:'Public' },
  { name:'University of Wisconsin-Madison', gpa:3.8, sat:1400, accept:43.0, state:'WI', type:'Public' },
  { name:'Indiana University Bloomington', gpa:3.6, sat:1240, accept:78.0, state:'IN', type:'Public' },
  { name:'University of Florida', gpa:4.0, sat:1390, accept:23.0, state:'FL', type:'Public' },
  { name:'Arizona State University', gpa:3.5, sat:1220, accept:88.0, state:'AZ', type:'Public' },
  { name:'University of Oregon', gpa:3.6, sat:1200, accept:85.0, state:'OR', type:'Public' },
  { name:'University of Alabama', gpa:3.7, sat:1200, accept:80.0, state:'AL', type:'Public' },
];

// ── COLLEGE INTERVIEW QUESTIONS ───────────────────────────────────────────────
export const MMI_QS = [
  { q:`Why do you want to attend this college, and what will you contribute to campus?`, type:'Motivation', points:['Specific, researched reasons (programs, culture, opportunities)','Genuine fit over generic praise','What you\'d bring, not just what you\'d get'] },
  { q:`Tell me about a challenge you've faced and how you handled it.`, type:'Personal', points:['Concrete, specific example','What you learned or how you grew','Honesty over a "perfect" narrative'] },
  { q:`Describe an extracurricular activity or project you're most proud of.`, type:'Personal', points:['Depth and initiative over a long list','Your specific role and impact','Why it mattered to you personally'] },
  { q:`What academic subject are you most passionate about, and why?`, type:'Academic Interests', points:['Genuine curiosity beyond grades','A specific moment that sparked interest','Connection to future goals'] },
  { q:`How do you handle disagreements with a teacher, coach, or teammate?`, type:'Situational', points:['Maturity and self-awareness','Respectful communication','Resolution, not just complaint'] },
  { q:`What is something about you that isn't on your application?`, type:'Personal', points:['Authenticity','A detail that adds dimension, not repeats your resume','Comfort with vulnerability'] },
  { q:`Describe a time you failed at something and what you learned from it.`, type:'Personal', points:['Honesty about the failure itself','Reflection and growth, not just a happy ending','Self-awareness'] },
  { q:`What does diversity mean to you, and how have you engaged with people different from you?`, type:'Community & Diversity', points:['Genuine reflection, not a rehearsed answer','Specific experiences','Respect for perspectives unlike your own'] },
  { q:`If you could change one thing about your high school, what would it be?`, type:'Situational', points:['Constructive, thoughtful critique','Awareness of tradeoffs','Diplomacy, not just complaining'] },
  { q:`What book, article, or idea has shaped how you think recently?`, type:'Academic Interests', points:['Actually engaging with the content','Why it mattered, not just a summary','Intellectual curiosity'] },
  { q:`Tell me about a leadership experience, even an informal one.`, type:'Personal', points:['Leadership doesn\'t require a title','Concrete actions and outcomes','What you learned about working with others'] },
  { q:`How do you plan to get involved outside the classroom in college?`, type:'Motivation', points:['Specific clubs, research, or communities researched at the school','Balance of ambition and realism','Connection to your interests'] },
  { q:`What is a current event or issue you care about, and why?`, type:'Academic Interests', points:['Awareness beyond headlines','Ability to see multiple sides','Personal connection to the issue'] },
  { q:`Describe how you contribute to a group project when members disagree.`, type:'Situational', points:['Collaboration and compromise','Active listening','Keeping the group focused on the goal'] },
  { q:`What would your friends say is your best quality? Your biggest flaw?`, type:'Personal', points:['Genuine self-reflection','Specific example for each','Comfort acknowledging imperfection'] },
  { q:`Why did you choose your intended major (or how are you approaching being undecided)?`, type:'Motivation', points:['Authentic reasoning, not just prestige or salary','Openness to exploration if undecided','Connection to past experiences'] },
  { q:`Tell me about a time you had to manage a heavy workload. How did you prioritize?`, type:'Situational', points:['Concrete time-management strategy','Self-awareness about limits',`What you'd do differently next time`] },
  { q:`How has your background or community shaped who you are?`, type:'Community & Diversity', points:['Specific, personal detail','Connection to values or goals','Avoiding generic statements'] },
  { q:`What do you hope to be doing five years after graduation?`, type:'Motivation', points:['Thoughtful, realistic vision','Flexibility — it\'s fine not to have it all figured out','Connection between goals and the school\'s offerings'] },
  { q:`Do you have any questions for me about the school?`, type:'Communication', points:['Specific, well-researched questions','Genuine curiosity, not just "checking a box"','Engagement and follow-up'] },

  // BS/MD program — early-commitment medical track interviews probe certainty and maturity
  { q:`Why are you certain you want to commit to medicine now, rather than exploring as an undergrad first?`, type:'Motivation', program:'bsmd', points:['Evidence of sustained exposure (shadowing, volunteering, research)','Honest reflection on the tradeoffs of an early commitment','Realistic understanding of the physician path'] },
  { q:`Describe a healthcare experience (shadowing, volunteering, caregiving) that confirmed medicine is right for you.`, type:'Personal', program:'bsmd', points:['Specific, firsthand experience — not secondhand or vague','What it revealed about the realities of patient care','Emotional maturity in discussing difficult moments'] },
  { q:`How do you plan to handle the accelerated, high-pressure pace of a combined BS/MD curriculum?`, type:'Situational', program:'bsmd', points:['Concrete study/time-management strategy','Awareness of burnout risk and how you\'ll manage it','Support systems you\'d lean on'] },
  { q:`What would you do if, partway through the program, you decided medicine wasn't for you?`, type:'Situational', program:'bsmd', points:['Honesty rather than a rehearsed "that could never happen"','Awareness that BS/MD programs have exit points','Maturity about sunk-cost thinking'] },

  // Military academy — service, leadership under structure, and commitment to duty
  { q:`Why are you seeking a service academy education instead of a traditional four-year college?`, type:'Motivation', program:'military', points:['Genuine understanding of the military commitment, not just "free tuition"','Specific reasons tied to service and leadership, not just adventure','Awareness of the physical and academic demands'] },
  { q:`Describe a time you had to follow orders or a rule you personally disagreed with.`, type:'Situational', program:'military', points:['Respect for chain of command and structure','Honest reflection, not just compliance for its own sake','Ability to raise concerns appropriately within a hierarchy'] },
  { q:`Tell me about a time you led a team under pressure or in a high-stakes situation.`, type:'Personal', program:'military', points:['Concrete example of decisive leadership','Accountability for outcomes, good or bad','Composure under stress'] },
  { q:`What does service before self mean to you, and how have you lived it?`, type:'Community & Diversity', program:'military', points:['Specific examples of sacrifice or service','Understanding this is a multi-year commitment, not a slogan','Connection between personal values and the academy\'s mission'] },

  // Liberal arts college — intellectual curiosity, discussion-based learning, community fit
  { q:`Liberal arts education emphasizes breadth over early specialization. How do you feel about not immediately declaring a major?`, type:'Academic Interests', program:'lac', points:['Genuine intellectual curiosity across disciplines','Comfort with exploration rather than a rigid plan','Specific interests you\'d want to explore'] },
  { q:`Describe your ideal classroom discussion. What would you bring to a 15-person seminar?`, type:'Communication', program:'lac', points:['Understanding of discussion-based, not lecture-based, learning','Specific habits (listening, building on others\' ideas)','Genuine enthusiasm for small-community learning'] },
  { q:`How do you contribute to a tight-knit residential campus community?`, type:'Community & Diversity', program:'lac', points:['Specific examples of community involvement','Understanding that LACs prize engaged, present students','Balance of individual pursuits and communal life'] },
  { q:`What's a topic outside your intended area of study that you'd want to take a class in, and why?`, type:'Academic Interests', program:'lac', points:['Authentic curiosity, not a strategic-sounding answer','Specificity — a real course or field, not "everything"','Connection to broader intellectual goals'] },
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
