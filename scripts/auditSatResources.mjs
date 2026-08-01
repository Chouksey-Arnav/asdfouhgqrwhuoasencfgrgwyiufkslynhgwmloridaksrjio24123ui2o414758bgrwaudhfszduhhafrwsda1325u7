// Verify every URL in src/data/sat/resources.js still resolves.
//
//   node scripts/auditSatResources.mjs
//
// A dead link here is a credibility problem, not a cosmetic one: these are the
// links the app tells a student are the MOST important thing they can do, so a
// 404 on "official practice test" invites them to distrust the whole tab.
//
// Some College Board and Khan Academy paths sit behind bot protection and
// answer a plain HTTP client with 403 or 503 while being perfectly live in a
// browser. Those are reported separately from genuine 404s and do not fail the
// run — see the same treatment of WAF responses in the note at the top of
// src/data/elib.js. A 404 or 410 is a real failure and exits non-zero.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SAT_RESOURCES, allResourceUrls, RESOURCE_KINDS } from '../src/data/sat/resources.js';

const execFileAsync = promisify(execFile);

/**
 * HEAD-equivalent status check, preferring curl.
 *
 * Node's fetch and curl are not interchangeable against these hosts. College
 * Board's edge answers Node's undici client with a blanket 503 on every path —
 * including ones that are unambiguously live — while answering curl with a
 * real status. Measured side by side on the same URL through the same proxy:
 * curl 200, fetch 503. An audit that cannot distinguish 200 from 404 is not an
 * audit, so curl is the primary path and fetch is the fallback for environments
 * without it.
 */
async function statusOf(url) {
  try {
    const { stdout } = await execFileAsync('curl', [
      '-s', '-o', '/dev/null', '-w', '%{http_code}',
      '-L', '--max-time', '20', url,
    ], { timeout: 25000 });
    const code = Number(stdout.trim());
    if (Number.isFinite(code) && code > 0) return { status: code, via: 'curl' };
  } catch {
    // fall through to fetch
  }
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20000),
  });
  return { status: res.status, via: 'fetch' };
}

const urls = allResourceUrls();
const errors = [];
const blocked = [];
let ok = 0;

// ── Structure ───────────────────────────────────────────────────────────────
const seenIds = new Set();
for (const r of SAT_RESOURCES) {
  if (seenIds.has(r.id)) errors.push(`duplicate resource id "${r.id}"`);
  seenIds.add(r.id);
  if (!RESOURCE_KINDS[r.kind]) errors.push(`[${r.id}] unknown kind "${r.kind}"`);
  if (!r.title || !r.url || !r.org) errors.push(`[${r.id}] missing title, url or org`);
  // `why` is what turns a link list into advice. A resource without one is a
  // bookmark, and the student already has a browser.
  if (!r.why) errors.push(`[${r.id}] missing "why" — every resource must say what it is FOR`);
  if (r.url && !/^https:\/\//.test(r.url)) errors.push(`[${r.id}] url is not https`);
}

console.log(`Checking ${urls.length} URL(s) across ${SAT_RESOURCES.length} resources\n`);

for (const { id, url, label } of urls) {
  try {
    const { status } = await statusOf(url);
    if (status === 404 || status === 410) {
      errors.push(`[${id}] HTTP ${status} — ${url}`);
      console.log(`  DEAD  ${status}  ${label}`);
    } else if (status < 200 || status >= 400) {
      blocked.push(`[${id}] HTTP ${status} — ${url}`);
      console.log(`  ?     ${status}  ${label}`);
    } else {
      ok++;
      console.log(`  ok    ${status}  ${label}`);
    }
  } catch (e) {
    blocked.push(`[${id}] ${e.message} — ${url}`);
    console.log(`  ?     network  ${label}`);
  }
}

console.log(`\n  Live ${ok}/${urls.length}`);
if (blocked.length) {
  console.log(`\n  ${blocked.length} unverified (bot protection or network — confirm manually):`);
  blocked.forEach(b => console.log(`    ? ${b}`));
}
if (errors.length) {
  console.log(`\n  ${errors.length} ERROR(s):`);
  errors.forEach(e => console.log(`    x ${e}`));
  console.log('\nResource audit FAILED.\n');
  process.exit(1);
}
console.log('\nResource audit passed.\n');
