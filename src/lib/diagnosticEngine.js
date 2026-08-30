// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic scoring engine — replaces the old single-vote-count finalizeDiag.
// Blends a 5-axis work-style vector (from "axis" questions) with direct
// pathway bonus votes (from "scenario" questions) to rank all pathways
// against the student's answers, instead of picking a single max-count winner
// off a hardcoded fan-out table.
// ─────────────────────────────────────────────────────────────────────────────
import { DIAG_AXES, DIAG_AXIS_LABELS, DIAG_QS, PATHS } from '../data/constants';

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (const axis of DIAG_AXES) {
    const va = a[axis] || 0, vb = b[axis] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// answers: array of choice-indexes, one per DIAG_QS entry (in order).
export function scorePathways(answers, { questions = DIAG_QS, paths = PATHS } = {}) {
  const vector = Object.fromEntries(DIAG_AXES.map(a => [a, 0]));
  const bonus = {};
  let axisCount = 0;

  // Every answer the student actually gave, kept alongside the maths. This is
  // what turns the result from a score into an explanation: explainMatch quotes
  // these back ("you ranked X highly and Y low"), and a diagnostic that can
  // show its work is the difference between a career quiz a student repeats to
  // a parent and one they quietly disbelieve.
  const picks = [];

  answers.forEach((choiceIdx, i) => {
    const q = questions[i];
    const choice = q?.ch?.[choiceIdx];
    if (!choice) return;
    picks.push({ qId: q.id, type: q.type, question: q.q, text: choice.text, theme: choice.theme || null, costs: choice.costs || null, axes: choice.axes || null, pathways: choice.pathways || null });

    // A trade-off item carries BOTH a vector and pathway votes, because a
    // forced choice is informative in both directions at once — see
    // data/diagnosticTradeoffs.js for why preference items alone hit a ceiling.
    if (choice.axes && (q.type === 'axis' || q.type === 'tradeoff')) {
      // Trade-offs are weighted higher than preference items on the axes. A
      // student who gave something up to answer has told you more than one who
      // picked the nicer-sounding of four options nobody has to pay for.
      const weight = q.type === 'tradeoff' ? 1.5 : 1;
      DIAG_AXES.forEach(a => { vector[a] += (choice.axes[a] || 0) * weight; });
      axisCount += weight;
    }
    if (choice.pathways && (q.type === 'scenario' || q.type === 'tradeoff')) {
      Object.entries(choice.pathways).forEach(([k, v]) => { bonus[k] = (bonus[k] || 0) + v; });
    }
  });
  DIAG_AXES.forEach(a => { vector[a] = axisCount ? vector[a] / axisCount : 0; });

  const maxBonus = Math.max(1, ...Object.values(bonus));
  const scored = Object.entries(paths).map(([key, p]) => {
    const axisScore = cosineSimilarity(vector, p.idealVector || {});
    const bonusScore = (bonus[key] || 0) / maxBonus;
    return { key, score: axisScore * 0.7 + bonusScore * 0.3, axisScore, bonusVotes: bonus[key] || 0 };
  }).sort((a, b) => b.score - a.score);

  return { vector, bonus, scored, picks, top: scored[0]?.key || 'exploring', ranked: scored.map(s => s.key) };
}

// Turns the raw scoring math into a short, human-readable "why this path" explanation —
// surfacing the actual decision logic instead of leaving the recommendation as a black box.
// Picks the axes this path cares about most (|idealVector| >= 0.3) where the student's own
// vector agrees most strongly with that path's ideal direction, framed using each axis's
// plain-language "A vs. B" label.
export function explainMatch(vector, topKey, { paths = PATHS, scored = null, picks = null } = {}) {
  const path = paths[topKey];
  if (!path) return { reasons: [], confidence: null, patterns: [], narrative: '' };
  const ideal = path.idealVector || {};
  const reasons = DIAG_AXES
    .map(axis => ({ axis, v: vector[axis] || 0, want: ideal[axis] || 0 }))
    .filter(c => Math.abs(c.want) >= 0.3 && Math.abs(c.v) >= 0.15)
    .map(c => ({ ...c, alignment: c.v * c.want }))
    .filter(c => c.alignment > 0) // only axes where the student's lean actually agrees with this path
    .sort((a, b) => b.alignment - a.alignment)
    .slice(0, 3)
    .map(c => {
      const [posLabel, negLabel] = (DIAG_AXIS_LABELS[c.axis] || '').split(' vs. ');
      return { axis: c.axis, leaning: (c.v >= 0 ? posLabel : negLabel)?.trim() };
    });

  let confidence = null;
  if (scored?.length) {
    const topScore = scored[0]?.score ?? 0;
    const runnerUpScore = scored[1]?.score ?? topScore;
    const gap = topScore - runnerUpScore;
    confidence = {
      pct: Math.round(Math.max(0, Math.min(1, (topScore + 1) / 2)) * 100),
      isClear: gap > 0.12,
      runnerUp: scored[1]?.key || null,
    };
  }
  const patterns = responsePatterns(picks, topKey, { paths, scored });
  return { reasons, confidence, patterns, narrative: narrate(patterns, topKey, { paths, scored }) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Explaining the result instead of just scoring it.
//
// A number with no reasoning behind it is the central credibility problem with
// every career quiz ever written, and teenagers are not fooled by it — they
// take the result, notice it could have said anything, and discount it. What
// turns a score into self-knowledge is being shown the specific answers that
// produced it: "you ranked seeing the same patients over years highly and
// unpredictable hours low, which is what pushed PT/OT and nursing above the
// emergency-facing roles." That is a sentence a student repeats to a parent.
// A percentage is not.
//
// So `responsePatterns` finds the two or three answers that actually moved this
// pathway to the top, ranked by how much each one contributed, and hands back
// the student's own words rather than an axis name.
// ─────────────────────────────────────────────────────────────────────────────

/** How much one pick pushed `topKey` specifically. */
function contributionOf(pick, topKey, path) {
  let score = 0;
  // Direct votes are the clearest signal — this answer named this pathway.
  if (pick.pathways?.[topKey]) score += pick.pathways[topKey] * 2;
  // Vector agreement: how much this answer's lean matches what this path wants.
  if (pick.axes) {
    const ideal = path?.idealVector || {};
    DIAG_AXES.forEach(a => {
      const v = pick.axes[a] || 0, want = ideal[a] || 0;
      if (Math.abs(want) >= 0.3) score += v * want * 3;
    });
  }
  // A trade-off answer is worth more as an explanation than a preference one,
  // for the same reason it is worth more as a signal: the student gave
  // something up to give it.
  if (pick.type === 'tradeoff') score *= 1.6;
  return score;
}

/**
 * The two or three answers that drove this ranking, strongest first.
 * @returns {Array<{text, theme, costs, type, contribution}>}
 */
export function responsePatterns(picks, topKey, { paths = PATHS, scored = null, limit = 3 } = {}) {
  if (!picks?.length) return [];
  const path = paths[topKey];
  return picks
    .map(p => ({ ...p, contribution: contributionOf(p, topKey, path) }))
    .filter(p => p.contribution > 0.4)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, limit);
}

/**
 * One plain sentence naming what drove the result, built from the student's own
 * answers — the thing they'll actually repeat out loud.
 */
export function narrate(patterns, topKey, { paths = PATHS, scored = null } = {}) {
  const label = paths[topKey]?.label || 'this pathway';
  if (!patterns?.length) {
    return `Your answers didn't lean hard in any one direction, which is genuinely common at this stage — ${label} came out as the closest overall fit rather than a decisive one.`;
  }
  const phrases = patterns.map(p => p.theme || `"${p.text}"`);
  const list = phrases.length === 1
    ? phrases[0]
    : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
  // Naming what got beaten is as informative as naming what won — a ranking
  // with nothing displaced reads as a horoscope.
  const runnerUp = scored?.[1]?.key ? paths[scored[1].key]?.label : null;
  const displaced = scored?.slice(2, 4).map(s => paths[s.key]?.label).filter(Boolean);
  const tail = displaced?.length
    ? ` That's what pushed ${label} above ${displaced.join(' and ')}.`
    : '';
  const close = runnerUp ? ` ${runnerUp} was the next closest.` : '';
  return `You chose ${list}.${tail}${close}`;
}
