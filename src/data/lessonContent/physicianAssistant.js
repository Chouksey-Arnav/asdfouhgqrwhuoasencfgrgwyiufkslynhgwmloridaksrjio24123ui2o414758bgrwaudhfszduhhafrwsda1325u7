// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — Physician Assistant pathway. Original articles + a
// curated, properly-embedded YouTube video per lesson. Keyed by lesson id (see
// PATHS.physicianAssistant in constants.js). Rendered by the LessonPlayer
// (App.jsx) as Overview -> Article -> Video -> Quiz -> Complete.
//
// Video verification: this environment's network policy blocks direct access
// to youtube.com (confirmed via a blocked oEmbed/WebFetch request — see the
// Learning Pathway completion plan, Phase 3 step 1). Every video below is
// PROPOSED-REUSE or VERIFIED-EXISTING per that plan's Phase 2 matrix — reused
// from a video id already shipped and playing correctly on another lesson in
// this app (Physician's phy1l1/phy1l2/phy2l2, or Exploring's ex2l1), so no new
// video-id verification was needed for this batch (per the plan's stated
// exception for repeated PROPOSED-REUSE ids).
// ─────────────────────────────────────────────────────────────────────────────

export const PHYSICIAN_ASSISTANT_CONTENT = {
  pa1l1: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Why a PA needs the same cell biology depth as a physician`, body: `PA programs draw on the exact same science prerequisite base as medical school, and cell biology and genetics are a big part of why. A PA takes histories, orders and interprets labs, and helps manage treatment plans alongside a supervising physician — all of which regularly requires reasoning at the cellular and genetic level, not just the symptom level. This lesson covers the same organelle, division, and inheritance content a pre-med student builds, because a PA genuinely needs it too.` },
        { heading: `The organelles that keep a cell running`, body: `Every cell is a small, coordinated system: the nucleus houses DNA and directs gene expression, mitochondria convert nutrients into usable ATP energy, ribosomes build proteins from genetic instructions, and the Golgi apparatus packages and ships those proteins where they're needed. A cell losing mitochondrial function — from a genetic disorder or from ischemia, when blood flow is cut off — stops working rapidly, which is exactly the kind of mechanism a PA has to be able to explain to a patient in plain language during a visit.` },
        { heading: `Mitosis vs. meiosis, and why the distinction is clinically relevant`, body: `Mitosis is how the body grows and repairs itself, producing two genetically identical cells — this is what's happening whenever a wound heals. Meiosis is reserved for producing sperm and egg cells, cutting the chromosome number in half while shuffling genetic material. The distinction has direct clinical relevance: errors during meiosis (a chromosome failing to separate) cause conditions like Down syndrome, while errors in mitosis are more closely tied to cancer, where a cell's normal division control breaks down.` },
        { heading: `Mendelian inheritance and Punnett squares`, body: `Organisms carry two copies (alleles) of most genes, one from each parent, and when those alleles differ, one is often dominant while the other is recessive and only shows up if both copies are recessive. A Punnett square predicts the probability of specific allele combinations in offspring. This dominant/recessive framework is the starting point for understanding conditions like cystic fibrosis and sickle cell disease — exactly the kind of family-history reasoning a PA does routinely during an intake.` },
        { heading: `Why this depth matters for a PA specifically`, body: `A PA's diagnostic reasoning, done in close coordination with a supervising physician, constantly drops to this level of detail — a family history question is an informal pedigree analysis, and a persistent, unexplained symptom might trace back to a cellular-level cause. Building real fluency with this material now means it's reinforcement, not a first encounter, once PA program coursework moves through it at a much faster pace.` },
      ],
      keyTakeaways: [
        `The nucleus, mitochondria, ribosomes, and Golgi apparatus each play a distinct, interdependent role in keeping a cell alive and functional.`,
        `Mitosis produces identical cells for growth and repair; meiosis produces genetically distinct gametes for reproduction — errors in each have very different clinical consequences.`,
        `Punnett squares predict inherited-trait probability from dominant and recessive alleles, the same logic underlying single-gene disorders like cystic fibrosis.`,
        `PA programs draw on the same cellular/genetic science base as medical school, since this reasoning shows up constantly in collaborative clinical practice.`,
      ],
    },
    video: { ytId: 'CBezq1fFUEA', title: 'Heredity: Crash Course Biology #9', channel: 'Crash Course' },
  },
  pa1l2: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Why a PA reasons across systems, not within just one`, body: `A patient reporting "shortness of breath" could have a lung problem, a heart problem, an anemia problem, or an anxiety problem — telling them apart requires fluency across multiple organ systems, and a PA is expected to bring that same cross-system reasoning to a case before discussing it with a supervising physician. This lesson tours the major systems a PA reasons about daily: circulatory, respiratory, digestive, excretory, nervous, and endocrine.` },
        { heading: `Circulatory and respiratory: delivery and gas exchange`, body: `The circulatory system moves blood through a closed loop of arteries, capillaries, and veins, delivering oxygen and nutrients and carrying away waste. The respiratory system handles gas exchange, with oxygen diffusing into blood across the lungs' alveoli and carbon dioxide diffusing out to be exhaled. These two systems are so tightly linked that evaluating one without the other rarely gives a complete picture — a low blood-oxygen reading could point to either system, or both.` },
        { heading: `Digestive and excretory: extraction and cleanup`, body: `The digestive system breaks food into absorbable nutrients through enzymes secreted along the GI tract, absorbed mainly in the small intestine. The excretory system, centered on the kidneys, filters metabolic waste out of the blood and fine-tunes fluid and electrolyte balance. Reading a basic metabolic panel — a routine part of a PA's clinical toolkit — is essentially reading a snapshot of how well this filtering system is holding the body's internal chemistry in range.` },
        { heading: `Nervous and endocrine: two speeds of signaling`, body: `The nervous system sends fast, precise electrical signals for immediate control; the endocrine system sends slower, broader chemical signals (hormones) for processes that unfold over minutes to days. Conditions a PA manages constantly — diabetes, thyroid disorders, hypertension — are fundamentally regulation problems in one or both of these signaling systems, which is why understanding both, and where they overlap, is foundational.` },
        { heading: `Integration: the actual skill collaborative care depends on`, body: `A PA assessing a patient with fatigue is weighing whether it's circulatory, respiratory, endocrine, or something else entirely — and bringing a well-reasoned differential to a supervising physician is exactly what makes the PA-physician relationship function efficiently as a team. Building this integrated fluency now, rather than memorizing each system as an isolated unit, is precisely the skill that collaborative clinical reasoning will demand.` },
      ],
      keyTakeaways: [
        `The circulatory and respiratory systems work as a tightly linked delivery-and-gas-exchange pair, rarely evaluated in true isolation from one another.`,
        `The digestive system extracts nutrients from food; the excretory system (centered on the kidneys) filters waste and balances fluids and electrolytes.`,
        `The nervous system signals fast via neurons; the endocrine system signals slower via hormones — many common conditions are regulation failures in one or both.`,
        `Bringing a well-reasoned, cross-system differential to a supervising physician is a core PA skill, and it starts with genuine physiology fluency.`,
      ],
    },
    video: { ytId: '9fxm85Fy4sQ', title: 'Circulatory & Respiratory Systems: Crash Course Biology #27', channel: 'Crash Course' },
  },
  pa1l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Two layers of defense: innate and adaptive immunity`, body: `The immune system operates in two coordinated layers. Innate immunity is fast and non-specific — physical barriers plus general-purpose defenders like macrophages and neutrophils, responding within minutes to hours regardless of what the invader is. Adaptive immunity is slower but far more precise: it learns to recognize a specific pathogen's antigens and mounts a tailored response, typically taking days to fully ramp up on first exposure. Every infection a PA helps manage involves this layered response.` },
        { heading: `Antibodies, antigens, and immune memory`, body: `An antigen is any molecule the immune system recognizes as foreign. B cells respond to a specific antigen by producing antibodies — Y-shaped proteins that neutralize it or flag it for destruction. Some B cells become long-lived memory cells after an infection clears, ready to mount a much faster response if the same pathogen returns — the entire mechanism behind both natural immunity and vaccine-induced immunity, which a PA explains to patients constantly.` },
        { heading: `Fever and inflammation: protective, not malfunctioning`, body: `Inflammation — redness, heat, swelling, pain — results from increased blood flow and immune cell recruitment to a site of injury or infection, and it's what actually delivers immune resources where they're needed. Fever raises core temperature, slowing pathogen replication and enhancing certain immune functions. Neither is a malfunction to eliminate on sight; a PA's job is to figure out what's driving it and whether the underlying cause needs treatment.` },
        { heading: `Homeostasis: the thread connecting immunity to everything else`, body: `Homeostasis is the body's constant effort to keep its internal environment stable, mostly through negative feedback loops that sense a deviation and trigger a correction. The immune system is a homeostatic system in a broader sense — constantly monitoring for foreign material and internal threats and responding to restore a stable state. Seeing immunity this way, rather than as a totally separate topic, makes both concepts easier to apply together.` },
        { heading: `Why this shows up in nearly every specialty a PA might work in`, body: `Immune reasoning isn't limited to infectious disease — allergies and autoimmune conditions are both, in different ways, immune systems responding inappropriately. Understanding the innate/adaptive distinction and why inflammation and fever are protective gives a PA the vocabulary needed across specialties, whether working in primary care, emergency medicine, or a surgical practice.` },
      ],
      keyTakeaways: [
        `Innate immunity responds fast and non-specifically; adaptive immunity is slower but targets a pathogen's specific antigens.`,
        `Antibodies are produced by B cells to neutralize specific antigens, and memory cells enable a much faster response on re-exposure or after vaccination.`,
        `Fever and inflammation are deliberate, protective immune responses that a PA has to interpret, not automatically suppress.`,
        `Immunity is a specific application of homeostasis, and understanding it underlies both infectious disease and autoimmune/allergic conditions across specialties.`,
      ],
    },
    video: { ytId: 'GIJK3dwCWCw', title: 'Immune System, Part 1: Crash Course Anatomy & Physiology #45', channel: 'Crash Course' },
  },
  pa2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why chemistry is a shared foundation for the PA role`, body: `A PA's daily work — reviewing lab values, understanding how a prescribed medication interacts with a patient's existing conditions, explaining a treatment mechanism — rests directly on chemistry fundamentals. This lesson covers the same general-chemistry base pre-med students build, since PA programs assume the identical starting point.` },
        { heading: `Atoms and the periodic table`, body: `An element's identity comes from its number of protons, and the periodic table's layout reflects predictable trends: atomic size generally shrinks moving left to right across a period and grows moving down a group. These trends let you predict a lot about how an element behaves chemically just from its position on the table — the same reasoning that eventually extends to predicting how a drug molecule will behave.` },
        { heading: `How atoms bond`, body: `Ionic bonding transfers electrons between atoms, creating oppositely charged ions that attract each other. Covalent bonding shares electrons instead — the basis for most molecules in the body, including water. Water's polar covalent structure is exactly why it's such an effective solvent for the reactions happening inside cells constantly, and why so many medications are formulated as aqueous solutions.` },
        { heading: `Reactions and equilibrium`, body: `A chemical reaction transforms reactants into products by breaking and forming bonds, and a balanced equation confirms atoms aren't created or destroyed in the process. Many biologically important reactions are reversible and reach equilibrium, where forward and reverse reactions occur at the same rate — the blood's pH buffering system is a direct, high-stakes example of chemical equilibrium in action.` },
        { heading: `The throughline to collaborative clinical practice`, body: `A PA reasoning about how a medication will be absorbed or interact with another drug is implicitly applying bonding and equilibrium concepts, even without naming them explicitly. Getting genuinely comfortable with this foundation now means pharmacology, when it arrives in PA program coursework, reinforces a familiar framework instead of introducing an entirely new one.` },
      ],
      keyTakeaways: [
        `An element's identity comes from its number of protons; the periodic table's layout reflects predictable trends in atomic properties.`,
        `Ionic bonds form through electron transfer; covalent bonds form through electron sharing — most molecules in the body, including water, are covalent.`,
        `Balanced equations conserve atoms across a reaction, and many biological reactions exist in a dynamic, adjustable equilibrium.`,
        `Chemistry fundamentals are the direct basis for understanding medication behavior and interactions, a daily part of collaborative PA practice.`,
      ],
    },
    video: { ytId: 'FSyAehMdpyI', title: 'The Nucleus: Crash Course Chemistry #1', channel: 'Crash Course' },
  },
  pa2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why this review matters for PA coursework specifically`, body: `AP Chemistry pushes general chemistry to a level of precision that turns out to be exactly what PA program coursework assumes on day one. This lesson reviews three high-yield areas: the mole and stoichiometry, atomic structure at the quantum level, and bonding types — the same fundamentals that quietly underpin dosage verification and lab-result interpretation later.` },
        { heading: `The mole and stoichiometry`, body: `A mole is a fixed quantity — 6.022 × 10²³ particles — that lets chemists count atoms and molecules indirectly by weighing them. Stoichiometry uses the ratios in a balanced equation to predict exactly how much of one substance reacts with or produces another. This is the same logic behind calculating a medication dose based on a patient's weight, a calculation a PA verifies constantly.` },
        { heading: `Atomic structure at the AP level`, body: `Beyond protons, neutrons, and electrons, AP-level atomic structure involves quantum numbers describing an electron's energy level and orbital shape, plus rules determining how electrons fill those orbitals. Electron configuration directly determines how an atom bonds and reacts — the mechanistic explanation for the periodic trends that predict chemical behavior.` },
        { heading: `Bonding types and their physical signatures`, body: `Ionic bonds tend to produce hard, high-melting-point solids that conduct electricity when dissolved in water. Covalent bonds produce molecules with much more varied properties depending on structure and polarity. Recognizing which bonding type a substance has lets you predict its physical behavior — melting point, solubility, conductivity — without having memorized that specific substance before.` },
        { heading: `Precision now pays off in PA coursework later`, body: `None of this level of detail is unique to medicine, but the habit of precise, rule-based chemical reasoning is exactly what PA program coursework and, eventually, clinical dosing and lab interpretation will demand. Getting genuinely fluent now — not just familiar enough to pass a test — is what keeps that transition feeling like reinforcement rather than starting over.` },
      ],
      keyTakeaways: [
        `The mole (6.022 × 10²³ particles) lets chemists convert between mass and particle count, and stoichiometry uses balanced equations to predict reaction quantities.`,
        `Quantum numbers and electron configuration describe exactly how electrons are arranged around an atom, determining its chemical behavior.`,
        `Ionic, covalent, and metallic bonding each produce distinct, predictable physical properties in the substances they form.`,
        `Precise, rule-based chemical reasoning at this level is exactly what PA program coursework and later clinical dosing verification both assume you already have.`,
      ],
    },
    video: { ytId: 'UL1jmJaUkaQ', title: 'Stoichiometry: Chemistry for Massive Creatures - Crash Course Chemistry #6', channel: 'Crash Course' },
  },
  pa2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why reaction kinetics matters beyond the chemistry classroom`, body: `Reaction kinetics — the study of how fast a chemical reaction happens and what affects that speed — might seem abstract, but it's directly relevant to a question PAs field constantly: how quickly will this medication start working, and how long will its effect last? This lesson covers the fundamentals with that clinical link in mind.` },
        { heading: `What reaction rate actually measures`, body: `Reaction rate describes how quickly reactants are converted into products, usually measured as a change in concentration over time. It's not constant across a reaction — rates typically slow as reactant concentration drops, since fewer reactant molecules are available to collide and react. This concentration-dependence is exactly why a drug's effect often follows a predictable rise-and-decline curve rather than switching on and off instantly.` },
        { heading: `Factors that speed up or slow down a reaction`, body: `Temperature, concentration, surface area, and the presence of a catalyst all affect reaction rate. A catalyst — like an enzyme in the body — speeds up a reaction without being consumed by it, by lowering the energy barrier (activation energy) the reaction needs to get started. Many drugs are designed specifically to interact with an enzyme, either boosting or blocking its catalytic activity, which is a direct application of this exact concept.` },
        { heading: `Rate laws and reaction order`, body: `A rate law is a mathematical expression relating reaction rate to reactant concentrations, and the reaction order describes how sensitively the rate responds to a change in a given reactant's concentration. Determining a rate law from experimental data — running a reaction at different concentrations and measuring how the rate changes — is a foundational lab skill that mirrors exactly how pharmacokinetic studies determine how a drug's concentration changes in the body over time.` },
        { heading: `The clinical throughline`, body: `Pharmacokinetics — how a drug is absorbed, distributed, metabolized, and eliminated — is, at its core, applied reaction kinetics. Understanding why a drug's concentration rises then falls, and what factors could speed up or slow down that process for a specific patient, is exactly the kind of reasoning a PA applies when adjusting a dosing schedule or watching for a drug interaction.` },
      ],
      keyTakeaways: [
        `Reaction rate measures how quickly reactants convert to products, and typically slows as reactant concentration drops.`,
        `Temperature, concentration, surface area, and catalysts (like enzymes) all affect reaction rate — many drugs work by targeting an enzyme's catalytic activity.`,
        `A rate law relates reaction rate to reactant concentration, determined experimentally — the same logic behind pharmacokinetic studies of drug concentration over time.`,
        `Pharmacokinetics is applied reaction kinetics, and understanding it is directly relevant to dosing schedules and drug-interaction reasoning.`,
      ],
    },
    // The pre-existing raw link for this lesson (Ue2m_l91W2w, carried over unattributed from
    // constants.js before this batch) could not be confirmed via WebSearch — it doesn't resolve
    // to any indexed title, so no verification record could be produced for it. Swapped to a
    // confirmed alternative instead of shipping an unverified guess: "Kinetics: Chemistry's
    // Demolition Derby: Crash Course Chemistry #32" (verified 2026-07-14 via WebSearch), an
    // exact topical match for reaction rates/kinetics.
    video: { ytId: '7qOFtL3VEBc', title: "Kinetics: Chemistry's Demolition Derby: Crash Course Chemistry #32", channel: 'Crash Course' },
  },
  pa3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why psychology matters specifically for team-based care`, body: `The defining feature of the PA role isn't just clinical skill — it's practicing that skill inside a collaborative structure, working closely with a supervising physician and a broader care team rather than carrying sole responsibility. That structure only works well with strong communication and interpersonal skill, which is exactly why psychology, applied to both patients and colleagues, is core to this pathway's Unit 3.` },
        { heading: `What psychology actually is`, body: `Psychology is the scientific study of the mind and behavior, using controlled observation, hypothesis testing, and data analysis like any other science. It spans several complementary perspectives: the biological (brain structures, neurotransmitters), the cognitive (memory, perception, decision-making), the behavioral (how reinforcement and environment shape behavior), and the humanistic (personal growth and individual experience). Real understanding of any behavior usually draws on more than one of these at once.` },
        { heading: `Psychology in every patient interaction`, body: `How a diagnosis is explained affects whether it's understood and believed. How bad news is delivered affects how it's processed. Understanding motivation is often the difference between a treatment plan that gets followed and one that doesn't. None of this is reserved for mental-health-specific roles — it's baseline clinical communication, and a PA is often the team member spending the most direct time on it.` },
        { heading: `Communication within a team, not just with a patient`, body: `A PA's day-to-day communication skill isn't only patient-facing — clearly summarizing a case for a supervising physician, asking the right clarifying question, and knowing when to escalate versus handle something independently are all communication skills specific to working well inside a collaborative structure. This is a different, additional skill set from patient communication alone, and one PA programs specifically evaluate.` },
        { heading: `Why this matters starting now`, body: `You don't need patients or a care team to start building this. Every time you explain something complicated clearly, listen without interrupting, or navigate a disagreement respectfully within a group project, you're practicing the exact skill set that makes the PA's collaborative model work well in practice.` },
      ],
      keyTakeaways: [
        `The PA role's defining structure — working closely with a supervising physician and care team — depends heavily on strong interpersonal and communication skill.`,
        `Biological, cognitive, behavioral, and humanistic perspectives each explain a different piece of why people behave as they do.`,
        `Patient communication and motivation are baseline clinical skills, not soft extras, regardless of specialty.`,
        `Team communication (summarizing cases, escalating appropriately) is a distinct skill from patient communication, and one PA programs specifically look for.`,
      ],
    },
    // Reuse-with-reframe: same core psychology content as ex3l1/nur3l1 (same video),
    // opening and closing sections reframed around team-based/collaborative PA practice
    // specifically, per the completion plan's Phase 1 reuse-with-reframe rubric.
    video: { ytId: 'vo4pMVb0R6M', title: 'Intro to Psychology: Crash Course Psychology #1', channel: 'Crash Course' },
  },
  pa3l2: {
    readMins: 5,
    article: {
      sections: [
        { heading: `Shadowing a PA specifically`, body: `Shadowing a physician assistant — or a physician who works closely with PAs — lets you observe something a physician-only shadowing day can't show as clearly: what the collaborative, team-based model actually looks like day to day. Watching how a PA and supervising physician divide cases, consult on a difficult one, and communicate throughout the day is exactly the preview this pathway is built around.` },
        { heading: `Realistic access as a high schooler`, body: `The most realistic route in is the same as for any clinical shadowing — a personal connection through a family clinician, a relative in healthcare, or a family friend, rather than a cold application to a hospital or clinic. PAs often work in outpatient clinics and smaller practices, which can sometimes offer more flexibility for a brief shadowing visit than a large hospital system with stricter minor-visitor policies.` },
        { heading: `What to specifically look for in a PA shadowing day`, body: `Beyond the clinical content itself, pay attention to how the PA and supervising physician actually communicate — how a case gets discussed, what the PA handles independently versus what gets escalated, and how decisions get made collaboratively rather than unilaterally. These details are what actually distinguish the PA role from other clinical positions, and they're not something a job description alone can convey.` },
        { heading: `Confidentiality, same as any clinical setting`, body: `Whatever you observe about a specific patient is confidential — no discussing identifiable details with anyone outside the clinical setting, and never on social media, no exceptions. This is a hard rule everywhere in healthcare, not specific to PA settings, and it's often the basis of an explicit agreement you'll sign before a shadowing day even begins.` },
        { heading: `Turning it into a credible, logged record`, body: `Log the date, setting, specialty, and your own reflections — especially anything you noticed about the collaborative dynamic specifically — in your Portfolio's Clinical Hours section right after each shadowing day. Building this record consistently, with PA-specific observations, is what will eventually make a strong, well-differentiated case in a PA program application.` },
      ],
      keyTakeaways: [
        `Shadowing a PA (or a physician who works closely with one) uniquely shows the collaborative, team-based dynamic this pathway is built around.`,
        `A personal connection is the realistic path in for a high schooler, and smaller outpatient practices often have more flexibility than large hospital systems.`,
        `The most valuable thing to observe is how the PA and supervising physician actually divide and discuss cases, not just the clinical content itself.`,
        `Confidentiality is a hard rule in every clinical setting, and logging PA-specific reflections right after each day builds a genuinely differentiated record.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l2, nur3l2):
    // no single canonical YouTube video exists for PA-specific shadowing logistics.
  },
  pa3l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `What distinguishes PA admissions from medical school admissions`, body: `Unlike medical school, which often accepts shadowing as the primary clinical exposure, most PA programs specifically require substantial direct, hands-on patient care hours before you can even apply — often 1,000 hours or more, earned through roles like EMT, CNA, medical scribe, or similar. This is one of the biggest practical differences between the two paths, and it directly shapes what's actually worth prioritizing in college.` },
        { heading: `CASPA: the centralized application`, body: `CASPA (Centralized Application Service for Physician Assistants) is the shared application portal most PA programs use, similar in concept to the Common App for colleges — you submit one primary application that goes out to multiple programs. Understanding how CASPA works, and what it requires (transcripts, letters, a personal statement, and a detailed log of your patient care hours), is worth knowing well before you're actually assembling an application.` },
        { heading: `The collaborative model, structurally`, body: `PAs diagnose, treat, and prescribe, but do so within a collaborative, team-based model alongside a supervising or collaborating physician — a defining structural difference from the solo-authority MD/DO model. PA programs specifically screen for evidence that an applicant understands and is drawn to this collaborative structure, not just to clinical medicine in the abstract.` },
        { heading: `Why PA can be a faster path to hands-on clinical work`, body: `PA programs are generally about 2 to 3 years post-bachelor's, compared to 4 years of medical school plus 3 or more years of residency for the MD/DO route — a meaningfully faster path into hands-on, prescribing clinical practice. This isn't a "lesser" path; it's a different tradeoff, and being honest about that tradeoff is part of what makes this pathway distinct from the physician track.` },
        { heading: `What to focus on now`, body: `Since direct patient care hours are non-negotiable for PA applications, the highest-leverage move for a high schooler is starting to build toward eligibility for a hands-on role (like a future CNA certification or EMT training) alongside strong science coursework — earlier than a physician-track student might otherwise need to. Genuine, informed interest in the collaborative model specifically, not just clinical medicine broadly, is exactly what a PA program admissions reader is trying to confirm.` },
      ],
      keyTakeaways: [
        `PA programs require substantial direct patient care hours (often 1,000+), not just shadowing — a key practical difference from medical school admissions.`,
        `CASPA is the shared, centralized application portal most PA programs use, similar in concept to the Common App.`,
        `PAs practice within a collaborative, physician-supervised model — a structural difference from the MD/DO route that programs specifically screen for genuine interest in.`,
        `PA training (~2-3 years post-bachelor's) is a meaningfully faster path to hands-on clinical practice than the MD/DO + residency pipeline.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l3, nur3l3):
    // no single canonical YouTube video exists for "what PA programs look for."
  },

  // ───────────────────────────────────────────────────────────────────────────
  // UNIT 4 — ORGAN SYSTEMS FOR CLINICAL PRACTICE
  // The PA track shares the physician track's prerequisite science base, so
  // these lessons cover the same systems — but written toward the work a PA
  // actually does: rapid generalist assessment inside a physician-led team,
  // across whatever specialty the PA happens to be practicing in.
  // ───────────────────────────────────────────────────────────────────────────
  pa4l1: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Two pumps, two circuits`, body: `The heart is functionally two pumps sharing a wall and a beat. The right side receives oxygen-poor blood from the body and sends it a short distance to the lungs through the low-pressure pulmonary circuit. The left side receives oxygenated blood back and drives it to every tissue through the high-pressure systemic circuit, which is why its wall is far thicker. Each beat has two phases: systole, when the ventricles contract and eject, and diastole, when they relax and refill. One-way valves make the whole thing function as a pump, and their failure — leaking backward, or failing to open fully — produces the turbulent flow heard as a murmur. This structure is why left-sided and right-sided heart failure produce completely different presentations, fluid backing up into the lungs in one case and into the legs and abdomen in the other.` },
        { heading: `Blood pressure, and both numbers`, body: `A reading of 118/76 mmHg reports peak arterial pressure during ventricular contraction over the pressure remaining during relaxation. Both matter: the coronary arteries supplying the heart muscle itself fill mainly during diastole, and isolated elevation of either number is clinically meaningful. Current US guidelines classify under 120/80 as normal, 120–129 systolic with diastolic under 80 as elevated, and 130/80 or above as hypertension. Technique errors are systematic rather than random — wrong cuff size, unsupported arm, talking, a full bladder, or rapid deflation each shift a reading enough to change a classification, which is why a PA confirming a new hypertension diagnosis pays attention to how the measurement was taken.` },
        { heading: `Gas exchange and what oximetry actually reads`, body: `Oxygen crosses from alveolar air into blood across an extremely thin barrier, then travels almost entirely bound to hemoglobin. Hemoglobin's affinity for oxygen follows a sigmoid curve: saturation stays near normal as oxygen pressure falls at first, then drops steeply. This has a direct bedside consequence — a pulse oximetry reading of 90% represents a considerably larger problem than the ten-point gap from 100% suggests, because by then you are on the steep portion. Oximetry also measures saturation, not oxygen content, so a severely anemic patient can read 99% while carrying dangerously little oxygen. Poor perfusion, motion, and nail polish all degrade the reading.` },
        { heading: `Separating cardiac from pulmonary causes`, body: `Chest pain and shortness of breath are two of the most common presentations in primary and urgent care, and both can originate in either system. This is exactly the generalist reasoning PA training is built around: the same symptom requires you to hold cardiac, pulmonary, gastrointestinal, musculoskeletal, and anxiety-related possibilities simultaneously and then use history, exam, and targeted testing to sort among them. Orthopnea — breathlessness on lying flat — points toward fluid redistribution and a struggling left ventricle. Pleuritic pain that worsens with breathing points elsewhere. Building the habit of asking which system a finding implicates, rather than pattern-matching to the most common diagnosis, is the actual skill.` },
        { heading: `Why this depth pays off in a compressed program`, body: `PA programs compress a physician-model curriculum into roughly 27 months, which means cardiopulmonary physiology arrives fast and does not wait for you. Every hour spent building genuine intuition for pressures, valves, gas exchange, and oxygen transport now is an hour you do not have to spend on it later, during a program that has no slack in it. This is the pragmatic case for going deeper than a high school course requires: the material is the same, and the time to learn it comfortably is now.` },
      ],
      keyTakeaways: [
        `The heart is two pumps — a low-pressure right side serving the lungs and a high-pressure left side serving the body — which is why left- and right-sided failure differ.`,
        `Both blood pressure numbers matter clinically, and systematic technique errors can shift a reading enough to change a diagnosis.`,
        `Hemoglobin's sigmoid oxygen curve means a saturation of 90% is far worse than it looks, and oximetry measures saturation rather than oxygen content.`,
        `Chest pain and breathlessness require holding several systems in play at once — that generalist sorting is exactly what PA training is built around.`,
      ],
    },
    video: { ytId: 'X9ZZ6tcxArI', title: 'The Heart, Part 1 - Under Pressure: Crash Course Anatomy & Physiology #25', channel: 'Crash Course' },
  },
  pa4l2: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Filtration, reabsorption, secretion`, body: `Each kidney contains roughly a million nephrons, and each works in stages. In the glomerulus, blood pressure forces water and small solutes out of the capillaries into the tubule, producing an enormous daily volume of filtrate. Along the tubule, the body reabsorbs nearly all the water and essentially all the glucose and useful electrolytes back into the blood, while secreting additional waste and excess ions in the opposite direction. The final output is roughly 1–2 liters of urine a day. The useful mental model is "filter indiscriminately, then carefully take back what matters" — once that clicks, most of renal physiology follows rather than needing to be memorized separately.` },
        { heading: `The kidney as a blood pressure regulator`, body: `Kidneys are not passive filters. Sensing reduced blood flow, they release renin, initiating the renin-angiotensin-aldosterone cascade that constricts vessels and drives sodium and water retention, raising volume and pressure. Antidiuretic hormone adds separate control over water retention. This is why kidney disease and hypertension reinforce each other — high pressure damages filtration structures, and damaged kidneys push pressure higher — and why several of the most commonly prescribed antihypertensives (ACE inhibitors, ARBs, diuretics) work by interrupting precisely this system. A PA prescribing them is acting directly on this loop, which is a good reason to understand it rather than memorize drug classes.` },
        { heading: `Electrolytes and the numbers that matter fast`, body: `Sodium, potassium, calcium, and magnesium are defended within narrow ranges because cellular function depends on those gradients. Potassium is the one to know cold: normal serum potassium is roughly 3.5–5.0 mEq/L, and deviations in either direction disrupt cardiac electrical activity, making severe hyperkalemia a genuine emergency. Sodium concentration reflects the ratio of sodium to water, so most sodium abnormalities are really water problems. Calcium affects nerve and muscle excitability. These aren't details for a nephrology rotation — they're why a basic metabolic panel is among the most ordered tests in all of medicine and why a PA reads one on nearly every patient.` },
        { heading: `Renal function and safe prescribing`, body: `PAs have prescriptive authority in all 50 states, which makes renal function a daily practical concern rather than an academic one. Creatinine is a muscle-metabolism waste product cleared steadily by healthy kidneys, so a rising creatinine signals falling filtration; labs typically report an estimated glomerular filtration rate calculated from it. Many drugs are renally cleared, and when filtration falls, a normal dose accumulates toward toxicity with each administration. Dosing guidance for a great many medications is therefore written as a function of eGFR, and checking it before prescribing is standard practice, not caution.` },
        { heading: `Reading the panel as a pattern`, body: `A basic metabolic panel is a snapshot of this whole regulatory system: creatinine and eGFR for filtration, blood urea nitrogen for kidney function and hydration state, sodium, potassium, chloride, and bicarbonate for electrolyte and acid-base status, and glucose as a metabolic baseline. The skill worth building is reading them together and asking what pattern they form — dehydration, kidney injury, a medication effect — rather than checking each against its range in isolation. That shift, from checking values to interpreting patterns, is a large part of what separates a student from a clinician.` },
      ],
      keyTakeaways: [
        `Nephrons filter indiscriminately and then selectively reabsorb — that model makes the rest of renal physiology follow rather than requiring separate memorization.`,
        `The renin-angiotensin-aldosterone system regulates long-term blood pressure and is the direct target of several of the most-prescribed antihypertensives.`,
        `Potassium's narrow range (~3.5–5.0 mEq/L) directly affects cardiac electrical activity, and most sodium abnormalities are water problems in disguise.`,
        `Because PAs prescribe in all 50 states, checking renal function before prescribing renally cleared drugs is routine practice rather than extra caution.`,
      ],
    },
    video: { ytId: 'l128tW1H5a8', title: 'Urinary System, Part 1: Crash Course Anatomy & Physiology #38', channel: 'Crash Course' },
  },
  pa4l3: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Hormones as broadcast signaling`, body: `The nervous system sends targeted messages down specific pathways; the endocrine system broadcasts. A gland releases a hormone into the bloodstream, it reaches essentially every cell, and only cells carrying the matching receptor respond. Receptor presence, not targeting, provides the specificity. The tradeoff is speed — hormonal signaling operates over minutes to days rather than milliseconds — which makes it suited to growth, metabolism, reproduction, and stress response, and unsuited to reflexes. Understanding endocrine signaling as a broadcast-plus-receptor system explains a great deal at once, including why a single hormonal abnormality can produce symptoms across many apparently unrelated organ systems.` },
        { heading: `Peptide versus steroid hormones`, body: `Hormones fall into two broad chemical families with directly practical consequences. Peptide hormones — insulin, growth hormone, most pituitary hormones — are amino-acid based and water soluble, travel freely in blood, and bind receptors on the cell surface, triggering internal second-messenger cascades. Steroid hormones — cortisol, aldosterone, testosterone, estrogen — are lipid based, require carrier proteins in blood, and pass through the cell membrane to bind intracellular receptors, often acting directly on gene transcription. This is exactly why insulin must be injected rather than swallowed (a peptide would be digested) while steroid medications work as oral tablets, and why steroid effects tend to be slower in onset and longer in duration.` },
        { heading: `Feedback loops and cascades`, body: `Endocrine control runs largely on negative feedback: a rising hormone level suppresses the signal that produced it. Cascades layer this — the hypothalamus signals the pituitary, the pituitary signals a target gland, and the target gland's hormone feeds back to suppress both levels above it. The hypothalamic-pituitary-adrenal axis governing cortisol works this way. Cascades allow amplification and multiple regulation points, but they also mean a problem can originate at any level, which is why endocrine workups test several hormones together. The classic pattern-reading example: a high TSH with a low thyroid hormone level points to a failing thyroid gland, while a low TSH with a low thyroid hormone points upstream to the pituitary.` },
        { heading: `Metabolic regulation and where it fails`, body: `Common endocrine disease reads best as feedback-loop failure. Type 1 diabetes removes insulin from the loop entirely through autoimmune beta-cell destruction. Type 2 diabetes leaves insulin present but tissues resistant, with the pancreas eventually unable to compensate. Hypothyroidism slows metabolic rate across systems; hyperthyroidism accelerates it. Adrenal insufficiency removes cortisol's role in the stress response, which is why it can present as a crisis under physiological stress. Each of these is a specific break in a specific loop, and the lab pattern points to where.` },
        { heading: `Why every PA specialty touches endocrinology`, body: `PAs practice across specialties and frequently change specialty during a career, which makes broad generalist competence more valuable than in most clinical roles. Diabetes and thyroid disease are common enough that they show up in every setting: in surgery through wound healing and infection risk, in emergency medicine through diabetic ketoacidosis and adrenal crisis, in primary care as ongoing management, in obstetrics through thyroid function in pregnancy. Building genuine fluency with hormone types, feedback structure, and cascade logic now means these arrive later as variations on a familiar pattern rather than as a hundred separate facts.` },
      ],
      keyTakeaways: [
        `Endocrine signaling broadcasts to every cell and gets its specificity from receptor presence, which is why one hormonal problem can affect many organ systems.`,
        `Peptide hormones bind surface receptors and must be injected; steroid hormones enter the cell, often act on transcription, and work as oral medications.`,
        `Negative feedback cascades mean a problem can originate at any level — a high TSH with low thyroid hormone points to the gland, a low TSH points to the pituitary.`,
        `PAs change specialty more than most clinicians, and endocrine disease appears in every one of them, which makes broad fluency here unusually valuable.`,
      ],
    },
    video: { ytId: 'eWHH9je2zG4', title: 'Endocrine System, Part 1 - Glands & Hormones: Crash Course Anatomy & Physiology #23', channel: 'Crash Course' },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // UNIT 5 — CLINICAL SKILLS & THE LANGUAGE OF MEDICINE
  // Original articles; no canonical single video exists for any of these at the
  // bar this app holds, so the video step is intentionally omitted.
  // ───────────────────────────────────────────────────────────────────────────
  pa5l1: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Terms are constructed, not memorized`, body: `Medical terminology looks like an enormous vocabulary and is actually a small construction system. Most terms decompose into a root (the body part or system), an optional prefix (position, number, timing, degree), and a suffix (condition, procedure, or process). "Pericarditis" is peri- (around) + cardi (heart) + -itis (inflammation). "Cholecystectomy" is chole (bile) + cyst (bladder) + -ectomy (surgical removal). Learning roughly fifty roots and thirty affixes lets you decode a large share of clinical language on first encounter — a far better return than memorizing thousands of complete terms, and the only approach that scales to a PA program's volume.` },
        { heading: `The affixes that carry the most weight`, body: `Suffixes worth knowing immediately: -itis (inflammation), -ectomy (removal), -otomy (incision into), -ostomy (creating an opening), -emia (blood condition), -pathy (disease), -algia (pain), -scopy (visual examination), -graphy (recording process), -plasty (surgical repair). Prefixes: hyper-/hypo- (above/below normal), brady-/tachy- (slow/fast), poly-/oligo- (many/few), dys- (difficult or abnormal), a-/an- (without), peri- (around), intra- (within), post-/pre- (after/before). Note the pairs separated by one or two letters that mean genuinely different things — hypertension versus hypotension, -otomy versus -ostomy — because those are exactly the ones that get misread under time pressure.` },
        { heading: `Anatomical position and directional language`, body: `Every clinical description assumes anatomical position: standing upright, facing forward, arms at the sides, palms turned forward. From that reference, directional terms are unambiguous. Superior and inferior mean toward the head and feet; anterior (ventral) and posterior (dorsal) mean front and back; medial and lateral mean toward and away from the midline; proximal and distal mean nearer to and farther from the point of attachment; superficial and deep describe distance from the surface. The rule that trips up nearly everyone at first: left and right always mean the patient's left and right, which is why anatomical images and radiographs appear mirrored relative to how you'd naturally read them.` },
        { heading: `Writing a note that another clinician can act on`, body: `The SOAP format organizes clinical documentation: Subjective (the patient's reported history and symptoms), Objective (vital signs, exam findings, labs, imaging), Assessment (the clinician's interpretation, including the differential), and Plan (tests, treatments, referrals, follow-up). The separation between Subjective and Objective does real work — it keeps reported experience distinguishable from measured fact, so a later reader can tell which is which rather than inheriting an earlier clinician's interpretation as data. For a PA specifically, documentation is also the primary medium of communication with the supervising physician and the rest of the team, which raises the stakes on writing an Assessment that actually states your reasoning rather than just a label.` },
        { heading: `Why this is the highest-return prep before any clinical exposure`, body: `A student who shadows without this vocabulary spends the day understanding a fraction of what's said. A student who has it can follow a case discussion, read along with a note, and ask a question that demonstrates they were actually tracking — which is also, incidentally, what makes a clinician willing to have you back. The system costs a few hours to learn and improves the return on every clinical hour afterward. It transfers completely across health professions, so nothing invested here is wasted if your path changes.` },
      ],
      keyTakeaways: [
        `Medical terms are built from root, prefix, and suffix — roughly fifty roots and thirty affixes decode most clinical language on sight.`,
        `Confusable pairs like hyper-/hypo- and -otomy/-ostomy differ by a letter or two and describe genuinely different situations.`,
        `Directional terms assume anatomical position, and left and right always mean the patient's — which is why anatomical images look mirrored.`,
        `SOAP separates reported from measured information, and for a PA the note is also the primary channel of communication with the supervising physician and team.`,
      ],
    },
  },
  pa5l2: {
    readMins: 7,
    article: {
      sections: [
        { heading: `The vital signs and their adult ranges`, body: `Vital signs are the fastest available read on whether basic physiology is holding. In an adult: temperature roughly 36.1–37.2°C (97–99°F), varying by site and time of day; heart rate 60–100 beats per minute at rest; respiratory rate 12–20 breaths per minute; blood pressure under 120/80 mmHg by current US guidelines; oxygen saturation 95–100% at sea level. These are reference points rather than verdicts. A resting heart rate of 52 means something entirely different in a trained athlete than in a patient newly started on a beta blocker, which is exactly why vital signs are interpreted against the person rather than against the range alone.` },
        { heading: `The four techniques of physical examination`, body: `Physical assessment uses four techniques, conventionally in this order: inspection (looking carefully, consistently the most underused and highest-yield), palpation (feeling for temperature, texture, tenderness, masses, and pulses), percussion (tapping to infer what lies beneath from the resulting sound), and auscultation (listening with a stethoscope to heart, lungs, and bowel). Abdominal examination deliberately reverses the middle steps — inspect, auscultate, then percuss and palpate — because pressing on the abdomen first changes bowel sounds. Details like that exist because someone established the hard way that sequence changes findings.` },
        { heading: `The focused exam and why history dominates`, body: `PA training emphasizes efficient, focused assessment: a complete head-to-toe exam has its place, but most encounters call for an examination targeted by what the history has already suggested. This is worth internalizing early, because it inverts a common assumption. A large share of diagnostic information comes from the history — what the patient tells you, and what you ask well enough to elicit — with the physical exam confirming, refining, or challenging the possibilities the history raised. A clinician who examines thoroughly but takes a history poorly will be wrong more often than the reverse.` },
        { heading: `Documentation and abnormal findings`, body: `The point of measuring is to produce a record another clinician can use, which means normal findings get documented too — "lungs clear to auscultation bilaterally" is information, not filler, because it establishes what was actually checked. Abnormal findings need enough description to be comparable later: not "abnormal breath sounds" but where, what kind, and on inspiration or expiration. For a PA, this is directly consequential, since the note is how the supervising physician and the rest of the team learn what you found, and vague documentation transfers no information at all.` },
        { heading: `Trends, context, and when to escalate`, body: `Any single set of measurements describes a state; a series describes a direction, and direction is usually what predicts what happens next. Deterioration typically announces itself as a trend — heart rate creeping up, blood pressure drifting down, respiratory rate rising, a patient becoming subtly less alert — across hours before any single value looks dramatic. Early warning score systems formalize exactly this pattern. In a collaborative model, knowing when to escalate to the supervising physician is a defining professional skill, and escalating on a trend before a threshold is crossed is very rarely the wrong call.` },
      ],
      keyTakeaways: [
        `Adult reference points: temperature ~36.1–37.2°C, heart rate 60–100/min, respiratory rate 12–20/min, blood pressure under 120/80, saturation 95–100%.`,
        `Inspection, palpation, percussion, and auscultation — reversed for the abdomen, where palpating first alters bowel sounds.`,
        `Most diagnostic information comes from the history; the exam confirms and refines what the history raised, so a poor history costs more than a poor exam.`,
        `Document normal findings as well as abnormal ones, and escalate on a trend rather than waiting for a threshold — that judgment is central to collaborative practice.`,
      ],
    },
  },
  pa5l3: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Generate the list before narrowing it`, body: `A differential diagnosis is the set of plausible explanations for a presentation, generated before narrowing toward one. The sequence matters: clinicians who narrow first reliably find evidence for whatever occurred to them first, because the mind fits new information to an existing hypothesis. Building the list deliberately — by anatomical region, by organ system, or by asking what's common, what's dangerous, and what's treatable — guards against that. It's why an experienced clinician facing chest pain runs cardiac, pulmonary, gastrointestinal, musculoskeletal, and anxiety-related possibilities before committing, even when one looks obvious from the doorway.` },
        { heading: `Pre-test probability and what a test actually does`, body: `A test result updates a prior belief rather than replacing it. Before ordering anything, you hold an estimate of how likely a condition is given this patient's history, risk factors, and exam — the pre-test probability — and the result shifts that estimate. This is why the identical positive result means different things in different patients: when a condition is rare in the population being tested, even a small false-positive rate produces more false positives than true ones. The same result in a patient with classic symptoms and risk factors is far more likely to be a true positive. Ordering a test without a prior sense of what you expect is how findings get over-interpreted.` },
        { heading: `Sensitivity, specificity, and the two shorthands`, body: `Sensitivity is the proportion of people who truly have the condition that the test correctly identifies — a highly sensitive test rarely misses cases. Specificity is the proportion of people without the condition that the test correctly clears — a highly specific test rarely raises a false alarm. The shorthands are worth committing: with a highly Sensitive test, a Negative result rules out ("SnNout"); with a highly Specific test, a Positive result rules in ("SpPin"). Screening tests are generally built to favor sensitivity, accepting false positives to avoid missed cases, and are followed by more specific confirmatory testing — which is exactly why a positive screen is not a diagnosis.` },
        { heading: `The named reasoning traps`, body: `Diagnostic error has been studied enough that the failure modes have names. Anchoring is fixing on an initial impression and failing to revise it. Availability bias is overweighting diagnoses that are recent or memorable rather than likely. Premature closure is stopping once one plausible answer appears. Confirmation bias is seeking supporting data while discounting contradicting data. The countermeasures are simple and effective: deliberately ask "what else could this be?", ask "what finding would change my mind?", and build in a checkpoint whenever a patient isn't responding the way the working diagnosis predicts.` },
        { heading: `Where the collaborative model actually helps`, body: `The PA role is built around a physician-led team, and diagnostic reasoning is where that structure earns its value most directly. A second clinician reviewing a case is one of the more effective known correctives to anchoring and premature closure, because they arrive without the first person's initial impression. Knowing when to consult isn't a limitation of the role — it's a designed safety feature, and in practice the boundary is negotiated between a PA and a supervising physician based on experience, specialty, and the specific case rather than being fixed by a rulebook. Getting comfortable saying "I want a second opinion on this one" is a professional strength.` },
      ],
      keyTakeaways: [
        `Generate a broad differential before narrowing, because narrowing first makes later evidence bend toward the first hypothesis.`,
        `A test updates pre-test probability rather than replacing it, which is why a positive screening result in a low-risk patient is often a false positive.`,
        `"SnNout" and "SpPin": a negative highly sensitive test rules out, a positive highly specific test rules in — and screening favors sensitivity by design.`,
        `Anchoring, availability, premature closure, and confirmation bias are the named traps, and a second clinician's independent look is one of the strongest correctives.`,
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // UNIT 6 — PHARMACOLOGY & PATIENT SAFETY
  // ───────────────────────────────────────────────────────────────────────────
  pa6l1: {
    readMins: 7,
    article: {
      sections: [
        { heading: `ADME in plain language`, body: `Everything that happens to a drug fits into four steps: absorption (reaching the bloodstream from where it was given), distribution (traveling to and entering the tissues where it acts), metabolism (chemical modification, overwhelmingly hepatic), and excretion (removal, overwhelmingly renal). A correct dose is not a fixed property of a drug — it's an answer to a question about how a specific patient's version of these four processes will handle it. For a PA, who prescribes in every state, this framework is not background theory; it's the reasoning behind why a dose gets adjusted for age, weight, kidney function, or another medication the patient is already taking.` },
        { heading: `First-pass metabolism and route selection`, body: `A swallowed drug is absorbed from the gut into the portal vein and delivered to the liver before reaching general circulation, where a substantial fraction may be metabolized. That's first-pass metabolism, and it's the main reason oral and intravenous doses of the same drug can differ dramatically. Other routes exist to manage the tradeoff: IV is immediate and complete but invasive and unforgiving; sublingual, transdermal, and rectal routes bypass much of the first pass; inhaled routes deliver locally with less systemic exposure. Choosing a route is a real clinical decision about onset speed, reliability of absorption, and how much drug will actually arrive.` },
        { heading: `Half-life, steady state, and the therapeutic window`, body: `Half-life — the time for concentration to fall by half — governs dosing frequency and how long it takes to reach a stable level, roughly four to five half-lives with regular dosing. The therapeutic window is the range between "enough to work" and "enough to harm." Drugs with a wide window tolerate imprecision; narrow-window drugs like warfarin, lithium, and digoxin require blood-level monitoring because ordinary variation in metabolism can push a patient out of range. Knowing which category a drug falls into is a large part of knowing how closely to follow the patient after starting it.` },
        { heading: `Organ function and individualized dosing`, body: `Because the liver metabolizes and the kidneys clear most drugs, impairment in either causes accumulation. When renal function falls, a renally cleared drug at a normal dose builds toward toxicity with each administration — which is why dosing guidance for many medications is written as a function of estimated glomerular filtration rate and why renal function is checked before starting them. Age changes the same calculation from both ends: renal function declines gradually with age, and infants' hepatic and renal systems are still maturing. "The standard dose" holds only within a fairly narrow band of patients.` },
        { heading: `Interactions and polypharmacy`, body: `An interaction occurs when one drug changes another's absorption, metabolism, or effect — competing for the same hepatic enzyme, inducing enzymes that then clear another drug too fast, altering gastric pH, or simply adding to the same physiologic effect. Because possible pairwise interactions grow quadratically with the number of medications, polypharmacy is a recognized risk in its own right, particularly in older adults. Deprescribing — actively reviewing whether each medication is still needed — is increasingly treated as a clinical skill rather than an afterthought, and it's exactly the kind of longitudinal care work PAs frequently own.` },
      ],
      keyTakeaways: [
        `ADME frames every dosing decision: a correct dose describes how a specific patient will handle the drug, not a fixed property of the drug.`,
        `First-pass hepatic metabolism is why oral and IV doses differ, and route selection is a real decision about onset, reliability, and delivered amount.`,
        `Half-life sets dosing frequency and time to steady state; narrow-therapeutic-window drugs require blood-level monitoring.`,
        `Renal and hepatic function individualize dosing, and interaction risk rises sharply with each additional medication — making deprescribing a genuine clinical skill.`,
      ],
    },
  },
  pa6l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `The rights of administration, from the prescriber's side`, body: `The five rights — right patient, right drug, right dose, right route, right time — are usually taught as a nursing framework, but each one is also a check a prescriber can get wrong at the point of ordering. Expanded versions add right documentation, right reason (does this indication actually fit this patient?), right response, and the patient's right to refuse. For a PA writing the order, the "right reason" check carries particular weight, because an inappropriate but correctly-executed prescription passes every downstream verification. The whole system is designed on the assumption that each link checks independently rather than trusting the one before it.` },
        { heading: `How a prescription gets verified`, body: `Between decision and administration, a prescription typically passes several independent checks. The prescriber selects the drug, dose, route, and frequency. The pharmacist reviews for appropriateness, dose, interactions, allergies, and duplication — a genuinely independent clinical review, not a dispensing formality. The nurse verifies patient identity, drug, dose, route, and timing at the bedside, and is generally the last check before the patient. Electronic prescribing and clinical decision support add automated checks. The layers exist because any single one fails sometimes; the design assumption is that independent failures rarely align.` },
        { heading: `High-alert medications`, body: `Some drugs cause disproportionately severe harm when an error occurs: insulin, anticoagulants, opioids, concentrated electrolytes, and chemotherapy agents are the classic examples. They aren't necessarily more error-prone; the consequences are simply much worse, which is why they carry independent double-checks and additional safeguards. "Independent" is doing real work in that phrase — a second clinician shown a result and asked to agree provides far weaker protection than one who works the calculation separately. Recognizing which drugs sit in this category is part of prescribing them responsibly.` },
        { heading: `Speaking up, in both directions`, body: `The most important cultural fact about medication safety is that questioning an order is expected professional behavior rather than an accusation. A nurse who holds a dose and calls to clarify an order that looks wrong is doing exactly what the system requires, and a PA who responds to that call defensively is degrading a safety mechanism they personally depend on. The same applies upward: raising a concern about a supervising physician's order is part of the collaborative model, not a breach of it. Teams where people hesitate to speak up have measurably worse safety records, and that hesitation is set by how the senior people respond the first few times.` },
        { heading: `Near misses and just culture`, body: `A near miss is an error caught before reaching the patient, and its entire value is diagnostic — it reveals look-alike packaging, confusing order screens, sound-alike drug names, and unclear protocols while there is still time to fix them without anyone being harmed. Organizations that respond to reports by assigning blame reliably stop receiving them, and then lose the warning the reports carried. "Just culture" is the term for the alternative: distinguishing human error and system failure, which call for system fixes, from reckless behavior, which doesn't. Understanding this distinction early is part of learning to work safely inside a team rather than merely competently as an individual.` },
      ],
      keyTakeaways: [
        `The rights of administration are prescriber checks too, and "right reason" matters most at the ordering step because a wrong indication passes every downstream check.`,
        `Prescriber, pharmacist, and nurse each verify independently — the safety design assumes independent failures rarely align.`,
        `High-alert medications get genuinely independent double-checks, where a second clinician works the calculation rather than agreeing with a shown result.`,
        `Questioning an order is expected professional behavior in both directions, and just culture separates human and system error from recklessness so near misses keep being reported.`,
      ],
    },
  },
  pa6l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `The chain of infection`, body: `For an infection to spread, six links must connect: an infectious agent, a reservoir, a portal of exit, a mode of transmission, a portal of entry, and a susceptible host. Break any link and transmission fails. The reason this model is taught first is that it immediately identifies where clinical effort actually pays: you cannot eliminate every pathogen or make every patient immune, but you can interrupt transmission reliably. Hand hygiene, gloves, masks, and equipment cleaning are all attacks on that one link, which is why they carry so much of the load in infection prevention.` },
        { heading: `Standard and transmission-based precautions`, body: `Standard precautions apply to every patient regardless of known diagnosis, treating all blood, body fluids, secretions, non-intact skin, and mucous membranes as potentially infectious — because infection status is frequently unknown, including to the patient. When a specific risk is identified, transmission-based precautions layer on: contact (gown and gloves, dedicated equipment) for organisms spread by touch including C. difficile and many resistant bacteria; droplet (surgical mask at close range) for larger respiratory particles such as influenza; airborne (fit-tested respirator such as an N95, plus negative-pressure room where available) for small particles that stay suspended, such as tuberculosis and measles. Applying standard precautions selectively — based on assumptions about which patients seem risky — is both unsafe and a documented route to discriminatory care.` },
        { heading: `Hand hygiene specifics`, body: `Hand hygiene remains the single highest-impact infection-control measure, and compliance across healthcare has historically been poor. The practical rules: alcohol-based hand rub is faster and generally more effective for routine hygiene, but soap and water is required when hands are visibly soiled and after caring for a patient with C. difficile, because alcohol neither removes soil nor kills bacterial spores. Gloves do not replace hand hygiene — hands are cleaned before donning and after removal, since gloves can have microscopic defects and hands get contaminated during removal. The WHO's "five moments" framework specifies when: before patient contact, before an aseptic task, after body fluid exposure risk, after patient contact, and after contact with the patient's surroundings.` },
        { heading: `Antibiotic stewardship as a prescriber's responsibility`, body: `Every unnecessary antibiotic course gives resistant organisms a selective advantage, and resistant infections then spread through the same routes as any other pathogen — which makes prescribing restraint a genuine infection-control measure rather than a separate concern. For a PA, this lands directly: a substantial share of unnecessary antibiotic prescribing happens in outpatient settings for viral respiratory infections, where the clinical pressure to prescribe something is real and comes from the patient as often as from uncertainty. Stewardship means choosing the narrowest effective agent, the shortest effective duration, and — hardest — being willing to explain why no antibiotic is the right answer.` },
        { heading: `Protecting yourself and the next patient`, body: `Infection control protects three people at once: the patient in front of you, the next patient you see, and you. Sharps safety, appropriate personal protective equipment, staying current on your own immunizations, and knowing your institution's exposure protocol are all part of that. The measures are repetitive and unglamorous by design, which is exactly why they erode under time pressure — and why speaking up when a colleague skips a step is part of the job. The person at risk is never the one who skipped it.` },
      ],
      keyTakeaways: [
        `The chain of infection has six links, and interrupting transmission is the one clinicians can break most reliably.`,
        `Standard precautions apply to everyone; contact, droplet, and airborne precautions require different protection, and a surgical mask does not substitute for a fitted respirator.`,
        `Alcohol rub is preferred routinely, soap and water is required for visible soil and C. difficile, and gloves never replace hand hygiene.`,
        `Antibiotic stewardship is a prescriber's infection-control duty — narrowest agent, shortest duration, and the willingness to explain why none is needed.`,
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // UNIT 7 — YOUR PA RUNWAY
  // Original articles. Scope of practice, prerequisite lists and CASPA cycle
  // dates all vary by state, by program and by year, so each lesson names the
  // primary source to verify against rather than stating a universal figure.
  // ───────────────────────────────────────────────────────────────────────────
  pa7l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why PA admissions is unusual`, body: `Among health professions, PA admissions weights hands-on clinical experience more heavily than almost any other. Programs commonly set explicit minimum hours of direct patient care experience — the specific number varies substantially by program, and competitive applicants often exceed the stated minimum considerably. The reason is structural rather than arbitrary: a PA program compresses a physician-model curriculum into roughly 27 months and assumes students arrive already comfortable in a clinical environment. There is no time in that schedule to also learn how a clinic works. Starting to accumulate hours in high school is therefore a genuine strategic advantage, not merely early enthusiasm.` },
        { heading: `Shadowing hours versus patient-care hours`, body: `PA programs track these separately and the distinction is strict. Shadowing is observation — valuable for understanding the role, and often required, but you are not responsible for anything. Direct patient care means hands-on responsibility for some part of a patient's care: taking vital signs, assisting with activities of daily living, drawing blood, providing emergency care. Many programs also recognize a middle category sometimes called healthcare experience, covering roles like scribing or unit clerk work. Because programs define these categories differently, the practical move is to log hours with enough detail — role, tasks, setting, supervisor — that you can categorize them correctly later against whatever definition a specific program uses.` },
        { heading: `Certifications that generate countable hours`, body: `The realistic routes for a high schooler, roughly by effort: CPR/BLS certification (short, often a prerequisite for volunteering), Certified Nursing Assistant (state-approved training plus a competency exam, leading to paid hands-on work), Emergency Medical Technician (longer course leading to NREMT certification and then state licensure), medical assistant, and phlebotomy. CNA and EMT are the two that most reliably convert into paid direct patient care. Age requirements vary by state and program — many allow training at 16 or 17 but require 18 for certification or employment — so your own state's board is the source of truth rather than any general guide.` },
        { heading: `Verifying a program is real`, body: `The check is specific and worth doing before paying anything. For CNA, confirm the program is approved by your state's nurse aide registry or health department, since only a state-approved program makes you registry-eligible. For EMT, confirm the program leads to NREMT eligibility. Treat any online-only "certification" for a hands-on clinical skill with skepticism — supervised clinical hours cannot be completed through a screen, and a certificate that doesn't lead to registry or NREMT eligibility is not a credential. Program marketing is not the source of truth; the state board's website is.` },
        { heading: `Logging from day one`, body: `CASPA asks for detailed experience entries — organization, supervisor, dates, hours, and a description of your role — and reconstructing several years of that from memory in college is both painful and inaccurate. Log every shift as it happens: date, setting, role, hours, and a couple of sentences of reflection, with no patient-identifying details. Your Portfolio's Clinical Hours panel exists for exactly this. Beyond application logistics, a contemporaneous record preserves the specific detail that later makes an essay concrete instead of generic — and almost nobody does it, which is precisely why it's worth doing.` },
      ],
      keyTakeaways: [
        `PA programs weight direct patient-care hours heavily because a ~27-month curriculum assumes you already know how a clinical environment works.`,
        `Shadowing and direct patient care are tracked separately and defined differently by different programs — log enough detail to categorize correctly later.`,
        `CNA and EMT are the two high school certifications that most reliably produce paid, countable direct patient-care hours.`,
        `Verify state approval or NREMT eligibility before paying, and log every shift contemporaneously since CASPA asks for detailed entries years later.`,
      ],
    },
  },
  pa7l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Three routes into overlapping work`, body: `PAs, nurse practitioners, and physicians do substantially overlapping clinical work — evaluating patients, diagnosing, ordering and interpreting tests, prescribing, and managing care — while arriving through genuinely different routes. PA programs are typically master's degrees of roughly 27 months, entered directly after a bachelor's plus patient-care hours, and trained on the medical model with broad generalist rotations. NP requires becoming a registered nurse first, then a graduate degree (MSN or DNP), trained on the nursing model and usually specializing earlier by population focus. Physicians complete four years of medical school plus a residency of three to seven or more years. The training structures differ more than the day-to-day work does.` },
        { heading: `Scope of practice, and why it has no national answer`, body: `Scope of practice — the set of activities a clinician is legally licensed to perform — is defined in state law and regulation, which is why the same credential carries different authority in different states. PAs have prescriptive authority in all 50 states, but the details, including controlled-substance schedules and the required form of physician collaboration, vary. NP authority varies more sharply: roughly half of states plus DC grant full practice authority, allowing independent practice, while the remainder require some degree of collaboration or supervision. Both professions have seen scope expand over recent decades, and the specifics are actively contested, which means anything you read on this — including this paragraph — needs checking against your state's current rules.` },
        { heading: `Autonomy, and what "supervision" actually looks like`, body: `The word "supervision" misleads students, who often picture a physician watching over a PA's shoulder. In practice, a PA typically sees patients independently, makes decisions, and consults the supervising physician on cases that warrant it — with the boundary negotiated based on the PA's experience, the specialty, and the individual case rather than fixed by a rulebook. An experienced PA in a familiar specialty may consult rarely. Many states have moved toward "collaboration" language reflecting that reality. The honest summary is that PAs have substantial day-to-day autonomy within a structure that keeps a physician accountable and available — which is a genuinely different thing from either full independence or constant oversight.` },
        { heading: `The tradeoffs worth weighing`, body: `Training length and cost differ substantially, and so does the age at which you finish and start earning — a real factor over a life, not just a financial detail. Physicians have the deepest training, the broadest scope, and the greatest ultimate autonomy, at the cost of the longest and most expensive path. PAs reach practice fastest of the three from a bachelor's and can change specialty without retraining, which is a genuinely unusual feature. NPs must become nurses first, which is either an extra step or a valuable clinical foundation depending on how you look at it, and reach independent practice in many states. Each trades something real for something else.` },
        { heading: `How to actually compare them`, body: `Prestige and salary are the two variables students weight most and that predict long-term satisfaction least — and the salary gap between these roles is smaller than the training gap suggests once opportunity cost is counted. The useful comparison is daily: how much autonomy you want, how much responsibility you want to carry alone at 3 a.m., how much debt you're willing to take on, how old you want to be when you finish, and whether the ability to switch specialties matters to you. Shadowing all three, if you can arrange it, will teach you more than any comparison chart — including this one.` },
      ],
      keyTakeaways: [
        `PA, NP, and physician work overlaps heavily; the training routes and models differ far more than the daily clinical tasks do.`,
        `Scope of practice is set by state law, so the same credential carries different authority in different states — PAs prescribe in all 50, NP independence varies by state.`,
        `"Supervision" in practice usually means seeing patients independently and consulting on cases that warrant it, with the boundary set by experience and specialty.`,
        `Compare by autonomy, debt, age at completion, and specialty flexibility rather than by salary or prestige, which predict satisfaction least.`,
      ],
    },
  },
  pa7l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `What CASPA is, and what it isn't`, body: `CASPA — the Centralized Application Service for Physician Assistants — lets you submit one core application, with transcripts, experience entries, essays, and letters of recommendation, to many programs at once. Most US PA programs use it. Two things frequently confuse applicants. First, CASPA is an application service, not an exam: the licensing exam taken after graduating is the PANCE. Second, most programs add their own supplemental application, essays, and sometimes prerequisites on top of the CASPA core, so "one application" understates the actual work.` },
        { heading: `Why the cycle timing matters so much`, body: `Many PA programs use rolling admissions, evaluating and admitting applicants continuously as complete applications arrive rather than reviewing everything at once after a deadline. The consequence is direct: an identical application submitted late in the cycle competes for a smaller pool of remaining seats than it would have early. CASPA also requires time to verify transcripts after submission, and that verification period is itself a delay to plan around. The cycle opens in the spring for programs starting the following year, which means an applicant is working on this a full year or more before matriculating. That structure is worth knowing now even though you'll act on it years from now.` },
        { heading: `The prerequisite courses`, body: `Prerequisites recur reliably across programs: anatomy and physiology (usually two semesters with lab), microbiology, general chemistry, often organic chemistry or biochemistry, statistics, and psychology. Many programs also require medical terminology, genetics, or nutrition. Two details catch applicants out: some programs impose recency limits, requiring prerequisites completed within a certain number of years, and many either don't accept AP credit toward prerequisites or expect additional upper-level coursework in the subject instead. Because requirements differ meaningfully between programs, building a spreadsheet of your target programs' actual lists is standard practice — and each program's own page is the only reliable source.` },
        { heading: `The rest of the application`, body: `Alongside GPA — with prerequisite science GPA often calculated separately and weighted heavily — programs weigh direct patient-care hours, shadowing, letters of recommendation (frequently required to include a PA), and a personal statement. Standardized testing varies: some programs require the GRE, some accept or require the PA-CAT, and some require neither, so this is another item to check per program rather than assume. Interviews are common and often use a multiple mini-interview format designed to assess communication and ethical reasoning rather than knowledge recall.` },
        { heading: `What to do about all this in high school`, body: `Almost none of the above is actionable now, and that's the point — knowing the shape of the process changes what you do today in only two ways, both of which matter. First, build the shared science backbone (biology, chemistry, physics, math through statistics) that keeps PA, medicine, nursing, and every other health path open, since specializing your coursework now costs optionality and gains nothing. Second, start accumulating and logging patient-care hours, because that is the one component of a PA application that genuinely cannot be assembled quickly later. Everything else — the CASPA account, the prerequisite spreadsheet, the test decision — happens in college.` },
      ],
      keyTakeaways: [
        `CASPA is a centralized application service, not an exam (that's the PANCE), and most programs add their own supplemental application on top.`,
        `Rolling admissions plus a transcript verification period mean applying early in the cycle is a genuine advantage, not a preference.`,
        `Prerequisites recur across programs but recency limits and AP-credit policies vary, so a per-program spreadsheet is standard practice.`,
        `In high school only two things matter here: build the shared science backbone, and start accumulating logged patient-care hours — the one part that can't be assembled quickly later.`,
      ],
    },
  },
};
