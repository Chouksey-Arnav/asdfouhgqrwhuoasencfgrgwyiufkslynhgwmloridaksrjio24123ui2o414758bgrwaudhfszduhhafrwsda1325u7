// ─────────────────────────────────────────────────────────────────────────────
// From "this program interviews like THIS" to "so practice THESE stations."
//
// The link is the point. A student applying to Drexel, which states on its own
// admissions page that selected applicants are invited to a virtual MMI, should
// not have to work out for themselves that the MMI circuit in Interview Prep is
// the thing to run. The program tracker knows the format; Interview Prep has the
// stations; this module is the sentence between them.
//
// ── The honesty rule, again ─────────────────────────────────────────────────
// Same as everywhere else in this directory: a format we have not read off the
// program's own page is 'unpublished', and 'unpublished' is displayed as "we do
// not know", never smoothed into a plausible guess. Sending a student to spend
// six weeks rehearsing role-play stations for a program that runs a
// conversational panel is a real cost, and it is a cost we would have caused.
//
// What we CAN say without knowing the format is still useful, and it is what
// the unpublished branch says: the circuit is the harder version of every
// format, so an hour spent on one is never wasted whichever room turns up.
// ─────────────────────────────────────────────────────────────────────────────
import { PROGRAM_PROFILES } from '../../data/admissions/programProfiles.js';
import { stationsForFormat, MMI_STATION_LIBRARY } from '../../data/mmiStations.js';

export const INTERVIEW_FORMATS = {
  mmi: {
    label: 'Multiple Mini Interview (MMI)',
    short: 'MMI',
    blurb: 'A circuit of short stations — two minutes reading outside a door, five to eight minutes inside, then straight on to the next one. Different rater at every station, and they never compare notes.',
    // Where to send them, and what to filter to when they land.
    mode: 'circuit',
    stationFilter: null,
    cta: 'Run a full MMI circuit',
  },
  'traditional-panel': {
    label: 'Traditional interview or panel',
    short: 'Panel',
    blurb: 'One longer conversation, one or more interviewers, follow-ups that build on your answers rather than resetting each time.',
    mode: 'mmi',
    stationFilter: { format: 'traditional' },
    cta: 'Practice the traditional stations',
  },
  casper: {
    label: 'CASPer',
    short: 'CASPer',
    blurb: 'A typed situational-judgment test taken before any interview: a scenario, several questions about it, and one five-minute clock covering all of them.',
    mode: 'casper',
    stationFilter: null,
    cta: 'Take a CASPer test',
  },
  group: {
    label: 'Group or collaborative interview',
    short: 'Group',
    blurb: 'You are assessed alongside other candidates on a shared task. What is being watched is what you do when someone else is wrong, or quiet, or dominating.',
    mode: 'mmi',
    stationFilter: { format: 'collaborative' },
    cta: 'Practice the collaborative stations',
  },
};

export function interviewFormat(key) {
  return INTERVIEW_FORMATS[key] || null;
}

/**
 * What one program's interview block means for a student, in a shape the result card can render
 * without knowing anything about station data.
 *
 * `status` is one of:
 *   'known'       — a published format, and a specific place to send them.
 *   'unconfirmed' — the program interviews but we have not confirmed how. Still gets a
 *                   recommendation, and the recommendation says why it is a hedge.
 *   'unknown'     — we do not even know whether they interview.
 *   'none'        — the program has told us it does not interview.
 */
export function interviewPrepFor(profile) {
  const iv = profile?.interview;
  if (!iv) return { status: 'unknown', formats: [], note: '', recommendation: null };

  if (iv.interviews === false) {
    return {
      status: 'none',
      formats: [],
      basis: iv.basis,
      note: iv.note || '',
      recommendation: null,
    };
  }

  const known = (iv.formats || []).map(interviewFormat).filter(Boolean);

  if (known.length > 0) {
    const primary = known[0];
    return {
      status: 'known',
      formats: known,
      basis: iv.basis,
      published: iv.published || '',
      note: iv.note || '',
      recommendation: {
        mode: primary.mode,
        stationFilter: primary.stationFilter,
        cta: primary.cta,
        // Counted rather than asserted, so the number cannot drift away from the library.
        stationCount: primary.stationFilter?.format
          ? MMI_STATION_LIBRARY.filter(s => s.format === primary.stationFilter.format).length
          : stationsForFormat('mmi').length,
      },
    };
  }

  // Interviews, format unconfirmed — or we do not know whether they interview at all. Both get
  // the same hedge, because it is the same advice and it is genuinely good advice.
  return {
    status: iv.interviews === true ? 'unconfirmed' : 'unknown',
    formats: [],
    basis: iv.basis,
    note: iv.note || '',
    recommendation: {
      mode: 'circuit',
      stationFilter: null,
      cta: 'Run a full circuit anyway',
      stationCount: stationsForFormat('mmi').length,
    },
  };
}

/**
 * Across a student's whole program list: which formats are actually in play, and therefore what
 * they should be practicing first. Ordered by how many of their programs need it, because a
 * student applying to four MMI programs and one panel should not be shown them as equals.
 */
export function interviewFormatsAcross(programIds) {
  const ids = new Set(programIds || []);
  const counts = new Map();
  let unconfirmed = 0;

  for (const p of PROGRAM_PROFILES) {
    if (!ids.has(p.id)) continue;
    const prep = interviewPrepFor(p);
    if (prep.status === 'known') {
      for (const f of prep.formats) counts.set(f.short, (counts.get(f.short) || 0) + 1);
    } else if (prep.status === 'unconfirmed' || prep.status === 'unknown') {
      unconfirmed++;
    }
  }

  return {
    formats: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([short, n]) => ({ short, programs: n })),
    unconfirmed,
  };
}
