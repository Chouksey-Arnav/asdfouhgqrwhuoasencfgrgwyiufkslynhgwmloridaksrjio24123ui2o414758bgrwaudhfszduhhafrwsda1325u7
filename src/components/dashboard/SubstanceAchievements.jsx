// ─────────────────────────────────────────────────────────────────────────────
// Module 6 — Achievements, weighted by substance.
//
// ── What counts as an achievement here ──────────────────────────────────────
// Five milestones sit at the top of this module, and they were chosen by one
// rule: each names something that is true about the student outside this app.
//
//     first shadowing hours logged · pathway track complete
//     first certification earned · a hundred cards retained
//     first program saved
//
// "Three of five clinical requirements complete" is legible to a seventeen-
// year-old and to an admissions officer. "450 XP" is legible to neither, and a
// cartoon badge is legible to neither. So every row here renders its own
// denominator and its own plain-language claim, and the icons are supporting
// decoration rather than the content.
//
// ── Why the streak is small, and why it is here at all ──────────────────────
// The streak counter lives on this module and nowhere else in the product —
// specifically not on the parent dashboard, which scripts/verifyNextThree.mjs
// enforces at build time.
//
// It is kept because a self-directed nudge has some value to the student who
// wants one. It is kept SMALL because consecutive-day counting rewards students
// with free evenings and penalizes students with jobs, caregiving duties, or a
// heavy sports season — disproportionately the students this product most wants
// to serve. A student working twenty hours a week is not less committed than
// one who is not, and a metric that says otherwise is wrong about the thing it
// claims to measure. So it renders as one line under the substance milestones,
// never as a headline, never with a flame the size of the score.
//
// ── On gamification generally ───────────────────────────────────────────────
// The research is fairly consistent that gamification works mainly through
// autonomy and relatedness and barely moves perceived competence. Points and
// badges are competence signals — the one channel they do not reach through.
// That is the argument for framing everything here as progress toward something
// real rather than as a trophy case, and it is why there is no XP number, no
// level, and no leaderboard anywhere in this module.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import {
  Award, Check, Stethoscope, ShieldCheck, Layers3, Building2, Route, Flame, ChevronRight,
} from 'lucide-react';
import { C, glass, glass2, R, CC, pill, tint } from '../../lib/theme';
import { SectionTitle } from '../ui/PanelHero';
import { Bar } from '../ui/primitives';
import MilestoneFlash from './MilestoneFlash';

/**
 * The five substance milestones, in the order they are shown.
 *
 * `progress(ctx)` returns [done, target] so every row can render as a fraction.
 * A milestone with no meaningful denominator (a first-anything) uses [0|1, 1],
 * which still reads correctly as "not yet / done".
 */
export const SUBSTANCE_MILESTONES = [
  {
    key: 'first_shadowing', Icon: Stethoscope, color: C.cyan,
    title: 'First shadowing hours logged',
    claim: 'You have watched a clinician work and written it down.',
    todo: 'Log any shadowing hours — including ones you have already done.',
    destination: 'portfolio/activities',
    progress: (c) => [c.shadowingHours > 0 ? 1 : 0, 1],
    unit: null,
  },
  {
    key: 'pathway_track', Icon: Route, color: C.blue,
    title: 'Pathway track complete',
    claim: 'You have finished every lesson in a full pathway.',
    todo: 'Finish every lesson in your pathway.',
    destination: 'prep/pathways',
    progress: (c) => [c.lessonsDone, c.lessonsTotal],
    unit: 'lessons',
  },
  {
    key: 'first_certification', Icon: ShieldCheck, color: C.amber,
    title: 'First certification earned',
    claim: 'You hold a credential someone outside this app issued.',
    todo: 'Add a certification you have earned — CPR and BLS count.',
    destination: 'portfolio/activities',
    progress: (c) => [c.certifications > 0 ? 1 : 0, 1],
    unit: null,
  },
  {
    key: 'cards_100_retained', Icon: Layers3, color: C.violet,
    title: '100 cards retained',
    claim: 'A hundred facts you would still recall today.',
    // The distinction that makes this milestone worth having at all.
    todo: 'Retained, not just reviewed — cards you would still get right now.',
    destination: 'prep/flashcards',
    progress: (c) => [Math.min(c.cardsRetained, 100), 100],
    unit: 'cards',
  },
  {
    key: 'first_program', Icon: Building2, color: C.green,
    title: 'First program saved',
    claim: 'There is a real school on your list.',
    todo: 'Save one program you are curious about. It is not a commitment.',
    destination: 'portfolio/applying:colleges',
    progress: (c) => [c.colleges > 0 ? 1 : 0, 1],
    unit: null,
  },
];

export default function SubstanceAchievements({
  context = {},              // { shadowingHours, certifications, cardsRetained, colleges, lessonsDone, lessonsTotal }
  streak = 0,
  lastEarnedKey = null,      // drives the one restrained flash
  onGo, onOpenAll,
  accent = C.amber, m = false, reducedMotion = false,
}) {
  const ctx = {
    shadowingHours: 0, certifications: 0, cardsRetained: 0, colleges: 0,
    lessonsDone: 0, lessonsTotal: 0, ...context,
  };

  const rows = useMemo(() => SUBSTANCE_MILESTONES.map(msObj => {
    const [done, target] = msObj.progress(ctx);
    const safeTarget = target > 0 ? target : 1;
    return {
      ...msObj, done, target: safeTarget,
      pct: Math.min(100, Math.round((done / safeTarget) * 100)),
      earned: done >= safeTarget,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ctx.shadowingHours, ctx.certifications, ctx.cardsRetained, ctx.colleges, ctx.lessonsDone, ctx.lessonsTotal]);

  const earnedCount = rows.filter(r => r.earned).length;

  return (
    <div style={glass({ padding: m ? 18 : 22 })}>
      <div style={{ ...R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }) }}>
        <SectionTitle icon={Award} color={accent} extra={{ marginBottom: 0 }}>What you have built</SectionTitle>
        <span style={{ fontSize: 11.5, color: C.t3, fontFamily: C.FM }}>
          {earnedCount} of {rows.length} milestones
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: C.t3, margin: '8px 0 16px', lineHeight: 1.5 }}>
        Each of these is a sentence you could say to an admissions officer. None of them are points.
      </p>

      <div style={CC({ gap: 8 })}>
        {rows.map(r => {
          const { Icon } = r;
          return (
            <MilestoneFlash
              key={r.key}
              trigger={r.earned && lastEarnedKey === r.key ? r.key : null}
              reducedMotion={reducedMotion}
            >
              <div
                onClick={onGo ? () => onGo(r) : undefined}
                style={{
                  ...glass2({ padding: m ? 12 : 13 }),
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: onGo ? 'pointer' : 'default',
                  border: `1px solid ${r.earned ? tint(r.color, 0.3) : C.b1}`,
                  background: r.earned ? tint(r.color, 0.06) : undefined,
                }}
              >
                <span style={{
                  flexShrink: 0, width: 34, height: 34, borderRadius: 8,
                  background: r.earned ? tint(r.color, 0.16) : C.s2,
                  border: `1px solid ${r.earned ? tint(r.color, 0.3) : C.b1}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.earned ? <Check size={16} color={r.color} /> : <Icon size={16} color={C.t3} />}
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontSize: 13, fontWeight: 700, fontFamily: C.FD,
                    color: r.earned ? C.t1 : C.t2, lineHeight: 1.3,
                  }}>{r.title}</span>
                  {/* Earned states say what is now true; unearned states say what
                      to do. Neither ever congratulates in the abstract. */}
                  <span style={{ display: 'block', fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.4 }}>
                    {r.earned ? r.claim : r.todo}
                  </span>
                  {/* The denominator, for anything with a real one in progress. */}
                  {!r.earned && r.target > 1 && (
                    <span style={{ display: 'block', marginTop: 8 }}>
                      <span style={{ ...R({ justifyContent: 'space-between' }), marginBottom: 4 }}>
                        <span style={{ fontSize: 10.5, color: C.t3, fontFamily: C.FM }}>
                          {r.done} of {r.target}{r.unit ? ` ${r.unit}` : ''}
                        </span>
                      </span>
                      <Bar pct={r.pct} color={r.color} h={3} />
                    </span>
                  )}
                </span>

                {onGo && !r.earned && <ChevronRight size={14} color={C.t3} style={{ flexShrink: 0 }} />}
              </div>
            </MilestoneFlash>
          );
        })}
      </div>

      {/* ── The streak. One line, under everything, and only here. ───────────── */}
      <div style={{
        ...R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }),
        marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.b1}`,
      }}>
        <span style={{ ...R({ gap: 8 }) }}>
          <Flame size={13} color={streak > 0 ? C.orangeL : C.t3} />
          <span style={{ fontSize: 12, color: C.t2 }}>
            {streak > 0
              ? `${streak}-day streak`
              : 'No streak running'}
          </span>
        </span>
        {/* Said plainly, once, so the number cannot quietly become the score. */}
        <span style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.45, maxWidth: 380, textAlign: m ? 'left' : 'right' }}>
          A nudge, not a measure of commitment — days off for work, family or a match week say
          nothing about whether you are building the things above.
        </span>
      </div>

      {onOpenAll && (
        <button
          type="button" onClick={onOpenAll}
          style={{
            marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            font: 'inherit', color: C.t3, fontSize: 11.5, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          All achievements<ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}
