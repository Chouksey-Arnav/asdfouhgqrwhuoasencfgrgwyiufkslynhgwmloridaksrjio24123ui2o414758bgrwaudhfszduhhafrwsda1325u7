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
};
