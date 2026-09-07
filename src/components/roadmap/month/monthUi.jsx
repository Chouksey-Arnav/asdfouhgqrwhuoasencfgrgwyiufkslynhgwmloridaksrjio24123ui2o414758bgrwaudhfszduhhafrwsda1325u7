import React from 'react';
import {
  Circle, CircleDot, CheckCircle2, PauseCircle, XCircle, HelpCircle, Mountain,
  Wallet, MapPinOff, Ban, Clock, CalendarSearch, AlertTriangle, Sparkles,
  GraduationCap, ClipboardList, Trophy, Users, HeartHandshake, FolderOpen, Heart, FileText,
} from 'lucide-react';
import { C, tint, pill } from '../../../lib/theme';

// ─────────────────────────────────────────────────────────────────────────────
// The month plan's shared vocabulary: one place for what every state, domain,
// priority and date LOOKS like, so eleven surfaces read as one system.
//
// ── The rendering rule, restated ───────────────────────────────────────────
// NOTHING in this folder prints a raw date. Every date goes through
// <ActionDate>, which reads `timing.precision` and refuses to render an
// unconfirmed catalog date as if it were exact — it becomes a month with the
// confirm-it-yourself line attached instead. This mirrors <ItemDate> in
// ../roadmapUi.jsx exactly (see that file's header for why the rule is a
// component rather than a convention), and scripts/verifyMonthPlan.mjs greps
// this folder and fails the build on a raw interpolation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every state a student can put an action into, with the words and the color it
 * gets. The negative states are deliberately NOT red-and-shameful: choosing not
 * to do something is a decision the plan wants, and a UI that punishes it gets
 * silence instead of information.
 */
export const STATE_META = {
  not_started: { label: 'Not started', short: 'To do', icon: Circle, color: C.t3, group: 'open' },
  in_progress: { label: 'In progress', short: 'Doing', icon: CircleDot, color: C.sky, group: 'open' },
  complete: { label: 'Complete', short: 'Done', icon: CheckCircle2, color: C.green, group: 'closed' },
  paused: { label: 'Paused for now', short: 'Paused', icon: PauseCircle, color: C.amber, group: 'deferred' },
  declined: { label: 'Not doing this', short: 'Declined', icon: XCircle, color: C.t3, group: 'closed' },
  not_interested: { label: 'Not interested', short: 'Not for me', icon: XCircle, color: C.t3, group: 'closed' },
  too_difficult: { label: 'Too difficult right now', short: 'Too hard', icon: Mountain, color: C.violet, group: 'blocked' },
  too_expensive: { label: 'Too expensive', short: 'Costs too much', icon: Wallet, color: C.violet, group: 'blocked' },
  too_far_away: { label: 'Too far away', short: 'Too far', icon: MapPinOff, color: C.violet, group: 'blocked' },
  no_longer_eligible: { label: 'No longer eligible', short: 'Not eligible', icon: Ban, color: C.rose, group: 'blocked' },
  needs_help: { label: 'I need help with this', short: 'Need help', icon: HelpCircle, color: C.fuchsia, group: 'open' },
};

/** The order the state menu offers them in — progress first, then honest blockers. */
export const STATE_MENU = [
  'in_progress', 'complete', 'needs_help', 'paused',
  'too_difficult', 'too_expensive', 'too_far_away', 'no_longer_eligible',
  'not_interested', 'declined',
];

export const DOMAIN_META = {
  academics: { label: 'Academics', icon: GraduationCap, color: C.blue },
  testing: { label: 'Testing', icon: ClipboardList, color: C.cyan },
  application: { label: 'Applications', icon: FileText, color: C.sky },
  opportunity: { label: 'Opportunity', icon: Trophy, color: C.amber },
  activity: { label: 'Activities', icon: Users, color: C.teal },
  leadership: { label: 'Leadership', icon: Sparkles, color: C.fuchsia },
  service: { label: 'Service', icon: HeartHandshake, color: C.green },
  portfolio: { label: 'Portfolio', icon: FolderOpen, color: C.violet },
  wellbeing: { label: 'You', icon: Heart, color: C.rose },
};

export const domainMeta = (id) => DOMAIN_META[id] || DOMAIN_META.portfolio;

export const PRIORITY_META = {
  critical: { label: 'Do this first', color: C.rose },
  high: { label: 'High', color: C.amber },
  standard: { label: 'Standard', color: C.sky },
  optional: { label: 'If you have time', color: C.t3 },
};

export const URGENCY_META = {
  missed: { label: 'Overdue', color: C.rose, icon: AlertTriangle },
  'this-week': { label: 'This week', color: C.rose, icon: Clock },
  soon: { label: 'Coming up', color: C.amber, icon: Clock },
  later: { label: 'Later this month', color: C.t3, icon: Clock },
  flexible: { label: 'Any time this month', color: C.t3, icon: Circle },
  settled: { label: 'Settled', color: C.green, icon: CheckCircle2 },
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2027-03-25' → 'Mar 25'. Never parses as UTC (see src/lib/dateUtils.js). */
export function fmtDay(key, { withYear = false, monthOnly = false } = {}) {
  if (!key) return '';
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m) return String(key);
  if (monthOnly || !d) return `${MONTHS_SHORT[m - 1]}${withYear ? ` ${y}` : ''}`;
  return `${MONTHS_SHORT[m - 1]} ${d}${withYear ? `, ${y}` : ''}`;
}

/**
 * The ONLY way a month-plan date reaches the screen.
 *
 * `precision` decides everything:
 *   'exact'    — a confirmed published date, or one the student entered. Shown
 *                as a date, flatly, because it is one.
 *   'typical'  — a normal-year date from the opportunity catalog. Shown as a
 *                MONTH with "typical — confirm it" attached, never as a day,
 *                because the day moves and a student who diarizes ours is worse
 *                off than one who looks it up.
 *   'flexible' — no date at all; the plan's own wording ("Week 2", "All month").
 * There is no prop that turns the caveat off.
 */
export function ActionDate({ timing, size = 11.5, showIcon = true }) {
  const t = timing || {};
  const flexible = !t.dueDate;
  const exact = t.precision === 'exact';
  const color = exact ? C.t2 : flexible ? C.t3 : (C.violetL || C.violet);
  const Icon = flexible ? Clock : exact ? Clock : CalendarSearch;
  const text = flexible
    ? (t.dueLabel || 'This month')
    : exact
      ? fmtDay(t.dueDate)
      : `around ${fmtDay(t.dueDate, { monthOnly: true })} — typical, confirm it`;
  return (
    <span
      title={exact || flexible ? undefined : 'Our catalog holds the usual date for this. The exact day moves year to year — check the official page before you rely on it.'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: size, color, fontFamily: C.FM }}
    >
      {showIcon && <Icon size={size} color={color} />}
      {text}
    </span>
  );
}

/** A small labeled chip. Used for effort, priority, domain and state. */
export function Chip({ icon: Icon, label, color = C.t3, title = null, strong = false }) {
  return (
    <span
      title={title || undefined}
      style={pill(tint(color, strong ? 0.22 : 0.12), color, { gap: 8, fontSize: 10.5, whiteSpace: 'nowrap' })}
    >
      {Icon && <Icon size={11} color={color} />}
      {label}
    </span>
  );
}

/** The "why this matters" expander every card carries. Collapsed by default; never hidden. */
export function WhyThis({ children, open, onToggle, accent = C.violet, label = 'Why this matters' }) {
  if (!children) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!!open}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: accent, fontSize: 11.5, fontWeight: 600, fontFamily: C.FB,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}
      >
        <HelpCircle size={12} color={accent} />
        {open ? 'Hide why' : label}
      </button>
      {open && (
        <div style={{
          marginTop: 8, fontSize: 12, color: C.t2, lineHeight: 1.6,
          borderLeft: `2px solid ${tint(accent, 0.4)}`, paddingLeft: 8,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** A thin progress bar. Used for the cycle, the weeks, and the service pace. */
export function Meter({ pct, color = C.green, height = 6, label = null }) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
        style={{ height, borderRadius: height, background: tint(color, 0.15), overflow: 'hidden' }}
      >
        {/* scaleX rather than width: a width transition relayouts the bar on every
            frame, and this is rendered several times on one screen. */}
        <div style={{
          width: '100%', height: '100%', background: color, borderRadius: height,
          transform: `scaleX(${clamped / 100})`, transformOrigin: 'left',
          transition: 'transform 320ms ease',
        }} />
      </div>
    </div>
  );
}
