// Assertions on the credential database — the parts of it that rot silently.
//
// There is no test runner configured in this repo, so this script IS the test suite for
// src/data/credentials/ and src/lib/credentials.js. It runs on every build.
//
// The assertions that matter are the honesty ones. A catalog of this kind decays in three ways,
// all of them invisible until a student who knows the field notices:
//
//   1. A record claims a number is 'issuer-published' and has no source behind it.
//   2. A Credential Registry CTID gets invented so a field is not null, and resolves to nothing.
//   3. A course completion card drifts into the certification bucket, which is exactly the error
//      the whole type field exists to prevent.
//
// Plus the two things students actually hit: the state synonyms and the EMT age gate.
//
//   node scripts/verifyCredentialDatabase.mjs

import { register } from 'node:module';

register('./_appResolve.mjs', import.meta.url);

const {
  CREDENTIALS, STATE_OCCUPATIONAL, NATIONAL_CERTIFICATIONS, COURSE_COMPLETIONS, PORTFOLIO_SKILLS,
  CREDENTIAL_TYPES, CREDENTIAL_TYPE_KEYS, POPULAR_CREDENTIAL_IDS, getCredential, ISSUING_BODIES,
} = await import('../src/data/credentials/index.js');
const {
  searchCredentials, findCredential, credentialName, ageGateFor, provisionalNote,
  computeExpiry, miscategorizationWarning, registryLink, resumeHeading, groupByType,
  typicalAgeForGrade,
} = await import('../src/lib/credentials.js');

let passed = 0;
const failures = [];
function assert(label, condition, detail = '') {
  if (condition) { passed++; return; }
  failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
}
function check(label, actual, expected) {
  assert(label, actual === expected, `expected: ${expected}\n      actual:   ${actual}`);
}

// ── 1. Shape and identity ───────────────────────────────────────────────────

assert('the database is not trivially small', CREDENTIALS.length >= 60, `got ${CREDENTIALS.length}`);

const ids = CREDENTIALS.map(c => c.id);
check('every id is unique', new Set(ids).size, ids.length);
for (const c of CREDENTIALS) {
  assert(`${c.id}: has a type`, CREDENTIAL_TYPE_KEYS.includes(c.type), `got "${c.type}"`);
  assert(`${c.id}: has an official name`, typeof c.officialName === 'string' && c.officialName.length > 2);
  assert(`${c.id}: has a one-line summary`, typeof c.summary === 'string' && c.summary.length > 20);
  assert(`${c.id}: has search aliases`, Array.isArray(c.aliases) && c.aliases.length >= 2);
  assert(`${c.id}: aliases are lowercase`, (c.aliases || []).every(a => a === a.toLowerCase()));
  assert(`${c.id}: id is a slug`, /^[a-z0-9-]+$/.test(c.id), c.id);
}

// All four types are actually populated — a type nobody uses is a type that will be got wrong.
for (const key of CREDENTIAL_TYPE_KEYS) {
  assert(`the "${key}" bucket is populated`, CREDENTIALS.some(c => c.type === key));
}
assert('state credentials are in the state file', STATE_OCCUPATIONAL.every(c => c.type === 'state-occupational'));
assert('national certifications are in the national file', NATIONAL_CERTIFICATIONS.every(c => c.type === 'national-certification'));
assert('course cards are in the course file', COURSE_COMPLETIONS.every(c => c.type === 'course-completion'));
assert('skills are in the skills file', PORTFOLIO_SKILLS.every(c => c.type === 'skill'));

assert('every popular id resolves', POPULAR_CREDENTIAL_IDS.every(id => !!getCredential(id)),
  POPULAR_CREDENTIAL_IDS.filter(id => !getCredential(id)).join(', '));
assert('the issuing-body list is not empty', ISSUING_BODIES.length >= 25);

// ── 2. Honesty rules ────────────────────────────────────────────────────────
// The same three rules programProfiles.js is written under, for the same reason.

for (const c of CREDENTIALS) {
  const numeric = [c.minAge, c.trainingHours, c.cost].filter(Boolean);
  for (const n of numeric) {
    assert(`${c.id}: basis is one of the three allowed values`,
      ['issuer-published', 'state-varies', 'typical'].includes(n.basis), `got "${n.basis}"`);
  }
  const claimsPublished = numeric.some(n => n.basis === 'issuer-published') || c.ageGate?.basis === 'issuer-published';
  if (claimsPublished) {
    assert(`${c.id}: claims 'issuer-published' so it must carry a source`,
      Array.isArray(c.sources) && c.sources.length > 0);
  }
  for (const s of c.sources || []) {
    assert(`${c.id}: every source has a label and an https URL`,
      !!s.label && typeof s.url === 'string' && s.url.startsWith('https://'), s.url);
  }
}

// Rule 2: a CTID is null until it has genuinely been looked up. A fabricated one resolves to
// nothing and makes every other mapping suspect, so the test is that anything non-null looks like
// a real Credential Engine CTID rather than a placeholder.
for (const c of CREDENTIALS) {
  assert(`${c.id}: registry block exists`, !!c.registry);
  const ctid = c.registry?.ctid;
  assert(`${c.id}: ctid is null or a real-shaped CTID`,
    ctid === null || /^ce-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ctid),
    `got ${ctid}`);
  const link = registryLink(c);
  assert(`${c.id}: unmapped records still get a real Registry search link`,
    ctid !== null || (link.url.includes('credentialfinder.org') && link.mapped === false));
}

// O*NET codes, where present, must be shaped like O*NET-SOC codes rather than bare SOC codes.
for (const c of CREDENTIALS) {
  if (!c.onetSoc) continue;
  assert(`${c.id}: onetSoc is a well-formed O*NET-SOC code`, /^\d{2}-\d{4}\.\d{2}$/.test(c.onetSoc), c.onetSoc);
}

// ── 3. The type distinction the whole rebuild exists for ────────────────────

check('a course completion card is not a certification', CREDENTIAL_TYPES['course-completion'].isCertification, false);
check('a skill is not a certification', CREDENTIAL_TYPES.skill.isCertification, false);
check('a state credential is a certification', CREDENTIAL_TYPES['state-occupational'].isCertification, true);
check('a national certification is a certification', CREDENTIAL_TYPES['national-certification'].isCertification, true);

// Every course card has to say, in its own words, what it is not. This is the sentence the file
// exists for and it must not go missing from a record.
for (const c of COURSE_COMPLETIONS) {
  assert(`${c.id}: says explicitly that it is not a certification`,
    typeof c.notACertification === 'string' && c.notACertification.length > 25);
  assert(`${c.id}: the warning actually reaches the UI`, !!miscategorizationWarning(c));
}
assert('a real certification produces no miscategorisation warning', miscategorizationWarning('cna') === null);
assert('a skill produces no miscategorisation warning', miscategorizationWarning('pcr') === null);

// The three named in the brief, by id, because they are the three people get wrong.
for (const id of ['aha-bls', 'osha-10', 'stop-the-bleed']) {
  check(`${id} is typed as a course completion card`, getCredential(id).type, 'course-completion');
}
check('BLS is filed under training on a résumé, not under certifications',
  resumeHeading('course-completion'), 'Training & Course Completions');
check('a CNA is filed under certifications', resumeHeading('state-occupational'), 'Certifications & Licensure');
assert('the AHA card names the AHA\'s own position', /course completion card/i.test(getCredential('aha-bls').notACertification));

// The bodies named in the brief all have to be represented somewhere.
const allIssuers = ISSUING_BODIES.join(' | ');
for (const body of ['NHA', 'NCCT', 'AMCA', 'HSPA', 'PTCB', 'ASCP']) {
  assert(`${body} appears as an issuer or a named sibling body`,
    allIssuers.includes(body) || CREDENTIALS.some(c => (c.issuerNote || '').includes(body) || (c.siblings || []).join(' ').includes(body)));
}

// ── 4. State synonyms ───────────────────────────────────────────────────────
// Six states rename the CNA. All six, by name, because this is the single most visible way to be
// wrong in front of a student who actually holds the credential.

const CNA_SYNONYMS = [
  ['OH', /STNA/],
  ['NH', /LNA/],
  ['WA', /NAC/],
  ['NC', /CNA I\b/],
  ['OR', /NA-R|NA-C/],
  ['MD', /GNA/],
];
for (const [state, re] of CNA_SYNONYMS) {
  const named = credentialName('cna', state);
  assert(`a CNA in ${state} is shown under that state's own name`, re.test(named.name), `got "${named.name}"`);
  check(`${state} is recorded as a match, not a fallback`, named.matched, true);
  // Same underlying credential, whatever it is called.
  check(`${state}'s name still resolves to the same credential`, findCredential(named.name)?.id, 'cna');
}
check('North Carolina flags that CNA II is a separate credential', /CNA II/.test(credentialName('cna', 'NC').name), true);
check('Oregon names both the registered and certified steps', /NA-R/.test(credentialName('cna', 'OR').name), true);

// An unrecorded state falls back to the national name and SAYS it is falling back.
const alaska = credentialName('cna', 'AK');
check('an unrecorded state falls back to the national name', alaska.name, 'Certified Nursing Assistant');
check('and the fallback is reported as a fallback', alaska.matched, false);
check('and the record still declares that the name varies', alaska.varies, true);

// Searching by the state word finds it even though those letters are not in the official name.
for (const term of ['stna', 'lna', 'gna', 'nurse aide']) {
  assert(`searching "${term}" finds the CNA`, searchCredentials(term).some(c => c.id === 'cna'));
}

// ── 5. Age gates ────────────────────────────────────────────────────────────
// The EMT is the case the whole `ageGateFor` shape exists for: a 16-year-old is not blocked from
// the course, is not blocked from the exam, IS blocked from the certificate, gets Assessment-EMT
// instead, converts at 18, and may still be certified at state level. A boolean is wrong five
// different ways here.

const emt = getCredential('emt');
check('NREMT\'s floor is recorded as 18', emt.ageGate.hardMin, 18);
check('and it is recorded as published by the issuer', emt.ageGate.basis, 'issuer-published');
check('the under-18 route is named correctly', emt.ageGate.underageStatus, 'Assessment-EMT');
assert('the conversion at 18 is stated', /convert/i.test(emt.ageGate.underageNote));
assert('and the state-level exception is stated', /state/i.test(emt.ageGate.stateCaveat));

const sixteen = ageGateFor('emt', 16);
check('a 16-year-old is not simply told no', sixteen.status, 'provisional');
check('and is never hard-blocked from logging it', sixteen.blocking, false);
check('and is handed the right word for what they hold', sixteen.underageStatus, 'Assessment-EMT');
assert('the 16-year-old is told about the state route', /state/i.test(sixteen.detail));
check('an 18-year-old is clear', ageGateFor('emt', 18).status, 'ok');
check('no age on file reads as unknown, not as permission', ageGateFor('emt', null).status, 'unknown');

// Every EMS record carries the same gate, because NREMT applies it to all of them.
for (const id of ['emt', 'aemt', 'emr']) {
  check(`${id} carries an explicit NREMT age gate`, getCredential(id).ageGate.hardMin, 18);
  assert(`${id} names its own Assessment variant`, /^Assessment-/.test(getCredential(id).ageGate.underageStatus));
}

// A credential whose floor genuinely varies must not be presented as a hard no.
const cnaYoung = ageGateFor('cna', 15);
assert('a state-varying floor never hard-blocks', cnaYoung.blocking === false);
check('and is described as varying', cnaYoung.status, 'provisional');

// ── 6. The provisional-until-graduation wall ────────────────────────────────
// Separate from age, and the thing that surprises high schoolers about the national bodies.

for (const id of ['ccma', 'cpt', 'cpct-a', 'cpht']) {
  const p = provisionalNote(id);
  assert(`${id}: carries a provisional rule for a student who has not graduated`, !!p && p.rule.length > 30);
}
assert('CRCST records HSPA\'s own provisional status', /Provisional CRCST/i.test(provisionalNote('crcst').rule));
assert('a course card has no diploma wall', provisionalNote('aha-bls') === null);

// ── 7. The fields the brief asks to be stored ───────────────────────────────

const CERTS = CREDENTIALS.filter(c => c.type !== 'skill');
for (const c of CERTS) {
  assert(`${c.id}: names an issuing body`, Array.isArray(c.issuers) && c.issuers.length > 0);
  assert(`${c.id}: has an abbreviation`, typeof c.abbreviation === 'string' && c.abbreviation.length > 0);
  assert(`${c.id}: records a typical minimum age`, c.minAge && typeof c.minAge.value === 'number');
  assert(`${c.id}: records typical training hours`, c.trainingHours && typeof c.trainingHours.value === 'number');
  assert(`${c.id}: records a typical cost`, c.cost && typeof c.cost.low === 'number' && typeof c.cost.high === 'number');
  assert(`${c.id}: records whether CTE commonly offers it free`, typeof c.cteCommon === 'boolean');
  assert(`${c.id}: cost range is ordered`, c.cost.low <= c.cost.high, `${c.cost.low} > ${c.cost.high}`);
}
assert('at least eight credentials are flagged as commonly free in CTE',
  CERTS.filter(c => c.cteCommon).length >= 8);

// ── 8. The non-clinical skills the brief names ──────────────────────────────

const SKILL_IDS = [
  'pipetting', 'pcr', 'gel-electrophoresis', 'cell-culture', 'microscopy', 'aseptic-technique',
  'elisa', 'western-blot',
  'r-stats', 'python-data', 'spss', 'statistical-analysis', 'literature-review', 'irb-process',
  'scientific-writing', 'poster-design',
  'medical-spanish', 'asl',
  'epic', 'redcap', 'graphpad',
];
for (const id of SKILL_IDS) {
  const s = getCredential(id);
  assert(`the skill "${id}" is in the database`, !!s);
  if (s) {
    check(`${id} is typed as a skill, not a certification`, s.type, 'skill');
    assert(`${id} asks for evidence rather than taking the claim`, typeof s.evidence === 'string' && s.evidence.length > 15);
  }
}

// ── 9. Search ranking ───────────────────────────────────────────────────────
// The ranking is the product. These are the queries that would embarrass us.

const first = (q, opts) => searchCredentials(q, opts)[0]?.id;
check('"cna" leads with the CNA', first('cna'), 'cna');
check('"emt" leads with the EMT, not the advanced one', first('emt'), 'emt');
check('"bls" leads with BLS', first('bls'), 'aha-bls');
check('"ccma" leads with the CCMA', first('ccma'), 'ccma');
check('"cpht" leads with the pharmacy tech', first('cpht'), 'cpht');
check('"stna" leads with the CNA', first('stna'), 'cna');
check('"phlebotomy" leads with a phlebotomy credential', ['cpt', 'pbt-ascp'].includes(first('phlebotomy')), true);
check('"cpr" finds BLS rather than nothing', first('cpr'), 'aha-bls');
check('"pcr" leads with the technique', first('pcr'), 'pcr');
check('"epic" leads with the EHR', first('epic'), 'epic');
assert('an empty query returns nothing rather than the whole database', searchCredentials('').length === 0);
assert('search respects a type filter', searchCredentials('c', { types: ['skill'] }).every(c => c.type === 'skill'));
assert('a state code changes what a search is called back',
  credentialName(searchCredentials('cna', { stateCode: 'OH' })[0], 'OH').name.includes('STNA'));

// ── 10. Grouping, expiry, and the small helpers ─────────────────────────────

const grouped = groupByType(searchCredentials('c'));
assert('groups come back in the canonical type order',
  grouped.map(g => g.key).join(',') === CREDENTIAL_TYPE_KEYS.filter(k => grouped.some(g => g.key === k)).join(','));
assert('no empty group is rendered', grouped.every(g => g.items.length > 0));

check('a two-year card expires two years later', computeExpiry('2026-03-14', 24), '2028-03-14');
check('a month-end overflow is clamped, not rolled forward', computeExpiry('2026-01-31', 1), '2026-02-28');
check('a credential with no renewal cycle gets no expiry', computeExpiry('2026-03-14', null), '');
check('an unparseable date yields nothing rather than NaN', computeExpiry('not-a-date', 24), '');

check('a freshman is guessed at 14', typicalAgeForGrade('freshman'), 14);
check('a senior is guessed at 17', typicalAgeForGrade('senior'), 17);
check('an unknown year is not guessed at all', typicalAgeForGrade('nope'), null);

check('findCredential resolves an id', findCredential('cna')?.id, 'cna');
check('findCredential resolves an official name', findCredential('Certified Nursing Assistant')?.id, 'cna');
check('findCredential resolves a state name', findCredential('State Tested Nursing Assistant (STNA)')?.id, 'cna');
check('findCredential returns null rather than guessing', findCredential('a thing we do not have'), null);

// ── Report ──────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\n✗ credential database: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  • ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ credential database: ${passed} assertions passed across ${CREDENTIALS.length} credentials`);
