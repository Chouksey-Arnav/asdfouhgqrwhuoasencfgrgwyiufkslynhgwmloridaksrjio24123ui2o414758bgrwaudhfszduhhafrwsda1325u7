import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, CircleDot, ChevronDown, ExternalLink, AlertTriangle,
  Target, Clock, Trash2, MoveRight, CalendarPlus, X, Lightbulb, ShieldQuestion,
} from 'lucide-react';
import { C, glass2, btnSm, btnG, R, CC, tint, inp, pill } from '../../lib/theme';
import { displaysExactDate } from '../../data/roadmap/index.js';
import { itemUrgency, effectiveDue, awaitingDate, linkableUrl } from '../../lib/roadmap/model';
import {
  ItemDate, TrackChip, UrgencyChip, Chip, ConfirmNotice, trackColor, TRACK_ICON,
  SELECTIVITY_LABEL, EFFORT_LABEL, STATUS_META, fmtDate,
} from './roadmapUi';

// ─────────────────────────────────────────────────────────────────────────────
// One roadmap item: the collapsed row, and the expanded working detail.
//
// ── The information hierarchy, and why it is this way round ─────────────────
// Collapsed, an item answers three questions and no others: WHAT is it, WHEN
// does the work start, and HOW urgent is that. Deliberately not "when is it
// due" — the deadline is the least actionable fact about an item whose
// preparation takes eight weeks, and leading with it is precisely how a student
// looks at a scholarship in August, sees "October", and does nothing until
// September.
//
// Expanded, it becomes the working document: what this specifically does for
// THIS student, the ordered steps with checkboxes, the thing that usually goes
// wrong, the honest time cost, and the official link. That is the level a
// counselor works at, and it is why the steps are individually tickable — a
// six-week application is not a checkbox, and rendering it as one is how it gets
// postponed.
// ─────────────────────────────────────────────────────────────────────────────

export default function RoadmapItem({
  item, today, expanded, onToggleExpand, onToggleDone, onSetStatus, onToggleStep,
  onSetDate, onMoveSeason, onRemove, seasons = [], isMobile = false, dense = false,
}) {
  const [dateDraft, setDateDraft] = useState('');
  const [showDateEntry, setShowDateEntry] = useState(false);
  const urgency = itemUrgency(item, today);
  const color = trackColor(item.track);
  const Icon = TRACK_ICON[item.track] || Target;
  const done = item.status === 'done';
  const skipped = item.status === 'skipped';
  const StatusIcon = done ? CheckCircle2 : item.status === 'doing' ? CircleDot : Circle;

  const stepsDone = new Set(item.doneSteps || []);
  const stepCount = (item.steps || []).length;

  const openDateEntry = () => { setShowDateEntry(true); if (!expanded) onToggleExpand?.(); };

  return (
    <div style={{
      ...glass2({ padding: 0 }),
      border: `1px solid ${urgency === 'missed' || urgency === 'critical' ? tint(C.rose, 0.35) : expanded ? tint(color, 0.35) : C.b1}`,
      opacity: skipped ? 0.5 : 1,
      overflow: 'hidden',
      background: expanded ? `linear-gradient(135deg,${tint(color, 0.06)},transparent 70%)` : C.surf2,
      transition: 'border-color .15s',
    }}>
      {/* ── Collapsed row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: dense ? '11px 13px' : '14px 16px' }}>
        <button
          type="button"
          onClick={() => onToggleDone?.(item.id)}
          aria-label={done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
          title={done ? 'Mark as not done' : 'Mark as done'}
          style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', flexShrink: 0, marginTop: 4 }}
        >
          <StatusIcon size={19} color={done ? C.green : item.status === 'doing' ? C.sky : C.t4} />
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={!!expanded}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: C.FB }}
        >
          <div style={{
            fontSize: dense ? 13 : 14, fontWeight: 700, color: C.t1, lineHeight: 1.4,
            textDecoration: done || skipped ? 'line-through' : 'none',
          }}>
            {item.title}
          </div>
          {item.org && <div style={{ fontSize: 11, color: C.t4, marginTop: 4 }}>{item.org}</div>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', marginTop: 8 }}>
            <TrackChip track={item.track} />
            {!done && !skipped && <UrgencyChip urgency={urgency} />}
            {item.isStretch && <Chip color={C.fuchsia} icon={Target}>Long shot</Chip>}
            {item.selectivity && item.selectivity !== 'open' && !item.isStretch && (
              <Chip color={C.t3}>{SELECTIVITY_LABEL[item.selectivity]}</Chip>
            )}
          </div>

          {/* The date line. Always via <ItemDate>, never a raw interpolation —
              see the header of roadmapUi.jsx. When the work should START is
              printed alongside, because that is the number that changes
              behavior. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <ItemDate item={item} onFindDate={awaitingDate(item) ? openDateEntry : null} />
            {!done && item.startBy && displaysExactDate(item) && item.startBy !== effectiveDue(item) && (
              <span style={{ fontSize: 11, color: urgency === 'start-now' ? C.amber : C.t4, fontWeight: urgency === 'start-now' ? 700 : 500 }}>
                start by {fmtDate(item.startBy)}
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 4, flexShrink: 0 }}
        >
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} style={{ display: 'flex' }}>
            <ChevronDown size={16} color={C.t3} />
          </motion.span>
        </button>
      </div>

      {/* ── Expanded working detail ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: dense ? '0 13px 13px' : '0 16px 16px', borderTop: `1px solid ${C.b1}`, paddingTop: 12, marginTop: 4 }}>
              {/* Why this, for you */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: tint(color, 0.13),
                  border: `1px solid ${tint(color, 0.24)}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} color={color} />
                </div>
                <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.55 }}>
                  {item.howThisHelps || item.why}
                </div>
              </div>

              {/* Honest cost + what usually goes wrong */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: item.watchOut ? 12 : 16 }}>
                {item.timeCost && <Chip color={C.sky} icon={Clock}>{item.timeCost}</Chip>}
                {!item.timeCost && item.effort && <Chip color={C.sky} icon={Clock}>{EFFORT_LABEL[item.effort]} effort</Chip>}
                {item.cost && item.cost !== 'varies' && <Chip color={C.green}>{COST_LABEL[item.cost] || item.cost}</Chip>}
                {item.format && item.format !== 'varies' && <Chip color={C.t3}>{FORMAT_LABEL[item.format] || item.format}</Chip>}
                {item.prepWeeks > 0 && <Chip color={C.amber}>~{item.prepWeeks} weeks of prep</Chip>}
              </div>

              {item.watchOut && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16,
                  background: tint(C.amber, 0.08), border: `1px solid ${tint(C.amber, 0.2)}`,
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <AlertTriangle size={13} color={C.amber} style={{ flexShrink: 0, marginTop: 4 }} />
                  <div style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55 }}>
                    <b style={{ color: C.t1 }}>What usually goes wrong: </b>{item.watchOut}
                  </div>
                </div>
              )}

              {/* The steps. Individually tickable, in order — a six-week
                  application rendered as one checkbox is a six-week application
                  that gets postponed. */}
              {stepCount > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...R({ justifyContent: 'space-between', marginBottom: 8 }) }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: C.t3, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))'}}>
                      How you actually do this
                    </span>
                    <span style={{ fontSize: 10.5, color: C.t4, fontFamily: C.FM }}>{stepsDone.size}/{stepCount}</span>
                  </div>
                  <div style={CC({ gap: 4 })}>
                    {(item.steps || []).map((step, i) => {
                      const on = stepsDone.has(i);
                      return (
                        <button key={i} type="button" onClick={() => onToggleStep?.(item.id, i)} style={{
                          display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'left', width: '100%',
                          background: 'transparent', border: 0, padding: '4px 0px', cursor: 'pointer', fontFamily: C.FB,
                        }}>
                          <span style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 4,
                            border: `1.5px solid ${on ? C.green : C.b2}`, background: on ? C.green : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {on && <CheckCircle2 size={11} color={C.onAccent || '#fff'} strokeWidth={3} />}
                          </span>
                          <span style={{
                            fontSize: 12, color: on ? C.t4 : C.t2, lineHeight: 1.55,
                            textDecoration: on ? 'line-through' : 'none',
                          }}>{step}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {item.firstMove && !stepCount && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
                  <Lightbulb size={13} color={C.amber} style={{ flexShrink: 0, marginTop: 4 }} />
                  <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>
                    <b style={{ color: C.t1 }}>Start here: </b>{item.firstMove}
                  </div>
                </div>
              )}

              <ConfirmNotice item={item} />

              {/* Pin the real local date. The most valuable interaction in the
                  tab — see setItemDate() in model.js. */}
              {awaitingDate(item) && (
                showDateEntry ? (
                  <div style={{ ...R({ gap: 8, marginTop: 12, flexWrap: 'wrap' }) }}>
                    <input
                      type="date"
                      value={dateDraft}
                      onChange={(e) => setDateDraft(e.target.value)}
                      aria-label={`Real date for ${item.title}`}
                      style={{ ...inp({ width: 'auto', flex: '1 1 170px', fontSize: 12.5, padding: '8px 12px' }) }}
                    />
                    <button
                      disabled={!dateDraft}
                      onClick={() => { onSetDate?.(item.id, dateDraft); setShowDateEntry(false); }}
                      style={{ ...btnSm(tint(C.violet, 0.2), { opacity: dateDraft ? 1 : 0.4, borderColor: tint(C.violet, 0.4) }) }}
                    >Pin it</button>
                    <button onClick={() => setShowDateEntry(false)} style={btnSm()}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={openDateEntry} style={{ ...btnSm(tint(C.violet, 0.14), { marginTop: 12, borderColor: tint(C.violet, 0.3), color: C.t1 }) }}>
                    <CalendarPlus size={12} /> I looked it up — pin the real date
                  </button>
                )
              )}

              {item.studentDate && (
                <div style={{ ...R({ gap: 8, marginTop: 12 }) }}>
                  <span style={{ ...pill(tint(C.green, 0.12), C.green, { fontSize: 10.5, fontWeight: 700 }) }}>
                    Your date: {fmtDate(item.studentDate)}
                  </span>
                  <button onClick={() => onSetDate?.(item.id, null)} style={{ background: 'transparent', border: 0, fontSize: 10.5, color: C.t4, cursor: 'pointer', textDecoration: 'underline' }}>
                    clear
                  </button>
                </div>
              )}

              {/* Actions */}
              <div style={{ ...R({ gap: 8, marginTop: 16, flexWrap: 'wrap', paddingTop: 12, borderTop: `1px solid ${C.b1}` }) }}>
                {linkableUrl(item.url) && (
                  <a href={linkableUrl(item.url)} target="_blank" rel="noopener noreferrer" style={{ ...btnSm(C.surfHi, { textDecoration: 'none' }) }}>
                    <ExternalLink size={12} /> Official page
                  </a>
                )}
                <StatusPicker status={item.status} onSet={(s) => onSetStatus?.(item.id, s)} />
                {seasons.length > 1 && (
                  <SeasonPicker
                    seasons={seasons}
                    current={item.season}
                    onMove={(s) => onMoveSeason?.(item.id, s)}
                  />
                )}
                {item.addedBy === 'student' && onRemove && (
                  <button onClick={() => onRemove(item.id)} style={{ ...btnSm(C.surfHi, { color: C.rose }) }}>
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>

              {item.fallbackFor && (
                <div style={{ ...R({ gap: 8, marginTop: 12 }) }}>
                  <ShieldQuestion size={12} color={C.teal} />
                  <span style={{ fontSize: 10.5, color: C.t3 }}>
                    This is your backup if the long shot it sits beside says no.
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const COST_LABEL = {
  free: 'Free',
  'free-plus-stipend': 'Free + paid',
  'entry-fee': 'Entry fee',
  'paid-tuition-aid-available': 'Costs money, aid available',
  'paid-tuition': 'Costs money',
};
const FORMAT_LABEL = { 'in-person': 'In person', virtual: 'Virtual', hybrid: 'Hybrid' };

function StatusPicker({ status, onSet }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[status] || STATUS_META.todo;
  const MetaIcon = meta.icon;
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ ...btnSm(C.surfHi, { color: meta.color }) }}>
        <MetaIcon size={12} /> {meta.label} <ChevronDown size={11} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, zIndex: 5,
          background: C.surf, border: `1px solid ${C.b2}`, borderRadius: 8, padding: 4,
          boxShadow: C.shadow, minWidth: 148,
        }}>
          {Object.entries(STATUS_META).map(([key, m]) => {
            const I = m.icon;
            return (
              <button key={key} onClick={() => { onSet(key); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                background: key === status ? C.surfHi : 'transparent', border: 0, borderRadius: 4,
                padding: '8px 8px', cursor: 'pointer', fontSize: 12, color: C.t1, fontFamily: C.FB,
              }}>
                <I size={12} color={m.color} /> {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeasonPicker({ seasons, current, onMove }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={btnSm()}>
        <MoveRight size={12} /> Move <ChevronDown size={11} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, zIndex: 5,
          background: C.surf, border: `1px solid ${C.b2}`, borderRadius: 8, padding: 4,
          boxShadow: C.shadow, minWidth: 170,
        }}>
          {seasons.map((s) => (
            <button key={s.id} onClick={() => { onMove(s.id); setOpen(false); }} disabled={s.id === current} style={{
              display: 'block', width: '100%', textAlign: 'left', border: 0, borderRadius: 4,
              background: s.id === current ? C.surfHi : 'transparent', padding: '8px 8px',
              cursor: s.id === current ? 'default' : 'pointer', fontSize: 12, color: s.id === current ? C.t3 : C.t1,
              fontFamily: C.FB, opacity: s.id === current ? 0.6 : 1,
            }}>
              {s.label}{s.theme ? ` — ${s.theme}` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
