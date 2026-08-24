// The clock, and the fact that it does not stop.
//
// Reading time is the part of the MMI students skip when they practice, and it is the part that
// decides how the first ninety seconds inside the room go. Two minutes outside a door with nothing
// but the scenario is a genuinely different exercise from reading the scenario and then thinking
// about it for as long as you like, and the difference is the whole reason this component exists
// rather than a "start" button.
//
// So: the countdown runs on its own, the reading phase ends whether or not you are ready, and
// there is no pause. The one concession is that a student can end reading early and go in, which
// is what the real format allows too.
import React, { useEffect, useRef, useState } from 'react';
import { C } from '../../lib/theme';
import { formatClock } from '../../lib/mmiCircuit';

/**
 * A countdown that calls `onExpire` exactly once. Restarts whenever `resetKey` changes, which is
 * how the runner moves it from the reading phase to the station phase without remounting.
 */
export default function StationClock({ seconds, resetKey, onExpire, label, warnAt = 30, running = true }) {
  const [left, setLeft] = useState(seconds);
  const expired = useRef(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    setLeft(seconds);
    expired.current = false;
  }, [seconds, resetKey]);

  useEffect(() => {
    if (!running) return undefined;
    // Anchored to a wall-clock deadline rather than decremented per tick: a setInterval that the
    // browser throttles in a background tab would otherwise hand the student extra time, which is
    // the one thing a timed practice mode must not do.
    const deadline = Date.now() + left * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0 && !expired.current) {
        expired.current = true;
        expireRef.current?.();
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, seconds, running]);

  const urgent = left <= warnAt;
  const color = left === 0 ? C.rose : urgent ? C.amberL : C.t2;
  const pct = seconds > 0 ? (left / seconds) * 100 : 0;

  return (
    <div style={{ minWidth: 150 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>{label}</span>
        <span style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 800, fontFamily: C.FM, color, fontVariantNumeric: 'tabular-nums' }}>{formatClock(left)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: C.s3, overflow: 'hidden', marginTop: 4 }}>
        <div style={{ width: '100%', transform: `scaleX(${(pct) / 100})`, transformOrigin: 'left', height: '100%', background: color, transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </div>
    </div>
  );
}
