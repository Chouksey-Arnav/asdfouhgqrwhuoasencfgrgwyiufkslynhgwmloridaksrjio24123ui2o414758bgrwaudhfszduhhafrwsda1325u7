import React from 'react';
import {
  Trophy, GraduationCap, FlaskConical, PiggyBank, ClipboardList, HandCoins,
  Stethoscope, BookOpen, ScrollText, UserCheck, AlertTriangle, Clock, CheckCircle2,
  CircleDot, Circle, CalendarSearch, ExternalLink, Sparkles,
} from 'lucide-react';
import { C, tint, pill } from '../../lib/theme';
import { TRACK_BY_ID, displaysExactDate, dateCaption } from '../../data/roadmap/index.js';
import { linkableUrl } from '../../lib/roadmap/model';

// Shared presentation for the Roadmap tab: the vocabulary of colour, icon and
// wording that every roadmap surface uses, in one place so the tab reads as one
// system rather than six screens that happen to be adjacent.
//
// ── The rule this file exists to enforce ────────────────────────────────────
// NOTHING in the Roadmap tab prints a raw date. Every date on screen goes
// through <ItemDate>, which delegates to displaysExactDate()/dateCaption() in
// the catalog schema. That is the single mechanism standing between a student
// and a confidently-stated deadline that is wrong by three weeks, and it is a
// component rather than a convention because a convention is one careless
// `{item.due}` away from failing silently. scripts/verifyRoadmap.mjs greps this
// folder for raw date interpolation and fails the build if it finds any.

/** Track id → the palette colour it is drawn in. Keys match TRACK_BY_ID's colorKey. */
export const trackColor = (trackId) => {
  const key = TRACK_BY_ID[trackId]?.colorKey;
  return C[key] || C.blue;
};

export const TRACK_ICON = {
  application: GraduationCap,
  competition: Trophy,
  program: FlaskConical,
  scholarship: PiggyBank,
  testing: ClipboardList,
  aid: HandCoins,
  experience: Stethoscope,
  academics: BookOpen,
  essays: ScrollText,
  relationships: UserCheck,
};

/**
 * Urgency → how it looks and what it is called.
 *
 * 'start-now' is the one that earns this whole feature. It is the state of an
 * item whose deadline is comfortably far away and whose PREPARATION has to
 * begin today — the thing every other calendar in a student's life renders as
 * "in 70 days" and which is, in fact, the most urgent thing on the screen. It
 * gets the loudest treatment for that reason.
 */
export const URGENCY_META = {
  missed: { label: 'Passed', color: C.rose, icon: AlertTriangle },
  critical: { label: 'This week', color: C.rose, icon: AlertTriangle },
  'start-now': { label: 'Start now', color: C.amber, icon: Sparkles },
  soon: { label: 'Coming up', color: C.sky, icon: Clock },
  later: { label: 'Later', color: C.t3, icon: Circle },
  undated: { label: 'Find the date', color: C.violet, icon: CalendarSearch },
  settled: { label: 'Done', color: C.green, icon: CheckCircle2 },
};

export const STATUS_META = {
  todo: { label: 'Not started', icon: Circle, color: C.t3 },
  doing: { label: 'In progress', icon: CircleDot, color: C.sky },
  done: { label: 'Done', icon: CheckCircle2, color: C.green },
  skipped: { label: 'Skipped', icon: Circle, color: C.t4 },
};

export const SELECTIVITY_LABEL = {
  open: 'Open to you',
  selective: 'Selective',
  'highly-selective': 'Very selective',
  lottery: 'Long shot',
};

export const EFFORT_LABEL = {
  light: 'Light',
  moderate: 'Moderate',
  heavy: 'Heavy',
  immersive: 'Immersive',
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * '2027-03-25' → 'Mar 25, 2027'. Never parses as UTC (see src/lib/dateUtils.js).
 *
 * `monthOnly` drops the day, which is what dateCaption's compact form asks for
 * when it deliberately renders a 'typical' date vaguer than it knows it.
 */
export function fmtDate(key, { withYear = true, monthOnly = false } = {}) {
  if (!key) return '';
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || (!d && !monthOnly)) return String(key);
  if (monthOnly) return `${MONTHS_SHORT[m - 1]}${withYear ? ` ${y}` : ''}`;
  return `${MONTHS_SHORT[m - 1]} ${d}${withYear ? `, ${y}` : ''}`;
}

/** 'Mar 2027' for a YYYY-MM month key. */
export function fmtMonth(key) {
  const [y, m] = String(key || '').split('-').map(Number);
  return y && m ? `${MONTHS_SHORT[m - 1]} ${y}` : String(key || '');
}

/**
 * The ONLY way a roadmap date reaches the screen.
 *
 * A confirmed date renders as a date. An unconfirmed one renders as a window
 * with the caveat attached and a marker the student can tap to enter the real
 * one. There is no prop that turns the caveat off, on purpose.
 *
 * `compact` is not that prop. It asks for a SHORTER caption, and dateCaption's
 * compact form answers by being vaguer — a 'typical' date drops to its month —
 * so the caveat is not removed, it is made unnecessary. It exists for surfaces
 * where the item is a mark on a drawing rather than a card, and where the long
 * caption is three wrapped lines colliding with the next item. The full text
 * still travels in the tooltip, and the card behind the mark still carries it
 * in full. See the note in dateCaption().
 */
export function ItemDate({ item, size = 12, showIcon = true, onFindDate = null, compact = false }) {
  const exact = displaysExactDate(item);
  const full = dateCaption(item, (d, opts) => fmtDate(d, opts));
  const caption = compact ? dateCaption(item, (d, opts) => fmtDate(d, opts), { compact: true }) : full;
  const color = exact ? C.t2 : C.violetL || C.violet;
  const Icon = exact ? Clock : CalendarSearch;
  const body = (
    <span
      title={compact && !exact ? full : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: size, color, fontFamily: C.FM, whiteSpace: compact ? 'nowrap' : undefined }}
    >
      {showIcon && <Icon size={size} color={color} />}
      {caption}
    </span>
  );
  if (exact || !onFindDate) return body;
  return (
    <button
      type="button"
      onClick={onFindDate}
      title="Look this date up and pin it — the roadmap will re-plan around it"
      style={{
        background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
        font: 'inherit', textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: 3,
        textDecorationStyle: 'dotted', textDecorationColor: tint(C.violet, 0.6),
      }}
    >
      {body}
    </button>
  );
}

/** Small tinted chip. The tab's workhorse — used for track, selectivity, effort, cost. */
export function Chip({ children, color = C.t3, icon: Icon, title, size = 10.5 }) {
  return (
    <span title={title} style={{
      ...pill(tint(color, 0.12), color, {
        fontSize: size, fontWeight: 700, padding: '4px 8px', gap: 4,
        border: `1px solid ${tint(color, 0.24)}`,
      }),
    }}>
      {Icon && <Icon size={size} color={color} />}
      {children}
    </span>
  );
}

/** The track's own chip, with its icon and colour. */
export function TrackChip({ track, size = 10.5 }) {
  const color = trackColor(track);
  const Icon = TRACK_ICON[track];
  return <Chip color={color} icon={Icon} size={size}>{TRACK_BY_ID[track]?.short || track}</Chip>;
}

export function UrgencyChip({ urgency, size = 10.5 }) {
  const meta = URGENCY_META[urgency] || URGENCY_META.later;
  return <Chip color={meta.color} icon={meta.icon} size={size}>{meta.label}</Chip>;
}

/**
 * The "confirm this on the official site" line.
 *
 * Rendered beside every item that is not a student-entered or structurally
 * fixed date. Mirrors the persistent notice ScholarshipDatabase.jsx carries,
 * for the same reason and with the same instruction not to remove it without an
 * equivalent elsewhere.
 */
export function ConfirmNotice({ item, compact = false }) {
  if (displaysExactDate(item)) return null;
  const isLocal = item?.confidence === 'varies';
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      background: tint(C.violet, 0.07), border: `1px solid ${tint(C.violet, 0.18)}`,
      borderRadius: 8, padding: compact ? '7px 10px' : '10px 12px', marginTop: 8,
    }}>
      <CalendarSearch size={13} color={C.violet} style={{ flexShrink: 0, marginTop: 4 }} />
      <div style={{ fontSize: compact ? 10.5 : 11.5, color: C.t2, lineHeight: 1.55 }}>
        {isLocal
          ? 'This one runs on a local schedule we cannot know — your chapter, your school, your hospital. Look up the real date and pin it here, and the roadmap will re-plan everything around it.'
          : 'This is the window this program normally runs in, not a confirmed date. Check the official page before you plan around it.'}
        {linkableUrl(item?.url) && (
          <>
            {' '}
            <a href={linkableUrl(item.url)} target="_blank" rel="noopener noreferrer"
              style={{ color: C.violet, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Official page <ExternalLink size={10} style={{ verticalAlign: -1 }} />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The degraded-generation banner.
 *
 * Shown whenever roadmap.generation.degraded is true — i.e. at least one pass
 * fell back to the deterministic catalog slate. Non-negotiable: the fallback
 * roadmap is genuinely useful and it is NOT what the student was promised, and
 * quietly presenting one as the other is the failure mode
 * masterPlanGenerator.js's header documents at length.
 *
 * ── Why this banner was rewritten ───────────────────────────────────────────
 * It used to say one sentence — "Medabrain could not be reached" — under every
 * possible cause, and offer one button under every possible cause. For a
 * misconfigured deployment and for a spent daily budget, that button could not
 * work, and a student pressing it got ninety seconds of waiting and the same
 * screen back. That is the bug this component is half the fix for: the other
 * half is TERMINAL_CODES in src/lib/roadmap/generator.js, which is what lets a
 * roadmap arrive knowing WHY it degraded.
 *
 * Three rules now hold here:
 *   1. The banner names the real cause, in the student's language.
 *   2. The retry is offered only when a retry can genuinely help. When it
 *      cannot, the space is used to say what will happen instead.
 *   3. A retry that has already been tried and failed SAYS SO. A button whose
 *      only visible effect is to redraw the identical screen is a button
 *      students correctly report as broken, even when it ran perfectly.
 *
 * `lastAttempt` is { at, outcome } for a retry made in this session:
 * 'failed' when the roadmap came back degraded again, 'partial' when a repair
 * fixed some passes but not all.
 */
export function DegradedNotice({ generation, onRetry, busy = false, fullRebuild = true, lastAttempt = null }) {
  if (!generation?.degraded) return null;
  const reason = generation.degradedReason || null;
  const canRetry = !reason || reason.retryable !== false;
  const title = reason?.title || 'This roadmap was not fully written for you.';
  const detail = reason?.detail
    || 'Medabrain could not be reached for part of the build, so some of it was assembled from the deadline catalog by rule rather than by judgment. Every date on it is still real — the reasoning is what is missing.';

  return (
    <div style={{
      background: tint(C.amber, 0.1), border: `1px solid ${tint(C.amber, 0.28)}`,
      borderRadius: 12, padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <AlertTriangle size={16} color={C.amber} style={{ flexShrink: 0, marginTop: 4 }} />
        <div style={{ flex: 1, minWidth: 220, fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
          <b style={{ color: C.t1 }}>{title}</b>{' '}{detail}
        </div>
        {onRetry && canRetry && (
          <button onClick={onRetry} disabled={busy} style={{
            background: tint(C.amber, 0.18), border: `1px solid ${tint(C.amber, 0.4)}`,
            color: C.amberL || C.amber, borderRadius: 8, padding: '8px 12px',
            fontSize: 12, fontWeight: 700, fontFamily: C.FB, cursor: busy ? 'wait' : 'pointer',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {busy
              ? (fullRebuild ? 'Rebuilding…' : 'Finishing it…')
              // The label states which of the two things will actually happen, because
              // "rebuild" and "fill in the missing parts" take very different amounts of
              // time and only one of them replaces a year the student may have already
              // ticked things off in. See roadmapNeedsFullRebuild().
              : (fullRebuild ? 'Rebuild it properly' : 'Finish writing it')}
          </button>
        )}
      </div>

      {/* What the last press of that button actually did. */}
      {lastAttempt && !busy && (
        <div style={{
          marginTop: 8, paddingTop: 8, borderTop: `1px solid ${tint(C.amber, 0.22)}`,
          fontSize: 11, color: C.t3, lineHeight: 1.55,
        }}>
          {lastAttempt.outcome === 'partial'
            ? 'We just tried again and recovered part of it — the rest still would not come back. Everything you had ticked off has been kept.'
            : 'We tried again just now and it failed the same way. This is not you doing something wrong, and nothing on your roadmap was lost — the dates on it are real either way.'}
        </div>
      )}
    </div>
  );
}
