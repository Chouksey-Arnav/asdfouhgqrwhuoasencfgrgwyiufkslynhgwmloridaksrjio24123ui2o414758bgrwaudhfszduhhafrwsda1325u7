// The one place that knows what a *public* URL on this site is and what it says.
//
// ── Why this file exists ────────────────────────────────────────────────────
//
// This app is a single-page app served by one HTML file (see server.js). Until
// now that one file carried one <title>, one <meta description>, and one
// hard-coded `<link rel="canonical" href="https://medschoolprep.cloud/">` — and
// every URL on the site was served that exact byte stream. src/lib/seo.js then
// fixed the canonical up client-side on mount.
//
// That fix only ever reached crawlers that execute JavaScript. Most do not,
// including Ahrefs Site Audit by default, and including the first pass of
// Googlebot's two-pass indexing. What they saw instead, for /login, /parents,
// /legal/privacy and every other URL in the sitemap, was:
//
//   • a canonical pointing at "/" — i.e. every sitemap URL declaring itself a
//     copy of the landing page ("non-canonical page in sitemap", the single
//     largest bucket of errors in the August 2026 audit),
//   • an empty <div id="root"> — no <h1>, no words, no outgoing links, which is
//     what made every page an orphan with no content,
//   • one description, 249 characters long, on all seven of them.
//
// So the routes moved out of three files that had to agree by hand (the sitemap
// generator, the robots.txt it emits, and the INDEXABLE set in seo.js) into
// this one, and gained the thing they were missing: the actual per-page copy.
// scripts/prerenderSeo.mjs turns each entry below into a real static HTML file
// with its own title, description, self-referencing canonical, <h1>, body text,
// internal links and JSON-LD; the React app boots over the top of it.
//
// ── The rule for adding a route ─────────────────────────────────────────────
//
// A route belongs here if, and only if, a signed-out visitor with no session
// reaches a *distinct* page at it. Everything else in the app (/home, /sat/…,
// /portfolio/…, /family/…) renders the landing page to a visitor with no
// session, so listing it would hand a search engine a pile of duplicates of the
// one URL we want ranked. Those are Disallow-ed in robots.txt and marked
// noindex client-side instead — see DISALLOW below and applySeoMeta in seo.js.
//
// Add an entry and it flows, on the next build, into: sitemap.xml, robots.txt,
// the prerendered HTML for that URL, the internal-link nav on every other page,
// and the indexable set the client-side canonical logic reads.

/** Production origin. No trailing slash. */
export const ORIGIN = 'https://medschoolprep.cloud';

export const SITE_NAME = 'MedSchoolPrep';

/**
 * Longest a <meta name="description"> may be before search engines truncate it
 * mid-sentence in the result snippet. Enforced by scripts/verifySeo.mjs, which
 * fails the build rather than letting a truncated snippet ship.
 */
export const MAX_DESCRIPTION = 155;

/** Longest a <title> may be before it is cut off in results. Also build-enforced. */
export const MAX_TITLE = 62;

/**
 * The frequently-asked questions, shown on the landing page and emitted as
 * FAQPage JSON-LD on the same URL.
 *
 * These two must be the same list, which is why it lives here rather than in
 * LandingPage.jsx where it started: Google's structured-data policy requires
 * FAQ markup to match content actually visible on the page, and marking up
 * questions a visitor cannot see is a manual-action risk, not a ranking trick.
 * LandingPage imports this array; so does the prerenderer.
 */
export const FAQS = [
  {
    q: 'What is MedSchoolPrep?',
    a: 'A free platform for high schoolers exploring a career in medicine. It combines a pathway diagnostic, verified lessons, spaced-repetition flashcards, an AI study coach, and a full college-application portfolio — everything from "which path fits me" to "what\'s due this week."',
  },
  {
    q: 'How does the pathway diagnostic work?',
    a: "A short, scored quiz ranks how well you fit all 10 health-career pathways — Physician, Nursing, PA, Pharmacy, Dentistry, and more — instead of assuming you've already decided. You get a top match plus a full breakdown, and you can always explore any of the other nine.",
  },
  {
    q: 'Is it really free?',
    a: 'Yes — no paywall, no premium tier, nothing locked behind a subscription. Every pathway, lesson, flashcard deck, portfolio tool, and AI coach response is free to use, for good. Ads are what pay for it, and because our users are students, they are never personalised: we do not build advertising profiles and nothing you put into the app is used to target them.',
  },
  {
    q: 'What do you do with my data?',
    a: "We don't sell it and we don't share it for advertising. Your essays, scores, activities, and coach conversations are used to run the features you're using and nothing else — they are never used to train AI models. You can export or delete everything at any time. The Privacy Policy spells all of this out, including every third party that touches your data.",
  },
  {
    q: 'What does "verified" mean for a lesson?',
    a: "Every lesson ends with a real quiz. You need to score 70% or higher for it to count as verified — watching the article or video alone doesn't mark a lesson complete. It's the same bar used for pathway certificates.",
  },
  {
    q: 'Do I need to already know I want to be a doctor?',
    a: 'No — that\'s exactly what the "Exploring" pathway and the diagnostic are for. Plenty of students start here undecided and get matched to nursing, PA, pharmacy, or something they hadn\'t considered.',
  },
  {
    q: 'Does it only cover becoming a physician?',
    a: 'No. Alongside Physician, there are full lesson tracks, quizzes, and application guidance for Nursing, Physician Assistant, Pharmacy, Dentistry, Biomedical & Clinical Research, Physical & Occupational Therapy, Public Health, and Health Administration.',
  },
];

/**
 * @typedef {Object} PublicRoute
 * @property {string} path        Rooted path. '/' for the landing page.
 * @property {string} title       <title>, ≤ MAX_TITLE chars.
 * @property {string} description <meta name="description">, ≤ MAX_DESCRIPTION chars.
 * @property {string} navLabel    How every other page links to this one.
 * @property {string} changefreq  Sitemap crawl hint — how often it really moves.
 * @property {string} priority    Relative to this site only, not a global rank.
 * @property {string[]} sources   Files whose newest commit date becomes <lastmod>.
 * @property {{h1:string, lead:string, sections?:Array, faq?:boolean}} [content]
 *   Static copy for the prerendered shell. Omitted for the legal documents,
 *   whose bodies are rendered from src/legal/*.js instead.
 */

/** @type {PublicRoute[]} */
export const PUBLIC_ROUTES = [
  {
    path: '/',
    title: 'MedSchoolPrep — Your Path Into Medicine',
    description:
      'Free health-career prep for high schoolers: a 10-pathway diagnostic, verified lessons, flashcards, and a full college application portfolio.',
    navLabel: 'Home',
    changefreq: 'weekly',
    priority: '1.0',
    sources: ['index.html', 'src/components/LandingPage.jsx', 'src/components/AuthGate.jsx'],
    content: {
      h1: 'Find your path into medicine. Then actually walk it.',
      lead:
        'MedSchoolPrep is a free platform for high schoolers heading toward a health career. It starts with a diagnostic that scores you against ten pathways rather than assuming you have already chosen one, and then gives you the lessons, the quizzes, the AI study coach and the entire college application in one place.',
      faq: true,
      sections: [
        {
          h2: 'Ten health-career pathways, scored to you',
          paras: [
            'Most prep starts by assuming you already know the answer. This one does not. A short scored diagnostic ranks how well you fit all ten pathways and gives you a top match plus the full breakdown, so an undecided student gets a place to start instead of a decision to make. You can explore any of the other nine at any time, and you can run up to three in parallel if you are genuinely torn between them.',
          ],
          list: [
            'Physician (MD) — direct patient care.',
            'Nursing (RN) — hands-on, and a faster route in.',
            'Physician Assistant (PA) — broad practice, more flexibility.',
            'Pharmacy (Rx) — medication at the centre of care.',
            'Dentistry (DDS) — your own practice, sooner.',
            'Biomedical & Clinical Research (PhD) — push the science forward.',
            'Physical & Occupational Therapy (PT/OT) — rebuild movement.',
            'Public Health (MPH) — prevention at scale.',
            'Health Administration (MHA) — run the systems care depends on.',
            'Exploring — no pathway required to begin.',
          ],
        },
        {
          h2: 'Verified lessons, flashcards, and an AI study coach',
          paras: [
            'Every pathway carries a full lesson track — more than ninety lessons across articles, videos and guided reading. A lesson is not complete because you scrolled to the bottom of it: each one ends with a real quiz, and you need 70% or better for it to count as verified. That is the same bar used for pathway certificates, which is what keeps a certificate worth showing.',
            'What you get wrong turns into flashcards automatically, scheduled by a spaced-repetition engine so the cards you keep missing come back sooner and the ones you know stop wasting your evenings. Medabrain, the built-in AI study coach, sits alongside the lesson you are actually on — it can re-explain a concept, quiz you on it, or work through where an answer went wrong.',
          ],
        },
        {
          h2: 'The whole application, in one portfolio',
          paras: [
            'The application is not one task, it is thirty of them spread across two years, and losing track of one of them is how strong students end up with weak applications. The portfolio keeps all of it in a single place.',
          ],
          list: [
            'College list, tiered against your real stats rather than a wish list.',
            'Essays, from first draft to final, per school, with critique on request.',
            'Milestones and deadlines, every one of them counted down.',
            'Activities and résumé — research, clinical hours, skills and certifications, logged as you do them rather than remembered in August.',
            'Financial aid and scholarships, with the deadlines that come with them.',
            'Recommenders: who is writing, what they have, and when it is due.',
            'Interview preparation on real MMI and CASPer-style scenarios.',
            'An admissions calculator that shows where you stand, live.',
          ],
        },
        {
          h2: 'Free, and free of personalised advertising',
          paras: [
            'There is no paywall, no premium tier and nothing locked behind a subscription. Advertising is what pays for the service — and because the people using it are high-school students, those ads are never personalised. The site is tagged for child-directed treatment before a single ad request is built, which disables interest-based advertising and remarketing for every visitor regardless of age.',
            'Your essays, scores, activities and coach conversations are used to run the features you are using, and for nothing else. They are never sold, never shared for advertising, and never used to train AI models. You can export or delete all of it at any time.',
          ],
        },
        {
          h2: 'For parents',
          paras: [
            'A parent can be connected to a student account, but only after the student accepts, and only to effort and results — study days, lessons passed, quiz averages and test scores. Never notes, essays or coach conversations. Either side can end the connection in one tap, effective immediately.',
          ],
        },
      ],
    },
  },

  // The two account screens are addressable in their own right (see AUTH_VIEWS in
  // src/lib/routes.js) and render real, distinct UI to a signed-out visitor, so
  // they are legitimately crawlable — just far less important than the landing page.
  {
    path: '/signup',
    title: 'Create Your Free MedSchoolPrep Account',
    description:
      'Sign up free in under a minute. Take the health-career pathway diagnostic, start verified lessons, and build your application portfolio. No paywall.',
    navLabel: 'Sign up',
    changefreq: 'monthly',
    priority: '0.5',
    sources: ['src/components/auth/SignupView.jsx', 'src/components/auth/AuthShell.jsx'],
    content: {
      h1: 'Create your free MedSchoolPrep account',
      lead:
        'Signing up takes under a minute and costs nothing, now or later. There is no paywall, no premium tier and no trial that expires — every pathway, lesson, flashcard deck, portfolio tool and AI coach response is free to use.',
      sections: [
        {
          h2: 'What happens when you join',
          list: [
            'You take a short scored diagnostic that ranks how well you fit all ten health-career pathways, and get a top match plus the full breakdown.',
            'Your matched pathway opens with its full lesson track, its quizzes, and a flashcard deck that builds itself from what you get wrong.',
            'Your application portfolio starts collecting: college list, essays, activities, deadlines, recommenders and scores.',
            'Medabrain, the AI study coach, is available alongside whatever lesson you are on.',
          ],
        },
        {
          h2: 'Who can sign up',
          paras: [
            'You must be at least 13 years old to create an account. If you are between 13 and 17, a parent or legal guardian needs to have read and agreed to the Terms of Service with you — that is a requirement of the agreement itself, not a formality. Sign-up asks for a date of birth and enforces it.',
            'Parents have their own separate sign-up, with their own login and their own account. A parent never signs in as their student.',
          ],
        },
        {
          h2: 'What the diagnostic actually asks',
          paras: [
            'It is not a personality quiz and it does not ask you to pick a career. It asks about the parts of a working day you would actually want — how much direct patient contact, how much time with data, how long you are prepared to spend in training, how you feel about high-stakes decisions, whether you would rather run a clinic or a study — and scores those answers against what each of the ten pathways is really like.',
            'You get a ranked list rather than a single verdict, because the second and third results are usually the useful ones. A student who scores highly for Physician and almost as highly for Physician Assistant has learned something more actionable than a student who is simply told "doctor".',
          ],
        },
        {
          h2: 'What the first week looks like',
          paras: [
            'Your matched pathway opens with a lesson track ordered from foundations upward, and a weekly goal you set yourself rather than one we set for you. Finish a lesson, pass its quiz at 70% or better, and it counts — and whatever you missed becomes flashcards scheduled for the day you are most likely to have forgotten it.',
            'Alongside that, the portfolio starts collecting quietly: activities as you do them, deadlines as they are announced, test scores as you sit them. The point of logging a clinical hour in October is that you are not reconstructing it from memory the following August.',
          ],
        },
        {
          h2: 'What we do with what you put in',
          paras: [
            'Your essays, scores, activities and coach conversations are used to run the features you are using and nothing else. They are never sold, never shared for advertising, and never used to train AI models. Ads on the site are never personalised — the site is tagged for child-directed treatment before the first ad request is built, which turns off interest-based advertising and remarketing for every visitor regardless of age.',
            'You can export everything you have put in, or delete the account and all of it, at any time and without asking us. The Privacy Policy lists every third party that touches your data, by name.',
          ],
        },
        {
          h2: 'Connecting a parent — only if you want to',
          paras: [
            'You can invite a parent or guardian to see how you are doing, and nothing reaches them until you send that invitation. What they would see is effort and results: study days, streaks, lessons passed, quiz averages and practice-test scores. What they would never see is your notes, your essay drafts or your conversations with the study coach. You can end the connection in one tap, and it takes effect immediately.',
          ],
        },
      ],
    },
  },
  {
    path: '/login',
    title: 'Log In — MedSchoolPrep',
    description:
      'Log in to MedSchoolPrep to pick up your pathway lessons, flashcards, quizzes and application portfolio exactly where you left off.',
    navLabel: 'Log in',
    changefreq: 'monthly',
    priority: '0.3',
    sources: ['src/components/auth/LoginView.jsx', 'src/components/auth/AuthShell.jsx'],
    content: {
      h1: 'Log in to MedSchoolPrep',
      lead:
        'Sign in to pick up exactly where you left off — the lesson you were on, the flashcards that are due today, your quiz history and your application portfolio.',
      sections: [
        {
          h2: 'What is waiting behind the login',
          list: [
            'Your pathway lesson track, and how far through it you are.',
            'The flashcards scheduled for today by the spaced-repetition engine.',
            'Your quiz history, with every attempt plotted.',
            'Your portfolio: college list, essays, activities, deadlines and recommenders.',
            'Your streak, quests and progress against the weekly goals you set.',
          ],
        },
        {
          h2: 'Trouble getting in',
          paras: [
            'If the password is not working, you can reset it from the login screen — we email a link to the address on the account, and following it lets you set a new one. If the account was created with Google, use the Google button rather than a password: there is no password on that account to reset, which is the most common reason a reset email seems to change nothing.',
            'If the email address itself is the problem — a school address that has since been closed, or a typo made at sign-up — contact us rather than creating a second account. A second account starts empty, and the work is attached to the first one.',
          ],
        },
        {
          h2: 'Parents sign in somewhere else',
          paras: [
            'A parent account is a separate account with its own email address and its own password, and it is reached through the parent sign-in rather than this page. A parent never signs in as their student, which is deliberate: the dashboard a parent sees is a different application showing a deliberately narrower set of things, and the only way to guarantee that boundary is for the two accounts to be genuinely separate.',
            'If you are a parent who has not made an account yet, start at the parent pages linked above.',
          ],
        },
        {
          h2: 'Staying signed in, and signing out',
          paras: [
            'A session persists on the device you signed in from, so a phone you use every evening will not ask again. On a shared or school computer, sign out when you are finished — the app keeps a local copy of your work on the device for offline use, and signing out is what clears it.',
            'Your progress is not stored only on the device. Lessons, quiz results, scores and portfolio work sync to your account, so signing in on a new phone or a library computer brings all of it with you.',
          ],
        },
        {
          h2: 'No account yet?',
          paras: [
            'Creating one takes under a minute and costs nothing, permanently — there is no paywall, no premium tier and no trial that expires. You start with a short diagnostic that scores you against ten health-career pathways, and you can change or add pathways later, so it is not a decision you are locked into.',
            'You need to be at least 13 to sign up, and if you are under 18 a parent or guardian needs to have read and agreed to the Terms of Service with you.',
          ],
        },
      ],
    },
  },

  // The parent page. Public in the same sense the legal documents are (AuthGate
  // renders it ahead of the signed-in/signed-out branch), and the one page on
  // this site whose whole job is to be found by someone who is not the student.
  // A parent searching "medschoolprep parent dashboard" had, until this page,
  // nothing to land on. Priority above the account screens for that reason.
  {
    path: '/parents',
    title: 'For Parents — MedSchoolPrep',
    description:
      'See whether your student is showing up and whether it is working — effort, lessons and scores. Never their notes, essays or coach conversations.',
    navLabel: 'For parents',
    changefreq: 'monthly',
    priority: '0.7',
    sources: ['src/components/parent/ParentsLanding.jsx', 'src/components/parent/ParentApp.jsx'],
    content: {
      h1: 'See how it is going, without reading over their shoulder',
      lead:
        'The parent dashboard answers two questions — is my student showing up, and is it working — and deliberately answers nothing else. It shows effort and results. It never shows their notes, their essays, or their conversations with the AI coach.',
      sections: [
        {
          h2: 'What the dashboard shows you',
          list: [
            'Whether they are actually showing up: study days across the last eight weeks, this week against the last four, and the current streak — the shape of the gaps, not just a number.',
            'Whether it is working: lessons passed, quiz averages and how recent ones compare with earlier ones, plus every practice-test score and the change since the last.',
            'What that means, in words: a plain-language read on the week — including when the honest version is "not much happened", which we state as a fact and never as a verdict about your child.',
            'A way to say something: send a note, ask them to sit a quiz on a topic, or ask how something went. It lands in their app, not their inbox, and they can reply in a tap.',
          ],
        },
        {
          h2: 'What it never shows you',
          paras: [
            'Their lesson notes, their essay drafts, and every message they have exchanged with the study coach stay private to them. That is not a setting you can turn off and it is not a plan you can upgrade to — it is how the dashboard is built. A student who believes a parent is reading their draft essays stops writing honest ones, and the parts of this product that do the most good are the parts that depend on that honesty.',
          ],
        },
        {
          h2: 'How you get connected',
          paras: [
            'Two routes, depending on who starts. If your student invited you, open the link or enter the eight-character code they sent, read exactly what would be shared, and confirm — if you came from the emailed link, that is the whole sign-up.',
            'If you are starting it, create a parent account with your own email — never your student\'s login — and send a request to the address they sign in with. It names you and states exactly what would and would not be shared. Nothing about them reaches you until they accept from their own inbox, and either of you can end the connection afterwards in one tap, effective immediately.',
          ],
        },
        {
          h2: 'Ending it is as easy as starting it',
          paras: [
            'Either side can end the connection at any time, from their own account, in one tap, effective immediately. There is no notice period and the other person does not have to agree. A student who withdraws access is doing a normal thing, and the dashboard does not report it to you as a problem.',
          ],
        },
        {
          h2: 'What it costs',
          paras: [
            'Nothing. MedSchoolPrep is free for students and free for parents, with no paywall, no premium tier and no parent subscription. It is funded by advertising, and because the audience is high-school students those ads are never personalised — the site is tagged for child-directed treatment before the first ad request is built, which disables interest-based advertising and remarketing for every visitor regardless of age.',
            'Nothing your student puts into the app is used to target advertising, and nothing they write is used to train AI models.',
          ],
        },
      ],
    },
  },
  {
    path: '/parents/signup',
    title: 'Create a Parent Account — MedSchoolPrep',
    description:
      "Create a free parent account, request access to your student's progress, and see it only after they accept. Your own login, never theirs.",
    navLabel: 'Parent sign-up',
    changefreq: 'monthly',
    priority: '0.4',
    sources: ['src/components/auth/SignupView.jsx', 'src/components/parent/ParentSetup.jsx'],
    content: {
      h1: 'Create a parent account',
      lead:
        'A parent account is your own account, with your own email address and your own password. You never sign in as your student, and creating one gives you access to nothing until your student accepts your request.',
      sections: [
        {
          h2: 'The three steps',
          list: [
            'Create the account. It takes about a minute and asks who you are, how you are related to the student, and a number we can reach you on.',
            'Send a request to your student, addressed to the email they use to sign in. It names you and states exactly what would be shared and what would not.',
            'They accept — or they do not. Nothing about them reaches you until they say yes from their own inbox.',
          ],
        },
        {
          h2: 'If your student invited you first',
          paras: [
            'You do not need this page. Open the link they sent, or enter the eight-character code, and the invitation itself completes the sign-up — the link was sent to you, so there is nothing further to prove. With a code read out over the phone, we email you six digits first.',
          ],
        },
        {
          h2: 'What you will and will not see',
          paras: [
            'Effort and results: study days across the last eight weeks, this week measured against the last four, the current streak, lessons passed, quiz averages, every practice-test score and the change since the last one. Enough to answer "is this working" without having to ask it at dinner.',
            'Never their notes, their essay drafts, or their conversations with the study coach. That is not a setting and not a plan tier — it is how the dashboard is built. A student who believes a parent is reading their draft essays writes worse essays, and the parts of this product that help most are the parts that depend on them being honest with it.',
          ],
        },
        {
          h2: 'The weekly read',
          paras: [
            'Rather than leaving you to interpret a wall of numbers, the dashboard writes a plain-language summary of the week — what moved, what did not, and what that probably means. It says "not much happened this week" when not much happened, stated as a fact about the week and never as a verdict about your child.',
            'You can also send a note, ask them to sit a quiz on a particular topic, or ask how something went. It arrives inside their app rather than their inbox, and they can reply in a tap.',
          ],
        },
        {
          h2: 'Ending the connection',
          paras: [
            'Either of you can end it at any time, from your own account, in one tap. It takes effect immediately — there is no notice period and no confirmation from the other side required. A student withdrawing access is a normal thing for a student to do and is not reported to you as a problem.',
          ],
        },
        {
          h2: 'What it costs',
          paras: [
            'Nothing. There is no parent tier, no subscription and no upsell. The service is funded by advertising, and because the audience is high-school students those ads are never personalised.',
          ],
        },
      ],
    },
  },

  // The legal documents are public by design (LEGAL_VIEWS in src/lib/routes.js —
  // AuthGate renders them ahead of its signed-in/signed-out branch). They are
  // listed because "where is your privacy policy" needs an answer that is a
  // plain, crawlable URL: ad networks, app stores, school districts and
  // regulators all check, and several of them check with a bot that does not run
  // JavaScript. Their prerendered bodies are rendered from src/legal/*.js — the
  // same structured content the React page renders — so a bot and a browser read
  // the identical document, which for a legal notice is the whole point.
  //
  // `lastmod` tracks the content modules rather than the renderer, so editing a
  // clause moves the date and restyling the page does not.
  {
    path: '/legal/terms',
    title: 'Terms of Service — MedSchoolPrep',
    description:
      'The terms governing your use of MedSchoolPrep: eligibility, acceptable use, your content, advertising, disclaimers, and how disputes are resolved.',
    navLabel: 'Terms',
    changefreq: 'yearly',
    priority: '0.3',
    sources: ['src/legal/terms.js', 'src/legal/legalConfig.js'],
    legalSlug: 'terms',
  },
  {
    path: '/legal/privacy',
    title: 'Privacy Policy — MedSchoolPrep',
    description:
      'What MedSchoolPrep collects, why, who else sees it, and what you can do about it — including our COPPA commitments and how to delete everything.',
    navLabel: 'Privacy',
    changefreq: 'yearly',
    priority: '0.4',
    sources: ['src/legal/privacy.js', 'src/legal/legalConfig.js'],
    legalSlug: 'privacy',
  },
];

/**
 * Path prefixes that exist, work, and must not be indexed.
 *
 * Two groups, and both are here for the same reason: a crawler that follows one
 * gets the landing page back, because there is no session and AuthGate falls
 * through to it. Indexing them would create duplicates competing with the one
 * URL we want ranked.
 *
 *   1. The signed-in surfaces — /home and every app tab, plus /family, which is
 *      the parent application. Kept as prefixes rather than a full route list so
 *      that a new sub-tab is covered the day it ships.
 *   2. The transient auth surfaces — a password-reset form, an OAuth callback
 *      and a single-use invitation link are not pages anyone should arrive at
 *      from a search result, and /parents/login is the parent sign-in rather
 *      than anything a parent would search for.
 *
 * /parents itself is deliberately absent: it is a real public page, listed
 * above, and none of these prefixes is a prefix of it. /parents/login is more
 * specific than the `Allow: /parents` line the generator emits, and longest-match
 * wins in the robots.txt spec, so the two rules do not fight.
 */
export const DISALLOW = [
  '/api/',
  '/home',
  '/sat',
  '/prep',
  '/portfolio',
  '/roadmap',
  '/plans',
  '/progress',
  '/settings',
  '/family',
  '/forgot-password',
  '/auth/',
  '/parent-invite',
  '/parents/login',
];

/**
 * AI crawlers to explicitly welcome onto the public surface, over and above
 * the blanket `User-agent: *` block. None of these need special treatment —
 * they already match `Allow: /$` plus the per-route `Allow` lines under `*`
 * — but an explicit block removes any ambiguity for an operator (or model)
 * skimming robots.txt for "is this bot allowed", which is exactly the kind
 * of audit the search-engine-optimization-seo playbook calls for. Same
 * Allow/Disallow shape as the `*` block, generated by buildRobots() below.
 *
 *   • GPTBot          — OpenAI's crawler, feeds ChatGPT/AI Overviews training.
 *   • ChatGPT-User     — OpenAI's live-browsing agent, fetches pages a user asks about.
 *   • ClaudeBot        — Anthropic's crawler.
 *   • Claude-User       — Anthropic's live-browsing agent (Claude fetching a page on request).
 *   • PerplexityBot    — Perplexity's crawler, feeds its answer engine directly.
 *   • Google-Extended  — governs use in Gemini/AI Overviews, separate from Googlebot.
 */
export const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
];

/** Every public path, as a Set — the indexable surface. */
export const INDEXABLE_PATHS = new Set(PUBLIC_ROUTES.map((r) => r.path));

/** The route entry for `path`, or undefined when the path is not public. */
export function routeFor(path) {
  return PUBLIC_ROUTES.find((r) => r.path === path);
}

/** Absolute URL for a rooted path. */
export function absoluteUrl(path) {
  return path === '/' ? `${ORIGIN}/` : `${ORIGIN}${path}`;
}
