# Landing page versions

The signed-out landing page is versioned. Every version that has ever shipped
stays in the tree, compiling, and exactly one of them is live.

| Version | File | Status |
| --- | --- | --- |
| v1 | `src/components/LandingPage.jsx` | retired — in the tree, not rendered |
| v2 | `src/components/landing/v2/LandingPageV2.jsx` | **active** |

## The switch

One constant, in one file:

```js
// src/components/landing/landingVersions.js
export const ACTIVE_LANDING_VERSION = 2;
```

`AuthGate` imports `ActiveLandingPage` from that registry and renders it. It does
not know which version it got, and nothing else in `src/` imports a landing page
directly — `scripts/verifyLanding.mjs` fails the build if anything starts to.

## Switching versions

1. Change `ACTIVE_LANDING_VERSION`.
2. That's it.

`npm run verify:landing` confirms the result: which versions are in the tree,
which one is active, and that nothing imports around the registry.

> **"Revert the landing page" is ambiguous — ask which version.**
> There is more than one finished landing page here, so a request to go back to
> "the old one" does not identify a version on its own. Confirm whether v1, v2
> or a later version is wanted before changing the constant.

## Adding a version

1. Add the component under `src/components/landing/vN/`.
2. Add an entry to `LANDING_VERSIONS` with its `component` and `source` path.
3. Point `ACTIVE_LANDING_VERSION` at it.

Do **not** delete the version it replaced. Keeping it is what makes a revert a
one-line change to a page that provably was live, rather than a reconstruction
from memory.

## The prop contract

Every version takes the same props, so they are interchangeable at the call
site. A version that cannot honour one accepts and ignores it rather than
changing the contract.

| Prop | What it is |
| --- | --- |
| `onGetStarted` | client-side navigation to `/signup` |
| `onLogin` | client-side navigation to `/login` |
| `onOpenParents` | client-side navigation to `/parents` |
| `onOpenLegal(path)` | client-side navigation to `/legal/terms` or `/legal/privacy` |
| `themeMode` / `onThemeChange` | the light/dark control (v2 ignores these — it is a single committed light design) |

Every call-to-action on a landing page must be a real `<a href>` **and** a
client-side navigation: the href is what makes it middle-clickable, copyable and
crawlable; the handler is what stops a plain left click from reloading the whole
bundle. See `clientNav()` in `LandingPageV2.jsx`.

## How v2 was built

v2 was authored as a design-canvas document (x-dc markup with `<sc-for>` /
`<sc-if>` / `{{ hole }}` templating over a `DCLogic` class) and ported to JSX
mechanically, so that every colour, spacing value and line of copy on the page is
the string the design shipped rather than a re-interpretation of it. The port
rules and the runtime helpers (`css`, `arr`, `hole`) are documented in the
headers of `LandingPageV2.jsx` and `dcRuntime.js`.

If the design is revised, re-port it the same way rather than hand-patching the
generated JSX.
