// Derives the parent-facing view of a student's progress from their progress_sync snapshot.
//
// ── The allowlist is the security boundary ──────────────────────────────────
// This module never receives a snapshot and removes things from it. It receives a snapshot and
// BUILDS a new object out of named fields. The difference matters more than it looks: a blocklist
// leaks every field added after it was written, and the snapshot grows constantly (see
// buildSyncSnapshot in src/lib/db.js — it has gained coach threads, lesson notes and highlights
// since it was introduced). Under an allowlist, a field added tomorrow is invisible to parents
// until someone deliberately adds it here, which is the direction the default should fail in.
//
// Concretely, these are in the snapshot and deliberately never surfaced:
//   coachThreads      the student's conversations with the AI coach, verbatim
//   lessonNotes       their private notes
//   lessonHighlights  what they highlighted, which is nearly as revealing as the notes
//   satResponses      per-question answers (the aggregate score is shown; the answers are not)
//
// A student who knows a parent can read their coach transcript stops using the coach honestly.
// The product is worth less to them and the parent learns less, so the boundary is not only a
// privacy position — it is what keeps the underlying data worth reading.
//
// ── What a parent gets instead ──────────────────────────────────────────────
// Effort and outcomes: are they showing up, is it working, what changed lately. That is what a
// parent can actually act on, and it is the entire remit of this summary.

/** Bumped when the derivation changes shape, so a cached row from an older build is discarded. */
export const SUMMARY_VERSION = 2;

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clampInt = (v) => Math.max(0, Math.round(num(v)));

/** XP → level, mirroring src/lib/gamification.js's 500-XP bands so both surfaces agree. */
const levelFor = (xp) => Math.max(1, Math.floor(num(xp) / 500) + 1);

/**
 * Study days in the last `days` days, as an array of { date, active } oldest-first.
 * A parent reading "12-day streak" learns less than a parent seeing the gaps, and the shape is
 * small enough (56 booleans) to send on every poll.
 */
function activityCalendar(studyDays, days = 56, now = Date.now()) {
  const active = new Set(Array.isArray(studyDays) ? studyDays : []);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(now - i * DAY_MS);
    out.push({ date, active: active.has(date) });
  }
  return out;
}

// A consecutive-day count is deliberately NOT computed or sent here.
//
// The comment above activityCalendar() already had the argument right — a parent reading "12-day
// streak" learns less than a parent seeing the gaps — but the field was sent anyway, and both
// parent surfaces rendered it as a chip next to the calendar that was supposed to replace it.
//
// The deeper reason is about who a streak measures. Consecutive days reward students with free
// evenings and penalize students with jobs, caregiving duties, or a heavy sports season, which is
// disproportionately the students this product exists to serve. On the student's own dashboard
// that is a small self-directed nudge they can take or leave. Handed to a parent it becomes a
// compliance number someone else is grading them against, and a broken streak turns into a
// conversation about discipline rather than about progress.
//
// So the calendar goes to the parent and the streak does not. scripts/verifyNextThree.mjs fails
// the build if a streak field reappears on any parent surface.

/** Reviews in the last `days` days, from the date-keyed counts the snapshot already aggregates. */
function reviewsSince(reviewCountsByDate, days, now = Date.now()) {
  if (!reviewCountsByDate || typeof reviewCountsByDate !== 'object') return 0;
  const cutoff = dayKey(now - (days - 1) * DAY_MS);
  return Object.entries(reviewCountsByDate)
    .filter(([date]) => date >= cutoff)
    .reduce((sum, [, count]) => sum + clampInt(count), 0);
}

/** Quiz outcomes: how many, how well, and the direction over the last ten. */
function quizStats(quizScores) {
  const rows = (Array.isArray(quizScores) ? quizScores : [])
    .filter(q => q && Number.isFinite(Number(q.score)))
    .sort((a, b) => num(b.completedAt) - num(a.completedAt));
  if (!rows.length) return { taken: 0, averageScore: null, recentAverage: null, lastTakenAt: null };

  const avg = (list) => Math.round(list.reduce((s, q) => s + num(q.score), 0) / list.length);
  const recent = rows.slice(0, 10);
  const earlier = rows.slice(10);
  return {
    taken: rows.length,
    averageScore: avg(rows),
    recentAverage: avg(recent),
    // Null rather than 0 when there is nothing to compare against: "no trend yet" and "flat" are
    // different facts and the UI renders them differently.
    trend: earlier.length ? avg(recent) - avg(earlier) : null,
    lastTakenAt: num(rows[0].completedAt) || null,
  };
}

/**
 * Recent milestones, as a plain feed. Deliberately built only from things that are already
 * outcomes — a verified unit, an achievement, a finished test — never from activity that would
 * amount to surveillance of what the student was reading at 9pm.
 */
function milestones(snapshot, limit = 8) {
  const out = [];
  for (const u of (snapshot.unitMastery || [])) {
    if (!u?.verifiedAt) continue;
    out.push({ kind: 'unit_verified', label: `Verified ${u.unitId || 'a unit'}`, score: num(u.score) || null, at: num(u.verifiedAt) });
  }
  for (const a of (snapshot.achievements || [])) {
    if (!a?.unlockedAt) continue;
    out.push({ kind: 'achievement', label: String(a.key || 'Achievement').replace(/[-_]/g, ' '), at: num(a.unlockedAt) });
  }
  return out.filter(m => m.at > 0).sort((a, b) => b.at - a.at).slice(0, limit);
}

/**
 * Builds the whole parent-facing summary.
 *
 * `student` is the app_users row; `snapshot` is progress_sync.data, which is legitimately null for
 * an account that has never synced. That case returns a complete, zeroed summary rather than null,
 * so the dashboard renders "nothing yet" instead of an error state — a parent whose child signed
 * up an hour ago should see an empty dashboard, not a broken one.
 */
export function buildParentSummary({ student, snapshot, sourceUpdatedAt = null, now = Date.now() }) {
  const snap = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const user = snap.user && typeof snap.user === 'object' ? snap.user : {};

  const lessons = Array.isArray(snap.lessons) ? snap.lessons : [];
  const verified = lessons.filter(l => l?.verified).length;
  const studyDays = Array.isArray(snap.studyDays) ? snap.studyDays : [];
  const calendar = activityCalendar(studyDays, 56, now);
  const activeLast7 = calendar.slice(-7).filter(d => d.active).length;
  const activeLast28 = calendar.slice(-28).filter(d => d.active).length;

  const xp = clampInt(user.xp);

  return {
    v: SUMMARY_VERSION,
    student: {
      // The name and grade the student set on their own profile. Never the email — a parent who
      // needs it already has it (they invited that address, or were invited by it), and echoing
      // it back into a polled API response is a contact detail traveling for no reason.
      name: student?.name || null,
      gradeLevel: student?.grade_level || null,
      // Which health pathway they are currently on, so the dashboard's debt
      // trajectory comparison can highlight their child's row. It is a career
      // interest the student set themselves and already tells the parent
      // nothing they could not ask at dinner — unlike the coach chats, notes
      // and essays, which stay private and are not in this payload at all.
      // Null for a student who has not picked one, which is a real state and
      // renders as "not picked yet" rather than as a default.
      pathway: typeof user.specialty === 'string' && user.specialty ? user.specialty : null,
    },
    effort: {
      xp,
      level: levelFor(xp),
      // No streakDays — see the note above activityCalendar's neighbour. The 56-day calendar
      // below carries strictly more information and none of the compliance framing.
      activeDaysLast7: activeLast7,
      activeDaysLast28: activeLast28,
      calendar,
      lastActiveAt: studyDays.length ? studyDays.slice().sort().at(-1) : null,
      cardReviewsLast7: reviewsSince(snap.reviewCountsByDate, 7, now),
      cardReviewsLast28: reviewsSince(snap.reviewCountsByDate, 28, now),
    },
    coursework: {
      lessonsStarted: lessons.length,
      lessonsVerified: verified,
      unitsVerified: (snap.unitMastery || []).filter(u => u?.verifiedAt).length,
      quizzes: quizStats(snap.quizScores),
    },
    achievements: {
      unlocked: (snap.achievements || []).length,
    },
    milestones: milestones(snap),
    // Server time, echoed back by the client as `since` on the next poll. Freshness comparisons
    // stay on one clock this way, which is the only way they survive a student whose laptop clock
    // is wrong — and student clocks are wrong surprisingly often.
    sourceUpdatedAt,
    computedAt: new Date(now).toISOString(),
  };
}

/**
 * The cached read path.
 *
 * A student with two linked parents, each polling, would otherwise reparse a multi-megabyte JSON
 * blob every few seconds to produce byte-identical output. parent_summary_cache stores the last
 * derivation keyed by the progress_sync.updated_at it came from, so the blob is only read when it
 * has actually changed.
 *
 * Every failure here degrades to computing fresh rather than failing the request: the cache is an
 * optimization and must never be the reason a parent sees an error.
 */
export async function getParentSummary(supabase, student) {
  const { data: sync } = await supabase
    .from('progress_sync')
    .select('data, updated_at')
    .eq('user_id', student.id)
    .maybeSingle();

  const sourceUpdatedAt = sync?.updated_at || null;

  const { data: cached } = await supabase
    .from('parent_summary_cache')
    .select('summary, source_updated_at')
    .eq('student_user_id', student.id)
    .maybeSingle();

  // The student's name and grade come from app_users, not from the snapshot, so a profile edit
  // must invalidate the cache too — otherwise a renamed student keeps their old name on the
  // dashboard until they next study, which reads as a bug and is impossible to explain.
  const cacheHit = cached?.summary
    && cached.summary.v === SUMMARY_VERSION
    && cached.source_updated_at === sourceUpdatedAt
    && cached.summary.student?.name === (student.name || null)
    && cached.summary.student?.gradeLevel === (student.grade_level || null);
  if (cacheHit) return cached.summary;

  const summary = buildParentSummary({ student, snapshot: sync?.data, sourceUpdatedAt });

  // Fire-and-forget: a failed cache write costs the next request a recomputation and nothing else.
  await supabase
    .from('parent_summary_cache')
    .upsert({
      student_user_id: student.id,
      summary,
      source_updated_at: sourceUpdatedAt,
      computed_at: new Date().toISOString(),
    }, { onConflict: 'student_user_id' })
    .then(() => {}, () => {});

  return summary;
}
