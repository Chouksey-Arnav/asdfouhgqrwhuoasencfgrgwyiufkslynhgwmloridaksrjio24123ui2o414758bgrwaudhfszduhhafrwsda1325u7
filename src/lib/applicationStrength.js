// ─────────────────────────────────────────────────────────────────────────────
// Application Strength — a single 0-100 readiness score synthesizing what's
// already loaded elsewhere in the app (quiz mastery, pathway completion,
// clinical/volunteer/leadership hours, recommenders, application progress)
// against the active pathway's benchmarks. Pure function, no persistence.
// ─────────────────────────────────────────────────────────────────────────────

const ratio = (val, target) => target > 0 ? Math.min(1, val / target) : 1;

export function computeApplicationStrength({
  mastery = 0,               // 0-100 pathway lesson completion
  avgQuizScore = 0,           // 0-100 average quiz score
  clinicalHours = 0,
  shadowingHours = 0,
  volunteerHours = 0,
  leadershipHours = 0,
  recommendersConfirmed = 0,
  recommendersNeeded = 2,
  collegeCount = 0,
  essayCount = 0,
  benchmarks = {},
} = {}) {
  const academic = (mastery * 0.5) + (avgQuizScore * 0.5);

  const clinicalTarget = (benchmarks.clinicalHours || 60) + (benchmarks.shadowingHours || 20);
  const clinicalActual = clinicalHours + shadowingHours;
  const clinical = ratio(clinicalActual, clinicalTarget) * 100;

  const recommenderScore = ratio(recommendersConfirmed, recommendersNeeded) * 100;
  const collegeScore = ratio(collegeCount, 6) * 100;
  const essayScore = ratio(essayCount, Math.max(1, Math.min(collegeCount, 6))) * 100;
  const application = (recommenderScore * 0.4) + (collegeScore * 0.3) + (essayScore * 0.3);

  const leadershipScore = ratio(leadershipHours, benchmarks.leadershipHours || 40) * 100;
  const volunteerScore = ratio(volunteerHours, benchmarks.volunteerHours || 60) * 100;
  const activities = (leadershipScore * 0.5) + (volunteerScore * 0.5);

  const score = Math.round((academic * 0.35) + (clinical * 0.30) + (application * 0.20) + (activities * 0.15));

  const label =
    score >= 80 ? 'Strong' :
    score >= 60 ? 'On Track' :
    score >= 35 ? 'Building' : 'Just Starting';

  return {
    score: Math.max(0, Math.min(100, score)),
    label,
    subscores: {
      academic: Math.round(academic),
      clinical: Math.round(clinical),
      application: Math.round(application),
      activities: Math.round(activities),
    },
  };
}
