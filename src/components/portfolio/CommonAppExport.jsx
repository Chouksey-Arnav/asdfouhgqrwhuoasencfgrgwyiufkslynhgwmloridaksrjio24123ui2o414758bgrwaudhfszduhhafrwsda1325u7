import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  X, ClipboardCopy, Check, AlertTriangle, Info, ChevronUp, ChevronDown,
  FileDown, ClipboardList, Award,
} from 'lucide-react';
import { C, glass2, btn, btnSm, btnG, inp, R, CC, tint, G } from '../../lib/theme';
import {
  buildCommonAppExport, renderCommonAppText, renderResumeText, renderHonorsText,
  slotFieldValue, CA_LIMITS, CA_CATEGORIES, EXPORT_FORMATS,
} from '../../lib/commonApp';

// ─────────────────────────────────────────────────────────────────────────────
// The export surface that replaced a single button producing prose.
//
// The old "Copy Common App format" button copied a numbered list with an
// ALL-CAPS heading on it. It was not the Common App format — the real form has
// nine fields per activity, three hard character caps, a fixed category
// dropdown, ten slots, and five honors slots — so a student who pressed it got
// text they then had to hand-cut into a form they had never seen. This panel is
// the actual form, rendered.
//
// What that means concretely:
//   - Each activity is a SLOT, with the real fields in the real order.
//   - Every capped field shows its live count against the real limit, and
//     anything over the cap is rendered with the doomed characters struck
//     through — the student sees the loss before the form does it silently.
//   - Every field has its own copy button, because that is how the form is
//     actually filled: click field on Common App, click copy here, paste, next.
//   - Category is a dropdown of the REAL 30 options, defaulted from our
//     internal type and changeable per slot (a hospital volunteer shift and a
//     shadowing day genuinely belong in different categories).
//   - Slots are reorderable, because the Common App tells students to list
//     activities in order of importance and slot 1 is read hardest.
//   - Activities past ten and honors past five are shown as an explicit
//     overflow section rather than silently dropped.
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ value, label = 'Copy', small = false, disabled = false }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || !value}
      onClick={() => {
        navigator.clipboard?.writeText(String(value ?? '')).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        }, () => toast.error('Could not copy to clipboard'));
      }}
      style={btnSm(done ? tint(C.green, 0.18) : C.s3, {
        color: done ? C.greenL : C.t2, fontSize: small ? 10.5 : 11.5,
        padding: small ? '4px 8px' : '6px 11px', opacity: disabled || !value ? 0.45 : 1,
        cursor: disabled || !value ? 'default' : 'pointer', flexShrink: 0,
      })}
    >
      {done ? <Check size={small ? 10 : 12} /> : <ClipboardCopy size={small ? 10 : 12} />}{small ? '' : (done ? 'Copied' : label)}
    </button>
  );
}

// One field row: label, live count against the real cap, the value, and — when
// over — the exact characters that will not survive, struck through.
function FieldRow({ label, field, copyValue, mono = false }) {
  const over = field?.over;
  const near = !over && field && field.remaining <= Math.max(8, field.limit * 0.1);
  const countColor = over ? C.rose : near ? C.amber : C.t4;
  return (
    <div style={{ padding: '9px 0', borderBottom: `1px solid ${C.b1}` }}>
      <div style={R({ gap: 8, justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap' })}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
        <div style={R({ gap: 7 })}>
          {field?.limit != null && (
            <span style={{ fontSize: 10, color: countColor, fontFamily: C.FM, fontWeight: over ? 800 : 500 }}>
              {field.len}/{field.limit}{over ? ` · ${field.overBy} over` : ''}
            </span>
          )}
          <CopyButton value={copyValue ?? field?.text} small />
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: field?.empty ? C.t4 : C.t1, lineHeight: 1.5, fontFamily: mono ? C.FM : C.FB, wordBreak: 'break-word' }}>
        {field?.empty ? <em style={{ color: C.t4 }}>empty{field?.required ? ' — required on the form' : ''}</em> : (
          over ? (
            <>
              {field.truncated}
              <span style={{ color: C.rose, textDecoration: 'line-through', background: tint(C.rose, 0.1) }}>{field.lost}</span>
            </>
          ) : field.text
        )}
      </div>
    </div>
  );
}

function ProblemList({ problems = [] }) {
  if (!problems.length) return null;
  const col = (l) => l === 'error' ? C.rose : l === 'warn' ? C.amber : C.blue;
  return (
    <div style={{ ...CC({ gap: 6 }), marginTop: 10 }}>
      {problems.map((p, i) => {
        const c = col(p.level);
        const Icon = p.level === 'tip' ? Info : AlertTriangle;
        return (
          <div key={i} style={{ ...R({ gap: 8, alignItems: 'flex-start', padding: '7px 10px' }), borderRadius: 8, background: tint(c, 0.07), border: `1px solid ${tint(c, 0.18)}` }}>
            <Icon size={12} color={c} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5 }}>{p.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function SlotCard({ slot, onMove, canUp, canDown, onCategoryChange }) {
  const [open, setOpen] = useState(slot.slot <= 3 || slot.blocking);
  const edge = slot.blocking ? C.rose : slot.problems.some(p => p.level === 'warn') ? C.amber : C.green;
  return (
    <div style={{ ...glass2({ padding: 13 }), borderLeft: `3px solid ${edge}`, background: `linear-gradient(120deg,${tint(edge, 0.045)},rgba(255,255,255,0.02) 55%)` }}>
      <div style={R({ gap: 9, justifyContent: 'space-between', flexWrap: 'wrap' })}>
        <button
          type="button" onClick={() => setOpen(o => !o)}
          style={{ ...R({ gap: 9, flex: 1, minWidth: 160 }), background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: 7, background: tint(edge, 0.15), border: `1px solid ${tint(edge, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: edge, fontFamily: C.FM, flexShrink: 0,
          }}>{slot.slot}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, display: 'block' }}>{slot.position.text || <em style={{ color: C.t4 }}>no position</em>}</span>
            <span style={{ fontSize: 10.5, color: C.t3 }}>{slot.category} · {slot.hours}h/wk × {slot.weeks}wk · {slot.timing}</span>
          </span>
        </button>
        <div style={R({ gap: 5, flexShrink: 0 })}>
          <button type="button" disabled={!canUp} onClick={() => onMove(-1)} style={btnSm(C.s3, { padding: '5px 7px', opacity: canUp ? 1 : 0.3, cursor: canUp ? 'pointer' : 'default' })} aria-label="Move up"><ChevronUp size={12} /></button>
          <button type="button" disabled={!canDown} onClick={() => onMove(1)} style={btnSm(C.s3, { padding: '5px 7px', opacity: canDown ? 1 : 0.3, cursor: canDown ? 'pointer' : 'default' })} aria-label="Move down"><ChevronDown size={12} /></button>
          <button type="button" onClick={() => setOpen(o => !o)} style={btnSm(C.s3, { padding: '5px 7px' })} aria-label={open ? 'Collapse' : 'Expand'}><ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} /></button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ padding: '9px 0', borderBottom: `1px solid ${C.b1}` }}>
            <div style={R({ gap: 8, justifyContent: 'space-between', marginBottom: 5, flexWrap: 'wrap' })}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Activity type (the form's dropdown)</span>
              <CopyButton value={slot.category} small />
            </div>
            <select
              value={slot.category}
              onChange={e => onCategoryChange(e.target.value)}
              style={{ ...inp(), fontSize: 12, padding: '7px 10px' }}
            >
              {CA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {slot.alternates.length > 0 && (
              <div style={{ fontSize: 10.5, color: C.t4, marginTop: 5, lineHeight: 1.5 }}>
                We picked this from your "{slot.sourceType}" type. Also reasonable here: {slot.alternates.join(', ')}.
              </div>
            )}
          </div>
          <FieldRow label={`Position/Leadership description (${CA_LIMITS.position} char limit)`} field={slot.position} />
          <FieldRow label={`Organization name (${CA_LIMITS.organization} char limit)`} field={slot.organization} />
          <FieldRow label={`Description (${CA_LIMITS.description} char limit — your description and impact, combined)`} field={slot.description} />
          <div style={G(2, 10, { marginTop: 10 }, true)}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Grade levels</div>
              <div style={{ fontSize: 12.5, color: slot.grades.length ? C.t1 : C.t4 }}>{slot.grades.length ? slot.grades.join(', ') : 'none ticked — required'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Timing of participation</div>
              <div style={{ fontSize: 12.5, color: C.t1 }}>{slot.timing}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Hours per week</div>
              <div style={{ fontSize: 12.5, color: C.t1, fontFamily: C.FM }}>{slot.hours}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Weeks per year</div>
              <div style={{ fontSize: 12.5, color: C.t1, fontFamily: C.FM }}>{slot.weeks}</div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: C.t3, marginTop: 10 }}>
            Intend to continue in college: <b style={{ color: C.t1 }}>{slot.continueInCollege ? 'Yes' : 'No'}</b>
            <span style={{ color: C.t4 }}> — set from this activity's status ({slot.continueInCollege ? 'ongoing' : 'completed'}).</span>
          </div>
          <ProblemList problems={slot.problems} />
          <div style={{ marginTop: 11 }}>
            <CopyButton
              value={[
                `Activity type: ${slot.category}`,
                `Position/Leadership: ${slotFieldValue(slot, 'position')}`,
                `Organization: ${slotFieldValue(slot, 'organization')}`,
                `Description: ${slotFieldValue(slot, 'description')}`,
                `Grades: ${slotFieldValue(slot, 'grades')}`,
                `Timing: ${slot.timing}`,
                `Hours/week: ${slot.hours}`,
                `Weeks/year: ${slot.weeks}`,
                `Continue in college: ${slot.continueInCollege ? 'Yes' : 'No'}`,
              ].join('\n')}
              label="Copy this whole slot"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommonAppExport({ open, onClose, activities = [], awards = [], studentName = null, isMobile = false, onExportPdf = null }) {
  const [format, setFormat] = useState('commonapp');
  const [order, setOrder] = useState(null);      // student's own slot ordering, by activity id
  const [overrides, setOverrides] = useState({}); // per-slot category overrides

  const exported = useMemo(
    () => buildCommonAppExport(activities, awards, { order, overrides }),
    [activities, awards, order, overrides]
  );

  const plainText = useMemo(() => {
    if (format === 'resume') return renderResumeText(activities, awards, { name: studentName });
    if (format === 'honors') return renderHonorsText(awards);
    return renderCommonAppText(exported);
  }, [format, exported, activities, awards, studentName]);

  function move(slotIndex, delta) {
    const current = exported.slots.concat(exported.overflow).map(s => String(s.id));
    const to = slotIndex + delta;
    if (to < 0 || to >= current.length) return;
    const next = [...current];
    [next[slotIndex], next[to]] = [next[to], next[slotIndex]];
    setOrder(next);
  }

  const activeFormat = EXPORT_FORMATS.find(f => f.id === format) || EXPORT_FORMATS[0];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="ca-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', zIndex: 340 }}
          />
          <motion.div
            key="ca-panel"
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.97 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            style={isMobile ? {
              position: 'fixed', left: 0, right: 0, bottom: 0, top: 24, zIndex: 345, background: C.s0,
              borderTop: `1px solid ${tint(C.blue, 0.3)}`, borderRadius: '18px 18px 0 0', display: 'flex', flexDirection: 'column',
            } : {
              position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 345,
              width: 780, maxWidth: '94vw', maxHeight: '90vh', background: C.s0, border: `1px solid ${C.b2}`,
              borderRadius: 18, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.b1}`, flexShrink: 0, background: `linear-gradient(120deg,${tint(C.blue, 0.1)},rgba(255,255,255,0.02))` }}>
              <div style={R({ gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' })}>
                <div style={R({ gap: 10 })}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg,${C.blue},${C.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ClipboardList size={16} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>Export for applications</div>
                    <div style={{ fontSize: 10.5, color: C.t3 }}>
                      {exported.counts.usedSlots}/{CA_LIMITS.maxActivities} activity slots · {exported.counts.usedHonors}/{CA_LIMITS.maxHonors} honors slots
                      {exported.errors > 0 ? ` · ${exported.errors} field${exported.errors === 1 ? '' : 's'} over the limit` : ' · every field fits'}
                    </div>
                  </div>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, padding: 6 }} aria-label="Close"><X size={18} /></button>
              </div>

              <div style={R({ gap: 6, marginTop: 12, flexWrap: 'wrap' })}>
                {EXPORT_FORMATS.map(f => (
                  <button key={f.id} type="button" onClick={() => setFormat(f.id)}
                    style={btnSm(format === f.id ? tint(C.blue, 0.2) : C.s3, { color: format === f.id ? C.blueL : C.t2, fontSize: 11.5 })}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10.5, color: C.t4, marginTop: 7, lineHeight: 1.5 }}>{activeFormat.hint}</div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {format === 'commonapp' ? (
                <div style={CC({ gap: 12 })}>
                  {exported.errors > 0 && (
                    <div style={{ ...R({ gap: 9, alignItems: 'flex-start', padding: '11px 13px' }), borderRadius: 10, background: tint(C.rose, 0.08), border: `1px solid ${tint(C.rose, 0.22)}` }}>
                      <AlertTriangle size={14} color={C.roseL} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
                        <b style={{ color: C.roseL }}>{exported.errors} field{exported.errors === 1 ? '' : 's'} will lose text.</b> The struck-through characters below are what the real form cuts. Fix them here before you paste — the Common App does not warn you, it just truncates.
                      </span>
                    </div>
                  )}
                  <div style={{ ...R({ gap: 9, alignItems: 'flex-start', padding: '11px 13px' }), borderRadius: 10, background: tint(C.blue, 0.06), border: `1px solid ${tint(C.blue, 0.16)}` }}>
                    <Info size={13} color={C.blueL} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
                      Slots are ordered by how much weight each activity carries — hours, leadership, years, measured impact. The Common App asks you to list them in order of importance to <i>you</i>, and readers weight the first three hardest, so reorder with the arrows if our ranking is wrong.
                    </span>
                  </div>

                  {exported.slots.map((s, i) => (
                    <SlotCard
                      key={s.id} slot={s}
                      canUp={i > 0} canDown={i < exported.slots.length + exported.overflow.length - 1}
                      onMove={(d) => move(i, d)}
                      onCategoryChange={(v) => setOverrides(o => ({ ...o, [String(s.id)]: v }))}
                    />
                  ))}

                  {exported.overflow.length > 0 && (
                    <div style={{ ...glass2({ padding: 13 }), border: `1px solid ${tint(C.amber, 0.25)}`, background: tint(C.amber, 0.05) }}>
                      <div style={R({ gap: 8, marginBottom: 8 })}>
                        <AlertTriangle size={13} color={C.amberL} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: C.amberL }}>{exported.overflow.length} activit{exported.overflow.length === 1 ? 'y does' : 'ies do'} not fit in the ten slots</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, marginBottom: 9 }}>
                        These ranked lowest. If one of them matters more to you than something above it, move it up — the ten slots are the whole section, and what falls off here is invisible to every school you apply to.
                      </div>
                      {exported.overflow.map((s, i) => (
                        <div key={s.id} style={R({ gap: 9, justifyContent: 'space-between', padding: '7px 0', borderTop: `1px solid ${C.b1}` })}>
                          <span style={{ fontSize: 12, color: C.t2 }}>{s.position.text}{s.organization.text ? ` · ${s.organization.text}` : ''}</span>
                          <button type="button" onClick={() => move(exported.slots.length + i, -1)} style={btnSm(C.s3, { padding: '4px 8px', fontSize: 10.5 })}><ChevronUp size={11} />Move up</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ ...glass2({ padding: 13 }), borderLeft: `3px solid ${C.gold}` }}>
                    <div style={R({ gap: 8, marginBottom: 10 })}>
                      <Award size={13} color={C.goldL} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.goldL, textTransform: 'uppercase', letterSpacing: '.06em' }}>Honors section — {exported.counts.usedHonors} of {CA_LIMITS.maxHonors} slots</span>
                    </div>
                    {exported.honors.length === 0 ? (
                      <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.6 }}>
                        Nothing logged. Five slots sit empty on every application you send. Honor roll, AP Scholar, a subject award, a competition placement, a certification — these all belong here, and empty slots read as nothing earned rather than as modesty.
                      </div>
                    ) : exported.honors.map(h => (
                      <div key={h.id} style={{ padding: '9px 0', borderTop: `1px solid ${C.b1}` }}>
                        <div style={R({ gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' })}>
                          <span style={{ fontSize: 12.5, color: C.t1, fontWeight: 600 }}>{h.slot}. {h.title.text}</span>
                          <div style={R({ gap: 7 })}>
                            <span style={{ fontSize: 10, color: h.title.over ? C.rose : C.t4, fontFamily: C.FM }}>{h.title.len}/{CA_LIMITS.honorTitle}</span>
                            <CopyButton value={h.title.text} small />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: C.t3, marginTop: 3 }}>
                          Grade: {h.grade || '— not set'} · Level of recognition: {h.level || '— not set'}
                        </div>
                        <ProblemList problems={h.problems} />
                      </div>
                    ))}
                    {exported.honorOverflow.length > 0 && (
                      <div style={{ fontSize: 11.5, color: C.t3, marginTop: 10, lineHeight: 1.55 }}>
                        {exported.honorOverflow.length} more honor{exported.honorOverflow.length === 1 ? '' : 's'} did not fit in five slots: {exported.honorOverflow.map(h => h.title.text).join(', ')}. Ranked by level of recognition — set levels on any that are missing one and this ordering changes.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <pre style={{
                  margin: 0, fontFamily: C.FM, fontSize: 11.5, color: C.t2, lineHeight: 1.65,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.b1}`, borderRadius: 10, padding: 14,
                }}>{plainText}</pre>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '13px 20px', borderTop: `1px solid ${C.b1}`, flexShrink: 0, ...R({ gap: 9, flexWrap: 'wrap', justifyContent: 'space-between' }) }}>
              <span style={{ fontSize: 10.5, color: C.t4, lineHeight: 1.5, flex: 1, minWidth: 190 }}>
                Character limits and slot counts follow the Common Application's own fields. Confirm this year's form before you submit — application software changes.
              </span>
              <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                {onExportPdf && (
                  <button style={btnG({ fontSize: 12, padding: '8px 14px' })} onClick={onExportPdf}><FileDown size={13} />Résumé PDF</button>
                )}
                <button
                  style={{ ...btn(`linear-gradient(135deg,${C.blue},${C.violet})`, { fontSize: 12.5, padding: '9px 16px' }) }}
                  onClick={() => {
                    const text = format === 'commonapp' ? renderCommonAppText(exported) : plainText;
                    navigator.clipboard?.writeText(text).then(
                      () => toast.success(format === 'commonapp'
                        ? `Copied all ${exported.counts.usedSlots} slots, field by field`
                        : `Copied your ${activeFormat.label.toLowerCase()}`),
                      () => toast.error('Could not copy to clipboard')
                    );
                  }}
                >
                  <ClipboardCopy size={13} />Copy {activeFormat.label.toLowerCase()}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
