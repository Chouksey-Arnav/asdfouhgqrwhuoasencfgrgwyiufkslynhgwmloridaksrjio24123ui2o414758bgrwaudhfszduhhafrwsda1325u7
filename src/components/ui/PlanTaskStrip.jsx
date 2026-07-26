import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, ArrowRight, X, Check } from 'lucide-react';
import { C, glass2, pill, R } from '../../lib/theme';
import { getTodayPlanEntry } from '../../lib/masterPlanGenerator';

const PILLAR_LABEL = { prep: "Today's plan", portfolio: "Today's plan" };

// Shared, dismissible-per-session "today's plan" strip, parameterized by
// pillar so Prep, Portfolio, and (if useful) Home all render the same
// component instead of duplicating this markup three times. Shows only
// !done tasks for the given pillar due today, each a one-click deep link to
// its exact resource via `onOpenTask` (App.jsx's openPlanResource). The
// dismiss choice is stored in sessionStorage (not just component state) so
// it survives the strip's own component unmounting when the student
// navigates to a different tab and back — "per session" means "until the
// browser tab closes", not "until you leave this view".
export default function PlanTaskStrip({ user, pillar, accent = C.violet, onOpenTask, currentView, isMobile }) {
  const today = getTodayPlanEntry(user?.masterPlan);
  const tasks = (today?.tasks || []).filter(t => t.pillar === pillar && !t.done);
  const dismissKey = `planStripDismiss:${pillar}:${today?.date || ''}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(dismissKey) === '1'; } catch { return false; }
  });

  if (!today || !tasks.length || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(dismissKey, '1'); } catch { /* best-effort only */ }
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, height: 0 }}
        style={{ ...glass2({ padding: isMobile ? '10px 12px' : '12px 14px' }), display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `2px solid ${accent}`, marginBottom: 4 }}>
        <div style={R({ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' })}>
          <div style={R({ gap: 8 })}>
            <CalendarClock size={13} color={accent} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.t1 }}>{PILLAR_LABEL[pillar] || "Today's plan"}</span>
            <span style={pill(`${accent}18`, accent, { fontSize: 9.5 })}>{tasks.length} to do</span>
          </div>
          <button onClick={dismiss} aria-label="Dismiss today's plan strip" style={{ all: 'unset', cursor: 'pointer', display: 'flex', color: C.t4 }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tasks.map(t => {
            const specific = t.resourceKind && t.resourceKind !== 'view' && t.resourceLabel;
            const label = specific ? t.resourceLabel : t.title;
            // Already looking at the matching resource view — the chip still opens the
            // exact resource (harmless even if the tab/subview navigation is a no-op),
            // but reads as a checkmark instead of an arrow so it's clear it's "right here".
            const alreadyHere = !!currentView && t.resourceView === currentView;
            return (
              <motion.button key={t.id} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                onClick={() => onOpenTask?.(t)} aria-label={`Open plan task: ${label}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
                  border: `1px solid ${accent}45`, background: alreadyHere ? `${accent}26` : `${accent}12`, color: C.t1,
                  fontSize: 11, fontWeight: 600, fontFamily: C.FB, cursor: 'pointer', maxWidth: '100%',
                }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{label}</span>
                {alreadyHere ? <Check size={10} color={accent} /> : <ArrowRight size={10} color={accent} />}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
