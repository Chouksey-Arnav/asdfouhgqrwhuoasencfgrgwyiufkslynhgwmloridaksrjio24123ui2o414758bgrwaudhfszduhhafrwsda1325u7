// ─────────────────────────────────────────────────────────────────────────────
// Module 5 — Progress detail.
//
// Four readings, in one place: pathway track completion, quiz trend by topic,
// flashcard retention, and practice-test trend.
//
// ── Why these four and in this order ────────────────────────────────────────
// They are the four things a student can actually move this month, ordered by
// how directly they move them. Track completion is entirely under their
// control; quiz scores respond within a week; retention responds over weeks;
// test scores are the slowest and noisiest, which is exactly why they belong
// last rather than at the top where a two-point dip would ruin an evening.
//
// ── Everything is a fraction or a direction ─────────────────────────────────
// No composite score, no index, no points. Each reading is either "x of y" or
// "up/down n since last time", because both are checkable claims a student can
// verify against their own memory. A synthesized 0–100 "progress score" would
// be more compact and strictly less useful: nobody can act on it going from 61
// to 64, and nobody outside this app knows what it means.
//
// Trends are stated with their own sample size ("across 4 tests") so a student
// can see when a direction is not yet a trend. Two data points is a line, not
// a pattern, and reporting it as one is how a dashboard loses trust.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { C, glass, glass2, R, CC, tint } from '../../lib/theme';
import { SectionTitle } from '../ui/PanelHero';
import { Bar } from '../ui/primitives';

/** A trend needs at least this many points before it is called a trend. */
const MIN_TREND_POINTS = 3;

function Delta({ value, suffix = '', sample = null }) {
  if (value == null) return <span style={{ fontSize: 11, color: C.t3 }}>not enough data yet</span>;
  const flat = Math.abs(value) < 0.5;
  const up = value > 0;
  const color = flat ? C.t3 : up ? C.greenL : C.roseL;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span style={{ ...R({ gap: 8 }), fontSize: 11.5, color, fontFamily: C.FM }}>
      <Icon size={12} />
      {flat ? 'holding steady' : `${up ? '+' : ''}${Math.round(value)}${suffix}`}
      {sample && <span style={{ color: C.t3 }}>· {sample}</span>}
    </span>
  );
}

function Panel({ title, sub, children }) {
  return (
    <div style={glass2({ padding: 16 })}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.t3, marginBottom: 8, lineHeight: 1.4 }}>{sub}</div>}
      {children}
    </div>
  );
}

export default function ProgressDetail({
  trackLabel = 'your pathway',
  lessonsDone = 0, lessonsTotal = 0,
  units = [],                 // [{ id, title, pct }]
  catStats = [],              // [{ cat, avg, taken, total }]
  quizHistory = [],           // [{ score, ... }] oldest first
  retention = null,           // 0–100, or null when nothing is scheduled yet
  cardsTracked = 0,
  testScores = [],            // test_scores rows
  accent = C.blue, m = false,
}) {
  // Quiz trend: the last few scores against the few before them. A rolling
  // comparison rather than first-vs-last, because first-vs-last is dominated by
  // whichever quiz they happened to open on day one.
  const quizTrend = useMemo(() => {
    const scores = (quizHistory || []).map(q => Number(q?.score)).filter(Number.isFinite);
    if (scores.length < MIN_TREND_POINTS) return { delta: null, sample: null };
    const half = Math.min(5, Math.floor(scores.length / 2));
    const recent = scores.slice(-half);
    const prior = scores.slice(-(half * 2), -half);
    if (!prior.length) return { delta: null, sample: null };
    const mean = (a) => a.reduce((s, n) => s + n, 0) / a.length;
    return { delta: mean(recent) - mean(prior), sample: `across ${scores.length} quizzes` };
  }, [quizHistory]);

  // Practice-test trend: composite of the two most recent, plus the count.
  const testTrend = useMemo(() => {
    const rows = (testScores || [])
      .filter(r => Number.isFinite(Number(r?.composite)) && !r?.is_target)
      .sort((a, b) => String(a.test_date || '').localeCompare(String(b.test_date || '')));
    if (rows.length < 2) return { delta: null, latest: rows.at(-1)?.composite ?? null, count: rows.length, sample: null };
    const latest = Number(rows.at(-1).composite);
    const prev = Number(rows.at(-2).composite);
    return {
      delta: latest - prev, latest, count: rows.length,
      sample: `across ${rows.length} test${rows.length === 1 ? '' : 's'}`,
      firm: rows.length >= MIN_TREND_POINTS,
    };
  }, [testScores]);

  const trackPct = lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;
  const scoredCats = (catStats || []).filter(c => c.avg != null);

  return (
    <div style={glass({ padding: m ? 18 : 22 })}>
      <SectionTitle icon={BarChart3} color={accent}>Progress detail</SectionTitle>
      <p style={{ fontSize: 12.5, color: C.t3, margin: '0 0 16px', lineHeight: 1.5 }}>
        Four readings you can move. Each one is a fraction or a direction — nothing here is a score
        out of a hundred that only means something inside this app.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>

        {/* 1 — Track completion */}
        <Panel title="Pathway track" sub={trackLabel}>
          <div style={{ ...R({ justifyContent: 'space-between' }), marginBottom: 8 }}>
            <span style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FM }}>
              {lessonsDone} of {lessonsTotal}
            </span>
            <span style={{ fontSize: 11.5, color: C.t3, fontFamily: C.FM }}>{trackPct}%</span>
          </div>
          <Bar pct={trackPct} color={trackPct === 100 ? C.green : accent} h={5} glow={trackPct > 40} />
          {units.length > 0 && (
            <div style={{ ...CC({ gap: 8 }), marginTop: 8 }}>
              {units.slice(0, 4).map(u => (
                <div key={u.id} style={R({ gap: 8 })}>
                  <span style={{
                    flex: 1, fontSize: 11, color: u.pct === 100 ? C.greenL : C.t3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{u.title}</span>
                  <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM, flexShrink: 0 }}>{u.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* 2 — Quiz trend by topic */}
        <Panel title="Quizzes by topic" sub="Average score in each subject, and which way it is moving">
          <div style={{ marginBottom: 8 }}>
            <Delta value={quizTrend.delta} suffix=" pts" sample={quizTrend.sample} />
          </div>
          {scoredCats.length === 0 ? (
            <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.45 }}>
              Take a quiz and this fills in by subject.
            </div>
          ) : (
            <div style={CC({ gap: 8 })}>
              {scoredCats.map(c => (
                <div key={c.cat}>
                  <div style={{ ...R({ justifyContent: 'space-between' }), marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: C.t2 }}>{c.cat}</span>
                    <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>
                      {c.avg}% · {c.taken} of {c.total}
                    </span>
                  </div>
                  <Bar pct={c.avg} color={c.avg >= 80 ? C.green : c.avg >= 60 ? C.amber : C.rose} h={3} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* 3 — Flashcard retention */}
        <Panel title="Flashcard retention" sub="How much of what you have studied you would recall right now">
          {retention == null || cardsTracked === 0 ? (
            <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.45 }}>
              Nothing scheduled yet. Retention appears once you have reviewed a deck at least once.
            </div>
          ) : (
            <>
              <div style={{ ...R({ justifyContent: 'space-between' }), marginBottom: 8 }}>
                <span style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FM }}>{retention}%</span>
                <span style={{ fontSize: 11, color: C.t3, fontFamily: C.FM }}>
                  {cardsTracked} card{cardsTracked === 1 ? '' : 's'} tracked
                </span>
              </div>
              <Bar pct={retention} color={retention >= 85 ? C.green : retention >= 70 ? C.amber : C.rose} h={5} />
              <div style={{ fontSize: 10.5, color: C.t3, marginTop: 8, lineHeight: 1.45 }}>
                {retention >= 85
                  ? 'Strong. Reviews are landing before you forget.'
                  : retention >= 70
                    ? 'Slipping a little — clearing due cards on time is what pulls this back up.'
                    : 'A backlog has built up. Cards you review late are cards you learn twice.'}
              </div>
            </>
          )}
        </Panel>

        {/* 4 — Practice test trend */}
        <Panel title="Practice tests" sub="Slowest of the four to move, and the noisiest — read it monthly, not weekly">
          {testTrend.latest == null ? (
            <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.45 }}>
              No practice tests logged yet.
            </div>
          ) : (
            <>
              <div style={{ ...R({ justifyContent: 'space-between' }), marginBottom: 8 }}>
                <span style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FM }}>{testTrend.latest}</span>
                <Delta value={testTrend.delta} sample={testTrend.sample} />
              </div>
              {/* Sample-size honesty. Two tests is a line between two points. */}
              <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.45 }}>
                {testTrend.count < MIN_TREND_POINTS
                  ? `${testTrend.count} test${testTrend.count === 1 ? '' : 's'} logged — not yet enough to call a direction. Log a third and this becomes a trend.`
                  : 'Enough tests logged to read the direction with some confidence.'}
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
