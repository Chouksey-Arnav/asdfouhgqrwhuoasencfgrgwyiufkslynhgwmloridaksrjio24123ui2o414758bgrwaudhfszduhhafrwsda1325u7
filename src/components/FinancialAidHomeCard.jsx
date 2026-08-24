import React, { useMemo } from 'react';
import { Handshake, ChevronRight, CalendarDays, Trophy, DollarSign } from 'lucide-react';
import { C, glass, glass2, pill, tint, R } from '../lib/theme';
import { parseScholarshipNotes } from '../lib/scholarshipNotes';

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 86400000);
}

/**
 * Home's Financial Aid card — the fix for "I track a scholarship and nothing happens". Before
 * this, a tracked scholarship only ever surfaced again inside the Financial Aid tab itself (or, if
 * it happened to carry a real deadline, as one more line in the generic Timeline card). Nothing on
 * Home ever named a scholarship by name. This reads the same `scholarships` rows FinancialAidPanel
 * shows and mirrors the tracked-list treatment there: real deadline first, the researched prose
 * deadline as a fallback, org/eligibility pulled from the same structured notes.
 *
 * Deliberately absent when nothing is tracked (matches MyPlanCard/TodayPlanNudge's own
 * conditional-render pattern) — a card advertising an empty state isn't information.
 */
export default function FinancialAidHomeCard({ scholarships = [], accent = C.green, onOpen }) {
  const { rows, nextDeadline, totalAwarded, awardedCount } = useMemo(() => {
    const withDetails = scholarships.map(s => ({ s, details: parseScholarshipNotes(s.notes) }));
    const dated = withDetails
      .filter(x => x.s.deadline)
      .map(x => ({ ...x, days: daysUntil(x.s.deadline) }))
      .filter(x => x.days >= 0)
      .sort((a, b) => a.days - b.days);
    // Keyed by id, not object identity — `dated` maps its entries into new spread objects, so an
    // `.includes(x)` check against the original `withDetails` objects would never match and every
    // dated/undated row would also leak into `rest`, duplicating it in the final list.
    const usedIds = new Set(dated.map(x => x.s.id));
    const undated = withDetails.filter(x => !x.s.deadline && !['awarded', 'denied'].includes(x.s.status));
    undated.forEach(x => usedIds.add(x.s.id));
    const rest = withDetails.filter(x => !usedIds.has(x.s.id));
    const totalAwarded = scholarships.filter(s => s.status === 'awarded').reduce((sum, s) => sum + (s.amount || 0), 0);
    const awardedCount = scholarships.filter(s => s.status === 'awarded').length;
    return {
      rows: [...dated, ...undated, ...rest].slice(0, 3),
      nextDeadline: dated[0] || null,
      totalAwarded, awardedCount,
    };
  }, [scholarships]);

  if (!scholarships.length) return null;

  return (
    <div onClick={onOpen} style={{
      ...glass({ padding: 20 }), cursor: 'pointer', transition: 'border-color .2s',
      background: `linear-gradient(120deg,${tint(accent, 0.08)},rgba(255,255,255,0.02) 55%)`,
      border: `1px solid ${tint(accent, 0.22)}`,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = tint(accent, 0.4)}
      onMouseLeave={e => e.currentTarget.style.borderColor = tint(accent, 0.22)}>
      <div style={{ ...R({ justifyContent: 'space-between' }), marginBottom: 12 }}>
        <div style={R({ gap: 8 })}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: tint(accent, 0.16), border: `1px solid ${tint(accent, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Handshake size={16} color={accent} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Financial Aid & Scholarships</span>
        </div>
        <span style={{ ...R({ gap: 4 }), fontSize: 11, color: C.t3, fontWeight: 600 }}>View all<ChevronRight size={13} /></span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={pill(C.s3, C.t2, { fontFamily: C.FM })}>{scholarships.length} tracked</span>
        {nextDeadline && (
          <span style={{ ...pill(nextDeadline.days <= 14 ? C.roseDim : C.s3, nextDeadline.days <= 14 ? C.roseL : C.t2, { fontFamily: C.FM }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CalendarDays size={11} />{nextDeadline.s.name} in {nextDeadline.days}d
          </span>
        )}
        {awardedCount > 0 && (
          <span style={{ ...pill(C.greenDim, C.greenL, { fontFamily: C.FM }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Trophy size={11} />${totalAwarded.toLocaleString()} won
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ s, details, days }) => (
          <div key={s.id} style={{ ...glass2({ padding: '8px 12px' }), display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: s.status === 'awarded' ? tint(C.gold, 0.16) : tint(accent, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.status === 'awarded' ? <Trophy size={12} color={C.goldL} /> : <DollarSign size={12} color={accent} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
              <div style={{ fontSize: 10.5, color: C.t3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {days != null ? `Due in ${days}d` : details?.deadlineText || (details?.org ?? 'No deadline confirmed yet')}
                {details?.org && days != null ? ` · ${details.org}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
