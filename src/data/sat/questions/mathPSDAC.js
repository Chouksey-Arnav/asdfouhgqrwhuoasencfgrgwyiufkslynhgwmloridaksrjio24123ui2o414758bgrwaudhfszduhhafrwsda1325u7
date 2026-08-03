// Problem-Solving and Data Analysis — expansion batch C.
//
// The smallest of the three batch C math files, because PSDA was the math
// domain closest to supporting a third form already. It is topped up here only
// where the audit showed a shortfall.
export const MATH_PSDA_C = [
  // ── Ratios, Rates and Units ───────────────────────────────────────────────
  {
    id: 'sat-m-rru-0201', section: 'math', domain: 'psda', skill: 'ratios_rates_units',
    difficulty: 'E', format: 'mcq', trap: 'percent_of_what', targetSeconds: 55,
    q: 'A recipe uses 3 cups of flour to make 12 cookies. At the same rate, how many cups of flour are needed to make 40 cookies?',
    ch: ['8', '10', '12', '16'],
    ans: 1,
    exp: 'The rate is 3/12 = 0.25 cups per cookie. For 40 cookies: 40 × 0.25 = 10 cups.',
    distractorExp: [
      'You get 8 by scaling as though 40 cookies were 32 — the arithmetic 3 × (40/15).',
      'Correct. 0.25 cups per cookie × 40 = 10.',
      'You get 12 by copying the cookie count from the given ratio.',
      'You get 16 by inverting the rate and computing 40/12 × 4.8.',
    ],
  },
  {
    id: 'sat-m-rru-0202', section: 'math', domain: 'psda', skill: 'ratios_rates_units',
    difficulty: 'M', format: 'spr', trap: 'unit_mismatch', targetSeconds: 70,
    q: 'A car travels 156 miles in 3 hours. At the same average speed, how many miles will it travel in 7 hours?',
    sprAccept: { values: [364], tolerance: 0 },
    exp: 'The average speed is 156/3 = 52 miles per hour. Over 7 hours: 52 × 7 = 364 miles.',
    hint: 'Find the per-hour rate first, then multiply by the new number of hours.',
  },

  // ── Percentages ───────────────────────────────────────────────────────────
  {
    id: 'sat-m-pct-0201', section: 'math', domain: 'psda', skill: 'percentages',
    difficulty: 'E', format: 'mcq', trap: 'percent_of_what', targetSeconds: 50,
    q: 'What is 15% of 240?',
    ch: ['16', '36', '45', '160'],
    ans: 1,
    exp: '15% of 240 = 0.15 × 240 = 36.',
    distractorExp: [
      'You get 16 by computing 240/15 instead of 15% of 240.',
      'Correct. 0.15 × 240 = 36.',
      'You get 45 by taking 15% of 300 rather than of 240.',
      'You get 160 by dividing by 1.5 instead of multiplying by 0.15.',
    ],
  },
  {
    id: 'sat-m-pct-0202', section: 'math', domain: 'psda', skill: 'percentages',
    difficulty: 'H', format: 'mcq', trap: 'percent_of_what', targetSeconds: 80,
    q: 'The price of a coat is increased by 20%, and the new price is then reduced by 20%. Compared with the original price, the final price is',
    ch: [
      '4% lower.',
      'exactly the same.',
      '4% higher.',
      '20% lower.',
    ],
    ans: 0,
    exp: 'Multiplying by 1.20 and then by 0.80 gives 0.96 of the original, a 4% decrease. The two percentages are taken of DIFFERENT bases: the increase is 20% of the original, the decrease is 20% of the larger, increased price.',
    distractorExp: [
      'Correct. 1.20 × 0.80 = 0.96, so the price ends 4% below where it started.',
      'This assumes the two 20% changes are taken of the same base, but the second is taken of the increased price.',
      'The larger of the two changes is the decrease, because it applies to the larger amount — so the final price is lower, not higher.',
      'The 20% reduction applies to the increased price, not to the original, so the net change is much smaller than 20%.',
    ],
  },

  // ── Distributions and Measures of Centre ──────────────────────────────────
  {
    id: 'sat-m-dat-0201', section: 'math', domain: 'psda', skill: 'data_distributions',
    difficulty: 'E', format: 'mcq', trap: 'mean_vs_median', targetSeconds: 50,
    q: 'What is the median of the data set 4, 7, 9, 12, 20?',
    ch: ['9', '10.4', '12', '16'],
    ans: 0,
    exp: 'The values are already in order and there are five of them, so the median is the third value: 9.',
    distractorExp: [
      'Correct. The middle value of five ordered values is the third, which is 9.',
      'That is the mean (52/5 = 10.4), not the median.',
      'That is the fourth value, one place past the middle.',
      'That is the midpoint between the smallest and largest values, which is the midrange, not the median.',
    ],
  },
  {
    id: 'sat-m-dat-0202', section: 'math', domain: 'psda', skill: 'data_distributions',
    difficulty: 'M', format: 'mcq', trap: 'mean_vs_median', targetSeconds: 65,
    q: 'For the data set 3, 5, 5, 6, 31, which statement is true?',
    ch: [
      'The mean is greater than the median.',
      'The mean is less than the median.',
      'The mean and the median are equal.',
      'The median cannot be determined from this data set.',
    ],
    ans: 0,
    exp: 'The mean is (3 + 5 + 5 + 6 + 31)/5 = 50/5 = 10, and the median is the middle value, 5. A single large outlier pulls the mean upward while leaving the median where it is.',
    distractorExp: [
      'Correct. Mean 10, median 5 — the outlier 31 drags the mean up.',
      'This is the direction an outlier at the LOW end would produce.',
      'They would be equal only in a symmetric data set, and 31 breaks the symmetry badly.',
      'The median of five ordered values is simply the third one, so it is perfectly determined.',
    ],
  },

  // ── Probability ───────────────────────────────────────────────────────────
  {
    id: 'sat-m-prb-0201', section: 'math', domain: 'psda', skill: 'probability',
    difficulty: 'E', format: 'mcq', trap: 'percent_of_what', targetSeconds: 50,
    q: 'A bag contains 5 red marbles, 3 blue marbles and 2 green marbles. If one marble is selected at random, what is the probability that it is blue?',
    ch: ['3/10', '3/7', '1/3', '3/5'],
    ans: 0,
    exp: 'There are 5 + 3 + 2 = 10 marbles in total and 3 are blue, so the probability is 3/10.',
    distractorExp: [
      'Correct. 3 blue out of 10 marbles.',
      'This divides by the number of NON-blue marbles (7) rather than by the total.',
      'This compares blue to the number of colours rather than to the number of marbles.',
      'This uses the red count as the denominator.',
    ],
  },

  // ── Inference and Margin of Error ─────────────────────────────────────────
  {
    id: 'sat-m-inf-0201', section: 'math', domain: 'psda', skill: 'inference_margin_error',
    difficulty: 'H', format: 'mcq', trap: 'correlation_cause', targetSeconds: 85,
    q: 'A random sample of 400 residents found that 62% support a proposed cycle lane, with an associated margin of error of 4 percentage points. Which conclusion is best supported?',
    ch: [
      'It is plausible that between 58% and 66% of all residents support the proposal.',
      'Exactly 62% of all residents support the proposal.',
      'Between 58% and 66% of the 400 residents sampled support the proposal.',
      'If 400 more residents were sampled, exactly 62% of them would support the proposal.',
    ],
    ans: 0,
    exp: 'A margin of error describes the uncertainty in extending a SAMPLE result to the POPULATION. 62% ± 4 gives a plausible range of 58% to 66% for all residents.',
    distractorExp: [
      'Correct. The interval is a statement about the whole population, not the sample.',
      'A sample never pins the population down exactly; that is what the margin of error is there to say.',
      'The sample figure is known exactly — it is 62%. The interval is not about the people already surveyed.',
      'A new sample would give a new figure near 62%, not exactly it. Margins of error exist precisely because samples vary.',
    ],
  },
];
