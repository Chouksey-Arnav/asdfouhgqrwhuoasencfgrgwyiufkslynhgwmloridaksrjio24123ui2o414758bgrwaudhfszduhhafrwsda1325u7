// ─────────────────────────────────────────────────────────────────────────────
// The comeback — what the app says the morning after a streak actually breaks.
//
// ── The moment this exists for ─────────────────────────────────────────────
// A student with a 60-day streak misses a Saturday. On Monday they open the app
// and the number says 0. Everything they built is gone, the screen that used to
// be the reason to open the app is now the reason not to, and — in the honest
// version of what happens next — they stop opening it.
//
// That moment previously had no surface at all. This is it. It appears only when
// there is a real, recent break worth buying back, it names the number that was
// lost, and it offers exactly one action.
//
// ── Why it is not free, and not unlimited ──────────────────────────────────
// A free repair makes the streak meaningless: if a broken streak is always one
// tap from restored, nothing was ever at stake and the whole mechanic stops
// motivating anybody. So it costs XP scaled to what was lost, it is available
// only for a few days after the break, and only once a month.
//
// And critically, a repaired day is recorded as REPAIRED, never as earned — the
// same status a streak freeze produces. It holds the run together and it can
// never complete a Perfect Week, a Perfect Month, or a study-day quest. You can
// buy back continuity. You cannot buy credit for work you did not do.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { HeartCrack, RotateCcw, Loader2, Info, Clock } from 'lucide-react';
import { C, glass, pill, R, CC, tint, btn, btnG, onTint } from '../../lib/theme';
import { REPAIR_COOLDOWN_DAYS } from '../../lib/streak';

const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function StreakRepairCard({
  offer,              // repairOffer() output, or null
  xp = 0,
  onRepair,           // () → Promise
  busy = false,
  m = false,
}) {
  if (!offer) return null;

  const accent = offer.available ? C.violet : C.t3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        ...glass({ padding: m ? 16 : 20 }),
        border: `1px solid ${tint(accent, 0.32)}`,
        background: `linear-gradient(150deg, ${tint(accent, 0.1)}, transparent 70%)`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', right: -55, top: -55, width: 170, height: 170, borderRadius: '50%', background: `radial-gradient(circle, ${tint(accent, 0.16)}, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', ...R({ gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }) }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: tint(accent, 0.15), border: `1px solid ${tint(accent, 0.32)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><HeartCrack size={19} color={accent} /></div>

        <div style={{ flex: 1, minWidth: 190 }}>
          <div style={{ fontSize: m ? 15 : 16.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.02em + var(--msp-letter-spacing))' }}>
            {offer.headline}
          </div>
          <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.55 }}>
            You can buy it back. {offer.missedDays === 1 ? 'The missed day' : `The ${offer.missedDays} missed days`} will
            be marked as repaired — the run continues from {offer.lost} and keeps going — but repaired days never
            count as earned ones.
          </div>

          <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 8 }}>
            <span style={pill(tint(C.amber, 0.13), C.amberL, { fontSize: 10.5, fontFamily: C.FM, fontWeight: 800 })}>
              {offer.cost.toLocaleString()} XP
            </span>
            <span style={pill(C.s3, C.t3, { fontSize: 10.5, fontFamily: C.FM })}>
              restores {offer.lost} days
            </span>
            <span style={pill(C.s3, C.t3, { fontSize: 10.5 })}>
              {offer.dates.length === 1 ? offer.dates[0] : `${offer.dates[0]} → ${offer.dates[offer.dates.length - 1]}`}
            </span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', ...R({ gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }), marginTop: 12 }}>
        <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5, flex: 1, minWidth: 160 }}>
          {!offer.cooldownOk && offer.nextAvailableAt
            ? <><Clock size={10} style={{ marginRight: 4, verticalAlign: -1 }} />Already repaired once this month — available again {fmtDate(offer.nextAvailableAt)}.</>
            : !offer.affordable
              ? `${(offer.cost - xp).toLocaleString()} more XP needed. You have ${xp.toLocaleString()}.`
              : `You have ${xp.toLocaleString()} XP. Once every ${REPAIR_COOLDOWN_DAYS} days.`}
        </div>
        <motion.button
          whileHover={offer.available ? { scale: 1.03 } : undefined}
          whileTap={offer.available ? { scale: 0.97 } : undefined}
          onClick={offer.available ? onRepair : undefined}
          disabled={!offer.available || busy}
          style={{
            ...(offer.available
              ? btn(`linear-gradient(135deg, ${C.violet}, ${C.fuchsia})`, { fontSize: 12.5, padding: '8px 16px', color: onTint(C.violet) })
              : btnG({ fontSize: 12.5, padding: '8px 16px' })),
            opacity: offer.available ? (busy ? 0.6 : 1) : 0.5,
            cursor: offer.available ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          {busy ? <Loader2 size={13} className="spin" /> : <RotateCcw size={14} />}
          Restore my {offer.lost}-day streak
        </motion.button>
      </div>

      <div style={{ position: 'relative', ...R({ gap: 8, alignItems: 'flex-start' }), marginTop: 12, fontSize: 10.5, color: C.t4, lineHeight: 1.5 }}>
        <Info size={11} style={{ flexShrink: 0, marginTop: 4 }} />
        <span>
          Not interested? Nothing happens. Starting again from day one is a completely reasonable
          answer, and this offer disappears on its own in a few days.
        </span>
      </div>
    </motion.div>
  );
}
