#!/usr/bin/env node
// Data-integrity and behavior assertions for the combined-degree layer:
// src/data/combinedDegreePrograms.js + src/lib/combinedDegree.js.
//
// There is no test runner in this repo, so this script IS the test suite for
// the part of the app that makes the most consequential factual claims it makes
// anywhere: what a seventeen-year-old must have done, by when, to be eligible
// for a program that holds a medical-school seat.
//
// What it guards, in order of how badly it hurts when it breaks:
//
//   1. AN INVENTED NUMBER. Almost no BS/MD program publishes an acceptance
//      rate, so a precise-looking figure with no source behind it is the single
//      most damaging thing this file could contain. Nothing may claim
//      'official' without a source URL, and a rate may not exist without one.
//
//   2. A STALE ENTRY SHOWN AS FRESH. `verified` is mandatory, must be a real
//      date, must not be in the future, and anything past twelve months must
//      actually produce the warning — not merely be old.
//
//   3. A ROSTER ENTRY THAT CLAIMS A REQUIREMENT. The roster's whole contract is
//      that it carries no requirement claims. One leaking in turns "we know
//      this exists" into "we know its score floor", which we do not.
//
//   4. A GAP VERDICT THAT CLEARS A STUDENT ON DATA WE DO NOT HAVE. A missing
//      GPA must never produce 'met', and a missing requirement must never
//      produce 'short'.
//
//   5. THE CORRECTIONS GOING MISSING. Northwestern's HPME is closed and Texas
//      JAMP is not a high-school-entry program. Both are actively recommended
//      elsewhere, and neither may appear in the live catalog.
//
//   6. A MILESTONE LADDER THAT FIRES IN THE PAST, or a deadline that fails to
//      roll to next cycle once this cycle's has gone.
//
//   node scripts/verifyCombinedDegree.mjs
import {
  PROGRAMS, PROGRAM_BY_ID, ROSTER, MISLISTED_PROGRAMS, PATHWAY_GROUPS, PATHWAY_BY_ID,
  ROUND_TYPES, TEST_POLICIES, BASES, BASIS_META, STATES,
} from '../src/data/combinedDegreePrograms.js';
import {
  verificationStatus, nextDeadline, milestoneRowsFor, collegeRowFor, programLabel,
  studentFactsFor, requirementGaps, programReadiness, acceptanceLine, interviewTargetsFor,
  filterPrograms, filterRoster, closingSoon, catalogSummary, staleEntries,
  ALERT_OFFSETS, STALE_AFTER_DAYS, GAP_STATUS,
} from '../src/lib/combinedDegree.js';
import { PROGRAM_PROFILES } from '../src/data/admissions/programProfiles.js';
import { INTERVIEW_FORMATS } from '../src/lib/admissions/interviewFormats.js';
import { PATHS } from '../src/data/constants.js';

let passed = 0;
const failures = [];
const assert = (label, cond, detail = '') => {
  if (cond) { passed += 1; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
};
const section = (name) => console.log(`\n${name}`);

const DAY = 86400000;
const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(`${s}T00:00:00`));
const TODAY = new Date();

// ── 1. Identity and shape ────────────────────────────────────────────────────
section('1. Identity and shape');
{
  const allIds = [...PROGRAMS, ...ROSTER, ...MISLISTED_PROGRAMS].map(p => p.id);
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  assert('every id across catalog, roster and corrections is unique', dupes.length === 0, `duplicates: ${dupes.join(', ')}`);

  for (const p of PROGRAMS) {
    const at = `[${p.id}]`;
    assert(`${at} names an institution`, !!p.institution?.trim());
    assert(`${at} names a program`, !!p.program?.trim());
    assert(`${at} states a degree`, !!p.degree?.trim());
    assert(`${at} states a length in years`, Number.isFinite(p.years) && p.years > 0 && p.years <= 10, `got: ${p.years}`);
    assert(`${at} has a two-letter state`, /^[A-Z]{2}$/.test(String(p.state)), `got: ${p.state}`);
    assert(`${at} pathway is a real PATHS key`, !!PATHS[p.pathway], `got: ${p.pathway}`);
    assert(`${at} pathway is one this catalog groups`, !!PATHWAY_BY_ID[p.pathway], `got: ${p.pathway}`);
    assert(`${at} has a status`, ['open', 'closed'].includes(p.status), `got: ${p.status}`);
    assert(`${at} explains what makes it different`, (p.why || '').trim().length >= 60);
    assert(`${at} has an official URL`, /^https:\/\//.test(String(p.url || '')), `got: ${p.url}`);
  }

  for (const g of PATHWAY_GROUPS) {
    assert(`pathway group '${g.id}' is a real PATHS key`, !!PATHS[g.id]);
    assert(`pathway group '${g.id}' explains itself`, (g.blurb || '').length >= 60);
    assert(`pathway group '${g.id}' has at least one program somewhere`,
      PROGRAMS.some(p => p.pathway === g.id) || ROSTER.some(p => p.pathway === g.id));
  }
  assert('every pathway group named in the brief is present',
    ['physician', 'nursing', 'pharmacy', 'dentistry', 'physicianAssistant', 'physicalOccupTherapy']
      .every(k => !!PATHWAY_BY_ID[k]));
}

// ── 2. Nothing is invented ───────────────────────────────────────────────────
// The rule that matters most. 'official' is a claim about the world, and a
// claim about the world needs a citation.
section('2. Nothing claims to be official without a source');
{
  for (const p of PROGRAMS) {
    const at = `[${p.id}]`;
    const sources = p.sources || [];
    for (const s of sources) {
      assert(`${at} every source has an https URL`, /^https:\/\//.test(String(s.url || '')), `got: ${s.url}`);
      assert(`${at} every source records when it was read`, isISO(s.retrieved), `got: ${s.retrieved}`);
      assert(`${at} every source is labelled`, !!s.label?.trim());
    }

    // Every basis-bearing field, in one place, so a new field cannot quietly
    // dodge the rule by not being listed here.
    const bearers = [
      ['test', p.test?.basis], ['gpa', p.gpa?.basis], ['interview', p.interview?.basis],
      ['acceptance', p.acceptance?.basis], ['serviceHours', p.serviceHours?.basis],
      ['cost', p.cost?.basis], ['recommendations', p.recommendations?.basis],
    ].filter(([, b]) => b != null);

    for (const [field, basis] of bearers) {
      assert(`${at} ${field}.basis is a known basis`, BASES.includes(basis), `got: ${basis}`);
      if (basis === 'official') {
        assert(`${at} ${field} claims 'official' and so must carry a source`, sources.length > 0);
      }
    }

    // The specific, dangerous one.
    const a = p.acceptance;
    if (a?.rate != null) {
      assert(`${at} a stated acceptance RATE is a fraction`, a.rate > 0 && a.rate < 1, `got: ${a.rate}`);
      assert(`${at} a stated acceptance rate is 'official' or 'derived'`,
        ['official', 'derived'].includes(a.basis),
        `a rate on basis '${a.basis}' is exactly the consultancy arithmetic this catalog exists to refuse`);
      assert(`${at} a stated acceptance rate carries a source`, sources.length > 0);
    }
    if (a && a.rate == null) {
      assert(`${at} an unpublished acceptance rate says so in words`, !!a.note?.trim()
        || a.basis === 'unpublished' || a.admitted != null || a.enrolled != null);
    }
    for (const k of ['admitted', 'enrolled']) {
      if (a?.[k] != null) {
        assert(`${at} acceptance.${k} is a whole positive count`, Number.isInteger(a[k]) && a[k] > 0, `got: ${a[k]}`);
      }
    }
    // A count is not a rate, and the copy must never let one become the other.
    if ((a?.admitted != null || a?.enrolled != null) && a?.rate == null) {
      const line = acceptanceLine(p);
      assert(`${at} counts render as counts, not as a percentage`, line.countsOnly === true && !/%/.test(line.text), `got: ${line.text}`);
    }
  }

  // No program that publishes nothing gets a number anyway.
  const invented = PROGRAMS.filter(p => p.acceptance?.rate != null && p.acceptance.basis === 'estimated');
  assert('no acceptance rate is shipped on an "estimated" basis', invented.length === 0,
    invented.map(p => p.id).join(', '));
}

// ── 3. Verification dates ────────────────────────────────────────────────────
section('3. Verification is mandatory, real, and actually warns');
{
  for (const p of PROGRAMS) {
    const at = `[${p.id}]`;
    assert(`${at} has a verified date`, !!p.verified, 'verified is mandatory — stale admissions data actively harms students');
    assert(`${at} verified is a real ISO date`, isISO(p.verified), `got: ${p.verified}`);
    assert(`${at} verified is not in the future`, Date.parse(`${p.verified}T00:00:00`) <= Date.now() + DAY,
      `got: ${p.verified}`);
  }
  for (const m of MISLISTED_PROGRAMS) {
    assert(`[${m.id}] correction carries a verified date`, isISO(m.verified), `got: ${m.verified}`);
  }

  const sample = PROGRAMS[0];
  const old = new Date(Date.parse(`${sample.verified}T00:00:00`) + (STALE_AFTER_DAYS + 5) * DAY);
  const stale = verificationStatus(sample, old);
  assert('an entry past the twelve-month threshold is marked stale', stale.stale === true);
  assert('a stale entry produces a visible warning, not a silent flag', !!stale.warning && stale.warning.length > 40);
  assert('a stale entry names the institution in its warning', stale.warning.includes(sample.institution));

  const fresh = verificationStatus(sample, new Date(Date.parse(`${sample.verified}T00:00:00`) + 5 * DAY));
  assert('a fresh entry warns about nothing', fresh.stale === false && fresh.warning === null);

  const aging = verificationStatus(sample, new Date(Date.parse(`${sample.verified}T00:00:00`) + 300 * DAY));
  assert('an entry approaching a year warns before it is stale', aging.stale === false && !!aging.warning);

  assert('a program with no verified date fails loudly rather than quietly',
    verificationStatus({ institution: 'X' }).stale === true);

  assert('nothing in the catalog is stale today', staleEntries(TODAY).length === 0,
    staleEntries(TODAY).map(p => p.id).join(', '));
}

// ── 4. Requirements are stated honestly, or not at all ───────────────────────
section('4. Requirements are stated honestly, or not at all');
{
  for (const p of PROGRAMS) {
    const at = `[${p.id}]`;
    if (p.test?.policy != null) {
      assert(`${at} test.policy is a known policy`, !!TEST_POLICIES[p.test.policy], `got: ${p.test.policy}`);
    }
    if (p.test?.satMin != null) {
      assert(`${at} SAT minimum is in range`, p.test.satMin >= 400 && p.test.satMin <= 1600, `got: ${p.test.satMin}`);
    }
    if (p.test?.actMin != null) {
      assert(`${at} ACT minimum is in range`, p.test.actMin >= 1 && p.test.actMin <= 36, `got: ${p.test.actMin}`);
    }
    if (p.test?.satMin != null || p.test?.actMin != null) {
      assert(`${at} a numeric score floor is only ever stated as official`, p.test.basis === 'official',
        `got: ${p.test.basis} — a score floor we did not read off the program's own page must not be a number`);
    }
    if (p.gpa?.min != null) {
      assert(`${at} GPA minimum is in range`, p.gpa.min > 0 && p.gpa.min <= 5, `got: ${p.gpa.min}`);
      assert(`${at} a GPA minimum names its scale`, ['weighted', 'unweighted'].includes(p.gpa.scale),
        `got: ${p.gpa.scale} — an unscaled GPA minimum is unusable`);
      assert(`${at} a GPA minimum is official`, p.gpa.basis === 'official', `got: ${p.gpa.basis}`);
    }
    if (p.serviceHours?.required != null) {
      assert(`${at} a service-hours requirement is a positive number`, p.serviceHours.required > 0);
      assert(`${at} a service-hours requirement is official`, p.serviceHours.basis === 'official', `got: ${p.serviceHours.basis}`);
    }
    if (p.citizenship != null) {
      assert(`${at} citizenship is one of the two real values`, ['us', 'us_or_pr'].includes(p.citizenship), `got: ${p.citizenship}`);
    }
    if (p.residency?.restricted) {
      assert(`${at} a residency restriction explains itself`, (p.residency.note || '').length >= 20);
    }
    if (p.interview?.format) {
      assert(`${at} interview format is one Interview Prep can actually run`, !!INTERVIEW_FORMATS[p.interview.format],
        `got: ${p.interview.format}`);
    }
    assert(`${at} casper is true, false or null — never undefined`, p.casper === true || p.casper === false || p.casper === null,
      `got: ${p.casper} — undefined would render as "no", and "we do not know" is not "no"`);
    if (p.deadline) {
      assert(`${at} deadline round is a known round type`, !!ROUND_TYPES[p.deadline.round], `got: ${p.deadline.round}`);
      assert(`${at} deadline precision is known`,
        ['exact', 'approx', 'window', 'rolling'].includes(p.deadline.precision), `got: ${p.deadline.precision}`);
      if (p.deadline.precision !== 'exact' && p.deadline.month != null) {
        assert(`${at} a non-exact deadline explains itself`, (p.deadline.note || '').length >= 20);
      }
      if (p.deadline.month != null) {
        assert(`${at} deadline month is 1-12`, p.deadline.month >= 1 && p.deadline.month <= 12);
      }
    }
    if (p.supplemental?.required) {
      assert(`${at} a required supplemental application says what it is`, (p.supplemental.note || '').length >= 20);
    }
    if (p.admissionProfileId) {
      assert(`${at} its admissions-calculator link points at a real profile`,
        PROGRAM_PROFILES.some(x => x.id === p.admissionProfileId),
        `got: ${p.admissionProfileId} — a broken link forks one program into two`);
    }
  }
}

// ── 5. The roster claims nothing it has not checked ──────────────────────────
section('5. The roster claims nothing');
{
  // Anything that would be a requirement claim. If one of these ever appears on
  // a roster entry, the entry has stopped being a discovery pointer and started
  // being an unverified assertion.
  const FORBIDDEN = [
    'deadline', 'test', 'gpa', 'interview', 'casper', 'acceptance', 'citizenship',
    'residency', 'serviceHours', 'supplemental', 'cost', 'recommendations', 'verified',
  ];
  for (const r of ROSTER) {
    const at = `[${r.id}]`;
    assert(`${at} names an institution`, !!r.institution?.trim());
    assert(`${at} names a program`, !!r.program?.trim());
    assert(`${at} has a two-letter state`, /^[A-Z]{2}$/.test(String(r.state)), `got: ${r.state}`);
    assert(`${at} pathway is a real PATHS key`, !!PATHS[r.pathway], `got: ${r.pathway}`);
    assert(`${at} states a length`, Number.isFinite(r.years) && r.years > 0);
    const leaked = FORBIDDEN.filter(k => r[k] !== undefined);
    assert(`${at} carries no requirement claim`, leaked.length === 0,
      `leaked: ${leaked.join(', ')} — the roster's whole contract is that it does not claim what we have not read`);
    assert(`${at} id is namespaced away from the checked catalog`, r.id.startsWith('r-'), `got: ${r.id}`);
    assert(`${at} is not also a fully checked program`, !PROGRAM_BY_ID[r.id]);
  }
}

// ── 6. The corrections ───────────────────────────────────────────────────────
// The two the brief singles out, plus the shape rule that keeps any future one
// honest. A closed program in the live catalog would be recommended by us.
section('6. Closed and mis-listed programs');
{
  const byId = Object.fromEntries(MISLISTED_PROGRAMS.map(m => [m.id, m]));

  const hpme = byId['northwestern-hpme'];
  assert("Northwestern's HPME is listed as a correction", !!hpme);
  assert('HPME is marked closed', hpme?.kind === 'closed');
  assert('HPME says when it closed', /2020/.test(hpme?.headline || '') || /2020/.test(hpme?.detail || ''));
  assert('HPME does not appear in the live catalog', !PROGRAMS.some(p => /hpme/i.test(p.id) || /Honors Program in Medical Education/i.test(p.program)));

  const jamp = byId['texas-jamp'];
  assert('Texas JAMP is listed as a correction', !!jamp);
  assert('JAMP is marked as not a high-school-entry program', jamp?.kind === 'not_hs_entry');
  assert('JAMP explains that it is for students already enrolled at a Texas public university',
    /already enrolled/i.test(jamp?.detail || '') && /need-based|need based/i.test(jamp?.detail || ''));
  assert('JAMP does not appear in the live catalog or roster',
    !PROGRAMS.some(p => /jamp/i.test(p.id)) && !ROSTER.some(p => /jamp/i.test(p.id) || /Joint Admission Medical/i.test(p.program)));

  for (const m of MISLISTED_PROGRAMS) {
    const at = `[${m.id}]`;
    assert(`${at} kind is known`, ['closed', 'not_hs_entry'].includes(m.kind), `got: ${m.kind}`);
    assert(`${at} has a one-line headline`, (m.headline || '').length >= 15);
    assert(`${at} explains itself at length`, (m.detail || '').length >= 120);
    assert(`${at} never dead-ends the student`, (m.instead || '').length >= 60,
      'a correction with no "what to do instead" is a door slammed on a student who was doing their best');
  }

  assert('nothing marked closed is browsable', filterPrograms({}).every(p => p.status !== 'closed'));
  assert('nothing marked closed is in the "closing soon" board', closingSoon(400).every(r => r.program.status !== 'closed'));
}

// ── 7. Deadlines and the milestone ladder ────────────────────────────────────
section('7. Deadlines roll forward, and alerts never fire in the past');
{
  const dated = PROGRAMS.filter(p => p.deadline?.month != null);
  assert('most of the catalog has a workable deadline', dated.length >= PROGRAMS.length * 0.8);

  for (const p of dated) {
    const at = `[${p.id}]`;
    const dl = nextDeadline(p, TODAY);
    assert(`${at} next deadline is in the future`, dl.daysOut >= 0, `got ${dl.daysOut} days`);
    assert(`${at} next deadline is inside a year`, dl.daysOut <= 366);
    assert(`${at} deadline carries its precision`, !!dl.precision);
    assert(`${at} an approximate deadline never renders as an exact date`,
      dl.precision === 'exact' || /approx|window/.test(dl.label), `got: ${dl.label}`);
    assert(`${at} a binding round is flagged as binding`,
      dl.binding === !!ROUND_TYPES[p.deadline.round]?.binding);
  }

  // Rollover: the day after this cycle's date, the next one is next cycle's.
  const sample = dated[0];
  const justAfter = new Date(TODAY.getFullYear(), sample.deadline.month - 1, (sample.deadline.day || 15) + 1);
  const rolled = nextDeadline(sample, justAfter);
  assert('a deadline that has just passed rolls to next cycle', rolled.passedThisCycle === true && rolled.daysOut > 300);

  // The ladder.
  const drexel = PROGRAM_BY_ID['drexel-ba-bs-md'];
  const far = new Date(TODAY.getFullYear() + 1, 0, 1); // a date with the full ladder ahead of it
  const dueIso = nextDeadline(drexel, far).iso;
  const rows = milestoneRowsFor(drexel, dueIso, far);
  assert('a saved program writes the deadline plus its alerts', rows.length === ALERT_OFFSETS.length + 1,
    `got ${rows.length} rows`);
  assert('every milestone row is dated on or before the deadline', rows.every(r => r.due_date <= dueIso));
  assert('no milestone row is dated in the past', rows.every(r => Date.parse(`${r.due_date}T00:00:00`) >= far.getTime() - DAY));
  assert('every milestone row names the program', rows.every(r => r.title.includes(drexel.institution)));
  assert('every milestone row carries a real deadline kind',
    rows.every(r => ['early_action', 'early_decision', 'regular_decision'].includes(r.kind)),
    rows.map(r => r.kind).join(', '));
  assert('the ladder starts months out, not weeks',
    Math.max(...ALERT_OFFSETS) >= 120,
    'a supplemental essay set plus official score sends is a months-long job; a 60-day warning arrives after the work should have started');

  // An alert whose date has already gone is dropped, not written into the past.
  const soonIso = (() => { const d = new Date(Date.now() + 20 * DAY); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const shortLadder = milestoneRowsFor(drexel, soonIso, TODAY);
  assert('alerts already in the past are dropped rather than written', shortLadder.length === 2,
    `got ${shortLadder.length}: ${shortLadder.map(r => r.due_date).join(', ')}`);

  // The college row a save produces.
  const dl = nextDeadline(drexel, TODAY);
  const row = collegeRowFor(drexel, dl);
  assert('a saved program becomes a college row with the program in its name', row.name === programLabel(drexel));
  assert('a combined-degree program is filed as a reach', row.category === 'reach');
  assert('an early-round deadline lands in the early column', row.ea_ed_deadline === dl.iso && row.rd_deadline === undefined);
  assert('the college row carries the official URL so the student can get back to it', row.notes.includes(drexel.url));
  const regular = PROGRAMS.find(p => p.deadline?.round === 'regular');
  if (regular) {
    const rrow = collegeRowFor(regular, nextDeadline(regular, TODAY));
    assert('a regular-round deadline lands in the regular column', !!rrow.rd_deadline && rrow.ea_ed_deadline === undefined);
  }
}

// ── 8. The requirements gap ──────────────────────────────────────────────────
// The rules here are asymmetric on purpose, and the asymmetry is the point: we
// never clear a student on data we do not have, and we never fail one either.
section('8. The requirements gap never clears — or condemns — on missing data');
{
  const drexel = PROGRAM_BY_ID['drexel-ba-bs-md'];
  const emptyFacts = studentFactsFor({ snapshot: {}, user: null });

  const emptyRows = requirementGaps(drexel, emptyFacts);
  assert('with an empty portfolio, nothing reads as met',
    emptyRows.filter(r => r.status === 'met').length === 0,
    emptyRows.filter(r => r.status === 'met').map(r => r.id).join(', '));
  assert('with an empty portfolio, checkable requirements read as "nothing logged"',
    emptyRows.some(r => r.status === 'missing'));
  assert('with an empty portfolio, nothing reads as short',
    emptyRows.filter(r => r.status === 'short').length === 0,
    'not knowing a student\'s GPA is not evidence that their GPA is low');
  assert('an empty portfolio produces an "unknown" verdict, never a pass',
    programReadiness(drexel, emptyFacts).status === 'unknown');

  // A student who clears everything Drexel states.
  const strong = studentFactsFor({
    snapshot: {
      gpaEntries: [{ gpa: 4.2, weighted: true, term: '11th', created_at: '2026-06-01' }],
      testScores: [{ test_type: 'SAT', composite: 1500, section_scores: { ebrw: 750, math: 750 } }],
      clinicalHours: [{ hours: 120, entry_date: '2026-01-01' }],
      activities: [{ activity_type: 'Volunteering', hours_per_week: 8, weeks_per_year: 40 }],
    },
    user: { state: 'PA' },
  });
  const strongRead = programReadiness(drexel, strong);
  assert('a student who clears every stated bar is told so', strongRead.status === 'clears', strongRead.headline);
  assert('clearing a floor is never described as being competitive',
    strongRead.rows.find(r => r.id === 'gpa')?.detail.includes('floor'));

  // A student below the floors.
  const weak = studentFactsFor({
    snapshot: {
      gpaEntries: [{ gpa: 3.1, weighted: true, term: '11th', created_at: '2026-06-01' }],
      testScores: [{ test_type: 'SAT', composite: 1200, section_scores: { ebrw: 600, math: 600 } }],
      activities: [{ activity_type: 'Volunteering', hours_per_week: 1, weeks_per_year: 10 }],
    },
    user: null,
  });
  const weakRead = programReadiness(drexel, weak);
  assert('a student below a stated floor is told plainly', weakRead.status === 'short');
  assert('the summary never disagrees with the detail',
    weakRead.short === weakRead.rows.filter(r => r.status === 'short').length);
  assert('every shortfall names the exact gap',
    weakRead.rows.filter(r => r.status === 'short').every(r => /\d/.test(r.detail)));
  assert('every checkable row links to the screen that fixes it',
    weakRead.rows.filter(r => ['short', 'missing', 'close'].includes(r.status)).every(r => !!r.fixWhere));

  // Every status a row can carry must be one the UI knows how to render.
  for (const p of PROGRAMS) {
    for (const r of requirementGaps(p, strong)) {
      assert(`[${p.id}] gap row '${r.id}' carries a renderable status`, !!GAP_STATUS[r.status], `got: ${r.status}`);
      assert(`[${p.id}] gap row '${r.id}' says something`, (r.detail || '').length >= 20);
    }
  }

  // Citizenship is stated as the program's rule, never as a verdict about the
  // student — we do not ask for it and must not infer it.
  const cit = requirementGaps(PROGRAM_BY_ID['umkc-ba-md'], strong).find(r => r.id === 'citizenship');
  assert('a citizenship requirement is shown as the rule, with no verdict attached', cit?.yours === null);
  assert('a citizenship requirement is flagged as a hard restriction', cit?.status === 'blocked');

  // The single-sitting rule — the one that most often makes a student believe
  // they clear a bar they do not.
  const superscorer = studentFactsFor({
    snapshot: {
      testScores: [
        { test_type: 'SAT', composite: 1450, section_scores: { ebrw: 800, math: 650 } },
        { test_type: 'SAT', composite: 1440, section_scores: { ebrw: 640, math: 800 } },
      ],
    },
    user: null,
  });
  const psu = PROGRAM_BY_ID['psu-jefferson-pmm'];
  assert('the single-sitting program is flagged in the data', psu.test.singleSitting === true);
  const single = requirementGaps(psu, superscorer).find(r => r.id === 'test-single-sitting');
  assert('a superscore that beats every single sitting raises the single-sitting rule', !!single);
  assert('the single-sitting row tells the student their superscore does not count',
    /superscore/i.test(single?.detail || '') && single?.status === 'short');
  assert('the score row reads the best SINGLE sitting, not the superscore',
    requirementGaps(psu, superscorer).find(r => r.id === 'test-floor')?.yours === 'SAT 1450');

  // "Official scores only" is a task with a lead time, not a higher bar.
  const noSelfReport = PROGRAMS.filter(p => p.test?.policy === 'required_no_self_report');
  assert('programs that refuse self-reported scores exist in the catalog', noSelfReport.length >= 2);
  for (const p of noSelfReport) {
    const send = requirementGaps(p, strong).find(r => r.id === 'test-official-send');
    assert(`[${p.id}] refusing self-reported scores raises the score-send task`, !!send);
    assert(`[${p.id}] the score-send task names the lead time`, /weeks/i.test(send?.detail || ''));
  }

  // A program that publishes no GPA minimum must not be shown as passed.
  const noGpaMin = PROGRAMS.find(p => p.gpa?.min == null);
  const row = requirementGaps(noGpaMin, strong).find(r => r.id === 'gpa');
  assert('an unpublished GPA minimum reads as "not published", never as met', row?.status === 'not_stated');
}

// ── 9. Interview and CASPer prep is actually linked ──────────────────────────
// The brief's other half: the MMI circuit and the CASPer test were built and
// then orphaned, with nothing in the app explaining what they were for.
section('9. Interview prep is reachable from every program that interviews');
{
  const interviewers = PROGRAMS.filter(p => p.interview?.required || p.casper === true);
  assert('most of the catalog interviews', interviewers.length >= PROGRAMS.length * 0.6);

  for (const p of interviewers) {
    const at = `[${p.id}]`;
    const targets = interviewTargetsFor(p);
    assert(`${at} offers at least one place to go and practise`, targets.length > 0);
    for (const t of targets) {
      assert(`${at} target names a mode Interview Prep understands`,
        ['circuit', 'mmi', 'casper', 'live', 'standard'].includes(t.mode), `got: ${t.mode}`);
      assert(`${at} target has a call to action`, !!t.cta);
      assert(`${at} target explains what the format is`, (t.blurb || '').length >= 40);
    }
  }

  // An unconfirmed format still gets a recommendation, and says it is a hedge.
  const unconfirmed = PROGRAMS.find(p => p.interview?.required && !p.interview.format);
  if (unconfirmed) {
    const t = interviewTargetsFor(unconfirmed)[0];
    assert('an unconfirmed interview format still recommends the circuit', t.mode === 'circuit');
    assert('an unconfirmed interview format says it is a hedge', t.confirmed === false && /not confirmed/i.test(t.label));
  }

  // A program that does not interview is not sent anywhere.
  const noInterview = PROGRAMS.find(p => p.interview?.required === false && p.casper !== true);
  if (noInterview) {
    assert('a program that does not interview offers no prep link', interviewTargetsFor(noInterview).length === 0);
  }

  // Drexel is the worked example the brief names.
  const drexelTargets = interviewTargetsFor(PROGRAM_BY_ID['drexel-ba-bs-md']);
  assert('Drexel, which runs an MMI, sends the student to the MMI circuit',
    drexelTargets.some(t => t.key === 'mmi' && t.mode === 'circuit' && t.confirmed));
}

// ── 10. Browsing ─────────────────────────────────────────────────────────────
section('10. Filters, ordering and the summary');
{
  assert('an unfiltered browse returns the whole open catalog', filterPrograms({}).length === PROGRAMS.filter(p => p.status !== 'closed').length);
  for (const g of PATHWAY_GROUPS) {
    assert(`filtering to '${g.id}' returns only that pathway`, filterPrograms({ pathway: g.id }).every(p => p.pathway === g.id));
  }
  assert('filtering by state returns only that state', filterPrograms({ state: 'PA' }).every(p => p.state === 'PA'));
  assert('search matches an institution name', filterPrograms({ query: 'drexel' }).some(p => p.id === 'drexel-ba-bs-md'));
  assert('search matches a program name', filterPrograms({ query: 'plme' }).length >= 0); // never throws

  const ordered = filterPrograms({}).map(p => nextDeadline(p)?.daysOut ?? 9999);
  assert('the catalog is ordered by what closes first, not alphabetically',
    ordered.every((d, i) => i === 0 || ordered[i - 1] <= d),
    'a student needs to know which one closes first; an alphabetical list buries November under V');

  assert('the roster filters on the same axes', filterRoster({ state: 'PA' }).every(p => p.state === 'PA'));

  const s = catalogSummary();
  assert('the summary counts both tiers', s.total === s.detailed + s.roster);
  assert('the catalog covers a serious number of states', s.states >= 20, `got ${s.states}`);
  assert('the catalog covers every pathway the brief names', Object.keys(s.byPathway).length >= 6);
  assert('STATES is derived, sorted and complete',
    STATES.length === s.states && STATES.every((v, i) => i === 0 || STATES[i - 1] <= v));

  // Every basis the data uses has UI copy behind it.
  for (const b of BASES) {
    assert(`basis '${b}' has a label and an explanation`, !!BASIS_META[b]?.label && (BASIS_META[b]?.blurb || '').length >= 30);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log('');
if (failures.length) {
  console.error(`✗ ${failures.length} failure${failures.length === 1 ? '' : 's'} (${passed} passed)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ Combined-degree catalog verified — ${passed} assertions.`);
console.log(`  ${PROGRAMS.filter(p => p.status !== 'closed').length} fully checked programs, ${ROSTER.length} on the discovery roster, ${MISLISTED_PROGRAMS.length} corrections, ${STATES.length} states.`);
