// ELIB expansion batch F — a seventh verified batch layered on top of
// elib.js + elibExtra.js + elibExpansionA.js..E.js (857 entries combined
// before this file, spanning nine categories).
//
// Why this batch exists: with six prior expansion rounds already closing the
// obvious gaps (application services, licensing-exam bodies, accreditors,
// PA/PT/OT pipeline resources, health-econ, MMI/CASPer prep), a full re-audit
// of the library against (1) every one of the app's 10 pathway lesson-content
// modules and (2) the raw category balance turned up several concrete,
// still-open gaps:
//
//   1. NAMED-BUT-UNLINKED items in the app's own lessons: the Nursing lesson
//      (nur3l3) names CNA work as a realistic path to hands-on patient
//      contact and the ADN/BSN choice; the PA lesson (pa3l3) explicitly names
//      a future CNA certification, EMT training, and medical scribe work as
//      the direct-patient-care-hours PA programs require; the Pharmacy lesson
//      references PharmD licensure without the library ever linking the
//      pharmacist licensing exam itself; the Health Administration lesson
//      (ha3l3) names DECA and FBLA by name as leadership-building
//      organizations. None of NAPLEX, CNA/NNAAP certification, ATI TEAS
//      (the nursing-school entrance exam HESI already had a counterpart for
//      but TEAS did not), medical scribe or phlebotomy certification, DECA,
//      or FBLA existed anywhere in the prior 857 entries — verified by
//      programmatic search of the combined corpus, not assumed absent.
//   2. A genre gap: despite 43 Book-type entries, the library had zero
//      narrative-medicine / physician-memoir reading — the "When Breath
//      Becomes Air" / "Being Mortal" / "The Immortal Life of Henrietta Lacks"
//      tier of book that appears on nearly every pre-health reading list at
//      exactly this app's level (accessible nonfiction, not a technical
//      text). Eleven such books are added here, each mapped to the category
//      its subject matter fits (research ethics, global health, resilience).
//   3. Physician/nursing/dental specialty-society breadth: the existing
//      library already established the pattern of linking individual
//      specialty societies (cardiology, OB-GYN, radiology, dermatology, etc.)
//      as career-exploration resources for the Physician and Exploring
//      pathways. A large tier of equally major specialties/subspecialties —
//      endocrinology, rheumatology, hematology, nephrology, GI, pulmonology,
//      ENT, urology, neurosurgery, allergy/immunology, infectious disease,
//      hospice/palliative medicine, plastic surgery, pain medicine,
//      pediatric surgery, vascular surgery, radiation oncology, osteopathic
//      medicine/surgery/family medicine, plus health informatics (HIMSS,
//      AMIA — directly relevant to the Health Administration pathway) and
//      several allied-health professional bodies (genetic counseling,
//      speech-language pathology, respiratory care, radiologic technology,
//      dietetics, child life) — had no presence at all. Every one of these
//      is a real, verified, appropriately-leveled professional-body homepage,
//      the same tier as the ones already in the library.
//   4. Smaller rounding-out: CITI Program (the actual human-subjects-research
//      training platform — the library already had the Belmont Report,
//      Common Rule, and Nuremberg Code but never the training itself),
//      Science Buddies' own "How to Read a Scientific Paper" guide, EndNote
//      (a citation manager distinct from the Zotero/Mendeley already
//      present), AACR (which explicitly welcomes high-school-level student
//      members), a few more teen-crisis resources (Love Is Respect, National
//      Runaway Safeline, Cyberbullying Research Center) matching the
//      established Trevor Project/StopBullying.gov tier, PSAT 8/9 (distinct
//      from the PSAT/NMSQT already listed), and single well-justified
//      additions to Math & Data, Behavioral & Social Sciences, and Life
//      Sciences.
//
// Verification approach: every URL below was confirmed via live web search
// against the organization's own site (not assumed from memory) — this
// dev environment's proxy allows WebSearch even though direct
// youtube.com/domain fetches are blocked, the same constraint documented in
// every prior expansion file's header. No individual YouTube `ytId` entries
// are included in this batch, matching the precedent set in
// elibExpansionD.js/E.js: every entry here links to an organization's own
// canonical domain, a test-maker's official page, a publisher's/author's own
// book page, or a federal agency site instead. Two researched candidates
// were deliberately dropped rather than risk an unverified link: Sigma Theta
// Tau International (no search result ever resolved a working
// sigmanursing.org page) and the National Hospice and Palliative Care
// Organization (nhpco.org itself never appeared directly in results, only
// third-party mentions of the org). Checked programmatically against all 857
// existing entries for duplicate titles/URLs before inclusion, and again
// within this file itself — zero duplicates found.

export const ELIB_EXPANSION_F = [
  // ────────────────────────── ADMISSIONS & PLANNING ────────────────────────
  // High-school leadership orgs named directly in the Health Administration lesson.
  { cat:'Admissions & Planning', title:'DECA', url:'https://www.deca.org/hs', type:'Community', free:true, difficulty:'Introductory', desc:'High school career and technical student organization for marketing, finance, hospitality, and entrepreneurship — named directly in this app\'s Health Administration pathway lesson as a way to build real leadership and business experience.' },
  { cat:'Admissions & Planning', title:'FBLA', url:'https://www.fbla.org/', type:'Community', free:true, difficulty:'Introductory', desc:'The largest high school business student organization in the country, offering leadership roles, competitive events, and networking — the other organization this app\'s Health Administration lesson names by name.' },
  // Fee assistance and financial literacy.
  { cat:'Admissions & Planning', title:'AACOMAS Application Fee Waiver', url:'https://www.aacom.org/become-a-doctor/apply-to-medical-school/aacomas-application-fee-waiver', type:'Article', free:true, difficulty:'Advanced', desc:'Official fee-waiver program for the osteopathic medical school application service — the DO-track counterpart to the AAMC Fee Assistance Program already in this library.' },
  { cat:'Admissions & Planning', title:'Next Gen Personal Finance (NGPF)', url:'https://www.ngpf.org/', type:'Course', free:true, difficulty:'Introductory', desc:'Free, teacher-vetted personal finance and financial-math curriculum used in thousands of U.S. high schools — a practical complement to this library\'s existing Khan Academy financial-literacy content.' },
  // Narrative-medicine / physician-memoir reading — a genre the library had none of.
  { cat:'Admissions & Planning', title:'When Breath Becomes Air', url:'https://www.penguinrandomhouse.com/books/258507/when-breath-becomes-air-by-paul-kalanithi/', type:'Book', free:false, difficulty:'Introductory', desc:'Neurosurgery resident Paul Kalanithi\'s memoir of confronting his own terminal diagnosis — one of the most widely recommended books on pre-health reading lists for what it means to both practice and receive medicine.' },
  { cat:'Admissions & Planning', title:'Being Mortal', url:'https://atulgawande.com/book/being-mortal/', type:'Book', free:false, difficulty:'Intermediate', desc:'Surgeon Atul Gawande on aging, mortality, and what medicine can and can\'t fix — standard reading for anyone weighing a career centered on patient care.' },
  { cat:'Admissions & Planning', title:'The Checklist Manifesto', url:'https://atulgawande.com/book/the-checklist-manifesto/', type:'Book', free:false, difficulty:'Introductory', desc:'Gawande\'s case for how simple checklists reduce error in surgery and other high-stakes fields — an accessible, practical read on patient safety.' },
  { cat:'Admissions & Planning', title:'How Doctors Think', url:'https://archive.org/details/howdoctorsthink0000groo', type:'Book', free:false, difficulty:'Intermediate', desc:'Jerome Groopman\'s look at the cognitive shortcuts and biases behind medical diagnosis — a strong preview of the clinical-reasoning skill every pathway in this app eventually demands.' },
  { cat:'Admissions & Planning', title:'Cutting for Stone', url:'https://www.penguinrandomhouse.com/books/183598/cutting-for-stone-by-abraham-verghese/', type:'Book', free:false, difficulty:'Intermediate', desc:'Physician-author Abraham Verghese\'s novel of twin brothers born to a surgeon in Ethiopia — a widely assigned pre-med novel pairing medicine with global health themes.' },
  // Graduate medical education accreditor — completes the school-to-residency arc.
  { cat:'Admissions & Planning', title:'ACGME — Accreditation Council for Graduate Medical Education', url:'https://www.acgme.org/about/overview/', type:'Article', free:true, difficulty:'Advanced', desc:'The body that accredits every U.S. residency and fellowship program — completes the training pipeline (school, then ACGME-accredited residency) alongside the LCME/COCA entries already in this library.' },
  // Physician-specialty societies rounding out the pattern already established
  // (cardiology, OB-GYN, radiology, dermatology, etc. were already present).
  { cat:'Admissions & Planning', title:'Endocrine Society', url:'https://www.endocrine.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional body for hormone and metabolism specialists — rounds out this library\'s physician-specialty exploration.' },
  { cat:'Admissions & Planning', title:'American College of Rheumatology', url:'https://www.rheumatology.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for physicians and health professionals who treat autoimmune and musculoskeletal disease.' },
  { cat:'Admissions & Planning', title:'American Society of Hematology', url:'https://www.hematology.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The largest professional society for blood-disorder and blood-cancer specialists, with career resources for students exploring the specialty.' },
  { cat:'Admissions & Planning', title:'American Society of Nephrology', url:'https://www.asn-online.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for kidney-disease specialists, spanning clinical practice, dialysis, and transplant medicine.' },
  { cat:'Admissions & Planning', title:'American Gastroenterological Association', url:'https://www.gastro.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for digestive-disease physicians and researchers.' },
  { cat:'Admissions & Planning', title:'American College of Chest Physicians (CHEST)', url:'https://www.chestnet.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for pulmonology, critical care, and sleep medicine specialists.' },
  { cat:'Admissions & Planning', title:'American Academy of Otolaryngology–Head and Neck Surgery', url:'https://www.entnet.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for ear, nose, throat, and head-and-neck surgery specialists.' },
  { cat:'Admissions & Planning', title:'American Urological Association', url:'https://www.auanet.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for urologic surgeons and specialists.' },
  { cat:'Admissions & Planning', title:'American Academy of Hospice and Palliative Medicine', url:'https://aahpm.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for physicians specializing in serious-illness and end-of-life care, a growing and less-visible specialty worth exploring.' },
  { cat:'Admissions & Planning', title:'American Academy of Allergy, Asthma & Immunology', url:'https://www.aaaai.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for allergists, clinical immunologists, and allied health professionals in the specialty.' },
  { cat:'Admissions & Planning', title:'Infectious Diseases Society of America', url:'https://www.idsociety.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for physicians, scientists, and public health experts specializing in infectious disease.' },
  { cat:'Admissions & Planning', title:'American Association of Neurological Surgeons', url:'https://www.aans.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for neurosurgeons, with career and educational resources for students.' },
  { cat:'Admissions & Planning', title:'American Society of Plastic Surgeons', url:'https://www.plasticsurgery.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for board-certified plastic and reconstructive surgeons.' },
  { cat:'Admissions & Planning', title:'American Academy of Pain Medicine', url:'https://painmed.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for physicians specializing in the diagnosis and treatment of pain.' },
  { cat:'Admissions & Planning', title:'American Pediatric Surgical Association', url:'https://apsapedsurg.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for surgeons specializing in operating on infants, children, and adolescents.' },
  { cat:'Admissions & Planning', title:'Society for Vascular Surgery', url:'https://vascular.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for vascular surgeons and the prevention and treatment of vascular disease.' },
  { cat:'Admissions & Planning', title:'American Thoracic Society', url:'https://www.thoracic.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for pulmonary, critical care, and sleep-medicine researchers and clinicians, distinct from the more clinically-focused CHEST already listed here.' },
  { cat:'Admissions & Planning', title:'American Society for Radiation Oncology (ASTRO)', url:'https://www.astro.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for physicians and scientists who treat cancer with radiation therapy.' },
  { cat:'Admissions & Planning', title:'Society of Hospital Medicine', url:'https://www.hospitalmedicine.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for hospitalists — physicians, NPs, and PAs whose practice is based entirely in the hospital — one of medicine\'s fastest-growing specialties.' },
  { cat:'Admissions & Planning', title:'Society of Critical Care Medicine', url:'https://www.sccm.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The largest professional organization dedicated to critical care and ICU medicine.' },
  { cat:'Admissions & Planning', title:'American College of Preventive Medicine', url:'https://www.acpm.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for physicians in the specialty focused on disease prevention and population health — a bridge specialty between clinical medicine and the app\'s Public Health pathway.' },
  { cat:'Admissions & Planning', title:'Radiological Society of North America', url:'https://www.rsna.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The professional education and research society for radiology, distinct from the RadiologyInfo.org patient-education site already in this library.' },
  { cat:'Admissions & Planning', title:'Wilderness Medical Society', url:'https://wms.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society devoted to medical care in remote and outdoor settings — a niche but real specialty worth surfacing for students exploring less conventional physician paths.' },
  { cat:'Admissions & Planning', title:'American Telemedicine Association', url:'https://www.americantelemed.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional association promoting virtual and remote-delivered clinical care, an increasingly common way medicine is practiced.' },
  { cat:'Admissions & Planning', title:'American Medical Women\'s Association', url:'https://amwa-doc.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Advocacy and educational organization for women physicians and medical students, and a voice for women\'s health.' },
  // Osteopathic-specific specialty bodies, complementing the existing AACOM/AOA-adjacent entries.
  { cat:'Admissions & Planning', title:'American Osteopathic Association', url:'https://osteopathic.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The national member organization for D.O.s and osteopathic medical students, distinct from the AACOM (which represents osteopathic medical schools) already in this library.' },
  { cat:'Admissions & Planning', title:'American College of Osteopathic Family Physicians', url:'https://acofp.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society representing osteopathic family physicians, residents, and students.' },
  { cat:'Admissions & Planning', title:'American College of Osteopathic Surgeons', url:'https://www.facos.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society supporting osteopathic surgeons through education, mentorship, and community.' },
  // Nursing-specialty bodies rounding out the existing ANA/NSNA/NCLEX entries.
  { cat:'Admissions & Planning', title:'American Association of Nurse Practitioners', url:'https://www.aanp.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The largest membership organization for nurse practitioners, representing advanced-practice nursing.' },
  { cat:'Admissions & Planning', title:'American Association of Nurse Anesthesiology', url:'https://www.aana.com/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for certified registered nurse anesthetists (CRNAs), an advanced-practice nursing specialty.' },
  { cat:'Admissions & Planning', title:'American College of Nurse-Midwives', url:'https://midwife.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society representing certified nurse-midwives and certified midwives, who provide primary, reproductive, and pregnancy-related care.' },
  { cat:'Admissions & Planning', title:'Emergency Nurses Association', url:'https://www.ena.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for emergency-department nursing.' },
  { cat:'Admissions & Planning', title:'Oncology Nursing Society', url:'https://www.ons.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for nurses specializing in cancer care.' },
  { cat:'Admissions & Planning', title:'American Association of Critical-Care Nurses', url:'https://www.aacn.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The world\'s largest specialty nursing organization, representing acute and critical-care nurses.' },
  { cat:'Admissions & Planning', title:'American Nurses Credentialing Center (ANCC)', url:'https://www.nursingworld.org/ancc/', type:'Article', free:true, difficulty:'Intermediate', desc:'The certifying body for advanced-practice and specialty nursing credentials — a subsidiary of the American Nurses Association already in this library.' },
  { cat:'Admissions & Planning', title:'National Association of Pediatric Nurse Practitioners', url:'https://www.napnap.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The only national organization dedicated to advancing the pediatric nurse practitioner role and children\'s health care.' },
  { cat:'Admissions & Planning', title:'National Association of School Nurses', url:'https://www.nasn.org/home', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional association for school nurses, an often-overlooked nursing specialty many students never learn is a distinct career track.' },
  // Dental-specialty bodies rounding out the existing ADA/ASDA entries.
  { cat:'Admissions & Planning', title:'American Association of Orthodontists', url:'https://www2.aaoinfo.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for orthodontists — the dental specialty focused on correcting bite and tooth alignment.' },
  { cat:'Admissions & Planning', title:'American Academy of Pediatric Dentistry', url:'https://www.aapd.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society representing the dental specialty focused on infants, children, adolescents, and patients with special needs.' },
  { cat:'Admissions & Planning', title:'American Dental Hygienists\' Association', url:'https://www.adha.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The largest national organization representing dental hygienists — a distinct, shorter-training dental career many students exploring dentistry don\'t know exists.' },
  { cat:'Admissions & Planning', title:'American Academy of Periodontology', url:'https://www.perio.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for periodontists, the dental specialists who treat gum disease and place dental implants.' },
  { cat:'Admissions & Planning', title:'American Association of Endodontists', url:'https://www.aae.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for endodontists, the dental specialists who perform root canal treatment.' },
  { cat:'Admissions & Planning', title:'American College of Prosthodontists', url:'https://www.gotoapro.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for prosthodontists, the dental specialists who restore and replace missing teeth.' },
  // Pharmacy-specialty and health-informatics bodies.
  { cat:'Admissions & Planning', title:'Academy of Managed Care Pharmacy', url:'https://www.amcp.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional association for pharmacists working in managed care and pharmacy benefit design — the health-economics side of pharmacy practice.' },
  { cat:'Admissions & Planning', title:'Healthcare Information and Management Systems Society (HIMSS)', url:'https://www.himss.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The leading global society for health IT and digital health — directly relevant to the app\'s Health Administration pathway and its coverage of operational systems.' },
  { cat:'Admissions & Planning', title:'American Medical Informatics Association (AMIA)', url:'https://amia.org/', type:'Community', free:true, difficulty:'Advanced', desc:'Professional society for the growing field of biomedical and health informatics, spanning clinical, research, and administrative uses of health data.' },
  // Genetic counseling accreditor, tying together the ACMG/NSGC entries elsewhere in this batch.
  { cat:'Admissions & Planning', title:'Accreditation Council for Genetic Counseling (ACGC)', url:'https://www.gceducation.org/', type:'Article', free:true, difficulty:'Advanced', desc:'The body that accredits graduate genetic counseling programs, completing the picture alongside the National Society of Genetic Counselors already in this library\'s Clinical Exposure section.' },

  // ─────────────────────────────── CLINICAL EXPOSURE ──────────────────────
  // Licensing/certification exams named directly in the app's own pathway lessons.
  { cat:'Clinical Exposure', title:'NAPLEX — North American Pharmacist Licensure Examination (NABP)', url:'https://nabp.pharmacy/programs/examinations/naplex/', type:'Article', free:true, difficulty:'Advanced', desc:'The exam every PharmD graduate must pass to become a licensed pharmacist — the pharmacy pathway\'s direct counterpart to the USMLE, NCLEX, and PANCE already in this library.' },
  { cat:'Clinical Exposure', title:'National Nurse Aide Assessment Program (NNAAP) / CNA Certification (NCSBN)', url:'https://www.ncsbn.org/exams/nnaap-and-mace.page', type:'Article', free:true, difficulty:'Introductory', desc:'The certified-nursing-assistant exam named directly in this app\'s Nursing and Physician Assistant lessons as a realistic, hands-on way to build patient-contact hours before applying to a program.' },
  { cat:'Clinical Exposure', title:'AHDPG Certified Medical Scribe Credential', url:'https://ahdpg.com/certification/', type:'Article', free:true, difficulty:'Intermediate', desc:'Explains the medical-scribe certification this app\'s Physician Assistant pathway lesson names by name as a path to the direct patient-care hours most PA programs require.' },
  { cat:'Clinical Exposure', title:'NHA Certified Phlebotomy Technician (CPT)', url:'https://www.nhanow.com/certification/nha-certifications/certified-phlebotomy-technician-(cpt)', type:'Article', free:true, difficulty:'Intermediate', desc:'Another common, realistic entry-level clinical role — drawing blood — that builds the patient-contact hours PA, nursing, and medical-school applications value.' },
  // Global-health exposure and its ethical caveats.
  { cat:'Clinical Exposure', title:'Doctors Without Borders / Médecins Sans Frontières (MSF-USA)', url:'https://www.doctorswithoutborders.org/', type:'Article', free:true, difficulty:'Intermediate', desc:'The best-known international medical humanitarian organization — a concrete look at global health work for students in the Public Health or Physician pathways.' },
  { cat:'Clinical Exposure', title:'Peace Corps — Health Sector', url:'https://www.peacecorps.gov/ways-to-serve/our-work-sectors/health/', type:'Article', free:true, difficulty:'Intermediate', desc:'Overview of Peace Corps health-focused volunteer service — a real, structured path into global public health work after a bachelor\'s degree.' },
  { cat:'Clinical Exposure', title:'Learning Service — The Essential Guide to Volunteering Abroad', url:'https://learningservice.info/', type:'Article', free:true, difficulty:'Intermediate', desc:'A widely used resource on doing international volunteering (including medical mission trips) ethically — addressing a real, often-missed gap in how pre-health students think about global service.' },
  { cat:'Clinical Exposure', title:'Global Health Council', url:'https://www.globalhealth.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The largest membership alliance advancing global health policy and programs — background for students drawn to the international side of the Public Health pathway.' },
  { cat:'Clinical Exposure', title:'National Rural Health Association', url:'https://www.ruralhealth.us/', type:'Community', free:true, difficulty:'Intermediate', desc:'National organization focused on the healthcare access challenges specific to rural communities — a distinct angle on health equity from the urban/global framing most resources here take.' },
  { cat:'Clinical Exposure', title:'The Spirit Catches You and You Fall Down', url:'https://archive.org/details/spiritcatchesyou0000fadi_w2z7', type:'Book', free:false, difficulty:'Intermediate', desc:'Anne Fadiman\'s account of a Hmong child\'s epilepsy treatment colliding with two different medical worldviews — a classic, widely assigned case study in cultural competency and health disparities.' },
  { cat:'Clinical Exposure', title:'Mountains Beyond Mountains', url:'https://www.penguinrandomhouse.com/books/92351/mountains-beyond-mountains-by-tracy-kidder/', type:'Book', free:false, difficulty:'Intermediate', desc:'Tracy Kidder\'s biography of Dr. Paul Farmer and his work bringing modern medicine to Haiti — a direct, human look at the global-health side of the Public Health pathway.' },
  // Allied-health careers adjacent to the app's own PT/OT/PA pathways.
  { cat:'Clinical Exposure', title:'National Society of Genetic Counselors', url:'https://www.nsgc.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional organization for genetic counselors — a growing career at the intersection of genetics and direct patient communication, a natural extension of this library\'s genetics coverage.' },
  { cat:'Clinical Exposure', title:'American College of Medical Genetics and Genomics (ACMG)', url:'https://www.acmg.net/', type:'Community', free:true, difficulty:'Advanced', desc:'The professional society for clinical and laboratory medical geneticists, complementing the genetic-counselor and biomedical-research content elsewhere in this library.' },
  { cat:'Clinical Exposure', title:'American Speech-Language-Hearing Association (ASHA)', url:'https://www.asha.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional and credentialing body for speech-language pathologists and audiologists — an allied-health career many "Exploring" students never learn is an option.' },
  { cat:'Clinical Exposure', title:'American Association for Respiratory Care', url:'https://www.aarc.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The national professional society for respiratory therapists, who manage ventilators and breathing treatments — hands-on clinical work with a shorter training path than most physician-track careers.' },
  { cat:'Clinical Exposure', title:'American Society of Radiologic Technologists', url:'https://www.asrt.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional society for medical imaging and radiation therapy technologists — a hands-on, tech-forward allied-health career.' },
  { cat:'Clinical Exposure', title:'Academy of Nutrition and Dietetics — Become a Registered Dietitian Nutritionist', url:'https://www.eatright.org/become-an-rdn', type:'Article', free:true, difficulty:'Intermediate', desc:'Official guide to becoming a registered dietitian nutritionist, distinct from the general nutrition-basics content (MyPlate) already in this library\'s Wellness section.' },
  { cat:'Clinical Exposure', title:'Association of Child Life Professionals', url:'https://www.childlife.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'Professional organization for child life specialists, who help children and families cope with illness and hospitalization — a patient-facing, non-clinical hospital career few students know exists.' },
  // Student-organization and history resources matching the AMSA/SNMA/SNPhA precedent.
  { cat:'Clinical Exposure', title:'Student Osteopathic Medical Association (SOMA)', url:'https://studentdo.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The national organization for osteopathic medical students, affiliated with the American Osteopathic Association — the DO-track counterpart to AMSA already in this library.' },
  { cat:'Clinical Exposure', title:'APHA Student Assembly', url:'https://www.apha.org/apha-communities/student-assembly', type:'Community', free:true, difficulty:'Intermediate', desc:'The student-led wing of the American Public Health Association, with scholarships and leadership opportunities specifically for public-health students.' },
  { cat:'Clinical Exposure', title:'Physician Assistant History Society', url:'https://pahx.org/', type:'Article', free:true, difficulty:'Intermediate', desc:'A well-organized timeline and archive of how the PA profession developed — useful context for students in the Physician Assistant pathway on where the collaborative-care model came from.' },
  // Certification distinct from the general Heartsaver/lay CPR content already present.
  { cat:'Clinical Exposure', title:'American Heart Association — BLS for Healthcare Providers', url:'https://cpr.heart.org/en/cpr-courses-and-kits/healthcare-professional/basic-life-support-bls-training', type:'Article', free:true, difficulty:'Intermediate', desc:'The Basic Life Support certification most CNA, EMT, scribe, and clinical-volunteer roles require — distinct from the layperson Heartsaver course already in this library.' },
  { cat:'Clinical Exposure', title:'MedlinePlus — Drug Information', url:'https://medlineplus.gov/druginformation.html', type:'Article', free:true, difficulty:'Introductory', desc:'NIH-run, consumer-friendly drug and medication information — a natural companion to the general MedlinePlus entries already in this library, and directly relevant to the Pharmacy pathway.' },
  { cat:'Clinical Exposure', title:'FDA — Center for Biologics Evaluation and Research (CBER)', url:'https://www.fda.gov/about-fda/fda-organization/center-biologics-evaluation-and-research-cber', type:'Article', free:true, difficulty:'Advanced', desc:'The FDA center that regulates vaccines and biologic therapies, complementing the Center for Drug Evaluation and Research (CDER) entry already in this library.' },
  { cat:'Clinical Exposure', title:'NIH Fogarty International Center', url:'https://www.fic.nih.gov/', type:'Article', free:true, difficulty:'Advanced', desc:'The NIH institute focused specifically on global health research and training — rounds out this library\'s existing NIH-institute coverage with the one most relevant to the Public Health pathway\'s international dimension.' },
  { cat:'Clinical Exposure', title:'NIH National Institute on Deafness and Other Communication Disorders (NIDCD)', url:'https://www.nidcd.nih.gov/', type:'Article', free:true, difficulty:'Advanced', desc:'The NIH institute for hearing, speech, and language research — pairs with the speech-language pathology and audiology content added elsewhere in this batch.' },

  // ─────────────────────────────── RESEARCH METHODS ────────────────────────
  { cat:'Research Methods', title:'CITI Program — Human Subjects Research Training', url:'https://about.citiprogram.org/series/human-subjects-research-hsr/', type:'Course', free:false, difficulty:'Advanced', desc:'The standard online training platform researchers actually complete before working with human subjects — the practical training this library\'s existing Belmont Report and Common Rule entries describe the rules behind.' },
  { cat:'Research Methods', title:'Science Buddies — How to Read a Scientific Paper', url:'https://www.sciencebuddies.org/science-fair-projects/competitions/how-to-read-a-scientific-paper', type:'Article', free:true, difficulty:'Intermediate', desc:'A step-by-step guide to reading a primary research article — pitched at exactly the advanced-high-school/undergrad level this app targets, from an already-trusted source in this library.' },
  { cat:'Research Methods', title:'The Immortal Life of Henrietta Lacks', url:'https://rebeccaskloot.com/the-immortal-life/about-the-book/', type:'Book', free:false, difficulty:'Intermediate', desc:'Rebecca Skloot\'s account of the woman behind the HeLa cell line and the research-ethics questions her story raises — pairs directly with this library\'s existing Belmont Report and Common Rule entries.' },
  { cat:'Research Methods', title:'EndNote', url:'https://endnote.com/', type:'App', free:false, difficulty:'Intermediate', desc:'A widely used citation and reference-management tool, distinct from the free Zotero and Mendeley already in this library — many university labs standardize on it.' },
  { cat:'Research Methods', title:'American Association for Cancer Research (AACR)', url:'https://www.aacr.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'The largest cancer-research organization, which explicitly welcomes high-school-level student members — a real, appropriately-leveled entry point into biomedical research.' },

  // ─────────────────────────────────── TEST PREP ───────────────────────────
  { cat:'Test Prep', title:'ATI TEAS', url:'https://www.atitesting.com/teas', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The standardized entrance exam most ADN and BSN nursing programs require — the nursing pathway\'s counterpart to the DAT and GRE already in this library.' },
  { cat:'Test Prep', title:'NCLEX Candidate Bulletin Information (NCSBN)', url:'https://www.ncsbn.org/exams/before-the-exam/candidate-bulletin-information.page', type:'Article', free:true, difficulty:'Advanced', desc:'Official exam-day and registration information for the NCLEX, distinct from the general licensing-body entry already in this library\'s Admissions & Planning section.' },
  { cat:'Test Prep', title:'PSAT 8/9 (College Board)', url:'https://satsuite.collegeboard.org/psat-8-9', type:'Article', free:true, difficulty:'Introductory', desc:'The earliest exam in the College Board\'s SAT Suite, taken by 8th and 9th graders — a distinct, earlier checkpoint from the PSAT/NMSQT already listed here.' },

  // ─────────────────────────────── WELLNESS & BALANCE ──────────────────────
  { cat:'Wellness & Balance', title:'Man\'s Search for Meaning', url:'https://www.beacon.org/Mans-Search-for-Meaning-P602.aspx', type:'Book', free:false, difficulty:'Introductory', desc:'Viktor Frankl\'s account of finding meaning through the worst of circumstances — a classic, appropriately-leveled read on resilience for students under the pressure of a demanding academic path.' },
  { cat:'Wellness & Balance', title:'Love Is Respect', url:'https://www.loveisrespect.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A 24/7 resource specifically for teens and young adults with questions about healthy versus unhealthy dating relationships.' },
  { cat:'Wellness & Balance', title:'National Runaway Safeline', url:'https://www.1800runaway.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A federally designated 24/7 crisis line and resource for at-risk youth and their families, matching the tier of teen-crisis resource already established in this library.' },
  { cat:'Wellness & Balance', title:'Cyberbullying Research Center', url:'https://cyberbullying.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Research-based facts, prevention tips, and response strategies for online harassment, complementing the StopBullying.gov entry already in this library.' },

  // ─────────────────────────── BEHAVIORAL & SOCIAL SCIENCES ────────────────
  { cat:'Behavioral & Social Sciences', title:'OpenStax American Government 3e', url:'https://openstax.org/details/books/american-government-3e', type:'Book', free:true, difficulty:'AP / Intermediate', desc:'Free, peer-reviewed introductory government textbook, complementing the existing Crash Course Government playlist and Khan Academy US Government content.' },
  { cat:'Behavioral & Social Sciences', title:'Thinking, Fast and Slow', url:'https://www.penguinrandomhouse.com/books/89308/thinking-fast-and-slow-by-daniel-kahneman/', type:'Book', free:false, difficulty:'Intermediate', desc:'Daniel Kahneman\'s Nobel-winning work on cognitive bias and decision-making — directly relevant to the MCAT-adjacent psychology/behavioral-science content already in this library.' },
  { cat:'Behavioral & Social Sciences', title:'Crash Course Philosophy', url:'https://thecrashcourse.com/topic/philosophy/', type:'Course', free:true, difficulty:'Introductory', desc:'A 46-episode introduction to ethical theory (utilitarianism, deontology, virtue ethics) — the closest verified video resource to the four-pillars medical-ethics framework this app\'s Physician pathway teaches but had no matching video for.' },

  // ────────────────────────────────── LIFE SCIENCES ────────────────────────
  { cat:'Life Sciences', title:'The Emperor of All Maladies: A Biography of Cancer', url:'https://www.simonandschuster.com/books/The-Emperor-of-All-Maladies/Siddhartha-Mukherjee/9781668047033', type:'Book', free:false, difficulty:'Advanced', desc:'Siddhartha Mukherjee\'s Pulitzer Prize-winning history of cancer and cancer research — an ambitious but accessible read for students drawn to oncology or biomedical research.' },
  { cat:'Life Sciences', title:'American Society for Cell Biology (ASCB)', url:'https://www.ascb.org/', type:'Community', free:true, difficulty:'Intermediate', desc:'International professional society for cell biology and biomedical research, with membership and resources spanning undergraduate students to senior researchers.' },
  { cat:'Life Sciences', title:'Short Wave (NPR)', url:'https://podcasts.apple.com/us/podcast/short-wave/id1482575855', type:'Podcast', free:true, difficulty:'Introductory', desc:'NPR\'s daily, under-15-minute science podcast covering new discoveries and the science behind the headlines — an easy, low-commitment way to build science-news literacy.' },
  { cat:'Life Sciences', title:'Sawbones: A Marital Tour of Misguided Medicine', url:'https://maximumfun.org/podcasts/sawbones/', type:'Podcast', free:true, difficulty:'Introductory', desc:'A medical-history podcast digging through the odd, wrong, and sometimes horrifying ways medicine has tried to fix people over the centuries — genuinely educational and a fun complement to this library\'s more clinical content.' },

  // ──────────────────────────────────── MATH & DATA ────────────────────────
  { cat:'Math & Data', title:'GCFGlobal — Excel', url:'https://edu.gcfglobal.org/en/excel/', type:'Course', free:true, difficulty:'Introductory', desc:'Free, self-paced spreadsheet tutorials covering formulas, charts, and data organization — a practical skill underlying the lab-data and public-health data content elsewhere in this library.' },
  { cat:'Math & Data', title:'MIT OpenCourseWare — Introduction to Probability and Statistics (18.05)', url:'https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/', type:'Course', free:true, difficulty:'Advanced', desc:'A full MIT course covering probability, hypothesis testing, and Bayesian inference — a rigorous complement to the OpenIntro/Khan Academy statistics content already in this library.' },
];
