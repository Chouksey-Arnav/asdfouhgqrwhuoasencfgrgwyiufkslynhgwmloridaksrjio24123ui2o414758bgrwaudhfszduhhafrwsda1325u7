// Geometry and Trigonometry — 15% of the Math section.
// Skills: area_volume, lines_angles_triangles, right_triangles_trig, circles.
//
// The real exam supplies a reference sheet of formulas. Questions here assume
// the same, so items test whether a student can SELECT and APPLY the right
// formula, not whether they memorised it.
export const MATH_GEO_TRIG_QUESTIONS = [
  // ── Area and Volume ───────────────────────────────────────────────────────
  {
    id: 'sat-m-arv-0001', section: 'math', domain: 'geo_trig', skill: 'area_volume',
    difficulty: 'E', format: 'mcq', trap: 'reference_formula', targetSeconds: 65,
    q: 'A right circular cylinder has a radius of 3 and a height of 10. What is its volume?',
    ch: ['30π', '60π', '90π', '180π'],
    ans: 2,
    exp: 'V = πr²h = π(3)²(10) = 90π. The radius is squared; the height is not.',
    distractorExp: [
      '30π uses πrh — the radius must be squared.',
      '60π is the lateral surface area, 2πrh, not the volume.',
      'Correct. π(9)(10) = 90π.',
      '180π doubles the correct answer, as if applying a 2πr²h formula that does not exist.',
    ],
  },
  {
    id: 'sat-m-arv-0002', section: 'math', domain: 'geo_trig', skill: 'area_volume',
    difficulty: 'H', format: 'spr', trap: 'reference_formula', targetSeconds: 80,
    q: 'Every dimension of a rectangular solid is multiplied by 3. The volume of the new solid is how many times the volume of the original?',
    sprAccept: { values: [27], tolerance: 0 },
    exp: 'Volume is a product of three lengths, so scaling each by 3 scales the volume by 3 × 3 × 3 = 27. (In general, scaling every length by k multiplies area by k² and volume by k³.)',
    hint: 'Volume depends on three dimensions. Scale each one and see what happens to the product.',
  },

  // ── Lines, Angles and Triangles ───────────────────────────────────────────
  {
    id: 'sat-m-lat-0001', section: 'math', domain: 'geo_trig', skill: 'lines_angles_triangles',
    difficulty: 'M', format: 'spr', trap: 'reference_formula', targetSeconds: 65,
    q: 'In triangle ABC, the measure of angle A is 40° and the measure of angle B is 75°. What is the measure, in degrees, of the exterior angle at vertex C?',
    sprAccept: { values: [115], tolerance: 0 },
    exp: 'Angle C = 180 − 40 − 75 = 65°, and the exterior angle is its supplement: 180 − 65 = 115°. (Faster: an exterior angle equals the sum of the two remote interior angles, 40 + 75 = 115.)',
    hint: 'An exterior angle equals the sum of the two non-adjacent interior angles.',
  },
  {
    id: 'sat-m-lat-0002', section: 'math', domain: 'geo_trig', skill: 'lines_angles_triangles',
    difficulty: 'M', format: 'mcq', trap: 'reference_formula', targetSeconds: 80,
    q: 'Triangle ABC is similar to triangle DEF, with A corresponding to D. If AB = 6, BC = 9, and DE = 10, what is the length of EF?',
    ch: ['13', '15', '18', '21'],
    ans: 1,
    exp: 'Corresponding sides are proportional: AB/DE = BC/EF, so 6/10 = 9/EF. Cross-multiply: 6·EF = 90, giving EF = 15.',
    distractorExp: [
      '13 comes from adding the difference (10 − 6 = 4) to 9 — similarity scales by multiplication, not addition.',
      'Correct. The scale factor is 10/6, and 9 × 10/6 = 15.',
      '18 uses a scale factor of 2, which would require DE = 12.',
      '21 adds rather than scales, and compounds the error.',
    ],
  },

  // ── Right Triangles and Trigonometry ──────────────────────────────────────
  {
    id: 'sat-m-rtt-0001', section: 'math', domain: 'geo_trig', skill: 'right_triangles_trig',
    difficulty: 'M', format: 'mcq', trap: 'reference_formula', targetSeconds: 70,
    q: 'In a right triangle, the legs measure 5 and 12 and the hypotenuse measures 13. What is the sine of the angle opposite the leg of length 5?',
    ch: ['5/12', '5/13', '12/13', '13/5'],
    ans: 1,
    exp: 'Sine is opposite over hypotenuse. The side opposite that angle is 5 and the hypotenuse is 13, so sin = 5/13.',
    distractorExp: [
      '5/12 is opposite over adjacent, which is the tangent.',
      'Correct. Opposite (5) over hypotenuse (13).',
      '12/13 is adjacent over hypotenuse — the cosine of that angle.',
      '13/5 inverts the ratio. Sine of an acute angle is always less than 1.',
    ],
  },
  {
    id: 'sat-m-rtt-0002', section: 'math', domain: 'geo_trig', skill: 'right_triangles_trig',
    difficulty: 'H', format: 'mcq', trap: 'degrees_radians', targetSeconds: 80,
    q: 'In a right triangle, one acute angle measures a° and sin(a°) = 0.6. What is cos((90 − a)°)?',
    ch: ['0.4', '0.6', '0.8', 'It cannot be determined.'],
    ans: 1,
    exp: 'The two acute angles of a right triangle are complementary, and the cofunction identity says sin(x°) = cos((90 − x)°). So cos((90 − a)°) = sin(a°) = 0.6.',
    distractorExp: [
      '0.4 comes from computing 1 − 0.6, which is not how trigonometric complements work.',
      'Correct. The cofunction identity gives cos((90 − a)°) = sin(a°) = 0.6.',
      '0.8 is cos(a°), found via the Pythagorean identity — but the question asks about the complementary angle.',
      'It is fully determined by the cofunction identity; no extra information is needed.',
    ],
  },

  // ── Circles ───────────────────────────────────────────────────────────────
  {
    id: 'sat-m-cir-0001', section: 'math', domain: 'geo_trig', skill: 'circles',
    difficulty: 'M', format: 'mcq', trap: 'sign_error', targetSeconds: 70,
    q: 'A circle in the xy-plane has the equation (x − 3)² + (y + 2)² = 25. What are the coordinates of its centre and the length of its radius?',
    ch: [
      'Centre (3, −2), radius 5',
      'Centre (−3, 2), radius 5',
      'Centre (3, −2), radius 25',
      'Centre (−3, 2), radius 25',
    ],
    ans: 0,
    exp: 'In (x − h)² + (y − k)² = r², the centre is (h, k) and the radius is r. Here x − 3 gives h = 3, and y + 2 is y − (−2) so k = −2. The right side is r² = 25, so r = 5.',
    distractorExp: [
      'Correct. Centre (3, −2) and radius √25 = 5.',
      'The signs are flipped. The form subtracts h and k, so x − 3 means h = +3.',
      '25 is r², not r. You must take the square root.',
      'Both the signs and the radius are wrong.',
    ],
  },
  {
    id: 'sat-m-cir-0002', section: 'math', domain: 'geo_trig', skill: 'circles',
    difficulty: 'H', format: 'mcq', trap: 'degrees_radians', targetSeconds: 85,
    q: 'A circle has a radius of 6. What is the length of an arc intercepted by a central angle of 60°?',
    ch: ['π', '2π', '6π', '12π'],
    ans: 1,
    exp: 'A 60° angle is 60/360 = 1/6 of the full circle. The circumference is 2π(6) = 12π, so the arc is (1/6)(12π) = 2π.',
    distractorExp: [
      'π would correspond to a 30° angle, i.e. one twelfth of the circumference.',
      'Correct. One sixth of the 12π circumference is 2π.',
      '6π is half the circumference, which would require a 180° central angle.',
      '12π is the entire circumference, corresponding to 360°.',
    ],
  },
];
