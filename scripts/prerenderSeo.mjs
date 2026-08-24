#!/usr/bin/env node
/**
 * Turns the one built index.html into a real, self-describing HTML page per
 * public URL. Runs after `vite build` (see the `build` script in package.json).
 *
 * ── The problem this solves ─────────────────────────────────────────────────
 *
 * This is a client-rendered SPA behind a catch-all (server.js sends
 * dist/index.html for every extension-less path). That meant every URL on the
 * site — /login, /parents, /legal/privacy, all of them — was served the exact
 * same bytes, and those bytes said:
 *
 *     <link rel="canonical" href="https://medschoolprep.cloud/">
 *     <title>MedSchoolPrep — Your Path Into Medicine</title>
 *     <meta name="description" content="…249 characters…">
 *     <div id="root"></div>
 *
 * src/lib/seo.js corrected the canonical after mount, which helps exactly one
 * class of visitor: a crawler that executes JavaScript. Everything else — most
 * third-party crawlers, link previewers, and Googlebot's first indexing pass —
 * saw six sitemap URLs each declaring itself a duplicate of the landing page,
 * with no <h1>, no words and no links on any of them. That is precisely what the
 * August 2026 Ahrefs audit reported: 8 errors over 7 URLs, health score 46.
 *
 * ── What it does ────────────────────────────────────────────────────────────
 *
 * For each route in src/lib/seoRoutes.js it writes dist/<path>/index.html (and
 * rewrites dist/index.html itself for '/'), starting from the built shell and
 * replacing:
 *
 *   • <title> and <meta name="description">  — per page, length-capped
 *   • <link rel="canonical">                 — pointing at itself, not at '/'
 *   • og:/twitter: tags                      — so a shared link previews right
 *   • <meta name="robots">                   — index, follow
 *   • the empty <div id="seo-shell">         — with a real <h1>, real body copy,
 *                                              and a nav linking every other
 *                                              public page (which is what stops
 *                                              them being orphans)
 *   • a JSON-LD block                        — Organization/WebSite/FAQPage on
 *                                              the landing page, WebPage +
 *                                              BreadcrumbList elsewhere
 *
 * The script tags from the built shell are carried through untouched, so the
 * React app still boots on every one of these URLs and replaces the shell with
 * the real interface (src/main.jsx removes it before the first render). Nobody
 * is served content a crawler is not, and vice versa — the shell is the same
 * page, in plain HTML, for whoever arrives before the JavaScript does.
 *
 * The legal documents are the special case: their bodies are rendered from the
 * same src/legal/*.js structures the React page renders, so the crawlable copy
 * of a privacy policy is the policy, not a summary of it.
 *
 * Output also includes dist/prerender-manifest.json, which server.js reads to
 * decide which URLs have a prerendered file — deliberately a manifest rather
 * than a directory probe, because the runtime image (see Dockerfile) ships
 * dist/, api/ and server.js and has no src/ to import route facts from.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  PUBLIC_ROUTES, FAQS, ORIGIN, SITE_NAME, absoluteUrl,
} from '../src/lib/seoRoutes.js';
import { TERMS_DOC } from '../src/legal/terms.js';
import { PRIVACY_DOC } from '../src/legal/privacy.js';
import { LEGAL } from '../src/legal/legalConfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const LEGAL_DOCS = { terms: TERMS_DOC, privacy: PRIVACY_DOC };

// ── Escaping ────────────────────────────────────────────────────────────────
// Every string below originates in this repository, not from a user — but these
// files are the one place where a stray apostrophe in a piece of marketing copy
// silently breaks an attribute, so escape unconditionally rather than by
// judgment about which strings "can't" contain one.

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** JSON for a <script type="application/ld+json"> body. */
const jsonLd = (data) =>
  JSON.stringify(data, null, 2)
    // `</script>` inside a JSON string would close the tag it is sitting in.
    .replace(/<\//g, '<\\/');

// ── The static shell ────────────────────────────────────────────────────────

/**
 * The internal-link nav every prerendered page carries.
 *
 * This is the piece that fixes three separate audit findings at once, and it is
 * worth being explicit about why. A crawler builds the link graph from the HTML
 * it is served. Served an empty <div id="root">, it finds zero links, so: the
 * landing page has no incoming internal links ("canonical URL has no incoming
 * internal links"), it has no outgoing ones either, and every other URL is
 * reachable only from sitemap.xml — which is the definition of an orphan page.
 * A real nav, present in the served HTML of every page, closes the graph.
 */
function navHtml(currentPath) {
  const items = PUBLIC_ROUTES.map((r) => {
    const label = escapeHtml(r.navLabel);
    return r.path === currentPath
      ? `<li><span aria-current="page">${label}</span></li>`
      : `<li><a href="${escapeHtml(r.path)}">${label}</a></li>`;
  });
  return `<nav class="seo-shell-nav" aria-label="MedSchoolPrep">\n<ul>\n${items.join('\n')}\n</ul>\n</nav>`;
}

function breadcrumbHtml(route) {
  if (route.path === '/') return '';
  const trail = [`<a href="/">Home</a>`, `<span aria-current="page">${escapeHtml(route.navLabel)}</span>`];
  return `<nav class="seo-shell-crumbs" aria-label="Breadcrumb"><ol><li>${trail.join('</li><li>')}</li></ol></nav>`;
}

function sectionsHtml(sections = []) {
  return sections
    .map((s) => {
      const parts = [`<h2>${escapeHtml(s.h2)}</h2>`];
      for (const p of s.paras || []) parts.push(`<p>${escapeHtml(p)}</p>`);
      if (s.list?.length) {
        parts.push(`<ul>\n${s.list.map((li) => `<li>${escapeHtml(li)}</li>`).join('\n')}\n</ul>`);
      }
      return `<section>\n${parts.join('\n')}\n</section>`;
    })
    .join('\n');
}

function faqHtml() {
  const items = FAQS.map(
    ({ q, a }) => `<dt>${escapeHtml(q)}</dt>\n<dd>${escapeHtml(a)}</dd>`,
  ).join('\n');
  return `<section>\n<h2>Frequently asked questions</h2>\n<dl>\n${items}\n</dl>\n</section>`;
}

/**
 * A legal document, rendered from the same structured blocks the React page
 * renders (see the format note at the top of src/legal/terms.js).
 *
 * Deliberately renders the whole document rather than an excerpt: the reason
 * these two URLs are crawlable at all is that ad networks, app stores, school
 * districts and regulators check whether the notice is publicly readable, and
 * several of them check with something that does not run JavaScript. A summary
 * would answer that check with a document nobody agreed to.
 */
function legalHtml(doc) {
  const out = [`<p class="seo-shell-lead">${escapeHtml(doc.intro)}</p>`];
  for (const section of doc.sections) {
    out.push(`<section id="${escapeHtml(section.id)}">`);
    out.push(`<h2>${escapeHtml(section.title)}</h2>`);
    for (const block of section.body) {
      if (typeof block === 'string') out.push(`<p>${escapeHtml(block)}</p>`);
      else if (block.heading) out.push(`<h3>${escapeHtml(block.heading)}</h3>`);
      else if (block.list) {
        out.push(`<ul>\n${block.list.map((li) => `<li>${escapeHtml(li)}</li>`).join('\n')}\n</ul>`);
      } else if (block.note) out.push(`<aside class="seo-shell-note">${escapeHtml(block.note)}</aside>`);
      else if (block.emphasis) out.push(`<p><strong>${escapeHtml(block.emphasis)}</strong></p>`);
    }
    out.push('</section>');
  }
  return out.join('\n');
}

function shellHtml(route) {
  const doc = route.legalSlug ? LEGAL_DOCS[route.legalSlug] : null;
  const h1 = doc ? doc.title : route.content.h1;

  const body = doc
    ? legalHtml(doc)
    : [
        `<p class="seo-shell-lead">${escapeHtml(route.content.lead)}</p>`,
        sectionsHtml(route.content.sections),
        route.content.faq ? faqHtml() : '',
      ]
        .filter(Boolean)
        .join('\n');

  // A no-JS visitor and a crawler both land here. The CTA is a real link to a
  // real URL rather than a button, so both of them can follow it.
  const cta =
    route.path === '/signup'
      ? ''
      : `<p class="seo-shell-cta"><a href="/signup">Get started free — create your MedSchoolPrep account</a></p>`;

  return [
    `<div id="seo-shell" class="seo-shell">`,
    navHtml(route.path),
    breadcrumbHtml(route),
    `<main>`,
    `<h1>${escapeHtml(h1)}</h1>`,
    body,
    cta,
    `</main>`,
    `<footer><p>${escapeHtml(SITE_NAME)} — free health-career and college-application preparation for high schoolers. <a href="/legal/terms">Terms of Service</a> · <a href="/legal/privacy">Privacy Policy</a> · <a href="/parents">For parents</a></p></footer>`,
    `</div>`,
  ].join('\n');
}

// ── Structured data ─────────────────────────────────────────────────────────

const ORGANIZATION = {
  '@type': 'EducationalOrganization',
  '@id': `${ORIGIN}/#organization`,
  name: SITE_NAME,
  url: `${ORIGIN}/`,
  logo: `${ORIGIN}/icon-512.png`,
  description:
    'Free health-career exploration, verified lessons, SAT and ACT practice, and college-application tools for high-school students.',
  email: LEGAL.contactEmail,
  areaServed: LEGAL.postalCountry,
  audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
};

function structuredData(route) {
  const url = absoluteUrl(route.path);

  const webPage = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: route.title,
    description: route.description,
    isPartOf: { '@id': `${ORIGIN}/#website` },
    inLanguage: 'en-US',
    publisher: { '@id': `${ORIGIN}/#organization` },
  };

  const graph = [
    ORGANIZATION,
    {
      '@type': 'WebSite',
      '@id': `${ORIGIN}/#website`,
      url: `${ORIGIN}/`,
      name: SITE_NAME,
      publisher: { '@id': `${ORIGIN}/#organization` },
      inLanguage: 'en-US',
    },
    webPage,
  ];

  if (route.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: route.navLabel, item: url },
      ],
    });
    webPage.breadcrumb = { '@id': `${url}#breadcrumb` };
  }

  // FAQPage markup is only legitimate where the questions are on the page. They
  // are: shellHtml renders the same FAQS array the landing page component does.
  if (route.content?.faq) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

// ── Head rewriting ──────────────────────────────────────────────────────────

/**
 * The anchor in index.html that the static content is injected at. An empty
 * element rather than an HTML comment because comments are the first thing an
 * HTML minifier removes, and this one is load-bearing.
 */
const SHELL_PLACEHOLDER = '<div id="seo-shell"></div>';

/** Replace the first match of `re`, or insert `replacement` before </head>. */
function replaceOrInsert(html, re, replacement) {
  if (re.test(html)) return html.replace(re, replacement);
  return html.replace('</head>', `    ${replacement}\n  </head>`);
}

function renderPage(shellSource, route) {
  const url = absoluteUrl(route.path);
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  let html = shellSource;

  html = replaceOrInsert(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = replaceOrInsert(
    html,
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${description}" />`,
  );
  html = replaceOrInsert(
    html,
    /<meta\s+name="robots"[^>]*>/,
    `<meta name="robots" content="index, follow" />`,
  );
  html = replaceOrInsert(
    html,
    /<link\s+rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${url}" />`,
  );
  html = replaceOrInsert(
    html,
    /<meta\s+property="og:url"[^>]*>/,
    `<meta property="og:url" content="${url}" />`,
  );
  html = replaceOrInsert(
    html,
    /<meta\s+property="og:title"[^>]*>/,
    `<meta property="og:title" content="${title}" />`,
  );
  html = replaceOrInsert(
    html,
    /<meta\s+property="og:description"[^>]*>/,
    `<meta property="og:description" content="${description}" />`,
  );
  html = replaceOrInsert(
    html,
    /<meta\s+name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = replaceOrInsert(
    html,
    /<meta\s+name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${description}" />`,
  );

  // Tagged with an id so restoreTemplate() below can strip it again. Without
  // that, a second run of this script would append a second graph rather than
  // replace the first, and a page with two conflicting @graphs is worse than a
  // page with none.
  html = html.replace(
    '</head>',
    `    <script type="application/ld+json" id="seo-jsonld">\n${jsonLd(structuredData(route))}\n    </script>\n  </head>`,
  );

  const shell = shellHtml(route);
  if (!html.includes(SHELL_PLACEHOLDER)) {
    throw new Error(
      `prerender: dist/index.html no longer contains ${SHELL_PLACEHOLDER}. ` +
        'It is the anchor the static SEO content is injected at — restore it in index.html.',
    );
  }
  return html.replace(SHELL_PLACEHOLDER, shell);
}

// ── Write ───────────────────────────────────────────────────────────────────

const indexPath = path.join(DIST, 'index.html');

/**
 * Undo a previous run, so this script is re-runnable.
 *
 * The landing page's output *is* dist/index.html, which is also the template
 * every other page is built from. Run the script twice without an intervening
 * `vite build` and the second run reads its own output: the shell anchor is
 * gone, so it would either throw or start nesting shells inside shells. Both of
 * those have to be impossible, because `npm run prerender` on its own is the
 * obvious thing to type while iterating on the copy.
 */
function restoreTemplate(html) {
  return html
    // Every JSON-LD block on these pages is one this script wrote — index.html
    // deliberately ships none of its own, and scripts/verifySeo.mjs enforces
    // that, precisely so this can strip them all rather than having to tell
    // mine from someone else's.
    .replace(/[ \t]*<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\n?/g, '')
    // The shell contains no nested <div>, by construction (shellHtml emits nav,
    // main, footer and nothing else), so the first closing tag is its own.
    .replace(/<div id="seo-shell"[\s\S]*?<\/div>/, SHELL_PLACEHOLDER);
}

let source;
try {
  source = restoreTemplate(readFileSync(indexPath, 'utf8'));
} catch {
  throw new Error('prerender: dist/index.html is missing — run `vite build` first.');
}

const manifest = {};
for (const route of PUBLIC_ROUTES) {
  const outPath =
    route.path === '/'
      ? indexPath
      : path.join(DIST, ...route.path.split('/').filter(Boolean), 'index.html');
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, renderPage(source, route), 'utf8');
  manifest[route.path] = path.relative(DIST, outPath).split(path.sep).join('/');
}

writeFileSync(
  path.join(DIST, 'prerender-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(
  `prerender: wrote ${Object.keys(manifest).length} pages + prerender-manifest.json into dist/`,
);
