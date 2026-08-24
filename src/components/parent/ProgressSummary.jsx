// One student's progress, as a parent sees it.
//
// ── What this screen is deliberately not ────────────────────────────────────
// It is not a monitoring tool. Every field here comes from the allowlist in
// api/_lib/parentSummary.js — effort and outcomes — and the layout follows the same logic: the
// three things a parent can actually act on come first (are they showing up, is it working, what
// happened lately), and nothing on this page tells a parent what their child wrote, asked the
// coach, or read at 11pm.
//
// The other design rule is that every number is given something to mean. "412 XP" tells a parent
// nothing; "412 XP · level 1" with a streak and a 28-day calendar next to it tells them whether
// the habit is forming, which is the only question they were really asking.
import React from 'react';
import {
  Flame, TrendingUp, TrendingDown, Minus, Award, BookOpenCheck, Target, CalendarDays, Sparkles, Brain,
} from 'lucide-react';
import { C, glass, glass2, autoGrid, CC, R, pill, tint } from '../../lib/theme';
import { buildParentDigest } from '../../lib/parentDigest';

const fmtDate = (value) => {
  if (!value) return null;
  const d = new Date(typeof value === 'number' ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * One number, with the thing it is actually evidence of written underneath it.
 *
 * `means` is not decoration and it is not a tooltip. A parent reading "412 XP" has no idea whether
 * that is a lot, and the honest answer — that it is a participation count and not an achievement —
 * is the kind of thing a product usually leaves the reader to get wrong in whichever direction
 * suits their mood. Written out, in the smallest type on the card, permanently visible: a number
 * whose meaning you have to guess at is a number that will be used in an argument.
 */
function Stat({ icon: Icon, hue, label, value, sub, means }) {
  return (
    <div style={glass2({ display: 'flex', gap: 12, alignItems: 'flex-start' })}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: tint(hue, 0.13), border: `1px solid ${tint(hue, 0.28)}`,
      }}>
        <Icon size={15} color={hue} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, letterSpacing: 'calc(-0.17px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{sub}</div>}
        {means && <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>{means}</div>}
      </div>
    </div>
  );
}

/**
 * Eight weeks of study days.
 *
 * A streak number collapses the only thing a parent needs to see — the shape of the gaps. "14-day
 * streak" and "studied every day for two weeks after three weeks off" are the same number and
 * completely different situations, and only one of them is worth a conversation.
 */
function Calendar({ days }) {
  if (!days?.length) return null;
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <div>
      <div style={{ display: 'flex', gap: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}${day.active ? ' — studied' : ''}`}
                style={{
                  height: 9, borderRadius: 4,
                  background: day.active ? C.green : C.b1,
                  border: day.active ? 'none' : `1px solid ${C.b0}`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: C.t3, marginTop: 4 }}>
        <span>8 weeks ago</span><span>Today</span>
      </div>
    </div>
  );
}

/** A change, with its direction stated in words as well as colour — see the note in Testing below. */
function Delta({ value, unit = '' }) {
  if (value == null) return null;
  const flat = value === 0;
  const up = value > 0;
  const hue = flat ? C.t3 : (up ? C.green : C.amber);
  const Icon = flat ? Minus : (up ? TrendingUp : TrendingDown);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: hue, fontSize: 12, fontWeight: 700 }}>
      <Icon size={13} />
      {flat ? 'no change' : `${up ? '+' : ''}${value}${unit}`}
    </span>
  );
}

/**
 * The Medabrain read on the week, in words.
 *
 * A parent who is handed six numbers and a heatmap has to decide for themselves what it means, and
 * the most common wrong reading of a quiet week is the one that starts an argument. So the digest
 * goes FIRST, above the numbers it is describing, and it ends in something to say rather than
 * something to enforce — see the rules at the top of lib/parentDigest.js.
 */
function Digest({ summary }) {
  const digest = buildParentDigest(summary);
  const hue = { strong: C.green, steady: C.blue, quiet: C.amber, new: C.t3 }[digest.tone] || C.blue;
  return (
    <div style={glass({ padding: 20, borderColor: tint(hue, 0.28), background: tint(hue, 0.05) })}>
      <div style={R({ gap: 8, marginBottom: 8 })}>
        <Brain size={15} color={hue} />
        <span style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{digest.headline}</span>
      </div>
      <div style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.55 }}>{digest.body}</div>
      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.55, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.b1}` }}>
        {digest.suggestion}
      </div>
    </div>
  );
}

export default function ProgressSummary({ summary }) {
  if (!summary) return null;
  const { student, effort, coursework, milestones } = summary;

  // A brand-new account is not an error state and must not look like one. Everything below renders
  // zeros perfectly well; this just replaces a wall of noughts with the one sentence that is
  // actually true and useful.
  const neverStarted = !effort?.lastActiveAt && !coursework?.quizzes?.taken && !coursework?.lessonsStarted;

  return (
    <div style={CC({ gap: 16 })}>
      <Digest summary={summary} />

      <div style={glass({ padding: 20 })}>
        <div style={R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 })}>
          <div>
            <div style={{ fontSize: 19, letterSpacing: 'calc(-0.23px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
              {student?.name || 'Your student'}
            </div>
            <div style={{ fontSize: 12.5, color: C.t3 }}>
              {student?.gradeLevel ? `${student.gradeLevel} · ` : ''}
              {effort?.lastActiveAt ? `Last studied ${fmtDate(effort.lastActiveAt)}` : 'Not started yet'}
            </div>
          </div>
          {effort?.streakDays > 0 && (
            <span style={pill(tint(C.orange, 0.14), C.orangeL)}>
              <Flame size={12} style={{ marginRight: 4 }} /> {effort.streakDays}-day streak
            </span>
          )}
        </div>

        {neverStarted ? (
          <div style={{ fontSize: 13, color: C.t2, marginTop: 12, lineHeight: 1.55 }}>
            They haven't started studying yet. Nothing to report — this page will fill in on its own
            once they do, usually within a few minutes of their first session.
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 8 }}>
              Study days
            </div>
            <Calendar days={effort?.calendar} />
          </div>
        )}
      </div>

      {/* auto-fit rather than G(2,…,mobile): the mobile flag collapsed this to a single
          full-width column on every screen size, so four cards became a four-row tower with the
          right half of the page empty. See autoGrid in lib/theme.js. */}
      {/* 320 rather than something smaller so these land two-up on a laptop instead of three with
          an orphan on the next row. These are not compact tiles — each carries a value, a label, a
          sub-line and two lines explaining what the number is evidence of (see `means` on Stat) —
          and at a third of the page that explanation wraps to four cramped lines. Two-up gives it
          room and still collapses to a single column on a phone. */}
      <div style={autoGrid(320, 12)}>
        <Stat
          icon={CalendarDays} hue={C.green}
          value={`${effort?.activeDaysLast7 ?? 0} of 7`}
          label="Days studied this week"
          sub={`${effort?.activeDaysLast28 ?? 0} of the last 28`}
          means="A day counts if they did any work at all. Three or four regular days beats one long one."
        />
        <Stat
          icon={Sparkles} hue={C.violet}
          value={(effort?.xp ?? 0).toLocaleString()}
          label="XP earned"
          sub={`Level ${effort?.level ?? 1}`}
          means="Time put in, not ability. It only ever goes up, so it is worth watching the rate rather than the total."
        />
        <Stat
          icon={BookOpenCheck} hue={C.blue}
          value={coursework?.lessonsVerified ?? 0}
          label="Lessons passed"
          sub={`${coursework?.unitsVerified ?? 0} units verified`}
          means="Passed means they answered the check questions correctly — not just that they opened it."
        />
        <Stat
          icon={Target} hue={C.cyan}
          value={coursework?.quizzes?.averageScore != null ? `${coursework.quizzes.averageScore}%` : '—'}
          label="Average quiz score"
          sub={coursework?.quizzes?.taken ? `${coursework.quizzes.taken} quizzes taken` : 'No quizzes yet'}
          means="Practice, not exams. Quizzes get harder as they progress, so a dip often means new material."
        />
      </div>

      {coursework?.quizzes?.trend != null && (
        <div style={glass2({ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' })}>
          <span style={{ fontSize: 12.5, color: C.t2 }}>Recent quizzes vs earlier ones:</span>
          <Delta value={coursework.quizzes.trend} unit=" points" />
        </div>
      )}


      {milestones?.length > 0 && (
        <div style={glass({ padding: 20 })}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 12 }}>
            Recently
          </div>
          <div style={CC({ gap: 8 })}>
            {milestones.map((m, i) => (
              <div key={`${m.kind}-${m.at}-${i}`} style={R({ gap: 8 })}>
                <Award size={14} color={C.amberL} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.t1, textTransform: 'capitalize' }}>{m.label}</span>
                {m.score != null && <span style={{ fontSize: 12, color: C.t3 }}>({m.score}%)</span>}
                <span style={{ fontSize: 11.5, color: C.t3, marginLeft: 'auto', flexShrink: 0 }}>{fmtDate(m.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/*
        Said on the dashboard, not only in the invitation email. A parent who forgets where the
        line is starts asking questions the data cannot answer, and a student who is unsure what is
        visible stops using the coach honestly — which costs them the most useful part of the app.
        Cheap to state; expensive to leave implicit.
      */}
      <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6, padding: '0px 4px' }}>
        You're seeing effort and results. Coach conversations, lesson notes, and essay drafts stay
        private to {student?.name || 'your student'} — by design, so this stays a place they can
        think out loud.
      </div>
    </div>
  );
}
