// ─────────────────────────────────────────────────────────────────────────────
// The intake — a visible completeness meter, the fields we already have shown
// as already-answered, and the ones we do not, asked once each with a reason.
//
// Three rules this component exists to enforce, all of them things the old
// seven-input form broke:
//
//   1. Nothing is asked twice, and nothing the Portfolio already knows is asked
//      at all. Auto-filled values render as read-only rows with the source
//      attached ("from your Clinical Hours log") and an override button, not as
//      empty boxes the student has to fill in again.
//   2. Every question carries one line of why. Not a tooltip, not a modal —
//      one line, under the field, always visible. A form that will not say why
//      it is asking does not get answered honestly.
//   3. Every field is skippable, and skipping widens the range rather than
//      substituting a default. The meter says exactly how many are missing and
//      what each one would change, so a student can see the cost of skipping
//      instead of it being invisible.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { ChevronRight, Check, HelpCircle, Database, AlertTriangle, Pencil } from 'lucide-react';
import { C, glass, glass2, btnSm, inp, lbl, R, CC, G, pill, tint, accentText } from '../../../lib/theme';
import { SectionTitle } from '../../ui/PanelHero';
import Disclosure, { HelpNote } from '../../ui/Disclosure';
import { INTAKE_FIELDS } from '../../../lib/admissions';
import { US_STATES } from '../../../data/constants';

const REQUIRED_COURSES = [
  { id: 'biology', label: 'Biology' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'physics-lab', label: 'Physics (lab-based)' },
  { id: 'precalculus', label: 'Pre-calculus' },
];
const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

const HOOK_OPTIONS = [
  { id: 'recruitedAthlete', label: 'Recruited athlete' },
  { id: 'legacy', label: 'Parent attended this school' },
  { id: 'development', label: 'Significant family donor' },
  { id: 'faculty', label: 'Parent works there' },
];

/**
 * The completeness meter. Deliberately the first thing on the screen, and
 * deliberately a sentence rather than a bare percentage — "we have 11 of the 15
 * things we'd need" is actionable and "73% complete" is not.
 */
export function CompletenessMeter({ completeness, onJump, isMobile }) {
  const { have, total, ratio, missing, sentence } = completeness;
  const color = ratio >= 0.85 ? C.green : ratio >= 0.6 ? C.amber : C.rose;

  return (
    <div style={{ ...glass({ padding: isMobile ? 16 : 20 }), border: `1px solid ${tint(color, 0.3)}` }}>
      <div style={R({ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 })}>
        <div style={R({ gap: 10 })}>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: C.FM, color }}>{have}<span style={{ color: C.t3, fontSize: 17 }}>/{total}</span></div>
          <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55, maxWidth: 520 }}>{sentence}</div>
        </div>
        <span style={pill(tint(color, 0.16), accentText(color), { fontSize: 10.5 })}>
          {ratio >= 0.85 ? 'Enough for a confident estimate' : ratio >= 0.6 ? 'Usable, but the ranges are wide' : 'Too many gaps for a confident number'}
        </span>
      </div>

      <div style={{ height: 7, borderRadius: 4, background: C.s3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(ratio * 100)}%`, height: '100%', background: `linear-gradient(90deg,${color},${tint(color, 0.55)})`, transition: 'width .3s' }} />
      </div>

      {missing.length > 0 && (
        <div style={{ marginTop: 14, ...CC({ gap: 8 }) }}>
          <span style={lbl({ marginBottom: 0 })}>What's missing, and what each one would change</span>
          {missing.map(m => (
            <button key={m.id} onClick={() => onJump?.(m.id)} style={{
              ...glass2({ padding: '10px 13px', display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left', cursor: 'pointer' }),
              borderLeft: `3px solid ${C.amber}`, width: '100%',
            }}>
              <AlertTriangle size={13} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{m.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: C.t3, lineHeight: 1.55, marginTop: 3 }}>{m.changes}</span>
              </span>
              <ChevronRight size={14} color={C.t3} style={{ flexShrink: 0, marginTop: 2 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** One field, with its one line of why, and a skip that is a real option. */
function Field({ field, value, onChange, autoValue, autoSource, highlighted, isMobile }) {
  const answered = value != null && value !== '';
  const usingAuto = !answered && autoValue != null;

  return (
    <div id={`intake-${field.id}`} style={{
      ...glass2({ padding: 14 }),
      border: `1px solid ${highlighted ? tint(C.amber, 0.45) : C.b1}`,
      background: highlighted ? tint(C.amber, 0.05) : undefined,
    }}>
      <div style={R({ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 })}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, fontFamily: C.FD }}>{field.label}</span>
        {usingAuto
          ? <span style={pill(tint(C.cyan, 0.14), C.cyan, { fontSize: 9.5, gap: 4 })}><Database size={9} /> {autoSource || 'from your Portfolio'}</span>
          : answered ? <span style={pill(tint(C.green, 0.14), C.greenL || C.green, { fontSize: 9.5, gap: 4 })}><Check size={9} /> answered</span>
            : <span style={pill(C.s3, C.t3, { fontSize: 9.5 })}>optional — skipping widens the range</span>}
      </div>

      <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 10 }}>
        <HelpCircle size={11} color={C.t4 || C.t3} style={{ flexShrink: 0, marginTop: 3 }} />
        <span style={{ fontSize: 11, color: C.t3, lineHeight: 1.55 }}>{field.why}</span>
      </div>

      <FieldInput field={field} value={value} onChange={onChange} autoValue={autoValue} isMobile={isMobile} />
    </div>
  );
}

function FieldInput({ field, value, onChange, autoValue, isMobile }) {
  switch (field.type) {
    case 'number':
      return (
        <input type="number" style={inp()} step={field.step} min={field.min} max={field.max}
          placeholder={autoValue != null ? `${autoValue} (from your Portfolio)` : '—'}
          value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      );

    case 'enum':
      return (
        <div style={R({ gap: 6, flexWrap: 'wrap' })}>
          {field.options.map(o => (
            <button key={o.value} onClick={() => onChange(value === o.value ? null : o.value)}
              style={btnSm(value === o.value ? tint(C.blue, 0.2) : C.s3, {
                fontSize: 11.5, border: `1px solid ${value === o.value ? tint(C.blue, 0.45) : C.b1}`,
                color: value === o.value ? accentText(C.blue) : C.t2,
              })}>{o.label}</button>
          ))}
        </div>
      );

    case 'state':
      return (
        <select style={inp()} value={value ?? ''} onChange={e => onChange(e.target.value || null)}>
          <option value="">— skip —</option>
          {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      );

    case 'rigor': {
      const v = value || {};
      const set = (k, n) => onChange({ ...v, [k]: n === '' ? null : Number(n) });
      return (
        <div style={G(4, 8, {}, isMobile)}>
          {[['ap', 'AP'], ['ib', 'IB'], ['honors', 'Honours'], ['dualEnrollment', 'Dual enrol.']].map(([k, label]) => (
            <div key={k}>
              <span style={lbl({ fontSize: 9, marginBottom: 4 })}>{label}</span>
              <input type="number" min="0" max="30" style={inp({ padding: '8px 10px' })} placeholder="—"
                value={v[k] ?? ''} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
        </div>
      );
    }

    case 'courses': {
      const v = value || {};
      const setCourse = (id, patch) => onChange({ ...v, [id]: { ...(v[id] || {}), ...patch } });
      return (
        <div style={CC({ gap: 8 })}>
          {REQUIRED_COURSES.map(c => {
            const rec = v[c.id] || {};
            return (
              <div key={c.id} style={R({ gap: 8, flexWrap: 'wrap' })}>
                <span style={{ fontSize: 12, color: C.t2, minWidth: 132 }}>{c.label}</span>
                {[['yes', true], ['no', false]].map(([label, taken]) => (
                  <button key={label} onClick={() => setCourse(c.id, { taken: rec.taken === taken ? undefined : taken })}
                    style={btnSm(rec.taken === taken ? tint(taken ? C.green : C.rose, 0.2) : C.s3, {
                      fontSize: 11, padding: '4px 12px',
                      color: rec.taken === taken ? accentText(taken ? C.green : C.rose) : C.t3,
                    })}>{label}</button>
                ))}
                {rec.taken === true && (
                  <select style={inp({ padding: '5px 9px', width: 'auto', fontSize: 11.5 })}
                    value={rec.grade ?? ''} onChange={e => setCourse(c.id, { grade: e.target.value || undefined })}>
                    <option value="">grade?</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case 'hooks': {
      const v = value || {};
      return (
        <div style={CC({ gap: 8 })}>
          <div style={R({ gap: 6, flexWrap: 'wrap' })}>
            {HOOK_OPTIONS.map(h => (
              <button key={h.id} onClick={() => onChange({ ...v, [h.id]: !v[h.id] })}
                style={btnSm(v[h.id] ? tint(C.violet, 0.2) : C.s3, {
                  fontSize: 11.5, color: v[h.id] ? accentText(C.violet) : C.t2,
                  border: `1px solid ${v[h.id] ? tint(C.violet, 0.45) : C.b1}`,
                })}>{h.label}</button>
            ))}
          </div>
          <HelpNote>Nobody is judging you for a yes here. We ask because published admit rates already include these applicants — leaving them in the data is what quietly inflates the odds shown to everyone who is not one.</HelpNote>
        </div>
      );
    }

    case 'test-sections':
      return <TestSections value={value} onChange={onChange} autoValue={autoValue} isMobile={isMobile} />;

    default:
      return <input style={inp()} value={value ?? ''} onChange={e => onChange(e.target.value || null)} />;
  }
}

/**
 * Section scores. Auto-filled from the Score Tracker where the student has
 * entered them there; editable here because several programmes gate on a single
 * section and a composite cannot answer that question.
 */
function TestSections({ value, onChange, autoValue, isMobile }) {
  const v = value || {};
  const auto = autoValue || {};
  const set = (test, section, n) => onChange({ ...v, [test]: { ...(v[test] || {}), [section]: n === '' ? null : Number(n) } });
  const shown = (test, section) => v[test]?.[section] ?? auto[test]?.sections?.[section] ?? '';

  return (
    <div style={CC({ gap: 12 })}>
      {[
        { test: 'sat', label: 'SAT', sections: [['ebrw', 'Reading & Writing'], ['math', 'Math']] },
        { test: 'act', label: 'ACT', sections: [['english', 'English'], ['math', 'Math'], ['reading', 'Reading'], ['science', 'Science']] },
      ].map(({ test, label, sections }) => (
        <div key={test}>
          <span style={lbl({ marginBottom: 5 })}>
            {label} sections
            {auto[test]?.composite != null && <span style={{ color: C.t4 || C.t3, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}> — composite {auto[test].composite} from your Score Tracker</span>}
          </span>
          <div style={G(sections.length, 8, {}, isMobile)}>
            {sections.map(([id, sLabel]) => (
              <div key={id}>
                <span style={{ fontSize: 9.5, color: C.t3, display: 'block', marginBottom: 3 }}>{sLabel}</span>
                <input type="number" style={inp({ padding: '8px 10px' })} placeholder="—"
                  value={shown(test, id)} onChange={e => set(test, id, e.target.value)} />
              </div>
            ))}
          </div>
          {test === 'act' && (
            <div style={{ marginTop: 6 }}>
              <HelpNote>The ACT Science score is here specifically because UMKC's six-year programme requires you to have sat it at all — a composite alone cannot tell us whether you did.</HelpNote>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Rows for the things we already have. Shown, not asked — with the source, so a
 * student can see where a number came from and go and fix it where it lives
 * rather than correcting it into a form that forgets.
 */
export function AlreadyKnown({ portfolio, applicant, onGoTo, isMobile }) {
  const rows = [
    { key: 'clinical', label: 'Clinical hours', value: portfolio.clinical?.hours ? `${Math.round(portfolio.clinical.hours)} h` : 'none logged', source: portfolio.provenance?.clinical, view: 'resume' },
    { key: 'shadowing', label: 'Shadowing hours', value: portfolio.shadowing?.hours ? `${Math.round(portfolio.shadowing.hours)} h` : 'none marked as shadowing', source: portfolio.provenance?.shadowing, view: 'resume', warn: portfolio.shadowing?.estimated },
    { key: 'research', label: 'Research', value: portfolio.research?.hours ? `${Math.round(portfolio.research.hours)} h` : 'none logged', source: portfolio.provenance?.research, view: 'resume' },
    { key: 'service', label: 'Community service', value: portfolio.service?.hours ? `${Math.round(portfolio.service.hours)} h` : 'none logged', source: portfolio.provenance?.service, view: 'resume' },
    { key: 'leadership', label: 'Leadership positions', value: `${portfolio.leadership?.length || 0}`, source: portfolio.provenance?.leadership, view: 'resume' },
    { key: 'competitions', label: 'Awards & competitions', value: `${portfolio.competitions?.length || 0}`, source: portfolio.provenance?.competitions, view: 'resume' },
    { key: 'certifications', label: 'Certifications', value: `${portfolio.certifications?.length || 0}`, source: portfolio.provenance?.certifications, view: 'resume' },
    { key: 'gpa', label: 'GPA on file', value: [applicant.unweightedGpa != null ? `${applicant.unweightedGpa} unweighted` : null, applicant.weightedGpa != null ? `${applicant.weightedGpa} weighted` : null].filter(Boolean).join(' · ') || 'none', source: applicant._provenance?.unweightedGpa || applicant._provenance?.weightedGpa, view: 'resume' },
    { key: 'tests', label: 'Test scores', value: ['sat', 'act'].map(t => applicant.tests?.[t] ? `${t.toUpperCase()} ${applicant.tests[t].composite}` : null).filter(Boolean).join(' · ') || 'none', source: applicant._provenance?.tests, view: 'resume' },
  ];

  return (
    <Disclosure id="admissions-already-known" title="What we already took from your Portfolio"
      sub="Nine things we did not have to ask you for. Edit them where they live and this updates."
      icon={Database} color={C.cyan} m={isMobile} defaultOpen={false}>
      <div style={CC({ gap: 7 })}>
        {rows.map(r => (
          <div key={r.key} style={{ ...glass2({ padding: '10px 13px', display: 'flex', gap: 10, alignItems: 'center' }), ...(r.warn ? { borderLeft: `3px solid ${C.amber}` } : {}) }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.t1 }}>{r.label}</span>
              {r.source && <span style={{ display: 'block', fontSize: 10.5, color: C.t3, marginTop: 2 }}>{r.source}</span>}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: C.FM, color: C.t2, flexShrink: 0 }}>{r.value}</span>
            {onGoTo && (
              <button onClick={() => onGoTo(r.view)} style={btnSm(C.s3, { fontSize: 10.5, padding: '4px 10px', flexShrink: 0 })}><Pencil size={10} /></button>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <HelpNote>Where a number here is wrong, fix it at the source rather than here — that way every other part of the app agrees with the calculator instead of disagreeing quietly.</HelpNote>
      </div>
    </Disclosure>
  );
}

/**
 * The questions. Ordered so anything a programme on the student's list actually
 * gates on comes first — a student with no New York programmes should never be
 * asked a New York question before a question that decides their eligibility.
 */
export default function IntakeForm({ answers, onAnswer, derived, completeness, priorityFields = [], isMobile }) {
  const priority = new Set(priorityFields.map(f => f.id));

  const visible = INTAKE_FIELDS.filter(f => {
    if (!f.dependsOn) return true;
    return Object.entries(f.dependsOn).every(([k, v]) => answers[k] === v);
  });

  const groups = [
    { id: 'eligibility', label: 'Eligibility — the yes/no questions', color: C.rose, note: 'These decide whether a percentage can be shown at all. A programme you are not eligible for gets no number, only what would have to change.' },
    { id: 'academics', label: 'Academics', color: C.blue, note: 'Benchmarked against the 25th, 50th and 75th percentile of admitted students — all three, always.' },
    { id: 'testing', label: 'Testing', color: C.violet, note: 'Section scores and superscore policy, because several programmes gate on one and refuse the other.' },
    { id: 'portfolio', label: 'Portfolio', color: C.green, note: 'Only what your logged activities cannot already tell us.' },
    { id: 'context', label: 'Context', color: C.amber, note: 'The things that are in every published admit rate and in no chancing tool.' },
  ];

  return (
    <div style={CC({ gap: 16 })}>
      {groups.map(g => {
        const fields = visible.filter(f => f.group === g.id);
        if (!fields.length) return null;
        return (
          <div key={g.id}>
            <SectionTitle color={g.color}>{g.label}</SectionTitle>
            <div style={{ marginTop: -6, marginBottom: 10 }}><HelpNote color={g.color}>{g.note}</HelpNote></div>
            <div style={G(2, 12, {}, isMobile)}>
              {fields.map(f => (
                <Field key={f.id} field={f} isMobile={isMobile}
                  value={answers[f.id]}
                  onChange={v => onAnswer(f.id, v)}
                  autoValue={f.id === 'testSections' ? derived.tests : derived[f.id]}
                  autoSource={derived._provenance?.[f.id]}
                  highlighted={priority.has(f.id)} />
              ))}
            </div>
          </div>
        );
      })}
      <HelpNote>
        Every field here is skippable. Skipping one does not make us guess — it widens the range on every estimate below and lowers the confidence label, which is the honest consequence and the one you can see.
      </HelpNote>
    </div>
  );
}
