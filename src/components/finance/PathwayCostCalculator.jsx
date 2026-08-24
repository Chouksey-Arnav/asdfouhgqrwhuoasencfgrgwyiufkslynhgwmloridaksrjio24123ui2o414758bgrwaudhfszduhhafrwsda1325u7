import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { C, glass2, inp, lbl, R, CC, pill, tint, autoGrid } from '../../lib/theme';
import { estimatePathwayCost, SCHOOL_TYPES, money, yearsLabel } from '../../lib/pathwayCost';
import { PATHWAY_FINANCE, LOAN_ASSUMPTIONS, FEDERAL_LOAN_LIMITS } from '../../data/pathwayFinance';

// ─────────────────────────────────────────────────────────────────────────────
// Start to finish, in their own numbers.
//
// ── Why the default is the worst case, stated plainly ───────────────────────
// With nothing entered, this borrows every dollar of the published cost of
// attendance. That produces a number larger than the published median debt for
// every pathway, and that gap is not a bug — it is the most useful thing on the
// screen. The published median is what people owed AFTER aid, family money,
// scholarships and working through school. The gap between the two is exactly
// the amount those four things are worth, and a student who sees it understands
// why the aid boxes below matter more than any scholarship essay they will
// write.
//
// The banner says so in one sentence, every time, and the moment the student
// enters any aid at all the banner changes to reflect what they actually typed.
//
// ── Why interest is a headline figure and not a footnote ────────────────────
// The single fact that surprises every pre-med: on the physician path, the
// interest accrued before the first payment is roughly half again the amount
// borrowed, because the balance sits compounding through four years of
// residency on a stipend. Nothing else on this page changes a decision the way
// that one line does, so it is a headline tile, not a detail row.
// ─────────────────────────────────────────────────────────────────────────────

const NUM_FIELDS = [
  { key: 'annualAidUndergrad', label: 'Aid per undergrad year',
    hint: 'Grants, scholarships and family money you expect each year — not loans.' },
  { key: 'annualAidProfessional', label: 'Aid per professional-school year',
    hint: 'Same again for medical, dental, PA or pharmacy school. Leave at 0 if you have no idea yet — most people don\'t.' },
  { key: 'familyContributionTotal', label: 'One-off family contribution',
    hint: 'A lump sum — savings, a 529 plan. Applied to the earliest years, where it saves the most interest.' },
];

export default function PathwayCostCalculator({ accent = C.green, defaultPathwayId = 'md' }) {
  const [pathwayId, setPathwayId] = useState(defaultPathwayId);
  const [undergradSchoolType, setUndergradSchoolType] = useState('publicInState');
  const [professionalSchoolType, setProfessionalSchoolType] = useState('publicInState');
  const [vals, setVals] = useState({ annualAidUndergrad: '', annualAidProfessional: '', familyContributionTotal: '' });
  const [inflate, setInflate] = useState(false);
  const [showPhases, setShowPhases] = useState(false);

  const pathway = PATHWAY_FINANCE.find(p => p.id === pathwayId) || PATHWAY_FINANCE[0];
  const hasProfessional = pathway.phases.some(p => p.kind === 'professional');
  const hasResidency = pathway.phases.some(p => p.kind === 'postgrad');

  const result = useMemo(() => estimatePathwayCost(pathwayId, {
    undergradSchoolType, professionalSchoolType, inflate,
    annualAidUndergrad: vals.annualAidUndergrad === '' ? 0 : Number(vals.annualAidUndergrad),
    annualAidProfessional: vals.annualAidProfessional === '' ? 0 : Number(vals.annualAidProfessional),
    familyContributionTotal: vals.familyContributionTotal === '' ? 0 : Number(vals.familyContributionTotal),
  }), [pathwayId, undergradSchoolType, professionalSchoolType, inflate, vals]);

  if (!result) return null;
  const color = C[pathway.colorKey] || accent;
  const borrowsEverything = result.assumptions.borrowsFullCostOfAttendance;

  return (
    <div style={CC({ gap: 12 })}>
      {/* ── Inputs ───────────────────────────────────────────────────────── */}
      <div style={autoGrid(190, 10)}>
        <Field label="Pathway">
          <select style={inp()} value={pathwayId} onChange={e => setPathwayId(e.target.value)}>
            {PATHWAY_FINANCE.slice().sort((a, b) => a.order - b.order).map(p =>
              <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Undergrad">
          <select style={inp()} value={undergradSchoolType} onChange={e => setUndergradSchoolType(e.target.value)}>
            {SCHOOL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
        {hasProfessional && (
          <Field label={`${pathway.short} school`}>
            <select style={inp()} value={professionalSchoolType} onChange={e => setProfessionalSchoolType(e.target.value)}>
              {SCHOOL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
        )}
        {NUM_FIELDS.filter(f => hasProfessional || f.key !== 'annualAidProfessional').map(f => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            <input
              type="number" min="0" step="500" inputMode="numeric" placeholder="0"
              style={inp()} value={vals[f.key]}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      <label style={{ ...R({ gap: 8 }), fontSize: 12, color: C.t2, cursor: 'pointer' }}>
        <input type="checkbox" checked={inflate} onChange={e => setInflate(e.target.checked)} />
        Show what it will actually be billed at, rising {Math.round(LOAN_ASSUMPTIONS.costInflation * 100)}% a year
        <span style={{ color: C.t4 }}>(off = today's dollars, which is what the medians above are in)</span>
      </label>

      {/* ── The standing caveat, above the number rather than under it ────── */}
      <div style={{
        ...R({ gap: 8, alignItems: 'flex-start' }),
        ...glass2({ padding: 12 }),
        border: `1px solid ${tint(C.amber, 0.24)}`, background: tint(C.amber, 0.05),
      }}>
        <AlertTriangle size={14} color={C.amberL} style={{ flexShrink: 0, marginTop: 4 }} />
        <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.6 }}>
          {borrowsEverything ? (
            <>
              You haven't entered any aid, so this assumes you <b style={{ color: C.t1 }}>borrow every
              dollar</b> of the published cost of attendance. That is why it comes out higher than the
              typical debt figures above — the gap between the two is what aid, scholarships, family
              money and working through school are actually worth. Put a number in the aid boxes and
              watch it move.
            </>
          ) : (
            <>
              This borrows everything the aid you entered doesn't cover. It's an estimate built on
              published average costs and today's federal interest rates — not a quote, and not a
              prediction of what any particular school will charge you.
            </>
          )}
        </span>
      </div>

      {/* ── Headline figures ─────────────────────────────────────────────── */}
      <div style={autoGrid(150, 10)}>
        <Big label="Total cost of attendance" value={money(result.totalSticker)} color={C.t1}
          sub={`${yearsLabel(result.totalYears)} of training`} />
        <Big label="Borrowed" value={money(result.totalBorrowed)} color={color}
          sub={result.totalAid > 0 ? `after ${money(result.totalAid)} of aid` : 'no aid entered'} />
        <Big label="Interest before your first payment" value={money(result.interestDuringTraining)} color={C.amberL}
          sub={hasResidency ? 'most of it accrues during residency' : 'accrues while you\'re still in school'} />
        <Big label="Owed on day one of repayment" value={money(result.balanceAtRepayment)} color={C.roseL}
          sub="principal + accrued interest" />
      </div>

      <div style={autoGrid(190, 10)}>
        <Big label={`Monthly payment (${LOAN_ASSUMPTIONS.repaymentYears}-year standard plan)`}
          value={`${money(result.monthlyPayment)}/mo`} color={C.t1}
          sub={`${money(result.totalRepaid)} repaid in total`} />
        <Big label="Share of a median paycheck"
          value={result.paymentShareOfMedianIncome != null ? `${result.paymentShareOfMedianIncome}%` : '—'}
          color={result.paymentShareOfMedianIncome > 25 ? C.roseL : C.greenL}
          sub={`of ${money(result.medianEarnings)}/yr — the whole-occupation median, so your first job pays less than this`} />
      </div>

      {/* ── Phase breakdown ──────────────────────────────────────────────── */}
      <button type="button" onClick={() => setShowPhases(s => !s)}
        style={{ all: 'unset', cursor: 'pointer', ...R({ gap: 4 }), fontSize: 12, color: C.t2, fontWeight: 600 }}>
        {showPhases ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Year by year, phase by phase
      </button>

      {showPhases && (
        <div style={CC({ gap: 8 })}>
          {result.phases.map(p => (
            <div key={p.id} style={{ ...glass2({ padding: 12 }), borderLeft: `3px solid ${tint(color, 0.5)}` }}>
              <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{p.label}</span>
                <span style={pill(tint(color, 0.12), color, { fontSize: 9 })}>{yearsLabel(p.years)}</span>
                {p.earning === 'stipend' && <span style={pill(tint(C.green, 0.12), C.greenL, { fontSize: 9 })}>Paid</span>}
              </div>
              <div style={{ ...autoGrid(110, 8), marginTop: 8 }}>
                <Small label="Cost" value={money(p.sticker)} />
                {p.aid > 0 && <Small label="Aid" value={`−${money(p.aid)}`} />}
                {p.outOfPocket > 0 && <Small label="Paid up front" value={`−${money(p.outOfPocket)}`} />}
                <Small label="Borrowed" value={money(p.borrowed)} />
                <Small label="Interest accrued" value={money(p.interestAccrued)} />
              </div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 8, lineHeight: 1.55 }}>{p.note}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Every assumption, on screen ──────────────────────────────────── */}
      <div style={{ ...glass2({ padding: 12 }), background: C.s2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', marginBottom: 8 }}>
          What this calculation assumes
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
          <li>Federal interest rates of {(LOAN_ASSUMPTIONS.undergradRate * 100).toFixed(2)}% (undergrad),
            {' '}{(LOAN_ASSUMPTIONS.gradRate * 100).toFixed(2)}% (graduate) and
            {' '}{(LOAN_ASSUMPTIONS.gradPlusRate * 100).toFixed(2)}% (Grad PLUS, used above the
            {' '}{money(FEDERAL_LOAN_LIMITS.gradAnnual)}/yr graduate cap). The rate on a loan you take out in
            four years will be whatever Congress sets then.</li>
          {hasResidency && (
            <li>During residency, payments cover about half the interest accruing — an income-driven
              plan on a resident's stipend. Cover none of it and this number is materially worse;
              cover all of it and residency costs you nothing but time.</li>
          )}
          <li>Costs are the published averages in {pathway.costPerYear?.basis === 'published' ? 'published sources' : 'our stated estimates'} for
            {' '}{SCHOOL_TYPES.find(t => t.id === undergradSchoolType)?.label.toLowerCase()} study — cost of
            attendance, not tuition alone. {pathway.costPerYear?.note}</li>
          <li>Repayment on the standard {LOAN_ASSUMPTIONS.repaymentYears}-year plan, because it is the
            plan that ends. Income-driven plans give a smaller monthly payment and a larger total.</li>
          <li>No forgiveness or service program is applied. Several of the programs below would change
            this figure to nearly zero — that is the point of reading them.</li>
        </ul>
        <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8 }}>
          {(LOAN_ASSUMPTIONS.sources || []).map(s => s.label).join(' · ')}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <span style={lbl()}>{label}</span>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: C.t4, marginTop: 4, lineHeight: 1.45 }}>{hint}</div>}
    </div>
  );
}

function Big({ label, value, sub, color }) {
  return (
    <div style={{ ...glass2({ padding: 12 }) }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))', lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color, fontFamily: C.FM, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.t4, marginTop: 4, lineHeight: 1.45 }}>{sub}</div>}
    </div>
  );
}

function Small({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: C.t4, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FM, marginTop: 4 }}>{value}</div>
    </div>
  );
}
