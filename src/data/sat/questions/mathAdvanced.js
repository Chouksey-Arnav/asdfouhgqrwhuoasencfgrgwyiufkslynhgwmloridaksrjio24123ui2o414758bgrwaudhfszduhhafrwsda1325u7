// Advanced Math — 35% of the Math section, tied for the largest math domain.
// Skills: equivalent_expressions, nonlinear_equations, nonlinear_functions.
export const MATH_ADVANCED_QUESTIONS = [
  // ── Equivalent Expressions ────────────────────────────────────────────────
  {
    id: 'sat-m-eqx-0001', section: 'math', domain: 'advanced_math', skill: 'equivalent_expressions',
    difficulty: 'M', format: 'mcq', trap: 'distributed_wrong', targetSeconds: 70,
    q: 'Which expression is equivalent to (2x³y²)³ ⁄ (4x²y)?',
    ch: ['2x⁷y⁵', '2x⁶y⁵', '4x⁷y⁵', '6x⁷y⁵'],
    ans: 0,
    exp: 'Cube the numerator: (2x³y²)³ = 8x⁹y⁶ — the exponent 3 applies to the coefficient too. Then divide: 8x⁹y⁶ ⁄ 4x²y = 2x⁷y⁵.',
    distractorExp: [
      'Correct. 8x⁹y⁶ ÷ 4x²y = 2x⁷y⁵.',
      'x⁶ comes from multiplying 3 × 3 and then subtracting 3 instead of 2; the denominator has x², so 9 − 2 = 7.',
      'The coefficient is 8 ÷ 4 = 2, not 4. Dividing coefficients is not the same as subtracting exponents.',
      '6 comes from 2 × 3 — the coefficient must be cubed (2³ = 8), not multiplied by the exponent.',
    ],
  },
  {
    id: 'sat-m-eqx-0002', section: 'math', domain: 'advanced_math', skill: 'equivalent_expressions',
    difficulty: 'H', format: 'mcq', trap: 'distributed_wrong', targetSeconds: 80,
    q: 'For x ≠ −3, which expression is equivalent to (x² − 9) ⁄ (x² + 6x + 9)?',
    ch: ['(x − 3)/(x + 3)', '(x + 3)/(x − 3)', 'x − 3', '−3/(6x)'],
    ans: 0,
    exp: 'Factor both parts: the numerator is a difference of squares, (x − 3)(x + 3); the denominator is a perfect square, (x + 3)². One (x + 3) cancels, leaving (x − 3)/(x + 3).',
    distractorExp: [
      'Correct. (x − 3)(x + 3) ⁄ (x + 3)² = (x − 3)/(x + 3).',
      'This is the reciprocal — the surviving (x + 3) is in the denominator, since the denominator started with two of them.',
      'This would require both (x + 3) factors to cancel, but the numerator only supplies one.',
      'Canceling individual terms rather than factors is not a legal operation. You may only cancel whole factors.',
    ],
  },
  {
    id: 'sat-m-eqx-0003', section: 'math', domain: 'advanced_math', skill: 'equivalent_expressions',
    difficulty: 'E', format: 'mcq', trap: 'sign_error', targetSeconds: 60,
    q: 'Which expression is equivalent to (3x − 4)(2x + 5)?',
    ch: ['6x² + 7x − 20', '6x² − 7x − 20', '6x² + 23x − 20', '6x² + 7x + 20'],
    ans: 0,
    exp: 'FOIL: 3x·2x = 6x², 3x·5 = 15x, −4·2x = −8x, −4·5 = −20. Combine the middle terms: 15x − 8x = 7x.',
    distractorExp: [
      'Correct. 6x² + 15x − 8x − 20 = 6x² + 7x − 20.',
      'Sign slip on the middle term: 15x − 8x = +7x, not −7x.',
      '23x comes from adding 15x + 8x instead of subtracting; the −4 makes that term negative.',
      'The last term is (−4)(+5) = −20, not +20.',
    ],
  },

  // ── Nonlinear Equations and Systems ───────────────────────────────────────
  {
    id: 'sat-m-nle-0001', section: 'math', domain: 'advanced_math', skill: 'nonlinear_equations',
    difficulty: 'E', format: 'spr', trap: 'solved_for_wrong', targetSeconds: 70,
    q: 'What is the sum of the solutions to x² − 6x + 5 = 0?',
    sprAccept: { values: [6], tolerance: 0 },
    exp: 'Factor: (x − 1)(x − 5) = 0, so x = 1 or x = 5, and the sum is 6. (Shortcut: for ax² + bx + c = 0 the sum of the roots is −b/a = 6, so you never had to factor at all.)',
    hint: 'The sum of the roots of ax² + bx + c = 0 is −b/a.',
  },
  {
    id: 'sat-m-nle-0002', section: 'math', domain: 'advanced_math', skill: 'nonlinear_equations',
    difficulty: 'H', format: 'mcq', trap: 'extraneous_solution', targetSeconds: 95,
    q: 'What is the solution to √(x + 7) = x − 5?',
    ch: ['x = 2 only', 'x = 9 only', 'x = 2 and x = 9', 'There is no solution.'],
    ans: 1,
    exp: 'Square both sides: x + 7 = x² − 10x + 25 → x² − 11x + 18 = 0 → (x − 2)(x − 9) = 0, giving x = 2 or 9. Now check both in the ORIGINAL equation. x = 2: √9 = 3 but 2 − 5 = −3, so it fails. x = 9: √16 = 4 and 9 − 5 = 4, so it holds. Only x = 9 works.',
    distractorExp: [
      'x = 2 is the extraneous root — a square root is never negative, but 2 − 5 = −3.',
      'Correct. Only x = 9 survives substitution into the original equation.',
      'Both come out of the squared equation, but squaring can create solutions the original rejects. You must always check.',
      'x = 9 does satisfy the original equation, so a solution exists.',
    ],
  },
  {
    id: 'sat-m-nle-0003', section: 'math', domain: 'advanced_math', skill: 'nonlinear_equations',
    difficulty: 'H', format: 'spr', trap: 'sign_error', targetSeconds: 90,
    q: 'In the equation x² + kx + 25 = 0, k is a positive constant. If the equation has exactly one real solution, what is the value of k?',
    sprAccept: { values: [10], tolerance: 0 },
    exp: 'Exactly one real solution means the discriminant is zero: b² − 4ac = 0 → k² − 4(1)(25) = 0 → k² = 100 → k = ±10. The question specifies k is positive, so k = 10.',
    hint: 'One real solution ⇔ discriminant b² − 4ac = 0. Watch the sign restriction in the last sentence.',
  },
  {
    id: 'sat-m-nle-0004', section: 'math', domain: 'advanced_math', skill: 'nonlinear_equations',
    difficulty: 'M', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 85,
    q: 'The system y = x² − 2x − 3 and y = x + 1 has two solutions. What is the sum of their x-coordinates?',
    ch: ['1', '2', '3', '4'],
    ans: 2,
    exp: 'Set them equal: x² − 2x − 3 = x + 1 → x² − 3x − 4 = 0 → (x − 4)(x + 1) = 0, so x = 4 or x = −1. Their sum is 3. (Or read it straight off: −b/a = 3.)',
    distractorExp: [
      '1 comes from solving x² − 2x − 3 = 0 and ignoring the line.',
      '2 is −b/a for the original parabola, before substituting the line.',
      'Correct. x = 4 and x = −1, so the sum is 3.',
      '4 is one of the two x-values, not the sum of both.',
    ],
  },

  // ── Nonlinear Functions ───────────────────────────────────────────────────
  {
    id: 'sat-m-nlf-0001', section: 'math', domain: 'advanced_math', skill: 'nonlinear_functions',
    difficulty: 'M', format: 'mcq', trap: 'sign_error', targetSeconds: 70,
    q: 'The function f is defined by f(x) = (x − 3)² − 4. What is the minimum value of f?',
    ch: ['−4', '−3', '3', '4'],
    ans: 0,
    exp: 'In vertex form f(x) = a(x − h)² + k, the vertex is (h, k) and, because a = 1 > 0, the parabola opens upward so k is the minimum. Here (h, k) = (3, −4), so the minimum value is −4.',
    distractorExp: [
      'Correct. The vertex is (3, −4), and an upward parabola takes its minimum at the vertex.',
      '−3 misreads the vertex form; the constant outside the square is −4.',
      '3 is the x-coordinate of the vertex — where the minimum occurs, not the minimum value itself.',
      'The sign is wrong: the expression is minus 4, so the minimum is −4.',
    ],
  },
  {
    id: 'sat-m-nlf-0002', section: 'math', domain: 'advanced_math', skill: 'nonlinear_functions',
    difficulty: 'M', format: 'mcq', trap: 'percent_of_what', targetSeconds: 80,
    q: 'A bacterial population starts at 400 and doubles every 6 hours. Which function gives the population P after t hours?',
    ch: ['P(t) = 400 · 2^(6t)', 'P(t) = 400 · 2^(t/6)', 'P(t) = 400 · 6^(t/2)', 'P(t) = 400 + 2t/6'],
    ans: 1,
    exp: 'The base is the growth factor (2, for doubling) and the exponent counts how many doubling periods have passed: t hours ÷ 6 hours per period = t/6.',
    distractorExp: [
      '2^(6t) doubles six times per hour rather than once every six hours.',
      'Correct. t/6 counts the number of completed 6-hour doubling periods.',
      'This uses 6 as the growth factor and 2 as the period, swapping their roles.',
      'This is linear growth. Doubling is multiplicative, so the variable must be in the exponent.',
    ],
  },
  {
    id: 'sat-m-nlf-0003', section: 'math', domain: 'advanced_math', skill: 'nonlinear_functions',
    difficulty: 'H', format: 'spr', trap: 'solved_for_wrong', targetSeconds: 90,
    q: 'The graph of y = a(x − 2)(x + 6), where a is a nonzero constant, is a parabola in the xy-plane. What is the x-coordinate of its vertex?',
    sprAccept: { values: [-2], tolerance: 0 },
    exp: 'The factored form gives x-intercepts at x = 2 and x = −6. A parabola is symmetric about its vertex, so the vertex sits exactly halfway between the intercepts: (2 + (−6))/2 = −2. The value of a changes the width and direction but never the axis of symmetry.',
    hint: 'The vertex always lies midway between the two x-intercepts.',
  },
];
