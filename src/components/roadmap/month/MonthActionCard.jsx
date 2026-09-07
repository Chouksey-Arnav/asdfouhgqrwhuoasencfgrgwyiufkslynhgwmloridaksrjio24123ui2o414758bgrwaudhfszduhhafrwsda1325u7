import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, ChevronDown, Check, Clock, Target, ExternalLink, Paperclip, Loader2, X, Link2,
} from 'lucide-react';
import { C, glass, glass2, btn, btnSm, btnG, R, CC, tint, inp, accentText, onFill, eyebrow } from '../../../lib/theme';
import {
  STATE_META, STATE_MENU, domainMeta, PRIORITY_META, URGENCY_META, ActionDate, Chip, WhyThis,
} from './monthUi';
import { actionUrgency } from '../../../lib/monthPlan/model';
import { linkableUrl } from '../../../lib/roadmap/model';

// ─────────────────────────────────────────────────────────────────────────────
// One ranked action.
//
// Everything the student needs to decide whether to do this thing, and to say
// what happened, without leaving the card:
//
//   what it is           — the title, in an imperative
//   why it is on YOUR    — the reason, drawn from a real number about them
//     plan
//   when                 — through <ActionDate>, never raw
//   how much             — the estimated effort
//   how you know you     — the definition of done, always visible, because an
//     are finished          action without one generates an argument later
//   what to log          — the evidence prompt, shown at the moment of
//                          completion when it is actually answerable
//   what it is linked to — the opportunity, activity or college behind it
//   help                 — one tap, with this card's context preloaded
//
// ── Why the state menu is ten items and not a checkbox ──────────────────────
// Because "I did not do it" has ten different meanings and nine of them are
// actionable. A checkbox throws all of that away and leaves the plan repeating
// itself next month. See src/lib/monthPlan/adapt.js for what each one does.
// ─────────────────────────────────────────────────────────────────────────────

export default function MonthActionCard({
  action, accent = C.violet, isMobile = false, today,
  onSetState, onAskMedabrain, onToggleStep, onLogEvidence, onOpenLink,
  busy = false, defaultExpanded = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [noteFor, setNoteFor] = useState(null);   // a state awaiting an optional note
  const [note, setNote] = useState('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidence, setEvidence] = useState('');

  const state = STATE_META[action.status] || STATE_META.not_started;
  const dom = domainMeta(action.domain);
  const pri = PRIORITY_META[action.priority] || PRIORITY_META.standard;
  const urgency = URGENCY_META[actionUrgency(action, today)] || URGENCY_META.flexible;
  const StateIcon = state.icon;
  const DomIcon = dom.icon;
  const settled = state.group === 'closed' || state.group === 'blocked';
  const url = linkableUrl(action.link?.url);

  const choose = useCallback((next) => {
    setMenuOpen(false);
    // The states where the student's own words are the most valuable thing we
    // could collect get a one-line box first. Everything else applies instantly
    // — a confirmation step on "in progress" is friction with no payoff.
    if (['too_difficult', 'too_expensive', 'too_far_away', 'declined', 'not_interested', 'paused'].includes(next)) {
      setNoteFor(next);
      return;
    }
    onSetState?.(action, next, '');
    if (next === 'complete') setEvidenceOpen(true);
  }, [action, onSetState]);

  const confirmNote = useCallback(() => {
    onSetState?.(action, noteFor, note.trim());
    setNoteFor(null);
    setNote('');
  }, [action, noteFor, note, onSetState]);

  const submitEvidence = useCallback(() => {
    const text = evidence.trim();
    if (!text) { setEvidenceOpen(false); return; }
    onLogEvidence?.(action, text);
    setEvidence('');
    setEvidenceOpen(false);
  }, [action, evidence, onLogEvidence]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: settled ? 0.72 : 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        ...glass({ padding: isMobile ? 14 : 16 }),
        borderLeft: `3px solid ${settled ? C.s3 : (action.priority === 'critical' ? C.rose : dom.color)}`,
        position: 'relative',
      }}
    >
      {/* ── Header row: domain, priority, when ─────────────────────────────── */}
      <div style={R({ gap: 8, flexWrap: 'wrap', marginBottom: 8 })}>
        <Chip icon={DomIcon} label={dom.label} color={dom.color} />
        {action.priority === 'critical' && <Chip label={pri.label} color={pri.color} strong />}
        <span style={{ flex: 1 }} />
        <ActionDate timing={action.timing} />
      </div>

      {/* ── The action itself ──────────────────────────────────────────────── */}
      <div style={{
        fontSize: isMobile ? 15 : 16, fontWeight: 700, color: C.t1, lineHeight: 1.35,
        textDecoration: action.status === 'complete' ? 'line-through' : 'none',
      }}>
        {action.title}
      </div>
      <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, marginTop: 8 }}>{action.reason}</div>

      <WhyThis open={whyOpen} onToggle={() => setWhyOpen((v) => !v)} accent={accent}>
        {action.whyThisMatters || action.reason}
      </WhyThis>

      {/* ── Effort, urgency, linkage ───────────────────────────────────────── */}
      <div style={R({ gap: 8, flexWrap: 'wrap', marginTop: 8 })}>
        <Chip icon={Clock} label={action.effortLabel || `${action.effortHours}h`} color={C.t3} title="Roughly how long this takes" />
        <Chip icon={urgency.icon} label={urgency.label} color={urgency.color} />
        {action.link?.label && (
          <button
            type="button"
            onClick={() => onOpenLink?.(action.link)}
            style={{
              ...btnSm(tint(dom.color, 0.12), { fontSize: 10.5, padding: '4px 8px', border: `1px solid ${tint(dom.color, 0.3)}`, color: accentText(dom.color) }),
            }}
          >
            <Link2 size={11} />{action.link.label}
          </button>
        )}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ ...btnSm(C.s2, { fontSize: 10.5, padding: '4px 8px', textDecoration: 'none' }) }}>
            <ExternalLink size={11} />Official page
          </a>
        )}
      </div>
      {action.link?.verified && (
        <div style={{ fontSize: 10.5, color: C.t4, marginTop: 8, fontFamily: C.FM }}>
          Our catalog last checked this {action.link.verified}. Deadlines move — confirm before you rely on one.
        </div>
      )}

      {/* ── Definition of done — always visible, never behind a disclosure ── */}
      <div style={{
        ...glass2({ padding: 8, marginTop: 8 }),
        borderLeft: `2px solid ${tint(C.green, 0.4)}`,
      }}>
        <div style={R({ gap: 8, marginBottom: 4 })}>
          <Target size={11} color={C.green} />
          <span style={{ ...eyebrow(11), fontWeight: 700, color: C.green }}>Done when</span>
        </div>
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.55 }}>{action.definitionOfDone}</div>
      </div>

      {/* ── Steps ──────────────────────────────────────────────────────────── */}
      {action.steps?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={() => setExpanded((v) => !v)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.t3, fontSize: 11.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }} />
            {expanded ? 'Hide steps' : `${action.steps.length} steps`}
          </button>
          {expanded && (
            <div style={CC({ gap: 8, marginTop: 8 })}>
              {action.steps.map((s, i) => {
                const done = (action.doneSteps || []).includes(i);
                return (
                  <button
                    key={i} type="button" onClick={() => onToggleStep?.(action, i)}
                    style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'left',
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      fontSize: 12, color: done ? C.t4 : C.t2, lineHeight: 1.5,
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                  >
                    <span style={{
                      flexShrink: 0, width: 15, height: 15, borderRadius: 4, marginTop: 4,
                      border: `1px solid ${done ? C.green : C.s3}`, background: done ? C.green : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{done && <Check size={10} color={onFill(C.green)} />}</span>
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── The student's own words about this one ─────────────────────────── */}
      {action.statusNote && (
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 8, fontStyle: 'italic' }}>
          You said: “{action.statusNote}”
        </div>
      )}
      {action.evidenceLogged?.length > 0 && (
        <div style={{ fontSize: 11.5, color: C.green, marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Paperclip size={12} style={{ marginTop: 4, flexShrink: 0 }} />
          <span>{action.evidenceLogged[action.evidenceLogged.length - 1].text}</span>
        </div>
      )}

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div style={R({ gap: 8, marginTop: 12, flexWrap: 'wrap' })}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={busy}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            style={btnSm(tint(state.color, 0.14), {
              fontSize: 12, border: `1px solid ${tint(state.color, 0.34)}`, color: accentText(state.color), gap: 8,
            })}
          >
            {busy ? <Loader2 size={13} className="spin" /> : <StateIcon size={13} color={state.color} />}
            {state.label}
            <ChevronDown size={12} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                role="menu"
                style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 40,
                  ...glass({ padding: 8, minWidth: 226 }),
                  boxShadow: C.cmp.cardShadow,
                }}
              >
                {STATE_MENU.map((id) => {
                  const m = STATE_META[id];
                  const Ic = m.icon;
                  return (
                    <button
                      key={id} type="button" role="menuitem" onClick={() => choose(id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                        background: action.status === id ? tint(m.color, 0.14) : 'transparent',
                        border: 'none', borderRadius: 8, padding: '8px 8px', cursor: 'pointer',
                        color: C.t2, fontSize: 12, fontFamily: C.FB,
                      }}
                    >
                      <Ic size={13} color={m.color} />{m.label}
                    </button>
                  );
                })}
                <div style={{ fontSize: 10.5, color: C.t4, padding: '8px 8px 4px', lineHeight: 1.5 }}>
                  Saying no is useful. We learn from it and stop suggesting the same kind of thing.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => onAskMedabrain?.(action)}
          style={btnG({ fontSize: 12, padding: '8px 16px', gap: 8 })}
        >
          <Brain size={13} color={accent} />Ask Medabrain
        </button>
      </div>

      {/* ── The optional one-line "why" ────────────────────────────────────── */}
      <AnimatePresence>
        {noteFor && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ ...glass2({ padding: 12, marginTop: 8 }) }}>
              <div style={{ fontSize: 12, color: C.t2, marginBottom: 8 }}>
                {STATE_META[noteFor]?.label}. Anything you want to add? Optional, and it shapes what we suggest next.
              </div>
              <input
                value={note} onChange={(e) => setNote(e.target.value)} autoFocus
                placeholder="One line is plenty"
                style={inp({ fontSize: 12.5 })}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmNote(); }}
              />
              <div style={R({ gap: 8, marginTop: 8 })}>
                <button type="button" style={btn(accent, { fontSize: 12, padding: '8px 16px' })} onClick={confirmNote}>Save</button>
                <button type="button" style={btnSm(C.s3, { fontSize: 11.5 })} onClick={() => { setNoteFor(null); setNote(''); }}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Evidence capture, at the moment it is answerable ───────────────── */}
      <AnimatePresence>
        {evidenceOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ ...glass2({ padding: 12, marginTop: 8 }), border: `1px solid ${tint(C.green, 0.3)}` }}>
              <div style={R({ gap: 8, marginBottom: 8 })}>
                <Paperclip size={12} color={C.green} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>Capture the evidence while you remember it</span>
                <span style={{ flex: 1 }} />
                <button type="button" onClick={() => setEvidenceOpen(false)} aria-label="Close"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3 }}><X size={13} /></button>
              </div>
              <div style={{ fontSize: 11.5, color: C.t3, marginBottom: 8, lineHeight: 1.5 }}>{action.evidenceToLog}</div>
              <textarea
                value={evidence} onChange={(e) => setEvidence(e.target.value)}
                placeholder="What you did, what changed, and the number if there is one."
                style={{ ...inp(), minHeight: 74, resize: 'vertical', fontSize: 12.5, lineHeight: 1.55 }}
              />
              <div style={R({ gap: 8, marginTop: 8 })}>
                <button type="button" style={btn(C.green, { fontSize: 12, padding: '8px 16px' })} onClick={submitEvidence}>Save to my portfolio</button>
                <button type="button" style={btnSm(C.s3, { fontSize: 11.5 })} onClick={() => setEvidenceOpen(false)}>Later</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
