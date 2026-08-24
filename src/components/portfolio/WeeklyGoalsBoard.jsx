import React, { useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Brain, Target, Flame, Loader2, SlidersHorizontal, Check, CalendarRange, Sparkles } from 'lucide-react';
import { C, glass, glass2, btnSm, R, CC, pill, tint, onTint, accentText } from '../../lib/theme';
import { Arc } from '../ui/primitives';
import { renderMarkdown } from '../../lib/renderMarkdown';
import { getCached, setCached, dailyKey } from '../../lib/aiCache';
import {
  METRICS, METRIC_BY_ID, measureWeek, measureHistory, summarizeWeek, weekHeadline,
  recommendTarget, pinnedMetrics, setPinned, setGoal, goalStreak, goalsForWeek,
  recordWeekResult, getIsoWeekKey, weekLabel, daysLeftInWeek, weekRange,
  weeksToNearestDeadline, currentLoadHours,
} from '../../lib/weeklyGoals';
import WeeklyGoalTile from './WeeklyGoalTile';

// ─────────────────────────────────────────────────────────────────────────────
// The Portfolio Overview's weekly command strip: one mini dashboard per part of the application,
// each with a target the STUDENT set and a bar that fills as real rows land.
//
// The division of labor between the student and Meta Brain is the whole design:
//
//   Meta Brain  — measures, recommends, explains, and reports. Constantly. Every tile carries its
//                 current suggested number and the reasoning behind it, and the header carries a
//                 written read on the week.
//   The student — decides. Nothing on this board writes a target without a tap. "Use this number"
//                 is a choice, not an automation, and the tile says so afterwards.
//
// That line exists because a goal someone else set for you is a chore, and a goal you set is a
// commitment. The urge to close the bar only shows up on the second kind.
// ─────────────────────────────────────────────────────────────────────────────
export default function WeeklyGoalsBoard({
  user, snapshot, loading = false, onSaveUser, onOpen, askMedabrain, isMobile = false,
  benchmarks = {}, clinicalHoursTotal = 0, accent = C.blue,
}) {
  const [picking, setPicking] = useState(false);
  const [aiRead, setAiRead] = useState(null); // { loading, content, error }
  const closedWeeksRef = useRef(new Set());

  const ids = useMemo(() => pinnedMetrics(user), [user]);
  const measurements = useMemo(() => measureWeek(snapshot || {}), [snapshot]);
  const history = useMemo(() => measureHistory(snapshot || {}, 6), [snapshot]);
  const summary = useMemo(() => summarizeWeek({ user, measurements, metricIds: ids }), [user, measurements, ids]);
  const streak = useMemo(() => goalStreak(user), [user]);
  const daysLeft = daysLeftInWeek();

  // Recommendation context — every input is a real, measured thing about this student, which is
  // what keeps the suggested numbers inside the realm of the possible (rule 2 in weeklyGoals.js).
  const recCtx = useMemo(() => ({
    weeksToNearestDeadline: weeksToNearestDeadline(snapshot),
    gradeLevel: user?.gradeLevel || user?.grade || null,
    daysLeft,
    currentLoadHours: currentLoadHours(snapshot),
    benchmarkGap: Math.max(0, ((benchmarks.clinicalHours || 60) + (benchmarks.shadowingHours || 20)) - clinicalHoursTotal),
  }), [snapshot, user, daysLeft, benchmarks, clinicalHoursTotal]);

  const recommendations = useMemo(() => {
    const out = {};
    for (const m of METRICS) out[m.id] = recommendTarget(m.id, { ...recCtx, history: history[m.id] || [] });
    return out;
  }, [recCtx, history]);

  // ── Close out finished weeks ───────────────────────────────────────────────
  // A week's outcome is stamped into history once it's over, so the streak survives after the
  // underlying rows age out of whatever the UI happens to have loaded. Guarded by a ref as well
  // as recordWeekResult's own idempotency, so a re-render storm can't fire a save loop.
  useEffect(() => {
    if (!user || !snapshot) return;
    const goals = user.portfolioGoals?.weeks || {};
    const currentKey = getIsoWeekKey();
    let next = user;
    let changed = false;
    for (const key of Object.keys(goals)) {
      if (key === currentKey || goals[key]?.result || closedWeeksRef.current.has(key)) continue;
      const anchor = anchorDateForWeekKey(key);
      if (!anchor) continue;
      const past = {};
      for (const m of METRICS) {
        try { past[m.id] = m.measure(snapshot, weekRange(anchor)) || 0; } catch { past[m.id] = 0; }
      }
      const updated = recordWeekResult(next, key, past);
      if (updated !== next) { next = updated; changed = true; }
      closedWeeksRef.current.add(key);
    }
    if (changed) onSaveUser?.(next);
  }, [user, snapshot, onSaveUser]);

  // ── Meta Brain's written read on the week ──────────────────────────────────
  // Cached per day AND per actual week state, so it refreshes when the student's numbers move
  // rather than only at midnight. The deterministic headline underneath always renders, so this
  // failing (offline, rate-limited, signed out) costs commentary, never substance.
  const readKey = useMemo(() => {
    if (!snapshot) return null;
    const sig = summary.rows.map((r) => `${r.id}:${r.value}:${r.target ?? 'x'}`).join('|');
    return dailyKey('portfolioWeekRead', user?.id || user?.email || 'anon', summary.weekKey, sig);
  }, [snapshot, summary, user]);

  useEffect(() => {
    if (!askMedabrain || !readKey || !summary.goalsSet) { setAiRead(null); return; }
    const cached = getCached(readKey);
    if (cached) { setAiRead({ loading: false, content: cached, error: null }); return; }
    let cancelled = false;
    setAiRead({ loading: true, content: null, error: null });
    const lines = summary.rows.filter((r) => r.target != null)
      .map((r) => `${r.metric.short}: ${r.value}/${r.target} ${r.metric.unit} (${r.pct}%)`).join('; ');
    askMedabrain(
      `This student set their own weekly Portfolio goals and is ${summary.daysLeft} day(s) from the end of the week. Their real progress: ${lines}. In 2-3 sentences, speak to them directly: name the one goal to push on first and why, and acknowledge anything already finished. Never invent a number that isn't listed, and never tell them what their goal should have been — they chose these.`,
    ).then((content) => {
      if (cancelled) return;
      setCached(readKey, content);
      setAiRead({ loading: false, content, error: null });
    }).catch((err) => { if (!cancelled) setAiRead({ loading: false, content: null, error: err.message }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- askMedabrain is recreated every render by App.jsx
  }, [readKey, summary.goalsSet]);

  // ── Writes (always from a user gesture) ────────────────────────────────────
  function handleSetGoal(metricId, target, source) {
    const metric = METRIC_BY_ID[metricId];
    const next = setGoal(user, metricId, target, { source });
    onSaveUser?.(next);
    const saved = goalsForWeek(next)[metricId];
    toast.success(`Your goal this week: ${saved.target} ${metric.unit} of ${metric.short.toLowerCase()}.`, { icon: <Target size={16} /> });
  }

  function handleClearGoal(metricId) {
    onSaveUser?.(setGoal(user, metricId, null));
  }

  function togglePinned(metricId) {
    const current = pinnedMetrics(user);
    const next = current.includes(metricId) ? current.filter((id) => id !== metricId) : [...current, metricId];
    if (!next.length) { toast('Keep at least one tracker on your dashboard.', { icon: '📌' }); return; }
    onSaveUser?.(setPinned(user, next));
  }

  const headline = weekHeadline(summary, { hasData: !!snapshot });
  const ringColor = summary.allMet ? C.green : summary.overallPct >= 60 ? accent : summary.overallPct > 0 ? C.amber : C.t3;

  return (
    <section aria-label="Weekly portfolio goals" style={CC({ gap: 12 })}>
      {/* ── Week header ── */}
      <div style={{
        ...glass({ padding: isMobile ? 16 : 20 }),
        background: `linear-gradient(125deg,${tint(accent, 0.12)},${tint(C.violet, 0.05)} 55%,rgba(255,255,255,0.02))`,
        border: `1px solid ${tint(accent, 0.26)}`,
      }}>
        <div style={R({ gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' })}>
          <Arc pct={summary.overallPct} size={isMobile ? 62 : 72} stroke={6} color={ringColor}
            label={`${summary.overallPct}%`} sub="of goals" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 4 })}>
              <span style={{ fontSize: 10, fontWeight: 800, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>
                Your week
              </span>
              <span style={pill(C.s3, C.t2, { fontSize: 10, gap: 4 })}><CalendarRange size={10} />{weekLabel()}</span>
              <span style={pill(tint(daysLeft <= 2 ? C.rose : accent, 0.14), daysLeft <= 2 ? C.roseL : accentText(accent), { fontSize: 10 })}>
                {daysLeft === 1 ? 'Final day' : `${daysLeft} days left`}
              </span>
              {streak > 0 && (
                <span style={pill(tint(C.orange, 0.15), C.orangeL, { fontSize: 10, gap: 4 })}>
                  <Flame size={10} />{streak}-week goal streak
                </span>
              )}
            </div>
            <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>
              {summary.goalsSet
                ? `${summary.goalsMet} of ${summary.goalsSet} weekly goal${summary.goalsSet === 1 ? '' : 's'} met`
                : 'Set your goals for this week'}
            </div>
            <div style={{ fontSize: 12, color: C.t2, marginTop: 4, lineHeight: 1.55, maxWidth: 620 }}>
              {/* Zeros drawn before the fetch lands read as "you did nothing this week", which is
                  both false and demoralizing. Say what's actually happening instead. */}
              {loading && !snapshot ? 'Measuring this week from your real Portfolio entries…' : headline}
            </div>
          </div>
          <button onClick={() => setPicking((p) => !p)} aria-expanded={picking}
            style={btnSm(C.s3, { color: C.t2, fontSize: 11, alignSelf: 'center' })}>
            <SlidersHorizontal size={12} />Choose trackers
          </button>
        </div>

        {/* Meta Brain's commentary, layered on top of the computed headline above. */}
        {(aiRead?.loading || aiRead?.content) && (
          <div style={{
            ...glass2({ padding: 12, marginTop: 12 }),
            background: tint(C.violet, 0.07), border: `1px solid ${tint(C.violet, 0.2)}`,
          }}>
            <div style={R({ gap: 8, marginBottom: aiRead.content ? 6 : 0 })}>
              <Brain size={13} color={C.violetL} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: accentText(C.violet), letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>
                Meta Brain on your week
              </span>
            </div>
            {aiRead.loading
              ? <div style={R({ gap: 8, fontSize: 11.5, color: C.t3 })}><Loader2 size={12} className="spin" />Reading your week…</div>
              : <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(aiRead.content) }} />}
          </div>
        )}

        {/* Tracker picker */}
        <AnimatePresence initial={false}>
          {picking && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>
                <div style={{ fontSize: 11, color: C.t3, marginBottom: 8 }}>
                  Pick the parts of your application you want on your dashboard. Everything stays tracked either way — this only decides what you look at every day.
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {METRICS.map((m) => {
                    const on = ids.includes(m.id);
                    const c = C[m.colorKey] || C.blue;
                    return (
                      <button key={m.id} onClick={() => togglePinned(m.id)} aria-pressed={on}
                        style={pill(on ? tint(c, 0.2) : C.surf2, on ? onTint(c) : C.t3, {
                          cursor: 'pointer', border: `1px solid ${on ? tint(c, 0.4) : C.b1}`, fontSize: 11, gap: 4,
                        })}>
                        {on && <Check size={10} />}{m.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── The mini dashboards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(258px,1fr))', gap: 12 }}>
        {ids.map((id) => {
          const row = summary.rows.find((r) => r.id === id);
          const metric = METRIC_BY_ID[id];
          if (!metric || !row) return null;
          return (
            <WeeklyGoalTile
              key={id}
              metric={metric}
              value={row.value}
              target={row.target}
              pct={row.pct}
              met={row.met}
              remaining={row.remaining}
              source={row.source}
              recommendation={recommendations[id]}
              history={history[id]}
              total={metric.total ? metric.total(snapshot || {}) : null}
              daysLeft={daysLeft}
              onSetGoal={handleSetGoal}
              onClearGoal={handleClearGoal}
              onOpen={onOpen}
            />
          );
        })}
      </div>

      {/* First-run nudge — the invitation to author goals, with Meta Brain's numbers visible but
          nothing applied until the student picks. */}
      {!summary.goalsSet && (
        <div style={{
          ...glass2({ padding: 12 }),
          background: `linear-gradient(120deg,${tint(C.violet, 0.08)},rgba(255,255,255,0.02) 60%)`,
          border: `1px solid ${tint(C.violet, 0.22)}`,
        }}>
          <div style={R({ gap: 8, marginBottom: 4 })}>
            <Sparkles size={13} color={C.violetL} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>Goals are yours to set</span>
          </div>
          <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, margin: 0 }}>
            Meta Brain has a recommended number on every tracker above, based on your real pace and your actual deadlines — but it will never set one for you.
            Pick two or three you genuinely intend to hit this week. A goal you chose is the only kind that pulls.
          </p>
        </div>
      )}
    </section>
  );
}

/** A Date inside the ISO week named by `key` ("2026-W32"), for re-measuring a finished week. */
function anchorDateForWeekKey(key) {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  const [, year, week] = m;
  // ISO week 1 contains Jan 4th; walk back to its Monday, then forward (week-1) weeks.
  const jan4 = new Date(Number(year), 0, 4);
  const day = jan4.getDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - (day - 1));
  const d = new Date(week1Monday);
  d.setDate(week1Monday.getDate() + (Number(week) - 1) * 7);
  return d;
}
