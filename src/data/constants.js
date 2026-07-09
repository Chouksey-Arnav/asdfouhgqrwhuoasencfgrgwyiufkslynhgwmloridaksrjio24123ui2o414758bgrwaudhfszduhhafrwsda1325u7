// All non-quiz, non-elib constants

// ── LEARNING PATHS ────────────────────────────────────────────────────────────
// Medical-career study tracks for high schoolers heading into a pre-health
// undergrad. Every pathway here is a health profession — there is no
// engineering/business/humanities track. "Undecided" is the default so a new
// user isn't assumed into any single medical career before they take the
// diagnostic or read through the options themselves.
export const PATHS = {
  undecided: {
    label:'Exploring Pre-Health', accent:'#64748b', quizCats:['Life Sciences','Physical Sciences','Behavioral & Social Sciences'],
    tagline:'Not sure which medical path fits yet? Build the foundation every one of them needs.',
    overview:'You don\'t need to know whether you\'re headed toward medicine, nursing, research, or pharmacy yet — you need strong fundamentals in biology, chemistry, and data literacy so that whichever health path you eventually pick, you\'re not starting from behind. This is the default track for students who know they want to end up somewhere in medicine but haven\'t narrowed down where.',
    highlights:[
      'A balanced core across biology, chemistry, and statistics — the foundation every medical career builds on',
      'Freedom to sample physician-, nursing-, research-, and pharmacy-flavored content before committing to one',
      'A stronger, more flexible application profile if you haven\'t settled on a specific health career yet',
      'A natural on-ramp into any other pathway here once your interests sharpen',
    ],
    outcomes:['Undeclared Pre-Health','Biology','Health Sciences','Any major on the path to a medical career'],
    bestFor:['You know you want to work in medicine but not in what role yet','You want to keep your options open across health careers','You\'d rather build broad science strength than specialize early'],
    units:[
      { id:'ud1', title:'Core Science Foundations', quizCat:'Life Sciences', lessons:[
        { id:'ud1l1', title:'Biology Fundamentals', url:'https://www.khanacademy.org/science/biology', src:'Khan Academy' },
        { id:'ud1l2', title:'Chemistry Fundamentals', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'ud1l3', title:'Human Physiology Overview', url:'https://www.youtube.com/watch?v=X9ZZ6tcxArI', src:'YouTube' },
      ]},
      { id:'ud2', title:'Statistics & Data Basics', quizCat:'Physical Sciences', lessons:[
        { id:'ud2l1', title:'Descriptive Statistics', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'ud2l2', title:'Probability Fundamentals', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'ud2l3', title:'Reading Charts & Data Sets', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
      ]},
      { id:'ud3', title:'Exploring Health Careers', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ud3l1', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ud3l2', title:'What Pre-Health Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ud3l3', title:'Intro to Health & Medicine', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
      ]},
    ]
  },
  physician: {
    label:'Physician (MD/DO)', accent:'#ef4444', quizCats:['Life Sciences','Physical Sciences','Behavioral & Social Sciences'],
    tagline:'For students who want to diagnose, treat, and lead a patient\'s care directly.',
    overview:'This pathway is built for students drawn to being the decision-maker in the room — the one who weighs symptoms, orders tests, and decides on a treatment plan. It leans hard into biology and chemistry depth, since those are the subjects pre-med coursework and the eventual MCAT are built on, while being honest that becoming a physician is a long road (undergrad, then medical school, then residency) that rewards patience as much as intensity.',
    highlights:[
      'Cell biology, genetics, and physiology fundamentals that map directly onto intro biology and pre-med coursework',
      'Chemistry grounding (acid-base, organic basics) that eases the transition into college-level chem, a common pre-med bottleneck',
      'Realistic guidance on clinical exposure — shadowing and volunteering — and what pre-med admissions actually screen for',
      'A framework for thinking about the long timeline of becoming a physician, so it never feels like a surprise later',
    ],
    outcomes:['Biology / Pre-Med','Neuroscience','Biochemistry','Human Physiology'],
    bestFor:['You want to be the one making the final call on someone\'s care','You\'re energized by variety and high-stakes problem solving','You\'re comfortable with a long training path in exchange for a lot of responsibility'],
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
      { id:'ph3', title:'Exploring a Physician\'s Path', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ph3l1', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ph3l2', title:'What Pre-Med Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ph3l3', title:'Intro to Health & Medicine', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
      ]},
    ]
  },
  nursing: {
    label:'Nursing', accent:'#ec4899', quizCats:['Life Sciences','Behavioral & Social Sciences'],
    tagline:'For students who want to be the steady, hands-on presence in someone\'s care every single day.',
    overview:'This pathway is for students who\'d rather be the person a patient sees and trusts consistently than the one making a single big decision. It combines the human physiology and pharmacology basics nursing programs expect with a strong emphasis on communication — because nursing is as much about how you talk to a scared patient or a worried family as it is about clinical skill.',
    highlights:[
      'Human physiology and basic pharmacology grounding that maps onto intro nursing coursework',
      'Chemistry fundamentals (acid-base balance, medication basics) that ease the transition into college-level science',
      'Communication and patient-interaction practice — the skill nursing programs care about as much as test scores',
      'Realistic guidance on hospital volunteer programs and other age-appropriate clinical exposure',
    ],
    outcomes:['Nursing (BSN)','Health Sciences','Public Health'],
    bestFor:['You want to be the familiar, trusted face someone sees every day','You think best on your feet, in the moment, with a person in front of you','You want a hands-on health career without the longest possible training path'],
    units:[
      { id:'nu1', title:'Human Biology & Physiology', quizCat:'Life Sciences', lessons:[
        { id:'nu1l1', title:'Cell Biology & Metabolism', url:'https://www.youtube.com/watch?v=4eLjRcHnMCk', src:'YouTube' },
        { id:'nu1l2', title:'Human Physiology Overview', url:'https://www.youtube.com/watch?v=X9ZZ6tcxArI', src:'YouTube' },
        { id:'nu1l3', title:'Intro to Health & Medicine', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
      ]},
      { id:'nu2', title:'Chemistry & Medication Basics', quizCat:'Life Sciences', lessons:[
        { id:'nu2l1', title:'Acid-Base Chemistry', url:'https://www.youtube.com/watch?v=eB1qG5EEDk0', src:'YouTube' },
        { id:'nu2l2', title:'Chemistry Fundamentals', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'nu2l3', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
      ]},
      { id:'nu3', title:'Patient Care & Communication', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'nu3l1', title:'Social Psychology & Cognition', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOPRKzVLY0jJY-uHOH9KVU6', src:'Crash Course' },
        { id:'nu3l2', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'nu3l3', title:'What Health Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  research: {
    label:'Biomedical Research', accent:'#8b5cf6', quizCats:['Life Sciences','Physical Sciences'],
    tagline:'For students who want to discover how the body works and find the next treatment or cure.',
    overview:'This pathway is built for students who\'d rather spend a Saturday digging into a data set or an experiment than anything else on this list. It emphasizes the scientific method, statistics, and biology/chemistry depth that biomedical research careers are built on — and is honest that this work is slower and more methodical than clinical medicine, rewarding patience and curiosity over quick decision-making.',
    highlights:[
      'Cell biology, genetics, and molecular biology fundamentals that map onto intro research-track coursework',
      'Study design, statistics, and hypothesis testing — the toolkit every research career depends on',
      'Chemistry fundamentals that carry directly into lab-based college coursework',
      'A realistic look at what a research career actually involves day-to-day, beyond "finding a cure"',
    ],
    outcomes:['Biology','Biochemistry','Molecular & Cell Biology','Neuroscience'],
    bestFor:['You love getting lost in data or an experiment until it makes sense','You\'re more curious about discovering something new than treating one patient','You\'re comfortable with slow, methodical work that pays off over months, not minutes'],
    units:[
      { id:'re1', title:'Biology & Biochemistry Foundations', quizCat:'Life Sciences', lessons:[
        { id:'re1l1', title:'Cell Biology & Metabolism', url:'https://www.youtube.com/watch?v=4eLjRcHnMCk', src:'YouTube' },
        { id:'re1l2', title:'Genetics & Molecular Biology', url:'https://www.youtube.com/watch?v=Qqe4thU-os8', src:'YouTube' },
        { id:'re1l3', title:'AP Biology Review', url:'https://www.khanacademy.org/science/ap-biology', src:'Khan Academy' },
      ]},
      { id:'re2', title:'Statistics & Research Methods', quizCat:'Physical Sciences', lessons:[
        { id:'re2l1', title:'Study Design & Bias', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'re2l2', title:'Statistics & Hypothesis Testing', url:'https://www.youtube.com/c/joshstarmer', src:'StatQuest' },
        { id:'re2l3', title:'Descriptive Statistics', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
      ]},
      { id:'re3', title:'Chemistry Core', quizCat:'Physical Sciences', lessons:[
        { id:'re3l1', title:'Acid-Base Chemistry', url:'https://www.youtube.com/watch?v=eB1qG5EEDk0', src:'YouTube' },
        { id:'re3l2', title:'Organic Chemistry Basics', url:'https://www.youtube.com/watch?v=wX-y00bZ4qI', src:'YouTube' },
        { id:'re3l3', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
      ]},
    ]
  },
  pharmacy: {
    label:'Pharmacy', accent:'#10b981', quizCats:['Life Sciences','Physical Sciences'],
    tagline:'For students fascinated by how medications work and obsessed with getting the details exactly right.',
    overview:'This pathway is for students who like clear rules, exact answers, and precision — and who also want some patient interaction without the longest possible training path. It leans heavily on chemistry, since pharmacy is built on understanding how compounds interact with the body, alongside biology fundamentals and a taste of the patient-counseling side of the job.',
    highlights:[
      'Deep chemistry grounding (acid-base, organic basics) — the subject pharmacy programs care about most',
      'Biology and human physiology fundamentals that explain why medications work the way they do',
      'Math and data literacy for dosage calculations and reading drug interaction data',
      'An honest look at the precision- and detail-heavy day-to-day of pharmacy work',
    ],
    outcomes:['Pre-Pharmacy','Biochemistry','Chemistry'],
    bestFor:['You like clear rules and getting the exact right answer','You\'re detail-obsessed — you double-check everything','You want patient interaction without being the one making treatment decisions'],
    units:[
      { id:'pr1', title:'Chemistry for Health Sciences', quizCat:'Physical Sciences', lessons:[
        { id:'pr1l1', title:'Acid-Base Chemistry', url:'https://www.youtube.com/watch?v=eB1qG5EEDk0', src:'YouTube' },
        { id:'pr1l2', title:'Organic Chemistry Basics', url:'https://www.youtube.com/watch?v=wX-y00bZ4qI', src:'YouTube' },
        { id:'pr1l3', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
      ]},
      { id:'pr2', title:'Biology & Physiology Foundations', quizCat:'Life Sciences', lessons:[
        { id:'pr2l1', title:'Cell Biology & Metabolism', url:'https://www.youtube.com/watch?v=4eLjRcHnMCk', src:'YouTube' },
        { id:'pr2l2', title:'Human Physiology Overview', url:'https://www.youtube.com/watch?v=X9ZZ6tcxArI', src:'YouTube' },
        { id:'pr2l3', title:'Biology Fundamentals', url:'https://www.khanacademy.org/science/biology', src:'Khan Academy' },
      ]},
      { id:'pr3', title:'Math & Data for Pharmacy', quizCat:'Physical Sciences', lessons:[
        { id:'pr3l1', title:'Algebra II Essentials', url:'https://www.khanacademy.org/math/algebra2', src:'Khan Academy' },
        { id:'pr3l2', title:'Descriptive Statistics', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'pr3l3', title:'Reading Charts & Data Sets', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
      ]},
    ]
  },
  alliedHealth: {
    label:'Allied Health & Therapy', accent:'#f59e0b', quizCats:['Life Sciences','Physical Sciences'],
    tagline:'For students who want to help people rebuild strength, movement, and independence, one session at a time.',
    overview:'This pathway covers the professions built around hands-on rehabilitation and coaching — physical therapy, occupational therapy, athletic training, and physician assistant work. It\'s for students who like watching someone make visible, measurable progress over weeks of consistent work, and who\'d rather teach and coach a skill than just prescribe a treatment.',
    highlights:[
      'Anatomy and human physiology fundamentals focused on movement and the musculoskeletal system',
      'Physics fundamentals (forces, motion, energy) that underpin biomechanics and rehab science',
      'Chemistry and biology grounding shared with every other health-science track',
      'Realistic guidance on hands-on exposure — shadowing a therapist or trainer, hospital volunteer programs',
    ],
    outcomes:['Kinesiology / Exercise Science','Physical Therapy (Pre-PT)','Occupational Therapy (Pre-OT)','Physician Assistant Studies'],
    bestFor:['You like coaching someone through progress over weeks or months, not once','You\'re drawn to movement, sports, and the musculoskeletal side of the body','You want a hands-on health career centered on rebuilding ability, not treating disease'],
    units:[
      { id:'al1', title:'Human Physiology & Anatomy', quizCat:'Life Sciences', lessons:[
        { id:'al1l1', title:'Human Physiology Overview', url:'https://www.youtube.com/watch?v=X9ZZ6tcxArI', src:'YouTube' },
        { id:'al1l2', title:'Cell Biology & Metabolism', url:'https://www.youtube.com/watch?v=4eLjRcHnMCk', src:'YouTube' },
        { id:'al1l3', title:'AP Biology Review', url:'https://www.khanacademy.org/science/ap-biology', src:'Khan Academy' },
      ]},
      { id:'al2', title:'Physics for Movement & Biomechanics', quizCat:'Physical Sciences', lessons:[
        { id:'al2l1', title:'Motion, Forces & Energy', url:'https://www.khanacademy.org/science/physics', src:'Khan Academy' },
        { id:'al2l2', title:'Physics Fundamentals', url:'https://www.khanacademy.org/science/physics', src:'Khan Academy' },
        { id:'al2l3', title:'Chemistry Fundamentals', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
      ]},
      { id:'al3', title:'Exploring a Hands-On Health Career', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'al3l1', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'al3l2', title:'What Health Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'al3l3', title:'Intro to Health & Medicine', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
      ]},
    ]
  },
  publicHealth: {
    label:'Public Health & Policy', accent:'#3b82f6', quizCats:['Behavioral & Social Sciences','Physical Sciences'],
    tagline:'For students who want to improve health outcomes for entire communities, not just one patient at a time.',
    overview:'This pathway is for students who think in systems — who\'d rather fix the reason a community lacks access to care than treat one patient at a time. It combines statistics and data literacy with sociology, government, and communication, the mix that public health and health policy majors expect from incoming students.',
    highlights:[
      'Statistics and data literacy applied to population-level health questions',
      'Sociology and civics grounding — how communities, policy, and health outcomes connect',
      'Communication practice for outreach, advocacy, and public-facing health education',
      'A big-picture view of healthcare that complements every clinical or research track here',
    ],
    outcomes:['Public Health','Health Policy','Sociology','Global Health'],
    bestFor:['You care more about the whole community than any one situation','You like using data to understand what\'s happening across a population','You want a health career built around advocacy, education, and systems change'],
    units:[
      { id:'pu1', title:'Statistics & Data for Public Health', quizCat:'Physical Sciences', lessons:[
        { id:'pu1l1', title:'Descriptive Statistics', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'pu1l2', title:'Reading Charts & Data Sets', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'pu1l3', title:'Study Design & Bias', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
      ]},
      { id:'pu2', title:'Sociology & Government', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'pu2l1', title:'Social Stratification & Inequality', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtMJ-AfB_7J1538YKWkZAnGA', src:'Crash Course' },
        { id:'pu2l2', title:'Government & Civics', url:'https://www.khanacademy.org/humanities/us-government-and-civics', src:'Khan Academy' },
        { id:'pu2l3', title:'Cultural Anthropology Basics', url:'https://www.khanacademy.org/science/ap-psychology/social-psychology', src:'Khan Academy' },
      ]},
      { id:'pu3', title:'Intro to Public & Community Health', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'pu3l1', title:'Intro to Health & Medicine', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
        { id:'pu3l2', title:'What Health Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'pu3l3', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
};

// ── AI COACH — PATHWAY-SPECIFIC BEHAVIORAL NOTES ─────────────────────────────
// Short, behavioral (not marketing) guidance injected into the Metabrain system
// prompt so the coach's advice matches what's actually realistic/appropriate for
// a high schooler on each track. Distinct from PATHS[].overview/highlights above.
export const PATH_COACH_NOTES = {
  undecided: 'This student hasn\'t settled on a specific medical career yet — encourage exploration across health professions (HOSA, shadowing with a guardian\'s help, the diagnostic quiz) rather than pushing them toward physician, nursing, research, or any other single track.',
  physician: 'This is an EXPLORATORY track only, not a commitment. Steer them toward age-appropriate exposure — shadowing a local physician with a parent/guardian\'s help, hospital teen-volunteer programs, HOSA, school science fairs, or a summer pre-college research program. Never bring up the MCAT, clinical rotations, or medical-school-style interview prep (MMI/CASPer) — this student is years away from any of that, and it isn\'t useful or relevant to them right now.',
  nursing: 'Point them toward HOSA, hospital teen-volunteer or candy-striper-style programs, CPR/first-aid certification, and school health-science electives when relevant. Keep it high-school-scaled — nursing school application prep is years away and not useful to bring up now.',
  research: 'Point them toward school science fairs, Science Olympiad, Regeneron STS, and summer pre-college research programs when relevant — keep it high-school-scaled (school labs, mentored summer programs), not college- or grad-lab-level.',
  pharmacy: 'Point them toward HOSA, chemistry-focused coursework and competitions, and shadowing a local pharmacist with a guardian\'s help when relevant. Keep it age-appropriate — pharmacy school admissions details are years away.',
  alliedHealth: 'Point them toward athletic training/sports medicine clubs, HOSA, shadowing a physical or occupational therapist with a guardian\'s help, and school sports-medicine or kinesiology electives when relevant.',
  publicHealth: 'Point them toward school health-advocacy clubs, HOSA, Model UN or civics-focused activities, and community health volunteering when relevant.',
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
// Personality/character/interest diagnostic mapping to medical-career pathways:
// physician, nursing, research, pharmacy, alliedHealth, publicHealth. Each
// question's answer choices are ordered to match its `map` array 1:1, and the
// six pathway keys are rotated across questions/options so every pathway gets
// roughly equal representation (8 of 48 total answer slots each) rather than
// always appearing in the same position.
export const DIAG_QS = [
  { q:'In a crisis, what\'s your instinct?', ch:['Assess quickly and decide on a plan of action','Comfort the people involved and keep everyone calm','Step back and figure out exactly what went wrong','Check every detail twice before acting'], type:'interest', map:['physician','nursing','research','pharmacy'] },
  { q:'What kind of relationship with people do you want in your future work?', ch:['Getting to know the same people well through repeated, daily interactions','Working mostly behind the scenes, with occasional collaboration','Precise, one-on-one conversations where accuracy really matters','Coaching someone through progress over weeks or months'], type:'interest', map:['nursing','research','pharmacy','alliedHealth'] },
  { q:'Which of these would you rather spend a Saturday doing?', ch:['Running an experiment or digging into a data set until it makes sense','Organizing your notes or meds so nothing gets mixed up','Helping a friend recover from an injury with a workout or stretching plan','Volunteering at a health fair or organizing a community fundraiser'], type:'interest', map:['research','pharmacy','alliedHealth','publicHealth'] },
  { q:'A friend describes a personality trait you have. Which fits best?', ch:['Detail-obsessed — you double check everything','Patient — you\'ll coach someone through the same drill ten times if that\'s what it takes','Big-picture — you care more about the whole community than any one situation','Decisive — people trust you to make the call when it matters'], type:'interest', map:['pharmacy','alliedHealth','publicHealth','physician'] },
  { q:'Which compliment would mean the most to you?', ch:['"You helped me get my strength and independence back."','"You helped change something for a lot of people, not just one."','"I trust you completely with the hard decisions."','"You always know exactly how to make someone feel okay."'], type:'interest', map:['alliedHealth','publicHealth','physician','nursing'] },
  { q:'A patient\'s blood pressure spikes right before a scheduled procedure. What\'s the most useful next step?', ch:['Look at whether this reflects a wider pattern across many patients on this medication','Weigh the immediate risk and decide whether to proceed, delay, or adjust the plan','Stay with the patient, monitor closely, and keep them calm while the team decides','Note it as a data point — what would need to be tracked to see if this is common'], type:'content', map:['publicHealth','physician','nursing','research'] },
  { q:'Which work pace fits you best?', ch:['Fast-moving, high-stakes, and always different','Slow, methodical, and deeply focused on one problem at a time','Steady and hands-on, working toward visible progress over weeks','Varied — some days planning, some days out talking with the community'], type:'interest', map:['physician','research','alliedHealth','publicHealth'] },
  { q:'In a group project, what role do you naturally take?', ch:['The one who checks in on how everyone\'s actually doing','The one who catches the small mistakes everyone else missed','The one who makes the final call when the group\'s stuck','The one who thinks about the bigger goal the project is serving'], type:'interest', map:['nursing','pharmacy','physician','publicHealth'] },
  { q:'Which of these sounds most satisfying to you?', ch:['Discovering something no one knew before','Watching someone regain an ability they\'d lost','Being the steady, familiar face someone sees every day','Being the person people trust to get their medication exactly right'], type:'interest', map:['research','alliedHealth','nursing','pharmacy'] },
  { q:'Two patients are prescribed the same drug, but one develops side effects and the other doesn\'t. What\'s most interesting to you about that?', ch:['Whether this is common enough to affect prescribing guidelines broadly','Figuring out the exact dosage or interaction that caused it','What\'s biologically different between the two patients','Deciding how to adjust this specific patient\'s treatment right now'], type:'content', map:['publicHealth','pharmacy','research','physician'] },
  { q:'What motivates you to keep showing up and trying, even on hard days?', ch:['Seeing measurable progress, even if it\'s slow','Knowing someone\'s counting on you being there today','The responsibility of people trusting you with tough calls','Curiosity about the next thing you might figure out'], type:'interest', map:['alliedHealth','nursing','physician','research'] },
  { q:'If you could fix one thing about healthcare, what would it be?', ch:['Make sure everyone actually has access to care, not just some people','Reduce medication errors and confusion about how to take things correctly','Make recovery and rehab support more available to everyone who needs it','Make sure patients never feel rushed or unheard'], type:'interest', map:['publicHealth','pharmacy','alliedHealth','nursing'] },
];
