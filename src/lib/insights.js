// ─────────────────────────────────────────────────────────────────────────────
// Insight callouts — ranked, human-readable observations about where a
// student stands, generated from data already loaded elsewhere in the app.
// Same spirit as recommend.js's buildReasons(): pure, deterministic, no
// persistence of its own.
// ─────────────────────────────────────────────────────────────────────────────

export function buildInsights({
  catStats = [],        // [{cat, avg, taken, total}]
  pathwayLabel = '',
  mastery = 0,
  clinicalHours = 0,
  benchmarks = {},
  recommendersCount = 0,
  collegeCount = 0,
  essayCount = 0,
  streak = 0,
  dueCards = 0,
} = {}) {
  const insights = [];

  const weakest = catStats.filter(c => c.avg !== null).sort((a, b) => a.avg - b.avg)[0];
  if (weakest && weakest.avg < 65) {
    insights.push({
      severity: weakest.avg < 45 ? 'high' : 'medium',
      text: `Your ${weakest.cat} average (${weakest.avg}%) is your biggest gap toward ${pathwayLabel}.`,
      ctaLabel: 'Practice this section',
      ctaTab: 'prep', ctaView: 'quizzes',
    });
  }

  const clinicalTarget = (benchmarks.clinicalHours || 60) + (benchmarks.shadowingHours || 20);
  if (clinicalHours === 0) {
    insights.push({
      severity: 'medium',
      text: `You haven't logged any clinical or shadowing hours yet — most ${pathwayLabel} applicants start building this history early.`,
      ctaLabel: 'Log hours',
      ctaTab: 'portfolio', ctaView: 'clinical',
    });
  } else if (clinicalHours < clinicalTarget) {
    insights.push({
      severity: 'low',
      text: `You're at ${clinicalHours} of a rough ${clinicalTarget}-hour benchmark for clinical/shadowing exposure on this pathway.`,
      ctaLabel: 'Log more hours',
      ctaTab: 'portfolio', ctaView: 'clinical',
    });
  }

  if (recommendersCount === 0) {
    insights.push({
      severity: 'low',
      text: `No recommenders tracked yet — it's worth lining up 2-3 people early rather than scrambling near deadlines.`,
      ctaLabel: 'Add a recommender',
      ctaTab: 'portfolio', ctaView: 'recommenders',
    });
  }

  if (collegeCount > 0 && essayCount === 0) {
    insights.push({
      severity: 'medium',
      text: `You're tracking ${collegeCount} school${collegeCount === 1 ? '' : 's'} but haven't started an essay draft yet.`,
      ctaLabel: 'Start an essay',
      ctaTab: 'portfolio', ctaView: 'essays',
    });
  }

  if (dueCards > 10) {
    insights.push({
      severity: 'low',
      text: `${dueCards} flashcards are due — a quick review session keeps your retention curve healthy.`,
      ctaLabel: 'Review flashcards',
      ctaTab: 'prep', ctaView: 'flashcards',
    });
  }

  if (streak === 0) {
    insights.push({
      severity: 'low',
      text: `No active study streak — even a short session today gets it going again.`,
      ctaLabel: 'Take a quiz',
      ctaTab: 'prep', ctaView: 'quizzes',
    });
  }

  if (mastery >= 80 && clinicalHours >= clinicalTarget) {
    insights.push({
      severity: 'positive',
      text: `Strong pathway mastery and solid clinical exposure — you're in good shape on the fundamentals for ${pathwayLabel}.`,
      ctaLabel: null, ctaTab: null, ctaView: null,
    });
  }

  const order = { high: 0, medium: 1, low: 2, positive: 3 };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 5);
}
