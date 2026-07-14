// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — Dentistry (DDS/DMD) pathway. Original articles + a
// curated, properly-embedded YouTube video per lesson. Keyed by lesson id (see
// PATHS.dentistry in constants.js). Rendered by the LessonPlayer (App.jsx) as
// Overview -> Article -> Video -> Quiz -> Complete.
//
// Video verification: youtube.com is blocked by this environment's network
// policy (confirmed via a blocked oEmbed/WebFetch request), so every video id
// below was verified via WebSearch. de2l3's original raw link (eB1qG5EEDk0,
// never actually attributed with a title by anyone before this batch) doesn't
// resolve to anything indexed — swapped for confirmed ANi709MYnWg. All other
// ids here are PROPOSED-REUSE from already-shipped, attributed lessons
// elsewhere in this app, so no re-verification was needed for those per the
// plan's stated exception.
// ─────────────────────────────────────────────────────────────────────────────

export const DENTISTRY_CONTENT = {
  de1l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why anatomy and physiology matter for a hands-on, procedural career`, body: `Dentistry is one of the most hands-on paths in health care — nearly every appointment involves direct, precise physical work inside a patient's mouth. That precision only means something if it's built on real anatomical and physiological understanding: knowing exactly what structure you're working near, and why it behaves the way it does. This lesson builds that foundation.` },
        { heading: `Anatomy vs. physiology`, body: `Anatomy is structure — what the body's parts are and how they're arranged. Physiology is function — how those parts actually work. A dentist needs both simultaneously: the anatomy of a tooth's root canal system, and the physiology of why a nerve inside it responds to temperature and pressure the way it does. The two are inseparable in the actual work of diagnosing and treating a dental problem.` },
        { heading: `Homeostasis and a healthy oral environment`, body: `Homeostasis is the body's drive to keep its internal environment stable, largely through negative feedback loops. The mouth has its own local version of this: saliva continuously works to neutralize acid and remineralize enamel, maintaining a chemical balance that resists the constant assault of food, drink, and bacteria. Nearly everything a dentist manages — cavities, gum disease — is, at some level, this local homeostatic balance being overwhelmed.` },
        { heading: `A tour of the major organ systems`, body: `The circulatory system supplies blood to the gums and jaw, and its health directly affects healing after a procedure. The nervous system gives the mouth extraordinary sensitivity — among the densest nerve concentrations in the body — which is exactly why pain management is such a central dental skill. The digestive system's very first step happens in the mouth, with mechanical breakdown and the first digestive enzymes.` },
        { heading: `Why oral health connects to whole-body health`, body: `The mouth isn't a sealed-off system — chronic gum disease has documented links to cardiovascular health and diabetes management, among other whole-body conditions. Understanding physiology at this integrated level is what lets a dentist recognize when something in a patient's mouth might be a sign of, or a contributor to, a broader health issue worth flagging to their physician.` },
      ],
      keyTakeaways: [
        `Anatomy is structure and physiology is function — dental work constantly requires reasoning about both together, especially in fine, precise procedures.`,
        `The mouth maintains its own local homeostasis through saliva's acid-neutralizing and remineralizing action, and most dental disease is this balance being overwhelmed.`,
        `The mouth's exceptionally dense nerve supply is why pain management is such a central, constant dental skill.`,
        `Oral health connects to whole-body health — chronic gum disease is linked to conditions like cardiovascular disease and diabetes.`,
      ],
    },
    video: { ytId: 'uBGl2BujkPQ', title: 'Introduction to Anatomy & Physiology: Crash Course A&P #1', channel: 'Crash Course' },
  },
  de1l2: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Why cell biology matters for a career built on hard tissue`, body: `Teeth are unusual in the body — built from some of its hardest, most mineralized tissue, produced by specialized cells during development and largely unable to regenerate once fully formed. Understanding the cell biology behind how that tissue gets built, and how cells more generally divide and pass on genetic information, is foundational to understanding both normal dental development and what goes wrong in inherited dental conditions.` },
        { heading: `The organelles that build hard tissue`, body: `Specialized cells called ameloblasts and odontoblasts are responsible for producing enamel and dentin, the two mineralized layers that make up a tooth, during development. Like any cell, they rely on the same organelles — the nucleus directing genetic instructions, mitochondria supplying the energy for this intensive mineral-secreting process, ribosomes building the structural proteins involved. Once a tooth is fully formed, enamel-producing cells are lost, which is exactly why enamel can't regenerate on its own once damaged.` },
        { heading: `Mitosis vs. meiosis, and why cell division matters after a procedure`, body: `Mitosis is how tissue grows and repairs itself — one cell duplicates its DNA and splits into two identical daughter cells, exactly what's happening as gum tissue heals after a dental procedure. Meiosis, by contrast, is reserved for producing sperm and egg cells and involves a completely different process of halving and shuffling chromosomes. Understanding mitosis specifically is directly relevant to how a dentist evaluates whether healing is progressing normally after a procedure like an extraction.` },
        { heading: `Mendelian inheritance and dental/craniofacial conditions`, body: `Organisms carry two copies (alleles) of most genes, and when they differ, one is often dominant while the other is recessive. This dominant/recessive framework, tracked using a Punnett square, is the basis for understanding several inherited dental and craniofacial conditions — including amelogenesis imperfecta, a genetic disorder affecting enamel formation. A dentist who understands this framework can better recognize when a patient's dental presentation might have a genetic basis worth discussing.` },
        { heading: `Why this depth is worth building now`, body: `Dental school moves through developmental biology and genetics quickly, assuming a real foundation already exists. Building genuine comfort with cell division and inheritance now — not just enough to pass a test — is what keeps that later coursework feeling like reinforcement rather than a first encounter with unfamiliar material.` },
      ],
      keyTakeaways: [
        `Specialized cells (ameloblasts, odontoblasts) build enamel and dentin during development, then are lost — which is why enamel can't regenerate once damaged.`,
        `Mitosis produces identical cells for growth and repair, directly relevant to how gum tissue heals after a dental procedure.`,
        `Punnett squares predict inherited-trait probability, the basis for understanding genetic dental/craniofacial conditions like amelogenesis imperfecta.`,
        `Dental school assumes real fluency with cell division and inheritance from the start — building it now pays off directly later.`,
      ],
    },
    video: { ytId: 'CBezq1fFUEA', title: 'Heredity: Crash Course Biology #9', channel: 'Crash Course' },
  },
  de1l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why whole-body physiology matters even for a specialized field`, body: `It's tempting to think a dentist only needs to understand the mouth, but dentistry sits within whole-body physiology — a patient's overall health, medications, and other conditions all directly affect dental treatment decisions. This lesson tours the major systems with an eye toward where they intersect with dental practice specifically.` },
        { heading: `Digestion starts in the mouth`, body: `The digestive system's very first step is mechanical breakdown by the teeth, combined with salivary enzymes (like amylase) that begin breaking down carbohydrates before food is even swallowed. This is exactly why missing or poorly functioning teeth don't just affect appearance — they measurably affect nutrition, since inadequately chewed food is harder to digest and absorb further down the digestive tract.` },
        { heading: `Nervous system density and pain management`, body: `The mouth and jaw contain an extraordinarily dense concentration of nerve endings, which is exactly why dental pain can feel so sharp and localized, and why effective local anesthesia is such a core dental skill. Understanding the specific nerve pathways involved — like the trigeminal nerve, which supplies most of the face and mouth — is foundational to performing procedures with minimal patient discomfort.` },
        { heading: `Circulatory health and healing`, body: `Good blood flow to the gums and jaw is essential for healing after any dental procedure, from a simple filling to an extraction. This is exactly why certain systemic conditions that affect circulation — diabetes, for instance — also affect how well a patient heals after dental work, and why a dentist needs to factor a patient's broader health history into treatment planning, not just what's visible in the mouth itself.` },
        { heading: `Why an integrated view matters for real practice`, body: `A patient's medication list, chronic conditions, and overall health history all shape safe, effective dental treatment — a dentist prescribing or performing a procedure without factoring in the whole patient risks a real complication. This integrated view of physiology, not just an isolated focus on teeth, is what real dental practice actually requires.` },
      ],
      keyTakeaways: [
        `Digestion begins in the mouth with mechanical breakdown and salivary enzymes — dental health measurably affects nutrition, not just appearance.`,
        `The mouth and jaw's dense nerve supply (including the trigeminal nerve) is why effective pain management and anesthesia are core dental skills.`,
        `Healthy circulation is essential for healing after dental procedures, which is why systemic conditions like diabetes directly affect dental treatment planning.`,
        `Real dental practice requires an integrated view of a patient's whole physiology and health history, not an isolated focus on the mouth alone.`,
      ],
    },
    video: { ytId: '9fxm85Fy4sQ', title: 'Circulatory & Respiratory Systems: Crash Course Biology #27', channel: 'Crash Course' },
  },
  de2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why chemistry underlies dental materials science`, body: `A dentist works with chemistry constantly and concretely — composite resin fillings, dental cements, whitening agents, and enamel itself are all chemistry in action. This lesson covers general chemistry fundamentals with an eye toward the materials a dentist actually handles.` },
        { heading: `Atoms, bonding, and dental materials`, body: `An element's identity comes from its number of protons, and atoms bond to become more stable — ionic bonds through electron transfer, covalent bonds through electron sharing. Tooth enamel is largely made of hydroxyapatite, a mineral compound held together by ionic bonds between calcium, phosphate, and hydroxide ions — understanding this bonding is understanding, at a molecular level, exactly what makes enamel so hard and what makes it vulnerable to acid.` },
        { heading: `How a filling actually bonds to a tooth`, body: `Modern composite resin fillings work through a chemical bonding process — an etching step that roughens the enamel surface at a microscopic level, followed by a bonding agent that chemically links the resin to that surface. Understanding this as a real chemical bonding process, not just a mechanical one, is what explains why the surface preparation step matters so much for how long a filling actually lasts.` },
        { heading: `Reactions and equilibrium in the mouth`, body: `A balanced chemical equation confirms that atoms are conserved in a reaction, and many biologically important reactions — including the constant demineralization and remineralization of enamel — exist in a dynamic equilibrium. The mouth's chemical environment is never static; it's a continuous back-and-forth reaction system, and dental health is largely about which direction that equilibrium tips.` },
        { heading: `Chemistry as the practical foundation of dental materials`, body: `From understanding why certain foods and drinks are harder on enamel than others to evaluating a new dental material's durability, nearly every practical judgment a dentist makes rests on this chemistry foundation. Building real comfort with it now is building the actual material science this career runs on.` },
      ],
      keyTakeaways: [
        `An element's identity comes from its number of protons, and ionic bonding (calcium, phosphate, hydroxide) is what makes tooth enamel hard.`,
        `Modern composite fillings bond to a tooth through a real chemical bonding process — etching plus a bonding agent — not just mechanical attachment.`,
        `Enamel exists in a constant chemical equilibrium of demineralization and remineralization, and dental health depends on which direction that equilibrium tips.`,
        `Chemistry fundamentals are the direct, practical foundation of dental materials science, not abstract background knowledge.`,
      ],
    },
    video: { ytId: 'FSyAehMdpyI', title: 'The Nucleus: Crash Course Chemistry #1', channel: 'Crash Course' },
  },
  de2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why this review matters for dental materials work`, body: `AP Chemistry pushes general chemistry to a level of precision that maps directly onto dental materials work — mixing a dental cement or composite to the exact right proportions, understanding why a specific bonding agent works the way it does. This lesson reviews the mole and stoichiometry, atomic structure, and bonding types with that application in mind.` },
        { heading: `The mole and stoichiometry`, body: `A mole is a fixed quantity — 6.022 × 10²³ particles — letting chemists count atoms and molecules indirectly by weighing them. Stoichiometry uses a balanced equation's ratios to predict exactly how much of one substance reacts with or produces another. Many dental materials — cements, composites, whitening agents — are mixed from multiple components in specific proportions, and that mixing is a direct, hands-on application of stoichiometric reasoning.` },
        { heading: `Atomic structure at the AP level`, body: `Beyond protons, neutrons, and electrons, AP-level atomic structure involves quantum numbers describing an electron's energy level and orbital shape, and rules determining how electrons fill those orbitals. Electron configuration directly determines how an atom bonds — the mechanistic explanation for why certain elements (like fluoride) interact with enamel the way they do.` },
        { heading: `Bonding types and dental material properties`, body: `Ionic bonds tend to produce hard, high-melting-point solids — like the hydroxyapatite in enamel. Covalent bonds produce molecules with much more varied properties depending on structure — like the resin polymers in a composite filling. Recognizing which bonding type a material has lets you predict its hardness, durability, and how it will respond to the mouth's chemical environment over time.` },
        { heading: `Precision as a dental professional standard`, body: `Mixing a dental material incorrectly — even slightly off-ratio — can mean a restoration that fails prematurely or bonds poorly. The habit of precise, rule-based chemical reasoning built through content like this is exactly the professional standard dental materials work actually demands.` },
      ],
      keyTakeaways: [
        `The mole and stoichiometry are the same math behind mixing dental cements and composites to their correct proportions.`,
        `Quantum numbers and electron configuration describe exactly how electrons are arranged, determining an atom's chemical behavior.`,
        `Ionic bonding produces enamel's hardness; covalent bonding (resin polymers) gives composite materials their varied, tunable properties.`,
        `Precise, rule-based chemical reasoning is the actual professional standard behind mixing dental materials correctly.`,
      ],
    },
    video: { ytId: 'UL1jmJaUkaQ', title: 'Stoichiometry: Chemistry for Massive Creatures - Crash Course Chemistry #6', channel: 'Crash Course' },
  },
  de2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why acid-base chemistry is the single most important chemistry topic in dentistry`, body: `If there's one chemistry concept a dentist applies more than any other, it's acid-base chemistry — because tooth decay is, fundamentally, an acid-base problem playing out on a mineral surface. This lesson covers the pH scale and acid-base reactions with that direct application front and center.` },
        { heading: `The pH scale and enamel's critical threshold`, body: `The pH scale measures how acidic or basic a solution is, running from 0 (strongly acidic) to 14 (strongly basic), with 7 as neutral, and it's logarithmic — each whole step represents a tenfold change in acidity. Tooth enamel begins to demineralize — literally starts dissolving at a mineral level — once the surrounding pH drops below approximately 5.5, a threshold known as the "critical pH." Understanding this single number is understanding the chemical basis of nearly every cavity that's ever formed.` },
        { heading: `How acids from food, drink, and bacteria drive decay`, body: `Sugary and starchy foods feed oral bacteria, which metabolize them and produce acid as a byproduct — directly lowering the pH in that immediate area of the mouth below the critical threshold. Acidic foods and drinks (citrus, soda) can push pH below that threshold even more directly, without any bacterial involvement at all. Either way, the mechanism is the same: pH drops below 5.5, and enamel's mineral structure begins to break down.` },
        { heading: `Fluoride, saliva, and shifting the equilibrium back`, body: `Saliva naturally works to neutralize acid and supply the calcium and phosphate ions needed to remineralize enamel — pushing the chemical equilibrium back in the tooth's favor after an acid exposure. Fluoride strengthens this process further, forming a more acid-resistant version of the enamel mineral. Both work by shifting the same underlying demineralization/remineralization equilibrium, not by some entirely separate mechanism.` },
        { heading: `Why this is the conceptual center of preventive dentistry`, body: `Nearly every piece of dental health advice — brush after eating, limit frequent snacking, use fluoride toothpaste, avoid sipping acidic drinks slowly over a long time — traces back to managing this single acid-base equilibrium. Understanding the chemistry directly is what turns "just good dental hygiene" into something a future dentist can actually explain and reason about with a patient.` },
      ],
      keyTakeaways: [
        `The pH scale is logarithmic, and tooth enamel begins to demineralize once surrounding pH drops below approximately 5.5, the "critical pH."`,
        `Bacteria metabolizing sugar, and acidic foods/drinks directly, both lower oral pH below that critical threshold, driving cavity formation.`,
        `Saliva and fluoride both work by shifting the same demineralization/remineralization chemical equilibrium back in the tooth's favor.`,
        `Nearly all preventive dental advice traces back to managing this single acid-base equilibrium in the mouth.`,
      ],
    },
    // The pre-existing raw link (eB1qG5EEDk0) does not resolve to anything indexed via
    // WebSearch — no verification record possible. Swapped to a confirmed alternative.
    video: { ytId: 'ANi709MYnWg', title: 'Acid-Base Reactions in Solution: Crash Course Chemistry #8', channel: 'Crash Course' },
  },
  de3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why psychology matters especially for dentistry`, body: `Dental anxiety is genuinely common — surveys consistently find a meaningful share of patients delay or avoid dental care specifically because of fear or past negative experiences. That makes patient psychology not a soft add-on for this career, but a direct, practical factor in whether a patient shows up for care at all, and how well a procedure goes once they do.` },
        { heading: `Why dental anxiety is so common`, body: `Dental anxiety often traces back to a specific bad past experience, fear of pain, or a sense of losing control while lying back in a chair with someone working in your mouth — a uniquely vulnerable position compared to most other medical interactions. Recognizing these specific sources, rather than treating anxiety as an irrational inconvenience, is what lets a dentist actually address it rather than just push through it.` },
        { heading: `Communicating clearly with a nervous patient`, body: `Explaining what's about to happen, step by step, before it happens — sometimes called "tell-show-do" — measurably reduces anxiety compared to a procedure that starts without warning. Checking in during a procedure, establishing a simple signal a patient can use if they need a pause, and explaining sensations honestly (pressure vs. pain) rather than downplaying them all build real trust rather than eroding it.` },
        { heading: `Trust built over repeat visits`, body: `Unlike many health careers built around single, acute encounters, dentistry is largely a relationship of repeat visits over years — the same patient, the same provider, checkup after checkup. That structure means trust compounds (or erodes) over time in a way that's especially central to this specific career, and a single poorly-handled anxious visit can affect a patient's relationship with dental care for years afterward.` },
        { heading: `Why this matters starting now`, body: `You don't need patients to start building this skill. Practicing clear, step-by-step explanations of something you understand well to someone who's nervous about it, and getting comfortable checking in on how someone's actually feeling mid-task, is direct practice for exactly the communication pattern dentistry depends on.` },
      ],
      keyTakeaways: [
        `Dental anxiety is genuinely common and is a direct, practical factor in patient care, not just a soft consideration.`,
        `"Tell-show-do" — explaining a step before it happens — measurably reduces patient anxiety compared to an unexplained procedure.`,
        `Dentistry is built on repeat visits over years, which makes trust-building especially central compared to many other health careers.`,
        `Communication skill for dentistry can be practiced now, well before ever working with a real patient.`,
      ],
    },
    video: { ytId: 'vo4pMVb0R6M', title: 'Intro to Psychology: Crash Course Psychology #1', channel: 'Crash Course' },
  },
  de3l2: {
    readMins: 5,
    article: {
      sections: [
        { heading: `What shadowing a dentist actually shows you`, body: `Dental shadowing is one of the more visually direct kinds of clinical shadowing — you can usually see exactly what procedure is happening and how precisely it's being performed, in a way that's harder to observe in many other specialties. It's exactly the kind of exposure that tells you quickly whether the hands-on, procedural rhythm of dentistry genuinely appeals to you.` },
        { heading: `How to realistically arrange it`, body: `The most realistic path in, as with most clinical shadowing for a minor, is a personal connection — a family dentist, a relative in the field, or a family friend — rather than a cold request to an unfamiliar practice. Independent dental practices, which make up a large share of the field, are often more flexible about accommodating a brief shadowing visit than a large corporate dental group.` },
        { heading: `What to pay attention to`, body: `Beyond the procedures themselves, notice the pacing of a typical day (dentistry often runs on a scheduled-appointment model, different from unpredictable acute-care shifts), how the dentist manages patient anxiety in real time, and how much of the practice's business side (scheduling, staffing, equipment) the dentist seems to be involved in — a preview of what practice ownership, common in this field, actually looks like day to day.` },
        { heading: `Confidentiality and professionalism`, body: `The same hard confidentiality rule applies here as any clinical setting — no discussing identifiable patient details outside the practice, ever, including on social media. Dress professionally, arrive on time, and treat the day as a guest in someone else's practice.` },
        { heading: `Turning it into a credible record`, body: `Log the date, setting, and your own specific reflections — what procedures you observed, what surprised you about the pacing or patient interactions — in your Portfolio's Clinical Hours section right after each shadowing day. Building this record consistently is what will eventually support a genuinely well-informed dental school application.` },
      ],
      keyTakeaways: [
        `Dental shadowing offers an unusually direct visual window into hands-on, procedural work, useful for quickly gauging real interest in the field.`,
        `A personal connection is the realistic path in, and independent practices are often more flexible than large corporate dental groups.`,
        `Watching the practice's scheduled-appointment pacing and business side is a preview of what dental practice ownership actually involves.`,
        `Confidentiality is a hard rule, and logging specific reflections right after each shadowing day builds a genuinely credible record.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l2, nur3l2):
    // no single canonical YouTube video exists for dental-specific shadowing logistics.
  },
  de3l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `What the DAT actually tests`, body: `The DAT (Dental Admission Test) is the standardized test almost all US dental schools require, and it's notably broader than a pure science test — it includes sections on biology and chemistry, but also perceptual ability (mentally manipulating and visualizing 3D shapes) and reading comprehension. The perceptual ability section exists specifically because it correlates with the spatial reasoning dental procedural work actually demands.` },
        { heading: `Why manual dexterity gets specifically screened for`, body: `Dentistry is intensely hands-on, precise work in a small space, and dental programs evaluate manual dexterity directly — sometimes through the DAT's perceptual ability section, sometimes through dedicated hands-on testing stations during an interview, like carving a specific shape from a bar of soap. This isn't a formality; fine motor precision is a genuine, non-negotiable requirement of the actual work.` },
        { heading: `DDS vs. DMD: same degree, different name`, body: `Doctor of Dental Surgery (DDS) and Doctor of Dental Medicine (DMD) are functionally identical degrees — the difference is purely which name a specific dental school historically chose to use. Neither degree name confers different privileges or training; it's worth knowing so you're not confused seeing both across different school's program names.` },
        { heading: `What else counts toward manual/hands-on evidence`, body: `Since dental programs specifically value demonstrated fine motor skill, activities like playing a musical instrument, drawing or sculpting art, or detailed craft work are all genuinely relevant transferable evidence — not just clinical hours. Mentioning this kind of background, alongside real dental shadowing, rounds out a well-supported application.` },
        { heading: `The entrepreneurial dimension`, body: `Compared to most other health careers, a notably higher share of dentists eventually own or co-own their own practice — meaning dental school, for many students, is also implicitly a preparation for eventually running a small business. Being aware of this dimension now, even informally, is useful context that most other health-career pathways don't carry to the same degree.` },
      ],
      keyTakeaways: [
        `The DAT tests biology and chemistry alongside perceptual ability (3D spatial reasoning) and reading comprehension, reflecting the field's actual demands.`,
        `Manual dexterity is specifically and directly evaluated by dental programs, since fine motor precision is a genuine requirement of the work.`,
        `DDS and DMD are functionally identical degrees — the difference is purely the individual dental school's naming choice.`,
        `Dentistry carries an unusually high rate of eventual practice ownership compared to other health careers, an entrepreneurial dimension worth being aware of.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l3, nur3l3):
    // no single canonical YouTube video exists for "what dental programs look for."
  },
};
