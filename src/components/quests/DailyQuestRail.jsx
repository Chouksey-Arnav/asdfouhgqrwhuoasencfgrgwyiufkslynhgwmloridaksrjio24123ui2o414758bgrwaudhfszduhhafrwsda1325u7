// ─────────────────────────────────────────────────────────────────────────────
// Today's three — the daily quest rail.
//
// ── What this is for ────────────────────────────────────────────────────────
// The long quests answer "what am I working toward over the next month". This
// answers the only question a student actually asks at 7pm on a Tuesday: "is it
// worth opening this right now, and what would I do first".
//
// So it is a rail of exactly three cards, it is drawn near the top of Home, and
// each card ends in either a Claim button or a one-tap route to the surface the
// work happens on. There is never a state where the right next action is
// ambiguous.
//
// ── Why the set bonus is drawn as a fourth thing, not a footnote ────────────
// Clearing all three pays more than the gold quest does. That is the mechanic
// that gets the third card done on an evening a student would have stopped after
// two, and it only works if it is visible from the start — a bonus you discover
// after you have already earned it changes no behavior at all. So the progress
// track sits above the cards, filling as they are claimed, and the bonus tile is
// drawn from the first render rather than appearing when it is won.
//
// ── Three shapes, one component ─────────────────────────────────────────────
//   full     Home and the quest board. Three cards, the track, the bonus.
//   compact  A single line for a tab header — the featured quest for that
//            surface, or the bonus when everything is claimable.
// The compact form deliberately shares the visual language of QuestStrip and
// PathwayStreakStrip: a tinted line, an icon, a sentence, a chevron. A student
// should read all three as the same kind of object.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Gift, Sunrise, Loader2, Lock, Clock3 } from 'lucide-react';
import { C, glass, glass2, pill, R, CC, tint, btn, onTint } from '../../lib/theme';
import { DAILY_SET_BONUS, featuredDaily } from '../../lib/dailyQuests';
import { questIcon } from './questIcons';

/** Hours left in the local day — the honest version of "resets at midnight". */
function hoursLeftToday(now = new Date()) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return Math.max(0, Math.round((end - now) / 3600000));
}

function ResetNote({ m }) {
  const h = hoursLeftToday();
  return (
    <span style={{ ...R({ gap: 4 }), fontSize: 10, color: C.t4, flexShrink: 0 }}>
      <Clock3 size={10} />
      {h <= 1 ? 'Resets within the hour' : `Resets in ${h}h`}
    </span>
  );
}

// ── One card ─────────────────────────────────────────────────────────────────
function DailyCard({ row, onClaim, onGo, busy, m }) {
  const Icon = questIcon(row.quest.icon);
  const color = row.tier.color;
  const state = row.claimed ? 'claimed' : row.claimable ? 'claimable' : 'open';
  const accent = state === 'claimed' ? C.green : state === 'claimable' ? C.green : color;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...glass2({ padding: m ? 12 : 14 }),
        border: `1px solid ${tint(accent, state === 'open' ? 0.22 : 0.4)}`,
        background: state === 'claimed'
          ? tint(C.green, 0.06)
          : `linear-gradient(140deg, ${tint(accent, state === 'claimable' ? 0.13 : 0.08)}, transparent 72%)`,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 8,
        opacity: state === 'claimed' ? 0.82 : 1,
      }}
    >
      <div style={R({ gap: 8, alignItems: 'flex-start' })}>
        <div style={{
          width: 34, height: 34, borderRadius: 12, flexShrink: 0,
          background: tint(accent, 0.15), border: `1px solid ${tint(accent, 0.32)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {state === 'claimed'
            ? <Check size={16} color={C.greenL} strokeWidth={3} />
            : <Icon size={16} color={accent} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={R({ gap: 4, flexWrap: 'wrap' })}>
            <span style={pill(tint(color, 0.15), color, { fontSize: 8.5, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', padding: '4px 8px' })}>
              {row.tier.label}
            </span>
            <span style={{ fontSize: 9.5, color: C.t4, fontFamily: C.FM }}>{row.tier.minutes}</span>
          </div>
          <div style={{
            fontSize: m ? 12.5 : 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD,
            marginTop: 4, lineHeight: 1.3,
            textDecoration: state === 'claimed' ? 'line-through' : 'none',
            textDecorationColor: tint(C.green, 0.6),
          }}>{row.quest.title}</div>
        </div>
        <span style={{
          ...pill(tint(C.amber, 0.13), C.amberL, { fontSize: 9.5, fontFamily: C.FM, fontWeight: 800, flexShrink: 0 }),
        }}>+{row.xp}</span>
      </div>

      <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.45, minHeight: 30 }}>{row.quest.blurb}</div>

      {/* Progress — only while there is progress to make. A finished card showing
          a full bar is a bar nobody reads; the button is the message by then. */}
      {!row.done && (
        <div>
          <div style={{ height: 5, borderRadius: 4, background: tint(C.t3, 0.14), overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${row.pct}%` }} transition={{ duration: 0.45 }}
              style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${tint(color, 0.65)})` }}
            />
          </div>
          <div style={{ ...R({ justifyContent: 'space-between', gap: 4 }), marginTop: 4 }}>
            <span style={{ fontSize: 10, color: C.t3, fontFamily: C.FM }}>
              {row.progress}/{row.target} {row.metric.unit || ''}{row.target === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      {row.claimed ? (
        <div style={{ ...R({ gap: 4 }), fontSize: 10.5, color: C.greenL, fontWeight: 700 }}>
          <Check size={11} strokeWidth={3} />Claimed
        </div>
      ) : row.claimable ? (
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => onClaim?.(row)} disabled={busy}
          style={{
            ...btn(`linear-gradient(135deg, ${C.green}, ${C.greenL})`, { fontSize: 12, padding: '8px 12px', width: '100%', color: onTint(C.green) }),
            opacity: busy ? 0.6 : 1,
          }}
        >{busy ? <Loader2 size={12} className="spin" /> : <Gift size={13} />}Claim +{row.xp} XP</motion.button>
      ) : (
        <button
          onClick={() => onGo?.(row.destination)}
          style={{ ...btn(tint(color, 0.16), { fontSize: 11.5, padding: '8px 12px', width: '100%', color, border: `1px solid ${tint(color, 0.3)}` }) }}
        >{row.destination.label}<ChevronRight size={12} /></button>
      )}
    </motion.div>
  );
}

// ── The set bonus ────────────────────────────────────────────────────────────
function BonusTile({ day, onClaim, busy, m }) {
  const bonus = day.setBonus;
  const state = bonus.claimed ? 'claimed' : bonus.claimable ? 'claimable' : 'locked';
  const accent = state === 'locked' ? C.t3 : C.gold || C.amber;

  return (
    <div style={{
      ...R({ gap: 12, flexWrap: 'wrap' }),
      padding: m ? '11px 13px' : '13px 16px', borderRadius: 12,
      background: state === 'claimable'
        ? `linear-gradient(120deg, ${tint(C.amber, 0.16)}, ${tint(C.orange, 0.05)})`
        : state === 'claimed' ? tint(C.green, 0.06) : C.s2,
      border: `1px solid ${state === 'locked' ? C.b1 : tint(state === 'claimed' ? C.green : C.amber, 0.34)}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: tint(state === 'claimed' ? C.green : accent, 0.15),
        border: `1px solid ${tint(state === 'claimed' ? C.green : accent, 0.3)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {state === 'claimed' ? <Check size={15} color={C.greenL} strokeWidth={3} />
          : state === 'claimable' ? <Gift size={15} color={C.amberL} />
            : <Lock size={13} color={C.t4} />}
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
          {DAILY_SET_BONUS.label} · +{DAILY_SET_BONUS.xp} XP
        </div>
        <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4, lineHeight: 1.45 }}>
          {state === 'claimed'
            ? 'Taken. All three cleared today — that is the whole set.'
            : state === 'claimable'
              ? 'All three claimed. This is worth more than any single one of them.'
              : `Claim all three of today's quests to unlock this. ${day.claimed}/${day.total} so far.`}
        </div>
      </div>
      {state === 'claimable' && (
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={onClaim} disabled={busy}
          style={{ ...btn(`linear-gradient(135deg, ${C.amber}, ${C.orange})`, { fontSize: 12, padding: '8px 16px', color: onTint(C.amber) }), opacity: busy ? 0.6 : 1, flexShrink: 0 }}
        >{busy ? <Loader2 size={12} className="spin" /> : <Gift size={13} />}Claim bonus</motion.button>
      )}
    </div>
  );
}

// ── The rail ─────────────────────────────────────────────────────────────────
export default function DailyQuestRail({
  day,                  // evaluateDay() output
  onClaim,              // (row) → Promise
  onClaimSet,           // () → Promise
  onGo,                 // (destination) → void
  busyKey = null,       // claim key currently in flight
  surface = null,       // compact mode: which tab this is being drawn on
  compact = false,
  streakHint = null,    // streakOverlap() output — one line tying today's set to the streak
  m = false,
}) {
  if (!day?.rows?.length) return null;

  // ── Compact: one line for a tab header ─────────────────────────────────────
  if (compact) {
    if (day.setBonus.claimable) {
      return (
        <button
          onClick={onClaimSet}
          disabled={busyKey === day.setBonus.key}
          style={{
            width: '100%', textAlign: 'left', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: m ? '10px 12px' : '11px 14px', borderRadius: 12,
            background: tint(C.amber, 0.11), border: `1px solid ${tint(C.amber, 0.32)}`,
            opacity: busyKey === day.setBonus.key ? 0.6 : 1,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: tint(C.amber, 0.16), border: `1px solid ${tint(C.amber, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Gift size={14} color={C.amberL} /></div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.t1, fontWeight: 700, lineHeight: 1.45 }}>
            All three daily quests done — claim the {DAILY_SET_BONUS.label} bonus, +{DAILY_SET_BONUS.xp} XP.
          </div>
          <ChevronRight size={13} color={C.amberL} style={{ flexShrink: 0 }} />
        </button>
      );
    }

    const featured = featuredDaily(day, surface);
    if (!featured) return null;
    const Icon = questIcon(featured.quest.icon);
    const color = featured.claimable ? C.green : featured.tier.color;

    return (
      <button
        onClick={() => (featured.claimable ? onClaim?.(featured) : onGo?.(featured.destination))}
        disabled={busyKey === featured.key}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: m ? '10px 12px' : '11px 14px', borderRadius: 12,
          background: tint(color, 0.08), border: `1px solid ${tint(color, 0.24)}`,
          opacity: busyKey === featured.key ? 0.6 : 1,
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: tint(color, 0.16), border: `1px solid ${tint(color, 0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{featured.claimable ? <Gift size={14} color={C.greenL} /> : <Icon size={14} color={color} />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.t1, fontWeight: 700, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {featured.claimable ? `${featured.quest.title} — done` : featured.quest.title}
            <span style={{ color: C.t3, fontWeight: 500 }}> · today</span>
          </div>
          <div style={{ fontSize: 10.5, color: featured.claimable ? C.greenL : C.t3, marginTop: 4, lineHeight: 1.4 }}>
            {featured.claimable
              ? `Claim +${featured.xp} XP`
              : `${featured.progress}/${featured.target} · +${featured.xp} XP · ${day.claimed}/${day.total} done today`}
          </div>
        </div>
        <ChevronRight size={13} color={C.t3} style={{ flexShrink: 0 }} />
      </button>
    );
  }

  // ── Full ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      ...glass({ padding: m ? 15 : 18 }),
      border: `1px solid ${tint(C.cyan || C.blue, 0.24)}`,
      background: `linear-gradient(150deg, ${tint(C.cyan || C.blue, 0.07)}, transparent 68%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', right: -60, top: -60, width: 190, height: 190, borderRadius: '50%', background: `radial-gradient(circle, ${tint(C.cyan || C.blue, 0.14)}, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'relative', ...R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }) }}>
        <div style={R({ gap: 8 })}>
          <div style={{
            width: 34, height: 34, borderRadius: 12, flexShrink: 0,
            background: tint(C.cyan || C.blue, 0.15), border: `1px solid ${tint(C.cyan || C.blue, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Sunrise size={17} color={C.cyanL || C.blueL} /></div>
          <div>
            <div style={{ fontSize: m ? 14.5 : 16, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>
              Today&rsquo;s three
            </div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{day.headline}</div>
          </div>
        </div>
        <ResetNote m={m} />
      </div>

      {/* The track. Fills as cards are CLAIMED rather than as they are finished,
          because claiming is the action the bonus is gated on and a track that
          filled early would make the last tap look optional. */}
      <div style={{ position: 'relative', marginTop: 12 }}>
        <div style={{ height: 6, borderRadius: 4, background: C.s2, overflow: 'hidden', border: `1px solid ${C.b0}` }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round((day.claimed / Math.max(1, day.total)) * 100)}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${C.cyan || C.blue}, ${C.amber})` }}
          />
        </div>
        <div style={{ ...R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }), marginTop: 4 }}>
          <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>
            {day.claimed} of {day.total} claimed
            {day.xpAvailable > 0 && <span style={{ color: C.greenL, fontWeight: 700 }}> · {day.xpAvailable} XP waiting</span>}
          </span>
          <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>
            {day.xpTotal} XP on the table today
          </span>
        </div>
      </div>

      {/* The one honest line tying today's set to the streak, when there is one. */}
      {streakHint && (
        <div style={{
          ...R({ gap: 8 }), marginTop: 12, padding: '8px 12px', borderRadius: 8,
          background: tint(C.amber, 0.08), border: `1px solid ${tint(C.amber, 0.2)}`,
        }}>
          <span style={{ fontSize: 11, color: C.t2, lineHeight: 1.45 }}>{streakHint.text}</span>
        </div>
      )}

      {/* Cards */}
      <div style={{
        position: 'relative', marginTop: 12,
        display: 'grid', gap: 8,
        gridTemplateColumns: m ? '1fr' : 'repeat(auto-fit, minmax(190px, 1fr))',
      }}>
        {day.rows.map((row) => (
          <DailyCard
            key={row.key} row={row}
            onClaim={onClaim} onGo={onGo}
            busy={busyKey === row.key} m={m}
          />
        ))}
      </div>

      <div style={{ position: 'relative', marginTop: 12 }}>
        <BonusTile day={day} onClaim={onClaimSet} busy={busyKey === day.setBonus.key} m={m} />
      </div>
    </div>
  );
}

/**
 * Tomorrow's set, one line. Shown once today is fully cleared.
 *
 * This is the cheapest retention mechanic in the whole product: it converts "I
 * finished today" into "I know what tomorrow is", which is a materially
 * different feeling to close an app on.
 */
export function TomorrowPeek({ quests = [], m = false }) {
  if (!quests.length) return null;
  return (
    <div style={{
      ...R({ gap: 8, flexWrap: 'wrap' }),
      padding: m ? '9px 12px' : '10px 14px', borderRadius: 12,
      background: C.s2, border: `1px dashed ${C.b2}`,
    }}>
      <Sunrise size={13} color={C.t3} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: C.t3, lineHeight: 1.5, minWidth: 0 }}>
        <b style={{ color: C.t2 }}>Tomorrow:</b>{' '}
        {quests.map((q) => q.title.toLowerCase()).join(' · ')}
      </span>
    </div>
  );
}
