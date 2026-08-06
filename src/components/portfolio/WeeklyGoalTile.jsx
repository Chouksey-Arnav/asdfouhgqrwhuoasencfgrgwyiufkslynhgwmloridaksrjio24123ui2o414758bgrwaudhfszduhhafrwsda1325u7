import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope, ScrollText, Compass, Send, GraduationCap, Award, FlaskConical, Mic,
  UserCheck, CalendarClock, BadgeCheck, Target, Check, Brain, ArrowRight, Minus, Plus, X, Pencil,
} from 'lucide-react';
import { C, glass, glass2, btnSm, R, tint, onTint, accentText } from '../../lib/theme';

// Metric registry ids (weeklyGoals.js) → the icon/color this tile draws with. The registry itself
// stays free of React and lucide imports so the Node verify script can import it; this is where
// those string keys become actual UI.
const ICONS = {
  stethoscope: Stethoscope, scrollText: ScrollText, compass: Compass, send: Send,
  graduationCap: GraduationCap, award: Award, flask: FlaskConical, mic: Mic,
  userCheck: UserCheck, calendarClock: CalendarClock, badgeCheck: BadgeCheck,
};
const colorOf = (key) => C[key] || C.blue;

/**
 * One mini dashboard: a single part of the application, with this week's measured value, the
 * student's own weekly target, and Meta Brain's standing recommendation.
 *
 * The interaction rule this component exists to enforce: **Meta Brain never sets the goal.** The
 * recommendation is always visible and always explained, but it takes a deliberate tap on
 * "Use this" (which is the student choosing it) or a typed number to write anything. There is no
 * code path here that persists a target without a user gesture.
 */
export default function WeeklyGoalTile({
  metric, value = 0, target = null, pct = null, met = false, remaining = null, source = null,
  recommendation = null, history = [], total = null, daysLeft = 7,
  onSetGoal, onClearGoal, onOpen, compact = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => String(target ?? recommendation?.target ?? metric.defaultTarget));
  const [showWhy, setShowWhy] = useState(false);

  const Icon = ICONS[metric.iconKey] || Target;
  const color = colorOf(metric.colorKey);
  const progressColor = met ? C.green : color;
  const hasGoal = target != null;

  // "On pace" is measured against how much of the week is gone, not against the finish line —
  // being at 40% on Wednesday is fine, being at 40% on Sunday is not, and a bar that can't tell
  // those apart is decoration.
  const expectedPct = Math.round(((7 - daysLeft + 1) / 7) * 100);
  const pacing = !hasGoal ? null : met ? 'done' : (pct ?? 0) >= expectedPct ? 'on-track' : (pct ?? 0) >= expectedPct - 25 ? 'close' : 'behind';
  const pacingMeta = {
    done: { label: 'Goal met', color: C.green },
    'on-track': { label: 'On pace', color: C.green },
    close: { label: 'Slightly behind', color: C.amber },
    behind: { label: 'Behind pace', color: C.rose },
  }[pacing] || null;

  function commit(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) { setEditing(false); return; }
    onSetGoal?.(metric.id, n, 'user');
    setEditing(false);
  }

  function useRecommendation() {
    if (!recommendation) return;
    // Still a user action — the student is choosing Meta Brain's number, not having it chosen
    // for them. Recorded with its own source so the tile can say so honestly afterwards.
    onSetGoal?.(metric.id, recommendation.target, 'user:recommended');
    setEditing(false);
  }

  const spark = useMemo(() => sparkPoints(history), [history]);

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        ...glass({ padding: compact ? 14 : 16 }),
        borderTop: `2px solid ${met ? C.green : tint(color, 0.55)}`,
        background: met
          ? `linear-gradient(160deg,${tint(C.green, 0.10)},rgba(255,255,255,0.02) 60%)`
          : `linear-gradient(160deg,${tint(color, 0.07)},rgba(255,255,255,0.02) 60%)`,
        display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
      }}
    >
      {/* ── Header: what this is, and the door into it ── */}
      <div style={R({ gap: 9, alignItems: 'flex-start' })}>
        <div style={{
          width: 30, height: 30, borderRadius: 9, background: tint(color, 0.16),
          border: `1px solid ${tint(color, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={15} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD, lineHeight: 1.25 }}>{metric.label}</div>
          {total != null && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{total} {metric.totalLabel}</div>}
        </div>
        {onOpen && (
          <button onClick={() => onOpen(metric.view)} aria-label={`Open ${metric.label}`} title={`Open ${metric.label}`}
            style={{ all: 'unset', cursor: 'pointer', padding: 4, borderRadius: 6, color: C.t3, display: 'flex' }}>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* ── The number, and what it's measured against ── */}
      <div style={R({ gap: 8, alignItems: 'baseline' })}>
        <span style={{ fontSize: 26, fontWeight: 800, fontFamily: C.FM, color: met ? C.green : C.t1, lineHeight: 1 }}>
          {formatValue(value)}
        </span>
        {hasGoal && <span style={{ fontSize: 13, color: C.t3, fontFamily: C.FM }}>/ {formatValue(target)}</span>}
        <span style={{ fontSize: 10.5, color: C.t3, marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {metric.unitShort || metric.unit} this week
        </span>
      </div>

      {/* ── Progress ── */}
      {hasGoal ? (
        <div>
          <div style={{ height: 7, background: C.s4, borderRadius: 7, overflow: 'hidden', position: 'relative' }}
            role="progressbar" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100}
            aria-label={`${metric.label}: ${value} of ${target} ${metric.unit}`}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct ?? 0)}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', borderRadius: 7, background: `linear-gradient(90deg,${progressColor},${tint(progressColor, 0.55)})`, boxShadow: met ? `0 0 10px ${tint(C.green, 0.5)}` : 'none' }}
            />
            {/* Pace marker — where you'd be if you spread the goal evenly across the week. */}
            {!met && (
              <div title="Where an even pace puts you today"
                style={{ position: 'absolute', top: -1, bottom: -1, left: `${Math.min(99, expectedPct)}%`, width: 2, background: C.b3, borderRadius: 2 }} />
            )}
          </div>
          <div style={R({ justifyContent: 'space-between', marginTop: 6, gap: 8 })}>
            <span style={{ fontSize: 10.5, color: pacingMeta?.color || C.t3, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {met ? <><Check size={11} />Goal met</> : pacingMeta?.label}
            </span>
            <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>
              {met ? `+${formatValue(value - target)} over` : `${formatValue(remaining ?? 0)} ${metric.unitShort || metric.unit} to go`}
            </span>
          </div>
        </div>
      ) : (
        // Same shape as the filled state, deliberately: an empty track reads as "a bar that
        // could be filling and isn't", which is the feeling that makes someone set a target.
        // A dashed callout box here just added height and said the same thing as the button.
        <div>
          <div style={{ height: 7, background: C.s4, borderRadius: 7, opacity: 0.6 }} aria-hidden />
          <div style={{ fontSize: 10.5, color: C.t3, marginTop: 6 }}>No goal yet — you decide the number.</div>
        </div>
      )}

      {/* ── Meta Brain's standing recommendation (never auto-applied) ── */}
      {recommendation && (
        <div style={{
          ...glass2({ padding: '8px 10px' }),
          background: tint(C.violet, 0.07), border: `1px solid ${tint(C.violet, 0.2)}`,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={R({ gap: 6 })}>
            <Brain size={12} color={C.violetL} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: C.t2, flex: 1, minWidth: 0 }}>
              Meta Brain suggests <b style={{ color: accentText(C.violet), fontFamily: C.FM }}>{formatValue(recommendation.target)}</b> {metric.unit}
            </span>
            <button onClick={() => setShowWhy((w) => !w)} aria-expanded={showWhy}
              style={{ all: 'unset', cursor: 'pointer', fontSize: 10, color: C.t3, textDecoration: 'underline dotted' }}>
              {showWhy ? 'hide' : 'why?'}
            </button>
          </div>
          {showWhy && (
            <div style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.55 }}>
              {recommendation.rationale} It's a suggestion — you set your own goal.
            </div>
          )}
          {!editing && target !== recommendation.target && (
            <button onClick={useRecommendation}
              style={btnSm(tint(C.violet, 0.16), { color: onTint(C.violet), fontSize: 10.5, alignSelf: 'flex-start', border: `1px solid ${tint(C.violet, 0.28)}` })}>
              <Target size={11} />{hasGoal ? `Switch to ${formatValue(recommendation.target)}` : `Use ${formatValue(recommendation.target)}`}
            </button>
          )}
        </div>
      )}

      {/* ── The student's own control ── */}
      {editing ? (
        <div style={R({ gap: 6, flexWrap: 'wrap' })}>
          <button aria-label="Decrease target" onClick={() => setDraft((d) => String(Math.max(metric.min, Number(d || 0) - metric.step)))}
            style={btnSm(C.s3, { color: C.t1, padding: '6px 9px' })}><Minus size={12} /></button>
          <input
            value={draft} onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
            aria-label={`Weekly target for ${metric.label}`}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(draft); if (e.key === 'Escape') setEditing(false); }}
            style={{
              width: 68, textAlign: 'center', background: C.inputBg, border: `1px solid ${tint(color, 0.4)}`,
              borderRadius: 8, padding: '7px 8px', color: C.t1, fontSize: 14, fontFamily: C.FM, outline: 'none',
            }}
          />
          <button aria-label="Increase target" onClick={() => setDraft((d) => String(Math.min(metric.ceiling, Number(d || 0) + metric.step)))}
            style={btnSm(C.s3, { color: C.t1, padding: '6px 9px' })}><Plus size={12} /></button>
          <button onClick={() => commit(draft)} style={btnSm(tint(color, 0.2), { color: onTint(color), fontSize: 11 })}>
            <Check size={12} />Set goal
          </button>
          <button onClick={() => setEditing(false)} aria-label="Cancel" style={btnSm(C.s3, { color: C.t3, padding: '6px 9px' })}><X size={12} /></button>
          <div style={{ width: '100%', fontSize: 10, color: C.t4 }}>
            Realistic range for this tracker: {metric.min}–{metric.ceiling} {metric.unit} per week.
          </div>
        </div>
      ) : (
        <div style={R({ gap: 6, flexWrap: 'wrap' })}>
          <button onClick={() => { setDraft(String(target ?? recommendation?.target ?? metric.defaultTarget)); setEditing(true); }}
            style={btnSm(hasGoal ? C.s3 : tint(color, 0.18), { color: hasGoal ? C.t2 : onTint(color), fontSize: 11 })}>
            {hasGoal ? <><Pencil size={11} />Change goal</> : <><Pencil size={11} />Pick my own number</>}
          </button>
          {hasGoal && (
            <button onClick={() => onClearGoal?.(metric.id)} style={btnSm('transparent', { color: C.t3, fontSize: 11, border: `1px solid ${C.b1}` })}>
              Clear
            </button>
          )}
          {spark && (
            <div title="Your last 6 weeks" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
              {spark.map((h, i) => (
                <div key={i} style={{
                  width: 5, height: `${Math.max(8, h * 100)}%`, borderRadius: 2,
                  background: i === spark.length - 1 ? color : tint(color, 0.35),
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {source === 'user:recommended' && hasGoal && !editing && (
        <div style={{ fontSize: 9.5, color: C.t4 }}>You picked Meta Brain's suggested number for this week.</div>
      )}
    </motion.div>
  );
}

function formatValue(n) {
  const num = Number(n) || 0;
  if (Math.abs(num) >= 1000) return num.toLocaleString();
  return Number.isInteger(num) ? String(num) : String(Math.round(num * 10) / 10);
}

/** Normalizes a history series to 0..1 bar heights, or null when there's nothing to show. */
function sparkPoints(history) {
  if (!Array.isArray(history) || history.length < 2) return null;
  const max = Math.max(...history);
  if (!max) return null;
  return history.map((v) => v / max);
}
