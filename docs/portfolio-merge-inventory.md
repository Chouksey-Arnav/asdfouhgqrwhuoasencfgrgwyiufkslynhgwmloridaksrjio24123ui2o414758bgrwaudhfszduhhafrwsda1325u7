# Portfolio merge — the full inventory

Written **before** the merge work and checked off **after**, because the way a
consolidation goes wrong is quietly: a form that used to have a home ends up
with none, and nobody notices until a student asks where their publications
field went.

Two merges are covered here:

1. **Activities & Résumé** — the four old tabs (Activities & Resume, Clinical
   Hours, Research, Skills & Certs) rebuilt as one scrolling page.
2. **Opportunities & Competitions** — pulled out of the Overview's last block
   into its own tab, on a real eligibility/deadline database.

---

## 1. Activities & Résumé — utility inventory

| # | Utility | Where it was | Where it is now | ✅ |
|---|---------|--------------|-----------------|----|
| 1 | Add an activity (type, position, org, description, impact, hrs/wk, wks/yr, grades, skills tags, evidence URL, leadership flag) | Activities tab | Activities & Honors section | ✅ |
| 2 | Common App character caps on position/org/description | Activities tab | same section, unchanged | ✅ |
| 3 | Live "Medabrain while you type" coach strip | Activities tab | same section | ✅ |
| 4 | Per-activity completeness score + blocking/fix issue list | Activities tab | same section | ✅ |
| 5 | Per-entry deep read ("read this entry line by line") | Activities tab | same section | ✅ |
| 6 | Delete activity, delete honor | Activities tab | same section | ✅ |
| 7 | Honors/awards (title, grade, level, issuer, certificate URL) + 5-slot cap | Activities tab | same section | ✅ |
| 8 | Slate analysis: 10 slots used/free, total hours, pillar coverage | Activities tab | same section **+ summary tiles at the top of the page** | ✅ |
| 9 | Honors deep read | Activities tab | same section | ✅ |
| 10 | Export to Common App (mapped categories) | Activities tab | summary action + section hero | ✅ |
| 11 | Résumé PDF export | Activities tab | summary action + hero; now carries hours, research and certs too | ✅ |
| 12 | GPA entry (term, weighted flag, rigor) + scale-aware validation | Activities tab (Academics) | Grades section | ✅ |
| 13 | GPA trend chart + band + trend arrow | Activities tab | Grades section | ✅ |
| 14 | GPA reaction ("what this number actually means") | Activities tab | Grades section | ✅ |
| 15 | College matching from GPA/scores + one-tap add to college list | Activities tab | Grades section | ✅ |
| 16 | Academic deep read | Activities tab | Grades section | ✅ |
| 17 | Clinical hours logging (site, site type, experience kind, supervisor, date, hours) | **Clinical Hours tab** | Shadowing & Hours section | ✅ |
| 18 | Per-site hour totals and verification status | **Clinical Hours tab** | same section | ✅ |
| 19 | Clinical hours → clinical pillar coverage, Admissions Calculator input | Clinical tab (isolated) | now feeds the same page's coverage gauge | ✅ |
| 20 | Research project logging (title, mentor, institution, description, publication URL, hours, status) | **Research tab** | Research section | ✅ |
| 21 | Research hours total + published/ongoing counts | **Research tab** | Research section | ✅ |
| 22 | Credential picker over the credential database (type-aware, age gates, provisional notes, registry links, expiry computation, miscategorisation warning) | **Skills & Certs tab** | Skills & Certs section | ✅ |
| 23 | Expiring/expired credential warnings | **Skills & Certs tab** | same section **+ hoisted to the summary as an urgent next step** | ✅ |
| 24 | Credential suggestions by state/grade | **Skills & Certs tab** | same section | ✅ |
| 25 | Per-section unlock gating (day-one is one door, not five) | section row | section headers, same ladder keys | ✅ |
| 26 | Deep links: `/portfolio/clinical`, `/portfolio/research`, `/portfolio/skills`, `portfolio/resume:credentials` | old tabs | resolve to the page and **jump to + expand** that section | ✅ |

### New in the merge (not a replacement for anything)

- Summary-first landing: completeness bar, what's empty, ranked next steps.
- Every section action hoisted to the summary — **no action lives only inside a
  collapsed section**.
- Sticky in-page jumper (icon + word, one row, no sub-tabs).
- "Print the whole record" — expand-all + a print stylesheet.

### Vocabulary changes (students' words, not the database's)

| Was | Now | Why |
|-----|-----|-----|
| Clinical Hours | **Shadowing & Hours** | students say "shadowing", never "clinical experience log" |
| Academics | **Grades** | ditto |

---

## 2. Opportunities & Competitions — utility inventory

| # | Utility | Before | After | ✅ |
|---|---------|--------|-------|----|
| 1 | Searchable catalog of real programs | last block of Overview | its own tab | ✅ |
| 2 | Type/level/season/cost/format/grade filters | Overview | tab, plus a first-class **Free & funded only** toggle | ✅ |
| 3 | Deterministic personal match with reasons | Overview | tab, unchanged ranking, reasons shown as chips | ✅ |
| 4 | Interest/effort/cost/format tuning, saved to the account | Overview | tab | ✅ |
| 5 | Medabrain narration over the shortlist | Overview | tab, now fed eligibility + deadlines + cost | ✅ |
| 6 | Track an opportunity → Tracked tab | Overview | tab | ✅ |
| 7 | Structured eligibility (min age, min grade, citizenship) | — | **new**: badge on every card, before any attention is spent | ✅ |
| 8 | Deadlines + program dates | — | **new**: application deadline, start date, last-verified date | ✅ |
| 9 | Deadline alerts at 60/30/7 days | — | **new**: saving pushes a milestone with three alerts | ✅ |
| 10 | "Too young for this — here's what you can do at your age" | — | **new**: never a dead end | ✅ |
| 11 | Prestige tiers, honestly labelled (incl. pay-to-play) | — | **new** | ✅ |
| 12 | HOSA competitive events by HOSA's own categories, with qualification tracking | — | **new** | ✅ |

---

## 3. The tab-count rule — 11 → 5

The brief caps the Portfolio strip at 3–4 tabs, 5 absolutely maximum, because a
horizontal strip on a 390 px phone fits about four 90 px pills before it becomes
a carousel. The strip had **eleven**, mitigated with fade edges and chevrons —
which is treating the symptom.

| Before (11) | After (5) |
|---|---|
| Overview | **Overview** |
| Activities & Résumé | **Activities** |
| Tracked | → section of Opportunities |
| Opportunities | **Opportunities** |
| Milestones | **Milestones** |
| College List | → section of Applying |
| Essays | → section of Applying |
| Financial Aid | → section of Applying |
| Recommenders | → section of Applying |
| Interview Prep | → section of Applying |
| Admissions Calc | → section of Applying (as "Chances") |
|  | **Applying** |

Every label is now one plain word, icon paired with text, one row, no caps, no
invented names. Nothing was removed:

- **Applying** is the same SectionScroller page as Activities & Résumé — summary
  first, sticky jumper, six stacked sections, every section's actions hoisted
  onto the summary. Each section renders the exact panel it was as a tab, with
  the same callbacks.
- **Tracked** joined Opportunities because it is the follow-through for the
  Track button that lives on the Opportunities cards — "what should I go do"
  and "what did I say I would do" are one question.
- Every retired id still resolves: `/portfolio/essays`, `/portfolio/calc`,
  `/portfolio/tracked`, `/portfolio/clinical` and the rest are permanent
  aliases (`SUBVIEWS.portfolio.aliases` in `routes.js`) and land on the exact
  **section**, not just the right tab (`PORTFOLIO_GROUP_FOR_VIEW` in `App.jsx`).
- The unlock ladder moved with them: `portfolio/essays` → `portfolio/applying:essays`,
  `portfolio/tracked` → `portfolio/opportunities:tracked`, and so on. Same
  surfaces, same conditions, same order — a locked one now renders as a dimmed
  section header instead of a missing pill.
- The ⌘K palette and the keyword search point at the new section ids, so
  "essays", "letters of rec", "will i get in" and "fafsa" all still land first
  time (`verify:nav-search`, 483 assertions).
- The Overview's twelve-tile section map is unchanged and still names every
  surface individually, so nothing gained a click from the merge.

## 4. Usage numbers

The brief asks for per-tab usage before finalising the grouping. **We do not
have them, and this is worth stating plainly rather than inventing a number:**

- `src/lib/eventLog.js` writes to the on-device Dexie store only — "purely
  on-device; nothing here is ever transmitted" — so there is no server-side
  per-tab session telemetry to query.
- The production database has no analytics/pageview table at all (28 tables,
  all of them student records).
- Total accounts at the time of writing: 12. Even with telemetry, a 5%-of-
  sessions threshold over 12 pre-launch accounts would be noise, not evidence.

The closest real signal is row counts per resource in production, which say
which sections students have actually filled in:

| Resource | Rows |
|----------|------|
| activities | 9 |
| colleges | 9 |
| college_checklist_items | 84 |
| deadlines | 12 |
| test_scores | 9 |
| essays | 3 |
| scholarships | 3 |
| recommenders | 1 |
| research_experience | 1 |
| awards / gpa_entries / clinical_hours / skills_certifications | 0 |

Read honestly: clinical hours, credentials, awards and GPA had **zero** rows
while they were separate tabs. That is consistent with the brief's rule — a
surface nobody reaches is not a section — and it is exactly why they are now
sections of one page with a summary that names them when they are empty,
rather than four tabs that could each be ignored independently.

If per-tab usage is wanted as a real input to future grouping decisions, the
prerequisite is a transmitted event stream (Phase 2 of `docs/PROFILING_PLAN.md`),
which does not exist yet.
