// ─────────────────────────────────────────────────────────────────────────────
// The reality check — the part nobody tells a fifteen-year-old.
//
// WHY THIS EXISTS
// A teenager interested in medicine gets the recruiting brochure constantly:
// from schools, from TV, from relatives, from us. What they essentially never
// get is the attrition data — how long the training really is, what it costs,
// what the day is actually like, and the most common reason people who chose
// this path leave it. Those are the facts that decide whether someone is still
// in this at twenty-eight, and they are systematically the ones missing from
// every version of this conversation a high schooler has.
//
// So every pathway carries one card with:
//   yearsAfterHS   total years of training after high school, honestly totaled
//   typicalCost    a realistic total range for that training
//   exams          the licensing/admissions exams that actually gate the path
//   competitiveness what getting in really looks like
//   dayLength      hours and call expectations, in ordinary language
//   leaveReason    the most common reason people leave this specific field
//
// ── ON TONE ──────────────────────────────────────────────────────────────────
// This is not a warning card and it must never read as one. The point is not to
// talk anyone out of medicine — it is that a student who chooses this WITH the
// numbers in front of them has made a real decision, and a real decision is the
// thing that survives a hard second year. Discouragement and information are
// different products; this is the second one.
//
// Figures are U.S., approximate, and stated as ranges because they genuinely
// vary by school, state, and year. `asOf` is carried so the numbers can be
// re-checked rather than quietly aging into fiction.
// ─────────────────────────────────────────────────────────────────────────────

export const REALITY_AS_OF = '2025';

export const PATHWAY_REALITY = {
  physician: {
    label: 'Physician (MD/DO)',
    yearsAfterHS: '11–15 years',
    yearsDetail: '4 undergrad + 4 medical school + 3–7 residency, plus 1–3 more for a fellowship',
    typicalCost: '$250k–$450k total, most of it medical school',
    costDetail: 'Median medical school debt at graduation runs around $200k–$220k for those who borrow; residency pay (roughly $60k–$75k) starts while that interest accrues.',
    exams: ['MCAT (to apply)', 'USMLE Step 1 & Step 2 (or COMLEX for DO)', 'Step 3 during residency', 'Specialty board certification'],
    competitiveness: 'Roughly 40% of medical school applicants are admitted somewhere in a given cycle. Competitive residencies (dermatology, orthopedics, neurosurgery) are a second, harder round of selection years later.',
    dayLength: '10–12 hour days are normal. Residency is capped at 80 hours a week averaged over four weeks — that cap is a limit, not a target. Overnight call is standard in most specialties during training and common after it.',
    leaveReason: 'Burnout, most often. The attrition that matters is not people failing out of medical school — that is rare — it is physicians reducing hours or leaving clinical practice mid-career, driven by administrative load, documentation, and loss of control over their own schedule.',
    upside: 'The widest scope of practice in medicine, the deepest expertise, and the final say on what happens to a patient.',
  },
  physicianAssistant: {
    label: 'Physician Assistant (PA)',
    yearsAfterHS: '6–8 years',
    yearsDetail: '4 undergrad (plus 1–2 years accumulating patient-care hours) + 2–3 PA school',
    typicalCost: '$100k–$200k total',
    costDetail: 'PA program tuition typically runs $70k–$120k. Substantially less debt than the MD path, and you start earning roughly six years sooner.',
    exams: ['GRE or PA-CAT at some programs', 'PANCE (the licensing exam)', 'PANRE recertification every 10 years'],
    competitiveness: 'Acceptance rates at many PA programs sit around 20–30% — genuinely competitive, and the 1,000+ hours of direct patient care most programs require is a real barrier people underestimate.',
    dayLength: 'Usually more predictable than a physician\'s. Many PAs work 4x10s or standard clinic hours; call expectations vary a lot by specialty and are lighter in most outpatient settings.',
    leaveReason: 'Scope frustration. PAs practice collaboratively with a physician, and some people who love the clinical work find, years in, that not having final authority on their own patients wears on them. Others move between specialties instead of leaving — the flexibility to do that is one of the role\'s real advantages.',
    upside: 'Diagnosing and treating patients six years sooner and with a fraction of the debt, plus the ability to change specialty without retraining.',
  },
  nursing: {
    label: 'Registered Nurse (RN/BSN)',
    yearsAfterHS: '2–4 years to licensure',
    yearsDetail: 'ADN is ~2 years, BSN ~4; both lead to the NCLEX and RN licensure. Nurse practitioner adds 2–4 more.',
    typicalCost: '$20k–$120k depending heavily on ADN vs. BSN and public vs. private',
    costDetail: 'The lowest cost-to-practice of any pathway here, and many hospitals pay for a BSN or NP later.',
    exams: ['NCLEX-RN (licensure)', 'Specialty certifications (CCRN, CEN, etc.) are optional and employer-valued'],
    competitiveness: 'Nursing programs themselves are often more competitive than people expect — strong BSN programs turn away many qualified applicants because of clinical placement limits, not because of a shortage of interest.',
    dayLength: 'Typically three 12-hour shifts a week, which is genuinely 12+ hours on your feet, often including nights, weekends, and holidays. Three days on means four off, which some people find is the best schedule in healthcare and others find brutal.',
    leaveReason: 'Staffing ratios and physical exhaustion. The most-cited reason nurses leave bedside nursing is patient load — too many patients for the time available — rather than the work itself. Many move to outpatient, education, informatics, or NP roles rather than leaving healthcare.',
    upside: 'The fastest route to real hands-on patient care, the lowest debt, and the most time with patients of any role on this list.',
  },
  pharmacy: {
    label: 'Pharmacist (PharmD)',
    yearsAfterHS: '6–8 years',
    yearsDetail: '0–6 direct-entry programs exist; otherwise 2–4 pre-pharmacy years + 4 PharmD. Residency (1–2 years) is now expected for clinical/hospital roles.',
    typicalCost: '$150k–$250k',
    costDetail: 'PharmD debt frequently lands near $170k, against a salary that has been roughly flat for a decade — the debt-to-income ratio is worth looking at honestly.',
    exams: ['PCAT (many programs have dropped it — check each one)', 'NAPLEX (licensure)', 'MPJE (law exam, per state)'],
    competitiveness: 'Admission is currently among the least competitive of the health professions — many programs admit most qualified applicants. The competition has moved downstream, to residencies and clinical positions.',
    dayLength: 'Retail pharmacy is typically 8–12 hour shifts with limited breaks and heavy metrics pressure. Hospital and clinical roles have more variable hours and a very different day.',
    leaveReason: 'Retail working conditions. Understaffing, quotas, and the volume of prescriptions per shift are the most commonly cited reasons, and the gap between retail and clinical pharmacy is the single biggest thing prospective students misjudge about this field.',
    upside: 'Deep expertise in exactly how drugs work, a genuine clinical role in hospital settings, and a shorter path than medicine.',
  },
  dentistry: {
    label: 'Dentist (DDS/DMD)',
    yearsAfterHS: '8 years',
    yearsDetail: '4 undergrad + 4 dental school; specialties (orthodontics, oral surgery) add 2–6 more.',
    typicalCost: '$300k–$500k+',
    costDetail: 'Dental school is among the most expensive professional programs in the U.S. — average debt at graduation exceeds $290k, and private-school graduates often clear $400k. Practice ownership adds more debt before it adds income.',
    exams: ['DAT (to apply)', 'INBDE (the integrated national board exam)', 'A state or regional clinical licensure exam'],
    competitiveness: 'Around 55% of applicants matriculate somewhere. Manual dexterity is genuinely screened for, and a strong GPA with a weak DAT is a common failure pattern.',
    dayLength: 'Among the most predictable schedules in healthcare — 4–5 day weeks, few nights, essentially no call in general practice. The physical toll is real: neck, back and hand problems are common and career-shortening.',
    leaveReason: 'Physical strain and the business burden. Musculoskeletal injury from years of precise work in awkward postures is the most common health reason; running a practice — payroll, insurance, marketing — is the most common non-clinical one.',
    upside: 'The best schedule-to-income ratio in clinical medicine, and the highest rate of owning your own practice.',
  },
  physicalOccupTherapy: {
    label: 'Physical / Occupational Therapist (DPT/OTD)',
    yearsAfterHS: '7 years',
    yearsDetail: '4 undergrad + 3 doctoral (DPT or OTD). Residency is optional and mostly for specialization.',
    typicalCost: '$120k–$200k',
    costDetail: 'DPT debt commonly lands around $140k against a starting salary near $75k–$95k — a ratio worth going in with your eyes open about, since it is the field\'s most-discussed problem.',
    exams: ['NPTE (physical therapy) or NBCOT (occupational therapy)', 'State licensure'],
    competitiveness: 'Moderately competitive. The 100+ observation hours across multiple settings that most programs expect is the requirement applicants most often start too late.',
    dayLength: 'Typically standard weekday hours, rarely any call. Outpatient clinics may run early or late to fit patients around work and school.',
    leaveReason: 'The debt-to-salary ratio, and productivity quotas in some outpatient settings that compress the time you get with each patient — which is the exact thing that draws most people to the field in the first place.',
    upside: 'You watch people get measurably better over weeks and months, which almost no other clinical role gives you.',
  },
  publicHealth: {
    label: 'Public Health (MPH and related)',
    yearsAfterHS: '6 years',
    yearsDetail: '4 undergrad + 2 MPH. Doctoral (DrPH/PhD) adds 4–6 for research or senior academic roles.',
    typicalCost: '$40k–$120k for the MPH',
    costDetail: 'Lower than the clinical doctorates, but salaries are also lower — especially in government and non-profit roles, which is where much of the meaningful work is.',
    exams: ['None required for most roles', 'CPH certification is optional'],
    competitiveness: 'MPH admission is generally accessible. The competition is for jobs, not seats — funded positions are limited and often grant-dependent.',
    dayLength: 'Mostly standard office hours, with genuine exceptions: an outbreak or an emergency response can mean weeks of very long days with no notice.',
    leaveReason: 'Funding instability and slow visible impact. Positions tied to grant cycles disappear when the grant does, and prevention work succeeds by producing an absence of events — which is deeply meaningful and almost impossible to see day to day.',
    upside: 'Your work can affect more people than any clinician will meet in a career.',
  },
  biomedResearch: {
    label: 'Biomedical Researcher (PhD)',
    yearsAfterHS: '9–13 years',
    yearsDetail: '4 undergrad + 5–7 PhD + 3–6 postdoc, which is now effectively expected for an academic position.',
    typicalCost: 'Often near zero for the PhD itself',
    costDetail: 'Most U.S. biomedical PhDs are funded — tuition waived plus a stipend of roughly $30k–$40k. The cost is not tuition; it is a decade of very low earnings during the years peers are building savings.',
    exams: ['None. Qualifying exams within the program instead.'],
    competitiveness: 'Program admission is competitive but achievable. The genuine bottleneck is far later: tenure-track faculty positions are vastly outnumbered by qualified postdocs, and most PhDs end up in industry, which is a good outcome nobody prepares them for.',
    dayLength: 'Nominally flexible, practically long. Experiments do not respect evenings, and the culture in many labs treats 50–60 hour weeks as ordinary.',
    leaveReason: 'The postdoc bottleneck. People leave academia — not science — because the years of low pay before a permanent position are long and the odds of that position are poor. Industry research is where most go, and it pays substantially better.',
    upside: 'You get to find out something that was not known before. Nothing else on this list offers that.',
  },
  healthAdmin: {
    label: 'Health Administration (MHA/MBA)',
    yearsAfterHS: '6 years',
    yearsDetail: '4 undergrad + 2 MHA or MBA, often with a 1-year administrative fellowship after.',
    typicalCost: '$60k–$150k for the graduate degree',
    costDetail: 'Wide range: public programs sit near the bottom, top private MBA programs near the top. Employer sponsorship is common for people already working in a system.',
    exams: ['None required.'],
    competitiveness: 'Program admission is moderate. Administrative fellowships — the standard on-ramp to senior roles — are extremely competitive, often single-digit acceptance rates.',
    dayLength: 'Standard business hours with real exceptions: budget cycles, crises, and system-wide incidents do not keep office hours.',
    leaveReason: 'Being the person who has to say no. Administrators make resource decisions that clinical staff experience as constraints, and taking that friction personally is the most common reason people move to consulting or out of provider organizations.',
    upside: 'You change the conditions every clinician in the building works under, which is leverage no individual clinical role has.',
  },
  exploring: {
    label: 'Exploring Pre-Health',
    yearsAfterHS: 'Depends entirely on where you land',
    yearsDetail: 'Nursing can have you licensed in two years; a research PhD plus postdoc runs past a decade. The whole point of this track is to find out which of those you actually want before committing to one.',
    typicalCost: 'From about $20k (ADN nursing) to $450k+ (medical school)',
    costDetail: 'The cost gap between health careers is larger than almost anyone expects going in — that difference alone is worth a year of exploring before choosing.',
    exams: ['Different for every pathway — see each one\'s card.'],
    competitiveness: 'Varies enormously. Medical school and administrative fellowships are among the most competitive; pharmacy and public health admission are currently among the least.',
    dayLength: 'From a predictable 8-to-5 (dentistry, pharmacy, admin) to overnight call and 12-hour shifts (medicine, nursing).',
    leaveReason: 'The most common reason people leave a health career is that they picked it without knowing what the day was actually like. Which is exactly what this track exists to prevent.',
    upside: 'You get to make this decision with information instead of with a guess.',
  },
};

/** The card for a pathway, or null. */
export function realityFor(pathwayKey) {
  return PATHWAY_REALITY[pathwayKey] || null;
}
