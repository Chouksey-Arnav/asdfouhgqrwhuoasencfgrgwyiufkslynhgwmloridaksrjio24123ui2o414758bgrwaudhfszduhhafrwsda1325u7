// ─────────────────────────────────────────────────────────────────────────────
// Activity & honors intelligence — the deterministic half of Medabrain's read
// on the Activities & Resume Builder.
//
// WHY DETERMINISTIC, AND WHY IT COMES FIRST
// The Portfolio already has an AI that reasons over the full tracker. What it
// did not have was an opinion that is *always there* — one that survives a
// rate limit, a dead network, a Groq outage, and the two seconds before a
// response streams back. A coach that only exists when a fetch succeeds is not
// a coach a student learns to rely on.
//
// So the model here is two layers, and it is the same one collegeRecommend.js
// uses for the college list:
//
//   LAYER 1 (this file) — computed, instant, always correct. Every number it
//   states is arithmetic on the student's own rows. It never guesses, it never
//   calls anything, and it is what the panel renders by default.
//
//   LAYER 2 (portfolioCritique.js) — the real Groq read, layered on top, doing
//   the thing arithmetic can't: judging whether "Volunteer" at a hospital for
//   three years actually reads as commitment or as attendance.
//
// Layer 1 must never be flattering. An activity list of six one-hour clubs is
// a thin list, and this file says so — in the same voice as HONEST_MENTOR_STANCE
// in studentProfile.js, because a student who gets a green checkmark from the
// deterministic layer and a blunt paragraph from the AI layer stops trusting
// both.
//
// Pure functions, no React, no network. Asserted on by scripts/verifyResumeBuilder.mjs.
// ─────────────────────────────────────────────────────────────────────────────

export const hoursPerYear = (a) => (Number(a?.hours_per_week) || 0) * (Number(a?.weeks_per_year) || 0);
export const totalHoursPerYear = (activities = []) => Math.round(activities.reduce((s, a) => s + hoursPerYear(a), 0));

// ── What a health-track application is actually made of ──────────────────────
// Six pillars. Not a checklist to game — a description of the ways an
// application can be thin, so "you're missing something" can name the thing.
// `weight` is how much its absence costs a student heading toward a health
// career specifically: clinical exposure is the one nobody can substitute for.
export const PILLARS = [
  {
    id: 'clinical', label: 'Clinical exposure', weight: 26,
    types: ['Clinical/Shadowing', 'Patient Care (paid)'],
    why: 'Time in an actual care setting. This is the one pillar a health-track application cannot fake or substitute — it is the evidence that they have seen the job and still want it.',
    missing: 'Nothing clinical logged. Every other part of a pre-health application argues that you want medicine; this is the only part that shows you have seen it. Shadowing a physician, a hospital volunteer shift, a CNA or scribe job — one of these needs to exist.',
  },
  {
    id: 'service', label: 'Service to others', weight: 18,
    types: ['Volunteering'],
    why: 'Sustained work for people who are not paying you and cannot do anything for you. Readers check this specifically for health applicants.',
    missing: 'No volunteering logged. Service is the least optional part of a pre-health story after clinical exposure — and unlike clinical hours, it is available to you this weekend.',
  },
  {
    id: 'leadership', label: 'Leadership', weight: 18,
    types: ['Leadership'], flag: 'leadership_role',
    why: 'A role where other people depended on your decisions. A title only counts if something changed under it.',
    missing: 'No leadership role marked anywhere. You do not need to be club president — running one project, one drive, one team counts, and it is the difference between "attended" and "ran".',
  },
  {
    id: 'research', label: 'Research or scholarship', weight: 12,
    types: ['Research'],
    why: 'Evidence you can work on a question nobody has answered yet. The single strongest differentiator available to a high schooler.',
    missing: 'No research logged. This is optional in a way clinical hours are not — but it is also the fastest way to stop looking like every other pre-med applicant.',
  },
  {
    id: 'academicClub', label: 'Academic / STEM involvement', weight: 12,
    types: ['Health Club/HOSA', 'Clubs & Organizations'],
    why: 'HOSA, science olympiad, a health club — the interest showing up somewhere other than a transcript.',
    missing: 'No health or academic club. HOSA, Science Olympiad, or a health-careers club is the cheapest possible way to show the interest is real outside your own head.',
  },
  {
    id: 'work', label: 'Work or responsibility', weight: 14,
    types: ['Work Experience', 'Patient Care (paid)', 'Athletics', 'Arts & Performance'],
    why: 'A paid job, a sport, a sustained art — proof of showing up to something hard on a schedule that was not yours.',
    missing: 'No job, sport, or sustained commitment outside school clubs. Readers weight these more than students expect: they are the hardest kind of activity to fake.',
  },
];

// ── One activity, judged ─────────────────────────────────────────────────────
// The score is not a grade on the student — it is a measure of how much of this
// activity actually made it into the record. A genuinely major commitment
// entered as three words scores low, and it should, because three words is what
// the reader gets.
export function scoreActivity(a) {
  const hrs = hoursPerYear(a);
  const desc = String(a?.description || '').trim();
  const impact = String(a?.impact || '').trim();
  const parts = [];

  const timeScore = Math.min(30, Math.sqrt(Math.max(0, hrs)) * 2.6);
  parts.push({ id: 'time', label: 'Time committed', points: Math.round(timeScore), max: 30 });

  const durationScore = Math.min(15, (a?.grade_levels || []).length * 5);
  parts.push({ id: 'duration', label: 'Years sustained', points: durationScore, max: 15 });

  let descScore = 0;
  if (desc.length >= 140) descScore = 20;
  else if (desc.length >= 80) descScore = 16;
  else if (desc.length >= 40) descScore = 10;
  else if (desc.length > 0) descScore = 4;
  parts.push({ id: 'description', label: 'Described', points: descScore, max: 20 });

  let impactScore = 0;
  if (impact) impactScore += 8;
  if (/\d/.test(impact)) impactScore += 9;           // a number is the whole point of the impact field
  if (impact.length >= 60) impactScore += 3;
  parts.push({ id: 'impact', label: 'Measurable impact', points: Math.min(20, impactScore), max: 20 });

  let credScore = 0;
  if (a?.leadership_role) credScore += 8;
  if (a?.evidence_url) credScore += 4;
  if (a?.verification_status === 'verified') credScore += 3;
  parts.push({ id: 'credibility', label: 'Role & evidence', points: Math.min(15, credScore), max: 15 });

  const score = Math.max(0, Math.min(100, Math.round(parts.reduce((s, p) => s + p.points, 0))));
  const band =
    score >= 78 ? { label: 'Reads strong', tone: 'good' } :
    score >= 55 ? { label: 'Solid, underwritten', tone: 'info' } :
    score >= 32 ? { label: 'Thin as written', tone: 'warn' } :
    { label: 'Barely an entry', tone: 'critical' };
  return { score, band, parts, hoursPerYear: Math.round(hrs) };
}

// Vague verbs that describe presence rather than action. The activity
// description is 150 characters; spending them on "participated in" is the most
// common single mistake students make in this section.
const WEAK_VERBS = /\b(helped|participated|involved|assisted|attended|volunteered|worked|supported|contributed|took part|was part of|member of)\b/i;
const STRONG_HINT = 'Lead with what you did that nobody else would have done: ran, built, trained, raised, redesigned, recruited, taught, scheduled, translated.';

/**
 * Everything wrong with one activity entry, in the order it costs them.
 * Deliberately shares the level vocabulary with commonApp.js ('error' | 'warn' |
 * 'tip') so the UI renders one severity scale across both.
 */
export function activityIssues(a) {
  const out = [];
  const hrs = hoursPerYear(a);
  const desc = String(a?.description || '').trim();
  const impact = String(a?.impact || '').trim();
  const hpw = Number(a?.hours_per_week) || 0;
  const wpy = Number(a?.weeks_per_year) || 0;

  if (!desc) {
    out.push({ level: 'error', text: 'No description at all. On the Common App this activity is a job title and a number of hours — a reader learns nothing about it and it may as well not be listed.' });
  } else if (desc.length < 40) {
    out.push({ level: 'warn', text: `Description is ${desc.length} characters. You get 150 on the form and you are leaving ${150 - desc.length} of them unused — that is free space to say what actually happened.` });
  }
  if (desc && WEAK_VERBS.test(desc.split(/[.!?]/)[0] || '')) {
    out.push({ level: 'warn', text: `Opens with a presence verb ("${(desc.match(WEAK_VERBS) || [])[0]}"). ${STRONG_HINT}` });
  }
  if (!impact) {
    out.push({ level: 'warn', text: 'No impact recorded. "What changed because you were there" is the single line that separates a real commitment from an attendance record.' });
  } else if (!/\d/.test(impact)) {
    out.push({ level: 'tip', text: 'Impact has no number in it. Not everything is countable, but most things are: people reached, dollars raised, hours run, a percentage, a before-and-after.' });
  }
  if (hpw > 40) out.push({ level: 'warn', text: `${hpw} hours a week is more than a full-time job on top of school. If that is genuinely right, say so in the description — a reader who does not believe a number stops believing the list.` });
  if (wpy > 52) out.push({ level: 'error', text: `${wpy} weeks a year is more weeks than a year has.` });
  if (hpw > 0 && wpy === 0) out.push({ level: 'warn', text: 'Hours per week is set but weeks per year is zero, so this counts as zero hours everywhere in the app.' });
  if (!(a?.grade_levels || []).length) out.push({ level: 'warn', text: 'No grade levels ticked. Multi-year commitment is one of the few things a reader can compare between two applicants, and right now yours reads as unknown.' });
  if (!a?.organization) out.push({ level: 'tip', text: 'No organization name — the form asks for one, and it is how a reader places what this was.' });
  if (hrs > 0 && hrs < 20) out.push({ level: 'tip', text: `About ${Math.round(hrs)} hours a year. That is real but small — either it grows into something, or it belongs low on the list so the ten slots go to what matters.` });
  if (!a?.evidence_url && (a?.leadership_role || hrs > 150)) out.push({ level: 'tip', text: 'A commitment this size with no evidence link. A certificate, article, roster, or photo makes it verifiable — and MedSchoolPrep can carry that through to a recommender.' });
  return out;
}

// ── Live coaching while they type ────────────────────────────────────────────
// Fires against the draft in the add-activity form, before anything is saved.
// This is the difference between a form that validates and a coach that is
// looking over their shoulder. Returns at most `limit` lines, most useful first,
// so the form never turns into a wall of correction.
export function coachDraft(draft, { limit = 3 } = {}) {
  const out = [];
  const pos = String(draft?.position || '').trim();
  const desc = String(draft?.description || '').trim();
  const impact = String(draft?.impact || '').trim();
  const hpw = Number(draft?.hours_per_week) || 0;
  const wpy = Number(draft?.weeks_per_year) || 0;

  if (pos.length > 50) out.push({ level: 'error', text: `Position is ${pos.length} characters — the Common App field cuts off at 50. Trim ${pos.length - 50}.` });
  if (desc.length > 150) out.push({ level: 'error', text: `Description is ${desc.length} characters. The Common App gives you 150; the last ${desc.length - 150} will not survive the paste.` });
  else if (desc.length >= 120 && desc.length <= 150) out.push({ level: 'good', text: `${desc.length}/150 characters — that is the size a description should be. You are using the space you get.` });
  else if (desc.length > 0 && desc.length < 50) out.push({ level: 'tip', text: `${desc.length}/150 characters. Two more clauses fit here for free: what you actually did, and what came of it.` });

  if (desc && WEAK_VERBS.test(desc.split(/[.!?]/)[0] || '')) {
    out.push({ level: 'warn', text: `"${(desc.match(WEAK_VERBS) || [])[0]}" describes being there, not doing something. ${STRONG_HINT}` });
  }
  if (desc.length > 30 && !impact) out.push({ level: 'tip', text: 'Impact field is still empty. One sentence — what was different because you did this — is the line readers actually remember.' });
  if (impact && !/\d/.test(impact)) out.push({ level: 'tip', text: 'Put a number in the impact line if one exists. "Grew the club" and "grew the club from 12 to 40" are different claims.' });
  if (hpw > 40) out.push({ level: 'warn', text: `${hpw} hrs/week is more than full-time. Make sure that is what you mean — inflated hours are the fastest way to lose a reader's trust in the whole list.` });
  if (hpw > 0 && wpy === 0) out.push({ level: 'warn', text: 'Weeks per year is still 0, so this will total zero hours everywhere in the app.' });
  if (pos && !draft?.organization) out.push({ level: 'tip', text: 'Add the organization — the Common App has a required field for it.' });
  if (pos && !(draft?.grade_levels || []).length) out.push({ level: 'tip', text: 'Tick the grade levels. Years of participation is a required field and a real signal.' });
  if (draft?.leadership_role && !impact) out.push({ level: 'warn', text: 'Marked as a leadership role with no impact recorded. A title with nothing under it is the weakest thing on an activities list — what changed while you led?' });

  const rank = { error: 0, warn: 1, good: 2, tip: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]).slice(0, limit);
}

// ── The whole slate ──────────────────────────────────────────────────────────

/**
 * Reads the activity list as one thing rather than as rows: how deep it goes,
 * where the spike is, which pillars are empty, and whether the hours are
 * believable. This is what the panel's standing "Medabrain read" renders when
 * the AI layer is unavailable, and what the AI layer is handed as evidence when
 * it is.
 */
export function analyzeSlate(activities = [], awards = []) {
  const total = totalHoursPerYear(activities);
  const scored = activities.map(a => ({ activity: a, ...scoreActivity(a) }));
  const byType = {};
  activities.forEach(a => { const k = a.activity_type || 'Other'; byType[k] = (byType[k] || 0) + 1; });

  const covered = new Set();
  PILLARS.forEach(p => {
    const hit = activities.some(a =>
      p.types.includes(a.activity_type) || (p.flag && a[p.flag]) ||
      (p.id === 'leadership' && a.leadership_role));
    if (hit) covered.add(p.id);
  });
  const gaps = PILLARS.filter(p => !covered.has(p.id));
  const coverageScore = Math.round(
    (PILLARS.filter(p => covered.has(p.id)).reduce((s, p) => s + p.weight, 0) /
      PILLARS.reduce((s, p) => s + p.weight, 0)) * 100
  );

  // The spike: the one activity carrying the most weight. A list with no spike
  // — where every entry is interchangeable — is the classic thin application,
  // and it is invisible to a student looking at their own rows one at a time.
  const ranked = [...scored].sort((x, y) => hoursPerYear(y.activity) - hoursPerYear(x.activity));
  const spike = ranked[0] || null;
  const spikeShare = total > 0 && spike ? Math.round((hoursPerYear(spike.activity) / total) * 100) : 0;

  const leadershipCount = activities.filter(a => a.leadership_role).length;
  const multiYear = activities.filter(a => (a.grade_levels || []).length >= 2).length;
  const withImpact = activities.filter(a => String(a.impact || '').trim()).length;
  const withNumbers = activities.filter(a => /\d/.test(String(a.impact || ''))).length;
  const undescribed = activities.filter(a => String(a.description || '').trim().length < 40).length;
  const avgScore = scored.length ? Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length) : 0;

  // Believability. 25 h/week across everything on top of full-time school is
  // where a reader starts doing arithmetic, and 40 is where they stop believing.
  const weeklyPeak = activities.reduce((s, a) => s + (Number(a.hours_per_week) || 0), 0);

  const awardLevels = { School: 0, 'State/Regional': 0, National: 0, International: 0 };
  awards.forEach(a => { if (awardLevels[a.level] != null) awardLevels[a.level]++; });
  const unleveled = awards.filter(a => !a.level).length;

  return {
    count: activities.length, totalHours: total, avgScore, scored,
    byType, covered: [...covered], gaps, coverageScore,
    spike, spikeShare, leadershipCount, multiYear, withImpact, withNumbers, undescribed,
    weeklyPeak, awardCount: awards.length, awardLevels, unleveled,
    slotsUsed: Math.min(10, activities.length), slotsFree: Math.max(0, 10 - activities.length),
  };
}

/**
 * The standing read, as a list of statements. Every one is arithmetic on their
 * own rows — no adjectives that aren't earned by a number sitting next to them.
 * tone: 'good' | 'warn' | 'critical' | 'info'.
 */
export function slateInsights(analysis, { gradeStage = null } = {}) {
  const out = [];
  const A = analysis;
  if (!A) return out;

  if (A.count === 0) {
    out.push({ tone: 'info', text: 'Nothing logged yet. The Common App gives you ten activity slots and five honors — this panel fills both, and everything you enter here also feeds the college matching, the résumé export, and what Medabrain knows about you everywhere else in the app.' });
    return out;
  }

  // Depth before breadth, always. This is the correction most students need.
  if (A.count >= 8 && A.totalHours / A.count < 60) {
    out.push({ tone: 'warn', text: `${A.count} activities averaging ${Math.round(A.totalHours / A.count)} hours a year each. That is a wide, shallow list — a reader reads it as "joined things". Two of these at triple the hours would beat all ${A.count} of them.` });
  } else if (A.count <= 2) {
    out.push({ tone: 'info', text: `${A.count} activit${A.count === 1 ? 'y' : 'ies'} logged. Thin so far, but the fix is depth, not volume — the ten slots do not need to be full, they need to be worth reading.` });
  }

  if (A.spike && A.spikeShare >= 45) {
    out.push({ tone: 'good', text: `${A.spike.activity.position} carries ${A.spikeShare}% of your total hours. That is a spike, and a spike is what makes an application memorable — protect it, and make sure its description is the best-written one on the page.` });
  } else if (A.count >= 4 && A.spikeShare < 30) {
    out.push({ tone: 'warn', text: 'No single activity dominates your hours — everything sits at roughly the same level. Lists like this read as interchangeable. Pick the one you would keep if you could keep only one, and pour the next year into it.' });
  }

  if (A.leadershipCount === 0 && A.count >= 3) {
    out.push({ tone: 'warn', text: 'Nothing on this list is marked as a leadership role. You do not need a president title — running one project, one drive, one team is enough, and right now the record shows none.' });
  } else if (A.leadershipCount >= 2) {
    out.push({ tone: 'good', text: `${A.leadershipCount} leadership roles logged. That is the part of an activities list that is hardest to fake and easiest for a reader to check.` });
  }

  if (A.withImpact < A.count) {
    const n = A.count - A.withImpact;
    out.push({ tone: n >= Math.ceil(A.count / 2) ? 'warn' : 'info', text: `${n} of ${A.count} activities have no impact line. That field is the whole difference between what you attended and what changed because you were there.` });
  }
  if (A.count >= 3 && A.withNumbers === 0) {
    out.push({ tone: 'warn', text: 'Not one impact line on this list contains a number. Quantities are the cheapest credibility in a 150-character field — people, dollars, hours, percentages, a before and after.' });
  }
  if (A.undescribed > 0) {
    out.push({ tone: A.undescribed >= 3 ? 'warn' : 'info', text: `${A.undescribed} activit${A.undescribed === 1 ? 'y is' : 'ies are'} under 40 characters of description. The form gives you 150 — those are free characters you are choosing not to use.` });
  }

  if (A.multiYear === 0 && A.count >= 3) {
    out.push({ tone: 'warn', text: 'Nothing here spans more than one grade. Multi-year commitment is one of the few things a reader can compare across applicants, and a list of one-year activities reads as résumé building.' });
  } else if (A.multiYear >= 3) {
    out.push({ tone: 'good', text: `${A.multiYear} activities run across multiple grades. Sustained is the adjective this section is actually scored on.` });
  }

  if (A.weeklyPeak > 45) {
    out.push({ tone: 'critical', text: `Your entries add up to ${A.weeklyPeak} hours a week on top of full-time school. A reader will do that arithmetic, and if one number looks inflated they discount the whole list. Check the hours are per-week, not per-month.` });
  } else if (A.weeklyPeak > 28) {
    out.push({ tone: 'info', text: `${A.weeklyPeak} hours a week across everything, on top of school. That is a genuinely full schedule — believable, but worth double-checking each row before it goes on a form.` });
  }

  A.gaps.slice(0, 3).forEach(g => out.push({ tone: g.id === 'clinical' ? 'critical' : 'warn', text: g.missing, pillar: g.id }));

  if (A.count > 10) {
    out.push({ tone: 'info', text: `You have ${A.count} activities and the Common App takes ten. ${A.count - 10} will be cut — better that you choose which, in the export panel, than that the ranking chooses for you.` });
  }

  if (gradeStage === 'senior' && A.gaps.length) {
    out.push({ tone: 'warn', text: 'You are a senior, so the honest note is that new activities started now barely register. Spend the remaining time deepening and describing what is already on this list, not adding to it.' });
  } else if ((gradeStage === 'freshman' || gradeStage === 'sophomore') && A.count >= 1) {
    out.push({ tone: 'good', text: 'You have years of runway. The single highest-return thing you can do with it is pick one of these and still be doing it in twelfth grade — length is the one advantage a younger student has that nobody can catch up on.' });
  }

  return out;
}

/** Honors, read as a set rather than a pile. */
export function honorsInsights(analysis) {
  const out = [];
  if (!analysis) return out;
  const { awardCount, awardLevels, unleveled } = analysis;
  if (awardCount === 0) {
    out.push({ tone: 'info', text: 'No honors logged. The Common App has five honors slots and most students leave them half-empty — an AP Scholar award, honor roll, a subject award, a competition placement, a certification all count. Empty slots are not modesty, they are missing information.' });
    return out;
  }
  const above = awardLevels['State/Regional'] + awardLevels.National + awardLevels.International;
  if (above === 0) {
    out.push({ tone: 'info', text: `All ${awardCount} honor${awardCount === 1 ? '' : 's'} are school-level. That is completely normal and worth listing — but one regional or state competition entry this year would change how this section reads more than any other single thing you could do.` });
  } else {
    out.push({ tone: 'good', text: `${above} honor${above === 1 ? '' : 's'} above school level. That is the part of this section a reader actually stops on — make sure ${above === 1 ? 'it sits' : 'they sit'} in the top slots.` });
  }
  if (unleveled > 0) out.push({ tone: 'warn', text: `${unleveled} honor${unleveled === 1 ? ' has' : 's have'} no recognition level set. Level of recognition is a required field on the form and it is most of what the honor communicates — "Science Award" and "Science Award, National" are different lines.` });
  if (awardCount > 5) out.push({ tone: 'info', text: `${awardCount} honors logged and the form takes five. The ranked export picks the highest level first; check that ordering is the one you want.` });
  return out;
}

// ── Ambient one-liners ───────────────────────────────────────────────────────
// The reaction that fires the moment something is saved. Unlike the old random
// picker in medabrainComments.jsx, these are chosen by what the data actually
// says, so a student who logs a 400-hour leadership role and a student who logs
// a two-hour club do not get the same sentence.
export function reactToActivity(activity, analysis = null) {
  const s = scoreActivity(activity);
  const hrs = s.hoursPerYear;
  const name = activity?.position || 'That activity';

  if (!String(activity?.description || '').trim()) {
    return `${name} is logged, but with no description it is a job title on a form. Two sentences now — what you did, what changed — is worth more than the next three activities you add.`;
  }
  if (s.score >= 78) {
    return `${name} is the kind of entry this section is for: ${hrs} hours a year${activity?.leadership_role ? ', a real role' : ''}, described, with the impact written down. If the rest of the list read like this you would be in good shape.`;
  }
  if (activity?.leadership_role && !String(activity?.impact || '').trim()) {
    return `${name} is marked as leadership with nothing in the impact field. A title with no outcome under it is the weakest line on an activities list — what was different when you handed it over?`;
  }
  if (hrs >= 200) {
    return `${hrs} hours a year on ${name}. That is a genuine commitment${analysis?.spikeShare >= 40 ? ' and it is now the spine of your list' : ''} — make sure its 150-character description is the best-written one you have.`;
  }
  if (!/\d/.test(String(activity?.impact || ''))) {
    return `${name} logged. The impact line has no number in it — people reached, dollars raised, a before and after. That is the sentence a reader remembers, and it is currently the vaguest thing on the entry.`;
  }
  if (hrs > 0 && hrs < 25) {
    return `${name} logged at about ${hrs} hours a year. Real, but small — the ten Common App slots are worth more than this unless it grows.`;
  }
  return `${name} logged. Entry scores ${s.score}/100 on how much of it actually made it into the record — the description and impact fields are where that number moves.`;
}

export function reactToAward(award, analysis = null) {
  const level = award?.level;
  if (level === 'National' || level === 'International') {
    return `${award.title} — ${level.toLowerCase()} level. That belongs in your top honors slot and it is worth a sentence in an essay or an interview; a reader will ask about it.`;
  }
  if (level === 'State/Regional') {
    return `${award.title} logged at state/regional level. That is above where most of this section sits — put it near the top of the five slots.`;
  }
  if (!level) {
    return `${award.title} logged, but with no level of recognition. That field is required on the form and it is most of what the honor says — school, state/regional, national or international.`;
  }
  const n = (analysis?.awardCount ?? 0);
  return `${award.title} logged.${n < 5 ? ` ${5 - n} of the five Common App honors slots still empty — honor roll, AP Scholar, a subject award and a certification all belong in there.` : ''}`;
}
