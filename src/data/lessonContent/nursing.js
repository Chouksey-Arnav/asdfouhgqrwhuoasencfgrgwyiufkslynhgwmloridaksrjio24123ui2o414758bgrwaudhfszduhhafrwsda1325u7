// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — Nursing (RN/BSN) pathway. Original articles + a
// curated, properly-embedded YouTube video per lesson. Keyed by lesson id (see
// PATHS.nursing in constants.js). Rendered by the LessonPlayer (App.jsx) as
// Overview -> Article -> Video -> Quiz -> Complete.
//
// Video verification: this environment's network policy blocks direct access
// to youtube.com (confirmed via a blocked oEmbed/WebFetch request — see the
// Learning Pathway completion plan, Phase 3 step 1), so every video id below
// was instead verified via WebSearch, matching each id against its claimed
// title and, where reused from another lesson, against the fact that it's
// already shipped and playing correctly elsewhere in this app.
// ─────────────────────────────────────────────────────────────────────────────

export const NURSING_CONTENT = {
  nur1l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why anatomy and physiology are a nurse's working language`, body: `If a physician's job is largely diagnostic reasoning, a nurse's job is largely continuous assessment — and both depend on the exact same foundation: knowing what the body's parts are (anatomy) and how they actually work (physiology). You'll use this vocabulary in nearly every shift, not as background trivia but as the literal language of a handoff report, a chart note, or a quick conversation with a physician about a patient who's changing in front of you. Nursing programs assume this fluency starting day one, which is exactly why it's the foundation unit of this pathway.` },
        { heading: `Anatomy vs. physiology`, body: `Anatomy is structure — what the body's parts are and how they're arranged. Physiology is function — how those parts actually work, individually and together, to keep a patient alive. A nurse checking a peripheral IV site needs anatomy (where the vein runs, what's nearby) and physiology (why that vein is a viable access point, what a phlebitis reaction looks like). The two are never really separate in clinical practice, even though they're taught as separate topics — you're always reasoning about structure and function at the same time.` },
        { heading: `Homeostasis and the feedback loops you'll monitor constantly`, body: `Homeostasis is the body's drive to keep its internal environment stable — temperature, blood pressure, blood sugar, fluid balance — despite whatever is happening to the patient. It mostly works through negative feedback loops: a sensor detects a deviation, a control center compares it to a set point, and an effector responds to correct it. Vital signs are, at their core, a nurse's window into how well a patient's homeostatic systems are holding — a rising heart rate compensating for blood loss, or shivering compensating for a dropping core temperature, are feedback loops playing out in real time at the bedside.` },
        { heading: `A tour of the major organ systems`, body: `The circulatory system moves blood, oxygen, and nutrients — and its pressure and rate are two of your five vital signs. The respiratory system handles gas exchange, tracked directly via respiratory rate and pulse oximetry. The nervous system coordinates fast signals and is assessed through neuro checks; the endocrine system handles slower hormonal regulation, most visibly in blood glucose management. The digestive and excretory systems handle intake and output — literally tracked on an intake/output sheet on most inpatient units. None of these work in isolation, and neither does your assessment of them.` },
        { heading: `Why this is the foundation of every nursing assessment`, body: `A head-to-toe assessment — the structured exam nurses perform every shift — is really just anatomy and physiology applied system by system: look, listen, and reason about whether each system is functioning the way it should. Getting genuinely comfortable with this material now, rather than memorizing it just well enough to pass a test, is what makes that assessment feel like pattern recognition instead of a checklist you're guessing your way through later in clinical rotations.` },
      ],
      keyTakeaways: [
        `Anatomy is structure and physiology is function — nursing assessment constantly requires reasoning about both together, not separately.`,
        `Homeostasis (the body's drive to keep its internal environment stable via feedback loops) is the concept underneath every vital sign a nurse takes.`,
        `The major organ systems map directly onto specific nursing assessments — circulatory/respiratory to vital signs, nervous to neuro checks, digestive/excretory to intake and output.`,
        `A head-to-toe assessment is applied anatomy and physiology, system by system — real fluency here turns assessment into pattern recognition instead of guesswork.`,
      ],
    },
    video: { ytId: 'uBGl2BujkPQ', title: 'Introduction to Anatomy & Physiology: Crash Course A&P #1', channel: 'Crash Course' },
  },
  nur1l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why the nervous system gets its own nursing lesson`, body: `Few systems get assessed as directly, as often, and by nursing staff specifically as the nervous system. A neuro check — pupil response, level of consciousness, grip strength, orientation to person/place/time — is often performed by a nurse independently, without a physician present, precisely because it's fast, doesn't require special equipment, and can catch a life-threatening change (a stroke, a bleed, rising intracranial pressure) before it shows up anywhere else. Understanding how the nervous system actually works is what turns that checklist into something you can reason about.` },
        { heading: `Central vs. peripheral, and how neurons actually signal`, body: `The central nervous system (brain and spinal cord) is the control center; the peripheral nervous system is every nerve branching out from it to the rest of the body. Neurons communicate through electrical signals along their length and chemical signals (neurotransmitters) across the tiny gap to the next neuron, called a synapse. This two-part signaling — fast electrical conduction, precise chemical handoff — is why nerve damage or a neurotransmitter imbalance can disrupt function so specifically: damage a particular pathway, and you lose a particular function, while everything else keeps working normally.` },
        { heading: `What a neuro check is actually testing`, body: `Pupil response (equal, round, reactive to light) tests cranial nerve function and can flag increased pressure inside the skull. Level of consciousness and orientation test higher cortical function. Grip strength and movement on both sides test motor pathways, and asymmetry between the left and right side of the body is one of the most reliable signs of a stroke. None of these are arbitrary — each one is checking a different, specific piece of nervous system function, which is why a nurse trained in the underlying physiology can catch subtle changes a checklist alone would miss.` },
        { heading: `Nerve signaling and pain management`, body: `Pain is itself a nervous system signal — specialized nerve fibers (nociceptors) detect tissue damage and transmit that signal toward the brain, where it's interpreted as pain. This matters clinically because pain management isn't just about administering a medication; it's about understanding where in that signaling pathway a given intervention acts. Nurses are usually the ones administering pain medication, reassessing its effect, and deciding whether to escalate — all of which depends on understanding pain as a physiological signal, not just a subjective complaint to note down.` },
        { heading: `Why this depth matters before your first clinical rotation`, body: `A neuro check performed by someone who understands the underlying nervous system anatomy catches things a rote checklist misses — a slightly asymmetric pupil, a subtly different quality of confusion. This is exactly the kind of clinical judgment nursing programs are trying to build, and it starts with genuinely understanding the system you're assessing, not memorizing the steps of the exam in isolation.` },
      ],
      keyTakeaways: [
        `The central nervous system (brain, spinal cord) is the control center; the peripheral nervous system carries signals to and from the rest of the body.`,
        `Neurons signal electrically along their length and chemically (via neurotransmitters) across synapses — which is why damage to one pathway can affect one specific function.`,
        `A nursing neuro check (pupils, consciousness, grip strength, orientation) tests several distinct nervous system functions at once, and asymmetry is a key stroke warning sign.`,
        `Pain is a nervous system signal detected by nociceptors — understanding that pathway is what makes pain management a clinical skill, not just medication administration.`,
      ],
    },
    // Verified 2026-07-14 via WebSearch (youtube.com itself is blocked by this environment's
    // network policy — direct oEmbed/WebFetch confirmed unreachable): confirmed to exist,
    // titled "The Nervous System, Part 1: Crash Course A&P #8".
    video: { ytId: 'qPix_X-9t7E', title: 'The Nervous System, Part 1: Crash Course Anatomy & Physiology #8', channel: 'Crash Course' },
  },
  nur1l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why respiratory status is a nurse's earliest warning system`, body: `Ask any experienced nurse which vital sign changes first when a patient is starting to decline, and a huge share will say respiratory rate — often well before blood pressure or heart rate visibly shift. That makes the respiratory system one of the highest-yield things to genuinely understand in this pathway: it's not just a system you'll be tested on, it's the one most likely to give you the earliest honest signal that something is wrong.` },
        { heading: `How gas exchange actually works`, body: `Air travels down through the trachea and bronchi into the lungs, ending in millions of tiny air sacs called alveoli, each wrapped in capillaries. Oxygen diffuses from the air in the alveoli into the blood, and carbon dioxide diffuses the opposite direction to be exhaled — a passive process driven by concentration differences, not active pumping. A pulse oximeter, the clip-on device you'll use on nearly every patient, estimates the percentage of hemoglobin carrying oxygen (SpO2) by shining light through a fingertip or earlobe — it's a direct, continuous window into how well this gas-exchange process is working.` },
        { heading: `Normal vs. abnormal breathing patterns`, body: `Normal adult respiratory rate sits roughly between 12 and 20 breaths per minute, quiet and regular. Tachypnea (too fast) can signal pain, anxiety, fever, or the body compensating for low oxygen or an acid-base imbalance. Bradypnea (too slow) can signal opioid overdose, a neurological problem, or extreme fatigue. Labored breathing — using accessory neck and shoulder muscles, nostril flaring, retractions between the ribs — signals the body is working much harder than normal just to breathe, and is never something to wait and watch on its own.` },
        { heading: `Why a nurse tracks respiratory status so closely`, body: `Respiratory changes often precede a full clinical decline because the respiratory system is one of the body's first and fastest compensation mechanisms — before blood pressure drops or heart rate climbs dramatically, the body will often try to fix a problem by breathing faster or differently first. This is exactly why respiratory rate, though it can feel like the "easiest" vital sign to skip counting carefully, is one of the most clinically valuable ones a nurse takes.` },
        { heading: `What this means for your future practice`, body: `Real fluency with normal versus abnormal breathing patterns — not just memorized number ranges, but understanding why a pattern looks the way it does — is what lets a nurse catch a subtle, early change instead of only noticing once a patient is in obvious distress. That difference, applied consistently across a career, is one of the most direct ways nursing actually saves lives day to day.` },
      ],
      keyTakeaways: [
        `Gas exchange happens passively across the alveoli — oxygen diffuses into blood, carbon dioxide diffuses out — and a pulse oximeter measures how well that process is working.`,
        `Normal adult respiratory rate is roughly 12–20 breaths per minute; tachypnea, bradypnea, and labored breathing each point toward different underlying problems.`,
        `Respiratory changes often show up before other vital signs shift, making respiratory rate one of the earliest honest warning signs of clinical decline.`,
        `Genuinely understanding why a breathing pattern looks abnormal — not just memorizing ranges — is what lets a nurse catch a problem early instead of late.`,
      ],
    },
    // Verified 2026-07-14 via WebSearch (youtube.com itself is blocked by this environment's
    // network policy — direct oEmbed/WebFetch confirmed unreachable): confirmed to exist,
    // titled "Respiratory System, Part 1: Crash Course Anatomy & Physiology #31".
    video: { ytId: 'bHZsvBdUC2I', title: 'Respiratory System, Part 1: Crash Course Anatomy & Physiology #31', channel: 'Crash Course' },
  },
  nur2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why chemistry matters for a hands-on, patient-facing career`, body: `It's tempting to think chemistry is more relevant to physicians or pharmacists than to nurses, but nurses handle chemistry directly, every shift: hanging IV fluids with specific electrolyte concentrations, monitoring lab values that are fundamentally chemistry measurements, and recognizing when a patient's chemistry is drifting dangerously out of range. This lesson covers the fundamentals — atomic structure, bonding, and solutions — with a direct eye toward how they show up in real nursing practice.` },
        { heading: `Atoms, bonding, and why it matters for IV fluids`, body: `An element's identity comes from its number of protons, and atoms bond to become more stable — ionic bonds through electron transfer (forming charged ions like sodium, Na⁺, and chloride, Cl⁻), covalent bonds through electron sharing. Normal saline, one of the most commonly hung IV fluids, is literally a solution of sodium and chloride ions in water at a concentration close to the body's own — understanding ionic bonding is understanding, at a molecular level, exactly what you're infusing into a patient's bloodstream.` },
        { heading: `Concentration and dilution`, body: `Concentration describes how much of a substance is dissolved in a given volume of solution, and it's the exact concept behind every IV fluid label (like "0.9% sodium chloride") and most medication preparation. Dilution — adding more solvent to lower a concentration — is a calculation nurses perform routinely, whether reconstituting a powdered medication or preparing an IV push drug to the correct strength. A concentration or dilution error isn't an abstract math mistake; it's one of the most common categories of real medication error, which is exactly why this content isn't optional.` },
        { heading: `Electrolyte balance: chemistry you'll monitor constantly`, body: `Sodium, potassium, calcium, and magnesium are all ions your body needs within a narrow concentration range to function — nerve signaling, muscle contraction (including the heart), and fluid balance all depend on it. A basic metabolic panel, one of the most frequently ordered lab tests, is essentially a snapshot of a patient's electrolyte chemistry. A dangerously high or low potassium level, for instance, can directly cause a life-threatening heart rhythm — which is exactly why nurses are trained to recognize abnormal electrolyte values as an urgent, not routine, finding.` },
        { heading: `The throughline to daily nursing practice`, body: `Nearly every IV fluid order, every lab value review, and every medication calculation a nurse performs rests on this same chemistry foundation — bonding, concentration, and solutions. Building real comfort with it now means those tasks feel like applying a framework you understand, rather than memorized steps you're following without knowing why they matter.` },
      ],
      keyTakeaways: [
        `Ionic bonds (like sodium and chloride in IV fluids) form through electron transfer, and understanding this is understanding what you're actually infusing into a patient.`,
        `Concentration and dilution are the core math behind IV fluid orders and medication preparation — errors here are a leading real-world category of medication mistakes.`,
        `Electrolytes (sodium, potassium, calcium, magnesium) must stay within a narrow range for nerve, muscle, and heart function, and a basic metabolic panel measures exactly this.`,
        `Chemistry fundamentals aren't abstract for nursing — they're the direct basis for IV fluids, lab value interpretation, and medication dosing performed every single shift.`,
      ],
    },
    video: { ytId: 'FSyAehMdpyI', title: 'The Nucleus: Crash Course Chemistry #1', channel: 'Crash Course' },
  },
  nur2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why statistics literacy is a bedside skill, not just a classroom one`, body: `Nurses read numbers constantly — vital sign trends, lab values, intake and output totals — and every one of those numbers only means something in context. Statistics literacy is what turns a raw number into a clinical judgment: is this lab value actually concerning, or within normal variation? Is this patient's blood pressure trending in a worrying direction, or bouncing around a stable baseline? This lesson builds exactly that literacy, aimed specifically at how it shows up in nursing practice.` },
        { heading: `Ratios, proportions, and unit conversion`, body: `A huge share of nursing math — dosage calculations, IV drip rates, unit conversions between milligrams and micrograms or pounds and kilograms — is really just ratio and proportion reasoning applied carefully and correctly under time pressure. If a medication is ordered as a specific number of milligrams per kilogram of body weight, calculating the correct dose is a direct proportion problem, and comfort with this math is what keeps that calculation fast and reliable during a busy shift rather than a source of anxiety.` },
        { heading: `Reading a lab value against a reference range`, body: `Every lab value comes with a reference range — the range considered typical for a healthy population — but a value just outside that range isn't automatically an emergency, and a value inside it isn't automatically safe for a specific patient. A hemoglobin level that's "low" for a healthy adult might be entirely expected and stable for a patient with a known chronic condition. Reading lab values well means understanding both the statistical reference range and the specific patient's own trend and baseline, not just checking whether a number is in bold on the printout.` },
        { heading: `Spotting a meaningful trend`, body: `A single vital sign reading is a snapshot; a series of readings over a shift is a trend, and trends are usually more clinically useful than any single number. A blood pressure that's drifted steadily downward over three readings tells a different story than one low reading surrounded by normal ones, even if the most recent number looks identical in both cases. Basic statistical thinking — noticing a real pattern versus normal noise — is exactly the skill that lets a nurse flag a real problem early instead of waiting for a single dramatic number.` },
        { heading: `Why this literacy compounds over a career`, body: `None of this requires being a statistician — it requires being comfortable enough with ratios, reference ranges, and trends that reading a chart feels like following a story instead of decoding a spreadsheet. That comfort is exactly what nursing programs assess early, because it underlies dosage safety, lab interpretation, and early problem detection for an entire career, not just one exam.` },
      ],
      keyTakeaways: [
        `Most nursing dosage math — drip rates, weight-based dosing, unit conversions — is ratio and proportion reasoning applied carefully under time pressure.`,
        `A lab value's reference range describes a healthy population, not necessarily a specific patient — good interpretation needs both the range and the patient's own baseline and trend.`,
        `A trend across multiple readings is usually more clinically meaningful than any single vital sign reading in isolation.`,
        `Statistics literacy for nursing isn't academic — it's the daily skill of reading dosage math, lab values, and vital-sign trends correctly and quickly.`,
      ],
    },
    video: { ytId: 'sxQaBpKfDRk', title: 'What Is Statistics: Crash Course Statistics #1', channel: 'Crash Course' },
  },
  nur2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why algebra, specifically, underlies dosage calculation`, body: `Of all the math nursing programs test early and often, dosage calculation is the one with zero tolerance for error — and at its core, every dosage calculation is an algebra problem: you know some quantities, you don't know one (usually how much of a medication to give), and you solve for it using a formula. This lesson is a fast, deliberately practical review of the algebra skills that formula depends on, not abstract algebra for its own sake.` },
        { heading: `Solving for an unknown variable`, body: `The entire skill of algebra, boiled down, is manipulating an equation to isolate the variable you don't know on one side, using the values you do know. If you know a patient's weight, a drug's recommended dose per kilogram, and the concentration of the medication on hand, dosage calculation is just this same isolate-the-unknown process, applied to a real, safety-critical situation instead of an abstract x. Getting genuinely fast and accurate at this — not just able to do it slowly with a calculator — is what dosage calculation exams and eventually real clinical practice both demand.` },
        { heading: `The dosage calculation formula`, body: `A standard formula nursing programs teach is: Desired dose ÷ Available dose × Quantity = Amount to administer. It looks like a memorized rule, but it's genuinely just algebra — you're solving for the unknown "amount to administer" using the same cross-multiplication and division logic behind any ratio-based equation. Understanding why the formula works, not just memorizing its shape, is what lets you catch your own error if a number gets plugged in wrong, rather than trusting an answer that "looks" right.` },
        { heading: `Dimensional analysis: the safety net`, body: `Dimensional analysis means tracking the units (mg, mL, kg, mcg) all the way through a calculation and confirming they cancel out to leave you with the correct final unit — for instance, milligrams canceling out to leave you with milliliters, the unit you're actually going to draw up in a syringe. If your units don't cancel out cleanly to the unit you expect, that's an immediate signal something in the calculation is wrong, often before you've even finished the arithmetic. This single habit catches an enormous share of real-world dosage errors before they ever reach a patient.` },
        { heading: `Why this is worth mastering now, not cramming later`, body: `Dosage calculation is one of the few nursing-school topics with a hard pass/fail bar — many programs require near-perfect accuracy on dosage exams specifically, separate from your overall course grade, because the real-world stakes of a decimal-point error are genuinely severe. Building real algebraic fluency now, rather than memorizing formula shapes to survive one exam, is what makes that bar feel achievable instead of terrifying.` },
      ],
      keyTakeaways: [
        `Dosage calculation is fundamentally an algebra problem: isolating an unknown quantity using values you already know.`,
        `The desired-over-available dosage formula is cross-multiplication and division applied to a real, safety-critical scenario, not an arbitrary memorized rule.`,
        `Dimensional analysis — tracking units through a calculation until they cancel to the correct final unit — is what catches most dosage errors before they happen.`,
        `Many nursing programs require near-perfect accuracy on dosage exams specifically, which is exactly why real algebraic fluency (not last-minute memorization) matters here.`,
      ],
    },
    // No video for this lesson — no Crash Course episode exists for this specific applied
    // topic (dosage-calculation algebra), and this is the weakest-confidence video match in
    // this pathway per the completion plan's Phase 2 matrix (a general Khan Academy "intro to
    // algebra" video, not nursing-specific); on reviewing the fit against this article's actual
    // scope, it read as too generic to attach here, so per the OMIT-over-guess rule this lesson
    // ships as article + objectives + quiz only.
  },
  nur3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why psychology is a core nursing skill, not a soft extra`, body: `Nursing is one of the most relationship-heavy roles in medicine — you're often the person a patient sees the most, in some of the most frightening moments of their life. How you communicate a plan, respond to fear, or handle a patient who's frustrated or in denial isn't a "nice to have" alongside clinical skill; it's a clinical skill in its own right, and one nursing programs explicitly teach and test.` },
        { heading: `Why fear and anxiety change how information should be delivered`, body: `A frightened or anxious patient processes and retains information differently than a calm one — under stress, people narrow their attention, remember less of what's said, and are more likely to fixate on a single alarming word than absorb a full explanation. Recognizing this isn't about avoiding hard information; it's about delivering it deliberately — checking understanding, repeating key points, and pacing a conversation to what a specific patient can actually take in at that moment, rather than delivering it exactly the same way regardless of their state.` },
        { heading: `Therapeutic communication techniques`, body: `Therapeutic communication is a specific, teachable skill set: open-ended questions that invite a patient to actually explain what's going on rather than yes/no answers, active listening that's visibly attentive (eye contact, not interrupting, reflecting back what you heard), and silence used deliberately to give a patient space to process rather than filling every pause. These aren't personality traits some nurses happen to have — they're trainable techniques, and nursing programs teach and evaluate them directly, often through simulated patient scenarios.` },
        { heading: `Motivation and treatment adherence`, body: `A discharge plan only works if a patient actually follows it, and whether they do is fundamentally a psychology question, not a medical one — health behavior change is hard, and understanding why (competing life priorities, fear, lack of understanding, past bad experiences with the healthcare system) is what lets a nurse address the real barrier instead of just repeating instructions louder. This is exactly why patient education, done well, looks less like reciting information and more like a genuine two-way conversation about what's actually realistic for that patient's life.` },
        { heading: `Why this matters starting now`, body: `You don't need patients to start building this skill. Every time you explain something clearly to someone who's stressed, listen without immediately jumping to a solution, or notice that how you say something changes whether it lands — that's the exact muscle nursing programs and, eventually, real clinical practice will draw on constantly.` },
      ],
      keyTakeaways: [
        `Fear and anxiety measurably change how a patient processes information, which is why delivery, pacing, and confirming understanding matter as much as the content itself.`,
        `Therapeutic communication (open-ended questions, active listening, deliberate silence) is a trainable skill set nursing programs explicitly teach and evaluate.`,
        `Whether a patient follows a care plan is fundamentally a psychology question — understanding the real barrier behind non-adherence is what makes patient education effective.`,
        `Communication skill in nursing is a clinical competency, not a personality trait, and it can be practiced starting well before nursing school.`,
      ],
    },
    video: { ytId: 'vo4pMVb0R6M', title: 'Intro to Psychology: Crash Course Psychology #1', channel: 'Crash Course' },
  },
  nur3l2: {
    readMins: 5,
    article: {
      sections: [
        { heading: `Why hospital volunteering is the highest-value experience at this stage`, body: `Unlike shadowing, which is purely observational, hospital and clinical volunteering gives you an actual, if limited, role — and that hands-on, if small, contribution is exactly the kind of experience nursing programs weight most heavily, since nursing is such a fundamentally hands-on profession. It's also one of the most realistically accessible options for a high schooler, since most hospitals run structured teen-volunteer programs specifically designed for your age group.` },
        { heading: `How to realistically find and apply`, body: `Most hospitals and health systems run a formal junior/teen volunteer program with its own application, usually advertised on the hospital's own website under "volunteer" or "community" — this is a far more reliable path in than a cold call or walk-in request. Community health centers, free clinics, and blood drive organizations (like the Red Cross) also frequently accept teen volunteers and can be a good option if a large hospital system's program has a waitlist or age restriction you don't yet meet.` },
        { heading: `What to expect before you start`, body: `Nearly every hospital volunteer program requires a background check and some form of health screening — often a TB test and proof of standard vaccinations — before your first shift. This isn't unusual or a sign the program is being overly cautious; it's standard practice anywhere volunteers will be present around patients, and building in the time for these steps (which can take a few weeks) is worth planning for well before you want to actually start.` },
        { heading: `What the role actually looks like`, body: `Teen volunteer roles are typically non-clinical: greeting and directing visitors, running non-medical errands between departments, restocking supplies, or providing comfort and company to patients in certain units. It's not glamorous, and it's not meant to simulate being a nurse — but the consistency and professionalism of showing up reliably, week after week, in a real hospital environment is precisely what the role is designed to demonstrate, and precisely what a nursing application reader is looking for.` },
        { heading: `Turning it into a credible, logged record`, body: `Log your date, hours, role, and a brief reflection in your Portfolio's Clinical Hours section after each shift — not vague totals reconstructed later. A volunteer record that's specific, consistent, and logged in real time reads as far more genuine to an admissions reader than a single large number claimed at the end of a year, and it's a habit that will directly serve you again for clinical hours once you're actually in a nursing program.` },
      ],
      keyTakeaways: [
        `Hospital volunteering is more heavily weighted than shadowing for nursing applications, since it demonstrates actual hands-on, sustained involvement, not just observation.`,
        `Most hospitals run a dedicated teen/junior volunteer program with its own application — that's a more reliable path in than a cold request to a department.`,
        `A background check and health screening (often including a TB test and vaccination proof) are standard before starting, and can take a few weeks to complete.`,
        `Logging date, hours, role, and a brief reflection after each shift — not reconstructing a vague total later — is what makes a volunteer record credible.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. ex3l2, phy3l2):
    // no single canonical YouTube video exists for hospital teen-volunteer program logistics.
  },
  nur3l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `ADN vs. BSN: two paths to the same license`, body: `An Associate Degree in Nursing (ADN) typically takes about 2 years at a community college; a Bachelor of Science in Nursing (BSN) typically takes about 4 years at a college or university. Both qualify a graduate to sit for the same licensing exam and become a registered nurse — but a BSN generally opens more doors for career advancement, specialty roles, and graduate study later on, and a growing number of hospitals prefer or require it for new hires. Neither path is "lesser"; they're different tradeoffs between time-to-license and long-term flexibility, and the right choice depends on your own circumstances.` },
        { heading: `What the NCLEX actually is`, body: `The NCLEX (National Council Licensure Examination) is the standardized exam every nursing graduate — from either an ADN or BSN program — must pass to become a licensed RN, regardless of which type of program they attended. It's a computer-adaptive exam that tests clinical judgment and safe practice, not just memorized facts, which is exactly why nursing programs build clinical reasoning skill throughout the curriculum rather than saving it for the end. Passing the NCLEX is the final gate between finishing a nursing program and actually being able to practice.` },
        { heading: `Why hands-on experience matters this early`, body: `Nursing programs consistently value applicants who've already demonstrated comfort with direct, hands-on patient contact — through hospital volunteering, a CNA (Certified Nursing Assistant) role where available to your age group, or similar experience — because nursing is such an intensely hands-on profession that a program wants evidence you've tested and are comfortable with that reality before committing years of coursework toward it.` },
        { heading: `Prerequisite coursework programs expect`, body: `Nearly every nursing program lists anatomy & physiology, chemistry, and statistics as prerequisite or strongly recommended coursework, since they underpin the clinical reasoning and dosage-calculation skills nursing coursework builds on immediately. Strong grades in these specific classes — not just a strong GPA in general — is often what a nursing admissions reader looks at most closely, since it's the most direct evidence you're prepared for the actual academic demands of the program.` },
        { heading: `Holistic admissions, and what to focus on now`, body: `Like most competitive health programs, nursing admissions generally weigh GPA and prerequisite science grades alongside experience and a personal statement, rather than screening on one factor alone. For a high schooler, the highest-leverage moves right now are straightforward: strong grades in the specific science courses nursing programs expect, real and consistent hands-on experience through volunteering, and an honest sense that direct, sustained patient contact is genuinely what you want — not just the most familiar or visible health career.` },
      ],
      keyTakeaways: [
        `An ADN (~2 years) and a BSN (~4 years) both lead to RN licensure via the same NCLEX exam, but a BSN generally offers more long-term career flexibility.`,
        `The NCLEX is a computer-adaptive licensing exam testing clinical judgment, not just memorized facts, required for every nursing graduate regardless of program type.`,
        `Nursing programs specifically value demonstrated comfort with hands-on patient contact — through volunteering, CNA work, or similar — before a student even applies.`,
        `Anatomy & physiology, chemistry, and statistics are near-universal nursing prerequisites, and strong grades in these specific courses matter more than GPA alone.`,
      ],
    },
    // No video for this lesson — matches the established precedent (e.g. phy3l3):
    // no single canonical YouTube video exists for "what nursing programs look for."
  },
};
