// Algebra — 35% of the Math section, tied for the largest math domain.
// Skills: linear_equations_1var, linear_equations_2var, linear_functions,
//         systems_linear, linear_inequalities.
//
// `format: 'spr'` items are student-produced response (grid-in). They carry no
// `ch`/`distractorExp` and instead supply `sprAccept`, whose `values` array
// lists every accepted form (decimal and fraction alike) — the SAT accepts any
// equivalent representation that fits the grid.
export const MATH_ALGEBRA_QUESTIONS = [
  // ── Linear Equations in One Variable ──────────────────────────────────────
  {
    id: 'sat-m-le1-0001', section: 'math', domain: 'algebra', skill: 'linear_equations_1var',
    difficulty: 'E', format: 'mcq', trap: 'distributed_wrong', targetSeconds: 55,
    q: 'If 5(x − 3) = 2x + 9, what is the value of x?',
    ch: ['4', '6', '8', '12'],
    ans: 2,
    exp: 'Distribute: 5x − 15 = 2x + 9. Subtract 2x: 3x − 15 = 9. Add 15: 3x = 24, so x = 8.',
    distractorExp: [
      'You get 4 by distributing as 5x − 3 instead of 5x − 15 (forgetting to multiply the 3 by 5).',
      'You get 6 by subtracting 15 from 9 instead of adding it.',
      'Correct. 5x − 15 = 2x + 9 → 3x = 24 → x = 8.',
      'You get 12 by dividing 24 by 2 instead of 3 — dropping the 2x you subtracted.',
    ],
  },
  {
    id: 'sat-m-le1-0002', section: 'math', domain: 'algebra', skill: 'linear_equations_1var',
    difficulty: 'M', format: 'spr', trap: 'solved_for_wrong', targetSeconds: 70,
    q: 'The equation 3(2x + k) = 6x + 15 has infinitely many solutions. What is the value of k?',
    sprAccept: { values: [5], tolerance: 0 },
    exp: 'Distribute the left side: 6x + 3k = 6x + 15. For infinitely many solutions the two sides must be identical, so 3k = 15 and k = 5. (Note the x terms already match — that is what makes "infinitely many" possible at all.)',
    hint: 'Infinitely many solutions means the two sides are the same expression, term for term.',
  },
  {
    id: 'sat-m-le1-0003', section: 'math', domain: 'algebra', skill: 'linear_equations_1var',
    difficulty: 'H', format: 'mcq', trap: 'sign_error', targetSeconds: 70,
    q: 'In the equation 4x + c = 4x − 9, c is a constant. Which statement about the equation is true?',
    ch: [
      'It has exactly one solution, x = −9, regardless of the value of c.',
      'It has no solution, whatever value the constant c happens to take.',
      'It has infinitely many solutions if c = −9, and none otherwise.',
      'It has infinitely many solutions for every possible value of c.',
    ],
    ans: 2,
    exp: 'Subtracting 4x from both sides leaves c = −9. This is either always true (if c really is −9, giving infinitely many solutions) or never true (any other c, giving no solution). The variable has vanished, so no single x can be "the" solution.',
    distractorExp: [
      'Once the 4x terms cancel there is no x left, so no specific value of x can be the solution.',
      'When c = −9 the equation reduces to −9 = −9, which is true for every x.',
      'Correct. c = −9 makes both sides identical; any other c makes the equation impossible.',
      'Only c = −9 produces infinitely many solutions; other values give none.',
    ],
  },

  // ── Linear Equations in Two Variables ─────────────────────────────────────
  {
    id: 'sat-m-le2-0001', section: 'math', domain: 'algebra', skill: 'linear_equations_2var',
    difficulty: 'M', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 70,
    q: 'A line in the xy-plane passes through the points (2, 5) and (6, 17). What is the y-intercept of the line?',
    ch: ['−1', '1', '3', '5'],
    ans: 0,
    exp: 'Slope = (17 − 5)/(6 − 2) = 12/4 = 3. Using y = 3x + b with (2, 5): 5 = 6 + b, so b = −1.',
    distractorExp: [
      'Correct. Slope 3, and substituting (2, 5) gives b = −1.',
      'Sign slip: 5 = 6 + b gives b = −1, not +1.',
      '3 is the slope, not the y-intercept.',
      '5 is the y-coordinate of the given point (2, 5), not the value of y when x = 0.',
    ],
  },
  {
    id: 'sat-m-le2-0002', section: 'math', domain: 'algebra', skill: 'linear_equations_2var',
    difficulty: 'M', format: 'mcq', trap: 'unit_mismatch', targetSeconds: 75,
    q: 'A tank contains 240 litres of water and is draining at a constant rate of 15 litres per minute. Which equation gives the volume V, in litres, remaining after t minutes?',
    ch: ['V = 15t + 240', 'V = 240 − 15t', 'V = 240t − 15', 'V = 15 − 240t'],
    ans: 1,
    exp: 'Start at 240 and lose 15 litres each minute: V = 240 − 15t. The starting amount is the intercept; the rate of loss is a negative slope.',
    distractorExp: [
      'This adds water instead of draining it — the sign of the rate is wrong.',
      'Correct. Initial 240 litres, decreasing by 15 per minute.',
      'This treats 240 as a rate and 15 as a starting amount, reversing their roles.',
      'This starts the tank at 15 litres and drains 240 per minute.',
    ],
  },
  {
    id: 'sat-m-le2-0003', section: 'math', domain: 'algebra', skill: 'linear_equations_2var',
    difficulty: 'H', format: 'mcq', trap: 'sign_error', targetSeconds: 80,
    q: 'Line ℓ is perpendicular to the line 2x + 3y = 12 and passes through the point (4, 1). What is the slope of line ℓ?',
    ch: ['−2/3', '2/3', '−3/2', '3/2'],
    ans: 3,
    exp: 'Rewrite 2x + 3y = 12 as y = −(2/3)x + 4, so its slope is −2/3. Perpendicular slopes are negative reciprocals: −1 ÷ (−2/3) = 3/2. (The point (4, 1) is not needed for the slope.)',
    distractorExp: [
      '−2/3 is the slope of the original line, not of a perpendicular one.',
      '2/3 is the reciprocal-free sign flip; the negative reciprocal also inverts the fraction.',
      '−3/2 inverts the fraction but keeps the negative sign. The negative reciprocal of a negative slope is positive.',
      'Correct. Negative reciprocal of −2/3 is 3/2.',
    ],
  },

  // ── Linear Functions ──────────────────────────────────────────────────────
  {
    id: 'sat-m-lfn-0001', section: 'math', domain: 'algebra', skill: 'linear_functions',
    difficulty: 'E', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 60,
    q: 'A repair service charges a fixed call-out fee plus an hourly rate. The total cost, in dollars, for h hours of work is given by C(h) = 45h + 75. Which statement best interprets the number 75 in this context?',
    ch: [
      'The service charges $75 for each hour of work performed.',
      'There is a flat $75 charge before any hours.',
      'The total cost is $75 when 1 hour of work is done.',
      'The cost increases by $75 for each additional hour.',
    ],
    ans: 1,
    exp: '75 is the constant term — the value of C when h = 0. That is the fee owed before any hourly charges accrue.',
    distractorExp: [
      'The hourly rate is 45, the coefficient of h.',
      'Correct. 75 is C(0), the fixed call-out fee.',
      'C(1) = 45 + 75 = 120, not 75.',
      'The per-hour increase is the slope, 45.',
    ],
  },
  {
    id: 'sat-m-lfn-0002', section: 'math', domain: 'algebra', skill: 'linear_functions',
    difficulty: 'M', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 70,
    q: 'For the linear function f, f(2) = 11 and f(5) = 23. What is the value of f(0)?',
    ch: ['3', '5', '7', '9'],
    ans: 0,
    exp: 'Rate of change = (23 − 11)/(5 − 2) = 12/3 = 4. Going from f(2) = 11 back two steps to f(0): 11 − 2(4) = 3.',
    distractorExp: [
      'Correct. Slope 4, so f(0) = 11 − 8 = 3.',
      'You get 5 by stepping back only one unit instead of two.',
      '7 comes from subtracting 4 from 11 once and then stopping short.',
      '9 subtracts 2 rather than 2 × 4.',
    ],
  },
  {
    id: 'sat-m-lfn-0003', section: 'math', domain: 'algebra', skill: 'linear_functions',
    difficulty: 'H', format: 'spr', trap: 'solved_for_wrong', targetSeconds: 85,
    q: 'The function g is defined by g(x) = ax + b, where a and b are constants. If g(3) = 14 and g(7) = 26, what is the value of g(10)?',
    sprAccept: { values: [35], tolerance: 0 },
    exp: 'a = (26 − 14)/(7 − 3) = 12/4 = 3. From g(7) = 26, step up three more units: 26 + 3(3) = 35. (If you prefer solving for b: 14 = 3(3) + b gives b = 5, so g(10) = 30 + 5 = 35.)',
    hint: 'Find the rate of change first, then step from a known point — you may not need b at all.',
  },

  // ── Systems of Linear Equations ───────────────────────────────────────────
  {
    id: 'sat-m-sys-0001', section: 'math', domain: 'algebra', skill: 'systems_linear',
    difficulty: 'M', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 75,
    q: 'If 2x + 3y = 19 and x − y = 2, what is the value of x?',
    ch: ['3', '4', '5', '7'],
    ans: 2,
    exp: 'From the second equation, x = y + 2. Substituting: 2(y + 2) + 3y = 19 → 5y + 4 = 19 → y = 3, so x = 5.',
    distractorExp: [
      '3 is the value of y, not x — a classic solved-for-the-wrong-variable slip.',
      '4 would follow from x = y + 1 rather than x = y + 2.',
      'Correct. y = 3 and x = y + 2 = 5.',
      '7 comes from adding the two equations without aligning coefficients.',
    ],
  },
  {
    id: 'sat-m-sys-0002', section: 'math', domain: 'algebra', skill: 'systems_linear',
    difficulty: 'H', format: 'spr', trap: 'solved_for_wrong', targetSeconds: 90,
    q: 'The system kx + 6y = 10 and 4x + 3y = 7 has no solution, where k is a constant. What is the value of k?',
    sprAccept: { values: [8], tolerance: 0 },
    exp: 'No solution means the lines are parallel but not identical — the coefficients of x and y are proportional while the constants are not. 6/3 = 2, so k/4 must also equal 2, giving k = 8. (Check: 8x + 6y = 10 versus a doubled second equation 8x + 6y = 14 — same left side, different constants, so genuinely no solution.)',
    hint: 'Parallel lines have proportional x- and y-coefficients. Match the ratio, then confirm the constants do NOT match.',
  },
  {
    id: 'sat-m-sys-0003', section: 'math', domain: 'algebra', skill: 'systems_linear',
    difficulty: 'M', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 80,
    q: 'A theatre sold 200 tickets and collected $2,600. Adult tickets cost $18 and student tickets cost $8. How many student tickets were sold?',
    ch: ['60', '100', '120', '140'],
    ans: 1,
    exp: 'Let s be student tickets and a adult: a + s = 200 and 18a + 8s = 2600. Substituting a = 200 − s: 18(200 − s) + 8s = 2600 → 3600 − 10s = 2600 → 10s = 1000 → s = 100.',
    distractorExp: [
      '60 does not satisfy the revenue equation: 18(140) + 8(60) = 3000.',
      'Correct. 100 adult at $18 and 100 student at $8 gives 1800 + 800 = $2,600.',
      '120 would give 18(80) + 8(120) = 1440 + 960 = $2,400.',
      '140 would give 18(60) + 8(140) = 1080 + 1120 = $2,200.',
    ],
  },

  // ── Linear Inequalities ───────────────────────────────────────────────────
  {
    id: 'sat-m-lin-0001', section: 'math', domain: 'algebra', skill: 'linear_inequalities',
    difficulty: 'M', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 75,
    q: 'A student has $60 to spend. She buys one bag costing $12 and notebooks costing $4.50 each. What is the greatest number of notebooks she can buy?',
    ch: ['9', '10', '11', '13'],
    ans: 1,
    exp: '4.50n + 12 ≤ 60 → 4.50n ≤ 48 → n ≤ 10.67. She cannot buy part of a notebook, so the greatest whole number is 10.',
    distractorExp: [
      '9 is possible but not the greatest — 10 notebooks cost $45, and $45 + $12 = $57 ≤ $60.',
      'Correct. 10 notebooks plus the bag costs $57; 11 would cost $61.50.',
      '11 costs 4.50(11) + 12 = $61.50, which exceeds $60.',
      '13 ignores the $12 bag entirely (60 ÷ 4.50 ≈ 13.3).',
    ],
  },
  {
    id: 'sat-m-lin-0002', section: 'math', domain: 'algebra', skill: 'linear_inequalities',
    difficulty: 'H', format: 'mcq', trap: 'sign_error', targetSeconds: 70,
    q: 'Which of the following is equivalent to −3x + 7 > 19?',
    ch: ['x > −4', 'x < −4', 'x > 4', 'x < 4'],
    ans: 1,
    exp: 'Subtract 7: −3x > 12. Divide by −3 and flip the inequality sign because you divided by a negative: x < −4.',
    distractorExp: [
      'The sign must flip when dividing by a negative number.',
      'Correct. −3x > 12 becomes x < −4 after dividing by −3 and reversing the inequality.',
      'This both fails to flip the sign and drops the negative on 4.',
      'The direction is right but the sign of 4 is wrong — 12 ÷ (−3) = −4.',
    ],
  },
];
