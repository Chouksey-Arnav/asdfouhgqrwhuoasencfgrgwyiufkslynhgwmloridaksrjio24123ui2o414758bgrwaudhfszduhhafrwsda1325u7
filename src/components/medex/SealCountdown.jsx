// ─────────────────────────────────────────────────────────────────────────────
// The countdown to the next weekly seal.
//
// ── Why a countdown at all ──────────────────────────────────────────────────
// The score seals weekly (see src/lib/medex/week.js) because the underlying
// quantity genuinely changes on that timescale. A countdown is what turns that
// constraint into a reason to act: everything logged before the seal lands in
// this week's number, and there is a visible amount of time left to log it.
//
// ── Why it does not tick every second, most of the time ─────────────────────
// A per-second re-render of a Home card for a deadline three days away is pure
// waste — it repaints the most expensive screen in the app 86,400 times to
// change a digit nobody is watching. So the interval matches the resolution
// actually on screen: once a minute normally, once a second only inside the
// final hour, where the seconds are the point.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { Lock, Timer } from 'lucide-react';
import { C, pill, tint } from '../../lib/theme';
import { sealCountdown } from '../../lib/medex';

/**
 * Live countdown state. Exported because the Home card wants the numbers
 * without the chrome, and duplicating the interval logic in two components is
 * how one of them ends up a minute behind the other.
 */
export function useSealCountdown() {
  const [cd, setCd] = useState(() => sealCountdown());

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      const next = sealCountdown();
      setCd(next);
      // Inside the last hour the seconds are on screen, so tick with them.
      // Otherwise a minute is finer than anything being displayed.
      const period = next.ms < 3600000 ? 1000 : 60000;
      timer = setTimeout(schedule, period);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return cd;
}

/**
 * @param banked  points logged since the seal, waiting to land. Drives the
 *                copy: there is a difference between "3 days left" and
 *                "3 days until +34 lands", and only the second one is a reason
 *                to open the app tomorrow.
 */
export default function SealCountdown({
  banked = null, compact = false, accent = C.violet, showBar = true,
}) {
  const cd = useSealCountdown();
  const hasBanked = typeof banked === 'number' && banked !== 0;
  const positive = hasBanked && banked > 0;
  const tone = cd.imminent ? C.amber : accent;

  if (compact) {
    return (
      <span style={{ ...pill(tint(tone, 0.14), tone, { gap: 5, fontFamily: C.FM, fontSize: 10.5 }) }}
        title={`Your MedEx Score seals ${cd.target.toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}`}>
        <Timer size={10} />{cd.short}
      </span>
    );
  }

  return (
    <div style={{
      background: tint(tone, 0.07), border: `1px solid ${tint(tone, 0.22)}`,
      borderRadius: 12, padding: '11px 13px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Lock size={12} color={tone} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>
          Seals in {cd.long}
        </span>
        {hasBanked && (
          <span style={pill(
            tint(positive ? C.green : C.rose, 0.16),
            positive ? C.greenL : C.roseL,
            { fontFamily: C.FM, fontSize: 10.5 },
          )}>
            {positive ? '+' : ''}{Math.round(banked)} banked
          </span>
        )}
      </div>

      <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.45, marginTop: 5 }}>
        {hasBanked
          ? positive
            ? `Everything you have logged this week is worth ${Math.round(banked)} points, and it lands on your official score when the week closes.`
            : `Your live position is ${Math.abs(Math.round(banked))} points below your sealed score. Nothing is lost yet — this week's seal is what counts, and there is still time to move it.`
          : 'Your score locks once a week. Anything you log between now and then lands on the next one.'}
      </div>

      {showBar && (
        <div style={{
          marginTop: 9, height: 4, borderRadius: 3, background: C.b1, overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.round(cd.progress * 100)}%`, height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${tint(tone, 0.5)}, ${tone})`,
            transition: 'width 1s linear',
          }} />
        </div>
      )}
    </div>
  );
}
