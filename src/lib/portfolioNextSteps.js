// ─────────────────────────────────────────────────────────────────────────────
// "What should I do next?" for the Portfolio Overview.
//
// The Overview can tell a student a great deal — hours, gauges, benchmarks,
// match percentages, four subscores — and none of it answers the only question
// a student actually opens it with. This does: it reduces the same snapshot the
// dashboards already read to at most three concrete, tappable next actions,
// each with a one-sentence reason a fifteen-year-old can act on.
//
// Deterministic on purpose. No model call, no network, no waiting — the list is
// derived from real rows, so it is identical offline, renders instantly, and can
// never suggest something the student already did.
//
// Ordering is by how blocked the student is, not by how impressive the step
// sounds: an overdue tracked deadline outranks "start a college list", which
// outranks "log more hours". Only the top few survive — a to-do list of eleven
// items is the same problem as a dashboard of eleven panels.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} ctx  everything the Overview already has in scope
 * @param {number} max  how many steps to return (default 3)
 * @returns {Array<{id,label,why,ctaLabel,view,tab,colorKey,iconKey,urgent}>}
 */
export function buildNextSteps(ctx = {}, max = 3) {
  const {
    trackedCount = 0,
    trackNeeds = 0,
    trackFocus = null,
    goalsSet = 0,
    activityCount = 0,
    clinicalHours = 0,
    collegeCount = 0,
    essayCount = 0,
    recommenderCount = 0,
    matchCount = 0,
    hasInterests = false,
    gradeStage = null,
  } = ctx;

  const steps = [];

  // 1. Something tracked has gone red. This is the only kind of step with a
  //    real deadline attached, so it always leads.
  if (trackNeeds > 0) {
    steps.push({
      id: 'tracked-needs-action',
      label: trackFocus ? `Handle ${trimName(trackFocus.name)}` : `${trackNeeds} tracked ${plural(trackNeeds, 'item needs', 'items need')} you`,
      why: trackFocus?.nextStep || 'A deadline is close or a status hasn’t moved in a while.',
      ctaLabel: 'Open Tracked',
      view: 'tracked',
      colorKey: 'rose',
      iconKey: 'alert',
      urgent: true,
    });
  }

  // 2. The week has no target on it. Everything else on this page measures a
  //    week that nobody has aimed at yet.
  if (!goalsSet) {
    steps.push({
      id: 'set-weekly-goal',
      label: 'Pick one goal for this week',
      why: 'Choose a number you actually intend to hit — the trackers below then fill in as you do the work.',
      ctaLabel: 'Set a goal',
      view: 'overview',
      scrollTo: 'weekly-goals',
      colorKey: 'blue',
      iconKey: 'target',
    });
  }

  // 3. Empty portfolio — the first real entry, in the order they'd naturally do it.
  if (activityCount === 0) {
    steps.push({
      id: 'first-activity',
      label: 'Add your first activity',
      why: 'A club, a job, a sport, volunteering — anything you already do counts. This is what your résumé is built from.',
      ctaLabel: 'Add an activity',
      view: 'resume',
      colorKey: 'amber',
      iconKey: 'award',
    });
  }

  if (clinicalHours === 0) {
    steps.push({
      id: 'first-clinical',
      label: 'Log any hours you’ve already spent around healthcare',
      why: 'Shadowing, volunteering at a clinic, a hospital summer job. Even a few hours is a real start, and it stops counting from zero.',
      ctaLabel: 'Log hours',
      view: 'clinical',
      colorKey: 'pink',
      iconKey: 'stethoscope',
    });
  }

  // 4. Nothing is being tracked and nothing has been chosen to track.
  if (trackedCount === 0) {
    steps.push({
      id: 'find-opportunity',
      label: hasInterests ? 'Pick one program to go after' : 'Tell us what you’re interested in',
      why: hasInterests
        ? `We’ve ranked ${matchCount || 'several'} programs against what you’ve already done. Tracking one puts a deadline and a next step on it.`
        : 'Two taps, and every program we suggest re-ranks around what you actually care about.',
      ctaLabel: 'Open Opportunities',
      view: 'opportunities',
      colorKey: 'gold',
      iconKey: 'trophy',
    });
  }

  // 5. Application pieces, gated on grade so a freshman isn't told to write essays.
  const late = isUpperclassman(gradeStage);
  if (collegeCount === 0) {
    steps.push({
      id: 'first-college',
      label: 'Start a college list',
      why: 'It doesn’t commit you to anything. It just gives every deadline and essay somewhere to attach to.',
      ctaLabel: 'Open College List',
      view: 'colleges',
      colorKey: 'sky',
      iconKey: 'school',
    });
  }
  if (late && essayCount === 0) {
    steps.push({
      id: 'first-essay',
      label: 'Start your personal statement',
      why: 'A rough first paragraph beats a blank page, and you can rewrite it as many times as you want.',
      ctaLabel: 'Open Essays',
      view: 'essays',
      colorKey: 'violet',
      iconKey: 'essay',
    });
  }
  if (late && recommenderCount === 0) {
    steps.push({
      id: 'first-recommender',
      label: 'Note down who you’ll ask for a recommendation',
      why: 'You don’t have to ask them yet — writing the names down is what stops this from becoming a last-minute scramble.',
      ctaLabel: 'Open Recommenders',
      view: 'recommenders',
      colorKey: 'fuchsia',
      iconKey: 'userCheck',
    });
  }

  return steps.slice(0, max);
}

/** True when the student has nothing left on the starter list — used to soften the copy. */
export function isRolling(steps) { return steps.length === 0; }

function trimName(name) {
  const s = String(name || '').trim();
  return s.length > 38 ? `${s.slice(0, 37)}…` : s;
}

function plural(n, one, many) { return n === 1 ? one : many; }

/**
 * Junior, senior, or past high school — the point at which "start your personal statement" stops
 * being premature advice. Callers pass whatever their account happens to hold: a GRADE_STAGES key
 * ('junior'), a numeric grade (11), or the string form of one. Anything unrecognised reads as
 * early, because telling a freshman to chase recommenders is worse than telling a senior nothing.
 */
function isUpperclassman(grade) {
  if (grade == null) return false;
  const s = String(grade).toLowerCase().trim();
  if (s === 'junior' || s === 'senior' || s === 'gap') return true;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 11;
}
