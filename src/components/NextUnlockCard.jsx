import React from 'react';
import { Lock, Sparkles, CalendarClock } from 'lucide-react';
import { C, glass, tint } from '../lib/theme';

// "What opens next, and what opens it."
//
// Progressive unlocking (src/lib/featureUnlock.js) hides parts of the app a
// student hasn't reached yet. Hiding alone would be a downgrade: a feature that
// silently isn't there teaches nothing, and a student who half-remembers seeing
// "Flashcards" somewhere now thinks the app is broken. So every gate is shown,
// dimmed, with the one sentence that opens it attached.
//
// That is the whole trick behind "the app should self-flow without anyone
// explaining it": the nav stops being a menu of everything and becomes a
// sequence — here is what you can do, here is the next thing, here is exactly
// what turns it on. Nobody has to be told the order to do things in, because
// the order is the interface.
//
// Three shapes, one data source (`items` from unlockState().locked()):
//   • `rail`  — a compact strip under the desktop sidebar nav
//   • `card`  — a full block for Home, where a new student actually starts
//   • `pills` — ghost pills appended to a SubNav row (rendered by the nav itself)

/** Shared: the "3 / 5" counter a rule exposes, as a thin progress bar. */
function ProgressBar({ progress, accent }) {
  if (!progress) return null;
  const [have, need] = progress;
  if (!(need > 0) || have >= need) return null;
  return (
    <div style={{ marginTop: 7 }}>
      <div style={{ height: 3, borderRadius: 2, background: C.s3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round((have / need) * 100)}%`, background: accent, borderRadius: 2, transition: 'width .4s' }} />
      </div>
      <div style={{ fontSize: 9.5, color: C.t4, fontFamily: C.FM, marginTop: 4 }}>{have} of {need}</div>
    </div>
  );
}

/**
 * The marquee gate, given the weight it actually carries.
 *
 * One rule in the ladder is flagged `marquee` (today: Plans, the full-plan
 * generator). Rendered as another dashed row it read as another dashed row —
 * the app's best feature queued behind "Financial Aid". Here it gets gold, the
 * two sentences that say what it is, and the word "milestone", so the thing a
 * student is working toward looks like a thing worth working toward.
 */
function MarqueeRow({ item }) {
  const gold = C.gold;
  return (
    <div style={{
      padding: '14px 15px', borderRadius: 12,
      background: `linear-gradient(135deg,${tint(gold, 0.16)},${tint(gold, 0.04)})`,
      border: `1px solid ${tint(gold, 0.42)}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <CalendarClock size={14} color={gold} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{item.label}</span>
        <span style={{
          fontSize: 8.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
          color: gold, background: tint(gold, 0.15), border: `1px solid ${tint(gold, 0.35)}`,
          borderRadius: 999, padding: '3px 7px',
        }}>Milestone</span>
      </div>
      {item.reward && (
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginBottom: 8 }}>{item.reward}</div>
      )}
      <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
        <Lock size={12} color={C.t4} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>{item.hint}</div>
          <ProgressBar progress={item.progress} accent={gold} />
        </div>
      </div>
    </div>
  );
}

export default function NextUnlockCard({
  items = [],
  variant = 'card',
  limit = variant === 'rail' ? 1 : 3,
  accent = C.violet,
  title = 'Unlocks next',
}) {
  const shown = items.slice(0, limit);
  if (!shown.length) return null;

  // ── Sidebar rail ──────────────────────────────────────────────────────────
  // Deliberately one item. The sidebar's job right now is to be short; a list of
  // six locked things there would recreate exactly the wall of options this
  // whole change exists to remove.
  if (variant === 'rail') {
    const it = shown[0];
    return (
      <div style={{ margin: '4px 10px 0', padding: '10px 12px', borderRadius: 9, background: C.s2, border: `1px dashed ${C.b2}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <Lock size={11} color={C.t4} />
          <span style={{ fontSize: 9.5, fontWeight: 700, color: C.t4, letterSpacing: '.08em', textTransform: 'uppercase' }}>{title}</span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t2, fontFamily: C.FD }}>{it.label}</div>
        <div style={{ fontSize: 11, color: C.t4, lineHeight: 1.45, marginTop: 3 }}>{it.hint}</div>
        <ProgressBar progress={it.progress} accent={accent} />
      </div>
    );
  }

  // ── Home card ─────────────────────────────────────────────────────────────
  // Framed as something to look forward to, not as something withheld — hence
  // the sparkle rather than a padlock in the header, and "keep going" copy.
  // A teenager reading this should think "there's more coming", not "I'm
  // locked out of the paid bit".
  return (
    <div style={glass({ padding: 18 })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: tint(accent, 0.16), border: `1px solid ${tint(accent, 0.35)}`, display: 'grid', placeItems: 'center' }}>
          <Sparkles size={13} color={accent} />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{title}</div>
          <div style={{ fontSize: 11, color: C.t3 }}>Keep going and these open up on their own.</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {shown.map(it => it.marquee ? <MarqueeRow key={it.id} item={it} /> : (
          <div key={it.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, background: C.s2, border: `1px dashed ${C.b2}` }}>
            <Lock size={13} color={C.t4} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t2 }}>{it.label}</div>
              <div style={{ fontSize: 11.5, color: C.t4, lineHeight: 1.5, marginTop: 2 }}>{it.hint}</div>
              <ProgressBar progress={it.progress} accent={accent} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The ghost pill a SubNav appends for its next locked sub-view. Lives here
 * rather than inside SubNav so the pill, the rail and the card stay one
 * visual idea — dashed border, muted ink, padlock, hint on hover.
 *
 * Non-interactive on purpose: it is a signpost, not a door. Clicking it and
 * being told "no" is a worse experience than a label that reads as inert, and
 * `title` gives mouse users the condition without stealing a tap from touch.
 */
export function LockedPill({ item, m = false }) {
  if (!item) return null;
  return (
    <span
      title={item.hint}
      aria-label={`${item.label} — locked. ${item.hint}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        padding: m ? '8px 12px' : '8px 14px', borderRadius: 999,
        border: `1px dashed ${C.b2}`, background: 'transparent',
        color: C.t4, fontWeight: 500, fontSize: 12.5, fontFamily: C.FB,
        whiteSpace: 'nowrap', cursor: 'default',
      }}
    >
      <Lock size={11} color={C.t4} />
      {item.label}
    </span>
  );
}
