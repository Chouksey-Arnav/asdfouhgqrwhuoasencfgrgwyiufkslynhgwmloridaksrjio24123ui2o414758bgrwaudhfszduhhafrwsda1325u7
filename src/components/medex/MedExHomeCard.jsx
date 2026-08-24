// ─────────────────────────────────────────────────────────────────────────────
// The MedEx Score on Home.
//
// ── What earns a place on this card ─────────────────────────────────────────
// Home answers one question: what do I do next. So this card is not a smaller
// copy of the breakdown panel — it carries only what changes a decision:
//
//   1. The score, and what it is measured against. A number without the
//      programme name attached is not interpretable, so the benchmark is on the
//      card, never one tap away.
//   2. What moved since last week's seal, which is the only comparison that
//      exists (the score does not change daily, by design).
//   3. How long until the next seal, and what is banked for it.
//   4. The single highest-value thing they could do about it, as a button that
//      goes to the place they would do it.
//
// Everything else — the five pillars, the per-college scores, the apex table,
// the uncertainty breakdown — lives in the panel and is deliberately not here.
//
// ── The states this has to render honestly ──────────────────────────────────
// Three of the four states are NOT a score, and each of them is a real product
// surface rather than an error:
//
//   • loading            — a skeleton with the right shape, not a spinner
//   • insufficient       — too little logged for a score to mean anything. The
//                          card says so plainly and turns into the shortest
//                          list of things that would produce one.
//   • blocked            — the benchmark has a published requirement the student
//                          does not meet. No number, just the sentence and the
//                          remedy, exactly as the Calculator does it.
//   • scored             — the dial.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import {
  Activity, ChevronRight, TrendingUp, TrendingDown, Minus, Target,
  ShieldAlert, Sparkles, ArrowUpRight, Trophy,
} from 'lucide-react';
import { C, glass, pill, R, tint, btn, btnG } from '../../lib/theme';
import MedExRing, { bandColor } from './MedExRing';
import SealCountdown from './SealCountdown';
import { MEDEX_COPY, weekLabel } from '../../lib/medex';

export default function MedExHomeCard({
  state = null,        // { loading, medex, seal } — see useMedEx in App.jsx
  onOpen,              // → Portfolio → MedEx breakdown
  onGoTo = null,       // (section) → the place a mover is actioned
  m = false,
  reducedMotion = false,
}) {
  const loading = !state || state.loading;
  const medex = state?.medex || null;
  const seal = state?.seal || null;
  const headline = medex?.headline || null;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return <Skeleton m={m} />;
  if (!medex?.available || !headline) return null;

  // ── No score yet, for a stated reason ────────────────────────────────────
  if (!headline.showsScore) {
    return headline.reason === 'insufficient-evidence'
      ? <NeedsEvidence headline={headline} benchmark={medex.benchmark} onGoTo={onGoTo} onOpen={onOpen} m={m} />
      : <Blocked headline={headline} onOpen={onOpen} m={m} />;
  }

  // ── The score ────────────────────────────────────────────────────────────
  const color = bandColor(headline.band);
  const delta = seal?.delta ?? null;
  const banked = seal?.banked ?? null;
  const shown = seal?.sealedScore ?? headline.score;
  const topMover = (headline.movers || []).find(mv => mv.points != null) || null;

  return (
    <div style={{
      ...glass({ padding: m ? 16 : 22 }),
      border: `1px solid ${tint(color, 0.3)}`,
      background: `linear-gradient(140deg, ${tint(color, 0.10)}, transparent 65%)`,
      position: 'relative', overflow: 'hidden',
    }} data-tour="medex-home">
      <div style={{
        position: 'absolute', right: -70, top: -70, width: 230, height: 230, borderRadius: '50%',
        background: `radial-gradient(circle, ${tint(color, 0.17)}, transparent 70%)`, pointerEvents: 'none',
      }} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', ...R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: m ? 14 : 16 }) }}>
        <span style={R({ gap: 8 })}>
          <Activity size={14} color={color} />
          <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', fontFamily: C.FD }}>
            {MEDEX_COPY.name}
          </span>
        </span>
        <button onClick={onOpen} style={{
          background: 'transparent', border: 'none', color: C.t3, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: 0,
        }}>Full breakdown<ChevronRight size={12} /></button>
      </div>

      {/* ── Dial + readout ─────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', display: 'flex', gap: m ? 14 : 22,
        alignItems: 'center', flexWrap: m ? 'wrap' : 'nowrap',
      }}>
        <MedExRing
          score={shown}
          band={headline.band}
          range={headline.range}
          size={m ? 150 : 186}
          stroke={m ? 11 : 14}
          caption={`of 1000`}
          reducedMotion={reducedMotion}
          idPrefix="medex-home"
        />

        <div style={{ flex: 1, minWidth: m ? '100%' : 210, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <DeltaLine delta={delta} seal={seal} />

          {/* The benchmark. Never omitted: the score is not interpretable
              without the name of the thing it is measured against. */}
          <div style={{
            background: C.surf2, border: `1px solid ${C.b1}`, borderRadius: 12, padding: '8px 12px',
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 4 }}>
              Measured against
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, lineHeight: 1.25 }}>
              {headline.program.name}
            </div>
            <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4, fontFamily: C.FM }}>
              {headline.admitRate.published != null
                ? `${(headline.admitRate.published * 100).toFixed(1)}% admitted`
                : `~${Math.round(headline.admitRate.rate * 100)}% admitted (estimated)`}
              {medex.benchmark.source === 'fallback' ? ' · stand-in' : ''}
            </div>
          </div>

          {/* Distance to the anchor the whole scale is defined by. */}
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            {headline.atOrAboveCohort ? (
              <span style={{ ...pill(tint(C.green, 0.15), C.greenL, { gap: 4 }) }}>
                <Trophy size={11} />At the admitted median
              </span>
            ) : (
              <span style={{ ...pill(tint(color, 0.14), color, { gap: 4, fontFamily: C.FM }) }}>
                <Target size={11} />{headline.toCohort} to the median admit
              </span>
            )}
            {headline.next && (
              <span style={pill(C.s3, C.t2, { fontFamily: C.FM })}>
                {headline.next.pointsAway} to {headline.next.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── The apex line — the reference that does not move ────────────── */}
      {medex.apex?.scoredCount > 0 && (
        <div style={{
          position: 'relative', marginTop: 12, padding: '8px 12px', borderRadius: 12,
          background: tint(C.gold, 0.06), border: `1px solid ${tint(C.gold, 0.18)}`,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <Sparkles size={12} color={C.gold} style={{ flexShrink: 0, marginTop: 4 }} />
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.45 }}>{medex.apex.sentence}</div>
        </div>
      )}

      {/* ── The seal ───────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginTop: 12 }}>
        <SealCountdown banked={banked} accent={color} />
      </div>

      {/* ── The one thing to do about it ───────────────────────────────── */}
      {topMover && (
        <div style={{
          position: 'relative', marginTop: 12, display: 'flex', gap: 8,
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 4 }}>
              Biggest move available
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, lineHeight: 1.35 }}>
              {topMover.label}
              <span style={{ color: C.greenL, fontFamily: C.FM, fontWeight: 700, marginLeft: 4 }}>
                +{topMover.points}
              </span>
            </div>
          </div>
          <button onClick={onOpen} style={btn(`linear-gradient(135deg, ${color}, ${tint(color, 0.75)})`, {
            fontSize: 12, padding: '8px 16px', flexShrink: 0,
          })}>See how<ArrowUpRight size={13} /></button>
        </div>
      )}
    </div>
  );
}

/**
 * Week-on-week movement.
 *
 * "No change" is rendered as a real state rather than a blank, because on a
 * weekly cadence most weeks legitimately do not move much, and an empty space
 * where a number should be reads as broken rather than as steady.
 */
function DeltaLine({ delta, seal }) {
  if (seal?.isFirstEver || delta == null) {
    return (
      <div>
        <div style={{ fontSize: 22, letterSpacing: 'calc(-0.4px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t2, fontFamily: C.FD, lineHeight: 1 }}>
          First seal
        </div>
        <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.4 }}>
          This is your starting position. Next Monday gives you the first week-on-week number.
        </div>
      </div>
    );
  }

  const up = delta > 0, flat = delta === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const col = flat ? C.t2 : up ? C.greenL : C.roseL;
  const since = seal?.comparedTo?.week_key ? weekLabel(seal.comparedTo.week_key) : 'last week';

  return (
    <div>
      <div style={R({ gap: 8 })}>
        <Icon size={18} color={col} />
        <span style={{ fontSize: 26, letterSpacing: 'calc(-0.53px + var(--msp-letter-spacing))', fontWeight: 900, color: col, fontFamily: C.FD, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {up ? '+' : ''}{delta}
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.4 }}>
        {flat
          ? `Level with your seal from ${since}. On a weekly scale that is normal — most real movement takes a month to show.`
          : `since ${since}${seal?.gapWeeks > 1 ? ` · ${seal.gapWeeks} weeks ago` : ''}`}
      </div>
    </div>
  );
}

/** Too little logged for a score to mean anything — with the shortest route out. */
function NeedsEvidence({ headline, benchmark, onGoTo, onOpen, m }) {
  const asks = (headline.whatWouldChange || []).slice(0, 3);
  return (
    <div style={{
      ...glass({ padding: m ? 16 : 20 }),
      border: `1px solid ${tint(C.blue, 0.26)}`,
      background: `linear-gradient(140deg, ${tint(C.blue, 0.08)}, transparent 65%)`,
    }} data-tour="medex-home">
      <div style={R({ gap: 8, marginBottom: 8 })}>
        <Activity size={14} color={C.blue} />
        <span style={{ fontSize: 11, fontWeight: 800, color: C.blue, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', fontFamily: C.FD }}>
          {MEDEX_COPY.name}
        </span>
      </div>

      <div style={{ fontSize: m ? 15 : 16.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.3, marginBottom: 8 }}>
        Not enough on the record for a score yet.
      </div>
      <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginBottom: 12 }}>
        {headline.explanation}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {asks.map(a => (
          <button key={a.key} onClick={() => onGoTo?.(a.key)} style={{
            textAlign: 'left', background: C.surf2, border: `1px solid ${C.b1}`, borderRadius: 8,
            padding: '8px 12px', cursor: onGoTo ? 'pointer' : 'default', display: 'flex',
            gap: 8, alignItems: 'flex-start', width: '100%',
          }}>
            <ChevronRight size={13} color={C.blue} style={{ flexShrink: 0, marginTop: 4 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{a.label}</span>
              <span style={{ display: 'block', fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.4 }}>{a.ask}</span>
            </span>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: C.t4, marginTop: 12, lineHeight: 1.45 }}>
        Once it starts, it will be measured against {benchmark?.profile?.name || 'your most selective school'} and seal once a week.
      </div>
      <button onClick={onOpen} style={btnG({ marginTop: 12, fontSize: 12, padding: '8px 12px' })}>
        How the score works<ChevronRight size={12} />
      </button>
    </div>
  );
}

/** The benchmark has a published requirement this student does not meet. */
function Blocked({ headline, onOpen, m }) {
  return (
    <div style={{
      ...glass({ padding: m ? 16 : 20 }),
      border: `1px solid ${tint(C.amber, 0.3)}`,
      background: `linear-gradient(140deg, ${tint(C.amber, 0.08)}, transparent 65%)`,
    }} data-tour="medex-home">
      <div style={R({ gap: 8, marginBottom: 8 })}>
        <ShieldAlert size={14} color={C.amber} />
        <span style={{ fontSize: 11, fontWeight: 800, color: C.amber, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', fontFamily: C.FD }}>
          {MEDEX_COPY.name}
        </span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, lineHeight: 1.35, marginBottom: 8 }}>
        {headline.headline}
      </div>
      <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>{headline.explanation}</div>
      <button onClick={onOpen} style={btnG({ marginTop: 12, fontSize: 12, padding: '8px 12px' })}>
        What would have to change<ChevronRight size={12} />
      </button>
    </div>
  );
}

/** A skeleton in the card's real shape — a spinner here would jump the layout. */
function Skeleton({ m }) {
  const size = m ? 150 : 186;
  return (
    <div style={{ ...glass({ padding: m ? 16 : 22 }), border: `1px solid ${C.b1}` }} aria-busy="true">
      <div style={{ width: 120, height: 11, borderRadius: 4, background: C.s3, marginBottom: 16 }} className="msp-shimmer" />
      <div style={{ display: 'flex', gap: m ? 14 : 22, alignItems: 'center', flexWrap: m ? 'wrap' : 'nowrap' }}>
        <div style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          border: `${m ? 11 : 14}px solid ${C.s2}`, boxSizing: 'border-box',
        }} className="msp-shimmer" />
        <div style={{ flex: 1, minWidth: m ? '100%' : 210, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ width: '55%', height: 26, borderRadius: 8, background: C.s3 }} className="msp-shimmer" />
          <div style={{ width: '100%', height: 58, borderRadius: 12, background: C.s2 }} className="msp-shimmer" />
          <div style={{ width: '70%', height: 20, borderRadius: 16, background: C.s2 }} className="msp-shimmer" />
        </div>
      </div>
    </div>
  );
}
