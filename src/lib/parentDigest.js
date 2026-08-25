// The Medabrain read on a student's week, written for the parent.
//
// ── Why this is templates and not a model call ──────────────────────────────
// Every other Medabrain surface in this app has the same split: instant, template-based reactions
// for the small stuff (see medabrainComments.jsx) and real Groq reasoning where the reasoning is
// the point. This is firmly on the template side, and not only for latency. The output is a
// characterisation of somebody's child, delivered to their parent, from numbers alone — a model
// that confabulates one sentence here ("they seem to have lost interest in medicine") does damage
// no rate limit or retry can undo. Templates cannot say anything nobody wrote down.
//
// ── What it is allowed to say ───────────────────────────────────────────────
// Three rules, and they are the whole design:
//
//   1. NEVER INSTRUCT THE PARENT TO APPLY PRESSURE. The suggestion is always something to say or
//      ask, never something to enforce. A dashboard that generates homework enforcement turns the
//      app into the reason for an argument, and the student's response is to stop using it
//      honestly — which destroys the data this page is built from.
//   2. NEVER INFER MOTIVE FROM ABSENCE. A quiet week is a quiet week. It is not "losing interest",
//      "struggling", or "distracted" — those are guesses about a person from a row count, and a
//      parent will act on them as if they were findings.
//   3. NAME THE NUMBER IT IS READING. Every line points at something visible elsewhere on the page,
//      so a parent can check the claim rather than trust it.

/** Tone drives the accent color of the card; it is deliberately never worse than 'steady'. */
const TONE = { strong: 'strong', steady: 'steady', quiet: 'quiet', new: 'new' };

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Reads a parent summary and returns { tone, headline, body, suggestion }.
 *
 * Total: every branch returns a complete digest, including for a student who has never opened the
 * app. There is no null return, because a caller that has to handle "no digest" will render an
 * empty card, and an empty card on a parent dashboard reads as "something is wrong with my child's
 * account".
 */
export function buildParentDigest(summary) {
  const effort = summary?.effort || {};
  const work = summary?.coursework || {};
  const quizzes = work.quizzes || {};
  const testing = summary?.testing || null;
  const name = summary?.student?.name?.split(' ')[0] || 'They';

  const days7 = effort.activeDaysLast7 || 0;
  const days28 = effort.activeDaysLast28 || 0;
  const everStarted = !!effort.lastActiveAt || !!quizzes.taken || !!work.lessonsStarted;

  // ── Never started ────────────────────────────────────────────────────────
  // The single most important branch to get right, because it is where a parent is most likely to
  // arrive worried and most likely to be wrong: a student who signed up yesterday has no data, and
  // no data is not a finding.
  if (!everStarted) {
    return {
      tone: TONE.new,
      headline: 'Nothing to report yet',
      body: `${name} hasn't started studying in the app yet, so there's nothing here to read into — this page fills in on its own within a few minutes of their first session.`,
      suggestion: 'Nothing to do. If they signed up recently, give it a week before this page means anything.',
    };
  }

  const parts = [];
  parts.push(days7 > 0
    ? `${name} studied on ${plural(days7, 'day', 'days')} in the last week`
    : `${name} hasn't studied in the last week`);
  if (days28) parts.push(`${days28} of the last 28`);
  const activityLine = `${parts.join(', and ')}.`;

  const outcomes = [];
  if (quizzes.taken) {
    outcomes.push(`${plural(quizzes.taken, 'quiz', 'quizzes')} averaging ${quizzes.averageScore}%`);
  }
  if (work.lessonsVerified) outcomes.push(`${plural(work.lessonsVerified, 'lesson', 'lessons')} passed`);
  if (testing?.total) {
    outcomes.push(testing.change != null && testing.change !== 0
      ? `a practice test at ${testing.total} (${testing.change > 0 ? 'up' : 'down'} ${Math.abs(testing.change)} from the one before)`
      : `a practice test at ${testing.total}`);
  }
  const outcomeLine = outcomes.length ? `So far: ${outcomes.join(', ')}.` : '';

  // ── Quiet ────────────────────────────────────────────────────────────────
  // Stated as a fact with no explanation attached, and the suggestion is a question rather than a
  // prompt. "Ask what they're working on" and "ask why they've stopped" are the same information
  // request and completely different conversations.
  if (days7 === 0) {
    return {
      tone: TONE.quiet,
      headline: days28 > 0 ? 'A quiet week' : 'Quiet for a while',
      body: `${activityLine}${outcomeLine ? ` ${outcomeLine}` : ''}`,
      suggestion: days28 > 0
        ? `Worth a light "what are you working on at the moment?" — quiet weeks happen, and they usually pick back up on their own.`
        : `If you haven't talked about it in a while, ask what they'd want help with. Nothing here says anything about why it's been quiet.`,
    };
  }

  // ── Strong ───────────────────────────────────────────────────────────────
  // Judged on days studied in the last week and month, never on a consecutive-day count. Four
  // days a week is the habit worth naming; whether those four happened to be contiguous says
  // more about a student's sports season or shift schedule than about their commitment.
  if (days7 >= 4) {
    return {
      tone: TONE.strong,
      headline: 'Consistent week',
      body: `${activityLine}${outcomeLine ? ` ${outcomeLine}` : ''}`,
      // Specific praise beats general praise by a wide margin, and it is the one thing on this
      // page a parent can act on that has no downside for the student.
      suggestion: quizzes.trend > 0
        ? `Their recent quiz scores are up ${quizzes.trend} points on earlier ones — worth mentioning, specifically. "Your quiz scores are climbing" lands better than "well done".`
        : `Worth naming out loud. Showing up ${days7} days in a week is the part that actually compounds.`,
    };
  }

  // ── Steady ───────────────────────────────────────────────────────────────
  return {
    tone: TONE.steady,
    headline: 'Ticking along',
    body: `${activityLine}${outcomeLine ? ` ${outcomeLine}` : ''}`,
    suggestion: quizzes.trend != null && quizzes.trend < 0
      ? `Their recent quiz scores are ${Math.abs(quizzes.trend)} points below earlier ones. That is normal when the material gets harder — a good moment to ask what's felt tricky lately, not to push for more hours.`
      : `Nothing here needs intervening in. If you want a way in, ask which subject they're finding hardest right now.`,
  };
}
