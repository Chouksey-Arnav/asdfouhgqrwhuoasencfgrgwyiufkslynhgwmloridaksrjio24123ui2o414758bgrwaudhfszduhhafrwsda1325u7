// ─────────────────────────────────────────────────────────────────────────────
// Pathway vocabulary decks — medical word parts, abbreviations, body systems.
//
// WHY THESE SPECIFICALLY
// Almost everything else this app teaches a ninth grader is either years away
// from being usable (admissions strategy, the MCAT, residency) or is knowledge
// they can't easily demonstrate to anyone. Medical vocabulary is the rare
// exception: it is genuinely learnable at fourteen, it takes weeks rather than
// years, and — this is the part that matters — it is DEMONSTRABLE. A student
// who can decode "hepatomegaly" on sight has something concrete they can show a
// parent, use on a shadowing day, and talk about in an interview four years
// from now. For a teenager, visible competence you can point at is worth more
// than a much larger amount of knowledge you can't.
//
// It is also the fastest single upgrade to how much of a shadowing day a
// student actually understands, which is the thing the rest of this pathway
// spends months trying to arrange for them.
//
// Cards carry `concept` so the review queue's importance ranking can connect
// them to lesson material (see lib/flashcards/session.js).
// ─────────────────────────────────────────────────────────────────────────────

const roots = [
  ['cardi-', 'heart', 'cardiology, myocardium, tachycardia'],
  ['derm-, dermat-', 'skin', 'dermatology, epidermis, dermatitis'],
  ['gastr-', 'stomach', 'gastritis, gastroenterology'],
  ['hepat-', 'liver', 'hepatitis, hepatomegaly'],
  ['nephr-, ren-', 'kidney', 'nephrology, renal failure'],
  ['neur-', 'nerve, nervous system', 'neurology, neuron, neuropathy'],
  ['oste-', 'bone', 'osteoporosis, osteoarthritis'],
  ['my-, myo-', 'muscle', 'myocardium, myalgia'],
  ['pulmon-, pneum-', 'lung, air', 'pulmonary, pneumonia'],
  ['hem-, hemat-', 'blood', 'hematology, hemorrhage, anemia'],
  ['angi-, vas-', 'vessel', 'angiogram, vasodilation'],
  ['arthr-', 'joint', 'arthritis, arthroscopy'],
  ['cyt-', 'cell', 'cytology, leukocyte'],
  ['enter-', 'intestine', 'enteritis, gastroenterology'],
  ['oto-', 'ear', 'otitis, otoscope'],
  ['ophthalm-, ocul-', 'eye', 'ophthalmology, ocular'],
  ['pulm-', 'lung', 'pulmonologist'],
  ['rhin-', 'nose', 'rhinitis, rhinoplasty'],
  ['encephal-', 'brain', 'encephalitis, electroencephalogram'],
  ['pharyng-', 'throat (pharynx)', 'pharyngitis'],
  ['col-, colon-', 'large intestine', 'colonoscopy, colitis'],
  ['cyst-', 'bladder, sac', 'cystitis, cystoscopy'],
  ['thromb-', 'clot', 'thrombosis, thrombocyte'],
  ['leuk-', 'white', 'leukocyte, leukemia'],
  ['erythr-', 'red', 'erythrocyte'],
  ['carcin-', 'cancer', 'carcinoma, carcinogen'],
  ['path-', 'disease', 'pathology, neuropathy'],
  ['phleb-, ven-', 'vein', 'phlebotomy, venous'],
  ['pod-', 'foot', 'podiatry'],
  ['ped-', 'child (in medicine)', 'pediatrics, pediatrician'],
];

const prefixes = [
  ['brady-', 'slow', 'bradycardia — slow heart rate'],
  ['tachy-', 'fast', 'tachycardia — fast heart rate'],
  ['hyper-', 'above normal, excessive', 'hypertension, hyperglycemia'],
  ['hypo-', 'below normal, under', 'hypotension, hypodermic'],
  ['dys-', 'difficult, painful, abnormal', 'dyspnea — difficult breathing'],
  ['a-, an-', 'without, absence of', 'apnea — absence of breathing; anemia'],
  ['peri-', 'around', 'pericardium — the sac around the heart'],
  ['endo-', 'within, inner', 'endoscopy, endocardium'],
  ['epi-', 'upon, over', 'epidermis — the outer skin layer'],
  ['sub-', 'under, below', 'subcutaneous — under the skin'],
  ['inter-', 'between', 'intercostal — between the ribs'],
  ['intra-', 'within', 'intravenous — within a vein'],
  ['poly-', 'many, much', 'polyuria — excessive urination'],
  ['olig-', 'few, scanty', 'oliguria — reduced urine output'],
  ['pre-', 'before', 'preoperative'],
  ['post-', 'after', 'postoperative, postpartum'],
  ['anti-', 'against', 'antibiotic, antibody'],
  ['macro-', 'large', 'macrocytic'],
  ['micro-', 'small', 'microscope, microcytic'],
  ['neo-', 'new', 'neonatal — the newborn period'],
  ['bi-', 'two', 'bilateral — on both sides'],
  ['uni-', 'one', 'unilateral — on one side'],
  ['contra-', 'against, opposite', 'contraindication'],
  ['ec-, extra-', 'outside, out of', 'ectopic, extracellular'],
];

const suffixes = [
  ['-itis', 'inflammation', 'appendicitis, arthritis'],
  ['-ology', 'the study of', 'cardiology, pathology'],
  ['-ectomy', 'surgical removal', 'appendectomy — removal of the appendix'],
  ['-otomy', 'surgical incision (cutting into)', 'tracheotomy'],
  ['-ostomy', 'creating a surgical opening', 'colostomy'],
  ['-emia', 'blood condition', 'anemia, hyperglycemia'],
  ['-pathy', 'disease of', 'neuropathy, cardiomyopathy'],
  ['-algia', 'pain', 'myalgia — muscle pain; neuralgia'],
  ['-megaly', 'enlargement', 'hepatomegaly — enlarged liver'],
  ['-osis', 'abnormal condition', 'thrombosis, osteoporosis'],
  ['-scopy', 'visual examination with an instrument', 'colonoscopy, endoscopy'],
  ['-gram', 'a record or image produced', 'electrocardiogram (ECG)'],
  ['-graphy', 'the process of recording/imaging', 'radiography, angiography'],
  ['-plasty', 'surgical repair or reshaping', 'rhinoplasty, angioplasty'],
  ['-pnea', 'breathing', 'apnea, dyspnea, tachypnea'],
  ['-uria', 'urine condition', 'hematuria — blood in the urine'],
  ['-penia', 'deficiency', 'thrombocytopenia — low platelets'],
  ['-cyte', 'cell', 'leukocyte, erythrocyte'],
  ['-sclerosis', 'hardening', 'atherosclerosis'],
  ['-stenosis', 'narrowing', 'aortic stenosis'],
  ['-rrhage, -rrhagia', 'bursting forth, excessive flow', 'hemorrhage'],
  ['-esthesia', 'sensation', 'anesthesia — without sensation'],
];

const abbreviations = [
  ['BP', 'Blood pressure — recorded as systolic/diastolic, e.g. 120/80 mmHg.'],
  ['HR', 'Heart rate, in beats per minute (bpm).'],
  ['RR', 'Respiratory rate — breaths per minute.'],
  ['O2 sat / SpO2', 'Oxygen saturation — the percentage of hemoglobin carrying oxygen, read by a pulse oximeter.'],
  ['BMI', 'Body mass index — weight relative to height. A screening number, not a diagnosis.'],
  ['CBC', 'Complete blood count — one of the most commonly ordered blood tests.'],
  ['BMP', 'Basic metabolic panel — electrolytes, kidney function, glucose.'],
  ['ECG / EKG', 'Electrocardiogram — a recording of the heart\'s electrical activity.'],
  ['MRI', 'Magnetic resonance imaging — detailed imaging using magnetic fields, no ionizing radiation.'],
  ['CT', 'Computed tomography — cross-sectional X-ray imaging.'],
  ['IV', 'Intravenous — into a vein.'],
  ['IM', 'Intramuscular — into a muscle.'],
  ['PO', 'By mouth (from Latin per os).'],
  ['NPO', 'Nothing by mouth (nil per os) — typically before surgery.'],
  ['PRN', 'As needed (pro re nata).'],
  ['BID / TID / QID', 'Twice / three times / four times a day.'],
  ['Hx', 'History — as in medical history.'],
  ['Dx', 'Diagnosis.'],
  ['Tx', 'Treatment.'],
  ['Rx', 'Prescription.'],
  ['Sx', 'Symptoms.'],
  ['ED / ER', 'Emergency department / emergency room.'],
  ['ICU', 'Intensive care unit.'],
  ['OR', 'Operating room.'],
  ['EHR / EMR', 'Electronic health record / electronic medical record — the digital chart.'],
  ['HIPAA', 'The U.S. law governing patient health-information privacy. The rule behind every "we can\'t discuss that" you\'ll hear.'],
  ['PCP', 'Primary care provider — the clinician who manages someone\'s overall care.'],
  ['NP', 'Nurse practitioner — an advanced practice registered nurse.'],
  ['PA', 'Physician assistant / associate.'],
  ['RN / LPN', 'Registered nurse / licensed practical nurse.'],
  ['CNA', 'Certified Nursing Assistant — a common first hands-on healthcare role, available to some high schoolers.'],
  ['DNR', 'Do not resuscitate — a documented decision about CPR.'],
  ['STAT', 'Immediately (from Latin statim).'],
  ['WNL', 'Within normal limits.'],
];

const bodySystems = [
  ['Cardiovascular system — main job?', 'Move blood, and with it oxygen, nutrients, hormones and waste, to and from every tissue. Heart, blood vessels, blood.'],
  ['Respiratory system — main job?', 'Gas exchange: oxygen in, carbon dioxide out. Airways, lungs, alveoli, diaphragm.'],
  ['Nervous system — main job?', 'Fast electrical signaling and control. Brain, spinal cord, peripheral nerves.'],
  ['Endocrine system — main job?', 'Slow chemical signaling via hormones. Pituitary, thyroid, adrenals, pancreas, gonads.'],
  ['Digestive system — main job?', 'Break food down and absorb nutrients. Mouth to anus, plus liver, gallbladder, pancreas.'],
  ['Urinary/renal system — main job?', 'Filter blood, remove waste, and hold fluid and electrolytes in balance. Kidneys, ureters, bladder, urethra.'],
  ['Musculoskeletal system — main job?', 'Structure, movement, and protection. Bones, muscles, joints, tendons, ligaments.'],
  ['Integumentary system — main job?', 'Barrier, temperature regulation, sensation. Skin, hair, nails.'],
  ['Immune/lymphatic system — main job?', 'Defense against pathogens and fluid balance. Lymph nodes, spleen, thymus, white blood cells.'],
  ['Reproductive system — main job?', 'Produce gametes and hormones; enable reproduction.'],
  ['Which two systems are almost always assessed together, and why?', 'Cardiovascular and respiratory — they share the job of getting oxygen from the air to working tissue, so a symptom like breathlessness on exertion can come from either.'],
  ['What is homeostasis?', 'Keeping the internal environment stable (temperature, pH, glucose, fluid balance) despite external change — mostly via negative feedback loops.'],
  ['What does the diaphragm do?', 'Contracts and flattens to expand the chest cavity, dropping pressure so air flows in. The main muscle of quiet breathing.'],
  ['Where does gas exchange actually happen?', 'In the alveoli — tiny air sacs where oxygen and carbon dioxide diffuse across a very thin membrane into and out of capillary blood.'],
  ['What do the kidneys regulate besides waste?', 'Fluid volume, electrolytes (sodium, potassium), acid-base balance, blood pressure, and red blood cell production (via erythropoietin).'],
  ['Arteries vs. veins?', 'Arteries carry blood away from the heart under high pressure with thick muscular walls; veins return it at low pressure and use valves to stop backflow.'],
  ['What are the four chambers of the heart, in order of blood flow?', 'Right atrium → right ventricle → (lungs) → left atrium → left ventricle → (body).'],
  ['Central vs. peripheral nervous system?', 'Central = brain and spinal cord. Peripheral = every nerve outside them, including the autonomic nerves controlling organs.'],
  ['Sympathetic vs. parasympathetic?', 'Sympathetic is "fight or flight" — heart rate up, digestion down. Parasympathetic is "rest and digest" — the opposite.'],
  ['Innate vs. adaptive immunity?', 'Innate is fast, general, present from birth (skin, inflammation, phagocytes). Adaptive is slower, specific, and remembers — the basis of vaccines.'],
  ['What are the five vital signs?', 'Temperature, pulse (heart rate), respiratory rate, blood pressure, and oxygen saturation. Pain is often recorded alongside them.'],
  ['What is a reference range?', 'The interval most of a healthy reference population falls in. A value outside it is a flag to look closer, not a diagnosis on its own.'],
];

/** front/back pairs for a word-part deck. */
function wordPartCards(rows, kind) {
  return rows.flatMap(([part, meaning, examples]) => ([
    {
      front: `What does the ${kind} "${part}" mean?`,
      back: `${meaning}. Seen in: ${examples}.`,
      concept: `${kind}: ${part}`,
    },
  ]));
}

export const MED_ROOTS_DECK = wordPartCards(roots, 'root');
export const MED_PREFIXES_DECK = wordPartCards(prefixes, 'prefix');
export const MED_SUFFIXES_DECK = wordPartCards(suffixes, 'suffix');
export const MED_ABBREVIATIONS_DECK = abbreviations.map(([abbr, meaning]) => ({
  front: `What does "${abbr}" mean?`, back: meaning, concept: `abbreviation: ${abbr}`,
}));
export const BODY_SYSTEMS_DECK = bodySystems.map(([front, back]) => ({
  front, back, concept: 'body systems',
}));

/** Deck name -> cards, merged into FLASH_DECKS. */
export const PATHWAY_VOCAB_DECKS = {
  'Medical Roots: Body Parts & Structures': MED_ROOTS_DECK,
  'Medical Prefixes': MED_PREFIXES_DECK,
  'Medical Suffixes': MED_SUFFIXES_DECK,
  'Clinical Abbreviations': MED_ABBREVIATIONS_DECK,
  'Body Systems at a Glance': BODY_SYSTEMS_DECK,
};

/** Category assignments, merged into DECK_CATEGORIES. */
export const PATHWAY_VOCAB_CATEGORIES = {
  'Medical Roots: Body Parts & Structures': { category: 'Science', subcategory: 'Medical Vocabulary' },
  'Medical Prefixes':                       { category: 'Science', subcategory: 'Medical Vocabulary' },
  'Medical Suffixes':                       { category: 'Science', subcategory: 'Medical Vocabulary' },
  'Clinical Abbreviations':                 { category: 'Science', subcategory: 'Medical Vocabulary' },
  'Body Systems at a Glance':               { category: 'Science', subcategory: 'Medical Vocabulary' },
};

/**
 * The suggested order to learn them in. Prefixes and suffixes first is
 * deliberate: they are the smallest set with the widest reach, so a student
 * gets the "wait, I can read that" moment within a few days rather than a few
 * weeks — and that moment is what makes them come back for the roots.
 */
export const VOCAB_TRACK = [
  'Medical Prefixes',
  'Medical Suffixes',
  'Medical Roots: Body Parts & Structures',
  'Clinical Abbreviations',
  'Body Systems at a Glance',
];

export const VOCAB_TRACK_BLURB =
  'Five decks, a few weeks. Learn these and you can decode a term you have never seen and follow most of what is said on a shadowing day — which is the fastest thing in this whole app to turn into something you can actually show someone.';
