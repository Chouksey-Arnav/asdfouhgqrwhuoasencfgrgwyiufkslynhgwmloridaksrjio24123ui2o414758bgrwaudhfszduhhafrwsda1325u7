// Expression of Ideas — 20% of Reading & Writing.
// Skills: rhetorical_synthesis, transitions.
//
// Rhetorical-synthesis items present bulleted student notes plus a stated goal.
// The `notes` array is rendered as a bulleted list by the question player.
// The defining trap is `answers_wrong_goal`: a choice that is perfectly
// accurate about the notes but does not do the job the prompt specified.
export const RW_EXPRESSION_QUESTIONS = [
  // ── Rhetorical Synthesis ──────────────────────────────────────────────────
  {
    id: 'sat-rw-rsy-0001', section: 'rw', domain: 'expression', skill: 'rhetorical_synthesis',
    difficulty: 'M', format: 'mcq', trap: 'answers_wrong_goal', targetSeconds: 90,
    notes: [
      'Kelp forests off the California coast declined sharply after 2014.',
      'Sunflower sea stars, which eat purple urchins, were killed by a wasting disease.',
      'Without sea stars, purple urchin numbers rose roughly 60-fold.',
      'Urchins graze kelp holdfasts, killing whole plants rather than trimming them.',
      'Some researchers are breeding disease-resistant sea stars for release.',
    ],
    stimulus: 'While researching a topic, a student has taken the following notes.',
    q: 'The student wants to explain the mechanism behind the kelp decline. Which choice most effectively uses relevant information from the notes to accomplish this goal?',
    ch: [
      'Kelp forests off California declined sharply after 2014, and researchers are now breeding disease-resistant sea stars for release.',
      'A wasting disease killed sunflower sea stars, letting purple urchins boom 60-fold and graze kelp away.',
      'Purple urchins, which grew roughly 60-fold in number, are a serious problem for California kelp forests.',
      'Sunflower sea stars eat purple urchins, and kelp forests off the California coast declined sharply after 2014.',
    ],
    ans: 1,
    exp: 'The goal is the *mechanism* — the causal chain. Only one choice runs the full chain: disease → sea stars die → urchins boom → holdfasts destroyed → kelp dies.',
    distractorExp: [
      'Accurate, but it pairs the outcome with a proposed remedy and skips the mechanism entirely.',
      'Correct. Complete causal chain from disease to kelp loss.',
      'States an effect and a number but never explains why urchin numbers rose or how they kill kelp.',
      'Two true facts placed side by side with no causal link drawn between them.',
    ],
  },
  {
    id: 'sat-rw-rsy-0002', section: 'rw', domain: 'expression', skill: 'rhetorical_synthesis',
    difficulty: 'H', format: 'mcq', trap: 'answers_wrong_goal', targetSeconds: 95,
    notes: [
      'Hedy Lamarr was a film actor in the 1930s and 1940s.',
      'With composer George Antheil she co-invented a frequency-hopping system in 1941.',
      'The system was designed to keep radio-guided torpedoes from being jammed.',
      'The US Navy did not adopt it during the Second World War.',
      'Frequency hopping underlies modern Bluetooth and Wi-Fi standards.',
    ],
    stimulus: 'While researching a topic, a student has taken the following notes.',
    q: 'The student wants to emphasize the long-term significance of Lamarr’s invention. Which choice most effectively uses relevant information from the notes to accomplish this goal?',
    ch: [
      'Lamarr, a film actor of the 1930s and 1940s, co-invented a frequency-hopping system with the composer George Antheil in 1941.',
      'Though the Navy passed on it in wartime, Lamarr’s 1941 frequency-hopping system underlies Bluetooth and Wi-Fi today.',
      'Lamarr and Antheil designed their 1941 system specifically to stop radio-guided torpedoes from being jammed by an enemy.',
      'Despite her considerable fame as a film actor, Lamarr was also an inventor whose best work the Navy rejected.',
    ],
    ans: 1,
    exp: '"Long-term significance" requires reaching the present. Only one choice connects the 1941 invention to Bluetooth and Wi-Fi.',
    distractorExp: [
      'Establishes who and when, but stops in 1941 — no long-term reach.',
      'Correct. Links the wartime rejection to the technology’s present-day ubiquity.',
      'Describes the original military purpose, which is the opposite of long-term significance.',
      'Emphasises rejection and her acting career; it ends on a negative and never reaches the modern impact.',
    ],
  },
  {
    id: 'sat-rw-rsy-0003', section: 'rw', domain: 'expression', skill: 'rhetorical_synthesis',
    difficulty: 'M', format: 'mcq', trap: 'answers_wrong_goal', targetSeconds: 90,
    notes: [
      'Ammonia is made industrially by the Haber-Bosch process.',
      'Haber-Bosch requires temperatures near 450 °C and pressures around 200 atmospheres.',
      'The process consumes roughly 1–2 percent of global energy supply.',
      'Some soil bacteria fix nitrogen at ambient temperature and pressure using nitrogenase enzymes.',
      'Chemists are attempting to design catalysts that mimic nitrogenase.',
    ],
    stimulus: 'While researching a topic, a student has taken the following notes.',
    q: 'The student wants to introduce the Haber-Bosch process and its energy cost to an audience unfamiliar with it. Which choice most effectively uses relevant information from the notes to accomplish this goal?',
    ch: [
      'Chemists are working to design new catalysts that mimic the nitrogenase enzymes soil bacteria rely on.',
      'Haber-Bosch makes ammonia at 450 °C and 200 atmospheres, using 1–2 percent of world energy.',
      'Unlike the Haber-Bosch process, soil bacteria manage to fix nitrogen at ordinary temperature and pressure.',
      'Ammonia can be produced either industrially or biologically, by soil bacteria carrying nitrogenase enzymes.',
    ],
    ans: 1,
    exp: 'The goal names two things — introduce the process, and give its energy cost — for an audience that knows neither. One choice does both and assumes no prior knowledge.',
    distractorExp: [
      'Jumps to ongoing research without ever introducing Haber-Bosch.',
      'Correct. Identifies the process, what it does, its conditions, and its energy cost.',
      'Assumes the reader already knows what Haber-Bosch is — exactly what the goal rules out.',
      'Mentions both routes but omits the energy cost the goal explicitly requires.',
    ],
  },

  // ── Transitions ───────────────────────────────────────────────────────────
  {
    id: 'sat-rw-trn-0001', section: 'rw', domain: 'expression', skill: 'transitions',
    difficulty: 'E', format: 'mcq', trap: 'wrong_transition', targetSeconds: 50,
    stimulus: 'Most bird species can see ultraviolet light, which reveals plumage patterns invisible to humans. ______ two birds that look identical to a human observer may be strikingly different to each other.',
    q: 'Which choice completes the text with the most logical transition?',
    ch: ['Nevertheless,', 'Consequently,', 'In contrast,', 'Similarly,'],
    ans: 1,
    exp: 'The second sentence is the direct result of the first: UV vision reveals hidden patterns, therefore identical-looking birds differ to each other.',
    distractorExp: [
      '"Nevertheless" signals contrast, but the second sentence follows from the first rather than opposing it.',
      'Correct. Cause and effect.',
      '"In contrast" would require the two sentences to oppose each other; they do not.',
      '"Similarly" implies a parallel example, but this is a consequence.',
    ],
  },
  {
    id: 'sat-rw-trn-0002', section: 'rw', domain: 'expression', skill: 'transitions',
    difficulty: 'M', format: 'mcq', trap: 'wrong_transition', targetSeconds: 55,
    stimulus: 'Advocates predicted that widespread remote work would sharply reduce commuting emissions. Total vehicle miles traveled in several metropolitan areas fell only slightly. ______ trips that had been consolidated into a single commute were replaced by many shorter, separate errands.',
    q: 'Which choice completes the text with the most logical transition?',
    ch: ['For example,', 'Apparently,', 'Regardless,', 'Instead,'],
    ans: 1,
    exp: 'The third sentence offers an explanation for the surprising second sentence. "Apparently" introduces an inferred explanation for a result that did not match the prediction.',
    distractorExp: [
      '"For example" would make the third sentence an instance of the second, but it is a cause of it.',
      'Correct. Introduces the inferred reason the predicted drop did not materialise.',
      '"Regardless" dismisses what came before rather than explaining it.',
      '"Instead" would require the third sentence to replace the second as a claim, not explain it.',
    ],
  },
  {
    id: 'sat-rw-trn-0003', section: 'rw', domain: 'expression', skill: 'transitions',
    difficulty: 'M', format: 'mcq', trap: 'wrong_transition', targetSeconds: 55,
    stimulus: 'The manuscript’s parchment has been radiocarbon dated to the early fifteenth century, and the ink is consistent with pigments available at that time. The script, ______, contains letterforms that do not appear in any European hand before roughly 1600.',
    q: 'Which choice completes the text with the most logical transition?',
    ch: ['therefore', 'however', 'likewise', 'in addition'],
    ans: 1,
    exp: 'Materials point to the 1400s; the handwriting points to after 1600. The sentence pivots to evidence that cuts the other way.',
    distractorExp: [
      '"Therefore" claims the script conclusion follows from the dating — it contradicts it.',
      'Correct. Signals the contrast between the material evidence and the script evidence.',
      '"Likewise" would mean the script agrees with the early date; it does not.',
      '"In addition" treats it as more of the same evidence, missing the conflict.',
    ],
  },
  {
    id: 'sat-rw-trn-0004', section: 'rw', domain: 'expression', skill: 'transitions',
    difficulty: 'H', format: 'mcq', trap: 'wrong_transition', targetSeconds: 55,
    stimulus: 'Octopuses have no rigid skeleton, so their arms have effectively infinite degrees of freedom — a control problem that would overwhelm a centralised nervous system. ______ roughly two-thirds of an octopus’s neurons sit in the arms themselves, which can execute reaching motions without instruction from the brain.',
    q: 'Which choice completes the text with the most logical transition?',
    ch: ['Accordingly,', 'By contrast,', 'Admittedly,', 'Meanwhile,'],
    ans: 0,
    exp: 'The second sentence describes the octopus’s solution to the control problem the first sentence poses. That is a consequence relationship.',
    distractorExp: [
      'Correct. The distributed nervous system is the answer to the problem just described.',
      '"By contrast" requires opposition; the second sentence resolves rather than opposes.',
      '"Admittedly" concedes a point against the writer’s position, which is not happening here.',
      '"Meanwhile" signals simultaneity, ignoring the causal logic.',
    ],
  },
];
