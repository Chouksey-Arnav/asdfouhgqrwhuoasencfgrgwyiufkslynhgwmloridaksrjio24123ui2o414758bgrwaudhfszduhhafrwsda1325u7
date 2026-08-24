// Per-skill strategy cards — "how to attack this question type".
//
// The bank teaches through explanations; these teach the approach BEFORE the
// student sees a question. Each entry is deliberately short: a strategy a
// student cannot recall under time pressure is not a strategy.
//
// Keyed by leaf skill id from taxonomy.js. Missing entries degrade gracefully
// (the Skills panel just shows the skill's blurb instead).
export const SAT_STRATEGIES = {
  // ── Reading & Writing ──
  words_in_context: {
    approach: 'Cover the choices. Predict your own word from the sentence first, then find the closest match.',
    steps: [
      'Find the punctuation clue — a colon, dash or semicolon almost always defines the blank.',
      'Write your own word in the margin before looking at the options.',
      'Eliminate anything that is true in general but not supported by THIS sentence.',
    ],
    watchFor: 'Two choices that both "sort of" fit. The right one is supported by a specific phrase you can point to.',
  },
  text_structure_purpose: {
    approach: 'Ask what the paragraph DOES, not what it says.',
    steps: [
      'Summarize each part of the text in three words.',
      'Name the move: introduces, complicates, illustrates, qualifies, contrasts.',
      'Match that move to a choice — ignore choices that merely restate content.',
    ],
    watchFor: 'Choices that accurately describe the topic but not the function.',
  },
  cross_text_connections: {
    approach: 'Nail down each author\'s position in one sentence before comparing.',
    steps: [
      'Write Text 1\'s claim and Text 2\'s claim separately.',
      'Decide the relationship: agree, disagree, explain, qualify.',
      'Re-read the exact sentence the question points to before choosing.',
    ],
    watchFor: 'Choices that describe a disagreement the texts never actually have.',
  },
  central_ideas: {
    approach: 'The main idea has to cover the whole text, not just the loudest sentence.',
    steps: [
      'Ask: if the passage had a title, what would it be?',
      'Reject anything that only covers one sentence.',
      'Reject anything the text does not actually state.',
    ],
    watchFor: 'A true detail masquerading as the main idea.',
  },
  command_evidence_text: {
    approach: 'Read the claim first, then hunt for the choice that directly supports THAT claim.',
    steps: [
      'Underline exactly what needs supporting.',
      'For each choice ask: does this make the claim more likely to be true?',
      'Beware choices that are relevant to the topic but not to the claim.',
    ],
    watchFor: 'Evidence for a nearby but different claim.',
  },
  command_evidence_quant: {
    approach: 'Read the axis labels and units before reading the choices.',
    steps: [
      'Identify what the claim needs the data to show.',
      'Check each choice against the actual numbers — do not trust the wording.',
      'Make sure the choice supports the comparison being made, not just a single value.',
    ],
    watchFor: 'A choice that quotes real numbers but does not establish the comparison the claim requires.',
  },
  inferences: {
    approach: 'The answer must be forced by the text, not merely consistent with it.',
    steps: [
      'Identify the logical gap the blank has to fill.',
      'Ask: does the evidence make this MUST be true, or just COULD be true?',
      'Prefer the modest conclusion over the dramatic one.',
    ],
    watchFor: 'Overreach — the choice that goes one step further than the evidence allows.',
  },
  boundaries: {
    approach: 'Decide whether each side of the blank is a complete sentence. Everything follows from that.',
    steps: [
      'Complete + complete: period, semicolon, or comma + FANBOYS conjunction.',
      'Complete + list or explanation: colon.',
      'Incomplete on either side: comma or nothing.',
    ],
    watchFor: 'A comma joining two complete sentences — the comma splice, the single most tested error.',
  },
  form_structure_sense: {
    approach: 'Find the actual subject, then cross out everything between it and the verb.',
    steps: [
      'Strip prepositional phrases and clauses — they cannot contain the subject.',
      'Match the verb to what is left.',
      'For opening -ing or -ed phrases, check that the main clause subject is who did it.',
    ],
    watchFor: 'A plural noun sitting right before a singular verb, deliberately placed to sound wrong.',
  },
  rhetorical_synthesis: {
    approach: 'Read the GOAL first and treat it as a checklist. The right answer does the stated job.',
    steps: [
      'Underline the goal in the question stem before reading the notes.',
      'Check each choice against the goal, not against accuracy.',
      'Eliminate every accurate sentence that does not do the specified job.',
    ],
    watchFor: 'A perfectly true sentence that answers a different goal. This is the whole trap.',
  },
  transitions: {
    approach: 'Cover the transition and work out the relationship yourself first.',
    steps: [
      'Summarize the sentence before and the sentence after.',
      'Name the relationship: cause, contrast, example, addition, sequence.',
      'Pick the transition for that relationship — do not read the choices first.',
    ],
    watchFor: 'Choices that sound sophisticated but assert the wrong relationship.',
  },

  // ── Math ──
  linear_equations_1var: {
    approach: 'Distribute fully, collect variables on one side, then isolate.',
    steps: [
      'Distribute before you move anything.',
      'If the variable cancels entirely, the answer is "no solution" or "infinitely many".',
      'Substitute your answer back in — it takes five seconds.',
    ],
    watchFor: 'Multiplying only the first term inside a bracket.',
  },
  linear_equations_2var: {
    approach: 'Get to y = mx + b unless the question rewards another form.',
    steps: [
      'Slope = rise over run between any two points.',
      'Substitute a known point to find b.',
      'For perpendicular lines, take the negative reciprocal — flip AND change sign.',
    ],
    watchFor: 'Reporting the slope when the question asked for the intercept.',
  },
  linear_functions: {
    approach: 'Translate f(x) into words: input, output, rate, starting value.',
    steps: [
      'The coefficient of x is the per-unit rate of change.',
      'The constant is the value when x = 0.',
      'Re-read what the question asked for before answering.',
    ],
    watchFor: 'Interpreting the slope as the starting value or vice versa.',
  },
  systems_linear: {
    approach: 'Substitution when one variable is already isolated; elimination when coefficients line up.',
    steps: [
      'Solve for the easiest variable first.',
      'Answer the question actually asked — often it wants x + y, not x.',
      'For "no solution", match the x and y coefficient ratios but not the constant.',
    ],
    watchFor: 'Solving correctly and then reporting the wrong variable.',
  },
  linear_inequalities: {
    approach: 'Solve exactly like an equation, with one rule added.',
    steps: [
      'Flip the inequality sign whenever you multiply or divide by a negative.',
      'In word problems, decide whether the answer must be a whole number.',
      'Check an endpoint value to confirm the direction.',
    ],
    watchFor: 'Forgetting to round DOWN when the context requires whole units.',
  },
  equivalent_expressions: {
    approach: 'Factor first. Most of these collapse once you spot the pattern.',
    steps: [
      'Look for difference of squares and perfect square trinomials.',
      'When raising a product to a power, the exponent hits the coefficient too.',
      'You may only cancel whole factors, never individual terms.',
    ],
    watchFor: 'Canceling a term that is being added rather than multiplied.',
  },
  nonlinear_equations: {
    approach: 'Factor if you can, quadratic formula if you cannot — and always check.',
    steps: [
      'Sum of roots is −b/a and product is c/a. Often you never need the roots themselves.',
      'After squaring both sides, substitute every solution back into the ORIGINAL equation.',
      'Discriminant zero means exactly one real solution.',
    ],
    watchFor: 'Extraneous solutions created by squaring. Checking is not optional here.',
  },
  nonlinear_functions: {
    approach: 'Read the form: vertex form gives the vertex, factored form gives the roots.',
    steps: [
      'Vertex form a(x − h)² + k has vertex (h, k).',
      'The vertex sits exactly midway between the two x-intercepts.',
      'Exponential growth puts the variable in the exponent, not the base.',
    ],
    watchFor: 'Reporting the x-coordinate of the vertex when the question asked for the minimum value.',
  },
  ratios_rates_units: {
    approach: 'Set the proportion up with the same quantity on top of both fractions.',
    steps: [
      'Write the units into your working, not just the numbers.',
      'Convert units before computing, not after.',
      'Sanity-check the direction: should the answer be bigger or smaller?',
    ],
    watchFor: 'Multiplying when you should divide during a unit conversion.',
  },
  percentages: {
    approach: 'Always ask: a percentage OF what?',
    steps: [
      'Increase by p% means multiply by (1 + p/100).',
      'Successive changes multiply — they never add.',
      'To reverse a discount, divide by (1 − p/100).',
    ],
    watchFor: 'Assuming a 20% rise then a 20% fall returns you to the start. It does not.',
  },
  data_distributions: {
    approach: 'Mean is pulled by outliers; median is not. That difference is usually the question.',
    steps: [
      'Order the data before finding the median.',
      'Standard deviation measures spread, not size — identical values means zero spread.',
      'On scatterplots, read the trend line, not individual points.',
    ],
    watchFor: 'Computing the mean when the question asked for the median.',
  },
  probability: {
    approach: 'Find the denominator first — the conditional phrase tells you which row or column.',
    steps: [
      '"Given that..." restricts you to one row or column of the table.',
      'Count the favorable outcomes within that restricted group only.',
      'Check whether the question wants a fraction, decimal or percentage.',
    ],
    watchFor: 'Using the grand total as the denominator on a conditional question.',
  },
  inference_margin_error: {
    approach: 'A sample estimates a population. Never state the population value as certain.',
    steps: [
      'Margin of error gives a plausible interval, not a guarantee.',
      'Causal claims need random ASSIGNMENT, not just random sampling.',
      'Larger samples narrow the interval; they do not remove bias.',
    ],
    watchFor: 'Any choice containing "proves", "exactly" or "always".',
  },
  area_volume: {
    approach: 'The reference sheet has the formulas. Your job is picking the right one and the right dimensions.',
    steps: [
      'Break composite figures into simple shapes.',
      'Scaling every length by k multiplies area by k² and volume by k³.',
      'Check whether the radius or the diameter was given.',
    ],
    watchFor: 'Using diameter where the formula wants radius.',
  },
  lines_angles_triangles: {
    approach: 'Mark every angle you can deduce directly on the figure before solving.',
    steps: [
      'Triangle angles sum to 180; an exterior angle equals the two remote interior angles.',
      'Parallel lines give equal corresponding and alternate angles.',
      'Similar triangles scale by multiplication, never by addition.',
    ],
    watchFor: 'Adding a difference between sides instead of applying the scale factor.',
  },
  right_triangles_trig: {
    approach: 'SOH-CAH-TOA, and know the two special triangles cold.',
    steps: [
      '30-60-90 sides are 1 : √3 : 2. 45-45-90 are 1 : 1 : √2.',
      'sin(x°) = cos((90 − x)°) — the cofunction identity appears every test.',
      'Look for 3-4-5 and 5-12-13 before reaching for the calculator.',
    ],
    watchFor: 'Taking the ratio relative to the wrong angle.',
  },
  circles: {
    approach: 'Get to center-radius form, then everything else follows.',
    steps: [
      '(x − h)² + (y − k)² = r² — note the signs are subtracted, and the right side is r², not r.',
      'Arc length and sector area are just the fraction of the circle the angle represents.',
      'Radians: 180° = π. Check which unit the question uses.',
    ],
    watchFor: 'Reporting r² as the radius.',
  },
};

export const strategyFor = (skillId) => SAT_STRATEGIES[skillId] || null;
