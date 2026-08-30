// ─────────────────────────────────────────────────────────────────────────────
// Applied verification items — data interpretation, short scenarios, and
// best-next-step reasoning, added on top of the existing lesson banks.
//
// WHY THESE EXIST
// The lesson banks were written recall-first, because recall items are the
// cheap ones to write: read the article, lift a fact, invert it three times for
// distractors. A bank made of those measures whether a student can hold five
// nouns in their head for ninety seconds. Students work that out fast, and then
// they read the article hunting for the five quizzable facts instead of reading
// it to understand anything — which is the failure mode the whole pathway is
// supposed to avoid.
//
// Every item here carries:
//   kind     'data' | 'scenario' | 'nextStep'  — explicit, so lib/quizItemMix.js
//            never has to guess at these (its heuristic is for the legacy bank).
//   concept  the specific idea the item tests, which is what the recovery flow
//            (lib/quizRecovery.js) routes a student back to on a miss. Concept
//            strings are shared with the items they sit next to on purpose:
//            missing two items on the same concept should read as ONE thing to
//            go relearn, not two.
//
// Merged into the banks by id at import time — see mergeAppliedItems() below,
// called from data/quizzes.js. An id with no matching bank is skipped rather
// than throwing, so content can be authored ahead of the lesson it belongs to.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, Array<object>>} bank id -> extra items */
export const APPLIED_ITEMS = {
  // ── Exploring Pre-Health: Life Sciences ────────────────────────────────────
  ex1l1q: [
    { kind:'data', concept:'ATP as energy currency',
      q:`A muscle cell and a skin cell from the same person are compared: the muscle cell holds roughly 10x the mitochondria. What does that difference most directly tell you?`,
      ch:[`The muscle cell has different DNA`,`The muscle cell has a much higher demand for usable energy (ATP)`,`The skin cell is dying`,`The muscle cell is prokaryotic`], ans:1,
      exp:`Mitochondria are where most ATP gets produced, so mitochondrial density tracks how much usable energy a cell burns. Contracting muscle is expensive; skin maintenance is not. Same genome, different energy budget.` },
    { kind:'scenario', concept:'Prokaryotic vs. eukaryotic cells',
      q:`You're looking down a microscope in bio lab at two samples. Sample A shows cells with a clear dark nucleus in the middle. Sample B shows much smaller cells with no visible internal compartments. What's the most reasonable conclusion?`,
      ch:[`Sample B's cells are dead`,`Sample A is eukaryotic and Sample B is likely prokaryotic (bacterial)`,`Both samples are the same organism at different ages`,`Sample A is prokaryotic`], ans:1,
      exp:`A visible membrane-bound nucleus is the single clearest eukaryotic marker under a light microscope. Smaller cells with no visible internal compartments are the classic prokaryotic (bacterial) picture.` },
    { kind:'nextStep', concept:'Photosynthesis and respiration as paired processes',
      q:`A classmate says "plants do photosynthesis, animals do respiration — they're opposites, so plants don't respire." What's the most useful thing to say next?`,
      ch:[`Agree — that's exactly right`,`Point out that plants do BOTH: they store energy in glucose by day and release it by respiration around the clock`,`Tell them respiration only happens in mitochondria so plants can't do it`,`Say the two processes are unrelated`], ans:1,
      exp:`Plants run cellular respiration too — they have mitochondria and they need ATP just like any other eukaryote. Photosynthesis stores energy; respiration spends it. "Opposite processes" is right; "only one organism does each" is not.` },
  ],
  ex1l2q: [
    { kind:'data', concept:'Punnett squares and inheritance probability',
      q:`Two parents are each carriers (Tt) for a recessive trait. Across four children, how many would you EXPECT to show the recessive trait, and what does that number actually mean?`,
      ch:[`Exactly 1 — it's guaranteed`,`About 1 on average, because each child independently has a 25% chance`,`All 4, since both parents carry it`,`0 — carriers never pass it on`], ans:1,
      exp:`A Tt x Tt cross gives a 25% chance per child of tt. That's a per-child probability, not a quota: four children could easily be 0 or 2. Probability describes the long run, not the next four.` },
    { kind:'scenario', concept:'Mutations as the source of variation',
      q:`A bacterial infection is treated with an antibiotic. Most bacteria die, but a few survive and the infection returns. What is the most accurate description of what happened?`,
      ch:[`The antibiotic taught the bacteria to resist it`,`A few bacteria already carried a variation that made them survivable, and those are the ones that reproduced`,`The bacteria decided to change`,`The antibiotic mutated`], ans:1,
      exp:`Selection acts on variation that already exists — it doesn't create it on demand. The resistant bacteria weren't taught anything; they happened to carry a mutation, and killing everything else handed them the whole population.` },
    { kind:'nextStep', concept:'Semi-conservative DNA replication',
      q:`You're asked to design a way to test whether DNA replication is semi-conservative. Which experiment gets you closest to an answer?`,
      ch:[`Count how many cells divide in an hour`,`Label the original DNA strands, let the cells divide once, and check whether each new molecule contains one labeled strand`,`Measure the cells' total protein`,`Look at the cells under a microscope`], ans:1,
      exp:`The defining claim of semi-conservative replication is that each daughter molecule keeps one original strand. So you have to be able to tell original strands from new ones — labeling them and checking what ends up where is exactly the Meselson–Stahl design.` },
  ],
  ex1l3q: [
    { kind:'data', concept:'Negative feedback and set points',
      q:`Someone's core temperature reads 37.8°C after twenty minutes of running, then 37.0°C an hour after they stop. What does that pattern demonstrate?`,
      ch:[`A broken thermoregulation system`,`Negative feedback returning a variable toward its set point after a disturbance`,`Positive feedback amplifying a change`,`That body temperature has no set point`], ans:1,
      exp:`Exercise pushed temperature up; sweating and vasodilation pushed it back down toward ~37°C. A variable that departs from a set point and then returns is the signature of a working negative feedback loop.` },
    { kind:'scenario', concept:'Organ systems are interdependent',
      q:`A patient can't walk up a flight of stairs without stopping to catch their breath. Which of these is the most defensible way to think about that symptom?`,
      ch:[`It's purely a lung problem`,`It's purely a heart problem`,`It could originate in the respiratory, circulatory, or muscular system — they share the job of getting oxygen to working muscle`,`It has no physiological explanation`], ans:2,
      exp:`Getting oxygen to a working muscle involves gas exchange, delivery, and use. Shortness of breath on exertion narrows almost nothing on its own, which is exactly why clinicians reason about systems together rather than one at a time.` },
    { kind:'nextStep', concept:'Anatomy vs. physiology',
      q:`You're writing up a lab on the knee joint and want to include both an anatomy claim and a physiology claim. Which pair does that correctly?`,
      ch:[`"The ACL connects femur to tibia" / "The ACL limits forward slide of the tibia during movement"`,`"The knee hurts" / "The knee is a joint"`,`"The ACL is a ligament" / "The ACL is made of collagen"`,`"Knees bend" / "Knees are important"`], ans:0,
      exp:`Anatomy is structure — what it is and what it connects. Physiology is function — what it does while the body is working. The first pair gives you one of each; the others give you two of the same kind or neither.` },
  ],

  // ── Exploring Pre-Health: Physical Sciences ────────────────────────────────
  ex2l1q: [
    { kind:'data', concept:'Periodic trends',
      q:`Three elements in the same period have atomic radii of 152 pm, 112 pm, and 85 pm. What's the most likely left-to-right order on the periodic table?`,
      ch:[`85, 112, 152 — radius grows across a period`,`152, 112, 85 — radius shrinks across a period as nuclear charge increases`,`The order can't be inferred from radius`,`112, 85, 152`], ans:1,
      exp:`Across a period, protons are added while the outer electrons stay in the same shell, so the nucleus pulls them in tighter. Radius shrinks left to right — the largest atom is furthest left.` },
    { kind:'scenario', concept:`Water's polarity`,
      q:`Oil and water separate in a beaker; table salt dissolves completely. What single property explains both observations?`,
      ch:[`Water's density`,`Water's polarity — it dissolves polar and ionic substances well and nonpolar ones poorly`,`Water's boiling point`,`Water's color`], ans:1,
      exp:`Polar water pulls apart the ions in salt and surrounds them. Nonpolar oil offers nothing for those partial charges to interact with, so it stays separate. One property, both results.` },
  ],
  ex2l2q: [
    { kind:'data', concept:'Fluid dynamics and blood flow',
      q:`An artery narrows to half its original diameter. Compared with before, what happens to the flow through it at the same driving pressure?`,
      ch:[`Flow roughly halves`,`Flow drops dramatically — far more than half, because flow depends steeply on radius`,`Flow doubles`,`Flow is unchanged`], ans:1,
      exp:`Flow through a tube scales with radius to a high power, not linearly. That steepness is why a partial narrowing that looks modest on an image can cause symptoms clinically out of proportion to it.` },
    { kind:'nextStep', concept:`Newton's laws applied`,
      q:`You're explaining to a younger student why a seatbelt matters, using physics. What's the most accurate line to lead with?`,
      ch:[`"Cars are heavy"`,`"A body in motion stays in motion — when the car stops, you don't, unless something applies a force to you"`,`"Seatbelts reduce your mass"`,`"Seatbelts cancel gravity"`], ans:1,
      exp:`This is Newton's first law made concrete. The car decelerates; the passenger keeps their velocity until a force acts on them. A seatbelt is that force, applied over a longer time and a wider area than a windshield would.` },
  ],
  ex2l3q: [
    { kind:'data', concept:'Mean vs. median and outliers',
      q:`Six students' study hours last week: 2, 3, 3, 4, 4, 40. Which summary best describes a typical week here, and why?`,
      ch:[`The mean (9.3), because it uses every value`,`The median (3.5), because one extreme value drags the mean far above anything actually typical`,`The maximum (40)`,`Neither — the data is unusable`], ans:1,
      exp:`The mean here is higher than five of the six values, which makes it a poor description of "typical". One outlier moved it. The median is barely affected and lands where most of the data actually is.` },
    { kind:'data', concept:'Statistical vs. practical significance',
      q:`A study of 80,000 people finds a drug lowers blood pressure by 0.4 mmHg, p < 0.001. What's the honest read?`,
      ch:[`A large, important effect`,`A real but clinically trivial effect that a huge sample made statistically detectable`,`The study is fraudulent`,`The drug doesn't work at all`], ans:1,
      exp:`A tiny p-value with a huge sample tells you the effect is probably real, not that it matters. 0.4 mmHg changes nothing for a patient. "Significant" is a statement about chance, not about importance.` },
    { kind:'nextStep', concept:'Correlation vs. causation',
      q:`A headline reports that teens who eat breakfast get better grades. Before believing breakfast causes the grades, what's the most useful next question?`,
      ch:[`How many teens were surveyed?`,`What else differs between teens who eat breakfast and those who don't — sleep, household stability, income?`,`Which cereal did they eat?`,`Was the study published recently?`], ans:1,
      exp:`Confounding is the first thing to rule out in any observational finding. Households where breakfast happens reliably differ in a lot of other ways that also affect grades. Sample size doesn't fix that.` },
  ],

  // ── Exploring Pre-Health: Behavioral ───────────────────────────────────────
  ex3l1q: [
    { kind:'scenario', concept:'Psychology in every health career',
      q:`A patient stops taking a medication that was clearly explained to them and that they can afford. Which framing is most likely to actually get somewhere?`,
      ch:[`They're being irrational — repeat the explanation more firmly`,`Ask what's happening for them: side effects, beliefs about the drug, or something in their routine`,`Assume they don't care about their health`,`Switch drugs without asking anything`], ans:1,
      exp:`Non-adherence is behavior, and behavior has reasons. "Explain it again, louder" assumes the problem is information. Asking treats it as psychology — which it usually is.` },
  ],

  // ── Applied-skill and career lessons ───────────────────────────────────────
  shadow101q: [
    { kind:'nextStep', concept:'Confidentiality while shadowing',
      q:`You shadowed a clinic yesterday and saw a patient who goes to your school. A friend asks what you did all day. What do you say?`,
      ch:[`Describe the case but don't use the name`,`Talk about the setting and what you learned generally, and say nothing that could identify anyone`,`Say nothing at all about the day`,`Tell them, since your friend already knows the person`], ans:1,
      exp:`"No name" is not the standard — the standard is nothing identifiable, and in a school-sized community a description does identify. You can still say plenty about the specialty, the pace, and what you learned.` },
    { kind:'scenario', concept:'Arranging shadowing as a minor',
      q:`You've emailed three hospitals directly about shadowing and heard nothing back for a month. What does that most likely mean?`,
      ch:[`You're not a strong enough student`,`Hospitals rarely process unsolicited shadowing requests from minors — the realistic route is through an adult connection`,`Shadowing is illegal for high schoolers`,`You should email them daily until they answer`], ans:1,
      exp:`Silence here is structural, not personal. Liability and privacy rules mean most institutions have no intake path for a minor's cold email. A family doctor, a relative, or a family friend on staff is the route that actually works.` },
  ],
  volunteer101q: [
    { kind:'nextStep', concept:'Consistency over one-off volunteering',
      q:`You have four free Saturdays this month. Which use of them builds the strongest, most honest record?`,
      ch:[`Four different one-day events at four organizations`,`The same weekly shift at one organization, continued past this month`,`One long 12-hour day`,`Whatever has the most photos`], ans:1,
      exp:`A sustained shift at one place lets you actually learn a setting and gives someone real grounds to write about you later. Four unconnected days produce four shallow experiences and nobody who knows you.` },
    { kind:'data', concept:'Logging volunteer hours credibly',
      q:`Your log says "Spring 2025 — hospital — about 60 hours." A program asks you to break it down. Why is this a problem?`,
      ch:[`60 hours is too few to matter`,`A single reconstructed total with no dates or roles can't be verified or described specifically, which is what makes a record credible`,`Hospitals don't count`,`It isn't a problem`], ans:1,
      exp:`Records get checked, and more importantly they get discussed. An entry that can't produce dates, a supervisor, or what you actually did reads as an estimate — because it is one. Logging as you go costs a minute a week.` },
  ],
  pubmedq: [
    { kind:'data', concept:'Reading an abstract critically',
      q:`An abstract reports a treatment "improved outcomes by 50%" in a trial of 24 patients. What's the most important thing that number doesn't tell you?`,
      ch:[`Who funded the study`,`Whether it's a 50% relative change on a small base, and how wide the uncertainty is with only 24 patients`,`The journal's name`,`When it was published`], ans:1,
      exp:`A relative improvement with no absolute numbers can dress up a change from 2 patients to 3. With 24 participants, the uncertainty around any estimate is wide. Both are visible in the full text and hidden in the headline number.` },
    { kind:'nextStep', concept:'Primary vs. secondary sources',
      q:`A news article says a study "proves" coffee prevents a disease. You want to know whether that's fair. What do you do first?`,
      ch:[`Search for other news articles saying the same thing`,`Find the original study on PubMed and read what it actually measured and claimed`,`Ask on social media`,`Accept it — it was reported by a news outlet`], ans:1,
      exp:`Summaries lose nuance in a predictable direction: toward certainty. The original abstract will usually say "associated with", in a specific population, over a specific period. Going to the primary source is the whole skill.` },
  ],
  teamworkq: [
    { kind:'nextStep', concept:'Handling a non-contributing teammate',
      q:`It's Wednesday. A group project is due Friday and one member hasn't produced their section. What's the best next move?`,
      ch:[`Quietly write their section yourself Thursday night`,`Message them today, specifically: what's needed, by when, and offer to split it if they're stuck`,`Email the teacher about them immediately`,`Say nothing and let the grade fall`], ans:1,
      exp:`Direct, specific, early, and private is the move that most often actually produces the work. Silently absorbing it teaches them nothing and burns you; escalating first, before you've asked once, usually burns the working relationship.` },
  ],
  publicspeakingq: [
    { kind:'nextStep', concept:'Managing nerves before speaking',
      q:`You present in an hour and you're shaking. Which is the most useful thing to do with that hour?`,
      ch:[`Reread your slides silently several times`,`Run the talk out loud twice, standing, from key points rather than a script`,`Memorize the opening word for word and wing the rest`,`Avoid thinking about it`], ans:1,
      exp:`Silent rereading builds familiarity with the text, not with speaking it. Out loud and standing rehearses the actual task, and key points instead of a script means losing your place doesn't derail you.` },
  ],
  medTermq: [
    { kind:'data', concept:'Decoding terms from roots and affixes',
      q:`A chart note reads "bradycardia, no dyspnea." Using roots and prefixes only, what does that describe?`,
      ch:[`A fast heart rate with difficult breathing`,`A slow heart rate without difficult breathing`,`Chest pain with normal breathing`,`Low blood pressure with a cough`], ans:1,
      exp:`brady- (slow) + cardi- (heart) + -ia (condition) = slow heart rate. dys- (difficult) + -pnea (breathing) = laboured breathing, here negated. Two unfamiliar words, decoded from parts.` },
    { kind:'nextStep', concept:'Using terminology while shadowing',
      q:`During a shadowing day you hear a term you don't know. What's the best thing to do in the moment?`,
      ch:[`Interrupt and ask immediately, in front of the patient`,`Note it down and ask the clinician between patients`,`Look it up on your phone during the encounter`,`Guess from context and never check`], ans:1,
      exp:`The question is a good one; the timing matters. Writing it down and asking between patients keeps the encounter about the patient and usually gets you a better answer than a rushed one would be.` },
  ],
  vitalsq: [
    { kind:'data', concept:'Reading a value against a reference range',
      q:`A healthy 16-year-old cross-country runner has a resting heart rate of 48 bpm. The adult reference range is 60–100. What's the right read?`,
      ch:[`Definitely abnormal — treat immediately`,`A value outside a reference range isn't automatically abnormal; trained endurance athletes often have low resting rates`,`The measurement must be wrong`,`Reference ranges don't apply to teenagers at all`], ans:1,
      exp:`A reference range describes most of a reference population, not a boundary between healthy and sick. Context — who this person is, and what their own baseline has been — is what turns a number into information.` },
    { kind:'data', concept:'Trends over single readings',
      q:`Blood pressure readings across one visit: 142/90, then 128/82, then 124/80. What's the most reasonable interpretation?`,
      ch:[`Hypertension, confirmed by the first reading`,`The first reading is likely elevated by arrival stress; the trend across the visit is more informative than any single value`,`The equipment is broken`,`Blood pressure can't change that fast`], ans:1,
      exp:`A first reading taken minutes after rushing in is a well-known source of elevation. This is exactly why clinicians read trends and repeat measurements rather than acting on one number.` },
  ],
  infectionControlq: [
    { kind:'nextStep', concept:'Breaking the chain of infection',
      q:`You're volunteering and you've just helped move a wheelchair, and you're about to hand out meal trays. What's the next thing you do?`,
      ch:[`Put on gloves over unwashed hands`,`Perform hand hygiene before moving to the next task`,`Nothing — you didn't touch a patient directly`,`Wash only if your hands look dirty`], ans:1,
      exp:`Hand hygiene between tasks is the single highest-yield link to break, and "my hands look clean" is not the standard. Gloves over contaminated hands move the contamination; they don't remove it.` },
    { kind:'scenario', concept:'Vaccines and immune memory',
      q:`A friend says the flu shot "gave them the flu" because they felt achy for a day afterward. What's the most accurate response?`,
      ch:[`They're right — the shot contains live flu virus`,`Feeling achy is the immune system responding and building memory, not an infection from the vaccine`,`That reaction means they're allergic`,`It means the vaccine failed`], ans:1,
      exp:`A day of aches is the adaptive immune response doing exactly what the vaccine is for — building memory against a pathogen it hasn't met. That's the mechanism working, not a mild case of the disease.` },
  ],
};

/**
 * Merge the applied items into a quiz bank list, by id.
 * Non-mutating: returns a new array with new bank objects for the banks that
 * gained items. Ids with no matching bank are ignored.
 */
export function mergeAppliedItems(banks, extras = APPLIED_ITEMS) {
  return (banks || []).map(bank => {
    const add = extras[bank?.id];
    if (!add?.length) return bank;
    return { ...bank, qs: [...(bank.qs || []), ...add] };
  });
}

/** How many applied items exist, for the verification script and diagnostics. */
export function appliedItemCount(extras = APPLIED_ITEMS) {
  return Object.values(extras).reduce((n, arr) => n + arr.length, 0);
}
