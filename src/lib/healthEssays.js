// ─────────────────────────────────────────────────────────────────────────────
// The health-pathway half of the essay workspace.
//
// ── The thing the general tools do not model ────────────────────────────────
// Every college-prep product has an essay tracker: a list of prompts, a word
// count, a status. That is a project-management view of senior year, and it is
// genuinely useful in senior year. It is also the wrong tool for the essay that
// decides health-pathway admissions, because that essay is not written in
// senior year. It is assembled, over four years, out of a handful of moments a
// student cannot articulate at the time and cannot reconstruct afterwards.
//
// Read enough BS/MD and direct-admit personal statements and the split is
// obvious. The qualified applicant writes: "I have wanted to be a doctor since
// I was eight; my grandmother's illness showed me the importance of
// compassionate care." True, unfalsifiable, and indistinguishable from ten
// thousand others. The strong applicant writes about the specific thing they
// saw — the interpreter who was a fourteen-year-old cousin, the four hours a
// discharge took for reasons nobody explained, the fact that the ICU was quiet
// and they had expected it to be loud — and what they concluded, and how the
// conclusion changed. That is not a writing skill. It is a record-keeping
// problem. The moment happens in July after sophomore year, it is vivid for
// nine days, and by the time anyone asks the question that would have surfaced
// it, it has flattened into "I volunteered at a hospital."
//
// So this module is two instruments:
//
//   1. THE WORKING DOCUMENT. One "why this pathway" document that lives for
//      four years, has no word limit, is never "final", and accumulates version
//      history. It is not an essay. It is the quarry every later essay is cut
//      out of, and its value is precisely that it was written before the
//      student knew what it was for.
//
//   2. THE QUESTION. Periodically — and pinned to the seasons when the answers
//      actually exist — a real question, asked once, in words a seventeen-year-
//      old would use. Not "reflect on your clinical experiences." The point of
//      "what did you see this summer that you can't stop thinking about" is
//      that it is answerable: it names a feeling the student already has rather
//      than asking them to manufacture one.
//
// Pure data and pure functions — no React, no network — so the cadence logic is
// testable and the prompt bank can be read and argued with as a list.
// ─────────────────────────────────────────────────────────────────────────────

import { dayKey, parseDay, daysBetween } from './timeline.js';

// ── The working document ─────────────────────────────────────────────────────

/**
 * The one persistent document. Stored as an `essays` row with
 * essay_kind='why_pathway' rather than in its own table, so it inherits version
 * history, autosave, the critique pass and the data export for free — and so
 * `title`/`content` mean the same thing they mean everywhere else.
 *
 * It deliberately has NO word limit and NO status ladder. Both would misdescribe
 * it: there is no length it is supposed to be and no point at which it is
 * finished, and a progress bar creeping toward a target it does not have is the
 * exact anxiety this document exists to avoid.
 */
export const WHY_PATHWAY = {
  kind: 'why_pathway',
  title: 'Why this pathway',
  sub: 'Your own answer, kept for four years',
  blurb:
    'One document, from now until you apply. Nothing here is due, nothing is graded, and it is not an essay — it is where the raw material for every essay you will ever write about medicine gets kept while you still remember it clearly.',
  /** Shown once, above an empty document, and never again. */
  opener:
    'Start anywhere. The most useful first entry is usually not "why medicine" — it is one specific thing you have seen, heard or done that you have thought about since. Write it the way you would tell a friend, not the way you would write an application.',
  /** The critique pass is told this is not a submission draft (see essayCritique.js). */
  critiqueMode: 'working_document',
};

/** How long the working document can sit untouched before the workspace says so. */
export const WHY_PATHWAY_STALE_DAYS = 100;

// ── The question bank ────────────────────────────────────────────────────────
//
// Rules every entry obeys, because a bad prompt is worse than no prompt:
//   • It asks about something that already happened, never about an abstraction.
//     "What did you see" is answerable; "what does compassion mean to you" is a
//     request to write a paragraph the student does not believe.
//   • It is one question. A prompt with three clauses gets answered on the
//     easiest clause.
//   • `season` pins it to the weeks when the answer exists. The summer question
//     asked in February gets a reconstructed memory; asked in September it gets
//     the real one.
//   • `repeat: 'yearly'` marks the ones worth asking every year — the same
//     question in ninth and eleventh grade produces two different answers, and
//     the distance between them is itself the material.
//
// `grades` gates by class year the same way the milestone catalog does: a
// ninth-grader asked "which of your experiences would survive an interviewer
// asking one more question" is being asked about experiences they have not had.

const G_ALL = ['freshman', 'sophomore', 'junior', 'senior', 'gap'];
const G_UPPER = ['junior', 'senior', 'gap'];

export const REFLECTION_PROMPTS = [
  // ── Season-pinned ──────────────────────────────────────────────────────────
  {
    id: 'summer_cant_stop',
    question: "What did you see this summer that you can't stop thinking about?",
    nudge: 'One thing. It does not have to be dramatic or sad — "the waiting room television was on mute and nobody turned it off" is a better answer than most. Write what you saw, and then what you have caught yourself thinking about it since.',
    season: { from: '08-10', to: '10-20' },
    grades: G_ALL, repeat: 'yearly', weight: 3,
    why: 'Summer is when almost every health experience a high-schooler has actually happens, and it fades faster than anyone expects. Asked in September the answer is real; asked in March it is a reconstruction.',
  },
  {
    id: 'winter_still_true',
    question: 'Half a year on — is the reason you gave for wanting this still the real one?',
    nudge: 'Go and read what you wrote in your working document last time. Not to correct it. Just say whether it is still true, and if it is not, what moved.',
    season: { from: '12-20', to: '02-10' },
    grades: G_ALL, repeat: 'yearly', weight: 2,
    why: 'A reason that survives being checked twice a year is one you can defend in an interview. A reason that quietly changed and was never noticed is the one that collapses under a follow-up question.',
  },
  {
    id: 'spring_who_did_you_watch',
    question: 'Who did you watch do this job this year, and what did they do that you did not expect?',
    nudge: 'A nurse, a tech, a paramedic, a pharmacist, a receptionist — anyone. The unexpected part is the whole answer.',
    season: { from: '03-15', to: '05-31' },
    grades: G_ALL, repeat: 'yearly', weight: 2,
    why: 'Nearly every applicant writes about wanting to help people. Almost none can describe what the job actually looked like on a Tuesday, which is the difference an interviewer hears in the first two minutes.',
  },

  // ── Evergreen, asked once, roughly in this order ───────────────────────────
  {
    id: 'first_moment',
    question: 'When did you first think this might be for you — and what were you actually doing?',
    nudge: 'Not the story you tell people. The literal moment, with the room in it.',
    season: null, grades: G_ALL, repeat: null, weight: 3,
    why: 'This is the one every applicant answers and almost nobody answers specifically. Getting the real version written down early is worth more than any amount of polishing later.',
  },
  {
    id: 'wrong_about',
    question: 'What have you been wrong about so far?',
    nudge: 'Something you assumed about medicine, or about yourself, that turned out not to hold. Being wrong about something is evidence you were paying attention.',
    season: null, grades: G_ALL, repeat: null, weight: 3,
    why: 'Admissions readers and interviewers are looking for a mind that updates. A student who cannot name one thing they were wrong about reads as one who has not looked closely at anything.',
  },
  {
    id: 'hardest_part',
    question: 'What is the part of this job you think you would be worst at?',
    nudge: 'Answer it honestly and specifically. "I am a perfectionist" is not an answer; "I go quiet when someone is crying and I do not know what to do with that" is.',
    season: null, grades: G_ALL, repeat: null, weight: 2,
    why: 'This is a real interview question at almost every combined-degree program, and the honest answer is always better received than the rehearsed one — but only if it was thought about before the interview, not during it.',
  },
  {
    id: 'unglamorous',
    question: 'What is the most boring or unpleasant thing you have done in a health setting?',
    nudge: 'Stocking, cleaning, waiting, being ignored, saying the same sentence forty times. Write what it was, and whether you would do it again.',
    season: null, grades: G_ALL, repeat: null, weight: 2,
    why: 'Willingness to do the unglamorous part is the single most credible signal a teenager can offer, and it is almost never in the essay because it does not feel impressive.',
  },
  {
    id: 'who_is_missing',
    question: 'Who in your community has the hardest time getting care, and how do you know?',
    nudge: 'A specific group, a specific reason, and the thing you actually saw or were told — not a statistic you looked up.',
    season: null, grades: ['sophomore', ...G_UPPER], repeat: null, weight: 2,
    why: 'Nearly every health-pathway program asks some version of this. Answering it from something you witnessed rather than from a report is what separates the two piles.',
  },
  {
    id: 'changed_your_mind',
    question: 'Has anything made you consider a different health career than the one you started with?',
    nudge: 'Nursing instead of medicine, PA instead of MD, research instead of clinic, or out of health entirely. What raised it, and where did you land?',
    season: null, grades: ['sophomore', ...G_UPPER], repeat: null, weight: 2,
    why: 'Considering an alternative and choosing anyway is a much stronger position than never having considered one — and it is the answer to "why not nursing / why not research", which gets asked.',
  },
  {
    id: 'one_more_question',
    question: 'Which of your experiences would survive an interviewer asking one more question about it?',
    nudge: 'Go down your activities list. For each, imagine being asked "what did you actually do there?" and note which ones you could answer for two minutes.',
    season: null, grades: G_UPPER, repeat: null, weight: 3,
    why: 'The activities that collapse under one follow-up question are the ones that should not lead your application. Finding that out now is free; finding it out in an interview is not.',
  },
  {
    id: 'what_you_built',
    question: 'What exists now that would not exist if you had not done something?',
    nudge: 'A club that runs, a drive that collected something, a patient who got helped, a protocol somebody wrote down because you asked. Small is fine — real is the requirement.',
    season: null, grades: G_UPPER, repeat: null, weight: 2,
    why: 'Impact you can point at beats participation you can list, and this question is how you find out which of your four years you actually have.',
  },
];

export const PROMPT_BY_ID = Object.fromEntries(REFLECTION_PROMPTS.map(p => [p.id, p]));

/**
 * How often the workspace asks unprompted. Six weeks is a deliberate compromise:
 * often enough that a term's worth of experience does not evaporate, rare enough
 * that the question still reads as a question rather than as a chore with a due
 * date. Nothing here ever becomes overdue and nothing appears in a task list —
 * the whole point is that this is the one part of the portfolio that is not
 * generating pressure.
 */
export const REFLECTION_CADENCE_DAYS = 42;

/** Is `today` (MM-DD aware, year-agnostic) inside a prompt's season window? */
export function inSeason(season, today = dayKey()) {
  if (!season) return true;
  const md = String(today).slice(5);
  // A window that wraps the new year (e.g. 12-20 → 02-10) is true on either side of it.
  return season.from <= season.to
    ? md >= season.from && md <= season.to
    : md >= season.from || md <= season.to;
}

/** Entries answering this prompt, newest first. */
const answersTo = (entries, id) =>
  entries.filter(e => e.prompt_id === id).sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));

/**
 * The question to put in front of this student right now, or null.
 *
 * The order of preference is the whole design:
 *   1. A season-pinned question whose window is open and which has not been
 *      answered this cycle. These are time-critical in a way nothing else here
 *      is — the summer question in September is worth more than any evergreen
 *      one, because the answer stops existing.
 *   2. Otherwise, if it has been longer than the cadence since they last wrote
 *      anything, the highest-weighted unanswered evergreen question for their
 *      class year.
 *   3. Otherwise nothing. Silence is a legitimate output: a student who wrote
 *      last week does not need to be asked again this week.
 *
 * @returns {{ prompt, urgency: 'season'|'cadence', reason, daysSinceLast }|null}
 */
export function nextReflectionPrompt({ gradeStage = null, entries = [], now = new Date() } = {}) {
  const rows = Array.isArray(entries) ? entries.filter(e => e && e.content && String(e.content).trim()) : [];
  const today = dayKey(now);
  const forGrade = (p) => !gradeStage || p.grades.includes(gradeStage);

  // 1 — season-pinned, still open, not yet answered in this window.
  const seasonal = REFLECTION_PROMPTS
    .filter(p => p.season && forGrade(p) && inSeason(p.season, today))
    .sort((a, b) => b.weight - a.weight)
    .find(p => {
      const prior = answersTo(rows, p.id);
      if (!prior.length) return true;
      if (p.repeat !== 'yearly') return false;
      // Answered before, but not in this year's window — 300 days is comfortably
      // longer than any window and comfortably shorter than a year.
      return daysBetween(prior[0].entry_date, today) > 300;
    });
  if (seasonal) {
    return {
      prompt: seasonal, urgency: 'season', reason: seasonal.why,
      daysSinceLast: rows.length ? daysBetween(mostRecent(rows), today) : null,
    };
  }

  // 2 — cadence.
  const last = rows.length ? mostRecent(rows) : null;
  const daysSinceLast = last ? daysBetween(last, today) : null;
  if (last && daysSinceLast < REFLECTION_CADENCE_DAYS) return null;

  const evergreen = REFLECTION_PROMPTS
    .filter(p => !p.season && forGrade(p) && !answersTo(rows, p.id).length)
    .sort((a, b) => b.weight - a.weight)[0];
  if (!evergreen) return null;
  return { prompt: evergreen, urgency: 'cadence', reason: evergreen.why, daysSinceLast };
}

const mostRecent = (rows) => rows.map(r => r.entry_date).sort().slice(-1)[0];

/**
 * Whether the four-year working document has gone quiet, and what to say about
 * it. Never phrased as overdue — a document with no deadline cannot be late.
 */
export function whyPathwayStatus(doc, versions = [], now = new Date()) {
  if (!doc) return { state: 'missing', days: null };
  const words = countWords(doc.content);
  if (!words) return { state: 'empty', days: null };
  const stamps = [doc.updated_at, ...versions.map(v => v.created_at)].filter(Boolean).sort();
  const lastIso = stamps[stamps.length - 1];
  const days = lastIso ? daysBetween(dayKey(new Date(lastIso)), dayKey(now)) : null;
  if (days != null && days >= WHY_PATHWAY_STALE_DAYS) return { state: 'stale', days, words };
  return { state: 'live', days, words };
}

export function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

// ── Grade gating for the workspace itself ────────────────────────────────────

/**
 * Ninth and tenth graders do not have supplemental essays. They will, in two or
 * three years, and hiding the tracker entirely would mean they arrive at junior
 * year having never seen the thing they are about to live in. But putting an
 * essay tracker in a fifteen-year-old's working set produces exactly one
 * outcome: a list of application tasks that are not theirs yet, generating a
 * background hum of being behind on something that has not started.
 *
 * So: visible, openable, clearly labelled as junior-year work, and out of the
 * task list. The reflection journal is their working surface, and it is the one
 * that will actually be worth something to them in three years.
 */
export function isEssayPreviewGrade(gradeStage) {
  return gradeStage === 'freshman' || gradeStage === 'sophomore';
}

/** When the tracker stops being a preview, in words. */
export function trackerUnlockLabel(gradeStage) {
  if (gradeStage === 'freshman') return 'You will start using this in junior year — about two and a half years from now.';
  if (gradeStage === 'sophomore') return 'You will start using this next year. Juniors draft the personal statement in the summer.';
  return null;
}

/** Season-window helper the UI uses to explain why a question showed up now. */
export function seasonLabel(season) {
  if (!season) return null;
  const m = (md) => new Date(2000, Number(md.slice(0, 2)) - 1, Number(md.slice(3, 5)))
    .toLocaleDateString(undefined, { month: 'long' });
  const from = m(season.from);
  const to = m(season.to);
  return from === to ? from : `${from}–${to}`;
}

export { parseDay };
