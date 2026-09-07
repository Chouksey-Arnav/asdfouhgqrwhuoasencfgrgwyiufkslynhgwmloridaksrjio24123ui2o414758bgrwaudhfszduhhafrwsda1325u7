import React from 'react';
import { CalendarRange, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { C, glass, R, tint, btn, accentFill, onTint, onFill, eyebrow } from '../../../lib/theme';
import { rankedActions, planStats, currentWeek, daysLeft } from '../../../lib/monthPlan/model';
import { ActionDate, domainMeta, Meter } from './monthUi';
import { dayKey } from '../../../lib/timeline';

// ─────────────────────────────────────────────────────────────────────────────
// The month plan's presence on Home.
//
// Home is a one-decision dashboard, so this card has exactly one job: name the
// single next thing and let them open it. The twelve-month roadmap card beside
// it answers a different question ("what has to START this month for a deadline
// in three"), and the two are deliberately not merged — a card that tries to
// say both says neither.
// ─────────────────────────────────────────────────────────────────────────────

export default function MonthHomeCard({ plan, onOpen, onStart, isMobile = false, accent = C.violet }) {
  const today = dayKey();

  if (!plan) {
    return (
      <div style={{
        ...glass({ padding: isMobile ? 16 : 20 }),
        background: `linear-gradient(135deg,${tint(accent, 0.12)},${tint(C.indigo, 0.05)} 60%,transparent)`,
        border: `1px solid ${tint(accent, 0.26)}`,
      }}>
        <div style={R({ gap: 12, alignItems: 'flex-start' })}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg,${accent},${C.indigo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CalendarRange size={18} color={onFill(accent)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>What should I do this month?</div>
            <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 4 }}>
              One objective, a short ranked list with a definition of done on each, and the deadlines
              that are actually live — built from your own record, not a template.
            </div>
            <button onClick={onStart} style={{ ...btn(accentFill(accent)), color: onTint(accent), marginTop: 12, fontSize: 12.5, padding: '8px 16px' }}>
              <Sparkles size={13} /> Build my month
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = planStats(plan, today);
  const next = rankedActions(plan)[0] || null;
  const week = currentWeek(plan, today);
  const left = daysLeft(plan, today);
  const dom = next ? domainMeta(next.domain) : null;
  const DomIcon = dom?.icon || CheckCircle2;

  return (
    <button
      onClick={onOpen}
      style={{
        ...glass({ padding: isMobile ? 14 : 18 }),
        width: '100%', textAlign: 'left', cursor: 'pointer',
        border: `1px solid ${tint(accent, 0.24)}`,
        display: 'block',
      }}
    >
      <div style={R({ gap: 8, marginBottom: 8 })}>
        <CalendarRange size={15} color={accent} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{plan.objective?.headline || 'This month'}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: C.t4, fontFamily: C.FM }}>{week?.label || 'Week 1'} · {left}d left</span>
        <ChevronRight size={14} color={C.t3} />
      </div>

      <Meter pct={stats.pct} color={accent} label="Month progress" />

      {next ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ ...eyebrow(11), color: C.t4, marginBottom: 4 }}>Next up</div>
          <div style={R({ gap: 8, alignItems: 'flex-start' })}>
            <DomIcon size={14} color={dom?.color || C.t3} style={{ marginTop: 4, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, lineHeight: 1.35 }}>{next.title}</div>
              <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5, marginTop: 4 }}>{next.reason}</div>
              <div style={{ marginTop: 8 }}><ActionDate timing={next.timing} size={11} /></div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: C.t2, marginTop: 12, lineHeight: 1.55 }}>
          Everything on this month is settled — {stats.complete} of {stats.total} done. Open it to start the next four weeks.
        </div>
      )}
    </button>
  );
}
