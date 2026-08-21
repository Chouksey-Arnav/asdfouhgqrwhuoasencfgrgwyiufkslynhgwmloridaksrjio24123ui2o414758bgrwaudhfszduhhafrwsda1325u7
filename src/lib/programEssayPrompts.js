// ─────────────────────────────────────────────────────────────────────────────
// The prompts a tracked program actually asks — surfaced in the essay workspace
// rather than discovered on the application site.
//
// ── The failure this closes ─────────────────────────────────────────────────
// A student tracks a combined-degree program in March of junior year. The
// Combined Degrees panel knows, and has known since the moment they tapped
// save, that the program requires a separate supplemental application with its
// own essays on top of the university's own supplement — the fact is right
// there in the catalog, in `supplemental.required` and `supplemental.prompts`.
// The essay workspace, three sections down the same page, knew nothing about
// it. So the student built their October around the Common App essay and one
// supplement per school, and found out in the last week of October that the
// program they most wanted has three more, one of which asks for documented
// service hours they never logged.
//
// Nothing about that is a data problem. Both halves were in the app. They were
// never joined.
//
// ── How the join works ──────────────────────────────────────────────────────
// A tracked combined-degree program IS a college-list row: collegeRowFor() in
// src/lib/combinedDegree.js writes it with `name` set to programLabel(program),
// which is "Institution — Program". So the college list is the join key, and no
// new tracking store was needed: match the rows back to the catalog and the
// program's own supplemental block comes with them, deadline attached.
//
// ── The honesty rule this module inherits ───────────────────────────────────
// Half the catalog's programs carry `prompts: []` with a note saying the
// prompts are not published outside the applicant portal. That is a fact worth
// showing, and it is emphatically not a licence to generate plausible prompts
// for that program — a fabricated BS/MD prompt is worse than no prompt, because
// the student drafts against it. So a program with no published prompts renders
// its note and its official URL and nothing else. Only text the catalog
// actually holds is ever presented as a prompt.
// ─────────────────────────────────────────────────────────────────────────────

import { PROGRAMS as COMBINED_PROGRAMS } from '../data/combinedDegreePrograms';
import { programLabel, nextDeadline } from './combinedDegree';

/** Normalised for matching: case, punctuation and dash style all vary by entry path. */
const norm = (s) => String(s || '').toLowerCase().replace(/[—–-]/g, '-').replace(/\s+/g, ' ').trim();

/**
 * Every tracked combined-degree program, matched back to its catalog entry.
 *
 * Exact label match first, because that is what the Combined Degrees panel
 * writes. The fallback — institution and program name both present in the row's
 * name — catches a student who typed the school in by hand on the college list
 * before discovering the program panel, which is a common order of operations
 * and would otherwise silently miss.
 */
export function trackedCombinedPrograms(colleges = []) {
  const rows = Array.isArray(colleges) ? colleges : [];
  const out = [];
  COMBINED_PROGRAMS.forEach(program => {
    const label = norm(programLabel(program));
    const inst = norm(program.institution);
    const prog = norm(program.program);
    const match = rows.find(c => {
      const n = norm(c.name);
      return n === label || (n.includes(inst) && n.includes(prog));
    });
    if (match) out.push({ program, college: match });
  });
  return out;
}

/**
 * One card's worth of supplemental information per tracked program.
 *
 * `prompts` is empty whenever the catalog does not publish them — the card then
 * says so, which is the honest and still-useful answer, because knowing there
 * is a second application at all is most of the value.
 *
 * @returns [{ key, programId, title, institution, url, required, note, prompts,
 *             deadline, collegeId, closesBeforeGeneral }]
 */
export function collectProgramPrompts({ colleges = [], today = new Date() } = {}) {
  return trackedCombinedPrograms(colleges).map(({ program, college }) => {
    const dl = nextDeadline(program, today);
    const prompts = (program.supplemental?.prompts || [])
      .filter(p => typeof p === 'string' && p.trim().length > 10)
      .map((text, i) => ({
        id: `${program.id}_p${i}`,
        text: text.trim(),
        // Combined-degree supplements almost never publish a word limit alongside
        // the prompt. Guessing one would put a fake target under a real question,
        // so the workspace uses its own default and says the limit is unconfirmed.
        wordLimit: null,
        confidence: 'program',
      }));
    return {
      key: `combined:${program.id}`,
      programId: program.id,
      title: programLabel(program),
      institution: program.institution,
      url: program.url,
      required: program.supplemental?.required === true,
      note: program.supplemental?.note || null,
      prompts,
      deadline: dl,
      collegeId: college.id || null,
      // The reason this whole module exists, as a flag the UI can lead with: a
      // combined-degree round is very often earlier than the university's own
      // general deadline, and earlier than the November 1 date a student has in
      // their head from everywhere else.
      closesBeforeGeneral: !!dl?.iso && ['early_decision', 'early_action', 'priority', 'separate'].includes(program.deadline?.round),
      roundLabel: dl?.roundLabel || null,
      binding: !!dl?.binding,
    };
  }).sort((a, b) => {
    const ad = a.deadline?.iso || '9999';
    const bd = b.deadline?.iso || '9999';
    return ad.localeCompare(bd);
  });
}

/**
 * The `essays` row a program prompt becomes when the student starts it.
 * `source_ref` is what keeps the two ends joined afterwards: the workspace can
 * tell that an essay already exists for this prompt, and never offers it twice.
 */
export function essayRowForProgramPrompt(card, prompt) {
  return {
    title: `${card.institution} — ${card.roundLabel ? `${card.roundLabel} supplement` : 'program supplement'}`,
    prompt: prompt.text,
    word_limit: prompt.wordLimit || 500,
    college_id: card.collegeId || null,
    status: 'not_started',
    content: '',
    essay_kind: 'supplemental',
    source_ref: `${card.key}:${prompt.id}`,
    source_label: card.title,
  };
}

/** Has this exact program prompt already been started? Matched on source_ref. */
export function isPromptStarted(essays, card, prompt) {
  const ref = `${card.key}:${prompt.id}`;
  return (essays || []).some(e => e.source_ref === ref);
}

/**
 * A one-line summary for the workspace hero and for Medabrain's prompt, so the
 * AI reasoning about a student's essay load counts the program supplements it
 * can see rather than only the school ones.
 */
export function summarizeProgramPrompts(cards = []) {
  if (!cards.length) return null;
  const withPrompts = cards.filter(c => c.prompts.length);
  const promptCount = withPrompts.reduce((n, c) => n + c.prompts.length, 0);
  const unpublished = cards.filter(c => c.required && !c.prompts.length).length;
  const parts = [];
  if (promptCount) parts.push(`${promptCount} published program prompt${promptCount === 1 ? '' : 's'} across ${withPrompts.length} tracked program${withPrompts.length === 1 ? '' : 's'}`);
  if (unpublished) parts.push(`${unpublished} more program${unpublished === 1 ? '' : 's'} requiring a separate supplement whose prompts are not published publicly`);
  return parts.join(', ') || null;
}
