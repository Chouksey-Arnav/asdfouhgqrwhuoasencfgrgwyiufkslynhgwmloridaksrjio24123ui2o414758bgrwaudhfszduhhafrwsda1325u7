// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — original articles + a curated, properly-embedded
// YouTube video per lesson, replacing the external Khan Academy links these
// lessons used to point students to. Keyed by lesson id (see PATHS in
// constants.js). Rendered by the LessonPlayer (App.jsx) as Overview -> Article
// -> Video -> Quiz -> Complete.
//
// Only lessons that have been fully migrated off Khan Academy have an entry
// here — currently the Exploring Pre-Health pathway and the Physician (MD/DO)
// pathway. Lessons without an entry fall back to their `url`/`src`/`objectives`
// fields in constants.js inside the LessonPlayer's Article/Video steps.
//
// Video ids were selected from Crash Course (PBS Digital Studios), a
// well-established, freely-embeddable educational channel already used
// elsewhere in this app's video links, and cross-checked against the
// channel's own course pages plus independent third-party transcript/wiki
// sources (this dev environment can't hit youtube.com directly to confirm via
// its oEmbed API — see the same caveat in src/data/elib.js).
// ─────────────────────────────────────────────────────────────────────────────

export const LESSON_CONTENT = {
  ex1l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `What biology actually studies`, body: `Biology is the science of living things, and it spans a huge range of scale — from single molecules inside a cell, up through organisms, all the way to entire ecosystems. What ties all of it together are a handful of unifying themes that show up again and again: living things are built from cells, they pass information to their offspring through DNA, they capture and use energy to stay alive, and they change over generations through evolution. Every other topic in biology — anatomy, genetics, ecology, microbiology — is really just a closer look at one of these themes. Once you have this framework, new biology content stops feeling like a pile of disconnected facts and starts feeling like variations on a small set of ideas.` },
        { heading: `The cell as the basic unit of life`, body: `Cell theory states that all living things are made of one or more cells, and that the cell is the smallest unit that can carry out all the functions of life. Some organisms (like bacteria) are single prokaryotic cells with no nucleus — their DNA just floats in the cytoplasm. Your body, by contrast, is built from trillions of eukaryotic cells, each with a nucleus housing its DNA and specialized organelles doing specific jobs: mitochondria generate energy, ribosomes build proteins, and the cell membrane controls what gets in and out. Almost everything that goes wrong in disease — an infection, a cancer, a genetic disorder — is ultimately something going wrong at the cellular level first.` },
        { heading: `How energy moves through living systems`, body: `Every living thing needs a constant supply of usable energy, and almost all of that energy on Earth traces back to sunlight. Plants and other producers capture light energy through photosynthesis and store it in glucose. Then, through cellular respiration, cells (in plants, animals, and virtually everything else) break that glucose down and use the energy to build ATP — the molecule your cells actually spend to power everything from muscle contraction to nerve signaling to simply keeping your organs running. Photosynthesis and respiration are essentially mirror images of each other, and understanding that relationship is one of the most useful shortcuts in all of intro biology.` },
        { heading: `DNA: the instruction manual`, body: `DNA is a long molecule made of four repeating building blocks (A, T, C, G) whose exact sequence encodes the instructions for building and running an organism. Segments of DNA called genes carry the instructions for specific traits or proteins, and DNA gets copied and passed down every time a cell divides or an organism reproduces — which is how traits get passed from parents to offspring. The fact that DNA is both stable enough to preserve information reliably and flexible enough to occasionally mutate is exactly what makes both heredity and evolution possible at the same time.` },
        { heading: `Why this matters for a health career`, body: `Whichever health career you end up in — physician, nurse, pharmacist, PT, researcher — you'll be reasoning about cells, energy, and genetics constantly, just applied differently. A nurse thinks about cellular oxygen delivery when reading a patient's vitals. A pharmacist thinks about how a drug's molecule interacts with a specific protein. A researcher thinks about how a mutation changes a protein's function. This lesson isn't background trivia — it's the shared vocabulary every one of those conversations is built on.` },
      ],
      keyTakeaways: [
        `All living things are made of cells, and the cell is the smallest unit that can carry out every function of life.`,
        `Photosynthesis and cellular respiration are mirror-image processes that move energy through nearly every living system.`,
        `DNA's sequence encodes the instructions for building and running an organism, and gets copied every time a cell divides.`,
        `These same few themes — cells, energy, information, evolution — underlie every health career, not just research or medicine.`,
      ],
    },
    video: { ytId: 'tZE_fQFK8EY', title: 'Introduction to Biology: Crash Course Biology #1', channel: 'Crash Course' },
  },
  ex1l2: {
    readMins: 7,
    article: {
      sections: [
        { heading: `From basics to AP-level depth`, body: `Once you're comfortable with the fundamentals — cells, energy, DNA — the next step is going one level deeper into the molecular mechanics behind heredity: how DNA actually gets copied, how traits actually get inherited, and where new variation actually comes from. This is the level of detail AP Biology (and eventually intro college biology) expects, and getting comfortable with it now means you're not starting from scratch when that class starts moving fast.` },
        { heading: `DNA replication in brief`, body: `Before a cell divides, it has to copy its entire DNA so each new cell gets a full set of instructions. This process, called DNA replication, is semi-conservative — meaning each new DNA molecule ends up with one original (\"parent\") strand and one brand-new strand. An enzyme called helicase unwinds and separates the two original strands, and another enzyme, DNA polymerase, reads each separated strand and builds a matching new strand alongside it, base by base (A pairs with T, C pairs with G). The result is two DNA molecules that are each identical to the original — a remarkably reliable copying process, though not perfect, which matters for the next section.` },
        { heading: `Genes, alleles, and inheritance`, body: `A gene is a specific segment of DNA that codes for a particular trait, and most genes come in different versions called alleles — for example, different alleles of a gene might produce different eye colors. You inherit one copy of most genes from each parent, and if those two copies (alleles) differ, one may be dominant (its effect shows up) while the other is recessive (its effect is masked unless you have two recessive copies). A Punnett square is just a simple grid for predicting what combinations of alleles — and therefore what traits — offspring are likely to inherit from two parents with known genotypes.` },
        { heading: `Mutations and variation`, body: `DNA replication is extremely accurate, but not flawless — occasionally a base gets copied incorrectly, creating a mutation. Most mutations are neutral or even harmful, but every so often one turns out to be beneficial in a given environment. This is the raw material evolution actually works with: without mutations creating new variation in the first place, natural selection would have nothing new to act on. Mutations are also the reason no two people (identical twins aside) have exactly the same DNA, and why genetic diseases and drug responses can vary meaningfully between individuals.` },
        { heading: `Why this depth pays off before you even take the AP exam`, body: `Building real fluency with replication, inheritance, and mutation now — rather than cramming it right before a test — is exactly the kind of foundation that makes AP Biology, college intro biology, and eventually anything MCAT-adjacent feel like reinforcement instead of a first encounter. This is deliberately the same level of depth pre-med, pre-nursing, and pre-research students all eventually need, regardless of which specific health career you land on.` },
      ],
      keyTakeaways: [
        `DNA replication is semi-conservative: each new DNA molecule keeps one original strand and builds one new one.`,
        `Alleles are different versions of a gene; dominant alleles mask recessive ones when both are present.`,
        `Punnett squares predict the probability of specific trait combinations in offspring based on parental genotypes.`,
        `Mutations are copying errors that create genetic variation — the raw material both evolution and individual differences in drug response rely on.`,
      ],
    },
    video: { ytId: '8kK2zwjRV0M', title: 'DNA Structure and Replication: Crash Course Biology #10', channel: 'Crash Course' },
  },
  ex1l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Anatomy vs. physiology`, body: `Anatomy is the study of structure — what the body's parts are and how they're arranged. Physiology is the study of function — how those parts actually work, individually and together, to keep you alive. The two are inseparable in practice: you can't really understand why the heart's four chambers are shaped and positioned the way they are without understanding what physiological job each one does. Every health career blends both — a nurse needs to know where a vein is (anatomy) and why blood pressure changes the way it does (physiology).` },
        { heading: `Homeostasis: the central theme`, body: `Homeostasis is your body's drive to keep its internal environment stable — temperature, blood sugar, pH, hydration — despite a constantly changing external world. It mostly works through negative feedback loops: a sensor detects a change, a control center compares it to a set point, and an effector responds to push things back toward normal. When you're cold, your body shivers to generate heat; when blood sugar rises after a meal, insulin brings it back down. Nearly every physiological system you'll ever study is, at some level, a mechanism serving this one underlying goal.` },
        { heading: `A whirlwind tour of major systems`, body: `The circulatory system moves blood, oxygen, and nutrients throughout the body. The respiratory system handles gas exchange — oxygen in, carbon dioxide out. The nervous system sends fast electrical signals for control and coordination, while the endocrine system sends slower chemical signals (hormones) for longer-term regulation. The digestive system breaks food down into usable nutrients, and the excretory system filters waste out of the blood. No system works in isolation — they're constantly communicating and depending on each other.` },
        { heading: `How organ systems work together`, body: `Take something as simple as going for a run: your nervous system signals your muscles to contract, your circulatory system speeds up to deliver more oxygen to those muscles, your respiratory system increases its rate to supply that oxygen and clear out extra carbon dioxide, and your endocrine system releases hormones to mobilize energy stores. A single activity recruits nearly every organ system simultaneously — which is exactly why physiology is usually taught system by system but always needs to be understood as one integrated whole.` },
        { heading: `Why physiology is the shared language of every health career`, body: `Whether you become a physician, nurse, PT, or pharmacist, physiology is the common language everyone on a care team uses to describe what's actually happening in a patient's body. A physician orders a treatment based on physiological reasoning, a nurse monitors physiological signs of how a patient is responding, and a PT designs an exercise plan around physiological recovery. Getting comfortable with this material now means you'll be able to actually follow (and eventually contribute to) that conversation.` },
      ],
      keyTakeaways: [
        `Anatomy is structure; physiology is function — and health careers require fluency in both together.`,
        `Homeostasis (keeping the internal environment stable via negative feedback) is the unifying goal behind most physiological systems.`,
        `The body's major systems — circulatory, respiratory, nervous, endocrine, digestive — constantly communicate rather than working in isolation.`,
        `Physiology is the shared vocabulary every health career uses to describe what's happening inside a patient.`,
      ],
    },
    video: { ytId: 'uBGl2BujkPQ', title: 'Introduction to Anatomy & Physiology: Crash Course A&P #1', channel: 'Crash Course' },
  },
  ex2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why medicine needs chemistry`, body: `It's easy to think of chemistry as a subject separate from medicine, but almost everything in healthcare is chemistry applied to the human body. A blood test measures the concentration of specific molecules. A drug works by binding to a specific receptor, a chemical interaction with a specific shape and charge requirement. Even something as basic as why your body needs a stable pH, or how anesthesia actually works, comes down to chemistry. This lesson covers the fundamentals that every deeper health-science topic — pharmacology, biochemistry, physiology — eventually builds on.` },
        { heading: `Atoms and the periodic table`, body: `Every atom has a nucleus (protons and neutrons) surrounded by electrons, and an element's identity is determined entirely by its number of protons. The periodic table organizes elements by their properties, and those properties follow predictable trends: atomic size generally shrinks moving left to right across a period (as nuclear charge increases and pulls electrons in tighter) and grows moving down a group (as additional electron shells are added). Understanding these trends lets you predict a lot about how an element will behave chemically just from its position on the table.` },
        { heading: `How atoms bond`, body: `Atoms bond to become more stable, typically by achieving a full outer electron shell. In ionic bonding, one atom transfers electrons to another, creating oppositely charged ions that attract each other (like sodium and chloride in table salt). In covalent bonding, atoms share electrons instead of transferring them — this is how most of the molecules in your body, including water, are built. Water's particular bonding pattern gives it a slightly charged (polar) shape, which is exactly why it's such an effective solvent for the countless reactions happening inside your cells at any given moment.` },
        { heading: `Reactions and equilibrium`, body: `A chemical reaction transforms reactants into products by breaking and forming bonds, and a balanced chemical equation just confirms that atoms aren't created or destroyed in the process — everything on one side has to be accounted for on the other. Many biologically important reactions are reversible and reach a state of equilibrium, where the forward and reverse reactions happen at the same rate. Your blood's pH buffering system is a real-world example: it constantly shifts a chemical equilibrium to keep your blood's pH in an extremely narrow, life-sustaining range.` },
        { heading: `Chemistry as the language underneath biology`, body: `Biochemistry — the chemistry of living things — is really just regular chemistry applied to biological molecules: proteins, DNA, carbohydrates, lipids. Once you're solid on atomic structure, bonding, and basic reactions, biology topics that seemed abstract (like enzyme function or how a hormone triggers a response) start making a lot more literal, mechanical sense. That's exactly why chemistry fundamentals are considered a prerequisite, not an elective, for essentially every health career path.` },
      ],
      keyTakeaways: [
        `An element's identity comes from its number of protons; the periodic table's layout reflects predictable trends in atomic properties.`,
        `Ionic bonds form through electron transfer; covalent bonds form through electron sharing — most molecules in your body are covalent.`,
        `Balanced equations conserve atoms across a reaction, and many biological reactions exist in a dynamic, adjustable equilibrium.`,
        `Chemistry fundamentals are the mechanical basis for biochemistry, pharmacology, and physiology — not a separate, unrelated subject.`,
      ],
    },
    video: { ytId: 'FSyAehMdpyI', title: 'The Nucleus: Crash Course Chemistry #1', channel: 'Crash Course' },
  },
  ex2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why physics matters in health careers`, body: `Physics might seem like the least "medical" of the sciences, but it shows up constantly in healthcare: X-rays and MRIs are applications of electromagnetic physics, blood pressure and blood flow are fluid dynamics, hearing relies on the physics of sound waves, and physical therapy is essentially applied biomechanics. Even understanding why a cast or brace is shaped a certain way draws on basic mechanics. This lesson covers the physics fundamentals that keep showing up, in slightly different clothing, across nearly every health field.` },
        { heading: `Motion basics`, body: `Speed describes how fast something is moving; velocity adds direction to that (a car going 60 mph north has a different velocity than one going 60 mph south, even with the same speed). Acceleration describes how quickly velocity itself is changing — speeding up, slowing down, or changing direction all count as acceleration. These three ideas are the foundation for describing any kind of movement precisely, whether it's a thrown ball, a heart valve closing, or blood moving through a vessel.` },
        { heading: `Forces and Newton's laws`, body: `Newton's first law says an object in motion stays in motion (and one at rest stays at rest) unless a force acts on it. His second law, F = ma, says the force needed to accelerate an object depends on its mass — a useful idea for understanding everything from how much force a joint experiences during a sprint to how a defibrillator's mechanical design works. His third law says every force has an equal and opposite reaction force, which is literally why walking works: you push backward on the ground, and it pushes you forward.` },
        { heading: `Energy and work`, body: `In physics, work is done whenever a force moves an object over a distance, and energy is the capacity to do that work. The law of conservation of energy says energy can't be created or destroyed, only converted from one form to another — chemical energy in food becomes kinetic energy in your muscles, for example. This single idea underlies an enormous range of biological and clinical topics, from metabolism to how a pacemaker's battery is designed to last.` },
        { heading: `Where physics shows up in the body`, body: `Blood pressure is literally a measure of the force fluid exerts on vessel walls, and blood flow follows the same fluid-dynamics principles as water through a pipe — which is why a narrowed artery (like in atherosclerosis) so dramatically changes flow and pressure. Physical therapists reason constantly in terms of forces, torque, and leverage around joints. Even basic imaging technology depends on physics: X-rays pass through soft tissue but are absorbed by dense bone, which is what creates the image.` },
      ],
      keyTakeaways: [
        `Speed, velocity, and acceleration precisely describe motion — the vocabulary underlying everything from biomechanics to blood flow.`,
        `Newton's three laws explain how forces affect the body, from joint loading during movement to the mechanics of walking itself.`,
        `Energy is conserved, not created or destroyed — the same principle underlying metabolism and medical device design.`,
        `Blood pressure, blood flow, imaging technology, and physical therapy are all direct, everyday applications of basic physics.`,
      ],
    },
    video: { ytId: 'ZM8ECpBuQYE', title: 'Motion in a Straight Line: Crash Course Physics #1', channel: 'Crash Course' },
  },
  ex2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why every health career needs statistics literacy`, body: `Whether you're reading about a new drug's clinical trial results, deciding how much weight to put on a single lab value, or just trying to figure out whether a health headline is overblown, you're relying on statistics literacy. Health careers run on data — comparing treatments, tracking outcomes, identifying risk factors — and being able to read that data critically (rather than just accepting a headline's framing) is a skill that pays off in every single health career, not just research.` },
        { heading: `Describing data`, body: `The mean (average), median (middle value), and mode (most frequent value) each summarize a data set differently, and which one is most useful depends on the data. The mean is sensitive to extreme outliers — a handful of very high values can drag it upward — while the median isn't, which is why household income is usually reported as a median. Spread (how much data varies, often measured by standard deviation) matters just as much as the center: two treatments could have the same average outcome but wildly different consistency.` },
        { heading: `Probability basics`, body: `Probability measures how likely an event is, expressed as a number between 0 (impossible) and 1 (certain). In a health context, this shows up constantly: the probability a screening test correctly flags a disease, the probability a given side effect occurs, the probability a treatment outperforms a placebo purely by chance. Understanding basic probability is what lets you tell the difference between "this happened" and "this was likely to happen anyway even if the treatment did nothing."` },
        { heading: `Why "statistically significant" doesn't mean "big effect"`, body: `A result being statistically significant just means it's unlikely to have occurred by random chance alone — it says nothing about how large or clinically meaningful the effect actually is. A drug trial can find a statistically significant improvement that amounts to a tiny, practically irrelevant difference, especially with a very large sample size. Learning to ask "how big is the effect, not just whether it's real" is one of the most useful critical-thinking habits in all of health science.` },
        { heading: `Correlation isn't causation`, body: `Two things being correlated (moving together) doesn't prove one causes the other — there could be a third factor driving both, or the relationship could be coincidental. Ice cream sales and drowning rates are correlated, for instance, because both rise in summer heat, not because ice cream causes drowning. This distinction matters enormously in health research, where a lot of early findings show correlation and it takes carefully controlled studies to establish actual causation.` },
      ],
      keyTakeaways: [
        `Mean, median, and mode each summarize data differently, and outliers can distort the mean much more than the median.`,
        `Probability measures likelihood on a 0-to-1 scale, and underlies how screening tests and treatment effects are evaluated.`,
        `"Statistically significant" means "unlikely to be chance" — it does not automatically mean "a large or important effect."`,
        `Correlation between two variables never proves that one causes the other; controlled studies are what establish causation.`,
      ],
    },
    video: { ytId: 'sxQaBpKfDRk', title: 'What Is Statistics: Crash Course Statistics #1', channel: 'Crash Course' },
  },
  ex3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `What psychology actually is`, body: `Psychology is the scientific study of the mind and behavior — not just "understanding people" informally, but using the same kind of controlled observation, hypothesis testing, and data analysis used in any other science. It asks questions at every level, from how individual neurons fire to how entire groups of people behave under social pressure. For a health career, psychology isn't a "soft" add-on subject — it's the science of why patients behave the way they do, why they do or don't follow treatment plans, and how to communicate with someone who is scared, in pain, or confused.` },
        { heading: `Major perspectives`, body: `Psychology looks at behavior through several different lenses that complement rather than compete with each other. The biological perspective looks at brain structures, neurotransmitters, and genetics. The cognitive perspective focuses on mental processes like memory, perception, and decision-making. The behavioral perspective focuses on how behavior is shaped by reinforcement and environment. And the humanistic perspective emphasizes personal growth and individual experience. A real understanding of any behavior usually draws on more than one of these at once.` },
        { heading: `Psychology's place in health careers`, body: `Every single patient interaction has a psychological dimension: how you explain a diagnosis affects whether it's understood and believed, how you deliver bad news affects how it's processed, and understanding motivation is often the difference between a treatment plan that gets followed and one that doesn't. Fields as seemingly non-psychological as surgery and pharmacy still depend on understanding patient behavior, informed consent, and communication — psychology isn't reserved for mental-health-specific careers.` },
        { heading: `Nature vs. nurture`, body: `One of psychology's oldest questions is how much of a given trait or behavior comes from genetics (nature) versus environment and experience (nurture). Modern psychology has mostly moved past a strict either/or framing — most traits emerge from a constant interaction between the two, not one winning out over the other. This framing matters clinically too: a patient's health behaviors are shaped by both biology and their life circumstances, and effective care usually has to address both.` },
        { heading: `Why this matters even if you're not going into mental health`, body: `You don't need to become a psychiatrist or therapist for this content to matter. A nurse manages patient anxiety before a procedure. A physician explains a scary diagnosis in a way that's actually heard. A PT keeps a patient motivated through a slow, sometimes discouraging recovery. Every one of those moments is applied psychology, whether or not the job title says so.` },
      ],
      keyTakeaways: [
        `Psychology is the scientific study of mind and behavior, using the same evidence-based methods as any other science.`,
        `Biological, cognitive, behavioral, and humanistic perspectives each explain a different piece of why people behave as they do.`,
        `Effective patient communication, motivation, and treatment adherence are all fundamentally psychological skills, not just clinical ones.`,
        `The nature-vs-nurture debate is really about interaction, not competition — both genetics and environment shape health behavior.`,
      ],
    },
    video: { ytId: 'vo4pMVb0R6M', title: 'Intro to Psychology: Crash Course Psychology #1', channel: 'Crash Course' },
  },
  ex3l2: {
    readMins: 5,
    article: {
      sections: [
        { heading: `What shadowing actually is (and isn't)`, body: `Shadowing means observing a clinician as they go about their normal work — you're not examining patients, making decisions, or touching equipment. It's the most realistic way for a high schooler to see what a health career actually looks like day to day, beyond what TV medical dramas or a job description can tell you: the pacing, the paperwork, the hard conversations, and the parts nobody puts in a brochure. It's observation, not participation, and that distinction matters for how you should behave during it.` },
        { heading: `How to realistically arrange it as a high schooler`, body: `The most realistic path into shadowing at your age is almost always through a personal connection — a family physician, a relative in healthcare, or a family friend — rather than a cold application to a hospital. Hospitals rarely accept unsolicited shadowing requests from minors directly, partly due to liability and patient-privacy concerns, so a parent or guardian is usually involved in setting up the arrangement. If you don't have an obvious connection, it's worth asking your school counselor, teachers, or even your own doctor whether they know someone open to it.` },
        { heading: `What to actually pay attention to`, body: `It's tempting to only notice the dramatic moments, but the most useful thing to observe is the ordinary, repeated rhythm of the job: How does the clinician talk to patients? How do they handle uncertainty or a difficult case? How much of the day is direct patient contact versus documentation and coordination? These are the details that actually tell you whether a career fits your personality and interests, far more than any single dramatic case will.` },
        { heading: `Professionalism and confidentiality`, body: `Whatever you observe about a specific patient stays confidential — no discussing identifiable details with friends, and absolutely nothing on social media. This is a hard boundary, not a suggestion, and it's the reason many shadowing arrangements come with an explicit confidentiality agreement to sign. Dress professionally, show up on time, and treat the day as a guest in someone else's workplace, because in a very real sense, that's exactly what you are.` },
        { heading: `Turning a shadowing day into something you can use later`, body: `Right after a shadowing day, log the date, setting, specialty, and your own reflections in your Portfolio's Clinical Hours section — never patient-identifying details, just your own observations and what you learned. Building this record as you go, rather than trying to reconstruct it months later, is what makes a shadowing history genuinely credible when it eventually matters for an application.` },
      ],
      keyTakeaways: [
        `Shadowing is observation, not participation — you're there to watch and learn, not to practice or make decisions.`,
        `Realistic access as a minor almost always comes through a personal connection with a parent or guardian involved.`,
        `The ordinary, repeated details of a workday reveal more about career fit than any single dramatic moment.`,
        `Confidentiality is a hard rule, not a suggestion — log your own reflections, never identifiable patient details.`,
      ],
    },
    // No video for this lesson — no single canonical, verifiable YouTube video exists
    // for "how to shadow a doctor as a high schooler"; the LessonPlayer skips the
    // video step gracefully when `video` is absent.
  },
  ex3l3: {
    readMins: 5,
    article: {
      sections: [
        { heading: `Why "pre-health" isn't a single track`, body: `"Pre-health" describes a foundation, not a commitment to one specific career. Physician, nurse, PT, pharmacist, and researcher tracks all draw on the same core: strong science coursework, real (age-appropriate) exposure to the field, and an honest sense of what the day-to-day work actually involves. You genuinely don't need to have picked a specific health career yet to make real progress right now — the foundation is shared, and the specific choice can come later.` },
        { heading: `What programs actually screen for at this stage`, body: `At the college-application stage, admissions readers for pre-health-friendly programs are mostly looking for strong science grades, genuine curiosity (not just a resume line), and evidence of sustained interest rather than a single one-off activity. A few months of consistent shadowing or volunteering tells a much stronger story than a two-week trip framed as "healthcare experience." Depth and consistency beat a long list of shallow activities almost every time.` },
        { heading: `The value of staying undeclared a little longer`, body: `It's genuinely fine — often smart — to stay undeclared on a specific health career for a while. Sampling physician-track content, nursing-track content, and research-track content lets you make a much more informed choice later than committing early based on limited information. The diagnostic in this app exists exactly for this reason: to help you sample broadly and re-check your fit as your interests sharpen, not to lock you into a decision on day one.` },
        { heading: `Building a foundation that works no matter which path you pick`, body: `Biology, chemistry, physics, statistics, and basic psychology aren't specific to one health career — they're the shared foundation underneath all of them. Time spent getting genuinely strong in these fundamentals now is never wasted, regardless of which specific pathway you eventually land on. This is exactly why the Exploring Pre-Health pathway is built the way it is: broad enough to keep every door open, rigorous enough that nothing here needs to be relearned later.` },
        { heading: `What to do next`, body: `Keep logging any shadowing, volunteering, or coursework experience as you go. Retake the diagnostic every few months — your answers (and your fit) will shift as you learn more about yourself and about different health careers. And don't feel pressure to have this fully figured out in high school; very few people do, and the ones who claim they did usually revised the plan anyway once they got more real exposure to the field.` },
      ],
      keyTakeaways: [
        `Pre-health is a shared foundation across many careers, not a commitment to one specific path.`,
        `Sustained, consistent experience matters far more to admissions readers than a long list of one-off activities.`,
        `Staying undeclared while you sample different pathways is a legitimate, often smart strategy — not indecision.`,
        `Science fundamentals built now transfer to every health career, so nothing here is wasted regardless of what you choose later.`,
      ],
    },
    // No video for this lesson — same reasoning as ex3l2 above.
  },

  // ── Physician (MD/DO) pathway ───────────────────────────────────────────
  phy1l1: {
    readMins: 7,
    article: {
      sections: [
        { heading: `The organelles that keep a cell running`, body: `Every one of your body's roughly 37 trillion cells is a self-contained, highly organized system, and a physician's-eye view of disease starts with understanding what's actually inside one. The nucleus houses the cell's DNA and acts as its control center, directing which genes get switched on or off. Mitochondria — often called the cell's powerhouses — convert nutrients into ATP, the energy currency every other process in the cell depends on; a cell starved of mitochondrial function (as happens in certain genetic disorders, and in ischemia, when blood flow is cut off) rapidly stops working. Ribosomes, some free-floating and some studded along the endoplasmic reticulum, build proteins from genetic instructions, and the Golgi apparatus packages and ships those proteins to wherever they're needed. None of these structures work in isolation — a cell behaves more like a small, coordinated factory than a bag of loose parts.` },
        { heading: `Mitosis vs. meiosis: two very different kinds of division`, body: `Cells divide for two very different reasons, and the mechanism differs accordingly. Mitosis is how your body grows and repairs itself: one cell duplicates its DNA and splits into two genetically identical daughter cells, exactly what's happening when a wound heals or a child grows taller. Meiosis, by contrast, is reserved for producing gametes (sperm and egg cells) and involves two rounds of division that cut the chromosome number in half while shuffling genetic material through crossing over, producing four genetically distinct cells instead of two identical ones. The distinction matters clinically, not just terminologically — errors during meiosis (like a chromosome failing to separate properly) directly cause conditions like Down syndrome, while errors in mitosis are more closely tied to cancer, where a cell's division control breaks down entirely.` },
        { heading: `Mendelian inheritance and reading a Punnett square`, body: `Gregor Mendel's 19th-century pea-plant experiments established the basic rules of inheritance still taught today: organisms carry two copies (alleles) of most genes, one from each parent, and when those alleles differ, one is often dominant (its trait shows up) while the other is recessive (its trait is masked unless both copies are recessive). A Punnett square is simply a grid for predicting the probability of specific allele combinations in offspring, given the parents' genotypes. Real inheritance is often messier than Mendel's original pea-plant traits — many human traits are polygenic or environmentally influenced — but the dominant/recessive framework is still the starting point for understanding single-gene disorders like cystic fibrosis or sickle cell disease, both inherited in a classic recessive pattern.` },
        { heading: `Why a physician needs to think at the cellular and genetic level`, body: `A physician's diagnostic reasoning constantly drops to this level of detail, even in visits that look purely symptom-based on the surface. A patient's persistent fatigue might trace back to mitochondrial dysfunction. A family history question during an intake exam is really an informal pedigree analysis — an attempt to spot a Mendelian inheritance pattern before ordering genetic testing. An oncologist reasoning about a tumor is, at bottom, reasoning about a population of cells whose mitotic control has failed. None of this requires memorizing genetics trivia for its own sake; it requires being comfortable enough with the underlying logic to apply it fluently to a real patient in front of you.` },
      ],
      keyTakeaways: [
        `The nucleus, mitochondria, ribosomes, and Golgi apparatus each play a distinct, interdependent role in keeping a cell alive and functional.`,
        `Mitosis produces two identical cells for growth and repair; meiosis produces four genetically distinct gametes for reproduction — and errors in each process have very different clinical consequences.`,
        `Punnett squares predict the probability of inherited traits from dominant and recessive alleles, the same logic underlying single-gene disorders like cystic fibrosis and sickle cell disease.`,
        `Physicians apply cellular and genetic reasoning constantly, from family history intake to diagnosing mitochondrial or oncologic disease.`,
      ],
    },
    video: { ytId: 'CBezq1fFUEA', title: 'Heredity: Crash Course Biology #9', channel: 'Crash Course' },
  },
  phy1l2: {
    readMins: 7,
    article: {
      sections: [
        { heading: `Why a physician thinks in systems`, body: `Ask a physician what's wrong with a patient, and the answer almost always involves more than one organ system at once — "shortness of breath" could be a lung problem, a heart problem, an anemia problem, or an anxiety problem, and telling them apart requires fluency across systems, not expertise in just one. This lesson is a working tour of the major systems a physician reasons about daily: circulatory, respiratory, digestive, excretory, nervous, and endocrine — not as isolated units, but as parts that are constantly communicating with each other.` },
        { heading: `Circulatory and respiratory: delivery and gas exchange`, body: `The circulatory system is the body's transport network — the heart pumps blood through a closed loop of arteries, capillaries, and veins, delivering oxygen and nutrients to tissue and carrying away carbon dioxide and waste. The respiratory system handles the gas-exchange half of that job: oxygen diffuses into the blood across the thin walls of the lungs' alveoli, and carbon dioxide diffuses out to be exhaled. These two systems are so tightly linked that a physician can rarely evaluate one without immediately considering the other — a low blood-oxygen reading could point to a lung problem, a circulatory problem, or both.` },
        { heading: `Digestive and excretory: extraction and cleanup`, body: `The digestive system breaks food down into absorbable nutrients — carbohydrates into sugars, proteins into amino acids, fats into fatty acids — largely through enzymes secreted along the GI tract, and absorbs those nutrients primarily through the small intestine's vast surface area. The excretory system, centered on the kidneys, filters the resulting metabolic waste out of the blood and, just as importantly, fine-tunes the body's fluid and electrolyte balance. A physician reading a basic metabolic panel is essentially reading a snapshot of how well this filtering system is keeping the body's internal chemistry in range.` },
        { heading: `Nervous and endocrine: two speeds of signaling`, body: `The nervous system sends fast, precise electrical signals through neurons for immediate control — pulling your hand off a hot stove, coordinating a muscle contraction. The endocrine system sends slower, broader chemical signals through hormones released into the bloodstream, better suited to processes that unfold over minutes to days, like growth, metabolism, or the menstrual cycle. Many conditions physicians manage constantly — diabetes, thyroid disorders, hypertension — are fundamentally endocrine or nervous-system regulation problems, which is why understanding both signaling systems, and where they overlap, is foundational rather than optional.` },
        { heading: `Putting it together: why integration is the real skill`, body: `None of these systems get evaluated in isolation on a real patient. A physician assessing a patient with fatigue is simultaneously asking whether it's circulatory (anemia, poor cardiac output), respiratory (poor oxygenation), endocrine (thyroid dysfunction), or something else entirely — and ruling systems in or out requires knowing how each one actually behaves, not just its name. Building this integrated fluency now, rather than memorizing each system as a disconnected unit, is exactly the skill differential diagnosis will demand later.` },
      ],
      keyTakeaways: [
        `The circulatory and respiratory systems work as a tightly linked delivery-and-gas-exchange pair, which is why physicians rarely evaluate one without the other.`,
        `The digestive system extracts nutrients from food; the excretory system (centered on the kidneys) filters waste and balances fluids and electrolytes.`,
        `The nervous system signals fast and precisely via neurons; the endocrine system signals slower and more broadly via hormones — many common conditions are regulation failures in one or both.`,
        `Real diagnostic reasoning integrates across systems rather than treating each one as an isolated topic.`,
      ],
    },
    video: { ytId: '9fxm85Fy4sQ', title: 'Circulatory & Respiratory Systems: Crash Course Biology #27', channel: 'Crash Course' },
  },
  phy1l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Two layers of defense: innate and adaptive immunity`, body: `Your immune system operates in two layers that work together. Innate immunity is fast and non-specific — physical barriers like skin and mucus, plus general-purpose defenders like macrophages and neutrophils that attack anything recognized as foreign, responding within minutes to hours regardless of what the invader actually is. Adaptive immunity is slower to activate but far more precise: it learns to recognize a specific pathogen's unique markers (antigens) and mounts a tailored response, typically taking days to fully ramp up the first time it encounters something new. Every infection a physician treats involves this same layered response, and how fast and effectively it kicks in is a big part of why some infections resolve on their own and others need medical intervention.` },
        { heading: `Antibodies, antigens, and immune memory`, body: `An antigen is any molecule the immune system recognizes as foreign — typically a protein on the surface of a virus, bacterium, or other pathogen. B cells, a type of white blood cell, respond to a specific antigen by producing antibodies: Y-shaped proteins that bind that exact antigen and either neutralize it directly or flag it for destruction by other immune cells. Critically, some B cells activated during an infection become long-lived memory cells that persist after the infection clears, ready to mount a much faster response if the same pathogen shows up again — this is the entire mechanism behind both natural immunity after an infection and vaccine-induced immunity, which trains the immune system on an antigen without requiring an actual infection first.` },
        { heading: `Fever and inflammation: protective, not malfunctioning`, body: `It's tempting to think of fever and inflammation as something going wrong, but both are deliberate, coordinated immune responses. Inflammation — redness, heat, swelling, pain — results from increased blood flow and immune cell recruitment to a site of infection or injury, and it's what actually delivers immune resources where they're needed. Fever raises the body's core temperature, which slows the replication of many pathogens and enhances certain immune functions; it's a regulated response, not a breakdown of temperature control. A physician's job during a fever isn't automatically to eliminate it, but to figure out what's driving it and whether the underlying cause needs treatment.` },
        { heading: `Homeostasis: the thread connecting all of this`, body: `Homeostasis is the body's constant effort to keep its internal environment — temperature, pH, blood sugar, hydration — within a stable, survivable range, mostly through negative feedback loops that sense a deviation and trigger a correction. The immune system is itself a homeostatic system in a broader sense: it constantly monitors the body for foreign material and internal threats (like early cancer cells) and responds to restore a "normal," healthy internal state. Seeing immunity as a specific application of homeostasis, rather than a completely separate topic, makes both concepts easier to reason about together.` },
        { heading: `Why this matters constantly in clinical practice`, body: `Immune reasoning shows up in nearly every specialty, not just infectious disease — allergies and autoimmune conditions are both, in different ways, immune systems responding inappropriately (over-reacting to a harmless antigen, or attacking the body's own tissue). Understanding the innate/adaptive distinction, how memory works, and why inflammation and fever are protective rather than pathological gives you the vocabulary a physician uses every day, whether treating a common cold, managing a chronic autoimmune disease, or deciding whether a post-surgical fever is expected healing or a sign of infection.` },
      ],
      keyTakeaways: [
        `Innate immunity responds fast and non-specifically; adaptive immunity is slower but targets a pathogen's specific antigens.`,
        `Antibodies are produced by B cells to neutralize specific antigens, and memory cells left over after an infection (or vaccination) enable a much faster response next time.`,
        `Fever and inflammation are deliberate, protective immune responses, not signs that the body's regulation has failed.`,
        `Immunity is a specific application of homeostasis — the body constantly monitoring and correcting toward a stable internal state — and understanding it underlies both infectious disease and autoimmune/allergic conditions.`,
      ],
    },
    video: { ytId: 'GIJK3dwCWCw', title: 'Immune System, Part 1: Crash Course Anatomy & Physiology #45', channel: 'Crash Course' },
  },
  phy2l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why a physician needs organic chemistry, not just general chemistry`, body: `General chemistry gives you the vocabulary — atoms, bonds, reactions — but a huge share of what actually happens in the human body, and in medicine specifically, involves organic chemistry: the chemistry of carbon-based molecules. Every drug a physician prescribes, nearly every molecule your metabolism runs on, and the DNA in every one of your cells are organic molecules. This lesson bridges the two: a fast review of general-chemistry fundamentals, then a first real look at what makes organic chemistry its own subject.` },
        { heading: `Atomic structure and bonding, briefly revisited`, body: `An element's identity comes from its number of protons, and the periodic table's layout reflects predictable trends in atomic size, electronegativity, and reactivity based on that structure. Atoms bond to become more stable: ionic bonds form when electrons transfer from one atom to another, creating oppositely charged ions that attract; covalent bonds form when atoms share electrons instead. Nearly every organic molecule is held together by covalent bonds, part of why organic chemistry has its own distinct rules and patterns — carbon in particular forms four stable covalent bonds, which is exactly what allows it to build the enormous variety of chain, ring, and branched structures organic chemistry is built on.` },
        { heading: `What actually makes a molecule "organic"`, body: `Organic chemistry is, at its core, the study of molecules built around a carbon backbone, usually bonded to hydrogen and often to oxygen, nitrogen, or other elements. Carbon's ability to form long chains and rings while still bonding stably to other atoms gives organic molecules their near-infinite structural diversity — from a two-carbon molecule like ethanol to proteins built from thousands of atoms. This is why organic chemistry, despite the name, isn't about "natural" versus "artificial" — it's a structural classification, and it includes both molecules made by living things and ones synthesized in a lab, including most pharmaceuticals.` },
        { heading: `Functional groups: organic chemistry's real vocabulary`, body: `Rather than memorizing every possible molecule, organic chemistry is mostly learned through functional groups — specific clusters of atoms attached to a carbon backbone that behave predictably no matter what molecule they're part of. An alcohol (-OH), a carboxylic acid (-COOH), a ketone, and an amine (-NH2) each have characteristic chemical behavior, and recognizing them lets you predict roughly how a molecule will react even the first time you see it. This is exactly the skill pharmacology depends on: a drug's functional groups are a huge part of what determines how it dissolves, how it's absorbed, and how it interacts with its target in the body.` },
        { heading: `The throughline to clinical medicine`, body: `Every time a physician reasons about how a drug will be absorbed, metabolized by the liver, or interact with another medication, they're implicitly reasoning about organic chemistry — functional groups, polarity, and molecular shape. Building real comfort with these fundamentals now means pharmacology, when it eventually arrives in a much denser form in medical school, is reinforcement of a familiar framework rather than an entirely new language.` },
      ],
      keyTakeaways: [
        `Organic chemistry is the chemistry of carbon-based molecules, distinguished by carbon's ability to form four stable covalent bonds and build long chains and rings.`,
        `Ionic bonds form through electron transfer; covalent bonds form through electron sharing, and nearly all organic molecules are held together by covalent bonds.`,
        `Functional groups (alcohols, carboxylic acids, ketones, amines) behave predictably regardless of the larger molecule they're attached to, which is how chemists — and pharmacologists — predict a molecule's behavior.`,
        `Nearly every drug and metabolic process a physician deals with is, at the molecular level, organic chemistry in action.`,
      ],
    },
    video: { ytId: 'PmvLB5dIEp8', title: 'What Is Organic Chemistry?: Crash Course Organic Chemistry #1', channel: 'Crash Course' },
  },
  phy2l2: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why this review matters beyond the AP exam`, body: `AP Chemistry pushes general chemistry to a level of precision that turns out to be exactly the level pre-med coursework assumes you already have. This lesson reviews three high-yield areas: the mole and stoichiometry (the math of chemical reactions), atomic structure at the quantum level, and bonding types — the same fundamentals that quietly underpin dosage calculations, lab-result interpretation, and pharmacology later on.` },
        { heading: `The mole and stoichiometry`, body: `A mole is a fixed quantity — 6.022 × 10²³ particles, known as Avogadro's number — that lets chemists count atoms and molecules indirectly, by weighing them. Molar mass connects a substance's mass in grams to the number of moles present, and stoichiometry uses the ratios in a balanced chemical equation to predict exactly how much of one substance reacts with or produces another. This might look like pure math, but it's the same logic behind calculating a medication dose based on a patient's weight, or figuring out how much of a reagent a lab test actually consumes.` },
        { heading: `Atomic structure at the AP level`, body: `Beyond just "protons, neutrons, electrons," AP-level atomic structure involves quantum numbers that describe an electron's energy level, orbital shape, and orientation, plus rules (the Aufbau principle, Hund's rule) that determine how electrons fill those orbitals. Electron configuration — the specific arrangement of electrons around an atom — directly determines how that atom will bond and react, which is why this level of detail isn't just trivia: it's the mechanistic explanation for the periodic trends (reactivity, electronegativity, ionization energy) that predict chemical behavior.` },
        { heading: `Bonding types and their physical signatures`, body: `Ionic bonds (electron transfer) tend to produce hard, high-melting-point solids that conduct electricity when dissolved in water — think table salt. Covalent bonds (electron sharing) produce molecules with much more varied properties depending on their specific structure and polarity. Metallic bonding, found in pure metals, involves a "sea" of shared electrons that explains why metals conduct electricity and heat so well and can be bent without breaking. Recognizing which bonding type a substance has lets you predict its physical behavior — melting point, solubility, conductivity — without having memorized that specific substance before.` },
        { heading: `Precision now pays off later`, body: `Nothing about mole calculations, quantum numbers, or bonding types is unique to medicine, but the habit of precise, rule-based chemical reasoning absolutely is what pre-med coursework, and eventually clinical dosing and lab interpretation, will demand. Getting genuinely fluent with this level of chemistry now — not just familiar enough to pass a test — is what keeps AP Chemistry, general chemistry in college, and biochemistry from each feeling like starting over.` },
      ],
      keyTakeaways: [
        `The mole (6.022 × 10²³ particles) lets chemists convert between mass and particle count, and stoichiometry uses balanced equations to predict reaction quantities — the same math behind dosage calculations.`,
        `Quantum numbers and electron configuration describe exactly how electrons are arranged around an atom, and that arrangement determines an atom's chemical behavior.`,
        `Ionic, covalent, and metallic bonding each produce distinct, predictable physical properties in the substances they form.`,
        `Precise, rule-based chemical reasoning at this level is exactly what pre-med coursework and later clinical chemistry both assume you already have.`,
      ],
    },
    video: { ytId: 'UL1jmJaUkaQ', title: 'Stoichiometry: Chemistry for Massive Creatures - Crash Course Chemistry #6', channel: 'Crash Course' },
  },
  phy2l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `What makes something an acid or a base`, body: `The Brønsted-Lowry definition, the one most relevant to biology and medicine, defines an acid as a proton (H⁺) donor and a base as a proton acceptor. The pH scale measures how acidic or basic a solution is, running from 0 (strongly acidic) to 14 (strongly basic), with 7 as neutral, and it's logarithmic — each whole-number step represents a tenfold change in H⁺ concentration, which is why even a small pH shift can represent a large underlying chemical change.` },
        { heading: `How a titration actually works`, body: `A titration is a technique for finding the exact concentration of an unknown acid or base by slowly adding a solution of known concentration (the titrant) until the reaction is exactly complete — the equivalence point. As the titrant is added, an indicator (a dye that changes color at a specific pH) or a pH meter signals when that point is reached, and simple stoichiometry from there tells you the original unknown concentration. It's one of the most direct, hands-on applications of the mole concept in an entire chemistry course.` },
        { heading: `Reading a titration curve`, body: `Plotting pH against the volume of titrant added produces a titration curve with a characteristic steep jump right at the equivalence point — the more sudden that jump, the stronger the acid and base involved. Weak acid/weak base titrations produce a much gentler curve with a noticeable flat region before the jump, called a buffer region, where added acid or base barely changes the pH at all. Learning to read where the equivalence point and buffer region sit on a curve is a skill that shows up again and again, from AP Chemistry lab reports to, eventually, interpreting how the body resists pH swings.` },
        { heading: `Buffers: how the body keeps its own pH stable`, body: `A buffer solution — a mix of a weak acid and its conjugate base — resists pH changes by absorbing added acid or base without letting the pH swing very far, exactly the flat region seen on a titration curve. Your blood relies on this principle directly: the bicarbonate buffer system keeps blood pH locked in an extremely narrow range (about 7.35–7.45), because even small deviations outside that range are dangerous to cellular function. This is a case where a purely abstract-seeming chemistry concept turns out to be one of the most clinically important ones in the entire course.` },
        { heading: `Why physicians care about acid-base chemistry specifically`, body: `Acid-base balance is one of the most routinely assessed values in medicine — arterial blood gas tests directly measure a patient's blood pH and the underlying respiratory and metabolic factors driving it, and conditions like diabetic ketoacidosis, severe vomiting, or respiratory failure all manifest as identifiable acid-base disturbances. Understanding titration curves and buffer chemistry now builds the exact conceptual foundation that interpreting an arterial blood gas panel will require later — this isn't abstract chemistry, it's a preview of a test physicians order constantly.` },
      ],
      keyTakeaways: [
        `Brønsted-Lowry acids donate protons (H⁺) and bases accept them; pH measures acidity on a logarithmic 0–14 scale.`,
        `A titration finds an unknown solution's concentration by adding a known-concentration titrant until the equivalence point is reached.`,
        `Titration curves show a sharp pH jump at the equivalence point and a flatter buffer region where pH resists change.`,
        `The body's bicarbonate buffer system keeps blood pH in an extremely narrow range, and disruptions to it show up directly on the arterial blood gas tests physicians order routinely.`,
      ],
    },
    video: { ytId: '8Fdt5WnYn1k', title: 'Buffers, the Acid Rain Slayer: Crash Course Chemistry #31', channel: 'Crash Course' },
  },
  phy3l1: {
    readMins: 6,
    article: {
      sections: [
        { heading: `Why ethics isn't a separate subject from clinical skill`, body: `It's tempting to think of medical ethics as an abstract, philosophy-adjacent requirement, separate from the "real" clinical work of diagnosing and treating. In practice, ethical reasoning shows up in nearly every patient encounter: how you explain a diagnosis, how much you involve a patient in a decision, how you handle a case where a patient's wishes and a family's wishes conflict. Physicians who are technically excellent but poor communicators or ethically careless routinely produce worse outcomes than the reverse — this is a core clinical skill, not an add-on.` },
        { heading: `The four pillars of medical ethics`, body: `Modern medical ethics is generally organized around four core principles. Autonomy respects a patient's right to make informed decisions about their own body and care, even when a physician disagrees with the choice. Beneficence means acting in the patient's best interest — actively doing good, not just avoiding harm. Non-maleficence, often summarized as "first, do no harm," means weighing a treatment's risks against its benefits before acting. Justice means distributing care and medical resources fairly, without discrimination. These four principles frequently pull in different directions on a real case, and navigating that tension — not memorizing the definitions — is the actual skill.` },
        { heading: `Informed consent: autonomy in practice`, body: `Informed consent is the practical mechanism through which patient autonomy gets respected: before a treatment or procedure, a physician has to make sure the patient genuinely understands what's being proposed, its risks and benefits, the alternatives (including doing nothing), and that the patient is consenting voluntarily, not under pressure or confusion. This isn't a form to be signed quickly — done well, it's a real conversation, calibrated to what a specific patient can actually absorb and understand, which is exactly why communication skill and ethical practice are inseparable in this context.` },
        { heading: `Why communication is a clinical skill, not a soft skill`, body: `How a diagnosis gets explained materially changes how well it's understood, whether a treatment plan actually gets followed, and how a patient copes with difficult news. Active listening — genuinely hearing a patient's concerns rather than just waiting to speak next — surfaces details that change a diagnosis more often than most people expect. Clear, jargon-free explanation isn't about talking down to a patient; it's about making sure the information a patient needs to make an informed decision has actually been transferred, not just technically stated.` },
        { heading: `Why this matters starting now, not just in medical school`, body: `You don't need a white coat to start building this skill — every conversation where you explain something complicated clearly, listen without interrupting, or navigate a disagreement respectfully is practice for exactly this. Medical schools screen for this deliberately, through interviews and situational-judgment style questions, precisely because ethical reasoning and communication skill are hard to teach quickly later and easy to start building now.` },
      ],
      keyTakeaways: [
        `The four pillars of medical ethics — autonomy, beneficence, non-maleficence, and justice — frequently conflict on real cases, and navigating that tension is the actual skill.`,
        `Informed consent is autonomy put into practice: a patient must genuinely understand a proposed treatment's risks, benefits, and alternatives before consenting.`,
        `How a diagnosis or treatment plan is communicated directly affects whether it's understood and followed — communication is a clinical skill, not a soft extra.`,
        `Ethical reasoning and communication skill can be practiced starting now, and medical schools deliberately screen for both.`,
      ],
    },
    // No video for this lesson — no single canonical, verifiable YouTube video
    // exists for the four-principles medical-ethics framework at the bar this
    // app holds (see the WebSearch cross-verification note at the top of this
    // file); the LessonPlayer skips the video step gracefully when absent.
  },
  phy3l2: {
    readMins: 5,
    article: {
      sections: [
        { heading: `What shadowing a physician specifically looks like`, body: `Shadowing a physician means observing their clinical work directly — sitting in during patient visits (with the patient's permission), watching rounds in a hospital setting, or following along in a clinic or, occasionally, an operating room. Unlike shadowing some other health roles, physician shadowing often exposes you to the full arc of a case: the initial patient conversation, the physical exam, the diagnostic reasoning out loud, and the treatment decision — exactly why it's one of the most information-dense ways to preview the role.` },
        { heading: `Realistic access as a high schooler`, body: `The most realistic route into physician shadowing is almost always a personal connection — a family doctor, a relative in medicine, or a family friend — rather than a cold application to a hospital or private practice. Physicians in private practice or smaller clinics often have more flexibility to host a shadow than a large hospital system, which typically has stricter liability and privacy policies for minors. A parent or guardian is usually involved in arranging it, and it's worth asking your own doctor directly — many are more open to a brief shadowing visit than students assume.` },
        { heading: `Different specialties look completely different day to day`, body: `A single shadowing day tells you a lot about one specialty, but very little about "being a physician" in general — a family medicine clinic, an ER, a surgical rotation, and a psychiatry practice can feel like almost entirely different jobs in terms of pacing, patient interaction style, and decision-making pressure. If you get the opportunity, shadowing in more than one specialty over time, even informally, gives you a much more accurate sense of what parts of medicine actually appeal to you, rather than generalizing from a single, possibly unrepresentative day.` },
        { heading: `What to actually pay attention to`, body: `Beyond the medicine itself, notice how the physician talks to patients, how they handle a diagnosis that isn't straightforward, and how much of the day is spent on direct patient contact versus documentation and administrative work — the last one surprises a lot of students, since charting and paperwork often take up a substantial share of a physician's actual day. These details, not the most dramatic case of the day, are what tell you whether the day-to-day rhythm of the job would actually suit you.` },
        { heading: `Confidentiality and turning it into a credible record`, body: `Everything you observe about a specific patient is confidential — no discussing identifiable details with anyone outside the clinical setting, and never on social media, no exceptions. Log the date, specialty, setting, and your own reflections in your Portfolio's Clinical Hours section right after each shadowing day, never patient-identifying details. Building this record consistently, rather than trying to reconstruct it from memory months later, is what makes a shadowing history read as genuine when it eventually matters for an application.` },
      ],
      keyTakeaways: [
        `Physician shadowing often shows the full arc of a case — patient conversation, exam, diagnostic reasoning, and treatment decision — making it especially information-dense.`,
        `A personal connection, usually arranged with a parent or guardian's help, is the realistic path in for a high schooler; smaller practices often have more flexibility than large hospital systems.`,
        `Different specialties feel like genuinely different jobs day to day, so a single shadowing day generalizes poorly to "being a physician" as a whole.`,
        `Confidentiality is a hard rule, and logging the date, setting, and your own reflections — never patient details — right after each day builds a credible record over time.`,
      ],
    },
    // No video for this lesson — same reasoning as ex3l2 above.
  },
  phy3l3: {
    readMins: 6,
    article: {
      sections: [
        { heading: `The realistic timeline, laid out`, body: `Becoming a physician follows a long, mostly fixed sequence: four years of undergraduate coursework (including the pre-med science requirements), the MCAT (usually taken in the third or fourth year of college), four years of medical school, and then residency — anywhere from three to seven-plus years depending on the specialty — before full independent practice. Seeing the whole timeline laid out end to end is useful precisely because it makes clear how far away medical school admissions actually are from a high schooler's current position, and how much of the real preparation happens well before the application itself.` },
        { heading: `Holistic review: it's not just GPA and MCAT`, body: `Medical school admissions committees explicitly practice what's called holistic review — weighing academic metrics (GPA, MCAT) alongside experiences (clinical exposure, research, service), personal attributes, and life context, rather than screening on a single number. This is why a strong GPA alone has never guaranteed admission, and why committees consistently emphasize sustained, meaningful experience over a purely academic record. Understanding this now changes what's actually worth prioritizing in high school and college: numbers matter, but they're evaluated alongside a much fuller picture.` },
        { heading: `Why sustained clinical exposure specifically matters`, body: `Committees weight real clinical exposure heavily because medicine is an unusually long and demanding training path, and they want evidence that an applicant has genuinely tested the reality of the field, not just its reputation. A single, brief shadowing experience reads very differently from months of consistent shadowing or clinical volunteering — the latter demonstrates the applicant has actually sat with the less glamorous parts of the job (long hours, difficult conversations, uncertainty) and still wants in. This is exactly why consistency, logged over time, matters more than a single standout activity.` },
        { heading: `What's actually high-leverage for a high schooler right now`, body: `Years before an actual application, the highest-leverage moves are straightforward: strong performance in science coursework (the foundation everything else builds on), real and consistent exposure to the field through shadowing or volunteering, and enough honest reflection to know this is genuinely the direction you want, not just the most prestigious-sounding one. The MCAT, choosing a specific undergraduate major, and picking a specialty are all questions for years down the road — trying to solve them now is premature and not where the actual leverage is.` },
        { heading: `Playing a long game without losing the thread`, body: `Because the path is so long, it's easy to either feel paralyzed by how far away the finish line is, or to over-invest in premature, med-school-scaled preparation that isn't actually appropriate yet. The better frame is treating each stage as its own complete step: right now, that means grades, genuine curiosity, and consistent, age-appropriate exposure — logged honestly in your Portfolio — building a foundation that a stronger version of you, a few years from now, will actually be able to use.` },
      ],
      keyTakeaways: [
        `The physician timeline runs undergrad → MCAT → medical school → residency, and understanding the full length of it clarifies what's actually relevant to focus on now versus later.`,
        `Medical school admissions use holistic review — GPA and MCAT matter, but so do experiences, attributes, and personal context, evaluated together rather than as a single cutoff.`,
        `Sustained, consistent clinical exposure demonstrates a tested commitment to the field in a way a single shadowing day can't.`,
        `The highest-leverage focus for a high schooler right now is strong science coursework and honest, consistent exposure — not solving MCAT-level or specialty-level questions years too early.`,
      ],
    },
    // No video for this lesson — same reasoning as ex3l3 above.
  },
};
