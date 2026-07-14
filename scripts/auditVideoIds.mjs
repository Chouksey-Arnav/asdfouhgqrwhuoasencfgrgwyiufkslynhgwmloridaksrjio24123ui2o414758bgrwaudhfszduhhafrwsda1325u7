// Non-destructive audit that every ytId referenced in LESSON_CONTENT actually resolves on
// YouTube, via the public oEmbed endpoint (no API key required). Flags dead/typo'd ids and,
// where the title we recorded materially disagrees with YouTube's own title, flags that too
// so a mismatched reuse doesn't ship silently.
//
// Usage: node scripts/auditVideoIds.mjs [--ids=ytId1,ytId2,...]
//
// If this sandbox can't reach youtube.com (every request errors/times out), the script says so
// explicitly and exits non-zero — that is NOT a pass. Per the plan, video verification then has
// to happen manually via WebSearch/WebFetch, logged as a comment next to the ytId in the lesson
// content file, before that batch can be committed.
import { LESSON_CONTENT } from '../src/data/lessonContent/index.js';

const idsArg = process.argv.find(a => a.startsWith('--ids='));
const onlyIds = idsArg ? new Set(idsArg.slice(6).split(',')) : null;

// De-dupe: the same ytId is legitimately reused across many lessons (PROPOSED-REUSE in the
// plan) — no need to hit the network twice for one video.
const byId = new Map();
for (const [lessonId, content] of Object.entries(LESSON_CONTENT)) {
  if (!content.video?.ytId) continue;
  if (onlyIds && !onlyIds.has(content.video.ytId)) continue;
  if (!byId.has(content.video.ytId)) byId.set(content.video.ytId, { ...content.video, lessons: [] });
  byId.get(content.video.ytId).lessons.push(lessonId);
}

const ids = [...byId.keys()];
console.log(`Checking ${ids.length} unique video id(s) referenced across ${Object.values(LESSON_CONTENT).filter(c => c.video).length} lessons...`);

let networkUnreachable = 0;
const dead = [];
const titleMismatches = [];
let ok = 0;

for (const ytId of ids) {
  const entry = byId.get(ytId);
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}&format=json`;
  try {
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      dead.push({ ytId, status: res.status, lessons: entry.lessons });
      continue;
    }
    const data = await res.json();
    ok++;
    const recorded = (entry.title || '').toLowerCase();
    const actual = (data.title || '').toLowerCase();
    // Loose match — just catch a wildly wrong video, not minor punctuation differences.
    const overlap = recorded && actual && (actual.includes(recorded.split(':')[0].trim()) || recorded.includes(actual.split(':')[0].trim()));
    if (recorded && actual && !overlap) {
      titleMismatches.push({ ytId, recorded: entry.title, actual: data.title, lessons: entry.lessons });
    }
  } catch (err) {
    networkUnreachable++;
    dead.push({ ytId, status: `network error: ${err.message}`, lessons: entry.lessons });
  }
}

console.log(`  resolved OK: ${ok}/${ids.length}`);
if (dead.length) {
  console.log(`\n${dead.length} id(s) failed to resolve:`);
  dead.forEach(d => console.log(`  ✗ ${d.ytId} (${d.status}) — used by: ${d.lessons.join(', ')}`));
}
if (titleMismatches.length) {
  console.log(`\n${titleMismatches.length} id(s) resolved but title looks mismatched — check manually:`);
  titleMismatches.forEach(m => console.log(`  ⚠ ${m.ytId} — recorded "${m.recorded}" vs YouTube "${m.actual}" — used by: ${m.lessons.join(', ')}`));
}

if (networkUnreachable === ids.length && ids.length > 0) {
  console.log(`\nNETWORK UNREACHABLE — could not reach youtube.com for any of ${ids.length} id(s). This is NOT a pass.`);
  console.log('Per the plan (Phase 3, step 1): verify each video manually via WebSearch/WebFetch and log the result as a comment next to its ytId before committing this batch.');
  process.exit(2);
}
if (dead.length || titleMismatches.length) {
  process.exit(1);
}
console.log('\nPASSED — all video ids resolved cleanly.');
