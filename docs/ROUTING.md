# URLs, the back button, and the sitemap

Until now the app kept all of its navigation in React state and never touched the
URL. Every screen was `medschoolprep.cloud/`, which meant the browser's back
button had exactly one entry to go back to: whatever the student was looking at
*before the site*. Backing out of Portfolio → Milestones left the app entirely.

Now every screen has an address, and history moves through them.

## The URL scheme

| Screen | URL |
|---|---|
| Home | `/home` (a bare `/` is its alias) |
| A tab with no sub-nav | `/plans` |
| A tab with a sub-nav | `/sat/practice`, `/prep/pathways`, `/portfolio/milestones`, `/progress/achievements`, `/settings/family` |
| Lesson player | `/prep/pathways/lesson/<unitId>/<lessonId>` |
| Quiz runner | `/prep/quizzes/quiz/<quizId>` |
| Signed-out screens | `/login`, `/signup`, `/forgot-password` |
| Public parent page | `/parents` |
| Parent auth | `/parents/signup`, `/parents/login` |
| Parent app | `/family`, `/family/students`, `/family/digest`, `/family/activity`, `/family/connections`, `/family/settings`, `/family/setup` |
| One student, to a parent | `/family/student/<studentId>` |
| Invitation link | `/parent-invite?token=…` |
| Legal | `/legal/terms`, `/legal/privacy` |

Home used to be the one screen with no address of its own: everything else was
`/sat/practice` or `/portfolio/essays`, and the dashboard was a bare `/`. It was
therefore the only destination nobody could link to, and the only one
indistinguishable from the marketing page in an address bar or a history list.
`/home` is canonical now and `/` is the alias — a bare `/` still resolves (it is
what every PWA cold start, typed domain and old bookmark arrives on) and is
rewritten in place, costing no history entry.

**Two address spaces, one bar.** `/family/*` belongs to `ParentApp`, `/parents*`
and `/legal/*` to `AuthGate`, and everything else to the student router.
`parsePath()` deliberately returns `null` for the first two so the systems can
never fight over the URL; `npm run verify:routing` asserts that refusal.

Every path is extension-free. That is load-bearing: anything containing a `.` is
treated as a file request by the SPA fallback, the Vercel rewrite, and the
service worker (see "The sitemap" below).

Aliases resolve but aren't canonical — `/sat` and `/portfolio/` normalize to
`/sat/overview` and `/portfolio/overview` via `replaceState`, so they don't cost
a history entry. An unrecognised path (`/nope`) falls back to the last-persisted
screen and rewrites the URL in place.

**Retired sub-views alias forward.** When two tabs merge, their ids do not stop
existing — they are already in shared links, bookmarks, the PWA start URL, saved
master plans, persisted view state, and every history entry a returning student
has. `SUBVIEWS[tab].aliases` maps a retired id onto its survivor, so
`/portfolio/deadlines` and `/portfolio/timeline` both open `/portfolio/milestones`
(and `/prep/pathway` opens `/prep/pathways`)
and rewrite themselves in place. Aliases never come *out* of `formatPath()`,
which is what keeps exactly one canonical URL per screen; `resolveView()` applies
the same mapping to persisted state so a stale `portfolioView` doesn't silently
dump the student on the Portfolio overview. `npm run verify:routing` asserts all
of that.

## How it works

Three files, and one invariant:

- **`src/lib/routes.js`** — pure translation between route objects and paths.
  No React, no DOM. `TABS` and `SUBVIEWS` here are the canonical id lists.
- **`src/lib/useAppRouter.js`** — the hook that mirrors state into history,
  translates `popstate` back into state, and restores scroll position per entry.
- **`src/lib/seo.js`** — keeps `<link rel=canonical>` and the robots meta honest
  now that more than one URL exists.

The invariant is the whole design:

> Every render computes the canonical path for the current state. Push a history
> entry **only** when that path differs from `location.pathname`.

A back press changes the URL, `popstate` translates it into state, and the
resulting render finds the URL already correct — so it pushes nothing. There is
no in-flight flag racing a render and no way for one navigation to produce two
entries. Changes the student didn't navigate to (resuming a lesson after a
reload, normalizing an alias) call `replaceNext()` and land in the current entry
instead of a new one.

Adding a sub-tab means adding its id to `SUBVIEWS` in `routes.js` as well as to
the `*_SUBNAV` array in `App.jsx`. `npm run verify:routing` fails the build if
those two drift, so a sub-tab can't ship without a URL.

## The sitemap

`scripts/generateSitemap.mjs` generates **both** `public/sitemap.xml` and
`public/robots.txt` from one route table on every build (`npm run build` runs it
first). `lastmod` comes from the newest git commit touching the files that
render each route.

Only three URLs are listed: `/`, `/signup`, `/login`. The app routes above are
deliberately **not** in the sitemap — they're all behind sign-in, so a crawler
fetching `/portfolio/essays` gets the landing page, and listing them would hand
Google a dozen duplicates of the one URL we actually want ranked. They're
`Disallow`-ed in robots.txt and marked `noindex` client-side instead.

### If /sitemap.xml ever shows the app instead of the XML

That's a navigation being answered with `index.html`, and there were three
places it could happen. All three are now closed, and
`npm run verify:routing-e2e` proves it in a real browser:

1. **The service worker.** A PWA turns every navigation into "serve index.html
   from cache". `navigateFallbackDenylist` in `vite.config.js` excludes anything
   with a file extension. This is the one that bites humans and not crawlers —
   crawlers never run a service worker — so the file can look broken in your
   browser while being served perfectly.
2. **The SPA fallback in `server.js`** (production runs Express, not Vercel).
   It used to answer *everything* with `index.html`, so a missing file 200'd
   with the landing page rather than 404ing. File requests now 404.
3. **`vercel.json`'s rewrite**, same fix by the same rule.

Serving the file correctly is all this repo can do. Registering it with Google
is a one-time manual step in Search Console (Sitemaps → submit `sitemap.xml`)
against the verified `medschoolprep.cloud` property.

## Checks

```
npm run verify:routing       # static: route table vs. App.jsx, round-trips, sitemap/robots/rewrites
npm run verify:routing-e2e   # real browser: back/forward/reload/deep links/scroll, sitemap vs. service worker
```

`verify:routing` runs as part of `npm run build` and `npm run audit:all`.
`verify:routing-e2e` needs `npm run build` first and drives Chromium via
Playwright.
