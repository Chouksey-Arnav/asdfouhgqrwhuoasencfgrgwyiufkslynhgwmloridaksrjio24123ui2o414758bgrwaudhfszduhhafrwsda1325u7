// The three helpers the v2 landing template needs, and nothing else.
//
// Landing v2 was designed as a design-canvas document (`MedSchoolPrep
// Landing.dc.html`) and ported to JSX mechanically — see the header of
// LandingPageV2.jsx. That port keeps every declaration as the *string* the
// design wrote it as, rather than re-typing 1,300 inline styles into camelCase
// objects by hand: re-typing them is where a `0.11` quietly becomes a `0.1` and
// the page stops being the design that was approved.
//
// So `css()` is what turns those strings into the objects React wants. It is
// called on every element on every render, which is why it memoises: the style
// strings are overwhelmingly literals baked into the JSX, so the cache is
// bounded by the number of distinct strings in the file plus the handful the
// logic class computes per state change.

const CACHE = new Map();
// A style string built per-render (a color interpolated into a template
// literal) would otherwise grow the cache without bound over a long session.
const MAX_CACHE = 4000;

/** `"font-size: 12px; color: #fff"` → `{ fontSize: '12px', color: '#fff' }`. */
export function css(decls) {
  if (!decls) return undefined;
  if (typeof decls === 'object') return decls;
  const hit = CACHE.get(decls);
  if (hit) return hit;

  const out = {};
  // Split on semicolons that are not inside brackets or quotes: `background:
  // linear-gradient(...)` and `font-family: 'Onest', sans-serif` both contain
  // commas and parentheses, and one of the gradients contains a semicolon-free
  // but comma-heavy color list that a naive split would still survive — the
  // depth counter is here for the `url(data:...;base64,...)` shape that would
  // not.
  let depth = 0;
  let quote = null;
  let start = 0;
  const parts = [];
  for (let i = 0; i < decls.length; i++) {
    const c = decls[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) { parts.push(decls.slice(start, i)); start = i + 1; }
  }
  parts.push(decls.slice(start));

  for (const part of parts) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const prop = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (!prop || !value) continue;
    // Custom properties keep their name exactly; everything else becomes the
    // camelCase key React indexes the style object by. `-webkit-*` has to keep
    // its leading capital (WebkitBackdropFilter), which is what the slice does.
    if (prop.startsWith('--')) { out[prop] = value; continue; }
    const camel = prop.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    out[prop[0] === '-' ? camel[0].toUpperCase() + camel.slice(1) : camel] = value;
  }

  if (CACHE.size >= MAX_CACHE) CACHE.clear();
  CACHE.set(decls, out);
  return out;
}

/** `{{ list }}` holes render nothing rather than throwing when a val is absent. */
export function arr(list) {
  return Array.isArray(list) ? list : [];
}

/** A `{{ hole }}` in text position: booleans and nullish render as nothing. */
export function hole(value) {
  if (value == null || typeof value === 'boolean') return null;
  return value;
}
