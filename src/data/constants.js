// All non-quiz, non-elib constants

// ── LEARNING PATHS ────────────────────────────────────────────────────────────
// Medicine & health-career study tracks for college-bound high schoolers.
// "Exploring Pre-Health" is the default track — a new user isn't assumed into
// any single health career, but every track here is health/medicine-scoped
// (this app exists to prep students for a med/health path, not a general major).
//
// Each pathway carries, beyond the display fields:
//   - idealVector: the pathway's position on the 5 DIAG_AXES (see below), used
//     by src/lib/diagnosticEngine.js to score the diagnostic against it.
//   - benchmarks: rough high-school-scale targets (not med-school-applicant
//     numbers) for shadowing/clinical/volunteer/leadership hours, used by the
//     Portfolio and Progress benchmark bars.
//   - accent2/glow/gradient: the pathway's visual identity beyond a single hex.
export const PATHS = {
  exploring: {
    label:'Exploring Pre-Health', accent:'#64748b', accent2:'#94a3b8', glow:'rgba(100,116,139,0.30)',
    gradient:'linear-gradient(135deg,#64748b 0%,#334155 100%)',
    quizCats:['Life Sciences','Physical Sciences','Behavioral & Social Sciences'],
    idealVector:{ peopleFacing:0, handsOn:0, acuity:0, autonomy:0, directCare:0 },
    benchmarks:{ shadowingHours:15, clinicalHours:40, volunteerHours:60, leadershipHours:30 },
    tagline:'Keep every door in medicine open while you figure out which one is yours.',
    overview:'You don\'t need to have picked "the" health career to get real value out of this pathway — you need strong science fundamentals and honest exposure to what different medicine and health-science careers actually look like day to day. This track builds a balanced foundation across biology, chemistry, and the behavioral/social science side of patient care, so that whichever health path you eventually pick, you\'re not starting from behind. It\'s the default track for students who know they\'re drawn to medicine broadly but haven\'t narrowed it down yet.',
    highlights:[
      'A balanced core across life sciences, physical sciences, and behavioral/social sciences — the same mix every health career draws on',
      'Freedom to sample physician, nursing, research, and allied-health content before committing to one',
      'Low-pressure exposure to shadowing and volunteering so you can test the field itself, not just the coursework',
      'A natural on-ramp into any other pathway here once your interests sharpen — retake the diagnostic anytime',
    ],
    outcomes:['Undeclared Pre-Health / Biology','Any med/health-track major requiring strong science fundamentals','A confident, informed choice of specific health career before you declare'],
    bestFor:['You know you want to help people through medicine or health science, but not which role yet','You want to keep your options wide across clinical, research, and allied-health careers','You\'d rather build broad strength than specialize before you\'ve tested the field'],
    units:[
      { id:'ex1', title:'Life Sciences Foundations', quizCat:'Life Sciences', lessons:[
        { id:'ex1l1', title:'Biology Fundamentals', url:'https://www.khanacademy.org/science/biology', src:'Khan Academy' },
        { id:'ex1l2', title:'AP Biology Review', url:'https://www.khanacademy.org/science/ap-biology', src:'Khan Academy' },
        { id:'ex1l3', title:'Human Physiology Overview', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
      ]},
      { id:'ex2', title:'Physical Sciences Foundations', quizCat:'Physical Sciences', lessons:[
        { id:'ex2l1', title:'Chemistry Fundamentals', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'ex2l2', title:'Physics Fundamentals', url:'https://www.khanacademy.org/science/physics', src:'Khan Academy' },
        { id:'ex2l3', title:'Statistics & Data Basics', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
      ]},
      { id:'ex3', title:'Exploring Health Careers', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ex3l1', title:'Intro to Psychology', url:'https://www.youtube.com/watch?v=vo4pMVb0R6M', src:'YouTube' },
        { id:'ex3l2', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ex3l3', title:'What Pre-Health Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  physician: {
    label:'Physician (MD/DO)', accent:'#2d7fff', accent2:'#60a5fa', glow:'rgba(45,127,255,0.35)',
    gradient:'linear-gradient(135deg,#2d7fff 0%,#1d4ed8 100%)',
    quizCats:['Life Sciences','Physical Sciences','Behavioral & Social Sciences'],
    idealVector:{ peopleFacing:0.7, handsOn:0.3, acuity:0.6, autonomy:0.8, directCare:0.9 },
    benchmarks:{ shadowingHours:40, clinicalHours:100, volunteerHours:100, leadershipHours:50 },
    tagline:'For students who want the final call on diagnosis and treatment, patient in front of them.',
    overview:'This pathway builds the deep biology, chemistry, and physiology fundamentals that pre-med coursework and the MCAT eventually demand, while staying scoped to what a high schooler can realistically do now — strong science grades, real shadowing exposure, and an honest look at what the physician path actually requires (years of school, high-stakes decision-making, direct responsibility for patients). It\'s for students who want to be the one making the call, not just supporting it.',
    highlights:[
      'Deep biology and biochemistry practice — cell biology, genetics, and physiology that intro pre-med coursework builds directly on',
      'Chemistry fundamentals (general, organic-basics, acid-base) that ease the transition into college-level chem, the classic pre-med bottleneck',
      'Realistic guidance on shadowing physicians and what medical schools actually screen for, scoped to what\'s appropriate at your age',
      'A results screen that\'s honest about the length and intensity of this path, not just the prestige of it',
    ],
    outcomes:['Biology / Pre-Med','Neuroscience','Chemistry (pre-med track)','Any rigorous science major with an MD/DO goal after undergrad'],
    bestFor:['You want to be the one making the final diagnosis and treatment call','You\'re comfortable with high-stakes, fast-moving situations','You\'re willing to commit to the longest training path in medicine'],
    units:[
      { id:'phy1', title:'Biology & Biochemistry Foundations', quizCat:'Life Sciences', lessons:[
        { id:'phy1l1', title:'Cell Biology & Genetics (AP Bio)', url:'https://www.khanacademy.org/science/ap-biology', src:'Khan Academy' },
        { id:'phy1l2', title:'Human Physiology Systems', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
        { id:'phy1l3', title:'Immune System & Homeostasis', url:'https://www.youtube.com/watch?v=GIJK3dwCWCw', src:'YouTube' },
      ]},
      { id:'phy2', title:'Chemistry for Medicine', quizCat:'Physical Sciences', lessons:[
        { id:'phy2l1', title:'General & Organic Chemistry', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'phy2l2', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
        { id:'phy2l3', title:'Acid-Base Chemistry & Titrations', url:'https://www.youtube.com/watch?v=eB1qG5EEDk0', src:'YouTube' },
      ]},
      { id:'phy3', title:'The Physician Path', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'phy3l1', title:'Doctor-Patient Communication & Ethics', url:'https://www.khanacademy.org/science/ap-college-psychology-13', src:'Khan Academy' },
        { id:'phy3l2', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'phy3l3', title:'What Medical Schools Actually Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  nursing: {
    label:'Nursing (RN/BSN)', accent:'#ec4899', accent2:'#f472b6', glow:'rgba(236,72,153,0.35)',
    gradient:'linear-gradient(135deg,#ec4899 0%,#be185d 100%)',
    quizCats:['Life Sciences','Behavioral & Social Sciences'],
    idealVector:{ peopleFacing:0.9, handsOn:0.8, acuity:0.5, autonomy:-0.2, directCare:0.9 },
    benchmarks:{ shadowingHours:30, clinicalHours:120, volunteerHours:100, leadershipHours:40 },
    tagline:'For students who want to be the person a patient actually sees the most.',
    overview:'This pathway builds anatomy/physiology depth alongside the math and communication skills nursing programs expect on day one — dosage calculations, patient assessment basics, and the psychology of care. It\'s for students who want hands-on, direct patient contact as the center of their career, working as part of a team rather than carrying sole diagnostic responsibility, and who care as much about how someone is treated as what treatment they receive.',
    highlights:[
      'Anatomy & physiology depth (via Crash Course A&P) that maps directly onto nursing-program prerequisites',
      'Math and statistics grounding for dosage calculations, a skill nursing programs test early and often',
      'Patient communication and psychology content — nursing is a relationship-heavy profession, and this track treats it that way',
      'Realistic guidance on hospital teen-volunteer programs and what nursing programs actually look for',
    ],
    outcomes:['Nursing (BSN)','Health Sciences','Biology (nursing-track)','Public Health (clinical track)'],
    bestFor:['You want constant, direct contact with patients over a career, not occasional','You like hands-on work as much as you like understanding why it works','You\'d rather be deeply embedded in a care team than working solo'],
    units:[
      { id:'nur1', title:'Anatomy & Physiology Foundations', quizCat:'Life Sciences', lessons:[
        { id:'nur1l1', title:'Anatomy & Physiology Overview', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtMyRLxWzB1yWEyRDXZfebT9', src:'YouTube' },
        { id:'nur1l2', title:'The Nervous System', url:'https://www.youtube.com/watch?v=qPix_X-9t7E', src:'YouTube' },
        { id:'nur1l3', title:'The Respiratory System', url:'https://www.youtube.com/watch?v=bHZsvBdUC2I', src:'YouTube' },
      ]},
      { id:'nur2', title:'Chemistry & Math for Nursing', quizCat:'Life Sciences', lessons:[
        { id:'nur2l1', title:'General Chemistry Basics', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'nur2l2', title:'Statistics for Dosage & Data', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'nur2l3', title:'Algebra Review for Calculations', url:'https://www.khanacademy.org/math/algebra2', src:'Khan Academy' },
      ]},
      { id:'nur3', title:'Patient Care & Communication', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'nur3l1', title:'Psychology of Patient Care', url:'https://www.khanacademy.org/science/ap-college-psychology-13', src:'Khan Academy' },
        { id:'nur3l2', title:'Hospital & Clinical Volunteering 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'nur3l3', title:'What Nursing Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  physicianAssistant: {
    label:'Physician Assistant', accent:'#06b6d4', accent2:'#22d3ee', glow:'rgba(6,182,212,0.35)',
    gradient:'linear-gradient(135deg,#06b6d4 0%,#0e7490 100%)',
    quizCats:['Life Sciences','Physical Sciences','Behavioral & Social Sciences'],
    idealVector:{ peopleFacing:0.7, handsOn:0.5, acuity:0.5, autonomy:0.1, directCare:0.85 },
    benchmarks:{ shadowingHours:40, clinicalHours:100, volunteerHours:80, leadershipHours:40 },
    tagline:'For students who want physician-level clinical work without going it alone.',
    overview:'This pathway covers the same biology, chemistry, and physiology fundamentals as the physician track, since PA programs draw on the same science base, but leans into what actually differentiates the role: working closely with a supervising physician and a care team rather than carrying sole responsibility. It\'s for students drawn to hands-on clinical work — diagnosing, treating, prescribing — who\'d rather do that as part of a team than shoulder every decision alone.',
    highlights:[
      'The same core biology/physiology and chemistry depth pre-med students build, since PA programs share that prerequisite base',
      'Content framed around collaborative, team-based clinical practice rather than solo diagnostic responsibility',
      'A faster, more direct training path than the MD/DO route — this track is honest about that tradeoff',
      'Realistic shadowing guidance focused on PA-supervised clinical settings',
    ],
    outcomes:['Biology / Health Sciences (PA-track)','Exercise Science','Any science major with strong direct clinical hours before PA school'],
    bestFor:['You want hands-on diagnostic and treatment work without years of solo-authority training first','You like being part of a physician-led care team, not working in isolation','You want a faster path into direct patient care than the MD/DO route'],
    units:[
      { id:'pa1', title:'Biology & Physiology Core', quizCat:'Life Sciences', lessons:[
        { id:'pa1l1', title:'Cell Biology & Genetics (AP Bio)', url:'https://www.khanacademy.org/science/ap-biology', src:'Khan Academy' },
        { id:'pa1l2', title:'Human Physiology Systems', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
        { id:'pa1l3', title:'Immune System & Homeostasis', url:'https://www.youtube.com/watch?v=GIJK3dwCWCw', src:'YouTube' },
      ]},
      { id:'pa2', title:'Chemistry Foundations', quizCat:'Physical Sciences', lessons:[
        { id:'pa2l1', title:'General Chemistry', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'pa2l2', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
        { id:'pa2l3', title:'Reaction Kinetics & Rate Laws', url:'https://www.youtube.com/watch?v=Ue2m_l91W2w', src:'YouTube' },
      ]},
      { id:'pa3', title:'The PA Path', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'pa3l1', title:'Team-Based Clinical Care & Psychology', url:'https://www.khanacademy.org/science/ap-college-psychology-13', src:'Khan Academy' },
        { id:'pa3l2', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'pa3l3', title:'What PA Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  pharmacy: {
    label:'Pharmacy (PharmD)', accent:'#8b5cf6', accent2:'#a78bfa', glow:'rgba(139,92,246,0.35)',
    gradient:'linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)',
    quizCats:['Life Sciences','Physical Sciences'],
    idealVector:{ peopleFacing:0.0, handsOn:0.2, acuity:-0.1, autonomy:0.3, directCare:0.1 },
    benchmarks:{ shadowingHours:25, clinicalHours:60, volunteerHours:60, leadershipHours:40 },
    tagline:'For students who want the chemistry of how treatment actually works.',
    overview:'This pathway leans hard into chemistry — organic chemistry basics, reaction kinetics, and how molecules interact with the body — since that\'s the core science pharmacists live in every day, from checking drug interactions to understanding dosing. It\'s for students who like precision and getting the details exactly right more than they like constant patient-facing conversation, but who still want their work to directly matter to someone\'s treatment.',
    highlights:[
      'Deep chemistry practice — organic chemistry basics and reaction kinetics that map directly onto how drugs are designed and metabolized',
      'Biology grounding in how proteins and cellular processes are actually drug targets, not just abstract biochemistry',
      'Math and statistics for dosing and drug-interaction reasoning',
      'Realistic guidance on pharmacy shadowing and what PharmD programs actually screen for',
    ],
    outcomes:['Chemistry (pharmacy-track)','Biochemistry','Biology with a strong chemistry sequence'],
    bestFor:['You like precision — getting a calculation or interaction exactly right matters to you','You\'re drawn to chemistry more than any other science class','You want your work to matter to patients without constant direct patient contact'],
    units:[
      { id:'ph1', title:'Chemistry for Pharmacy', quizCat:'Physical Sciences', lessons:[
        { id:'ph1l1', title:'Organic Chemistry Basics', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'ph1l2', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
        { id:'ph1l3', title:'Reaction Kinetics & Rate Laws', url:'https://www.youtube.com/watch?v=Ue2m_l91W2w', src:'YouTube' },
      ]},
      { id:'ph2', title:'Biology & the Human Body', quizCat:'Life Sciences', lessons:[
        { id:'ph2l1', title:'Cell Biology & Metabolism (AP Bio)', url:'https://www.khanacademy.org/science/ap-biology', src:'Khan Academy' },
        { id:'ph2l2', title:'Human Physiology Overview', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
        { id:'ph2l3', title:'Protein Synthesis & Drug Targets', url:'https://www.youtube.com/watch?v=bKIpDtJdK8Q', src:'YouTube' },
      ]},
      { id:'ph3', title:'Exploring Pharmacy', quizCat:'Physical Sciences', lessons:[
        { id:'ph3l1', title:'Math & Statistics for Dosing', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'ph3l2', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ph3l3', title:'What Pharmacy Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  dentistry: {
    label:'Dentistry (DDS/DMD)', accent:'#14b8a6', accent2:'#2dd4bf', glow:'rgba(20,184,166,0.35)',
    gradient:'linear-gradient(135deg,#14b8a6 0%,#0f766e 100%)',
    quizCats:['Life Sciences','Physical Sciences'],
    idealVector:{ peopleFacing:0.5, handsOn:0.9, acuity:0.0, autonomy:0.7, directCare:0.7 },
    benchmarks:{ shadowingHours:30, clinicalHours:60, volunteerHours:60, leadershipHours:40 },
    tagline:'For students who want precise, hands-on procedural work with their own patients.',
    overview:'This pathway pairs biology and chemistry fundamentals with an emphasis on manual precision — dentistry is one of the most hands-on paths in medicine, where fine motor skill matters as much as diagnostic knowledge. It\'s for students who like working with their hands on a well-defined, visible problem, want to run their own practice one day, and want steady, scheduled patient relationships rather than unpredictable acute-care shifts.',
    highlights:[
      'Biology and anatomy depth (via Crash Course A&P) alongside chemistry fundamentals relevant to dental materials and oral health',
      'An honest emphasis on manual precision and hands-on skill, which dental programs screen for directly',
      'Realistic guidance on dental shadowing and clinic volunteering',
      'A path with more entrepreneurial upside (private practice ownership) than most other health careers here',
    ],
    outcomes:['Biology (pre-dental track)','Chemistry','Any strong science major with real dental shadowing hours before dental school'],
    bestFor:['You like precise, hands-on work more than fast-paced acute-care chaos','You could see yourself running your own practice one day','You want steady, scheduled patient relationships rather than unpredictable shifts'],
    units:[
      { id:'de1', title:'Biology & Oral Anatomy', quizCat:'Life Sciences', lessons:[
        { id:'de1l1', title:'Anatomy & Physiology Overview', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtMyRLxWzB1yWEyRDXZfebT9', src:'YouTube' },
        { id:'de1l2', title:'Cell Biology & Genetics (AP Bio)', url:'https://www.khanacademy.org/science/ap-biology', src:'Khan Academy' },
        { id:'de1l3', title:'Human Physiology Overview', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
      ]},
      { id:'de2', title:'Chemistry & Materials', quizCat:'Physical Sciences', lessons:[
        { id:'de2l1', title:'General Chemistry', url:'https://www.khanacademy.org/science/chemistry', src:'Khan Academy' },
        { id:'de2l2', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
        { id:'de2l3', title:'Acid-Base Chemistry (Enamel & pH)', url:'https://www.youtube.com/watch?v=eB1qG5EEDk0', src:'YouTube' },
      ]},
      { id:'de3', title:'The Dental Path', quizCat:'Life Sciences', lessons:[
        { id:'de3l1', title:'Patient Communication & Psychology', url:'https://www.khanacademy.org/science/ap-college-psychology-13', src:'Khan Academy' },
        { id:'de3l2', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'de3l3', title:'What Dental Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  biomedResearch: {
    label:'Biomedical & Clinical Research', accent:'#f59e0b', accent2:'#fbbf24', glow:'rgba(245,158,11,0.35)',
    gradient:'linear-gradient(135deg,#f59e0b 0%,#b45309 100%)',
    quizCats:['Life Sciences','Physical Sciences'],
    idealVector:{ peopleFacing:-0.7, handsOn:0.1, acuity:-0.5, autonomy:0.5, directCare:-0.8 },
    benchmarks:{ shadowingHours:10, clinicalHours:20, volunteerHours:40, leadershipHours:30 },
    tagline:'For students who\'d rather find the treatment than deliver it.',
    overview:'This pathway goes deepest into biology, biochemistry, and the scientific method of any track here — genetics, molecular biology, and how a real study is designed and analyzed. It\'s for students who are energized by the "why" behind a disease more than the day-to-day of treating patients, who\'d rather spend years on one careful question in a lab than see many patients in a day, and whose impact comes from findings that could eventually help far more people than they\'ll ever meet directly.',
    highlights:[
      'The deepest biology and genetics content in the app — DNA replication, transcription/translation, and molecular mechanisms',
      'Chemistry and thermodynamics fundamentals that underlie lab technique and biochemical research',
      'Real research-methods grounding — sampling, bias, statistical significance — plus a direct link to PubMed for when you\'re ready for an independent project',
      'Guidance on pre-college summer research programs, the realistic entry point into research at this age',
    ],
    outcomes:['Biology / Molecular Biology','Biochemistry','Genetics','Biomedical Engineering (research track)'],
    bestFor:['You\'re more energized by why something happens than by treating it directly','You\'d rather spend months on one careful question than see many patients a day','You want your impact to scale beyond the people you personally meet'],
    units:[
      { id:'br1', title:'Biology & Genetics Deep Dive', quizCat:'Life Sciences', lessons:[
        { id:'br1l1', title:'AP Biology Review', url:'https://www.khanacademy.org/science/ap-biology', src:'Khan Academy' },
        { id:'br1l2', title:'DNA Replication', url:'https://www.youtube.com/watch?v=Qqe4thU-os8', src:'YouTube' },
        { id:'br1l3', title:'Transcription & Translation', url:'https://www.youtube.com/watch?v=bKIpDtJdK8Q', src:'YouTube' },
      ]},
      { id:'br2', title:'Chemistry & Lab Foundations', quizCat:'Physical Sciences', lessons:[
        { id:'br2l1', title:'AP Chemistry Review', url:'https://www.khanacademy.org/science/ap-chemistry', src:'Khan Academy' },
        { id:'br2l2', title:'Reaction Kinetics & Rate Laws', url:'https://www.youtube.com/watch?v=Ue2m_l91W2w', src:'YouTube' },
        { id:'br2l3', title:'Gibbs Free Energy & Thermodynamics', url:'https://www.youtube.com/watch?v=Tj-w1W_pZ8M', src:'YouTube' },
      ]},
      { id:'br3', title:'Research Methods & the Scientific Process', quizCat:'Life Sciences', lessons:[
        { id:'br3l1', title:'Statistics & Probability', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'br3l2', title:'Sampling Methods & Bias', url:'https://www.youtube.com/watch?v=Rf-fIpB4D50', src:'YouTube' },
        { id:'br3l3', title:'PubMed Research Database', url:'https://pubmed.ncbi.nlm.nih.gov/', src:'PubMed' },
      ]},
    ]
  },
  physicalOccupTherapy: {
    label:'Physical & Occupational Therapy', accent:'#84cc16', accent2:'#a3e635', glow:'rgba(132,204,22,0.35)',
    gradient:'linear-gradient(135deg,#84cc16 0%,#4d7c0f 100%)',
    quizCats:['Life Sciences','Behavioral & Social Sciences'],
    idealVector:{ peopleFacing:0.6, handsOn:0.9, acuity:-0.3, autonomy:0.2, directCare:0.7 },
    benchmarks:{ shadowingHours:40, clinicalHours:100, volunteerHours:60, leadershipHours:30 },
    tagline:'For students who want to help someone get their life back, one session at a time.',
    overview:'This pathway pairs anatomy and movement science with the physics of how the body works mechanically — biomechanics, force, and motion — since PT/OT is where medicine and physical movement intersect most directly. It\'s for students who like hands-on, relationship-driven work over a longer timeline than acute care, and who find real satisfaction in someone\'s slow, visible progress rather than a single decisive intervention.',
    highlights:[
      'Anatomy and movement-focused physiology content (via Crash Course A&P and the nervous system)',
      'Physics fundamentals reframed around how the body actually moves — kinematics, forces, and fluid dynamics',
      'A longitudinal-care framing that matches how PT/OT actually works — progress over weeks, not single interventions',
      'Realistic guidance on PT/OT shadowing and what those programs actually look for',
    ],
    outcomes:['Kinesiology / Exercise Science','Biology (PT/OT track)','Athletic Training','Sports Medicine (allied-health track)'],
    bestFor:['You want hands-on work built around a long-term relationship, not a single procedure','You\'re drawn to how the body moves as much as how it heals','You get real satisfaction from someone\'s slow, visible progress'],
    units:[
      { id:'pt1', title:'Anatomy & Movement', quizCat:'Life Sciences', lessons:[
        { id:'pt1l1', title:'Anatomy & Physiology Overview', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtMyRLxWzB1yWEyRDXZfebT9', src:'YouTube' },
        { id:'pt1l2', title:'The Nervous System', url:'https://www.youtube.com/watch?v=qPix_X-9t7E', src:'YouTube' },
        { id:'pt1l3', title:'Human Physiology Overview', url:'https://www.khanacademy.org/science/health-and-medicine', src:'Khan Academy' },
      ]},
      { id:'pt2', title:'Physics of the Body', quizCat:'Life Sciences', lessons:[
        { id:'pt2l1', title:'Physics Fundamentals', url:'https://www.khanacademy.org/science/physics', src:'Khan Academy' },
        { id:'pt2l2', title:'Kinematics — Motion & Forces', url:'https://www.youtube.com/watch?v=xZMwK2HwJ7c', src:'YouTube' },
        { id:'pt2l3', title:'Fluids at Rest (Circulation & Pressure)', url:'https://www.youtube.com/watch?v=b5SqYoO4VXI', src:'YouTube' },
      ]},
      { id:'pt3', title:'The PT/OT Path', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'pt3l1', title:'Psychology of Rehab & Motivation', url:'https://www.khanacademy.org/science/ap-college-psychology-13', src:'Khan Academy' },
        { id:'pt3l2', title:'Shadowing & Clinical Exposure 101', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'pt3l3', title:'What PT/OT Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  publicHealth: {
    label:'Public Health', accent:'#10b981', accent2:'#34d399', glow:'rgba(16,185,129,0.35)',
    gradient:'linear-gradient(135deg,#10b981 0%,#047857 100%)',
    quizCats:['Life Sciences','Behavioral & Social Sciences'],
    idealVector:{ peopleFacing:-0.2, handsOn:-0.5, acuity:-0.7, autonomy:0.4, directCare:-0.85 },
    benchmarks:{ shadowingHours:15, clinicalHours:30, volunteerHours:100, leadershipHours:60 },
    tagline:'For students who want to treat a community, not one patient at a time.',
    overview:'This pathway combines biology and disease fundamentals with statistics and epidemiology thinking — how disease spreads, how data reveals patterns individual clinicians can\'t see, and how policy actually changes health outcomes at scale. It\'s for students who think in populations and systems rather than individual cases, and who\'d rather prevent ten thousand cases of something than treat one.',
    highlights:[
      'Biology and disease-transmission fundamentals paired directly with statistics and epidemiological reasoning',
      'A dedicated introduction to what public health actually is as a field — most students have never seen this content before',
      'Sociology and government/civics content, since public health lives at the intersection of science and policy',
      'Volunteer-hour guidance weighted toward community health work, not just clinical shadowing',
    ],
    outcomes:['Public Health','Epidemiology','Health Policy','Global Health','Sociology (public-health track)'],
    bestFor:['You think in populations and systems, not just individual cases','You\'re drawn to prevention over treatment','You want your work to touch thousands of people even if you never meet most of them'],
    units:[
      { id:'pu1', title:'Life Sciences for Public Health', quizCat:'Life Sciences', lessons:[
        { id:'pu1l1', title:'Biology Fundamentals', url:'https://www.khanacademy.org/science/biology', src:'Khan Academy' },
        { id:'pu1l2', title:'Immune System & Disease Spread', url:'https://www.youtube.com/watch?v=GIJK3dwCWCw', src:'YouTube' },
        { id:'pu1l3', title:'What Is Public Health?', url:'https://www.youtube.com/watch?v=5aww-Bpgkf4', src:'YouTube' },
      ]},
      { id:'pu2', title:'Data & Epidemiology', quizCat:'Life Sciences', lessons:[
        { id:'pu2l1', title:'Statistics & Probability', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'pu2l2', title:'Sampling Methods & Bias', url:'https://www.youtube.com/watch?v=Rf-fIpB4D50', src:'YouTube' },
        { id:'pu2l3', title:'What Is Statistics?', url:'https://www.youtube.com/watch?v=sxQaBpKfDRk', src:'YouTube' },
      ]},
      { id:'pu3', title:'Health Policy & Communities', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'pu3l1', title:'Sociology & Society', url:'https://www.youtube.com/playlist?list=PL8dPuuaLjXtMJ-AfB_7J1538YKWkZAnGA', src:'YouTube' },
        { id:'pu3l2', title:'Government & Civics', url:'https://www.khanacademy.org/humanities/us-government-and-civics', src:'Khan Academy' },
        { id:'pu3l3', title:'Community Health Volunteering', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
  healthAdmin: {
    label:'Health Administration', accent:'#f97316', accent2:'#fb923c', glow:'rgba(249,115,22,0.35)',
    gradient:'linear-gradient(135deg,#f97316 0%,#c2410c 100%)',
    quizCats:['Behavioral & Social Sciences','Physical Sciences'],
    idealVector:{ peopleFacing:-0.3, handsOn:-0.7, acuity:-0.6, autonomy:0.6, directCare:-0.9 },
    benchmarks:{ shadowingHours:15, clinicalHours:20, volunteerHours:60, leadershipHours:80 },
    tagline:'For students who want to make sure the whole hospital actually works.',
    overview:'This pathway blends economics, statistics, and leadership content, since running a clinic, hospital, or health system draws on business and organizational skill applied to a healthcare setting. It\'s for students who like the idea of medicine\'s impact and mission but are more energized by solving systems problems — staffing, budgets, patient flow — than by clinical care itself, and who want their leadership skill to be the thing that lets the actual caregivers do their jobs well.',
    highlights:[
      'Micro- and macroeconomic reasoning applied specifically to healthcare systems and costs',
      'Statistics and data literacy for operational decision-making — staffing, scheduling, resource allocation',
      'Leadership and communication practice, the core day-to-day skill of this career',
      'Realistic framing of health administration as a legitimate, high-impact way to be "in medicine" without direct clinical care',
    ],
    outcomes:['Health Administration / Health Sciences Management','Business Administration (healthcare track)','Economics (health-policy track)','Public Health (administration track)'],
    bestFor:['You\'re energized by fixing systems and processes more than treating patients directly','You want medicine\'s mission and impact without a clinical role','You like leading teams and owning outcomes at an organizational level'],
    units:[
      { id:'ha1', title:'Economics & Healthcare Systems', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ha1l1', title:'Microeconomics', url:'https://www.khanacademy.org/economics-finance-domain/microeconomics', src:'Khan Academy' },
        { id:'ha1l2', title:'Macroeconomics', url:'https://www.khanacademy.org/economics-finance-domain/macroeconomics', src:'Khan Academy' },
        { id:'ha1l3', title:'What Is Public Health?', url:'https://www.youtube.com/watch?v=5aww-Bpgkf4', src:'YouTube' },
      ]},
      { id:'ha2', title:'Data & Statistics for Operations', quizCat:'Physical Sciences', lessons:[
        { id:'ha2l1', title:'Statistics & Probability', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'ha2l2', title:'Reading Charts & Data Sets', url:'https://www.khanacademy.org/math/statistics-probability', src:'Khan Academy' },
        { id:'ha2l3', title:'Personal Finance Basics', url:'https://www.khanacademy.org/college-careers-more/personal-finance', src:'Khan Academy' },
      ]},
      { id:'ha3', title:'Leadership & the Business of Healthcare', quizCat:'Behavioral & Social Sciences', lessons:[
        { id:'ha3l1', title:'Public Speaking Fundamentals', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ha3l2', title:'Teamwork & Group Projects', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
        { id:'ha3l3', title:'What Health Administration Programs Look For', url:'https://www.khanacademy.org/college-careers-more', src:'Khan Academy' },
      ]},
    ]
  },
};

// ── COURSE → QUIZ CATEGORY MAP ────────────────────────────────────────────────
// Maps a student's self-reported courses (Settings) to the 3 quiz-library
// categories, so the Quiz Library and Metabrain Quiz Recommendations can both
// surface "matches your courses" without duplicating this mapping.
export const COURSE_CAT_MAP = {
  Biology:'Life Sciences', 'Environmental Science':'Life Sciences', 'Anatomy & Physiology':'Life Sciences',
  Chemistry:'Physical Sciences', Physics:'Physical Sciences',
  'AP Psychology':'Behavioral & Social Sciences', 'US History':'Behavioral & Social Sciences',
  'World History':'Behavioral & Social Sciences', 'AP US History':'Behavioral & Social Sciences',
  'AP World History':'Behavioral & Social Sciences', 'Health Science':'Life Sciences',
};

// ── AI COACH — PATHWAY-SPECIFIC BEHAVIORAL NOTES ─────────────────────────────
// Short, behavioral (not marketing) guidance injected into the Metabrain system
// prompt so the coach's advice matches what's actually realistic/appropriate for
// a high schooler on each track. Distinct from PATHS[].overview/highlights above.
// All tracks here (including "exploring") are EXPLORATORY, not commitments —
// never bring up the MCAT, clinical rotations, or clinical-style interview prep
// (MMI/CASPer) as something this student needs right now; they're years away.
export const PATH_COACH_NOTES = {
  exploring: 'This student hasn\'t settled on a specific health career yet — encourage exploration (shadowing a range of roles, the diagnostic quiz, HOSA, school science fairs) rather than pushing them toward one specific track.',
  physician: 'Point them toward rigorous science coursework, physician shadowing (with a parent/guardian\'s help), hospital teen-volunteer programs, HOSA, and school science fairs when relevant — keep it high-school-scaled, not med-school-scaled.',
  nursing: 'Point them toward anatomy/physiology coursework, hospital or clinic teen-volunteer programs, CNA-adjacent volunteer roles where locally available, and HOSA when relevant.',
  physicianAssistant: 'Point them toward strong science coursework and clinical shadowing similar to the physician track, framed around team-based care rather than solo responsibility.',
  pharmacy: 'Point them toward chemistry depth, pharmacy shadowing or volunteering, and math/stats coursework when relevant.',
  dentistry: 'Point them toward biology/chemistry coursework, dental-office shadowing or free-clinic volunteering, and hands-on/fine-motor activities (art, instruments, etc.) as relevant transferable experience.',
  biomedResearch: 'Point them toward AP science depth, school science fairs, Science Olympiad, Regeneron STS, and pre-college summer research programs when relevant — keep it high-school-scaled, not college-lab-level.',
  physicalOccupTherapy: 'Point them toward anatomy/kinesiology-adjacent coursework, athletic training room or PT-clinic shadowing, and sports/dance/movement background as relevant transferable experience.',
  publicHealth: 'Point them toward statistics/AP Psychology coursework, community health volunteering, and civics/government involvement when relevant.',
  healthAdmin: 'Point them toward DECA/FBLA, personal-finance and statistics literacy, and leadership roles (clubs, student government) framed around healthcare systems when relevant.',
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
// Personality/work-style + real career-content diagnostic that sorts students
// into one of the medicine/health-career pathways above. Scored by
// src/lib/diagnosticEngine.js, not by simple vote-counting.
//
// DIAG_AXES: the 5 work-style dimensions every "axis" question's choices pull
// on (each choice carries a partial vector, roughly -1..1 per axis). Every
// PATHS[key].idealVector is hand-authored on this same 5-axis scale so a
// student's answers can be compared against it.
export const DIAG_AXES = ['peopleFacing','handsOn','acuity','autonomy','directCare'];
export const DIAG_AXIS_LABELS = {
  peopleFacing:'Patient-facing vs. behind-the-scenes',
  handsOn:'Hands-on/procedural vs. cognitive/analytical',
  acuity:'Fast-paced & episodic vs. longitudinal & preventive',
  autonomy:'Independent decision-making vs. team/protocol-driven',
  directCare:'Direct individual care vs. systems/population-level impact',
};

// "axis" questions: each choice carries a partial {axis:weight} vector.
// "scenario" questions: real career-content questions where each choice
// carries direct {pathwayKey:weight} bonus votes instead.
export const DIAG_QS = [
  { id:'q1', type:'axis', q:'A patient in front of you is anxious and in pain. What\'s your instinct?', ch:[
    { text:'Calm them down and start assessing/treating right now', axes:{peopleFacing:0.8,handsOn:0.6,acuity:0.7,autonomy:0.3,directCare:0.9} },
    { text:'Ask what\'s been done so far and coordinate with the team', axes:{peopleFacing:0.5,handsOn:-0.1,acuity:0.2,autonomy:-0.4,directCare:0.4} },
    { text:'Think through what\'s causing it before touching anything', axes:{peopleFacing:-0.1,handsOn:-0.7,acuity:-0.2,autonomy:0.5,directCare:0.1} },
    { text:'Think about how to prevent this from happening to others in the first place', axes:{peopleFacing:-0.4,handsOn:-0.6,acuity:-0.8,autonomy:0.2,directCare:-0.8} },
  ]},
  { id:'q2', type:'axis', q:'Pick the work environment that sounds most like you:', ch:[
    { text:'A busy ER or urgent-care clinic — constant motion', axes:{acuity:0.9,peopleFacing:0.5,autonomy:0.3,handsOn:0.3,directCare:0.6} },
    { text:'A quiet lab, running the same careful experiment for months', axes:{acuity:-0.8,peopleFacing:-0.8,autonomy:0.3,handsOn:0.1,directCare:-0.8} },
    { text:'A patient\'s bedside, getting to know them over days or weeks', axes:{acuity:-0.2,peopleFacing:0.8,autonomy:-0.3,handsOn:0.6,directCare:0.9} },
    { text:'An office, building programs that help thousands of people', axes:{acuity:-0.6,peopleFacing:-0.3,autonomy:0.5,handsOn:-0.6,directCare:-0.9} },
  ]},
  { id:'q3', type:'axis', q:'When you\'re learning something hands-on (a sport, instrument, or lab skill), you...', ch:[
    { text:'Want to physically practice the motion immediately', axes:{handsOn:0.9,acuity:0.2} },
    { text:'Want to understand the theory first, then try it', axes:{handsOn:-0.6,autonomy:0.3,acuity:-0.3} },
    { text:'Want a coach or mentor guiding you step by step', axes:{handsOn:0.3,autonomy:-0.6,peopleFacing:0.3} },
    { text:'Want to figure it out yourself through trial and error', axes:{handsOn:0.4,autonomy:0.8} },
  ]},
  { id:'q4', type:'axis', q:'A group project is going off the rails. You...', ch:[
    { text:'Take charge and start making the calls yourself', axes:{autonomy:0.9,peopleFacing:0.3} },
    { text:'Get everyone in a room and talk through it together', axes:{autonomy:-0.6,peopleFacing:0.7} },
    { text:'Quietly fix the part that\'s actually broken', axes:{autonomy:0.4,handsOn:0.3,peopleFacing:-0.4} },
    { text:'Step back and ask what process failed so it doesn\'t happen again', axes:{autonomy:0.3,peopleFacing:-0.5,acuity:-0.6} },
  ]},
  { id:'q5', type:'axis', q:'Which sounds like a better use of your Saturday?', ch:[
    { text:'Volunteering at a hospital or clinic, talking with patients', axes:{peopleFacing:0.8,directCare:0.7} },
    { text:'Organizing a charity 5k or community fundraiser', axes:{peopleFacing:0.2,directCare:-0.3,acuity:0.3,autonomy:0.3} },
    { text:'Building or fixing something with your hands', axes:{handsOn:0.8,peopleFacing:-0.3} },
    { text:'Reading a book or article that teaches you something new', axes:{peopleFacing:-0.6,handsOn:-0.6,acuity:-0.4} },
  ]},
  { id:'q6', type:'axis', q:'How do you feel about owning a high-stakes decision, right now, with incomplete information?', ch:[
    { text:'I\'d rather have that responsibility than watch from the sidelines', axes:{autonomy:0.8,acuity:0.5} },
    { text:'I\'ll make the call if I have to, but I\'d rather have backup', axes:{autonomy:0.1,acuity:0.2} },
    { text:'I\'d rather follow a clear protocol than freelance a decision', axes:{autonomy:-0.7,acuity:0.1} },
    { text:'I\'d rather take my time and get it right than decide fast', axes:{autonomy:0.2,acuity:-0.8} },
  ]},
  { id:'q7', type:'axis', q:'Which class assignment would you actually enjoy?', ch:[
    { text:'Dissecting something and labeling every structure precisely', axes:{handsOn:0.8,acuity:-0.1,peopleFacing:-0.3} },
    { text:'Interviewing someone about their life experience', axes:{peopleFacing:0.8,handsOn:-0.5} },
    { text:'Designing an experiment to test a hypothesis', axes:{handsOn:0.1,autonomy:0.5,peopleFacing:-0.5,acuity:-0.4} },
    { text:'Analyzing a dataset to find a trend nobody noticed', axes:{handsOn:-0.7,peopleFacing:-0.7,acuity:-0.5,autonomy:0.4} },
  ]},
  { id:'q8', type:'axis', q:'You\'d rather be the person who...', ch:[
    { text:'Is physically doing the procedure', axes:{handsOn:0.9,directCare:0.6} },
    { text:'Is deciding what the plan should be', axes:{autonomy:0.8,handsOn:-0.2} },
    { text:'Makes sure everyone follows through and nothing falls through the cracks', axes:{autonomy:0.4,peopleFacing:0.2,handsOn:-0.5} },
    { text:'Explains what\'s happening to someone who\'s scared or confused', axes:{peopleFacing:0.9,directCare:0.5} },
  ]},
  { id:'q9', type:'axis', q:'When someone you care about is venting to you, you naturally...', ch:[
    { text:'Ask questions and stay with them in the moment', axes:{peopleFacing:0.7,directCare:0.4} },
    { text:'Start problem-solving out loud', axes:{handsOn:0.3,autonomy:0.4,peopleFacing:0.2} },
    { text:'Listen, but mostly process it internally afterward', axes:{peopleFacing:-0.4,acuity:-0.3} },
    { text:'Wonder if this is part of a bigger pattern affecting more people than just them', axes:{peopleFacing:-0.5,directCare:-0.7,acuity:-0.5} },
  ]},
  { id:'q10', type:'axis', q:'Pick the medical-drama character you\'d actually want to be, honestly:', ch:[
    { text:'The one running into the OR at 3am', axes:{acuity:0.9,handsOn:0.7,autonomy:0.5,directCare:0.6} },
    { text:'The one who knows every patient on the floor by name', axes:{peopleFacing:0.9,directCare:0.8,autonomy:-0.3} },
    { text:'The one in the basement lab who cracks the case with data', axes:{peopleFacing:-0.8,acuity:-0.6,directCare:-0.8} },
    { text:'The one making sure the whole place actually runs', axes:{autonomy:0.6,handsOn:-0.7,directCare:-0.9,peopleFacing:-0.2} },
  ]},
  { id:'q11', type:'axis', q:'How do you want to spend the first few years of your career?', ch:[
    { text:'In constant contact with people who need help right now', axes:{peopleFacing:0.7,directCare:0.7,acuity:0.4} },
    { text:'Building deep technical/procedural skill in one specific craft', axes:{handsOn:0.8,autonomy:0.2} },
    { text:'Building expertise that scales — research or systems that help far more people than you\'ll ever meet', axes:{directCare:-0.8,peopleFacing:-0.4,acuity:-0.5} },
    { text:'A mix — hands-on some days, planning/thinking on others', axes:{peopleFacing:0.2,handsOn:0.2,directCare:0.1} },
  ]},
  { id:'q12', type:'axis', q:'A mistake happens on your team. What matters most to you in the aftermath?', ch:[
    { text:'Fixing the immediate problem in front of you', axes:{acuity:0.6,handsOn:0.4,directCare:0.3} },
    { text:'Making sure the person affected is okay and knows what happened', axes:{peopleFacing:0.7,directCare:0.5} },
    { text:'Figuring out exactly what went wrong, step by step', axes:{handsOn:0.3,acuity:-0.3,autonomy:0.3} },
    { text:'Changing the system so it can\'t happen again', axes:{autonomy:0.4,directCare:-0.6,acuity:-0.6,peopleFacing:-0.3} },
  ]},
  { id:'q13', type:'scenario', q:'Which shadowing day sounds the most interesting to you?', ch:[
    { text:'Shadowing a physician running a full clinic day', pathways:{physician:3,physicianAssistant:1} },
    { text:'Shadowing a nurse managing a hospital floor', pathways:{nursing:3,physicianAssistant:1} },
    { text:'Shadowing a pharmacist checking prescriptions and drug interactions', pathways:{pharmacy:3} },
    { text:'Shadowing a physical therapist running rehab sessions', pathways:{physicalOccupTherapy:3} },
  ]},
  { id:'q14', type:'scenario', q:'Which project would you rather spend a semester on?', ch:[
    { text:'Working in a lab testing a new treatment on cell cultures', pathways:{biomedResearch:3} },
    { text:'Volunteering at a free dental clinic', pathways:{dentistry:3} },
    { text:'Mapping where a disease outbreak is spreading in a community', pathways:{publicHealth:3} },
    { text:'Redesigning how a clinic schedules patients so nobody waits two hours', pathways:{healthAdmin:3} },
  ]},
  { id:'q15', type:'scenario', q:'If you could sit in on one professional conversation, which would you pick?', ch:[
    { text:'A doctor explaining a diagnosis to a scared family', pathways:{physician:2,physicianAssistant:2} },
    { text:'A nurse calming a patient down before a procedure', pathways:{nursing:3} },
    { text:'A researcher presenting findings that could change treatment guidelines', pathways:{biomedResearch:3} },
    { text:'A hospital director negotiating budget to keep the ER fully staffed', pathways:{healthAdmin:3} },
  ]},
  { id:'q16', type:'scenario', q:'Which of these would you actually enjoy studying in depth?', ch:[
    { text:'How drugs move through and affect the body', pathways:{pharmacy:3} },
    { text:'How joints, muscles, and movement work and heal', pathways:{physicalOccupTherapy:3} },
    { text:'How diseases spread through populations and how to stop them', pathways:{publicHealth:3} },
    { text:'How teeth, gums, and the mouth affect overall health', pathways:{dentistry:3} },
  ]},
  { id:'q17', type:'scenario', q:'Honestly, where are you right now?', ch:[
    { text:'Confident medicine/health is for me — I just need to know which specific role', pathways:{} },
    { text:'I like medicine/health in general but haven\'t picked a lane', pathways:{exploring:3} },
    { text:'Not sure medicine is even right for me yet, but I want to keep exploring it', pathways:{exploring:4} },
    { text:'I already know exactly which one I want — just double-checking', pathways:{} },
  ]},
];
