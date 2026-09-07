// ─────────────────────────────────────────────────────────────────────────────
// How a roadmap card, an opportunity, or a service entry reaches Medabrain.
//
// ── The rule this file enforces ─────────────────────────────────────────────
// NEVER SEND THE WHOLE HISTORY. A student pressing "Ask Medabrain" on one card
// is asking about ONE THING, and the useful context for that is: what the card
// is, why the plan put it there, what state it is in, and the handful of facts
// about them that bear on it. Their eleven other actions, their full transcript
// and every note they have ever typed are not context, they are noise with a
// token cost — and the specialist prompt they land in
// (buildPortfolioSystemPrompt) already carries the portfolio digest.
//
// So every builder here returns a SMALL, PRE-RENDERED block plus an opening
// question, exactly the convention buildStudentIntelBlock() established. The
// retrieval is selective by construction: the focus block names the item, and
// the surrounding prompt supplies the rest from data the panel already holds.
//
// ── Where it goes ───────────────────────────────────────────────────────────
// askMedabrainAbout() (src/lib/medabrainFocus.js) carries one of these to the
// Portfolio Medabrain panel, which opens with the question prefilled and the
// focus block appended to its system prompt for that conversation.
// ─────────────────────────────────────────────────────────────────────────────
import { dayKey, daysBetween } from '../timeline.js';
import { allActions, rankedActions, planStats, currentWeek, OPEN_ACTION_STATES } from './model.js';

const trunc = (s, n = 240) => {
  const t = String(s ?? '').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

/** State → the sentence Medabrain is told about it, in the student's favor. */
const STATE_NOTE = {
  not_started: 'They have not started it yet.',
  in_progress: 'They have started it.',
  complete: 'They have finished it — this is a follow-up, not a nudge.',
  paused: 'They paused it deliberately. Do not treat that as failure or push them to un-pause it.',
  declined: 'They declined it. Do not sell it back to them; help with what they would rather do.',
  not_interested: 'They said they are not interested. Respect that and move to what they would find worth doing.',
  too_difficult: 'They found it too hard. Offer a genuinely smaller first step, not encouragement.',
  too_expensive: 'Cost is the blocker. Prioritize free, funded and fee-waived alternatives.',
  too_far_away: 'Distance is the blocker. Prioritize local chapters and remote options.',
  no_longer_eligible: 'They are no longer eligible. Help them replace it rather than mourn it.',
  needs_help: 'They explicitly asked for help with this. Be concrete and start with the first step.',
};

/**
 * The focus block for ONE month-plan action.
 *
 * @returns {{ kind, ref, label, question, block }}
 */
export function contextForAction(plan, action, { today = dayKey() } = {}) {
  if (!action) return null;
  const due = action.timing?.dueDate;
  const daysOut = due ? daysBetween(today, due) : null;
  const dateLine = due
    ? (action.timing.precision === 'exact'
      ? `Due ${due} (${daysOut} day${daysOut === 1 ? '' : 's'} out) — a confirmed date.`
      : `Around ${due} (${daysOut} day${daysOut === 1 ? '' : 's'} out) — a TYPICAL date from our catalog, NOT confirmed. If you cite it, say so and tell them to check the official page.`)
    : `No fixed date — the plan has it as "${action.timing?.dueLabel || 'this month'}".`;

  const bits = [
    `THE THING THEY ARE ASKING ABOUT: "${action.title}" (${action.domain}).`,
    `Why their plan put it there: ${trunc(action.reason, 300)}`,
    action.whyThisMatters ? `Why it matters: ${trunc(action.whyThisMatters, 300)}` : null,
    dateLine,
    `Effort the plan estimated: ${action.effortLabel || `${action.effortHours}h`}. Priority: ${action.priority}.`,
    `Definition of done: ${trunc(action.definitionOfDone, 240)}`,
    action.evidenceToLog ? `What they should log when it is done: ${trunc(action.evidenceToLog, 200)}` : null,
    action.link?.label ? `It is linked to: ${action.link.label}${action.link.url ? ` (${action.link.url})` : ''}${action.link.verified ? ` — our catalog last checked this ${action.link.verified}.` : ''}` : null,
    `Current state: ${String(action.status || 'not_started').replace(/_/g, ' ')}. ${STATE_NOTE[action.status] || ''}`,
    action.statusNote ? `In their own words about it: "${trunc(action.statusNote, 200)}"` : null,
    action.steps?.length ? `Steps the plan already listed: ${action.steps.map((s, i) => `${i + 1}. ${s}`).join(' ')}` : null,
  ].filter(Boolean);

  return {
    kind: 'month-action',
    ref: action.id,
    label: action.title,
    question: action.metabrain || `Help me with this: ${action.title}.`,
    block: `\n\n── What they are looking at right now ──\n${bits.join('\n')}\nAnswer about THIS item first. Do not restate their whole plan back at them, and do not invent a deadline, a program or a fact about them that is not above.`,
  };
}

/** The focus block for ONE opportunity from the opportunity plan. */
export function contextForOpportunity(entry, { today = dayKey() } = {}) {
  if (!entry) return null;
  const d = entry.deadline;
  const dateLine = !d
    ? 'No deadline information in our catalog for this one.'
    : d.passedThisCycle
      ? `This cycle's deadline has ALREADY PASSED (${d.label}). It is CLOSED right now — never describe it as open. Talk about being ready for the next cycle.`
      : d.precision === 'exact'
        ? `Deadline ${d.label}${d.daysOut != null ? ` — ${d.daysOut} days out` : ''}. Published and stable.`
        : `Deadline ${d.label}${d.daysOut != null ? ` — about ${d.daysOut} days out` : ''}. This is APPROXIMATE, not confirmed — say so and send them to the official page.`;

  const bits = [
    `THE OPPORTUNITY THEY ARE ASKING ABOUT: ${entry.name}${entry.org ? ` (${entry.org})` : ''}.`,
    entry.why ? `Why our catalog rates it: ${trunc(entry.why, 300)}` : null,
    dateLine,
    entry.verifiedLabel ? `Our catalog last checked the official page: ${entry.verifiedLabel}.` : null,
    entry.costLabel ? `Cost: ${entry.costLabel}.` : null,
    entry.remote === true ? 'It can be done remotely.' : entry.remote === false ? 'It requires being there in person.' : null,
    entry.selectivity ? `Selectivity: ${entry.selectivity}.` : null,
    entry.instruction ? `What their plan told them to do about it: ${entry.instruction}` : null,
    entry.url ? `Official page: ${entry.url}` : null,
  ].filter(Boolean);

  return {
    kind: 'opportunity',
    ref: entry.ref || `program:${entry.id}`,
    label: entry.name,
    question: `Tell me whether ${entry.name} is worth going for, given my record — and what a strong application to it actually looks like.`,
    block: `\n\n── The opportunity they are looking at ──\n${bits.join('\n')}\nAnswer about THIS program. Never state a deadline more confidently than the line above does, and never say a closed program is open.`,
  };
}

/** The focus block for the service dashboard. */
export function contextForService(servicePlan) {
  if (!servicePlan) return null;
  const bits = [
    `THEY ARE ASKING ABOUT THEIR SERVICE RECORD. Every hour here is SELF-REPORTED by them and has never been externally verified — say "logged" or "self-reported", never "verified".`,
    `${servicePlan.total} logged hours${servicePlan.monthlyRate ? ` at about ${servicePlan.monthlyRate}h a month` : ''}${servicePlan.projectedTotal ? `, projecting to roughly ${servicePlan.projectedTotal} by application season` : ''}.`,
    servicePlan.targetHours ? `Planning reference in use: about ${servicePlan.targetHours} cumulative hours (${servicePlan.benchmarkLabel || 'planning tier'}). ${servicePlan.frameNote || ''}` : null,
    servicePlan.topCause ? `Most of it is in ${servicePlan.topCause}${servicePlan.concentrated ? ' — a real specialization worth naming' : ''}.` : null,
    servicePlan.consistency ? `Active in ${servicePlan.consistency.activeWeeks} of about ${servicePlan.consistency.totalWeeks} weeks since their first entry.` : null,
    servicePlan.preferImpactOverHours ? 'Their pace makes the higher hour target unrealistic, so the honest recommendation is a deeper, higher-impact path in one cause rather than chasing the number.' : null,
    servicePlan.flags?.length ? `Entries worth gently clarifying: ${servicePlan.flags.map((f) => f.label).join('; ')}. Ask about these kindly and never imply dishonesty.` : null,
  ].filter(Boolean);
  return {
    kind: 'service',
    ref: 'service',
    label: 'Service record',
    question: 'Look at my service record and tell me honestly where it is strong, where it is thin, and what I should do next.',
    block: `\n\n── Their service record ──\n${bits.join('\n')}`,
  };
}

/** The focus block for the leadership path. */
export function contextForLeadership(leadershipPath) {
  if (!leadershipPath) return null;
  const bits = [
    'THEY ARE ASKING ABOUT LEADERSHIP.',
    leadershipPath.top ? `Their strongest position: ${leadershipPath.top.name}${leadershipPath.top.org ? ` at ${leadershipPath.top.org}` : ''}, currently at the "${leadershipPath.top.stage}" rung.` : 'No leadership recorded anywhere yet.',
    leadershipPath.nextRung ? `The next rung the plan is pointing at: ${leadershipPath.nextRung.label} — ${leadershipPath.nextRung.detail}` : null,
    leadershipPath.secondCandidate ? `A credible second place to earn responsibility: ${leadershipPath.secondCandidate.name}.` : null,
    leadershipPath.foundingCredible
      ? 'They have run something to completion, so founding a chapter or initiative is worth SCOPING with them — but only where there is a real gap, an authentic fit and a realistic way for them to run it.'
      : 'Founding something is NOT the right advice for them yet — they have not yet owned a project inside an existing organization. Point them at that rung instead.',
    'Leadership means responsibility somebody depended on, never a title collected. Do not congratulate a title with nothing behind it.',
  ].filter(Boolean);
  return {
    kind: 'leadership',
    ref: 'leadership',
    label: 'Leadership path',
    question: 'What is the realistic next step for me on leadership, and how do I actually ask for it?',
    block: `\n\n── Their leadership position ──\n${bits.join('\n')}`,
  };
}

/**
 * The compact whole-plan digest for a chat that is not about one card.
 *
 * Mirrors summarizeRoadmapForPrompt() in roadmap/model.js, including its
 * explicit instruction about which dates may be stated flatly — the coach is
 * the surface most likely to repeat a date without its caveat.
 */
export function summarizeMonthPlanForPrompt(plan, { limit = 6, today = dayKey() } = {}) {
  if (!plan?.actions?.length) return null;
  const stats = planStats(plan, today);
  const week = currentWeek(plan, today);
  const top = rankedActions(plan).slice(0, limit);
  if (!top.length) return null;
  const lines = top.map((a) => {
    const due = a.timing?.dueDate;
    const when = due ? `${due} (${daysBetween(today, due)}d)` : (a.timing?.dueLabel || 'this month');
    const prov = !due ? '' : a.timing.precision === 'exact' ? ' [confirmed date]' : ' [typical date, not confirmed]';
    return `- [${a.priority}] ${a.title} — ${when}${prov} — ${a.status.replace(/_/g, ' ')}`;
  });
  const refused = (plan.actions || []).filter((a) => ['declined', 'not_interested', 'too_difficult', 'too_expensive', 'too_far_away'].includes(a.status));
  return `THEIR CURRENT MONTH PLAN (${plan.cycleStart} to ${plan.cycleEnd}; ${stats.complete}/${stats.total} done, ${stats.plannedHours}h of work planned against about ${plan.capacityHours}h of capacity).
This month is about: ${plan.objective?.headline || '—'}${plan.objective?.body ? ` — ${trunc(plan.objective.body, 200)}` : ''}
Right now they are in ${week?.label || 'week 1'}${week?.theme ? ` (${week.theme})` : ''}.
Top of the list:
${lines.join('\n')}
${refused.length ? `They have already said no to: ${refused.map((a) => `"${a.title}" (${a.status.replace(/_/g, ' ')})`).join('; ')}. Never re-suggest these.\n` : ''}Dates marked [typical date] are normal-year dates from our catalog, NOT confirmed — if you cite one, say so and tell them to check the official site. Never invent an action that is not on this list.`;
}

/** Actions currently flagged as needing help — what a proactive coach opens with. */
export function actionsNeedingHelp(plan) {
  return allActions(plan).filter((a) => a.status === 'needs_help');
}

/** Everything still open, for a "what should I do right now" answer. */
export function openActionTitles(plan) {
  return allActions(plan).filter((a) => OPEN_ACTION_STATES.has(a.status)).map((a) => a.title);
}
