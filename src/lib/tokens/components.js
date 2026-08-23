// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3 — COMPONENT TOKENS
//
// Component tokens do nothing except alias semantic ones. That sounds like a
// pointless indirection right up to the first time somebody says "cards should
// sit on the raised surface, not the default one" — with this layer that is one
// line here; without it, it is a grep through 466 files, and the grep misses
// the four places that spelled it differently.
//
// The rule that keeps this layer honest: a component token may reference the
// semantic layer and nothing else. No primitives, no literals. If a component
// needs a value this file does not expose, the fix is to add the alias here,
// not to reach around it.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the component-token map for one resolved semantic theme.
 *
 * @param {object} sem a theme from ./semantic.js, already merged with any
 *                     high-contrast overlay.
 */
export function componentTokens(sem) {
  const { surface, border, fg, accent, elevation, translucent } = sem;

  return {
    // ── App shell ───────────────────────────────────────────────────────────
    appBg:            surface.canvas,
    appGlow:          sem.pageGlow,
    navBarBg:         surface.canvasSubtle,
    navBarBorder:     border.default,
    navItemFg:        fg.secondary,
    navItemActiveFg:  fg.primary,
    navItemActiveBg:  accent.subtleBg,

    // ── Cards ───────────────────────────────────────────────────────────────
    // One line each. This is the payoff.
    cardBg:           translucent.surface,
    cardBorder:       border.default,
    cardShadow:       elevation.raised,
    cardRadius:       16,
    cardPadding:      24,
    cardQuietBg:      translucent.surfaceQuiet,
    cardQuietRadius:  10,
    cardQuietPadding: 14,
    cardRaisedBg:     surface.raised,

    // ── Wells / inset regions ───────────────────────────────────────────────
    wellBg:           surface.inset,
    codeBlockBg:      surface.inset,
    progressTrackBg:  surface.inset,
    progressFillBg:   accent.solid,

    // ── Buttons ─────────────────────────────────────────────────────────────
    // Solid: light fill, dark ink in the dark themes. See the note in
    // semantic.js on why that beats a dark fill with a white label.
    buttonSolidBg:      accent.solid,
    buttonSolidHoverBg: accent.solidHover,
    buttonSolidFg:      fg.onSolid,
    // The inset 1px top highlight that stands in for a drop shadow.
    buttonSolidTopHighlight: elevation.highlight,
    buttonQuietBg:      surface.hover,
    buttonQuietFg:      fg.primary,
    buttonQuietBorder:  border.default,
    buttonGhostFg:      fg.secondary,
    buttonGhostBorder:  border.strong,
    buttonDisabledFg:   fg.disabled,

    // ── Inputs ──────────────────────────────────────────────────────────────
    inputBg:          translucent.inputBg,
    inputBorder:      translucent.inputBorder,
    inputFg:          fg.primary,
    inputPlaceholder: fg.tertiary,
    inputFocusRing:   sem.focusRing,

    // ── Chips, pills, badges ────────────────────────────────────────────────
    chipBg:           surface.raised,
    chipFg:           fg.tertiary,
    chipAccentBg:     accent.subtleBg,
    chipAccentFg:     accent.fgStrong,

    // ── Overlays ────────────────────────────────────────────────────────────
    popoverBg:        surface.hover,
    popoverBorder:    border.default,
    popoverShadow:    elevation.quiet,
    modalBg:          surface.canvasSubtle,
    modalBorder:      border.strong,
    scrimBg:          sem.scrim,
    tooltipBg:        surface.pressed,
    tooltipFg:        fg.primary,

    // ── Structure ───────────────────────────────────────────────────────────
    dividerColor:     border.subtle,
    tableHeaderBg:    surface.raised,
    selectedBg:       surface.pressed,
    hoverBg:          surface.hover,

    // ── Type ────────────────────────────────────────────────────────────────
    headingFg:        fg.primary,
    bodyFg:           fg.secondary,
    metaFg:           fg.tertiary,
    kickerFg:         fg.tertiary,
    fontDisplay:      sem.font.display,
    fontBody:         sem.font.body,
    fontMono:         sem.font.mono,
  };
}
