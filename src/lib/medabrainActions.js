// ─────────────────────────────────────────────────────────────────────────────
// Medabrain's editing protocol — how a chat reply turns into a real write.
//
// The model can end a reply with one fenced ```medabrain-action block containing
// JSON. That JSON is never trusted blindly and never executed on its own: it is
// parsed out of the visible message, rendered as a plain-language proposal with
// an Allow/Deny choice, and only ACTUALLY calls the API when the student taps
// Allow. The server (api/data/[resource].js) still owns the real allowlist of
// writable columns per resource and still scopes every row to the signed-in
// user — this file's RESOURCES map is a client-side mirror used only to decide
// what's worth proposing and how to describe it in the approval card.
// ─────────────────────────────────────────────────────────────────────────────
import { createItem, updateItem } from './dataApi';

// resource -> { label, fields the model is allowed to set, how to summarize one item for the
// approval card }. Mirrors WRITABLE in api/data/[resource].js, minus the columns that only make
// sense as internal state (verification_status, sort_order, foreign keys the model can't know).
export const ACTION_RESOURCES = {
  colleges: {
    label: 'College List', destination: 'portfolio/colleges',
    fields: ['name', 'category', 'status', 'ea_ed_deadline', 'rd_deadline', 'notes'],
    summarize: (it) => it.name || 'Untitled college',
  },
  deadlines: {
    label: 'Milestones', destination: 'portfolio/milestones',
    fields: ['title', 'due_date', 'kind'],
    summarize: (it) => `${it.title || 'Untitled'}${it.due_date ? ` — due ${it.due_date}` : ''}`,
  },
  essays: {
    label: 'Essays', destination: 'portfolio/essays',
    fields: ['title', 'prompt', 'word_limit', 'status'],
    summarize: (it) => it.title || 'Untitled essay',
  },
  scholarships: {
    label: 'Financial Aid', destination: 'portfolio/aid',
    fields: ['name', 'amount', 'deadline', 'status', 'notes'],
    summarize: (it) => `${it.name || 'Untitled'}${it.amount ? ` — $${Number(it.amount).toLocaleString()}` : ''}`,
  },
  activities: {
    label: 'Activities & résumé', destination: 'portfolio/resume',
    fields: ['activity_type', 'position', 'organization', 'description', 'impact', 'hours_per_week', 'weeks_per_year', 'grade_levels', 'leadership_role'],
    summarize: (it) => `${it.position || 'Untitled'}${it.organization ? ` at ${it.organization}` : ''}`,
  },
  awards: {
    label: 'Activities & résumé', destination: 'portfolio/resume',
    fields: ['title', 'grade_level', 'level', 'issuing_organization', 'category'],
    summarize: (it) => it.title || 'Untitled award',
  },
  research_experience: {
    label: 'Activities & résumé', destination: 'portfolio/resume:research',
    fields: ['title', 'mentor_name', 'institution', 'description', 'hours'],
    summarize: (it) => it.title || 'Untitled research',
  },
  clinical_hours: {
    label: 'Activities & résumé', destination: 'portfolio/resume:clinical',
    fields: ['site_name', 'site_type', 'supervisor_name', 'hours', 'entry_date', 'notes'],
    summarize: (it) => `${it.site_name || 'Untitled site'}${it.hours ? ` — ${it.hours}h` : ''}`,
  },
};

const OPERATIONS = new Set(['create', 'update']);

function sanitizeItem(resource, raw) {
  const spec = ACTION_RESOURCES[resource];
  if (!spec || !raw || typeof raw !== 'object') return null;
  const out = {};
  for (const key of spec.fields) if (key in raw) out[key] = raw[key];
  return out;
}

/**
 * Validate one proposed action from the model. Drops anything that doesn't
 * name a known resource/operation/shape rather than trying to repair it — a
 * malformed proposal should just not render a card, not half-execute.
 */
function validateAction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const resource = String(raw.resource || '');
  const operation = String(raw.operation || '');
  if (!ACTION_RESOURCES[resource] || !OPERATIONS.has(operation)) return null;

  if (operation === 'create') {
    const items = Array.isArray(raw.items) ? raw.items : (raw.item ? [raw.item] : []);
    const clean = items.map(it => sanitizeItem(resource, it)).filter(Boolean);
    if (!clean.length) return null;
    return { resource, operation, items: clean };
  }

  // update — needs a real id (never invented client-side; the model must have been handed the
  // id in the system prompt's data block) and at least one field to change.
  const id = raw.id || raw.item?.id;
  const patch = sanitizeItem(resource, raw.patch || raw.item || {});
  if (!id || !patch || !Object.keys(patch).length) return null;
  return { resource, operation, id: String(id), patch };
}

/**
 * Pull the trailing ```medabrain-action fenced block (if any) out of a reply, and validate its
 * contents. Returns { text, directive } — `text` is always safe to render as markdown (the raw
 * JSON never reaches the student), `directive` is null when there was nothing, nothing valid, or
 * the model didn't propose anything this turn.
 */
export function parseAssistantDirective(content) {
  const str = String(content || '');
  const match = str.match(/```medabrain-action\s*([\s\S]*?)```\s*$/i);
  if (!match) return { text: str, directive: null };

  const text = str.slice(0, match.index).trim();
  let parsed;
  try { parsed = JSON.parse(match[1]); } catch { return { text, directive: null }; }
  if (!parsed || typeof parsed !== 'object') return { text, directive: null };

  const navigate = typeof parsed.navigate === 'string' && /^[a-z]+(\/[a-z_:]+)?$/i.test(parsed.navigate)
    ? parsed.navigate : null;
  const rawActions = Array.isArray(parsed.actions) ? parsed.actions : [];
  const actions = rawActions.map(validateAction).filter(Boolean).slice(0, 5);

  if (!navigate && !actions.length) return { text, directive: null };
  return { text, directive: { navigate, actions } };
}

/** Human-readable summary of one action, for the approval card. */
export function describeAction(action) {
  const spec = ACTION_RESOURCES[action.resource];
  if (!spec) return 'Unknown change';
  if (action.operation === 'create') {
    const names = action.items.map(spec.summarize).filter(Boolean);
    const noun = action.items.length === 1 ? 'entry' : 'entries';
    return `Add ${action.items.length} ${noun} to ${spec.label}: ${names.join(', ')}`;
  }
  const changed = Object.keys(action.patch).join(', ');
  return `Update an entry in ${spec.label} (${changed})`;
}

/** Execute one approved action against the real API. Throws on the first failure. */
export async function executeAction(action) {
  if (action.operation === 'create') {
    const created = [];
    for (const item of action.items) created.push(await createItem(action.resource, item));
    return created;
  }
  return [await updateItem(action.resource, action.id, action.patch)];
}

/** Best-effort human label for a nav destination id, for the "Take me there" button. */
export function labelForDestination(destId) {
  const spec = Object.values(ACTION_RESOURCES).find(s => s.destination === destId);
  if (spec) return spec.label;
  const LABELS = {
    home: 'Home', sat: 'SAT/ACT Prep', prep: 'Prep', portfolio: 'Portfolio', roadmap: 'Roadmap',
    plans: 'Plans', progress: 'Progress', settings: 'Settings',
    'portfolio/tracked': 'Tracked Opportunities', 'portfolio/opportunities': 'Opportunities',
    'portfolio/milestones': 'Milestones', 'portfolio/colleges': 'College List',
    'portfolio/essays': 'Essays', 'portfolio/aid': 'Financial Aid', 'portfolio/resume': 'Activities & résumé',
    'portfolio/recommenders': 'Recommenders', 'portfolio/interview': 'Mock Interview', 'portfolio/calc': 'Admissions Calculator',
  };
  if (LABELS[destId]) return LABELS[destId];
  const [tab, view] = String(destId || '').split(/[/:]/);
  const words = (view || tab || '').replace(/_/g, ' ');
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'that screen';
}
