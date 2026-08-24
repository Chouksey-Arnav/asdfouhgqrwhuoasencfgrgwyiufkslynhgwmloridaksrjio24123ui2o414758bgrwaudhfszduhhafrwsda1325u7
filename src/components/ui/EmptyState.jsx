import React from 'react';
import { C, glass, btn, btnSm, tint, onTint, RADIUS, SP, type, SIZE } from '../../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Empty states, treated as real design work.
//
// An empty state is this app's highest-attention onboarding surface, and that
// is not a figure of speech: the student is looking directly at it and there is
// nothing else on the screen to look at. A panel that says "No items" in 12px
// gray has spent the one moment it had someone's undivided attention saying
// nothing.
//
// So every empty state here is four things and no more:
//
//   1. a headline that says what lives here — not "No items", but "Your
//      shortlist lives here"
//   2. ONE sentence on why it matters, in the student's terms
//   3. exactly ONE primary action. Two actions is a decision, and a student
//      who does not yet know what this panel is for cannot make it
//   4. an icon, quiet, at the size of a UI element rather than an illustration
//
// ── Three empties, not one ──────────────────────────────────────────────────
// "Empty" hides three completely different situations, and answering them the
// same way is how a student who typed a filter that matched nothing ends up
// reading onboarding copy about a feature they already use:
//
//   kind="new"       nothing here YET. This is onboarding. Warm, accented,
//                    the action starts the thing.
//   kind="filtered"  there IS content, the filter hid it. Quiet and neutral —
//                    an accent tile here shouts about a non-event. The action
//                    is always "clear the filter", never "add something new".
//   kind="error"     we don't KNOW whether it's empty. Say so plainly, own it,
//                    and offer the retry. Never dress a failure as an empty
//                    shelf; the student will sit waiting for content that is
//                    never coming.
// ─────────────────────────────────────────────────────────────────────────────

const KIND = {
  new:      { tone: (accent) => accent, quiet: false },
  filtered: { tone: () => C.t3,         quiet: true  },
  error:    { tone: () => C.rose,       quiet: false },
};

/**
 * @param kind         'new' | 'filtered' | 'error'  (see the header)
 * @param icon         a lucide icon component
 * @param title        the headline: what lives here
 * @param body         one sentence on why it matters
 * @param actionLabel  the single primary action
 * @param onAction     what it does
 * @param accent       the panel's identity color, used only by kind="new"
 */
export default function EmptyState({
  icon: Icon, title, body, actionLabel, onAction, accent = C.blue, kind = 'new',
}) {
  const k = KIND[kind] || KIND.new;
  const tone = k.tone(accent);

  return (
    <div
      style={glass({ padding: k.quiet ? SP.lg : SP.xl, textAlign: 'center' })}
      role={kind === 'error' ? 'alert' : undefined}
    >
      {Icon && (
        <div style={{
          // The tile is inset SP.md from nothing — it is a free-floating box,
          // so it takes the radius step below the card's rather than a
          // concentric derivation. 12 inside 16.
          width: 48, height: 48, borderRadius: RADIUS.md,
          background: k.quiet ? C.s3 : tint(tone, 0.14),
          border: `1px solid ${k.quiet ? C.b1 : tint(tone, 0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: `0 auto ${SP.md}px`,
        }}>
          <Icon size={22} color={k.quiet ? C.t3 : tone} />
        </div>
      )}

      {title && (
        <div style={{ ...type(SIZE.lead, { weight: 700, family: C.FD }), color: C.t1, marginBottom: SP.xs }}>
          {title}
        </div>
      )}

      {body && (
        <div style={{ ...type(13), color: C.t2, maxWidth: 420, margin: '0 auto' }}>
          {body}
        </div>
      )}

      {actionLabel && onAction && (
        // One action, and its weight follows the situation: starting something
        // is a primary button, undoing a filter is not — a solid accent button
        // for "clear filters" would be the brightest thing on a screen whose
        // whole message is "nothing to see".
        k.quiet ? (
          <button
            onClick={onAction}
            style={{ ...btnSm(C.s4, { marginTop: SP.md }) }}
          >
            {actionLabel}
          </button>
        ) : (
          <button
            onClick={onAction}
            style={{ ...btn(kind === 'error' ? tint(C.rose, 0.18) : (accent !== C.blue ? accent : C.blueGrad), { marginTop: SP.md, ...(kind === 'error' ? { color: onTint(C.rose) } : null) }) }}
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}
