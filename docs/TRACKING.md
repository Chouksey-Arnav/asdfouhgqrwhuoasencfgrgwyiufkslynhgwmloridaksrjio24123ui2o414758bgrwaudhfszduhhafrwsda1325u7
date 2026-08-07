# Tracking: how "Track" actually saves

Every Track / Add button in the app — a school, a scholarship, a summer program, a deadline —
goes through one path. This is that path, and why it's shaped the way it is.

## The problem it fixes

Tracking used to be a bare `createItem()` POST to `/api/data/[resource]`:

```js
try { await createItem('scholarships', row); }
catch (err) { toast.error(err.message); }
```

That works on a good connection and quietly destroys data on a bad one. Offline, flaky wifi, a
cold serverless function, or an expired session all produced a red toast and nothing else — the
student had chosen to track something and the app kept **no record whatsoever that they had
asked**. Reload, and it was as if they never clicked. There were four distinct ways a track
failed to stick:

| # | Failure | What the student saw | Now |
|---|---------|----------------------|-----|
| 1 | Request failed (offline / flaky / cold start / 500) | Red toast, item gone forever | Queued locally, retried automatically, never dropped |
| 2 | Response lost after a successful POST | Nothing; a retry created a **second** row | Dedupe check against the server list before every retry |
| 3 | Double-tap, or re-tracking something tracked last week | Duplicate rows; the button always said "Track" | Button reads "Tracked"; a repeat tap returns `duplicate` |
| 4 | Fields silently dropped on the way in | A scholarship with no deadline that never reached the Milestones tab | Full-fidelity capture + an explicit "needs a date" prompt |

## The pieces

| File | Role |
|------|------|
| `src/lib/trackQueue.js` | The durable outbox. Retry ladder, dedupe-on-flush, auth parking, status pub-sub. |
| `src/lib/trackingCatalog.js` | Catalog entry → table row, and the dedupe-key scheme. Pure functions, no I/O. |
| `src/lib/useTrackQueue.js` | React bindings (`usePendingTrackKeys`, `useTrackQueueDrain`). |
| `src/lib/db.js` (`trackQueue`, v13) | Where a queued intent physically lives. |
| `src/components/ui/TrackButton.jsx` | idle / saving / tracked / queued. |
| `src/components/ui/TrackQueueNotice.jsx` | Panel-level "these are still saving" with a manual retry. |
| `scripts/verifyTracking.mjs` | `npm run verify:tracking` — 1500+ assertions over the whole curated corpus. |

## The flow

```
trackItem(resource, row, { dedupeKey, label, existing })
  │
  ├─ already in `existing`?          → { status: 'duplicate' }   (no write)
  ├─ already in the outbox?          → { status: 'queued' }      (no write)
  │
  ├─ write the intent to IndexedDB   ← durable from here on
  ├─ POST
  │    ├─ 2xx      → delete the queue entry → { status: 'created', row }
  │    ├─ 401      → mark 'blocked'         → { status: 'queued', reason: 'auth' }
  │    └─ other    → leave 'pending', start the retry ladder
  │                                          → { status: 'queued', reason: 'offline' }
```

The write happens **before** the network call. If the tab dies on the very next line, the intent
survives.

`flushTrackQueue()` runs on app start, on `online`, on tab refocus, on the retry ladder
(2s → 5s → 15s → 45s → 2m), and on a manual "Try saving now". It fetches each resource's current
list **once, before any POST** — that list comparison is what makes a retry idempotent. An entry
whose row is already on the server is satisfied and deleted, not re-sent.

`trackItem` never throws for a network or auth failure. That's the point: a caller cannot
accidentally turn a recoverable failure back into a lost track. It throws only on a caller bug
(missing resource/row).

### Nothing is ever silently dropped

When the retry ladder is exhausted the entry does **not** get discarded — it stays in the outbox,
visible in `TrackQueueNotice` with a manual retry, and `online` / refocus / next app start will
still pick it up. There is no path in this system where a track disappears.

### The one thing that removes an entry without saving it

`cancelQueuedTrack(resource, dedupeKey)`, called from the delete handlers. Without it, deleting a
school that still has a queued track would let the queue flush later and resurrect it.

## Dedupe keys

`normalizeKey()` (lowercase, strip punctuation/unicode dashes/curly quotes, expand `&`, collapse
whitespace, drop a trailing "Program"/"Scholarship") so trivial differences don't read as two
different things.

| Resource | Key |
|----------|-----|
| `scholarships`, `colleges` | normalized name |
| `activities` | normalized `position + organization` (two roles at one org stay distinct) |
| `deadlines` | normalized title + `due_date` (same title, new date = new deadline) |

The keys are computed in two places — from a **catalog entry** (to mark it already-tracked) and
from an **existing table row** (to dedupe). If those ever disagree, every tracked item reads as
untracked forever and re-tracks on every tap. `verifyTracking.mjs` asserts they agree across all
~100 scholarships and ~150 opportunities.

## Two rules for catalog → row mapping

**1. Nothing is dropped.** Any catalog field without a matching column folds into `notes` /
`description` instead of vanishing. Previously a tracked opportunity threw away its `org` even
though the `organization` column was sitting right there, empty — and wrote its catalog type
(`'Competition'`, `'Program'`…) into `activity_type`, which matches no option in the activity
editor's dropdown, so opening one for editing silently reassigned it.

**2. Nothing is invented.** The catalogs record amounts and deadlines as prose ranges ("Opens late
summer, due mid-fall") because the real values move year to year. We do **not** regex a date out
of that into the typed `deadline` column — a parsed-from-vibes date is worse than an empty one,
because the student then sees a countdown they believe is real. This is the same integrity bar the
data files and `autoDeadlines.js` already set.

Rule 2 has a cost, and it's paid explicitly rather than silently: a scholarship with `deadline`
null never reaches the Milestones tab. So both `FinancialAidPanel` and `PortfolioMilestones`
surface those rows under "tracked scholarships without a deadline", with a date field right there.
The student is told what's missing instead of assuming it's handled.

## Routing

A `type: 'Scholarship'` entry in the opportunities catalog is tracked into `scholarships`, not
`activities` (`resourceForOpportunity()`). Tracking it as an activity, as every tap used to, meant
it never appeared on the Financial Aid tab, never counted toward scholarship totals, and could
never produce a deadline.

## Why the outbox is device-local

`trackQueue` is deliberately excluded from `buildSyncSnapshot()`. A queue row is an unsent network
intent, not progress — syncing it would let two devices flush the same intent and create the row
twice, the exact duplicate the dedupe keys exist to prevent.
