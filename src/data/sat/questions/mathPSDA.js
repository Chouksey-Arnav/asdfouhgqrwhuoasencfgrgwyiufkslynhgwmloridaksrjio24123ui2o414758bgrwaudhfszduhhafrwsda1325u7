// Problem-Solving and Data Analysis — 15% of the Math section.
// Skills: ratios_rates_units, percentages, data_distributions, probability,
//         inference_margin_error.
export const MATH_PSDA_QUESTIONS = [
  // ── Ratios, Rates and Units ───────────────────────────────────────────────
  {
    id: 'sat-m-rru-0001', section: 'math', domain: 'psda', skill: 'ratios_rates_units',
    difficulty: 'E', format: 'spr', trap: 'unit_mismatch', targetSeconds: 60,
    q: 'A recipe uses 3 cups of flour to make 8 cookies. At the same rate, how many cups of flour are needed to make 20 cookies?',
    sprAccept: { values: [7.5, '15/2'], tolerance: 0 },
    exp: 'Set up the proportion 3/8 = x/20. Cross-multiply: 8x = 60, so x = 7.5 cups.',
    hint: 'Keep the same quantity on top in both fractions — cups over cookies on each side.',
  },
  {
    id: 'sat-m-rru-0002', section: 'math', domain: 'psda', skill: 'ratios_rates_units',
    difficulty: 'M', format: 'mcq', trap: 'unit_mismatch', targetSeconds: 70,
    q: 'A car travels 45 miles in 50 minutes at a constant speed. What is its speed in miles per hour?',
    ch: ['37.5', '48', '54', '90'],
    ans: 2,
    exp: 'Convert the time to hours: 50 minutes = 50/60 hour. Speed = 45 ÷ (50/60) = 45 × 60/50 = 54 miles per hour.',
    distractorExp: [
      '37.5 comes from multiplying by 50/60 instead of dividing — that converts the wrong way.',
      '48 is a rounding of 45 × 60/50 done incorrectly; the exact value is 54.',
      'Correct. 45 × (60/50) = 54 mph.',
      '90 treats 50 minutes as half an hour (45 × 2), but 50 minutes is more than half an hour, so the speed must be less than 90.',
    ],
  },

  // ── Percentages ───────────────────────────────────────────────────────────
  {
    id: 'sat-m-pct-0001', section: 'math', domain: 'psda', skill: 'percentages',
    difficulty: 'M', format: 'mcq', trap: 'percent_of_what', targetSeconds: 70,
    q: 'The price of an item is increased by 20 percent and then the new price is decreased by 20 percent. Compared with the original price, the final price is',
    ch: ['unchanged.', '4 percent less.', '4 percent more.', '20 percent less.'],
    ans: 1,
    exp: 'Multiply the factors: 1.20 × 0.80 = 0.96, so the final price is 96 percent of the original — a 4 percent decrease. The two 20 percents are taken of *different* bases, which is why they do not cancel.',
    distractorExp: [
      'They would cancel only if both percentages were taken of the same base. The decrease is applied to the already-raised price.',
      'Correct. 1.20 × 0.80 = 0.96, a 4 percent decrease.',
      'The direction is wrong — the decrease acts on a larger base than the increase did, so the net effect is downward.',
      'A 20 percent net drop would require the second decrease to be far larger.',
    ],
  },
  {
    id: 'sat-m-pct-0002', section: 'math', domain: 'psda', skill: 'percentages',
    difficulty: 'E', format: 'spr', trap: 'percent_of_what', targetSeconds: 60,
    q: '15 percent of a number is 45. What is the number?',
    sprAccept: { values: [300], tolerance: 0 },
    exp: '0.15n = 45, so n = 45 ÷ 0.15 = 300.',
    hint: '"15 percent OF a number" means 0.15 times that number. Solve for the number, do not take 15 percent of 45.',
  },
  {
    id: 'sat-m-pct-0003', section: 'math', domain: 'psda', skill: 'percentages',
    difficulty: 'H', format: 'mcq', trap: 'percent_of_what', targetSeconds: 80,
    q: 'After a 25 percent discount, a jacket costs $54. What was its price before the discount?',
    ch: ['$67.50', '$72.00', '$40.50', '$79.00'],
    ans: 1,
    exp: '$54 is 75 percent of the original price: 0.75p = 54, so p = 54 ÷ 0.75 = $72.',
    distractorExp: [
      '$67.50 comes from adding 25 percent of 54 to 54 — but the 25 percent was taken of the original price, not the sale price.',
      'Correct. 0.75p = 54 gives p = $72, and 25 percent of 72 is 18, leaving 54. ✓',
      '$40.50 is 75 percent of 54 — the discount applied a second time, in the wrong direction.',
      '$79.00 does not satisfy the condition: a 25 percent discount would leave $59.25.',
    ],
  },

  // ── One- and Two-Variable Data ────────────────────────────────────────────
  {
    id: 'sat-m-dat-0001', section: 'math', domain: 'psda', skill: 'data_distributions',
    difficulty: 'M', format: 'mcq', trap: 'mean_vs_median', targetSeconds: 75,
    q: 'For the data set 4, 7, 7, 9, 13, by how much does the mean exceed the median?',
    ch: ['0', '1', '2', '3'],
    ans: 1,
    exp: 'Mean = (4 + 7 + 7 + 9 + 13)/5 = 40/5 = 8. The values are already in order, so the median is the middle value, 7. The mean exceeds the median by 1.',
    distractorExp: [
      'They are not equal — the value 13 pulls the mean above the median.',
      'Correct. Mean 8, median 7, difference 1.',
      '2 would follow from taking the median as 9 (the fourth value) rather than the middle one.',
      '3 comes from using the mode or misordering the set.',
    ],
  },
  {
    id: 'sat-m-dat-0002', section: 'math', domain: 'psda', skill: 'data_distributions',
    difficulty: 'H', format: 'mcq', trap: 'mean_vs_median', targetSeconds: 80,
    figure: {
      type: 'table',
      title: 'Daily rainfall (mm) recorded at two stations over five days',
      columns: ['Day', 'Station A', 'Station B'],
      rows: [
        ['Monday', '10', '2'],
        ['Tuesday', '10', '18'],
        ['Wednesday', '10', '10'],
        ['Thursday', '10', '3'],
        ['Friday', '10', '17'],
      ],
    },
    q: 'Which statement correctly compares the two data sets?',
    ch: [
      'The means are equal, and the standard deviation of Station B is greater.',
      'The means are equal, and the standard deviations are equal.',
      'The mean of Station B is greater, and its standard deviation is greater.',
      'The mean of Station A is greater, and its standard deviation is greater.',
    ],
    ans: 0,
    exp: 'Station A totals 50 mm over 5 days (mean 10); Station B totals 2 + 18 + 10 + 3 + 17 = 50 mm (mean 10). The means match. Station A has no spread at all — every value is 10, so its standard deviation is 0 — while Station B ranges from 2 to 18. Station B is more spread out.',
    distractorExp: [
      'Correct. Equal means of 10, but Station A has zero spread and Station B is widely spread.',
      'Station A’s values are identical, so its standard deviation is 0 — it cannot equal Station B’s.',
      'Both means are 10. You do not need to compute the standard deviation to rule this out.',
      'Both means are 10, and Station A is the *less* spread of the two.',
    ],
  },

  // ── Probability ───────────────────────────────────────────────────────────
  {
    id: 'sat-m-prb-0001', section: 'math', domain: 'psda', skill: 'probability',
    difficulty: 'M', format: 'mcq', trap: 'percent_of_what', targetSeconds: 75,
    figure: {
      type: 'table',
      title: 'Student survey: preferred class format',
      columns: ['', 'Prefers online', 'Prefers in person', 'Total'],
      rows: [
        ['Juniors', '45', '65', '110'],
        ['Seniors', '45', '45', '90'],
        ['Total', '90', '110', '200'],
      ],
    },
    q: 'If one of the surveyed students who prefers online classes is selected at random, what is the probability that the student is a junior?',
    ch: ['45/200', '45/110', '45/90', '90/200'],
    ans: 2,
    exp: 'The phrase "who prefers online classes" restricts the pool to the 90 students in that column. Of those, 45 are juniors, so the probability is 45/90 = 1/2.',
    distractorExp: [
      '45/200 uses the whole survey as the denominator, ignoring the restriction to online-preferring students.',
      '110 is the junior total — the wrong restriction. The condition given is the format preference, not the year.',
      'Correct. Conditional on the 90 online-preferring students, 45 are juniors.',
      '90/200 is the probability a random student prefers online, which is a different question.',
    ],
  },
  {
    id: 'sat-m-prb-0002', section: 'math', domain: 'psda', skill: 'probability',
    difficulty: 'E', format: 'spr', trap: 'percent_of_what', targetSeconds: 60,
    q: 'A bag contains 5 red, 8 blue, and 7 green marbles. One marble is drawn at random. What is the probability that it is NOT blue? Give your answer as a decimal.',
    sprAccept: { values: [0.6, '3/5', '12/20'], tolerance: 0 },
    exp: 'Total marbles = 5 + 8 + 7 = 20. Not blue = 5 + 7 = 12. So the probability is 12/20 = 0.6.',
    hint: 'Count the favourable outcomes directly, or use 1 − P(blue).',
  },

  // ── Inference from Samples and Evaluating Claims ──────────────────────────
  {
    id: 'sat-m-inm-0001', section: 'math', domain: 'psda', skill: 'inference_margin_error',
    difficulty: 'M', format: 'mcq', trap: 'correlation_cause', targetSeconds: 70,
    q: 'A researcher surveyed 500 randomly selected residents of a city and found that 62 percent supported a proposed transit levy, with a margin of error of 4 percent at the 95 percent confidence level. Which conclusion is best supported?',
    ch: [
      'Exactly 62 percent of all city residents support the levy.',
      'It is plausible that between 58 and 66 percent of all city residents support the levy.',
      'Between 58 and 66 percent of the 500 surveyed residents support the levy.',
      'If the survey were repeated, the result would always fall between 58 and 66 percent.',
    ],
    ans: 1,
    exp: 'A margin of error creates a plausible interval for the *population* value: 62 ± 4, i.e. 58 to 66 percent. It is a statement about uncertainty, not a guarantee.',
    distractorExp: [
      'A sample never pins down the population value exactly — that is the entire reason a margin of error is reported.',
      'Correct. The interval estimates the population proportion, with stated uncertainty.',
      'The 62 percent figure for the sample is known exactly; the interval is about the population, not the sample.',
      '"Always" overstates it. At 95 percent confidence, roughly one repetition in twenty would fall outside the interval.',
    ],
  },
  {
    id: 'sat-m-inm-0002', section: 'math', domain: 'psda', skill: 'inference_margin_error',
    difficulty: 'H', format: 'mcq', trap: 'correlation_cause', targetSeconds: 75,
    q: 'A study found that students who ate breakfast scored higher on a standardised test than students who did not. The students were not assigned to groups; they reported their own habits. Which conclusion is most appropriate?',
    ch: [
      'Eating breakfast causes test scores to increase in the students studied.',
      'Breakfast is associated with higher scores, but causation is not established.',
      'Scoring well causes students to start eating breakfast more regularly.',
      'Breakfast has been shown to have no effect whatever on test performance.',
    ],
    ans: 1,
    exp: 'Without random assignment the two groups may differ in other ways — household routine, sleep, income — that affect scores independently. An observational study supports association, not causation.',
    distractorExp: [
      'Causation requires random assignment to rule out confounding variables. Self-reported habits do not.',
      'Correct. Association is established; causation is not.',
      'Reversing the arrow is no better supported than the original causal claim.',
      'The study found a difference, so it certainly does not show "no effect".',
    ],
  },
];
