# Video ID Corrections Applied During Pathway Build

During the Phase 3 batch build of the Learning Pathway content (Nursing through
Health Administration), several pre-existing `ytId` values already sitting in
the lesson data turned out to be broken, corrupted, or misattributed. Each was
caught by manual verification (WebSearch / oEmbed lookup) before the batch
containing it was committed, and swapped for a confirmed alternative. This
file is the permanent record — the corrections themselves are otherwise only
visible in individual commit messages.

| Original ID | Lessons affected | Issue | Replacement | Replacement title |
| --- | --- | --- | --- | --- |
| `Ue2m_l91W2w` | pa2l3, ph1l3, br2l2 | Doesn't resolve to anything indexed | `7qOFtL3VEBc` | Kinetics: Chemistry's Demolition Derby — Crash Course Chemistry #32 |
| `bKIpDtJdK8Q` | ph2l3, br1l3 | Resolves, but to a Professor Dave Explains video, not Crash Course (breaks the app's single-channel convention) | `6ulXau2HyHg` | Translation: How RNA Gets Translated into Protein Power — Crash Course Biology #35 |
| `xZMwK2HwJ7c` | pt2l2 | Doesn't resolve to anything indexed | `w3BhzYI6zXU` | Vectors and 2D Motion — Crash Course Physics #4 |
| `b5SqYoO4VXI` | pt2l3 | Corrupted/typo'd id, one character off from the real video | `b5SqYuWT4-4` | Fluids at Rest — Crash Course Physics #14 |
| `Tj-w1W_pZ8M` | br2l3 | Doesn't resolve to anything indexed | `Ykhn2psFmEM` | Thermodynamics and Energy Diagrams — Crash Course Organic Chemistry #15 |
| `eB1qG5EEDk0` | de2l3 | Never verified; doesn't resolve to anything indexed | `ANi709MYnWg` | Acid-Base Reactions in Solution — Crash Course Chemistry #8 |

A few lessons also got **upgrades** from a generic/low-confidence pick to a
specific, WebSearch-verified episode (not fixing a broken link, just a better
match):

| Lesson | Old pick | New pick |
| --- | --- | --- |
| pt3l1 | Generic intro-psychology fallback | `9hdSLiHaJz8` — The Power of Motivation — Crash Course Psychology #17 |
| pu3l1 | Generic Sociology category-page link | `YnCJU6PaCio` — What Is Sociology? — Crash Course Sociology #1 |
| pu3l2 | Generic U.S. Government category-page link | `lrk4oY7UxpQ` — Introduction — Crash Course U.S. Government and Politics #1 |

And one lesson was **downgraded to an intentional OMIT** after review, rather
than shipping a low-confidence match:

| Lesson | Previous pick | Resolution |
| --- | --- | --- |
| nur2l3 | Medium-confidence Khan Academy match | OMIT — too generic for this lesson's actual scope; no video shipped |

## Why this matters

`Ue2m_l91W2w` and `bKIpDtJdK8Q` were each reused across multiple lessons in
different pathways (the reuse-with-reframe convention this content follows),
so a single bad id could otherwise have silently shipped broken video embeds
in several unrelated places. Recording the swap once here — rather than only
in the commit that happened to catch it first — means a future editor reusing
one of these lesson ids elsewhere won't reintroduce the original broken link.

Run `npm run audit:videos` to re-verify all current video ids against
YouTube's oEmbed endpoint before adding or editing any pathway content.

---

## SAT Video Library Audit Notes

The SAT video library is maintained in `src/data/sat/videos.js` and contains curated YouTube videos for each of the 28 leaf academic skills on the SAT.

During systematic verification utilizing `npm run audit:sat-videos` (which checks YouTube's public oEmbed endpoint), the following 4 video IDs were flagged as **DEAD** (returning HTTP 404):

| Video ID | Topic / Described Title | Channel | Scope / Skill | Status / Action |
| --- | --- | --- | --- | --- |
| `mMpDeV_dOyU` | Text Structure and Purpose — Quick example | Khan Academy SAT | `skill: text_structure_purpose` | **DEAD** — Needs confirmed replacement |
| `FgX3gLDDlzI` | Solving systems of linear equations — Basic example | Khan Academy SAT | `skill: linear_systems` | **DEAD** — Needs confirmed replacement |
| `-ylIGciS7_8` | Solving systems of linear equations — Harder example | Khan Academy SAT | `skill: linear_systems` | **DEAD** — Needs confirmed replacement |
| `-5pXEsA68pk` | Systems of linear inequalities word problems — Harder example | Khan Academy SAT | `skill: linear_inequality_word` | **DEAD** — Needs confirmed replacement |

Before adding any new video links or modifying existing ones in the SAT database, developers must execute `npm run audit:sat-videos` to verify ID status and guarantee students are only recommended functional and highly relevant educational instruction.
