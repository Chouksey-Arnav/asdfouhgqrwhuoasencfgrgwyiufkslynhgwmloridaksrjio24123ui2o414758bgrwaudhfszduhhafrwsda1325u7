// ─────────────────────────────────────────────────────────────────────────────
// Asking an adult for a letter — the roles, the emails, the lead time, and the
// evidence that makes the ask land.
//
// ── The problem this module exists to solve ─────────────────────────────────
// Most teenagers have never asked a professional adult for anything. The ask
// feels enormous and presumptuous, so it gets postponed — and the postponement
// is the entire failure. A physician asked six weeks out writes a specific
// letter about a specific student. The same physician asked eleven days out
// either declines or writes four generic sentences in twenty minutes. Nothing
// about the student changed; only the notice did.
//
// So this module treats the fear as the actual problem rather than as a
// scheduling issue, and attacks it three ways:
//
//   1. THE WORDS ARE ALREADY WRITTEN. Every role has a complete, sendable
//      email. Not a "template with blanks to fill in" — a real email with the
//      student's own logged hours already in it, which they read, edit and
//      send. The blank page is most of the fear.
//   2. THE ASK IS BACKED BY EVIDENCE THE STUDENT ALREADY HAS. If they logged
//      forty hours with Dr. Patel, the email says forty hours with Dr. Patel,
//      over these dates, at this site. A shadowing physician who has had two
//      hundred students cannot remember which one this is; the summary is what
//      makes the letter specific, and handing it over is the single most useful
//      thing you can do for someone writing about you.
//   3. THE LEAD TIME IS ENFORCED AS A NUDGE, NOT A RULE. One month minimum.
//      Below it the panel says so plainly and changes the email to acknowledge
//      the short notice, because a short-notice ask that pretends otherwise is
//      worse than one that apologises for itself.
//
// ── Purity ──────────────────────────────────────────────────────────────────
// Everything here is pure: rows and a date in, strings and objects out. No
// React, no network, no implicit `new Date()` — every function that needs today
// takes it as a parameter, so scripts/verifyRecommenders.mjs can test the
// lead-time boundaries at exact days rather than around whenever it runs.
// ─────────────────────────────────────────────────────────────────────────────

/** Below this, the panel warns and the email acknowledges the short notice. */
export const MIN_LEAD_DAYS = 30;
/** The notice a letter deserves when there is time to give it. */
export const IDEAL_LEAD_DAYS = 60;
/** After this long with no answer, a follow-up is normal rather than pushy. */
export const FOLLOW_UP_DAYS = 10;

export const STATUSES = ['Planning to ask', 'Asked', 'Confirmed', 'Submitted'];

/**
 * Who actually writes letters for a health-pathway student.
 *
 * The original list was a school list — teacher, counselor, coach — which is
 * the right list for a general college application and misses everyone who has
 * seen this particular student do the thing they are applying to do. A physics
 * teacher can say they are bright. The volunteer coordinator who watched them
 * turn up at the free clinic every Saturday for two years can say something no
 * teacher is in a position to say, and it is the thing the reader is looking
 * for.
 *
 * `evidenceFrom` names which Portfolio log backs this role's ask, which is what
 * lets `hoursForRecommender` attach real numbers to the email.
 */
export const RECOMMENDER_ROLES = [
  {
    id: 'teacher',
    label: 'Teacher',
    short: 'Teacher',
    evidenceFrom: null,
    whatTheyCanSay: 'How you think, how you handle difficulty, and what you are like in a room with twenty other people. A science teacher who has taught you for two years is the strongest academic letter you can get.',
    whoCounts: 'A teacher who has taught you recently, ideally in a subject related to your pathway, and who has actually seen you struggle with something and keep going.',
    leadDaysAdvice: 'Ask before the end of junior year if you can. Teachers write dozens of these in the autumn and the ones they agree to first get the most time.',
    commonMistake: 'Picking the teacher who gave you the highest grade rather than the one who knows you. An A from someone who cannot describe you is a weaker letter than a B from someone who can.',
  },
  {
    id: 'counselor',
    label: 'School counselor',
    short: 'Counselor',
    evidenceFrom: null,
    whatTheyCanSay: 'Your record in context — how hard your course load was for your school, what you did with what was available to you.',
    whoCounts: 'Your assigned counselor. Most applications require this one and you do not choose it.',
    leadDaysAdvice: 'Follow your school\'s process and its deadline, which is usually earlier than the college\'s.',
    commonMistake: 'Assuming they know you. Most counselors carry hundreds of students — send them your activities list and hours totals whether they ask for it or not.',
  },
  {
    id: 'shadowing-physician',
    label: 'Physician or clinician you shadowed',
    short: 'Shadowing physician',
    evidenceFrom: 'shadowing',
    whatTheyCanSay: 'That you have actually seen the job — not the idea of it — and did not flinch. A clinician saying "this student watched a full clinic day and asked good questions afterwards" is worth more than any essay claiming the same thing.',
    whoCounts: 'A physician, dentist, PA, NP or pharmacist you shadowed for enough hours that they would recognize you. Below about ten hours across at least two visits, most will decline, and they are right to.',
    leadDaysAdvice: 'Six weeks minimum. Clinicians are the busiest people who will ever write for you and they do not check email between patients.',
    commonMistake: 'Asking after a single afternoon. Shadow, then keep in touch — a short "here is what I took away from the day" email the week after is what makes the ask possible six months later.',
  },
  {
    id: 'research-mentor',
    label: 'Research mentor',
    short: 'Research mentor',
    evidenceFrom: 'research',
    whatTheyCanSay: 'Whether you can work on a problem that does not resolve, whether your results were trustworthy, and whether they would take you back. For any research-heavy program this is the letter that decides it.',
    whoCounts: 'The PI, postdoc or graduate student who actually supervised your bench or field work. The person who supervised you day to day usually writes a better letter than the professor whose name is on the lab.',
    leadDaysAdvice: 'Two months. Academic writers are slower than clinical ones and are frequently away.',
    commonMistake: 'Asking the famous name instead of the person who watched you work. A specific letter from a postdoc beats a vague one from a department head.',
  },
  {
    id: 'volunteer-coordinator',
    label: 'Volunteer coordinator',
    short: 'Volunteer coordinator',
    evidenceFrom: 'volunteer',
    whatTheyCanSay: 'That you turned up. Consistently, over years, when it was inconvenient, and that patients or clients were better for it. This is the letter that speaks to the thing every health profession is actually selecting for and no transcript shows.',
    whoCounts: 'The person who runs the volunteer program at your hospital, free clinic, hospice, food bank or care home — the one who signs your hours off.',
    leadDaysAdvice: 'One month is genuinely enough here, and they are usually delighted to be asked.',
    commonMistake: 'Not asking at all, because it does not feel like a "real" letter. It is frequently the most convincing one in the file.',
  },
  {
    id: 'clinical-supervisor',
    label: 'Clinical supervisor or employer',
    short: 'Clinical supervisor',
    evidenceFrom: 'clinical',
    whatTheyCanSay: 'That you did the job. If you worked as a CNA, EMT, scribe, pharmacy technician or dental assistant, this is a professional reference about paid responsibility, which is a different and stronger claim than anything a school can make about you.',
    whoCounts: 'Your charge nurse, shift supervisor, lead scribe or practice manager — whoever signed your timesheet and saw your work.',
    leadDaysAdvice: 'One month, and ask in person at the end of a shift rather than by email if you can. The email is the follow-up.',
    commonMistake: 'Leaving a job without asking. Ask while you still work there — a supervisor writes a far better letter about someone currently in front of them.',
  },
  {
    id: 'committee',
    label: 'Pre-health committee',
    short: 'Committee',
    evidenceFrom: null,
    whatTheyCanSay: 'A single institutional letter that packages and interprets all the others. Some universities require you to go through theirs; a few programs will not read individual letters if a committee letter exists.',
    whoCounts: 'Your school or university\'s pre-health advising office. This is a process with its own internal deadlines, usually in the spring before you apply.',
    leadDaysAdvice: 'Whatever the committee says, plus a month. Their deadlines are real and they do not move.',
    commonMistake: 'Discovering it exists in September. Ask the advising office in your first year what their process and timeline is.',
  },
  {
    id: 'other',
    label: 'Someone else',
    short: 'Other',
    evidenceFrom: null,
    whatTheyCanSay: 'It depends entirely on who they are — a coach, an employer outside healthcare, a religious or community leader. The test is whether they can describe something specific you did that nobody else can.',
    whoCounts: 'Anyone who has supervised you at something that mattered. Not a family friend, not a relative, and not someone impressive who barely knows you.',
    leadDaysAdvice: 'One month minimum, like everyone else.',
    commonMistake: 'The "famous person who met me once" letter. Every admissions reader has seen a hundred and they count for nothing.',
  },
];

export const ROLE_BY_ID = Object.fromEntries(RECOMMENDER_ROLES.map(r => [r.id, r]));

/** The label stored in the row's `relationship` column, and the round trip back. */
export const ROLE_LABELS = RECOMMENDER_ROLES.map(r => r.label);

/**
 * The labels the old picker offered, mapped onto the roles that replaced them.
 *
 * Rows created before this rewrite carry free text like 'Physician/Health
 * Professional Shadowed'. Falling those through to 'Other' would be silent and
 * expensive: 'Other' has no `evidenceFrom`, so a real shadowing physician would
 * lose the hours link that makes the whole ask work. Stated as an explicit map
 * rather than inferred from substrings, because a substring rule that happens
 * to work today breaks the first time a role is renamed.
 */
const LEGACY_RELATIONSHIPS = {
  'physician/health professional shadowed': 'shadowing-physician',
  'research mentor': 'research-mentor',
  'employer/supervisor': 'clinical-supervisor',
  supervisor: 'clinical-supervisor',
  counselor: 'counselor',
  counsellor: 'counselor',
  coach: 'other',
  teacher: 'teacher',
};

export function roleFromRelationship(relationship) {
  const label = String(relationship || '').trim();
  const exact = RECOMMENDER_ROLES.find(r => r.label === label);
  if (exact) return exact;
  const legacy = LEGACY_RELATIONSHIPS[label.toLowerCase()];
  return (legacy && ROLE_BY_ID[legacy]) || ROLE_BY_ID.other;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dates and lead time
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' → epoch ms at local midnight, or null. */
export function parseDay(value) {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export function daysBetween(fromMs, toMs) {
  if (fromMs == null || toMs == null) return null;
  return Math.round((toMs - fromMs) / DAY_MS);
}

/**
 * Where one recommender stands on time.
 *
 * @returns {{
 *   level: 'ok'|'tight'|'urgent'|'overdue'|'waiting'|'done'|'unknown',
 *   daysUntilDue: number|null, daysSinceAsked: number|null,
 *   message: string, shortNotice: boolean, needsFollowUp: boolean
 * }}
 *
 * `shortNotice` is the one the email generator reads: below MIN_LEAD_DAYS the
 * draft acknowledges it rather than pretending the notice is normal.
 */
export function leadTimeStatus(entry, todayMs = Date.now()) {
  const due = parseDay(entry?.due_date);
  const asked = parseDay(entry?.asked_at);
  const status = entry?.status || STATUSES[0];
  const today = new Date(todayMs);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const daysUntilDue = due == null ? null : daysBetween(todayMidnight, due);
  const daysSinceAsked = asked == null ? null : daysBetween(asked, todayMidnight);

  if (status === 'Submitted') {
    return { level: 'done', daysUntilDue, daysSinceAsked, shortNotice: false, needsFollowUp: false,
      message: 'Submitted. Send a thank-you — it costs you five minutes and it is the reason they say yes to the next student.' };
  }

  const asked_ = status === 'Asked' || status === 'Confirmed';

  if (status === 'Confirmed') {
    const m = daysUntilDue == null
      ? 'They said yes. Send them your hours summary and your deadline if you have not already.'
      : daysUntilDue < 0
        ? 'They said yes but the deadline has passed. Check whether it actually went in — a confirmed letter is not a submitted one.'
        : daysUntilDue <= 7
          ? `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}. A short, polite reminder now is expected, not pushy.`
          : `Due in ${daysUntilDue} days. Nothing to do yet — remind them a week out.`;
    return { level: daysUntilDue != null && daysUntilDue <= 7 ? 'tight' : 'waiting',
      daysUntilDue, daysSinceAsked, shortNotice: false, needsFollowUp: false, message: m };
  }

  if (status === 'Asked') {
    const needsFollowUp = daysSinceAsked != null && daysSinceAsked >= FOLLOW_UP_DAYS;
    return {
      level: needsFollowUp ? 'urgent' : 'waiting',
      daysUntilDue, daysSinceAsked, shortNotice: false, needsFollowUp,
      message: daysSinceAsked == null
        ? 'Asked, but we do not know when. Set the date you asked so we can tell you when a follow-up is due.'
        : needsFollowUp
          ? `You asked ${daysSinceAsked} days ago and they have not confirmed. Following up after ${FOLLOW_UP_DAYS} days is normal — busy people lose emails, and silence is almost never a no.`
          : `Asked ${daysSinceAsked} day${daysSinceAsked === 1 ? '' : 's'} ago. Give them a week before you follow up.`,
    };
  }

  // Not asked yet — the state the whole lead-time rule is about.
  if (daysUntilDue == null) {
    return { level: 'unknown', daysUntilDue, daysSinceAsked, shortNotice: false, needsFollowUp: false,
      message: 'No deadline set yet. Add one — the whole point of tracking this is knowing how much notice you are giving them.' };
  }
  if (daysUntilDue < 0) {
    return { level: 'overdue', daysUntilDue, daysSinceAsked, shortNotice: true, needsFollowUp: false,
      message: `The deadline was ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} ago and you have not asked. If the application is still open, ask today and say plainly that the notice is short.` };
  }
  if (daysUntilDue < MIN_LEAD_DAYS) {
    return { level: 'urgent', daysUntilDue, daysSinceAsked, shortNotice: true, needsFollowUp: false,
      message: `Due in ${daysUntilDue} days — under the month a letter deserves. Ask today. Use the short-notice version of the email below, which says so up front; a rushed ask that pretends to be a normal one is the version people decline.` };
  }
  if (daysUntilDue < IDEAL_LEAD_DAYS) {
    return { level: 'tight', daysUntilDue, daysSinceAsked, shortNotice: false, needsFollowUp: false,
      message: `Due in ${daysUntilDue} days. That clears the one-month minimum, but two months is what gets you a letter someone actually thought about. Send it this week.` };
  }
  return { level: 'ok', daysUntilDue, daysSinceAsked, shortNotice: false, needsFollowUp: false,
    message: `Due in ${daysUntilDue} days. Good notice — this is the position you want to be in. Ask now while it is comfortable rather than in October when it will not be.` };
}

/** The rows that need something done, worst first — the panel's nudge strip. */
export function needsAttention(entries = [], todayMs = Date.now()) {
  const RANK = { overdue: 0, urgent: 1, tight: 2, unknown: 3, waiting: 4, ok: 5, done: 6 };
  return entries
    .map(e => ({ entry: e, status: leadTimeStatus(e, todayMs) }))
    .filter(x => ['overdue', 'urgent', 'tight'].includes(x.status.level) || x.status.needsFollowUp)
    .sort((a, b) => (RANK[a.status.level] - RANK[b.status.level])
      || ((a.status.daysUntilDue ?? 9999) - (b.status.daysUntilDue ?? 9999)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Linking a recommender to the hours the student logged with them
// ─────────────────────────────────────────────────────────────────────────────

const norm = (s) => String(s || '').toLowerCase().replace(/^(dr\.?|prof\.?|professor|mr\.?|mrs\.?|ms\.?|miss)\s+/i, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Whether a supervisor/mentor name on a logged entry is the same person as a
 * recommender.
 *
 * Deliberately conservative. A student types "Dr. Patel" in the hours log and
 * "Anjali Patel" in the recommender tracker, so an exact match finds nothing;
 * but matching on a shared surname alone would attach one student's hours to
 * the wrong Patel. The rule is: identical after normalisation, or one is a
 * strict subset of the other's words AND that overlap includes a word longer
 * than three characters. "Patel" matches "Anjali Patel"; "Dr. A" matches
 * nothing.
 */
export function samePerson(a, b) {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const xs = new Set(x.split(' '));
  const ys = new Set(y.split(' '));
  const smaller = xs.size <= ys.size ? xs : ys;
  const bigger = xs.size <= ys.size ? ys : xs;
  for (const w of smaller) if (!bigger.has(w)) return false;
  return [...smaller].some(w => w.length > 3);
}

/**
 * Everything in the Portfolio that this person supervised.
 *
 * @param {object} entry     a recommenders row
 * @param {object} snapshot  { clinicalHours, research, activities }
 * @returns {{
 *   totalHours: number, entries: Array, research: Array, activities: Array,
 *   sites: string[], specialties: string[], firstDate: string|null, lastDate: string|null,
 *   shadowingHours: number, handsOnHours: number, visits: number
 * }}
 *
 * Returned even when empty, so callers can say "we found nothing under that
 * name — check the spelling in your hours log" rather than silently offering an
 * email with no evidence in it.
 */
export function hoursForRecommender(entry, snapshot = {}) {
  const name = entry?.name;
  const clinical = (snapshot.clinicalHours || []).filter(h => samePerson(h.supervisor_name, name));
  const research = (snapshot.research || []).filter(r => samePerson(r.mentor_name, name));
  const activities = (snapshot.activities || []).filter(a => samePerson(a.verifier_name, name));

  const dates = clinical.map(h => h.entry_date).filter(Boolean).sort();
  const hoursOf = (kind) => clinical.filter(h => h.experience_kind === kind)
    .reduce((s, h) => s + (Number(h.hours) || 0), 0);

  return {
    totalHours: clinical.reduce((s, h) => s + (Number(h.hours) || 0), 0)
      + research.reduce((s, r) => s + (Number(r.hours) || 0), 0),
    clinicalHours: clinical.reduce((s, h) => s + (Number(h.hours) || 0), 0),
    shadowingHours: hoursOf('shadowing'),
    handsOnHours: hoursOf('hands-on'),
    visits: clinical.length,
    entries: clinical,
    research,
    activities,
    sites: [...new Set(clinical.map(h => h.site_name).filter(Boolean))],
    specialties: [...new Set(clinical.map(h => h.site_type).filter(Boolean))],
    firstDate: dates[0] || null,
    lastDate: dates[dates.length - 1] || null,
  };
}

const fmtDate = (d) => {
  const ms = parseDay(d);
  return ms == null ? null : new Date(ms).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

/**
 * The summary a student sends the person writing about them.
 *
 * ── Why this is the single most useful thing in this module ─────────────────
 * The letter-writer's problem is not willingness, it is recall. A physician who
 * has hosted two hundred students genuinely cannot remember which one asked the
 * good question about the patient with the ankle. Handing them the dates, the
 * sites, the hours and what you did turns "a nice student shadowed me" into a
 * letter with specifics in it — and specifics are the entire difference between
 * a letter that helps and one that does not.
 *
 * It is plain text on purpose: it gets pasted into an email, and every piece of
 * formatting is one more thing to strip out.
 */
export function buildMentorSummary(entry, snapshot = {}, { studentName = null } = {}) {
  const link = hoursForRecommender(entry, snapshot);
  const lines = [];
  const who = studentName || 'the student';

  lines.push(`WHAT WE DID TOGETHER — ${studentName || 'summary'}`);
  lines.push('');

  if (link.entries.length) {
    const span = link.firstDate && link.lastDate && link.firstDate !== link.lastDate
      ? `${fmtDate(link.firstDate)} to ${fmtDate(link.lastDate)}`
      : fmtDate(link.firstDate);
    lines.push(`Total time with you: ${link.clinicalHours} hours across ${link.visits} visit${link.visits === 1 ? '' : 's'}${span ? `, ${span}` : ''}.`);
    if (link.sites.length) lines.push(`Where: ${link.sites.join(', ')}.`);
    if (link.specialties.length) lines.push(`Setting: ${link.specialties.join(', ')}.`);
    if (link.shadowingHours) lines.push(`Of that, ${link.shadowingHours} hours observing.`);
    if (link.handsOnHours) lines.push(`Of that, ${link.handsOnHours} hours hands-on.`);
    lines.push('');
    lines.push('Session by session:');
    link.entries
      .slice()
      .sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date)))
      .forEach(h => {
        const bits = [fmtDate(h.entry_date), h.site_name, `${h.hours || 0} hrs`].filter(Boolean);
        lines.push(`  • ${bits.join(' · ')}${h.notes ? ` — ${h.notes}` : ''}`);
      });
    lines.push('');
  }

  if (link.research.length) {
    lines.push('Research with you:');
    link.research.forEach(r => {
      const bits = [r.title, r.institution, r.hours ? `${r.hours} hrs` : null, r.status].filter(Boolean);
      lines.push(`  • ${bits.join(' · ')}${r.description ? ` — ${r.description}` : ''}`);
    });
    lines.push('');
  }

  if (link.activities.length) {
    lines.push('Other work you supervised:');
    link.activities.forEach(a => {
      const bits = [a.position, a.organization, a.status].filter(Boolean);
      lines.push(`  • ${bits.join(' · ')}${a.description ? ` — ${a.description}` : ''}`);
    });
    lines.push('');
  }

  if (!link.entries.length && !link.research.length && !link.activities.length) {
    lines.push(`We could not find any logged hours under this name, so there is nothing to summarize yet.`);
    lines.push(`If you did work with ${entry?.name || 'them'}, check that the supervisor name on those entries in your hours log matches the name here — the match is by name.`);
    lines.push('');
  }

  lines.push('Every hour above is from a log kept as it happened, not reconstructed afterwards.');
  if (who) lines.push('');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// The emails
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A complete, sendable email for one kind of message to one recommender.
 *
 * ── Why these are written out in full rather than as fill-in-the-blank ──────
 * A template with five bracketed blanks is a form, and a form is a blank page
 * with extra steps. What a frightened sixteen-year-old needs is to read a real
 * email, recognize that it is polite and ordinary and not presumptuous at all,
 * change two sentences to sound like themselves, and press send. Anything they
 * cannot send as-is, they will not send.
 *
 * The one thing deliberately left as a bracket is the personal specific — what
 * they actually took away from working with this person. That cannot be
 * generated and should not be: a letter request whose one specific detail was
 * written by software is the exact thing this whole feature is against.
 *
 * @returns {{ id, label, subject, body, note }}
 */
export function emailTemplates(entry, snapshot = {}, opts = {}) {
  const { studentName = null, todayMs = Date.now(), gradeLabel = null } = opts;
  const role = roleFromRelationship(entry?.relationship);
  const status = leadTimeStatus(entry, todayMs);
  const link = hoursForRecommender(entry, snapshot);
  const them = String(entry?.name || '').trim() || 'there';
  const me = studentName || '[your name]';
  const dueLabel = fmtDate(entry?.due_date);
  const sign = `\n\nThank you for considering it,\n${me}${gradeLabel ? `\n${gradeLabel}` : ''}`;

  // The one line that makes the ask concrete, built from their own log.
  const evidence = link.clinicalHours
    ? `I shadowed you for ${link.clinicalHours} hours across ${link.visits} visit${link.visits === 1 ? '' : 's'}${link.sites.length ? ` at ${link.sites.join(' and ')}` : ''}${link.firstDate ? `, between ${fmtDate(link.firstDate)} and ${fmtDate(link.lastDate)}` : ''}.`
    : link.research.length
      ? `I worked with you on ${link.research.map(r => r.title).filter(Boolean).join(' and ') || 'your project'}${link.research.some(r => r.hours) ? `, around ${link.research.reduce((s, r) => s + (Number(r.hours) || 0), 0)} hours` : ''}.`
      : link.activities.length
        ? `I worked with you on ${link.activities.map(a => a.position || a.organization).filter(Boolean).join(' and ')}.`
        : null;

  const noticeLine = status.shortNotice
    ? `I know this is short notice — the deadline is ${dueLabel || 'coming up soon'} — and I completely understand if that is not possible. If it is easier to say no, please do; I would much rather that than put you under pressure.`
    : dueLabel
      ? `The deadline is ${dueLabel}, so there is plenty of time, and I can send anything that would help.`
      : `I do not have a hard deadline yet — I will send it as soon as I do, and there is no rush at all.`;

  const askBody = [
    `Dear ${them},`,
    '',
    role.id === 'teacher' || role.id === 'counselor'
      ? `I am ${me}, in your ${'[class/year]'}. I am applying to ${'[program or type of program]'} and I am writing to ask whether you would be willing to write me a letter of recommendation.`
      : `I am ${me}. ${evidence || `I worked with you at ${'[where]'}.`} I am applying to ${'[program or type of program]'}, and I am writing to ask whether you would be willing to write me a letter of recommendation.`,
    '',
    `[One or two sentences here about what you actually took away from working with them — something specific you saw or learned that you would not have got anywhere else. This is the part that has to be yours; nobody can write it for you, and it is the sentence that decides whether they say yes.]`,
    '',
    noticeLine,
    '',
    link.totalHours
      ? `To make it easier, I have put together a short summary of the hours and dates we worked together and what I did — I can send it across, and I am happy to send my activities list or anything else that would be useful.`
      : `If it would help, I am happy to send a summary of my activities, hours and what I am applying to.`,
    '',
    sign.trim(),
  ].join('\n');

  const followUpBody = [
    `Dear ${them},`,
    '',
    `I hope you are well. I wrote ${status.daysSinceAsked != null ? `about ${status.daysSinceAsked} days ago` : 'recently'} to ask whether you would be able to write me a letter of recommendation, and I wanted to check the message reached you — I know how easily email gets buried.`,
    '',
    dueLabel
      ? `The deadline is ${dueLabel}. If you are able to, that would mean a great deal; if you are not, please just say so and there are absolutely no hard feelings — I would rather know now than have you feel cornered.`
      : `If you are able to, that would mean a great deal; if you are not, please just say so and there are absolutely no hard feelings.`,
    '',
    `Either way, thank you for the time you already gave me.`,
    '',
    sign.trim(),
  ].join('\n');

  const summaryBody = [
    `Dear ${them},`,
    '',
    `Thank you again for agreeing to write for me — it genuinely matters.`,
    '',
    `I have put together everything we did together in case it is useful when you write. I know you have had a lot of students through, and I would rather hand you the details than expect you to remember them.`,
    '',
    buildMentorSummary(entry, snapshot, { studentName }),
    '',
    dueLabel ? `The deadline is ${dueLabel}. Please tell me if you need anything else at all — a CV, my personal statement draft, or the submission link.` : `Please tell me if you need anything else — a CV, my personal statement draft, or the submission link.`,
    '',
    `Thank you,`,
    me,
  ].join('\n');

  const thanksBody = [
    `Dear ${them},`,
    '',
    `Your letter has gone in — thank you. I know writing one properly takes real time, and I do not take it for granted.`,
    '',
    `[One line on where things stand or what happens next.]`,
    '',
    `I will let you know how it turns out. Thank you again for ${evidence ? 'the time you gave me' : 'everything'}.`,
    '',
    `With thanks,`,
    me,
  ].join('\n');

  return [
    {
      id: 'ask',
      label: status.shortNotice ? 'The ask (short notice)' : 'The ask',
      subject: `Letter of recommendation — ${me}`,
      body: askBody,
      note: status.shortNotice
        ? 'This version says plainly that the notice is short and gives them an easy way to decline. That is not weakness — it is the thing that makes a rushed ask acceptable to a professional, and pretending the timing is normal is what gets a no.'
        : 'Send it, then update the status here so we can tell you when a follow-up is due. The bracketed sentence is the only part that has to be yours, and it is the part that matters.',
    },
    {
      id: 'follow-up',
      label: 'Follow-up (no reply yet)',
      subject: `Re: Letter of recommendation — ${me}`,
      body: followUpBody,
      note: `Send this about ${FOLLOW_UP_DAYS} days after the ask. Following up is normal and expected — busy people lose emails, and silence is almost never a no.`,
    },
    {
      id: 'summary',
      label: 'Send them your hours summary',
      subject: `What we worked on together — ${me}`,
      body: summaryBody,
      note: link.totalHours
        ? 'Built from your own logged hours. This is the single most useful thing you can hand someone writing about you: it turns "a nice student shadowed me" into a letter with dates and specifics in it.'
        : 'We found no logged hours under this name, so this is mostly empty. Check the supervisor name in your hours log matches the name on this recommender — the link is by name.',
    },
    {
      id: 'thanks',
      label: 'Thank you (after it goes in)',
      subject: `Thank you — ${me}`,
      body: thanksBody,
      note: 'Costs five minutes and is the reason they say yes to the next student who asks. Send it.',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Whether a program uses letters at all
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What a program says about letters of recommendation.
 *
 * ── Why "we don't know" is a first-class answer here ────────────────────────
 * Almost every selective application in the country runs on letters, so a
 * program that does NOT use them is genuinely surprising and genuinely costly
 * to miss: a student spends weeks cultivating a recommender the program will
 * never read. That is the case worth shouting about.
 *
 * But the inverse error is worse. Telling a student "letters not required" for
 * a program whose page we have not read means they do not ask, and they find
 * out in October. So an unread program returns `used: null` and says so —
 * "we have not confirmed this, check the program's page" — rather than
 * defaulting either way. The combined-degree catalog is written under the same
 * rule (see src/data/combinedDegreePrograms.js).
 *
 * @returns {{ used: boolean|null, basis: string, note: string, verdict: string }}
 */
export function lettersPolicyFor(program) {
  const rec = program?.recommendations;
  if (rec && rec.used === false) {
    return {
      used: false,
      basis: rec.basis || 'official',
      note: rec.note || 'This program does not use letters of recommendation.',
      verdict: 'Does not use letters',
    };
  }
  if (rec && rec.used === true) {
    return {
      used: true,
      basis: rec.basis || 'official',
      note: rec.note || 'This program uses letters of recommendation.',
      count: rec.count ?? null,
      verdict: rec.count ? `${rec.count} letters required` : 'Uses letters',
    };
  }
  return {
    used: null,
    basis: 'unpublished',
    note: 'We have not confirmed this program\'s letter requirement against its own admissions page. Assume it wants letters — nearly all do — but check before you decide how many recommenders to line up, and tell us if you find out.',
    verdict: 'Not confirmed',
  };
}

/**
 * Letter policy across everything the student is tracking, so the panel can
 * say "two of your five programs do not read letters" in one line.
 */
export function lettersPolicySummary(trackedPrograms = []) {
  const rows = trackedPrograms.map(p => ({
    program: p,
    policy: lettersPolicyFor(p),
  }));
  return {
    rows,
    notUsed: rows.filter(r => r.policy.used === false),
    used: rows.filter(r => r.policy.used === true),
    unknown: rows.filter(r => r.policy.used === null),
  };
}
