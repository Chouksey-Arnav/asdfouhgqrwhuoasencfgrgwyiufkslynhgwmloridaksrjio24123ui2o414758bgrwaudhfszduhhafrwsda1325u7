import React, { useState } from 'react';
import {
  Trophy, ExternalLink, Brain, Users, Sparkles, HeartHandshake, GraduationCap,
  ClipboardList, AlertTriangle, BellRing, Info, ArrowUpRight, ArrowDownRight,
  LogOut, ShieldQuestion, CheckCircle2,
} from 'lucide-react';
import { C, glass, glass2, btnSm, btnG, R, CC, tint, autoGrid, accentText, onFill, eyebrow } from '../../../lib/theme';
import { SectionTitle } from '../../ui/PanelHero';
import { Chip, Meter, fmtDay } from './monthUi';
import { linkableUrl } from '../../../lib/roadmap/model';

// ─────────────────────────────────────────────────────────────────────────────
// The month plan's non-action sections. One file because they are read as one
// page and share every primitive; each is a small, self-contained export the
// panel composes in the order a student thinks in.
//
// The date rule from monthUi.jsx applies throughout: opportunity deadlines are
// rendered from the LABEL the opportunity engine produced (which already
// carries its own precision — "early November", "Mar 14", "no deadline"),
// never by interpolating a raw ISO date, and a closed program says CLOSED.
// ─────────────────────────────────────────────────────────────────────────────

const STANCE_META = {
  act: { label: 'Act now', color: C.rose, blurb: 'Open, and close enough that this cycle is the one.' },
  prepare: { label: 'Prepare now', color: C.amber, blurb: 'Open, not yet due — the preparation is what happens this month.' },
  monitor: { label: 'Monitor', color: C.sky, blurb: 'No fixed date, or one set locally. Keep it in view.' },
  closed: { label: 'Closed this cycle', color: C.t3, blurb: 'This year\'s window has passed. Be early next time.' },
  blocked: { label: 'Not open to you yet', color: C.violet, blurb: 'Eligibility rules this one out for now — here is what to do instead.' },
};

/**
 * The opportunity action plan.
 *
 * Four buckets, each with an instruction rather than just a list, and the
 * closed bucket rendered as unmistakably closed. Everything here comes from the
 * app's own verified opportunity database with the date it was last checked
 * attached — never a program invented for the occasion.
 */
export function OpportunityPlan({ plan, accent = C.amber, isMobile, onAsk, onOpenDatabase }) {
  const [showClosed, setShowClosed] = useState(false);
  if (!plan) return null;
  const groups = [
    ['actNow', plan.actNow, 'act'],
    ['prepareNow', plan.prepareNow, 'prepare'],
    ['monitor', plan.monitor, 'monitor'],
  ].filter(([, rows]) => rows?.length);

  if (!groups.length && !plan.nextCycle?.length && !plan.blocked?.length) return null;

  const Row = ({ o }) => {
    const meta = STANCE_META[o.stance] || STANCE_META.monitor;
    const url = linkableUrl(o.url);
    const closed = o.stance === 'closed';
    return (
      <div style={{
        ...glass2({ padding: 12 }),
        borderLeft: `3px solid ${meta.color}`,
        opacity: closed ? 0.78 : 1,
      }}>
        <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 8 })}>
          <Chip label={meta.label} color={meta.color} strong={o.stance === 'act'} />
          {o.free && <Chip label="Free or funded" color={C.green} />}
          {o.remote && <Chip label="Remote" color={C.cyan} />}
          {o.selectivity && <Chip label={o.selectivity} color={C.t3} />}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.t1, lineHeight: 1.35 }}>{o.name}</div>
        {o.org && <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4 }}>{o.org}</div>}

        {/* The deadline, from the engine's own precision-aware label. */}
        <div style={{ fontSize: 12, color: closed ? C.t3 : C.t2, marginTop: 8, fontFamily: C.FM }}>
          {closed
            ? `CLOSED for this cycle — ${o.deadline?.label || 'window has passed'}`
            : (o.deadline?.label || 'No deadline listed')}
          {!closed && o.deadline?.daysOut != null && o.deadline?.precision === 'exact' ? ` · ${o.deadline.daysOut} days out` : ''}
        </div>
        {o.deadline?.note && (
          <div style={{ fontSize: 11, color: C.t4, marginTop: 4, lineHeight: 1.5 }}>{o.deadline.note}</div>
        )}
        {o.why && <div style={{ fontSize: 12, color: C.t2, marginTop: 8, lineHeight: 1.55 }}>{o.why}</div>}
        <div style={{ fontSize: 11.5, color: accentText(meta.color), marginTop: 8, lineHeight: 1.5 }}>{o.instruction}</div>
        {o.altUnder && (
          <div style={{ fontSize: 11.5, color: C.t2, marginTop: 8, lineHeight: 1.5 }}>
            <strong style={{ color: C.t1 }}>Instead: </strong>{o.altUnder}
          </div>
        )}
        <div style={R({ gap: 8, marginTop: 8, flexWrap: 'wrap' })}>
          <button type="button" style={btnG({ fontSize: 11.5, padding: '8px 12px', gap: 8 })} onClick={() => onAsk?.(o)}>
            <Brain size={12} color={accent} />Ask Medabrain
          </button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" style={btnSm(C.s2, { fontSize: 11.5, padding: '8px 12px', textDecoration: 'none' })}>
              <ExternalLink size={12} />Official page
            </a>
          )}
        </div>
        {o.verifiedLabel && (
          <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8, fontFamily: C.FM }}>Last checked {o.verifiedLabel}.</div>
        )}
      </div>
    );
  };

  return (
    <div style={glass({ padding: isMobile ? 14 : 18 })}>
      <SectionTitle icon={Trophy} color={accent}>Opportunity action plan</SectionTitle>
      <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, marginBottom: 12 }}>{plan.note}</div>

      {groups.map(([key, rows, stance]) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <div style={{ ...eyebrow(11), fontWeight: 700, color: STANCE_META[stance].color, marginBottom: 4 }}>
            {STANCE_META[stance].label}
          </div>
          <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 8 }}>{STANCE_META[stance].blurb}</div>
          <div style={autoGrid(isMobile ? 240 : 300, 10)}>
            {rows.map((o) => <Row key={o.ref} o={o} />)}
          </div>
        </div>
      ))}

      {plan.blocked?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...eyebrow(11), fontWeight: 700, color: STANCE_META.blocked.color, marginBottom: 4 }}>
            Not open to you yet
          </div>
          <div style={autoGrid(isMobile ? 240 : 300, 10)}>
            {plan.blocked.slice(0, 3).map((o) => <Row key={o.ref} o={o} />)}
          </div>
        </div>
      )}

      {plan.nextCycle?.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowClosed((v) => !v)} style={btnG({ fontSize: 11.5, padding: '8px 12px' })}>
            {showClosed ? 'Hide' : `Show ${plan.nextCycle.length} closed for this cycle`}
          </button>
          {showClosed && (
            <div style={{ ...autoGrid(isMobile ? 240 : 300, 10), marginTop: 8 }}>
              {plan.nextCycle.map((o) => <Row key={o.ref} o={o} />)}
            </div>
          )}
        </div>
      )}

      {onOpenDatabase && (
        <button type="button" onClick={onOpenDatabase} style={{ ...btnG({ fontSize: 11.5, padding: '8px 12px', marginTop: 12 }) }}>
          Browse the full opportunity database<ArrowUpRight size={12} />
        </button>
      )}
    </div>
  );
}

const VERDICT_META = {
  keep: { label: 'Keep', color: C.green, icon: CheckCircle2, blurb: 'Holding its weight. Keep the hours steady.' },
  deepen: { label: 'Deepen', color: C.violet, icon: ArrowUpRight, blurb: 'The next gain here is depth, not another activity.' },
  reduce: { label: 'Reduce', color: C.amber, icon: ArrowDownRight, blurb: 'Scale back to buy hours for your strongest commitments.' },
  exit: { label: 'Consider leaving', color: C.rose, icon: LogOut, blurb: 'It has not gone anywhere and it is competing for hours.' },
};

/** Keep / deepen / reduce / pause / exit, with the grade guidance stated as the adjustable default it is. */
export function ActivityPlan({ plan, accent = C.teal, isMobile, onAsk, onOpenActivities }) {
  if (!plan) return null;
  const buckets = [
    ['deepen', plan.deepen],
    ['keep', plan.keep],
    ['reduce', plan.reduce],
    ['exit', plan.exit],
  ].filter(([, rows]) => rows?.length);

  return (
    <div style={glass({ padding: isMobile ? 14 : 18 })}>
      <SectionTitle icon={Users} color={accent}>Your activities: keep, deepen, reduce</SectionTitle>
      {plan.guidance && (
        <div style={{ ...glass2({ padding: 12, marginBottom: 12 }) }}>
          <div style={R({ gap: 8, flexWrap: 'wrap' })}>
            <Chip label={`${plan.guidance.label}: about ${plan.guidance.min}-${plan.guidance.max}`} color={accent} strong />
            <Chip label={`You have ${plan.count}`} color={plan.count > plan.guidance.max ? C.amber : C.t3} />
            {plan.avoidAdding && <Chip label="Not the month to add one" color={C.rose} />}
          </div>
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginTop: 8 }}>{plan.note}</div>
        </div>
      )}
      {!buckets.length && (
        <div style={{ fontSize: 12.5, color: C.t3, lineHeight: 1.6 }}>
          Nothing logged yet. Everything you genuinely commit time to counts — a sport, an instrument, a job, looking after family, your faith community, a club, a project.
        </div>
      )}
      {buckets.map(([verdict, rows]) => {
        const meta = VERDICT_META[verdict];
        const Ic = meta.icon;
        return (
          <div key={verdict} style={{ marginBottom: 12 }}>
            <div style={R({ gap: 8, marginBottom: 8 })}>
              <Ic size={13} color={meta.color} />
              <span style={{ ...eyebrow(11), fontWeight: 700, color: meta.color }}>{meta.label}</span>
              <span style={{ fontSize: 11.5, color: C.t3 }}>— {meta.blurb}</span>
            </div>
            <div style={CC({ gap: 8 })}>
              {rows.map((a) => (
                <div key={a.id} style={{ ...glass2({ padding: 12 }), borderLeft: `3px solid ${meta.color}` }}>
                  <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{a.name}</span>
                    {a.org && <span style={{ fontSize: 11.5, color: C.t3 }}>{a.org}</span>}
                    <span style={{ flex: 1 }} />
                    <Chip label={`${a.hoursPerYear}h/yr`} color={C.t3} />
                    {a.leadership && <Chip label="Leadership" color={C.fuchsia} />}
                    <Chip label={`Depth ${a.score}/100`} color={a.score >= 60 ? C.green : a.score >= 40 ? C.amber : C.rose} />
                  </div>
                  <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginTop: 8 }}>{a.why}</div>
                  {(a.undescribed || a.noImpact) && (
                    <div style={{ fontSize: 11.5, color: C.amber, marginTop: 8 }}>
                      {a.undescribed ? 'No real description written. ' : ''}{a.noImpact ? 'No impact line — the part with the number in it.' : ''}
                    </div>
                  )}
                  <button type="button" style={btnG({ fontSize: 11, padding: '4px 8px', marginTop: 8, gap: 8 })} onClick={() => onAsk?.(a)}>
                    <Brain size={11} color={accent} />Ask about this one
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {onOpenActivities && (
        <button type="button" onClick={onOpenActivities} style={btnG({ fontSize: 11.5, padding: '8px 12px' })}>
          Open the activities builder<ArrowUpRight size={12} />
        </button>
      )}
    </div>
  );
}

/** The earned leadership ladder, with the rung this student is actually on lit. */
export function LeadershipPath({ path, ladder = [], accent = C.fuchsia, isMobile, onAsk }) {
  if (!path) return null;
  const currentIndex = ladder.findIndex((r) => r.id === path.stage);
  return (
    <div style={glass({ padding: isMobile ? 14 : 18 })}>
      <SectionTitle icon={Sparkles} color={accent}>Your leadership path</SectionTitle>
      <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6, marginBottom: 12 }}>{path.note}</div>

      <div style={CC({ gap: 8, marginBottom: 12 })}>
        {ladder.map((rung, i) => {
          const reached = currentIndex >= 0 && i <= currentIndex;
          const isNext = i === currentIndex + 1;
          const color = reached ? C.green : isNext ? accent : C.t4;
          return (
            <div key={rung.id} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '8px 8px', borderRadius: 8,
              background: isNext ? tint(accent, 0.1) : 'transparent',
              border: `1px solid ${isNext ? tint(accent, 0.3) : 'transparent'}`,
            }}>
              <span style={{
                flexShrink: 0, width: 20, height: 20, borderRadius: '50%', marginTop: 4,
                background: reached ? C.green : 'transparent', border: `1px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: reached ? onFill(C.green) : color, fontFamily: C.FM,
              }}>{i + 1}</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: reached ? C.t2 : isNext ? C.t1 : C.t3 }}>
                  {rung.label}{isNext ? ' — your next rung' : ''}
                </div>
                <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5, marginTop: 4 }}>{rung.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {path.top && (
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
          Read from <strong style={{ color: C.t1 }}>{path.top.name}</strong>{path.top.org ? ` at ${path.top.org}` : ''}, your strongest position.
        </div>
      )}
      {path.secondCandidate && (
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6, marginTop: 8 }}>
          Where it is feasible, responsibility in a second commitment reads strongly for the schools on your list — <strong style={{ color: C.t1 }}>{path.secondCandidate.name}</strong> is the credible one.
        </div>
      )}
      <div style={{ fontSize: 11.5, color: path.foundingCredible ? C.t2 : C.t3, lineHeight: 1.55, marginTop: 8 }}>
        {path.foundingCredible
          ? 'You have run something to completion, so founding a chapter, project or initiative is worth scoping — but only where there is a genuine need, a real fit, and a realistic way for you to run it.'
          : 'Founding something is not the right move yet. Own a project inside what already exists first — that is what makes the next rung credible.'}
      </div>
      <button type="button" style={btnG({ fontSize: 11.5, padding: '8px 12px', marginTop: 8, gap: 8 })} onClick={() => onAsk?.()}>
        <Brain size={12} color={accent} />Plan this with Medabrain
      </button>
    </div>
  );
}

/** The service dashboard: total, pace, cause concentration, consistency, and the honesty. */
export function ServiceDashboard({ plan, accent = C.green, isMobile, onAsk, onOpenLog }) {
  if (!plan) return null;
  const pct = plan.targetHours ? Math.min(100, (plan.total / plan.targetHours) * 100) : 0;
  const projPct = plan.targetHours && plan.projectedTotal ? Math.min(100, (plan.projectedTotal / plan.targetHours) * 100) : 0;
  return (
    <div style={glass({ padding: isMobile ? 14 : 18 })}>
      <SectionTitle icon={HeartHandshake} color={accent}>Service — self-reported</SectionTitle>

      <div style={R({ gap: 16, flexWrap: 'wrap', marginBottom: 12 })}>
        <div>
          <div style={{ fontSize: 26, letterSpacing: 'calc(-0.53px + var(--msp-letter-spacing))', lineHeight: 1.28, fontWeight: 800, color: C.t1, fontFamily: C.FM, lineHeight: 1 }}>{plan.total}</div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>hours you have logged</div>
        </div>
        {plan.monthlyRate > 0 && (
          <div>
            <div style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 700, color: C.t2, fontFamily: C.FM, lineHeight: 1 }}>{plan.monthlyRate}<span style={{ fontSize: 12 }}>/mo</span></div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>your current pace</div>
          </div>
        )}
        {plan.projectedTotal > 0 && (
          <div>
            <div style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 700, color: plan.onPace === false ? C.amber : C.green, fontFamily: C.FM, lineHeight: 1 }}>{plan.projectedTotal}</div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>projected by application season</div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <Meter pct={pct} color={accent} label="Logged hours against the planning reference" />
      </div>
      <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55 }}>
        Against a planning reference of about {plan.targetHours} cumulative hours{plan.benchmarkLabel ? ` (${plan.benchmarkLabel})` : ''}
        {projPct ? ` — you are on track for roughly ${Math.round(projPct)}% of it at today's pace.` : '.'}
      </div>
      {plan.frameNote && (
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 8, borderLeft: `2px solid ${tint(accent, 0.4)}`, paddingLeft: 8 }}>
          {plan.frameNote}
        </div>
      )}
      {plan.preferImpactOverHours && (
        <div style={{ ...glass2({ padding: 12, marginTop: 8 }), border: `1px solid ${tint(C.amber, 0.3)}` }}>
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
            At your pace the higher hour target is not realistic, and chasing it would turn volunteering into arithmetic. The honest recommendation is the deeper version: one cause, steady time, and something to point at that would not exist otherwise. That reads stronger than a larger, thinner total.
          </div>
        </div>
      )}

      <div style={{ ...autoGrid(200, 10), marginTop: 12 }}>
        {plan.topCause && (
          <div style={glass2({ padding: 12 })}>
            <div style={{ fontSize: 11, color: C.t3 }}>Where most of it is</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginTop: 4 }}>{plan.topCause}</div>
            {plan.concentrated && <div style={{ fontSize: 11.5, color: C.green, marginTop: 4 }}>Concentrated enough to read as a real specialization.</div>}
          </div>
        )}
        {plan.consistency?.totalWeeks > 0 && (
          <div style={glass2({ padding: 12 })}>
            <div style={{ fontSize: 11, color: C.t3 }}>Consistency</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginTop: 4 }}>
              {plan.consistency.activeWeeks} of {plan.consistency.totalWeeks} weeks
            </div>
            <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4 }}>Duration and rhythm count for more than the total.</div>
          </div>
        )}
        {plan.suggestedMonthlyHours > 0 && (
          <div style={glass2({ padding: 12 })}>
            <div style={{ fontSize: 11, color: C.t3 }}>Suggested this month</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginTop: 4 }}>about {Math.max(2, Math.round(plan.suggestedMonthlyHours))} hours</div>
            <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4 }}>A pace, never a quota.</div>
          </div>
        )}
      </div>

      {plan.flags?.length > 0 && (
        <div style={{ ...glass2({ padding: 12, marginTop: 12 }), border: `1px solid ${tint(C.amber, 0.28)}` }}>
          <div style={R({ gap: 8, marginBottom: 8 })}>
            <ShieldQuestion size={13} color={C.amber} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>A couple of entries worth a second look</span>
          </div>
          {plan.flags.map((f) => (
            <div key={f.id} style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginBottom: 8 }}>
              <strong style={{ color: C.t1 }}>{f.label}.</strong> {f.detail}
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.t4, lineHeight: 1.5 }}>
            Nothing here is being discounted or doubted. These hours are yours to report — we just want the record to hold up when it matters.
          </div>
        </div>
      )}

      <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
        <button type="button" style={btnG({ fontSize: 11.5, padding: '8px 12px', gap: 8 })} onClick={() => onAsk?.()}>
          <Brain size={12} color={accent} />Ask about my service record
        </button>
        {onOpenLog && (
          <button type="button" style={btnSm(C.s2, { fontSize: 11.5, padding: '8px 12px' })} onClick={onOpenLog}>
            Open the service log<ArrowUpRight size={12} />
          </button>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8, lineHeight: 1.5 }}>
        Every hour here is self-reported by you and has never been externally verified. We describe it that way everywhere, including to Medabrain.
      </div>
    </div>
  );
}

/** Academics and testing: where the numbers are, and the one next action for each. */
export function AcademicPanel({ plan, accent = C.blue, isMobile, onAsk, onOpenAcademics }) {
  if (!plan) return null;
  const t = plan.testing || {};
  return (
    <div style={glass({ padding: isMobile ? 14 : 18 })}>
      <SectionTitle icon={GraduationCap} color={accent}>Academics and testing</SectionTitle>
      <div style={autoGrid(220, 10)}>
        <div style={glass2({ padding: 12 })}>
          <div style={{ fontSize: 11, color: C.t3 }}>GPA</div>
          <div style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FM, marginTop: 4 }}>
            {plan.hasData ? plan.latestGpa : '—'}
          </div>
          {plan.hasData ? (
            <div style={{ fontSize: 11.5, color: plan.trend === 'falling' ? C.rose : plan.trend === 'rising' ? C.green : C.t3, marginTop: 4 }}>
              {plan.trend === 'falling' ? 'Trending down — this outranks everything else on the page.'
                : plan.trend === 'rising' ? 'Trending up, and readers look for exactly that.'
                  : 'Steady.'}
              {plan.comparableGpa && plan.comparableGpa !== plan.latestGpa ? ` Unweighted equivalent ${plan.comparableGpa}.` : ''}
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: C.amber, marginTop: 4 }}>Not logged yet — it is the number everything else is judged beside.</div>
          )}
        </div>

        <div style={glass2({ padding: 12 })}>
          <div style={{ fontSize: 11, color: C.t3 }}>Course rigor</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginTop: 4 }}>
            {plan.rigorRecorded ? 'Recorded' : plan.offersRigor ? 'Not recorded' : 'Not recorded'}
          </div>
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>
            {plan.rigorRecorded
              ? 'Good — readers weigh this before the number itself.'
              : plan.offersRigor
                ? 'Your school offers advanced coursework and none of your terms say which courses your GPA came from.'
                : 'Nothing recorded. We never fault a schedule for courses a school does not offer.'}
          </div>
        </div>

        <div style={glass2({ padding: 12 })}>
          <div style={{ fontSize: 11, color: C.t3 }}>SAT / ACT</div>
          <div style={{ fontSize: 20, letterSpacing: 'calc(-0.28px + var(--msp-letter-spacing))', fontWeight: 800, color: C.t1, fontFamily: C.FM, marginTop: 4 }}>
            {t.latest || '—'}
          </div>
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>
            {t.latest
              ? `${t.latestType || 'Latest score'}${t.impliedTarget ? `. Your dream and reach colleges sit around ${t.impliedTarget}${t.gap > 0 ? `, so about ${t.gap} points to find` : ' — you are there'}.` : '.'}`
              : t.psat
                ? `PSAT ${t.psat.composite} logged. No SAT or ACT sitting yet.`
                : 'Nothing logged yet.'}
          </div>
        </div>
      </div>

      {plan.currentCourses?.length > 0 && (
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 8 }}>
          Currently taking: {plan.currentCourses.join(', ')}.
        </div>
      )}
      {plan.workloadNotes && (
        <div style={{ fontSize: 11.5, color: C.t2, marginTop: 8, fontStyle: 'italic', lineHeight: 1.55 }}>
          In your words about workload: “{plan.workloadNotes}”
        </div>
      )}

      <div style={{ ...glass2({ padding: 12, marginTop: 12 }), borderLeft: `2px solid ${tint(C.cyan, 0.4)}` }}>
        <div style={R({ gap: 8, marginBottom: 4 })}>
          <ClipboardList size={12} color={C.cyan} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>About test prep</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>{t.note}</div>
      </div>

      <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
        <button type="button" style={btnG({ fontSize: 11.5, padding: '8px 12px', gap: 8 })} onClick={() => onAsk?.()}>
          <Brain size={12} color={accent} />Ask about my academics
        </button>
        {onOpenAcademics && (
          <button type="button" style={btnSm(C.s2, { fontSize: 11.5, padding: '8px 12px' })} onClick={onOpenAcademics}>
            Update grades and courses<ArrowUpRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

const SEVERITY = {
  critical: { color: C.rose, label: 'Deal with this' },
  warn: { color: C.amber, label: 'Worth attention' },
  note: { color: C.sky, label: 'Worth knowing' },
};

/** Risks and adjustments — every one carrying its remedy, because a list without one is just guilt. */
export function RiskPanel({ risks = [], accent = C.amber, isMobile, onAsk }) {
  if (!risks.length) return null;
  return (
    <div style={glass({ padding: isMobile ? 14 : 18 })}>
      <SectionTitle icon={AlertTriangle} color={accent}>Risks and adjustments</SectionTitle>
      <div style={CC({ gap: 8 })}>
        {risks.map((r) => {
          const sev = SEVERITY[r.severity] || SEVERITY.note;
          return (
            <div key={r.id} style={{ ...glass2({ padding: 12 }), borderLeft: `3px solid ${sev.color}` }}>
              <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 4 })}>
                <Chip label={sev.label} color={sev.color} strong={r.severity === 'critical'} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, lineHeight: 1.35 }}>{r.title}</div>
              {r.detail && <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginTop: 4 }}>{r.detail}</div>}
              {r.remedy && (
                <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, marginTop: 8, borderLeft: `2px solid ${tint(C.green, 0.4)}`, paddingLeft: 8 }}>
                  <strong style={{ color: C.t1 }}>What to do: </strong>{r.remedy}
                </div>
              )}
              <button type="button" style={btnG({ fontSize: 11, padding: '4px 8px', marginTop: 8, gap: 8 })} onClick={() => onAsk?.(r)}>
                <Brain size={11} color={accent} />Talk this through
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** In-app deadline reminders. Never an email, never a push — see AGENTS.md. */
export function ReminderStrip({ reminders = [], accent = C.rose, isMobile }) {
  if (!reminders.length) return null;
  return (
    <div style={{
      ...glass({ padding: isMobile ? 12 : 14 }),
      border: `1px solid ${tint(accent, 0.28)}`,
      background: `linear-gradient(120deg,${tint(accent, 0.08)},transparent 60%)`,
    }}>
      <div style={R({ gap: 8, marginBottom: 8 })}>
        <BellRing size={14} color={accent} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>Coming up</span>
        <span style={{ fontSize: 11, color: C.t4 }}>In-app only — we never email or push a reminder.</span>
      </div>
      <div style={CC({ gap: 8 })}>
        {reminders.slice(0, 5).map((r) => (
          <div key={r.id} style={R({ gap: 8, flexWrap: 'wrap' })}>
            <span style={{
              fontSize: 11, fontFamily: C.FM, color: r.daysOut <= 0 ? accent : C.t3,
              minWidth: 62,
            }}>
              {r.daysOut <= 0 ? 'today' : `in ${r.daysOut}d`}
            </span>
            <span style={{ fontSize: 12, color: C.t2, flex: 1, minWidth: 160 }}>{r.label}</span>
            {r.precision !== 'exact' && <Chip label="typical date" color={C.violet} title="An approximate date from our catalog. Confirm on the official page." />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** What the plan changed, and why — the adaptation log. */
export function AdaptationLog({ history = [], accent = C.violet, isMobile }) {
  const rows = [...history].reverse().slice(0, 8);
  if (!rows.length) return null;
  return (
    <div style={glass({ padding: isMobile ? 14 : 18 })}>
      <SectionTitle icon={Info} color={accent}>What has changed</SectionTitle>
      <div style={CC({ gap: 8 })}>
        {rows.map((h, i) => (
          <div key={`${h.at}-${i}`} style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
            <span style={{ fontFamily: C.FM, fontSize: 10.5, color: C.t4, marginRight: 8 }}>
              {fmtDay(new Date(h.at).toISOString().slice(0, 10))}
            </span>
            {h.kind === 'reprioritized'
              ? h.reason
              : <>You marked <strong style={{ color: C.t1 }}>{h.title}</strong> as {String(h.status || '').replace(/_/g, ' ')}
                {h.note ? ` (“${h.note}”)` : ''}
                {h.added?.length ? <> — so we added <strong style={{ color: C.t1 }}>{h.added.join(', ')}</strong>.</> : '.'}
              </>}
          </div>
        ))}
      </div>
    </div>
  );
}
