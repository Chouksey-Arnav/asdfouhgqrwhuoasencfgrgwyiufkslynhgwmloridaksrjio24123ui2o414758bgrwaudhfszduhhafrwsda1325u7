// Geometry and Trigonometry — expansion batch B.
//
// 15% of the Math section. Every formula a student needs here is on the
// reference sheet the digital test provides (see src/data/sat/reference.js) —
// which is precisely why the items are written to punish reaching for the
// sheet without deciding what to reach for. `reference_formula` is the trap tag
// for a choice built from the right formula applied to the wrong quantity.
export const MATH_GEO_TRIG_B = [
  // ── Area and Volume ───────────────────────────────────────────────────────
  {
    id: 'sat-m-avl-0101', section: 'math', domain: 'geo_trig', skill: 'area_volume',
    difficulty: 'E', format: 'mcq', trap: 'reference_formula', targetSeconds: 65,
    q: 'A cone has a radius of 6 and a height of 5. What is its volume?',
    ch: ['30π', '60π', '90π', '180π'],
    ans: 1,
    exp: 'Volume of a cone is (1/3)πr²h = (1/3)π(36)(5) = 60π. The one-third is what separates a cone from the cylinder that encloses it.',
    distractorExp: [
      '30π halves the cylinder volume instead of taking a third of it.',
      'Correct. (1/3)π(36)(5) = 60π.',
      '90π uses a height of 7.5, or misapplies the one-third.',
      '180π is πr²h — the full cylinder, with the one-third dropped.',
    ],
  },
  {
    id: 'sat-m-avl-0102', section: 'math', domain: 'geo_trig', skill: 'area_volume',
    difficulty: 'M', format: 'mcq', trap: 'reference_formula', targetSeconds: 75,
    q: 'A rectangular prism has a volume of 240 cubic centimeters. Its base measures 8 cm by 5 cm. What is its height?',
    ch: ['3 cm', '6 cm', '30 cm', '40 cm'],
    ans: 1,
    exp: 'Volume = base area × height. The base area is 8 × 5 = 40, so the height is 240/40 = 6 cm.',
    distractorExp: [
      'You get 3 by dividing 240 by 80 rather than by 40.',
      'Correct. 240 ÷ 40 = 6 cm.',
      '30 comes from dividing 240 by 8 alone, ignoring the other base dimension.',
      '40 is the base area, not the height.',
    ],
  },
  {
    id: 'sat-m-avl-0103', section: 'math', domain: 'geo_trig', skill: 'area_volume',
    difficulty: 'H', format: 'mcq', trap: 'reference_formula', targetSeconds: 85,
    q: 'A sphere has a radius of 6. If a second sphere has twice that radius, its volume is how many times the volume of the first?',
    ch: ['2', '4', '6', '8'],
    ans: 3,
    exp: 'Volume scales with the cube of a linear dimension: doubling the radius multiplies the volume by 2³ = 8. (Checking: (4/3)π(12)³ ÷ (4/3)π(6)³ = 1728/216 = 8.)',
    distractorExp: [
      '2 is the scale factor on the radius, not on the volume.',
      '4 is how AREA scales when a length doubles.',
      '6 is the original radius, not a scale factor.',
      'Correct. Volume scales as the cube: 2³ = 8.',
    ],
  },
  {
    id: 'sat-m-avl-0104', section: 'math', domain: 'geo_trig', skill: 'area_volume',
    difficulty: 'M', format: 'spr', trap: 'unit_mismatch', targetSeconds: 80,
    q: 'A rectangular garden measures 12 meters by 9 meters. A path 1 meter wide runs around the outside of the garden. What is the area, in square meters, of the path alone?',
    sprAccept: { values: [46], tolerance: 0 },
    exp: 'The outer rectangle including the path is 14 by 11, since the path adds 1 meter on each of two opposite sides. Its area is 154, and the garden itself is 12 × 9 = 108. The path is 154 − 108 = 46 square meters.',
    hint: 'A path on the outside adds twice its width to each dimension. Find the big rectangle, then subtract the garden.',
  },

  // ── Lines, Angles and Triangles ───────────────────────────────────────────
  {
    id: 'sat-m-lat-0101', section: 'math', domain: 'geo_trig', skill: 'lines_angles_triangles',
    difficulty: 'E', format: 'mcq', trap: 'reference_formula', targetSeconds: 60,
    q: 'In a triangle, two angles measure 43° and 68°. What is the measure of the third angle?',
    ch: ['21°', '69°', '111°', '249°'],
    ans: 1,
    exp: 'The three angles of a triangle sum to 180°: 180 − 43 − 68 = 69°.',
    distractorExp: [
      '21° comes from subtracting from 90 rather than 180.',
      'Correct. 180 − 111 = 69°.',
      '111° is the sum of the two given angles.',
      '249° comes from adding rather than subtracting.',
    ],
  },
  {
    id: 'sat-m-lat-0102', section: 'math', domain: 'geo_trig', skill: 'lines_angles_triangles',
    difficulty: 'M', format: 'mcq', trap: 'reference_formula', targetSeconds: 75,
    q: 'Triangle ABC is similar to triangle DEF. Side AB is 6 and corresponds to side DE, which is 15. If side BC is 8, what is the length of side EF?',
    ch: ['17', '20', '24', '30'],
    ans: 1,
    exp: 'The scale factor is 15/6 = 2.5, so EF = 8 × 2.5 = 20.',
    distractorExp: [
      '17 comes from adding the difference 9 to 8 rather than scaling.',
      'Correct. 8 × 2.5 = 20.',
      '24 uses a scale factor of 3 instead of 2.5.',
      '30 doubles 15 rather than scaling side BC.',
    ],
  },
  {
    id: 'sat-m-lat-0103', section: 'math', domain: 'geo_trig', skill: 'lines_angles_triangles',
    difficulty: 'H', format: 'mcq', trap: 'reference_formula', targetSeconds: 85,
    q: 'Two parallel lines are cut by a transversal. One of the eight angles formed measures 118°. Which of the following must also measure 118°?',
    ch: [
      'The angle adjacent to it along the same straight line.',
      'Its vertical angle and the corresponding angle at the other crossing.',
      'Every other angle formed by the two lines and the transversal.',
      'Only its vertical angle, and none at the other intersection.',
    ],
    ans: 1,
    exp: 'Vertical angles are always equal, and with parallel lines the corresponding angle at the second intersection is equal too. In total four of the eight angles measure 118° and the other four measure 62°.',
    distractorExp: [
      'An adjacent angle on a straight line is supplementary: 180 − 118 = 62°.',
      'Correct. Vertical and corresponding angles are both equal to it.',
      'Four of the eight angles measure 62°, not 118°.',
      'Parallel lines make the corresponding angle at the other intersection equal as well.',
    ],
  },
  {
    id: 'sat-m-lat-0104', section: 'math', domain: 'geo_trig', skill: 'lines_angles_triangles',
    difficulty: 'M', format: 'spr', trap: 'reference_formula', targetSeconds: 80,
    q: 'In an isosceles triangle, the two equal angles each measure 37°. What is the measure, in degrees, of the third angle?',
    sprAccept: { values: [106], tolerance: 0 },
    exp: 'The angles sum to 180°: 180 − 37 − 37 = 106°.',
    hint: 'Both equal angles are given, so subtract both from 180.',
  },

  // ── Right Triangles and Trigonometry ──────────────────────────────────────
  {
    id: 'sat-m-rtt-0101', section: 'math', domain: 'geo_trig', skill: 'right_triangles_trig',
    difficulty: 'E', format: 'mcq', trap: 'reference_formula', targetSeconds: 65,
    q: 'A right triangle has legs of length 9 and 12. What is the length of the hypotenuse?',
    ch: ['15', '21', '63', '225'],
    ans: 0,
    exp: 'By the Pythagorean theorem, 9² + 12² = 81 + 144 = 225, and √225 = 15. This is the 3-4-5 triangle scaled by 3.',
    distractorExp: [
      'Correct. √225 = 15.',
      '21 adds the legs instead of using the Pythagorean theorem.',
      '63 is 144 − 81, subtracting rather than adding the squares.',
      '225 is the square of the hypotenuse; the square root is still needed.',
    ],
  },
  {
    id: 'sat-m-rtt-0102', section: 'math', domain: 'geo_trig', skill: 'right_triangles_trig',
    difficulty: 'M', format: 'mcq', trap: 'reference_formula', targetSeconds: 80,
    q: 'In right triangle PQR, the right angle is at Q. If PQ = 8 and PR = 17, what is the value of sin R?',
    ch: ['8/17', '15/17', '8/15', '17/8'],
    ans: 0,
    exp: 'PR = 17 is the hypotenuse (it faces the right angle at Q). Sine of R is opposite over hypotenuse, and the side opposite R is PQ = 8, so sin R = 8/17.',
    distractorExp: [
      'Correct. Opposite PQ = 8 over hypotenuse PR = 17.',
      '15/17 is cos R — QR = 15 is adjacent to R, not opposite it.',
      '8/15 is tan R, opposite over adjacent.',
      'This inverts the ratio; sine never exceeds 1.',
    ],
  },
  {
    id: 'sat-m-rtt-0103', section: 'math', domain: 'geo_trig', skill: 'right_triangles_trig',
    difficulty: 'H', format: 'mcq', trap: 'reference_formula', targetSeconds: 90,
    q: 'In a right triangle, one acute angle measures x°. If sin(x°) = 0.6, what is cos(90° − x°)?',
    ch: ['0.4', '0.6', '0.8', '1.0'],
    ans: 1,
    exp: 'The cofunction identity says cos(90° − x°) = sin(x°). So the answer is 0.6 directly, with no need to find x.',
    distractorExp: [
      '0.4 is 1 − 0.6, which is not how cofunctions work.',
      'Correct. cos(90° − x°) = sin(x°) = 0.6.',
      '0.8 is cos(x°), which is the value for the other angle.',
      '1.0 would require the angle to be 0°.',
    ],
  },
  {
    id: 'sat-m-rtt-0104', section: 'math', domain: 'geo_trig', skill: 'right_triangles_trig',
    difficulty: 'M', format: 'spr', trap: 'reference_formula', targetSeconds: 80,
    q: 'A 45-45-90 triangle has legs of length 7. What is the length of its hypotenuse, expressed as a decimal rounded to the nearest tenth?',
    sprAccept: { values: [9.9], tolerance: 0.05 },
    exp: 'In a 45-45-90 triangle the hypotenuse is a leg times √2: 7√2 ≈ 9.899, which rounds to 9.9.',
    hint: 'The 45-45-90 ratio is on the reference sheet: 1 : 1 : √2.',
  },

  // ── Circles ───────────────────────────────────────────────────────────────
  {
    id: 'sat-m-cir-0101', section: 'math', domain: 'geo_trig', skill: 'circles',
    difficulty: 'M', format: 'mcq', trap: 'reference_formula', targetSeconds: 80,
    q: 'A circle in the xy-plane has the equation (x − 4)² + (y + 3)² = 25. What is the radius of the circle?',
    ch: ['3', '4', '5', '25'],
    ans: 2,
    exp: 'In (x − h)² + (y − k)² = r², the right-hand side is r², not r. So r² = 25 and the radius is 5.',
    distractorExp: [
      '3 relates to the y-coordinate of the center, which is −3.',
      '4 is the x-coordinate of the center.',
      'Correct. r² = 25, so r = 5.',
      '25 is r², and the square root is still needed.',
    ],
  },
  {
    id: 'sat-m-cir-0102', section: 'math', domain: 'geo_trig', skill: 'circles',
    difficulty: 'H', format: 'mcq', trap: 'degrees_radians', targetSeconds: 90,
    q: 'A circle has a radius of 12. A central angle of π/3 radians subtends an arc. What is the length of that arc?',
    ch: ['2π', '4π', '6π', '12π'],
    ans: 1,
    exp: 'Arc length in radians is s = rθ = 12 × π/3 = 4π. (Sanity check: π/3 is 60°, one sixth of the full circumference 24π, which is indeed 4π.)',
    distractorExp: [
      '2π uses a radius of 6 rather than 12.',
      'Correct. s = rθ = 12(π/3) = 4π.',
      '6π uses an angle of π/2 instead of π/3.',
      '12π is half the full circumference, corresponding to an angle of π radians.',
    ],
  },
  {
    id: 'sat-m-cir-0103', section: 'math', domain: 'geo_trig', skill: 'circles',
    difficulty: 'E', format: 'mcq', trap: 'reference_formula', targetSeconds: 70,
    q: 'What is the area of a circle with a diameter of 10?',
    ch: ['10π', '25π', '50π', '100π'],
    ans: 1,
    exp: 'The radius is half the diameter, so r = 5 and the area is πr² = 25π. Using the diameter in place of the radius is the standard slip here.',
    distractorExp: [
      '10π is the circumference, not the area.',
      'Correct. r = 5, so the area is 25π.',
      '50π comes from πrd rather than πr².',
      '100π uses the diameter as the radius.',
    ],
  },
  {
    id: 'sat-m-cir-0104', section: 'math', domain: 'geo_trig', skill: 'circles',
    difficulty: 'M', format: 'spr', trap: 'degrees_radians', targetSeconds: 85,
    q: 'An angle measures 135 degrees. What is its measure in radians, expressed as a multiple of π? Give the coefficient of π as a decimal.',
    sprAccept: { values: [0.75], tolerance: 0.01 },
    exp: 'Multiply by π/180: 135 × π/180 = 135π/180 = 3π/4. As a decimal coefficient that is 0.75.',
    hint: 'Degrees to radians multiplies by π/180. Simplify the fraction before converting to a decimal.',
  },
];
