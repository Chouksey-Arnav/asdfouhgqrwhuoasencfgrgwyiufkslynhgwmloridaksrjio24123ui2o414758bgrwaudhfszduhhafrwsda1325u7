// ─────────────────────────────────────────────────────────────────────────────
// Every diagnostic result the student has ever produced, and what changed
// between them.
//
// THE PROBLEM THIS FIXES
// The diagnostic wrote one field — `user.diagnosticResult` — and each retake
// overwrote it. That is a design that treats a fourteen-year-old's answer as a
// mistake to be corrected by the seventeen-year-old's, when in fact the
// difference between them is the single most interesting thing this app could
// possibly know about a student. Interests at fourteen and at seventeen are
// genuinely different, and a dated record of an interest developing is:
//
//   • a real reason to come back, across four years rather than one session;
//   • the honest answer to "why medicine?", which is the essay question every
//     one of these students will eventually have to answer, and the one where
//     an invented narrative is most obvious to a reader.
//
// ── WHY ONCE PER SEMESTER ────────────────────────────────────────────────────
// A retake limit sounds like a restriction and is actually what makes the
// record mean anything. Unlimited retakes produce a student re-rolling until
// they get the answer they wanted, which destroys both the diagnostic's
// credibility and the drift chart's — a line that moves because someone kept
// pressing the button shows nothing. A semester is also roughly the timescale
// on which a fifteen-year-old's interests actually move, so the limit costs
// nothing real.
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;

/**
 * Which academic semester a date falls in. Fall runs Aug–Dec, Spring Jan–May,
 * and summer is folded into the following fall — a June retake and a September
 * one are the same "since school ended" moment, and treating them as separate
 * semesters would hand a student two retakes for one gap.
 */
export function semesterOf(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear(), m = d.getMonth(); // 0-indexed
  if (m <= 4) return `${y}-spring`;   // Jan–May
  return `${y}-fall`;                 // Jun–Dec
}

export function semesterLabel(key) {
  const [y, s] = String(key || '').split('-');
  return `${s === 'spring' ? 'Spring' : 'Fall'} ${y}`;
}

/**
 * May the student take the diagnostic now?
 * The first take is always allowed. After that, one per semester.
 */
export function canTake(runs, now = Date.now()) {
  const history = runs || [];
  if (!history.length) return { allowed: true, reason: 'first' };
  const thisSemester = semesterOf(now);
  const already = history.find(r => semesterOf(r.takenAt) === thisSemester);
  if (!already) return { allowed: true, reason: 'new-semester' };
  return {
    allowed: false,
    reason: 'already-this-semester',
    takenAt: already.takenAt,
    nextAt: nextSemesterStart(now),
  };
}

/** When the next semester opens, so the UI can say a date rather than "later". */
export function nextSemesterStart(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear(), m = d.getMonth();
  return m <= 4 ? new Date(y, 5, 1).getTime() : new Date(y + 1, 0, 1).getTime();
}

/** Copy for a student who's asked to retake too soon. Not a scolding. */
export function retakeBlockedCopy(check) {
  const when = new Date(check.nextAt);
  const month = when.toLocaleString(undefined, { month: 'long' });
  return {
    headline: 'Already taken this semester',
    body: `You took this in ${new Date(check.takenAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}. It opens again in ${month}. The limit is there so the record actually means something — a chart of results you re-rolled until you liked one shows nothing, and this record is going to be worth having in a couple of years.`,
  };
}

/**
 * How a student's results moved over time, in a shape a chart can render
 * directly.
 *
 * @param {Array} runs  diagnostic runs, oldest first, each { takenAt, top, scored }
 * @returns {{points, pathways, changed, firstTop, latestTop, spanDays}}
 */
export function driftSeries(runs, { limit = 6 } = {}) {
  const history = (runs || []).slice().sort((a, b) => a.takenAt - b.takenAt);
  if (!history.length) return { points: [], pathways: [], changed: false, firstTop: null, latestTop: null, spanDays: 0 };

  // Only chart pathways that were ever near the top — a line for all ten is
  // unreadable and most of them never moved.
  const relevant = new Set();
  history.forEach(r => (r.scored || []).slice(0, 3).forEach(s => relevant.add(s.key)));
  const pathways = [...relevant].slice(0, limit);

  const points = history.map(r => ({
    takenAt: r.takenAt,
    label: new Date(r.takenAt).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
    semester: semesterLabel(semesterOf(r.takenAt)),
    top: r.top,
    // Scores are -1..1 from cosine similarity blended with bonus; mapped to
    // 0–100 purely for display.
    scores: Object.fromEntries(pathways.map(k => {
      const row = (r.scored || []).find(s => s.key === k);
      return [k, row ? Math.round(Math.max(0, Math.min(1, (row.score + 1) / 2)) * 100) : null];
    })),
  }));

  const firstTop = history[0].top;
  const latestTop = history[history.length - 1].top;
  return {
    points,
    pathways,
    changed: firstTop !== latestTop,
    firstTop,
    latestTop,
    spanDays: Math.round((history[history.length - 1].takenAt - history[0].takenAt) / DAY),
  };
}

/**
 * What the drift actually says, in words. Written to be usable as-is in an
 * application essay's raw material — dated, specific, and honest about the
 * case where nothing changed, which is itself a real finding.
 */
export function describeDrift(series, paths = {}) {
  if (!series?.points?.length) return '';
  if (series.points.length === 1) {
    return 'One result so far. Take this again next semester and this becomes a record of how your interests actually move — which is worth more than any single result.';
  }
  const first = paths[series.firstTop]?.label || series.firstTop;
  const latest = paths[series.latestTop]?.label || series.latestTop;
  const months = Math.max(1, Math.round(series.spanDays / 30));
  if (series.changed) {
    return `Over ${months} month${months === 1 ? '' : 's'} your top match moved from ${first} to ${latest}. That is not a wrong answer being corrected — it is a genuine change in what you are drawn to, and being able to say when it changed and why is exactly the kind of specific, dated detail an application essay is built out of.`;
  }
  return `Across ${series.points.length} results over ${months} month${months === 1 ? '' : 's'}, ${latest} has stayed on top. Consistency over that long is itself evidence — it is the difference between "I think I want this" and "I have checked this against myself repeatedly and it holds".`;
}

/** Rows for a plain dated list, newest first. */
export function historyRows(runs, paths = {}) {
  return (runs || [])
    .slice()
    .sort((a, b) => b.takenAt - a.takenAt)
    .map(r => ({
      takenAt: r.takenAt,
      date: new Date(r.takenAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
      semester: semesterLabel(semesterOf(r.takenAt)),
      topKey: r.top,
      topLabel: paths[r.top]?.label || r.top,
      runnerUpLabel: paths[r.scored?.[1]?.key]?.label || null,
      narrative: r.narrative || '',
    }));
}
