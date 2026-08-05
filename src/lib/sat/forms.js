// ─────────────────────────────────────────────────────────────────────────────
// Turning the form catalog into actual assembled tests.
//
// THE PROBLEM THIS SOLVES
// Every full test used to be built from `Date.now()`, drawing from the whole
// bank with no memory of what any earlier test had used. Two consequences, both
// bad and both invisible:
//
//   1. Nothing stopped a question appearing in Module 1 and again in Module 2
//      of the SAME test. `buildModule` de-duplicates within one call, and each
//      module is a separate call, so the only thing keeping a repeat off the
//      screen was luck.
//   2. Two tests taken a week apart overlapped by however much the shuffle
//      happened to overlap — typically a third of the questions, sometimes far
//      more in the thin (domain, difficulty) buckets. A student re-sitting a
//      test they half-remember gets a score that measures recall, not skill.
//
// THE FIX
// Forms are apportioned ONCE, in catalog order, against a running set of
// questions already claimed. Form A takes its 81 R&W and 66 Math questions
// (Module 1 plus both possible Module 2s); Form B takes from what is left; and
// so on. Within a form nothing repeats — that guarantee is absolute. Between
// forms the guarantee holds until the bank runs out, at which point later forms
// start reusing earlier questions, and `freshness` says so out loud rather than
// pretending otherwise.
//
// THE EXCLUSION LADDER
// A module must be full length. A 22-question Math module is not a Math module:
// the raw-to-scaled conversion assumes 44 questions per section, so a short
// module silently deflates the score we hand the student. So each slot is built
// against progressively weaker exclusions and takes the first tier that comes
// out full length:
//
//   tier 0            every question every earlier form claimed
//   tier 1            the same, minus Form A's questions
//   tier 2            the same, minus Form A's and Form B's
//   ...
//   final tier        only this form's own questions
//
// Rungs are dropped OLDEST FIRST, so when the bank forces a form to recycle it
// recycles the questions the student met longest ago. That ordering is the only
// thing separating "your fourth test repeats a few items from your first" from
// "your fourth test repeats the test you sat last week", and it costs nothing.
//
// The final tier cannot fail on any bank large enough for one test, which is
// why the within-a-form guarantee is the absolute one.
// ─────────────────────────────────────────────────────────────────────────────
import { SECTION_IDS, SAT_SECTIONS } from '../../data/sat/taxonomy.js';
import { routeModule2 } from '../../data/sat/scoring.js';
import { buildModule } from './adaptive.js';
import { SAT_FORMS, FRESH_MIX, SAT_FORMS_BY_ID } from '../../data/sat/forms.js';

/**
 * The three module slots a form reserves per section, in build order.
 *
 * `blocks` is which already-built slots this one must avoid. Module 1 blocks
 * both Module 2s because a student sits Module 1 and then one Module 2, so a
 * question appearing in both is a repeat inside a single sitting.
 *
 * The upper and lower Module 2s do NOT block each other, and that asymmetry is
 * deliberate. They are alternatives: routing sends a student to exactly one of
 * them, so a question in both is never seen twice in a sitting. Forcing them
 * apart would reserve 147 questions per form instead of ~98 — a third of the
 * bank spent on a collision that cannot happen — and the only case it protects
 * is re-sitting the same form AND routing the other way, which is already a
 * memory test rather than a measurement.
 *
 * The useful side effect: when the bank is roomy the two variants come out
 * almost entirely distinct anyway, because the seeded draw has room to spread.
 * They converge only as the bank tightens, which is precisely when the sharing
 * is worth having.
 */
const SLOTS = [
  { slot: 'module1', blueprint: 'module1', blocks: [] },
  { slot: 'upper', blueprint: 'upper', blocks: ['module1'] },
  { slot: 'lower', blueprint: 'lower', blocks: ['module1'] },
];

const ids = (questions) => questions.map(q => q.id);

/**
 * Build one slot, walking the exclusion ladder until the module comes out full
 * length. Returns the built module plus which tier it had to settle for, which
 * is what the freshness report is computed from.
 */
function buildSlot({ section, blueprint, seed, tiers }) {
  let last = null;
  for (let i = 0; i < tiers.length; i++) {
    const built = buildModule({ section, blueprint, seed, exclude: tiers[i] });
    last = { ...built, tier: i };
    if (built.shortfall === 0) return last;
  }
  // Every tier came up short: the bank cannot fill a single module of this
  // section. The audit script fails loudly on this; at runtime the panel still
  // gets the longest module available rather than nothing at all.
  return last;
}

/**
 * Assemble every form in catalog order. Pure, deterministic, and run once —
 * the result is frozen into `MANIFESTS` below.
 */
function buildAllForms() {
  const claimed = new Set();      // everything every earlier form uses
  const byForm = [];              // each earlier form's own ids, oldest first
  const manifests = new Map();

  for (const form of SAT_FORMS) {
    const own = new Set();
    const sections = {};
    let reusedFromEarlier = 0;
    let total = 0;
    let shortfall = 0;

    // Oldest-first release: each rung forgives one more of the earliest forms.
    // `blocked` is the within-sitting guarantee and is never released — it is
    // on every rung including the last.
    const tiersFor = (blocked) => {
      const rungs = [];
      let releasing = new Set(claimed);
      rungs.push(new Set([...releasing, ...blocked]));
      for (const earlier of byForm) {
        releasing = new Set([...releasing].filter(id => !earlier.has(id)));
        rungs.push(new Set([...releasing, ...blocked]));
      }
      return rungs; // the last rung is exactly `blocked`
    };

    for (const section of SECTION_IDS) {
      sections[section] = {};
      for (const { slot, blueprint, blocks } of SLOTS) {
        const blocked = new Set(
          blocks.flatMap(b => (sections[section][b] || []).map(q => q.id)),
        );
        const built = buildSlot({
          section,
          blueprint,
          seed: `${form.seed}:${section}:${slot}`,
          tiers: tiersFor(blocked),
        });
        for (const q of built.questions) {
          // `own` is a set, so a question shared by the upper and lower Module
          // 2s is counted once — the form's real footprint on the bank.
          if (!own.has(q.id)) {
            own.add(q.id);
            total++;
            if (claimed.has(q.id)) reusedFromEarlier++;
          }
        }
        shortfall += built.shortfall;
        sections[section][slot] = built.questions;
      }
    }

    manifests.set(form.id, {
      ...form,
      sections,
      questionIds: [...own],
      shortfall,
      freshness: {
        total,
        reused: reusedFromEarlier,
        fresh: total - reusedFromEarlier,
        // 1 means no question in this form appears in any earlier form.
        ratio: total ? (total - reusedFromEarlier) / total : 0,
      },
    });

    byForm.push(own);
    for (const id of own) claimed.add(id);
  }

  return manifests;
}

// Built at module load. The whole point of a form is that it is the same test
// every time, so there is nothing to invalidate and nothing to recompute.
const MANIFESTS = buildAllForms();

/** The assembled form, or null for `fresh-mix` / an unknown id. */
export function formManifest(formId) {
  return MANIFESTS.get(formId) || null;
}

/** Every form with its freshness figures — for the picker and the audit. */
export function allFormManifests() {
  return SAT_FORMS.map(f => MANIFESTS.get(f.id)).filter(Boolean);
}

/**
 * How much of a form the student has already met, anywhere in the app.
 *
 * Counted over Module 1 and BOTH Module 2 variants, because which Module 2 they
 * will route into is not knowable before they sit it. This is a ceiling on the
 * repeats they can actually hit, and the honest number to show before a test.
 */
export function seenInForm(formId, seenIds) {
  const manifest = MANIFESTS.get(formId);
  if (!manifest || !seenIds) return { seen: 0, total: 0, ratio: 0 };
  const total = manifest.questionIds.length;
  let seen = 0;
  for (const id of manifest.questionIds) if (seenIds.has(id)) seen++;
  return { seen, total, ratio: total ? seen / total : 0 };
}

// ── Delivery ────────────────────────────────────────────────────────────────
//
// The panel calls these two and does not need to know whether it is running a
// fixed form or a fresh mix.

/**
 * Module 1 of a section.
 *
 * @param {string} testId          a form id, or FRESH_MIX.id
 * @param {string} section         'rw' | 'math'
 * @param {{seed?:number|string, exclude?:Set<string>}} opts  fresh-mix only
 */
export function buildTestModule1(testId, section, { seed, exclude } = {}) {
  const manifest = MANIFESTS.get(testId);
  if (manifest) return { questions: manifest.sections[section].module1, shortfall: 0 };

  // Fresh mix: exclude what the student has already seen if we can still fill
  // the module doing so, and fall back to an unrestricted draw if we cannot.
  return buildSlot({
    section,
    blueprint: 'module1',
    seed: `${seed}:${section}:module1`,
    tiers: [new Set(exclude || []), new Set()],
  });
}

/**
 * Route from Module 1 and hand back the matching Module 2.
 *
 * For a form both Module 2s were assembled up front, so routing here is a
 * lookup — which also means the harder and easier variants of a form are fixed
 * and disjoint from each other, rather than two independent draws that might
 * share half their questions.
 *
 * @returns {{path, fraction, threshold, questions, shortfall}}
 */
export function buildTestModule2(testId, section, module1Responses, { seed, exclude } = {}) {
  const routing = routeModule2(module1Responses);
  const manifest = MANIFESTS.get(testId);
  if (manifest) {
    return { ...routing, questions: manifest.sections[section][routing.path], shortfall: 0 };
  }
  const built = buildSlot({
    section,
    blueprint: routing.path,
    seed: `${seed}:${section}:${routing.path}`,
    tiers: [new Set(exclude || []), new Set()],
  });
  return { ...routing, ...built };
}

// ── Choosing a test ─────────────────────────────────────────────────────────

/** Form ids the student has already completed, most recent first. */
export function takenFormIds(attempts = []) {
  return attempts
    .filter(a => a.kind === 'full' && a.status === 'complete')
    .sort((a, b) => (b.finishedAt || b.startedAt || 0) - (a.finishedAt || a.startedAt || 0))
    .map(a => a.meta?.testId)
    .filter(Boolean);
}

/**
 * What to put in front of the student by default: the first form they have not
 * sat, or — once they have sat them all — a fresh mix, which is the only option
 * left that can still show them something new.
 */
export function recommendedTestId(attempts = []) {
  const taken = new Set(takenFormIds(attempts));
  const next = SAT_FORMS.find(f => !taken.has(f.id));
  return next ? next.id : FRESH_MIX.id;
}

/**
 * Rows for the picker: every form, its status for this student, and how much of
 * it they have already met.
 */
export function formPickerRows({ attempts = [], seenIds = new Set() } = {}) {
  const completed = attempts.filter(a => a.kind === 'full' && a.status === 'complete');
  return allFormManifests().map(manifest => {
    const sittings = completed.filter(a => a.meta?.testId === manifest.id);
    const best = sittings.reduce(
      (b, a) => (!b || (a.result?.composite || 0) > (b.result?.composite || 0) ? a : b),
      null,
    );
    return {
      id: manifest.id,
      label: manifest.label,
      name: manifest.name,
      blurb: SAT_FORMS_BY_ID[manifest.id]?.blurb,
      freshness: manifest.freshness,
      seen: seenInForm(manifest.id, seenIds),
      sittings: sittings.length,
      bestComposite: best?.result?.composite ?? null,
      lastTakenAt: best ? (best.finishedAt || best.startedAt) : null,
    };
  });
}

/**
 * Bank-capacity summary, for the audit script and the "why do later forms
 * repeat" note in the UI. `fullyFreshForms` is the number of forms at the front
 * of the catalog that share nothing with any earlier form — the honest answer
 * to "how many genuinely different tests does this bank hold?"
 */
export function formCapacity() {
  const manifests = allFormManifests();
  let fullyFresh = 0;
  for (const m of manifests) {
    if (m.freshness.reused === 0) fullyFresh++;
    else break;
  }
  const perTest = SECTION_IDS.reduce(
    (sum, s) => sum + SAT_SECTIONS[s].questionsPerModule * SLOTS.length,
    0,
  );
  return {
    forms: manifests.length,
    fullyFreshForms: fullyFresh,
    questionsReservedPerForm: perTest,
    shortfalls: manifests.filter(m => m.shortfall > 0).map(m => ({ id: m.id, shortfall: m.shortfall })),
  };
}
