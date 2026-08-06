# SAT question bank — the official sources it is built against

Everything in `src/data/sat/questions/**` is written by us. Nothing in this
repository is copied, paraphrased or scraped from a College Board item. What
*is* taken from College Board is the **blueprint**: how many questions of each
kind appear, what each skill is defined to test, and how difficulty is defined
to increase within a skill. That is published, factual, and the only honest
basis for claiming a practice bank resembles the exam.

This file records the primary sources, what each one settled, and where the
number ended up in the code, so a future change to the taxonomy or the bank can
be checked against the same evidence rather than against memory.

## Primary sources

| # | Source | Publisher | Used for |
|---|--------|-----------|----------|
| 1 | [*Assessment Framework for the Digital SAT Suite*](https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf) (v3.01) | College Board | Domain question counts, the full skill/knowledge testing-point tables (A33–A37), MC/SPR split, passage word count and text-complexity rules |
| 2 | [*The Digital SAT Suite of Assessments Specifications Overview*](https://satsuite.collegeboard.org/media/pdf/digital-sat-test-spec-overview.pdf) | College Board | Section/module timing, domain question distribution tables 2 and 3, score scales |
| 3 | [*Skills Insight for the SAT Suite*, 2026 edition](https://satsuite.collegeboard.org/media/pdf/skills-insight-digital-sat-suite.pdf) | College Board | What separates an easy item from a hard one **within** a skill — the per-score-band skill/knowledge statements (tables 6–14) |
| 4 | [Reading and Writing section](https://satsuite.collegeboard.org/sat/whats-on-the-test/reading-writing) · [How the SAT is structured](https://satsuite.collegeboard.org/sat/whats-on-the-test/structure) · [Content domains](https://satsuite.collegeboard.org/higher-ed-professionals/sat-validity/content-domains) | College Board | Cross-check on domain names and skill labels |
| 5 | [Bluebook™ and the Student Question Bank](https://satsuite.collegeboard.org/practice/student-question-bank/reading-writing) | College Board | Linked from the Library panel as the official practice students should also do. Not a content source — see the licensing note below |

## What the sources settled

### Structure (source 2)

- Two sections, two equal modules each. R&W 2 × 32 min, Math 2 × 35 min.
  10-minute break between sections. 2 h 14 min total.
- 54 operational R&W questions, 44 operational Math questions, plus a small
  number of indistinguishable unscored pretest items in each section.
- Average of 1.19 minutes per R&W question.

Encoded in `SAT_SECTIONS` in `src/data/sat/taxonomy.js` and in
`BREAK_MINUTES`.

### Reading and Writing domain distribution (sources 1 table 10, 2 table 2)

| Domain | Official per form | Our `share` | Implied of 54 |
|---|---|---|---|
| Craft and Structure | 13–15 | 0.28 | 15.1 |
| Information and Ideas | 12–14 | 0.26 | 14.0 |
| Standard English Conventions | 11–15 | 0.26 | 14.0 |
| Expression of Ideas | 8–12 | 0.20 | 10.8 |

Also from source 1: every R&W question is discrete four-option multiple choice
with its own stimulus; the passage or passage pair runs **25 to 150 words**;
informational graphics are limited to tables, bar graphs and line graphs and
never require calculation. Our items follow all four rules.

### Math domain distribution (sources 1 table 16, 2 table 3)

| Domain | Official per form | Our `share` | Implied of 44 |
|---|---|---|---|
| Algebra | 13–15 | 0.35 | 15.4 |
| Advanced Math | 13–15 | 0.35 | 15.4 |
| Problem-Solving and Data Analysis | 5–7 | 0.15 | 6.6 |
| Geometry and Trigonometry | 5–7 | 0.15 | 6.6 |

Source 1 table 20 gives the format split for the SAT: 28–32 multiple-choice and
8–12 student-produced response, i.e. SPR is roughly a quarter of the Math
section. The bank is held near that ratio; `npm run audit:sat-bank` prints it.

### Skill/knowledge testing points (source 1, tables A33–A37)

These are the fine-grained descriptions of what each leaf skill may ask, and
they are what batch D items were written from. The ones that had no
representation in the bank before batch D, and now do:

- **Ratios, rates, proportional relationships and units** — derived units from
  products (kilowatt-hours) and quotients (population per square kilometre);
  multistep and multidimensional unit conversion; scale drawings; the rule that
  a scale factor *k* on lengths is *k*² on areas and *k*³ on volumes.
- **One-variable data** — frequency tables, histograms, dot plots and box
  plots specifically, not just bare lists; comparing distributions with the
  same mean and different standard deviations; the effect of outliers.
- **Two-variable data** — fitting linear, quadratic and exponential models to
  a scatterplot; comparing linear against exponential growth.
- **Probability** — conditional probability from a two-way table, and working
  backwards from a probability to an unknown frequency.
- **Inference and evaluating claims** — which population a result extends to,
  why random *assignment* (not random selection) is what licenses a causal
  claim, and that a larger sample generally shrinks the margin of error.
- **Geometry** — scale factor on lengths versus areas versus volumes; the
  vertical angle theorem and transversal relationships by name; sine/cosine of
  complementary angles; completing the square to recover a circle's centre and
  radius; converting between degrees and radians.
- **Advanced Math** — determining the *number* of real solutions of a
  quadratic from its discriminant; solving for a variable of interest when the
  others are parameters; translations of a function and their effect on the
  graph and on the equation.
- **Conventions** — the specific list in table A33: subject-verb agreement,
  pronoun-antecedent agreement, verb finiteness (gerunds, participles,
  infinitives), tense and aspect, modifier placement, and the
  plural/possessive/contraction distinctions (*its/it's*, *their/they're/there*).

### Difficulty calibration (source 3)

Skills Insight publishes, per score band, what a student at that band can do.
That is the only official statement of what makes one item in a skill harder
than another, so the `E`/`M`/`H` bands in the bank are pinned to it rather than
to an author's instinct. Examples that shaped batch D:

- **Transitions** — bands 1–2 are contrast and cause/consequence at middle-grade
  text complexity; bands 6–8 are emphasis, clarification and concession
  (*in other words*, *that is*, *admittedly*) and elaborative additives
  (*what's more*, *beyond that*) at high-school and early-college complexity.
  So `E` transitions items use *however*/*therefore*; `H` items use the
  concessive and elaborative families.
- **Cross-Text Connections** first appears at band 5 and above. There is no
  genuinely easy cross-text item, which is why that skill's batch D additions
  are weighted M/H.
- **Words in Context** climbs by text complexity and by whether the word is
  used figuratively — `E` items are middle-grade informational contexts, `H`
  items are early-college and include the literal sense of a figurative phrase.
- **Boundaries** — band 2 is a period on a plainly declarative sentence; band 4
  is a comma between a main clause and a supplementary phrase and a semicolon
  between two straightforward independent clauses; bands 7–8 are unnecessary
  punctuation between a long subject and its verb, and restrictive versus
  nonrestrictive elements at early-college complexity.
- **Algebra** — band 1 is a one-step linear equation; band 6+ is the number of
  solutions of a system, and symbolic representations containing variable
  constants.
- **PSDA** — band 1 is a percentage or a median from an ordered list; band 7+ is
  conditional probability from a two-way table, derived units, and the effect
  of a changed value on mean versus median.

## Licensing — why none of this is copied

College Board grants no commercial licence for official SAT items and its terms
forbid their use with generative AI. Consequently:

- No official item, passage, or answer explanation is reproduced in this repo.
- No AI prompt in `src/lib/sat/**` passes official questions as examples.
- What is reproduced is the published blueprint — domain names, question
  counts, testing-point descriptions and score-band descriptors — which is
  factual specification, not content.

The Library panel links students straight to Bluebook and the Student Question
Bank for exactly this reason: our items are blueprint-matched and original, and
the four adaptive practice tests in Bluebook are written by the people who write
the real exam. A prep tool that hides that is selling something.

## Re-checking this

```
npm run audit:sat-bank     # structure, coverage, blueprint drift, answer balance
npm run verify:sat-forms   # how many genuinely distinct full-length forms fit
```

Both read the taxonomy shares above, so if a source is revised, change
`src/data/sat/taxonomy.js`, update the tables here, and let the audit tell you
what drifted.
