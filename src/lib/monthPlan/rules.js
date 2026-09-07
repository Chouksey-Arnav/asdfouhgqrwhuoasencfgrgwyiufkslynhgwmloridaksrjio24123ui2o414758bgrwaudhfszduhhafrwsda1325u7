// ─────────────────────────────────────────────────────────────────────────────
// The rules that turn a read of a student (signals.js) into candidate actions.
//
// ── Why deterministic rules and not a prompt ────────────────────────────────
// The same reason the twelve-month roadmap hands the model a shortlist instead
// of asking it for deadlines: an action a student cannot trace back to a fact
// about themselves is an action they will not do, and a model asked to invent
// twenty of them will invent twenty plausible ones. Every action in a month
// plan is produced HERE, by a named rule, from a number in the signals object.
// The model's job (generator.js) is to choose the month's thesis and sharpen
// the language — never to add an item, never to supply a date.
//
// ── The shape of a rule ─────────────────────────────────────────────────────
//   { id, domain, weight, build(signals) -> action[] | null }
// `weight` is the base score; the ranker adjusts it for urgency, constraints,
// wellbeing and the student's own recorded feedback. A rule that does not apply
// returns null, and that is the ONLY way an action is omitted — there is no
// silent filtering downstream, so "why is this not on my plan" is always
// answerable by reading one function.
//
// ── The constraints every rule is required to honor ────────────────────────
//   • Never recommend adding an activity to reach a number.
//   • Never promise an admissions outcome (model.js scrubs, this file avoids).
//   • Never present a closed opportunity as open.
//   • When academics, testing or wellbeing is slipping, recommend REDUCING
//     before adding — enforced structurally by the ranker's `strainedMode`.
//   • Service hours are self-reported, always described as such.
//   • Test prep is directed outward: we set the target and the next action,
//     we do not pretend to tutor.
// ─────────────────────────────────────────────────────────────────────────────
import { shiftDays, daysBetween } from '../timeline.js';
import { LEADERSHIP_LADDER } from './signals.js';
import { CYCLE_WEEKS } from './model.js';

/** Effort, in hours, as a small vocabulary the UI can render as a chip. */
/**
 * Effort, in hours, as a small vocabulary the UI renders as a chip.
 *
 * These are INCREMENTAL hours — the time an action asks for ON TOP of what the
 * student already spends. "Deepen your strongest activity" is `sustained`, and
 * that is two hours a week of new effort inside a commitment that already takes
 * eight; charging the budget for all ten would price a student out of their own
 * plan and is the arithmetic that made the first version of this schedule two
 * items long.
 */
export const EFFORT = {
  quick: { hours: 0.5, label: 'About 30 minutes' },
  short: { hours: 1.5, label: '1-2 hours' },
  medium: { hours: 4, label: 'Half a day, spread out' },
  deep: { hours: 6, label: 'Several sessions this month' },
  sustained: { hours: 8, label: 'A couple of hours a week, all month' },
};

let seq = 0;
const mkId = (ruleId, key = '') => `${ruleId}${key ? `-${String(key).slice(0, 24)}` : ''}-${(seq += 1).toString(36)}`;

/** Reset the id counter so a fixture-driven test gets stable-shaped ids. */
export function resetActionIds() { seq = 0; }

/**
 * Build one candidate action. Every field the UI and the student need is
 * required at construction, because an action missing its definition of done is
 * an action that generates an argument later about whether it was finished.
 */
function action({
  ruleId, key = '', domain, title, reason, whyThisMatters = '',
  dueDate = null, dueLabel = 'This month', origin = 'cycle', precision = 'flexible',
  effort = 'short', priority = 'standard', weight = 50,
  definitionOfDone, evidenceToLog, link = null, steps = [], metabrain = null, weekHint = null,
}) {
  const e = EFFORT[effort] || EFFORT.short;
  return {
    id: mkId(ruleId, key),
    domain,
    title,
    reason,
    whyThisMatters,
    timing: { dueDate, dueLabel, origin, precision },
    effortHours: e.hours,
    effortLabel: e.label,
    priority,
    weight,
    rank: 999,
    definitionOfDone,
    evidenceToLog,
    link,
    steps,
    doneSteps: [],
    status: 'not_started',
    statusNote: '',
    statusAt: null,
    weekIndex: weekHint,
    progress: { startedAt: null, completedAt: null },
    source: `rule:${ruleId}`,
    // The question the "Ask Medabrain" button on this card opens with. Written
    // per-action rather than generated, so the coach starts from the same framing
    // the card used instead of re-deriving one. See monthPlan/context.js.
    metabrain: metabrain || `Help me with this: ${title}. Break it into steps I can actually do this week.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The rules.
// ─────────────────────────────────────────────────────────────────────────────

const RULES = [
  // ── Deadlines the student already owns ────────────────────────────────────
  {
    id: 'deadline-imminent', domain: 'application', weight: 98,
    build: (s) => s.deadlines.upcoming
      .filter((d) => d.daysOut <= 30)
      .slice(0, 4)
      .map((d) => action({
        ruleId: 'deadline-imminent', key: d.ref, domain: d.kind === 'aid' ? 'application' : 'application',
        title: `Finish: ${d.title}`,
        reason: `It is due in ${d.daysOut} day${d.daysOut === 1 ? '' : 's'}, and it is a date you entered yourself.`,
        whyThisMatters: 'A deadline you already logged is the one kind of item where there is no judgment call to make. It happens or it does not.',
        dueDate: d.date, dueLabel: 'Your own date', origin: 'student', precision: 'exact',
        effort: d.daysOut <= 7 ? 'medium' : 'short',
        priority: d.daysOut <= 10 ? 'critical' : 'high',
        weight: 98 - d.daysOut,
        definitionOfDone: 'Submitted, or explicitly decided against and marked so it stops appearing.',
        evidenceToLog: 'Confirmation number, screenshot, or the date you submitted.',
        link: { kind: 'deadline', ref: d.ref, label: d.title, url: null },
        metabrain: `I have "${d.title}" due in ${d.daysOut} days. Help me work out what still has to happen and in what order.`,
      })),
  },
  {
    id: 'deadline-missed', domain: 'application', weight: 92,
    build: (s) => (s.deadlines.missed.length
      ? [action({
        ruleId: 'deadline-missed', domain: 'application',
        title: `Triage the ${s.deadlines.missed.length} deadline${s.deadlines.missed.length === 1 ? '' : 's'} that have passed`,
        reason: 'Some of these have a late window, some run again next cycle, and some are worth writing off — but all of them are currently sitting on your list pretending to be live.',
        whyThisMatters: 'A list you have stopped believing is a list you stop reading. Clearing the dead entries is what makes the live ones mean something again.',
        dueLabel: 'This week', origin: 'cycle', effort: 'short', priority: 'high', weight: 92,
        definitionOfDone: 'Every passed deadline is either re-dated for its next cycle, marked done, or removed.',
        evidenceToLog: 'Nothing to log — this one is housekeeping.',
        metabrain: 'These deadlines on my list have already passed. Help me decide which are worth chasing late, which come round again, and which to drop.',
      })]
      : null),
  },

  // ── Academics ─────────────────────────────────────────────────────────────
  {
    id: 'academics-protect', domain: 'academics', weight: 96,
    build: (s) => (s.academics.falling
      ? [action({
        ruleId: 'academics-protect', domain: 'academics',
        title: 'Put your grades back at the front of the month',
        reason: `Your logged GPA has moved from ${s.academics.first?.gpa} to ${s.academics.latestGpa}. Nothing else in this plan outranks that.`,
        whyThisMatters: 'A downward transcript reads worse to an admissions officer than a flat lower one, because it is the one thing on the application that predicts next year. It is also the most fixable thing on this page.',
        dueLabel: 'All month', origin: 'cycle', effort: 'sustained', priority: 'critical', weight: 99,
        definitionOfDone: 'You have named the two classes that slipped, spoken to those teachers, and blocked recurring study time for them in your actual week.',
        evidenceToLog: 'Your next grade update, logged in Academic History.',
        steps: [
          'Name the two classes that actually slipped — not the ones that feel worst.',
          'Email or catch each teacher: what would move this grade in four weeks?',
          'Block the time in your real calendar before you commit to anything else this month.',
          'Take one commitment off your plate to pay for it.',
        ],
        metabrain: 'My GPA is trending down. Help me work out what to cut this month so the time actually exists, and what to say to my teachers.',
      })]
      : null),
  },
  {
    id: 'academics-log', domain: 'academics', weight: 62,
    build: (s) => (!s.academics.hasData
      ? [action({
        ruleId: 'academics-log', domain: 'academics',
        title: 'Log your GPA and current courses',
        reason: 'It is the single most decision-relevant number about your application, and right now nothing in this app knows it.',
        whyThisMatters: 'Every college-fit judgment, every "am I on track", and every honest answer Medabrain can give you starts here. Without it, advice is generic by construction.',
        dueLabel: 'Week 1', origin: 'cycle', effort: 'quick', priority: 'high', weight: 78, weekHint: 0,
        definitionOfDone: 'At least your most recent term GPA is entered, with whether it is weighted, plus your current course list.',
        evidenceToLog: 'The term, the GPA, and the rigor of the courses behind it.',
        metabrain: 'Where do I enter my GPA and course rigor, and what does the app do with it once I have?',
      })]
      : null),
  },
  {
    id: 'academics-rigor', domain: 'academics', weight: 55,
    build: (s) => (s.academics.hasData && !s.academics.hasRigorNote && s.academics.offersRigor
      ? [action({
        ruleId: 'academics-rigor', domain: 'academics',
        title: 'Record the rigor behind your grades',
        reason: 'Your school offers advanced coursework and none of your logged terms says which courses your GPA came from.',
        whyThisMatters: 'A 3.7 from the hardest schedule available and a 3.7 from the easiest are different applications. Readers weigh rigor before they weigh the number, and right now yours is invisible.',
        dueLabel: 'Week 1', origin: 'cycle', effort: 'quick', priority: 'standard', weight: 55, weekHint: 0,
        definitionOfDone: 'Every logged term has its course rigor filled in.',
        evidenceToLog: 'Course names and levels per term.',
        metabrain: 'How much does course rigor actually matter next to GPA, and what should I be taking next year given my school?',
      })]
      : null),
  },

  // ── Testing ───────────────────────────────────────────────────────────────
  {
    id: 'testing-book', domain: 'testing', weight: 88,
    build: (s) => (s.testing.behind
      ? [action({
        ruleId: 'testing-book', domain: 'testing',
        title: 'Book an SAT or ACT date',
        reason: `You are in ${s.student.gradeLabel || 'high school'} and there is no sitting on record.`,
        whyThisMatters: 'The registration is what makes the preparation happen — a date on the calendar changes behavior in a way a resolution does not. This app is not a test-prep product; the target and the date are ours, the studying is yours and is best done with a dedicated resource.',
        dueLabel: 'Week 1', origin: 'cycle', effort: 'quick', priority: 'high', weight: 88, weekHint: 0,
        definitionOfDone: 'A registered, paid (or fee-waived) test date exists, and it is on your deadline list.',
        evidenceToLog: 'The test, the date, and your registration confirmation.',
        metabrain: 'Which test date makes sense for me given my grade and my college list, and what should I be doing between now and then?',
      })]
      : null),
  },
  {
    id: 'testing-target', domain: 'testing', weight: 70,
    build: (s) => {
      if (!s.testing.impliedSat || !s.testing.latestComposite) return null;
      const gap = s.testing.gap;
      if (gap == null || gap <= 0) return null;
      return [action({
        ruleId: 'testing-target', domain: 'testing',
        title: `Aim for about ${s.testing.impliedSat} and plan one retake`,
        reason: `Your most recent ${s.testing.latestType || 'score'} is ${s.testing.latestComposite}; the schools you have marked as dream or reach sit around ${s.testing.impliedSat}.`,
        whyThisMatters: 'A retake is normal and expected, and the gap here is the size that a focused block of outside preparation closes. We will hold you to the date and the target; the preparation itself belongs with a real test-prep resource.',
        dueLabel: 'This month', origin: 'cycle', effort: 'medium', priority: 'high', weight: 74,
        definitionOfDone: 'A retake date is booked and you have a named preparation resource you are actually using.',
        evidenceToLog: 'Your practice-test scores as you go, logged as test scores.',
        metabrain: `My last score was ${s.testing.latestComposite} and the schools on my list sit around ${s.testing.impliedSat}. Help me build a realistic plan for the gap.`,
      })];
    },
  },

  // ── Activities: keep, deepen, reduce, exit ────────────────────────────────
  {
    id: 'activity-deepen', domain: 'activity', weight: 84,
    build: (s) => s.activities.deepen.slice(0, 2).map((a) => action({
      ruleId: 'activity-deepen', key: a.id, domain: 'activity',
      title: `Take ${a.name} one level deeper`,
      reason: a.why,
      whyThisMatters: `${s.activities.guidance ? `${s.activities.guidance.label} rewards depth over breadth — ${s.activities.guidance.guidance} ` : ''}Depth is what turns a line on a list into something a reader remembers.`,
      dueLabel: 'All month', origin: 'cycle', effort: 'sustained', priority: 'high', weight: 84,
      definitionOfDone: 'One concrete thing exists that did not before: a project finished, a number you can quote, a responsibility that is now yours.',
      evidenceToLog: 'What you did, what changed because of it, and the number attached to it.',
      link: { kind: 'activity', ref: `activity:${a.id}`, label: a.name, url: null },
      steps: [
        'Decide the one outcome you want out of this by the end of the month.',
        'Ask whoever runs it for the responsibility that gets you there.',
        'Do the thing, and write down the number while you still know it.',
      ],
      metabrain: `I want to go deeper in ${a.name}${a.org ? ` at ${a.org}` : ''} rather than add anything new. What does a genuinely stronger version of this look like over one month?`,
    })),
  },
  {
    id: 'activity-reduce', domain: 'activity', weight: 76,
    build: (s) => {
      const cuts = [...s.activities.exit, ...s.activities.reduce].slice(0, 2);
      if (!cuts.length) return null;
      return [action({
        ruleId: 'activity-reduce', domain: 'activity',
        title: `Decide what comes off the list: ${cuts.map((c) => c.name).join(', ')}`,
        reason: `You are carrying ${s.activities.count} activities${s.activities.guidance ? ` and ${s.activities.guidance.label.toLowerCase()} usually rewards ${s.activities.guidance.min}-${s.activities.guidance.max}` : ''}. These are the ones taking hours your strongest commitments need.`,
        whyThisMatters: 'Nothing on this page asks you to add an activity to hit a number. This is the opposite move, and it is the one that actually creates the hours the rest of this plan assumes you have. Reducing is not quitting — scaling back to a sustainable level counts.',
        dueLabel: 'Week 1', origin: 'cycle', effort: 'short', priority: 'high', weight: 76, weekHint: 0,
        definitionOfDone: 'For each one: keep it as-is, scale it back to a specific smaller commitment, pause it for the term, or leave it — and you have told whoever needs to know.',
        evidenceToLog: 'Update the hours on the activity so your record reflects what is actually true.',
        link: cuts[0] ? { kind: 'activity', ref: `activity:${cuts[0].id}`, label: cuts[0].name, url: null } : null,
        metabrain: `I am carrying ${s.activities.count} activities and being told to narrow. Help me think through which to keep, which to scale back, and how to leave one without burning a bridge.`,
      })];
    },
  },
  {
    // Weighted above the opportunity rules on purpose. In ninth and tenth grade
    // the highest-return thing available is finding the commitment that turns
    // into three years of depth; a program deadline four months out is not more
    // important than that, and ranking it higher is how an early-grade plan ends
    // up looking like a senior's.
    id: 'activity-explore', domain: 'activity', weight: 76,
    build: (s) => {
      // The ONE case where adding is the right advice: a ninth or tenth grader
      // genuinely below the exploratory range. Framed as exploration, never as
      // a count to hit, and never offered above tenth grade.
      if (!s.activities.guidance || (s.student.gradeNumber || 0) > 10) return null;
      if (s.activities.underCount <= 0) return null;
      if (s.wellbeing.strained || s.academics.falling) return null;
      return [action({
        ruleId: 'activity-explore', domain: 'activity',
        title: 'Try one thing you might actually like',
        reason: `${s.activities.guidance.label} is for finding out what holds your interest, and you have ${s.activities.count} thing${s.activities.count === 1 ? '' : 's'} going.`,
        whyThisMatters: 'This is not about a number. It is that the commitments worth three years are the ones you found in ninth or tenth grade, and you only find them by trying things. Sports, music, a job, family responsibility, your religious or community life — all of it counts.',
        dueLabel: 'This month', origin: 'cycle', effort: 'medium', priority: 'standard', weight: 76,
        definitionOfDone: 'You have been to one meeting, practice, shift or session of something new.',
        evidenceToLog: 'Add it as an activity if you go back a second time.',
        metabrain: 'I am early in high school and want to try something new that could matter later. Given what you know about me, what is worth a look?',
      })];
    },
  },
  {
    id: 'activity-write-up', domain: 'portfolio', weight: 66,
    build: (s) => {
      const thin = s.activities.verdicts.filter((v) => v.undescribed || v.noImpact).slice(0, 3);
      if (thin.length < 2) return null;
      return [action({
        ruleId: 'activity-write-up', domain: 'portfolio',
        title: `Write the missing lines for ${thin.length} activities`,
        reason: `${thin.map((t) => t.name).join(', ')} have no real description or no impact line.`,
        whyThisMatters: 'The Common App gives you 150 characters per activity. The students who lose that fight are not the ones who did less — they are the ones who wrote it up two years later from memory, with no numbers left.',
        dueLabel: 'Week 2', origin: 'cycle', effort: 'short', priority: 'standard', weight: 66, weekHint: 1,
        definitionOfDone: 'Each one has a description that leads with a verb and an impact line containing at least one real number.',
        evidenceToLog: 'The description and impact text itself — that IS the evidence.',
        metabrain: 'Help me rewrite my activity descriptions so they lead with what I did rather than that I participated. I will paste them in.',
      })];
    },
  },

  // ── Leadership ────────────────────────────────────────────────────────────
  {
    id: 'leadership-next-rung', domain: 'leadership', weight: 82,
    build: (s) => {
      const top = s.leadership.top;
      if (!top) return null;
      const rung = top.nextRung;
      if (!rung || top.stage === 'principal') return null;
      return [action({
        ruleId: 'leadership-next-rung', key: top.id, domain: 'leadership',
        title: `${rung.label} in ${top.name}`,
        reason: `You are at "${LEADERSHIP_LADDER.find((r) => r.id === top.stage)?.label || 'showing up'}" here. The next rung is the one you have earned the right to ask for.`,
        whyThisMatters: 'Leadership that reads is real responsibility somebody depended on, not a title collected. The ladder is: turn up reliably, take a recurring responsibility, own a project, then an officer role — and each rung is what makes the next one credible.',
        dueLabel: 'This month', origin: 'cycle', effort: 'medium', priority: 'high', weight: 82,
        definitionOfDone: rung.detail,
        evidenceToLog: 'The role, when it started, and what it produced — logged as role history on the activity.',
        link: { kind: 'activity', ref: `activity:${top.id}`, label: top.name, url: null },
        steps: [
          'Work out who actually decides this — the adviser, the coach, the coordinator.',
          'Ask for the specific responsibility, not for "a leadership role".',
          'Agree what it means in hours, so it is real and so you can hold it.',
        ],
        metabrain: `I want to move from "${top.stage}" to "${rung.label}" in ${top.name}. Help me plan the conversation and what to volunteer for.`,
      })];
    },
  },
  {
    id: 'leadership-second', domain: 'leadership', weight: 64,
    build: (s) => {
      const second = s.leadership.secondCandidate;
      if (!second || s.wellbeing.strained || s.academics.falling) return null;
      if ((s.student.gradeNumber || 0) < 10) return null;
      return [action({
        ruleId: 'leadership-second', key: second.id, domain: 'leadership',
        title: `Start earning responsibility in ${second.name} too`,
        reason: `Your list is aimed at very selective schools, and you are already established in ${second.name}. Responsibility in a second place is a real differentiator where it is feasible.`,
        whyThisMatters: 'For the most selective outcomes, leadership across more than one commitment reads as someone people rely on rather than someone with one good year. This is only worth doing where you already show up consistently — never as a title hunt.',
        dueLabel: 'This month', origin: 'cycle', effort: 'medium', priority: 'standard', weight: 64,
        definitionOfDone: 'One recurring responsibility here is yours, agreed with whoever runs it.',
        evidenceToLog: 'The responsibility and when it started.',
        link: { kind: 'activity', ref: `activity:${second.id}`, label: second.name, url: null },
        metabrain: `Is taking on responsibility in ${second.name} as well as my main activity realistic for me, or am I about to overcommit? Be honest.`,
      })];
    },
  },
  {
    id: 'leadership-found', domain: 'leadership', weight: 60,
    build: (s) => {
      // Founding is recommended ONLY where the rung below is genuinely held.
      // A chapter founded by someone who has never run anything is a line on a
      // résumé and a burden on whoever inherits it.
      const candidate = s.leadership.perActivity.find((p) => p.foundingCredible);
      if (!candidate || s.wellbeing.strained) return null;
      if ((s.student.gradeNumber || 0) >= 12) return null;
      return [action({
        ruleId: 'leadership-found', key: candidate.id, domain: 'leadership',
        title: `Scope whether ${candidate.org || candidate.name} needs something that does not exist yet`,
        reason: `You have run a project inside ${candidate.name} and stayed with it ${candidate.years} year${candidate.years === 1 ? '' : 's'}. That is the point at which founding something is credible rather than decorative.`,
        whyThisMatters: 'A chapter, project or initiative is worth starting when there is a real gap, you genuinely fit it, and you can actually run it. If any of those three is missing, deepening what you already have is the stronger move and the honest one.',
        dueLabel: 'This month', origin: 'cycle', effort: 'medium', priority: 'standard', weight: 60,
        definitionOfDone: 'A written half-page: the gap, who it serves, who else is in, what it needs weekly, and an honest answer on whether it should exist.',
        evidenceToLog: 'The scoping note itself, plus anyone who agreed to be involved.',
        metabrain: `I am thinking about founding something connected to ${candidate.name}. Pressure-test it with me: is there a real need, do I fit it, and can I actually run it?`,
      })];
    },
  },

  // ── Service ───────────────────────────────────────────────────────────────
  {
    id: 'service-start', domain: 'service', weight: 68,
    build: (s) => (!s.service.hasAnyLog
      ? [action({
        ruleId: 'service-start', domain: 'service',
        title: 'Start logging your service hours',
        reason: 'Nothing is logged yet. If you already volunteer, the hours exist and the record does not — and the record is the part that is hard to reconstruct later.',
        whyThisMatters: `These hours are always self-reported, which is exactly why the description matters more than the number. As a long-term planning reference, roughly ${s.service.targetHours} cumulative hours by application season fits ambitions like yours — an adjustable reference, never a quota, and depth beats total every time.`,
        dueLabel: 'Week 1', origin: 'cycle', effort: 'quick', priority: 'standard', weight: 68, weekHint: 0,
        definitionOfDone: 'Your existing service is logged with organization, cause area, hours and one line on what you actually did.',
        evidenceToLog: 'Organization, dates, hours, and a sentence per entry.',
        metabrain: 'I want to start logging service properly. What should each entry include so it is useful later rather than just a number?',
      })]
      : null),
  },
  {
    id: 'service-pace', domain: 'service', weight: 72,
    build: (s) => {
      if (!s.service.hasAnyLog || s.service.onPace !== false) return null;
      if (s.service.preferImpactOverHours) {
        return [action({
          ruleId: 'service-pace', domain: 'service',
          title: 'Go deeper in one cause rather than chasing the hour count',
          reason: `You are at ${s.service.total} logged hours at about ${s.service.monthlyRate}h a month. Reaching ${s.service.targetHours} from here would mean the log becoming the point.`,
          whyThisMatters: 'A lower-hour, higher-impact path — sustained responsibility in one cause with something to show for it — is a completely legitimate profile and frequently reads stronger than a larger, thinner total. This is the honest recommendation for where you are, not a consolation.',
          dueLabel: 'All month', origin: 'cycle', effort: 'medium', priority: 'high', weight: 76,
          definitionOfDone: `One cause${s.service.topCause ? ` (probably ${s.service.topCause})` : ''} has your steady weekly time and one thing you can point at that would not exist otherwise.`,
          evidenceToLog: 'An impact note with a number on your service entries.',
          metabrain: 'I am not going to hit a big service-hour total. Help me build the deeper, higher-impact version instead, in one cause.',
        })];
      }
      return [action({
        ruleId: 'service-pace', domain: 'service',
        title: `Aim for about ${Math.max(2, Math.round(s.service.suggestedMonthlyHours || 8))} service hours this month`,
        reason: `You are at ${s.service.total} logged hours, moving at about ${s.service.monthlyRate}h a month, which projects to roughly ${s.service.projectedTotal} by application season against a ${s.service.targetHours}-hour planning reference.`,
        whyThisMatters: `${s.service.frameNote} Consistency is what the number is standing in for: showing up monthly for two years reads completely differently from the same total done in one summer.`,
        dueLabel: 'All month', origin: 'cycle', effort: 'medium', priority: 'standard', weight: 72,
        definitionOfDone: `Roughly ${Math.max(2, Math.round(s.service.suggestedMonthlyHours || 8))} hours logged this cycle, each with a line about what you did.`,
        evidenceToLog: 'Dates, hours, organization and one sentence each.',
        metabrain: 'Help me find a realistic way to fit regular service into my week without it wrecking my grades.',
      })];
    },
  },
  {
    id: 'service-consistency', domain: 'service', weight: 58,
    build: (s) => {
      if (!s.service.hasAnyLog) return null;
      const c = s.service.consistency;
      if (!c || c.totalWeeks < 8 || c.ratio >= 0.35) return null;
      return [action({
        ruleId: 'service-consistency', domain: 'service',
        title: 'Turn your service into something weekly',
        reason: `You have been active in ${c.activeWeeks} of the last ${c.totalWeeks} weeks. The total is fine; the pattern is what is thin.`,
        whyThisMatters: 'Duration and consistency are what readers actually weigh in this section. A standing weekly shift for a year is worth more than the same hours in bursts, and it is easier to sustain.',
        dueLabel: 'This month', origin: 'cycle', effort: 'short', priority: 'standard', weight: 58,
        definitionOfDone: 'One recurring slot exists — a day and a time — that you have committed to.',
        evidenceToLog: 'The recurring commitment, and the first two logged entries against it.',
        metabrain: 'Help me set up a service commitment I can genuinely keep every week during term time.',
      })];
    },
  },
  {
    id: 'service-clarify', domain: 'service', weight: 54,
    build: (s) => (s.service.flags.length
      ? [action({
        ruleId: 'service-clarify', domain: 'service',
        title: 'Tidy up a few service entries',
        reason: s.service.flags.map((f) => f.label).join('; ') + '.',
        whyThisMatters: 'Nothing here is being discounted and nothing is being judged — but service hours are self-reported, and an entry with a sentence beside it is evidence while an entry without one is a number. Correcting a typo now is much easier than defending a total later.',
        dueLabel: 'Week 2', origin: 'cycle', effort: 'quick', priority: 'standard', weight: 54, weekHint: 1,
        definitionOfDone: 'Every flagged entry has either a corrected number or a description that explains it.',
        evidenceToLog: 'The corrected entries.',
        metabrain: 'Some of my service entries look inconsistent. Help me work out what to correct and how to describe the unusual ones honestly.',
      })]
      : null),
  },
  {
    id: 'service-leadership', domain: 'service', weight: 62,
    build: (s) => {
      if (!s.service.hasAnyLog || s.service.total < 40) return null;
      const org = Object.entries(s.service.durationByOrg || {})
        .sort((a, b) => b[1].hours - a[1].hours)[0];
      if (!org || org[1].months < 4) return null;
      return [action({
        ruleId: 'service-leadership', key: org[0], domain: 'service',
        title: `Ask for a responsibility at ${org[0]}`,
        reason: `You have given ${Math.round(org[1].hours)} hours there across about ${org[1].months} months. Dependable involvement over that long is exactly what earns the next step.`,
        whyThisMatters: 'The service ladder is the same as any other: turn up reliably, take a recurring responsibility, own a program or project, then an officer or lead role — and president, founder or chapter lead only when the organization genuinely needs one and you have already done the rung below.',
        dueLabel: 'This month', origin: 'cycle', effort: 'short', priority: 'standard', weight: 62,
        definitionOfDone: 'One specific responsibility there is yours — training new volunteers, running the schedule, owning one program.',
        evidenceToLog: 'The role, the date it started, and what it covers.',
        metabrain: `I have volunteered at ${org[0]} for months. Help me ask for real responsibility there without it sounding like I want a title.`,
      })];
    },
  },

  // ── Opportunities — only ever from the existing opportunity system ────────
  {
    id: 'opportunity-act', domain: 'opportunity', weight: 90,
    build: (s) => s.opportunities.actNow.slice(0, 3).map((o) => action({
      ruleId: 'opportunity-act', key: o.id, domain: 'opportunity',
      title: `Apply: ${o.name}`,
      reason: `${o.deadline?.label || 'The deadline is close'} — ${o.deadline?.daysOut} day${o.deadline?.daysOut === 1 ? '' : 's'} out, and you are eligible.`,
      whyThisMatters: o.why || 'A real, dated opportunity you can act on inside this cycle.',
      dueDate: o.deadline?.iso || null,
      dueLabel: o.deadline?.label || 'Check the official page',
      origin: 'catalog',
      // 'exact' only where the catalog itself says the published date is exact.
      // Everything else renders as a window with the confirm-it-yourself line.
      precision: o.deadline?.precision === 'exact' ? 'exact' : 'typical',
      effort: o.selectivity === 'elite' ? 'deep' : 'medium',
      priority: (o.deadline?.daysOut ?? 99) <= 14 ? 'critical' : 'high',
      weight: 90 - (o.deadline?.daysOut ?? 30) / 2,
      definitionOfDone: 'Submitted — or you have read the real requirements and decided against it, which is also a finished decision.',
      evidenceToLog: 'What you submitted and when. If it places or is accepted, that is an award and a competition entry.',
      link: { kind: 'opportunity', ref: `program:${o.id}`, label: o.name, url: o.url, verified: o.verifiedLabel },
      metabrain: `Talk me through ${o.name}. What does a strong application actually look like, and is it realistic for me with ${o.deadline?.daysOut} days left?`,
    })),
  },
  {
    id: 'opportunity-prepare', domain: 'opportunity', weight: 74,
    build: (s) => s.opportunities.prepareNow.slice(0, 2).map((o) => action({
      ruleId: 'opportunity-prepare', key: o.id, domain: 'opportunity',
      title: `Start preparing for ${o.name}`,
      reason: `The deadline is ${o.deadline?.daysOut} days out, which sounds far away and is not — the work that makes this competitive starts now.`,
      whyThisMatters: `${o.why || ''} Students lose these on preparation time, not on ability. Starting in the cycle before the deadline is the whole difference.`,
      dueDate: o.deadline?.iso || null,
      dueLabel: o.deadline?.label || 'Check the official page',
      origin: 'catalog',
      precision: o.deadline?.precision === 'exact' ? 'exact' : 'typical',
      effort: 'medium', priority: 'standard', weight: 74,
      definitionOfDone: 'You have read the actual requirements, know what you would submit, and have done the first piece of it.',
      evidenceToLog: 'Drafts, project notes, or whoever agreed to write for you.',
      link: { kind: 'opportunity', ref: `program:${o.id}`, label: o.name, url: o.url, verified: o.verifiedLabel },
      metabrain: `${o.name} closes in about ${o.deadline?.daysOut} days. What should I have done by the end of this month to be genuinely competitive?`,
    })),
  },

  // ── College list ──────────────────────────────────────────────────────────
  {
    id: 'college-start-list', domain: 'application', weight: 80,
    build: (s) => (s.colleges.counts.total === 0
      ? [action({
        ruleId: 'college-start-list', domain: 'application',
        title: 'Put three colleges on your list',
        reason: 'Almost everything else here gets sharper once we know what you are aiming at — including which test score matters and which deadlines are real.',
        whyThisMatters: 'The list is meant to change. Three names now beats a perfect list in a year, because the plan can only back-plan from schools it knows about.',
        dueLabel: 'Week 1', origin: 'cycle', effort: 'short', priority: 'high', weight: 80, weekHint: 0,
        definitionOfDone: 'Three schools saved, each categorized as dream, reach, target or safety.',
        evidenceToLog: 'The schools themselves.',
        metabrain: 'Help me build a starting college list given my grades, interests and where I live. Explain the dream/reach/target/safety split as we go.',
      })]
      : null),
  },
  {
    id: 'college-safety', domain: 'application', weight: 70,
    build: (s) => (s.colleges.missingSafety
      ? [action({
        ruleId: 'college-safety', domain: 'application',
        title: 'Add two schools you would be happy to attend and would very likely get into',
        reason: `Your list is ${s.colleges.counts.dream} dream, ${s.colleges.counts.reach} reach, ${s.colleges.counts.target} target and no safety.`,
        whyThisMatters: 'This is the most common structural mistake strong students make, and the cost of it lands in one week next April. A safety you actually like is not a compromise — it is what lets you aim high without the year depending on it.',
        dueLabel: 'This month', origin: 'cycle', effort: 'short', priority: 'high', weight: 70,
        definitionOfDone: 'Two safety colleges on the list that you would genuinely be glad to attend.',
        evidenceToLog: 'The schools, with their deadlines entered.',
        metabrain: 'Help me find safety colleges I would actually be happy at, given my GPA, scores and what I want to study.',
      })]
      : null),
  },
  {
    id: 'college-dream-work', domain: 'application', weight: 78,
    build: (s) => {
      const focus = s.colleges.focusSchools;
      if (!focus.length) return null;
      const names = focus.map((f) => f.name).slice(0, 3).join(', ');
      return [action({
        ruleId: 'college-dream-work', domain: 'application',
        title: `Do one real piece of work aimed at ${names}`,
        reason: `${s.colleges.dream.length ? 'These are the schools you marked as dream or reach' : `Nothing is marked as a dream school, so we are treating ${focus[0].name} as the hardest thing on your list`}.`,
        whyThisMatters: 'The most selective schools on a list deserve disproportionate, specific effort — not more anxiety. Something concrete this month: their actual requirements, one supplement prompt read properly, one program on campus you can name and say why. Nothing about this guarantees an outcome; it changes what you have to show.',
        dueLabel: 'This month', origin: 'cycle', effort: 'medium', priority: 'high', weight: 78,
        definitionOfDone: `You can say, in your own words, what ${focus[0].name} asks for that the others do not, and one thing in your record that speaks to it.`,
        evidenceToLog: 'Notes on the school, plus any deadline you found and entered.',
        link: { kind: 'college', ref: `college:${focus[0].id}`, label: focus[0].name, url: null },
        metabrain: `${names} are the hardest schools on my list. Given my actual record, what would make the strongest difference over the next month — and be honest about what my profile is missing.`,
      })];
    },
  },
  {
    id: 'college-essays-senior', domain: 'application', weight: 94,
    build: (s) => {
      if ((s.student.gradeNumber || 0) < 12 && s.student.gradeStage !== 'gap') return null;
      if (!s.colleges.counts.total) return null;
      return [action({
        ruleId: 'college-essays-senior', domain: 'application',
        title: s.portfolio.essayCount ? 'Get your personal statement to a real draft' : 'Start your personal statement',
        reason: s.portfolio.essayCount
          ? `${s.portfolio.essayCount} draft${s.portfolio.essayCount === 1 ? '' : 's'} tracked, and applications are the closest thing on your calendar.`
          : 'Nothing is drafted yet, and this is senior year.',
        whyThisMatters: 'The essay is the one part of the application still fully in your control this year. It is also the part that takes four drafts, which is why the month it gets started decides how good it ends up.',
        dueLabel: 'All month', origin: 'cycle', effort: 'deep', priority: 'critical', weight: 96,
        definitionOfDone: 'A complete draft exists, start to finish, that someone else has read.',
        evidenceToLog: 'The draft, saved with a version so you can see it improve.',
        metabrain: 'Help me pressure-test my personal statement idea and find the moment that actually carries it. I will do the writing.',
      })];
    },
  },

  // ── Portfolio evidence ────────────────────────────────────────────────────
  {
    id: 'portfolio-evidence', domain: 'portfolio', weight: 52,
    build: (s) => {
      if (s.portfolio.serviceMissingEvidence < 3) return null;
      return [action({
        ruleId: 'portfolio-evidence', domain: 'portfolio',
        title: `Add a line of detail to ${s.portfolio.serviceMissingEvidence} service entries`,
        reason: 'They have hours but nothing describing what you did.',
        whyThisMatters: 'These hours are self-reported, so the description is what turns them into evidence. It also takes about twenty seconds an entry now and is nearly impossible in two years.',
        dueLabel: 'Week 3', origin: 'cycle', effort: 'quick', priority: 'optional', weight: 52, weekHint: 2,
        definitionOfDone: 'Every entry has a sentence, and the memorable ones have an impact note with a number.',
        evidenceToLog: 'The descriptions themselves.',
        metabrain: 'Help me write short, honest descriptions for my service entries. I will tell you what I actually did.',
      })];
    },
  },

  // ── Wellbeing ─────────────────────────────────────────────────────────────
  {
    id: 'wellbeing-protect', domain: 'wellbeing', weight: 86,
    build: (s) => (s.wellbeing.strained
      ? [action({
        ruleId: 'wellbeing-protect', domain: 'wellbeing',
        title: 'Take one thing off before you add anything',
        reason: 'Your own most recent check-in says the load is heavy, so this month is deliberately shorter than it would otherwise be.',
        whyThisMatters: 'A plan that ignores what you just told us is a plan you stop opening. Reducing a lower-value commitment is the correct first move when academics, testing or energy is slipping — and pausing anything here costs you nothing and is remembered.',
        dueLabel: 'Week 1', origin: 'cycle', effort: 'quick', priority: 'critical', weight: 95, weekHint: 0,
        definitionOfDone: 'One commitment is paused, reduced or ended, and the hours it used are actually free.',
        evidenceToLog: 'Nothing to log. This one is for you.',
        metabrain: 'I am stretched too thin. Help me work out what to drop first, given what actually matters for my goals.',
      })]
      : null),
  },

  // ── Check-in ──────────────────────────────────────────────────────────────
  {
    id: 'checkin-weekly', domain: 'portfolio', weight: 48,
    build: (s) => (s.checkin.due
      ? [action({
        ruleId: 'checkin-weekly', domain: 'portfolio',
        title: 'Do this week\'s check-in',
        reason: 'It is what re-ranks everything else on this page. Thirty seconds, in-app only, never emailed or pushed.',
        whyThisMatters: 'The plan adapts to what you tell it. New grades, a finished action, a change of heart about a program — all of it moves what shows up next week.',
        dueLabel: 'This week', origin: 'cycle', effort: 'quick', priority: 'standard', weight: 48,
        definitionOfDone: 'A check-in is submitted, however short.',
        evidenceToLog: 'Nothing — the check-in is the record.',
        metabrain: 'I want to talk through how the last couple of weeks actually went before I write my check-in.',
      })]
      : null),
  },
];

export const RULE_IDS = RULES.map((r) => r.id);

// ─────────────────────────────────────────────────────────────────────────────
// Ranking and scheduling.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How many hours this cycle can honestly hold.
 *
 * Their stated weekly hours where we have them, a conservative default where we
 * do not, and a hard reduction when the student has said they are stretched or
 * their grades are falling. This is the mechanism that makes "recommend
 * reducing before adding" structural rather than aspirational: when the budget
 * shrinks, the low-weight additive actions fall off the plan by arithmetic.
 */
export function cycleCapacityHours(signals) {
  // Eight hours a week when they have not told us — deliberately a middle
  // number rather than a cautious one. Too low and an ambitious student gets a
  // three-item month that reads as the app not taking them seriously; too high
  // and a busy one gets a plan they cannot finish. The moment they answer the
  // constraints question or a check-in, this stops being a guess.
  const weekly = Number(signals?.constraints?.weeklyHours) || 8;
  let hours = weekly * 4;
  if (signals?.wellbeing?.strained) hours *= 0.6;
  if (signals?.academics?.falling) hours *= 0.75;
  if (signals?.activities?.implausibleLoad) hours *= 0.85;
  return Math.max(4, Math.round(hours));
}

/** Rules whose actions are exempt from the capacity budget — they exist to free time, not spend it. */
const ALWAYS_KEEP = new Set([
  'wellbeing-protect', 'academics-protect', 'activity-reduce', 'deadline-imminent',
  'deadline-missed', 'college-essays-senior',
  // The check-in is what keeps every other item honest, and it costs half an
  // hour. Budgeting it out is how a plan stops adapting.
  'checkin-weekly',
]);

/** Additive rules that are suppressed entirely when the student is visibly overloaded. */
const ADDITIVE_RULES = new Set(['activity-explore', 'leadership-second', 'leadership-found', 'opportunity-prepare', 'service-consistency']);

/**
 * The full candidate set, scored, with the student's own recorded feedback
 * applied.
 *
 * Suppression is the important half: an item the student declined, or a
 * category they said was too expensive or too far, must not come back next
 * cycle wearing a different hat. That is read from recommendation_feedback
 * (the same table Medabrain, the master plan and the opportunity matcher read),
 * so a decision made once is respected everywhere.
 */
export function buildCandidates(signals) {
  resetActionIds();
  const strained = !!(signals.wellbeing?.strained || signals.academics?.falling);
  const out = [];
  for (const rule of RULES) {
    if (strained && ADDITIVE_RULES.has(rule.id)) continue;
    let built = null;
    try { built = rule.build(signals); } catch { built = null; }
    if (!built) continue;
    for (const a of built) {
      if (isSuppressed(a, signals)) continue;
      out.push(applyPreferences(a, signals));
    }
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/** True when the student has already told us not to offer this. */
export function isSuppressed(a, signals) {
  const refs = signals?.feedback?.suppressedRefs;
  if (refs && a.link?.ref && refs.has(a.link.ref)) return true;
  // A declined title is matched loosely too: the same program can arrive from
  // the catalog under a slightly different label than the one they declined.
  const labels = signals?.feedback?.suppressedLabels || [];
  return labels.some((l) => l.label && a.title && normalize(l.label) === normalize(a.title));
}

const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Nudge an action's weight by what the student has told us about cost, travel
 * and difficulty — learned preference, applied to the whole class of thing
 * rather than to the single item they refused.
 */
export function applyPreferences(a, signals) {
  let weight = a.weight;
  const f = signals?.feedback || {};
  if (f.tooExpensive && a.link?.kind === 'opportunity' && a.link.free === false) weight -= 25;
  if (f.tooFar && a.link?.kind === 'opportunity' && a.link.remote === false) weight -= 15;
  if (f.tooDifficult && a.priority === 'critical') weight -= 5;
  if (signals?.constraints?.cost && a.link?.kind === 'opportunity' && a.link.free === false) weight -= 10;
  return { ...a, weight };
}

/**
 * Choose what actually lands on the plan, and put each one in a week.
 *
 * Capacity is a real constraint, not a display: a plan with thirty hours of work
 * for a student who told us they have four a week is a plan that teaches them
 * the plan is fiction. Everything that does not fit becomes the BACKLOG, which
 * is what the adaptation layer promotes from when something is declined or
 * turns out to be ineligible — so a replacement is instant and deterministic.
 */
export function scheduleCandidates(candidates, signals, { maxActions = 9 } = {}) {
  const capacity = cycleCapacityHours(signals);
  const chosen = [];
  const backlog = [];
  let spent = 0;
  for (const c of candidates) {
    const mustKeep = ALWAYS_KEEP.has(c.source.replace('rule:', ''));
    const fits = spent + c.effortHours <= capacity && chosen.length < maxActions;
    if (mustKeep || fits) {
      chosen.push(c);
      spent += c.effortHours;
    } else {
      backlog.push(c);
    }
  }

  // Week assignment. An action with its own date lands in the week that date
  // falls in; one with a hint honors it; everything else is spread so no single
  // week carries the whole month.
  const perWeek = [0, 0, 0, 0];
  const weekCap = Math.max(1, capacity / CYCLE_WEEKS);
  const ranked = chosen.map((c, i) => ({ ...c, rank: i + 1 }));
  const cycleStart = signals.today;
  for (const a of ranked) {
    let idx = a.weekIndex;
    if (idx == null && a.timing.dueDate) {
      const off = daysBetween(cycleStart, a.timing.dueDate);
      idx = off >= 0 && off < CYCLE_WEEKS * 7 ? Math.floor(off / 7) : (off < 0 ? 0 : CYCLE_WEEKS - 1);
    }
    if (idx == null) {
      // The emptiest week, so effort spreads rather than piling into week one.
      idx = perWeek.indexOf(Math.min(...perWeek));
    }
    idx = Math.max(0, Math.min(CYCLE_WEEKS - 1, idx));
    // A week already over its share pushes a flexible action out one week.
    if (!a.timing.dueDate && perWeek[idx] > weekCap && idx < CYCLE_WEEKS - 1) idx += 1;
    a.weekIndex = idx;
    perWeek[idx] += a.effortHours;
  }

  return {
    actions: ranked,
    backlog: backlog.slice(0, 12).map((c, i) => ({ ...c, rank: 900 + i })),
    capacity,
    plannedHours: Math.round(spent * 10) / 10,
    weekLoad: perWeek.map((h) => Math.round(h * 10) / 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Adaptation: what to offer INSTEAD, when a student tells us something.
//
// Each of these is a pure transformation from one action into another, so the
// response to "too expensive" is instant and does not need a model call. That
// matters: the moment a student tells you something honest is exactly the wrong
// moment to show them a spinner.
// ─────────────────────────────────────────────────────────────────────────────

/** A smaller, closer version of the same idea — the answer to "too difficult". */
export function steppingStoneFor(a, signals) {
  const base = {
    ruleId: 'stepping-stone', domain: a.domain,
    title: `A smaller first step toward: ${a.title.replace(/^(Apply|Finish|Start):?\s*/i, '')}`,
    reason: 'You said the full version was too much right now, so this is the rung below it.',
    whyThisMatters: 'Difficulty is information, not failure. The version of this that you will actually finish is worth more than the version that stalls.',
    dueLabel: 'This month', origin: 'cycle', effort: 'quick', priority: 'standard', weight: 60,
    definitionOfDone: 'One concrete, smaller piece is done — the requirements read, one section drafted, one conversation had.',
    evidenceToLog: 'Whatever you produced, however small.',
    link: a.link,
    metabrain: `I found "${a.title}" too hard to take on. Help me break it into a first step I can genuinely finish this week.`,
  };
  if (a.domain === 'opportunity') {
    base.title = `Read the real requirements for ${a.link?.label || a.title}`;
    base.definitionOfDone = 'You can say exactly what it asks for, and whether you want to aim for it next cycle.';
  }
  if (a.domain === 'leadership') {
    base.title = 'Take one recurring responsibility instead of a role';
    base.definitionOfDone = 'One specific thing is yours every week, agreed with whoever runs it.';
  }
  return action(base);
}

/** Free and funded only — the answer to "too expensive". */
export function fundedAlternativeFor(a, signals) {
  const free = (signals?.opportunities?.actNow || [])
    .concat(signals?.opportunities?.prepareNow || [])
    .find((o) => o.free && `program:${o.id}` !== a.link?.ref);
  if (free) {
    return action({
      ruleId: 'funded-alternative', key: free.id, domain: 'opportunity',
      title: `Free alternative: ${free.name}`,
      reason: `You said cost was the blocker on ${a.link?.label || 'the last one'}. ${free.costLabel || 'This one costs you nothing'}.`,
      whyThisMatters: 'Cost is a real constraint and it is not a reflection on ambition. Some of the strongest programs on this list are free, funded, or pay a stipend.',
      dueDate: free.deadline?.iso || null,
      dueLabel: free.deadline?.label || 'Check the official page',
      origin: 'catalog', precision: free.deadline?.precision === 'exact' ? 'exact' : 'typical',
      effort: 'medium', priority: 'standard', weight: 70,
      definitionOfDone: 'Applied, or read properly and decided against.',
      evidenceToLog: 'What you submitted and when.',
      link: { kind: 'opportunity', ref: `program:${free.id}`, label: free.name, url: free.url, verified: free.verifiedLabel },
      metabrain: `Cost rules out ${a.link?.label || 'that program'}. Talk me through ${free.name} and any fee waivers or funded options I should know about.`,
    });
  }
  return action({
    ruleId: 'funded-alternative', domain: a.domain,
    title: 'Find the funded version of this',
    reason: 'You said cost was the blocker, so the next move is the fee waiver rather than the program.',
    whyThisMatters: 'Most selective programs with a fee have a waiver, and almost none of them advertise it. Asking is normal and it is usually granted.',
    dueLabel: 'This month', origin: 'cycle', effort: 'quick', priority: 'standard', weight: 58,
    definitionOfDone: 'You have checked the program page for a fee waiver and asked your counselor about the ones that are not published.',
    evidenceToLog: 'Whatever you find out — it will apply to several other things later.',
    link: a.link,
    metabrain: 'Cost is the blocker here. What fee waivers, funded alternatives or stipend programs should I be looking at?',
  });
}

/** Local or online only — the answer to "too far away". */
export function localAlternativeFor(a, signals) {
  const remote = (signals?.opportunities?.actNow || [])
    .concat(signals?.opportunities?.prepareNow || [])
    .find((o) => o.remote && `program:${o.id}` !== a.link?.ref);
  if (remote) {
    return action({
      ruleId: 'local-alternative', key: remote.id, domain: 'opportunity',
      title: `Does not need travel: ${remote.name}`,
      reason: `You said distance ruled out ${a.link?.label || 'the last one'}. This one runs remotely.`,
      whyThisMatters: 'Travel and transport are real constraints, and plenty of genuinely strong programs are remote, local-chapter based, or run entirely online.',
      dueDate: remote.deadline?.iso || null,
      dueLabel: remote.deadline?.label || 'Check the official page',
      origin: 'catalog', precision: remote.deadline?.precision === 'exact' ? 'exact' : 'typical',
      effort: 'medium', priority: 'standard', weight: 68,
      definitionOfDone: 'Applied, or read properly and decided against.',
      evidenceToLog: 'What you submitted and when.',
      link: { kind: 'opportunity', ref: `program:${remote.id}`, label: remote.name, url: remote.url, verified: remote.verifiedLabel },
      metabrain: `I cannot travel for ${a.link?.label || 'that program'}. Tell me about ${remote.name} and other things I can do from where I am.`,
    });
  }
  return action({
    ruleId: 'local-alternative', domain: a.domain,
    title: 'Find the version of this near you',
    reason: 'Distance was the blocker, so the move is a local chapter or an online equivalent rather than a different ambition.',
    whyThisMatters: 'Most national programs have regional affiliates, and most of the value is in the work rather than the venue.',
    dueLabel: 'This month', origin: 'cycle', effort: 'short', priority: 'standard', weight: 56,
    definitionOfDone: 'You have found either a local chapter, a remote equivalent, or established that neither exists.',
    evidenceToLog: 'What you found, so it is on the list next time.',
    link: a.link,
    metabrain: 'Travel is the blocker here. What local or online equivalents should I look at?',
  });
}

/**
 * What to do next after finishing something — the reward for completing an
 * action is a harder, more interesting one, not an empty space.
 */
export function followOnFor(a, signals) {
  if (a.domain === 'opportunity') {
    return action({
      ruleId: 'follow-on', key: a.id, domain: 'portfolio',
      title: `Log what ${a.link?.label || 'that'} produced`,
      reason: 'You finished it. The record of it is worth as much as the doing, and it is the part everyone forgets.',
      whyThisMatters: 'A submission with a date, a result and a description becomes an activity, an award, or a line in an essay. Undocumented, it becomes a vague memory in two years.',
      dueLabel: 'This week', origin: 'cycle', effort: 'quick', priority: 'standard', weight: 64,
      definitionOfDone: 'It is logged as a competition or activity, with what you submitted and any result.',
      evidenceToLog: 'The submission, the date, and the outcome when it arrives.',
      link: a.link,
      metabrain: `I finished ${a.link?.label || a.title}. Help me write it up properly for my portfolio and work out what the natural next step is.`,
    });
  }
  if (a.domain === 'leadership') {
    const next = LEADERSHIP_LADDER.find((r, i) => LEADERSHIP_LADDER[i - 1]?.label && a.title.includes(LEADERSHIP_LADDER[i - 1].label));
    return action({
      ruleId: 'follow-on', key: a.id, domain: 'leadership',
      title: next ? `Now: ${next.label}` : 'Turn that responsibility into something with a number on it',
      reason: 'You took the rung. The next one is what makes it read as growth rather than a title.',
      whyThisMatters: 'The ladder only counts if you keep climbing it. One finished project under a role is worth more than the role itself.',
      dueLabel: 'This month', origin: 'cycle', effort: 'medium', priority: 'standard', weight: 66,
      definitionOfDone: next ? next.detail : 'One thing you ran, finished, with a result you can quote.',
      evidenceToLog: 'The outcome, with a number.',
      link: a.link,
      metabrain: 'I just took on more responsibility. What is the next real step, and how do I make it produce something I can point at?',
    });
  }
  return action({
    ruleId: 'follow-on', key: a.id, domain: a.domain,
    title: `Capture the evidence from: ${a.title}`,
    reason: 'You finished it — the evidence is the half that survives to the application.',
    whyThisMatters: 'Everything in your portfolio is only as strong as what is written next to it. This is the cheapest thing on the page and the one most often skipped.',
    dueLabel: 'This week', origin: 'cycle', effort: 'quick', priority: 'optional', weight: 50,
    definitionOfDone: 'The result is logged where it belongs, with a number if there is one.',
    evidenceToLog: a.evidenceToLog,
    link: a.link,
    metabrain: `I finished "${a.title}". Help me write it up so it is actually usable later.`,
  });
}
