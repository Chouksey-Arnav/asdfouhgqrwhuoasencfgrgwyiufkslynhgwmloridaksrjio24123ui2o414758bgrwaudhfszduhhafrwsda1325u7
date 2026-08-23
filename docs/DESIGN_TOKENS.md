# Design tokens

Colour in this app lives in three layers, in `src/lib/tokens/`. The separation is
enforced by `npm run verify:tokens`, which runs on every build.

```
primitives.js   raw values, no meaning        never imported by a component
      ↓
semantic.js     the only layer that varies    what components actually read
                per theme; named by meaning
      ↓
components.js   aliases of semantic tokens    where restyling churn localises
```

## Layer 1 — primitives

Sparse ramps of raw colour, keyed by **CIELAB lightness**: `BLUE['71.8']` is the
blue that sits at L\* 71.8. Tailwind-style `50…900` numbering tells you nothing
about how a swatch will behave; an L\* key is a contrast prediction, so two
colours whose keys differ by ~40 clear 4.5:1 against each other. That is why the
semantic layer can pick a step by arithmetic instead of by eye.

Three neutral ramps (`SLATE`, `MIDNIGHT`, `MIST`) rather than one, because they
are three different hue families and merging them would let a theme mix casts
without anyone noticing.

**A component may never import this file.** The lint fails the build on it.

## Layer 2 — semantic

The only layer that changes per theme, and the only one components read. Tokens
are named for what they **mean**, never for what colour they are: `accent.fg`,
never `blue400`. The moment the brand colour changes, a token called `blue`
holding green misleads every reader of the codebase permanently.

The [Radix 12-step](https://www.radix-ui.com/colors) contract is adopted
wholesale, because that contract is what makes contrast compliance structural
instead of something to audit by hand:

| Radix | Token | Used for |
|---|---|---|
| — | `surface.inset` | wells, code blocks, progress tracks |
| 1 | `surface.canvas` | the page |
| 2 | `surface.canvasSubtle` | full-bleed chrome: modals, nav bars |
| 3 | `surface.default` | the base content surface |
| 3+ | `surface.raised` | cards lifted off `default` |
| 4 | `surface.hover` | popovers and hover |
| 5 | `surface.pressed` | pressed and selected |
| 6 | `border.subtle` | decorative dividers **only** |
| 7 | `border.default` | card and input outlines |
| 8 | `border.strong` | the 3:1 tier, and `focusRing` |
| 9–10 | `accent.solid` / `accent.solidHover` | solid fills |
| 11 | `fg.tertiary` | low-contrast text |
| 12 | `fg.primary` | high-contrast text (`fg.secondary` sits between) |

Two counts are hard rules the lint enforces:

- **Exactly three foreground tiers.** Every extra tier is a contrast liability
  that gets reached for by feel and never re-measured — a fourth tier is how
  this app's metadata ended up at 2.4:1. `fg.disabled` is deliberately *not* a
  tier: it is the absence of an affordance, not live text.
- **Exactly three border strengths.** Only `border.strong` clears the 3:1
  non-text requirement, so it is the only one allowed to be a control's sole
  boundary.

`hue` is the one place a token is named for a colour, and it is scoped and
documented as such: a subject category's identity *is* its hue, the way a data
series' identity is its colour.

## Layer 3 — component

Aliases and nothing else. "Cards should sit on the raised surface" is one line
in `components.js`; without this layer it is a grep through 466 files that
misses the four places spelled differently. A component token may reference the
semantic layer and nothing else — no primitives, no literals.

## Switching themes

`applyTheme()` writes `data-theme` (not a class — there are four themes plus a
high-contrast axis, and `.dark.balanced.hc` selector soup is where the boolean
approach ends up) and `data-theme-family` on `<html>`, sets `color-scheme`, and
emits three sets of custom properties: the legacy `--c-*`, plus `--sem-*` and
`--cmp-*`. New stylesheet work should use the latter two.

Inline styles read the flat `C` object rather than `var()`, and
`src/lib/theme.js` explains at length why that is deliberate and must not be
"fixed".

## Enforcement

```
npm run verify:tokens      # layering, tier counts, first-paint sync, one-off ratchet
npm run verify:contrast    # every text/surface pair, every theme, every HC overlay
```

`verify:tokens` also holds hex literals and raw `rgba()` in component files to a
**shrink-only baseline** (`scripts/designTokenBaseline.json`). New code cannot
add one; every file someone touches ratchets the count down. After a cleanup
pass, re-lock it with `node scripts/verifyDesignTokens.mjs --update`.

> The usual advice here is "delete Tailwind's default palette so `bg-slate-800`
> becomes a build error". This app has no Tailwind — every style is an inline
> object composed from `C` — so the equivalent lever is the literal itself.
