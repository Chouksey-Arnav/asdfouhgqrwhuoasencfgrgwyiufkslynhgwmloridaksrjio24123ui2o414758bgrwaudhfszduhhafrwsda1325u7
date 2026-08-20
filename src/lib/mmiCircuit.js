// ─────────────────────────────────────────────────────────────────────────────
// The circuit: eight to ten stations back to back, on the clock.
//
// ── Why the circuit is the only mode that gets an aggregate score ───────────
// A single MMI station is a weak measurement. That is not a criticism of the
// format, it is the design: stations are deliberately short and deliberately
// varied, and the reliability comes from averaging eight or ten independent
// raters who never speak to each other. One station has a reliability so low
// that a confident verdict from it would be a lie about how the format works,
// which is why src/lib/interviewScore.js appends a caveat saying so.
//
// So this app draws the line where the real format draws it:
//
//   • Single-station practice is labelled PRACTICE. It gets per-station
//     feedback and no aggregate, and it says out loud that a score from one
//     station means very little.
//   • A CIRCUIT of eight to ten stations gets an aggregate, because that is
//     the point at which averaging starts doing its job.
//
// ── What makes a circuit a circuit rather than a playlist ───────────────────
// Three things, all enforced by buildCircuit():
//
//   1. FORMAT SPREAD. A real circuit is not eight ethics questions. It has an
//      interviewer station, an actor station, usually a collaborative task, a
//      policy station and a couple of traditional questions. A student who has
//      only ever practised interviewer stations is unprepared for the two
//      formats they will find hardest.
//   2. ARCHETYPE SPREAD. No more than two stations from the same archetype, so
//      the circuit cannot become a grief circuit by accident.
//   3. NO REPEATS, and a deterministic seed, so a circuit can be replayed
//      exactly — which matters because "I want to redo that circuit properly"
//      is the most common thing a student says after their first one.
//
// ── The clock ──────────────────────────────────────────────────────────────
// Two minutes reading, then five to eight minutes inside, then straight to the
// next door. The real pressure is not the total length, it is that the reading
// clock ends whether or not you have decided what your first sentence is.
// ─────────────────────────────────────────────────────────────────────────────
import { MMI_STATION_LIBRARY, STATION_FORMATS, ARCHETYPES } from '../data/mmiStations.js';
import { SCALE_MAX } from './mmiRubric.js';

export const CIRCUIT_SIZES = { min: 8, max: 10, default: 9 };

// The formats a circuit tries hardest to include, in the order it fills them. Interviewer and
// actor first because they are the backbone of every real circuit; collaborative third because it
// is the one students have never seen; traditional last because it is the one they have.
const FORMAT_PRIORITY = ['interviewer', 'actor', 'collaborative', 'policy', 'traditional'];

const MAX_PER_ARCHETYPE = 2;

// A small deterministic PRNG so a circuit is reproducible from its seed. Math.random() would make
// "run that one again" impossible, and running the same circuit again after reading the feedback
// is the single most useful thing a student can do with this feature.
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function shuffled(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Assemble a circuit.
 *
 * Returns the stations in running order plus the timings, so the runner never has to work out how
 * long anything is. `seed` makes it reproducible; omit it and you get a new one, which is returned
 * on the circuit so it can be replayed.
 */
export function buildCircuit({ size = CIRCUIT_SIZES.default, seed = null, pool = MMI_STATION_LIBRARY } = {}) {
  const n = Math.max(CIRCUIT_SIZES.min, Math.min(CIRCUIT_SIZES.max, Math.round(size)));
  const usedSeed = seed == null ? (Date.now() & 0x7fffffff) : seed;
  const rand = rng(usedSeed);

  const candidates = shuffled(pool.filter(s => s.formats.includes('mmi')), rand);
  const picked = [];
  const archetypeCount = {};

  const canTake = (s) => (archetypeCount[s.archetype] || 0) < MAX_PER_ARCHETYPE
    && !picked.some(p => p.id === s.id);

  const take = (s) => {
    picked.push(s);
    archetypeCount[s.archetype] = (archetypeCount[s.archetype] || 0) + 1;
  };

  // Pass 1 — one of each format, in priority order. This is the pass that makes it a circuit.
  for (const format of FORMAT_PRIORITY) {
    if (picked.length >= n) break;
    const s = candidates.find(c => c.format === format && canTake(c));
    if (s) take(s);
  }

  // Pass 2 — fill the rest, still respecting the archetype cap, preferring formats that are
  // currently thinnest so the circuit stays balanced rather than drifting toward whatever the
  // library has most of.
  while (picked.length < n) {
    const counts = Object.fromEntries(FORMAT_PRIORITY.map(f => [f, picked.filter(p => p.format === f).length]));
    const ordered = [...candidates].filter(canTake)
      .sort((a, b) => counts[a.format] - counts[b.format]);
    if (!ordered.length) break;
    take(ordered[0]);
  }

  // Running order: never two stations of the same format adjacent where it can be avoided. Real
  // circuits are laid out this way and it matters — two actor stations back to back is a
  // different and much harder experience than the same two spaced apart.
  const order = spreadFormats(picked, rand);

  const stations = order.map((s, i) => ({
    ...s,
    position: i + 1,
    of: order.length,
  }));

  return {
    seed: usedSeed,
    size: stations.length,
    stations,
    readingSeconds: stations.reduce((t, s) => t + s.readingSeconds, 0),
    stationSeconds: stations.reduce((t, s) => t + s.stationSeconds, 0),
    totalSeconds: stations.reduce((t, s) => t + s.readingSeconds + s.stationSeconds, 0),
    formats: [...new Set(stations.map(s => s.format))],
    archetypes: [...new Set(stations.map(s => s.archetype))],
    // A circuit this size is what makes an aggregate meaningful; see aggregateCircuit().
    scoresAggregate: stations.length >= CIRCUIT_SIZES.min,
  };
}

function spreadFormats(list, rand) {
  const remaining = shuffled(list, rand);
  const out = [];
  while (remaining.length) {
    const last = out[out.length - 1];
    let idx = remaining.findIndex(s => !last || s.format !== last.format);
    if (idx === -1) idx = 0;   // only same-format stations left; take one rather than fail
    out.push(remaining.splice(idx, 1)[0]);
  }
  return out;
}

// ── Aggregate scoring ────────────────────────────────────────────────────────

/**
 * The circuit's aggregate.
 *
 * A real MMI total is the sum of independent station scores, and candidates are ranked on it. What
 * matters is that the average lands where real averages land: a mean of 5 across the circuit is
 * the modal result and means competent, fluent and forgettable — not a good outcome and not a
 * failure. So the bands below are anchored to the same distribution as the per-station scale in
 * mmiRubric.js, and the copy has to make a 4.6 read as normal.
 *
 * `results` is the per-station output of scoreStation()/calibrateFeedback(), in circuit order.
 */
export function aggregateCircuit(results, circuit) {
  const scored = results.filter(r => r && typeof r.score === 'number');
  const attempted = scored.length;
  const total = circuit?.size || results.length;

  if (attempted === 0) {
    return { attempted: 0, total, mean: null, band: null, complete: false, reliable: false };
  }

  const mean = scored.reduce((n, r) => n + r.score, 0) / attempted;
  const complete = attempted === total;
  // The whole reason circuit mode exists. Below eight stations the average is not doing the work
  // that makes an MMI reliable, and we say so rather than printing a number as if it were.
  const reliable = complete && total >= CIRCUIT_SIZES.min;

  // Per-competency roll-up. A competency only appears if at least two stations actually assessed
  // it — one station's read on teamwork is not a teamwork score, and the per-station scorer
  // already refuses to invent them.
  const byCompetency = new Map();
  for (const r of scored) {
    for (const c of r.competencies || []) {
      if (!byCompetency.has(c.key)) byCompetency.set(c.key, { key: c.key, label: c.label, short: c.short, scores: [] });
      byCompetency.get(c.key).scores.push(c.score);
    }
  }
  const competencies = [...byCompetency.values()]
    .filter(c => c.scores.length >= 2)
    .map(c => ({
      key: c.key,
      label: c.label,
      short: c.short,
      stations: c.scores.length,
      mean: c.scores.reduce((a, b) => a + b, 0) / c.scores.length,
    }))
    .sort((a, b) => a.mean - b.mean);

  // The spread is the finding students most often miss: a candidate averaging 5 with every station
  // at 5 is a different candidate from one averaging 5 with a 2 and a 7 in there, and the second
  // one is the one a real committee argues about.
  const lowest = scored.reduce((a, b) => (b.score < a.score ? b : a));
  const highest = scored.reduce((a, b) => (b.score > a.score ? b : a));

  return {
    attempted,
    total,
    complete,
    reliable,
    mean,
    scale: SCALE_MAX,
    band: circuitBand(mean),
    competencies,
    weakest: competencies[0] || null,
    strongest: competencies[competencies.length - 1] || null,
    spread: highest.score - lowest.score,
    lowestStation: lowest,
    highestStation: highest,
    caveat: reliable
      ? 'Averaged across a full circuit, which is the point at which an MMI score starts meaning something. This is still our rubric rather than a real panel of eight independent raters, so read the pattern across stations rather than the decimal.'
      : `Only ${attempted} of ${total} stations were scored. An MMI gets its reliability from averaging eight or more independent raters, so this number is not yet doing that job — finish the circuit before you read anything into it.`,
  };
}

/**
 * Bands for a circuit mean. Deliberately not congratulatory: 4.5–5.4 is where most real candidates
 * land, and the label has to make that read as the normal outcome rather than as failure — which
 * is the same problem the per-station scale solves, one level up.
 */
export function circuitBand(mean) {
  if (mean == null) return { label: 'Not scored', tone: 'neutral', blurb: '' };
  if (mean < 3) return {
    label: 'Below the interviewed pool',
    tone: 'bad',
    blurb: 'Across a full circuit this pattern would not survive a committee. The useful news is that it is almost never one thing — look at the lowest two stations and what they had in common.',
  };
  if (mean < 4.5) return {
    label: 'Under the median',
    tone: 'mid',
    blurb: 'Fluent in places and incomplete in others. Repeated across a real circuit this sits below the middle of the interviewed group.',
  };
  if (mean < 5.5) return {
    label: 'The modal result — competent and forgettable',
    tone: 'mid',
    blurb: 'This is where most real candidates land, and it is genuinely normal. It is also the band that does not get remembered in the committee meeting, and the distance from here to the next one is specificity: named people, first steps, and the strongest version of the argument you rejected.',
  };
  if (mean < 6.3) return {
    label: 'Above the interviewed pool',
    tone: 'good',
    blurb: 'Roughly the top fifth of people who got as far as an interview. Look at your spread — a strong mean with one very low station is the pattern committees argue about.',
  };
  return {
    label: 'Outstanding — rare',
    tone: 'good',
    blurb: 'A circuit at this level is unusual. Be suspicious of it here: our rubric is one grader, not eight, and it cannot see the things a room can.',
  };
}

// ── Timing ───────────────────────────────────────────────────────────────────

/** The phases of one station, in order. The runner is a state machine over exactly these. */
export const PHASES = ['reading', 'inside', 'done'];

export function phaseLabel(phase, station) {
  if (phase === 'reading') return 'Reading time — outside the door';
  if (phase === 'inside') return STATION_FORMATS[station?.format]?.label || 'Inside the station';
  return 'Station complete';
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Human-readable summary of what a circuit is about to put someone through. */
export function describeCircuit(circuit) {
  const byFormat = FORMAT_PRIORITY
    .map(f => ({ f, n: circuit.stations.filter(s => s.format === f).length }))
    .filter(x => x.n > 0)
    .map(x => `${x.n} ${STATION_FORMATS[x.f].short.toLowerCase()}`);
  return `${circuit.size} stations · ${byFormat.join(', ')} · about ${Math.round(circuit.totalSeconds / 60)} minutes`;
}

export function archetypeOf(station) {
  return ARCHETYPES[station?.archetype] || ARCHETYPES.other;
}
