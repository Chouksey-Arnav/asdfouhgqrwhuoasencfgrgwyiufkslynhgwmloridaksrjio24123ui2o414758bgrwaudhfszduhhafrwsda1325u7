import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarDays, Milestone, History, Hourglass, AlertTriangle, CheckCircle2, ChevronRight,
  Sparkles, GraduationCap, Info, ArrowRight, Filter, ListChecks, FileText,
  Stethoscope, TrendingUp, UserCheck, Wallet, ScrollText, Compass, Trophy, BookOpen,
} from 'lucide-react';
import { C, glass, glass2, R, CC, pill, tint, btnSm, btnG } from '../lib/theme';
import { listItems } from '../lib/dataApi';
import { buildPortfolioSnapshot } from '../lib/portfolioData';
import { buildTimeline, TIMELINE_KINDS, KIND_BY_ID } from '../lib/timeline';
import PanelHero, { SectionTitle } from './ui/PanelHero';

// The engine returns theme KEY names (it has to stay importable from plain Node
// for scripts/verifyTimeline.mjs), so the palette lookup happens here.
const kindColor = (kind) => C[KIND_BY_ID[kind]?.colorKey] || C.blue;

const KIND_ICON = {
  application: ScrollText, testing: TrendingUp, aid: Wallet, essays: FileText,
  recommenders: UserCheck, experience: Stethoscope, academics: BookOpen,
  decision: Trophy, planning: Compass, logged: History,
};

// Status drives the whole visual language of a row: what color it borrows, what
// the right-hand chip says, and whether it reads as pressure or as a record.
const STATUS_META = {
  missed:   { label: 'slipped past', color: () => C.rose,   icon: AlertTriangle },
  today:    { label: 'today',        color: () => C.amber,  icon: Hourglass },
  soon:     { label: 'soon',         color: () => C.amber,  icon: Hourglass },
  upcoming: { label: null,           color: (k) => kindColor(k), icon: null },
  done:     { label: 'done',         color: () => C.green,  icon: CheckCircle2 },
  past:     { label: null,           color: () => C.t3,     icon: null },
};

const fmtDate = (d, withYear = true) =>
  new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });

const countdown = (days) => (days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`);

/**
 * Loads everything the timeline engine needs, in one place.
 *
 * Shared with the Home card (TimelineNextCard below) so the dashboard and the
 * Portfolio tab are always reading the same generated timeline rather than two
 * that drift apart — the whole point of putting the logic in src/lib/timeline.js.
 */
export function useTimeline(user) {
  const [timeline, setTimeline] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [snapshot, testScores] = await Promise.all([
        buildPortfolioSnapshot().catch(() => ({})),
        listItems('test_scores').catch(() => []),
      ]);
      if (!alive) return;
      try {
        setTimeline(buildTimeline({
          user,
          snapshot,
          testScores: testScores || [],
          sat: { projection: user?.satProjection || null, diagnosticDone: !!user?.satDiagnostic },
        }));
      } catch {
        setTimeline(buildTimeline({ user, snapshot: {}, testScores: [] }));
      }
    })();
    return () => { alive = false; };
    // Rebuilt when the identity inputs change; portfolio rows are re-fetched on mount,
    // which is when this panel is opened.
  }, [user?.gradeStage, user?.gradeStageYear, user?.examDate, user?.apIb, user?.testTrack, user?.onboardingTargetScore]);
  return timeline;
}

export default function PortfolioTimeline({ accent = C.indigo, user = null, onNavigate, isMobile = false }) {
  const timeline = useTimeline(user);
  const [kindFilter, setKindFilter] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const go = useCallback((action) => {
    if (!action || !onNavigate) return;
    onNavigate(action.tab, action.view);
  }, [onNavigate]);

  const filtered = useMemo(() => {
    if (!timeline) return null;
    if (!kindFilter) return timeline.groups;
    return timeline.groups
      .map(g => ({ ...g, items: g.items.filter(e => e.kind === kindFilter) }))
      .filter(g => g.items.length);
  }, [timeline, kindFilter]);

  if (!timeline) return null;

  const { stats, gradeLabel, years, next } = timeline;
  const gradYear = years?.gradYear;
  const kindsPresent = TIMELINE_KINDS.filter(k => stats.byKind[k.id]);

  const hero = (
    <PanelHero tourTag="portfolio-deep-timeline" icon={Milestone} color={accent} color2={C.sky} m={isMobile}
      eyebrow="Portfolio"
      title="Your Timeline"
      sub={gradeLabel
        ? `Built for a ${gradeLabel}${gradYear ? `, class of ${gradYear}` : ''} — your own deadlines merged with the dates a ${gradeLabel.toLowerCase()} on your track actually has to care about, and nothing from four years away.`
        : 'Your deadlines, test dates, and milestones in one chronological feed. Set your grade level in Settings and this fills in with the dates your class year actually has to care about.'}
      stats={[
        { value: stats.upcoming, label: 'ahead', color: C.skyL },
        ...(stats.missed ? [{ value: stats.missed, label: 'slipped', color: C.roseL }] : []),
        ...(stats.done ? [{ value: stats.done, label: 'handled', color: C.greenL }] : []),
        ...(next ? [{ value: next.days === 0 ? 'today' : `${next.days}d`, label: 'to next', color: next.days <= 14 ? C.amberL : C.indigoL }] : []),
      ]}/>
  );

  if (!gradeLabel) {
    return (
      <div style={CC({ gap: 18 })}>
        {hero}
        <EmptyNote accent={accent} icon={GraduationCap}
          text="We don't know what grade you're in, so we won't guess your deadlines. Set your class year in Settings and this timeline fills in immediately — a freshman and a senior get completely different calendars, and showing you the wrong one is worse than showing you none."
          cta={onNavigate ? { label: 'Open Settings', onClick: () => onNavigate('settings', null) } : null}/>
      </div>
    );
  }

  return (
    <div style={CC({ gap: 18 })}>
      {hero}

      {/* Where these dates come from — said once, plainly, so a generated date is never
          mistaken for one the student confirmed. */}
      <div style={{ ...glass2({ padding: '11px 14px' }), display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <Info size={13} color={C.t3} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6 }}>
          <b style={{ color: C.t2 }}>{stats.fromYourData}</b> of these came from what you've logged — those dates are exact.{' '}
          <b style={{ color: C.t2 }}>{stats.generated}</b> are typical-year dates generated from your class year, courses, test track, and college list; they're marked <span style={pill(C.s3, C.t3, { fontSize: 9 })}>typical</span> and should be confirmed on the official site before you plan around them.
        </div>
      </div>

      {/* Category filter — the timeline gets long on purpose, so it needs a way to
          answer "just show me the money stuff". */}
      {kindsPresent.length > 1 && (
        <div style={R({ gap: 7, flexWrap: 'wrap' })}>
          <button onClick={() => setKindFilter(null)} style={{
            ...pill(kindFilter ? C.s3 : tint(accent, 0.16), kindFilter ? C.t3 : accent, { fontSize: 10.5, gap: 5, border: `1px solid ${kindFilter ? C.b1 : tint(accent, 0.35)}` }),
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
          }}><Filter size={10} />All ({stats.upcoming})</button>
          {kindsPresent.map(k => {
            const col = C[k.colorKey] || C.blue;
            const on = kindFilter === k.id;
            const Ic = KIND_ICON[k.id] || CalendarDays;
            return (
              <button key={k.id} onClick={() => setKindFilter(on ? null : k.id)} title={k.blurb} style={{
                ...pill(on ? tint(col, 0.18) : C.s3, on ? col : C.t3, { fontSize: 10.5, gap: 5, border: `1px solid ${on ? tint(col, 0.4) : C.b1}` }),
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
              }}><Ic size={10} />{k.label}</button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <EmptyNote accent={accent} icon={ListChecks} text="Nothing in that category is coming up. Clear the filter to see the rest of your timeline." />
      )}

      {filtered.map(group => (
        <TimelineGroup key={group.key} group={group} accent={accent} openId={openId} setOpenId={setOpenId} onGo={go} isMobile={isMobile} />
      ))}

      {/* Already handled — kept out of the feed so the timeline reads as work left,
          but visible on demand so the student can see the engine noticing. */}
      {timeline.done.length > 0 && (
        <CollapsibleList
          title={`Already handled (${timeline.done.length})`} icon={CheckCircle2} color={C.green}
          open={showDone} onToggle={() => setShowDone(v => !v)}
          blurb="Milestones your logged data already satisfies. Nothing here is nagging you — it's the app noticing you're ahead."
          items={timeline.done} onGo={go} />
      )}

      {timeline.past.length > 0 && (
        <CollapsibleList
          title={`Your record (${timeline.past.length})`} icon={History} color={C.t3}
          open={showPast} onToggle={() => setShowPast(v => !v)}
          blurb="Everything already behind you — hours logged, scores earned, dates that have passed."
          items={timeline.past} onGo={go} dim />
      )}
    </div>
  );
}

function TimelineGroup({ group, accent, openId, setOpenId, onGo, isMobile }) {
  const missed = group.key === 'missed';
  const color = missed ? C.rose : accent;
  return (
    <div style={{
      ...glass({ padding: isMobile ? 14 : 18 }),
      background: `linear-gradient(160deg,${tint(color, missed ? 0.09 : 0.05)},rgba(255,255,255,0.02) 45%)`,
      border: missed ? `1px solid ${tint(C.rose, 0.3)}` : undefined,
    }}>
      <SectionTitle icon={missed ? AlertTriangle : Hourglass} color={color}>{group.label} ({group.items.length})</SectionTitle>
      {group.blurb && <div style={{ fontSize: 11.5, color: C.t3, marginTop: -8, marginBottom: 14, lineHeight: 1.55 }}>{group.blurb}</div>}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: 10, bottom: 10, width: 2, background: `linear-gradient(180deg,${tint(color, 0.35)},${tint(color, 0.04)})`, borderRadius: 2 }} />
        <div style={CC({ gap: 8 })}>
          {group.items.map(e => (
            <TimelineRow key={e.id} e={e} open={openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} onGo={onGo} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ e, open, onToggle, onGo, dim = false }) {
  const meta = STATUS_META[e.status] || STATUS_META.upcoming;
  const col = meta.color(e.kind);
  const kc = kindColor(e.kind);
  const Ic = KIND_ICON[e.kind] || CalendarDays;
  const StatusIcon = meta.icon;
  const pressing = e.status === 'missed' || e.status === 'today' || e.status === 'soon';

  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative', paddingLeft: 34, opacity: dim ? 0.6 : 1 }}>
      <div style={{
        position: 'absolute', left: 8, top: 16, width: 14, height: 14, borderRadius: '50%',
        background: C.s1, border: `2.5px solid ${col}`, boxShadow: pressing ? `0 0 9px ${tint(col, 0.6)}` : 'none',
      }} />
      <div style={{
        ...glass2({ padding: '11px 13px', flex: 1, minWidth: 0 }),
        background: `linear-gradient(120deg,${tint(kc, 0.06)},rgba(255,255,255,0.02) 60%)`,
        border: `1px solid ${pressing ? tint(col, 0.4) : C.b1}`,
      }}>
        <button onClick={onToggle} style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, width: '100%', boxSizing: 'border-box',
        }} aria-expanded={open}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: tint(kc, 0.13), border: `1px solid ${tint(kc, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ic size={13} color={kc} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.t1, lineHeight: 1.35 }}>{e.title}</div>
            <div style={{ fontSize: 10.5, color: C.t3, marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>{fmtDate(e.date)}</span>
              {meta.label && <span style={{ color: col, fontWeight: 700 }}>· {e.status === 'missed' ? `${countdown(e.days)} — still open` : countdown(e.days)}</span>}
              {!meta.label && e.days >= 0 && <span>· {countdown(e.days)}</span>}
              {e.doneLabel && <span style={pill(tint(C.green, 0.14), C.greenL, { fontSize: 9 })}>{e.doneLabel}</span>}
              {e.confidence === 'typical' && <span style={pill(C.s3, C.t3, { fontSize: 9 })}>typical</span>}
              {e.confidence === 'exact' && e.source === 'profile' && <span style={pill(tint(C.sky, 0.12), C.skyL, { fontSize: 9 })}>yours</span>}
            </div>
          </div>
          {StatusIcon && <StatusIcon size={13} color={col} style={{ flexShrink: 0 }} />}
          <ChevronRight size={13} color={C.t3} style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        {open && (
          <div style={{ marginTop: 11, paddingTop: 11, borderTop: `1px solid ${C.b1}` }}>
            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.65 }}>{e.detail}</div>
            {e.why && (
              <div style={{ marginTop: 9, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <Sparkles size={11} color={C.violetL} style={{ marginTop: 3, flexShrink: 0 }} />
                <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.6, fontStyle: 'italic' }}>{e.why}</div>
              </div>
            )}
            {e.action && onGo && (
              <button onClick={() => onGo(e.action)} style={btnSm(C.s3, { marginTop: 11, fontSize: 11.5, gap: 6 })}>
                {e.action.label}<ArrowRight size={11} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CollapsibleList({ title, icon: Icon, color, open, onToggle, blurb, items, onGo, dim = false }) {
  return (
    <div style={glass({ padding: 18 })}>
      <button onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 8 }} aria-expanded={open}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em', flex: 1 }}>{title}</span>
        <ChevronRight size={14} color={C.t3} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          {blurb && <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 12, lineHeight: 1.55 }}>{blurb}</div>}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: 10, bottom: 10, width: 2, background: tint(color, 0.18), borderRadius: 2 }} />
            <div style={CC({ gap: 8 })}>
              {items.map(e => <TimelineRow key={e.id} e={e} open={false} onToggle={() => {}} onGo={onGo} dim={dim} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyNote({ accent, icon: Icon = CalendarDays, text, cta }) {
  return (
    <div style={glass({ padding: 26, textAlign: 'center' })}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: tint(accent, 0.12), border: `1px solid ${tint(accent, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <Icon size={20} color={accent} />
      </div>
      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.65, maxWidth: 520, margin: '0 auto' }}>{text}</div>
      {cta && <button onClick={cta.onClick} style={btnG({ marginTop: 14, fontSize: 12, padding: '8px 16px' })}>{cta.label}</button>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The Home-page card.
//
// Home used to show a single "next deadline" countdown built only from rows the
// student had typed into the Deadlines panel — so a student who had typed
// nothing (which is most of them, and all of the freshmen) got told they had no
// deadlines, which was false. This shows the same generated timeline the
// Portfolio tab shows, trimmed to what is genuinely next, so the dashboard is
// reminding them of real dates on day one.
// ─────────────────────────────────────────────────────────────────────────────
export function TimelineNextCard({ user, accent = C.blue, onNavigate, limit = 4 }) {
  const timeline = useTimeline(user);
  if (!timeline) return null;

  const { stats, gradeLabel } = timeline;
  const items = timeline.upcoming.slice(0, limit);

  if (!items.length) {
    return (
      <div style={{ ...glass({ padding: 16 }), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: C.t2 }}>
          {gradeLabel ? 'Nothing is coming up on your timeline yet — add your colleges and deadlines and it fills in.' : 'Set your class year in Settings and your application timeline builds itself.'}
        </div>
        {onNavigate && <button style={btnG({ fontSize: 12, padding: '8px 16px' })} onClick={() => onNavigate('portfolio', 'timeline')}>Open Timeline</button>}
      </div>
    );
  }

  const lead = items[0];
  const leadUrgent = lead.days <= 14 || lead.status === 'missed';
  const leadColor = lead.status === 'missed' ? C.roseL : leadUrgent ? C.amberL : kindColor(lead.kind);

  return (
    <div style={{ ...glass({ padding: 18 }), border: leadUrgent ? `1px solid ${tint(leadColor, 0.4)}` : undefined }}>
      <div style={R({ gap: 8, marginBottom: 12 })}>
        <Milestone size={14} color={leadColor} />
        <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: '.1em', textTransform: 'uppercase' }}>What's next</span>
        {gradeLabel && <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>{gradeLabel}</span>}
        <span style={{ flex: 1 }} />
        {onNavigate && (
          <button onClick={() => onNavigate('portfolio', 'timeline')} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: C.t3, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {stats.upcoming} ahead<ChevronRight size={12} />
          </button>
        )}
      </div>

      <div style={R({ gap: 10, alignItems: 'baseline', marginBottom: 2 })}>
        <span style={{ fontSize: 28, fontWeight: 800, color: leadColor, fontFamily: C.FD }}>
          {lead.status === 'missed' ? '!' : lead.days === 0 ? 'Today' : lead.days}
        </span>
        {lead.days > 0 && <span style={{ fontSize: 12, color: C.t3 }}>day{lead.days === 1 ? '' : 's'} until</span>}
        {lead.status === 'missed' && <span style={{ fontSize: 12, color: C.roseL }}>{countdown(lead.days)} and still open</span>}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{lead.title}</div>
      <div style={{ fontSize: 11, color: C.t3, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{fmtDate(lead.date)}</span>
        {lead.confidence === 'typical' && <span style={pill(C.s3, C.t3, { fontSize: 9 })}>typical date</span>}
      </div>
      {lead.why && <div style={{ fontSize: 11.5, color: C.t2, marginTop: 8, lineHeight: 1.6 }}>{lead.why}</div>}
      {lead.action && onNavigate && (
        <button onClick={() => onNavigate(lead.action.tab, lead.action.view)} style={btnSm(C.s3, { marginTop: 12, fontSize: 11.5, gap: 6 })}>
          {lead.action.label}<ArrowRight size={11} />
        </button>
      )}

      {items.length > 1 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.b1}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.slice(1).map(e => {
            const col = kindColor(e.kind);
            const Ic = KIND_ICON[e.kind] || CalendarDays;
            return (
              <button key={e.id} onClick={() => onNavigate?.(e.action?.tab || 'portfolio', e.action?.view || 'timeline')} style={{
                all: 'unset', cursor: onNavigate ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 9,
              }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: tint(col, 0.13), border: `1px solid ${tint(col, 0.26)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ic size={10} color={col} />
                </div>
                <span style={{ fontSize: 12, color: C.t2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                <span style={{ fontSize: 10.5, color: e.days <= 14 ? C.amberL : C.t3, fontFamily: C.FM, flexShrink: 0 }}>{e.days === 0 ? 'today' : `${e.days}d`}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
