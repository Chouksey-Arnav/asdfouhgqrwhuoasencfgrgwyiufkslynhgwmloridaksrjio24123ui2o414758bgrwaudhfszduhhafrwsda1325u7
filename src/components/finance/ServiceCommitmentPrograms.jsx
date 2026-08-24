import React, { useMemo, useState } from 'react';
import { Shield, Clock3, MapPin, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
import { C, glass2, btnSm, R, CC, pill, tint } from '../../lib/theme';
import { SERVICE_PROGRAMS, COMMITMENT_TIMING, PATHWAY_FINANCE } from '../../data/pathwayFinance';
import { serviceProgramsFor } from '../../lib/pathwayCost';

// ─────────────────────────────────────────────────────────────────────────────
// The routes that are decided before or during undergrad, and that almost no
// high schooler knows exist.
//
// ── Why these are grouped by WHEN, not by how much they pay ─────────────────
// A list sorted by award size puts HPSP at the top — a program a fifteen-year-
// old cannot apply to for six years — and buries ROTC, whose deadline is this
// autumn. Sorting by when the door closes puts the thing they are about to miss
// first, which is the only ordering that can change anything for them.
//
// ── Why `undergradImplication` is a first-class field ───────────────────────
// The brief for this section is that these programs "change which undergraduate
// a student should pick", and that is literally true in ways nobody tells them:
// an ROTC scholarship only works at a college hosting that branch's unit; state
// rural pipelines reserve professional-school seats for in-state rural
// applicants; NHSC reads for community-health experience a student has to have
// been building for years. Every entry carries that sentence and the card leads
// with it, because it is the part that is actionable at seventeen.
//
// ── Why the catch is not in small print ─────────────────────────────────────
// These are contracts, not scholarships. Four of them commit a teenager to
// years of their adult life in a place or an organisation they do not choose.
// Every card states that in the same size type as the money.
// ─────────────────────────────────────────────────────────────────────────────

const TONE = { rose: C.roseL, amber: C.amberL, blue: C.blueL, teal: C.tealL };

export default function ServiceCommitmentPrograms({ pathwayFinanceId = null, accent = C.teal }) {
  const [filter, setFilter] = useState(pathwayFinanceId || 'all');
  const [openId, setOpenId] = useState(null);

  const programs = useMemo(
    () => serviceProgramsFor(filter === 'all' ? null : filter, SERVICE_PROGRAMS, COMMITMENT_TIMING),
    [filter],
  );

  return (
    <div style={CC({ gap: 12 })}>
      <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, margin: 0 }}>
        Every one of these pays for some or all of your training in exchange for working somewhere
        specific afterwards. Several are decided <b style={{ color: C.t1 }}>before you finish high
        school</b> or while you're an undergraduate, and two of them change which colleges you should
        be applying to at all. Almost no student finds out about them in time — the ROTC deadline
        arrives in the autumn of senior year, alongside the college applications themselves.
      </p>

      <div style={R({ gap: 4, flexWrap: 'wrap' })}>
        <FilterChip id="all" label="All pathways" active={filter === 'all'} onClick={setFilter} color={accent} />
        {PATHWAY_FINANCE.slice().sort((a, b) => a.order - b.order).map(p => (
          <FilterChip key={p.id} id={p.id} label={p.short} active={filter === p.id} onClick={setFilter} color={C[p.colorKey] || accent} />
        ))}
      </div>

      <div style={CC({ gap: 8 })}>
        {programs.map(p => {
          const timing = COMMITMENT_TIMING[p.timing] || COMMITMENT_TIMING.undergrad;
          const color = TONE[timing.color] || C.blueL;
          const open = openId === p.id;
          return (
            <div key={p.id} style={{
              ...glass2({ padding: 0, overflow: 'hidden' }),
              borderLeft: `3px solid ${color}`,
              background: `linear-gradient(120deg,${tint(color, 0.05)},rgba(255,255,255,0.02) 55%)`,
            }}>
              <button type="button" onClick={() => setOpenId(open ? null : p.id)} aria-expanded={open}
                style={{ all: 'unset', boxSizing: 'border-box', display: 'block', width: '100%', cursor: 'pointer', padding: 12 }}>
                <div style={R({ gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' })}>
                  <Shield size={15} color={color} style={{ flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{p.org}</div>
                    <div style={R({ gap: 4, marginTop: 8, flexWrap: 'wrap' })}>
                      <span style={pill(tint(color, 0.14), color, { fontSize: 9 })}>{timing.label}</span>
                      {(p.pathways || []).map(id => (
                        <span key={id} style={pill(C.b0, C.t3, { fontSize: 9 })}>
                          {PATHWAY_FINANCE.find(x => x.id === id)?.short || id}
                        </span>
                      ))}
                    </div>
                  </div>
                  {open ? <ChevronUp size={15} color={C.t3} /> : <ChevronDown size={15} color={C.t3} />}
                </div>

                {/* The one line that is actionable at seventeen, always visible. */}
                <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), marginTop: 8, fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
                  <Clock3 size={12} color={color} style={{ flexShrink: 0, marginTop: 4 }} />
                  <span><b style={{ color: C.t1 }}>Decided:</b> {p.decidedBy}</span>
                </div>
              </button>

              {open && (
                <div style={{ padding: '0px 12px 12px', borderTop: `1px solid ${C.b1}`, paddingTop: 12, ...CC({ gap: 8 }) }}>
                  <Line icon={GraduationCap} color={C.greenL} title="What it pays for">{p.covers}</Line>
                  <Line icon={MapPin} color={color} title="What you owe back">{p.commitment}</Line>
                  <Line icon={Clock3} color={C.t3} title="When you apply">{p.deadline}</Line>
                  <Line icon={GraduationCap} color={C.violetL} title="What it means for your college list">
                    {p.undergradImplication}
                  </Line>
                  {p.nursing && <Line icon={Shield} color={C.fuchsia} title="For nursing specifically">{p.nursing}</Line>}
                  {p.eligibility && <Line icon={Shield} color={C.cyanL} title="Who is eligible">{p.eligibility}</Line>}
                  <div style={{
                    ...R({ gap: 8, alignItems: 'flex-start' }), ...glass2({ padding: 12 }),
                    border: `1px solid ${tint(C.amber, 0.24)}`, background: tint(C.amber, 0.05),
                  }}>
                    <AlertTriangle size={13} color={C.amberL} style={{ flexShrink: 0, marginTop: 4 }} />
                    <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
                      <b style={{ color: C.t1 }}>The catch:</b> {p.catch}
                    </span>
                  </div>
                  <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      style={{ ...btnSm(C.s3, { color: C.t2, textDecoration: 'none' }) }}>
                      <ExternalLink size={12} /> Official page
                    </a>
                    <span style={{ fontSize: 10.5, color: C.t4, alignSelf: 'center' }}>
                      Amounts and service ratios change every year — confirm current terms here before you plan around them.
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({ id, label, active, onClick, color }) {
  return (
    <button type="button" onClick={() => onClick(id)}
      style={pill(active ? tint(color, 0.16) : C.b0, active ? color : C.t3, {
        cursor: 'pointer', border: `1px solid ${active ? tint(color, 0.3) : C.b1}`, fontSize: 10.5,
      })}>
      {label}
    </button>
  );
}

function Line({ icon: Icon, color, title, children }) {
  return (
    <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 12, color: C.t2, lineHeight: 1.62 }}>
      <Icon size={12} color={color} style={{ flexShrink: 0, marginTop: 4 }} />
      <span><b style={{ color: C.t1 }}>{title}:</b> {children}</span>
    </div>
  );
}
