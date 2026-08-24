// What is on the door, and what is in the room.
//
// Split deliberately into two components, because the split is the format. During reading time you
// get the door card and nothing else — not the follow-ups, not the actor's brief, not what the
// rater is looking for. Showing a student the rater's checklist before the station would make the
// station meaningless, and showing the actor's escalation rules would let them pre-empt a
// conversation the whole point of which is that it goes somewhere they did not plan.
//
// Everything hidden here is shown afterwards, in DebriefCard, where it is the useful half.
import React from 'react';
import { DoorOpen, Users, ClipboardList, MessageSquare, Eye, AlertTriangle } from 'lucide-react';
import { C, glass2, R, CC, pill, tint } from '../../lib/theme';
import { STATION_FORMATS, ARCHETYPES } from '../../data/mmiStations';

const FORMAT_ICON = {
  interviewer: MessageSquare,
  actor: Users,
  collaborative: ClipboardList,
  policy: Eye,
  traditional: MessageSquare,
};

export function StationTags({ station, showArchetype = true }) {
  const fmt = STATION_FORMATS[station.format];
  const arch = ARCHETYPES[station.archetype];
  return (
    <div style={R({ gap: 4, flexWrap: 'wrap' })}>
      <span style={pill(tint(C.violet, 0.15), C.violetL, { fontSize: 10 })}>{fmt.label}</span>
      {showArchetype && arch && <span style={pill(C.s3, C.t2, { fontSize: 10 })}>{arch.label}</span>}
      <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>{Math.round(station.stationSeconds / 60)} min inside</span>
    </div>
  );
}

/** The card on the door. Reading time sees this and nothing else. */
export function DoorCard({ station, accent = C.violet }) {
  const Icon = FORMAT_ICON[station.format] || DoorOpen;
  return (
    <div style={{ ...glass2({ padding: 20 }), background: `linear-gradient(135deg, ${tint(accent, 0.08)}, transparent 65%)`, border: `1px solid ${tint(accent, 0.25)}` }}>
      <div style={R({ gap: 8, marginBottom: 8, justifyContent: 'space-between', flexWrap: 'wrap' })}>
        <div style={R({ gap: 8 })}>
          <Icon size={15} color={accent} />
          <span style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>On the door</span>
        </div>
        <StationTags station={station} />
      </div>
      <div style={{ fontSize: 15, letterSpacing: 'calc(-0.02px + var(--msp-letter-spacing))', fontWeight: 700, color: C.t1, fontFamily: C.FD, marginBottom: 8 }}>{station.title}</div>
      <div style={{ fontSize: 14, color: C.t1, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{station.door}</div>
      <div style={{ fontSize: 11, color: C.t3, marginTop: 12, lineHeight: 1.55 }}>
        You do not see the question until the door opens. Use this time to decide your first sentence — that is what reading time is for, and it is the part almost nobody practises.
      </div>
    </div>
  );
}

/** Inside the room: the opening line, and the brief for whoever else is in there. */
export function RoomCard({ station, accent = C.violet }) {
  const fmt = STATION_FORMATS[station.format];
  return (
    <div style={CC({ gap: 12 })}>
      <div style={{ ...glass2({ padding: 20 }), border: `1px solid ${tint(accent, 0.3)}` }}>
        <div style={R({ gap: 8, marginBottom: 8 })}>
          <DoorOpen size={14} color={accent} />
          <span style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' }}>
            {station.format === 'actor' ? 'They speak first' : 'The question'}
          </span>
        </div>
        <div style={{ fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 600, color: C.t1, fontFamily: C.FD, lineHeight: 1.5 }}>
          {station.format === 'actor' ? `“${station.prompt}”` : station.prompt}
        </div>
        <div style={{ fontSize: 11, color: C.t3, marginTop: 8, lineHeight: 1.55 }}>{fmt.blurb}</div>
      </div>

      {/* Actor stations: who they are and what they want. Not how they will escalate — that is
          the station, and it is revealed in the debrief. */}
      {station.actor && (
        <div style={{ ...glass2({ padding: 16 }), background: C.s2 }}>
          <div style={R({ gap: 8, marginBottom: 8 })}>
            <Users size={12} color={C.t3} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>Who is in the room</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>{station.actor.who}</div>
          <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 8 }}>
            Write what you would actually <strong style={{ color: C.t1 }}>say to them</strong>, in the words you would use. Describing what you would do ("I would try to make them feel supported") is the most common way this format is failed, because there is nobody for a description to be addressed to.
          </div>
        </div>
      )}

      {/* Collaborative stations: the task and its constraints, but never what the partner holds. */}
      {station.task && (
        <div style={{ ...glass2({ padding: 16 }), background: C.s2 }}>
          <div style={R({ gap: 8, marginBottom: 8 })}>
            <ClipboardList size={12} color={C.t3} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.t3 }}>The task</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>{station.task.goal}</div>
          <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 4 }}>{station.task.constraint}</div>
          <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), marginTop: 8 }}>
            <AlertTriangle size={12} color={C.amberL} style={{ flexShrink: 0, marginTop: 4 }} />
            <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
              Your partner has information you do not, and has not been told that you do not have it. Write out how you would open, what you would ask them, and how you would handle it when the two accounts do not line up.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
