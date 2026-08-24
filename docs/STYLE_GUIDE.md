# Copy style guide

Every rule here is enforced by `npm run verify:copy`, which runs in `npm run
build` and therefore in CI. The machine-readable half is
[`docs/glossary.json`](./glossary.json); this file is the same decisions with
the reasons attached.

That pairing is the point. A one-time cleanup of an app's capitalization is
undone within a month — not by anyone careless, but because "Clear Filters" and
"Clear filters" both look fine in isolation, and the inconsistency only becomes
visible when you put forty of them side by side, which nobody ever does. A lint
looks at all forty every time.

---

## 1. Sentence case. Everywhere.

Headings, buttons, labels, nav items, tabs, table headers, empty states, toasts,
menu items, form labels, tooltips. All of it.

> Add a certification · Clear filters · No study notes yet · Activities & honors

**Why not Title Case:** it is inconsistently applied *by definition*. Nobody
agrees on which words take a capital — APA capitalizes words of four letters or
more, Chicago goes by part of speech, AP has its own list, and everybody
half-remembers whichever one they were last taught. The moment a second person
writes a screen, it drifts. Sentence case has exactly one rule, so there is
nothing to drift.

It also reads faster. Sentence case preserves the ascender/descender pattern the
eye uses to recognise word shapes; Title Case flattens it.

### The exceptions

**Proper nouns** keep their capitals: Johns Hopkins University, Common App,
College Board, the Princeton Review, Early Decision.

**Credential names are exact**, because they are the issuer's name for their own
thing, and a student puts them on an application:

> "Add a certification" — the action, sentence case
> "Certified Nursing Assistant" — the credential, exactly as the issuer spells it
> "CNA" — the abbreviation, capitalized

The credential database (`src/data/credentials/*.js`) is the source of truth for
those spellings. The lint reads `officialName` from it directly rather than
keeping a second copy that can disagree with the first.

**Our own product names**: MedSchoolPrep, Medabrain, MedEx Score. One spelling
each.

---

## 2. Never all caps

Not for a heading, not for a label, not for a warning. All-caps strips the word
shape that fluent reading depends on — every word becomes the same rectangle —
and it is measurably harder for dyslexic readers, who are a meaningful share of
the students using this app.

Anything longer than a short abbreviation fails the lint.

**If you want an eyebrow label**, use size and letter spacing instead of
capitals: `lbl()` in `src/lib/theme.js` gives you 13px at weight 600 with +0.4 of
tracking. That is the effect the capitals were reaching for, without the cost.
See [DESIGN_TOKENS.md](./DESIGN_TOKENS.md#type).

Three things are out of scope, deliberately:

- **`src/legal/`** — a warranty disclaimer set in capitals is a legal
  convention (the "conspicuous" requirement in UCC §2-316 and its descendants).
  Restyling it is not a typography decision anybody here is entitled to make
  alone.
- **LLM prompts** (`STYLE_TONE`, `DEBRIEF_INSTRUCTION`, `portfolioCritique.js`)
  — that emphasis is addressed to a model, not to a student.
- **Formulas and codes** — CYP450, DNA/RNA, FADH2, and the `ABCD-EFGH` invite
  placeholder are not shouting.

---

## 3. American spelling

The audience is entirely US high schoolers and their families. The full
British → American map is in `glossary.json` and is applied to **user-facing copy
and to comments**, because a house habit that survives in the comments comes back
into the copy the next time somebody writes a screen.

> personalized, color, program, center, license, practice, canceled, enrollment,
> judgment, catalog, gray, counselor, analyze, organization

The marketing pages are in scope too — `index.html`, the SEO route descriptions
and `public/llms.txt` are checked alongside the app, because they ship to more
readers than most screens do.

**What the lint never touches:** identifiers, object keys, and database values.
`status: 'cancelled'` is a PostgreSQL check constraint
(`supabase/migrations/0014_quests.sql`), not a British spelling, and
`scripts/lib/copyStrings.mjs` reads a real AST specifically so that distinction
survives.

---

## 4. One word per thing

Two words for one thing is how a student ends up believing there are two things.

| Use | Not | Why |
|---|---|---|
| **shadowing** | clinical observation, observation hours | What students say, and what programs ask for on the application. |
| **activities** | extracurriculars, extra-curricular | Shorter, and the Common App's own word for the same list. "Extracurricular" also implies optional garnish, which is the opposite of what this app tells students. |
| **pathway** | career track, career path, "your track" | The named route a student is on is a pathway, everywhere. **`track` is still fine as a verb** — you track an opportunity — and that is the only sense it keeps. |
| **program** | school list, target/reach/safety school | You apply to a *program*, not to a school: a BS/MD program and the university around it have different odds, requirements and deadlines. |

Two clarifications on the last one, because it is the one people get wrong:

- **"medical school" stays.** It is the generic level of education, not a
  specific offering. So does the product name, MedSchoolPrep.
- **A college is still a college.** An institution and an offering are different
  things, and the college list is a list of colleges. "Program vs school" is not
  "program vs college".

---

## 5. Empty states, buttons and errors

The wording rules that are not capitalization, and that the lint cannot check
for you:

- **An empty state gets a headline that says what lives here**, one sentence on
  why it matters, and exactly one action. Not "No items". See
  `src/components/ui/EmptyState.jsx`, which also distinguishes
  empty-because-new from empty-because-filtered from empty-because-error.
- **Buttons say what happens**: "Add a certification", not "Submit". "Clear
  filters", not "Reset".
- **Errors say what to do next.** If we broke it, say so — "This is a build
  problem, not something you did" is real copy in this app and it is the right
  register.
- **Write to one student, in second person.** "Your program list", not "the
  user's program list".

---

## Running it

```bash
npm run verify:copy        # everything below, over app + content + marketing
node scripts/verifyCopy.mjs --words   # just the unknown words, for triage
```

| Check | Scope |
|---|---|
| Sentence case | label-ish strings in `src/components`, `src/App.jsx` |
| No all caps | screen copy (not legal, not prompts) |
| American spelling | copy **and** comments, app + content + marketing files |
| One word per thing | UI copy |
| Product names | everywhere |
| Credential capitalization | everywhere, against `src/data/credentials/` |
| Spelling (cspell, en-US) | UI copy, plus `docs/dictionary.txt` |

**Adding a word to the dictionary** (`docs/dictionary.txt`): the bar is that it
is a real term a student or an admissions office would recognise, spelled the way
*they* spell it. "It looked fine to me" is not the bar — that is how "recieve"
survives for two years. Keep the sections; a flat 200-line list is a list nobody
reviews.

**Changing a decision**: edit `glossary.json`, and the lint follows on the next
run. That is the whole design — the guide and the enforcement cannot disagree,
because they are the same file.
