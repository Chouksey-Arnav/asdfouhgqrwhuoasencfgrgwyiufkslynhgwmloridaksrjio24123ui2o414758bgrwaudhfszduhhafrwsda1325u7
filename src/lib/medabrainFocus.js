// ─────────────────────────────────────────────────────────────────────────────
// "Ask Medabrain about THIS" — the one-line bus every card uses.
//
// ── Why a bus and not a prop ────────────────────────────────────────────────
// PortfolioMedabrain mounts once, next to the whole Portfolio pillar, and owns
// its own open/closed state and its own data fetch. The cards that want to talk
// to it are five component layers away, inside panels that are rendered by a
// lookup table in App.jsx. Threading an `onAskMedabrain(context)` prop down
// every one of those paths would mean touching a dozen components to add one
// button, and every panel that forgot to pass it through would silently render
// a button that does nothing.
//
// So: a window event with one payload shape. Any surface, at any depth, can
// open the coach with a specific thing loaded, and the panel is the only thing
// that has to know how to receive it.
//
// ── What travels ────────────────────────────────────────────────────────────
// A FOCUS, not a history: { kind, ref, label, question, block } — see
// src/lib/monthPlan/context.js for the builders and for why the block is small
// on purpose. `question` is prefilled into the composer (the student can edit
// it before sending, which they often should) and `block` is appended to the
// system prompt for that conversation only.
// ─────────────────────────────────────────────────────────────────────────────

export const MEDABRAIN_FOCUS_EVENT = 'msp:medabrain-focus';

/**
 * Open Medabrain with one item loaded.
 *
 * @param {{kind:string, ref:string, label:string, question:string, block:string, autoSend?:boolean}} focus
 * @returns {boolean} whether the event could be dispatched at all (false in SSR/prerender)
 */
export function askMedabrainAbout(focus) {
  if (typeof window === 'undefined' || !focus) return false;
  const detail = {
    kind: String(focus.kind || 'general'),
    ref: focus.ref ? String(focus.ref) : null,
    label: focus.label ? String(focus.label).slice(0, 160) : null,
    question: String(focus.question || '').slice(0, 600),
    // Bounded hard. A focus block is meant to be a paragraph about one item; a
    // caller that hands over half a portfolio is the exact failure this module
    // exists to prevent, and truncating is a better answer than trusting.
    block: String(focus.block || '').slice(0, 3000),
    autoSend: !!focus.autoSend,
    at: Date.now(),
  };
  window.dispatchEvent(new CustomEvent(MEDABRAIN_FOCUS_EVENT, { detail }));
  return true;
}

/** Subscribe. Returns the unsubscribe function, so an effect can `return subscribeMedabrainFocus(fn)`. */
export function subscribeMedabrainFocus(handler) {
  if (typeof window === 'undefined' || typeof handler !== 'function') return () => {};
  const listener = (e) => handler(e.detail);
  window.addEventListener(MEDABRAIN_FOCUS_EVENT, listener);
  return () => window.removeEventListener(MEDABRAIN_FOCUS_EVENT, listener);
}
