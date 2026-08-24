import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { C, glass2, R, CC, pill, tint, autoGrid } from '../../lib/theme';
import { publishedDebtRows, money, yearsLabel } from '../../lib/pathwayCost';
import { DEFAULT_COMPARISON } from '../../data/pathwayFinance';

// ─────────────────────────────────────────────────────────────────────────────
// Five health pathways side by side: how long, how much owed, how soon paid.
//
// ── Why one component serves both the student and the parent ────────────────
// The parent dashboard needs exactly this comparison — parents care about it
// intensely and no school, no counsellor and no college website ever puts it in
// front of them — and it must be the SAME numbers the student is looking at.
// Two implementations would drift, and a parent and a seventeen-year-old
// arguing from two different debt figures is worse than either one alone.
//
// So `audience` changes only the framing sentences, never a number:
//   'student' — second person, about their next decision
//   'parent'  — third person, about the decision their child is making, with
//               the "this is not a ranking" line made explicit because the
//               parent is the one most likely to read it as one
//
// ── Why the timeline is drawn and not tabulated ─────────────────────────────
// "MD: 12 years" and "RN: 4 years" are two numbers a teenager reads in a second
// and feels nothing about. The same two as bars, with the paid stretch shaded
// differently from the unpaid one, is the whole argument: what an RN is doing
// while the future physician is in year three of medical school is earning a
// salary. That is the fact this component exists to deliver.
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_TONE = {
  undergrad: { label: 'Undergrad', alpha: 0.55 },
  professional: { label: 'Professional school', alpha: 0.9 },
  postgrad: { label: 'Residency (paid)', alpha: 0.28 },
};

function colorFor(colorKey) {
  return C[colorKey] || C.blue;
}

/** The horizontal training bar. Widths are proportional to the longest pathway shown. */
function TimelineBar({ phases, color, maxYears }) {
  return (
    <div style={{ display: 'flex', gap: 4, height: 10, borderRadius: 4, overflow: 'hidden', background: C.b1 }}>
      {phases.map((p) => {
        const tone = PHASE_TONE[p.kind] || PHASE_TONE.undergrad;
        return (
          <div
            key={p.id}
            title={`${p.label} — ${yearsLabel(p.years)}${p.earning === 'stipend' ? ' (paid, at roughly a fifth of an attending salary)' : ''}`}
            style={{
              width: `${(p.years / maxYears) * 100}%`,
              background: tint(color, tone.alpha),
              // The paid stretch is drawn hollow rather than solid: it is time,
              // but it is not time with no income, and those must not look alike.
              backgroundImage: p.kind === 'postgrad'
                ? `repeating-linear-gradient(45deg, ${tint(color, 0.42)} 0 4px, transparent 4px 8px)` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function Row({ row, maxYears, audience, expanded, onToggle, emphasised }) {
  const color = colorFor(row.colorKey);
  const debt = row.debt;
  const you = audience === 'parent' ? 'they' : 'you';

  return (
    <div style={{
      ...glass2({ padding: 0, overflow: 'hidden' }),
      borderLeft: `3px solid ${color}`,
      background: emphasised
        ? `linear-gradient(120deg,${tint(color, 0.11)},rgba(255,255,255,0.02) 60%)`
        : `linear-gradient(120deg,${tint(color, 0.04)},rgba(255,255,255,0.02) 55%)`,
    }}>
      <button
        type="button" onClick={onToggle} aria-expanded={expanded}
        style={{ all: 'unset', boxSizing: 'border-box', display: 'block', width: '100%', cursor: 'pointer', padding: 12 }}
      >
        <div style={R({ gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' })}>
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={R({ gap: 8, flexWrap: 'wrap' })}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{row.label}</span>
              {emphasised && <span style={pill(tint(color, 0.15), color, { fontSize: 9 })}>
                {audience === 'parent' ? 'Their pathway' : 'Your pathway'}
              </span>}
            </div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{row.credential}</div>
            <div style={{ marginTop: 8 }}>
              <TimelineBar phases={row.phases} color={color} maxYears={maxYears} />
              <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4 }}>
                {yearsLabel(row.years)} after high school · full salary at about {17 + Math.round(row.yearsUntilFirstFullSalary)}
              </div>
            </div>
          </div>

          <div style={{ ...autoGrid(104, 8), flex: '1 1 330px', minWidth: 240 }}>
            <Figure label="Typical debt" value={money(debt.median, { compact: true })}
              sub={`${money(debt.p25, { compact: true })}–${money(debt.p75, { compact: true })}`} color={color} />
            <Figure label="Years training" value={String(row.years)} sub="after high school" color={color} />
            <Figure label="Debt vs pay" value={row.debtToIncome != null ? `${row.debtToIncome}×` : '—'}
              sub="of one year's median" color={color} />
          </div>
          {expanded ? <ChevronUp size={15} color={C.t3} /> : <ChevronDown size={15} color={C.t3} />}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0px 12px 12px', borderTop: `1px solid ${C.b1}`, paddingTop: 12, ...CC({ gap: 8 }) }}>
          <p style={{ fontSize: 12.5, color: C.t1, lineHeight: 1.55, margin: 0, fontWeight: 600 }}>{row.headline}</p>
          <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.55, margin: 0 }}>{row.tradeoff}</p>

          <div style={CC({ gap: 4 })}>
            {row.phases.map(p => (
              <div key={p.id} style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
                <span style={{ ...pill(tint(color, 0.12), color, { fontSize: 9, flexShrink: 0 }) }}>
                  {yearsLabel(p.years)}
                </span>
                <span><b style={{ color: C.t1 }}>{p.label}</b>{p.earning === 'stipend' ? ' — paid' : ''} · {p.note}</span>
              </div>
            ))}
          </div>

          <div style={{ ...glass2({ padding: 12 }), background: C.s2 }}>
            <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
              <b style={{ color: C.t1 }}>Where the debt figure comes from:</b> {debt.note}
              <span style={{ color: C.t4 }}> ({debt.basis})</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginTop: 8 }}>
              <b style={{ color: C.t1 }}>Median pay, {money(row.earnings.medianAnnual)}:</b> {row.earnings.note}
            </div>
            <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8, lineHeight: 1.5 }}>
              {[...(debt.sources || []), ...(row.earnings.sources || [])]
                .map(s => s.label).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}
            </div>
          </div>

          <p style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.55, margin: 0 }}>
            {audience === 'parent'
              ? `A debt-to-pay multiple of ${row.debtToIncome ?? '—'}× means the typical graduate owes about that many years of the occupation's median pay. It is the fairest single comparison across five very different careers — but it is not the whole answer, because ${row.short === 'MD' ? 'physicians spend years earning a resident\'s stipend before that median applies' : 'the median is the whole occupation, not the first job'}.`
              : `That ${row.debtToIncome ?? '—'}× means someone finishing this path typically owes about ${row.debtToIncome ?? '—'} years of what ${you}'d be earning. It is the closest thing to an apples-to-apples number across five very different careers.`}
          </p>
        </div>
      )}
    </div>
  );
}

function Figure({ label, value, sub, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>{label}</div>
      <div style={{ fontSize: 16, letterSpacing: 'calc(-0.05px + var(--msp-letter-spacing))', fontWeight: 800, color, fontFamily: C.FM, marginTop: 4, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.t4, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function DebtTrajectoryTable({
  audience = 'student',
  pathwayIds = DEFAULT_COMPARISON,
  highlightPathwayKey = null,   // a PATHS key — the student's current pathway
  defaultExpandedId = null,
}) {
  const rows = publishedDebtRows(pathwayIds);
  const [openId, setOpenId] = useState(defaultExpandedId);
  const maxYears = Math.max(...rows.map(r => r.years), 1);

  return (
    <div style={CC({ gap: 12 })}>
      <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, margin: 0 }}>
        {audience === 'parent' ? (
          <>
            These are the five health careers most students on this app are choosing between, with the
            two numbers that decide the finances: how many years of training, and what people who
            finished that training typically owe at the end of it. <b style={{ color: C.t1 }}>This is not a
            ranking.</b> A shorter, cheaper path is a legitimate answer, and for a great many
            students it is the better one. What it is not is a decision anybody should make without
            having seen this page.
          </>
        ) : (
          <>
            Five paths, side by side. How long the training is, what people who finished it typically
            owe, and how that debt compares to what the job pays. Nobody normally shows a high
            schooler this — which is how students end up making one of the biggest financial
            decisions of their life having only been told "med school is expensive".
          </>
        )}
      </p>

      <div style={CC({ gap: 8 })}>
        {rows.map(row => (
          <Row
            key={row.id}
            row={row}
            maxYears={maxYears}
            audience={audience}
            expanded={openId === row.id}
            onToggle={() => setOpenId(openId === row.id ? null : row.id)}
            emphasised={!!highlightPathwayKey && rowMatchesPathway(row, highlightPathwayKey)}
          />
        ))}
      </div>

      <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), fontSize: 11, color: C.t4, lineHeight: 1.55 }}>
        <Info size={12} style={{ flexShrink: 0, marginTop: 4 }} />
        <span>
          Debt figures are medians for graduates <b>who borrowed</b> — a quarter of medical students
          and a fifth of pharmacy students finish owing nothing. Pay figures are medians for the
          whole occupation, not starting salaries, and not adjusted for specialty. Both move every
          year. Open a pathway to see exactly which organisation published each number and when we
          read it.
        </span>
      </div>
    </div>
  );
}

/**
 * Whether a comparison row is the student's own pathway.
 *
 * Exported for the parent card, which resolves the pathway from the student
 * summary rather than from local state.
 */
export function rowMatchesPathway(row, pathwayKey) {
  const FINANCE_TO_PATHS = {
    md: 'physician', pa: 'physicianAssistant', rn: 'nursing', pharmd: 'pharmacy', dds: 'dentistry',
  };
  return FINANCE_TO_PATHS[row.id] === pathwayKey;
}
