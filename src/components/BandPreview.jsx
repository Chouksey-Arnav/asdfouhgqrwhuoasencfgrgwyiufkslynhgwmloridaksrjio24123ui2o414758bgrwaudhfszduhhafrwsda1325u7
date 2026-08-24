import React from 'react';
import { Telescope, ArrowRight } from 'lucide-react';
import { C, glass } from '../lib/theme';
import { eyebrow } from '../lib/tokens/type';
import { RADIUS } from '../lib/tokens/space';
import { useGradeBand } from '../lib/useGradeBand';
import { previewBannerText, BAND_BY_ID } from '../lib/gradeBand';

// ─────────────────────────────────────────────────────────────────────────────
// The preview state, written once and reused by every out-of-band surface.
//
// ── What this is NOT ─────────────────────────────────────────────────────────
// It is not a lock. It is not a paywall. It is not a blur, an overlay, a
// disabled state, or a "coming in junior year" placeholder. Nothing inside it
// is dimmed to the point of being unreadable, nothing inside it stops
// responding to clicks, and there is no state in which this component renders
// instead of its children.
//
// It is a BANNER above content that is otherwise completely normal.
//
// ── Why it has to work that way ──────────────────────────────────────────────
// Grade band changes emphasis and never access. A ninth grader who opens the
// program tracker and finds a lock learns that this app is not for them yet,
// which is the one lesson we can least afford to teach: hidden value is unsold
// value, and a student who never sees the program tracker will never ask a
// parent to pay for it. A ninth grader who opens it and finds a full, working
// screen with a line at the top saying "most students use this junior year —
// look around if you're curious" learns the opposite: there is a lot here, and
// some of it is waiting for them.
//
// The only real consequence of being out of band is one the student never has
// to fight: out-of-band items are left OUT OF THE ACTIVE TASK LIST. They are
// not what we ask you to do today. They are still entirely yours to open.
//
// ── Usage ────────────────────────────────────────────────────────────────────
//   <BandPreview bands={['build','apply']}>
//     <TheWholeNormalScreen />
//   </BandPreview>
//
// In band, it renders exactly `children` and nothing else — no wrapper, no
// spacing change, no visual difference of any kind from not using it.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The banner on its own, for callers that already lay out their own container
 * (a card header, a section title row) and just want the sentence.
 */
export function BandPreviewBanner({ bands, onDismiss, compact = false, style }) {
  const text = previewBannerText(bands);
  const first = (Array.isArray(bands) ? bands : [bands]).filter(Boolean)[0];
  const meta = first ? BAND_BY_ID[first] : null;
  return (
    <div
      data-band-preview="banner"
      role="note"
      style={{
        ...glass({
          padding: compact ? '8px 12px' : '12px 16px',
          background: `linear-gradient(120deg, ${C.cyan}0E, transparent 70%)`,
          border: `1px solid ${C.cyan}2E`,
        }),
        display: 'flex', alignItems: 'center', gap: 12, ...style,
      }}>
      <Telescope size={compact ? 14 : 16} color={C.cyanL} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? 11.5 : 12.5, color: C.t2, lineHeight: 1.5, fontFamily: C.FB }}>
          {text}
        </div>
        {/* What this surface is actually FOR, so the preview teaches something
            rather than just excusing itself. */}
        {!compact && meta?.focus && (
          <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>{meta.focus}</div>
        )}
      </div>
      {onDismiss && (
        <button onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, fontSize: 11, fontWeight: 700, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Got it<ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

/**
 * The wrapper. `bands` is the recommended band (or bands) for whatever is
 * inside; omit it and the children render untouched, which is the correct
 * behavior for anything that is genuinely year-agnostic.
 *
 * @param {string[]|string} bands   recommended band ids
 * @param {React.ReactNode} children  the real, fully working surface
 * @param {boolean} compact         tighter banner, for cards and rows
 */
export default function BandPreview({ bands, children, compact = false, gap = 16, style }) {
  const { state } = useGradeBand();
  // In band: render the children and NOTHING else. No wrapper div, so adding
  // BandPreview to a screen can never change that screen's layout for the
  // students it is aimed at.
  if (state(bands) === 'active') return <>{children}</>;

  return (
    <div data-band-preview="wrapper" style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      <BandPreviewBanner bands={bands} compact={compact} />
      {/*
        Deliberately a plain container. No pointerEvents:'none', no opacity, no
        filter, no aria-hidden, no inert — every one of those would turn a
        preview into a lock, and scripts/verifyGradeBand.mjs fails the build if
        any of them appears in this file.
      */}
      <div>{children}</div>
    </div>
  );
}

/**
 * A one-word marker for a row in a list (a nav item, a lesson card, a
 * milestone) that is out of band. Same rule: it marks, it does not disable.
 */
export function BandPreviewTag({ bands, style }) {
  const { state } = useGradeBand();
  if (state(bands) === 'active') return null;
  return (
    <span data-band-preview="tag"
      title={previewBannerText(bands)}
      style={{
        ...eyebrow(9.5),
        fontWeight: 700,
        color: C.cyanL, background: `${C.cyan}14`, border: `1px solid ${C.cyan}2E`,
        borderRadius: RADIUS.pill, padding: '4px 8px', fontFamily: C.FM, whiteSpace: 'nowrap', ...style,
      }}>
      Preview
    </span>
  );
}
