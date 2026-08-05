// Geometry and Trigonometry — expansion batch C.
//
// Geometry is the smallest math domain on the blueprint (about 15%), which
// means a form needs few of its items — but the bank held few to begin with,
// so its Easy band was among the first to run dry across three forms.
//
// Formulas assumed available on the reference sheet are used without comment,
// exactly as the real test does; see src/data/sat/reference.js.
export const MATH_GEO_TRIG_C = [
  // ── Area and Volume ───────────────────────────────────────────────────────
  {
    id: 'sat-m-avl-0201', section: 'math', domain: 'geo_trig', skill: 'area_volume',
    difficulty: 'E', format: 'mcq', trap: 'reference_formula', targetSeconds: 50,
    q: 'A rectangular box has length 3 inches, width 4 inches and height 5 inches. What is its volume, in cubic inches?',
    ch: ['60', '47', '94', '12'],
    ans: 0,
    exp: 'Volume of a rectangular box = length × width × height = 3 × 4 × 5 = 60.',
    distractorExp: [
      'Correct. 3 × 4 × 5 = 60.',
      'That is 3 + 4 + 5 plus a stray term; adding dimensions never gives a volume.',
      'That is the surface area, 2(12 + 15 + 20) = 94.',
      'That is the area of one face, 3 × 4, with the height left out.',
    ],
  },
  {
    id: 'sat-m-avl-0202', section: 'math', domain: 'geo_trig', skill: 'area_volume',
    difficulty: 'M', format: 'spr', trap: 'reference_formula', targetSeconds: 70,
    q: 'A right circular cylinder has radius 3 and height 10. Its volume is kπ. What is the value of k?',
    sprAccept: { values: [90], tolerance: 0 },
    exp: 'Volume of a cylinder = πr²h = π(3²)(10) = 90π, so k = 90.',
    hint: 'The radius is squared; the height is not.',
  },
  {
    id: 'sat-m-avl-0203', section: 'math', domain: 'geo_trig', skill: 'area_volume',
    difficulty: 'H', format: 'mcq', trap: 'reference_formula', targetSeconds: 80,
    q: 'If the radius of a sphere is doubled, by what factor is its volume multiplied?',
    ch: ['8', '2', '4', '6'],
    ans: 0,
    exp: 'Volume of a sphere is (4/3)πr³. Replacing r with 2r gives (4/3)π(2r)³ = (4/3)π(8r³) — eight times the original, because the radius is cubed.',
    distractorExp: [
      'Correct. Doubling a cubed quantity multiplies it by 2³ = 8.',
      'That is the factor the radius changes by, not the volume.',
      'That is 2², which is how AREA would scale, not volume.',
      'You get 6 by multiplying the exponent by the factor (3 × 2) instead of raising 2 to the power 3.',
    ],
  },

  // ── Lines, Angles and Triangles ───────────────────────────────────────────
  {
    id: 'sat-m-lat-0201', section: 'math', domain: 'geo_trig', skill: 'lines_angles_triangles',
    difficulty: 'E', format: 'spr', trap: 'reference_formula', targetSeconds: 50,
    q: 'Two angles of a triangle measure 50° and 60°. What is the measure, in degrees, of the third angle?',
    sprAccept: { values: [70], tolerance: 0 },
    exp: 'The angles of a triangle sum to 180°, so the third angle is 180 − 50 − 60 = 70°.',
    hint: 'The three interior angles of any triangle always add to 180°.',
  },
  {
    id: 'sat-m-lat-0202', section: 'math', domain: 'geo_trig', skill: 'lines_angles_triangles',
    difficulty: 'M', format: 'mcq', trap: 'solved_for_wrong', targetSeconds: 65,
    q: 'Triangle ABC is similar to triangle DEF, with AB corresponding to DE and BC corresponding to EF. If AB = 6, BC = 8 and DE = 9, what is the length of EF?',
    ch: ['12', '11', '10.7', '6'],
    ans: 0,
    exp: 'The scale factor is DE/AB = 9/6 = 1.5. So EF = 1.5 × BC = 1.5 × 8 = 12.',
    distractorExp: [
      'Correct. Scale factor 1.5 applied to BC = 8.',
      'You get 11 by adding the difference (9 − 6 = 3) to 8 instead of scaling — similar figures scale, they do not shift.',
      'You get 10.7 by using the ratio 8/6 as the scale factor rather than 9/6.',
      'That is AB, copied across rather than scaled.',
    ],
  },

  // ── Right Triangles and Trigonometry ──────────────────────────────────────
  {
    id: 'sat-m-rtt-0201', section: 'math', domain: 'geo_trig', skill: 'right_triangles_trig',
    difficulty: 'E', format: 'mcq', trap: 'reference_formula', targetSeconds: 50,
    q: 'A right triangle has legs of length 6 and 8. What is the length of its hypotenuse?',
    ch: ['10', '14', '48', '√14'],
    ans: 0,
    exp: 'By the Pythagorean theorem, the hypotenuse is √(6² + 8²) = √(36 + 64) = √100 = 10.',
    distractorExp: [
      'Correct. √100 = 10.',
      'That is 6 + 8; the theorem adds the SQUARES, not the lengths.',
      'That is 6 × 8, the product of the legs, which is twice the triangle’s area rather than a length.',
      'That is √(6 + 8) — the square root was taken without squaring the legs first.',
    ],
  },
  {
    id: 'sat-m-rtt-0202', section: 'math', domain: 'geo_trig', skill: 'right_triangles_trig',
    difficulty: 'M', format: 'mcq', trap: 'reference_formula', targetSeconds: 70,
    q: 'In a right triangle, the side opposite angle θ has length 5 and the hypotenuse has length 13. What is the value of cos θ?',
    ch: ['12/13', '5/13', '5/12', '13/12'],
    ans: 0,
    exp: 'The remaining leg is √(13² − 5²) = √(169 − 25) = √144 = 12. Cosine is adjacent over hypotenuse, so cos θ = 12/13.',
    distractorExp: [
      'Correct. Adjacent 12 over hypotenuse 13.',
      'That is sin θ — opposite over hypotenuse.',
      'That is tan θ — opposite over adjacent.',
      'That is the reciprocal of the cosine, with the hypotenuse on top.',
    ],
  },

  // ── Circles ───────────────────────────────────────────────────────────────
  {
    id: 'sat-m-cir-0201', section: 'math', domain: 'geo_trig', skill: 'circles',
    difficulty: 'E', format: 'spr', trap: 'reference_formula', targetSeconds: 55,
    q: 'A circle has radius 7. Its circumference is kπ. What is the value of k?',
    sprAccept: { values: [14], tolerance: 0 },
    exp: 'Circumference = 2πr = 2π(7) = 14π, so k = 14.',
    hint: 'Circumference uses 2πr; it is the AREA that uses r².',
  },
  {
    id: 'sat-m-cir-0202', section: 'math', domain: 'geo_trig', skill: 'circles',
    difficulty: 'H', format: 'mcq', trap: 'sign_error', targetSeconds: 80,
    q: 'In the xy-plane, the graph of (x − 3)² + (y + 2)² = 25 is a circle. What are the center and radius of the circle?',
    ch: [
      'Center (3, −2), radius 5',
      'Center (−3, 2), radius 5',
      'Center (3, −2), radius 25',
      'Center (−3, 2), radius 25',
    ],
    ans: 0,
    exp: 'In the form (x − h)² + (y − k)² = r², the center is (h, k) and the radius is r. Here x − 3 gives h = 3; y + 2 is y − (−2), so k = −2; and r² = 25 gives r = 5.',
    distractorExp: [
      'Correct. Center (3, −2) and radius √25 = 5.',
      'Both signs have been read straight off the equation instead of being flipped by the subtraction in the standard form.',
      'The right-hand side is r², not r, so the radius is 5 rather than 25.',
      'Both errors together: signs unflipped and r² mistaken for r.',
    ],
  },
];
