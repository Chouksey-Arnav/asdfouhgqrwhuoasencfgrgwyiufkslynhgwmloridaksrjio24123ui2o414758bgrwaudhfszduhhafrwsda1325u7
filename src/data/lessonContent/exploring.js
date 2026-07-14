// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — Exploring Pre-Health pathway. Original articles + a
// curated, properly-embedded YouTube video per lesson. Keyed by lesson id (see
// PATHS.exploring in constants.js). Rendered by the LessonPlayer (App.jsx) as
// Overview -> Article -> Video -> Quiz -> Complete.
//
// Video ids were selected from Crash Course (PBS Digital Studios), a
// well-established, freely-embeddable educational channel already used
// elsewhere in this app's video links, and cross-checked against the
// channel's own course pages plus independent third-party transcript/wiki
// sources (this dev environment can't hit youtube.com directly to confirm via
// its oEmbed API — see the same caveat in src/data/elib.js).
// ─────────────────────────────────────────────────────────────────────────────

export const EXPLORING_CONTENT = {
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
        { heading: `DNA replication in brief`, body: `Before a cell divides, it has to copy its entire DNA so each new cell gets a full set of instructions. This process, called DNA replication, is semi-conservative — meaning each new DNA molecule ends up with one original ("parent") strand and one brand-new strand. An enzyme called helicase unwinds and separates the two original strands, and another enzyme, DNA polymerase, reads each separated strand and builds a matching new strand alongside it, base by base (A pairs with T, C pairs with G). The result is two DNA molecules that are each identical to the original — a remarkably reliable copying process, though not perfect, which matters for the next section.` },
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
};
