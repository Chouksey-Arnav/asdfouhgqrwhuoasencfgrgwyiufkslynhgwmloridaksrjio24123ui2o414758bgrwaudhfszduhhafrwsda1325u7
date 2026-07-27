// ─────────────────────────────────────────────────────────────────────────────
// The SAT Math reference sheet, its much more important shadow, and the Desmos
// playbook.
//
// Three separate things live here, and the split is the point:
//
//   GIVEN_FORMULAS     what Bluebook hands you on test day. Worth knowing so
//                      you do not waste memory on it.
//   MEMORIZE_FORMULAS  what it does NOT hand you. This is the list that
//                      actually costs students points, and almost every "I
//                      blanked" moment in Math traces back to one line of it.
//   DESMOS_PLAYS       concrete calculator techniques, each with the exact
//                      expressions to type. The calculator only helps a student
//                      who knows what to type into it, which is the gap this
//                      closes.
//
// All of it is mathematics and published exam policy — no College Board item
// content of any kind (see the licensing note in taxonomy.js).
// ─────────────────────────────────────────────────────────────────────────────

/** Provided on screen during the Math section. */
export const GIVEN_FORMULAS = [
  {
    group: 'Area and circumference',
    items: [
      { tex: 'A = \\pi r^2', label: 'Circle, area' },
      { tex: 'C = 2\\pi r', label: 'Circle, circumference' },
      { tex: 'A = \\ell w', label: 'Rectangle' },
      { tex: 'A = \\tfrac{1}{2}bh', label: 'Triangle' },
    ],
  },
  {
    group: 'Right triangles',
    items: [
      { tex: 'c^2 = a^2 + b^2', label: 'Pythagorean theorem' },
      { tex: 'x,\\; x\\sqrt{3},\\; 2x', label: '30°–60°–90° sides' },
      { tex: 's,\\; s,\\; s\\sqrt{2}', label: '45°–45°–90° sides' },
    ],
  },
  {
    group: 'Volume',
    items: [
      { tex: 'V = \\ell w h', label: 'Rectangular prism' },
      { tex: 'V = \\pi r^2 h', label: 'Cylinder' },
      { tex: 'V = \\tfrac{4}{3}\\pi r^3', label: 'Sphere' },
      { tex: 'V = \\tfrac{1}{3}\\pi r^2 h', label: 'Cone' },
      { tex: 'V = \\tfrac{1}{3}\\ell w h', label: 'Pyramid' },
    ],
  },
  {
    group: 'Angle facts',
    items: [
      { tex: '360^\\circ', label: 'Degrees of arc in a circle' },
      { tex: '2\\pi', label: 'Radians of arc in a circle' },
      { tex: '180^\\circ', label: 'Angles of a triangle sum to' },
    ],
  },
];

/**
 * NOT provided. Grouped by how they get tested rather than by textbook chapter,
 * because that is how a student has to retrieve them under time pressure.
 */
export const MEMORIZE_FORMULAS = [
  {
    group: 'Lines',
    color: 'cyan',
    items: [
      { tex: 'm = \\dfrac{y_2 - y_1}{x_2 - x_1}', label: 'Slope from two points' },
      { tex: 'y = mx + b', label: 'Slope-intercept form' },
      { tex: 'y - y_1 = m(x - x_1)', label: 'Point-slope form' },
      { tex: 'Ax + By = C \\Rightarrow m = -\\tfrac{A}{B}', label: 'Slope from standard form' },
      { tex: 'm_1 = m_2', label: 'Parallel lines' },
      { tex: 'm_1 m_2 = -1', label: 'Perpendicular lines' },
      { tex: 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}', label: 'Distance between points' },
      { tex: '\\left(\\dfrac{x_1+x_2}{2}, \\dfrac{y_1+y_2}{2}\\right)', label: 'Midpoint' },
    ],
  },
  {
    group: 'Quadratics',
    color: 'sky',
    items: [
      { tex: 'x = \\dfrac{-b \\pm \\sqrt{b^2-4ac}}{2a}', label: 'Quadratic formula' },
      { tex: 'b^2 - 4ac', label: 'Discriminant: > 0 two roots, = 0 one, < 0 none' },
      { tex: 'y = a(x-h)^2 + k', label: 'Vertex form — vertex at (h, k)' },
      { tex: 'x = -\\dfrac{b}{2a}', label: 'Axis of symmetry / vertex x' },
      { tex: 'y = a(x - r_1)(x - r_2)', label: 'Factored form — roots at r₁, r₂' },
      { tex: 'r_1 + r_2 = -\\tfrac{b}{a},\\;\\; r_1 r_2 = \\tfrac{c}{a}', label: 'Sum and product of roots' },
    ],
  },
  {
    group: 'Exponentials and exponents',
    color: 'violet',
    items: [
      { tex: 'y = a(1+r)^t', label: 'Growth — r as a decimal, per period' },
      { tex: 'y = a(1-r)^t', label: 'Decay' },
      { tex: 'x^m \\cdot x^n = x^{m+n}', label: 'Multiplying powers' },
      { tex: '\\dfrac{x^m}{x^n} = x^{m-n}', label: 'Dividing powers' },
      { tex: '(x^m)^n = x^{mn}', label: 'Power of a power' },
      { tex: 'x^{m/n} = \\sqrt[n]{x^m}', label: 'Fractional exponents' },
      { tex: 'x^{-n} = \\dfrac{1}{x^n}', label: 'Negative exponents' },
    ],
  },
  {
    group: 'Circles in the xy-plane',
    color: 'emerald',
    items: [
      { tex: '(x-h)^2 + (y-k)^2 = r^2', label: 'Centre (h, k), radius r' },
      { tex: 's = r\\theta', label: 'Arc length, θ in radians' },
      { tex: 'A = \\tfrac{1}{2}r^2\\theta', label: 'Sector area, θ in radians' },
      { tex: '\\theta_{\\text{rad}} = \\theta_{\\deg} \\cdot \\dfrac{\\pi}{180}', label: 'Degrees to radians' },
    ],
  },
  {
    group: 'Percentages and rates',
    color: 'teal',
    items: [
      { tex: '\\%\\text{ change} = \\dfrac{\\text{new} - \\text{old}}{\\text{old}} \\times 100', label: 'Percent change' },
      { tex: '\\text{part} = \\text{percent} \\times \\text{whole}', label: 'Percent of' },
      { tex: '\\text{final} = P(1 \\pm r_1)(1 \\pm r_2)', label: 'Successive changes — never add the percents' },
      { tex: '\\text{rate} = \\dfrac{\\text{quantity}}{\\text{time}}', label: 'Unit rate' },
    ],
  },
  {
    group: 'Statistics',
    color: 'pink',
    items: [
      { tex: '\\bar{x} = \\dfrac{\\sum x}{n}', label: 'Mean' },
      { tex: '\\text{median}', label: 'Middle value once ordered — resistant to outliers, unlike the mean' },
      { tex: 'P(A \\mid B) = \\dfrac{\\text{both}}{\\text{total in }B}', label: 'Conditional probability from a two-way table' },
      { tex: '\\text{estimate} \\pm \\text{MOE}', label: 'A margin of error gives a plausible range, not a guarantee' },
    ],
  },
  {
    group: 'Trigonometry',
    color: 'indigo',
    items: [
      { tex: '\\sin\\theta = \\dfrac{\\text{opp}}{\\text{hyp}}', label: 'SOH' },
      { tex: '\\cos\\theta = \\dfrac{\\text{adj}}{\\text{hyp}}', label: 'CAH' },
      { tex: '\\tan\\theta = \\dfrac{\\text{opp}}{\\text{adj}}', label: 'TOA' },
      { tex: '\\sin\\theta = \\cos(90^\\circ - \\theta)', label: 'Cofunction identity — heavily tested' },
      { tex: '\\sin^2\\theta + \\cos^2\\theta = 1', label: 'Pythagorean identity' },
    ],
  },
  {
    group: 'Polygons and similarity',
    color: 'amber',
    items: [
      { tex: '(n-2) \\cdot 180^\\circ', label: 'Sum of interior angles of an n-gon' },
      { tex: '\\dfrac{360^\\circ}{n}', label: 'Each exterior angle of a regular n-gon' },
      { tex: 'k', label: 'Similar figures: side ratio' },
      { tex: 'k^2', label: 'Similar figures: area ratio' },
      { tex: 'k^3', label: 'Similar solids: volume ratio' },
    ],
  },
];

/**
 * The Desmos playbook. `expressions` are loaded straight into the calculator by
 * the Calculator tab, so a student can see the technique running rather than
 * read about it — the difference between knowing Desmos exists and using it.
 */
export const DESMOS_PLAYS = [
  {
    id: 'solve-equation',
    title: 'Solve any equation without algebra',
    when: 'Any "what is the value of x" question, however ugly the equation looks.',
    steps: [
      'Type the left-hand side as y = …',
      'Type the right-hand side as y = … on the next line.',
      'Click the point where the two curves cross — Desmos labels its coordinates.',
      'The x-coordinate is your answer.',
    ],
    expressions: ['y=5\\left(x-3\\right)', 'y=2x+9'],
    caution: 'Check whether the question wants x itself or an expression in x, like 3x + 1.',
  },
  {
    id: 'solve-system',
    title: 'Solve a system in one move',
    when: 'Two equations, two unknowns — linear or not.',
    steps: [
      'Type both equations exactly as written. Desmos does not need them rearranged.',
      'Click each intersection point.',
      'A nonlinear system can have two intersections — read the question to see which it wants.',
    ],
    expressions: ['2x+3y=19', 'x-y=2'],
  },
  {
    id: 'zeros',
    title: 'Find roots, zeros and x-intercepts',
    when: '"Solutions to", "zeros of", "x-intercepts", "where the graph crosses the x-axis" — all the same thing.',
    steps: [
      'Type the function as y = …',
      'Click each point where the curve meets the x-axis.',
      'Sum-of-solutions questions: add the x-values you just read off.',
    ],
    expressions: ['y=x^2-6x+5'],
  },
  {
    id: 'vertex',
    title: 'Read a vertex, minimum or maximum',
    when: 'Minimum value, maximum height, "the vertex of the parabola".',
    steps: [
      'Type the function.',
      'Click the turning point — Desmos snaps to it and labels it.',
      'Minimum VALUE is the y-coordinate. Where it occurs is the x-coordinate.',
    ],
    expressions: ['y=\\left(x-3\\right)^2-4'],
    caution: 'Mixing up "the minimum value" (y) with "where the minimum occurs" (x) is the classic miss here.',
  },
  {
    id: 'sliders',
    title: 'Let a slider find an unknown constant',
    when: 'A question with a letter constant — "for what value of k does this have exactly one solution?"',
    steps: [
      'Type the equation with the letter in it. Desmos offers to add a slider — accept it.',
      'Drag the slider and watch the graph.',
      'Read off the value where the described condition first happens.',
    ],
    expressions: ['y=x^2+kx+25'],
    caution: 'Sliders find the answer; they do not prove it. On a hard item, confirm with the discriminant.',
  },
  {
    id: 'best-fit',
    title: 'Line of best fit from a table',
    when: 'A scatterplot or table asking for a predicted value, slope or intercept.',
    steps: [
      'Add a table and type the two columns of data.',
      'On a new line type  y_1 ~ mx_1 + b  — the tilde is a regression, not an equation.',
      'Desmos reports m and b. Use them for the prediction the question asks for.',
    ],
    expressions: ['y_1\\sim mx_1+b'],
  },
  {
    id: 'stats',
    title: 'Statistics functions, typed directly',
    when: 'Mean, median, quartiles or standard deviation of a listed data set.',
    steps: [
      'Type the data as a list in square brackets.',
      'Wrap it in mean(), median(), stdev() or quartile(list, 1).',
      'Desmos evaluates it instantly — no arithmetic by hand.',
    ],
    expressions: ['L=\\left[4,7,7,9,12,15\\right]', '\\operatorname{mean}\\left(L\\right)', '\\operatorname{median}\\left(L\\right)'],
  },
  {
    id: 'inequalities',
    title: 'Shade an inequality or a constraint region',
    when: 'Systems of inequalities, "which point satisfies both constraints".',
    steps: [
      'Type each inequality with < or > — Desmos shades the region.',
      'The overlap is the solution set.',
      'Type a candidate point as (x, y) and see whether it lands inside.',
    ],
    expressions: ['y\\le-2x+8', 'y\\ge x-1', '\\left(2,3\\right)'],
  },
  {
    id: 'circle',
    title: 'Read a circle\'s centre and radius off the screen',
    when: 'Any circle equation, including one that needs completing the square.',
    steps: [
      'Type the equation exactly as given — Desmos handles the un-completed form too.',
      'The centre and radius are visible on the graph paper.',
      'Zoom with the +/− buttons if the circle is off-screen.',
    ],
    expressions: ['\\left(x-3\\right)^2+\\left(y+2\\right)^2=25'],
  },
  {
    id: 'backsolve',
    title: 'Test the answer choices',
    when: 'You are stuck and the choices are numbers.',
    steps: [
      'Type the equation as two curves, or the expression as y = …',
      'Type y = (each choice) and see which one lines up.',
      'Start with choice B or C — if it is too big or too small you have eliminated two more.',
    ],
    expressions: ['y=\\frac{3x+1}{x-2}', 'y=7'],
    caution: 'Backsolving is a fallback, not a plan. It costs 60–90 seconds you may not have twice.',
  },
];

/** Policy facts about the calculator that students routinely get wrong. */
export const CALCULATOR_FACTS = [
  'Desmos is built into the Digital SAT and available on every question in the Math section — both modules, start to finish.',
  'There is no calculator on Reading & Writing, and no question there needs one.',
  'You may also bring your own approved handheld calculator as a backup. Most students who practise with Desmos stop reaching for it.',
  'The reference sheet stays on screen for the whole Math section. Nothing on it is worth memorising; everything not on it is.',
];

export const REFERENCE_DISCLAIMER =
  'Formula content is standard mathematics and reflects College Board\'s published exam policy. Confirm current test-day rules at collegeboard.org before your exam.';
