// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — PRIMITIVES
//
// Raw values with no meaning attached. A primitive says "this is the hex that
// sits at roughly L* 72 on the blue ramp"; it does not say what that color is
// FOR. Nothing in src/components/ may import this file — a component reaching
// past the semantic layer to grab BLUE[55] is exactly the one-off color this
// restructure exists to delete, and scripts/verifyDesignTokens.mjs fails the
// build on it.
//
// ── Why the steps are numbered by L* ─────────────────────────────────────────
// Tailwind-style 50…900 numbering is arbitrary: "blue-600" tells you nothing
// about how blue-600 will behave against a given surface. These keys are the
// CIELAB lightness of the swatch, rounded, so a step number IS a contrast
// prediction. Two colors whose step numbers differ by ~40 clear 4.5:1 against
// each other; that is why every dark-theme accent below lives at 72 and every
// dark-theme surface lives under 33, and why the semantic layer can pick a step
// by arithmetic instead of by eye.
//
// Ramps are sparse on purpose. A step exists because some theme needs it, not
// to fill out a grid — an unused swatch is a swatch nobody has contrast-checked.
// ─────────────────────────────────────────────────────────────────────────────

export const BLUE = Object.freeze({
  '26.1': '#08388c', '28.6': '#0a3d99', '29.1': '#31465f', '30.5': '#3b36a9',
  '34': '#0a48b4', '34.2': '#423bc0', '34.8': '#154ea7', '36.2': '#1651ae',
  '37.2': '#0b4fc4', '42.4': '#1a5fcc', '43.4': '#1d5fd9', '44.1': '#1b63d4',
  '55': '#2d7fff', '63.1': '#499dee', '65.5': '#5da0ff', '71.8': '#72b5f8',
  '74.9': '#8fbaff', '76.1': '#8fc0f5', '78': '#93c5fd', '80': '#9dcaff',
  '86.1': '#bddafe',
});

export const GREEN = Object.freeze({
  '26.9': '#034936', '30.7': '#03533c', '30.9': '#384e3c', '34.6': '#055d46',
  '35.6': '#046045', '36.3': '#046245', '39.7': '#046b4d', '42': '#067156',
  '44.4': '#057855', '66.8': '#10b981', '71.8': '#77c087', '75.8': '#34d399',
  '79.9': '#95d5a2', '83.3': '#5ee7b4', '86': '#abe5b5',
});

export const AMBER = Object.freeze({
  '29.9': '#6d3907', '30.3': '#55452b', '33.9': '#7a4108', '35': '#764807',
  '36.1': '#814605', '37.3': '#874709', '41.6': '#96500a', '42.7': '#905808',
  '44': '#9d5606', '71.8': '#d9a84f', '72.2': '#f59e0b', '79.9': '#edbf71',
  '80.7': '#fbbf24', '84.8': '#ffcd55', '86.1': '#fcd189',
});

export const ROSE = Object.freeze({
  '27.3': '#830c22', '30.1': '#8f0e26', '30.2': '#633c42', '34.3': '#9f1533',
  '34.6': '#a30f2a', '36.9': '#ab1536', '38.2': '#b3122f', '42.1': '#c21a3e',
  '44.1': '#cc1940', '55.7': '#f43f5e', '65': '#fb7185', '71.9': '#fd90a4',
  '72': '#ff8fa2', '80.1': '#ffb2be', '86.1': '#ffcad1',
});

export const VIOLET = Object.freeze({
  '21.9': '#421884', '25.5': '#4c1d95', '27.7': '#521da4', '30.1': '#50415d',
  '31.1': '#5b21b6', '32': '#5c29b2', '36.5': '#6831c7', '38.2': '#6d31d4',
  '43.4': '#7c3aed', '51.6': '#8b5cf6', '64.6': '#a78bfa', '71.8': '#c99fed',
  '74.6': '#c4aaff', '79.9': '#deb7fd', '86.1': '#e9cdff',
});

export const CYAN = Object.freeze({
  '29.9': '#014d61', '30.1': '#284c54', '33.5': '#02566c', '34.6': '#08596c',
  '36.9': '#075f74', '37': '#025f78', '41.6': '#036b86', '41.9': '#0a6c84',
  '43.8': '#08718a', '68.2': '#06b6d4', '71.7': '#50bed4', '77.9': '#22d3ee',
  '79.9': '#7ad3e7', '84.9': '#5fe6f8', '86': '#95e3f5',
});

export const ORANGE = Object.freeze({
  '29.9': '#5f3f30', '30': '#7e2c05', '33.7': '#8d3106', '35': '#8f3608',
  '36.3': '#94380a', '37.9': '#9e3707', '42.3': '#b03e08', '42.8': '#af420a',
  '44.2': '#b5440c', '63.7': '#f97316', '70.5': '#fb923c', '71.9': '#f29b6f',
  '77': '#ffab6b', '80.1': '#ffb692', '86': '#fecdb5',
});

export const TEAL = Object.freeze({
  '29.2': '#054e47', '29.9': '#2b4c4c', '32.8': '#08574f', '35.1': '#095d54',
  '36.6': '#0b6159', '37.3': '#06635b', '41.8': '#0a6f66', '42.5': '#0b7166',
  '43.7': '#0d746a', '67.4': '#14b8a6', '71.8': '#5fbfbe', '76.9': '#2dd4bf',
  '79.9': '#82d4d3', '85': '#5eead4', '86': '#9ae4e3',
});

export const INDIGO = Object.freeze({
  '19.7': '#282374', '24.3': '#312e81', '25.2': '#312b93', '28.3': '#3730a3',
  '29.9': '#47435f', '30.5': '#3b36a9', '34.2': '#423bc0', '36.3': '#4640c9',
  '40.7': '#4f46e5', '50.1': '#6366f1', '61.8': '#818cf8', '71.9': '#b0a7f5',
  '73.7': '#a5b0ff', '80': '#c8bfff', '86': '#d9d2ff',
});

export const PINK = Object.freeze({
  '25.2': '#750d42', '28.6': '#83104a', '30': '#603c4c', '32.1': '#921152',
  '34.8': '#9b1b55', '36.3': '#a4145c', '36.7': '#a31d57', '42.6': '#bd2168',
  '43.7': '#c22268', '56.9': '#ec4899', '65.5': '#f472b6', '71.8': '#f591bf',
  '72.8': '#ff8fc4', '80.1': '#feb0d2', '86': '#ffc8df',
});

export const FUCHSIA = Object.freeze({
  '24.3': '#63126d', '27.5': '#6f1479', '30': '#583e58', '31.1': '#7c1789',
  '34.4': '#871c97', '35.1': '#8b1a99', '36.8': '#911da0', '42': '#a422b8',
  '43.9': '#ad22bf', '57.4': '#d946ef', '67.8': '#e879f9', '71.8': '#e097e1',
  '80': '#f2b1f2', '86': '#ffc4fe',
});

export const LIME = Object.freeze({
  '27.7': '#2e4907', '30': '#414a2f', '30.2': '#334f08', '34.7': '#395b09',
  '35.9': '#3b5e0a', '36.2': '#3b5f0b', '40.1': '#42690b', '42.2': '#456f0b',
  '43.8': '#48730d', '71.9': '#9eba6d', '74.9': '#84cc16', '79.9': '#b7cf8b',
  '84.3': '#a3e635', '85.9': '#cadfa0', '89.9': '#c2f34f',
});

export const SKY = Object.freeze({
  '28': '#014766', '30.1': '#294b5b', '31.4': '#014f72', '34.9': '#02587c',
  '35.7': '#015a80', '36.6': '#025b89', '39.8': '#02648f', '42.4': '#026b97',
  '44.5': '#026fa7', '64.1': '#0ea5e9', '71.9': '#50bce9', '72.2': '#38bdf8',
  '79.6': '#74d0ff', '80.1': '#7cd1fa', '85.9': '#a4dfff',
});

export const EMERALD = Object.freeze({
  '24': '#02422f', '26.1': '#024734', '29.9': '#314c3f', '30.7': '#03533b',
  '33': '#035942', '34.1': '#035c42', '36.4': '#036247', '39.4': '#046a4f',
  '44.4': '#047857', '54.9': '#059669', '71.7': '#71bf9c', '75.8': '#34d399',
  '80.1': '#90d5b4', '83.3': '#5ee7b4', '86.1': '#a6e5c6',
});

export const RED = Object.freeze({
  '25.1': '#781111', '28.4': '#861414', '29.7': '#603d3a', '32.1': '#961616',
  '35': '#a11c1c', '36.2': '#a81919', '36.4': '#a81c1c', '41.9': '#c02121',
  '44.7': '#cd2323', '55': '#ef4444', '64.1': '#f87171', '71.8': '#fd928b',
  '72.6': '#ff9494', '79.9': '#ffb3ad', '86': '#ffcbc6',
});

export const GOLD = Object.freeze({
  '30': '#52452a', '31': '#634302', '34.7': '#6e4b02', '35': '#6e4c04',
  '36.5': '#734f03', '39': '#7c5403', '42.6': '#865d05', '43.4': '#8a5e03',
  '44.5': '#8d6104', '71.9': '#ceac5f', '75.9': '#eab308', '79.9': '#e3c27e',
  '83.7': '#facc15', '85.9': '#f3d395', '88.8': '#ffdd57',
});

// ── Neutral ramps ────────────────────────────────────────────────────────────
// Three separate ramps, not one, because they are genuinely three different
// hue families and merging them would let a theme mix casts without noticing.
// Keys carry one decimal here: near-white swatches sit fractions of an L* apart
// and integer keys would collide, which would make the key stop meaning L* —
// the one property the whole numbering scheme depends on.

// SLATE — the cool blue-slate (hue ≈ 262°) behind the Balanced themes. Slate
// rather than a pure neutral on purpose: a true gray reads cheap, and holding
// the surfaces in the same hue family as the blue accent stops the two from
// vibrating against each other. Every step from 15.4 to 32.1 is ~4 L* from its
// neighbor, which is perceptible as a step without striping.
export const SLATE = Object.freeze({
  '7.5': '#12171c', '14.6': '#1f2531', '15.4': '#22272d', '16.9': '#232a37',
  '18.2': '#272d34', '21': '#2a3341', '22.3': '#30363d', '25.9': '#383e46',
  '28.1': '#3d434a', '32.1': '#464c54', '33.9': '#4b5058', '42': '#5d646c',
  '51.8': '#767c84', '59.1': '#888f97', '64.3': '#8f9db3', '71.8': '#a9b1ba',
  '76.1': '#b6bcc6', '77': '#b3bfd2', '89.6': '#dae2ef', '93.2': '#e7ecf2',
});

// MIDNIGHT — the deeper, bluer navy the Dark theme is built on. Bottoms out
// around L* 4, which is why Dark is the theme that halates and Balanced is the
// one to reach for.
export const MIDNIGHT = Object.freeze({
  '3.9': '#0a0e16', '5.9': '#0e131d', '6.8': '#0d1524', '9.2': '#101a2b',
  '9.7': '#141b28', '12.1': '#18202e', '13.7': '#16233a', '15.4': '#1e2735',
  '19.6': '#26303f', '24.5': '#2f3b4d', '46.9': '#627086', '51.5': '#6e7b97',
  '60.6': '#8593ac', '67.9': '#98a6c2', '73.7': '#a9b6cd', '88.2': '#d5deee',
  '94.1': '#e9eefb',
});

// MIST — the cool grays behind Light and Balanced Light.
export const MIST = Object.freeze({
  '9.3': '#111a2b', '14.1': '#1b2434', '15.1': '#1d2637', '15.9': '#1f2836',
  '26': '#333e51', '29.4': '#3b4658', '32.5': '#3f4d66', '35': '#45536b',
  '37.9': '#4e5a6e', '42.5': '#5a6577', '44.6': '#5c6a85', '45': '#5d6b85',
  '50.5': '#6d798d', '52.7': '#737e96', '82.8': '#c6cfdd', '82.9': '#c7cfdc',
  '85.6': '#ccd7e8', '86.7': '#d0dae9', '87.9': '#d7dde7', '89.3': '#dbe1ea',
  '90.1': '#dfe3ea', '91.4': '#e0e7f1', '92.2': '#e4e9f0', '92.6': '#e6eaf1',
  '92.9': '#e7ebf1', '93': '#e8ebf0', '94': '#eaeef4', '94.3': '#ebeff5',
  '95': '#edf1f8', '95.3': '#eef2f7', '95.4': '#eef2f8', '95.7': '#eff3f9', '96.1': '#f1f4f8',
  '96.2': '#f2f4f8', '96.4': '#f2f5fa', '96.5': '#f2f5f9', '97.1': '#f4f7fc',
  '97.2': '#f5f7fb', '97.5': '#f6f8fb', '98.2': '#f8fafc', '98.9': '#fbfcfe',
  '99.3': '#fcfdff',
});

export const WHITE = '#ffffff';
export const BLACK = '#000000';

// ── Alpha ramps ──────────────────────────────────────────────────────────────
// Translucent overlays, keyed by percentage. These are the only legitimate
// source of an `rgba(` string in the app — a literal rgba() anywhere in
// src/components/ is a smuggled one-off and the token lint rejects it.
export const WHITE_A = Object.freeze({
  3: 'rgba(255,255,255,0.03)', 4: 'rgba(255,255,255,0.04)', 5: 'rgba(255,255,255,0.05)',
  '5.5': 'rgba(255,255,255,0.055)', 6: 'rgba(255,255,255,0.06)',
  7: 'rgba(255,255,255,0.07)', 9: 'rgba(255,255,255,0.09)',
  10: 'rgba(255,255,255,0.10)', 11: 'rgba(255,255,255,0.11)', 12: 'rgba(255,255,255,0.12)',
  14: 'rgba(255,255,255,0.14)', 18: 'rgba(255,255,255,0.18)', 22: 'rgba(255,255,255,0.22)',
  34: 'rgba(255,255,255,0.34)', 42: 'rgba(255,255,255,0.42)', 50: 'rgba(255,255,255,0.5)',
  72: 'rgba(255,255,255,0.72)',
});
export const WHITE_WASH = Object.freeze({
  2: 'rgba(255,255,255,0.022)', 3: 'rgba(255,255,255,0.025)', 35: 'rgba(255,255,255,0.035)',
  42: 'rgba(255,255,255,0.42)', 55: 'rgba(255,255,255,0.55)', 70: 'rgba(255,255,255,0.70)',
  72: 'rgba(255,255,255,0.72)', 88: 'rgba(255,255,255,0.88)',
});
export const INK_A = Object.freeze({
  4: 'rgba(15,23,42,0.04)', 5: 'rgba(15,23,42,0.05)',
  '5.5': 'rgba(15,23,42,0.055)', 6: 'rgba(15,23,42,0.06)',
  7: 'rgba(15,23,42,0.07)', 8: 'rgba(15,23,42,0.08)', 10: 'rgba(15,23,42,0.10)',
  11: 'rgba(15,23,42,0.11)', 14: 'rgba(15,23,42,0.14)', 15: 'rgba(15,23,42,0.15)',
  16: 'rgba(15,23,42,0.16)', 17: 'rgba(15,23,42,0.17)', 22: 'rgba(15,23,42,0.22)',
  24: 'rgba(15,23,42,0.24)', 27: 'rgba(15,23,42,0.27)', 34: 'rgba(15,23,42,0.34)',
  35: 'rgba(15,23,42,0.35)', 36: 'rgba(15,23,42,0.36)', 38: 'rgba(15,23,42,0.38)',
  45: 'rgba(15,23,42,0.45)', 48: 'rgba(15,23,42,0.48)', 50: 'rgba(15,23,42,0.5)',
  52: 'rgba(15,23,42,0.52)', 75: 'rgba(15,23,42,0.75)', 76: 'rgba(15,23,42,0.76)',
});
export const SHADOW_A = Object.freeze({
  22: 'rgba(0,0,0,0.22)', 30: 'rgba(0,0,0,0.30)', 3: 'rgba(0,0,0,0.3)', 5: 'rgba(0,0,0,0.5)',
});
export const SCRIM_A = Object.freeze({
  midnight55: 'rgba(0,0,0,0.55)', slate58: 'rgba(9,12,18,0.58)', slate62: 'rgba(18,23,28,0.62)',
  mist35: 'rgba(15,23,42,0.35)', mist38: 'rgba(15,23,42,0.38)',
});

// ── Type ─────────────────────────────────────────────────────────────────────
export const FONT = Object.freeze({
  display: "'Bricolage Grotesque',-apple-system,sans-serif",
  body: "'Onest',-apple-system,BlinkMacSystemFont,sans-serif",
  mono: "'JetBrains Mono','SF Mono',monospace",
});
