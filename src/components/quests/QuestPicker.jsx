// ─────────────────────────────────────────────────────────────────────────────
// Choosing a quest — the same component for a student picking their own and a
// parent choosing one for their child, because it is the same decision and the
// same catalog. Only two things change: `audience`, which swaps the rationale
// text (a student reads "what counts"; a parent reads "why this one"), and
// whether a note box is offered.
//
// ── The honest-cost line is the point of this screen ────────────────────────
// Every card leads with what the quest ACTUALLY costs in calendar time —
// "at least 14 days of work" — not with its reward. A picker that leads with
// "+1000 XP" sells quests that get abandoned in week two, and an abandoned
// quest is worse than one never started: it teaches the student that the whole
// system is noise.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Check, Clock, CalendarDays, Loader2, Info, Route, Sparkles } from 'lucide-react';
import { C, glass, glass2, pill, R, CC, tint, btn, btnG, onTint } from '../../lib/theme';
import Portal from '../ui/Portal';
import {
  QUESTS, QUEST_CATEGORIES, CATEGORY_ORDER, QUEST_TIERS, questXP, questColor,
  minimumDays, weeklyCost, dailyCost, chainFor, tierRank,
} from '../../lib/quests';
import { questIcon } from './questIcons';

const ALL = '__all__';
const CATEGORIES = CATEGORY_ORDER.map((id) => QUEST_CATEGORIES[id]);

export default function QuestPicker({
  open,
  onClose,
  onPick,                 // (questId, note) → Promise
  activeIds = [],
  doneIds = [],           // already claimed — shown as finished rather than offered fresh
  audience = 'student',   // 'student' | 'parent'
  studentName = null,
  recommended = [],       // [{ id, reason }] — the parent's ranked list, if any
  busyId = null,
  error = null,
  m = false,
}) {
  const [cat, setCat] = useState(ALL);
  const [q, setQ] = useState('');
  const [noteFor, setNoteFor] = useState(null);
  const [note, setNote] = useState('');

  const taken = useMemo(() => new Set(activeIds), [activeIds]);
  const finished = useMemo(() => new Set(doneIds), [doneIds]);
  const reasons = useMemo(() => Object.fromEntries(recommended.map((r) => [r.id, r.reason])), [recommended]);
  const recOrder = useMemo(() => new Map(recommended.map((r, i) => [r.id, i])), [recommended]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return QUESTS
      .filter((x) => cat === ALL || x.category === cat)
      .filter((x) => !needle || `${x.title} ${x.blurb} ${x.proof}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        // Recommended first, in the recommender's own order — it already ranked
        // them by how much this student needs them.
        const ra = recOrder.has(a.id) ? recOrder.get(a.id) : 999;
        const rb = recOrder.has(b.id) ? recOrder.get(b.id) : 999;
        if (ra !== rb) return ra - rb;
        // Then easiest first. A picker that leads with the six-week Legend sells
        // quests that get abandoned in week two, and an abandoned quest teaches
        // a student that the whole system is noise.
        const t = tierRank(a.tier) - tierRank(b.tier);
        if (t) return t;
        return a.windowDays - b.windowDays;
      });
  }, [cat, q, recOrder]);

  if (!open) return null;

  const submit = async (quest) => {
    await onPick?.(quest.id, noteFor === quest.id ? note.trim() : '');
    setNoteFor(null);
    setNote('');
  };

  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(2,6,23,0.72)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: m ? 'flex-end' : 'center', justifyContent: 'center', padding: m ? 0 : 24,
        }}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog" aria-modal="true" aria-label="Choose a quest"
          style={{
            ...glass({ padding: 0 }), width: '100%', maxWidth: 780,
            maxHeight: m ? '92vh' : '86vh', display: 'flex', flexDirection: 'column',
            borderRadius: m ? '18px 18px 0 0' : 18, overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: m ? '16px 16px 12px' : '20px 22px 14px', borderBottom: `1px solid ${C.b1}` }}>
            <div style={R({ justifyContent: 'space-between', gap: 12 })}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.t1, fontFamily: C.FD, letterSpacing: 'calc(-0.17px + var(--msp-letter-spacing))' }}>
                  {audience === 'parent' ? `Set a quest${studentName ? ` for ${studentName}` : ''}` : 'Take on a quest'}
                </div>
                <div style={{ fontSize: 11.5, color: C.t3, marginTop: 4, lineHeight: 1.5 }}>
                  {audience === 'parent'
                    ? 'They can decline it, and they will see who asked. Pick one thing, not three.'
                    : 'Weeks of work for a reward nothing else in the app pays. Pick one you will actually finish.'}
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" style={btnG({ padding: 8, borderRadius: 8 })}><X size={15} /></button>
            </div>

            {/* Filters */}
            <div style={{ ...R({ gap: 8, flexWrap: 'wrap' }), marginTop: 12 }}>
              {[{ id: ALL, label: 'All', color: C.t2 }, ...CATEGORIES].map((c) => (
                <button
                  key={c.id} onClick={() => setCat(c.id)}
                  style={{
                    ...pill(cat === c.id ? tint(c.color, 0.18) : C.s3, cat === c.id ? c.color : C.t3, { fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${cat === c.id ? tint(c.color, 0.34) : 'transparent'}` }),
                  }}
                >{c.label}</button>
              ))}
            </div>
            <div style={{ ...R({ gap: 8 }), marginTop: 8, ...glass2({ padding: '8px 12px' }) }}>
              <Search size={13} color={C.t3} />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search quests"
                style={{ flex: 1, background: 'transparent', border: 'none', color: C.t1, fontSize: 12.5, fontFamily: C.FB }}
              />
            </div>
            {error && (
              <div style={{ ...R({ gap: 8 }), marginTop: 8, padding: '8px 12px', borderRadius: 8, background: tint(C.rose, 0.1), border: `1px solid ${tint(C.rose, 0.26)}`, fontSize: 11.5, color: C.roseL }}>
                <Info size={12} style={{ flexShrink: 0 }} />{error}
              </div>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', padding: m ? 14 : 18, ...CC({ gap: 8 }) }}>
            {rows.length === 0 && (
              <div style={{ fontSize: 12.5, color: C.t3, textAlign: 'center', padding: 24 }}>Nothing matches that.</div>
            )}
            {rows.map((quest) => {
              const color = questColor(quest);
              const Icon = questIcon(quest.icon);
              const tier = QUEST_TIERS[quest.tier];
              const running = taken.has(quest.id);
              const done = finished.has(quest.id);
              const minDays = minimumDays({ questId: quest.id });
              const reason = reasons[quest.id];
              const chain = chainFor(quest.id);
              const busy = busyId === quest.id;

              return (
                <div
                  key={quest.id}
                  style={{
                    ...glass2({ padding: 12 }),
                    border: `1px solid ${reason ? tint(color, 0.34) : C.b1}`,
                    background: reason ? `linear-gradient(135deg, ${tint(color, 0.08)}, transparent 70%)` : C.surf2,
                    opacity: running || done ? 0.55 : 1,
                  }}
                >
                  <div style={R({ gap: 12, alignItems: 'flex-start' })}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                      background: tint(color, 0.15), border: `1px solid ${tint(color, 0.3)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Icon size={17} color={color} /></div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={R({ gap: 8, flexWrap: 'wrap' })}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.t1, fontFamily: C.FD }}>{quest.title}</span>
                        <span style={pill(tint(tier.color, 0.15), tier.color, { fontSize: 9, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' })}>{tier.label}</span>
                        <span style={pill(tint(C.amber, 0.14), C.amberL, { fontSize: 9.5, fontFamily: C.FM, fontWeight: 800 })}>+{questXP(quest)} XP</span>
                        {reason && <span style={pill(tint(C.violet, 0.15), C.violetL, { fontSize: 9, fontWeight: 800, letterSpacing: 'calc(0.4px + var(--msp-letter-spacing))' })}>Suggested</span>}
                        {chain && (
                          <span style={{ ...pill(tint(chain.color, 0.13), chain.color, { fontSize: 9, fontWeight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Route size={9} />{chain.label} {chain.step}/{chain.of}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.t2, marginTop: 4, lineHeight: 1.5 }}>{quest.blurb}</div>

                      {/* The honest cost, before anything else persuasive. */}
                      <div style={{ ...R({ gap: 12, flexWrap: 'wrap' }), marginTop: 8 }}>
                        <span style={{ ...R({ gap: 4 }), fontSize: 10.5, color: C.t3 }}>
                          <CalendarDays size={11} color={C.t3} />at least {minDays} days of work
                        </span>
                        <span style={{ ...R({ gap: 4 }), fontSize: 10.5, color: C.t3 }}>
                          <Clock size={11} color={C.t3} />{quest.windowDays}-day window
                        </span>
                        <span style={{ fontSize: 10.5, color: C.t3 }}>≈ {weeklyCost(quest)}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: C.t3, marginTop: 4 }}>
                        Day to day, that is <b style={{ color: C.t2 }}>{dailyCost(quest)}</b>.
                      </div>

                      <div style={{ fontSize: 10.5, color: C.t3, marginTop: 8, lineHeight: 1.55 }}>
                        {audience === 'parent' ? quest.why : quest.proof}
                      </div>

                      {reason && (
                        <div style={{ ...R({ gap: 8, alignItems: 'flex-start' }), marginTop: 8, padding: '8px 8px', borderRadius: 8, background: tint(C.violet, 0.09), border: `1px solid ${tint(C.violet, 0.2)}` }}>
                          <span style={{ fontSize: 10.5, color: C.t2, lineHeight: 1.5 }}>{reason}</span>
                        </div>
                      )}

                      {/* Note box — parent only, and only for the quest being assigned. */}
                      {audience === 'parent' && noteFor === quest.id && (
                        <textarea
                          value={note} onChange={(e) => setNote(e.target.value.slice(0, 600))}
                          placeholder="Say why, in a line. They will see this on the quest."
                          rows={2}
                          style={{
                            width: '100%', marginTop: 8, padding: '8px 8px', borderRadius: 8, resize: 'vertical',
                            background: C.s3, border: `1px solid ${C.b1}`, color: C.t1, fontSize: 12, fontFamily: C.FB,
                          }}
                        />
                      )}
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      {running ? (
                        <span style={{ ...pill(tint(C.green, 0.13), C.greenL, { fontSize: 10, fontWeight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={10} />Running</span>
                      ) : done ? (
                        <span style={{ ...pill(tint(C.gold, 0.13), C.goldL, { fontSize: 10, fontWeight: 700 }), display: 'inline-flex', alignItems: 'center', gap: 4 }}><Sparkles size={10} />Finished</span>
                      ) : audience === 'parent' && noteFor !== quest.id ? (
                        <button onClick={() => { setNoteFor(quest.id); setNote(''); }} style={btnG({ fontSize: 11.5, padding: '8px 12px' })}>Choose</button>
                      ) : (
                        <button
                          onClick={() => submit(quest)} disabled={busy}
                          style={{ ...btn(`linear-gradient(135deg, ${color}, ${tint(color, 0.7)})`, { fontSize: 11.5, padding: '8px 12px', color: onTint(color) }), opacity: busy ? 0.6 : 1 }}
                        >{busy ? <Loader2 size={12} className="spin" /> : null}{audience === 'parent' ? 'Assign' : 'Take it on'}</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
}
