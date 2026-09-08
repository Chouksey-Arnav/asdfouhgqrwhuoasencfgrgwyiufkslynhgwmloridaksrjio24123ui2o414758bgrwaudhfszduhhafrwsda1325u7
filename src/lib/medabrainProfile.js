// ─────────────────────────────────────────────────────────────────────────────
// A MEDABRAIN PER STUDENT.
//
// ── What was wrong ───────────────────────────────────────────────────────────
// Every student got the same Medabrain. It knew their name, their pathway and
// their grade — and then it recommended screens they could not open, work they
// had already done, and next steps that were right for a generic eleventh
// grader and wrong for this one. The single most common way it broke trust was
// the smallest: a freshman asks what to do next, Medabrain says "open your
// recommender tracker and start listing teachers", the freshman opens the
// Portfolio and there is no recommender tracker, because the unlock ladder has
// not put it there yet. The coach was confidently describing an app the student
// was not using.
//
// The fix is not a bigger prompt. It is telling the model the two things it was
// never told: WHAT IS ACTUALLY OPEN TO THIS PERSON RIGHT NOW, and WHAT THE APP
// ITSELF HAS ALREADY DECIDED they should do — which the app knows locally, for
// free, before any model is involved (see decisionEngine.js).
//
// ── Three properties ─────────────────────────────────────────────────────────
//
// 1. IT IS SHORT. Every character here is paid for on every turn, by every
//    student, all day. The whole block is capped (see MAX_CHARS) and it drops
//    the least decision-relevant parts first rather than truncating mid-list.
//    A per-student block that doubles the prompt is a per-student block that
//    doubles the bill.
//
// 2. IT NEVER SENDS A STUDENT TO A CLOSED DOOR. The open list and the closed
//    list are both stated, and the closed one carries the exact sentence that
//    opens each item — so "how do I get the recommender tracker" has a true
//    answer instead of a hallucinated one, and the coach can do the thing the
//    product actually wants, which is to name the next unlock as a goal.
//
// 3. IT DEFERS TO THE LOCAL DECISION. When the rules engine has already picked
//    a lead action, the model is told what it is and told not to contradict it
//    without saying why. Two systems recommending two different "most important
//    things" is the disorientation this whole body of work exists to remove.
//
// Pure string building. No React, no network, no storage.
// ─────────────────────────────────────────────────────────────────────────────

/** Hard ceiling on the whole block, in characters. See property 1. */
export const MAX_CHARS = 1400;

/**
 * The student-facing name of every destination this block can mention. Passed
 * in by the caller (App.jsx already builds UNLOCK_LABELS from the nav arrays)
 * so there is no second copy of the nav's own labels living here.
 */
function labelFor(id, labels) {
  return labels?.[id] || id;
}

/**
 * The "who is this and what can they see" block appended to every Medabrain
 * system prompt.
 *
 * @param {object} o
 * @param {object} o.user
 * @param {string|null} o.gradeStage   'freshman' … 'gap'
 * @param {object} o.unlocks           the unlockState() snapshot
 * @param {string[]} o.gatedIds        featureUnlock.GATED_IDS
 * @param {object} o.labels            id → student-facing label
 * @param {object|null} o.lead         decisionEngine.leadDecision() result
 * @param {object|null} o.firstRun     firstRun.firstRunPlan() result
 * @param {object|null} o.streakState  `{ streak, creditsToday, goalCredits }`
 * @returns {string} '' when there is genuinely nothing personal to say
 */
export function buildAvailabilityBlock({
  user = null, gradeStage = null, unlocks = null, gatedIds = [], labels = {},
  lead = null, firstRun = null, streakState = null,
} = {}) {
  if (!unlocks) return '';
  const parts = [];

  // ── 1. Where they are in the app's own ladder ─────────────────────────────
  const open = [];
  const closed = [];
  for (const id of gatedIds) {
    const [tab, rest] = id.split('/');
    const [view, section] = (rest || '').split(':');
    let isOpen = true;
    try { isOpen = !!unlocks.isOpen(tab, view || null, section || null); } catch { isOpen = true; }
    (isOpen ? open : closed).push(id);
  }

  if (closed.length) {
    // Only the nearest few, with their opening sentence. The full list is long
    // and the far end of it is not decision-relevant to this turn.
    const nearest = (typeof unlocks.locked === 'function' ? unlocks.locked() : [])
      .filter((r) => r?.hint)
      .slice(0, 4)
      .map((r) => `${r.label} (opens when: ${r.hint.replace(/\s+/g, ' ').trim()})`);
    if (nearest.length) {
      parts.push(
        `NOT OPEN TO THIS STUDENT YET, with the exact condition that opens each: ${nearest.join('; ')}. `
        + 'Never tell them to open one of these as if it were already there. If they ask about one, say plainly that it is not open yet and name the condition above — treat it as a goal worth working toward, not as a refusal.',
      );
    }
  }

  if (open.length) {
    const names = open.slice(0, 10).map((id) => labelFor(id, labels));
    parts.push(`Already open to them: ${names.join(', ')}.`);
  }

  // ── 2. Their year, stated as what it changes ──────────────────────────────
  if (gradeStage) {
    const line = {
      freshman: 'They are a freshman. They have four years of runway. Habits and exploration beat deadlines; do not manufacture urgency they do not have.',
      sophomore: 'They are a sophomore. This is the year the record starts being worth keeping — logged activities and hours matter more than applications do.',
      junior: 'They are a junior. This is the application-building year: the college list, the letters, the experiences and the essays are all live work right now.',
      senior: 'They are a senior. Deadlines outrank everything. Do not lead with lesson work unless they ask for it.',
      gap: 'They have already graduated high school. Frame everything around the applications and decisions still in front of them.',
    }[gradeStage];
    if (line) parts.push(line);
  }

  // ── 3. What the app has already decided ───────────────────────────────────
  // Property 3. Stated as a decision made by the product, with its evidence, so
  // the model can agree with it fluently or disagree with a reason.
  if (lead?.headline) {
    parts.push(
      `The app's own rules have already picked their most important next thing: "${lead.headline}" — because ${lowerFirst(lead.because)} `
      + 'Lead with that unless the student asks about something else. If you think something else matters more, say why you disagree rather than quietly substituting it.',
    );
  }

  // ── 4. The first week ─────────────────────────────────────────────────────
  if (firstRun?.isNew) {
    const step = firstRun.current;
    parts.push(
      `This account is BRAND NEW — ${firstRun.completed} of ${firstRun.total} setup steps done.`
      + (step ? ` Their current step is: ${step.title}.` : '')
      + ' Keep answers short, concrete and one-step-at-a-time. Do not describe features they have not reached yet, and do not list more than one thing to do.',
    );
  }

  // ── 5. The rhythm ─────────────────────────────────────────────────────────
  if (streakState && Number(streakState.streak) > 0) {
    const { streak, creditsToday = 0, goalCredits = 4 } = streakState;
    parts.push(
      creditsToday >= goalCredits
        ? `They have a ${streak}-day streak and have already cleared today.`
        : `They have a ${streak}-day streak and today is NOT cleared yet (${creditsToday} of ${goalCredits} credits). A day counts here when work is finished, never when the app is opened — say it that way if it comes up.`,
    );
  }

  // ── 6. What they told us they wanted ──────────────────────────────────────
  const focus = user?.orientation?.focus;
  if (focus) {
    const line = {
      explore: 'When asked, they said what would help most is figuring out which health career fits them.',
      study: 'When asked, they said what would help most is getting stronger in the science they are taking.',
      build: 'When asked, they said what would help most is starting to build their application.',
      apply: 'When asked, they said what would help most is their deadlines — they are applying this year.',
    }[focus];
    if (line) parts.push(line);
  }

  return fit(parts);
}

/**
 * Joins the parts and enforces MAX_CHARS by dropping whole trailing parts.
 *
 * Dropping from the end rather than truncating is the point: the parts are
 * written in decision-relevance order, and a block cut mid-sentence can leave
 * the model with half a condition ("opens when: Log 2 activities fir") which is
 * worse than not stating it.
 */
function fit(parts) {
  const kept = [];
  let len = 0;
  for (const p of parts) {
    if (!p) continue;
    if (len + p.length + 2 > MAX_CHARS) break;
    kept.push(p);
    len += p.length + 2;
  }
  return kept.length ? `\n\nABOUT THIS PARTICULAR STUDENT, RIGHT NOW:\n${kept.join('\n')}` : '';
}

const lowerFirst = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

/**
 * The whole personalization, as one memoizable key. App.jsx hands this to the
 * cache so a block that has not changed does not invalidate a cached response —
 * which is the difference between the availability block saving money and
 * costing it.
 */
export function availabilityKey({ gradeStage, unlocks, lead, firstRun, streakState } = {}) {
  return [
    gradeStage || '-',
    (unlocks?.earned || []).length,
    lead?.id || '-',
    firstRun?.isNew ? `new:${firstRun.completed}` : '-',
    streakState ? `${streakState.streak}:${Number(streakState.creditsToday) >= Number(streakState.goalCredits) ? 1 : 0}` : '-',
  ].join('|');
}

// ── The current student's block, as a module-level register ──────────────────
//
// Same pattern, and the same justification, as `currentLane` in src/lib/aiLane.js:
// one browser tab is one signed-in student, there is no multi-tenant path
// through this code, and the alternative is threading an unlock snapshot through
// every component that happens to contain a Medabrain box.
//
// It exists because the personalization has to reach the surfaces that call
// /api/groq directly — the Prep and Portfolio chat panels — and those are
// mounted far from where the unlock state is computed. App.jsx sets this
// whenever the block changes, and again to '' on sign-out.
let currentAbout = '';

/** Publish the block every Medabrain request should carry. */
export function setAboutBlock(text) {
  currentAbout = typeof text === 'string' ? text : '';
}

/** The block, or '' when we have nothing personal to say. Safe to concatenate. */
export function aboutBlock() {
  return currentAbout;
}
