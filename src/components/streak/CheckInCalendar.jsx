// ─────────────────────────────────────────────────────────────────────────────
// The check-in calendar — 28 tiles, drawn in full, with the big days visible
// from the first render.
//
// ── Why the whole cycle is drawn rather than just today ─────────────────────
// The reward for showing up used to be a single number revealed at the moment
// you claimed it. That is a slot machine with one arm and no paytable: it can
// surprise you, but it can never give you a reason to come back on Thursday
// specifically.
//
// Drawing all 28 tiles turns it into a plan. A student on day 12 can see that
// day 14 is a chest and six hours of Double XP, and that day 21 is a chest and a
// freeze. The distance to the next real reward is always visible, always small,
// and always renewed — which is the actual mechanic. The claim animation is
// nice; the calendar is the product.
//
// ── The two things this must never do ───────────────────────────────────────
//   1. Punish a miss. A skipped day is drawn dimmed and nothing else — no
//      "streak lost", no red, no recovery offer. This ladder is the forgiving
//      one on purpose (see GRACE_DAYS in lib/dailyCheckin.js); it is the
//      mechanic that gets a lapsed student back, and a mechanic that punishes
//      the lapse cannot do that job.
//   2. Pretend to be the streak. It carries its own color (sky, not amber),
//      its own icon and its own copy, and the panel it sits in says in one line
//      that this measures turning up while the streak measures work.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Gift, Snowflake, Zap, Lock, CalendarHeart, Loader2 } from 'lucide-react';
import { C, glass, glass2, pill, R, CC, tint, btn, onTint, lbl } from '../../lib/theme';
import { CYCLE_LENGTH, rewardSummary } from '../../lib/dailyCheckin';
import { BOOST_KINDS } from '../../lib/streak';

const ACCENT = C.sky;

/** The mark a tile carries: the biggest reward on it wins the icon. */
function tileIcon(row, size = 12) {
  if (row.chest) return <Gift size={size} color={C.amberL} />;
  if (row.boost) return <Zap size={size} color={C.violetL} />;
  if (row.freeze) return <Snowflake size={size} color={C.blueL} />;
  return null;
}

function Tile({ row, m, onSelect, selected }) {
  const isToday = row.state === 'today';
  const claimed = row.state === 'claimed';
  const accent = row.milestone ? (row.chest ? C.amber : row.boost ? C.violet : C.blue) : ACCENT;

  return (
    <button
      onClick={() => onSelect?.(row)}
      title={`Day ${row.day} — ${row.summary}`}
      aria-label={`Day ${row.day}, ${row.summary}${claimed ? ', claimed' : isToday ? ', today' : ''}`}
      style={{
        position: 'relative', cursor: 'pointer', padding: 0,
        aspectRatio: '1 / 1',
        minHeight: m ? 38 : 44,
        borderRadius: 8,
        background: claimed
          ? tint(C.green, 0.13)
          : isToday
            ? `linear-gradient(140deg, ${tint(accent, 0.28)}, ${tint(accent, 0.1)})`
            : row.milestone ? tint(accent, 0.08) : C.s2,
        border: selected
          ? `1.5px solid ${C.t1}`
          : isToday
            ? `1.5px solid ${accent}`
            : `1px solid ${claimed ? tint(C.green, 0.3) : row.milestone ? tint(accent, 0.28) : C.b1}`,
        boxShadow: isToday ? `0 0 18px ${tint(accent, 0.4)}` : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        opacity: !claimed && !isToday && !row.milestone ? 0.66 : 1,
        transition: 'transform .12s',
      }}
    >
      {claimed ? (
        <Check size={m ? 13 : 15} color={C.greenL} strokeWidth={3} />
      ) : (
        <>
          <span style={{
            fontSize: m ? 11 : 12, fontWeight: 800, fontFamily: C.FM, lineHeight: 1,
            color: isToday ? C.t1 : row.milestone ? accent : C.t3,
          }}>{row.day}</span>
          {tileIcon(row, m ? 10 : 11)}
        </>
      )}
      {/* The milestone marker: a small pip in the corner so the big days are
          findable at a glance without reading any of the numbers. */}
      {row.milestone && !claimed && (
        <span style={{
          position: 'absolute', top: 3, right: 3, width: 4, height: 4, borderRadius: '50%',
          background: accent,
        }} />
      )}
    </button>
  );
}

export default function CheckInCalendar({
  state,                 // loadCheckinState() output
  onClaim,               // () → Promise
  busy = false,
  m = false,
}) {
  const [selected, setSelected] = React.useState(null);
  if (!state?.cycle) return null;

  const { cycle, day, reward, claimable, cyclesDone } = state;
  const detail = selected || cycle.tiles.find((t) => t.day === day);
  const next = cycle.next;

  return (
    <div style={glass({ padding: m ? 16 : 22 })}>
      <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 })}>
        <div style={R({ gap: 8 })}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: tint(ACCENT, 0.14), border: `1px solid ${tint(ACCENT, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><CalendarHeart size={16} color={C.skyL} /></div>
          <div>
            <div style={{ ...lbl({ marginBottom: 4 }) }}>Check-in calendar</div>
            <div style={{ fontSize: 11.5, color: C.t3 }}>
              Day {day} of {CYCLE_LENGTH}
              {cyclesDone > 0 && ` · ${cyclesDone} full cycle${cyclesDone === 1 ? '' : 's'} finished`}
            </div>
          </div>
        </div>
        {claimable ? (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onClaim} disabled={busy}
            style={{ ...btn(`linear-gradient(135deg, ${ACCENT}, ${C.blue})`, { fontSize: 12.5, padding: '8px 16px', color: onTint(ACCENT) }), opacity: busy ? 0.6 : 1 }}
          >{busy ? <Loader2 size={13} className="spin" /> : <Gift size={14} />}Claim day {day}</motion.button>
        ) : (
          <span style={{ ...pill(tint(C.green, 0.13), C.greenL, { fontSize: 10.5, fontWeight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Check size={11} strokeWidth={3} />Today claimed
          </span>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, margin: '8px 0px 12px' }}>
        This is the ladder for <b style={{ color: C.t2 }}>turning up</b> — separate from the streak,
        which is the ladder for <b style={{ color: C.t2 }}>work done</b>. Missing a day here costs you
        that day&rsquo;s XP and nothing else: the cycle holds your place across a short gap.
      </div>

      {/* The grid — 7 across, 4 rows, so a week reads as a row. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: m ? 5 : 6 }}>
        {cycle.tiles.map((row) => (
          <Tile
            key={row.day} row={row} m={m}
            selected={selected?.day === row.day}
            onSelect={(r) => setSelected(selected?.day === r.day ? null : r)}
          />
        ))}
      </div>

      {/* Detail for whichever tile is selected (today by default). One panel
          rather than a tooltip, because on a phone a tooltip is unreachable. */}
      {detail && (
        <motion.div
          key={detail.day}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{
            ...glass2({ padding: 12 }), marginTop: 12,
            border: `1px solid ${detail.milestone ? tint(C.amber, 0.28) : C.b1}`,
            background: detail.milestone ? tint(C.amber, 0.06) : C.surf2,
          }}
        >
          <div style={R({ gap: 8, alignItems: 'flex-start' })}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: tint(detail.milestone ? C.amber : ACCENT, 0.14),
              border: `1px solid ${tint(detail.milestone ? C.amber : ACCENT, 0.28)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11.5, fontWeight: 800, fontFamily: C.FM, color: detail.milestone ? C.amberL : C.skyL,
            }}>{detail.day}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
                {detail.label || `Day ${detail.day}`}
                {detail.state === 'claimed' && <span style={{ color: C.greenL, fontWeight: 600 }}> · claimed</span>}
                {detail.state === 'today' && <span style={{ color: C.skyL, fontWeight: 600 }}> · today</span>}
              </div>
              <div style={{ fontSize: 11, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>
                {detail.blurb || `Turn up on day ${detail.day} and take ${rewardSummary(detail)}.`}
              </div>
              <div style={{ ...R({ gap: 4, flexWrap: 'wrap' }), marginTop: 8 }}>
                <span style={pill(tint(C.amber, 0.13), C.amberL, { fontSize: 10, fontFamily: C.FM, fontWeight: 800 })}>+{detail.xp} XP</span>
                {detail.chest && <span style={{ ...pill(tint(C.amber, 0.1), C.amberL, { fontSize: 10 }), display: 'inline-flex', gap: 4, alignItems: 'center' }}><Gift size={10} />Chest</span>}
                {detail.freeze > 0 && <span style={{ ...pill(C.blueDim, C.blueL, { fontSize: 10 }), display: 'inline-flex', gap: 4, alignItems: 'center' }}><Snowflake size={10} />{detail.freeze} freeze</span>}
                {detail.boost && (
                  <span style={{ ...pill(C.violetDim, C.violetL, { fontSize: 10 }), display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <Zap size={10} />{BOOST_KINDS[detail.boost]?.label} · {BOOST_KINDS[detail.boost]?.hours}h
                  </span>
                )}
                {detail.state === 'upcoming' && (
                  <span style={{ ...pill(C.s3, C.t4, { fontSize: 10 }), display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <Lock size={9} />in {detail.day - day} day{detail.day - day === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* The forward-looking line. This is the whole reason the calendar is
          drawn in full, so it gets its own row rather than being a caption. */}
      {next && (
        <div style={{
          ...R({ gap: 8 }), marginTop: 12, padding: '8px 12px', borderRadius: 8,
          background: tint(C.amber, 0.07), border: `1px solid ${tint(C.amber, 0.2)}`,
        }}>
          <Gift size={13} color={C.amberL} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>
            {next.inDays <= 1 ? 'Tomorrow' : `In ${next.inDays} days`} — <b style={{ color: C.t1 }}>day {next.day}</b>: {rewardSummary(next)}.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The compact form for Home: today's tile, what it pays, and the distance to the
 * next real reward. Renders nothing once today is claimed AND there is no
 * milestone worth naming — an always-present card with nothing in it is the
 * thing students learn to scroll past.
 */
export function CheckInHomeCard({ state, onClaim, onOpen, busy = false, m = false }) {
  if (!state) return null;
  const { day, reward, claimable, cycle } = state;
  const next = cycle?.next;
  if (!claimable && !next) return null;

  return (
    <div style={{
      ...glass({ padding: m ? 14 : 16 }),
      border: `1px solid ${tint(claimable ? ACCENT : C.b2, claimable ? 0.3 : 1)}`,
      background: claimable ? `linear-gradient(135deg, ${tint(ACCENT, 0.1)}, transparent 70%)` : C.surf,
      ...R({ gap: 12, flexWrap: 'wrap' }),
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: tint(ACCENT, 0.15), border: `1px solid ${tint(ACCENT, 0.32)}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 8, color: C.skyL, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>DAY</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: C.t1, fontFamily: C.FD, lineHeight: 1 }}>{day}</span>
      </div>
      <div style={{ flex: 1, minWidth: 170 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
          {claimable ? 'Check in for today' : 'Checked in'}
        </div>
        <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.45 }}>
          {claimable
            ? rewardSummary(reward)
            : next
              ? `${next.inDays <= 1 ? 'Tomorrow' : `${next.inDays} days`} → day ${next.day}: ${rewardSummary(next)}`
              : 'Come back tomorrow.'}
        </div>
      </div>
      {claimable ? (
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={onClaim} disabled={busy}
          style={{ ...btn(`linear-gradient(135deg, ${ACCENT}, ${C.blue})`, { fontSize: 12, padding: '8px 16px', color: onTint(ACCENT) }), flexShrink: 0, opacity: busy ? 0.6 : 1 }}
        >{busy ? <Loader2 size={12} className="spin" /> : <Gift size={13} />}Claim</motion.button>
      ) : (
        <button onClick={onOpen} style={{ background: 'transparent', border: 'none', color: C.t3, cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
          Calendar →
        </button>
      )}
    </div>
  );
}
