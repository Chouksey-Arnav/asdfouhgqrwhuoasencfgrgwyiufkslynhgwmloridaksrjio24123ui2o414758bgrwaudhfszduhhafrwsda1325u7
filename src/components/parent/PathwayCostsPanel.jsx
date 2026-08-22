import React from 'react';
import { Scale, ShieldCheck, Info } from 'lucide-react';
import { C, glass, glass2, R, CC, tint, pill } from '../../lib/theme';
import DebtTrajectoryTable from '../finance/DebtTrajectoryTable';
import { SERVICE_PROGRAMS, COMMITMENT_TIMING, PATHWAY_FINANCE } from '../../data/pathwayFinance';

// ─────────────────────────────────────────────────────────────────────────────
// The parent's copy of the debt trajectory comparison.
//
// ── Why this is on the parent dashboard at all ──────────────────────────────
// Every other screen in this app answers "is my child showing up, and is it
// working". This one answers a question no school, no college website and no
// counsellor ever puts in front of a parent, and which parents care about more
// intensely than anything else here: what does each of these careers actually
// cost, and how many years before they are earning.
//
// Parents arrive at it with a strong prior — usually that medicine is the
// ambitious answer and nursing is the modest one — and the numbers do not
// support that reading. So the framing is explicit, twice: this is not a
// ranking, and a shorter cheaper path is frequently the better answer. A parent
// who reads this table as a league table will use it to push, and pushing a
// seventeen-year-old up this table with a debt argument is the exact opposite
// of what it is for.
//
// ── Why it renders the same component the student sees ──────────────────────
// Same file, same numbers, same sources. A parent and a teenager arguing about
// a career from two different debt figures is worse than either figure alone,
// and it would happen within a month of the two surfaces being allowed to
// diverge. Only the framing sentences differ, via `audience`.
//
// ── What it does not do ─────────────────────────────────────────────────────
// No calculator. The student's calculator takes family contribution as an input
// and a parent typing a number into their child's financial plan on a dashboard
// their child cannot see is a conversation this app should not be having on
// their behalf. The parent gets the published reality and the service routes;
// the projection belongs on the screen where the two of them can look at it
// together.
// ─────────────────────────────────────────────────────────────────────────────

const TONE = { rose: C.roseL, amber: C.amberL, blue: C.blueL, teal: C.tealL };

/**
 * @param {object} props
 *   students  — the parent dashboard's student entries, used only to highlight
 *               the pathway a child has actually picked. Never required.
 */
export default function PathwayCostsPanel({ students = [] }) {
  const withPathway = students
    .map(s => ({
      name: s?.summary?.student?.name || null,
      pathway: s?.summary?.student?.pathway || null,
      studentId: s?.studentId,
    }))
    .filter(s => s.pathway);

  // With one child on a pathway we can highlight their row. With two on
  // different pathways we deliberately highlight neither — a table that
  // singles out one sibling's career on a shared family screen is not a
  // comparison any more.
  const highlight = withPathway.length === 1 ? withPathway[0].pathway : null;
  const highlightName = withPathway.length === 1 ? withPathway[0].name : null;

  const earlyPrograms = SERVICE_PROGRAMS
    .filter(p => p.timing === 'high-school' || p.timing === 'undergrad')
    .sort((a, b) => (COMMITMENT_TIMING[a.timing]?.order ?? 9) - (COMMITMENT_TIMING[b.timing]?.order ?? 9));

  return (
    <div style={CC({ gap: 18 })}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>
          What each path costs
        </div>
        <div style={{ fontSize: 12.5, color: C.t3, marginTop: 3, lineHeight: 1.55 }}>
          Training length and typical graduate debt across the five health careers, with the
          service programs that pay for them. The same figures your child sees on their own
          Financial Aid tab.
        </div>
      </div>

      {highlight && (
        <div style={glass2({
          ...R({ gap: 10, alignItems: 'flex-start' }),
          borderColor: tint(C.blue, 0.28), background: tint(C.blue, 0.05),
        })}>
          <Info size={15} color={C.blueL} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6 }}>
            {highlightName ? `${highlightName} is` : 'Your student is'} currently on the{' '}
            <b style={{ color: C.t1 }}>
              {PATHWAY_FINANCE.find(p => p.pathwayKey === highlight)?.label || 'selected'}
            </b>{' '}
            pathway, so that row is marked below. Pathways change — most students switch at least
            once, and switching early costs almost nothing.
          </span>
        </div>
      )}

      <div style={glass({ padding: 18 })}>
        <div style={{ ...R({ gap: 7, marginBottom: 14 }) }}>
          <Scale size={14} color={C.blueL} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.blueL, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Debt trajectory by pathway
          </span>
        </div>
        <DebtTrajectoryTable audience="parent" highlightPathwayKey={highlight} />
      </div>

      {/* ── The part with a deadline attached ─────────────────────────────── */}
      <div style={glass({ padding: 18 })}>
        <div style={{ ...R({ gap: 7, marginBottom: 12 }) }}>
          <ShieldCheck size={14} color={C.tealL} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.tealL, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Routes decided before or during college
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.65, margin: '0 0 12px' }}>
          These pay for some or all of the training in exchange for working somewhere specific
          afterwards. They are on this page because two of them are decided while your child is
          still in high school — the ROTC scholarship application opens in the summer before senior
          year — and because several change which colleges are worth applying to at all. Most
          families find out about them years too late.
        </p>
        <div style={CC({ gap: 8 })}>
          {earlyPrograms.map(p => {
            const timing = COMMITMENT_TIMING[p.timing] || COMMITMENT_TIMING.undergrad;
            const color = TONE[timing.color] || C.blueL;
            return (
              <div key={p.id} style={{
                ...glass2({ padding: 13 }), borderLeft: `3px solid ${color}`,
                background: `linear-gradient(120deg,${tint(color, 0.05)},rgba(255,255,255,0.02) 55%)`,
              }}>
                <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{p.name}</span>
                  <span style={pill(tint(color, 0.14), color, { fontSize: 9 })}>{timing.label}</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6, marginTop: 7 }}>
                  <b style={{ color: C.t1 }}>Pays for:</b> {p.covers}
                </div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6, marginTop: 5 }}>
                  <b style={{ color: C.t1 }}>In exchange for:</b> {p.commitment}
                </div>
                <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6, marginTop: 5 }}>
                  <b style={{ color: C.t1 }}>Decided:</b> {p.decidedBy}
                </div>
                <div style={{
                  fontSize: 11.5, color: C.t2, lineHeight: 1.6, marginTop: 9, padding: '9px 11px',
                  borderRadius: 8, background: tint(C.amber, 0.05), border: `1px solid ${tint(C.amber, 0.22)}`,
                }}>
                  <b style={{ color: C.amberL }}>Read this part with them:</b> {p.catch}
                </div>
                <a href={p.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11.5, color: C.blueL, textDecoration: 'none', display: 'inline-block', marginTop: 9 }}>
                  Official page →
                </a>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: C.t4, lineHeight: 1.6 }}>
        Nothing on this page is advice about your family's finances, and none of it is a prediction
        about your child. It is what national bodies publish about what people who finished each of
        these paths typically owed, with the source and the date we read it named on every figure.
        Costs, interest rates and program terms all change annually.
      </div>
    </div>
  );
}
