// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — Pharmacy (PharmD) pathway. Original articles + a
// curated, properly-embedded YouTube video per lesson. Keyed by lesson id (see
// PATHS.pharmacy in constants.js). Rendered by the LessonPlayer (App.jsx) as
// Overview -> Article -> Video -> Quiz -> Complete.
//
// Video verification: youtube.com is blocked by this environment's network
// policy (confirmed via a blocked oEmbed/WebFetch request), so every video id
// below was verified via WebSearch. Two ids that were only ever raw,
// unattributed links in constants.js before this batch (never actually run
// through a title-verification step by anyone) turned out to need correction:
// - ph1l3's original link (Ue2m_l91W2w) doesn't resolve to anything indexed —
//   swapped for confirmed 7qOFtL3VEBc, same fix already applied in the PA batch.
// - ph2l3's original link (bKIpDtJdK8Q) does resolve, but to a Professor Dave
//   Explains video, not Crash Course — breaks this app's single-channel
//   convention. Swapped for confirmed 6ulXau2HyHg (Crash Course Biology #35),
//   an even closer topical match.
// All other ids here are PROPOSED-REUSE from already-shipped, attributed
// lessons in this app (Physician's Unit 1/2), so no re-verification was
// needed for those per the plan's stated exception.
// ─────────────────────────────────────────────────────────────────────────────

export const PHARMACY_CONTENT = {
  ph1l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why organic chemistry is the pharmacist's real starting point`, body: `Ask what science a pharmacist actually lives in day to day, and the honest answer is organic chemistry — nearly every drug that exists is an organic molecule, and understanding how one behaves starts with understanding the carbon-based chemistry it's built from. This pathway leans harder into this topic than almost any other, because it genuinely is the foundation everything else in pharmacy builds on.` },
        { heading: `What actually makes a molecule "organic"`, body: `Organic chemistry is the study of molecules built around a carbon backbone, usually bonded to hydrogen and often to oxygen, nitrogen, or other elements. Carbon's ability to form four stable covalent bonds — long chains, rings, and branches — gives organic molecules their enormous structural diversity, from a simple two-carbon molecule to a complex protein-targeting drug. The name is a structural classification, not a "natural vs. synthetic" distinction — most modern pharmaceuticals are entirely lab-synthesized organic molecules.` },
        { heading: `Functional groups: the real vocabulary of drug chemistry`, body: `Rather than memorizing every possible molecule, organic chemistry is learned through functional groups — specific atom clusters attached to a carbon backbone that behave predictably regardless of the larger molecule they're part of. An alcohol, a carboxylic acid, a ketone, and an amine each have distinct, predictable chemical behavior. A drug's functional groups are a huge part of what determines how it dissolves, how the body absorbs it, and how precisely it binds its target — literally the vocabulary a pharmacist reasons in.` },
        { heading: `Why carbon's bonding matters so much here`, body: `Carbon's unique ability to form four stable bonds while still bonding to itself repeatedly is what allows for the near-infinite variety of drug structures that exist — small molecules like aspirin, complex ones like modern biologics. Small structural changes to a molecule's carbon backbone or functional groups can radically change how a drug behaves in the body, which is exactly why drug design is such a precise, detail-sensitive discipline.` },
        { heading: `The throughline to a pharmacy career`, body: `Every time a pharmacist checks for a drug interaction, verifies a formulation, or explains why a generic version of a medication works the same as the brand name, they're implicitly reasoning through organic chemistry — functional groups, molecular shape, and how they interact with the body. Building real fluency with this now is building the actual foundation of the career, not a prerequisite hurdle to get past.` },
      ],
      keyTakeaways: [
        `Organic chemistry is the chemistry of carbon-based molecules, and nearly every drug that exists is, structurally, an organic molecule.`,
        `Carbon's ability to form four stable covalent bonds gives organic molecules their enormous structural diversity — from simple to highly complex drugs.`,
        `Functional groups (alcohols, carboxylic acids, ketones, amines) behave predictably and are a major part of what determines a drug's absorption and target binding.`,
        `Organic chemistry isn't a prerequisite hurdle for pharmacy — it's the literal vocabulary a pharmacist reasons in daily.`,
      ],
    },
    video: { ytId: 'PmvLB5dIEp8', title: 'What Is Organic Chemistry?: Crash Course Organic Chemistry #1', channel: 'Crash Course' },
  },
  ph1l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why this review is high-yield for a pharmacy track specifically`, body: `AP Chemistry pushes general chemistry to a level of precision that maps directly onto what a pharmacist does daily: exact concentration calculations, careful attention to molecular structure, precise measurement. This lesson reviews the mole and stoichiometry, atomic structure at the quantum level, and bonding types — foundational, not optional, for this specific career.` },
        { heading: `The mole and stoichiometry`, body: `A mole is a fixed quantity — 6.022 × 10²³ particles — that lets chemists count atoms and molecules indirectly, by weighing them. Stoichiometry uses the ratios in a balanced equation to predict exactly how much of one substance reacts with or produces another. This is the identical logic behind calculating a compounded medication's exact concentration, or verifying that a prescription's dose matches what was ordered — a pharmacist's single most safety-critical daily task.` },
        { heading: `Atomic structure at the AP level`, body: `Beyond protons, neutrons, and electrons, AP-level atomic structure involves quantum numbers describing an electron's energy level and orbital shape, plus rules determining how electrons fill those orbitals. Electron configuration directly determines how an atom bonds and reacts — the mechanistic explanation for why certain drug molecules interact with certain biological targets and not others.` },
        { heading: `Bonding types and their physical signatures`, body: `Ionic bonds tend to produce hard, high-melting-point solids that conduct electricity when dissolved in water. Covalent bonds produce molecules with much more varied properties depending on structure and polarity — most drug molecules. Recognizing which bonding type a substance has lets you predict solubility and stability, both directly relevant to how a medication should be stored and formulated.` },
        { heading: `Precision as the actual professional standard`, body: `A pharmacist's job has essentially zero tolerance for a decimal-point or unit error, and the habit of precise, rule-based chemical reasoning built through content like this is exactly what that professional standard demands. Getting genuinely fluent now — not just familiar enough to pass a test — is what makes that standard feel achievable rather than intimidating later.` },
      ],
      keyTakeaways: [
        `The mole (6.022 × 10²³ particles) and stoichiometry are the same math behind verifying a compounded medication's exact concentration.`,
        `Quantum numbers and electron configuration describe exactly how electrons are arranged around an atom, determining its chemical behavior.`,
        `Ionic, covalent, and metallic bonding each produce distinct, predictable physical properties directly relevant to drug storage and formulation.`,
        `Pharmacy has essentially zero tolerance for calculation error, and precise chemical reasoning built now is what makes that standard achievable.`,
      ],
    },
    video: { ytId: 'UL1jmJaUkaQ', title: 'Stoichiometry: Chemistry for Massive Creatures - Crash Course Chemistry #6', channel: 'Crash Course' },
  },
  ph1l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why reaction kinetics is arguably the highest-yield chemistry topic for pharmacy`, body: `If organic chemistry is the vocabulary of drug structure, reaction kinetics is the vocabulary of drug timing — how quickly a medication takes effect, how long it lasts, and how its concentration changes in the body over time. Few topics connect this directly and this obviously to the actual pharmacist's job.` },
        { heading: `What reaction rate measures, and what changes it`, body: `Reaction rate describes how quickly reactants convert into products, and it's affected by temperature, concentration, surface area, and the presence of a catalyst. A catalyst — like an enzyme in the body — speeds up a reaction without being consumed by it, by lowering the activation energy the reaction needs to get started. Many drugs work by targeting a specific enzyme, either accelerating or blocking its catalytic activity.` },
        { heading: `Rate laws and reaction order`, body: `A rate law is a mathematical expression relating reaction rate to reactant concentrations, and reaction order describes how sensitively rate responds to a change in a given reactant's concentration. Determining a rate law experimentally — running a reaction at different concentrations and measuring the resulting rate change — is a foundational lab skill, and it's structurally identical to how pharmacokinetic studies determine a drug's behavior in the body.` },
        { heading: `Pharmacokinetics: reaction kinetics applied to the human body`, body: `Pharmacokinetics — how a drug is absorbed, distributed, metabolized, and eliminated — is applied reaction kinetics. A drug's concentration in the bloodstream rises after it's taken, peaks, then declines as the body metabolizes and clears it, and that entire curve is governed by kinetic principles. Understanding this is what lets a pharmacist reason about dosing intervals, half-life, and why missing a dose or taking one too early can meaningfully change a drug's effect.` },
        { heading: `Why this connects everything in this pathway`, body: `Drug interactions, dosing schedules, and even why grapefruit juice famously interferes with certain medications are all, at bottom, kinetics questions — one substance changing the rate at which another is metabolized. Genuine fluency with reaction kinetics is what turns "don't take this with that" from a memorized warning into something a pharmacist can actually explain and reason about for a new situation.` },
      ],
      keyTakeaways: [
        `Reaction rate is affected by temperature, concentration, surface area, and catalysts — many drugs work by targeting a specific enzyme's catalytic activity.`,
        `A rate law relates reaction rate to concentration, determined experimentally — structurally identical to how pharmacokinetic studies work.`,
        `Pharmacokinetics (a drug's absorption, distribution, metabolism, and elimination) is applied reaction kinetics.`,
        `Drug interactions and dosing intervals are fundamentally kinetics questions — one substance changing how fast another is metabolized.`,
      ],
    },
    // The pre-existing raw link (Ue2m_l91W2w) does not resolve to anything indexed via
    // WebSearch — no verification record possible. Swapped to a confirmed alternative.
    video: { ytId: '7qOFtL3VEBc', title: "Kinetics: Chemistry's Demolition Derby: Crash Course Chemistry #32", channel: 'Crash Course' },
  },
  ph2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why metabolism, specifically, is the biology a pharmacist needs most`, body: `Of all the biology a pre-health student could study, metabolism — how cells generate and use energy — is arguably the most directly relevant to pharmacy, because it's the process most drugs either target directly or get processed through. This lesson covers cell biology with that specific lens.` },
        { heading: `How cells generate usable energy`, body: `Cells break down nutrients like glucose through cellular respiration, ultimately producing ATP — the molecule cells actually spend to power everything from muscle contraction to active transport across a cell membrane. This process happens in a series of tightly regulated steps, each one catalyzed by a specific enzyme, inside and outside the mitochondria. Nearly every step in this pathway is, somewhere in medicine, a potential drug target.` },
        { heading: `Enzymes as catalysts, and why drugs target them`, body: `Enzymes are proteins that speed up a specific biological reaction without being consumed by it, by lowering the activation energy needed. A huge share of medications work by directly interacting with a specific enzyme — inhibiting one that's overactive in a disease process, or in rarer cases boosting one that's underactive. Statins, for instance, work by inhibiting a specific enzyme involved in cholesterol synthesis — a direct, textbook example of a metabolic enzyme as a drug target.` },
        { heading: `Metabolism and how the body processes drugs`, body: `The same metabolic machinery that processes nutrients also processes most drugs — largely in the liver, via a family of enzymes that chemically modify a drug so the body can eventually eliminate it. This is why liver function directly affects how a drug behaves in a specific patient, and why certain drug combinations can dangerously slow or speed up how fast another drug gets cleared.` },
        { heading: `Why this is the throughline of a pharmacy career`, body: `Understanding metabolism at the cellular level is what lets a pharmacist reason about two different but related questions simultaneously: how does this drug work, and how does the body get rid of it? Both questions come back to the same underlying cellular machinery, which is exactly why this lesson sits at the center of this pathway's biology content.` },
      ],
      keyTakeaways: [
        `Cellular respiration breaks down nutrients to produce ATP, the energy currency cells spend to power nearly every process.`,
        `Enzymes are catalysts that speed up specific reactions, and a huge share of drugs work by inhibiting or boosting a specific enzyme's activity.`,
        `The liver's metabolic enzymes process most drugs for elimination, which is why liver function and drug combinations both directly affect how a medication behaves.`,
        `Understanding metabolism at the cellular level explains both how a drug works and how the body eventually clears it — the two central questions of pharmacology.`,
      ],
    },
    video: { ytId: '00jbG_cfGuQ', title: 'ATP & Respiration: Crash Course Biology #7', channel: 'Crash Course' },
  },
  ph2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why a pharmacist needs whole-body physiology, not just chemistry`, body: `It's tempting to think pharmacy is "just chemistry," but a drug doesn't act in a test tube — it acts inside a physiological system, and how that system is functioning changes how the drug behaves. This lesson tours the major organ systems with a specific eye toward the two that matter most to a pharmacist: the liver and kidneys.` },
        { heading: `A quick tour of the major systems`, body: `The circulatory system distributes a drug throughout the body once it's absorbed. The respiratory system handles gas exchange and is the route for inhaled medications. The digestive system is where most oral medications are absorbed, primarily through the small intestine. The nervous and endocrine systems are frequent drug targets themselves, given how many conditions — pain, mood, hormone regulation — involve one or both.` },
        { heading: `The liver: where most drugs get processed`, body: `The liver's metabolic enzymes chemically modify most drugs, usually to make them easier for the body to eliminate — a process called first-pass metabolism when it happens right after oral absorption, before a drug even reaches general circulation. Liver disease or certain drug combinations can significantly change how much of a medication actually reaches its target, which is why liver function is one of the first things checked before prescribing many medications.` },
        { heading: `The kidneys: where most drugs get eliminated`, body: `The kidneys filter blood and excrete water-soluble waste, including many drugs and their metabolic byproducts, into urine. Kidney function naturally declines with age and can be impaired by certain conditions, which is why elderly patients or those with kidney disease often need adjusted, lower medication doses — the drug simply isn't being cleared from their system as quickly as it would be otherwise.` },
        { heading: `Why physiological variation is a core pharmacy concept`, body: `Two patients given the identical dose of the identical medication can have meaningfully different outcomes based on their liver and kidney function, age, and overall physiology — which is exactly why "the same dose for everyone" isn't how real pharmacy practice works. Understanding physiology at this level is what lets a pharmacist reason about why a dose might need adjusting for a specific patient, not just what the standard dose is.` },
      ],
      keyTakeaways: [
        `A drug's behavior depends on the physiological system it acts within, not just its own chemistry — physiology and pharmacology are inseparable in practice.`,
        `The liver's metabolic enzymes process most drugs, often via first-pass metabolism right after oral absorption.`,
        `The kidneys filter and eliminate many drugs and their byproducts, and declining kidney function (common with age) often requires a lower dose.`,
        `Physiological variation between patients (liver/kidney function, age) is exactly why dosing isn't one-size-fits-all in real pharmacy practice.`,
      ],
    },
    video: { ytId: '9fxm85Fy4sQ', title: 'Circulatory & Respiratory Systems: Crash Course Biology #27', channel: 'Crash Course' },
  },
  ph2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why protein synthesis is where drug design actually begins`, body: `Nearly every drug works by binding to a specific protein — an enzyme, a receptor, a transport channel — and changing what it does. Understanding how proteins are built in the first place, and what determines their exact shape, is what makes it possible to understand how a drug can be designed to fit one so precisely.` },
        { heading: `From DNA to a working protein`, body: `DNA's sequence gets transcribed into messenger RNA (mRNA) in the nucleus, and that mRNA is then translated by ribosomes into a chain of amino acids — the building blocks of a protein. The exact sequence of amino acids, determined entirely by the original DNA sequence, is what determines how that chain folds into a specific three-dimensional shape. That shape is everything: it's what determines exactly what the protein does and what molecules it can bind.` },
        { heading: `Proteins as drug targets`, body: `A drug works by binding to a specific protein and changing its activity — blocking an overactive enzyme, activating an underactive receptor, or blocking a receptor a disease process is over-stimulating. The specific three-dimensional shape of both the drug molecule and its target protein is what determines whether that binding happens at all, and how selectively — a drug that binds too many different proteins tends to cause more side effects.` },
        { heading: `Designing a drug to fit its target`, body: `Modern drug design increasingly starts from a detailed structural understanding of a target protein — mapping its exact three-dimensional shape, then designing or screening molecules that fit into it with high precision, much like designing a key for a specific lock. This structural approach is a huge part of how new medications get developed today, replacing a lot of older, more trial-and-error methods.` },
        { heading: `Why this is the conceptual center of pharmacy science`, body: `Every drug interaction check, every explanation of a medication's mechanism, and every new drug in development all trace back to this same idea: a specific molecule interacting with a specific protein because their shapes fit. Genuine fluency with protein synthesis and structure is what makes that idea concrete instead of abstract.` },
      ],
      keyTakeaways: [
        `DNA is transcribed into mRNA, then translated by ribosomes into a chain of amino acids that folds into a protein's specific three-dimensional shape.`,
        `A protein's shape determines what it does and what molecules (including drugs) it can bind — the central mechanism behind how medications work.`,
        `Drug selectivity (fewer side effects) depends on how precisely a drug's shape fits its target protein and not others.`,
        `Modern drug design increasingly starts from a target protein's structure, designing a molecule that fits it with high precision.`,
      ],
    },
    // The pre-existing raw link (bKIpDtJdK8Q) resolves to a real video, but it's by
    // Professor Dave Explains, not Crash Course — breaks this app's single-channel
    // convention. Swapped to a confirmed, closer-matching Crash Course alternative.
    video: { ytId: '6ulXau2HyHg', title: 'Translation: How RNA Gets Translated into Protein Power: Crash Course Biology #35', channel: 'Crash Course' },
  },
  ph3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why math literacy is inseparable from pharmacy practice`, body: `A pharmacist's entire professional standard rests on getting a calculation exactly right, every time — there's no partial credit for a dosing or concentration error. This lesson builds the specific math and statistics literacy that underlies dosing precision and understanding how a medication was actually tested before it reached a pharmacy shelf.` },
        { heading: `Ratios and proportions in dosing`, body: `A huge share of pharmacy math — compounding a specific concentration, calculating a weight-based pediatric dose, converting between units — is ratio and proportion reasoning applied carefully. If a medication is dosed per kilogram of body weight, calculating the correct amount for a specific patient is a direct proportion calculation, and fluency here is what keeps that calculation fast and reliable under real workplace time pressure.` },
        { heading: `Therapeutic index: the safety margin`, body: `A drug's therapeutic index describes the gap between an effective dose and a toxic one — a wide therapeutic index means there's a large safety margin, while a narrow one means the effective and dangerous doses are close together, demanding much more careful, precise dosing. Medications with a narrow therapeutic index are exactly the ones where a pharmacist's verification role matters most, since a small dosing error carries real risk.` },
        { heading: `Reading clinical trial data`, body: `New medications are tested in clinical trials that report results using statistics — how much better a drug performed than a placebo, how confident researchers are that the result wasn't due to chance, and how large or small the actual clinical benefit is. Being able to read this data critically, distinguishing a statistically significant result from a clinically meaningful one, is a skill pharmacists increasingly need as they help patients and prescribers interpret new drug research.` },
        { heading: `Why this literacy compounds over an entire career`, body: `None of this requires being a statistician — it requires being comfortable enough with ratios, safety margins, and basic trial data interpretation that dosing calculations and staying current on new medications both feel manageable rather than intimidating. That comfort, built now, is exactly what pharmacy programs assess early and often.` },
      ],
      keyTakeaways: [
        `Most pharmacy dosing math — compounding, weight-based dosing, unit conversion — is ratio and proportion reasoning applied under real time pressure.`,
        `A drug's therapeutic index describes its safety margin; a narrow therapeutic index demands especially careful, precise dosing verification.`,
        `Reading clinical trial data critically means distinguishing a statistically significant result from a clinically meaningful one.`,
        `Math and statistics literacy for pharmacy isn't academic — it's the daily skill behind safe dosing and staying current on new medications.`,
      ],
    },
    video: { ytId: 'sxQaBpKfDRk', title: 'What Is Statistics: Crash Course Statistics #1', channel: 'Crash Course' },
  },
  ph3l2: {
    readMins: 5,
    article: {
      sections: [
        { heading: `Why shadowing a pharmacist looks different from other clinical shadowing`, body: `Pharmacy shadowing looks noticeably different from shadowing a physician or nurse — less direct hands-on patient contact, much more precision-focused work: verifying prescriptions, checking for interactions, counseling patients on how to actually take a medication. Seeing this firsthand is exactly what tells you whether this specific rhythm of work fits you.` },
        { heading: `Realistic settings to shadow in`, body: `Retail pharmacy (in a drugstore or grocery chain), hospital pharmacy, and clinical/specialty pharmacy settings all offer meaningfully different day-to-day experiences — retail pharmacy is high-volume and patient-facing, hospital pharmacy is more clinically integrated with a care team, and specialty pharmacy focuses on complex, often expensive medications for specific conditions. If you can arrange shadowing in more than one setting, even briefly, you'll get a much more complete picture of the profession's range.` },
        { heading: `How to realistically arrange it`, body: `The same personal-connection approach that works for other clinical shadowing applies here — a family pharmacist, a relative in the field, or a family friend is a far more realistic path in than a cold request to a large chain. Independent, locally-owned pharmacies are sometimes more flexible about hosting a brief shadowing visit than large corporate chains, which may have stricter policies for minors.` },
        { heading: `What to pay attention to specifically`, body: `Notice the verification workflow — how a pharmacist double-checks a prescription against a patient's other medications for interactions — and how much of the role involves direct patient counseling versus behind-the-counter precision work. This balance varies a lot by setting, and understanding where on that spectrum you'd actually want to spend a career is exactly what a shadowing day should help you figure out.` },
        { heading: `Confidentiality and building a credible record`, body: `The same confidentiality rules apply here as any clinical setting — no discussing identifiable patient or prescription details outside the setting, ever. Log the date, setting, and your own reflections in your Portfolio's Clinical Hours section right after each shadowing day, building a consistent, credible record rather than reconstructing one from memory later.` },
      ],
      keyTakeaways: [
        `Pharmacy shadowing is noticeably less patient-facing and more precision-focused than shadowing a physician or nurse — worth confirming that rhythm fits you.`,
        `Retail, hospital, and specialty pharmacy settings offer meaningfully different experiences — shadowing in more than one gives a fuller picture.`,
        `A personal connection is the realistic path in, and independent pharmacies are sometimes more flexible than large chains for hosting a minor.`,
        `Confidentiality is a hard rule in every clinical setting, and logging reflections right after each shadowing day builds a credible record over time.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l2, nur3l2):
    // no single canonical YouTube video exists for pharmacy-specific shadowing logistics.
  },
  ph3l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `What a PharmD is, and the two paths into one`, body: `Pharmacists earn a Doctor of Pharmacy (PharmD) degree. Some programs are direct-entry 0-6 tracks admitting students straight from high school, combining pre-pharmacy undergraduate coursework with the professional PharmD curriculum into one continuous six-year program. Other programs require a bachelor's degree (in any major, provided prerequisites are met) before a separate PharmD application. Neither path is inherently better — they're different tradeoffs in timeline and flexibility.` },
        { heading: `Why chemistry coursework carries so much weight`, body: `Since a pharmacist's daily work sits directly on a chemistry foundation — drug mechanisms, interactions, formulation — pharmacy programs weight chemistry coursework and grades unusually heavily compared to other health-career admissions, which often weight biology more evenly with chemistry. Strong, consistent performance specifically in chemistry classes is one of the most direct signals of genuine preparedness a pharmacy admissions reader looks for.` },
        { heading: `The PCAT: a requirement in flux`, body: `The PCAT (Pharmacy College Admission Test) was historically a standard part of pharmacy admissions, but a growing number of programs have dropped the requirement in recent years. This means the exam's status genuinely varies by program and can change year to year, which makes checking each specific program's current requirements directly — rather than assuming a blanket standard — a real, practical necessity rather than just due diligence.` },
        { heading: `Getting realistic exposure now`, body: `Shadowing a pharmacist — retail, hospital, or specialty — is the realistic, age-appropriate way to preview the profession before committing years of coursework toward it. Given how heavily pharmacy admissions weight chemistry specifically, pairing that shadowing with genuinely strong performance in your own chemistry coursework is the single highest-leverage combination available to a high schooler considering this path.` },
        { heading: `What actually differentiates a pharmacy application`, body: `Beyond GPA (especially science and chemistry GPA) and a program's specific test requirements, pharmacy admissions readers look for evidence of precision-oriented thinking and genuine interest in the chemistry of treatment — not just "wanting to work in healthcare" broadly. A well-articulated, specific reason for choosing pharmacy over other health careers, backed by real shadowing exposure, is what tends to stand out.` },
      ],
      keyTakeaways: [
        `Pharmacists earn a PharmD, reachable via a direct-entry 0-6 program from high school or a separate application after a bachelor's degree.`,
        `Pharmacy admissions weight chemistry coursework and grades unusually heavily, reflecting the chemistry-centered nature of the actual daily work.`,
        `The PCAT's requirement status varies by program and has been dropping at many schools — always check a specific program's current policy.`,
        `A well-articulated, specific reason for choosing pharmacy — backed by real shadowing and strong chemistry grades — is what differentiates an application.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l3, nur3l3):
    // no single canonical YouTube video exists for "what pharmacy programs look for."
  },
};
