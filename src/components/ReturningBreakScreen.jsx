import React from 'react';
import { motion } from 'framer-motion';
import { Sunrise, CalendarClock, Sparkles, ArrowRight } from 'lucide-react';
import { C, glass } from '../lib/theme';
import { eyebrow } from '../lib/tokens/type';
import { SP, RADIUS } from '../lib/tokens/space';
import { breakLabel, daysAway } from '../lib/onboardingFlow';
import { BAND_BY_ID } from '../lib/gradeBand';
import { useGradeBand } from '../lib/useGradeBand';

// ─────────────────────────────────────────────────────────────────────────────
// "Here's what changed and what's due."
//
// ── The problem ──────────────────────────────────────────────────────────────
// Usage here is extremely seasonal. It collapses during finals and again in
// mid-summer, and the students who come back are not picking up where they left
// off — they are re-entering a product they half-remember, usually because
// something reminded them that a deadline exists.
//
// The old behavior was to drop them exactly where they were: the middle of a
// lesson sequence, on the screen they abandoned three weeks ago. That screen
// has no answer to either of the two questions they actually walked in with,
// which are "what did I miss" and "what is due". It reads as an app that did
// not notice they were gone, and it puts a lesson between them and the deadline
// that brought them back.
//
// ── What this is ─────────────────────────────────────────────────────────────
// A landing screen, not a modal. Three things and one button:
//   • how long they were away, said plainly and without any guilt in it
//   • what is DUE — the real, dated, urgent items, first, because that is the
//     reason they are here
//   • what CHANGED — new things worth knowing about, second
// and then one button into the single most urgent real thing.
//
// Shown once per break (see shouldShowReturnScreen in onboardingFlow.js), and
// skippable in one tap, because a student who genuinely wants their lesson back
// should get it back on the second tap and not the fifth.
// ─────────────────────────────────────────────────────────────────────────────

function Row({ icon: Ic, color, title, sub, onClick }) {
  const Tag = onClick ? motion.button : 'div';
  return (
    <Tag {...(onClick ? { onClick, whileHover: { x: 3 }, whileTap: { scale: 0.99 } } : {})}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: RADIUS.md, background: C.s2, border: `1px solid ${C.b1}`,
        cursor: onClick ? 'pointer' : 'default', fontFamily: C.FB, color: C.t1,
      }}>
      <span style={{
        width: 32, height: 32, borderRadius: RADIUS.sm, flexShrink: 0, background: `${color}18`,
        border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ic size={15} color={color} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: C.t1, lineHeight: 1.35 }}>{title}</span>
        {sub && <span style={{ display: 'block', fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.45 }}>{sub}</span>}
      </span>
      {onClick && <ArrowRight size={14} color={C.t4} style={{ flexShrink: 0 }} />}
    </Tag>
  );
}

/**
 * @param {object}   user
 * @param {object[]} due       [{ id, title, detail, onOpen }] — dated and urgent
 * @param {object[]} changed   [{ id, title, detail, onOpen }] — new since they left
 * @param {function} onDismiss record that they've seen it and go to the app
 * @param {function} onPrimary open the most urgent thing (falls back to dismiss)
 */
export default function ReturningBreakScreen({ user, due = [], changed = [], onDismiss, onPrimary }) {
  const { band } = useGradeBand();
  const away = breakLabel(daysAway(user));
  const meta = band ? BAND_BY_ID[band] : null;
  const top = due[0] || null;

  return (
    <div style={{
      minHeight: 'var(--msp-vh)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: SP.lg, background: `radial-gradient(ellipse 90% 55% at 50% -10%, ${C.amber}15 0%, transparent 60%), ${C.bg}`,
      color: C.t1, fontFamily: C.FB,
    }}>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        style={{ ...glass({ padding: SP.xl }), maxWidth: 560, width: '100%' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{
            width: 48, height: 48, borderRadius: RADIUS.lg, background: `${C.amber}18`, border: `1px solid ${C.amber}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Sunrise size={21} color={C.amberL} />
          </span>
          <div>
            <div style={{ ...eyebrow(11), fontWeight: 700, color: C.t3, fontFamily: C.FM }}>
              Welcome back
            </div>
            <h2 style={{ fontSize: 21, letterSpacing: 'calc(-0.34px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, margin: '4px 0 0' }}>
              {user?.name ? `Good to see you, ${user.name}.` : 'Good to see you.'}
            </h2>
          </div>
        </div>

        {/* No guilt. A student who took three weeks off during finals did the
            right thing, and an app that opens with a scolding gets closed. */}
        <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.6, margin: '0 0 16px' }}>
          It's been about {away}. Rather than dropping you back into the middle of a lesson,
          here's what's actually due and what's new{meta ? ` for your ${meta.label.toLowerCase()} year` : ''}.
        </p>

        {due.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...eyebrow(11), fontWeight: 700, color: C.t3, fontFamily: C.FM, marginBottom: 8 }}>
              What's due
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {due.slice(0, 4).map(d => (
                <Row key={d.id} icon={CalendarClock} color={C.amberL} title={d.title} sub={d.detail} onClick={d.onOpen} />
              ))}
            </div>
          </div>
        )}

        {changed.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...eyebrow(11), fontWeight: 700, color: C.t3, fontFamily: C.FM, marginBottom: 8 }}>
              What changed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {changed.slice(0, 3).map(c => (
                <Row key={c.id} icon={Sparkles} color={C.violetL} title={c.title} sub={c.detail} onClick={c.onOpen} />
              ))}
            </div>
          </div>
        )}

        {due.length === 0 && changed.length === 0 && (
          <p style={{ fontSize: 13, color: C.t3, lineHeight: 1.6, margin: '0 0 16px' }}>
            Nothing is overdue and nothing slipped while you were gone. Pick up wherever you like.
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => (top && onPrimary ? onPrimary(top) : onDismiss())}
            style={{
              flex: '1 1 220px', padding: '16px 24px', borderRadius: RADIUS.md, border: 'none', cursor: 'pointer',
              background: C.oceanGrad, color: C.onAccent, fontSize: 14, fontWeight: 800, fontFamily: C.FB,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {top ? 'Start with what\'s due' : 'Back into the app'}<ArrowRight size={15} />
          </motion.button>
          <button onClick={onDismiss}
            style={{
              flex: '1 1 140px', padding: '16px 24px', borderRadius: RADIUS.md, cursor: 'pointer',
              background: 'transparent', color: C.t2, border: `1px solid ${C.b2}`,
              fontSize: 13.5, fontWeight: 700, fontFamily: C.FB,
            }}>
            Take me to the app
          </button>
        </div>
      </motion.div>
    </div>
  );
}
