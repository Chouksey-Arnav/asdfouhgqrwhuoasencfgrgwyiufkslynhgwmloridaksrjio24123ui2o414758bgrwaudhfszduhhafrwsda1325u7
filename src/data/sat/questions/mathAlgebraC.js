// Algebra — expansion batch C.
//
// Sized against scripts/verifySatForms.mjs rather than against drill coverage:
// see the note at the top of rwCraftStructureC.js. Algebra is 35% of the Math
// section, so it is the first math domain a third form runs out of.
//
// `format: 'spr'` items are student-produced response (grid-in) and carry
// `sprAccept` instead of `ch`/`distractorExp`. Roughly a quarter of the items
// here are grid-ins, matching the share a real Math module carries.
export const MATH_ALGEBRA_C = [
  // ── Linear Equations in One Variable ──────────────────────────────────────
  {
    id: 'sat-m-le1-0201', section: 'math', domain: 'algebra', skill: 'linear_equations_1var',
    difficulty: 'E', format: 'mcq', trap: 'sign_error', targetSeconds: 50,
    q: 'If 7x + 4 = 3x + 24, what is the value of x?',
    ch: ['4', '5', '6', '7'],
    ans: 1,
    exp: 'Subtract 3x from both sides: 4x + 4 = 24. Subtract 4: 4x = 20, so x = 5.',
    distractorExp: [
      'You get 4 by dividing 24 by 6 instead of dividing 20 by 4.',
      'Correct. 4x = 20, so x = 5.',
      'You get 6 by adding 4 to 20 instead of subtracting it.',
      'You get 7 by subtracting 3x from 7x but forgetting to move the 4.',
    ],
  },
  {
    id: 'sat-m-le1-0202', section: 'math', domain: 'algebra', skill: 'linear_equations_1var',
    difficulty: 'E', format: 'spr', trap: 'solved_for_wrong', targetSeconds: 55,
    q: 'If x/4 + 3 = 10, what is the value of x?',
    sprAccept: { values: [28], tolerance: 0 },
    exp: 'Subtract 3 from both sides: x/4 = 7. Multiply both sides by 4: x = 28.',
    hint: 'Undo the addition before you undo the division.',
  },
  {
    id: 'sat-m-le1-0203', section: 'math', domain: 'algebra', skill: 'linear_equations_1var',
    difficulty: 'E', format: 'mcq', trap: 'distributed_wrong', targetSeconds: 50,
    q: 'If 2(x − 4) = 10, what is the value of x?',
    ch: ['5', '7', '9', '14'],
    ans: 2,
    exp: 'Divide both sides by 2: x − 4 = 5. Add 4: x = 9.',
    distractorExp: [
      'You get 5 by dividing by 2 and then stopping, without adding the 4 back.',
      'You get 7 by distributing as 2x − 4 instead of 2x − 8.',
      'Correct. x − 4 = 5, so x = 9.',
      'You get 14 by adding 4 to 10 first and forgetting to divide by 2.',
    ],
  },
  {
    id: 'sat-m-le1-0204', section: 'math', domain: 'algebra', skill: 'linear_equations_1var',
    difficulty: 'M', format: 'mcq', trap: 'sign_error', targetSeconds: 60,
    q: 'If 5x − 2(x + 3) = 12, what is the value of x?',
    ch: ['2', '3', '6', '9'],
    ans: 2,
    exp: 'Distribute the −2: 5x − 2x − 6 = 12, so 3x − 6 = 12. Add 6: 3x = 18, and x = 6.',
    distractorExp: [
      'You get 2 by distributing as −2x + 6, flipping the sign on the second term.',
      'You get 3 by distributing as −2x + 3, multiplying only the x by −2.',
      'Correct. 3x = 18, so x = 6.',
      'You get 9 by dividing 18 by 2 instead of by 3.',
    ],
  },
  {
    id: 'sat-m-le1-0205', section: 'math', domain: 'algebra', skill: 'linear_equations_1var',
    difficulty: 'H', format: 'mcq', trap: 'sign_error', targetSeconds: 70,
    q: 'In the equation 2(3x − c) = 6x − 14, c is a constant. For what value of c does the equation have infinitely many solutions?',
    ch: ['−14', '−7', '7', '14'],
    ans: 2,
    exp: 'Distribute: 6x − 2c = 6x − 14. The x terms already match, so the equation is true for every x exactly when the constants match: −2c = −14, giving c = 7.',
    distractorExp: [
      'You get −14 by matching −2c to −14 without dividing by −2 at all.',
      'You get −7 by dividing correctly but keeping the negative sign that the −2 cancels.',
      'Correct. −2c = −14 gives c = 7.',
      'You get 14 by dropping the factor of 2 when distributing.',
    ],
  },

  // ── Linear Equations in Two Variables ─────────────────────────────────────
  {
    id: 'sat-m-le2-0201', section: 'math', domain: 'algebra', skill: 'linear_equations_2var',
    difficulty: 'E', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 55,
    q: 'A line in the xy-plane passes through the points (0, 4) and (3, 10). What is the slope of the line?',
    ch: ['1/2', '2', '3', '6'],
    ans: 1,
    exp: 'Slope = (10 − 4)/(3 − 0) = 6/3 = 2.',
    distractorExp: [
      'You get 1/2 by dividing the run by the rise instead of the rise by the run.',
      'Correct. 6/3 = 2.',
      'You get 3 by reporting the run rather than the slope.',
      'You get 6 by reporting the rise and never dividing.',
    ],
  },
  {
    id: 'sat-m-le2-0202', section: 'math', domain: 'algebra', skill: 'linear_equations_2var',
    difficulty: 'E', format: 'spr', trap: 'solved_for_wrong', targetSeconds: 60,
    q: 'The equation 3x + 5y = 45 relates x and y. If y = 3, what is the value of x?',
    sprAccept: { values: [10], tolerance: 0 },
    exp: 'Substitute y = 3: 3x + 15 = 45. Subtract 15: 3x = 30, so x = 10.',
    hint: 'Substitute first, then solve the one-variable equation that is left.',
  },
  {
    id: 'sat-m-le2-0203', section: 'math', domain: 'algebra', skill: 'linear_equations_2var',
    difficulty: 'M', format: 'mcq', trap: 'sign_error', targetSeconds: 65,
    q: 'What is the y-intercept of the line with equation 2x − 5y = 20?',
    ch: ['(0, −4)', '(0, 4)', '(0, −10)', '(0, 10)'],
    ans: 0,
    exp: 'The y-intercept has x = 0, so −5y = 20 and y = −4. The point is (0, −4).',
    distractorExp: [
      'Correct. −5y = 20 gives y = −4.',
      'You get 4 by dividing 20 by 5 and dropping the negative sign.',
      'You get −10 by setting y = 0 instead of x = 0, which finds the x-intercept.',
      'You get 10 by setting y = 0 and also dropping the sign.',
    ],
  },
  {
    id: 'sat-m-le2-0204', section: 'math', domain: 'algebra', skill: 'linear_equations_2var',
    difficulty: 'H', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 75,
    q: 'A line in the xy-plane passes through (−2, 7) and (4, −5). At what value of x does the line cross the x-axis?',
    ch: ['1.5', '3', '−1.5', '6'],
    ans: 0,
    exp: 'Slope = (−5 − 7)/(4 − (−2)) = −12/6 = −2. Using y = −2x + b with (4, −5): −5 = −8 + b, so b = 3. Setting y = 0: 0 = −2x + 3, so x = 1.5.',
    distractorExp: [
      'Correct. The line is y = −2x + 3, which crosses y = 0 at x = 1.5.',
      'That is the y-intercept, b = 3 — the crossing of the other axis.',
      'You get −1.5 by solving −2x = 3 instead of −2x = −3 after moving the 3 across.',
      'You get 6 by using the run of 6 rather than solving for the intercept.',
    ],
  },

  // ── Linear Functions ──────────────────────────────────────────────────────
  {
    id: 'sat-m-lfn-0201', section: 'math', domain: 'algebra', skill: 'linear_functions',
    difficulty: 'E', format: 'mcq', trap: 'sign_error', targetSeconds: 45,
    q: 'The function f is defined by f(x) = 3x − 7. What is the value of f(5)?',
    ch: ['2', '8', '15', '22'],
    ans: 1,
    exp: 'f(5) = 3(5) − 7 = 15 − 7 = 8.',
    distractorExp: [
      'You get 2 by computing 5 − 3 instead of 3 × 5 − 7.',
      'Correct. 15 − 7 = 8.',
      'You get 15 by stopping after multiplying and never subtracting the 7.',
      'You get 22 by adding 7 instead of subtracting it.',
    ],
  },
  {
    id: 'sat-m-lfn-0202', section: 'math', domain: 'algebra', skill: 'linear_functions',
    difficulty: 'E', format: 'spr', trap: 'solved_for_wrong', targetSeconds: 60,
    q: 'The function f is linear. If f(0) = 6 and f(4) = 18, what is the value of f(10)?',
    sprAccept: { values: [36], tolerance: 0 },
    exp: 'The rate of change is (18 − 6)/(4 − 0) = 3 per unit, and f(0) = 6, so f(x) = 3x + 6. Then f(10) = 30 + 6 = 36.',
    hint: 'f(0) is the starting value; find how much f changes per unit of x.',
  },
  {
    id: 'sat-m-lfn-0203', section: 'math', domain: 'algebra', skill: 'linear_functions',
    difficulty: 'M', format: 'mcq', trap: 'sign_error', targetSeconds: 65,
    q: 'The linear function h satisfies h(2) = 9 and h(6) = 1. What is the value of h(0)?',
    ch: ['5', '11', '13', '17'],
    ans: 2,
    exp: 'Rate of change = (1 − 9)/(6 − 2) = −8/4 = −2. Going from h(2) = 9 back two units of x: h(0) = 9 − 2(−2) = 9 + 4 = 13.',
    distractorExp: [
      'You get 5 by stepping the wrong way, subtracting 4 from 9 instead of adding it.',
      'You get 11 by stepping back only one unit of x instead of two.',
      'Correct. Slope −2, so h(0) = 9 + 4 = 13.',
      'You get 17 by stepping back four units of x instead of two.',
    ],
  },
  {
    id: 'sat-m-lfn-0204', section: 'math', domain: 'algebra', skill: 'linear_functions',
    difficulty: 'H', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 75,
    q: 'The function f is defined by f(x) = mx + b, where m and b are constants. If f(7) − f(3) = 12, what is the value of m?',
    ch: ['3', '4', '12', '−3'],
    ans: 0,
    exp: 'f(7) − f(3) = (7m + b) − (3m + b) = 4m. The b terms cancel, so 4m = 12 and m = 3.',
    distractorExp: [
      'Correct. 4m = 12, so m = 3.',
      'That is the gap in x (7 − 3 = 4), not the slope.',
      'That is the total change in f, which still has to be divided by the change in x.',
      'You get −3 by subtracting in the order f(3) − f(7) while keeping the value 12 positive.',
    ],
  },

  // ── Systems of Linear Equations ───────────────────────────────────────────
  {
    id: 'sat-m-sys-0201', section: 'math', domain: 'algebra', skill: 'systems_linear',
    difficulty: 'E', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 55,
    q: 'If x + y = 12 and x − y = 4, what is the value of y?',
    ch: ['2', '4', '6', '8'],
    ans: 1,
    exp: 'Adding the two equations gives 2x = 16, so x = 8. Substituting into x + y = 12 gives y = 4.',
    distractorExp: [
      'You get 2 by subtracting the equations to get 2y = 8 and then dividing by 4.',
      'Correct. x = 8, so y = 12 − 8 = 4.',
      'You get 6 by halving 12, which would only be right if x and y were equal.',
      'That is x, not y — the classic solved-for-the-wrong-variable slip.',
    ],
  },
  {
    id: 'sat-m-sys-0202', section: 'math', domain: 'algebra', skill: 'systems_linear',
    difficulty: 'E', format: 'spr', trap: 'solved_for_wrong', targetSeconds: 65,
    q: 'If y = x + 2 and 3x + y = 18, what is the value of y?',
    sprAccept: { values: [6], tolerance: 0 },
    exp: 'Substitute y = x + 2 into the second equation: 3x + x + 2 = 18, so 4x = 16 and x = 4. Then y = 4 + 2 = 6.',
    hint: 'The first equation is already solved for y, so substitute it straight into the second.',
  },
  {
    id: 'sat-m-sys-0203', section: 'math', domain: 'algebra', skill: 'systems_linear',
    difficulty: 'M', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 70,
    q: 'If 4x + 3y = 25 and 4x − 3y = 7, what is the value of x + y?',
    ch: ['3', '4', '7', '12'],
    ans: 2,
    exp: 'Adding the equations gives 8x = 32, so x = 4. Substituting into the first: 16 + 3y = 25, so 3y = 9 and y = 3. Then x + y = 7.',
    distractorExp: [
      'That is y alone.',
      'That is x alone.',
      'Correct. x = 4 and y = 3, so x + y = 7.',
      'You get 12 by subtracting the equations to get 6y = 18, then adding y = 3 to 3y = 9.',
    ],
  },
  {
    id: 'sat-m-sys-0204', section: 'math', domain: 'algebra', skill: 'systems_linear',
    difficulty: 'H', format: 'mcq', trap: 'distributed_wrong', targetSeconds: 80,
    q: 'The system 3x + ky = 12 and 6x + 10y = 24 has infinitely many solutions, where k is a constant. What is the value of k?',
    ch: ['2', '5', '10', '20'],
    ans: 1,
    exp: 'Infinitely many solutions means the two equations describe the same line. The second equation is exactly twice the first in x (6x = 2 · 3x) and in the constant (24 = 2 · 12), so it must also be twice the first in y: 10y = 2ky, giving k = 5.',
    distractorExp: [
      'You get 2 by reporting the scale factor between the equations rather than k itself.',
      'Correct. 2k = 10, so k = 5.',
      'You get 10 by setting k equal to the second equation’s y-coefficient without halving it.',
      'You get 20 by doubling the y-coefficient rather than halving it.',
    ],
  },

  // ── Linear Inequalities ───────────────────────────────────────────────────
  {
    id: 'sat-m-lin-0201', section: 'math', domain: 'algebra', skill: 'linear_inequalities',
    difficulty: 'E', format: 'mcq', trap: 'sign_error', targetSeconds: 50,
    q: 'Which of the following describes all values of x that satisfy 3x − 5 > 7?',
    ch: ['x > 4', 'x > 2/3', 'x < 4', 'x > 12'],
    ans: 0,
    exp: 'Add 5 to both sides: 3x > 12. Divide by 3: x > 4.',
    distractorExp: [
      'Correct. 3x > 12 gives x > 4.',
      'You get x > 2/3 by subtracting 5 from 7 instead of adding it, which leaves 3x > 2.',
      'The inequality only flips when you multiply or divide by a negative number, and 3 is positive.',
      'You get x > 12 by adding 5 correctly but never dividing by 3.',
    ],
  },
  {
    id: 'sat-m-lin-0202', section: 'math', domain: 'algebra', skill: 'linear_inequalities',
    difficulty: 'M', format: 'mcq', trap: 'sign_error', targetSeconds: 60,
    q: 'Which of the following describes all values of x that satisfy −2x + 5 ≥ 11?',
    ch: ['x ≤ −3', 'x ≥ −3', 'x ≤ 3', 'x ≥ 3'],
    ans: 0,
    exp: 'Subtract 5: −2x ≥ 6. Dividing by −2 reverses the inequality: x ≤ −3.',
    distractorExp: [
      'Correct. Dividing by a negative flips ≥ to ≤, giving x ≤ −3.',
      'The direction was not reversed when dividing by −2.',
      'The sign of the answer was dropped as well as the flip being missed halfway.',
      'Neither the sign nor the direction was handled — this is what you get by ignoring the negative entirely.',
    ],
  },
  {
    id: 'sat-m-lin-0203', section: 'math', domain: 'algebra', skill: 'linear_inequalities',
    difficulty: 'M', format: 'spr', trap: 'unit_mismatch', targetSeconds: 75,
    q: 'A caterer charges a fixed fee of $250 plus $18 for each guest. If a club has a budget of $1,000, what is the greatest number of guests the club can have?',
    sprAccept: { values: [41], tolerance: 0 },
    exp: 'The guest charge can be at most 1000 − 250 = $750. Since 750/18 = 41.67, and a guest cannot be a fraction, the greatest whole number of guests is 41. (41 guests cost 250 + 738 = $988; 42 would cost $1,006.)',
    hint: 'Subtract the fixed fee first, then round the division DOWN — the budget is a ceiling.',
  },
  {
    id: 'sat-m-lin-0204', section: 'math', domain: 'algebra', skill: 'linear_inequalities',
    difficulty: 'H', format: 'mcq', trap: 'sign_error', targetSeconds: 80,
    q: 'How many integer values of x satisfy 5 < 2x − 3 < 13?',
    ch: ['3', '4', '5', '7'],
    ans: 0,
    exp: 'Add 3 throughout: 8 < 2x < 16. Divide by 2: 4 < x < 8. Both inequalities are strict, so the integers are 5, 6 and 7 — three of them.',
    distractorExp: [
      'Correct. 4 < x < 8 contains the integers 5, 6 and 7.',
      'You get 4 by including one endpoint, but both inequalities are strict.',
      'You get 5 by including both endpoints, 4 and 8, neither of which satisfies a strict inequality.',
      'You get 7 by counting the integers between 8 and 16 — that is the range for 2x, before dividing by 2.',
    ],
  },
];
