// Local-only study-event log — Phase 1 of docs/PROFILING_PLAN.md. Records lesson/quiz/unit
// engagement to the Dexie `studyEvents` table (src/lib/db.js, v8) purely on-device; nothing here
// is ever transmitted. This is the seed schema Phase 2 of the profiling plan would later sync,
// and it's what powers the Verified Progress view's "studied vs. verified" distinction today.
import * as DB from './db';

export function logEvent(type, refId) {
  return DB.logStudyEvent(type, refId).catch(() => {}); // best-effort — never block the UI on this
}

export function getEvents(type) {
  return DB.getStudyEvents(type);
}
