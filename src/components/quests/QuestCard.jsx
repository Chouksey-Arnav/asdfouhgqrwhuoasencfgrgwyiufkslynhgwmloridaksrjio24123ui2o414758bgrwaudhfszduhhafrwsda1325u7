// ─────────────────────────────────────────────────────────────────────────────
// The full quest card — the canonical student-facing rendering, used on the
// board. The parent dashboard deliberately does NOT reuse it: their row answers
// a different question (did the thing I asked for happen) and must not offer
// actions only the student may take, so it is its own small component in
// QuestAssignPanel.jsx rather than this one with half its buttons hidden.
// `compact` here is for dense student-side lists — same card, no day strip and
// no action row.
//
// It carries five things, and the order is the argument:
//
//   1. WHO ASKED. A quest a parent assigned leads with their name and their
//      note, above the numbers. That framing is most of why an assigned quest
//      gets finished, and burying it under a progress bar wastes it.
//   2. WHERE THEY ARE. Progress against target, and the day floor alongside it —
//      because "18/24 lessons" with 4 of 14 required days done is not 75%
//      finished, and a bar that says it is has lied.
//   3. WHAT TODAY LOOKS LIKE. The engine's per-day figure, in units, not
//      percentages.
//   4. THE DAY STRIP. Every day that carried work, and — importantly — the days
//      where the cap bit. A student who did 60 cards under a 25 cap must SEE
//      the 35 that did not count, or the cap reads as a bug.
//   5. ONE BUTTON. Claim if it is finished, otherwise the surface where the
//      work actually happens. A quest card with no way to act on it is a poster.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import {
  Check, Clock, ChevronRight, X, ShieldCheck, Users, Gift, AlertTriangle,
} from 'lucide-react';
import { C, glass, pill, R, tint, btn, btnG, onTint } from '../../lib/theme';
import {
  questHeadline, toneFor, destinationFor, QUEST_METRICS, QUEST_TIERS, getQuest, questColor,
} from '../../lib/quests';
import { questIcon } from './questIcons';

const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * The day strip: one cell per day of the window, filled where work landed.
 *
 * Deliberately not a chart. It answers two questions at a glance — "have I been
 * showing up" and "did anything get capped" — and a bar chart of daily volume
 * would answer neither without a legend.
 */
function DayStrip({ ev, color, m }) {
  const days = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const total = Math.min(ev.spec.windowDays, 45);
  const byDate = new Map(ev.byDay.map((d) => [d.date, d]));
  const start = new Date(ev.startedAt);
  start.setHours(12, 0, 0, 0);

  for (let i = 0; i < total; i += 1) {
    const d = new Date(start.getTime() + i * dayMs);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const row = byDate.get(key);
    const future = d.getTime() > Date.now();
    days.push({ key, row, future });
  }

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} aria-hidden="true">
      {days.map(({ key, row, future }) => (
        <div
          key={key}
          title={row ? `${key}: ${row.credited} counted${row.capped ? ` (${row.raw - row.credited} over the daily cap)` : ''}` : key}
          style={{
            width: m ? 7 : 9, height: m ? 7 : 9, borderRadius: 4,
            background: row ? (row.capped ? C.amber : color) : future ? 'transparent' : tint(C.t3, 0.16),
            border: `1px solid ${row ? 'transparent' : tint(C.t3, future ? 0.12 : 0.2)}`,
            opacity: row ? (row.credited >= ev.spec.dailyCap ? 1 : 0.6) : 1,
          }}
        />
      ))}
    </div>
  );
}

export default function QuestCard({
  quest,              // the assignment row
  ev,                 // evaluate() output
  onClaim,
  onGo,               // (destination) → navigate
  onDecline,
  onWithdraw,
  busy = false,
  compact = false,    // parent dashboard / dense lists: no action buttons, no day strip
  m = false,
}) {
  const def = getQuest(quest.questId);
  const color = questColor(def) || C.blue;
  const tone = toneFor(ev);
  const Icon = questIcon(def?.icon);
  const tier = QUEST_TIERS[quest.tier] || QUEST_TIERS.standard;
  const metric = QUEST_METRICS[ev.spec.metric] || {};
  const dest = destinationFor(ev.spec.metric);
  const assigned = quest.assignedBy === 'parent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...glass({ padding: m ? 15 : 18 }),
        border: `1px solid ${tint(ev.done ? tone.color : color, ev.done ? 0.45 : 0.24)}`,
        background: `linear-gradient(135deg, ${tint(ev.done ? tone.color : color, 0.09)}, transparent 68%)`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${ev.done ? tone.color : color}, transparent)` }} />

      {/* 1. Who asked ------------------------------------------------------- */}
      {assigned && (
        <div style={{
          ...R({ gap: 8 }), marginBottom: 12, padding: '8px 12px', borderRadius: 8,
          background: tint(C.violet, 0.1), border: `1px solid ${tint(C.violet, 0.24)}`,
        }}>
          <Users size={12} color={C.violetL} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 11.5, color: C.t1, lineHeight: 1.5, minWidth: 0 }}>
            <b style={{ color: C.violetL }}>{quest.assignerName || 'A parent'}</b> asked for this
            {quest.note && <span style={{ color: C.t2 }}> — “{quest.note}”</span>}
          </div>
        </div>
      )}

      <div style={{ ...R({ gap: 12, alignItems: 'flex-start' }) }}>
        <div style={{
          width: m ? 38 : 44, height: m ? 38 : 44, borderRadius: 12, flexShrink: 0,
          background: tint(color, 0.16), border: `1.5px solid ${tint(color, 0.34)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon size={m ? 17 : 20} color={color} /></div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }) }}>
            <div style={{ fontSize: m ? 14 : 15.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>{quest.title}</div>
            <span style={pill(tint(tier.color, 0.16), tier.color, { fontSize: 9.5, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'})}>{tier.label}</span>
            <span style={pill(tint(C.amber, 0.14), C.amberL, { fontSize: 10, fontFamily: C.FM, fontWeight: 800 })}>+{ev.xp} XP</span>
          </div>
          {def?.blurb && <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>{def.blurb}</div>}
        </div>

        {!compact && (onWithdraw || (onDecline && assigned)) && !ev.done && (
          <button
            onClick={assigned ? onDecline : onWithdraw}
            disabled={busy}
            title={assigned ? 'Decline this quest' : 'Drop this quest'}
            aria-label={assigned ? 'Decline this quest' : 'Drop this quest'}
            style={{ ...btnG({ padding: 4, borderRadius: 8, flexShrink: 0 }), opacity: busy ? 0.5 : 0.7 }}
          ><X size={13} /></button>
        )}
      </div>

      {/* 2. Where they are --------------------------------------------------- */}
      <div style={{ marginTop: 12 }}>
        <div style={{ ...R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }), marginBottom: 4 }}>
          <div style={{ fontSize: 12.5, color: C.t1, fontWeight: 700, fontFamily: C.FM }}>
            {ev.progress} <span style={{ color: C.t3, fontWeight: 500 }}>/ {ev.target} {metric.label || ''}</span>
          </div>
          <div style={{ ...R({ gap: 4 }), fontSize: 11, color: tone.color, fontWeight: 700 }}>
            {ev.done ? <Check size={11} /> : ev.state === 'lost' ? <AlertTriangle size={11} /> : <Clock size={11} />}
            {ev.done ? 'Complete' : `${ev.daysLeft}d left · due ${fmtDate(ev.dueAt)}`}
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: tint(C.t3, 0.14), overflow: 'hidden', position: 'relative' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${ev.pct}%` }} transition={{ duration: 0.5 }}
            style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${tone.color})` }}
          />
          {/* Where an evenly-paced student would be right now. A bar with no reference
              point cannot show "behind" — it can only show "not finished". */}
          {!ev.done && ev.expected > 0 && (
            <div
              title={`On an even pace you would be at ${ev.expected}`}
              style={{
                position: 'absolute', top: -2, bottom: -2,
                left: `${Math.min(100, Math.round((ev.expected / ev.target) * 100))}%`,
                width: 2, background: C.t2, opacity: 0.55,
              }}
            />
          )}
        </div>

        {/* The day floor, alongside — never folded into the percentage. */}
        {ev.minActiveDays > 0 && (
          <div style={{ ...R({ gap: 4 }), marginTop: 8, fontSize: 10.5, color: ev.daysMet ? C.greenL : C.t3 }}>
            <ShieldCheck size={11} color={ev.daysMet ? C.greenL : C.t3} />
            <span>
              {ev.activeDays} of {ev.minActiveDays} required days of work
              {!ev.daysMet && ev.progress >= ev.target && <b style={{ color: C.amberL }}> — the work is done, the days are not</b>}
            </span>
          </div>
        )}
      </div>

      {/* 3. What today looks like -------------------------------------------- */}
      <div style={{
        ...R({ gap: 8 }), marginTop: 12, padding: '8px 12px', borderRadius: 8,
        background: tint(tone.color, 0.09), border: `1px solid ${tint(tone.color, 0.22)}`,
      }}>
        <div style={{ fontSize: 11.5, color: C.t1, fontWeight: 600, lineHeight: 1.5, flex: 1, minWidth: 0 }}>
          {questHeadline(ev)}
        </div>
        <span style={pill(tint(tone.color, 0.14), tone.color, { fontSize: 9.5, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', flexShrink: 0 })}>{tone.label}</span>
      </div>

      {/* 4. The day strip ----------------------------------------------------- */}
      {!compact && (
        <div style={{ marginTop: 12 }}>
          <DayStrip ev={ev} color={color} m={m} />
          <div style={{ fontSize: 9.5, color: C.t3, marginTop: 4 }}>
            One square per day. At most {ev.spec.dailyCap} {metric.unit || 'unit'}{ev.spec.dailyCap === 1 ? '' : 's'} count per day
            {ev.byDay.some((d) => d.capped) && <span style={{ color: C.amberL }}> — amber days went over the cap</span>}.
          </div>
        </div>
      )}

      {/* 5. One button -------------------------------------------------------- */}
      {!compact && (
        <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 12 }}>
          {ev.done ? (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={onClaim} disabled={busy}
              style={{ ...btn(`linear-gradient(135deg, ${C.green}, ${C.greenL})`, { fontSize: 13, padding: '8px 20px', color: onTint(C.green) }), opacity: busy ? 0.6 : 1 }}
            ><Gift size={14} />Claim +{ev.xp} XP</motion.button>
          ) : (
            <button
              onClick={() => onGo?.(dest)}
              style={{ ...btn(`linear-gradient(135deg, ${color}, ${tint(color, 0.7)})`, { fontSize: 12.5, padding: '8px 16px', color: onTint(color) }) }}
            >{dest.label}<ChevronRight size={13} /></button>
          )}
          {def?.proof && (
            <div style={{ fontSize: 10.5, color: C.t3, flex: 1, minWidth: 180, lineHeight: 1.5, alignSelf: 'center' }}>{def.proof}</div>
          )}
        </div>
      )}
    </motion.div>
  );
}
