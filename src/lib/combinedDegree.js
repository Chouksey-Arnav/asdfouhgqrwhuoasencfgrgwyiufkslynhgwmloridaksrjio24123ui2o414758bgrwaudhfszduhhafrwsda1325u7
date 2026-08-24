// ─────────────────────────────────────────────────────────────────────────────
// The logic under the combined-degree and direct-admit catalog.
//
// Four jobs, in the order they matter:
//
//   1. STALENESS IS A FIRST-CLASS FACT. Combined-degree programs change
//      requirements without announcing it, and they close (see
//      MISLISTED_PROGRAMS). An entry we have not re-checked inside twelve
//      months is not neutral — a student who plans a testing calendar around a
//      score floor that moved last spring loses that calendar. So every card
//      carries its verification age, and anything past STALE_AFTER_DAYS carries
//      a visible warning rather than a quiet one.
//
//   2. THE REQUIREMENTS GAP. The whole reason this app already holds a
//      student's GPA entries, every test sitting with sections, and dated
//      clinical and service hours is so that "does this student meet Drexel's
//      stated bar" can be answered from their real record instead of from
//      their memory. Every gap row names the program's requirement, the
//      student's own logged number, and where in the app to go and fix it.
//
//   3. DEADLINES BECOME MILESTONES. A combined-degree deadline is usually the
//      EARLY one — November of senior year — and there is usually a separate
//      program application behind it. The alert offsets here are deliberately
//      much longer than the Opportunities ones (150/90/60/30/7 rather than
//      60/30/7): a supplemental essay set plus official score sends plus
//      recommenders is a months-long job, and a 60-day warning on it is a
//      warning that arrives after the work should have started.
//
//   4. NEVER STATE A NUMBER WITHOUT ITS BASIS. `official` and `estimated` are
//      rendered differently everywhere, and `unpublished` is rendered as "no
//      one knows this" rather than being quietly omitted — because the absence
//      is itself the thing a student needs to be told, especially for
//      acceptance rates, where the numbers in circulation are consultancy
//      arithmetic on guessed denominators.
//
// Rules the module obeys:
//   - `null` in the data means "we do not know", never "no". A requirement we
//     do not have never produces a 'met'.
//   - A student value we do not have never produces a 'short'. Not knowing
//     their GPA is not evidence that their GPA is low.
//   - Every verdict is computed locally and deterministically. No AI decides
//     whether a student clears a bar.
// ─────────────────────────────────────────────────────────────────────────────

import {
  PROGRAMS, PROGRAM_BY_ID, ROSTER, PATHWAY_BY_ID, ROUND_TYPES, TEST_POLICIES, BASIS_META,
} from '../data/combinedDegreePrograms.js';
import { deriveApplicantFromPortfolio, derivePortfolioSignals } from './admissions/intake.js';
import { INTERVIEW_FORMATS } from './admissions/interviewFormats.js';

const DAY = 86400000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ── 1. Verification age ──────────────────────────────────────────────────────

/**
 * How long ago we checked, and whether that is long enough to be a problem.
 *
 * Twelve months is the threshold because that is one full admissions cycle: a
 * program that changed its test policy or its deadline did so between cycles,
 * and an entry older than a cycle has had the opportunity to be wrong.
 */
export const STALE_AFTER_DAYS = 365;
/** Warned about before it is stale, so a maintainer sees it coming. */
export const AGEING_AFTER_DAYS = 270;

export function verificationStatus(program, today = new Date()) {
  const raw = program?.verified;
  if (!raw) {
    // Mandatory by contract (the verifier fails the build on a missing one), so
    // this branch is the belt to that braces — and it fails LOUD, not silent.
    return {
      days: null, stale: true, tone: 'bad', label: 'Never verified',
      warning: 'We have no record of anyone checking this program against its own page. Treat every field on this card as unconfirmed and use the official link.',
    };
  }
  const then = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(then.getTime())) {
    return { days: null, stale: true, tone: 'bad', label: 'Verification date unreadable', warning: 'Use the official link.' };
  }
  const days = Math.round((startOfDay(today) - then) / DAY);
  const months = Math.max(0, Math.round(days / 30));
  const label = days <= 0 ? 'Checked today'
    : days < 45 ? `Checked ${days} day${days === 1 ? '' : 's'} ago`
    : `Checked ${months} month${months === 1 ? '' : 's'} ago`;

  if (days >= STALE_AFTER_DAYS) {
    return {
      days, months, stale: true, tone: 'bad', label,
      warning: `We last checked this against ${program.institution}'s own page ${months} months ago — more than a full admissions cycle. Deadlines, score floors and test policies all move between cycles, and this one has had the chance to. Confirm every number on this card on the official page before you plan around it.`,
    };
  }
  if (days >= AGEING_AFTER_DAYS) {
    return {
      days, months, stale: false, ageing: true, tone: 'warn', label,
      warning: 'This is approaching a year old. Still worth confirming the deadline and the test policy on the official page.',
    };
  }
  return { days, months, stale: false, tone: 'good', label, warning: null };
}

// ── 2. Deadlines ─────────────────────────────────────────────────────────────

/**
 * The next occurrence of a program's recurring deadline, with its precision
 * attached so the UI can never render an approximation as an exact date.
 *
 * Same rollover rule as the Opportunities layer: if this cycle's date has
 * passed, the next one is next cycle's — which is exactly the fact a junior
 * browsing in February needs and never gets told.
 */
export function nextDeadline(program, today = new Date()) {
  const d = program?.deadline;
  if (!d) return null;
  if (d.precision === 'rolling') {
    return { date: null, iso: null, daysOut: null, precision: 'rolling', round: d.round, note: d.note, passedThisCycle: false, label: 'Rolling', urgency: 'none' };
  }
  if (d.month == null) {
    return { date: null, iso: null, daysOut: null, precision: d.precision, round: d.round, note: d.note, passedThisCycle: false, label: 'Date not published', urgency: 'unknown' };
  }

  const t = startOfDay(today);
  // Day 15 stands in for "some time that month" when only the month is known.
  // It never presents as an exact date — `precision` rides along and the UI
  // renders a month — and it puts the alerts in the right fortnight.
  const day = d.day || 15;
  let date = new Date(t.getFullYear(), d.month - 1, day);
  let passedThisCycle = false;
  if (date < t) { passedThisCycle = true; date = new Date(t.getFullYear() + 1, d.month - 1, day); }

  const daysOut = Math.round((date - t) / DAY);
  const label = d.precision === 'exact' ? `${MONTHS[d.month - 1]} ${day}`
    : d.precision === 'window' ? `${MONTHS[d.month - 1]} (window)`
    : `${MONTHS[d.month - 1]} (approx.)`;

  return {
    date, iso: toISO(date), daysOut, precision: d.precision, round: d.round, note: d.note,
    passedThisCycle, label,
    roundLabel: ROUND_TYPES[d.round]?.label || null,
    binding: ROUND_TYPES[d.round]?.binding || false,
    urgency: daysOut <= 14 ? 'critical' : daysOut <= 45 ? 'urgent' : daysOut <= 120 ? 'soon' : 'later',
  };
}

/**
 * The alert ladder. Much longer than the Opportunities one and deliberately so
 * — see the header. 150 days out is roughly "the summer before senior year",
 * which is when the supplemental essays for a November deadline actually have
 * to be started.
 */
export const ALERT_OFFSETS = [150, 90, 60, 30, 7];

const ALERT_COPY = {
  150: (n) => `${n} — 5 months out: read the supplemental prompts and draft one`,
  90: (n) => `${n} — 3 months out: book any remaining test sitting, and order official score sends`,
  60: (n) => `${n} — 60 days out: recommenders and transcripts`,
  30: (n) => `${n} — 30 days out: finish the program application, not just the university one`,
  7: (n) => `${n} — 7 days out: submit. Do not wait for the last night.`,
};

/** Round type → the deadline `kind` the Milestones tab and timeline.js understand. */
const KIND_FOR_ROUND = {
  early_decision: 'early_decision',
  early_action: 'early_action',
  regular: 'regular_decision',
  priority: 'early_action',
  separate: 'early_action',
};

/**
 * The rows to write into `deadlines` when a student saves a program: the
 * deadline itself plus whichever alerts are still in the future. An alert dated
 * in the past is clutter, not a reminder.
 */
export function milestoneRowsFor(program, dueIso, today = new Date()) {
  if (!program || !dueIso) return [];
  const due = new Date(`${dueIso}T00:00:00`);
  if (Number.isNaN(due.getTime())) return [];
  const t = startOfDay(today);
  const name = programLabel(program);
  const approx = program.deadline?.precision && program.deadline.precision !== 'exact';
  const kind = KIND_FOR_ROUND[program.deadline?.round] || 'regular_decision';

  // `source_ref` is the join that makes the feed two-way: completing the application milestone
  // marks the program's college-list row submitted and closes its own reminders, instead of the
  // student's only option being to delete the row. See src/lib/milestoneSync.js.
  const ref = `combined:${program.id}`;
  const rows = [{
    title: `${name} — application due${approx ? ' (approx. — confirm on the official page)' : ''}`,
    due_date: dueIso,
    kind,
    source_ref: ref,
    // Five months, matching the top of the alert ladder: a combined-degree supplement with its
    // own essays and official score sends behind it is genuinely a summer's worth of work, and
    // the urgency sort has to know that or it files this behind every thirty-day form.
    lead_days: 150,
  }];
  for (const offset of ALERT_OFFSETS) {
    const when = new Date(due.getTime() - offset * DAY);
    if (when <= t) continue;
    rows.push({ title: ALERT_COPY[offset](name), due_date: toISO(when), kind, source_ref: `alert:${ref}:${offset}`, lead_days: offset === 7 ? 3 : 7 });
  }
  return rows;
}

/**
 * The `colleges` row a saved program becomes.
 *
 * A combined-degree program IS a college application, so it goes on the college
 * list rather than into a parallel store — which means it immediately reaches
 * the Tracked board, the essay workspace's per-school prompts, and the
 * admissions calculator, none of which we would otherwise have had to build.
 * The deadline lands in `ea_ed_deadline` for an early or separate round and in
 * `rd_deadline` for a regular one, which is what the College List panel and
 * trackedItems.js already read.
 */
export function collegeRowFor(program, dl) {
  const early = ['early_decision', 'early_action', 'priority', 'separate'].includes(program?.deadline?.round);
  const notes = [
    `${program.program} — ${program.degree}, ${program.years} years.`,
    program.deadline?.round === 'separate'
      ? 'This program has its own deadline, SEPARATE from the university’s general admission deadline.'
      : null,
    ROUND_TYPES[program.deadline?.round]?.binding ? 'Binding round — if they admit you, you go.' : null,
    program.supplemental?.required ? 'Requires a separate supplemental application.' : null,
    program.url,
  ].filter(Boolean).join(' ');

  return {
    name: programLabel(program),
    // Every combined-degree program is a reach by construction: single-digit
    // classes, hard floors, and a seat at a medical school attached. Filing one
    // as a target would corrupt the college list's own reach/target/safety
    // balance, which the list panel reasons over.
    category: 'reach',
    status: 'researching',
    notes: notes.slice(0, 900),
    ...(dl?.iso ? (early ? { ea_ed_deadline: dl.iso } : { rd_deadline: dl.iso }) : {}),
  };
}

/** "Drexel University — BA/BS + MD Early Assurance Program", the one name used everywhere. */
export const programLabel = (p) => (p ? `${p.institution} — ${p.program}` : '');

// ── 3. The student's own record ──────────────────────────────────────────────

/**
 * Everything the gap engine needs, derived from the SAME portfolio snapshot the
 * rest of the Portfolio reads. Nothing here is asked for twice: the GPA comes
 * from gpa_entries, the scores from every logged sitting (with sections, and
 * with the single-sitting best held separately from the superscore), and the
 * hours from the clinical log and the activity list.
 */
export function studentFactsFor({ snapshot = {}, user = null } = {}) {
  const applicant = deriveApplicantFromPortfolio({ snapshot, user });
  const signals = derivePortfolioSignals(snapshot);
  const sat = applicant.tests?.sat || null;
  const act = applicant.tests?.act || null;

  return {
    unweightedGpa: applicant.unweightedGpa ?? null,
    weightedGpa: applicant.weightedGpa ?? null,
    sat, act,
    hasAnyScore: !!(sat || act),
    serviceHours: signals.service?.hours ?? 0,
    clinicalHours: signals.clinical?.hours ?? 0,
    researchHours: signals.research?.hours ?? 0,
    hasService: (signals.service?.entries || 0) > 0,
    hasClinical: (signals.clinical?.entries || 0) > 0,
    hasResearch: (signals.research?.entries || 0) > 0,
    state: user?.state || applicant.stateResidency || null,
    provenance: signals.provenance || {},
  };
}

// ── 4. The requirements gap ──────────────────────────────────────────────────

/**
 * Gap statuses. `not_stated` is a real, distinct outcome and the UI must show
 * it as such: "this program does not publish a GPA minimum" is different from
 * "you meet this program's GPA minimum", and collapsing the two is how a
 * student comes to believe they have cleared a bar nobody set.
 */
export const GAP_STATUS = {
  met: { label: 'You clear it', tone: 'good' },
  short: { label: 'Short of it', tone: 'bad' },
  close: { label: 'Nearly there', tone: 'warn' },
  missing: { label: 'Nothing logged', tone: 'warn' },
  not_stated: { label: 'Not published', tone: 'neutral' },
  blocked: { label: 'Hard restriction', tone: 'bad' },
  info: { label: 'Worth knowing', tone: 'neutral' },
};

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * How far a student is from a score floor, in the currency of whichever test
 * gets them there fastest. A program stating both an SAT and an ACT minimum is
 * stating an OR, so the nearer of the two is the real distance — quoting the
 * further one would tell a student to climb a hill they do not have to.
 */
function shortfallText(test, satBest, actBest) {
  const gaps = [];
  if (test.satMin != null && satBest != null) gaps.push({ n: test.satMin - satBest, unit: 'SAT points' });
  if (test.actMin != null && actBest != null) gaps.push({ n: test.actMin - actBest, unit: `ACT point${test.actMin - actBest === 1 ? '' : 's'}` });
  const nearest = gaps.filter(g => g.n > 0).sort((a, b) => a.n / (a.unit === 'SAT points' ? 40 : 1) - b.n / (b.unit === 'SAT points' ? 40 : 1))[0];
  return nearest ? `${nearest.n} ${nearest.unit}` : 'some way';
}

/**
 * One program's stated requirements against this student's actual logged
 * record.
 *
 * @returns {Array<{id,label,requirement,yours,status,detail,fixWhere,basis}>}
 *   `fixWhere` is a Portfolio destination id (see PORTFOLIO_GROUP_FOR_VIEW in
 *   App.jsx), so every shortfall is one tap from the screen that fixes it.
 *   A gap you cannot act on is just bad news.
 */
export function requirementGaps(program, facts = {}) {
  if (!program) return [];
  const rows = [];

  // ── GPA ────────────────────────────────────────────────────────────────
  const gpaReq = program.gpa || {};
  const yourGpa = gpaReq.scale === 'weighted' ? facts.weightedGpa : facts.unweightedGpa;
  const gpaScaleWord = gpaReq.scale === 'weighted' ? 'weighted' : 'unweighted';
  if (gpaReq.min != null) {
    rows.push({
      id: 'gpa',
      label: `Minimum GPA (${gpaScaleWord})`,
      requirement: `${gpaReq.min.toFixed(2)} ${gpaScaleWord}`,
      yours: yourGpa != null ? yourGpa.toFixed(2) : null,
      basis: gpaReq.basis,
      status: yourGpa == null ? 'missing'
        : yourGpa >= gpaReq.min ? 'met'
        : yourGpa >= gpaReq.min - 0.15 ? 'close' : 'short',
      detail: yourGpa == null
        ? `You have not logged a ${gpaScaleWord} GPA yet, so we cannot check this for you.`
        : yourGpa >= gpaReq.min
          ? `Your logged ${gpaScaleWord} GPA is ${yourGpa.toFixed(2)}. Clearing a minimum is not the same as being competitive — minimums are floors, and admitted students sit well above them.`
          : `You are ${round1(gpaReq.min - yourGpa).toFixed(2)} below the stated minimum on your logged ${gpaScaleWord} GPA.`,
      fixWhere: 'academics',
      note: gpaReq.note,
    });
  } else {
    rows.push({
      id: 'gpa',
      label: 'GPA',
      requirement: null,
      yours: yourGpa != null ? `${yourGpa.toFixed(2)} ${gpaScaleWord}` : null,
      basis: gpaReq.basis || 'unpublished',
      status: 'not_stated',
      detail: gpaReq.note || 'This program does not publish a GPA minimum. That is not permission to relax — it usually means the real bar is set by the applicant pool rather than by a rule.',
      fixWhere: 'academics',
    });
  }

  // ── Tests ──────────────────────────────────────────────────────────────
  const test = program.test || {};
  const policy = TEST_POLICIES[test.policy] || null;
  const satBest = facts.sat?.bestSingleSitting ?? facts.sat?.composite ?? null;
  const actBest = facts.act?.bestSingleSitting ?? facts.act?.composite ?? null;

  if (test.satMin != null || test.actMin != null) {
    // A program that states both is stating an OR: you clear it with either.
    const clears = (test.satMin != null && satBest != null && satBest >= test.satMin)
      || (test.actMin != null && actBest != null && actBest >= test.actMin);
    const near = !clears && (
      (test.satMin != null && satBest != null && satBest >= test.satMin - 60)
      || (test.actMin != null && actBest != null && actBest >= test.actMin - 2));
    const yourBits = [
      satBest != null ? `SAT ${satBest}` : null,
      actBest != null ? `ACT ${actBest}` : null,
    ].filter(Boolean);
    const reqBits = [
      test.satMin != null ? `SAT ${test.satMin}` : null,
      test.actMin != null ? `ACT ${test.actMin}` : null,
    ].filter(Boolean);

    rows.push({
      id: 'test-floor',
      label: 'Minimum test score',
      requirement: reqBits.join(' or '),
      yours: yourBits.length ? yourBits.join(' · ') : null,
      basis: test.basis,
      status: !yourBits.length ? 'missing' : clears ? 'met' : near ? 'close' : 'short',
      detail: !yourBits.length
        ? 'You have not logged an SAT or ACT sitting yet, so we cannot check this for you.'
        : clears
          ? 'Your best single sitting clears the stated minimum.'
          // Naming the exact distance is the difference between a verdict and a
          // plan: "40 SAT points short" is a study target, "below the minimum"
          // is a mood. Where both an SAT and an ACT floor are stated the student
          // only has to close ONE of them, so we quote the nearer.
          : `You are ${shortfallText(test, satBest, actBest)} short of the stated minimum, on your best single sitting. This is a floor, not a preference — below it, the application is not read.`,
      fixWhere: 'academics',
      note: test.note,
    });

    // Superscoring is where a student most often believes they clear a bar they
    // do not. Only raised when it would actually change the answer.
    if (test.singleSitting && facts.sat?.superscoreAvailable) {
      rows.push({
        id: 'test-single-sitting',
        label: 'Single-sitting rule',
        requirement: 'One test date, not a superscore',
        yours: `Superscore ${facts.sat.superscoreAvailable} · best single sitting ${satBest ?? '—'}`,
        basis: 'official',
        status: satBest != null && test.satMin != null && satBest >= test.satMin ? 'met' : 'short',
        detail: 'This program requires the minimum to be met in a SINGLE SITTING. Your superscore does not count here, and it is higher than your best single date — so the number you have been quoting yourself is not the number this program will read.',
        fixWhere: 'academics',
      });
    }
  } else if (policy) {
    rows.push({
      id: 'test-policy',
      label: 'Test policy',
      requirement: policy.label,
      yours: facts.hasAnyScore
        ? [satBest != null ? `SAT ${satBest}` : null, actBest != null ? `ACT ${actBest}` : null].filter(Boolean).join(' · ')
        : null,
      basis: test.basis || 'unpublished',
      status: test.policy === 'required' || test.policy === 'required_no_self_report'
        ? (facts.hasAnyScore ? 'met' : 'missing')
        : 'info',
      detail: policy.blurb,
      fixWhere: 'academics',
      note: test.note,
    });
  }

  // The logistics row. Requiring official scores is not a higher bar, it is a
  // DIFFERENT TASK with its own multi-week lead time, and it is invisible on
  // every other tool.
  if (test.policy === 'required_no_self_report') {
    rows.push({
      id: 'test-official-send',
      label: 'Official scores must be sent',
      requirement: 'Score report direct from the testing agency',
      yours: null,
      basis: 'official',
      status: 'info',
      detail: 'Self-reported scores are not accepted. Order the official send from College Board or ACT well before the deadline — this takes weeks, and it is the single most common way a complete application arrives incomplete.',
      fixWhere: 'academics',
    });
  }

  if ((test.sections || []).length) {
    rows.push({
      id: 'test-sections',
      label: 'Specific sections required',
      requirement: test.sections.join(', '),
      yours: null,
      basis: test.basis,
      status: 'info',
      detail: `This program looks at ${test.sections.join(' and ')} specifically, not only the composite. A composite that clears the bar with a weak required section does not clear the bar.`,
      fixWhere: 'academics',
    });
  }

  // ── Service hours ──────────────────────────────────────────────────────
  const svc = program.serviceHours || {};
  if (svc.required != null) {
    const yours = facts.serviceHours || 0;
    rows.push({
      id: 'service-hours',
      label: 'Documented service hours',
      requirement: `${svc.required}+ hours`,
      yours: `${Math.round(yours)} logged`,
      basis: svc.basis,
      status: yours >= svc.required ? 'met' : yours >= svc.required * 0.75 ? 'close' : yours > 0 ? 'short' : 'missing',
      detail: yours >= svc.required
        ? `You have ${Math.round(yours)} hours logged against a ${svc.required}-hour requirement. Make sure each entry has a supervisor and dates — "documented" is the part that gets checked.`
        // Nothing logged is not the same as nothing done, and must not be
        // written as though it were — the same rule the GPA and score rows
        // follow. But the lead-time warning is true either way, and it is the
        // single most useful sentence on this card for a ninth-grader.
        : yours <= 0
          ? `You have not logged any service hours yet — which may mean you have none, or only that they are not in here. Either way: this program wants ${svc.required} documented hours, and it is the requirement with the longest lead time on the whole card. It is years of work, not a summer.`
          : `You are ${Math.max(0, Math.round(svc.required - yours))} hours short. This is the requirement with the longest lead time on the whole card: it is years of work, not a summer.`,
      fixWhere: 'clinical',
      note: svc.note,
    });
  } else if (svc.note) {
    rows.push({
      id: 'service-hours',
      label: 'Service and clinical experience',
      requirement: null,
      yours: facts.serviceHours || facts.clinicalHours
        ? `${Math.round(facts.serviceHours)} service · ${Math.round(facts.clinicalHours)} clinical logged`
        : null,
      basis: svc.basis || 'unpublished',
      status: 'not_stated',
      detail: svc.note,
      fixWhere: 'clinical',
    });
  }

  // ── Citizenship ────────────────────────────────────────────────────────
  // Never a verdict about the student: we do not ask for citizenship and should
  // not. It is stated as the program's rule and left with them.
  if (program.citizenship) {
    rows.push({
      id: 'citizenship',
      label: 'Citizenship',
      requirement: program.citizenship === 'us'
        ? 'US citizens only'
        : 'US citizens or permanent residents',
      yours: null,
      basis: 'official',
      status: 'blocked',
      detail: program.citizenship === 'us'
        ? 'This program admits US citizens only. We do not ask you about citizenship and will not guess — but if this does not describe you, this program is closed to you and it is better to know that now than in November.'
        : 'This program requires US citizenship or a green card. We do not ask you about this; check it against your own situation before you spend a season on the application.',
      fixWhere: null,
    });
  }

  // ── Residency ──────────────────────────────────────────────────────────
  if (program.residency?.restricted) {
    const sameState = facts.state && program.state && String(facts.state).toUpperCase().startsWith(program.state);
    rows.push({
      id: 'residency',
      label: 'State residency',
      requirement: `${program.state} residents favored`,
      yours: facts.state || null,
      basis: 'official',
      status: facts.state ? (sameState ? 'met' : 'short') : 'info',
      detail: program.residency.note || `${program.state} residents are admitted on materially different terms here.`,
      fixWhere: null,
    });
  }

  // ── Interview and CASPer ───────────────────────────────────────────────
  if (program.interview?.required) {
    const fmt = program.interview.format ? INTERVIEW_FORMATS[program.interview.format] : null;
    rows.push({
      id: 'interview',
      label: 'Interview',
      requirement: fmt ? fmt.label : 'Format not published',
      yours: null,
      basis: program.interview.basis,
      status: 'info',
      detail: program.interview.note || (fmt ? fmt.blurb : 'This program interviews, but does not publish the format. Prepare for the harder case: an MMI circuit is the harder version of every format, so an hour on one is never wasted.'),
      fixWhere: 'interview',
    });
  }
  if (program.casper === true) {
    rows.push({
      id: 'casper',
      label: 'CASPer',
      requirement: 'Required',
      yours: null,
      basis: 'official',
      status: 'info',
      detail: INTERVIEW_FORMATS.casper.blurb,
      fixWhere: 'interview',
    });
  }

  // ── Letters of recommendation ──────────────────────────────────────────
  // Only surfaced when a program says it does NOT use them, because that is the
  // surprising case: a student who does not know spends weeks cultivating
  // recommenders this program will never read.
  if (program.recommendations?.used === false) {
    rows.push({
      id: 'recommendations',
      label: 'Letters of recommendation',
      requirement: 'Not used by this program',
      yours: null,
      basis: program.recommendations.basis || 'official',
      status: 'info',
      detail: program.recommendations.note || 'This program does not use letters of recommendation.',
      fixWhere: 'recommenders',
    });
  }

  // ── Supplemental application ───────────────────────────────────────────
  if (program.supplemental?.required) {
    rows.push({
      id: 'supplemental',
      label: 'Separate supplemental application',
      requirement: program.supplemental.prompts?.length
        ? `${program.supplemental.prompts.length} additional prompt${program.supplemental.prompts.length === 1 ? '' : 's'}`
        : 'Required',
      yours: null,
      basis: 'official',
      status: 'info',
      detail: program.supplemental.note || 'There is a program application in addition to the university application. Submitting the university application alone does not put you in this program.',
      fixWhere: 'essays',
    });
  }

  return rows;
}

/**
 * A one-line read on where a student stands against one program, computed from
 * the gap rows so the summary can never disagree with the detail.
 *
 * Deliberately conservative: any hard shortfall makes the whole verdict 'short'
 * however many other rows are green, because a floor is a floor.
 */
export function programReadiness(program, facts = {}) {
  const rows = requirementGaps(program, facts);
  const counted = rows.filter(r => ['met', 'short', 'close', 'missing'].includes(r.status));
  const met = counted.filter(r => r.status === 'met').length;
  const short = counted.filter(r => r.status === 'short').length;
  const close = counted.filter(r => r.status === 'close').length;
  const missing = counted.filter(r => r.status === 'missing').length;

  const status = short > 0 ? 'short'
    : close > 0 ? 'close'
    : missing > 0 ? 'unknown'
    : counted.length > 0 ? 'clears' : 'unstated';

  const headline = {
    short: `You are below ${short === 1 ? 'a stated requirement' : `${short} stated requirements`}.`,
    close: 'You are close on every stated requirement, and below none of them.',
    unknown: `We cannot check ${missing === 1 ? 'one requirement' : `${missing} requirements`} — you have not logged the number yet.`,
    clears: 'You clear every requirement this program publishes.',
    unstated: 'This program publishes no numeric requirements to check you against.',
  }[status];

  return { status, headline, met, short, close, missing, checkable: counted.length, rows };
}

// ── 5. Acceptance rates, said honestly ───────────────────────────────────────

/**
 * The acceptance line for a card.
 *
 * The important branch is the last one. Nearly every BS/MD program publishes
 * nothing, and nearly every number in circulation is a consultancy dividing a
 * known class size by a guessed applicant count. Saying "not published" out
 * loud is more useful to a student than any percentage we could put there, and
 * it inoculates them against the percentage they will read somewhere else this
 * evening.
 */
export function acceptanceLine(program) {
  const a = program?.acceptance;
  if (!a) return { text: 'Not published', basis: 'unpublished', meta: BASIS_META.unpublished };
  const meta = BASIS_META[a.basis] || BASIS_META.unpublished;

  if (a.rate != null) {
    return { text: `${(a.rate * 100).toFixed(1)}% admitted`, basis: a.basis, meta, note: a.note };
  }
  if (a.admitted != null || a.enrolled != null) {
    const bits = [
      a.admitted != null ? `${a.admitted} admitted` : null,
      a.enrolled != null ? `${a.enrolled} enrolled` : null,
    ].filter(Boolean);
    return { text: bits.join(' · '), basis: a.basis, meta, note: a.note, countsOnly: true };
  }
  return { text: 'No acceptance rate published', basis: 'unpublished', meta: BASIS_META.unpublished, note: a.note };
}

// ── 6. Interview prep handoff ────────────────────────────────────────────────

/**
 * Where to send a student who is applying somewhere that interviews.
 *
 * This is the link the app was missing. The MMI circuit and the CASPer test
 * were already built and nothing anywhere explained what they were for — a
 * student had to work out for themselves that the module in Interview Prep is
 * the thing to run for the program they are applying to. Now the program says
 * so, and the button carries the intent across (see lib/interviewIntent.js).
 */
export function interviewTargetsFor(program) {
  const out = [];
  if (program?.interview?.required) {
    const key = program.interview.format || null;
    const fmt = key ? INTERVIEW_FORMATS[key] : null;
    if (fmt) {
      out.push({ key, label: fmt.label, short: fmt.short, cta: fmt.cta, mode: fmt.mode, stationFilter: fmt.stationFilter, blurb: fmt.blurb, confirmed: true });
    } else {
      // Unconfirmed format still gets a recommendation, and the recommendation
      // says why it is a hedge. The circuit is the harder version of every
      // format, so an hour on it is never wasted whichever room turns up.
      const mmi = INTERVIEW_FORMATS.mmi;
      out.push({
        key: 'mmi', label: 'Format not confirmed — practice the circuit', short: 'MMI',
        cta: mmi.cta, mode: mmi.mode, stationFilter: mmi.stationFilter,
        blurb: 'This program interviews but does not publish how. The MMI circuit is the harder version of every format, so an hour on it is never wasted whichever room turns up.',
        confirmed: false,
      });
    }
  }
  if (program?.casper === true) {
    const c = INTERVIEW_FORMATS.casper;
    out.push({ key: 'casper', label: c.label, short: c.short, cta: c.cta, mode: c.mode, stationFilter: c.stationFilter, blurb: c.blurb, confirmed: true });
  }
  return out;
}

// ── 7. Browsing ──────────────────────────────────────────────────────────────

const matches = (haystack, q) => String(haystack || '').toLowerCase().includes(q);

/**
 * Filter and order the catalog.
 *
 * Ordering is by deadline urgency, not alphabetically: the thing a student
 * needs from a list of programs is which one closes first, and an alphabetical
 * list buries a November deadline under a name beginning with V.
 */
export function filterPrograms({ pathway = 'all', state = 'all', query = '', includeClosed = false } = {}) {
  const q = String(query || '').trim().toLowerCase();
  return PROGRAMS
    .filter(p => (includeClosed ? true : p.status !== 'closed'))
    .filter(p => (pathway === 'all' ? true : p.pathway === pathway))
    .filter(p => (state === 'all' ? true : p.state === state))
    .filter(p => (!q ? true : matches(p.institution, q) || matches(p.program, q) || matches(p.degree, q) || matches(p.state, q)))
    .map(p => ({ p, dl: nextDeadline(p) }))
    .sort((a, b) => (a.dl?.daysOut ?? 9999) - (b.dl?.daysOut ?? 9999))
    .map(x => x.p);
}

/** The same filters over the discovery roster. */
export function filterRoster({ pathway = 'all', state = 'all', query = '' } = {}) {
  const q = String(query || '').trim().toLowerCase();
  return ROSTER
    .filter(p => (pathway === 'all' ? true : p.pathway === pathway))
    .filter(p => (state === 'all' ? true : p.state === state))
    .filter(p => (!q ? true : matches(p.institution, q) || matches(p.program, q) || matches(p.state, q)))
    .sort((a, b) => a.institution.localeCompare(b.institution));
}

/** Programs whose next deadline is inside `days`, soonest first. The board at the top of the page. */
export function closingSoon(days = 120, today = new Date()) {
  return PROGRAMS
    .filter(p => p.status !== 'closed')
    .map(p => ({ program: p, dl: nextDeadline(p, today) }))
    .filter(r => r.dl?.daysOut != null && r.dl.daysOut <= days)
    .sort((a, b) => a.dl.daysOut - b.dl.daysOut);
}

/** Everything in the catalog that has gone stale, for the maintenance banner and the verifier. */
export function staleEntries(today = new Date()) {
  return PROGRAMS.filter(p => verificationStatus(p, today).stale);
}

/** Catalog counts for the section header. */
export function catalogSummary() {
  const byPathway = {};
  for (const p of [...PROGRAMS, ...ROSTER]) byPathway[p.pathway] = (byPathway[p.pathway] || 0) + 1;
  return {
    detailed: PROGRAMS.filter(p => p.status !== 'closed').length,
    roster: ROSTER.length,
    total: PROGRAMS.filter(p => p.status !== 'closed').length + ROSTER.length,
    states: new Set([...PROGRAMS, ...ROSTER].map(p => p.state)).size,
    byPathway,
    pathwayLabel: (id) => PATHWAY_BY_ID[id]?.label || id,
  };
}

export { PROGRAM_BY_ID };
