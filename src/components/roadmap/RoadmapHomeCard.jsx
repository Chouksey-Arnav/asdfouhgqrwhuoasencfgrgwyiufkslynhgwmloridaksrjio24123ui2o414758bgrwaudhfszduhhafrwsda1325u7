import React from 'react';
import { Map as MapIcon, ChevronRight, Sparkles, AlertTriangle, CheckCircle2, CalendarSearch } from 'lucide-react';
import { C, glass, R, CC, tint, pill, btn, accentFill, onTint } from '../../lib/theme';
import { nextActions, roadmapStats, currentSeason } from '../../lib/roadmap/model';
import { ItemDate, URGENCY_META, trackColor } from './roadmapUi';
import { dayKey } from '../../lib/timeline';

// The Roadmap's presence on Home.
//
// Home is a one-decision dashboard, so this card gets exactly one job: name the
// single most urgent thing on the student's year and let them open it. Not a
// summary, not a progress ring, not five rows — the Plans tab already owns
// "what am I doing today", and a second card competing with it for the same
// attention would make both worse.
//
// What this adds that Plans cannot is the twelve-month horizon: the thing that
// has to be STARTED this month for a deadline three months out. Plans has no
// way to know that, because a rolling two-day window structurally cannot.

export default function RoadmapHomeCard({ user, onOpen, onStart, isMobile = false }) {
  const roadmap = user?.roadmap || null;
  const today = dayKey();

  // No roadmap yet — a single invitation, sized like a card rather than a pitch.
  if (!roadmap) {
    return (
      <div style={{
        ...glass({ padding: isMobile ? 16 : 20 }),
        background: `linear-gradient(135deg,${tint(C.violet, 0.12)},${tint(C.fuchsia, 0.05)} 60%,transparent)`,
        border: `1px solid ${tint(C.violet, 0.26)}`,
      }}>
        <div style={{ ...R({ gap: 12, alignItems: 'flex-start' }) }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: `linear-gradient(135deg,${C.violet},${C.fuchsia})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MapIcon size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Map your next twelve months</div>
            <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6, marginTop: 5 }}>
              Every competition, program, scholarship and deadline that applies to you — with the week
              the work has to start, not just the day it closes.
            </div>
            <button onClick={onStart} style={{ ...btn(accentFill(C.violet)), color: onTint(C.violet), marginTop: 13, fontSize: 12.5, padding: '9px 16px' }}>
              <Sparkles size={13} /> Build my roadmap
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = roadmapStats(roadmap, today);
  const next = nextActions(roadmap, { limit: 1, today })[0] || null;
  const season = currentSeason(roadmap, today);

  return (
    <button onClick={onOpen} style={{
      ...glass({ padding: isMobile ? 16 : 20 }),
      width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: C.FB,
      border: `1px solid ${next && ['missed', 'critical'].includes(next.urgency) ? tint(C.rose, 0.3) : tint(C.violet, 0.22)}`,
      background: `linear-gradient(135deg,${tint(C.violet, 0.08)},transparent 70%)`,
    }}>
      <div style={{ ...R({ justifyContent: 'space-between', marginBottom: 12 }) }}>
        <span style={{ ...R({ gap: 8 }) }}>
          <MapIcon size={14} color={C.violet} />
          <span style={{ fontSize: 10, fontWeight: 800, color: C.violet, letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Roadmap{season ? ` · ${season.label}` : ''}
          </span>
        </span>
        <ChevronRight size={15} color={C.t3} />
      </div>

      {next ? (
        <>
          {/* The one thing. Urgency first, because "this needs starting now"
              is the entire message and the title is only the subject of it. */}
          <div style={{ ...R({ gap: 7, marginBottom: 7 }) }}>
            <span style={{
              ...pill(tint(URGENCY_META[next.urgency]?.color || C.t3, 0.14), URGENCY_META[next.urgency]?.color || C.t3, {
                fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
              }),
            }}>{URGENCY_META[next.urgency]?.label || 'Next'}</span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: trackColor(next.track) }} />
          </div>
          <div style={{ fontSize: isMobile ? 14 : 15.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.35, letterSpacing: '-.01em' }}>
            {next.title}
          </div>
          <div style={{ marginTop: 8 }}>
            <ItemDate item={next} size={11.5} />
          </div>
          {(next.firstMove || next.steps?.[0]) && (
            <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6, marginTop: 9 }}>
              <b style={{ color: C.t2 }}>First move: </b>{next.firstMove || next.steps[0]}
            </div>
          )}
        </>
      ) : (
        <div style={{ ...R({ gap: 9 }) }}>
          <CheckCircle2 size={16} color={C.green} />
          <span style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>
            Nothing needs starting in the next three weeks. Your year is genuinely under control.
          </span>
        </div>
      )}

      <div style={{ ...R({ gap: 14, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.b1}`, flexWrap: 'wrap' }) }}>
        <MiniStat value={`${stats.pct}%`} label="of your year done" color={C.green} />
        {stats.startNow > 0 && <MiniStat value={stats.startNow} label="need starting" color={C.amber} icon={AlertTriangle} />}
        {stats.awaitingDate > 0 && <MiniStat value={stats.awaitingDate} label="dates to look up" color={C.violet} icon={CalendarSearch} />}
      </div>
    </button>
  );
}

function MiniStat({ value, label, color, icon: Icon }) {
  return (
    <span style={{ ...R({ gap: 6 }) }}>
      {Icon && <Icon size={11} color={color} />}
      <b style={{ fontSize: 12.5, color, fontFamily: C.FM }}>{value}</b>
      <span style={{ fontSize: 10.5, color: C.t4 }}>{label}</span>
    </span>
  );
}
