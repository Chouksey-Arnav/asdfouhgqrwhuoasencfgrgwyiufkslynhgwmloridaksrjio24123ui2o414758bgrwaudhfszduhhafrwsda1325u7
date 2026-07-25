// ELIB expansion batch E — a sixth verified batch layered on top of
// elib.js + elibExtra.js + elibExpansionA.js + elibExpansionB.js +
// elibExpansionC.js + elibExpansionD.js (778 entries combined before this
// file).
//
// Why this batch exists: a full re-audit of the library — cross-referencing
// every entry's category against what the app's 10 lesson-content pathways
// (Physician, Nursing, Physician Assistant, Pharmacy, Dentistry, Biomedical
// Research, Physical/Occupational Therapy, Public Health, Health
// Administration, Exploring — see src/data/lessonContent/) actually teach —
// turned up one large, concrete gap and several smaller ones:
//
//   1. THE BIG GAP: the PA, PT, and OT pathways were represented by only one
//      professional-body link each (AAPA / APTA / AOTA). The PA lesson
//      content literally names CASPA by name (physicianAssistant.js), and
//      the PT/OT content explicitly teaches biomechanics — but the library
//      had zero centralized-application-service links (no CASPA, PTCAS,
//      OTCAS, or the dental equivalent ADEA AADSAS), zero certifying-exam
//      bodies (no NCCPA/PANCE, FSBPT/NPTE, NBCOT), zero program accreditors
//      (no ARC-PA/CAPTE/ACOTE/CODA/LCME/COCA), and nothing for the MD/DO
//      licensing exams (USMLE/COMLEX-USA) or the physician-track application
//      services themselves (AMCAS/AACOMAS — the library had MSAR and general
//      "applying to medical school" pages, but never the application service
//      by name). This batch closes that gap symmetrically across every
//      pathway, the same way elibExpansionD.js closed the health-econ gap.
//   2. The app's own Interview Prep feature has a dedicated MMI/CASPer
//      practice mode (see src/data/mmiCasperQuestions.js), but the library
//      had no resource explaining what CASPer or the AAMC PREview exam
//      actually are — closed here with the test-makers' own pages.
//   3. Test-prep coverage stopped at MCAT-adjacent Khan Academy content; the
//      DAT (dentistry) and GRE (public health/biomed-research grad programs)
//      had zero presence. (The PCAT was investigated and deliberately
//      excluded — it was retired by the testmaker in January 2024 and no
//      longer exists as a live exam.)
//   4. Smaller rounding-out: additional NIH institutes not yet linked (NIA,
//      NIEHS, NIBIB, NIMHD, NINR, NCCIH), a few more physician-specialty and
//      allied-health professional bodies, minority/underrepresented-in-
//      medicine student organizations (NSNA, ASDA, SNPhA) mirroring the
//      SNMA/AMSA/LMSA pattern already established, PT/OT-adjacent kinesiology
//      resources (the actual gap behind why "biomechanics" had no library
//      resource despite being taught), a handful of well-known research
//      tools/citizen-science platforms not yet linked (Addgene, iGEM, Foldit,
//      BLAST, RCSB PDB-101, The Carpentries, eLife), and healthcare-specific
//      (not generic-teen) wellness resources, since Wellness & Balance
//      already had deep general teen mental-health coverage but nothing
//      about the specific culture of stress in health careers.
//
// Verification method: every entry below was independently confirmed via
// live WebSearch during this session (this sandbox cannot reach most
// external sites directly to hit them live) — organization name, current
// canonical URL, and free/paid status were all checked against real search
// results, not assumed from memory. Multiple candidates that came up in
// research were dropped after verification: the PCAT (retired by the
// testmaker in 2024), NLM's Tox Town (the National Library of Medicine
// discontinued it in October 2020), and MIT's "Highlights for High School"
// microsite (retired, though some individual pages still resolve) were all
// excluded rather than risking a dead or defunct resource. A large number of
// promising candidates (3Blue1Brown, Veritasium, Wolfram Alpha, PLOS ONE,
// Retraction Watch, Exploratorium, Zooniverse, Kaggle, Molecular Biology of
// the Cell, GeoGebra, Symbolab, Numberphile, Pew Research Center, Project
// Implicit, TED-Ed, "Brilliant", Data USA... ) were found to already be
// present somewhere in the existing six files and were left out to avoid
// duplication — checked one at a time against the existing corpus, not
// assumed absent.
//
// No individual YouTube `ytId` entries are included in this batch, for the
// same reason established in elibExpansionC.js/D.js: this sandbox cannot hit
// YouTube's oEmbed endpoint to confirm a specific video id resolves. Every
// entry here links to an organization's own canonical domain, a test-maker's
// official page, a federal agency's site, or a channel's stable @handle/user
// URL instead. Checked programmatically against all 778 existing
// entries for duplicate titles/URLs before inclusion, and again within this
// file itself.

export const ELIB_EXPANSION_E = [
  // ────────────────────────── ADMISSIONS & PLANNING ────────────────────────
  // Centralized application services — the actual apply-here services for
  // every pathway, several named directly in the app's own lesson content.
  { cat:'Admissions & Planning', title:'AMCAS — American Medical College Application Service', url:'https://students-residents.aamc.org/applying-medical-school-amcas/about-amcas-program', type:'Article', free:true, difficulty:'Introductory', desc:'The AAMC\'s official centralized application — one online application submitted to every MD program you apply to.' },
  { cat:'Admissions & Planning', title:'AACOMAS — Osteopathic Medical School Application Service', url:'https://www.aacom.org/become-a-doctor/apply-to-medical-school', type:'Article', free:true, difficulty:'Introductory', desc:'The centralized application service for every U.S. osteopathic (DO) medical school — the DO-track equivalent of AMCAS.' },
  { cat:'Admissions & Planning', title:'CASPA — Centralized Application Service for Physician Assistants', url:'https://paeaonline.org/resources/member-resources/caspa', type:'Article', free:true, difficulty:'Introductory', desc:'The single application PA-program applicants use to apply to 90%+ of accredited PA programs nationwide, run by PAEA.' },
  { cat:'Admissions & Planning', title:'PTCAS — Physical Therapist Centralized Application Service', url:'https://www.apta.org/cas/ptcas', type:'Article', free:true, difficulty:'Introductory', desc:'The APTA-run centralized application most Doctor of Physical Therapy programs require.' },
  { cat:'Admissions & Planning', title:'OTCAS — Occupational Therapy Centralized Application Service', url:'https://www.aota.org/education/find-a-school/ot-cas', type:'Article', free:true, difficulty:'Introductory', desc:'The AOTA-run centralized application used by most OT and OTA programs nationwide.' },
  { cat:'Admissions & Planning', title:'ADEA AADSAS — Dental School Application Service', url:'https://www.adea.org/godental/Apply', type:'Article', free:true, difficulty:'Introductory', desc:'The centralized dental-school application service, distinct from the general ADEA GoDental shadowing/prep pages already in this library.' },
  { cat:'Admissions & Planning', title:'SOPHAS — Centralized Application Service for Public Health', url:'https://aspph.org/student-journey/sophas/', type:'Article', free:true, difficulty:'Introductory', desc:'The single application most MPH and other public-health graduate programs use, run by ASPPH.' },
  // Financing the path — closing the same "how do you actually pay for
  // this" gap the FAFSA/CSS Profile/loan-forgiveness resources already
  // partially cover, extended to health-professional school specifically.
  { cat:'Admissions & Planning', title:'AAMC FIRST — Financial Information, Resources, Services, and Tools', url:'https://students-residents.aamc.org/financial-aid', type:'Article', free:true, difficulty:'Introductory', desc:'The AAMC\'s free financial-aid hub for medical students, including a loan-repayment calculator and a searchable scholarship database.' },
  { cat:'Admissions & Planning', title:'National Health Service Corps (NHSC)', url:'https://nhsc.hrsa.gov/', type:'Article', free:true, difficulty:'Introductory', desc:'A federal program offering scholarships and loan repayment to primary-care, dental, and behavioral-health students who commit to practicing in underserved communities.' },
  { cat:'Admissions & Planning', title:'Armed Forces Health Professions Scholarship Program (AFHPSP)', url:'https://students-residents.aamc.org/first/us-air-force-armed-forces-health-professions-scholarship-program-afhpsp', type:'Article', free:true, difficulty:'Introductory', desc:'A military scholarship covering full tuition plus a living stipend for medical, dental, and other health-professional students, in exchange for a service commitment after graduation.' },
  { cat:'Admissions & Planning', title:'Uniformed Services University of the Health Sciences (USUHS)', url:'https://www.usuhs.edu/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'"America\'s medical school" — a fully tuition-free federal medical/health-sciences university where students are paid as officers throughout training.' },
  { cat:'Admissions & Planning', title:'Indian Health Service (IHS) Scholarship Program', url:'https://www.ihs.gov/scholarship/', type:'Article', free:true, difficulty:'Introductory', desc:'Scholarships covering tuition and living expenses for American Indian and Alaska Native students pursuing a health-profession degree, in exchange for service in an Indian health program.' },
  { cat:'Admissions & Planning', title:'Public Service Loan Forgiveness (PSLF)', url:'https://studentaid.gov/pslf/', type:'Article', free:true, difficulty:'Introductory', desc:'The official federal program forgiving remaining student-loan balances after 10 years of qualifying payments while working in public service, including many hospitals and clinics.' },
  { cat:'Admissions & Planning', title:'AAMC MD-PhD Dual Degree Training', url:'https://students-residents.aamc.org/md-phd-dual-degree-training/md-phd-dual-degree-training', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The official AAMC overview of MD-PhD (physician-scientist) programs — most fund both tuition and a stipend for the full 7-8 years.' },
  { cat:'Admissions & Planning', title:'American Physician Scientists Association (APSA)', url:'https://www.physicianscientists.org/', type:'Community', free:true, difficulty:'Undergrad / Advanced', desc:'The largest national organization for physician-scientist trainees, representing chapters at nearly 100 institutions — a natural fit for MD-PhD-curious biomedical-research students.' },
  { cat:'Admissions & Planning', title:'Interfolio Dossier', url:'https://www.interfolio.com/dossier/', type:'App', free:false, difficulty:'Introductory', desc:'A widely used letter-of-recommendation storage and delivery service compatible with AMCAS, AACOMAS, and most other application systems.' },
  // Physician-specialty and allied-health professional bodies rounding out
  // the map already started with AAFP/ACP/ACC/AAD/etc. in earlier batches.
  { cat:'Admissions & Planning', title:'American Academy of Physical Medicine and Rehabilitation (AAPM&R)', url:'https://www.aapmr.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional home for physiatrists — the physician specialty overseeing rehabilitation medicine, a natural bridge for students exploring PT/OT alongside medicine.' },
  { cat:'Admissions & Planning', title:'American Society of Anesthesiologists (ASA)', url:'https://www.asahq.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional home for anesthesiologists, representing over 60,000 members.' },
  { cat:'Admissions & Planning', title:'American Academy of Orthopaedic Surgeons (AAOS)', url:'https://www.aaos.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The major professional association for orthopaedic surgeons, with public-facing resources on the specialty and its training path.' },
  { cat:'Admissions & Planning', title:'American Board of Medical Specialties (ABMS)', url:'https://www.abms.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The umbrella organization overseeing physician board certification across all 24 broad specialty areas — a useful map of the whole specialty landscape at once.' },
  { cat:'Admissions & Planning', title:'American Pharmacists Association (APhA)', url:'https://www.pharmacist.com/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The largest professional association of pharmacists and student pharmacists in the U.S.' },
  { cat:'Admissions & Planning', title:'American College of Clinical Pharmacy (ACCP)', url:'https://www.accp.com/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A professional and scientific society for pharmacists who practice in direct patient care, distinct from the pharmacy-education body (AACP) already in this library.' },
  // Programmatic accreditors — the "is this program legitimate" layer,
  // useful once a student is evaluating specific programs to apply to.
  { cat:'Admissions & Planning', title:'Liaison Committee on Medical Education (LCME)', url:'https://lcme.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The official U.S. Department of Education-recognized accreditor of MD-degree programs, jointly sponsored by the AAMC and AMA.' },
  { cat:'Admissions & Planning', title:'Commission on Osteopathic College Accreditation (COCA)', url:'https://osteopathic.org/accreditation/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The official accreditor of every U.S. college of osteopathic medicine, run by the American Osteopathic Association.' },
  { cat:'Admissions & Planning', title:'ARC-PA — Accreditation Review Commission on Education for the PA', url:'https://www.arc-pa.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The independent body that accredits every PA educational program in the U.S.' },
  { cat:'Admissions & Planning', title:'CAPTE — Commission on Accreditation in Physical Therapy Education', url:'https://www.capteonline.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The accrediting agency for entry-level physical therapist and physical therapist assistant education programs, recognized by the U.S. Department of Education.' },
  { cat:'Admissions & Planning', title:'ACOTE — Accreditation Council for Occupational Therapy Education', url:'https://acoteonline.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The federally recognized accreditor of occupational therapy and OTA educational programs.' },
  { cat:'Admissions & Planning', title:'CODA — Commission on Dental Accreditation', url:'https://coda.ada.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The sole U.S. Department of Education-recognized accreditor of dental and dental-related education programs, run by the ADA.' },

  // ─────────────────────────────── TEST PREP ────────────────────────────────
  { cat:'Test Prep', title:'DAT — Dental Admission Test (ADA)', url:'https://www.ada.org/education/testing', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The American Dental Association\'s own page on the exam every dental-school applicant takes — official candidate guides and score information.' },
  { cat:'Test Prep', title:'GRE General Test (ETS)', url:'https://www.ets.org/gre/test-takers/general-test/about.html', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The test-maker\'s own overview of the GRE, still required or accepted by many MPH, PhD, and some PA/OT/PT graduate programs.' },
  { cat:'Test Prep', title:'CASPer (Acuity Insights)', url:'https://acuityinsights.com/products/holistic-admissions/casper/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The test-maker\'s own explanation of the CASPer situational-judgment test many medical, dental, and PA programs require — pairs directly with this app\'s own CASPer-style Interview Prep mode.' },
  { cat:'Test Prep', title:'AAMC PREview Professional Readiness Exam', url:'https://students-residents.aamc.org/aamc-preview/about-aamc-preview-exam', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The AAMC\'s own situational-judgment exam measuring professionalism skills — an increasing number of medical schools request a PREview score alongside the MCAT.' },
  { cat:'Test Prep', title:'AAMC — Free MCAT Planning and Study Resources', url:'https://students-residents.aamc.org/prepare-mcat-exam/free-planning-and-study-resources', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The test-maker\'s own free MCAT practice exam, sample questions, and content outline — distinct from (and a free complement to) the paid AAMC prep bundle.' },

  // ────────────────────────────── CLINICAL EXPOSURE ────────────────────────
  // Certifying/licensing bodies — the finish-line credential for every
  // pathway, completing the same map the application services above start.
  { cat:'Clinical Exposure', title:'NCCPA — National Commission on Certification of Physician Assistants', url:'https://www.nccpa.net/become-certified/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The body that administers the PANCE, the certifying exam every PA takes after graduating — required for licensure in all 50 states.' },
  { cat:'Clinical Exposure', title:'FSBPT — Federation of State Boards of Physical Therapy', url:'https://www.fsbpt.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The organization that administers the NPTE, the licensing exam for physical therapists and PT assistants.' },
  { cat:'Clinical Exposure', title:'NBCOT — National Board for Certification in Occupational Therapy', url:'https://www.nbcot.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The national certifying body for occupational therapists and OT assistants, required for licensure in every U.S. state.' },
  { cat:'Clinical Exposure', title:'USMLE — United States Medical Licensing Examination', url:'https://www.usmle.org/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The three-step exam every MD-track physician takes on the way to licensure — the finish line the MCAT and medical school are building toward.' },
  { cat:'Clinical Exposure', title:'NBOME — COMLEX-USA', url:'https://www.nbome.org/assessments/comlex-usa/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The DO-track equivalent of the USMLE — the licensing exam sequence every osteopathic physician completes.' },
  // Kinesiology/sports-medicine and sports-science bodies — the concrete
  // resource behind why PT/OT lessons teach biomechanics with nowhere for a
  // student to go deeper.
  { cat:'Clinical Exposure', title:'American College of Sports Medicine (ACSM)', url:'https://www.acsm.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The world\'s largest sports-medicine and exercise-science organization, with career resources for students in kinesiology and exercise-science programs feeding into PT/OT.' },
  { cat:'Clinical Exposure', title:'National Athletic Trainers\' Association (NATA)', url:'https://www.nata.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional association for athletic trainers — a closely related rehab/sports-medicine career many PT/OT-track students also consider.' },
  // NIH institutes not yet linked, including one tied directly to nursing.
  { cat:'Clinical Exposure', title:'NIA — National Institute on Aging', url:'https://www.nia.nih.gov/', type:'Article', free:true, difficulty:'Introductory', desc:'The NIH institute leading research on aging and Alzheimer\'s disease, with plain-language health information for the public.' },
  { cat:'Clinical Exposure', title:'NIEHS — National Institute of Environmental Health Sciences', url:'https://www.niehs.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute studying how environmental exposures affect human health and disease.' },
  { cat:'Clinical Exposure', title:'NIBIB — National Institute of Biomedical Imaging and Bioengineering', url:'https://www.nibib.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute behind medical-imaging and bioengineering research — the science underneath X-rays, MRIs, and implantable devices.' },
  { cat:'Clinical Exposure', title:'NIMHD — National Institute on Minority Health and Health Disparities', url:'https://www.nimhd.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute leading research on eliminating health disparities and improving minority health.' },
  { cat:'Clinical Exposure', title:'NINR — National Institute of Nursing Research', url:'https://www.ninr.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The NIH institute funding nursing science research — a direct look at the research side of the nursing pathway.' },
  { cat:'Clinical Exposure', title:'NCCIH — National Center for Complementary and Integrative Health', url:'https://www.nccih.nih.gov/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The federal government\'s lead research agency on complementary and integrative health approaches.' },
  { cat:'Clinical Exposure', title:'HRSA — Health Resources and Services Administration', url:'https://www.hrsa.gov/', type:'Article', free:true, difficulty:'Introductory', desc:'The federal agency improving healthcare access for uninsured, isolated, and medically vulnerable Americans — the parent agency behind NHSC and the National Practitioner Data Bank.' },
  // Disease-advocacy nonprofits rounding out the ADA/AHA/ACS/NEDA pattern.
  { cat:'Clinical Exposure', title:'National Kidney Foundation', url:'https://www.kidney.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Free patient-education resources on kidney disease, dialysis, and transplantation from the leading U.S. kidney-health nonprofit.' },
  { cat:'Clinical Exposure', title:'Epilepsy Foundation', url:'https://www.epilepsy.com/', type:'Article', free:true, difficulty:'Introductory', desc:'Free patient- and caregiver-facing education on epilepsy and seizure first aid, including an on-demand training portal.' },
  { cat:'Clinical Exposure', title:'National Multiple Sclerosis Society', url:'https://www.nationalmssociety.org/', type:'Article', free:true, difficulty:'Introductory', desc:'Free patient-education programs and resources on multiple sclerosis from the leading MS nonprofit.' },
  { cat:'Clinical Exposure', title:'Genetic Alliance', url:'https://geneticalliance.org/', type:'Community', free:true, difficulty:'Introductory', desc:'The world\'s largest health-advocacy network focused on genetics, connecting over 1,000 disease-advocacy organizations.' },
  { cat:'Clinical Exposure', title:'March of Dimes', url:'https://www.marchofdimes.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A leading nonprofit focused on maternal and infant health, prematurity, and closing the maternal-health equity gap.' },
  { cat:'Clinical Exposure', title:'RadiologyInfo.org', url:'https://www.radiologyinfo.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A trusted patient-education site on medical imaging exams and procedures, jointly produced by RSNA, ACR, and ASRT.' },
  // Minority/underrepresented student organizations mirroring the
  // SNMA/AMSA/LMSA pattern already established, extended to nursing,
  // dentistry, and pharmacy.
  { cat:'Clinical Exposure', title:'National Student Nurses\' Association (NSNA)', url:'https://www.nsna.org/', type:'Community', free:true, difficulty:'Introductory', desc:'The national voice of nursing students, with mentorship, scholarships, and professional-development resources.' },
  { cat:'Clinical Exposure', title:'American Student Dental Association (ASDA)', url:'https://www.asdanet.org/', type:'Community', free:true, difficulty:'Introductory', desc:'The national student-run organization representing nearly 25,000 dental students and predental members.' },
  { cat:'Clinical Exposure', title:'Student National Pharmaceutical Association (SNPhA)', url:'https://www.snpha.org/', type:'Community', free:true, difficulty:'Introductory', desc:'An educational service association of pharmacy and pre-pharmacy students dedicated to improving health outcomes in minority communities.' },

  // ───────────────────────────────── LIFE SCIENCES ─────────────────────────
  { cat:'Life Sciences', title:'Histology Guide', url:'https://histologyguide.com/', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'A free virtual microscopy lab with 225+ real histology slides for learning tissue structure — the visual skill underneath every biopsy report.' },
  { cat:'Life Sciences', title:'UNSW Embryology', url:'https://embryology.med.unsw.edu.au/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'A comprehensive, free embryology reference built for medical and science undergraduates by a University of New South Wales anatomist.' },
  { cat:'Life Sciences', title:'Biomechanics of Human Movement (BCcampus Pressbooks)', url:'https://pressbooks.bccampus.ca/humanbiomechanics/', type:'Book', free:true, difficulty:'Undergrad / Advanced', desc:'A free open textbook built specifically for a first kinesiology biomechanics course — exactly the topic the PT/OT pathway lessons teach with no dedicated resource until now.' },
  { cat:'Life Sciences', title:'RCSB PDB-101', url:'https://pdb101.rcsb.org/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The training and education portal of the Protein Data Bank — molecule-of-the-month articles and real 3D protein structures for biomedical-research-minded students.' },
  { cat:'Life Sciences', title:'LabXchange', url:'https://www.labxchange.org/', type:'App', free:true, difficulty:'AP / Intermediate', desc:'A free Harvard/Amgen Foundation platform of virtual lab simulations letting you practice real lab techniques — undo and retry, without needing a physical lab.' },
  { cat:'Life Sciences', title:'Armando Hasudungan (YouTube)', url:'https://www.youtube.com/user/armandohasudungan', type:'Course', free:true, difficulty:'AP / Intermediate', desc:'Hand-drawn physiology, pathology, and pharmacology videos from a physician-in-training, watched by millions of health-science students.' },
  { cat:'Life Sciences', title:'Ninja Nerd (YouTube)', url:'https://www.youtube.com/@NinjaNerdOfficial', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'Long-form, whiteboard-taught deep dives into pathophysiology and pharmacology — a genuine step beyond AP Bio for students who want the mechanistic detail.' },
  { cat:'Life Sciences', title:'Journey to the Microcosmos (YouTube)', url:'https://www.youtube.com/@journeytomicro', type:'Course', free:true, difficulty:'Introductory', desc:'Gorgeous real microscopy footage of microorganisms, narrated with genuine microbiology content, from the makers of SciShow and Crash Course.' },
  { cat:'Life Sciences', title:'Smithsonian National Museum of Natural History — Education', url:'https://naturalhistory.si.edu/education', type:'Article', free:true, difficulty:'Introductory', desc:'Free K-12 teaching resources, videos, and activities across earth science, paleontology, and biology from the Smithsonian.' },

  // ──────────────────────────── PHYSICAL SCIENCES ──────────────────────────
  { cat:'Physical Sciences', title:'Khan Academy — MCAT Physical Processes', url:'https://www.khanacademy.org/test-prep/mcat/physical-processes', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'Khan Academy\'s MCAT unit on the physics of the body — levers, torque, and forces in joints — the closest thing to a biomechanics course already on the platform.' },
  { cat:'Physical Sciences', title:'Crash Course Astronomy — Full Series', url:'https://www.youtube.com/playlist?list=PL2QuSfnT0hGGRIPrgFPjj1LI5i_NALtTU', type:'Course', free:true, difficulty:'Introductory', desc:'46 episodes covering the solar system, stars, galaxies, and the universe, hosted by astronomer Phil Plait.' },
  { cat:'Physical Sciences', title:'American Institute of Physics (AIP)', url:'https://www.aip.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A federation of physical-science societies with dedicated student programs, career resources, and the Society of Physics Students.' },
  { cat:'Physical Sciences', title:'Society of Physics Students (SPS)', url:'https://students.aip.org/sps', type:'Community', free:true, difficulty:'Undergrad / Advanced', desc:'A national physics honor and professional society for undergraduates, with 700+ campus chapters, research internships, and an undergraduate research journal.' },
  { cat:'Physical Sciences', title:'It\'s Elemental — Jefferson Lab', url:'https://education.jlab.org/itselemental/', type:'Article', free:true, difficulty:'Introductory', desc:'An interactive periodic table with a page and history for every element, from a U.S. Department of Energy national laboratory.' },
  { cat:'Physical Sciences', title:'HubbleSite', url:'https://hubble.stsci.edu/', type:'Article', free:true, difficulty:'Introductory', desc:'The Space Telescope Science Institute\'s public site for exploring Hubble Space Telescope images and discoveries.' },
  { cat:'Physical Sciences', title:'SLAC National Accelerator Laboratory — Student Resources', url:'https://www6.slac.stanford.edu/about/resources/for-students-and-educators', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'Internship and outreach programs from a DOE national laboratory operated by Stanford, spanning physics, computer science, and materials science.' },
  { cat:'Physical Sciences', title:'Argonne National Laboratory — Education', url:'https://www.anl.gov/education', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'STEM outreach, summer camps, and high-school research programs from a U.S. Department of Energy national laboratory.' },

  // ─────────────────────────────── RESEARCH METHODS ────────────────────────
  { cat:'Research Methods', title:'Addgene', url:'https://www.addgene.org/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'A nonprofit plasmid repository whose free blog and protocols pages teach real molecular-biology lab methods, from cloning to CRISPR.' },
  { cat:'Research Methods', title:'iGEM — International Genetically Engineered Machine competition', url:'https://igem.org/', type:'Community', free:true, difficulty:'Undergrad / Advanced', desc:'A worldwide synthetic-biology competition with divisions for high school and undergraduate teams designing real genetically engineered systems.' },
  { cat:'Research Methods', title:'Foldit', url:'https://fold.it/', type:'App', free:true, difficulty:'AP / Intermediate', desc:'A citizen-science puzzle game where players fold real protein structures — Foldit players have contributed to genuine published research discoveries.' },
  { cat:'Research Methods', title:'BLAST — NCBI Basic Local Alignment Search Tool', url:'https://blast.ncbi.nlm.nih.gov/Blast.cgi', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'The NIH\'s free tool for comparing DNA and protein sequences — the actual software real genetics and biomedical research runs on.' },
  { cat:'Research Methods', title:'F1000Research', url:'https://f1000research.com/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'An open-access publishing platform where peer review happens after publication, in the open — a real look at a genuinely transparent alternative to traditional journal review.' },
  { cat:'Research Methods', title:'CDC — Introduction to Epidemiology (Public Health 101)', url:'https://www.cdc.gov/training-publichealth101/php/training/introduction-to-epidemiology.html', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The CDC\'s own short course on epidemiology fundamentals — the specific research-methods topic the Public Health pathway lessons teach.' },
  { cat:'Research Methods', title:'The Carpentries', url:'https://carpentries.org/', type:'Course', free:true, difficulty:'Undergrad / Advanced', desc:'A nonprofit teaching foundational coding and data skills (Python, R, the Unix shell, version control) to researchers through free, openly licensed lessons.' },
  { cat:'Research Methods', title:'eLife', url:'https://elifesciences.org/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'A major open-access journal for life-science and biomedical research, free to read in full and funded by HHMI, the Max Planck Society, and Wellcome.' },
  { cat:'Research Methods', title:'Nature Careers', url:'https://www.nature.com/naturecareers/', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'Free career advice, articles, and a podcast for scientists navigating research careers, from the publisher of Nature.' },
  { cat:'Research Methods', title:'National Academies Press', url:'https://nap.edu/', type:'Book', free:true, difficulty:'Undergrad / Advanced', desc:'Free, downloadable consensus-study reports from the National Academies of Sciences, Engineering, and Medicine — the evidence base behind major U.S. health and science policy decisions.' },

  // ───────────────────── BEHAVIORAL & SOCIAL SCIENCES ──────────────────────
  { cat:'Behavioral & Social Sciences', title:'CDC — Social Determinants of Health', url:'https://www.cdc.gov/about/priorities/social-determinants-of-health-at-cdc.html', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The CDC\'s own framework for the nonmedical, social factors — where people are born, live, work, and age — that shape health outcomes.' },
  { cat:'Behavioral & Social Sciences', title:'Society for Health Psychology (APA Division 38)', url:'https://www.apa.org/about/division/div38', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The APA division devoted to the psychology of health, illness, and health care — the research field bridging psychology and medicine.' },
  { cat:'Behavioral & Social Sciences', title:'American Political Science Association (APSA)', url:'https://apsanet.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional home for political scientists, with student resources and public-scholarship programs — a natural extension of the AP U.S. Government content already in this library.' },
  { cat:'Behavioral & Social Sciences', title:'Brain & Behavior Research Foundation', url:'https://bbrfoundation.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A nonprofit funding mental-illness research (depression, anxiety, schizophrenia, and more), with 100% of donations going directly to research grants.' },
  { cat:'Behavioral & Social Sciences', title:'American Anthropological Association', url:'https://americananthro.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'The professional home for anthropologists, with a dedicated student organization (NASA) and mentoring for undergraduates exploring the field.' },
  { cat:'Behavioral & Social Sciences', title:'Hidden Brain', url:'https://hiddenbrain.org/', type:'Podcast', free:true, difficulty:'Introductory', desc:'A popular podcast connecting psychology and neuroscience research to economics, anthropology, and sociology — the unconscious patterns behind everyday behavior.' },

  // ──────────────────────────── WELLNESS & BALANCE ─────────────────────────
  { cat:'Wellness & Balance', title:'Dr. Lorna Breen Heroes\' Foundation', url:'https://drlornabreen.org/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A nonprofit working to remove barriers to mental-health care for healthcare workers and reduce the stigma around seeking it — a real look at burnout in the field a pre-health student is entering.' },
  { cat:'Wellness & Balance', title:'Physician Support Line', url:'https://www.physiciansupportline.com/', type:'Article', free:true, difficulty:'Introductory', desc:'A free, confidential peer-support hotline staffed by volunteer psychiatrists, open to U.S. medical students through practicing physicians.' },
  { cat:'Wellness & Balance', title:'National Academy of Medicine — Clinician Well-Being Collaborative', url:'https://nam.edu/our-work/programs/clinician-resilience-and-well-being/', type:'Article', free:true, difficulty:'AP / Intermediate', desc:'A national initiative addressing clinician burnout and mental health, publishing free reports on evidence-based well-being solutions across health professions.' },
  { cat:'Wellness & Balance', title:'APA — How to Overcome Impostor Phenomenon', url:'https://www.apa.org/monitor/2021/06/cover-impostor-phenomenon', type:'Article', free:true, difficulty:'Introductory', desc:'A practical, research-backed guide to impostor feelings — extremely common among high-achieving premed and pre-health students.' },
  { cat:'Wellness & Balance', title:'The Steve Fund', url:'https://stevefund.org/', type:'Article', free:true, difficulty:'Introductory', desc:'The leading nonprofit focused on the mental health and emotional well-being of young people of color, from adolescence through the college years.' },
  { cat:'Wellness & Balance', title:'Bring Change to Mind', url:'https://www.bringchange2mind.org/', type:'Article', free:true, difficulty:'Introductory', desc:'A nonprofit (co-founded by actor Glenn Close) running peer-led, student-club mental-health-stigma programs in over 275 high schools.' },
  { cat:'Wellness & Balance', title:'Made of Millions', url:'https://www.madeofmillions.com/', type:'Article', free:true, difficulty:'Introductory', desc:'A mental-health advocacy nonprofit using design and social media to expand mental-health literacy and reduce stigma for young people.' },
  { cat:'Wellness & Balance', title:'Mental Health First Aid', url:'https://www.mentalhealthfirstaid.org/', type:'Course', free:false, difficulty:'Introductory', desc:'An evidence-based certification course teaching how to recognize and respond to a mental-health or substance-use crisis — a concrete credential alongside CPR/First Aid.' },

  // ───────────────────────────────── MATH & DATA ───────────────────────────
  { cat:'Math & Data', title:'JASP', url:'https://jasp-stats.org/', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'A free, open-source statistics program built to feel familiar to SPSS users — runs both classical and Bayesian analyses without writing code.' },
  { cat:'Math & Data', title:'WHO Global Health Observatory', url:'https://www.who.int/data/gho', type:'Article', free:true, difficulty:'Undergrad / Advanced', desc:'The World Health Organization\'s open data repository — 1,000+ indicators on mortality, disease burden, and health systems for all 194 member states.' },
  { cat:'Math & Data', title:'IPUMS', url:'https://www.ipums.org/', type:'App', free:true, difficulty:'Undergrad / Advanced', desc:'The world\'s largest database of census and survey microdata, free to any student or researcher — real population data for a health-statistics or demography project.' },
];
