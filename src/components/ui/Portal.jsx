import { useRef } from 'react';
import { createPortal } from 'react-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Escape hatch for viewport-anchored overlays.
//
// WHY THIS EXISTS. `position: fixed` is only relative to the viewport while no
// ancestor has a transform, filter, backdrop-filter or `will-change` on it. The
// moment one does, that ancestor becomes the containing block and every fixed
// child inside it is measured from the ancestor's box instead.
//
// App.jsx wraps each top-level tab in `<motion.div key={tab} initial={{y:10}}
// animate={{y:0}}>`. For the ~220ms that animation runs, the wrapper carries a
// transform — so the SAT tab's calculator rail, the Desmos window and the
// reference sheet all render offset inside the padded, max-width content
// column, then visibly snap to their real position the instant Framer clears
// the transform. That is the flash students see when they open the SAT tab.
//
// Rendering those surfaces through a portal attached to <body> takes them out
// of the animated subtree entirely, so they are laid out against the viewport
// on their very first paint. React keeps them in the same component tree for
// state and context purposes; only the DOM parent changes.
//
// The host is resolved during render rather than in an effect, so the overlay
// paints in the right place on its FIRST frame — deferring it by one commit
// would trade the old jump for a one-frame pop-in. Resolution is idempotent
// (get-or-create a single shared node), which is what makes it safe to do
// during a render that StrictMode will run twice.
// ─────────────────────────────────────────────────────────────────────────────

export default function Portal({ children, id = 'overlay-root' }) {
  const hostRef = useRef(null);

  if (typeof document !== 'undefined' && !hostRef.current) {
    // One shared host per id, reused across every Portal instance, so we do not
    // litter <body> with a div per overlay.
    let host = document.getElementById(id);
    if (!host) {
      host = document.createElement('div');
      host.id = id;
      // DELIBERATELY UNSTYLED. Giving the host a position and a z-index makes it
      // a stacking context, which then CONTAINS every z-index inside it: the
      // rail's 320 and the calculator's 336 would be resolved against each other
      // and the whole group painted at the host's level, landing underneath the
      // app sidebar (z-index 10) and the mobile nav (300). Left static with no
      // z-index, the host is transparent to stacking and its fixed children
      // participate in the root stacking context exactly as they did inline.
      document.body.appendChild(host);
    }
    hostRef.current = host;
  }

  if (!hostRef.current) return null; // no document (SSR / prerender) — render nothing
  return createPortal(children, hostRef.current);
}
