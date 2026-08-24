import React, { useMemo, useState } from 'react';
import {
  Trophy, CalendarClock, ExternalLink, ShieldAlert, Lightbulb, Loader2, BellRing,
  Check, Wallet, MapPin, Users, ChevronDown, Info, Flag,
} from 'lucide-react';
import { C, glass, glass2, btnSm, R, CC, pill, tint, onTint } from '../../lib/theme';
import {
  PROGRAMS, PROGRAM_TIERS, HOSA_EVENTS_BY_CAT, HOSA_LEVELS, HOSA_GUIDELINES_URL, HOSA_VERIFIED,
} from '../../data/opportunityPrograms';
import {
  evaluateEligibility, nextDeadline, isFreeOrFunded, costLabel, verifiedLabel, ALERT_OFFSETS,
} from '../../lib/opportunityEligibility';

// ─────────────────────────────────────────────────────────────────────────────
// The tiered programs, the deadline board, and the HOSA event tracker.
//
// Three things a browsable catalog cannot do, all of which cost students real
// opportunities:
//
//   TIERS. A student looking at a list of 220 programs cannot tell which ones
//   an admissions reader has heard of. Three honest tiers fix that, including
//   the third one, which says out loud that a $4,000 open-enrollment summer
//   program is not a selective credential. A family deciding how to spend that
//   money is owed the sentence before they spend it.
//
//   ELIGIBILITY, UP FRONT. Age, grade and citizenship gates are a badge on the
//   card — never a surprise on the application page. And a student who is too
//   young is never dead-ended: the card tells them what to do at the age they
//   are, and offers to put the program in their Milestones for the year they
//   can apply.
//
//   DEADLINES THAT ARRIVE EARLY. The good summer programs close in December
//   through February for the FOLLOWING summer. Saving one writes the deadline
//   plus 60/30/7-day alerts into the milestone system.
// ─────────────────────────────────────────────────────────────────────────────

const toneColor = (tone) => ({ good: C.green, warn: C.amber, bad: C.rose }[tone] || C.t3);
const urgencyColor = (u) => ({ critical: C.rose, urgent: C.amber, soon: C.blue }[u] || C.t3);

export function EligibilityBadge({ verdict, compact = false }) {
  const col = toneColor(verdict.tone);
  return (
    <span style={pill(tint(col, 0.14), col, {
      fontSize: compact ? 9 : 9.5, fontWeight: 800, gap: 4,
      border: `1px solid ${tint(col, 0.28)}`,
    })}>
      {verdict.tone === 'good' ? <Check size={9.5} /> : <ShieldAlert size={9.5} />}
      {verdict.label}
    </span>
  );
}

/** The deadline, said with its precision attached — never an approximation dressed as a date. */
export function DeadlineChip({ dl }) {
  if (!dl) return null;
  if (dl.precision === 'rolling') {
    return <span style={pill(tint(C.green, 0.12), C.greenL, { fontSize: 9.5, gap: 4 })}><CalendarClock size={9.5} />No deadline</span>;
  }
  if (!dl.date) {
    return <span style={pill(C.surf2, C.t3, { fontSize: 9.5, gap: 4 })}><CalendarClock size={9.5} />Deadline varies</span>;
  }
  const col = urgencyColor(dl.urgency);
  return (
    <span style={pill(tint(col, 0.13), col, { fontSize: 9.5, gap: 4, border: `1px solid ${tint(col, 0.26)}` })}>
      <CalendarClock size={9.5} />{dl.label} · {dl.daysOut} days
    </span>
  );
}

function Fact({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div style={R({ gap: 4, alignItems: 'flex-start' })}>
      <Icon size={11} color={C.t4} style={{ marginTop: 4, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: C.t3, lineHeight: 1.5 }}>
        <b style={{ color: C.t2, fontWeight: 700 }}>{label}:</b> {value}
      </span>
    </div>
  );
}

export function ProgramCard({ program, facts, saved, saving, onSaveDeadline, isMobile }) {
  const [open, setOpen] = useState(false);
  const verdict = useMemo(() => evaluateEligibility(program, facts), [program, facts]);
  const dl = useMemo(() => nextDeadline(program), [program]);
  const col = toneColor(verdict.tone);
  const free = isFreeOrFunded(program);

  return (
    <div style={{
      ...glass({ padding: 0, overflow: 'hidden' }),
      border: `1px solid ${tint(col, 0.2)}`,
      background: `linear-gradient(150deg,${tint(col, 0.05)},rgba(255,255,255,0.02) 55%)`,
    }}>
      <div style={{ height: 2, background: `linear-gradient(90deg,${col},${tint(col, 0)})` }} />
      <div style={{ padding: isMobile ? 14 : 16, ...CC({ gap: 8 }) }}>
        {/* Eligibility rides ABOVE the name. It is the first thing read, which
            is the entire point — a student should never spend attention on a
            program they cannot enter. */}
        <div style={R({ gap: 4, flexWrap: 'wrap' })}>
          <EligibilityBadge verdict={verdict} />
          <DeadlineChip dl={dl} />
          <span style={pill(free ? tint(C.green, 0.12) : C.surf2, free ? C.greenL : C.t3, { fontSize: 9.5, gap: 4 })}>
            <Wallet size={9.5} />{costLabel(program)}
          </span>
          {program.stipend === true && <span style={pill(tint(C.gold, 0.14), C.goldL, { fontSize: 9.5 })}>Paid</span>}
          {program.remote && <span style={pill(C.surf2, C.t3, { fontSize: 9.5 })}>Remote-friendly</span>}
        </div>

        <div>
          <div style={{ fontSize: isMobile ? 13.5 : 14.5, fontWeight: 800, color: C.t1, fontFamily: C.FD, lineHeight: 1.35 }}>{program.name}</div>
          <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4 }}>{program.org}</div>
        </div>

        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>{program.why}</div>

        {/* Blocked, and what to do instead. Never a dead end. */}
        {verdict.blockers.length > 0 && (
          <div style={{ ...CC({ gap: 8, padding: '8px 12px' }), borderRadius: 8, background: tint(C.rose, 0.06), border: `1px solid ${tint(C.rose, 0.18)}` }}>
            <div style={{ fontSize: 11, color: C.roseL, fontWeight: 700 }}>{verdict.blockers.join(' ')}</div>
            {verdict.alternative && (
              <div style={R({ gap: 8, alignItems: 'flex-start' })}>
                <Lightbulb size={12} color={C.amberL} style={{ marginTop: 4, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>{verdict.alternative}</span>
              </div>
            )}
          </div>
        )}

        {verdict.notes.length > 0 && (
          <div style={CC({ gap: 4 })}>
            {verdict.notes.map((n, i) => (
              <div key={i} style={R({ gap: 4, alignItems: 'flex-start' })}>
                <Info size={10.5} color={C.t4} style={{ marginTop: 2.5, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: C.t3, lineHeight: 1.5 }}>{n}</span>
              </div>
            ))}
          </div>
        )}

        {open && (
          <div style={{ ...CC({ gap: 4 }), paddingTop: 8, borderTop: `1px solid ${C.b1}` }}>
            <Fact icon={Users} label="Who can apply" value={program.eligibility} />
            <Fact icon={CalendarClock} label="Deadline" value={dl?.note} />
            <Fact icon={CalendarClock} label="When it runs" value={program.starts?.note} />
            <Fact icon={Wallet} label="Cost" value={program.cost?.note} />
            <Fact icon={MapPin} label="Where" value={program.location} />
          </div>
        )}

        <div style={R({ gap: 8, flexWrap: 'wrap', paddingTop: 4 })}>
          {dl?.date && (
            <button type="button" disabled={saving || saved} onClick={() => onSaveDeadline(program, dl)}
              style={btnSm(saved ? tint(C.green, 0.14) : tint(C.violet, 0.16), {
                color: saved ? C.greenL : onTint(C.violet), fontSize: 11,
                border: `1px solid ${tint(saved ? C.green : C.violet, 0.3)}`,
                cursor: saved ? 'default' : 'pointer',
              })}>
              {saving ? <Loader2 size={11} className="spin" style={{ marginRight: 4 }} />
                : saved ? <Check size={11} style={{ marginRight: 4 }} />
                : <BellRing size={11} style={{ marginRight: 4 }} />}
              {saved ? 'In your Milestones' : 'Remind me — 60/30/7 days'}
            </button>
          )}
          {program.url && (
            <a href={program.url} target="_blank" rel="noreferrer"
              style={{ ...btnSm(C.surf2, { color: C.t2, fontSize: 11, textDecoration: 'none' }) }}>
              <ExternalLink size={11} style={{ marginRight: 4 }} />Official page
            </a>
          )}
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            style={btnSm('transparent', { fontSize: 11, color: C.t3, marginLeft: 'auto', border: `1px solid ${C.b1}` })}>
            <ChevronDown size={11} style={{ marginRight: 4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            {open ? 'Less' : 'The details'}
          </button>
        </div>

        <div style={{ fontSize: 9.5, color: C.t4, lineHeight: 1.5 }}>
          {verifiedLabel(program)} · dates and fees shift every cycle — confirm on the official page before you plan around them.
        </div>
      </div>
    </div>
  );
}

/**
 * The tier board. `freeOnly` is passed down from the tab's first-class toggle
 * rather than owned here, so one switch governs the whole page.
 */
export function ProgramTiersSection({
  facts, freeOnly = false, savedIds = new Set(), savingId = null, onSaveDeadline, isMobile = false,
}) {
  const [openTier, setOpenTier] = useState('admissions_moving');
  return (
    <div style={CC({ gap: 12 })}>
      {PROGRAM_TIERS.map(tier => {
        const col = C[tier.colorKey] || C.blue;
        const all = PROGRAMS.filter(p => p.tier === tier.id);
        const list = freeOnly ? all.filter(isFreeOrFunded) : all;
        const on = openTier === tier.id;
        return (
          <div key={tier.id} style={{ ...glass({ padding: 0, overflow: 'hidden' }), border: `1px solid ${tint(col, on ? 0.3 : 0.16)}` }}>
            <button type="button" onClick={() => setOpenTier(on ? null : tier.id)} aria-expanded={on}
              style={{
                width: '100%', boxSizing: 'border-box', textAlign: 'left', font: 'inherit', cursor: 'pointer',
                padding: isMobile ? '13px 14px' : '15px 18px', border: 'none',
                background: on ? `linear-gradient(135deg,${tint(col, 0.14)},${tint(col, 0.04)})` : 'transparent',
              }}>
              <div style={R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' })}>
                <span style={R({ gap: 8, minWidth: 0 })}>
                  <Trophy size={14} color={col} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{tier.label}</span>
                  <span style={pill(tint(col, 0.14), col, { fontSize: 9.5, fontFamily: C.FM })}>{list.length}</span>
                </span>
                <ChevronDown size={14} color={C.t3} style={{ transform: on ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
              </div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 4, lineHeight: 1.55, maxWidth: 720 }}>{tier.blurb}</div>
            </button>
            {on && (
              <div style={{ padding: isMobile ? '0 12px 14px' : '0 16px 16px' }}>
                {list.length === 0 ? (
                  <div style={{ fontSize: 11.5, color: C.t3, padding: '8px 4px' }}>
                    Nothing in this tier is free or funded — which, for the tier that costs thousands of dollars, is the point.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(330px,1fr))', gap: 12 }}>
                    {list.map(p => (
                      <ProgramCard key={p.id} program={p} facts={facts} isMobile={isMobile}
                        saved={savedIds.has(p.id)} saving={savingId === p.id} onSaveDeadline={onSaveDeadline} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The deadline board — the three or four things closing soonest, across every
 * tier, for the programs this student can actually enter. This is the answer to
 * the failure that most justifies the whole feature: a student who looks in
 * April and finds that February has already happened.
 */
export function DeadlineBoard({ facts, onSaveDeadline, savedIds = new Set(), savingId = null, isMobile = false }) {
  const rows = useMemo(() => (
    PROGRAMS
      .map(p => ({ p, dl: nextDeadline(p), verdict: evaluateEligibility(p, facts) }))
      .filter(r => r.dl?.date && r.verdict.status !== 'too_young' && r.p.tier !== 'pay_to_play')
      .sort((a, b) => a.dl.daysOut - b.dl.daysOut)
      .slice(0, 4)
  ), [facts]);

  if (!rows.length) return null;

  return (
    <div style={{
      ...glass({ padding: isMobile ? 15 : 18 }),
      background: `linear-gradient(120deg,${tint(C.rose, 0.08)},rgba(255,255,255,0.02) 60%)`,
      border: `1px solid ${tint(C.rose, 0.22)}`,
    }}>
      <div style={R({ gap: 8, marginBottom: 4, flexWrap: 'wrap' })}>
        <CalendarClock size={14} color={C.roseL} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', color: C.roseL }}>Closing soonest</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginBottom: 12, maxWidth: 700 }}>
        Summer programs close in the winter <em>before</em> that summer. Most students find them in April, a year late.
        Saving one puts it in your Milestones with reminders {ALERT_OFFSETS.join(', ')} days out.
      </div>
      <div style={CC({ gap: 8 })}>
        {rows.map(({ p, dl }) => {
          const col = urgencyColor(dl.urgency);
          const saved = savedIds.has(p.id);
          return (
            <div key={p.id} style={{
              ...R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', padding: '8px 12px' }),
              borderRadius: 8, background: tint(col, 0.06), border: `1px solid ${tint(col, 0.18)}`,
            }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{p.name}</span>
                <span style={{ display: 'block', fontSize: 10.5, color: C.t3, marginTop: 4 }}>
                  {dl.label} · {dl.daysOut} days away{dl.passedThisCycle ? " · this year's has already passed, so this is next cycle" : ''}
                </span>
              </span>
              <button type="button" disabled={saved || savingId === p.id} onClick={() => onSaveDeadline(p, dl)}
                style={btnSm(saved ? tint(C.green, 0.14) : tint(col, 0.16), {
                  color: saved ? C.greenL : col, fontSize: 10.5, flexShrink: 0,
                  border: `1px solid ${tint(saved ? C.green : col, 0.3)}`, cursor: saved ? 'default' : 'pointer',
                })}>
                {savingId === p.id ? <Loader2 size={10.5} className="spin" /> : saved ? <Check size={10.5} /> : <BellRing size={10.5} />}
                <span style={{ marginLeft: 4 }}>{saved ? 'Saved' : 'Remind me'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * HOSA competitive events, in HOSA's own categories, with the level a student
 * has reached in each. A chapter member's real question is never "what is
 * HOSA" — it is "which event do I enter", and a state placement that lives
 * only in a group chat never reaches the portfolio.
 */
export function HosaTracker({ value = {}, onChange, isMobile = false }) {
  const [openCat, setOpenCat] = useState(null);
  const tracked = Object.entries(value).filter(([, lvl]) => lvl && lvl !== 'none');

  function setLevel(eventId, level) {
    const next = { ...value };
    if (!level || next[eventId] === level) delete next[eventId];
    else next[eventId] = level;
    onChange(next);
  }

  return (
    <div style={CC({ gap: 12 })}>
      <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55 }}>
        HOSA's competitive events, grouped the way HOSA groups them. Mark the ones you are chasing and how far you have got —
        a regional or state placement is an <b style={{ color: C.t2 }}>honor</b>, so log it in Activities &amp; Honors too once you place.
        {' '}<a href={HOSA_GUIDELINES_URL} target="_blank" rel="noreferrer" style={{ color: C.tealL }}>HOSA's own Competitive Event Guidelines</a> are
        the authority on this year's lineup and rules — events are reviewed annually. Checked {HOSA_VERIFIED}.
      </div>

      {tracked.length > 0 && (
        <div style={R({ gap: 4, flexWrap: 'wrap' })}>
          {tracked.map(([id, lvl]) => {
            const ev = HOSA_EVENTS_BY_CAT.flatMap(c => c.events).find(e => e.id === id);
            const meta = HOSA_LEVELS.find(l => l.id === lvl);
            if (!ev || !meta) return null;
            const col = C[meta.colorKey] || C.t3;
            return <span key={id} style={pill(tint(col, 0.14), col, { fontSize: 10, gap: 4 })}><Flag size={9.5} />{ev.name} · {meta.label}</span>;
          })}
        </div>
      )}

      {HOSA_EVENTS_BY_CAT.map(cat => {
        const col = C[cat.colorKey] || C.blue;
        const on = openCat === cat.id;
        const chosen = cat.events.filter(e => value[e.id]).length;
        return (
          <div key={cat.id} style={{ ...glass2({ padding: 0, overflow: 'hidden' }), border: `1px solid ${tint(col, on ? 0.28 : 0.14)}` }}>
            <button type="button" onClick={() => setOpenCat(on ? null : cat.id)} aria-expanded={on}
              style={{
                width: '100%', boxSizing: 'border-box', textAlign: 'left', font: 'inherit', cursor: 'pointer',
                border: 'none', background: on ? tint(col, 0.09) : 'transparent', padding: isMobile ? '11px 13px' : '12px 15px',
              }}>
              <div style={R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' })}>
                <span style={R({ gap: 8, minWidth: 0 })}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: C.t1 }}>{cat.label}</span>
                  <span style={pill(tint(col, 0.13), col, { fontSize: 9, fontFamily: C.FM })}>{cat.events.length}</span>
                  {chosen > 0 && <span style={pill(tint(C.green, 0.13), C.greenL, { fontSize: 9 })}>{chosen} tracked</span>}
                </span>
                <ChevronDown size={13} color={C.t3} style={{ transform: on ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
              </div>
              <div style={{ fontSize: 10.5, color: C.t4, marginTop: 4 }}>{cat.blurb}</div>
            </button>
            {on && (
              <div style={{ padding: isMobile ? '0 11px 12px' : '0 15px 14px', ...CC({ gap: 8 }) }}>
                {cat.events.map(ev => {
                  const lvl = value[ev.id] || null;
                  return (
                    <div key={ev.id} style={R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap', paddingTop: 8, borderTop: `1px solid ${C.b1}` })}>
                      <span style={{ fontSize: 11.5, color: lvl ? C.t1 : C.t2, fontWeight: lvl ? 700 : 500, minWidth: 0 }}>
                        {ev.name}{ev.team ? <span style={{ color: C.t4, fontWeight: 500 }}> · team</span> : null}
                      </span>
                      <span style={R({ gap: 4, flexWrap: 'wrap' })}>
                        {HOSA_LEVELS.map(l => {
                          const active = lvl === l.id;
                          const lc = C[l.colorKey] || C.t3;
                          return (
                            <button key={l.id} type="button" onClick={() => setLevel(ev.id, l.id)} aria-pressed={active}
                              style={{
                                font: 'inherit', cursor: 'pointer', fontSize: 9.5, padding: '4px 8px', borderRadius: 999,
                                background: active ? tint(lc, 0.2) : 'transparent',
                                border: `1px solid ${active ? tint(lc, 0.42) : C.b1}`,
                                color: active ? onTint(lc) : C.t4, fontWeight: active ? 800 : 500,
                              }}>{l.label}</button>
                          );
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
