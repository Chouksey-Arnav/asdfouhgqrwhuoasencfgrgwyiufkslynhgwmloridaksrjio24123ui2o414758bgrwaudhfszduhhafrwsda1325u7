#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Does the sending domain actually have the DNS Brevo needs?
 *
 * ── Why this is a separate script from checkMailerConfig.mjs ────────────────
 * checkMailerConfig sends a real email and reports what the relay said. That
 * catches a wrong key and an unverified sender, and it costs one send against
 * the account's quota. It cannot catch the failure underneath both of those:
 * DNS that was never finished.
 *
 * SPF, DKIM and DMARC are the three records that decide whether a large receiver
 * — Gmail, Outlook, Yahoo — believes Brevo is allowed to send as you. Get them
 * wrong and there is no error anywhere in this codebase, no bounce, and nothing
 * in the app's logs: Brevo accepts the message, reports it delivered, and the
 * recipient's provider quietly files it under spam or drops it. From inside the
 * product that is indistinguishable from working, which is exactly the failure
 * api/_lib/mailer.js's comments keep warning about.
 *
 * So this checks the records directly, over DNS-over-HTTPS so it needs no `dig`
 * and no resolver configuration — it runs inside the release container, which is
 * the machine whose answer actually matters.
 *
 * It sends no email and costs no quota. Run it as often as you like.
 *
 * Usage:
 *   npm run check:mailer-dns              # uses BREVO_SMTP_FROM / SMTP_FROM
 *   npm run check:mailer-dns -- a@b.com   # or check a specific address
 *
 * Exit codes: 0 all good, 1 something is missing, 2 could not resolve at all.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const RESOLVERS = [
  (n, t) => `https://dns.google/resolve?name=${n}&type=${t}`,
  (n, t) => `https://cloudflare-dns.com/dns-query?name=${n}&type=${t}`,
];

/**
 * One lookup, tried against each resolver in turn.
 *
 * A public resolver being unreachable is a fact about this network, not about
 * the domain, and reporting it as "SPF is missing" would be the worst possible
 * lie for this script to tell — it would send someone to edit DNS that is
 * already correct. So a total resolver failure throws and the caller exits 2.
 */
async function resolve(name, type) {
  let lastErr = null;
  for (const build of RESOLVERS) {
    try {
      const res = await fetch(build(name, type), {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const body = await res.json();
      // NXDOMAIN (3) is a real answer: the record does not exist.
      return (body.Answer || []).map((a) => String(a.data || ''));
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`could not resolve ${name} ${type}: ${lastErr?.message || 'unknown'}`);
}

const from = process.argv[2] || process.env.BREVO_SMTP_FROM || process.env.SMTP_FROM;
if (!from) {
  console.error('No sender to check. Set BREVO_SMTP_FROM (or SMTP_FROM), or pass an address:');
  console.error('  npm run check:mailer-dns -- no-reply@example.com');
  process.exit(2);
}
const domain = from.split('@')[1]?.trim().toLowerCase();
if (!domain) {
  console.error(`"${from}" is not an email address, so it has no domain to check.`);
  process.exit(2);
}

console.log(`\nSender   ${from}`);
console.log(`Domain   ${domain}\n`);

let problems = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m, fix) => { problems += 1; console.log(`  ✗ ${m}`); console.log(`      fix — ${fix}`); };
const note = (m) => console.log(`  · ${m}`);

let txt;
try {
  txt = await resolve(domain, 'TXT');
} catch (err) {
  console.error(`Could not reach a DNS resolver — ${err.message}`);
  console.error('This says nothing about your records; try again with working outbound HTTPS.');
  process.exit(2);
}

// ── SPF ──────────────────────────────────────────────────────────────────────
// One record, on the apex, and only one: two v=spf1 records is a permerror at
// the receiver and scores worse than having none at all.
console.log('SPF');
const spf = txt.filter((r) => r.replace(/"/g, '').trim().toLowerCase().startsWith('v=spf1'));
if (!spf.length) {
  bad('no v=spf1 record on the domain',
    `add a TXT record on ${domain} with value:  v=spf1 include:spf.brevo.com mx ~all`);
} else if (spf.length > 1) {
  bad(`${spf.length} SPF records (a domain may have exactly one — receivers treat more as an error)`,
    'merge them into a single v=spf1 TXT record that includes every sender you use');
} else {
  const value = spf[0].replace(/"/g, '');
  if (/include:(spf\.brevo\.com|spf\.sendinblue\.com)/i.test(value)) ok(`includes Brevo — ${value}`);
  else bad(`SPF exists but does not authorise Brevo — ${value}`,
    'add  include:spf.brevo.com  to the existing record (do not add a second record)');
}

// ── Brevo domain ownership ───────────────────────────────────────────────────
console.log('\nBrevo domain code');
const codes = txt.filter((r) => /brevo-code:/i.test(r));
if (codes.length) ok(`${codes.length} brevo-code record(s) present`);
else bad('no brevo-code TXT record', `authenticate ${domain} in Brevo → Senders, Domains & Dedicated IPs → Domains`);

// ── DKIM ─────────────────────────────────────────────────────────────────────
// Brevo publishes two selectors and signs with them; one present and one missing
// is a half-finished setup that works until it rotates to the other.
console.log('\nDKIM');
for (const selector of ['brevo1', 'brevo2']) {
  const host = `${selector}._domainkey.${domain}`;
  let recs = [];
  try { recs = await resolve(host, 'CNAME'); } catch { /* reported as missing below */ }
  if (recs.some((r) => /dkim\.brevo\.com/i.test(r))) ok(`${selector} → ${recs[0]}`);
  else bad(`${selector}._domainkey is missing or does not point at Brevo`,
    `add the ${selector} CNAME shown in Brevo → Domains for ${domain}`);
}

// ── DMARC ────────────────────────────────────────────────────────────────────
console.log('\nDMARC');
let dmarc = [];
try { dmarc = await resolve(`_dmarc.${domain}`, 'TXT'); } catch { /* reported below */ }
const policy = dmarc.map((r) => r.replace(/"/g, '')).find((r) => /^v=DMARC1/i.test(r.trim()));
if (!policy) {
  bad('no DMARC record',
    `add a TXT record on _dmarc.${domain} with value:  v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`);
} else {
  ok(policy);
  const p = /[;\s]p=(\w+)/i.exec(policy)?.[1]?.toLowerCase();
  if (p === 'none') {
    note('p=none is monitor-only: nothing is rejected on your behalf. That is the right place to');
    note('start. Move to p=quarantine once SPF and DKIM have both been passing for a few weeks.');
  }
}

// ── The one thing DNS cannot tell us ────────────────────────────────────────
console.log('\nSender verification (not checkable from DNS)');
note(`Brevo must also list ${from} as a verified sender, or have ${domain} fully authenticated.`);
note('Check Brevo → Senders, Domains & Dedicated IPs → Senders and compare the address character');
note('by character. no-reply@ and noreply@ are different addresses and this is the most common');
note('reason a correctly-keyed deployment still cannot send.');

if (problems) {
  console.log(`\n${problems} problem(s) found. Records take up to a few hours to propagate after you add them.\n`);
  process.exit(1);
}
console.log('\nAll DNS records for this sender look right.');
console.log('If mail still is not arriving, run `npm run check:mailer -- you@example.com` to send one');
console.log('real message and see what the relay says.\n');
