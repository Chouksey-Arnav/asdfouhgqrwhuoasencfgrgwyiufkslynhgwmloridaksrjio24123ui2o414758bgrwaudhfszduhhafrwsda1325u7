// ─────────────────────────────────────────────────────────────────────────────
// Opportunities & Competitions — deterministic ranking engine, same shape and
// spirit as src/lib/recommend.js's rankQuizzes(): scores every opportunity
// against the student's real Portfolio data and returns a ranked "recommended
// for you" list. No network call required — this runs instantly client-side,
// so the Opportunities database's "Recommended for you" section never waits
// on an API. Meta Brain (Groq) only narrates on top of this ranking (see
// OpportunitiesDatabase.jsx's cached daily blurb) — it never replaces it.
// ─────────────────────────────────────────────────────────────────────────────

// Maps an OPPORTUNITIES entry's `type` to the Portfolio activity-log
// `activity_type` bucket(s) it would show up under if the student logged it —
// used to detect "you have nothing logged in this area yet" gaps. Types with
// no natural activity-log analog (Academic, Scholarship) never earn the gap
// bonus, which is intentional — they're recognitions, not ongoing activities.
const TYPE_TO_ACTIVITY_BUCKETS = {
  Research: ['Research'],
  Volunteering: ['Volunteering'],
  Organization: ['Clubs & Organizations', 'Health Club/HOSA'],
  Competition: ['Clubs & Organizations'],
  Program: ['Clinical/Shadowing'],
};

const REASON_PRIORITY = ['gap', 'pathway', 'clinical', 'quickwin', 'general'];

// Natural-language phrasing for the "you have nothing in this area yet" gap
// reason — plain `opp.type.toLowerCase()` reads awkwardly for types like
// "Program" or "Organization" ("program activity logged" isn't how a student
// would say it), so each type gets its own short phrase instead.
const GAP_PHRASE = {
  Research: 'any research experience',
  Volunteering: 'any volunteering',
  Organization: 'any club or organization involvement',
  Competition: 'any competition experience',
  Program: 'a structured program like this',
};

function buildReasons({ opp, activityTypeCounts, pathwayKey, pathwayLabel, clinicalHours, totalActivities }) {
  const reasons = [];
  const buckets = TYPE_TO_ACTIVITY_BUCKETS[opp.type];
  if (buckets) {
    const loggedAny = buckets.some(b => (activityTypeCounts[b] || 0) > 0);
    if (!loggedAny) {
      reasons.push({ type: 'gap', text: `You don't have ${GAP_PHRASE[opp.type] || 'anything like this'} logged yet — this is a real way to start.` });
    }
  }
  if (opp.pathways?.length && pathwayKey && opp.pathways.includes(pathwayKey)) {
    reasons.push({ type: 'pathway', text: `Directly relevant to your ${pathwayLabel} pathway.` });
  }
  if (clinicalHours === 0 && (opp.tags?.some(t => /clinical|shadow/i.test(t)) || opp.type === 'Program')) {
    reasons.push({ type: 'clinical', text: `You haven't logged clinical/shadowing hours yet — this is a low-barrier way to start.` });
  }
  if (opp.effort === 'Open' && totalActivities < 3) {
    reasons.push({ type: 'quickwin', text: `Low time commitment — a solid first activity to build momentum.` });
  }
  return reasons;
}

function primaryReason(reasons) {
  for (const t of REASON_PRIORITY) {
    const r = reasons.find(x => x.type === t);
    if (r) return r.text;
  }
  return 'A strong, well-established opportunity worth a look.';
}

/**
 * Rank every opportunity for this student and return the top `count`.
 *
 * @param {Object} opts
 * @param {Array}  opts.opportunities      OPPORTUNITIES (src/data/opportunities.js)
 * @param {Object} opts.activityTypeCounts { [activity_type]: count } — from the student's real Portfolio activities
 * @param {number} opts.clinicalHours      total logged clinical/shadowing hours
 * @param {number} opts.researchCount      number of logged research experiences
 * @param {string} opts.pathwayKey         PATHS key (e.g. 'physician')
 * @param {string} opts.pathwayLabel       PATHS[key].label
 * @param {number} opts.count              how many ranked picks to return (default 6)
 * @returns {Array<{rank, item, score, reason, tags}>}
 */
export function rankOpportunities({ opportunities, activityTypeCounts = {}, clinicalHours = 0, researchCount = 0, pathwayKey = null, pathwayLabel = '', count = 6 }) {
  if (!opportunities?.length) return [];
  const totalActivities = Object.values(activityTypeCounts).reduce((s, n) => s + n, 0);

  const scored = opportunities.map(opp => {
    const reasons = buildReasons({ opp, activityTypeCounts, pathwayKey, pathwayLabel, clinicalHours, totalActivities });
    let score = 50;
    if (reasons.some(r => r.type === 'gap')) score += 30;
    if (reasons.some(r => r.type === 'pathway')) score += 20;
    if (reasons.some(r => r.type === 'clinical')) score += 12;
    if (reasons.some(r => r.type === 'quickwin')) score += 10;
    // Mild effort-tier tiebreak: Open opportunities are more universally
    // achievable, so nudge them ahead of otherwise-equal Elite/Competitive ones.
    if (opp.effort === 'Open') score += 4;
    return { opp, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  // Diversity pass — cap 2 per type among the top picks, same technique as
  // rankQuizzes' category cap, so the list isn't five research programs in a row.
  const picked = [];
  const usedTypes = new Map();
  const pool = [...scored];
  while (picked.length < count && pool.length) {
    let idx = pool.findIndex(c => (usedTypes.get(c.opp.type) || 0) < 2);
    if (idx === -1) idx = 0;
    const chosen = pool.splice(idx, 1)[0];
    usedTypes.set(chosen.opp.type, (usedTypes.get(chosen.opp.type) || 0) + 1);
    picked.push(chosen);
  }

  return picked.map((p, i) => ({
    rank: i + 1,
    item: p.opp,
    score: Math.round(p.score),
    reason: primaryReason(p.reasons),
    tags: p.reasons.map(r => r.type),
  }));
}
