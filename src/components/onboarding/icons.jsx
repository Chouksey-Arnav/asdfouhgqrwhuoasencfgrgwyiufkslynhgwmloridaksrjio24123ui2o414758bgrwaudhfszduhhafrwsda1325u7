// ─────────────────────────────────────────────────────────────────────────────
// The onboarding icon set.
//
// ── Why these are drawn by hand instead of imported ──────────────────────────
// The flow used to lead every question, every option and every chapter with an
// emoji. Emoji are the fastest possible way to put a picture on a screen, and
// that is exactly the problem: 🩺 📚 ⏱️ 🎯 🚀 down a page is a decision nobody
// made. They render in a different style on every platform (Apple's glossy
// 3D, Google's flat, Windows' outlines), they sit at a different optical weight
// than the text beside them, they can't take the chapter's color, and a screen
// full of them reads as a first draft — which is the note this pass exists to
// answer.
//
// So every mark in the flow is drawn here: one 24px grid, one 1.55 stroke, one
// set of round caps, `currentColor` throughout. That means an icon inherits the
// chapter hue when it sits in a soft plate and inverts to white when the option
// is selected — a thing an emoji can never do — and the whole flow reads as one
// hand.
//
// They are inline SVG on purpose. The app is an offline-capable PWA; an icon
// font or a sprite fetched from a CDN is an icon that disappears on school
// wifi.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';

/** The shared frame. Everything below is drawn inside it, on the same grid. */
function G({ size = 20, stroke = 1.55, children, style }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >{children}</svg>
  );
}

// Shorthand: define an icon as its inner geometry only.
const mk = (children) => (props) => <G {...props}>{children}</G>;

// ── Care & people ────────────────────────────────────────────────────────────
const HeartHand = mk(<>
  <path d="M12 12.1 8.5 8.7a2.4 2.4 0 0 1 3.5-3.2 2.4 2.4 0 0 1 3.5 3.2Z" />
  <path d="M4.6 16.1c2.2-1.7 4.7-2.5 7.4-2.5s5.2.8 7.4 2.5" />
  <path d="M6.6 20.2c1.7-1 3.5-1.5 5.4-1.5s3.7.5 5.4 1.5" />
</>);

const PulseHeart = mk(<>
  <path d="M12 20.4S3.9 15.2 3.9 9.7A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 8.1 2.2c0 5.5-8.1 10.7-8.1 10.7Z" />
  <path d="M4.7 11.6h3l1.4-2.7 2 5.2 1.7-3.5 1.2 1h5.2" />
</>);

const OrganHeart = mk(<>
  <path d="M12 20.6S4.2 15.4 4.2 10a4.2 4.2 0 0 1 7.8-2.2A4.2 4.2 0 0 1 19.8 10c0 5.4-7.8 10.6-7.8 10.6Z" />
  <path d="M12 7.8V4.2" />
  <path d="M9.2 7.2 7 4.9" />
  <path d="M12 12.2v5.1" />
</>);

const Physician = mk(<>
  <circle cx="12" cy="6.4" r="3" />
  <path d="M5.6 20.6a6.4 6.4 0 0 1 12.8 0" />
  <path d="M12 13.6v3.2" />
  <path d="M10.4 15.2h3.2" />
</>);

const People = mk(<>
  <circle cx="8.6" cy="7.4" r="2.9" />
  <path d="M3.2 19.4a5.4 5.4 0 0 1 10.8 0" />
  <circle cx="17.4" cy="9.2" r="2.3" />
  <path d="M14.6 18.4a4.1 4.1 0 0 1 6.4-2.6" />
</>);

const Family = mk(<>
  <circle cx="6.8" cy="6.6" r="2.4" />
  <circle cx="17.2" cy="6.6" r="2.4" />
  <circle cx="12" cy="13.6" r="2.2" />
  <path d="M2.8 15.4a4.3 4.3 0 0 1 7.2-2.3" />
  <path d="M14 13.1a4.3 4.3 0 0 1 7.2 2.3" />
  <path d="M8.2 21.2a3.9 3.9 0 0 1 7.6 0" />
</>);

const HandsCare = mk(<>
  <circle cx="12" cy="6.6" r="2.6" />
  <path d="M4.4 18.2c2.2-3 4.7-4.5 7.6-4.5s5.4 1.5 7.6 4.5" />
  <path d="M6.8 21.2c1.6-1.1 3.3-1.7 5.2-1.7s3.6.6 5.2 1.7" />
</>);

// ── Science & study ──────────────────────────────────────────────────────────
const Microscope = mk(<>
  <path d="M5.8 20.8h12.4" />
  <path d="M9.4 20.8A6.2 6.2 0 0 0 16.2 11" />
  <path d="M12.6 4.5 9 8.1a1 1 0 0 0 0 1.4l1.5 1.5a1 1 0 0 0 1.4 0l3.6-3.6a2.05 2.05 0 1 0-2.9-2.9Z" />
  <path d="m8.7 12.5-1.6 1.6a1 1 0 0 0 0 1.4l.6.6a1 1 0 0 0 1.4 0l1.6-1.6" />
  <path d="M5.4 17.6h6.2" />
</>);

const Dna = mk(<>
  <path d="M6.4 2.8c0 4.6 11.2 4.6 11.2 9.2s-11.2 4.6-11.2 9.2" />
  <path d="M17.6 2.8c0 4.6-11.2 4.6-11.2 9.2s11.2 4.6 11.2 9.2" />
  <path d="M8.3 6.4h7.4M6.7 9.6h10.6M6.7 14.4h10.6M8.3 17.6h7.4" />
</>);

const Flask = mk(<>
  <path d="M8.2 2.9h7.6" />
  <path d="M9.8 2.9v5.6l-4.6 8.4a2.4 2.4 0 0 0 2.1 3.6h9.4a2.4 2.4 0 0 0 2.1-3.6l-4.6-8.4V2.9" />
  <path d="M7.1 14.2h9.8" />
  <circle cx="10.4" cy="17" r=".85" />
  <circle cx="13.6" cy="18.4" r=".65" />
</>);

const Atom = mk(<>
  <circle cx="12" cy="12" r="1.8" />
  <ellipse cx="12" cy="12" rx="9.2" ry="3.9" />
  <ellipse cx="12" cy="12" rx="9.2" ry="3.9" transform="rotate(60 12 12)" />
  <ellipse cx="12" cy="12" rx="9.2" ry="3.9" transform="rotate(120 12 12)" />
</>);

const Magnet = mk(<>
  <path d="M4 4.6h4.6v7.6a3.4 3.4 0 0 0 6.8 0V4.6H20v7.6a8 8 0 0 1-16 0Z" />
  <path d="M4 9.2h4.6M15.4 9.2H20" />
</>);

const Petri = mk(<>
  <circle cx="12" cy="12" r="8.6" />
  <path d="M4.2 9.4h15.6" />
  <circle cx="9.6" cy="14.4" r="1.1" />
  <circle cx="14" cy="16" r=".8" />
  <circle cx="14.8" cy="12.8" r=".8" />
</>);

const TestTubes = mk(<>
  <path d="M8.4 2.8v13.6a2.5 2.5 0 0 1-5 0V2.8" />
  <path d="M2.6 2.8h6.6M3.4 11.6h5" />
  <path d="M20.6 2.8v13.6a2.5 2.5 0 0 1-5 0V2.8" />
  <path d="M14.8 2.8h6.6M15.6 11.6h5" />
</>);

const Books = mk(<>
  <path d="M3.6 19.6V6a1.4 1.4 0 0 1 1.4-1.4h2.4A1.4 1.4 0 0 1 8.8 6v13.6Z" />
  <path d="M8.8 19.6V7.6A1.4 1.4 0 0 1 10.2 6.2h2.4A1.4 1.4 0 0 1 14 7.6v12Z" />
  <path d="M14 19.6 16.6 7.9a1.4 1.4 0 0 1 1.7-1.1l2 .5-2.6 12.3Z" />
  <path d="M2.6 21.4h18.8" />
</>);

const Book = mk(<>
  <path d="M4.6 4.8A2 2 0 0 1 6.6 2.8h12.8v16.6H6.6a2 2 0 0 0-2 2Z" />
  <path d="M4.6 19.4a2 2 0 0 1 2-2h12.8" />
  <path d="M8.4 7.4h7" />
</>);

const School = mk(<>
  <path d="M12 2.8 2.6 7.4 12 12l9.4-4.6Z" />
  <path d="M6.2 10v5.4c0 1.8 2.6 3.2 5.8 3.2s5.8-1.4 5.8-3.2V10" />
  <path d="M21.4 7.4v6.2" />
</>);

const Mentor = mk(<>
  <circle cx="8" cy="7.2" r="3" />
  <path d="M2.6 19.8a5.4 5.4 0 0 1 10.8 0" />
  <path d="M15.6 6.6h5.8v5.2h-2.2l-2 2v-2h-1.6Z" />
</>);

const Backpack = mk(<>
  <path d="M5.4 9.6a4.4 4.4 0 0 1 4.4-4.4h4.4a4.4 4.4 0 0 1 4.4 4.4v9.2a2.4 2.4 0 0 1-2.4 2.4H7.8a2.4 2.4 0 0 1-2.4-2.4Z" />
  <path d="M9.4 5.2V4a1.6 1.6 0 0 1 1.6-1.6h2A1.6 1.6 0 0 1 14.6 4v1.2" />
  <path d="M8.8 13.6h6.4v4.2H8.8Z" />
  <path d="M9.6 10.4h4.8" />
</>);

const Layers = mk(<>
  <path d="m12 2.9 8.8 4.5L12 11.9 3.2 7.4Z" />
  <path d="m3.2 12.1 8.8 4.5 8.8-4.5" />
  <path d="m3.2 16.7 8.8 4.5 8.8-4.5" />
</>);

// ── Clinical exposure ────────────────────────────────────────────────────────
const Stethoscope = mk(<>
  <path d="M6.2 3.2v4.6a4 4 0 0 0 8 0V3.2" />
  <path d="M4.6 3.2h3.2M12.6 3.2h3.2" />
  <path d="M10.2 11.8v3.4a4.2 4.2 0 0 0 8.4 0v-1" />
  <circle cx="18.6" cy="12.4" r="2.1" />
</>);

const Syringe = mk(<>
  <path d="m17.8 2.4 3.8 3.8" />
  <path d="m16.6 6.8 2.6-2.6" />
  <path d="M18.6 8.8 8.6 18.8a2.3 2.3 0 0 1-1.2.6l-3.4.8.8-3.4a2.3 2.3 0 0 1 .6-1.2L15.4 5.6Z" />
  <path d="m9 11.2 3.6 3.6M12.6 7.6l3.6 3.6" />
</>);

const Hospital = mk(<>
  <path d="M4.4 21V7.6L12 3.2l7.6 4.4V21" />
  <path d="M12 9.6v5M9.5 12.1h5" />
  <path d="M2.6 21h18.8" />
  <path d="M8.4 21v-3.6h7.2V21" />
</>);

const Observe = mk(<>
  <path d="M2.6 12S6.2 5.9 12 5.9 21.4 12 21.4 12 17.8 18.1 12 18.1 2.6 12 2.6 12Z" />
  <circle cx="12" cy="12" r="2.9" />
</>);

const Medal = mk(<>
  <circle cx="12" cy="15.2" r="5" />
  <path d="m8.8 10.8-3.4-7.4M15.2 10.8l3.4-7.4M9.2 3.4h5.6" />
  <path d="m12 12.9.9 1.9 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2L9.1 15l2-.3Z" />
</>);

const ClipboardPlus = mk(<>
  <path d="M8.6 4.4H6.8A1.8 1.8 0 0 0 5 6.2v13.2a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8V6.2a1.8 1.8 0 0 0-1.8-1.8h-1.8" />
  <path d="M9.4 2.6h5.2a1 1 0 0 1 1 1v2.6H8.4V3.6a1 1 0 0 1 1-1Z" />
  <path d="M12 10.8v5.4M9.3 13.5h5.4" />
</>);

const Brain = mk(<>
  <path d="M12 5.1a2.9 2.9 0 0 0-5.4 1.5A2.7 2.7 0 0 0 5 11a2.9 2.9 0 0 0 .9 4.3 2.8 2.8 0 0 0 3.5 3.5A2.7 2.7 0 0 0 12 17.2Z" />
  <path d="M12 5.1a2.9 2.9 0 0 1 5.4 1.5A2.7 2.7 0 0 1 19 11a2.9 2.9 0 0 1-.9 4.3 2.8 2.8 0 0 1-3.5 3.5A2.7 2.7 0 0 1 12 17.2Z" />
  <path d="M12 5.1v12.1" />
</>);

const Capsule = mk(<>
  <path d="M14.6 3.6a4.8 4.8 0 1 1 6.8 6.8l-7.8 7.8a4.8 4.8 0 0 1-6.8-6.8Z" />
  <path d="m10.6 6.6 6.8 6.8" />
</>);

const WhiteCoat = mk(<>
  <path d="m9.2 3.2-3.9 1.9A2 2 0 0 0 4.2 6.9v13.9h15.6V6.9a2 2 0 0 0-1.1-1.8l-3.9-1.9" />
  <path d="m9.2 3.2 2.8 4.6 2.8-4.6" />
  <path d="M12 7.8v13" />
  <path d="M6.8 13.6h2.6" />
</>);

// ── Direction, time & effort ─────────────────────────────────────────────────
const Compass = mk(<>
  <circle cx="12" cy="12" r="8.8" />
  <path d="m15.2 8.8-2.1 6-6 2.1 2.1-6Z" />
</>);

const Target = mk(<>
  <circle cx="12" cy="12" r="8.8" />
  <circle cx="12" cy="12" r="4.9" />
  <circle cx="12" cy="12" r="1.4" />
</>);

const Route = mk(<>
  <circle cx="5.4" cy="5.4" r="2.2" />
  <circle cx="18.6" cy="18.6" r="2.2" />
  <path d="M7.6 5.4h6.8a3.4 3.4 0 0 1 0 6.8H9.6a3.4 3.4 0 0 0 0 6.8h6.8" />
</>);

const Pin = mk(<>
  <path d="M12 21.2s6.9-5.7 6.9-10.8a6.9 6.9 0 1 0-13.8 0c0 5.1 6.9 10.8 6.9 10.8Z" />
  <circle cx="12" cy="10.2" r="2.6" />
</>);

const Clock = mk(<>
  <circle cx="12" cy="12" r="8.8" />
  <path d="M12 6.9V12l3.3 2" />
</>);

const Hourglass = mk(<>
  <path d="M6.4 2.8h11.2M6.4 21.2h11.2" />
  <path d="M7.6 2.8v3.3a4.4 4.4 0 0 0 1.9 3.6l2.5 1.7-2.5 1.7a4.4 4.4 0 0 0-1.9 3.6v4.5" />
  <path d="M16.4 2.8v3.3a4.4 4.4 0 0 1-1.9 3.6L12 11.4l2.5 1.7a4.4 4.4 0 0 1 1.9 3.6v4.5" />
</>);

const CalendarBusy = mk(<>
  <path d="M4.6 5.6h14.8a1.6 1.6 0 0 1 1.6 1.6v12a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 19.2v-12a1.6 1.6 0 0 1 1.6-1.6Z" />
  <path d="M3 10h18M8 3.2v4.4M16 3.2v4.4" />
  <path d="M7 13.4h2.2M14.8 13.4H17M10.8 17h2.4" />
</>);

const Bolt = mk(<>
  <path d="M13.4 2.6 5 13.4h5.8L10 21.4 19 10.4h-6Z" />
</>);

const Rocket = mk(<>
  <path d="M12 2.6c3.4 2.7 5.2 6.5 5.2 10.5L12 17.4l-5.2-4.3c0-4 1.8-7.8 5.2-10.5Z" />
  <circle cx="12" cy="9.8" r="2.1" />
  <path d="m6.9 13.3-2.5 2.4 1.6 3.9 3.1-1.6" />
  <path d="m17.1 13.3 2.5 2.4-1.6 3.9-3.1-1.6" />
</>);

const Sprout = mk(<>
  <path d="M12 21.2v-8.6" />
  <path d="M12 12.6C12 9 9.6 6.6 6 6.6c0 3.6 2.4 6 6 6Z" />
  <path d="M12 12.6c0-3 2-5 5-5 0 3-2 5-5 5Z" />
  <path d="M7.4 21.2h9.2" />
</>);

const Flame = mk(<>
  <path d="M12 21.4c3.4 0 6-2.4 6-5.7 0-3.8-3-5.4-4.3-9.6-.2-.7-1-1-1.5-.4-1.7 1.7-2.3 3.6-2.3 5.1 0 1.3-.7 2-1.5 2s-1.5-.8-1.5-2C6.4 12 6 13.7 6 15.7c0 3.3 2.6 5.7 6 5.7Z" />
</>);

const TrendUp = mk(<>
  <path d="m3.2 16.8 5.6-5.7 3.6 3.6 7.8-8" />
  <path d="M14.6 6.7h6.2v6.2" />
  <path d="M3.2 20.8h17.6" />
</>);

const Trophy = mk(<>
  <path d="M8 4h8v4.9a4 4 0 0 1-8 0Z" />
  <path d="M8 5.6H5.2v1.6a3.1 3.1 0 0 0 3 3.1M16 5.6h2.8v1.6a3.1 3.1 0 0 1-3 3.1" />
  <path d="M12 12.9v3.5" />
  <path d="M8.6 20.6h6.8l-.9-4.2H9.5Z" />
</>);

const Star = mk(<>
  <path d="m12 3.4 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.8l6-.9Z" />
</>);

const Summit = mk(<>
  <path d="m2.6 19.8 6.4-11 3.6 6.1 2.3-3.3 6.5 8.2Z" />
  <path d="m7.2 11.9 1.8 1.4 1.8-1.4" />
  <path d="M2.6 19.8h18.8" />
</>);

const Signature = mk(<>
  <path d="M3.4 16.9c3-.8 4.4-9.2 6.6-9.2 1.9 0 .5 7.6 2.6 7.6 1.4 0 2-3 3.4-3 1.2 0 1.2 2.2 2.4 2.2.8 0 1.4-.5 1.8-1.1" />
  <path d="M3.4 20.6h17.2" />
</>);

const FlagCheck = mk(<>
  <path d="M5.2 21.4V3" />
  <path d="M5.2 3.8h13.6l-2.6 4.5 2.6 4.5H5.2Z" />
</>);

// ── Obstacles & feelings ─────────────────────────────────────────────────────
const Fog = mk(<>
  <path d="M6.4 5.2h9.2" />
  <path d="M3.8 9.2h13.4" />
  <path d="M6.6 13.2h13.6" />
  <path d="M3.4 17.2h12.4" />
  <path d="M8.2 21.2h10.6" />
</>);

const Unsteady = mk(<>
  <circle cx="12" cy="12" r="8.8" />
  <path d="m6.4 12.6 1.5-1.5 1.5 3.2 1.6-5.6 1.7 6.8 1.5-3.8 1.2 1.6h1.8" />
</>);

const BatteryLow = mk(<>
  <path d="M3.4 8.2h13.4a1.8 1.8 0 0 1 1.8 1.8v4a1.8 1.8 0 0 1-1.8 1.8H3.4a1.8 1.8 0 0 1-1.8-1.8v-4a1.8 1.8 0 0 1 1.8-1.8Z" />
  <path d="M20.8 10.6v2.8" />
  <path d="M4.8 10.6h2.4v2.8H4.8Z" />
</>);

const Puzzle = mk(<>
  <path d="M4 4.4h6.2v6.2H4Z" />
  <path d="M13.8 4.4H20v6.2h-6.2Z" />
  <path d="M4 13.8h6.2V20H4Z" />
  <path d="M13.8 13.8H20V20h-6.2Z" strokeDasharray="2.6 2.4" />
</>);

const Question = mk(<>
  <circle cx="12" cy="12" r="8.8" />
  <path d="M9.4 9.5a2.65 2.65 0 0 1 5.1.9c0 1.8-2.5 2.2-2.5 4" />
  <path d="M12 17.4h.01" />
</>);

const ThumbUp = mk(<>
  <path d="M7.2 10.4v9.4H4.8A1.8 1.8 0 0 1 3 18v-5.8a1.8 1.8 0 0 1 1.8-1.8Z" />
  <path d="m7.2 10.4 4.2-7.4a2.4 2.4 0 0 1 2.4 2.4v3.6h4.6a2 2 0 0 1 2 2.4l-1.4 6.6a2.2 2.2 0 0 1-2.2 1.8H7.2" />
</>);

const ThumbDown = mk(<>
  <path d="M7.2 13.6V4.2H4.8A1.8 1.8 0 0 0 3 6v5.8a1.8 1.8 0 0 0 1.8 1.8Z" />
  <path d="m7.2 13.6 4.2 7.4a2.4 2.4 0 0 0 2.4-2.4v-3.6h4.6a2 2 0 0 0 2-2.4L19 6a2.2 2.2 0 0 0-2.2-1.8H7.2" />
</>);

const SparkNew = mk(<>
  <path d="m12 3.2 1.6 4.3 4.3 1.6-4.3 1.6L12 15l-1.6-4.3L6.1 9.1l4.3-1.6Z" />
  <path d="m18.6 14.6.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z" />
  <path d="M5 15.4v3.2M3.4 17h3.2" />
</>);

const Repeat = mk(<>
  <path d="m16.8 2.6 3.6 3.6-3.6 3.6" />
  <path d="M20.4 6.2H6.8a3.4 3.4 0 0 0-3.4 3.4v1.6" />
  <path d="m7.2 21.4-3.6-3.6 3.6-3.6" />
  <path d="M3.6 17.8h13.6a3.4 3.4 0 0 0 3.4-3.4v-1.6" />
</>);

// ── Product & chrome ─────────────────────────────────────────────────────────
const GridMap = mk(<>
  <path d="m3 6.6 6-2.8 6 2.8 6-2.8v13.6l-6 2.8-6-2.8-6 2.8Z" />
  <path d="M9 3.8v13.6M15 6.6v13.6" />
</>);

const Sliders = mk(<>
  <path d="M5 3.6v6.2M5 14v6.4M12 3.6v9.2M12 17v3.4M19 3.6v2.8M19 10.6v9.8" />
  <circle cx="5" cy="12" r="1.9" />
  <circle cx="12" cy="15" r="1.9" />
  <circle cx="19" cy="8.4" r="1.9" />
</>);

const ShieldCheck = mk(<>
  <path d="M12 2.8 4.6 5.7v5.6c0 4.6 3.1 8.6 7.4 9.9 4.3-1.3 7.4-5.3 7.4-9.9V5.7Z" />
  <path d="m8.9 11.9 2.2 2.2 4.1-4.4" />
</>);

const EyeOff = mk(<>
  <path d="M9.5 6.3A8.9 8.9 0 0 1 12 6c5.8 0 9.4 6 9.4 6a15 15 0 0 1-3 3.6" />
  <path d="M6.2 7.8A15.3 15.3 0 0 0 2.6 12S6.2 18 12 18a8.7 8.7 0 0 0 3.5-.7" />
  <path d="m9.9 9.9a2.9 2.9 0 0 0 4.1 4.1" />
  <path d="m3.4 3.4 17.2 17.2" />
</>);

const Mail = mk(<>
  <path d="M3.4 5.8h17.2a1.4 1.4 0 0 1 1.4 1.4v9.6a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 16.8V7.2a1.4 1.4 0 0 1 1.4-1.4Z" />
  <path d="m2.4 7 9.6 6.2L21.6 7" />
</>);

const IdCard = mk(<>
  <path d="M3.4 5.4h17.2a1.4 1.4 0 0 1 1.4 1.4v10.4a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 17.2V6.8a1.4 1.4 0 0 1 1.4-1.4Z" />
  <circle cx="8.4" cy="10.6" r="2.2" />
  <path d="M5 15.6a3.6 3.6 0 0 1 6.8 0" />
  <path d="M14.6 9.6h4.6M14.6 13.2h4.6" />
</>);

const Activity = mk(<>
  <path d="M2.6 12h4l2-4.6 3.4 9.2 2.6-6 1.6 3.4h5.2" />
</>);

const Sparkle = mk(<>
  <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
  <path d="M18.6 15.4l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z" />
</>);

const Quote = mk(<>
  <path d="M9.4 6.6C6.6 7.6 5 10 5 13.2v4.2h5.4v-5.6H8.2c0-2 .6-3.3 2.2-4Z" />
  <path d="M18.4 6.6C15.6 7.6 14 10 14 13.2v4.2h5.4v-5.6h-2.2c0-2 .6-3.3 2.2-4Z" />
</>);

// ── The registry ─────────────────────────────────────────────────────────────
// Keyed by string so the dependency-free option lists (options.js is plain JS,
// no JSX) can name an icon without importing a component.
export const ICONS = {
  'heart-hand': HeartHand,
  'pulse-heart': PulseHeart,
  'organ-heart': OrganHeart,
  physician: Physician,
  people: People,
  family: Family,
  'hands-care': HandsCare,

  microscope: Microscope,
  dna: Dna,
  flask: Flask,
  atom: Atom,
  magnet: Magnet,
  petri: Petri,
  'test-tubes': TestTubes,
  books: Books,
  book: Book,
  school: School,
  mentor: Mentor,
  backpack: Backpack,
  layers: Layers,

  stethoscope: Stethoscope,
  syringe: Syringe,
  hospital: Hospital,
  observe: Observe,
  medal: Medal,
  'clipboard-plus': ClipboardPlus,
  brain: Brain,
  capsule: Capsule,
  'white-coat': WhiteCoat,

  compass: Compass,
  target: Target,
  route: Route,
  pin: Pin,
  clock: Clock,
  hourglass: Hourglass,
  'calendar-busy': CalendarBusy,
  bolt: Bolt,
  rocket: Rocket,
  sprout: Sprout,
  flame: Flame,
  'trend-up': TrendUp,
  trophy: Trophy,
  star: Star,
  summit: Summit,
  signature: Signature,
  'flag-check': FlagCheck,

  fog: Fog,
  unsteady: Unsteady,
  'battery-low': BatteryLow,
  puzzle: Puzzle,
  question: Question,
  'thumb-up': ThumbUp,
  'thumb-down': ThumbDown,
  'spark-new': SparkNew,
  repeat: Repeat,

  'grid-map': GridMap,
  sliders: Sliders,
  'shield-check': ShieldCheck,
  'eye-off': EyeOff,
  mail: Mail,
  'id-card': IdCard,
  activity: Activity,
  sparkle: Sparkle,
  quote: Quote,
};

/**
 * Render an icon by name. Unknown names fall back to the neutral activity mark
 * rather than throwing or rendering a gap — an option with a typo'd icon should
 * still be answerable.
 */
export function Icon({ name, size = 20, stroke = 1.55, style }) {
  const Cmp = ICONS[name] || Activity;
  return <Cmp size={size} stroke={stroke} style={style} />;
}

export default Icon;
