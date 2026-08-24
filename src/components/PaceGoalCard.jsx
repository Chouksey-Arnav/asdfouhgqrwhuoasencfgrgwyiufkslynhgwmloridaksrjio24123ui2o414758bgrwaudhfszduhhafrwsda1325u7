import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CalendarDays, Pencil, Check, X, RefreshCw, Trash2, TrendingUp, Flag } from 'lucide-react';
import { C, glass2, pill, btn, btnSm, R, CC } from '../lib/theme';
import {
  PACE_PRESETS, PACE_MIN_WEEKS, PACE_MAX_WEEKS, normalizeTargetWeeks,
  computePaceStatus, paceHeadline, paceTone, formatPaceDate,
} from '../lib/paceGoal';

// ── Pace goal card ────────────────────────────────────────────────────────────
// One component, three densities, so the Pathway tab and the Home dashboard can never drift
// into describing the same goal differently:
//
//   variant="full"     Pathway tab. Status + the full editor (presets, custom weeks, restart,
//                      remove). This is the only place a goal can be created or changed.
//   variant="compact"  Home dashboard. Status + progress + a button that deep-links into the
//                      Pathway tab to edit. Never edits in place — a goal change is a real
//                      commitment and belongs on the screen that shows what it costs per week.
//   variant="inline"   A single status line for tight spots.
//
// The component owns no goal state of its own beyond the open/closed editor: `goal` comes down
// from the DB and every change goes back up through onSetGoal/onClearGoal. That's deliberate —
// a pace goal is the one number in this app the student sets themselves, and a component that
// could quietly hold a divergent local copy of it is a component that can lie about it.

const TONES = {
  good: { color: C.green, light: C.greenL, dim: C.greenDim },
  warn: { color: C.amber, light: C.amberL, dim: C.amberDim },
  bad:  { color: C.rose,  light: C.roseL || C.rose, dim: C.roseDim },
};

export default function PaceGoalCard({
  goal,                       // stored row { targetWeeks, startedAt } | null
  pathwayLabel = 'this pathway',
  totalLessons = 0,
  doneLessons = 0,
  completedAts = [],
  accent = C.blue,
  variant = 'full',
  dismissed = false,          // student chose "no goal" — full variant collapses to a nudge
  onSetGoal,                  // (weeks, { keepStart }) => void
  onClearGoal,                // () => void
  onDismiss,                  // () => void  (only used by the full variant's "Not now")
  onEditRequest,              // compact variant: navigate to the Pathway tab
  isMobile = false,
}) {
  const [editing, setEditing] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState('');

  const hasGoal = !!goal?.targetWeeks;
  const status = computePaceStatus({ goal, totalLessons, doneLessons, completedAts });

  // Re-opening the editor should always start from what's actually stored, not from whatever
  // half-typed number was abandoned last time.
  useEffect(() => {
    if (editing) { setCustomValue(hasGoal ? String(goal.targetWeeks) : ''); setCustomError(''); }
  }, [editing, hasGoal, goal?.targetWeeks]);

  function applyWeeks(weeks, { keepStart }) {
    const n = normalizeTargetWeeks(weeks);
    if (!n) { setCustomError(`Enter a number of weeks between ${PACE_MIN_WEEKS} and ${PACE_MAX_WEEKS}.`); return; }
    onSetGoal?.(n, { keepStart });
    setEditing(false);
  }

  const tone = TONES[paceTone(status?.state)] || TONES.good;
  const perWeekIfSet = (weeks) => (totalLessons && weeks ? Math.ceil(totalLessons / weeks) : null);

  // ── The editor (shared by "set your first goal" and "change this goal") ─────
  //
  // Called as renderEditor(), NOT rendered as <Editor/>. A component declared inside another
  // component is a brand-new component *type* on every render, so React unmounts and remounts
  // its whole subtree each time the parent re-renders — which here means the weeks input loses
  // DOM focus after every single keystroke, making it impossible to type "12". Calling it
  // returns the same element tree with no component boundary, so the input is just an input.
  function renderEditor() {
    return (
      <div style={CC({ gap: 12 })}>
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55 }}>
          {totalLessons} lesson{totalLessons === 1 ? '' : 's'} in {pathwayLabel}. Pick a target — or type your own.
          {hasGoal ? ' Changing the number keeps the clock you already started; use Restart to reset it to today.' : ''}
        </div>
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          {PACE_PRESETS.map((p) => {
            const active = hasGoal && goal.targetWeeks === p.weeks;
            const per = perWeekIfSet(p.weeks);
            return (
              <button key={p.weeks}
                onClick={() => applyWeeks(p.weeks, { keepStart: hasGoal })}
                title={per ? `About ${per} lesson${per === 1 ? '' : 's'} a week` : undefined}
                style={{
                  ...btnSm(active ? accent : `${accent}18`, {
                    color: active ? C.onAccent : accent,
                    border: `1px solid ${accent}${active ? '' : '38'}`,
                    fontSize: 11.5, textAlign: 'left',
                  }),
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, lineHeight: 1.25,
                }}>
                <span style={{ fontWeight: 700 }}>{p.label}</span>
                {per != null && <span style={{ fontSize: 9.5, opacity: 0.85 }}>~{per}/week</span>}
              </button>
            );
          })}
        </div>
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          <div style={{ ...R({ gap: 4 }), background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.b2}`, borderRadius: 8, padding: '4px 8px' }}>
            <input
              type="number" inputMode="numeric" min={PACE_MIN_WEEKS} max={PACE_MAX_WEEKS}
              value={customValue}
              onChange={(e) => { setCustomValue(e.target.value); setCustomError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') applyWeeks(customValue, { keepStart: hasGoal }); }}
              placeholder="e.g. 6" aria-label="Custom number of weeks"
              style={{ width: 62, background: 'transparent', border: 'none', outline: 'none', color: C.t1, fontSize: 13, fontFamily: C.FM }}
            />
            <span style={{ fontSize: 11.5, color: C.t3 }}>weeks</span>
          </div>
          <button style={{ ...btn(accent, { fontSize: 12, padding: '8px 16px' }), display: 'inline-flex', alignItems: 'center', gap: 4 }}
            onClick={() => applyWeeks(customValue, { keepStart: hasGoal })}>
            <Check size={13} />{hasGoal ? 'Update goal' : 'Set my goal'}
          </button>
          {customValue && normalizeTargetWeeks(customValue) && totalLessons > 0 && (
            <span style={{ fontSize: 11, color: C.t3, alignSelf: 'center' }}>
              ≈ {Math.ceil(totalLessons / normalizeTargetWeeks(customValue))} lesson{Math.ceil(totalLessons / normalizeTargetWeeks(customValue)) === 1 ? '' : 's'} a week
            </span>
          )}
        </div>
        {customError && <div style={{ fontSize: 11, color: C.roseL || C.rose }}>{customError}</div>}
        <div style={R({ gap: 8, flexWrap: 'wrap' })}>
          {hasGoal && (
            <button style={{ ...btnSm(C.s4, { color: C.t2, fontSize: 11 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={() => applyWeeks(goal.targetWeeks, { keepStart: false })}>
              <RefreshCw size={11} />Restart from today
            </button>
          )}
          {hasGoal && (
            <button style={{ ...btnSm(C.roseDim, { color: C.roseL || C.rose, border: `1px solid ${C.rose}30`, fontSize: 11 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={() => { onClearGoal?.(); setEditing(false); }}>
              <Trash2 size={11} />Remove goal
            </button>
          )}
          <button style={btnSm('transparent', { color: C.t3, fontSize: 11 })}
            onClick={() => { setEditing(false); if (!hasGoal) onDismiss?.(); }}>
            {hasGoal ? 'Cancel' : 'Not now'}
          </button>
        </div>
      </div>
    );
  }

  // ── No goal yet ────────────────────────────────────────────────────────────
  if (!hasGoal) {
    if (variant !== 'full') {
      return (
        <div style={{ ...glass2({ padding: '12px 16px' }), display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Target size={15} color={accent} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>No pace goal set</div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>Give {pathwayLabel} a deadline you choose and this card starts tracking it.</div>
          </div>
          <button style={btnSm(`${accent}22`, { color: accent, border: `1px solid ${accent}40`, fontSize: 11 })} onClick={onEditRequest}>Set a goal</button>
        </div>
      );
    }
    if (dismissed && !editing) {
      return (
        <div style={{ ...glass2({ padding: '12px 16px' }), display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Target size={14} color={C.t3} />
          <span style={{ flex: 1, minWidth: 160, fontSize: 11.5, color: C.t3 }}>No pace goal on {pathwayLabel} — you can set one whenever you want.</span>
          <button style={btnSm(`${accent}18`, { color: accent, border: `1px solid ${accent}35`, fontSize: 11 })} onClick={() => setEditing(true)}>Set a pace goal</button>
        </div>
      );
    }
    return (
      <div style={glass2({ padding: '12px 16px' })}>
        <div style={R({ gap: 8, marginBottom: 8 })}>
          <Target size={15} color={accent} />
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Set a pace goal for {pathwayLabel}</div>
        </div>
        {renderEditor()}
      </div>
    );
  }

  // ── Live status ────────────────────────────────────────────────────────────
  const headline = paceHeadline(status);
  const targetDate = formatPaceDate(status.deadline);
  const projected = status.projectedFinishAt ? formatPaceDate(status.projectedFinishAt) : null;

  if (variant === 'inline') {
    return (
      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <CalendarDays size={13} color={tone.color} />
        <span style={{ fontSize: 11.5, color: C.t2 }}>{status.targetWeeks}-week goal · {status.doneLessons}/{status.totalLessons}</span>
        <span style={pill(tone.dim, tone.light, { fontSize: 10, fontWeight: 700 })}>{status.label}</span>
      </div>
    );
  }

  const body = (
    <>
      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
        <CalendarDays size={15} color={tone.color} />
        <div style={{ flex: 1, minWidth: 170 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>
            {status.targetWeeks}-week pace goal{variant === 'compact' ? ` · ${pathwayLabel}` : ''}
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>
            {status.doneLessons}/{status.totalLessons} verified · week {status.weekNumber} of {status.targetWeeks}
            {targetDate ? ` · target ${targetDate}` : ''}
          </div>
        </div>
        <span style={pill(tone.dim, tone.light, { fontSize: 10.5, fontWeight: 700 })}>{status.label}</span>
        {variant === 'full' && (
          <button aria-label="Change pace goal" title="Change your pace goal"
            style={{ ...btnSm(C.s4, { color: C.t2, fontSize: 11 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}
            onClick={() => setEditing((v) => !v)}>
            {editing ? <X size={11} /> : <Pencil size={11} />}{editing ? 'Close' : 'Change'}
          </button>
        )}
        {variant === 'compact' && onEditRequest && (
          <button style={btnSm(`${accent}18`, { color: accent, border: `1px solid ${accent}35`, fontSize: 11 })} onClick={onEditRequest}>Open pathway</button>
        )}
      </div>

      {/* Planned vs. actual, on one rail: the fill is real progress, the notch is where an even
          pace would have put them today. Seeing the gap is the entire point of a pace goal. */}
      <div style={{ position: 'relative', height: 6, borderRadius: 4, background: C.s3, marginTop: 12, overflow: 'visible' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${status.pct}%` }} transition={{ duration: 0.5 }}
          style={{ height: '100%', borderRadius: 4, background: tone.color, boxShadow: `0 0 10px ${tone.color}55` }} />
        {status.state !== 'complete' && (
          <div title={`An even pace would be ${status.expectedByNow} lesson${status.expectedByNow === 1 ? '' : 's'} by today`}
            style={{
              position: 'absolute', top: -3, left: `${Math.min(100, (status.expectedByNow / Math.max(1, status.totalLessons)) * 100)}%`,
              width: 2, height: 12, background: C.t2, opacity: 0.7, borderRadius: 4,
            }} />
        )}
      </div>

      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginTop: 8 }}>{headline}</div>

      <div style={R({ gap: 12, flexWrap: 'wrap', marginTop: 8 })}>
        {status.remaining > 0 && (
          <span style={{ fontSize: 10.5, color: C.t3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Flag size={11} />{status.neededPerWeek}/week to finish on time
          </span>
        )}
        {status.measuredPerWeek != null && (
          <span style={{ fontSize: 10.5, color: C.t3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={11} />your actual pace: {status.measuredPerWeek}/week
          </span>
        )}
        {projected && status.remaining > 0 && (
          <span style={{ fontSize: 10.5, color: C.t3 }}>at that rate you'd finish {projected}</span>
        )}
        <span style={{ fontSize: 10.5, color: C.t3 }}>{status.doneThisWeek} done in the last 7 days</span>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: `1px solid ${C.b1}`, marginTop: 12, paddingTop: 12 }}>{renderEditor()}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <div style={{ ...glass2({ padding: isMobile ? '13px 15px' : '14px 18px', background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${tone.color}66` }) }}>
      {body}
    </div>
  );
}
