// The debrief: everything that was deliberately hidden while the clock was running.
//
// During a station the candidate sees the door card and the opening line. They do not see the
// actor's escalation rules, the rater's checklist, or the way candidates usually fail — showing
// any of those beforehand would turn the station into a comprehension exercise. Afterwards they
// are the entire value of the thing, and this is where they appear.
//
// Order is an argument. The score first, because it is what everyone scrolls to. Then what the
// rater was actually listening for, which is the part that generalises. Then the common failure,
// which is where most students find themselves. Then the model's specific feedback on their own
// words. The archetype's hinge goes last, because it is the sentence worth remembering after
// everything else has faded.
import React from 'react';
import { Sparkles, Ear, TriangleAlert, Users, ClipboardList, Target } from 'lucide-react';
import { C, glass2, R, CC, pill, tint } from '../../lib/theme';
import { archetypeOf } from '../../lib/mmiCircuit';

function Block({ icon: Icon, title, color = C.t3, children }) {
  return (
    <div style={{ ...glass2({ padding: 14, marginTop: 10 }), background: C.s2 }}>
      <div style={R({ gap: 7, marginBottom: 8 })}>
        <Icon size={12} color={color} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function DebriefCard({ station, answer, result, accent = C.violet }) {
  const arch = archetypeOf(station);

  return (
    <div style={CC({ gap: 0 })}>
      {/* The model's read on their actual words, capped by the deterministic rubric. */}
      {result ? (
        <>
          <div style={{ ...glass2({ padding: 15 }), background: `linear-gradient(135deg, ${tint(accent, 0.06)}, transparent 60%)` }}>
            <div style={R({ gap: 8, marginBottom: 9, justifyContent: 'space-between', flexWrap: 'wrap' })}>
              <div style={R({ gap: 7 })}>
                <Sparkles size={13} color={accent} />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: accent }}>Rater feedback</span>
              </div>
              <span style={pill(tint(accent, 0.14), accent, { fontSize: 10 })}>{result.anchor.label}</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6, marginBottom: 10 }}>{result.anchor.blurb}</div>
            <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{result.text}</div>
          </div>

          {result.reasons?.length > 0 && (
            <Block icon={TriangleAlert} title="What to work on next" color={C.amberL}>
              <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.reasons.map((r, i) => <li key={i} style={{ fontSize: 12, color: C.t2, lineHeight: 1.65 }}>{r}</li>)}
              </ul>
            </Block>
          )}

          {result.strengths?.length > 0 && (
            <Block icon={Target} title="What actually worked" color={C.greenL}>
              <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.strengths.map((r, i) => <li key={i} style={{ fontSize: 12, color: C.t2, lineHeight: 1.65 }}>{r}</li>)}
              </ul>
            </Block>
          )}
        </>
      ) : (
        <div style={{ ...glass2({ padding: 14 }), background: C.s2 }}>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.7 }}>
            {answer?.trim()
              ? 'This station could not be rated — the rater could not be reached. It is excluded from the average rather than counted as a low score.'
              : 'Nothing was written in this station. That is a real result and it is recorded as one, but there is nothing here to give feedback on.'}
          </div>
        </div>
      )}

      {/* The rater's checklist, withheld until now on purpose. */}
      <Block icon={Ear} title="What the rater was listening for">
        <ul style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {station.raterLooksFor.map((r, i) => <li key={i} style={{ fontSize: 12, color: C.t2, lineHeight: 1.65 }}>{r}</li>)}
        </ul>
      </Block>

      <Block icon={TriangleAlert} title="How this station is usually failed" color={C.rose}>
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7 }}>{station.commonFailure}</div>
      </Block>

      {/* The actor's brief. This is the half that was hidden, and it is where a student finds out
          why the conversation went the way it did. */}
      {station.actor && (
        <Block icon={Users} title="What the actor was playing">
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7 }}>
            <div><strong style={{ color: C.t1 }}>Who: </strong>{station.actor.who}</div>
            <div style={{ marginTop: 6 }}><strong style={{ color: C.t1 }}>What they wanted: </strong>{station.actor.wants}</div>
            <div style={{ marginTop: 6 }}><strong style={{ color: C.roseL }}>What made it worse: </strong>{station.actor.escalates}</div>
            <div style={{ marginTop: 6 }}><strong style={{ color: C.greenL }}>What opened them up: </strong>{station.actor.softens}</div>
          </div>
        </Block>
      )}

      {station.task && (
        <Block icon={ClipboardList} title="What your partner was holding">
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7 }}>
            <div>{station.task.partnerHas}</div>
            {station.task.twist && <div style={{ marginTop: 6 }}><strong style={{ color: C.amberL }}>The twist: </strong>{station.task.twist}</div>}
          </div>
        </Block>
      )}

      {/* Follow-ups the interviewer had in hand. Worth seeing even when there was no time for them:
          knowing where a station was going to go is how you learn to answer the first question
          differently. */}
      {station.followUps?.length > 0 && (
        <Block icon={Ear} title="Where this station was going next">
          <ol style={{ margin: 0, paddingLeft: 17, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {station.followUps.map((f, i) => <li key={i} style={{ fontSize: 12, color: C.t2, lineHeight: 1.65 }}>{f}</li>)}
          </ol>
        </Block>
      )}

      <div style={{ ...glass2({ padding: 13, marginTop: 10 }), borderLeft: `3px solid ${accent}` }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.t3, marginBottom: 6 }}>
          {arch.label} — what separates the bands
        </div>
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7 }}>{arch.hinge}</div>
      </div>
    </div>
  );
}
