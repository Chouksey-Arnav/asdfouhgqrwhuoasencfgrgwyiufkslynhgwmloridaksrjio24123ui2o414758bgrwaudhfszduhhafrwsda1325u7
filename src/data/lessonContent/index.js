// ─────────────────────────────────────────────────────────────────────────────
// In-house lesson content — barrel. One file per pathway (see PATHS in
// ../constants.js), merged here into a single LESSON_CONTENT object keyed by
// lesson id, exactly as the pre-split src/data/lessonContent.js used to export
// it. Add a new pathway's import/spread here as its batch is built — see the
// Learning Pathway completion plan for the build order.
// ─────────────────────────────────────────────────────────────────────────────
import { EXPLORING_CONTENT } from './exploring.js';
import { PHYSICIAN_CONTENT } from './physician.js';
import { NURSING_CONTENT } from './nursing.js';
import { PHYSICIAN_ASSISTANT_CONTENT } from './physicianAssistant.js';
import { PHARMACY_CONTENT } from './pharmacy.js';

export const LESSON_CONTENT = {
  ...EXPLORING_CONTENT,
  ...PHYSICIAN_CONTENT,
  ...NURSING_CONTENT,
  ...PHYSICIAN_ASSISTANT_CONTENT,
  ...PHARMACY_CONTENT,
};
