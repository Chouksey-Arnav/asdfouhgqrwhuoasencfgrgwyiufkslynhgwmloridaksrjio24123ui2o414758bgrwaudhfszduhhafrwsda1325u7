// ─────────────────────────────────────────────────────────────────────────────
// Module 2 — The four-year arc.
//
// Grades nine through twelve, with the student's current position marked, what
// is behind them, and what is ahead.
//
// ── The question this answers ───────────────────────────────────────────────
// A freshman opening a pre-health app is silently asking "why does any of this
// matter yet?" It is a completely reasonable question — medical school is a
// decade away, and every other module on this dashboard is scoped to the next
// sixty days. Without an answer, the honest conclusion is "come back junior
// year", and that student never comes back.
//
// The answer is not a motivational sentence. It is the shape of the road: four
// years, each with its own job, and a marker showing which one they are
// standing in. A ninth grader who can see that ninth grade's job is "look
// around and build a habit" — and that it is a different job from twelfth
// grade's — has been told that they are on schedule, which is the actual
// reassurance they were looking for.
//
// ── Why what is BEHIND them is rendered at all ──────────────────────────────
// A senior who has been in the app since ninth grade should see three years of
// completed road behind them. That is the single most motivating thing this
// screen can show, and it is invisible on a dashboard that only renders the
// next sixty days. It is also why the marker is a position on a line rather
// than a progress bar: progress bars imply the goal is to reach the end, and
// the goal here is to be in the right place at the right time.
//
// Bands come from src/lib/gradeBand.js — the same source that decides emphasis
// everywhere else in the app, so the arc can never disagree with the rest of
// the product about what year a student is in.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Check, MapPin } from 'lucide-react';
import { C, glass, R, CC, pill, tint } from '../../lib/theme';
import { SectionTitle } from '../ui/PanelHero';
import { Milestone as MilestoneIcon } from 'lucide-react';

// The four years and the job each one actually has. Written in second person,
// because every one of these is shown to the student. Kept short enough to read
// at a glance on a phone — this is a map, not a curriculum.
const YEARS = [
  {
    grade: 'freshman', short: '9th', label: 'Ninth grade', band: 'explore',
    job: 'Look around',
    detail: 'Find out what these careers actually are, try a pathway, and build a study habit. Nothing here is graded by anyone but you.',
  },
  {
    grade: 'sophomore', short: '10th', label: 'Tenth grade', band: 'explore',
    job: 'Go get experience',
    detail: 'Start logging real hours — shadowing, volunteering, a first certification. This is the year that makes junior year possible.',
  },
  {
    grade: 'junior', short: '11th', label: 'Eleventh grade', band: 'build',
    job: 'Build the application',
    detail: 'The program list, the letters, the essays. Most of what an admissions reader sees is decided this year.',
  },
  {
    grade: 'senior', short: '12th', label: 'Twelfth grade', band: 'apply',
    job: 'Ship it',
    detail: 'Deadlines, submissions, and the decisions that come back. The work is already done; this year is delivery.',
  },
];

const BAND_COLOR = { explore: C.cyan, build: C.violet, apply: C.amber };

export default function FourYearArc({ gradeStage = null, accent = C.blue, m = false, onOpenYear }) {
  // A 'gap' student has finished the arc; an unknown grade gets no marker at
  // all rather than a guessed one, because a wrong marker here mis-states the
  // one fact the whole module exists to communicate.
  const currentIdx = YEARS.findIndex(y => y.grade === gradeStage);
  const graduated = gradeStage === 'gap';
  const known = currentIdx >= 0 || graduated;

  return (
    <div style={glass({ padding: m ? 18 : 22 })}>
      <SectionTitle icon={MilestoneIcon} color={accent}>Your four years</SectionTitle>
      <p style={{ fontSize: 12.5, color: C.t3, margin: '0 0 18px', lineHeight: 1.5 }}>
        {graduated
          ? 'You have been through all four. What is below is the road you covered.'
          : currentIdx === 0
            ? 'Every year has a different job. Ninth grade\'s job is not to have an application — it is to find out what you are aiming at.'
            : known
              ? 'Every year has a different job. Here is where you are standing, what is behind you, and what is coming.'
              : 'Every year has a different job. Add your graduation year in Settings and this will mark where you are.'}
      </p>

      {/* The road. A row of four segments on desktop, a stack on mobile — the
          horizontal metaphor stops working below about 420px and a squeezed
          four-column grid turns the labels into stacks of single words. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: m ? '1fr' : 'repeat(4, 1fr)',
        gap: m ? 10 : 8,
      }}>
        {YEARS.map((y, i) => {
          const behind = known && (graduated || i < currentIdx);
          const here = !graduated && i === currentIdx;
          const ahead = known && !graduated && i > currentIdx;
          const color = BAND_COLOR[y.band] || accent;

          return (
            <div
              key={y.grade}
              onClick={onOpenYear ? () => onOpenYear(y) : undefined}
              style={{
                position: 'relative',
                padding: m ? '12px 14px' : '14px 12px',
                borderRadius: 12,
                cursor: onOpenYear ? 'pointer' : 'default',
                background: here ? tint(color, 0.13) : behind ? C.s2 : 'transparent',
                border: `1px solid ${here ? `${color}55` : behind ? C.b1 : C.b1}`,
                // Ahead-of-you years are quieter but never hidden or blurred: the
                // rule across this app is emphasis, never access, and a student
                // who cannot read what senior year involves cannot plan for it.
                opacity: ahead ? 0.72 : 1,
                borderTop: `3px solid ${here ? color : behind ? tint(color, 0.5) : tint(color, 0.22)}`,
              }}
            >
              <div style={{ ...R({ gap: 8, justifyContent: 'space-between' }), marginBottom: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, fontFamily: C.FM,
                  color: here ? color : behind ? C.t2 : C.t3,
                  letterSpacing: 'calc(0.3px + var(--msp-letter-spacing))',
                }}>{y.short}</span>
                {behind && <Check size={13} color={C.green} aria-label="behind you" />}
                {here && (
                  <span style={{ ...R({ gap: 8 }), fontSize: 9.5, fontWeight: 800, color, letterSpacing: 'calc(0.3px + var(--msp-letter-spacing))' }}>
                    <MapPin size={11} />YOU
                  </span>
                )}
              </div>
              <div style={{
                fontSize: m ? 14 : 13.5, fontWeight: 700, fontFamily: C.FD, lineHeight: 1.25,
                color: here ? C.t1 : behind ? C.t2 : C.t2, marginBottom: 4,
              }}>{y.job}</div>
              <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.45 }}>{y.detail}</div>
            </div>
          );
        })}
      </div>

      {/* The sentence that closes the loop for the student who most needs it.
          Only shown to the two explore-band years, because a junior reading
          "you are exactly on schedule" while three deadlines are open would
          correctly stop trusting this module. */}
      {!graduated && currentIdx >= 0 && currentIdx <= 1 && (
        <div style={{
          ...R({ gap: 8 }), marginTop: 16, padding: '12px 16px', borderRadius: 8,
          background: tint(BAND_COLOR.explore, 0.08), border: `1px solid ${tint(BAND_COLOR.explore, 0.22)}`,
        }}>
          <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>
            You are not behind. Students who start in {YEARS[currentIdx].short} grade arrive at
            twelfth with years of logged hours behind them — which is the part that cannot be
            caught up on later, and the only reason any of this matters yet.
          </span>
        </div>
      )}
      {graduated && (
        <div style={{ ...R({ gap: 8 }), marginTop: 16 }}>
          <span style={pill(tint(C.green, 0.14), C.greenL)}>All four years behind you</span>
        </div>
      )}
    </div>
  );
}
