// ─────────────────────────────────────────────────────────────────────────────
// Tiny external store for "which top-level tab is active right now".
//
// Why this exists: SatToolsContext portals the Calculator/Formulas rail
// straight to document.body (see SatToolsContext.jsx), because App.jsx wraps
// each tab in an AnimatePresence-animated <motion.div>. When the student
// navigates away from the SAT tab, AnimatePresence keeps the outgoing
// motion.div (and everything under it, including SatToolsProvider) mounted
// for its exit animation — and if that exit is interrupted by a second,
// rapid tab switch, AnimatePresence can drop the exiting subtree without ever
// unmounting it. Since the tools rail lives outside that subtree (it's in a
// portal), it would otherwise keep floating over whatever tab is now active.
//
// A prop threaded down through SatTab can't fix this: once a subtree starts
// exiting, AnimatePresence freezes its last-rendered props, so a new
// `active={tab==='sat'}` value never reaches it. This store sidesteps that by
// letting SatToolsProvider subscribe directly, independent of whatever props
// its (possibly stuck) parent last handed it.
// ─────────────────────────────────────────────────────────────────────────────

let currentTab = null;
const listeners = new Set();

export function setActiveTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;
  listeners.forEach((l) => l());
}

export function getActiveTab() {
  return currentTab;
}

export function subscribeActiveTab(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
