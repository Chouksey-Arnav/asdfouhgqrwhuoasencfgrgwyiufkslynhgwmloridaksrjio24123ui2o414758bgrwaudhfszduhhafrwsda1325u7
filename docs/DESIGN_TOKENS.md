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

---

# Type, geometry and motion

Colour was three layers and a lint. Everything else was 3,474 loose `fontSize:`
numbers, ~2,500 inline gaps landing on every integer between 1 and 22, and a
`transition: 'all .18s'` in 23 places. Same problem, same shape of answer: one
file that holds the decision, one script that fails the build when something
drifts away from it.

```
src/lib/tokens/type.js     size, tracking, leading      verify:type      hard fail
src/lib/tokens/space.js    4pt grid, radius set          verify:spacing   ratchet
src/lib/tokens/motion.js   durations, easings, budgets   verify:motion    both
```

All three are re-exported from `src/lib/theme.js`, so a component has one import
for the design system.

## Type

One ratio, held: **1.200** from a 16px base — a denser scale than the 1.25/1.333
a marketing site would use, because a portfolio screen here carries eleven
blocks of real information and a fast-growing scale spends the viewport on three
headings.

**Tracking is a function of size**, and it crosses zero at 14px:

| px | 80 | 56 | 40 | 28 | 22 | 16 | 14 | ≤13 |
|---|---|---|---|---|---|---|---|---|
| letter-spacing | −3.0 | −1.8 | −1.0 | −0.6 | −0.4 | −0.05 | 0 | 0 |

`tracking(px)` interpolates between those anchors, so a 34px heading gets −0.79
rather than the nearest anchor's value. **Leading moves the opposite way**: 1.55
at body sizes, tightening to 1.05 at display. A 40px heading at the body's 1.6 is
the single most common reason a screen looks unset.

Two floors the lint enforces: at **15px and up** a size must carry its tracking;
at **22px and up** it must state its leading.

**Eyebrow labels get POSITIVE tracking** (+0.4 at 13px) and are never uppercase.
All-caps is slower to read for everyone — the word-shape cue fluent reading leans
on disappears — and worst for the dyslexic students this app is built for.
Letterspaced 13px is the effect the caps were reaching for. `lbl()` and
`eyebrow()` in `theme.js` are the treatment; `textTransform: 'uppercase'` is a
build failure.

Every emitted value composes with the accessibility sliders —
`calc(-1px + var(--msp-letter-spacing))`, `calc(1.25 * var(--msp-line-scale))` —
because a design token that silently disables an accessibility setting is worse
than no token. That composition is itself linted.

`font-optical-sizing: auto` is on in `index.css`. Bricolage Grotesque ships a
real `opsz` axis; with the switch off, every heading is the 14px drawing scaled
up, which is the clearest tell between type that was set and type that was
merely enlarged.

## Geometry

Four-point grid, eight-point rhythm. Layout gaps start at 8; **4 is for optical
nudges inside a component only**. If you are typing 14px of padding, the
component is wrong, not the scale — 14 is what you type when something is 2px
off somewhere you are not looking.

Radius comes from a fixed set — 0, 4, 8, 12, 16, 24, pill — and nested radii are
concentric: `inner = outer − the padding between them`. `nested()` does the
arithmetic. Get it wrong and the corners look subtly off in a way nobody can
name, because the inner curve is either crowding the outer one or floating
inside it.

`verify:spacing` hard-fails on the token layer and ratchets everything else
(`scripts/spacingBaseline.json`).

## Motion

| what | ms |
|---|---|
| press | 100 |
| hover, focus | 140 |
| tooltip / dropdown entering | 160 / 180 |
| tab content swap | 200 |
| modal | 280 |
| page transition | 360 |

**Nothing interactive over 400ms.** Past that it stops reading as responsive and
starts reading as waiting. **Exits run at 65% of the entrance** — the user has
already decided.

**Only transform and opacity.** Animating width/height/top/left runs layout and
paint on the main thread every frame, and the phone that matters here is a
mid-range Android with a throttled GPU. `transition: 'all'` is the same bug with
the properties left blank. Both hard-fail; the ~100 framer `height: 0 → auto`
accordion reveals are on a shrink-only baseline instead
(`scripts/motionBaseline.json`).

## Loading

`src/components/ui/Loading.jsx`, thresholds in `motion.js`:

- **under 300ms — show nothing.** A spinner that flashes makes an interaction
  feel *slower* than no feedback at all.
- **300ms–1s — a skeleton**, in the real content's exact dimensions and radii. A
  skeleton with the wrong row height causes the exact reflow it existed to hide.
- **over 1s — skeleton plus a determinate indicator**, and only if the progress
  is real. A fake progress bar is a lie the student only has to catch once.
- **never more than five skeleton rows.**

## Empty states

`src/components/ui/EmptyState.jsx`. An empty state is the app's
highest-attention onboarding surface — the student is looking at it and there is
nothing else on screen. Four things, no more: a headline saying what lives here,
one sentence on why it matters, exactly one primary action, and a quiet icon.
`kind` distinguishes the three empties, which are not the same situation:
`new` (nothing yet — onboarding), `filtered` (the filter hid it — stay neutral,
the action clears the filter), `error` (we don't know — say so, offer the retry).

## Restraint

About 90% of any screen is neutral. One accent carries the primary action and
the active state; semantic colours mean their semantic and nothing else. If more
than one thing on a screen is competing to be the brightest, nothing is primary.
