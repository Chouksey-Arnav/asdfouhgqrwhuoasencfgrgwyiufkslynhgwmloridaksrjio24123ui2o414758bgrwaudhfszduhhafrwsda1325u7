// Verify every video in src/data/sat/videos.js against YouTube's public oEmbed
// endpoint, and check the library's structural invariants.
//
//   node scripts/auditSatVideos.mjs           full audit (hits the network)
//   node scripts/auditSatVideos.mjs --offline structure only, no network
//
// This is a GATE. The library is served to a student at the exact moment they
// have been told a skill is weak, so a dead link there is worse than no
// recommendation at all. Structural failures and dead ids both exit non-zero.
//
// If the sandbox cannot reach youtube.com at all, the script says so and exits
// non-zero rather than reporting a pass — an unreachable network is not
// evidence that the ids are good. Use --offline when you deliberately only want
// the structural checks.
import {
  SAT_VIDEOS, VIDEO_SCOPES, videosForSkill,
} from '../src/data/sat/videos.js';
import {
  SAT_SKILLS, SAT_DOMAINS, SKILL_IDS, DOMAIN_IDS, SECTION_IDS, skillMeta,
} from '../src/data/sat/taxonomy.js';

const OFFLINE = process.argv.includes('--offline');

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ── 1. Structure ────────────────────────────────────────────────────────────
const seen = new Set();
for (const v of SAT_VIDEOS) {
  const at = `[${v.yt || '(no id)'}]`;
  if (!v.yt) { err(`${at} missing yt id`); continue; }
  if (!/^[A-Za-z0-9_-]{11}$/.test(v.yt)) err(`${at} is not a well-formed 11-character YouTube id`);
  if (seen.has(v.yt)) err(`${at} appears twice — one video, one entry`);
  seen.add(v.yt);

  if (!v.title || v.title.length < 5) err(`${at} missing title`);
  if (!v.channel) err(`${at} missing channel — students choose whose explanation to trust by name`);
  if (!VIDEO_SCOPES.includes(v.scope)) err(`${at} invalid scope "${v.scope}"`);

  if (v.scope === 'skill' && !v.skills?.length) err(`${at} scope "skill" needs a skills array`);
  if (v.scope === 'domain' && !v.domains?.length) err(`${at} scope "domain" needs a domains array`);
  if (v.scope === 'section' && !v.sections?.length) err(`${at} scope "section" needs a sections array`);

  for (const s of v.skills || []) if (!SKILL_IDS.includes(s)) err(`${at} unknown skill "${s}"`);
  for (const d of v.domains || []) if (!DOMAIN_IDS.includes(d)) err(`${at} unknown domain "${d}"`);
  for (const s of v.sections || []) if (!SECTION_IDS.includes(s)) err(`${at} unknown section "${s}"`);

  // A skill-scoped video must not name skills from two different sections —
  // that is almost always a copy-paste slip, and it puts a maths video in front
  // of a student who is weak at grammar.
  const sections = new Set((v.skills || []).map(s => skillMeta(s).section).filter(Boolean));
  if (sections.size > 1) err(`${at} tags skills across sections (${[...sections].join(', ')})`);
}

// ── 2. Coverage ─────────────────────────────────────────────────────────────
// Every leaf skill must resolve to at least one video. videosForSkill widens
// from skill to domain to section, so this passing does NOT mean every skill
// has a dedicated video — the direct count below is what says that.
const noDirect = [];
for (const id of SKILL_IDS) {
  const resolved = videosForSkill(id, { limit: 1 });
  if (!resolved.length) err(`skill "${id}" (${SAT_SKILLS[id].label}) resolves to NO video at all`);
  const direct = SAT_VIDEOS.filter(v => v.skills?.includes(id)).length;
  if (direct === 0) noDirect.push(`${SAT_SKILLS[id].label}`);
}
if (noDirect.length) {
  warn(`${noDirect.length} skill(s) fall back to a domain/section video with nothing dedicated: ${noDirect.join(', ')}`);
}

// Shorts are a supplement. A skill whose only direct video is a 40-second clip
// has not actually been taught.
for (const id of SKILL_IDS) {
  const direct = SAT_VIDEOS.filter(v => v.skills?.includes(id));
  if (direct.length && direct.every(v => v.kind === 'short')) {
    warn(`skill "${id}" (${SAT_SKILLS[id].label}) has only short-form videos — add a full lesson`);
  }
}

// ── 3. Live check ───────────────────────────────────────────────────────────
let dead = [];
let mismatched = [];
let ok = 0;
let unreachable = 0;

if (!OFFLINE) {
  const ids = [...seen];
  process.stdout.write(`Checking ${ids.length} video ids against YouTube oEmbed`);
  for (const yt of ids) {
    const entry = SAT_VIDEOS.find(v => v.yt === yt);
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${yt}`)}&format=json`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) { dead.push({ yt, status: res.status, title: entry.title }); process.stdout.write('x'); continue; }
      const data = await res.json();
      ok++;
      process.stdout.write('.');
      // Channel is the strong signal that an id still points at what we think:
      // titles get edited, channel names very rarely do.
      const recorded = (entry.channel || '').trim().toLowerCase();
      const actual = (data.author_name || '').trim().toLowerCase();
      if (recorded && actual && recorded !== actual) {
        mismatched.push({ yt, recorded: entry.channel, actual: data.author_name, title: entry.title });
      }
    } catch {
      unreachable++;
      process.stdout.write('?');
    }
  }
  process.stdout.write('\n');
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\nSAT video library — ${SAT_VIDEOS.length} videos across ${SKILL_IDS.length} skills\n`);

const byScope = VIDEO_SCOPES.map(s => `${s}:${SAT_VIDEOS.filter(v => v.scope === s).length}`).join('  ');
console.log(`  Scope mix            ${byScope}`);

const channels = [...new Set(SAT_VIDEOS.map(v => v.channel))];
console.log(`  Distinct channels    ${channels.length}`);

for (const sec of SECTION_IDS) {
  for (const d of DOMAIN_IDS.filter(x => SAT_DOMAINS[x].section === sec)) {
    const n = SAT_VIDEOS.filter(v => v.domains?.includes(d) || v.skills?.some(s => SAT_SKILLS[s]?.domain === d)).length;
    console.log(`    ${String(n).padStart(3)}  ${SAT_DOMAINS[d].label}`);
  }
}

if (!OFFLINE) {
  console.log(`\n  Live       ${ok}/${seen.size}`);
  if (unreachable) console.log(`  Unreachable ${unreachable} (network, not necessarily dead)`);
  if (dead.length) {
    console.log(`\n  ${dead.length} DEAD id(s):`);
    dead.forEach(d => console.log(`    x ${d.yt}  HTTP ${d.status}  "${d.title}"`));
    err(`${dead.length} video id(s) no longer resolve on YouTube`);
  }
  if (mismatched.length) {
    console.log(`\n  ${mismatched.length} channel mismatch(es) — the id may now point somewhere else:`);
    mismatched.forEach(m => console.log(`    ! ${m.yt}  recorded "${m.recorded}"  actual "${m.actual}"`));
    mismatched.forEach(m => warn(`${m.yt} recorded as "${m.recorded}" but YouTube says "${m.actual}"`));
  }
  // Every request failing means we learned nothing, and reporting a pass on
  // that basis is exactly the failure mode this note exists to prevent.
  if (unreachable === seen.size && seen.size > 0) {
    console.log('\n  Could not reach youtube.com for ANY id — this is not a pass.');
    console.log('  Verify manually (WebSearch / oEmbed) before shipping changes, or re-run with --offline');
    console.log('  if you only meant to check structure.\n');
    process.exit(1);
  }
}

if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s):`);
  warnings.forEach(w => console.log(`    ! ${w}`));
}
if (errors.length) {
  console.log(`\n  ${errors.length} ERROR(s):`);
  errors.forEach(e => console.log(`    x ${e}`));
  console.log('\nVideo audit FAILED.\n');
  process.exit(1);
}
console.log('\nVideo audit passed.\n');
