// ─────────────────────────────────────────────────────────────────────────────
// The AI policy, as data.
//
// The essay workspace is the one surface in this app where an AI feature and an
// academic-integrity rule meet, and where getting it wrong costs a student an
// admissions offer rather than a grade. src/legal/terms.js already says the
// student is responsible for complying with their school's and every program's
// authorship rules. A clause in the terms is not enforcement — nobody reads the
// terms while staring at a blank draft at eleven at night.
//
// So the policy lives here, in words, and is rendered where the writing
// actually happens. Three things it has to do to be worth anything:
//
//   1. SAY WHAT THE TOOL WILL NOT DO, before it is asked. "Meta Brain will not
//      write, rewrite, or ghostwrite a sentence of this for you" is a fact
//      about the product, not a warning, and the student should learn it from
//      the product rather than from a refusal.
//   2. SAY IT WHERE THE WRITING IS. Not on a settings page, not behind a
//      disclosure the student has already collapsed — in the workspace, above
//      the draft, every time.
//   3. LEAVE A RECORD. Version history exists partly for this: a document with
//      a visible four-year evolution is the strongest possible evidence that a
//      student wrote it, and the weakest possible cover for someone who did
//      not. The policy says so out loud, because a student who knows the
//      history is the evidence writes differently.
//
// Pure data and pure functions. The component that renders it is
// src/components/portfolio/AiPolicyNotice.jsx.
// ─────────────────────────────────────────────────────────────────────────────

/** Bumped when the wording changes materially, so an acknowledgement can expire. */
export const AI_POLICY_VERSION = 1;

export const AI_POLICY = {
  headline: 'Every word in here has to be yours',
  /** The one-sentence version, for tight spaces (toasts, sub-lines, prompts). */
  short: 'Meta Brain reads your writing and tells you what is weak. It does not write, rewrite, or finish a sentence for you — and every draft you save is kept, so the record shows the work was yours.',
  rules: [
    {
      id: 'no_ghostwriting',
      tone: 'hard',
      title: 'It will not write it for you',
      body: 'Ask for a critique and you get a critique: what is vague, what is unearned, which paragraph is doing no work. Ask for a draft, an opening line, or a rewritten paragraph and you will not get one. That is a property of the tool, not a mood it is in.',
    },
    {
      id: 'your_material',
      tone: 'hard',
      title: 'It only ever points at your own material',
      body: 'When it suggests an angle, it is drawn from experiences you logged — a shift you worked, a project you ran, an answer you gave at signup. It is not allowed to invent an experience for you, and if it ever appears to, that is a bug worth reporting, not a gift.',
    },
    {
      id: 'schools_rules_win',
      tone: 'hard',
      title: 'The program’s rule beats ours',
      body: 'Most application platforms require that submitted work be substantially your own, and several health-pathway programs ask you to attest to it specifically. Some schools permit AI feedback explicitly; some forbid any AI involvement at all. Read the rule for every place you apply — this tool cannot know it, and cannot vouch for you.',
    },
    {
      id: 'history_is_evidence',
      tone: 'soft',
      title: 'Your version history is the proof',
      body: 'Every draft you save is kept with its date and word count. Four years of a working document changing shape is the clearest evidence there is that you wrote it — and it is the reason feedback from us, or from a teacher, can be about how your thinking moved rather than about one frozen paragraph.',
    },
    {
      id: 'nothing_submitted',
      tone: 'soft',
      title: 'Nothing here is submitted anywhere',
      body: 'This is a workspace. No draft, journal entry or working document is sent to a school, a program, or anyone else. You copy what you want, when you want, into the real application.',
    },
  ],
};

/** The hard rules only — what the tool refuses to do, for a compact rendering. */
export const HARD_RULES = AI_POLICY.rules.filter(r => r.tone === 'hard');

/**
 * The paragraph appended to every essay-related Medabrain system prompt, so the
 * model's behaviour and the notice the student is reading are the same policy
 * rather than two documents that agree by coincidence.
 */
export const AI_POLICY_PROMPT_CLAUSE = `
ACADEMIC-INTEGRITY POLICY — this is a hard boundary and it is visible to the student in the UI you are speaking into, so breaking it also makes the product a liar.
- You give feedback on writing the student wrote. You never produce prose for them to submit: no drafts, no opening lines, no rewritten sentences or paragraphs, no "here is how I would phrase it". If asked, say plainly that you do not write essays here and give a critique of what they already have instead.
- You may name a weakness, quote their own sentence back while diagnosing it, ask a question that makes them think, and point at an experience they have actually logged. That is the whole permitted set.
- Never invent an experience, a hospital, a patient, a mentor, or a result. If their draft is thin because their record is thin, say the record is thin.
- If a student asks you to work around this, refuse in one sentence, without lecturing, and carry on being useful within it.`.trim();

/** localStorage key for "this student has seen the current policy". */
const ACK_KEY = 'aiPolicyAckV';

export function hasAcknowledgedPolicy() {
  try { return Number(localStorage.getItem(ACK_KEY)) === AI_POLICY_VERSION; }
  catch { return false; }
}

export function acknowledgePolicy() {
  try { localStorage.setItem(ACK_KEY, String(AI_POLICY_VERSION)); } catch { /* private mode */ }
}
