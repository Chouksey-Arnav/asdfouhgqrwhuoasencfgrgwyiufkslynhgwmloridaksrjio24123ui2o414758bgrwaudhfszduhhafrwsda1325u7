// ─────────────────────────────────────────────────────────────────────────────
// LAYER 5 — which round you apply in.
//
// ── Bias #4: everyone ignores this ──────────────────────────────────────────
// Chancing tools ask for your GPA, your scores and your activities, and then
// give you one number — as if applying Early Decision and applying Regular
// Decision to the same school were the same event. They are not, and the gap is
// often larger than anything else the tool is measuring. A model that ignores
// the round is silently averaging two different competitions together and
// handing the result to a student who is only entering one of them.
//
// ── The trap on the other side ──────────────────────────────────────────────
// The naive fix is worse than the omission: take the school's published ED
// admit rate, divide by the published RD rate, and apply the ratio. That number
// is enormous almost everywhere — 3x, 4x — and almost all of it is composition,
// not causation. The early round is where recruited athletes are told to apply.
// It is where legacies apply. It is where development cases land. Those
// applicants are admitted at rates that have nothing to do with when they
// applied, and they are concentrated in a round with a much smaller
// denominator, which drags the whole early rate up.
//
// An unhooked student who applies ED gets some of that lift — a real signal of
// commitment, a genuinely smaller and less random pool — but nothing like the
// headline. So this module takes the profile's stated multiplier and DEFLATES
// it by the same hook-concentration estimate the base rate uses, and shows the
// student both numbers. Whatever else is true of that adjustment, it is the
// direction every other tool is wrong in.
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Rounds a student can be in, in the order a panel should list them. */
export const ROUND_IDS = ['ed', 'ed2', 'ea', 'rea', 'priority', 'rd', 'rolling-late'];

export const ROUND_LABELS = {
  ed: 'Early Decision (binding)',
  ed2: 'Early Decision II (binding)',
  ea: 'Early Action (non-binding)',
  rea: 'Restrictive / Single-Choice Early Action',
  priority: 'Priority deadline',
  rd: 'Regular Decision',
  'rolling-late': 'Rolling, applying late in the cycle',
};

/**
 * @param profile   program profile (supplies `rounds` and `hookSensitivity`)
 * @param roundId   the round the student intends to apply in, or null
 * @param hooks     { recruitedAthlete, legacy, development, faculty } or null
 */
export function scoreRound({ profile, roundId, hooks }) {
  const rounds = profile?.rounds || [];
  const available = rounds.map(r => ({ ...r, label: r.label || ROUND_LABELS[r.id] || r.id }));

  // A program with one deadline has no round lever at all, and saying so is
  // more useful than showing a control that cannot change anything. RPI is the
  // clean example: there is no Early Decision option, full stop.
  if (available.length <= 1) {
    const only = available[0] || null;
    return {
      applicable: false,
      chosen: only,
      multiplier: 1,
      headlineMultiplier: 1,
      note: only?.note || 'This program has a single application deadline, so there is no early-versus-regular decision to make here.',
      unknown: false,
    };
  }

  if (!roundId) {
    return {
      applicable: true, chosen: null, multiplier: 1, headlineMultiplier: 1,
      unknown: true,
      note: 'You have not told us which round you plan to apply in, so this estimate assumes Regular Decision and widens its range. Round is one of the largest single factors here and one of the easiest to answer.',
      available,
    };
  }

  const chosen = available.find(r => r.id === roundId) || available.find(r => r.id === 'rd') || available[0];
  const headline = chosen?.multiplier ?? 1;

  // How much of the headline early-round advantage is composition rather than
  // the round itself. `hookSensitivity` is the profile's estimate of the share
  // of the class taken by hooked applicants; the early round is where they are
  // concentrated, so it is also the right deflator here.
  const hookShare = clamp(profile?.hookSensitivity ?? 0.15, 0, 0.6);
  const studentIsHooked = !!(hooks && (hooks.recruitedAthlete || hooks.legacy || hooks.development || hooks.faculty));

  let multiplier = headline;
  let note = chosen?.note || '';

  if (headline > 1) {
    if (studentIsHooked) {
      // A hooked applicant in the early round genuinely is in the group the
      // headline number describes, so they keep most of it.
      multiplier = 1 + (headline - 1) * (1 - hookShare * 0.25);
      note += ` You have told us about a hook, so you keep most of the early-round advantage — the headline early-round lift is largely built from applicants in your position.`;
    } else {
      multiplier = 1 + (headline - 1) * (1 - hookShare * 0.8);
      const lostPct = Math.round((1 - (multiplier - 1) / Math.max(1e-6, headline - 1)) * 100);
      note += ` The headline early-round advantage at a program like this is about ${Math.round((headline - 1) * 100)}%, but roughly ${lostPct}% of it is recruited athletes, legacies and development admits being told to apply early — not the round itself. As an unhooked applicant you get the rest: about ${Math.round((multiplier - 1) * 100)}%. Every tool that quotes you the headline number is quoting you somebody else's odds.`;
    }
  } else if (headline < 1) {
    note += ` Applying in this round costs you: you are competing for whatever is left rather than for the cohort.`;
  }

  if (chosen?.id === 'ed' || chosen?.id === 'ed2') {
    note += ' Early Decision is binding. The lift is real and it is not large enough to be worth committing to a school you are not certain about, or one you cannot afford without comparing aid offers.';
  }

  return {
    applicable: true, chosen, multiplier: clamp(multiplier, 0.4, 2.2),
    headlineMultiplier: headline, deflated: headline > 1 && !studentIsHooked,
    hookShare, studentIsHooked, note: note.trim(), available, unknown: false,
  };
}
