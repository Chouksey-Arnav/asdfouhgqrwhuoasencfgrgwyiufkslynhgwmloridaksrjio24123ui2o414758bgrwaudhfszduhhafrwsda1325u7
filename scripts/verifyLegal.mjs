#!/usr/bin/env node
/**
 * Fails the build when the legal documents and the code stop telling the same
 * story.
 *
 * ── Why this is a build gate and not a checklist ────────────────────────────
 *
 * The risk with a privacy policy is not that it goes missing. It is that it
 * quietly becomes false. Someone adds an analytics package, switches the ad
 * tag, widens the birthdate wheel, or drops the account-deletion endpoint while
 * refactoring — and the policy still confidently tells users none of that
 * happened. That is worse than having no policy: a promise the product does not
 * keep is an FTC Act § 5 deceptive practice on its own terms, independent of
 * COPPA, the CCPA, or the GDPR, and it is the single easiest thing for a
 * regulator or a plaintiff to prove, because the evidence is the source tree.
 *
 * So every claim below is one this repo makes to users in writing, paired with
 * the code that has to remain true for it. If a change breaks the pairing, the
 * build stops and whoever made the change decides — deliberately — whether to
 * fix the code or amend the document.
 *
 * Run: `node scripts/verifyLegal.mjs` (wired into `npm run build`).
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');
const has = (rel) => existsSync(path.join(ROOT, rel));

const failures = [];
const warnings = [];

/** @param {boolean} condition @param {string} claim @param {string} why */
function check(condition, claim, why) {
  if (!condition) failures.push({ claim, why });
}

// ── 0. The documents exist and are wired up ─────────────────────────────────

const REQUIRED_FILES = [
  'src/legal/legalConfig.js',
  'src/legal/terms.js',
  'src/legal/privacy.js',
  'src/components/legal/LegalPage.jsx',
  'src/lib/ageGate.js',
  'api/auth/account.js',
];
for (const file of REQUIRED_FILES) {
  check(has(file), `${file} exists`, 'A legal document, its renderer, or a right it promises has been deleted.');
}
if (failures.length) { report(); process.exit(1); }

const config = read('src/legal/legalConfig.js');
const terms = read('src/legal/terms.js');
const privacy = read('src/legal/privacy.js');
const routes = read('src/lib/routes.js');
const authGate = read('src/components/AuthGate.jsx');
const indexHtml = read('index.html');
const app = read('src/App.jsx');
const ageGate = read('src/lib/ageGate.js');
const birthdateStep = read('src/components/onboarding/steps/BirthdateStep.jsx');
const onboarding = read('src/components/onboarding/Onboarding.jsx');
const signup = read('src/components/auth/SignupView.jsx');
const authUi = read('src/components/auth/ui.jsx');
// The route table these two checks used to grep — the indexable set in
// src/lib/seo.js and the ROUTES array in scripts/generateSitemap.mjs — is now
// one shared table (src/lib/seoRoutes.js) feeding both, plus the prerenderer.
// So the checks below read the table for intent and the *generated artefacts*
// for the result, which is strictly stronger than grepping a generator: it
// catches a sitemap that was never regenerated as well as a route that was
// deleted.
const seoRoutes = read('src/lib/seoRoutes.js');
const sitemapXml = read('public/sitemap.xml');
const robotsTxt = read('public/robots.txt');
const authApi = read('src/lib/authApi.js');

// ── 1. The documents are reachable ──────────────────────────────────────────

check(
  routes.includes("LEGAL_VIEWS") && routes.includes("'/legal/terms'") && routes.includes("'/legal/privacy'"),
  'The legal documents have public URLs',
  'LEGAL_VIEWS is missing from src/lib/routes.js, so /legal/terms and /legal/privacy no longer resolve.',
);
check(
  authGate.includes('parseLegalPath') && authGate.includes('LegalPage'),
  'AuthGate renders the legal documents',
  'AuthGate no longer intercepts /legal/*, so the documents are unreachable — a policy behind a login is not notice.',
);
check(
  seoRoutes.includes("path: '/legal/terms'") && seoRoutes.includes("path: '/legal/privacy'"),
  'The legal documents are indexable',
  'src/lib/seoRoutes.js no longer lists them as public routes, so they would be served noindex — ad networks, app stores and regulators check for a publicly crawlable policy.',
);
check(
  sitemapXml.includes('/legal/privacy') && sitemapXml.includes('/legal/terms') &&
    robotsTxt.includes('Allow: /legal/terms') && robotsTxt.includes('Allow: /legal/privacy'),
  'The legal documents are in the sitemap and robots.txt',
  'public/sitemap.xml or public/robots.txt no longer lists them — run `npm run sitemap`.',
);
check(
  // The documents are served as static HTML with their full text in the body
  // (scripts/prerenderSeo.mjs renders them from src/legal/*.js). This is the
  // difference between a policy a bot can read and a policy a bot is told about:
  // ad networks and app-store reviewers routinely fetch the URL without running
  // JavaScript, and until this existed they got an empty <div id="root">.
  read('scripts/prerenderSeo.mjs').includes('TERMS_DOC') &&
    read('scripts/prerenderSeo.mjs').includes('PRIVACY_DOC'),
  'The legal documents are readable without JavaScript',
  'scripts/prerenderSeo.mjs no longer renders the document bodies into the served HTML, so a crawler that does not execute JavaScript sees an empty page where the policy should be.',
);

// ── 2. Consent is actually collected ────────────────────────────────────────

check(
  authUi.includes('export function ConsentNotice'),
  'A consent notice component exists',
  'ConsentNotice has been removed from src/components/auth/ui.jsx.',
);
check(
  signup.includes('<ConsentNotice />'),
  'Signup shows the consent notice',
  "SignupView no longer renders ConsentNotice. Terms nobody was shown at signup are terms that may not bind — the clickwrap fails for want of notice.",
);
check(
  (signup.match(/<ConsentNotice \/>/g) || []).length >= 2,
  'Both signup paths show the consent notice',
  'Only one of the email and Google signup paths shows the notice. Both create accounts, so both need it.',
);

// ── 3. The age gate the Privacy Policy describes ────────────────────────────

const minAgeMatch = config.match(/minAge:\s*(\d+)/);
const minAge = minAgeMatch ? Number(minAgeMatch[1]) : null;
check(minAge === 13, 'The stated minimum age is 13', 'LEGAL.minAge is not 13, which is the age COPPA turns on. Changing it changes which law applies.');

check(
  ageGate.includes('export function isUnderMinAge') && ageGate.includes('recordAgeBlocked'),
  'The age gate is implemented',
  'src/lib/ageGate.js no longer exports the gate the Privacy Policy § 3 describes.',
);
check(
  onboarding.includes('isUnderMinAge') && onboarding.includes('recordAgeBlocked'),
  'Onboarding enforces the age gate',
  'Onboarding.jsx no longer blocks under-13 users. The Privacy Policy claims it does.',
);
check(
  onboarding.includes('AgeBlockedStep'),
  'A blocked under-13 user gets the terminal screen',
  'Onboarding no longer renders AgeBlockedStep, so a failed age check would fall through into the app.',
);
// The wheel must be able to express a disqualifying age. This is the exact bug
// the gate replaced: a control whose youngest option is 12 cannot screen out an
// 11-year-old, it can only relabel them.
check(
  birthdateStep.includes('MIN_WHEEL_AGE') && !/THIS_YEAR\s*-\s*12\s*-\s*i/.test(birthdateStep),
  'The birthdate wheel can express an under-13 age',
  "BirthdateStep's year range starts at or above the minimum age, so no user can enter a disqualifying birthdate and the gate can never fire.",
);
const wheelMin = ageGate.match(/MIN_WHEEL_AGE\s*=\s*(\d+)/);
check(
  wheelMin && Number(wheelMin[1]) < minAge,
  'The wheel reaches below the minimum age',
  'MIN_WHEEL_AGE is not below LEGAL.minAge, so the disqualifying answer is unselectable.',
);

// The gate's arithmetic, executed rather than grepped. Every check above this
// point asks "does the code still mention the gate"; these ask "does the gate
// still give the right answer", which is the question that actually matters.
// The edge cases are the ones that decide whether COPPA applies to a real
// person: a birthday that has not happened yet this year, and 29 February.
{
  const gate = await import(pathToFileURL(path.join(ROOT, 'src/lib/ageGate.js')).href);
  const NOW = new Date(2026, 7, 8); // 8 August 2026, fixed so the test never drifts
  const cases = [
    [{ year: 2013, month: 8,  day: 8  }, 13,   false, 'turns 13 today — allowed'],
    [{ year: 2013, month: 8,  day: 9  }, 12,   true,  'turns 13 tomorrow — blocked'],
    [{ year: 2013, month: 12, day: 1  }, 12,   true,  'birthday later this year — blocked'],
    [{ year: 2012, month: 2,  day: 29 }, 14,   false, 'leap-day birthday — allowed'],
    [{ year: 2014, month: 1,  day: 1  }, 12,   true,  'twelve — blocked'],
    [{ year: 2000, month: 5,  day: 5  }, 26,   false, 'adult — allowed'],
    [{ year: 2015, month: 2,  day: 31 }, null, true,  'impossible date — blocked, not waved through'],
  ];
  for (const [dob, wantAge, wantBlocked, label] of cases) {
    const age = gate.ageFromBirthdate(dob, NOW);
    const blocked = gate.isUnderMinAge(dob, NOW);
    check(
      age === wantAge && blocked === wantBlocked,
      `Age gate: ${label}`,
      `ageFromBirthdate returned ${age} (expected ${wantAge}) and isUnderMinAge returned ${blocked} (expected ${wantBlocked}) for ${dob.year}-${dob.month}-${dob.day}.`,
    );
  }
}

// ── 4. Advertising: what index.html does vs what the policy says ────────────

const adsenseLoaded = indexHtml.includes('adsbygoogle.js');
if (adsenseLoaded) {
  check(
    indexHtml.includes('tagForChildDirectedTreatment'),
    'Ad requests are tagged child-directed',
    'index.html loads AdSense without the child-directed tag. The Privacy Policy § 8 and the Terms § 10 both promise non-personalised ads, and Connecticut bans targeted advertising to under-18s outright.',
  );
  check(
    indexHtml.includes('requestNonPersonalizedAds'),
    'Ads are requested non-personalised',
    'requestNonPersonalizedAds is not set, contradicting the Privacy Policy § 8.',
  );
  // Ordering is load-bearing: an ad request built before the flag is set is not
  // retroactively de-personalised.
  check(
    indexHtml.indexOf('tagForChildDirectedTreatment') < indexHtml.indexOf('adsbygoogle.js'),
    'The child-directed tag is set before AdSense loads',
    'The tag appears after the AdSense script tag. Ads requested before the flag is set are personalised regardless of the flag.',
  );
  check(
    privacy.includes('child-directed'),
    'The Privacy Policy discloses advertising',
    'Ads are served but the Privacy Policy no longer describes them.',
  );
}

// A "no ads" claim anywhere in the UI while AdSense is loaded is a false
// statement to consumers. This is the check that would have caught the landing
// page claiming "0 ads · No ads, no tracking" on an ad-supported site.
//
// Comments are stripped before scanning. A comment explaining *why* a "no ads"
// claim was removed is not itself a claim, and a checker that cannot tell the
// difference trains people to phrase their reasoning around it — or to delete
// the reasoning, which is worse.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // /* block */ and JSX {/* block */}
    .replace(/^\s*\/\/.*$/gm, ' ');       // whole-line //
}

if (adsenseLoaded) {
  for (const [file, source] of [
    ['src/components/LandingPage.jsx', read('src/components/LandingPage.jsx')],
    ['src/components/auth/AuthShell.jsx', read('src/components/auth/AuthShell.jsx')],
    ['src/App.jsx', app],
  ]) {
    // Matches "no ads" / "0 ads" / "ad-free" as a user-facing claim, while
    // allowing "no personalised ads", which is both true and the point.
    const claim = stripComments(source).match(/(?<!personalised )\b(no ads|0 ads|ad-free|zero ads)\b/i);
    check(
      !claim,
      `${file} makes no "no ads" claim`,
      `${file} claims "${claim?.[0]}" while AdSense is loaded in index.html. That is a false advertising claim on a service used by minors.`,
    );
  }
}

// ── 5. Embedded video: tracking-free by default ─────────────────────────────

check(
  !app.includes('https://www.youtube.com/embed/'),
  'YouTube embeds use privacy-enhanced mode',
  'An embed points at youtube.com, which sets tracking cookies on load whether or not the student presses play. The Privacy Policy § 9 says we use youtube-nocookie.com.',
);

// ── 6. The rights the Privacy Policy promises actually exist ────────────────

check(
  authApi.includes('exportMyData') && authApi.includes('deleteMyAccount'),
  'Data export and account deletion are implemented',
  'src/lib/authApi.js no longer exposes export/delete. Privacy Policy § 12 promises both.',
);
check(
  app.includes('exportMyData') && app.includes('deleteMyAccount'),
  'Export and deletion are reachable from Settings',
  "The Settings screen no longer offers them. The policy says users can do this 'in the app's settings'.",
);
const account = read('api/auth/account.js');
check(
  account.includes("req.method === 'DELETE'") && account.includes("req.method === 'GET'"),
  'The account endpoint serves export and deletion',
  'api/auth/account.js no longer handles both methods.',
);

// ── 7. Sub-processor disclosure matches what the app actually loads ─────────
//
// Not exhaustive — it cannot be, since a vendor can be added anywhere. It
// catches the specific ones whose presence is detectable from a fixed file, so
// that swapping in a new AI or email provider without touching the policy is
// caught rather than assumed.

const VENDOR_FINGERPRINTS = [
  { name: 'Groq', present: () => has('api/groq.js') },
  { name: 'Supabase', present: () => has('api/_lib/supabaseAdmin.js') },
  { name: 'Brevo', present: () => read('api/_lib/mailer.js').includes('brevo') },
  { name: 'Google AdSense', present: () => adsenseLoaded },
  { name: 'Desmos', present: () => has('src/lib/sat/desmos.js') },
  { name: 'Google Fonts', present: () => indexHtml.includes('fonts.googleapis.com') },
  { name: 'YouTube', present: () => app.includes('youtube-nocookie.com') || app.includes('youtube.com/embed') },
];
for (const vendor of VENDOR_FINGERPRINTS) {
  if (!vendor.present()) continue;
  // Entries may carry a qualifier — "YouTube (privacy-enhanced mode)",
  // "Google (Sign-in with Google)" — so match the leading name, not the whole
  // string, or the disclosure has to be worded to satisfy the checker rather
  // than to inform the reader.
  const disclosed = new RegExp(`name: '${vendor.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^']*'`).test(config);
  check(
    disclosed,
    `${vendor.name} is disclosed as a sub-processor`,
    `The app uses ${vendor.name} but SUBPROCESSORS in src/legal/legalConfig.js does not list it. GDPR Art. 13(1)(e) and the CPRA's notice-at-collection both require the recipient to be disclosed.`,
  );
}

// Analytics and error-tracking SDKs are specifically disclaimed in the policy
// ("We do not use analytics, tracking pixels, session recording"). If one is
// ever added, that sentence has to go before the SDK ships.
const TRACKERS = ['posthog', 'mixpanel', 'segment.com', 'google-analytics', 'googletagmanager', 'plausible', 'fullstory', 'hotjar', '@sentry/'];
const srcAndHtml = `${app}\n${indexHtml}\n${read('src/main.jsx')}`;
for (const tracker of TRACKERS) {
  check(
    !srcAndHtml.toLowerCase().includes(tracker),
    `No undisclosed analytics (${tracker})`,
    `${tracker} appears in the app, but the Privacy Policy § 4 states that we do not use analytics or tracking. Disclose it or remove it.`,
  );
}

// ── 8. The notice address is real ───────────────────────────────────────────
//
// A warning during development and a hard failure for a production build.
// COPPA's notice provision (16 C.F.R. § 312.4(d)) and GDPR Art. 13(1)(a) both
// require the operator's physical address; shipping the placeholder makes the
// notice defective on its face, so it must not reach production — but it must
// not block local development either.
const addressUnset = config.includes('ADDRESS PENDING — SET BEFORE PRODUCTION')
  && /postalAddress:\s*ADDRESS_PLACEHOLDER/.test(config);
const isProductionBuild = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
if (addressUnset) {
  const message = {
    claim: 'A real postal address is published',
    why: "LEGAL.postalAddress in src/legal/legalConfig.js is still the placeholder. COPPA (16 C.F.R. § 312.4(d)) and GDPR Art. 13(1)(a) require the operator's physical address in the notice.",
  };
  if (isProductionBuild) failures.push(message);
  else warnings.push(message);
}

// ── 9. Internal consistency of the documents themselves ─────────────────────

for (const [label, doc] of [['Terms', terms], ['Privacy Policy', privacy]]) {
  const ids = [...doc.matchAll(/^\s{4}id: '([a-z0-9-]+)',$/gm)].map((m) => m[1]);
  check(ids.length > 0, `${label} has sections`, `No section ids parsed out of the ${label} — the document may be malformed.`);
  check(
    new Set(ids).size === ids.length,
    `${label} section ids are unique`,
    `Duplicate section id in the ${label}: anchors would be ambiguous and deep links would land on the wrong clause.`,
  );
}
check(
  /effectiveDate:\s*'(\d{4})-\d{2}-\d{2}'/.test(config),
  'The effective date is a real date',
  'LEGAL.effectiveDate is missing or malformed.',
);

// ── Report ──────────────────────────────────────────────────────────────────

function report() {
  if (warnings.length) {
    console.warn('\n⚠  verify:legal — warnings\n');
    for (const w of warnings) console.warn(`   • ${w.claim}\n     ${w.why}\n`);
  }
  if (failures.length) {
    console.error('\n✖ verify:legal — the code and the legal documents disagree\n');
    for (const f of failures) console.error(`   • ${f.claim}\n     ${f.why}\n`);
    console.error(
      '  Each item above is something MedSchoolPrep tells users in writing that the code no\n' +
      '  longer does. Fix the code, or amend the document and bump its version in\n' +
      '  src/legal/legalConfig.js — but do not leave them disagreeing.\n',
    );
  }
}

report();
if (failures.length) process.exit(1);
console.log(`✓ verify:legal — ${warnings.length ? `passed with ${warnings.length} warning(s)` : 'legal documents and code agree'}`);
