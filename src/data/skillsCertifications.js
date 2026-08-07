// Catalog of the skills and certifications pre-health students actually earn, used to power the
// type-ahead in SkillsCertificationsPanel. Students were retyping "CPR/BLS for Healthcare
// Providers" (and inventing a different spelling every time) — picking from this list keeps the
// names consistent across the portfolio, prefills the issuing body, and lets us auto-compute the
// expiry date from the credential's real renewal cycle.
//
// Entry shape:
//   name          canonical display name — what gets stored in skills_certifications.name
//   kind          'certification' (dated, verifiable, usually expires) | 'skill' (proficiency)
//   group         section header in the dropdown
//   issuers       accepted issuing bodies; the first is prefilled on select
//   validMonths   renewal cycle in months; null when the credential does not expire
//   aliases       extra search terms (abbreviations, older names, common misspellings)
//
// Freeform entry is never blocked — anything not in this list can still be typed in by hand.

export const SKILL_CERT_CATALOG = [
  // ---------- Emergency & life support ----------
  { name: 'BLS for Healthcare Providers (CPR/AED)', kind: 'certification', group: 'Emergency & Life Support', issuers: ['American Heart Association', 'American Red Cross', 'Health & Safety Institute'], validMonths: 24, aliases: ['cpr', 'basic life support', 'bls', 'aed', 'cpr certification'] },
  { name: 'Heartsaver CPR/AED (Adult, Child & Infant)', kind: 'certification', group: 'Emergency & Life Support', issuers: ['American Heart Association', 'American Red Cross'], validMonths: 24, aliases: ['heartsaver', 'lay rescuer cpr', 'community cpr'] },
  { name: 'Advanced Cardiovascular Life Support (ACLS)', kind: 'certification', group: 'Emergency & Life Support', issuers: ['American Heart Association'], validMonths: 24, aliases: ['acls', 'advanced cardiac life support'] },
  { name: 'Pediatric Advanced Life Support (PALS)', kind: 'certification', group: 'Emergency & Life Support', issuers: ['American Heart Association'], validMonths: 24, aliases: ['pals', 'pediatric life support'] },
  { name: 'Neonatal Resuscitation Program (NRP)', kind: 'certification', group: 'Emergency & Life Support', issuers: ['American Academy of Pediatrics'], validMonths: 24, aliases: ['nrp', 'neonatal resuscitation'] },
  { name: 'First Aid Certification', kind: 'certification', group: 'Emergency & Life Support', issuers: ['American Red Cross', 'American Heart Association'], validMonths: 24, aliases: ['first aid', 'standard first aid'] },
  { name: 'Wilderness First Responder (WFR)', kind: 'certification', group: 'Emergency & Life Support', issuers: ['NOLS Wilderness Medicine', 'SOLO', 'Wilderness Medical Associates'], validMonths: 36, aliases: ['wfr', 'wilderness first responder', 'wilderness medicine'] },
  { name: 'Wilderness First Aid (WFA)', kind: 'certification', group: 'Emergency & Life Support', issuers: ['NOLS Wilderness Medicine', 'American Red Cross', 'SOLO'], validMonths: 24, aliases: ['wfa', 'wilderness first aid'] },
  { name: 'Stop the Bleed', kind: 'certification', group: 'Emergency & Life Support', issuers: ['American College of Surgeons'], validMonths: null, aliases: ['stop the bleed', 'bleeding control', 'tourniquet'] },
  { name: 'Naloxone / Opioid Overdose Response Training', kind: 'certification', group: 'Emergency & Life Support', issuers: ['State Department of Health', 'NEXT Distro', 'Local harm reduction program'], validMonths: null, aliases: ['narcan', 'naloxone', 'overdose response', 'opioid'] },
  { name: 'Lifeguarding (with CPR/AED for the Professional Rescuer)', kind: 'certification', group: 'Emergency & Life Support', issuers: ['American Red Cross', 'Ellis & Associates', 'YMCA'], validMonths: 24, aliases: ['lifeguard', 'lifeguarding', 'pool', 'waterfront'] },
  { name: 'Water Safety Instructor (WSI)', kind: 'certification', group: 'Emergency & Life Support', issuers: ['American Red Cross'], validMonths: 24, aliases: ['wsi', 'swim instructor', 'water safety'] },

  // ---------- EMS & direct patient care ----------
  { name: 'Emergency Medical Technician (EMT-Basic)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['National Registry of EMTs (NREMT)', 'State EMS Office'], validMonths: 24, aliases: ['emt', 'emt-b', 'emt basic', 'nremt', 'ambulance'] },
  { name: 'Advanced EMT (AEMT)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['National Registry of EMTs (NREMT)', 'State EMS Office'], validMonths: 24, aliases: ['aemt', 'advanced emt', 'emt-i', 'emt intermediate'] },
  { name: 'Paramedic (NREMT)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['National Registry of EMTs (NREMT)', 'State EMS Office'], validMonths: 24, aliases: ['paramedic', 'emt-p'] },
  { name: 'Emergency Medical Responder (EMR)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['National Registry of EMTs (NREMT)', 'American Red Cross'], validMonths: 24, aliases: ['emr', 'first responder', 'medical responder'] },
  { name: 'Certified Nursing Assistant (CNA)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['State Nurse Aide Registry', 'American Red Cross'], validMonths: 24, aliases: ['cna', 'nursing assistant', 'nurse aide', 'stna'] },
  { name: 'Patient Care Technician (PCT/CPCT)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['National Healthcareer Association (NHA)'], validMonths: 24, aliases: ['pct', 'cpct', 'patient care tech'] },
  { name: 'Certified Clinical Medical Assistant (CCMA)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['National Healthcareer Association (NHA)', 'American Association of Medical Assistants'], validMonths: 24, aliases: ['ccma', 'cma', 'medical assistant', 'rma'] },
  { name: 'Certified Phlebotomy Technician (CPT)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['National Healthcareer Association (NHA)', 'American Society for Clinical Pathology (ASCP)'], validMonths: 24, aliases: ['phlebotomy', 'phlebotomist', 'cpt', 'blood draw', 'venipuncture'] },
  { name: 'Certified EKG Technician (CET)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['National Healthcareer Association (NHA)'], validMonths: 24, aliases: ['ekg', 'ecg', 'cet', 'telemetry'] },
  { name: 'Certified Pharmacy Technician (CPhT)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['Pharmacy Technician Certification Board (PTCB)', 'National Healthcareer Association (NHA)'], validMonths: 24, aliases: ['cpht', 'pharmacy technician', 'ptcb', 'pharm tech'] },
  { name: 'Home Health Aide (HHA)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['State Department of Health'], validMonths: 24, aliases: ['hha', 'home health aide', 'caregiver'] },
  { name: 'Certified Medication Aide (CMA)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['State Nurse Aide Registry'], validMonths: 12, aliases: ['medication aide', 'med aide', 'qma'] },
  { name: 'Certified Registered Central Service Technician (CRCST)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['HSPA (formerly IAHCSMM)'], validMonths: 12, aliases: ['crcst', 'sterile processing', 'central sterile'] },
  { name: 'Certified Dental Assistant (CDA)', kind: 'certification', group: 'EMS & Patient Care', issuers: ['Dental Assisting National Board (DANB)'], validMonths: 12, aliases: ['cda', 'dental assistant', 'danb'] },
  { name: 'Certified Veterinary Assistant', kind: 'certification', group: 'EMS & Patient Care', issuers: ['NAVTA'], validMonths: 24, aliases: ['veterinary assistant', 'vet assistant'] },

  // ---------- Research, lab & compliance ----------
  { name: 'CITI Human Subjects Research — Biomedical', kind: 'certification', group: 'Research & Lab', issuers: ['CITI Program'], validMonths: 36, aliases: ['citi', 'human subjects', 'irb', 'biomedical research ethics'] },
  { name: 'CITI Human Subjects Research — Social & Behavioral', kind: 'certification', group: 'Research & Lab', issuers: ['CITI Program'], validMonths: 36, aliases: ['citi social behavioral', 'sbe', 'human subjects'] },
  { name: 'CITI Good Clinical Practice (GCP)', kind: 'certification', group: 'Research & Lab', issuers: ['CITI Program'], validMonths: 36, aliases: ['gcp', 'good clinical practice', 'clinical trials'] },
  { name: 'CITI Responsible Conduct of Research (RCR)', kind: 'certification', group: 'Research & Lab', issuers: ['CITI Program'], validMonths: 36, aliases: ['rcr', 'responsible conduct', 'research ethics'] },
  { name: 'CITI Working with the IACUC (Animal Research)', kind: 'certification', group: 'Research & Lab', issuers: ['CITI Program'], validMonths: 36, aliases: ['iacuc', 'animal research', 'animal handling', 'vivarium'] },
  { name: 'HIPAA Privacy & Security Training', kind: 'certification', group: 'Research & Lab', issuers: ['CITI Program', 'Hospital compliance office'], validMonths: 12, aliases: ['hipaa', 'privacy', 'phi', 'compliance'] },
  { name: 'OSHA Bloodborne Pathogens Training', kind: 'certification', group: 'Research & Lab', issuers: ['OSHA-authorized trainer', 'Institutional EHS office'], validMonths: 12, aliases: ['osha', 'bloodborne', 'bbp', 'needlestick'] },
  { name: 'Laboratory Safety & Chemical Hygiene Training', kind: 'certification', group: 'Research & Lab', issuers: ['Institutional EHS office'], validMonths: 12, aliases: ['lab safety', 'chemical hygiene', 'ehs', 'ppe'] },
  { name: 'Biosafety Level 2 (BSL-2) Training', kind: 'certification', group: 'Research & Lab', issuers: ['Institutional Biosafety Committee'], validMonths: 12, aliases: ['bsl-2', 'bsl2', 'biosafety'] },
  { name: 'Radiation Safety Training', kind: 'certification', group: 'Research & Lab', issuers: ['Institutional Radiation Safety Office'], validMonths: 12, aliases: ['radiation safety', 'radioisotope', 'x-ray'] },
  { name: 'IATA Shipping of Dangerous Goods / Biological Materials', kind: 'certification', group: 'Research & Lab', issuers: ['IATA', 'Institutional EHS office'], validMonths: 24, aliases: ['iata', 'dangerous goods', 'shipping specimens', 'dry ice'] },

  // ---------- Crisis, counseling & community health ----------
  { name: 'Mental Health First Aid', kind: 'certification', group: 'Crisis & Community Health', issuers: ['National Council for Mental Wellbeing'], validMonths: 36, aliases: ['mental health first aid', 'mhfa', 'youth mental health'] },
  { name: 'QPR Suicide Prevention Gatekeeper', kind: 'certification', group: 'Crisis & Community Health', issuers: ['QPR Institute'], validMonths: 36, aliases: ['qpr', 'suicide prevention', 'gatekeeper'] },
  { name: 'ASIST (Applied Suicide Intervention Skills Training)', kind: 'certification', group: 'Crisis & Community Health', issuers: ['LivingWorks'], validMonths: null, aliases: ['asist', 'suicide intervention', 'livingworks'] },
  { name: 'Crisis Counselor Training (Text/Hotline)', kind: 'certification', group: 'Crisis & Community Health', issuers: ['Crisis Text Line', '988 Suicide & Crisis Lifeline', 'Local crisis center'], validMonths: null, aliases: ['crisis text line', 'hotline', 'crisis counselor', '988'] },
  { name: 'Sexual Assault Crisis Advocate Training', kind: 'certification', group: 'Crisis & Community Health', issuers: ['State coalition against sexual assault', 'Local rape crisis center'], validMonths: null, aliases: ['sane advocate', 'sexual assault advocate', 'rape crisis'] },
  { name: 'Hospice Volunteer Training', kind: 'certification', group: 'Crisis & Community Health', issuers: ['Hospice organization'], validMonths: null, aliases: ['hospice', 'palliative', 'end of life volunteer'] },
  { name: 'Certified Peer Health Educator', kind: 'certification', group: 'Crisis & Community Health', issuers: ['NASPA / BACCHUS Initiatives'], validMonths: null, aliases: ['peer health educator', 'cphe', 'bacchus'] },
  { name: 'Community Health Worker (CHW) Certification', kind: 'certification', group: 'Crisis & Community Health', issuers: ['State Department of Health'], validMonths: 24, aliases: ['chw', 'community health worker', 'promotora'] },
  { name: 'Certified Doula (Birth or Postpartum)', kind: 'certification', group: 'Crisis & Community Health', issuers: ['DONA International', 'CAPPA'], validMonths: 36, aliases: ['doula', 'birth doula', 'postpartum'] },

  // ---------- Language & communication ----------
  { name: 'Certified Healthcare Interpreter (CHI)', kind: 'certification', group: 'Language & Communication', issuers: ['Certification Commission for Healthcare Interpreters (CCHI)'], validMonths: 48, aliases: ['chi', 'medical interpreter', 'interpreter', 'cchi'] },
  { name: 'Certified Medical Interpreter (CMI)', kind: 'certification', group: 'Language & Communication', issuers: ['National Board of Certification for Medical Interpreters (NBCMI)'], validMonths: 60, aliases: ['cmi', 'nbcmi', 'medical interpreter'] },
  { name: 'Medical Spanish Certificate', kind: 'certification', group: 'Language & Communication', issuers: ['University program', 'Canopy Learn'], validMonths: null, aliases: ['medical spanish', 'spanish for healthcare', 'bilingual'] },
  { name: 'American Sign Language (ASL) Proficiency', kind: 'skill', group: 'Language & Communication', issuers: ['ASLTA', 'University program'], validMonths: null, aliases: ['asl', 'sign language', 'deaf'] },
  { name: 'Bilingual / Multilingual Patient Communication', kind: 'skill', group: 'Language & Communication', issuers: [], validMonths: null, aliases: ['bilingual', 'multilingual', 'second language', 'spanish', 'mandarin'] },
  { name: 'Motivational Interviewing', kind: 'skill', group: 'Language & Communication', issuers: ['MINT', 'University program'], validMonths: null, aliases: ['motivational interviewing', 'mi', 'patient counseling'] },
  { name: 'Public Speaking & Scientific Presentation', kind: 'skill', group: 'Language & Communication', issuers: [], validMonths: null, aliases: ['public speaking', 'presentation', 'poster', 'oral presentation'] },

  // ---------- Clinical & lab technique (skills) ----------
  { name: 'Venipuncture & Blood Draw', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['venipuncture', 'blood draw', 'butterfly needle', 'iv'] },
  { name: 'Vital Signs & Patient Triage', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['vitals', 'vital signs', 'blood pressure', 'triage'] },
  { name: 'Suturing & Knot Tying', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['suturing', 'sutures', 'knot tying', 'surgical skills'] },
  { name: 'Sterile Technique & Scrubbing In', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['sterile technique', 'aseptic', 'scrub in', 'operating room'] },
  { name: 'Electronic Health Records (Epic)', kind: 'skill', group: 'Clinical & Lab Technique', issuers: ['Epic Systems', 'Hospital training program'], validMonths: null, aliases: ['epic', 'ehr', 'emr', 'cerner', 'charting'] },
  { name: 'Cell Culture & Aseptic Technique', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['cell culture', 'tissue culture', 'aseptic'] },
  { name: 'PCR & qPCR', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['pcr', 'qpcr', 'rt-pcr', 'amplification'] },
  { name: 'Gel Electrophoresis', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['gel electrophoresis', 'agarose', 'sds-page'] },
  { name: 'Western Blot', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['western blot', 'immunoblot'] },
  { name: 'ELISA', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['elisa', 'immunoassay'] },
  { name: 'Immunohistochemistry & Microscopy', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['ihc', 'immunohistochemistry', 'microscopy', 'confocal', 'histology'] },
  { name: 'Flow Cytometry', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['flow cytometry', 'facs'] },
  { name: 'CRISPR / Molecular Cloning', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['crispr', 'cloning', 'transfection', 'plasmid'] },
  { name: 'Animal Handling & Rodent Husbandry', kind: 'skill', group: 'Clinical & Lab Technique', issuers: [], validMonths: null, aliases: ['animal handling', 'mouse', 'rodent', 'husbandry'] },

  // ---------- Data, tech & analysis ----------
  { name: 'REDCap Data Management', kind: 'skill', group: 'Data & Technology', issuers: ['Institutional REDCap training'], validMonths: null, aliases: ['redcap', 'data capture', 'study database'] },
  { name: 'Statistical Analysis in R', kind: 'skill', group: 'Data & Technology', issuers: [], validMonths: null, aliases: ['r', 'rstudio', 'tidyverse', 'statistics'] },
  { name: 'Python for Data Analysis', kind: 'skill', group: 'Data & Technology', issuers: [], validMonths: null, aliases: ['python', 'pandas', 'numpy', 'jupyter'] },
  { name: 'SPSS', kind: 'skill', group: 'Data & Technology', issuers: [], validMonths: null, aliases: ['spss', 'statistics software'] },
  { name: 'SAS', kind: 'skill', group: 'Data & Technology', issuers: [], validMonths: null, aliases: ['sas', 'biostatistics'] },
  { name: 'STATA', kind: 'skill', group: 'Data & Technology', issuers: [], validMonths: null, aliases: ['stata', 'econometrics'] },
  { name: 'MATLAB', kind: 'skill', group: 'Data & Technology', issuers: [], validMonths: null, aliases: ['matlab', 'signal processing'] },
  { name: 'Advanced Excel / Google Sheets', kind: 'skill', group: 'Data & Technology', issuers: [], validMonths: null, aliases: ['excel', 'spreadsheet', 'pivot table', 'google sheets'] },
  { name: 'Tableau / Data Visualization', kind: 'skill', group: 'Data & Technology', issuers: ['Tableau'], validMonths: null, aliases: ['tableau', 'data visualization', 'dashboard', 'power bi'] },
  { name: 'Google Data Analytics Professional Certificate', kind: 'certification', group: 'Data & Technology', issuers: ['Google / Coursera'], validMonths: null, aliases: ['google data analytics', 'coursera', 'data analytics certificate'] },
  { name: 'Systematic Literature Review & PubMed Search', kind: 'skill', group: 'Data & Technology', issuers: [], validMonths: null, aliases: ['literature review', 'pubmed', 'systematic review', 'endnote', 'zotero'] },
  { name: 'Scientific Writing & Manuscript Preparation', kind: 'skill', group: 'Data & Technology', issuers: [], validMonths: null, aliases: ['scientific writing', 'manuscript', 'abstract', 'publication'] },

  // ---------- Leadership, safety & other ----------
  { name: 'ServSafe Food Handler', kind: 'certification', group: 'Leadership & Other', issuers: ['National Restaurant Association'], validMonths: 36, aliases: ['servsafe', 'food handler', 'food safety'] },
  { name: 'NASM Certified Personal Trainer (CPT)', kind: 'certification', group: 'Leadership & Other', issuers: ['NASM', 'ACE', 'ACSM'], validMonths: 24, aliases: ['nasm', 'personal trainer', 'cpt', 'ace', 'acsm'] },
  { name: 'Registered Yoga Teacher (RYT-200)', kind: 'certification', group: 'Leadership & Other', issuers: ['Yoga Alliance'], validMonths: null, aliases: ['ryt', 'yoga teacher', 'yoga alliance'] },
  { name: 'PADI Open Water Scuba Diver', kind: 'certification', group: 'Leadership & Other', issuers: ['PADI', 'NAUI', 'SSI'], validMonths: null, aliases: ['scuba', 'padi', 'open water', 'diving'] },
  { name: 'Title IX / Mandated Reporter Training', kind: 'certification', group: 'Leadership & Other', issuers: ['University compliance office', 'State Department of Health'], validMonths: 12, aliases: ['title ix', 'mandated reporter', 'child abuse reporting', 'clery'] },
  { name: 'Diversity, Equity & Inclusion Training', kind: 'certification', group: 'Leadership & Other', issuers: ['University program'], validMonths: null, aliases: ['dei', 'diversity', 'implicit bias', 'cultural competency'] },
  { name: 'Project Management / Team Leadership', kind: 'skill', group: 'Leadership & Other', issuers: [], validMonths: null, aliases: ['project management', 'leadership', 'team lead', 'organizing'] },
  { name: 'Grant Writing', kind: 'skill', group: 'Leadership & Other', issuers: [], validMonths: null, aliases: ['grant writing', 'funding', 'proposal'] },
  { name: 'Tutoring & Peer Instruction', kind: 'skill', group: 'Leadership & Other', issuers: ['CRLA'], validMonths: null, aliases: ['tutoring', 'peer tutor', 'teaching assistant', 'crla'] },
];

// Every issuing body mentioned above, de-duplicated — feeds the "Issuing body" type-ahead so the
// same organization is not stored five different ways.
export const ISSUING_BODIES = [...new Set(SKILL_CERT_CATALOG.flatMap(c => c.issuers))].sort();

// Shown before the student has typed anything — the handful of credentials most pre-health
// students actually hold, so the very first click can do the work instead of the keyboard.
export const POPULAR_SKILL_CERTS = [
  'BLS for Healthcare Providers (CPR/AED)',
  'Emergency Medical Technician (EMT-Basic)',
  'Certified Nursing Assistant (CNA)',
  'CITI Human Subjects Research — Biomedical',
  'Certified Phlebotomy Technician (CPT)',
  'HIPAA Privacy & Security Training',
  'Mental Health First Aid',
  'Lifeguarding (with CPR/AED for the Professional Rescuer)',
  'Medical Spanish Certificate',
  'Electronic Health Records (Epic)',
];

const norm = (s) => (s || '').trim().toLowerCase();

/** Exact (case-insensitive) catalog lookup by canonical name. */
export function findCatalogEntry(name) {
  const n = norm(name);
  return SKILL_CERT_CATALOG.find(c => norm(c.name) === n) || null;
}

/**
 * Rank catalog entries against what the student has typed. Scoring puts the most obvious match
 * first: a name that starts with the query beats one that merely contains it, which beats an
 * alias hit — so typing "cpr" leads with BLS rather than burying it under Heartsaver. An exact
 * abbreviation ranks above both, so "emt" leads with EMT-Basic and not Advanced EMT.
 */
export function searchSkillCerts(query, limit = 12) {
  const q = norm(query);
  if (!q) return [];
  const scored = [];
  for (const item of SKILL_CERT_CATALOG) {
    const name = norm(item.name);
    let score = 0;
    if (item.aliases.some(a => a === q)) score = 120;
    else if (name.startsWith(q)) score = 100;
    else if (name.includes(q)) score = 70;
    else if (item.aliases.some(a => a.startsWith(q))) score = 55;
    else if (item.aliases.some(a => a.includes(q))) score = 35;
    else if (item.issuers.some(i => norm(i).includes(q))) score = 20;
    if (score) scored.push({ item, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map(s => s.item);
}

/** earned_date + validMonths → expiry_date (YYYY-MM-DD), or '' when the credential never expires. */
export function computeExpiry(earnedDate, validMonths) {
  if (!earnedDate || !validMonths) return '';
  const d = new Date(earnedDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  d.setMonth(d.getMonth() + validMonths);
  // Rolling the month forward off a long month (Jan 31 + 24mo) overflows into the next one; clamp
  // back to the last day of the intended month.
  if (d.getDate() !== day) d.setDate(0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
