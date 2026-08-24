// ─────────────────────────────────────────────────────────────────────────────
// verify:grade-band — the build gate on the one rule this feature turns on.
//
//   GRADE BAND CHANGES EMPHASIS AND NEVER ACCESS.
//
// The arithmetic half of this file (graduation year ⇄ grade, the August 1
// rollover, the annual confirmation) is checked because it is easy to get
// subtly wrong and impossible to notice: a student mis-placed by one year gets
// a confidently wrong app for ten months.
//
// The other half is checked because it is easy to erode. "Just hide it for
// freshmen" is a one-line change that reads as a kindness and costs the
// product its whole upsell: a ninth grader who never sees the program tracker
// will never ask a parent to pay for it. So this script reads the preview
// component's own source and fails the build if it ever grows a lock — an
// opacity fade, a pointer-events kill, a disabled attribute, an early return
// that renders the banner INSTEAD of the children. There is no way to write
// that regression and keep the build green.
//
// Plain Node, no bundler: everything imported here is pure.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  BANDS, BAND_IDS, BAND_BY_ID, bandOfGrade, bandsFromGrades,
  graduationYearFor, gradeStageFromGraduationYear, defaultGraduationYear,
  graduationYearChoices, graduationYearLabel,
  gradeStageFor, graduationYearFor_user, bandFor,
  needsGradYearConfirmation, confirmationStamp,
  bandStateFor, isActiveForBand, previewBannerText,
  DESTINATION_BANDS, destinationBandState,
} from '../src/lib/gradeBand.js';
import { GRADE_KEYS, academicFallYear, bandsForGrades as timelineBands, buildTimeline, MILESTONES } from '../src/lib/timeline.js';
import {
  BAND_FLOWS, flowForBand, bandStepKeys, landingFor, focusCopyFor,
  shouldReofferDiagnostic, shouldShowReturnScreen, daysAway, breakLabel, BREAK_DAYS,
  PATHWAY_SKIP_LABEL, DIAGNOSTIC_REOFFER,
} from '../src/lib/onboardingFlow.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

let failed = 0, passed = 0;
const problems = [];
function assert(name, cond, detail = '') {
  if (cond) { passed++; return; }
  failed++; problems.push(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`);
}
const eq = (name, got, want) => assert(name, got === want, `expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);

// Fixed clocks. OCT is mid-autumn of the 2026–27 school year; JULY is three
// weeks before the rollover; AUG is the day after it.
const OCT = new Date(2026, 9, 15);
const JULY = new Date(2027, 6, 31);
const AUG = new Date(2027, 7, 1);

// ─── 1. The bands themselves ──────────────────────────────────────────────────
{
  eq('there are exactly three bands', BANDS.length, 3);
  eq('...named explore, build, apply', BAND_IDS.join(','), 'explore,build,apply');
  const covered = BANDS.flatMap(b => b.grades);
  assert('every grade key belongs to exactly one band',
    GRADE_KEYS.every(g => covered.filter(x => x === g).length === 1),
    `covered: ${covered.join(', ')} vs grades: ${GRADE_KEYS.join(', ')}`);
  eq('ninth and tenth are explore', bandOfGrade('freshman') + '/' + bandOfGrade('sophomore'), 'explore/explore');
  eq('eleventh is build', bandOfGrade('junior'), 'build');
  eq('twelfth is apply', bandOfGrade('senior'), 'apply');
  eq('a student past graduation stays in apply', bandOfGrade('gap'), 'apply');
  assert('every band carries copy for its preview banner', BANDS.every(b => b.previewLine && b.focus && b.label));

  // The duplicated mapping inside timeline.js (it cannot import gradeBand.js —
  // gradeBand.js imports IT). If they ever disagree, a milestone's band tag and
  // the student's band come from two different models and nothing lines up.
  GRADE_KEYS.forEach(g => {
    eq(`timeline.js and gradeBand.js agree on ${g}`, timelineBands([g]).join(','), bandsFromGrades([g]).join(','));
  });
}

// ─── 2. Graduation year ⇄ grade ───────────────────────────────────────────────
{
  // 2026–27 school year: seniors graduate in spring 2027.
  eq('a senior in Oct 2026 is class of 2027', graduationYearFor('senior', OCT), 2027);
  eq('a junior in Oct 2026 is class of 2028', graduationYearFor('junior', OCT), 2028);
  eq('a freshman in Oct 2026 is class of 2030', graduationYearFor('freshman', OCT), 2030);

  GRADE_KEYS.filter(g => g !== 'gap').forEach(g => {
    eq(`${g} round-trips through a graduation year`, gradeStageFromGraduationYear(graduationYearFor(g, OCT), OCT), g);
  });

  eq('a year already past reads as gap, not a fifth year of high school',
    gradeStageFromGraduationYear(2025, OCT), 'gap');
  eq('a year far in the future clamps to freshman rather than returning nothing',
    gradeStageFromGraduationYear(2034, OCT), 'freshman');
  eq('a missing graduation year is null, never a guess', gradeStageFromGraduationYear(null, OCT), null);
  eq('junk is null too', gradeStageFromGraduationYear('soon', OCT), null);
}

// ─── 3. The August 1 rollover ─────────────────────────────────────────────────
// The entire reason the stored attribute is a graduation year rather than a
// grade: nothing is written, nothing is scheduled, and the answer is still
// right the next morning.
{
  const junior = { graduationYear: 2028 };
  eq('a junior on July 31 is still a junior', gradeStageFor(junior, JULY), 'junior');
  eq('...and is a senior on August 1, with nothing written anywhere', gradeStageFor(junior, AUG), 'senior');
  eq('...so their band rolls too', bandFor(junior, JULY) + '→' + bandFor(junior, AUG), 'build→apply');

  const senior = { graduationYear: 2027 };
  eq('a senior rolls to gap, not to a fifth year', gradeStageFor(senior, AUG), 'gap');
  eq('...and stays in the apply band', bandFor(senior, AUG), 'apply');

  // Legacy accounts, created before the attribute existed.
  // Recorded as a sophomore in the 2025-26 year; one academic year has elapsed by Oct 2026.
  const legacy = { gradeStage: 'sophomore', gradeStageYear: 2025 };
  eq('a legacy account still advances by elapsed academic years', gradeStageFor(legacy, OCT), 'junior');
  eq('...and gets a graduation year derived for it', graduationYearFor_user(legacy, OCT), 2028);
  eq('...and a two-year-stale one advances two years',
    gradeStageFor({ gradeStage: 'sophomore', gradeStageYear: 2024 }, OCT), 'senior');
  eq('no year and no grade is null, not a default', bandFor({}, OCT), null);
  eq('...which every consumer reads as "everything is active"', bandStateFor(['apply'], bandFor({}, OCT)), 'active');
}

// ─── 4. The default from date of birth ────────────────────────────────────────
// Offered, never assumed — but the offer has to be right for most students or
// the confirmation screen is just a second question.
{
  eq('born June 2009 → class of 2027', defaultGraduationYear({ year: 2009, month: 6 }), 2027);
  eq('born Sept 2008 → class of 2027 (after the cutoff)', defaultGraduationYear({ year: 2008, month: 9 }), 2027);
  eq('born Aug 2008 → class of 2026 (before the cutoff)', defaultGraduationYear({ year: 2008, month: 8 }), 2026);
  eq('an incomplete birthdate yields no guess', defaultGraduationYear({ year: 2009 }), null);
  eq('no birthdate at all yields no guess', defaultGraduationYear(), null);

  const choices = graduationYearChoices(OCT);
  assert('the choice list covers this year\'s seniors through incoming ninth graders',
    choices.includes(2027) && choices.includes(2030), choices.join(','));
  assert('...and every choice describes the grade it implies',
    choices.every(y => graduationYearLabel(y, OCT).sub.length > 0));
}

// ─── 5. The annual confirmation ───────────────────────────────────────────────
{
  const fresh = { graduationYear: 2028, gradYearConfirmedFor: academicFallYear(OCT) };
  eq('a student who just confirmed is not asked again', needsGradYearConfirmation(fresh, OCT), false);
  eq('...and is not asked again later the same school year',
    needsGradYearConfirmation(fresh, new Date(2027, 5, 1)), false);
  eq('...but IS asked on the first login of the next one', needsGradYearConfirmation(fresh, AUG), true);
  eq('an account that has never confirmed is asked', needsGradYearConfirmation({ graduationYear: 2028 }, OCT), true);
  eq('an account with no year is never asked (there is nothing to confirm)',
    needsGradYearConfirmation({ gradeStage: 'junior' }, OCT), false);

  const stamp = confirmationStamp(2029, AUG);
  eq('confirming stamps the academic year it happened in', stamp.gradYearConfirmedFor, academicFallYear(AUG));
  eq('...and writes the derived grade alongside for legacy readers', stamp.gradeStage, 'junior');
  eq('...and confirming silences the prompt', needsGradYearConfirmation({ ...stamp }, AUG), false);
}

// ─── 6. EMPHASIS, NEVER ACCESS ────────────────────────────────────────────────
// The heart of it. Two states, and only two.
{
  const STATES = new Set(['active', 'preview']);
  const combos = [];
  [...BAND_IDS, null].forEach(student => {
    [[], ['explore'], ['build'], ['apply'], ['build', 'apply'], null, 'apply'].forEach(item => {
      combos.push(bandStateFor(item, student));
    });
  });
  assert('every band/tag combination resolves to active or preview and nothing else',
    combos.every(s => STATES.has(s)), [...new Set(combos)].join(', '));
  assert('no combination is ever falsy, undefined, "locked" or "hidden"',
    combos.every(Boolean));

  eq('an untagged thing is active for everyone', bandStateFor(null, 'explore'), 'active');
  eq('an empty tag list is active for everyone', bandStateFor([], 'apply'), 'active');
  eq('a student we cannot place gets everything active', bandStateFor(['apply'], null), 'active');
  eq('in-band is active', bandStateFor(['build', 'apply'], 'build'), 'active');
  eq('out-of-band is PREVIEW, not hidden', bandStateFor(['apply'], 'explore'), 'preview');
  eq('isActiveForBand agrees with bandStateFor', isActiveForBand(['apply'], 'explore'), false);

  // Every band must reach every destination. If a destination is ever tagged in
  // a way that leaves a band unable to see it, that is the regression.
  BAND_IDS.forEach(band => {
    const states = Object.keys(DESTINATION_BANDS).map(id => destinationBandState(id, band));
    assert(`${band} resolves every destination to active or preview`, states.every(s => STATES.has(s)));
    assert(`${band} still has real work of its own`,
      states.some(s => s === 'active'), `every destination reads preview for ${band}`);
  });

  // The banner text is the promise this whole design makes to the student.
  const text = previewBannerText(['build']);
  assert('the preview banner says who usually uses this and when', /most students/i.test(text), text);
  assert('...and invites them in anyway', /curious/i.test(text), text);
  ['lock', 'unavailable', 'not yet', 'restricted', 'upgrade', "can't", 'cannot'].forEach(word => {
    assert(`the preview banner never says "${word}"`,
      !BAND_IDS.some(b => new RegExp(word, 'i').test(previewBannerText([b]))));
  });
}

// ─── 7. The preview component cannot become a lock ────────────────────────────
// Source-level, because this is the regression that reads as a kindness.
{
  // Comments stripped first: this file DOCUMENTS the ban ("no pointerEvents:'none', no
  // aria-hidden"), and a scan that counted the prohibition as the violation would be
  // unfixable without deleting the explanation.
  const src = read('src/components/BandPreview.jsx')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const BANNED = [
    ['pointerEvents', /pointerEvents\s*:\s*['"]none['"]/],
    ['opacity fade', /opacity\s*:\s*0?\.[0-8]/],
    ['blur/grayscale filter', /filter\s*:\s*['"`][^'"`]*(blur|grayscale)/],
    ['disabled attribute', /\sdisabled(\s*=|\s*}|\s*\/)/],
    ['inert attribute', /\binert\b/],
    ['aria-hidden', /aria-hidden/],
    ['tabIndex removal', /tabIndex\s*=\s*\{?\s*-1/],
  ];
  BANNED.forEach(([label, re]) => {
    assert(`BandPreview never introduces a ${label}`, !re.test(src));
  });
  // Out of band, the children must still be rendered. In band, they must be
  // rendered with no wrapper at all — so adding BandPreview to a screen can
  // never change that screen for the students it is aimed at.
  assert('BandPreview renders its children when out of band', /<div>\{children\}<\/div>/.test(src));
  assert('BandPreview renders children bare when in band', /return <>\{children\}<\/>/.test(src));
  assert('BandPreview is written once and exported for reuse',
    /export default function BandPreview/.test(src)
    && /export function BandPreviewBanner/.test(src)
    && /export function BandPreviewTag/.test(src));

  // And it is actually reused, rather than reimplemented per surface.
  const consumers = ['src/App.jsx', 'src/components/PortfolioMilestones.jsx', 'src/components/ui/SubNav.jsx']
    .filter(f => /BandPreview/.test(read(f)));
  assert('the preview component is reused on at least three surfaces',
    consumers.length >= 3, consumers.join(', '));
}

// ─── 8. Milestones: tagged, previewed, never disappeared ──────────────────────
{
  const userFor = (g) => ({ gradeStage: g, gradeStageYear: academicFallYear(OCT), name: 'T' });
  const fr = buildTimeline({ user: userFor('freshman'), snapshot: {}, now: OCT });
  const sr = buildTimeline({ user: userFor('senior'), snapshot: {}, now: OCT });

  assert('a freshman is not asked to do senior-year work',
    !fr.upcoming.some(e => e.inBand === false));
  assert('...but the senior-year calendar is still there to browse', fr.preview.length > 0,
    `${fr.preview.length} preview milestones`);
  assert('every previewed milestone carries a band tag',
    fr.preview.every(e => Array.isArray(e.bands) && e.bands.length));
  assert('every previewed milestone carries a real date in the student\'s own future',
    fr.preview.every(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date)));
  assert('a milestone is never in both the active list and the preview list',
    !fr.preview.some(p => fr.upcoming.some(u => u.id === p.id)));
  assert('the preview list does not inflate the "coming up" count',
    fr.stats.upcoming === fr.upcoming.length);
  assert('a senior sees the application calendar as ACTIVE, not preview',
    sr.upcoming.some(e => e.kind === 'application'));
  // The claim that matters: nothing in the catalog is unreachable because of a grade.
  // (`when` gates are a different mechanism — they turn on the student's real data, not their
  // year — so a milestone gated on "has research logged" is legitimately absent for both.)
  const ungated = MILESTONES.filter(m => !m.when).map(m => m.id);
  const frAll = new Set([...fr.upcoming, ...fr.preview, ...fr.done, ...fr.past].map(e => e.id));
  const missing = ungated.filter(id => !frAll.has(id));
  assert('every ungated catalog milestone is reachable by a ninth grader', missing.length === 0,
    missing.join(', '));
}

// ─── 9. The three onboarding flows ────────────────────────────────────────────
{
  eq('there is one flow per band', Object.keys(BAND_FLOWS).sort().join(','), 'apply,build,explore');
  BAND_IDS.forEach(b => {
    const f = flowForBand(b);
    eq(`${b}'s flow knows its own band`, f.band, b);
    assert(`${b}'s flow asks at least one band-specific question`, bandStepKeys(b).length >= 1);
    assert(`${b}'s flow says where the student lands`, !!f.landing?.tab && !!f.landing?.view);
    assert(`${b}'s flow explains the landing to the student`, focusCopyFor(b).body.length > 20);
  });

  // The specific flows the product asked for.
  assert('explore is asked what science class they are taking', bandStepKeys('explore').includes('scienceClass'));
  assert('explore sets its own weekly goal', bandStepKeys('explore').includes('weeklyGoal'));
  assert('build is asked when they take the SAT/ACT', bandStepKeys('build').includes('testingPlan'));
  assert('build sets its own weekly goal', bandStepKeys('build').includes('weeklyGoal'));
  assert('apply gets deadline triage', bandStepKeys('apply').includes('deadlineTriage'));

  eq('explore lands on the lesson track, not the portfolio', flowForBand('explore').afterDiagnostic.tab, 'prep');
  eq('build lands on the portfolio timeline', flowForBand('build').afterDiagnostic.tab, 'portfolio');
  eq('a senior lands on their deadlines, NOT on lesson one', landingFor('apply').tab, 'portfolio');
  eq('...specifically on the milestones board', landingFor('apply').view, 'milestones');
  eq('a senior who skipped the diagnostic still lands there',
    landingFor('apply', { skippedDiagnostic: true }).tab, 'portfolio');
  eq('an explore student who skipped it goes to their pathway, not back to the diagnostic',
    landingFor('explore', { skippedDiagnostic: true }).view, 'pathways');
  eq('a band we cannot determine gets the explore flow, not a broken one', flowForBand(null).band, 'explore');

  // Emphasis, never access — restated for the flows.
  BAND_IDS.forEach(b => {
    const preview = flowForBand(b).previewPillars || [];
    assert(`${b}'s flow previews pillars rather than removing them`,
      preview.every(p => ['prep', 'portfolio'].includes(p)), preview.join(','));
  });
  eq('only the apply flow makes the diagnostic optional up front', flowForBand('apply').diagnostic, 'offered');
}

// ─── 10. The pathway skip, and the re-offer ───────────────────────────────────
{
  assert('the skip is phrased as the student would say it',
    /already know/i.test(PATHWAY_SKIP_LABEL), PATHWAY_SKIP_LABEL);
  assert('the re-offer sells the second pathway, not a re-do',
    /second pathway/i.test(DIAGNOSTIC_REOFFER.body), DIAGNOSTIC_REOFFER.body);
  assert('the re-offer is dismissible', !!DIAGNOSTIC_REOFFER.dismiss);

  const skipper = { skippedDiagnostic: true };
  eq('a student who skipped is not nagged on day one', shouldReofferDiagnostic(skipper, { studyActions: 0 }), false);
  eq('...but is offered it once they have used the app', shouldReofferDiagnostic(skipper, { studyActions: 5 }), true);
  eq('...and never twice', shouldReofferDiagnostic({ ...skipper, diagnosticReoffered: true }, { studyActions: 5 }), false);
  eq('...and never after they have taken it', shouldReofferDiagnostic({ ...skipper, diagnosticResult: 'physician' }, { studyActions: 9 }), false);
  eq('a student who took it up front is never re-offered', shouldReofferDiagnostic({}, { studyActions: 9 }), false);
}

// ─── 11. Coming back after a break ────────────────────────────────────────────
{
  eq('the break threshold is three weeks', BREAK_DAYS, 21);
  const ago = (d) => OCT.getTime() - d * 86400000;

  eq('two days away is not a break', shouldShowReturnScreen({ lastActive: ago(2) }, OCT), false);
  eq('twenty days away is not a break', shouldShowReturnScreen({ lastActive: ago(20) }, OCT), false);
  eq('twenty-one days away IS', shouldShowReturnScreen({ lastActive: ago(21) }, OCT), true);
  eq('a summer away certainly is', shouldShowReturnScreen({ lastActive: ago(75) }, OCT), true);

  const seen = { lastActive: ago(30) };
  eq('...and it is shown once per break, not once per session',
    shouldShowReturnScreen({ ...seen, welcomeBackShownFor: seen.lastActive }, OCT), false);
  eq('...but a SECOND long absence earns it again',
    shouldShowReturnScreen({ lastActive: ago(40), welcomeBackShownFor: ago(200) }, OCT), true);
  eq('a brand-new account has no break to report', shouldShowReturnScreen({}, OCT), false);

  eq('the gap is described in weeks, not days', breakLabel(21), '3 weeks');
  eq('...and in months once weeks stop being useful', breakLabel(60), '2 months');
  eq('...and honestly when it has been very long', breakLabel(400), 'over a year');
  eq('days away is null when we have never seen them', daysAway({}), null);
}

// ─── 12. The band tags name real destinations ─────────────────────────────────
// A tag pointing at a screen that no longer exists is a tag that silently stops
// working, so the ids are checked against the nav arrays in App.jsx.
{
  const app = read('src/App.jsx');
  const idsIn = (block) => {
    const m = app.match(new RegExp(`const ${block} = \\[([\\s\\S]*?)\\n\\];`));
    return m ? [...m[1].matchAll(/\{\s*id\s*:\s*'([^']+)'/g)].map(x => x[1]) : [];
  };
  const portfolio = new Set(idsIn('PORTFOLIO_SUBNAV'));
  const prep = new Set(idsIn('PREP_SUBNAV'));
  assert('the nav arrays were found (this check is not silently passing)',
    portfolio.size > 0 && prep.size > 0, `portfolio ${portfolio.size}, prep ${prep.size}`);

  const sectionMatch = app.match(/const PORTFOLIO_GROUP_FOR_VIEW = \{([\s\S]*?)\n\};/);
  const sections = new Set(sectionMatch ? [...sectionMatch[1].matchAll(/\[\s*'([a-z]+)'\s*,\s*'([a-z]+)'\s*\]/g)].map(m => `${m[1]}:${m[2]}`) : []);

  Object.keys(DESTINATION_BANDS).forEach(id => {
    const [tab, rest] = id.split('/');
    const [view, section] = rest.split(':');
    const known = tab === 'portfolio'
      ? (section ? sections.has(`${view}:${section}`) : portfolio.has(view))
      : prep.has(view);
    assert(`band tag "${id}" names a destination that exists`, known);
  });
  Object.entries(DESTINATION_BANDS).forEach(([id, bands]) => {
    assert(`band tag "${id}" uses real band ids`, bands.every(b => BAND_BY_ID[b]));
  });
}

// ─── Report ───────────────────────────────────────────────────────────────────
if (failed) {
  console.error(`\n✗ Grade-band verification FAILED — ${failed} problem(s), ${passed} passed:\n`);
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`✓ Grade-band verification passed — ${passed} assertions.`);
console.log(`  ${BANDS.length} bands, ${Object.keys(BAND_FLOWS).length} onboarding flows, ${Object.keys(DESTINATION_BANDS).length} tagged destinations.`);
console.log('  Emphasis, never access: no lock, no hide, no disable anywhere in the preview path.');
