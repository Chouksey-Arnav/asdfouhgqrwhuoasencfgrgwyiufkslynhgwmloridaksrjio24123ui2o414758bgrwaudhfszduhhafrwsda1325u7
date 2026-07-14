// Non-destructive audit for Learning Pathway lesson completeness — every lesson across every
// pathway in PATHS must carry a 3-item `objectives` array, and any LESSON_CONTENT entry for it
// must have exactly 5 article sections and 4 key takeaways. Also cross-checks every `quizIds`
// reference against ALL_QUIZZES so a typo'd id can't ship silently.
//
// Usage: node scripts/auditLessonsCompleteness.mjs [--pathway=nursing,pharmacy,...]
import { PATHS } from '../src/data/constants.js';
import { LESSON_CONTENT } from '../src/data/lessonContent/index.js';
// Import the quiz banks directly (with explicit .js extensions) rather than via
// quizzes/index.js, whose internal imports omit extensions — fine for Vite's
// bundler resolution, but plain `node` (used to run this script) requires them.
import { BIO_BIOCHEM_QUIZZES } from '../src/data/quizzes/bioBiochem.js';
import { CHEM_PHYS_QUIZZES } from '../src/data/quizzes/chemPhys.js';
import { PSYCH_SOC_QUIZZES } from '../src/data/quizzes/psychSoc.js';
import { LESSON_QUIZZES } from '../src/data/quizzes/lessonQuizzes.js';
const ALL_QUIZZES = [...BIO_BIOCHEM_QUIZZES, ...CHEM_PHYS_QUIZZES, ...PSYCH_SOC_QUIZZES, ...LESSON_QUIZZES];

const pathwayArg = process.argv.find(a => a.startsWith('--pathway='));
const onlyPathways = pathwayArg ? new Set(pathwayArg.slice(10).split(',')) : null;

const quizIdSet = new Set(ALL_QUIZZES.map(q => q.id));

const errors = [];
let lessonCount = 0, withObjectives = 0, withContent = 0, withVideo = 0, omittedVideo = 0;

for (const [pathwayKey, pathway] of Object.entries(PATHS)) {
  if (onlyPathways && !onlyPathways.has(pathwayKey)) continue;
  for (const unit of pathway.units) {
    for (const lesson of unit.lessons) {
      lessonCount++;
      const loc = `${pathwayKey} / ${unit.id} / ${lesson.id} ("${lesson.title}")`;

      if (!Array.isArray(lesson.objectives) || lesson.objectives.length !== 3) {
        errors.push(`${loc}: objectives missing or wrong count (expected 3, got ${lesson.objectives?.length ?? 0})`);
      } else {
        withObjectives++;
      }

      if (!Array.isArray(lesson.quizIds) || lesson.quizIds.length === 0) {
        errors.push(`${loc}: no quizIds assigned`);
      } else {
        for (const qid of lesson.quizIds) {
          if (!quizIdSet.has(qid)) errors.push(`${loc}: quizIds references "${qid}" which does not exist in ALL_QUIZZES`);
        }
      }

      const content = LESSON_CONTENT[lesson.id];
      if (!content) {
        errors.push(`${loc}: no LESSON_CONTENT entry (missing article)`);
        continue;
      }
      withContent++;

      if (!Array.isArray(content.article?.sections) || content.article.sections.length !== 5) {
        errors.push(`${loc}: article.sections wrong count (expected 5, got ${content.article?.sections?.length ?? 0})`);
      }
      if (!Array.isArray(content.article?.keyTakeaways) || content.article.keyTakeaways.length !== 4) {
        errors.push(`${loc}: article.keyTakeaways wrong count (expected 4, got ${content.article?.keyTakeaways?.length ?? 0})`);
      }
      for (const [i, sec] of (content.article?.sections || []).entries()) {
        if (!sec.heading || !sec.body) errors.push(`${loc}: section ${i} missing heading or body`);
      }

      if (content.video) {
        if (!content.video.ytId || !content.video.title) errors.push(`${loc}: video present but missing ytId or title`);
        else withVideo++;
      } else {
        omittedVideo++;
      }
    }
  }
}

console.log(`Scanned ${lessonCount} lessons across ${onlyPathways ? onlyPathways.size : Object.keys(PATHS).length} pathway(s).`);
console.log(`  objectives present: ${withObjectives}/${lessonCount}`);
console.log(`  LESSON_CONTENT present: ${withContent}/${lessonCount}`);
console.log(`  with video: ${withVideo}, intentionally omitted: ${omittedVideo}`);
console.log('');

if (errors.length) {
  console.log(`FAILED — ${errors.length} issue(s):`);
  errors.forEach(e => console.log(`  ✗ ${e}`));
  process.exit(1);
} else {
  console.log('PASSED — no completeness issues found.');
}
