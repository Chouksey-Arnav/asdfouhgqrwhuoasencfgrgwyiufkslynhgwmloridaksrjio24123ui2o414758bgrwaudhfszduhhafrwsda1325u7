// ─────────────────────────────────────────────────────────────────────────────
// Streak freezes — the shelf, the shop, and the receipt.
//
// ── Why this got its own card ───────────────────────────────────────────────
// A freeze used to be a number in a chip and an achievement toast. That meant
// the one moment a freeze matters — the Saturday a student can see coming and
// knows they will miss — had no surface at all: nothing told them whether they
// were covered, and nothing let them get covered if they were not.
//
// This card answers three questions and nothing else:
//   1. Am I protected right now, and for how many days?
//   2. If not, what can I do about it right now?
//   3. What has actually happened to the ones I had?
//
// ── Why they are bought with XP and never with money ────────────────────────
// A paid streak freeze is the single most cynical mechanic in this category of
// app: it sells relief from anxiety the product itself manufactured. XP is a
// real budget with real alternative uses, so the decision stays meaningful, and
// nobody's parent gets a charge for a missed Tuesday.
//
// The price climbs with each one held (see freezeCost in lib/streak.js), so
// stockpiling is possible and expensive — a student cannot simply buy immunity
// from ever showing up, which would make the streak meaningless and therefore
// worthless to protect.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { motion } from 'framer-motion';
import { Snowflake, ShieldCheck, ShieldAlert, Loader2, Info } from 'lucide-react';
import { C, glass, glass2, pill, R, CC, tint, btn, btnG, onTint, lbl } from '../../lib/theme';
import { canBuyFreeze, leagueFor } from '../../lib/streak';

const SOURCE_LABEL = {
  milestone: 'Streak milestone',
  week: 'Perfect Week',
  month: 'Perfect Month',
  achievement: 'Achievement',
  purchase: 'Bought with XP',
  checkin: 'Check-in calendar',
  repair: 'Streak repair',
  earned: 'Earned',
};

const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');

export default function FreezeCard({
  streak = 0,
  held = 0,
  xp = 0,
  history = [],        // getStreakFreezes() output — newest first
  onBuy,               // () → Promise
  busy = false,
  m = false,
}) {
  const league = leagueFor(streak);
  const offer = canBuyFreeze({ streak, held, xp });
  const protectedNow = held > 0;
  const spent = history.filter((f) => f.usedOn);

  return (
    <div style={{
      ...glass({ padding: m ? 16 : 20 }),
      border: `1px solid ${protectedNow ? tint(C.blue, 0.3) : C.b1}`,
      background: protectedNow ? `linear-gradient(150deg, ${tint(C.blue, 0.08)}, transparent 70%)` : C.surf,
    }}>
      <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' })}>
        <div style={R({ gap: 8 })}>
          <div style={{
            width: 34, height: 34, borderRadius: 12, flexShrink: 0,
            background: tint(C.blue, 0.14), border: `1px solid ${tint(C.blue, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Snowflake size={17} color={C.blueL} /></div>
          <div>
            <div style={{ ...lbl({ marginBottom: 4 }) }}>Streak freezes</div>
            <div style={{ fontSize: 11.5, color: C.t3 }}>
              Holding {held} of {league.freezeCap} · {league.label} league
            </div>
          </div>
        </div>
        <div style={{ ...R({ gap: 4 }), flexShrink: 0 }}>
          {Array.from({ length: league.freezeCap }).map((_, i) => (
            <div key={i} style={{
              width: 26, height: 30, borderRadius: 8,
              background: i < held ? tint(C.blue, 0.2) : C.s2,
              border: `1px solid ${i < held ? tint(C.blue, 0.4) : C.b1}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Snowflake size={13} color={i < held ? C.blueL : C.t4} style={{ opacity: i < held ? 1 : 0.4 }} />
            </div>
          ))}
        </div>
      </div>

      {/* The answer to "am I covered". Stated as a sentence, because that is the
          question, and a count of tokens is not an answer to it. */}
      <div style={{
        ...R({ gap: 8 }), marginTop: 12, padding: '8px 12px', borderRadius: 8,
        background: tint(protectedNow ? C.blue : C.amber, 0.08),
        border: `1px solid ${tint(protectedNow ? C.blue : C.amber, 0.22)}`,
      }}>
        {protectedNow
          ? <ShieldCheck size={15} color={C.blueL} style={{ flexShrink: 0 }} />
          : <ShieldAlert size={15} color={C.amberL} style={{ flexShrink: 0 }} />}
        <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>
          {protectedNow
            ? `You are covered for ${held} missed day${held === 1 ? '' : 's'}. A freeze is spent automatically the morning after a day you miss — you will be told when it happens.`
            : 'You have no freezes. One missed day ends the streak.'}
        </div>
      </div>

      {/* The shop. One button, and it always explains itself. */}
      <div style={{ ...R({ gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }), marginTop: 12 }}>
        <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5, flex: 1, minWidth: 170 }}>
          {offer.reason}
          {offer.ok && <span style={{ color: C.t4 }}> You have {xp.toLocaleString()} XP.</span>}
        </div>
        <motion.button
          whileHover={offer.ok ? { scale: 1.03 } : undefined}
          whileTap={offer.ok ? { scale: 0.97 } : undefined}
          onClick={offer.ok ? onBuy : undefined}
          disabled={!offer.ok || busy}
          title={offer.reason}
          style={{
            ...(offer.ok
              ? btn(`linear-gradient(135deg, ${C.blue}, ${C.sky})`, { fontSize: 12, padding: '8px 16px', color: onTint(C.blue) })
              : btnG({ fontSize: 12, padding: '8px 16px' })),
            opacity: offer.ok ? (busy ? 0.6 : 1) : 0.5,
            cursor: offer.ok ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >
          {busy ? <Loader2 size={12} className="spin" /> : <Snowflake size={13} />}
          Buy a freeze · {offer.cost.toLocaleString()} XP
        </motion.button>
      </div>

      {/* The receipt. Only once something has actually happened. */}
      {spent.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.b1}` }}>
          <div style={{ ...lbl({ marginBottom: 8 }) }}>Freezes spent</div>
          <div style={CC({ gap: 4 })}>
            {spent.slice(0, 5).map((f, i) => (
              <div key={f.id ?? i} style={{ ...R({ gap: 8 }), fontSize: 11, color: C.t3 }}>
                <Snowflake size={11} color={C.blueL} style={{ flexShrink: 0, opacity: 0.7 }} />
                <span style={{ color: C.t2 }}>Covered {f.usedOn}</span>
                <span style={{ color: C.t4, fontSize: 10 }}>
                  · {SOURCE_LABEL[f.source] || 'Earned'}{f.earnedAt ? ` ${fmtDate(f.earnedAt)}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), marginTop: 12, fontSize: 10.5, color: C.t4, lineHeight: 1.5 }}>
        <Info size={11} style={{ flexShrink: 0, marginTop: 4 }} />
        <span>
          A freeze keeps the streak alive across one missed day. It never counts as an earned day:
          it cannot complete a Perfect Week or a Perfect Month, and it does not move a study-day
          quest. It buys continuity, not credit.
        </span>
      </div>
    </div>
  );
}
