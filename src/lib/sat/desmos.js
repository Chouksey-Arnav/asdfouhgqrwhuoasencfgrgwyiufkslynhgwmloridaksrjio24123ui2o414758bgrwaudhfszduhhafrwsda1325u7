// ─────────────────────────────────────────────────────────────────────────────
// Desmos integration — the calculator the Digital SAT actually ships with.
//
// The real exam embeds Desmos inside Bluebook and lets a student open it on
// every Math question, for as long as they want. Practicing with a different
// calculator (or none) trains a workflow the test day will not honor, so this
// module loads the genuine Desmos API and the SAT tab hosts it everywhere.
//
// THREE THINGS THIS FILE OWNS:
//
// 1. LOADING. The Desmos API is a remote script, not an npm package — there is
//    no bundled build and Desmos's terms require loading it from their CDN. So
//    it is injected once, lazily, and every caller shares the same promise.
//    Loading is also the one part that can legitimately fail (offline, blocked
//    network, ad-blocker), so failure is a first-class state, never a throw
//    that blanks the SAT tab.
//
// 2. THE API KEY. `VITE_DESMOS_API_KEY` if you have one (free, from
//    desmos.com/api), otherwise the demo key Desmos publishes in its own
//    documentation. The demo key works but is rate-limited and unsupported —
//    ship a real one before this sees real traffic.
//
// 3. PERSISTENCE. A student who types a system of equations, navigates to the
//    next question, and finds an empty calculator will stop using it. Graph
//    state is serialised to localStorage on every change (debounced) and
//    restored on mount, so the calculator behaves like a workspace that
//    follows them around the tab rather than a widget that resets.
// ─────────────────────────────────────────────────────────────────────────────

const API_VERSION = 'v1.11';

// Desmos's own published demo key (it appears verbatim throughout
// docs.desmos.com). Fine for development; get a free production key at
// https://www.desmos.com/api before shipping this to students.
const DEMO_API_KEY = 'dcb31709b452b1cf9dc26972add0fda6';

export const DESMOS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DESMOS_API_KEY) || DEMO_API_KEY;

export const USING_DEMO_KEY = DESMOS_API_KEY === DEMO_API_KEY;

export const DESMOS_SRC = `https://www.desmos.com/api/${API_VERSION}/calculator.js?apiKey=${DESMOS_API_KEY}`;

// Where a student can go if the embed cannot load at all.
export const DESMOS_FALLBACK_URL = 'https://www.desmos.com/calculator';

const LOAD_TIMEOUT_MS = 20000;

let loadPromise = null;
let loadState = 'idle'; // 'idle' | 'loading' | 'ready' | 'error'

/** Current loader state, for UI that wants to render before calling load(). */
export function desmosLoadState() {
  if (typeof window !== 'undefined' && window.Desmos) return 'ready';
  return loadState;
}

/**
 * Load the Desmos calculator API exactly once.
 *
 * Resolves with `window.Desmos`. Rejects — rather than hanging — if the script
 * cannot be fetched or loads without defining the global, so every caller can
 * render a real fallback instead of an eternal spinner.
 *
 * @returns {Promise<object>} the Desmos global
 */
export function loadDesmos() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Desmos can only load in a browser.'));
  }
  if (window.Desmos) {
    loadState = 'ready';
    return Promise.resolve(window.Desmos);
  }
  if (loadPromise) return loadPromise;

  loadState = 'loading';
  loadPromise = new Promise((resolve, reject) => {
    // A previous mount may have inserted the tag already (e.g. this promise was
    // reset after a failure). Reuse the existing tag rather than stacking a
    // second copy of a ~2 MB script.
    let script = document.querySelector(`script[data-desmos-api="${API_VERSION}"]`);
    let timer = null;

    const settleOk = () => {
      clearTimeout(timer);
      if (window.Desmos) {
        loadState = 'ready';
        resolve(window.Desmos);
      } else {
        loadState = 'error';
        reject(new Error('The Desmos script loaded but did not initialize.'));
      }
    };
    const settleErr = (message) => {
      clearTimeout(timer);
      loadState = 'error';
      // Allow a later retry — a student who reconnects should be able to try
      // again without a full page reload.
      loadPromise = null;
      script?.removeAttribute('data-desmos-ok');
      reject(new Error(message));
    };

    timer = setTimeout(() => settleErr('Desmos took too long to load.'), LOAD_TIMEOUT_MS);

    if (!script) {
      script = document.createElement('script');
      script.src = DESMOS_SRC;
      script.async = true;
      script.dataset.desmosApi = API_VERSION;
      script.addEventListener('load', settleOk, { once: true });
      script.addEventListener('error', () => settleErr('Could not reach Desmos.'), { once: true });
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', settleOk, { once: true });
      script.addEventListener('error', () => settleErr('Could not reach Desmos.'), { once: true });
      // Already finished loading before we attached listeners.
      if (window.Desmos) settleOk();
    }
  });

  return loadPromise;
}

// ── Calculator options ───────────────────────────────────────────────────────
// Tuned to match what a student gets inside Bluebook: full graphing surface,
// expressions list, settings and zoom, but none of the collaboration/media
// features (images, notes, links) that do not exist on test day and would only
// teach a workflow the exam will take away.
export const SAT_GRAPHING_OPTIONS = {
  keypad: true,
  expressions: true,
  settingsMenu: true,
  zoomButtons: true,
  expressionsTopbar: true,
  border: false,
  lockViewport: false,
  images: false,
  folders: false,
  notes: false,
  links: false,
  autosize: true,
  // Degree mode is what most SAT trigonometry questions state their angles in;
  // the student can still flip to radians in the settings menu.
  degreeMode: false,
  invertedColors: true, // the app is dark-themed end to end
};

export const SAT_SCIENTIFIC_OPTIONS = {
  invertedColors: true,
  degreeMode: true,
  keypad: true,
};

export const CALC_MODES = {
  graphing: {
    id: 'graphing',
    label: 'Graphing',
    blurb: 'The same graphing calculator the Digital SAT gives you on every Math question.',
  },
  scientific: {
    id: 'scientific',
    label: 'Scientific',
    blurb: 'A plain scientific calculator for quick arithmetic, when a graph would be overkill.',
  },
};

/**
 * Construct a calculator of the requested mode into `element`.
 * Returns null if Desmos does not expose that constructor (defensive — the API
 * surface is remote and versioned independently of this app).
 */
export function createCalculator(Desmos, element, mode = 'graphing') {
  if (!Desmos || !element) return null;
  if (mode === 'scientific' && typeof Desmos.ScientificCalculator === 'function') {
    return Desmos.ScientificCalculator(element, { ...SAT_SCIENTIFIC_OPTIONS });
  }
  if (typeof Desmos.GraphingCalculator === 'function') {
    return Desmos.GraphingCalculator(element, { ...SAT_GRAPHING_OPTIONS });
  }
  return null;
}

// ── Persistence ──────────────────────────────────────────────────────────────
// localStorage rather than Dexie on purpose: this is throwaway scratch work,
// not study data, and it must be readable synchronously during mount so the
// calculator never flashes empty before its expressions appear.

const STATE_KEY = 'msp.sat.desmos.state.v1';
const UI_KEY = 'msp.sat.desmos.ui.v1';

// A graph with a lot of expressions serialises large. Cap it so a pathological
// state can never eat the origin's storage quota and break unrelated writes.
const MAX_STATE_CHARS = 400000;

/** Saved graph state for a mode, or null. */
export function loadGraphState(mode = 'graphing') {
  try {
    const raw = localStorage.getItem(`${STATE_KEY}.${mode}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGraphState(mode, state) {
  try {
    const serialised = JSON.stringify(state);
    if (serialised.length > MAX_STATE_CHARS) return;
    localStorage.setItem(`${STATE_KEY}.${mode}`, serialised);
  } catch {
    /* quota or private-mode — losing scratch work is not worth an error */
  }
}

export function clearGraphState(mode) {
  try {
    if (mode) localStorage.removeItem(`${STATE_KEY}.${mode}`);
    else for (const m of Object.keys(CALC_MODES)) localStorage.removeItem(`${STATE_KEY}.${m}`);
  } catch { /* non-fatal */ }
}

/** Floating-window geometry + mode, so the calculator reopens where it was. */
export function loadCalcUi() {
  try {
    const raw = localStorage.getItem(UI_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCalcUi(ui) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch { /* non-fatal */ }
}
