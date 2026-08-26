// ─────────────────────────────────────────────────────────────────────────────
// verify:med-scholarships — structural and honesty checks on
// src/data/medicalScholarships.js.
//
// The point of this check is not that the data compiles. It is that the rules
// in that file's header stay true as entries are added, because every one of
// them is a rule somebody will break at 1am while adding "just one more
// scholarship":
//
//   • Every entry a student could apply for links its OWN official page. An
//     aggregator link is worse than no link — aggregators go stale silently and
//     the student never learns the program's real deadline.
//   • No entry states a specific calendar date. Dates move every year, and a
//     confidently wrong deadline costs somebody an award. Seasons and months
//     are fine; "March 15, 2026" is not.
//   • No entry promises money. "You will receive", "guaranteed", "you'll get" —
//     these are competitive awards and the copy has to read like it.
//   • Every entry belongs to a real stage and real tracks, so no card can be
//     unreachable behind a filter that never matches it.
//   • Anything a student cannot apply for yet carries either an `hsAction` or a
//     `howToFind` — the whole justification for showing a fifteen-year-old an
//     award eight years away is that it tells them what to do NOW.
//
// Run: node scripts/verifyMedicalScholarships.mjs
// ─────────────────────────────────────────────────────────────────────────────
import {
  MED_SCHOLARSHIPS, MED_STAGES, MED_TRACKS, MED_ENTRY_KINDS, MED_SCHOLARSHIP_READ_ON,
} from '../src/data/medicalScholarships.js';
import { PATHWAY_FINANCE } from '../src/data/pathwayFinance.js';

const failures = [];
let assertions = 0;
const check = (cond, message) => { assertions++; if (!cond) failures.push(message); };

const validStages = new Set(Object.keys(MED_STAGES));
const validTracks = new Set(MED_TRACKS.map(t => t.id).filter(id => id !== 'all'));
const validKinds = new Set(Object.keys(MED_ENTRY_KINDS));
const validPathways = new Set(PATHWAY_FINANCE.map(p => p.id));

// A specific calendar date, in any of the shapes a well-meaning contributor
// reaches for. Deliberately does NOT match a bare month or season, which are
// exactly what these fields are supposed to contain.
const SPECIFIC_DATE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;

// Promissory language. `\byou'll get\b` and friends — an award is never a
// promise, and the difference matters to a seventeen-year-old reading fast.
const PROMISES = [
  /\byou will (?:receive|get|win)\b/i,
  /\bguaranteed\b/i,
  /\byou'll (?:receive|get|win)\b/i,
  /\beveryone who applies\b/i,
];

const ids = new Set();

for (const s of MED_SCHOLARSHIPS) {
  const at = `[${s.id || '(no id)'}]`;

  check(!!s.id, `${at} has no id.`);
  check(!ids.has(s.id), `${at} duplicate id — two entries cannot share one, the UI keys on it.`);
  ids.add(s.id);

  for (const field of ['name', 'org', 'kind', 'eligibility', 'why']) {
    check(!!s[field], `${at} is missing "${field}", which every entry needs.`);
  }

  check(validKinds.has(s.kind), `${at} kind "${s.kind}" is not one of: ${[...validKinds].join(', ')}.`);

  check(Array.isArray(s.stage) && s.stage.length > 0, `${at} has no stage — it would never appear under any stage filter.`);
  for (const st of s.stage || []) {
    check(validStages.has(st), `${at} stage "${st}" is not a real stage.`);
  }

  check(Array.isArray(s.tracks) && s.tracks.length > 0, `${at} has no tracks — it would be unreachable from every filter but "All".`);
  for (const t of s.tracks || []) {
    check(validTracks.has(t), `${at} track "${t}" is not in MED_TRACKS.`);
  }

  for (const p of s.pathways || []) {
    check(validPathways.has(p), `${at} pathway "${p}" does not exist in src/data/pathwayFinance.js — the pathway chip would render a raw id.`);
  }

  // Rule 2 from the file header: an applicable award links its own page.
  if (s.kind !== 'discovery') {
    check(!!s.url, `${at} is a "${s.kind}" entry with no url. Every entry a student can act on must link the program's own page — see rule 2.`);
  }
  if (s.url) {
    check(/^https:\/\//.test(s.url), `${at} url is not https.`);
    check(
      !/scholarships\.com|fastweb|unigo|bold\.org|scholarships360|petersons|sallie\.com|studentscholarships\.org/i.test(s.url),
      `${at} links an aggregator rather than the program's own site. Aggregators go stale silently; that is the whole failure this rule prevents.`,
    );
  }

  // Rule 1: seasons, never dates.
  for (const field of ['deadline', 'amount']) {
    if (!s[field]) continue;
    check(
      !SPECIFIC_DATE.test(s[field]),
      `${at} ${field} contains a specific calendar date ("${s[field]}"). Deadlines move every year — state the season or month, per rule 1.`,
    );
  }

  // Rule 4: nothing promises anyone anything.
  for (const field of ['why', 'eligibility', 'amount', 'hsAction']) {
    if (!s[field]) continue;
    for (const re of PROMISES) {
      check(!re.test(s[field]), `${at} ${field} promises an outcome (matched ${re}). These are competitive awards.`);
    }
  }

  // The justification for showing an award a student cannot reach yet.
  const reachableNow = (s.stage || []).includes('high-school');
  if (!reachableNow) {
    check(
      !!(s.hsAction || s.howToFind || s.deadline),
      `${at} is not open to a high schooler and carries no hsAction, howToFind or timing. Showing somebody an award they cannot apply for is only worth it if it tells them something to do about it.`,
    );
  }

  // Discovery entries are a different shape and the UI relies on it.
  if (s.kind === 'discovery') {
    check(!s.amount, `${at} is a discovery entry with an amount. It is not one award, so it has no amount — a number here reads as data we have and it is not.`);
    check(!!s.howToFind, `${at} is a discovery entry without howToFind. The instruction IS the entry.`);
  }
}

check(MED_SCHOLARSHIPS.length >= 30, `Only ${MED_SCHOLARSHIPS.length} entries — this database is meant to be the deep one.`);

// Every track must actually match something, or it is a chip that leads nowhere.
for (const t of MED_TRACKS) {
  if (t.id === 'all') continue;
  const n = MED_SCHOLARSHIPS.filter(s => (s.tracks || []).includes(t.id)).length;
  check(n > 0, `Track "${t.label}" matches no entries — the filter chip would be a dead end.`);
}

// Same for stages.
for (const stage of validStages) {
  const n = MED_SCHOLARSHIPS.filter(s => (s.stage || []).includes(stage)).length;
  check(n > 0, `Stage "${stage}" has no entries — its chip would be a dead end.`);
}

check(
  /^\d{4}-\d{2}-\d{2}$/.test(MED_SCHOLARSHIP_READ_ON),
  'MED_SCHOLARSHIP_READ_ON must be an ISO date — the UI renders it as "every page was read on…", which has to be true.',
);

if (failures.length) {
  console.error(`✗ verify:med-scholarships — ${failures.length} problem(s) in src/data/medicalScholarships.js:\n`);
  failures.forEach(f => console.error(`  • ${f}`));
  process.exit(1);
}

const stageCounts = [...validStages]
  .map(st => `${st} ${MED_SCHOLARSHIPS.filter(s => (s.stage || []).includes(st)).length}`)
  .join(', ');
console.log(`✓ verify:med-scholarships — ${assertions} assertions over ${MED_SCHOLARSHIPS.length} entries (${stageCounts}).`);
